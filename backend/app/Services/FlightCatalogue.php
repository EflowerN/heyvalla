<?php

namespace App\Services;

use Carbon\CarbonImmutable;

class FlightCatalogue
{
    public function data(): array
    {
        return json_decode(file_get_contents(resource_path('data/maldivian-flights.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    public function find(string $id): ?array
    {
        return collect($this->data()['flights'])->firstWhere('id', $id);
    }

    public function search(array $input): array
    {
        $data = $this->data();
        $date = CarbonImmutable::createFromFormat('!Y-m-d', $input['date'], 'Indian/Maldives');
        $matches = collect($data['flights'])->filter(function (array $flight) use ($input, $date): bool {
            $departure = CarbonImmutable::parse($flight['departure_at']);

            return $flight['from'] === $input['from'] && $flight['to'] === $input['to']
                && $flight['fare_profile'] === $input['fare_profile'] && $departure->isFuture()
                && abs($date->diffInDays($departure->startOfDay(), false)) <= 14;
        })->map(function (array $flight) use ($date): array {
            $flight['day_offset'] = (int) $date->diffInDays(CarbonImmutable::parse($flight['departure_at'])->startOfDay(), false);
            $flight['stale'] = CarbonImmutable::parse($flight['checked_at'])->addDay()->isPast();

            return $flight;
        })->sortBy(fn (array $flight): array => [abs($flight['day_offset']), $flight['departure_at'], $flight['fare_minor']])->values();

        return [
            'mode' => 'checked_reference', 'live_availability' => false, 'ticketing' => 'airline_checkout',
            'search' => $input, 'window_days' => 14, 'source_url' => $data['source_url'],
            'checked_at' => $data['checked_at'], 'coverage' => $data['coverage'],
            'same_day' => $matches->where('day_offset', 0)->values(),
            'nearby' => $matches->where('day_offset', '!=', 0)->values(),
            'message' => 'Manually checked Maldivian fares, not a live seat search. Missing dates or routes mean no checked record, not no flight. Recheck availability, passenger eligibility and final price with Maldivian.',
        ];
    }

    public function selection(string $id, array $flightPlan, string $arrivalAirport, ?string $arrivalAt): array
    {
        $offer = $this->find($id);
        abort_unless($offer, 422, 'This flight reference is unknown. Search again or enter your flight manually.');
        abort_unless($offer['from'] === ($flightPlan['airport_id'] ?? TravelJourneys::AIRPORT) && $offer['to'] === $arrivalAirport
            && CarbonImmutable::parse($offer['departure_at'])->equalTo(CarbonImmutable::parse($flightPlan['flight_at']))
            && $arrivalAt && CarbonImmutable::parse($offer['arrival_at'])->equalTo(CarbonImmutable::parse($arrivalAt)),
            422, 'The selected airline flight no longer matches the journey airports or times. Select it again or use manual flight details.');

        return $offer;
    }
}
