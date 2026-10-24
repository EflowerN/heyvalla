<?php

namespace App\Http\Controllers;

use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DemoTaxiController extends Controller
{
    private function guestHash(Request $request): string
    {
        $guest = $request->header('X-Demo-Guest');
        abort_unless(is_string($guest) && Str::isUuid($guest), 401);

        return hash('sha256', $guest);
    }

    private function authorizeOperator(Request $request): void
    {
        $token = config('demo_taxis.operator_token');
        abort_unless(is_string($token) && strlen($token) >= 32 && hash_equals($token, (string) $request->header('X-Demo-Operator')), 403);
    }

    public function store(Request $request): JsonResponse
    {
        $input = $request->validate(['booking_reference' => ['required', 'string'], 'passengers' => ['required', 'integer', 'min:1', 'max:4'], 'bags' => ['required', 'integer', 'min:0', 'max:4']]);
        $booking = DB::table('demo_bookings')->where('reference', $input['booking_reference'])->where('guest_hash', $this->guestHash($request))->first();
        abort_unless($booking, 404);
        $journey = json_decode($booking->journey, true);
        abort_unless($journey['destination'] === 'Thimarafushi Airport', 422, 'Taxi coverage is limited to Thimarafushi harbour → airport.');
        if ($input['passengers'] > $booking->seats) {
            throw ValidationException::withMessages(['passengers' => 'Taxi passengers cannot exceed the ferry booking seat count.']);
        }
        $arrival = CarbonImmutable::parse($journey['harbour_arrival_at'] ?? CarbonImmutable::parse($journey['airport_arrival_at'])->subMinutes(20)->toIso8601String());
        abort_unless($arrival->isFuture(), 422, 'This journey has already arrived.');
        DB::table('demo_taxi_requests')->insertOrIgnore([
            'demo_booking_id' => $booking->id, 'reference' => 'TX-'.strtoupper(Str::random(12)),
            'status' => 'requested', 'passengers' => $input['passengers'], 'bags' => $input['bags'],
            'pickup_at' => $arrival->addMinutes(config('demo_taxis.disembarkation_minutes'))->toIso8601String(),
            'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $taxi = DB::table('demo_taxi_requests')->where('demo_booking_id', $booking->id)->first();
        abort_unless($taxi->passengers === (int) $input['passengers'] && $taxi->bags === (int) $input['bags'], 409, 'A taxi request already exists for this booking with different details.');

        return response()->json(['taxi' => self::present($taxi, $journey)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeOperator($request);
        $requests = DB::table('demo_taxi_requests')->orderByDesc('id')->limit(100)->get()->map(function (object $taxi): array {
            $booking = DB::table('demo_bookings')->find($taxi->demo_booking_id);

            return array_merge(self::present($taxi, json_decode($booking->journey, true)), ['booking_reference' => $booking->reference, 'passenger_name' => $booking->passenger_name]);
        });

        return response()->json(['requests' => $requests])->header('Cache-Control', 'no-store');
    }

    public function operatorUpdate(Request $request): JsonResponse
    {
        $this->authorizeOperator($request);
        $input = $request->validate([
            'reference' => ['required', 'string'], 'version' => ['required', 'integer'],
            'action' => ['required', 'in:quote,decline'], 'pickup_at' => ['required_if:action,quote', 'nullable', 'date_format:Y-m-d\TH:i'],
            'price_minor' => ['required_if:action,quote', 'nullable', 'integer', 'min:1', 'max:1000000'],
            'operator_note' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($input): JsonResponse {
            $taxi = DB::table('demo_taxi_requests')->where('reference', $input['reference'])->lockForUpdate()->first();
            abort_unless($taxi, 404);
            abort_unless(in_array($taxi->status, ['requested', 'quoted'], true) && $taxi->version === (int) $input['version'], 409, 'Request changed; refresh the dashboard.');
            $booking = DB::table('demo_bookings')->find($taxi->demo_booking_id);
            $journey = json_decode($booking->journey, true);
            $updates = ['status' => 'declined', 'operator_note' => $input['operator_note'] ?? null, 'version' => $taxi->version + 1, 'updated_at' => now()];
            if ($input['action'] === 'quote') {
                $pickup = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['pickup_at'], 'Indian/Maldives');
                $arrival = CarbonImmutable::parse($journey['harbour_arrival_at'] ?? CarbonImmutable::parse($journey['airport_arrival_at'])->subMinutes(20)->toIso8601String());
                abort_unless($pickup->isFuture() && $pickup->greaterThanOrEqualTo($arrival->addMinutes(config('demo_taxis.disembarkation_minutes'))), 422, 'Pickup must be in the future and at least five minutes after harbour arrival.');
                if (! empty($journey['check_in_deadline_at'])) {
                    abort_unless($pickup->addMinutes(config('demo_taxis.journey_minutes') + 30)->lessThanOrEqualTo(CarbonImmutable::parse($journey['check_in_deadline_at'])), 422, 'Proposed pickup does not retain the 30-minute check-in safety margin.');
                }
                $updates = array_merge($updates, ['status' => 'quoted', 'pickup_at' => $pickup->toIso8601String(), 'price_minor' => $input['price_minor'], 'quote_expires_at' => now()->addMinutes(30)->toIso8601String()]);
            }
            $changed = DB::table('demo_taxi_requests')->where('id', $taxi->id)->where('version', $taxi->version)->update($updates);
            abort_unless($changed === 1, 409, 'Request changed; refresh the dashboard.');

            return response()->json(['taxi' => self::present(DB::table('demo_taxi_requests')->find($taxi->id), $journey)]);
        }, 5);
    }

    public function accept(Request $request): JsonResponse
    {
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer']]);
        $guest = $this->guestHash($request);

        return DB::transaction(function () use ($input, $guest): JsonResponse {
            $taxi = DB::table('demo_taxi_requests')->where('reference', $input['reference'])->lockForUpdate()->first();
            abort_unless($taxi, 404);
            $booking = DB::table('demo_bookings')->where('id', $taxi->demo_booking_id)->where('guest_hash', $guest)->first();
            abort_unless($booking, 404);
            if ($taxi->status === 'confirmed' && $taxi->version === (int) $input['version'] + 1) {
                return response()->json(['taxi' => self::present($taxi, json_decode($booking->journey, true))]);
            }
            abort_unless($taxi->status === 'quoted' && $taxi->version === (int) $input['version'] && CarbonImmutable::parse($taxi->quote_expires_at)->isFuture() && CarbonImmutable::parse($taxi->pickup_at)->isFuture(), 409, 'Quote expired or changed. Refresh and ask the operator for a new quote.');
            $changed = DB::table('demo_taxi_requests')->where('id', $taxi->id)->where('version', $taxi->version)->update(['status' => 'confirmed', 'version' => $taxi->version + 1, 'updated_at' => now()]);
            abort_unless($changed === 1, 409);

            return response()->json(['taxi' => self::present(DB::table('demo_taxi_requests')->find($taxi->id), json_decode($booking->journey, true))]);
        }, 5);
    }

    public static function present(object $taxi, array $journey): array
    {
        return ['reference' => $taxi->reference, 'status' => $taxi->status, 'version' => $taxi->version,
            'passengers' => $taxi->passengers, 'bags' => $taxi->bags, 'pickup' => 'Thimarafushi harbour', 'destination' => 'Thimarafushi Airport',
            'pickup_at' => $taxi->pickup_at, 'airport_arrival_at' => CarbonImmutable::parse($taxi->pickup_at)->addMinutes(config('demo_taxis.journey_minutes'))->toIso8601String(),
            'check_in_deadline_at' => $journey['check_in_deadline_at'] ?? null, 'price_minor' => $taxi->price_minor,
            'currency' => 'MVR', 'quote_expires_at' => $taxi->quote_expires_at, 'operator_note' => $taxi->operator_note, 'demo' => true];
    }
}
