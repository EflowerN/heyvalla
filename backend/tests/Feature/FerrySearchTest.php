<?php

namespace Tests\Feature;

use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class FerrySearchTest extends TestCase
{
    private function search(array $overrides = []): TestResponse
    {
        return $this->getJson('/api/v1/ferry-search?'.http_build_query(array_merge([
            'island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2026-11-10', 'flight_time' => '14:00', 'check_in_minutes' => 60,
        ], $overrides)));
    }

    public function test_search_classifies_connections_and_cancellations(): void
    {
        $this->search()->assertOk()->assertJsonPath('demo', true)
            ->assertJsonPath('timezone', 'Indian/Maldives')
            ->assertJsonPath('check_in_deadline_at', '2026-11-10T13:00:00+05:00')
            ->assertJsonPath('sailings.0.classification', 'recommended')
            ->assertJsonPath('sailings.1.classification', 'cancelled')
            ->assertJsonPath('sailings.2.classification', 'tight')
            ->assertJsonPath('sailings.2.connection_buffer_minutes', 20)
            ->assertJsonPath('sailings.3.classification', 'too_late');
    }

    public function test_exact_safety_and_deadline_boundaries(): void
    {
        $this->search(['flight_time' => '14:10'])->assertJsonPath('sailings.2.classification', 'recommended')
            ->assertJsonPath('sailings.2.connection_buffer_minutes', 30);
        $this->search(['flight_time' => '13:40'])->assertJsonPath('sailings.2.classification', 'tight')
            ->assertJsonPath('sailings.2.connection_buffer_minutes', 0);
        $this->search(['flight_time' => '13:39'])->assertJsonPath('sailings.2.classification', 'too_late');
    }

    public function test_overnight_ferry_uses_previous_day_and_maldives_timezone(): void
    {
        $this->search(['island' => 'ld1163', 'flight_time' => '02:00'])
            ->assertJsonPath('sailings.0.departure_at', '2026-11-09T22:30:00+05:00')
            ->assertJsonPath('sailings.0.airport_arrival_at', '2026-11-10T00:50:00+05:00')
            ->assertJsonPath('sailings.0.connection_buffer_minutes', 10)
            ->assertJsonPath('sailings.0.classification', 'tight');
        $this->search(['flight_time' => '00:30'])->assertJsonPath('check_in_deadline_at', '2026-11-09T23:30:00+05:00');
    }

    public function test_invalid_inputs_are_rejected(): void
    {
        foreach ([['island' => 'unknown'], ['flight_date' => '2026-02-30'], ['flight_time' => '25:00'], ['check_in_minutes' => -5], ['island' => ['ld0205']]] as $invalid) {
            $this->search($invalid)->assertUnprocessable();
        }
        $this->getJson('/api/v1/ferry-search')->assertUnprocessable();
    }

    public function test_islands_and_empty_results(): void
    {
        $this->getJson('/api/v1/islands')->assertOk()->assertJsonCount(531, 'islands')->assertJsonCount(20, 'airports');
        config(['demo_ferries.sailings' => []]);
        $this->search()->assertOk()->assertJsonCount(0, 'sailings');
    }

    public function test_uncovered_locations_return_no_invented_sailings(): void
    {
        $this->search(['airport' => 'VRMM'])->assertOk()
            ->assertJsonPath('destination', 'Velana International Airport')
            ->assertJsonPath('schedule_coverage', false)
            ->assertJsonPath('transfer_minutes', null)
            ->assertJsonCount(0, 'sailings');
        $other = collect(config('locations.islands'))->firstWhere('atoll', 'Baa');
        $this->search(['island' => $other['id']])->assertOk()
            ->assertJsonPath('schedule_coverage', false)->assertJsonCount(0, 'sailings');
        $this->search(['airport' => 'unknown'])->assertUnprocessable();
    }

    public function test_directory_ids_are_unique_and_duplicate_names_are_distinguished(): void
    {
        $islands = collect(config('locations.islands'));
        $this->assertCount($islands->count(), $islands->pluck('id')->unique());
        $guraidhoo = $islands->where('name', 'Guraidhoo');
        $this->assertGreaterThan(1, $guraidhoo->count());
        $this->assertCount($guraidhoo->count(), $guraidhoo->pluck('atoll')->unique());
        $airports = collect(config('locations.airports'));
        $this->assertCount(20, $airports->pluck('id')->unique());
        $this->assertContains('VRMK', $airports->pluck('id')->all());
    }

    public function test_map_coordinates_and_demo_route_references_are_complete(): void
    {
        $response = $this->getJson('/api/v1/islands')->assertOk()->assertJsonCount(3, 'routes');
        $data = $response->json();
        foreach (array_merge($data['islands'], $data['airports']) as $place) {
            $this->assertIsNumeric($place['latitude']);
            $this->assertIsNumeric($place['longitude']);
            $this->assertGreaterThan(-1, $place['latitude']);
            $this->assertLessThan(8, $place['latitude']);
            $this->assertGreaterThan(72, $place['longitude']);
            $this->assertLessThan(74, $place['longitude']);
        }
        foreach ($data['routes'] as $route) {
            $this->assertContains($route['origin_id'], array_column($data['islands'], 'id'));
            $this->assertContains($route['airport_id'], array_column($data['airports'], 'id'));
            $this->assertTrue($route['demo']);
        }
        $airport = collect($data['airports'])->firstWhere('id', 'VRNT');
        $this->assertEqualsWithDelta(2.2108333, $airport['latitude'], 0.000001);
        $this->assertEqualsWithDelta(73.1530556, $airport['longitude'], 0.000001);
    }

    public function test_resort_islands_are_selectable_without_inventing_schedules(): void
    {
        $islands = collect(config('locations.islands'));
        $this->assertCount(342, $islands->where('category', 'resort'));
        $this->assertCount(189, $islands->where('category', 'residential'));
        $resort = $islands->firstWhere('category', 'resort');
        $this->search(['island' => $resort['id']])->assertOk()
            ->assertJsonPath('schedule_coverage', false)->assertJsonCount(0, 'sailings');
    }
}
