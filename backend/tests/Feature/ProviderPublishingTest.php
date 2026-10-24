<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProviderPublishingTest extends TestCase
{
    use RefreshDatabase;

    private function register(string $email = 'owner@example.test'): string
    {
        return $this->postJson('/api/v1/providers/register', ['owner_name' => 'Demo Owner', 'organization_name' => 'Demo Launch', 'email' => $email, 'password' => 'fictional-test-password', 'password_confirmation' => 'fictional-test-password'])->assertCreated()->assertJsonPath('account.verification', 'unverified')->json('token');
    }

    private function vessel(string $token): array
    {
        return $this->withToken($token)->postJson('/api/v1/providers/vessels', ['name' => 'Demo Boat', 'passenger_capacity' => 12, 'booking_mode' => 'off', 'cargo_enquiries' => false])->assertOk()->json('vessel');
    }

    private function sailing(string $token, int $vesselId): array
    {
        return $this->withToken($token)->postJson('/api/v1/providers/sailings', ['provider_vessel_id' => $vesselId, 'origin_id' => 'ld0205', 'destination_id' => 'ld0082', 'departure_at' => now()->addDays(2)->format('Y-m-d').'T09:00', 'arrival_at' => now()->addDays(2)->format('Y-m-d').'T10:00', 'fare_minor' => 15000])->assertCreated()->json('sailing');
    }

    public function test_accounts_have_hashed_passwords_and_revocable_expiring_sessions(): void
    {
        $token = $this->register();
        $this->assertNotSame('fictional-test-password', DB::table('provider_accounts')->first()->password);
        $this->assertSame(hash('sha256', $token), DB::table('provider_sessions')->first()->token_hash);
        $this->withToken($token)->getJson('/api/v1/providers/account')->assertOk()->assertJsonMissingPath('account.password')->assertJsonMissingPath('token');
        $this->withToken($token)->deleteJson('/api/v1/providers/account')->assertOk();
        $this->withToken($token)->getJson('/api/v1/providers/account')->assertUnauthorized();
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'OWNER@example.test', 'password' => 'fictional-test-password'])->assertOk()->json('token');
        $this->travel(9)->hours();
        $this->withToken($token)->getJson('/api/v1/providers/account')->assertUnauthorized();
    }

    public function test_unpublished_sailings_are_private_and_publishing_exposes_only_catalogue_fields(): void
    {
        $token = $this->register();
        $vessel = $this->vessel($token);
        $this->assertSame('off', $vessel['booking_mode']);
        $sailing = $this->sailing($token, $vessel['id']);
        $this->assertStringContainsString('04:00:00', $sailing['departure_at']);
        $this->getJson('/api/v1/providers/catalogue')->assertJsonCount(0, 'sailings');
        $published = $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertOk()->json('sailing');
        $this->getJson('/api/v1/providers/catalogue')->assertJsonCount(1, 'sailings')->assertJsonPath('sailings.0.fare_minor', 15000)->assertJsonPath('sailings.0.booking_available', false)->assertJsonPath('sailings.0.location_sharing', 'off')->assertJsonMissingPath('sailings.0.email')->assertJsonMissingPath('sailings.0.owner_name')->assertJsonMissingPath('sailings.0.provider_account_id');
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => $published['version'], 'status' => 'draft'])->assertOk();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonCount(0, 'sailings');
    }

    public function test_one_provider_cannot_read_or_modify_another_providers_records(): void
    {
        $owner = $this->register();
        $vessel = $this->vessel($owner);
        $sailing = $this->sailing($owner, $vessel['id']);
        $other = $this->register('other@example.test');
        $this->withToken($other)->getJson('/api/v1/providers/publishing')->assertJsonCount(0, 'vessels')->assertJsonCount(0, 'sailings');
        $this->withToken($other)->postJson('/api/v1/providers/vessels', [...$vessel, 'name' => 'Stolen Boat'])->assertNotFound();
        $this->withToken($other)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertNotFound();
        $this->withToken($other)->postJson('/api/v1/providers/sailings', ['provider_vessel_id' => $vessel['id'], 'origin_id' => 'ld0205', 'destination_id' => 'ld0082', 'departure_at' => '2030-01-01T09:00', 'arrival_at' => '2030-01-01T10:00'])->assertUnprocessable();
        $this->assertDatabaseHas('provider_vessels', ['id' => $vessel['id'], 'name' => 'Demo Boat']);
    }

    public function test_stale_updates_cannot_overwrite_vessel_or_sailing_state(): void
    {
        $token = $this->register();
        $vessel = $this->vessel($token);
        $this->withToken($token)->postJson('/api/v1/providers/vessels', [...$vessel, 'booking_mode' => 'request_to_book', 'cargo_enquiries' => true])->assertOk()->assertJsonPath('vessel.version', 2);
        $this->withToken($token)->postJson('/api/v1/providers/vessels', $vessel)->assertConflict();
        $sailing = $this->sailing($token, $vessel['id']);
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertOk();
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'draft'])->assertConflict();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonPath('sailings.0.booking_available', true);
    }

    public function test_invalid_and_past_sailings_are_rejected_and_unknown_prices_stay_null(): void
    {
        $token = $this->register();
        $vessel = $this->vessel($token);
        $input = ['provider_vessel_id' => $vessel['id'], 'origin_id' => 'ld0205', 'destination_id' => 'ld0082', 'departure_at' => now()->addDay()->format('Y-m-d').'T09:00', 'arrival_at' => now()->addDay()->format('Y-m-d').'T08:00'];
        $this->withToken($token)->postJson('/api/v1/providers/sailings', $input)->assertUnprocessable();
        $input['destination_id'] = 'ld0082';
        $input['arrival_at'] = now()->addDay()->format('Y-m-d').'T10:00';
        $sailing = $this->withToken($token)->postJson('/api/v1/providers/sailings', $input)->assertCreated()->assertJsonPath('sailing.fare_minor', null)->json('sailing');
        $this->travel(3)->days();
        $token = $this->postJson('/api/v1/providers/login', ['email' => 'owner@example.test', 'password' => 'fictional-test-password'])->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertUnprocessable();
    }

    public function test_owner_updates_require_ownership_version_and_explicit_position_sharing(): void
    {
        $token = $this->register();
        $vessel = $this->vessel($token);
        $sailing = $this->sailing($token, $vessel['id']);
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertOk();
        $update = ['id' => $sailing['id'], 'version' => 2, 'cargo_status' => 'fully_loaded', 'note' => 'Demo cargo fully loaded', 'share_location' => true, 'latitude' => 2.2, 'longitude' => 73.1];
        $other = $this->register('other@example.test');
        $this->withToken($other)->postJson('/api/v1/providers/operations', $update)->assertNotFound();
        $this->withToken($token)->postJson('/api/v1/providers/operations', $update)->assertOk();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonPath('sailings.0.operations.cargo_status', 'fully_loaded')->assertJsonPath('sailings.0.location_sharing', 'owner_reported');
        $this->postJson('/api/v1/providers/operations', $update)->assertConflict();
        $this->postJson('/api/v1/providers/operations', [...$update, 'version' => 3, 'share_location' => false])->assertOk();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonPath('sailings.0.operations.location', null)->assertJsonPath('sailings.0.location_sharing', 'off');
        $this->postJson('/api/v1/providers/operations', [...$update, 'version' => 4, 'latitude' => 91])->assertUnprocessable();
    }

    public function test_private_endpoints_require_a_provider_session(): void
    {
        $this->getJson('/api/v1/providers/publishing')->assertUnauthorized();
        $this->postJson('/api/v1/providers/vessels', [])->assertUnauthorized();
        $this->postJson('/api/v1/providers/sailings', [])->assertUnauthorized();
        $this->postJson('/api/v1/providers/publish', [])->assertUnauthorized();
        $this->postJson('/api/v1/providers/login', ['email' => 'missing@example.test', 'password' => 'invalid'])->assertUnauthorized();
    }
}
