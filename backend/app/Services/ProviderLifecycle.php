<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ProviderLifecycle
{
    public static function appendEvent(object $booking, string $status, string $actor, string $reason): array
    {
        return [...json_decode($booking->events ?: '[]', true), ['status' => $status, 'actor' => $actor, 'at' => now()->toIso8601String(), 'reason' => $reason]];
    }

    public static function cancelTaxi(string $column, int $bookingId, string $reason): void
    {
        $taxi = DB::table('demo_taxi_requests')->where($column, $bookingId)->lockForUpdate()->first();
        if ($taxi && in_array($taxi->status, ['requested', 'quoted', 'confirmed'], true)) {
            DB::table('demo_taxi_requests')->where('id', $taxi->id)->update(['status' => 'cancelled', 'version' => $taxi->version + 1, 'events' => json_encode(self::appendEvent($taxi, 'cancelled', 'system', $reason)), 'operator_note' => $reason, 'updated_at' => now()]);
        }
    }

    public static function expirePending(): int
    {
        $count = 0;
        $ids = DB::table('provider_seat_requests as b')->join('provider_sailings as s', 's.id', '=', 'b.provider_sailing_id')->where('b.status', 'requested')->where('s.departure_at', '<=', now())->distinct()->pluck('s.id');
        foreach ($ids as $id) {
            $count += DB::transaction(function () use ($id): int {
                $sailing = DB::table('provider_sailings')->where('id', $id)->lockForUpdate()->first();
                if (! $sailing || $sailing->departure_at > now()->format('Y-m-d H:i:s')) {
                    return 0;
                }
                $bookings = DB::table('provider_seat_requests')->where('provider_sailing_id', $id)->where('status', 'requested')->lockForUpdate()->get();
                foreach ($bookings as $booking) {
                    DB::table('provider_seat_requests')->where('id', $booking->id)->update(['status' => 'expired', 'version' => $booking->version + 1, 'events' => json_encode(self::appendEvent($booking, 'expired', 'system', 'Departure passed without operator confirmation; no seats were allocated.')), 'updated_at' => now()]);
                    self::cancelTaxi('provider_seat_request_id', $booking->id, 'Ferry request expired.');
                }

                return $bookings->count();
            }, 5);
        }

        return $count;
    }
}
