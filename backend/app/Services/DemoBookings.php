<?php

namespace App\Services;

use App\Http\Controllers\DemoTaxiController;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DemoBookings
{
    public function create(array $input, string $guest): array
    {
        $hash = hash('sha256', $guest);
        $payload = $input;
        unset($payload['request_id']);
        ksort($payload);
        $payloadHash = hash('sha256', json_encode($payload));

        try {
            return DB::transaction(function () use ($input, $hash, $payloadHash): array {
                $existing = DB::table('demo_bookings')->where('guest_hash', $hash)->where('request_id', $input['request_id'])->first();
                if ($existing) {
                    if ($existing->payload_hash !== $payloadHash) {
                        throw new ConflictHttpException('This request was already used for different booking details.');
                    }

                    return $this->present($existing);
                }

                $result = app(DemoFerrySearch::class)->search($input);
                $sailing = collect($result['sailings'])->firstWhere('id', $input['sailing_id']);
                if (! $sailing || $sailing['classification'] !== 'recommended' || CarbonImmutable::parse($sailing['departure_at'])->isPast()) {
                    throw ValidationException::withMessages(['sailing_id' => 'Choose a future sailing that meets the recommended airport arrival target.']);
                }

                DB::table('demo_inventories')->insertOrIgnore(['sailing_id' => $sailing['id'], 'capacity' => config('demo_ferries.capacity'), 'reserved' => 0]);
                $changed = DB::table('demo_inventories')->where('sailing_id', $sailing['id'])
                    ->whereRaw('reserved + ? <= capacity', [$input['seats']])->increment('reserved', $input['seats']);
                if ($changed !== 1) {
                    throw ValidationException::withMessages(['seats' => 'Not enough seats remain. Search again for current availability.']);
                }

                $id = DB::table('demo_bookings')->insertGetId([
                    'reference' => 'HV-'.strtoupper(Str::random(12)), 'guest_hash' => $hash,
                    'request_id' => $input['request_id'], 'payload_hash' => $payloadHash,
                    'sailing_id' => $sailing['id'], 'passenger_name' => $input['passenger_name'],
                    'email' => $input['email'], 'seats' => $input['seats'],
                    'journey' => json_encode(['origin' => $result['origin'], 'destination' => $result['destination'], 'departure_at' => $sailing['departure_at'], 'airport_arrival_at' => $sailing['airport_arrival_at'], 'flight_at' => $result['flight_at'], 'harbour_arrival_at' => $sailing['harbour_arrival_at'], 'check_in_deadline_at' => $result['check_in_deadline_at']]),
                    'created_at' => now(),
                ]);

                return $this->present(DB::table('demo_bookings')->find($id));
            }, 5);
        } catch (UniqueConstraintViolationException $exception) {
            $existing = DB::table('demo_bookings')->where('guest_hash', $hash)->where('request_id', $input['request_id'])->first();
            if (! $existing) {
                throw $exception;
            }
            if ($existing->payload_hash !== $payloadHash) {
                throw new ConflictHttpException('This request was already used for different booking details.');
            }

            return $this->present($existing);
        }
    }

    public function list(string $guest): array
    {
        return DB::table('demo_bookings')->where('guest_hash', hash('sha256', $guest))->orderByDesc('id')->limit(50)
            ->get()->map(fn (object $booking): array => $this->present($booking))->all();
    }

    private function present(object $booking): array
    {
        $taxi = DB::table('demo_taxi_requests')->where('demo_booking_id', $booking->id)->first();

        return ['taxi' => $taxi ? DemoTaxiController::present($taxi, json_decode($booking->journey, true)) : null, 'reference' => $booking->reference, 'passenger_name' => $booking->passenger_name,
            'seats' => $booking->seats, 'journey' => json_decode($booking->journey, true),
            'status' => 'demo_confirmed', 'demo' => true];
    }
}
