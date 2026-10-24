<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoBookingTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge(['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2030-11-10', 'flight_time' => '14:00',
            'check_in_minutes' => 60, 'sailing_id' => 'HV101-2030-11-10', 'request_id' => (string) Str::uuid(),
            'passenger_name' => 'Demo Passenger', 'email' => 'passenger@example.com', 'seats' => 2], $overrides);
    }

    public function test_booking_persists_and_isolated_guest_history_and_availability(): void
    {
        $guest = (string) Str::uuid();
        $payload = $this->payload();
        $response = $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/demo-bookings', $payload)
            ->assertCreated()->assertJsonPath('booking.seats', 2)->assertJsonPath('booking.demo', true);
        $this->assertStringStartsWith('HV-', $response->json('booking.reference'));
        $this->getJson('/api/v1/demo-bookings')->assertOk()->assertJsonCount(1, 'bookings');
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/demo-bookings')->assertJsonCount(0, 'bookings');
        $this->getJson('/api/v1/ferry-search?'.http_build_query($payload))->assertJsonPath('sailings.0.available_seats', 10);
        $this->assertDatabaseCount('demo_bookings', 1);
    }

    public function test_retries_do_not_double_book_and_changed_payload_is_rejected(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        $payload = $this->payload();
        $first = $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated()->assertJsonPath('booking.reference', $first->json('booking.reference'));
        $this->postJson('/api/v1/demo-bookings', array_merge($payload, ['seats' => 3]))->assertConflict();
        $this->assertDatabaseCount('demo_bookings', 1);
        $this->assertDatabaseHas('demo_inventories', ['reserved' => 2]);
    }

    public function test_capacity_cannot_be_exceeded_and_failure_does_not_reserve(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        $this->postJson('/api/v1/demo-bookings', $this->payload(['seats' => 6]))->assertCreated();
        $this->postJson('/api/v1/demo-bookings', $this->payload(['seats' => 6]))->assertCreated();
        $this->postJson('/api/v1/demo-bookings', $this->payload(['seats' => 1]))->assertUnprocessable();
        $this->assertDatabaseHas('demo_inventories', ['reserved' => 12]);
        $this->assertDatabaseCount('demo_bookings', 2);
    }

    public function test_invalid_cancelled_late_and_past_sailings_cannot_be_booked(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        foreach ([['sailing_id' => 'HV104-2030-11-10'], ['sailing_id' => 'HV102-2030-11-10'], ['sailing_id' => 'HV103-2030-11-10'], ['seats' => 0], ['seats' => 7], ['seats' => 1.5], ['email' => 'bad'], ['airport' => 'VRMM'], ['flight_date' => '2020-11-10', 'sailing_id' => 'HV101-2020-11-10']] as $invalid) {
            $this->postJson('/api/v1/demo-bookings', $this->payload($invalid))->assertUnprocessable();
        }
        $this->assertDatabaseCount('demo_bookings', 0);
        $this->assertDatabaseCount('demo_inventories', 0);
    }

    public function test_missing_guest_token_cannot_access_bookings(): void
    {
        $this->getJson('/api/v1/demo-bookings')->assertUnprocessable();
        $this->postJson('/api/v1/demo-bookings', $this->payload())->assertUnprocessable();
    }
}
