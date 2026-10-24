<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class FlightSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 24)->setTime(11, 30));
    }

    private function search(array $overrides = []): TestResponse
    {
        return $this->getJson('/api/v1/flights?'.http_build_query([...['from' => 'VRNT', 'to' => 'VRMM', 'date' => '2026-10-25', 'fare_profile' => 'maldivian_adult'], ...$overrides]));
    }

    public function test_nearest_checked_dates_are_sorted_and_not_claimed_as_live_inventory(): void
    {
        $this->search()->assertOk()->assertJsonPath('live_availability', false)->assertJsonPath('ticketing', 'airline_checkout')
            ->assertJsonCount(0, 'same_day')->assertJsonCount(4, 'nearby')
            ->assertJsonPath('nearby.0.departure_at', '2026-10-27T09:55:00+05:00')
            ->assertJsonPath('nearby.0.day_offset', 2)->assertJsonPath('nearby.0.fare_minor', 111100)
            ->assertJsonPath('nearby.0.currency', 'MVR')->assertJsonPath('nearby.0.observed_seats', 1)
            ->assertJsonPath('nearby.3.departure_at', '2026-10-31T10:20:00+05:00');
        $this->search(['date' => '2026-10-29'])->assertJsonCount(1, 'same_day')->assertJsonPath('same_day.0.fare_minor', 146400)
            ->assertJsonCount(3, 'nearby')->assertJsonPath('nearby.0.day_offset', -2);
    }

    public function test_unknown_routes_profiles_and_distant_dates_do_not_invent_fares(): void
    {
        foreach ([['from' => 'VRMM', 'to' => 'VRNT'], ['fare_profile' => 'other'], ['date' => '2026-12-01']] as $query) {
            $this->search($query)->assertOk()->assertJsonCount(0, 'same_day')->assertJsonCount(0, 'nearby');
        }
        foreach ([['date' => 'not-a-date'], ['date' => '2026-10-23'], ['from' => 'INVALID'], ['to' => 'VRNT']] as $query) {
            $this->search($query)->assertUnprocessable();
        }
    }

    public function test_old_references_are_marked_stale_and_departed_flights_are_excluded(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 28));
        $this->search(['date' => '2026-10-28'])->assertOk()->assertJsonCount(2, 'nearby')
            ->assertJsonPath('nearby.0.stale', true)->assertJsonPath('nearby.0.departure_at', '2026-10-29T21:05:00+05:00');
    }

    private function booking(): array
    {
        return ['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2026-10-29', 'flight_time' => '21:05', 'check_in_minutes' => 60,
            'sailing_id' => 'HV101-2026-10-29', 'request_id' => (string) Str::uuid(), 'passenger_name' => 'Flight Test', 'email' => 'demo@example.test', 'seats' => 1,
            'journey_details' => ['arrival_airport_id' => 'VRMM', 'destination_id' => 'ld0591', 'flight_arrival_at' => '2026-10-29T21:55:00+05:00',
                'address' => 'Demo Home', 'taxi_zone' => 'hulhumale-phase-1', 'flight_offer_id' => 'maldivian-tmf-mle-20261029-flex']];
    }

    public function test_saved_flight_uses_server_reference_without_marking_an_airline_booking(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        $payload = $this->booking();
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $journey = $this->getJson('/api/v1/journeys')->assertOk()->json('journeys.0');
        $this->assertSame('Q2 183', $journey['journey_details']['selected_flight']['flight_number']);
        $this->assertSame(146400, $journey['journey_details']['selected_flight']['fare_minor']);
        $this->assertSame('external_not_booked', $journey['legs'][2]['status']);
        $this->assertNull($journey['legs'][2]['price_minor']);
        $this->assertTrue($journey['flight_price_unknown']);
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $this->assertDatabaseCount('demo_bookings', 1);
        $this->postJson('/api/v1/demo-bookings', [...$payload, 'journey_details' => [...$payload['journey_details'], 'flight_offer_id' => 'other']])->assertConflict();
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1,
            'journey_details' => [...$payload['journey_details'], 'address' => 'Updated home']])->assertOk()
            ->assertJsonPath('journey.journey_details.selected_flight.fare_minor', 146400);
        $manual = $payload['journey_details'];
        unset($manual['flight_offer_id']);
        $manual['flight_arrival_at'] = '2026-10-29T22:00:00+05:00';
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 2, 'journey_details' => $manual])->assertOk()
            ->assertJsonPath('journey.journey_details.selected_flight', null);
    }

    public function test_mismatched_or_forged_flight_reference_rolls_back_the_booking(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        foreach ([['flight_offer_id' => 'forged'], ['flight_arrival_at' => '2026-10-29T22:00:00+05:00'], ['arrival_airport_id' => 'VRMG'], ['fare_minor' => 1]] as $change) {
            $payload = $this->booking();
            $payload['journey_details'] = [...$payload['journey_details'], ...$change];
            $this->postJson('/api/v1/demo-bookings', $payload)->assertUnprocessable();
            $this->assertDatabaseCount('demo_bookings', 0);
        }
        $payload = $this->booking();
        $payload['flight_time'] = '21:06';
        $this->postJson('/api/v1/demo-bookings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('travel_journeys', 0);
    }
}
