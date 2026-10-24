<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class DemoCheckout
{
    public static function quote(array $input, string $guest): array
    {
        $items = [];
        $journey = null;
        $count = (int) ($input['passengers'] ?? 1);
        $type = $input['kind'];
        $id = $input['id'] ?? '';
        $version = null;
        if ($type === 'sea') {
            $route = SeaJourneySearch::selected($id, $input['date'], $count);
            foreach ($route['legs'] as $leg) {
                $items[] = [...self::item('sea', $leg['label'], $leg['origin'], $leg['destination'], $leg['price_minor'], 'Fictional ferry schedule and fare. Simulated booking only; no operator seat reserved.', $leg['departure_at'], $leg['arrival_at']), 'sailing_id' => $leg['id']];
            }
            $id .= ':'.$input['date'];
        } elseif ($type === 'journey') {
            $journey = DB::table('travel_journeys')->where('reference', $id)->where('guest_hash', $guest)->lockForUpdate()->first();
            abort_unless($journey, 404);
            $booking = TravelJourneys::booking($journey, true);
            abort_unless(in_array($booking->status, ['confirmed', 'demo_confirmed'], true), 409, 'Confirm the ferry before booking the remaining demo services.');
            $details = json_decode($journey->journey_details ?? 'null', true);
            $plan = json_decode($journey->flight_plan ?? 'null', true);
            abort_unless($details && $plan && ! empty($plan['harbour_arrival_at']) && ! empty($plan['airport_arrival_at']) && ! empty($details['flight_arrival_at']), 422, 'Save flight arrival and destination details first.');
            abort_unless(CarbonImmutable::parse($plan['flight_at'])->isFuture(), 422, 'Choose a future flight.');
            $count = $booking->seats;
            $version = $journey->details_version;
            $selected = $details['selected_flight'] ?? null;
            $items[] = self::item('flight', $selected ? $selected['airline'].' '.$selected['flight_number'] : 'Demo flight', 'Thimarafushi Airport', $details['arrival_airport']['name'], ($selected['fare_minor'] ?? 146400) * $count, $selected ? 'Checked airline fare used as a simulated adult fare, not a group quote.' : 'Fictional demo fare: MVR 1,464 per passenger.', $plan['flight_at'], $details['flight_arrival_at']);
            $taxi = DB::table('demo_taxi_requests')->where($journey->provider_seat_request_id ? 'provider_seat_request_id' : 'demo_booking_id', $booking->id)->first();
            if (! $taxi || in_array($taxi->status, ['cancelled', 'declined'], true)) {
                $items[] = self::item('taxi', 'Thimarafushi transfer · demo', 'Thimarafushi harbour', 'Thimarafushi Airport', 8000 * (int) ceil($count / 4), 'Fictional demo price: MVR 80 per four-seat vehicle.', $plan['harbour_arrival_at'], $plan['airport_arrival_at']);
            } else {
                abort_unless($taxi->status === 'confirmed' && $taxi->passengers >= $count, 409, 'Resolve the existing Thimarafushi taxi request first, or cancel it to use the instant demo transfer.');
            }
            if ($details['destination']['id'] !== $details['arrival_airport']['id']) {
                abort_unless($details['taxi_zone'], 422, 'This demo has no connected onward service for that destination.');
                if (($input['onward'] ?? 'taxi') === 'bus') {
                    $routeId = ['male' => 'R3', 'hulhumale-phase-1' => 'R4', 'hulhumale-phase-2' => 'R9'][$details['taxi_zone']];
                    $route = collect(config('rtl_buses.routes'))->firstWhere('id', $routeId);
                    $items[] = self::bus($route, $count, $details['flight_arrival_at']);
                } else {
                    $fare = config('greater_male_fares.fares_minor')['domestic-terminal'][$details['taxi_zone']];
                    $items[] = self::item('taxi', 'Greater Malé taxi · demo', 'Velana domestic terminal', ($details['address'] ? $details['address'].', ' : '').$details['destination']['name'], $fare * (int) ceil($count / 4), 'Avas Ride matrix reference; four seats per demo vehicle is a fictional assumption. Pickup after baggage collection; no real driver.');
                }
            }
        } elseif ($type === 'flight') {
            $offer = app(FlightCatalogue::class)->find($id);
            abort_unless($offer && CarbonImmutable::parse($offer['departure_at'])->isFuture(), 422, 'Choose a future checked flight.');
            $items[] = self::item('flight', $offer['airline'].' '.$offer['flight_number'], $offer['from_iata'], $offer['to_iata'], $offer['fare_minor'] * $count, 'Checked Maldivian adult fare reused for simulation only; actual party fare and availability may differ.', $offer['departure_at'], $offer['arrival_at']);
        } elseif ($type === 'taxi') {
            $from = $input['from'] ?? '';
            $to = $input['to'] ?? '';
            $fare = config('greater_male_fares.fares_minor')[$from][$to] ?? null;
            abort_unless($from !== $to && $fare !== null, 422, 'Choose different valid taxi zones.');
            $id = $from.':'.$to.':'.$input['date'];
            $items[] = self::item('taxi', 'Greater Malé taxi · demo', $from, $to, $fare * (int) ceil($count / 4), 'Avas Ride matrix reference; four seats per demo vehicle. No real driver or pickup time assigned.');
        } else {
            $route = collect(config('rtl_buses.routes'))->firstWhere('id', $id);
            abort_unless($route && $route['fare_minor'] !== null, 422, 'Choose a bus route with a known reference fare.');
            $items[] = self::bus($route, $count, null);
            $id .= ':'.$input['date'];
        }
        $quote = ['kind' => $type, 'context_key' => $type.':'.$id, 'journey_reference' => $journey?->reference, 'details_version' => $version, 'passengers' => $count, 'travel_date' => $input['date'] ?? null, 'items' => $items, 'total_minor' => array_sum(array_column($items, 'price_minor')), 'currency' => 'MVR', 'demo' => true, 'notice' => ($type === 'sea' ? 'Ferry-only demo; all listed legs are saved together. ' : '').'Simulation only. No money collected, airline ticket, driver, bus pass or provider reservation issued.'.($type === 'sea' ? ' Listed ferry legs are included in this simulated total.' : ' Existing ferry charges are separate.')];
        $quote['quote_hash'] = hash('sha256', json_encode($quote));

        return $quote;
    }

    private static function item(string $mode, string $label, string $from, string $to, int $price, string $note, ?string $departure = null, ?string $arrival = null): array
    {
        return ['mode' => $mode, 'label' => $label, 'from' => $from, 'to' => $to, 'price_minor' => $price, 'note' => $note, 'departure_at' => $departure, 'arrival_at' => $arrival, 'status' => 'demo_confirmed'];
    }

    private static function bus(array $route, int $count, ?string $after): array
    {
        return [...self::item('bus', 'RTL '.$route['id'].' · demo', $after ? 'VIA Domestic Terminal OPP' : $route['origin'], $route['destination'], $route['fare_minor'] * $count, 'Published route/fare snapshot; simulation does not confirm operation, date or seats. Alight at a bus stop and arrange the last mile. Airport pickup time is unknown.'), 'route_id' => $route['id'], 'stops' => $route['stops'], 'origin_departures' => $route['origin_departures'], 'ready_after' => $after];
    }

    public static function present(object $booking): array
    {
        $snapshot = json_decode($booking->snapshot, true);
        $status = $booking->status;
        if ($booking->journey_reference && $status === 'demo_confirmed') {
            $journey = DB::table('travel_journeys')->where('reference', $booking->journey_reference)->first();
            if (! $journey || $journey->details_version !== $booking->details_version || ! in_array(TravelJourneys::booking($journey)->status, ['confirmed', 'demo_confirmed', 'completed'], true)) {
                $status = 'needs_review';
            }
        }

        return [...$snapshot, 'reference' => $booking->reference, 'status' => $status, 'created_at' => $booking->created_at];
    }
}
