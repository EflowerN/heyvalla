<?php

namespace App\Services;

use Carbon\CarbonImmutable;

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
                if ($arrival->toDateString() !== $flight->toDateString()) {
                    continue;
                }

                $airportArrival = $arrival->addMinutes($transfer);
                $buffer = (int) $airportArrival->diffInMinutes($deadline, false);
                $classification = $sailing['status'] === 'cancelled' ? 'cancelled'
                    : ($buffer < 0 ? 'too_late' : ($buffer < $safety ? 'tight' : 'recommended'));
                $results[] = [
                    'id' => $sailing['id'].'-'.$departure->toDateString(),
                    'service' => $sailing['id'],
                    'operator' => 'HeyValla Demo Ferries',
                    'departure_at' => $departure->toIso8601String(),
                    'harbour_arrival_at' => $arrival->toIso8601String(),
                    'airport_arrival_at' => $airportArrival->toIso8601String(),
                    'connection_buffer_minutes' => $buffer,
                    'classification' => $classification,
                    'status' => $sailing['status'],
                ];
            }
        }

        usort($results, fn (array $a, array $b): int => strcmp($a['departure_at'], $b['departure_at']));

        return [
            'demo' => true,
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
