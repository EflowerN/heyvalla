<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_is_repeatable_and_reset_preserves_unmarked_accounts(): void
    {
        $this->postJson('/api/v1/providers/register', ['owner_name' => 'Independent Demo', 'organization_name' => 'Independent', 'email' => 'independent@example.test', 'password' => 'independent-test-password', 'password_confirmation' => 'independent-test-password'])->assertCreated();
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $first = DB::table('provider_sailings')->orderBy('id')->first();
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $this->assertDatabaseCount('provider_accounts', 4);
        $this->assertDatabaseCount('provider_sailings', 27);
        $this->assertSame($first->id, DB::table('provider_sailings')->orderBy('id')->value('id'));
        $this->travel(5)->days();
        $this->artisan('heyvalla:demo', ['--reset' => true])->assertSuccessful();
        $this->assertDatabaseCount('provider_accounts', 4);
        $this->assertDatabaseCount('provider_sailings', 27);
        $this->assertDatabaseHas('provider_accounts', ['email' => 'independent@example.test', 'demo_seed_key' => null]);
        $this->assertSame(0, DB::table('provider_sailings')->where('departure_at', '<=', now())->count());
    }

    public function test_production_cannot_create_known_demo_credentials(): void
    {
        $this->app->instance('env', 'production');
        $this->artisan('heyvalla:demo')->assertFailed();
        $this->assertDatabaseCount('provider_accounts', 0);
    }

    public function test_hosted_demo_flag_allows_seeding_outside_local(): void
    {
        $this->app->instance('env', 'production');
        config(['demo_taxis.allow_hosted_demo_seed' => true]);
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $this->assertDatabaseCount('provider_accounts', 3);
    }

    public function test_rerun_with_more_days_tops_up_sailings_without_duplicates(): void
    {
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $this->artisan('heyvalla:demo', ['--days' => 14])->assertSuccessful();
        $this->artisan('heyvalla:demo', ['--days' => 14])->assertSuccessful();
        $this->assertDatabaseCount('provider_accounts', 3);
        $this->assertDatabaseCount('provider_vessels', 3);
        $this->assertDatabaseCount('provider_sailings', 3 * 14 * 3);
    }
}
