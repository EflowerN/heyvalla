<?php

namespace Tests\Feature;

use App\Services\DemoFerrySearch;
use App\Services\TravelJourneys;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ItineraryTest extends TestCase
{
    use RefreshDatabase;

    private string $guest;

    private string $token;

    private array $sailing;

    private array $flight;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2030, 11, 1)->startOfDay());
        config(['demo_taxis.operator_token' => str_repeat('a', 64)]);
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $this->token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->sailing = (array) DB::table('provider_sailings')->where('status', 'published')->orderBy('id')->first();
        $this->flight = ['airport' => 'VRNT', 'flight_date' => '2030-11-02', 'flight_time' => '12:00', 'check_in_minutes' => 60];
        $this->guest = (string) Str::uuid();
        $this->withHeader('X-Demo-Guest', $this->guest);
    }

    private function book(bool $flight = true, int $seats = 2): array
    {
        $payload = ['sailing_id' => $this->sailing['id'], 'sailing_version' => 1, 'fare_minor' => 15000, 'seats' => $seats, 'passenger_name' => 'Demo Passenger', 'terms_accepted' => true, 'idempotency_key' => (string) Str::uuid(), ...($flight ? $this->flight : [])];
        $booking = $this->postJson('/api/v1/provider-bookings', $payload)->assertCreated()->json('booking');
        $this->postJson('/api/v1/provider-bookings', $payload)->assertOk();
        $this->assertDatabaseCount('travel_journeys', 1);

        return $booking;
    }

    private function confirm(array $booking): void
    {
        $this->withToken($this->token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'])->assertOk();
    }

    private function taxi(array $booking, int $passengers = 2): array
    {
        return $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $booking['reference'], 'passengers' => $passengers, 'bags' => 1])->assertCreated()->json('taxi');
    }

    private function quoteAndAccept(array $taxi): void
    {
        $quoted = $this->withHeader('X-Demo-Operator', str_repeat('a', 64))->postJson('/api/v1/operator/taxis', ['reference' => $taxi['reference'], 'version' => $taxi['version'], 'action' => 'quote', 'pickup_at' => '2030-11-02T09:35', 'price_minor' => 15000])->assertOk()->json('taxi');
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $quoted['reference'], 'version' => $quoted['version']])->assertOk();
    }

    public function test_provider_ferry_taxi_and_manual_flight_form_one_honest_itinerary(): void
    {
        $results = app(DemoFerrySearch::class)->search(['island' => 'ld0205', ...$this->flight]);
        $provider = collect($results['sailings'])->firstWhere('id', 'provider-'.$this->sailing['id']);
        $this->assertSame('recommended', $provider['classification']);
        $this->assertSame(70, $provider['connection_buffer_minutes']);
        $this->assertTrue($provider['bookable']);
        $booking = $this->book();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'partially_arranged')->assertJsonPath('journeys.0.can_request_taxi', false)->assertJsonPath('journeys.0.known_ground_subtotal_minor', 30000)->assertJsonPath('journeys.0.ground_prices_complete', false)->assertJsonCount(3, 'journeys.0.legs');
        $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $booking['reference'], 'passengers' => 2, 'bags' => 1])->assertConflict();
        $this->confirm($booking);
        $taxi = $this->taxi($booking);
        $this->quoteAndAccept($taxi);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'ground_transport_confirmed')->assertJsonPath('journeys.0.known_ground_subtotal_minor', 45000)->assertJsonPath('journeys.0.ground_prices_complete', true)->assertJsonPath('journeys.0.legs.2.status', 'external_not_booked')->assertJsonPath('journeys.0.connection_buffer_minutes', 70);
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/journeys')->assertJsonCount(0, 'journeys');
        $this->postJson('/api/v1/demo-taxis/cancel', ['reference' => $taxi['reference'], 'version' => 3])->assertNotFound();
    }

    public function test_ferry_cancellation_cascades_with_reason_and_releases_inventory(): void
    {
        $booking = $this->book();
        $this->confirm($booking);
        $taxi = $this->taxi($booking);
        $this->quoteAndAccept($taxi);
        $this->withToken($this->token)->postJson('/api/v1/providers/publish', ['id' => $this->sailing['id'], 'version' => 1, 'status' => 'cancelled', 'reason' => 'Demo weather disruption.'])->assertOk();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'cancelled')->assertJsonPath('journeys.0.taxi.status', 'cancelled')->assertJsonPath('journeys.0.can_request_taxi', false)->assertJsonPath('journeys.0.events.2.reason', 'Demo weather disruption.');
        $this->assertDatabaseHas('provider_sailings', ['id' => $this->sailing['id'], 'confirmed_seats' => 0]);
        $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $booking['reference'], 'passengers' => 2, 'bags' => 1, 'retry_version' => 4])->assertConflict();
    }

    public function test_declined_taxi_can_be_requested_again_and_partial_party_is_not_fully_confirmed(): void
    {
        $booking = $this->book(true, 5);
        $this->confirm($booking);
        $taxi = $this->taxi($booking, 4);
        $this->withHeader('X-Demo-Operator', str_repeat('a', 64))->postJson('/api/v1/operator/taxis', ['reference' => $taxi['reference'], 'version' => 1, 'action' => 'decline'])->assertOk();
        $payload = ['booking_reference' => $booking['reference'], 'passengers' => 4, 'bags' => 1, 'retry_version' => 1];
        $this->postJson('/api/v1/demo-taxis', $payload)->assertConflict();
        $taxi = $this->postJson('/api/v1/demo-taxis', [...$payload, 'retry_version' => 2])->assertCreated()->assertJsonPath('taxi.version', 3)->assertJsonCount(3, 'taxi.events')->json('taxi');
        $this->quoteAndAccept($taxi);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'partially_arranged')->assertJsonPath('journeys.0.taxi_party_complete', false)->assertJsonPath('journeys.0.ground_prices_complete', false);
        $this->assertDatabaseCount('demo_taxi_requests', 1);
    }

    public function test_catalogue_request_can_attach_flight_but_invalid_connection_or_guest_cannot(): void
    {
        $this->book(false);
        $journey = $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.can_add_flight', true)->json('journeys.0');
        $this->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference'], 'flight_time' => '10:00'])->assertUnprocessable();
        $this->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference'], 'airport' => 'VRMM'])->assertUnprocessable();
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference']])->assertNotFound();
        $this->withHeader('X-Demo-Guest', $this->guest)->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference']])->assertOk()->assertJsonCount(3, 'journey.legs');
        $this->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference']])->assertConflict();
    }

    public function test_legacy_booking_cancellation_is_retry_safe_and_cannot_bypass_provider_approval(): void
    {
        $payload = ['island' => 'ld0205', ...$this->flight, 'passenger_name' => 'Demo', 'email' => 'demo@example.test', 'seats' => 2, 'request_id' => (string) Str::uuid()];
        $sailings = app(DemoFerrySearch::class)->search($payload)['sailings'];
        $sailing = collect($sailings)->first(fn ($s) => $s['source'] === 'legacy' && $s['bookable']);
        $booking = $this->postJson('/api/v1/demo-bookings', [...$payload, 'sailing_id' => $sailing['id']])->assertCreated()->json('booking');
        $this->taxi($booking);
        $this->postJson('/api/v1/demo-bookings/cancel', ['reference' => $booking['reference'], 'version' => 1])->assertOk();
        $this->postJson('/api/v1/demo-bookings/cancel', ['reference' => $booking['reference'], 'version' => 1])->assertOk();
        $this->assertDatabaseHas('demo_inventories', ['sailing_id' => $sailing['id'], 'reserved' => 0]);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'cancelled')->assertJsonPath('journeys.0.taxi.status', 'cancelled');
        $this->postJson('/api/v1/demo-bookings', [...$payload, 'request_id' => (string) Str::uuid(), 'sailing_id' => 'provider-'.$this->sailing['id']])->assertUnprocessable();
    }

    public function test_older_incomplete_flight_snapshot_does_not_break_itinerary_listing(): void
    {
        $id = DB::table('demo_bookings')->insertGetId(['reference' => 'HV-OLDER', 'guest_hash' => hash('sha256', $this->guest), 'request_id' => (string) Str::uuid(), 'payload_hash' => str_repeat('a', 64), 'sailing_id' => 'old-demo', 'passenger_name' => 'Old Demo', 'email' => 'old@example.test', 'seats' => 1, 'journey' => json_encode(['origin' => 'Vilufushi', 'destination' => 'Thimarafushi Airport', 'departure_at' => '2030-11-02T08:00:00+05:00', 'airport_arrival_at' => '2030-11-02T09:50:00+05:00', 'flight_at' => '2030-11-02T12:00:00+05:00']), 'created_at' => now()]);
        $booking = DB::table('demo_bookings')->find($id);
        TravelJourneys::ensure($booking, false, json_decode($booking->journey, true));
        $journey = $this->getJson('/api/v1/journeys')->assertOk()->assertJsonPath('journeys.0.can_add_flight', true)->assertJsonPath('journeys.0.flight_plan', null)->json('journeys.0');
        $this->postJson('/api/v1/journeys', [...$this->flight, 'reference' => $journey['reference']])->assertOk()->assertJsonPath('journey.connection_buffer_minutes', 70);
    }

    public function test_recording_ferry_arrival_does_not_disable_an_upcoming_taxi(): void
    {
        $booking = $this->book();
        $this->confirm($booking);
        $taxi = $this->taxi($booking);
        $this->travelTo(now()->setDate(2030, 11, 2)->setTime(4, 31));
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 2, 'action' => 'completed'])->assertOk();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.can_request_taxi', true);
        $this->quoteAndAccept($taxi);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'ground_transport_confirmed')->assertJsonPath('journeys.0.legs.0.status', 'completed');
    }
}
