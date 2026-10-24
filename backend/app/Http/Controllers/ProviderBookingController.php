<?php

namespace App\Http\Controllers;

use App\Services\JourneyDetails;
use App\Services\ProviderLifecycle;
use App\Services\TravelJourneys;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProviderBookingController extends Controller
{
    private function guest(Request $request): string
    {
        $guest = $request->header('X-Demo-Guest');
        abort_unless(is_string($guest) && Str::isUuid($guest), 401, 'Passenger session required.');

        return hash('sha256', $guest);
    }

    public static function present(object $booking): array
    {
        return ['reference' => $booking->reference, 'passenger_name' => $booking->passenger_name, 'seats' => $booking->seats, 'total_minor' => $booking->total_minor, 'currency' => 'MVR', 'status' => $booking->status, 'version' => $booking->version, 'journey' => json_decode($booking->journey, true), 'events' => json_decode($booking->events, true), 'demo' => true, 'payment_status' => 'not_collected'];
    }

    public function index(Request $request): JsonResponse
    {
        ProviderLifecycle::expirePending();

        return response()->json(['bookings' => DB::table('provider_seat_requests')->where('guest_hash', $this->guest($request))->orderByDesc('id')->get()->map(fn (object $booking): array => self::present($booking))])->header('Cache-Control', 'no-store');
    }

    public function operatorIndex(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        ProviderLifecycle::expirePending();
        $bookings = DB::table('provider_seat_requests as b')->join('provider_sailings as s', 's.id', '=', 'b.provider_sailing_id')->where('s.provider_account_id', $account->id)->orderByDesc('b.id')->select('b.*')->get();

        return response()->json(['bookings' => $bookings->map(fn (object $booking): array => self::present($booking))])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $guest = $this->guest($request);
        $input = $request->validate(['sailing_id' => ['required', 'integer'], 'sailing_version' => ['required', 'integer'], 'fare_minor' => ['required', 'integer', 'min:1'], 'seats' => ['required', 'integer', 'min:1', 'max:20'], 'passenger_name' => ['required', 'string', 'max:100'], 'terms_accepted' => ['required', 'accepted'], 'idempotency_key' => ['required', 'uuid'], ...JourneyDetails::rules()]);

        $flightInput = $request->hasAny(['flight_date', 'flight_time', 'check_in_minutes', 'airport']) ? $request->validate(TravelJourneys::flightRules()) : null;

        foreach (['sailing_id', 'sailing_version', 'fare_minor', 'seats'] as $field) {
            $input[$field] = (int) $input[$field];
        }

        return DB::transaction(function () use ($input, $guest, $flightInput): JsonResponse {
            $sailing = DB::table('provider_sailings')->where('id', $input['sailing_id'])->lockForUpdate()->first();
            abort_unless($sailing, 404);
            $existing = DB::table('provider_seat_requests')->where('guest_hash', $guest)->where('idempotency_key', $input['idempotency_key'])->first();
            if ($existing) {
                abort_unless($existing->provider_sailing_id === $sailing->id && $existing->seats === $input['seats'] && $existing->passenger_name === $input['passenger_name'] && $existing->total_minor === $input['fare_minor'] * $input['seats'], 409, 'Retry details changed. Refresh before submitting another request.');

                abort_unless((json_decode($existing->journey, true)['flight_input'] ?? null) == $flightInput, 409, 'This retry has a different flight target. Refresh your itinerary.');
                $savedJourney = TravelJourneys::ensure($existing, true);
                abort_unless($savedJourney->details_booking_hash === JourneyDetails::fingerprint($input['journey_details'] ?? null), 409, 'This retry has different journey details. Refresh your itinerary.');

                return response()->json(['booking' => self::present($existing)]);
            }
            $vessel = DB::table('provider_vessels')->where('id', $sailing->provider_vessel_id)->lockForUpdate()->first();
            abort_unless($sailing->status === 'published' && CarbonImmutable::parse($sailing->departure_at, 'UTC')->isFuture() && $vessel->booking_mode === 'request_to_book', 409, 'This sailing is not accepting new requests.');
            abort_unless($sailing->version === $input['sailing_version'] && $sailing->fare_minor !== null && $sailing->fare_minor === $input['fare_minor'], 409, 'Fare or sailing changed. Refresh and review before requesting.');
            abort_unless($sailing->seat_capacity - $sailing->confirmed_seats >= $input['seats'], 409, 'Not enough unconfirmed seats remain. Refresh for availability.');
            $provider = DB::table('provider_accounts')->find($sailing->provider_account_id);
            $journey = ['origin_id' => $sailing->origin_id, 'destination_id' => $sailing->destination_id, 'sailing_id' => $sailing->id, 'origin' => $sailing->origin, 'destination' => $sailing->destination, 'departure_at' => CarbonImmutable::parse($sailing->departure_at, 'UTC')->toIso8601String(), 'arrival_at' => CarbonImmutable::parse($sailing->arrival_at, 'UTC')->toIso8601String(), 'provider_name' => $provider->organization_name, 'vessel_name' => $vessel->name, 'fare_minor' => $sailing->fare_minor, 'terms' => 'Demo request only. Seats are not held until operator confirmation. No payment is collected. Passenger may cancel before departure. Provider is unverified.'];
            $flight = $flightInput ? TravelJourneys::flightPlan($flightInput, $journey['arrival_at'], $journey['departure_at'], $sailing->destination_id) : null;
            $details = isset($input['journey_details']) ? JourneyDetails::snapshot($input['journey_details'], $flight, $sailing->origin_id) : null;
            $journey['flight_input'] = $flightInput;
            DB::table('provider_seat_requests')->insertOrIgnore(['provider_sailing_id' => $sailing->id, 'reference' => 'PV-'.strtoupper(Str::random(12)), 'guest_hash' => $guest, 'idempotency_key' => $input['idempotency_key'], 'passenger_name' => $input['passenger_name'], 'seats' => $input['seats'], 'total_minor' => $input['fare_minor'] * $input['seats'], 'journey' => json_encode($journey), 'status' => 'requested', 'version' => 1, 'events' => json_encode([['status' => 'requested', 'actor' => 'passenger', 'at' => now()->toIso8601String(), 'reason' => 'Seat request submitted; awaiting operator approval.']]), 'created_at' => now(), 'updated_at' => now()]);
            $booking = DB::table('provider_seat_requests')->where('guest_hash', $guest)->where('idempotency_key', $input['idempotency_key'])->first();
            abort_unless($booking && $booking->provider_sailing_id === $sailing->id && $booking->seats === $input['seats'] && $booking->passenger_name === $input['passenger_name'] && $booking->total_minor === $input['fare_minor'] * $input['seats'], 409, 'Duplicate request details differ. Refresh before retrying.');

            $savedJourney = TravelJourneys::ensure($booking, true, $flight, $details, JourneyDetails::fingerprint($input['journey_details'] ?? null));
            abort_unless($savedJourney->details_booking_hash === JourneyDetails::fingerprint($input['journey_details'] ?? null) && (json_decode($booking->journey, true)['flight_input'] ?? null) == $flightInput, 409, 'Duplicate request has different journey details.');

            return response()->json(['booking' => self::present($booking)], 201);
        }, 5);
    }

    public function operatorUpdate(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer'], 'action' => ['required', 'in:confirmed,declined,completed'], 'reason' => ['required_if:action,declined', 'nullable', 'string', 'max:500']]);

        return $this->transition($input, $account->id, null);
    }

    public function cancel(Request $request): JsonResponse
    {
        $guest = $this->guest($request);
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer']]);

        return $this->transition([...$input, 'action' => 'cancelled', 'reason' => 'Cancelled by passenger.'], null, $guest);
    }

    private function transition(array $input, ?int $providerId, ?string $guest): JsonResponse
    {
        ProviderLifecycle::expirePending();
        $input['version'] = (int) $input['version'];

        return DB::transaction(function () use ($input, $providerId, $guest): JsonResponse {
            $query = DB::table('provider_seat_requests')->where('reference', $input['reference']);
            if ($guest !== null) {
                $query->where('guest_hash', $guest);
            }
            $candidate = $query->first();
            abort_unless($candidate, 404);
            $sailingQuery = DB::table('provider_sailings')->where('id', $candidate->provider_sailing_id);
            if ($providerId !== null) {
                $sailingQuery->where('provider_account_id', $providerId);
            }
            $sailing = $sailingQuery->lockForUpdate()->first();
            abort_unless($sailing, 404);
            $booking = DB::table('provider_seat_requests')->where('id', $candidate->id)->lockForUpdate()->first();
            if ($booking->status === $input['action'] && $booking->version === $input['version'] + 1) {
                return response()->json(['booking' => self::present($booking)]);
            }
            abort_unless($booking->version === $input['version'] && in_array($booking->status, $guest === null ? ($input['action'] === 'completed' ? ['confirmed'] : ['requested']) : ['requested', 'confirmed'], true), 409, 'Request changed. Refresh before taking action.');
            if ($input['action'] === 'completed') {
                abort_unless(CarbonImmutable::parse($sailing->arrival_at, 'UTC')->isPast(), 409, 'Complete the service only after arrival.');
            } else {
                abort_unless(CarbonImmutable::parse($sailing->departure_at, 'UTC')->isFuture(), 409, 'Departure has passed. Refresh for the current status.');
            }
            if ($input['action'] === 'confirmed') {
                abort_unless($sailing->status === 'published', 409, 'Publish the sailing before confirming requests.');
                $changed = DB::table('provider_sailings')->where('id', $sailing->id)->whereRaw('confirmed_seats + ? <= seat_capacity', [$booking->seats])->increment('confirmed_seats', $booking->seats);
                abort_unless($changed === 1, 409, 'Insufficient seats. Another request may have been confirmed.');
            } elseif ($booking->status === 'confirmed' && $input['action'] === 'cancelled') {
                DB::table('provider_sailings')->where('id', $sailing->id)->decrement('confirmed_seats', $booking->seats);
            }
            if (in_array($input['action'], ['cancelled', 'declined'], true)) {
                ProviderLifecycle::cancelTaxi('provider_seat_request_id', $booking->id, 'Ferry request '.$input['action'].'.');
            }
            $events = json_decode($booking->events, true);
            $events[] = ['status' => $input['action'], 'actor' => $guest === null ? 'provider' : 'passenger', 'at' => now()->toIso8601String(), 'reason' => $input['reason'] ?? ($input['action'] === 'completed' ? 'Arrival recorded by the provider.' : 'Demo seat request confirmed by operator.')];
            $changed = DB::table('provider_seat_requests')->where('id', $booking->id)->where('version', $input['version'])->update(['status' => $input['action'], 'version' => $input['version'] + 1, 'events' => json_encode($events), 'updated_at' => now()]);
            abort_unless($changed === 1, 409, 'Request changed. Refresh before taking action.');

            return response()->json(['booking' => self::present(DB::table('provider_seat_requests')->find($booking->id))]);
        }, 5);
    }
}
