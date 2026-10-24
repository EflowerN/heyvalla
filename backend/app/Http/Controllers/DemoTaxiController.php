<?php

namespace App\Http\Controllers;

use App\Services\ProviderLifecycle;
use App\Services\TravelJourneys;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoTaxiController extends Controller
{
    private function authorizeOperator(Request $request): void
    {
        $token = config('demo_taxis.operator_token');
        abort_unless(is_string($token) && strlen($token) >= 32 && hash_equals($token, (string) $request->header('X-Demo-Operator')), 403);
    }

    private function parent(string $reference, ?string $guest = null, bool $lock = true): array
    {
        $provider = str_starts_with($reference, 'PV-');
        $query = DB::table($provider ? 'provider_seat_requests' : 'demo_bookings')->where('reference', $reference);
        if ($guest !== null) {
            $query->where('guest_hash', $guest);
        }
        if ($lock) {
            $query->lockForUpdate();
        }
        $booking = $query->first();
        abort_unless($booking, 404);
        $column = $provider ? 'provider_seat_request_id' : 'demo_booking_id';
        $snapshot = json_decode($booking->journey, true);
        $itinerary = DB::table('travel_journeys')->where($column, $booking->id)->first();
        if ($itinerary?->flight_plan) {
            $snapshot = [...$snapshot, ...json_decode($itinerary->flight_plan, true)];
        }

        if (! isset($snapshot['harbour_arrival_at']) && isset($snapshot['airport_arrival_at'])) {
            $snapshot['harbour_arrival_at'] = CarbonImmutable::parse($snapshot['airport_arrival_at'])->subMinutes(20)->toIso8601String();
        }

        return [$booking, $column, $snapshot];
    }

    private function taxiParent(object $taxi, ?string $guest = null, bool $lock = true): array
    {
        $provider = $taxi->provider_seat_request_id !== null;
        $booking = DB::table($provider ? 'provider_seat_requests' : 'demo_bookings')->find($provider ? $taxi->provider_seat_request_id : $taxi->demo_booking_id);
        abort_unless($booking, 404);

        return $this->parent($booking->reference, $guest, $lock);
    }

    private function eligible(object $booking, array $journey): void
    {
        abort_unless(in_array($booking->status, ['confirmed', 'demo_confirmed', 'completed'], true), 409, 'The ferry must be confirmed before arranging its taxi.');
        abort_unless(($journey['destination'] ?? '') === 'Thimarafushi Airport', 422, 'Add a Thimarafushi flight target to this itinerary first.');
    }

    public function store(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);
        $input = $request->validate(['booking_reference' => ['required', 'string'], 'passengers' => ['required', 'integer', 'min:1', 'max:4'], 'bags' => ['required', 'integer', 'min:0', 'max:4'], 'retry_version' => ['nullable', 'integer']]);

        return DB::transaction(function () use ($input, $guest): JsonResponse {
            [$booking, $column, $journey] = $this->parent($input['booking_reference'], $guest);
            $this->eligible($booking, $journey);
            abort_unless((int) $input['passengers'] <= $booking->seats, 422, 'Taxi passengers cannot exceed ferry seats.');
            $arrival = CarbonImmutable::parse($journey['harbour_arrival_at']);
            abort_unless($arrival->isFuture(), 409, 'New taxi requests must be made before ferry arrival in this demo.');
            $taxi = DB::table('demo_taxi_requests')->where($column, $booking->id)->lockForUpdate()->first();
            $values = ['status' => 'requested', 'passengers' => (int) $input['passengers'], 'bags' => (int) $input['bags'], 'pickup_at' => $arrival->addMinutes(5)->toIso8601String(), 'price_minor' => null, 'quote_expires_at' => null, 'operator_note' => null, 'updated_at' => now()];
            if ($taxi && in_array($taxi->status, ['declined', 'cancelled'], true)) {
                abort_unless(isset($input['retry_version']) && (int) $input['retry_version'] === $taxi->version, 409, 'Refresh before requesting another taxi quote.');
                DB::table('demo_taxi_requests')->where('id', $taxi->id)->update([...$values, 'version' => $taxi->version + 1, 'events' => json_encode(ProviderLifecycle::appendEvent($taxi, 'requested', 'passenger', 'Passenger requested a new taxi quote.'))]);
            } elseif (! $taxi) {
                DB::table('demo_taxi_requests')->insert([...$values, $column => $booking->id, 'reference' => 'TX-'.strtoupper(Str::random(12)), 'version' => 1, 'events' => json_encode([['status' => 'requested', 'actor' => 'passenger', 'at' => now()->toIso8601String(), 'reason' => 'Airport taxi requested.']]), 'created_at' => now()]);
            } else {
                abort_unless($taxi->passengers === (int) $input['passengers'] && $taxi->bags === (int) $input['bags'], 409, 'A taxi request already exists with different details. Cancel it before requesting a replacement.');
            }

            return response()->json(['taxi' => self::present(DB::table('demo_taxi_requests')->where($column, $booking->id)->first(), $journey)], 201);
        }, 5);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeOperator($request);
        $requests = DB::table('demo_taxi_requests')->orderByDesc('id')->limit(100)->get()->map(function (object $taxi): array {
            [$booking, , $journey] = $this->taxiParent($taxi, null, false);

            return [...self::present($taxi, $journey), 'booking_reference' => $booking->reference, 'passenger_name' => $booking->passenger_name];
        });

        return response()->json(['requests' => $requests])->header('Cache-Control', 'no-store');
    }

    public function operatorUpdate(Request $request): JsonResponse
    {
        $this->authorizeOperator($request);
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer'], 'action' => ['required', 'in:quote,decline,cancel'], 'pickup_at' => ['required_if:action,quote', 'nullable', 'date_format:Y-m-d\TH:i'], 'price_minor' => ['required_if:action,quote', 'nullable', 'integer', 'min:1', 'max:1000000'], 'operator_note' => ['required_if:action,cancel', 'nullable', 'string', 'max:500']]);

        return DB::transaction(function () use ($input): JsonResponse {
            $candidate = DB::table('demo_taxi_requests')->where('reference', $input['reference'])->first();
            abort_unless($candidate, 404);
            [$booking, , $journey] = $this->taxiParent($candidate);
            $taxi = DB::table('demo_taxi_requests')->where('id', $candidate->id)->lockForUpdate()->first();
            $this->eligible($booking, $journey);
            $allowed = $input['action'] === 'cancel' ? ['requested', 'quoted', 'confirmed'] : ['requested', 'quoted'];
            abort_unless(in_array($taxi->status, $allowed, true) && $taxi->version === (int) $input['version'], 409, 'Request changed; refresh the dashboard.');
            $status = $input['action'] === 'quote' ? 'quoted' : ($input['action'] === 'cancel' ? 'cancelled' : 'declined');
            $updates = ['status' => $status, 'operator_note' => $input['operator_note'] ?? null, 'version' => $taxi->version + 1, 'updated_at' => now()];
            if ($input['action'] === 'quote') {
                $pickup = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['pickup_at'], 'Indian/Maldives');
                $arrival = CarbonImmutable::parse($journey['harbour_arrival_at']);
                abort_unless($pickup->isFuture() && $pickup->greaterThanOrEqualTo($arrival->addMinutes(5)), 422, 'Pickup must be future and at least five minutes after harbour arrival.');
                if (! empty($journey['check_in_deadline_at'])) {
                    abort_unless($pickup->addMinutes(45)->lessThanOrEqualTo(CarbonImmutable::parse($journey['check_in_deadline_at'])), 422, 'Pickup must preserve a 15-minute drive and 30-minute check-in safety margin.');
                }
                $updates = [...$updates, 'pickup_at' => $pickup->toIso8601String(), 'price_minor' => $input['price_minor'], 'quote_expires_at' => now()->addMinutes(30)->toIso8601String()];
            }
            $updates['events'] = json_encode(ProviderLifecycle::appendEvent($taxi, $status, 'taxi_operator', $input['operator_note'] ?? 'Taxi '.$status.'.'));
            DB::table('demo_taxi_requests')->where('id', $taxi->id)->update($updates);

            return response()->json(['taxi' => self::present(DB::table('demo_taxi_requests')->find($taxi->id), $journey)]);
        }, 5);
    }

    public function accept(Request $request): JsonResponse
    {
        return $this->passengerUpdate($request, false);
    }

    public function cancel(Request $request): JsonResponse
    {
        return $this->passengerUpdate($request, true);
    }

    private function passengerUpdate(Request $request, bool $cancel): JsonResponse
    {
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer']]);
        $guest = TravelJourneys::guest($request);

        return DB::transaction(function () use ($input, $guest, $cancel): JsonResponse {
            $candidate = DB::table('demo_taxi_requests')->where('reference', $input['reference'])->first();
            abort_unless($candidate, 404);
            [$booking, , $journey] = $this->taxiParent($candidate, $guest);
            $taxi = DB::table('demo_taxi_requests')->where('id', $candidate->id)->lockForUpdate()->first();
            $target = $cancel ? 'cancelled' : 'confirmed';
            if ($taxi->status === $target && $taxi->version === (int) $input['version'] + 1) {
                return response()->json(['taxi' => self::present($taxi, $journey)]);
            }
            $this->eligible($booking, $journey);
            abort_unless($taxi->version === (int) $input['version'] && CarbonImmutable::parse($taxi->pickup_at)->isFuture(), 409, 'Taxi changed or pickup passed. Refresh your itinerary.');
            if ($cancel) {
                abort_unless(in_array($taxi->status, ['requested', 'quoted', 'confirmed'], true), 409);
            } else {
                abort_unless($taxi->status === 'quoted' && CarbonImmutable::parse($taxi->quote_expires_at)->isFuture(), 409, 'Quote expired or changed. Ask the operator for a new quote.');
            }
            DB::table('demo_taxi_requests')->where('id', $taxi->id)->update(['status' => $target, 'version' => $taxi->version + 1, 'events' => json_encode(ProviderLifecycle::appendEvent($taxi, $target, 'passenger', $cancel ? 'Passenger cancelled taxi.' : 'Passenger accepted taxi price and pickup.')), 'updated_at' => now()]);

            return response()->json(['taxi' => self::present(DB::table('demo_taxi_requests')->find($taxi->id), $journey)]);
        }, 5);
    }

    public static function present(object $taxi, array $journey): array
    {
        return ['reference' => $taxi->reference, 'status' => $taxi->status, 'version' => $taxi->version, 'passengers' => $taxi->passengers, 'bags' => $taxi->bags, 'pickup' => 'Thimarafushi harbour', 'destination' => 'Thimarafushi Airport', 'pickup_at' => $taxi->pickup_at, 'airport_arrival_at' => CarbonImmutable::parse($taxi->pickup_at)->addMinutes(15)->toIso8601String(), 'check_in_deadline_at' => $journey['check_in_deadline_at'] ?? null, 'price_minor' => $taxi->price_minor, 'currency' => 'MVR', 'quote_expires_at' => $taxi->quote_expires_at, 'operator_note' => $taxi->operator_note, 'events' => json_decode($taxi->events ?: '[]', true), 'demo' => true];
    }
}
