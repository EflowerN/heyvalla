<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoTaxiTest extends TestCase
{
    use RefreshDatabase;

    private string $guest;

    private string $booking;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo_taxis.operator_token' => str_repeat('a', 64)]);
        $this->guest = (string) Str::uuid();
        $this->booking = 'HV-TAXITEST';
        DB::table('demo_bookings')->insert([
            'reference' => $this->booking, 'guest_hash' => hash('sha256', $this->guest), 'request_id' => (string) Str::uuid(), 'payload_hash' => str_repeat('b', 64),
            'sailing_id' => 'HV101-2030-11-10', 'passenger_name' => 'Demo Passenger', 'email' => 'demo@example.com', 'seats' => 2,
            'journey' => json_encode(['origin' => 'Vilufushi', 'destination' => 'Thimarafushi Airport', 'departure_at' => '2030-11-10T06:00:00+05:00', 'harbour_arrival_at' => '2030-11-10T09:00:00+05:00', 'airport_arrival_at' => '2030-11-10T09:20:00+05:00', 'check_in_deadline_at' => '2030-11-10T13:00:00+05:00']), 'created_at' => now(),
        ]);
    }

    private function requestTaxi(): array
    {
        return $this->withHeader('X-Demo-Guest', $this->guest)->postJson('/api/v1/demo-taxis', ['booking_reference' => $this->booking, 'passengers' => 2, 'bags' => 1])->assertCreated()->json('taxi');
    }

    private function quote(array $taxi, array $overrides = []): array
    {
        return array_merge(['reference' => $taxi['reference'], 'version' => $taxi['version'], 'action' => 'quote', 'pickup_at' => '2030-11-10T09:05', 'price_minor' => 15000], $overrides);
    }

    public function test_request_quote_and_passenger_acceptance(): void
    {
        $taxi = $this->requestTaxi();
        $this->assertSame('requested', $taxi['status']);
        $this->assertSame('2030-11-10T09:05:00+05:00', $taxi['pickup_at']);
        $quoted = $this->withHeader('X-Demo-Operator', str_repeat('a', 64))->postJson('/api/v1/operator/taxis', $this->quote($taxi))->assertOk()->assertJsonPath('taxi.status', 'quoted')->json('taxi');
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $taxi['reference'], 'version' => $quoted['version']])->assertOk()->assertJsonPath('taxi.status', 'confirmed');
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $taxi['reference'], 'version' => $quoted['version']])->assertOk();
        $this->getJson('/api/v1/demo-bookings')->assertJsonPath('bookings.0.taxi.status', 'confirmed');
        $this->postJson('/api/v1/operator/taxis', $this->quote($quoted))->assertConflict();
    }

    public function test_authorization_and_ownership(): void
    {
        $this->getJson('/api/v1/operator/taxis')->assertForbidden();
        $taxi = $this->requestTaxi();
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/demo-taxis', ['booking_reference' => $this->booking, 'passengers' => 1, 'bags' => 0])->assertNotFound();
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $taxi['reference'], 'version' => 1])->assertNotFound();
        $this->postJson('/api/v1/operator/taxis', $this->quote($taxi))->assertForbidden();
    }

    public function test_duplicate_limits_and_timing_validation(): void
    {
        $taxi = $this->requestTaxi();
        $this->requestTaxi();
        $this->assertDatabaseCount('demo_taxi_requests', 1);
        $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $this->booking, 'passengers' => 3, 'bags' => 1])->assertUnprocessable();
        $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $this->booking, 'passengers' => 2, 'bags' => 5])->assertUnprocessable();
        $this->withHeader('X-Demo-Operator', str_repeat('a', 64));
        foreach ([['pickup_at' => '2030-11-10T09:04'], ['pickup_at' => '2030-11-10T12:16'], ['price_minor' => 0], ['price_minor' => 1.5]] as $invalid) {
            $this->postJson('/api/v1/operator/taxis', $this->quote($taxi, $invalid))->assertUnprocessable();
        }
        $this->postJson('/api/v1/operator/taxis', $this->quote($taxi, ['version' => 0]))->assertConflict();
        $this->postJson('/api/v1/operator/taxis', $this->quote($taxi, ['action' => 'decline', 'operator_note' => 'No demo vehicle available.']))->assertOk()->assertJsonPath('taxi.status', 'declined');
    }

    public function test_expired_quote_cannot_be_accepted(): void
    {
        $taxi = $this->requestTaxi();
        $quoted = $this->withHeader('X-Demo-Operator', str_repeat('a', 64))->postJson('/api/v1/operator/taxis', $this->quote($taxi))->assertOk()->json('taxi');
        DB::table('demo_taxi_requests')->update(['quote_expires_at' => now()->subMinute()->toIso8601String()]);
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $taxi['reference'], 'version' => $quoted['version']])->assertConflict();
        $this->assertDatabaseHas('demo_taxi_requests', ['status' => 'quoted']);
    }
}
