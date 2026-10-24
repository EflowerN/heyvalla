<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 24)->setTime(11, 30));
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
    }

    private function confirm(array $input): array
    {
        $quote = $this->postJson('/api/v1/demo-checkout', [...$input, 'confirm' => false])->assertOk()->json('quote');

        return $this->postJson('/api/v1/demo-checkout', [...$input, 'confirm' => true, 'quote_hash' => $quote['quote_hash']])->assertCreated()->json('booking');
    }

    public function test_flight_demo_is_persistent_idempotent_private_and_cancellable(): void
    {
        $input = ['kind' => 'flight', 'id' => 'maldivian-tmf-mle-20261029-flex', 'passengers' => 2];
        $first = $this->confirm($input);
        $again = $this->confirm($input);
        $this->assertSame($first['reference'], $again['reference']);
        $this->assertSame(292800, $first['total_minor']);
        $this->assertTrue($first['demo']);
        $this->assertDatabaseCount('demo_service_bookings', 1);
        $this->postJson('/api/v1/demo-checkout', [...$input, 'confirm' => true, 'quote_hash' => str_repeat('0', 64)])->assertConflict();
        $this->postJson('/api/v1/demo-checkout/cancel', ['reference' => $first['reference']])->assertOk();
        $this->getJson('/api/v1/demo-checkout')->assertJsonPath('bookings.0.status', 'cancelled');
        $this->confirm($input);
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/demo-checkout')->assertJsonCount(0, 'bookings');
        $this->postJson('/api/v1/demo-checkout/cancel', ['reference' => $first['reference']])->assertNotFound();
    }

    public function test_validates_routes_dates_party_and_uses_server_prices(): void
    {
        $this->confirm(['kind' => 'taxi', 'from' => 'male', 'to' => 'hulhumale-phase-1', 'date' => '2026-10-25', 'passengers' => 5]);
        $bus = $this->confirm(['kind' => 'bus', 'id' => 'R4', 'date' => '2026-10-25', 'passengers' => 2]);
        $this->assertSame(2000, $bus['total_minor']);
        $this->assertSame('R4', $bus['items'][0]['route_id']);
        foreach ([['kind' => 'taxi', 'from' => 'male', 'to' => 'male', 'date' => '2026-10-25'], ['kind' => 'bus', 'id' => 'bad', 'date' => '2026-10-25'], ['kind' => 'flight', 'id' => 'bad'], ['kind' => 'bus', 'id' => 'R4', 'date' => '2026-10-23']] as $input) {
            $this->postJson('/api/v1/demo-checkout', [...$input, 'passengers' => 1, 'confirm' => false])->assertUnprocessable();
        }
        $this->postJson('/api/v1/demo-checkout', ['kind' => 'flight', 'id' => 'maldivian-tmf-mle-20261029-flex', 'passengers' => 7, 'confirm' => false])->assertUnprocessable();
    }

    public function test_airport_taxis_book_without_a_ferry_or_flight_and_persist_all_supported_city_destinations(): void
    {
        foreach (['velana-airport', 'domestic-terminal', 'seaplane'] as $from) {
            foreach (['male', 'hulhumale-phase-1', 'hulhumale-phase-2'] as $to) {
                $input = ['kind' => 'taxi', 'from' => $from, 'to' => $to, 'date' => '2026-10-25', 'passengers' => 5];
                $booking = $this->confirm($input);
                $this->assertNull($booking['journey_reference']);
                $this->assertSame('2026-10-25', $booking['travel_date']);
                $this->assertSame(config('greater_male_fares.fares_minor')[$from][$to] * 2, $booking['total_minor']);
                $this->assertSame(collect(config('greater_male_fares.zones'))->firstWhere('id', $from)['name'], $booking['items'][0]['from']);
                $this->assertSame(collect(config('greater_male_fares.zones'))->firstWhere('id', $to)['name'], $booking['items'][0]['to']);
                $this->assertSame($booking['reference'], $this->confirm($input)['reference']);
            }
        }
        $this->getJson('/api/v1/demo-checkout')->assertOk()->assertJsonCount(9, 'bookings');
        $this->assertDatabaseCount('travel_journeys', 0);
        $this->assertDatabaseCount('demo_bookings', 0);
    }

    public function test_complete_journey_uses_matching_bus_and_invalidates_after_details_change(): void
    {
        $payload = ['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2026-10-29', 'flight_time' => '21:05', 'check_in_minutes' => 60, 'sailing_id' => 'HV101-2026-10-29', 'request_id' => (string) Str::uuid(), 'passenger_name' => 'Demo Test', 'email' => 'demo@example.test', 'seats' => 1, 'journey_details' => ['arrival_airport_id' => 'VRMM', 'destination_id' => 'ld0591', 'flight_arrival_at' => '2026-10-29T21:55:00+05:00', 'address' => 'Demo Home', 'taxi_zone' => 'hulhumale-phase-1', 'flight_offer_id' => 'maldivian-tmf-mle-20261029-flex']];
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $journey = $this->getJson('/api/v1/journeys')->json('journeys.0');
        $booking = $this->confirm(['kind' => 'journey', 'id' => $journey['reference'], 'passengers' => 6, 'onward' => 'bus']);
        $this->assertSame(1, $booking['passengers']);
        $this->assertSame(155400, $booking['total_minor']);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.legs.2.status', 'demo_confirmed')->assertJsonPath('journeys.0.legs.3.mode', 'bus')->assertJsonPath('journeys.0.can_request_taxi', false);
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => [...$payload['journey_details'], 'address' => 'Changed home']])->assertOk();
        $this->getJson('/api/v1/demo-checkout')->assertJsonPath('bookings.0.status', 'needs_review');
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.legs.2.status', 'external_not_booked');
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/demo-checkout', ['kind' => 'journey', 'id' => $journey['reference'], 'passengers' => 1, 'confirm' => false])->assertNotFound();
    }
}
