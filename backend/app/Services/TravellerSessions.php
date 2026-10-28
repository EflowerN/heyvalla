<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TravellerSessions
{
    public const TYPES = ['customer', 'vessel_owner', 'vehicle_owner', 'business'];

    /** Staff sessions are short; everyone else stays signed in for a week. */
    public static function issue(object $traveller): string
    {
        $token = Str::random(64);
        DB::table('traveller_sessions')->where('expires_at', '<', now())->delete();
        DB::table('traveller_sessions')->insert(['traveller_id' => $traveller->id, 'token_hash' => hash('sha256', $token), 'expires_at' => $traveller->is_admin ? now()->addHours(12) : now()->addDays(7)]);

        return $token;
    }

    public static function revoke(?string $token): void
    {
        if (is_string($token) && $token !== '') {
            DB::table('traveller_sessions')->where('token_hash', hash('sha256', $token))->delete();
        }
    }

    public static function revokeAll(int $travellerId): void
    {
        DB::table('traveller_sessions')->where('traveller_id', $travellerId)->delete();
    }

    /** The signed-in traveller for this request, or null. Suspended accounts never resolve. */
    public static function resolve(Request $request): ?object
    {
        $token = $request->bearerToken();
        if (! is_string($token) || strlen($token) !== 64) {
            return null;
        }
        $session = DB::table('traveller_sessions')->where('token_hash', hash('sha256', $token))->where('expires_at', '>', now())->first();
        $traveller = $session ? DB::table('travellers')->find($session->traveller_id) : null;

        return $traveller && $traveller->status !== 'suspended' ? $traveller : null;
    }

    public static function present(object $traveller): array
    {
        return ['name' => $traveller->name, 'email' => $traveller->email, 'type' => $traveller->type, 'status' => $traveller->status, 'is_admin' => (bool) $traveller->is_admin, 'organization_name' => $traveller->organization_name];
    }
}
