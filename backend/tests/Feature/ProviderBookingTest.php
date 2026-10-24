<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProviderBookingTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $token = $this->postJson('/api/v1/providers/register', ['owner_name' => 'Demo', 'organization_name' => 'Demo Ferry', 'email' => 'owner@example.test', 'password' => 'fictional-test-password', 'password_confirmation' => 'fictional-test-password'])->assertCreated()->json('token');
        $vessel = $this->withToken($token)->postJson('/api/v1/providers/vessels', ['name' => 'Demo Boat', 'passenger_capacity' => 2, 'booking_mode' => 'request_to_book', 'cargo_enquiries' => false])->assertOk()->json('vessel');
        $sailing = $this->withToken($token)->postJson('/api/v1/providers/sailings', ['provider_vessel_id' => $vessel['id'], 'origin_id' => 'ld0205', 'destination_id' => 'ld0082', 'departure_at' => now()->addDays(2)->format('Y-m-d').'T09:00', 'arrival_at' => now()->addDays(2)->format('Y-m-d').'T10:00', 'fare_minor' => 5000])->assertCreated()->json('sailing');
        $sailing = $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 1, 'status' => 'published'])->assertOk()->json('sailing');

        return [$token, $vessel, $sailing];
    }

    private function payload(array $sailing, int $seats = 1): array
    {
        return ['sailing_id' => $sailing['id'], 'sailing_version' => $sailing['version'], 'fare_minor' => 5000, 'seats' => $seats, 'passenger_name' => 'Demo Passenger', 'terms_accepted' => true, 'idempotency_key' => (string) Str::uuid()];
    }

    public function test_loading_ping_reaches_passenger_without_changing_booking_status_or_capacity(): void
    {
        [$token,$vessel,$sailing] = $this->fixture();
        $guest = (string) Str::uuid();
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertCreated();
        $version = DB::table('provider_sailings')->where('id', $sailing['id'])->value('version');
        $this->withToken($token)->postJson('/api/v1/providers/operations', ['id' => $sailing['id'], 'version' => $version, 'cargo_status' => 'fully_loaded', 'note' => 'Loading complete. Please board.', 'share_location' => false])->assertOk()->assertJsonPath('notified', 1);
        $this->withHeader('X-Demo-Guest', $guest)->getJson('/api/v1/provider-bookings')->assertJsonPath('bookings.0.status', 'requested')->assertJsonPath('bookings.0.events.1.status', 'fully_loaded');
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing['id'], 'confirmed_seats' => 0]);
        $this->getJson('/api/v1/journeys')->assertJsonPath('journeys.0.events.1.reason', 'Loading complete. Please board.');
        $this->withToken($token)->postJson('/api/v1/providers/operations', ['id' => $sailing['id'], 'version' => $version + 1, 'cargo_status' => 'departed', 'note' => 'Departed early in demo', 'share_location' => false])->assertOk();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonPath('sailings.0.booking_available', false);
        $this->postJson('/api/v1/provider-bookings', [...$this->payload($sailing), 'sailing_version' => $version + 2])->assertConflict();
    }

    public function test_request_confirmation_capacity_and_cancellation_are_retry_safe(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $guest = (string) Str::uuid();
        $payload = $this->payload($sailing, 2);
        $booking = $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $payload)->assertCreated()->assertJsonPath('booking.status', 'requested')->assertJsonPath('booking.total_minor', 10000)->json('booking');
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $payload)->assertOk()->assertJsonPath('booking.reference', $booking['reference']);
        $this->assertDatabaseCount('provider_seat_requests', 1);
        $action = ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'];
        $this->withToken($token)->postJson('/api/v1/providers/requests', $action)->assertOk()->assertJsonPath('booking.status', 'confirmed')->assertJsonCount(2, 'booking.events');
        $this->withToken($token)->postJson('/api/v1/providers/requests', $action)->assertOk();
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing['id'], 'confirmed_seats' => 2]);
        $this->getJson('/api/v1/providers/catalogue')->assertJsonPath('sailings.0.remaining_seats', 0)->assertJsonPath('sailings.0.booking_available', false);
        $cancel = ['reference' => $booking['reference'], 'version' => 2];
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings/cancel', $cancel)->assertOk()->assertJsonPath('booking.status', 'cancelled');
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings/cancel', $cancel)->assertOk();
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing['id'], 'confirmed_seats' => 0]);
    }

    public function test_pending_requests_do_not_hold_seats_and_confirmation_cannot_overallocate(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $first = $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/provider-bookings', $this->payload($sailing, 2))->assertCreated()->json('booking');
        $second = $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertCreated()->json('booking');
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $first['reference'], 'version' => 1, 'action' => 'confirmed'])->assertOk();
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $second['reference'], 'version' => 1, 'action' => 'confirmed'])->assertConflict();
        $this->assertDatabaseHas('provider_seat_requests', ['reference' => $second['reference'], 'status' => 'requested']);
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing['id'], 'confirmed_seats' => 2]);
    }

    public function test_passenger_and_provider_privacy_and_conflicting_retry_details(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $guest = (string) Str::uuid();
        $payload = $this->payload($sailing);
        $booking = $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $payload)->assertCreated()->json('booking');
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', [...$payload, 'seats' => 2])->assertConflict();
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/provider-bookings')->assertJsonCount(0, 'bookings');
        $this->postJson('/api/v1/provider-bookings/cancel', ['reference' => $booking['reference'], 'version' => 1])->assertNotFound();
        $other = $this->postJson('/api/v1/providers/register', ['owner_name' => 'Other', 'organization_name' => 'Other', 'email' => 'other@example.test', 'password' => 'fictional-test-password', 'password_confirmation' => 'fictional-test-password'])->assertCreated()->json('token');
        $this->withToken($other)->getJson('/api/v1/providers/requests')->assertJsonCount(0, 'bookings');
        $this->withToken($other)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'])->assertNotFound();
        $this->getJson('/api/v1/providers/catalogue')->assertJsonMissingPath('sailings.0.passenger_name')->assertJsonMissingPath('sailings.0.guest_hash');
    }

    public function test_disabling_new_requests_preserves_existing_requests_and_blocks_withdrawal(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $guest = (string) Str::uuid();
        $booking = $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertCreated()->json('booking');
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $sailing['id'], 'version' => 2, 'status' => 'draft'])->assertConflict();
        $this->withToken($token)->postJson('/api/v1/providers/vessels', [...$vessel, 'booking_mode' => 'off'])->assertOk();
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertConflict();
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'])->assertOk();
        $this->withHeader('X-Demo-Guest', $guest)->getJson('/api/v1/provider-bookings')->assertJsonPath('bookings.0.status', 'confirmed');
    }

    public function test_stale_fares_and_versions_are_rejected_and_declines_need_a_reason(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $guest = (string) Str::uuid();
        $payload = $this->payload($sailing);
        $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', [...$payload, 'fare_minor' => 1])->assertConflict();
        $this->postJson('/api/v1/provider-bookings', [...$payload, 'sailing_version' => 1])->assertConflict();
        $booking = $this->postJson('/api/v1/provider-bookings', $payload)->assertCreated()->json('booking');
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'declined'])->assertUnprocessable();
        $this->withToken($token)->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'declined', 'reason' => 'Unavailable crew.'])->assertOk()->assertJsonPath('booking.events.1.reason', 'Unavailable crew.');
        $this->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => 1, 'action' => 'confirmed'])->assertConflict();
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing['id'], 'confirmed_seats' => 0]);
    }

    public function test_unknown_fares_unpublished_and_departed_sailings_cannot_be_requested(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        DB::table('provider_sailings')->where('id', $sailing['id'])->update(['fare_minor' => null]);
        $this->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertConflict();
        DB::table('provider_sailings')->where('id', $sailing['id'])->update(['fare_minor' => 5000, 'status' => 'draft']);
        $this->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertConflict();
        DB::table('provider_sailings')->where('id', $sailing['id'])->update(['status' => 'published', 'departure_at' => now()->subHour()]);
        $this->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertConflict();
        $this->assertDatabaseCount('provider_seat_requests', 0);
    }

    public function test_accepted_journey_and_price_are_snapshotted_and_guest_session_is_required(): void
    {
        [$token, $vessel, $sailing] = $this->fixture();
        $this->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertUnauthorized();
        $this->getJson('/api/v1/provider-bookings')->assertUnauthorized();
        $guest = (string) Str::uuid();
        $booking = $this->withHeader('X-Demo-Guest', $guest)->postJson('/api/v1/provider-bookings', $this->payload($sailing))->assertCreated()->json('booking');
        DB::table('provider_accounts')->update(['organization_name' => 'Changed name']);
        DB::table('provider_sailings')->where('id', $sailing['id'])->update(['fare_minor' => 9000]);
        $this->getJson('/api/v1/provider-bookings')->assertJsonPath('bookings.0.total_minor', 5000)->assertJsonPath('bookings.0.journey.provider_name', 'Demo Ferry')->assertJsonPath('bookings.0.journey.fare_minor', 5000);
        $this->assertStringContainsString('No payment is collected', $booking['journey']['terms']);
    }
}
