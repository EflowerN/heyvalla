<?php

namespace App\Http\Controllers;

use App\Services\ProviderLifecycle;
use App\Services\TravelJourneys;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JourneyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);
        ProviderLifecycle::expirePending();

        return response()->json(['journeys' => DB::table('travel_journeys')->where('guest_hash', $guest)->orderByDesc('id')->limit(100)->get()->map(fn (object $journey): array => TravelJourneys::present($journey))])->header('Cache-Control', 'no-store');
    }

    public function flight(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);
        $input = $request->validate(['reference' => ['required', 'string'], ...TravelJourneys::flightRules()]);

        return DB::transaction(function () use ($guest, $input): JsonResponse {
            $journey = DB::table('travel_journeys')->where('reference', $input['reference'])->where('guest_hash', $guest)->lockForUpdate()->first();
            abort_unless($journey, 404);
            $booking = TravelJourneys::booking($journey, true);
            abort_unless(in_array($booking->status, ['requested', 'confirmed', 'demo_confirmed'], true), 409, 'Ferry request is no longer active.');
            $existingPlan = $journey->flight_plan ? json_decode($journey->flight_plan, true) : null;
            abort_if($existingPlan && ! empty($existingPlan['check_in_deadline_at']) && ! empty($existingPlan['harbour_arrival_at']), 409, 'A flight target is already attached. Refresh your itinerary.');
            $snapshot = json_decode($booking->journey, true);
            $plan = TravelJourneys::flightPlan($input, $snapshot['arrival_at'] ?? $snapshot['harbour_arrival_at'] ?? CarbonImmutable::parse($snapshot['airport_arrival_at'])->subMinutes(20)->toIso8601String(), $snapshot['departure_at'], $journey->provider_seat_request_id ? ($snapshot['destination_id'] ?? null) : TravelJourneys::HARBOUR_ISLAND);
            DB::table('travel_journeys')->where('id', $journey->id)->update(['flight_plan' => json_encode($plan), 'updated_at' => now()]);

            return response()->json(['journey' => TravelJourneys::present(DB::table('travel_journeys')->find($journey->id))]);
        }, 5);
    }
}
