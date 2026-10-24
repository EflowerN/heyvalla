<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Rule;

class JourneyDetails
{
    public static function rules(bool $required = false): array
    {
        return [
            'journey_details' => [...($required ? [] : ['sometimes']), 'required', 'array:arrival_airport_id,destination_id,flight_arrival_at,address,taxi_zone,flight_offer_id'],
            'journey_details.arrival_airport_id' => ['required_with:journey_details', 'string', Rule::in(array_column(config('locations.airports'), 'id'))],
            'journey_details.destination_id' => ['required_with:journey_details', 'string', Rule::in(array_column([...config('locations.islands'), ...config('locations.airports')], 'id'))],
            'journey_details.flight_arrival_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
            'journey_details.flight_offer_id' => ['nullable', 'string', 'max:100'],
            'journey_details.address' => ['nullable', 'string', 'max:160'],
            'journey_details.taxi_zone' => ['nullable', Rule::in(['male', 'hulhumale-phase-1', 'hulhumale-phase-2'])],
        ];
    }

    public static function fingerprint(?array $input): ?string
    {
        if ($input === null) {
            return null;
        }

        return hash('sha256', json_encode([
            'arrival_airport_id' => $input['arrival_airport_id'],
            ...(! empty($input['flight_offer_id']) ? ['flight_offer_id' => $input['flight_offer_id']] : []),
            'destination_id' => $input['destination_id'],
            'flight_arrival_at' => empty($input['flight_arrival_at']) ? null : CarbonImmutable::parse($input['flight_arrival_at'])->utc()->toIso8601String(),
            'address' => trim($input['address'] ?? ''),
            'taxi_zone' => $input['taxi_zone'] ?? null,
        ]));
    }

    public static function snapshot(array $input, ?array $flight, ?string $originId = null): array
    {
        abort_unless($flight && ! empty($flight['check_in_deadline_at']), 422, 'Add a flight target before saving the onward journey.');
        $airport = collect(config('locations.airports'))->firstWhere('id', $input['arrival_airport_id']);
        $destination = collect([...config('locations.islands'), ...config('locations.airports')])->firstWhere('id', $input['destination_id']);
        abort_unless($airport && $destination, 422, 'Choose locations from the directory.');
        abort_if($airport['id'] === TravelJourneys::AIRPORT, 422, 'Choose different departure and arrival airports.');
        abort_if($originId && $destination['id'] === $originId, 422, 'Choose a final destination different from your starting island.');
        $arrival = empty($input['flight_arrival_at']) ? null : CarbonImmutable::parse($input['flight_arrival_at']);
        abort_if($arrival && $arrival->lessThanOrEqualTo(CarbonImmutable::parse($flight['flight_at'])), 422, 'Flight arrival must be after departure; check the arrival date.');
        $selectedFlight = empty($input['flight_offer_id']) ? null : app(FlightCatalogue::class)->selection($input['flight_offer_id'], $flight, $airport['id'], $arrival?->toIso8601String());
        $zone = null;
        if ($airport['id'] === 'VRMM' && $destination['id'] === 'ld0442') {
            $zone = 'male';
        } elseif ($airport['id'] === 'VRMM' && $destination['id'] === 'ld0591') {
            abort_unless(in_array($input['taxi_zone'] ?? null, ['hulhumale-phase-1', 'hulhumale-phase-2'], true), 422, 'Choose the Hulhumalé drop-off phase.');
            $zone = $input['taxi_zone'];
        }
        abort_if(isset($input['taxi_zone']) && $input['taxi_zone'] !== $zone, 422, 'The taxi fare zone does not match the arrival airport and destination.');
        $address = trim($input['address'] ?? '');
        $onward = null;
        if ($destination['id'] !== $airport['id']) {
            $onward = [
                'mode' => $zone ? 'taxi' : 'land', 'label' => $zone ? 'Onward taxi to destination' : 'Onward connection needed',
                'from' => $airport['name'], 'to' => ($address !== '' ? $address.', ' : '').$destination['name'],
                'departure_at' => null, 'arrival_at' => null,
                'status' => $zone ? 'external_not_booked' : 'connection_missing', 'price_minor' => null,
                'reference_estimate_minor' => $zone ? config('greater_male_fares.fares_minor')['domestic-terminal'][$zone] : null,
                'source' => $zone ? 'avas_matrix_reference' : 'no_connected_service',
                'note' => $zone ? 'Per-vehicle reference estimate from the domestic terminal, not a confirmed quote. Capacity, fare validity and surcharges are unknown. Arrange pickup after baggage collection. Address is a note, not a geocoded route.' : 'No connected service is established for this island. Arrange this leg separately.',
            ];
        }

        return [
            'arrival_airport' => array_intersect_key($airport, array_flip(['id', 'name', 'iata'])),
            'destination' => array_intersect_key($destination, array_flip(['id', 'name', 'iata', 'atoll', 'category'])),
            'flight_arrival_at' => $arrival?->setTimezone('Indian/Maldives')->toIso8601String(),
            'address' => $address, 'taxi_zone' => $zone, 'onward_transfer' => $onward,
            'selected_flight' => $selectedFlight,
            'source' => 'passenger_input', 'saved_at' => now()->toIso8601String(),
        ];
    }
}
