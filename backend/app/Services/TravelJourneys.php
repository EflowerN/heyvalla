<?php

namespace App\Services;

use App\Http\Controllers\DemoTaxiController;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TravelJourneys
{
    public const AIRPORT = 'VRNT';

    public const HARBOUR_ISLAND = 'ld0082';

    public static function guest(Request $request): string
    {
        $guest = $request->header('X-Demo-Guest');
        abort_unless(is_string($guest) && Str::isUuid($guest), 401, 'Passenger session required.');

        return hash('sha256', $guest);
    }

    public static function flightRules(): array
    {
        return ['flight_date' => ['required', 'date_format:Y-m-d'], 'flight_time' => ['required', 'date_format:H:i'], 'check_in_minutes' => ['required', 'integer', 'min:30', 'max:240'], 'airport' => ['required', 'in:VRNT']];
    }

    public static function flightPlan(array $input, string $arrival, string $departure, ?string $destinationId): array
    {
        abort_unless($destinationId === self::HARBOUR_ISLAND, 422, 'Airport taxi planning currently covers Thimarafushi harbour only.');
        $flight = CarbonImmutable::createFromFormat('!Y-m-d H:i', $input['flight_date'].' '.$input['flight_time'], 'Indian/Maldives');
        $deadline = $flight->subMinutes((int) $input['check_in_minutes']);
        $airportArrival = CarbonImmutable::parse($arrival)->addMinutes(20);
        $margin = (int) $airportArrival->diffInMinutes($deadline, false);
        abort_unless($flight->isFuture() && CarbonImmutable::parse($departure)->isFuture(), 422, 'Choose a future flight and ferry departure.');
        abort_unless($margin >= 30, 422, 'This ferry does not retain the 30-minute airport safety margin for that flight.');

        return ['flight_at' => $flight->toIso8601String(), 'check_in_deadline_at' => $deadline->toIso8601String(), 'airport_arrival_at' => $airportArrival->toIso8601String(), 'harbour_arrival_at' => $arrival, 'airport_id' => self::AIRPORT, 'destination' => 'Thimarafushi Airport', 'check_in_minutes' => (int) $input['check_in_minutes'], 'connection_buffer_minutes' => $margin, 'transfer_minutes' => 20, 'safety_minutes' => 30, 'source' => 'manual_flight_demo_transfer'];
    }

    public static function ensure(object $booking, bool $provider, ?array $flight = null, ?array $details = null, ?string $detailsHash = null): object
    {
        $column = $provider ? 'provider_seat_request_id' : 'demo_booking_id';
        DB::table('travel_journeys')->insertOrIgnore(['reference' => 'JY-'.strtoupper(Str::random(12)), 'guest_hash' => $booking->guest_hash, $column => $booking->id, 'flight_plan' => $flight ? json_encode($flight) : null, 'journey_details' => $details ? json_encode($details) : null, 'details_hash' => $detailsHash, 'details_booking_hash' => $detailsHash, 'details_version' => $details ? 1 : 0, 'created_at' => now(), 'updated_at' => now()]);

        return DB::table('travel_journeys')->where($column, $booking->id)->first();
    }

    public static function booking(object $journey, bool $lock = false): object
    {
        $provider = $journey->provider_seat_request_id !== null;
        $query = DB::table($provider ? 'provider_seat_requests' : 'demo_bookings')->where('id', $provider ? $journey->provider_seat_request_id : $journey->demo_booking_id);
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->first();
    }

    public static function present(object $journey): array
    {
        $provider = $journey->provider_seat_request_id !== null;
        $booking = self::booking($journey);
        $snapshot = json_decode($booking->journey, true);
        $details = $journey->journey_details ? json_decode($journey->journey_details, true) : null;
        $onward = $details['onward_transfer'] ?? null;
        $flight = $journey->flight_plan ? json_decode($journey->flight_plan, true) : null;
        if ($flight && (empty($flight['check_in_deadline_at']) || empty($flight['harbour_arrival_at']))) {
            $flight = null;
        }
        $taxi = DB::table('demo_taxi_requests')->where($provider ? 'provider_seat_request_id' : 'demo_booking_id', $booking->id)->first();
        $active = in_array($booking->status, ['requested', 'confirmed', 'demo_confirmed', 'completed'], true);
        $ferryConfirmed = in_array($booking->status, ['confirmed', 'demo_confirmed', 'completed'], true);
        $taxiConfirmed = $taxi && $taxi->status === 'confirmed';
        $ferryPrice = $provider ? $booking->total_minor : null;
        $taxiPrice = $taxi && in_array($taxi->status, ['quoted', 'confirmed'], true) && ($taxi->status === 'confirmed' || CarbonImmutable::parse($taxi->quote_expires_at)->isFuture()) ? $taxi->price_minor : null;
        $coverageComplete = $taxiConfirmed && $taxi->passengers === $booking->seats;
        $state = ! $active ? $booking->status : ($flight ? ($ferryConfirmed && $coverageComplete ? 'ground_transport_confirmed' : 'partially_arranged') : ($ferryConfirmed ? 'ferry_confirmed' : 'awaiting_ferry_approval'));
        $taxiSnapshot = $flight ? [...$snapshot, ...$flight] : $snapshot;
        $legs = [['mode' => 'sea', 'label' => 'Ferry', 'from' => $snapshot['origin'], 'to' => $provider ? $snapshot['destination'] : 'Thimarafushi harbour', 'departure_at' => $snapshot['departure_at'], 'arrival_at' => $snapshot['harbour_arrival_at'] ?? $snapshot['arrival_at'] ?? null, 'status' => $booking->status, 'price_minor' => $ferryPrice, 'source' => $provider ? 'provider_demo' : 'fictional_schedule']];
        if ($flight || $taxi) {
            $legs[] = ['mode' => 'taxi', 'label' => 'Airport transfer', 'from' => 'Thimarafushi harbour', 'to' => 'Thimarafushi Airport', 'departure_at' => $taxi?->pickup_at, 'arrival_at' => $taxi ? CarbonImmutable::parse($taxi->pickup_at)->addMinutes(15)->toIso8601String() : $flight['airport_arrival_at'], 'status' => $taxi && $taxi->status === 'quoted' && ! CarbonImmutable::parse($taxi->quote_expires_at)->isFuture() ? 'quote_expired' : ($taxi?->status ?? 'not_requested'), 'price_minor' => $taxiPrice, 'source' => 'demo_operator_quote'];
        }
        if ($flight) {
            $legs[] = ['mode' => 'flight', 'label' => isset($details['selected_flight']) ? $details['selected_flight']['airline'].' '.$details['selected_flight']['flight_number'] : 'Your flight target', 'from' => 'Thimarafushi Airport', 'to' => $details['arrival_airport']['name'] ?? 'Destination managed outside HeyValla', 'departure_at' => $flight['flight_at'], 'arrival_at' => $details['flight_arrival_at'] ?? null, 'status' => 'external_not_booked', 'price_minor' => null, 'source' => isset($details['selected_flight']) ? 'maldivian_website_reference' : 'passenger_input'];
        }
        if ($onward) {
            $legs[] = $onward;
            if ($active && $state === 'ground_transport_confirmed') {
                $state = 'partially_arranged';
            }
        }
        $airportArrival = $taxi ? CarbonImmutable::parse($taxi->pickup_at)->addMinutes(15) : ($flight ? CarbonImmutable::parse($flight['airport_arrival_at']) : null);

        return ['journey_details' => $details, 'details_version' => $journey->details_version, 'can_edit_details' => $flight && $active && CarbonImmutable::parse($flight['flight_at'])->isFuture(), 'reference' => $journey->reference, 'booking_reference' => $booking->reference, 'booking_version' => $booking->version, 'booking_source' => $provider ? 'provider' : 'legacy', 'passenger_name' => $booking->passenger_name, 'seats' => $booking->seats, 'state' => $state, 'legs' => $legs, 'flight_plan' => $flight, 'taxi' => $taxi ? DemoTaxiController::present($taxi, $taxiSnapshot) : null, 'known_ground_subtotal_minor' => ($ferryPrice ?? 0) + ($taxiPrice ?? 0), 'ground_prices_complete' => ! $onward && $ferryPrice !== null && (! $flight || ($taxiPrice !== null && $taxi->passengers === $booking->seats)), 'currency' => 'MVR', 'flight_price_unknown' => true, 'connection_buffer_minutes' => $flight && $airportArrival ? (int) $airportArrival->diffInMinutes(CarbonImmutable::parse($flight['check_in_deadline_at']), false) : null, 'taxi_party_complete' => $coverageComplete, 'can_add_flight' => ! $flight && $active && (! $provider || ($snapshot['destination_id'] ?? null) === self::HARBOUR_ISLAND) && CarbonImmutable::parse($snapshot['departure_at'])->isFuture(), 'can_request_taxi' => $flight && $ferryConfirmed && CarbonImmutable::parse($taxi && ! in_array($taxi->status, ['cancelled', 'declined'], true) ? $taxi->pickup_at : $flight['harbour_arrival_at'])->isFuture(), 'can_cancel' => $active && CarbonImmutable::parse($snapshot['departure_at'])->isFuture(), 'events' => $provider ? json_decode($booking->events, true) : [], 'demo' => true];
    }
}
