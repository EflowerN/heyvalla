<?php

namespace App\Http\Controllers;

use App\Services\TravellerSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProviderAccountController extends Controller
{
    public static function account(Request $request): object
    {
        $token = $request->bearerToken();
        abort_unless(is_string($token) && strlen($token) === 64, 401, 'Provider sign-in required.');
        $session = DB::table('provider_sessions')->where('token_hash', hash('sha256', $token))->where('expires_at', '>', now())->first();
        if ($session) {
            $account = DB::table('provider_accounts')->find($session->provider_account_id);
            abort_unless($account, 401);

            return $account;
        }

        // Boat owners who signed up through "Create account" use that session, once an admin has approved them.
        $traveller = TravellerSessions::resolve($request);
        abort_unless($traveller, 401, 'Session expired. Please sign in again.');
        abort_unless($traveller->type === 'vessel_owner', 403, 'Boat owner tools are for boat owner accounts.');
        abort_unless($traveller->status === 'active', 403, 'Your boat owner account is waiting for approval by our team.');

        return self::linkedProfile($traveller);
    }

    private static function linkedProfile(object $traveller): object
    {
        $existing = DB::table('provider_accounts')->where('traveller_id', $traveller->id)->first();
        if ($existing) {
            return $existing;
        }
        // Never adopt a profile that already exists under this email: without email verification that would let anyone claim it.
        abort_if(DB::table('provider_accounts')->where('email', $traveller->email)->exists(), 409, 'A boat owner profile already exists for this email. Ask an admin to link it.');
        $id = DB::table('provider_accounts')->insertGetId(['owner_name' => $traveller->name ?: Str::before($traveller->email, '@'), 'email' => $traveller->email, 'password' => Hash::make(Str::random(40)), 'organization_name' => $traveller->organization_name ?: 'Unnamed organisation', 'traveller_id' => $traveller->id, 'created_at' => now(), 'updated_at' => now()]);

        return DB::table('provider_accounts')->find($id);
    }

    public static function present(object $account): array
    {
        return ['id' => $account->id, 'owner_name' => $account->owner_name, 'email' => $account->email, 'organization_name' => $account->organization_name, 'description' => $account->description, 'coverage' => $account->coverage, 'verification' => 'unverified', 'role' => 'owner', 'demo' => true];
    }

    public function register(Request $request): JsonResponse
    {
        abort_unless(config('accounts.provider_self_registration'), 403, 'Boat owners now sign up through Create account and are approved by our team.');
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $input = $request->validate(['owner_name' => ['required', 'string', 'max:100'], 'organization_name' => ['required', 'string', 'max:100'], 'email' => ['required', 'email', 'max:255', 'unique:provider_accounts,email'], 'password' => ['required', 'string', 'min:12', 'max:128', 'confirmed']]);
        $account = DB::transaction(function () use ($input): object {
            $id = DB::table('provider_accounts')->insertGetId(['owner_name' => $input['owner_name'], 'organization_name' => $input['organization_name'], 'email' => $input['email'], 'password' => Hash::make($input['password']), 'created_at' => now(), 'updated_at' => now()]);

            return DB::table('provider_accounts')->find($id);
        });

        return $this->session($account, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $input = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:128']]);
        $account = DB::table('provider_accounts')->where('email', strtolower(trim($input['email'])))->first();
        abort_unless($account && Hash::check($input['password'], $account->password), 401, 'Email or password is incorrect.');

        return $this->session($account);
    }

    private function session(object $account, int $status = 200): JsonResponse
    {
        $token = Str::random(64);
        DB::table('provider_sessions')->insert(['provider_account_id' => $account->id, 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHours(8)]);

        return response()->json(['account' => self::present($account), 'token' => $token], $status)->header('Cache-Control', 'no-store');
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['account' => self::present(self::account($request))])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request): JsonResponse
    {
        $account = self::account($request);
        $input = $request->validate(['organization_name' => ['required', 'string', 'max:100'], 'description' => ['nullable', 'string', 'max:1000'], 'coverage' => ['nullable', 'string', 'max:500']]);
        DB::table('provider_accounts')->where('id', $account->id)->update([...$input, 'updated_at' => now()]);

        return response()->json(['account' => self::present(DB::table('provider_accounts')->find($account->id))]);
    }

    public function logout(Request $request): JsonResponse
    {
        DB::table('provider_sessions')->where('token_hash', hash('sha256', (string) $request->bearerToken()))->delete();

        return response()->json(['authenticated' => false]);
    }
}
