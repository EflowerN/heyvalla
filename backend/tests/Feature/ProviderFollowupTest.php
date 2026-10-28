<?php

namespace Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProviderFollowupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2030-11-01T07:00:00+05:00'));
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
    }

    private function pendingRequest(): array
    {
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $login = $this->postJson('/api/v1/providers/login', ['email' => 'lagoon@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json();
        $sailing = DB::table('provider_sailings')->where('provider_account_id', $login['account']['id'])->where('status', 'published')->orderBy('departure_at')->first();
        $booking = $this->postJson('/api/v1/provider-bookings', ['sailing_id' => $sailing->id, 'sailing_version' => $sailing->version, 'fare_minor' => $sailing->fare_minor, 'passenger_name' => 'Cargo audit demo', 'seats' => 2, 'terms_accepted' => true, 'idempotency_key' => (string) Str::uuid()])->assertCreated()->json('booking');
        $this->withToken($login['token']);

        return [$sailing, $booking];
    }

    public function test_api_errors_hide_debug_details_but_keep_status_and_field_errors(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/audit-conflict', fn () => abort(409, 'Request changed. Refresh before taking action.'));
        $this->getJson('/api/audit-conflict')->assertConflict()->assertExactJson(['message' => 'Request changed. Refresh before taking action.'])->assertHeader('Cache-Control', 'no-store, private');
        $validation = $this->postJson('/api/v1/demo-checkout', ['kind' => 'taxi', 'confirm' => false]);
        $validation->assertUnprocessable()->assertJsonValidationErrors(['from', 'to', 'date', 'passengers']);
        foreach (['exception', 'file', 'line', 'trace'] as $field) {
            $validation->assertJsonMissingPath($field);
        }
    }

    public function test_unexpected_api_errors_return_a_generic_message_even_when_debug_is_enabled(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/audit-failure', function (): never {
            throw new \RuntimeException('Internal driver failed at /private/example/server.php; token=demo-sensitive');
        });
        $this->getJson('/api/audit-failure')->assertStatus(500)->assertExactJson(['message' => 'The transport service is temporarily unavailable. Please try again shortly.']);
    }

    public function test_cargo_notices_preserve_an_open_approval_version_and_all_timeline_events(): void
    {
        [$sailing, $booking] = $this->pendingRequest();
        $input = ['id' => $sailing->id, 'version' => $sailing->version, 'cargo_status' => 'last_call', 'note' => 'Demo last call', 'share_location' => false];
        $this->postJson('/api/v1/providers/operations', $input)->assertOk()->assertJsonPath('notified', 1);
        $this->assertDatabaseHas('provider_seat_requests', ['reference' => $booking['reference'], 'version' => $booking['version'], 'status' => 'requested']);
        $approved = $this->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => $booking['version'], 'action' => 'confirmed'])->assertOk()->assertJsonPath('booking.status', 'confirmed')->assertJsonPath('booking.events.1.status', 'last_call')->assertJsonPath('booking.events.2.status', 'confirmed')->json('booking');
        $this->assertSame($booking['version'] + 1, $approved['version']);
        $this->postJson('/api/v1/providers/operations', [...$input, 'version' => $sailing->version + 1, 'cargo_status' => 'fully_loaded'])->assertOk();
        $this->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => $booking['version'], 'action' => 'confirmed'])->assertOk()->assertJsonPath('booking.version', $approved['version'])->assertJsonCount(4, 'booking.events');
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing->id, 'confirmed_seats' => 2]);
    }

    public function test_departure_notice_still_blocks_approval_even_without_a_request_version_change(): void
    {
        [$sailing, $booking] = $this->pendingRequest();
        $this->postJson('/api/v1/providers/operations', ['id' => $sailing->id, 'version' => $sailing->version, 'cargo_status' => 'departed', 'note' => 'Demo departed', 'share_location' => false])->assertOk();
        $this->postJson('/api/v1/providers/requests', ['reference' => $booking['reference'], 'version' => $booking['version'], 'action' => 'confirmed'])->assertConflict();
        $this->assertDatabaseHas('provider_sailings', ['id' => $sailing->id, 'confirmed_seats' => 0]);
        $this->assertDatabaseHas('provider_seat_requests', ['reference' => $booking['reference'], 'status' => 'requested']);
    }

    public function test_repeated_cancellation_is_explicit_and_does_not_mutate_the_record_twice(): void
    {
        $input = ['kind' => 'taxi', 'from' => 'velana-airport', 'to' => 'male', 'date' => '2030-11-02', 'passengers' => 2];
        $quote = $this->postJson('/api/v1/demo-checkout', [...$input, 'confirm' => false])->assertOk()->json('quote');
        $booking = $this->postJson('/api/v1/demo-checkout', [...$input, 'confirm' => true, 'quote_hash' => $quote['quote_hash']])->assertCreated()->json('booking');
        $this->postJson('/api/v1/demo-checkout/cancel', ['reference' => $booking['reference']])->assertOk()->assertJsonPath('already_cancelled', false)->assertJsonPath('status', 'cancelled');
        $updated = DB::table('demo_service_bookings')->where('reference', $booking['reference'])->value('updated_at');
        $this->travel(1)->minutes();
        $this->postJson('/api/v1/demo-checkout/cancel', ['reference' => $booking['reference']])->assertOk()->assertJsonPath('already_cancelled', true)->assertJsonPath('message', 'This demo reservation was already cancelled. No further changes were made.');
        $this->assertSame($updated, DB::table('demo_service_bookings')->where('reference', $booking['reference'])->value('updated_at'));
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/demo-checkout/cancel', ['reference' => $booking['reference']])->assertNotFound();
    }
}
