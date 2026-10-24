<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class FullJourneyTest extends TestCase
{
    use RefreshDatabase;

    private string $guest;

    private array $payload;

    private array $details;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2030, 11, 1)->startOfDay());
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $sailing = DB::table('provider_sailings')->where('status', 'published')->orderBy('id')->first();
        $this->guest = (string) Str::uuid();
        $this->withHeader('X-Demo-Guest', $this->guest);
        $this->details = ['arrival_airport_id' => 'VRMM', 'destination_id' => 'ld0591', 'flight_arrival_at' => '2030-11-02T13:00:00+05:00', 'address' => 'Demo Home, Example Road', 'taxi_zone' => 'hulhumale-phase-1'];
        $this->payload = ['sailing_id' => $sailing->id, 'sailing_version' => $sailing->version, 'fare_minor' => 15000, 'seats' => 2, 'passenger_name' => 'Full Journey Demo', 'terms_accepted' => true, 'idempotency_key' => (string) Str::uuid(), 'airport' => 'VRNT', 'flight_date' => '2030-11-02', 'flight_time' => '12:00', 'check_in_minutes' => 60, 'journey_details' => $this->details];
    }

    private function book(): array
    {
        $this->postJson('/api/v1/provider-bookings', $this->payload)->assertCreated();

        return $this->getJson('/api/v1/journeys')->assertOk()->json('journeys.0');
    }

    public function test_provider_booking_persists_full_plan_without_claiming_onward_bookings(): void
    {
        $journey = $this->book();
        $this->assertSame('Demo Home, Example Road', $journey['journey_details']['address']);
        $this->assertSame('Hulhumalé', $journey['journey_details']['destination']['name']);
        $this->assertSame('Velana International Airport', $journey['legs'][2]['to']);
        $this->assertSame('2030-11-02T13:00:00+05:00', $journey['legs'][2]['arrival_at']);
        $this->assertSame('external_not_booked', $journey['legs'][3]['status']);
        $this->assertSame(9000, $journey['legs'][3]['reference_estimate_minor']);
        $this->assertNull($journey['legs'][3]['price_minor']);
        $this->assertSame(30000, $journey['known_ground_subtotal_minor']);
        $this->assertFalse($journey['ground_prices_complete']);
        $this->assertSame(1, $journey['details_version']);
        config(['greater_male_fares.fares_minor.domestic-terminal.hulhumale-phase-1' => 99999]);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.legs.3.reference_estimate_minor', 9000);
    }

    public function test_legacy_booking_saves_details_atomically_and_retries_do_not_duplicate(): void
    {
        $payload = ['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2030-11-02', 'flight_time' => '12:00', 'check_in_minutes' => 60, 'sailing_id' => 'HV101-2030-11-02', 'request_id' => (string) Str::uuid(), 'passenger_name' => 'Legacy Demo', 'email' => 'demo@example.test', 'seats' => 2, 'journey_details' => $this->details];
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $this->postJson('/api/v1/demo-bookings', $payload)->assertCreated();
        $this->assertDatabaseCount('demo_bookings', 1);
        $this->assertDatabaseCount('travel_journeys', 1);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.booking_source', 'legacy')->assertJsonPath('journeys.0.journey_details.address', $this->details['address'])->assertJsonCount(4, 'journeys.0.legs');
        $this->postJson('/api/v1/demo-bookings', [...$payload, 'journey_details' => [...$this->details, 'address' => 'Changed']])->assertConflict();
    }

    public function test_invalid_full_plan_rolls_back_legacy_seat_allocation_and_booking(): void
    {
        $this->postJson('/api/v1/demo-bookings', ['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2030-11-02', 'flight_time' => '12:00', 'check_in_minutes' => 60, 'sailing_id' => 'HV101-2030-11-02', 'request_id' => (string) Str::uuid(), 'passenger_name' => 'Demo', 'email' => 'demo@example.test', 'seats' => 2, 'journey_details' => [...$this->details, 'arrival_airport_id' => 'VRNT']])->assertUnprocessable();
        $this->assertDatabaseCount('demo_bookings', 0);
        $this->assertDatabaseCount('demo_inventories', 0);
        $this->assertDatabaseCount('travel_journeys', 0);
    }

    public function test_retries_compare_original_full_plan_even_after_later_edits(): void
    {
        $journey = $this->book();
        $this->postJson('/api/v1/provider-bookings', $this->payload)->assertOk();
        $this->postJson('/api/v1/provider-bookings', [...$this->payload, 'journey_details' => [...$this->details, 'address' => 'Other home']])->assertConflict();
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => [...$this->details, 'address' => 'Edited home']])->assertOk();
        $this->postJson('/api/v1/provider-bookings', $this->payload)->assertOk();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.journey_details.address', 'Edited home');
        $this->assertDatabaseCount('travel_journeys', 1);
    }

    public function test_private_details_are_guest_owned_and_not_in_provider_booking_views(): void
    {
        $journey = $this->book();
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/journeys')->assertJsonCount(0, 'journeys');
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => $this->details])->assertNotFound();
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/v1/providers/requests')->assertOk()->assertDontSee($this->details['address'])->assertJsonMissingPath('bookings.0.journey.journey_details');
        $this->getJson('/api/v1/providers/catalogue')->assertOk()->assertDontSee($this->details['address']);
    }

    public function test_edits_are_versioned_retry_safe_and_can_remove_the_address_and_arrival(): void
    {
        $journey = $this->book();
        $edit = ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => [...$this->details, 'address' => null, 'flight_arrival_at' => null, 'taxi_zone' => 'hulhumale-phase-2']];
        $this->patchJson('/api/v1/journeys', $edit)->assertOk()->assertJsonPath('journey.details_version', 2)->assertJsonPath('journey.journey_details.address', '')->assertJsonPath('journey.legs.2.arrival_at', null)->assertJsonPath('journey.legs.3.reference_estimate_minor', 9500);
        $this->patchJson('/api/v1/journeys', $edit)->assertOk()->assertJsonPath('journey.details_version', 2);
        $this->patchJson('/api/v1/journeys', [...$edit, 'journey_details' => $this->details])->assertConflict();
    }

    public function test_destination_changes_update_leg_coverage_and_airport_destination_has_no_taxi(): void
    {
        $journey = $this->book();
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => [...$this->details, 'destination_id' => 'ld0268', 'taxi_zone' => null]])->assertOk()->assertJsonPath('journey.legs.3.mode', 'land')->assertJsonPath('journey.legs.3.status', 'connection_missing')->assertJsonPath('journey.legs.3.reference_estimate_minor', null);
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 2, 'journey_details' => [...$this->details, 'destination_id' => 'VRMM', 'taxi_zone' => null, 'address' => null]])->assertOk()->assertJsonCount(3, 'journey.legs');
    }

    public function test_server_rejects_bad_locations_times_zones_and_injected_prices(): void
    {
        foreach ([[], ['address' => 'Only an address'], null] as $invalid) {
            $this->postJson('/api/v1/provider-bookings', [...$this->payload, 'journey_details' => $invalid])->assertUnprocessable();
        }
        foreach ([['arrival_airport_id' => 'fake'], ['destination_id' => 'fake'], ['arrival_airport_id' => 'VRNT'], ['destination_id' => 'ld0205'], ['flight_arrival_at' => '2030-11-02T11:00:00+05:00'], ['flight_arrival_at' => 'not-a-date'], ['taxi_zone' => 'male'], ['address' => str_repeat('a', 161)], ['price_minor' => 1], ['arrival_airport_id' => 'VRMK', 'taxi_zone' => 'hulhumale-phase-1']] as $change) {
            $this->postJson('/api/v1/provider-bookings', [...$this->payload, 'journey_details' => [...$this->details, ...$change]])->assertUnprocessable();
        }
        $this->assertDatabaseCount('provider_seat_requests', 0);
        $this->assertDatabaseCount('travel_journeys', 0);
    }

    public function test_confirmed_departure_taxi_does_not_confirm_the_unarranged_onward_leg(): void
    {
        config(['demo_taxis.operator_token' => str_repeat('a', 64)]);
        $journey = $this->book();
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $journey['booking_reference'], 'version' => 1, 'action' => 'confirmed'])->assertOk();
        $taxi = $this->postJson('/api/v1/demo-taxis', ['booking_reference' => $journey['booking_reference'], 'passengers' => 2, 'bags' => 1])->assertCreated()->json('taxi');
        $this->withHeader('X-Demo-Operator', str_repeat('a', 64))->postJson('/api/v1/operator/taxis', ['reference' => $taxi['reference'], 'version' => 1, 'action' => 'quote', 'pickup_at' => '2030-11-02T09:35', 'price_minor' => 15000])->assertOk();
        $this->postJson('/api/v1/demo-taxis/accept', ['reference' => $taxi['reference'], 'version' => 2])->assertOk();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'partially_arranged')->assertJsonPath('journeys.0.known_ground_subtotal_minor', 45000)->assertJsonPath('journeys.0.ground_prices_complete', false)->assertJsonPath('journeys.0.legs.3.status', 'external_not_booked');
    }

    public function test_missing_flight_target_cannot_save_full_plan_and_older_journeys_can_add_details(): void
    {
        $payload = $this->payload;
        unset($payload['flight_date'], $payload['flight_time'], $payload['check_in_minutes'], $payload['airport']);
        $this->postJson('/api/v1/provider-bookings', $payload)->assertUnprocessable();
        $payload = $this->payload;
        unset($payload['journey_details']);
        $this->postJson('/api/v1/provider-bookings', $payload)->assertCreated();
        $journey = $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.journey_details', null)->assertJsonPath('journeys.0.details_version', 0)->json('journeys.0');
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 0, 'journey_details' => $this->details])->assertOk()->assertJsonPath('journey.journey_details.destination.id', 'ld0591');
    }

    public function test_cancellation_preserves_saved_plan_but_disables_editing(): void
    {
        $journey = $this->book();
        $this->postJson('/api/v1/provider-bookings/cancel', ['reference' => $journey['booking_reference'], 'version' => 1])->assertOk();
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.state', 'cancelled')->assertJsonPath('journeys.0.can_edit_details', false)->assertJsonPath('journeys.0.journey_details.address', $this->details['address'])->assertJsonPath('journeys.0.legs.2.status', 'external_not_booked');
        $this->patchJson('/api/v1/journeys', ['reference' => $journey['reference'], 'details_version' => 1, 'journey_details' => [...$this->details, 'address' => 'Different']])->assertConflict();
    }
}
