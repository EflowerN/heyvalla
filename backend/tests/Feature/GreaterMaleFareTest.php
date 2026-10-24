<?php

namespace Tests\Feature;

use Tests\TestCase;

class GreaterMaleFareTest extends TestCase
{
    public function test_zones_and_unknown_fare_validity(): void
    {
        $this->getJson('/api/v1/greater-male-fares')->assertOk()->assertJsonCount(6, 'zones')->assertJsonPath('currency', 'MVR')->assertJsonPath('valid_from', null)->assertJsonPath('estimate', null);
    }

    public function test_source_values_include_airport_fares(): void
    {
        foreach ([['male', 'velana-airport', 7000], ['hulhumale-phase-1', 'velana-airport', 8000], ['hulhumale-phase-2', 'velana-airport', 8500], ['velana-airport', 'domestic-terminal', 3000], ['seaplane', 'hulhumale-phase-2', 12000]] as [$from, $to, $amount]) {
            $this->getJson('/api/v1/greater-male-fares?'.http_build_query(compact('from', 'to')))->assertOk()->assertJsonPath('estimate.amount_minor', $amount)->assertJsonPath('estimate.same_zone', $from === $to)->assertJsonPath('estimate.currency', 'MVR');
        }
    }

    public function test_invalid_or_thimarafushi_zones_are_rejected(): void
    {
        foreach ([['from' => 'male'], ['from' => 'thimarafushi', 'to' => 'velana-airport'], ['from' => ['male'], 'to' => 'velana-airport']] as $input) {
            $this->getJson('/api/v1/greater-male-fares?'.http_build_query($input))->assertUnprocessable();
        }
    }

    public function test_same_pickup_and_destination_are_rejected_for_every_zone(): void
    {
        foreach (config('greater_male_fares.zones') as $zone) {
            $this->getJson('/api/v1/greater-male-fares?'.http_build_query(['from' => $zone['id'], 'to' => $zone['id']]))->assertUnprocessable()->assertJsonValidationErrors('to');
        }
    }
}
