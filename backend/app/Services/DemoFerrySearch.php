<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class DemoFerrySearch
{
    /** @param array{island: string, airport: string, flight_date: string, flight_time: string, check_in_minutes: int|string} $input */
    public function search(array $input): array
    {
        $timezone = config('demo_ferries.timezone');
        $flight = CarbonImmutable::createFromFormat('!Y-m-d H:i', $input['flight_date'].' '.$input['flight_time'], $timezone);
        $deadline = $flight->subMinutes((int) $input['check_in_minutes']);
        $transfer = config('demo_ferries.transfer_minutes');
        $safety = config('demo_ferries.safety_minutes');
        $results = [];
        $origin = collect(config('locations.islands'))->firstWhere('id', $input['island']);
        $airport = collect(config('locations.airports'))->firstWhere('id', $input['airport']);
        $covered = $airport['id'] === 'VRNT' && in_array($input['island'], array_column(config('demo_ferries.sailings'), 'island'), true);

        foreach (config('demo_ferries.sailings') as $sailing) {
            if (! $covered || $sailing['island'] !== $input['island']) {
                continue;
            }

            foreach ([-1, 0] as $dayOffset) {
                $date = $flight->startOfDay()->addDays($dayOffset);
                $departure = $date->setTimeFromTimeString($sailing['departure']);
                $arrival = $date->addDays($sailing['arrival_day'])->setTimeFromTimeString($sailing['arrival']);
                if ($arrival->toDateString() !== $flight->toDateString() || ! $departure->isFuture()) {
                    continue;
                }

                $airportArrival = $arrival->addMinutes($transfer);
                $buffer = (int) $airportArrival->diffInMinutes($deadline, false);
                $classification = $sailing['status'] === 'cancelled' ? 'cancelled'
                    : ($buffer < 0 ? 'too_late' : ($buffer < $safety ? 'tight' : 'recommended'));
                $sailingId = $sailing['id'].'-'.$departure->toDateString();
                $inventory = DB::table('demo_inventories')->where('sailing_id', $sailingId)->first();
                $available = $inventory ? $inventory->capacity - $inventory->reserved : config('demo_ferries.capacity');
                $results[] = [
                    'source' => 'legacy',
                    'available_seats' => $sailing['status'] === 'cancelled' ? 0 : $available,
                    'bookable' => $classification === 'recommended' && $available > 0 && $departure->isFuture(),
                    'id' => $sailing['id'].'-'.$departure->toDateString(),
                    'service' => $sailing['id'],
                    'operator' => 'Dhathuru App Demo Ferries',
                    'departure_at' => $departure->toIso8601String(),
                    'harbour_arrival_at' => $arrival->toIso8601String(),
                    'airport_arrival_at' => $airportArrival->toIso8601String(),
                    'connection_buffer_minutes' => $buffer,
                    'classification' => $classification,
                    'status' => $sailing['status'],
                ];
            }
        }

        if ($airport['id'] === 'VRNT') {
            $providers = DB::table('provider_sailings as s')->join('provider_accounts as p', 'p.id', '=', 's.provider_account_id')->join('provider_vessels as v', 'v.id', '=', 's.provider_vessel_id')->where('s.status', 'published')->where('s.origin_id', $input['island'])->where('s.destination_id', TravelJourneys::HARBOUR_ISLAND)->where('s.departure_at', '>', now())->whereBetween('s.arrival_at', [$flight->startOfDay()->utc(), $flight->endOfDay()->utc()])->get(['s.*', 'p.organization_name', 'v.booking_mode', 'v.name as vessel_name']);
            foreach ($providers as $sailing) {
                if ((json_decode($sailing->operations ?? 'null', true)['cargo_status'] ?? null) === 'departed') {
                    continue;
                }
                $departure = CarbonImmutable::parse($sailing->departure_at, 'UTC')->setTimezone($timezone);
                $arrival = CarbonImmutable::parse($sailing->arrival_at, 'UTC')->setTimezone($timezone);
                $airportArrival = $arrival->addMinutes($transfer);
                $buffer = (int) $airportArrival->diffInMinutes($deadline, false);
                $classification = $buffer < 0 ? 'too_late' : ($buffer < $safety ? 'tight' : 'recommended');
                $available = $sailing->seat_capacity - $sailing->confirmed_seats;
                $results[] = ['source' => 'provider', 'provider_sailing_id' => $sailing->id, 'version' => $sailing->version, 'fare_minor' => $sailing->fare_minor, 'id' => 'provider-'.$sailing->id, 'service' => $sailing->vessel_name, 'operator' => $sailing->organization_name, 'available_seats' => $available, 'bookable' => $classification === 'recommended' && $available > 0 && $sailing->fare_minor !== null && $sailing->booking_mode === 'request_to_book', 'departure_at' => $departure->toIso8601String(), 'harbour_arrival_at' => $arrival->toIso8601String(), 'airport_arrival_at' => $airportArrival->toIso8601String(), 'connection_buffer_minutes' => $buffer, 'classification' => $classification, 'status' => 'scheduled'];
            }
            $covered = $covered || $providers->isNotEmpty();
        }

        usort($results, fn (array $a, array $b): int => strcmp($a['departure_at'], $b['departure_at']));

        return [
            'demo' => true,
            'search' => $input,
            'timezone' => $timezone,
            'origin' => $origin['name'].' · '.$origin['atoll'],
            'destination' => $airport['name'],
            'destination_code' => $airport['iata'],
            'schedule_coverage' => $covered,
            'coverage_message' => $covered ? null : 'No demo schedules are available for this island and airport pair. This does not mean no real transport exists.',
            'flight_at' => $flight->toIso8601String(),
            'check_in_deadline_at' => $deadline->toIso8601String(),
            'transfer_minutes' => $covered ? $transfer : null,
            'safety_minutes' => $safety,
            'sailings' => $results,
        ];
    }
}
