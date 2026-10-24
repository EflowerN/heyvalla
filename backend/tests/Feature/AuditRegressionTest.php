<?php

namespace Tests\Feature;

use App\Services\ProviderLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    private object $sailing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2030, 11, 1)->startOfDay());
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $this->token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->withToken($this->token);
        $this->sailing = DB::table('provider_sailings')->where('status', 'published')->orderBy('id')->first();
    }

    public function test_departed_pending_requests_expire_once_and_release_withdrawal_block(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        $booking = $this->postJson('/api/v1/provider-bookings', ['sailing_id' => $this->sailing->id, 'sailing_version' => 1, 'fare_minor' => 15000, 'passenger_name' => 'Demo', 'seats' => 2, 'terms_accepted' => true, 'idempotency_key' => (string) Str::uuid()])->assertCreated()->json('booking');
        $this->travelTo(now()->setDate(2030, 11, 2)->setTime(4, 0));
        $this->assertSame(1, ProviderLifecycle::expirePending());
        $this->assertSame(0, ProviderLifecycle::expirePending());
        $this->getJson('/api/v1/provider-bookings')->assertJsonPath('bookings.0.status', 'expired')->assertJsonCount(2, 'bookings.0.events');
        $this->assertDatabaseHas('provider_sailings', ['id' => $this->sailing->id, 'confirmed_seats' => 0]);
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'])->assertConflict();
        $this->postJson('/api/v1/providers/publish', ['id' => $this->sailing->id, 'version' => 1, 'status' => 'draft'])->assertOk();
    }

    public function test_canonical_islands_prevent_same_place_and_draft_edits_are_versioned(): void
    {
        $draft = DB::table('provider_sailings')->where('provider_account_id', $this->sailing->provider_account_id)->where('status', 'draft')->first();
        $payload = ['id' => $draft->id, 'version' => 1, 'provider_vessel_id' => $draft->provider_vessel_id, 'origin_id' => 'ld0205', 'destination_id' => 'ld0205', 'departure_at' => '2030-11-02T15:00', 'arrival_at' => '2030-11-02T16:30', 'fare_minor' => 20000];
        $this->postJson('/api/v1/providers/sailings', $payload)->assertUnprocessable()->assertJsonValidationErrors('destination_id');
        $payload['destination_id'] = 'ld0082';
        $this->postJson('/api/v1/providers/sailings', $payload)->assertOk()->assertJsonPath('sailing.version', 2)->assertJsonPath('sailing.fare_minor', 20000);
        $this->postJson('/api/v1/providers/sailings', $payload)->assertConflict();
        $this->postJson('/api/v1/providers/sailings', [...$payload, 'id' => $this->sailing->id])->assertConflict();
    }

    public function test_one_vessel_cannot_publish_overlapping_sailings_or_short_turnaround(): void
    {
        $draft = DB::table('provider_sailings')->where('provider_account_id', $this->sailing->provider_account_id)->where('status', 'draft')->first();
        $this->postJson('/api/v1/providers/sailings', ['id' => $draft->id, 'version' => 1, 'provider_vessel_id' => $draft->provider_vessel_id, 'origin_id' => 'ld0082', 'destination_id' => 'ld0205', 'departure_at' => '2030-11-02T09:40', 'arrival_at' => '2030-11-02T10:30', 'fare_minor' => 10000])->assertOk();
        $this->postJson('/api/v1/providers/publish', ['id' => $draft->id, 'version' => 2, 'status' => 'published'])->assertConflict();
        $this->assertDatabaseHas('provider_sailings', ['id' => $draft->id, 'status' => 'draft']);
    }

    public function test_past_flight_search_is_rejected(): void
    {
        $this->getJson('/api/v1/ferry-search?'.http_build_query(['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => '2030-10-31', 'flight_time' => '12:00', 'check_in_minutes' => 60]))->assertUnprocessable();
    }
}
