<?php

namespace App\Http\Controllers;

use App\Services\TravellerSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TravellerAccountController extends Controller
{
    private static function respond(array $body, int $status = 200): JsonResponse
    {
        return response()->json($body, $status)->header('Cache-Control', 'no-store');
    }

    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $input = $request->validate([
            'name' => ['nullable', 'string', 'max:100'], 'email' => ['required', 'email', 'max:255'], 'password' => ['required', 'string', 'min:10', 'max:128'],
            // "admin" is deliberately not an option: staff are promoted from the command line only.
            'type' => ['nullable', Rule::in(TravellerSessions::TYPES)],
            'organization_name' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);
        $type = $input['type'] ?? 'customer';
        if ($type !== 'customer' && trim((string) ($input['organization_name'] ?? '')) === '') {
            throw \Illuminate\Validation\ValidationException::withMessages(['organization_name' => 'Enter the name of your boat, taxi, bus or business.']);
        }
        // Existing trips carry over only when the browser's guest identity is not already owned by another account.
        $header = $request->header('X-Demo-Guest');
        $guest = is_string($header) && Str::isUuid($header) && ! DB::table('travellers')->where('guest_uuid', $header)->exists() ? $header : (string) Str::uuid();
        try {
            $id = DB::table('travellers')->insertGetId([
                'name' => $input['name'] ?? null, 'email' => $input['email'], 'password' => Hash::make($input['password']), 'guest_uuid' => $guest,
                'type' => $type, 'status' => $type === 'customer' ? 'active' : 'pending', 'organization_name' => $type === 'customer' ? null : ($input['organization_name'] ?? null), 'phone' => $input['phone'] ?? null,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            // Same message as any other failure so the form cannot be used to discover registered emails.
            abort(422, 'We could not create an account with those details. Try signing in instead.');
        }
        $traveller = DB::table('travellers')->find($id);

        return self::respond(['account' => TravellerSessions::present($traveller), 'guest' => $guest, 'token' => TravellerSessions::issue($traveller)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $input = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:128']]);
        $traveller = DB::table('travellers')->where('email', strtolower(trim($input['email'])))->first();
        // Hash a dummy value for unknown emails so timing does not reveal whether the account exists.
        $valid = Hash::check($input['password'], $traveller->password ?? '$2y$12$RY1noW75dVD.RF.AVmk7MuMJQAHL6mBZzpEOguqAvsr/WcIfWc7Ee');
        abort_unless($traveller && $valid, 401, 'Email or password is incorrect.');
        abort_if($traveller->status === 'suspended', 403, 'This account has been suspended. Contact support if you think this is a mistake.');

        return self::respond(['account' => TravellerSessions::present($traveller), 'guest' => $traveller->guest_uuid, 'token' => TravellerSessions::issue($traveller)]);
    }

    public function show(Request $request): JsonResponse
    {
        $traveller = TravellerSessions::resolve($request);

        return self::respond(['account' => $traveller ? TravellerSessions::present($traveller) : null]);
    }

    public function logout(Request $request): JsonResponse
    {
        TravellerSessions::revoke($request->bearerToken());

        return self::respond(['account' => null]);
    }
}
