<?php

namespace Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuditFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_identifies_this_application(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('application', 'Dhathuru App')->assertJsonPath('service_id', 'dhathuru-api');
    }

    public function test_search_and_booking_reject_past_dates_and_same_day_elapsed_flights_explicitly(): void
    {
        $this->travelTo(CarbonImmutable::parse('2030-11-02T09:00:00+05:00'));
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        foreach ([['2020-01-01', '14:00'], ['2030-11-02', '08:59'], ['2030-11-02', '09:00']] as [$date, $time]) {
            $input = ['island' => 'ld0205', 'airport' => 'VRNT', 'flight_date' => $date, 'flight_time' => $time, 'check_in_minutes' => 60];
            $this->getJson('/api/v1/ferry-search?'.http_build_query($input))->assertUnprocessable()->assertJsonValidationErrors('flight_date');
            $this->postJson('/api/v1/demo-bookings', [...$input, 'sailing_id' => 'HV101-'.$date, 'request_id' => (string) Str::uuid(), 'passenger_name' => 'Demo', 'email' => 'demo@example.test', 'seats' => 1])->assertUnprocessable()->assertJsonValidationErrors('flight_date');
        }
        $this->assertDatabaseCount('demo_bookings', 0);
    }

    public function test_guests_sharing_the_proxy_ip_receive_independent_limits_and_retry_headers(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/v1/demo-bookings')->assertOk();
        }
        $this->getJson('/api/v1/demo-bookings')->assertStatus(429)->assertHeader('Retry-After');
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->getJson('/api/v1/demo-bookings')->assertOk();
    }

    public function test_provider_sessions_have_independent_limits_behind_the_same_proxy(): void
    {
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $tokens = [];
        foreach (['lagoon', 'coral'] as $provider) {
            $tokens[] = $this->postJson('/api/v1/providers/login', ['email' => $provider.'@heyvalla.example', 'password' => 'heyvalla-demo-2026'])->assertOk()->json('token');
        }
        $this->withToken($tokens[0]);
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/v1/providers/account')->assertOk();
        }
        $this->getJson('/api/v1/providers/account')->assertStatus(429);
        $this->withToken($tokens[1])->getJson('/api/v1/providers/account')->assertOk();
    }

    public function test_invalid_guest_ids_cannot_create_new_anonymous_buckets(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->withHeader('X-Demo-Guest', 'invalid-'.$i)->getJson('/api/v1/demo-bookings')->assertUnprocessable();
        }
        $this->withHeader('X-Demo-Guest', 'invalid-another')->getJson('/api/v1/demo-bookings')->assertStatus(429);
    }
}
