<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FollowMeVesselLinkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array', 'services.followme.key' => 'test-secret-key']);
        Cache::flush();
        Http::preventStrayRequests();
    }

    private function feed(array $rows): void
    {
        // Synthetic adapter fixtures, not a verified FollowMe v5 response.
        Http::fake(['followme.mv/api/v5/public/test-secret-key/' => Http::response($rows)]);
    }

    private function row(string $id = '1000', array $changes = []): array
    {
        return [...['id' => $id, 'name' => 'Test boat', 'latitude' => 2.2, 'longitude' => 73.1, 'updated_at' => now()->subMinute()->toIso8601String()], ...$changes];
    }

    private function register(string $email = 'owner@example.test'): string
    {
        return $this->postJson('/api/v1/providers/register', ['owner_name' => 'Demo Owner', 'organization_name' => 'Demo Launch', 'email' => $email, 'password' => 'fictional-test-password', 'password_confirmation' => 'fictional-test-password'])->assertCreated()->json('token');
    }

    private function save(string $token, array $extra = [], string $name = 'Demo Boat')
    {
        return $this->withToken($token)->postJson('/api/v1/providers/vessels', ['name' => $name, 'passenger_capacity' => 12, 'booking_mode' => 'request_to_book', 'cargo_enquiries' => false, ...$extra]);
    }

    private function publishedSailing(string $token, int $vesselId, int $departsInMinutes): int
    {
        $id = $this->withToken($token)->postJson('/api/v1/providers/sailings', ['provider_vessel_id' => $vesselId, 'origin_id' => 'ld0205', 'destination_id' => 'ld0082', 'departure_at' => now()->addDays(2)->format('Y-m-d\TH:i'), 'arrival_at' => now()->addDays(2)->addHours(2)->format('Y-m-d\TH:i'), 'fare_minor' => 15000])->assertCreated()->json('sailing.id');
        $this->withToken($token)->postJson('/api/v1/providers/publish', ['id' => $id, 'version' => 1, 'status' => 'published'])->assertOk();
        DB::table('provider_sailings')->where('id', $id)->update(['departure_at' => now()->addMinutes($departsInMinutes)->utc(), 'arrival_at' => now()->addMinutes($departsInMinutes + 90)->utc()]);

        return $id;
    }

    public function test_linking_requires_owner_confirmation_and_a_safe_id(): void
    {
        $token = $this->register();
        $this->save($token, ['followme_id' => '1000'])->assertUnprocessable()->assertJsonValidationErrors('followme_authorized');
        $this->save($token, ['followme_id' => '1000', 'followme_authorized' => false])->assertUnprocessable()->assertJsonValidationErrors('followme_authorized');
        $this->save($token, ['followme_id' => '../1000?x=1', 'followme_authorized' => true])->assertUnprocessable()->assertJsonValidationErrors('followme_id');
        $this->assertSame(0, DB::table('provider_vessels')->count());
        Http::assertNothingSent();
    }

    public function test_only_boats_in_the_public_feed_can_be_linked_and_the_link_is_unverified_when_feed_is_down(): void
    {
        $token = $this->register();
        $this->feed([$this->row('1000')]);
        $this->save($token, ['followme_id' => '9999', 'followme_authorized' => true])->assertUnprocessable()->assertJsonPath('message', 'That vessel is not in the public FollowMe list. Make the boat public on FollowMe first.');
        $this->save($token, ['followme_id' => '1000', 'followme_authorized' => true])->assertOk()->assertJsonPath('vessel.followme_id', '1000');
        $this->assertNotNull(DB::table('provider_vessels')->first()->followme_linked_at);

        Cache::flush();
        config(['services.followme.key' => 'down-key']);
        Http::fake(['followme.mv/api/v5/public/down-key/' => Http::response('down', 503)]);
        $this->save($token, ['followme_id' => '2000', 'followme_authorized' => true], 'Second Boat')->assertOk()->assertJsonPath('vessel.followme_id', '2000');
    }

    public function test_a_followme_vessel_can_belong_to_only_one_owner(): void
    {
        $this->feed([$this->row('1000')]);
        $first = $this->register();
        $second = $this->register('other@example.test');
        $this->save($first, ['followme_id' => '1000', 'followme_authorized' => true])->assertOk();
        $this->save($second, ['followme_id' => '1000', 'followme_authorized' => true], 'Copycat')->assertUnprocessable()->assertJsonValidationErrors('followme_id');
    }

    public function test_editing_a_linked_vessel_keeps_the_link_without_another_lookup_and_empty_id_unlinks(): void
    {
        $token = $this->register();
        $this->feed([$this->row('1000')]);
        $vessel = $this->save($token, ['followme_id' => '1000', 'followme_authorized' => true])->assertOk()->json('vessel');
        Cache::flush();
        Http::fake();
        $renamed = $this->save($token, ['id' => $vessel['id'], 'version' => $vessel['version'], 'followme_id' => '1000', 'followme_authorized' => true], 'Renamed')->assertOk()->json('vessel');
        $this->assertSame('1000', $renamed['followme_id']);
        Http::assertNothingSent();
        $cleared = $this->save($token, ['id' => $renamed['id'], 'version' => $renamed['version'], 'followme_id' => ''], 'Renamed')->assertOk()->json('vessel');
        $this->assertNull($cleared['followme_id']);
        $this->assertNull(DB::table('provider_vessels')->first()->followme_linked_at);
    }

    public function test_catalogue_shows_the_linked_position_only_near_departure_and_never_the_followme_id(): void
    {
        $token = $this->register();
        $this->feed([$this->row('1000')]);
        $vessel = $this->save($token, ['followme_id' => '1000', 'followme_authorized' => true])->assertOk()->json('vessel');
        $soon = $this->publishedSailing($token, $vessel['id'], 90);
        $later = $this->publishedSailing($token, $vessel['id'], 24 * 60);
        Cache::flush();
        $this->feed([$this->row('1000')]);

        $response = $this->getJson('/api/v1/providers/catalogue')->assertOk();
        $this->assertStringNotContainsString('1000"', json_encode(array_column($response->json('sailings'), 'vessel_tracking')));
        $this->assertStringNotContainsString('followme_id', $response->getContent());
        $byId = collect($response->json('sailings'))->keyBy('id');
        $this->assertSame('ok', $byId[$soon]['vessel_tracking']['status']);
        $this->assertSame('recent', $byId[$soon]['vessel_tracking']['position']['freshness']);
        $this->assertSame(2.2, $byId[$soon]['vessel_tracking']['position']['latitude']);
        $this->assertFalse($byId[$soon]['vessel_tracking']['verified']);
        $this->assertSame('FollowMe', $byId[$soon]['vessel_tracking']['source']);
        $this->assertSame('not_yet', $byId[$later]['vessel_tracking']['status']);
        $this->assertNull($byId[$later]['vessel_tracking']['position']);
    }

    public function test_unlinked_vessels_have_no_tracking_and_trigger_no_feed_request(): void
    {
        $token = $this->register();
        $vessel = $this->save($token)->assertOk()->json('vessel');
        $this->publishedSailing($token, $vessel['id'], 60);
        $this->getJson('/api/v1/providers/catalogue')->assertOk()->assertJsonPath('sailings.0.vessel_tracking', null);
        Http::assertNothingSent();
    }

    public function test_a_feed_outage_never_hides_the_sailing_or_invents_a_position(): void
    {
        $token = $this->register();
        $this->feed([$this->row('1000')]);
        $vessel = $this->save($token, ['followme_id' => '1000', 'followme_authorized' => true])->assertOk()->json('vessel');
        $this->publishedSailing($token, $vessel['id'], 60);
        Cache::flush();
        config(['services.followme.key' => 'down-key']);
        Http::fake(['followme.mv/api/v5/public/down-key/' => Http::response('nope', 500)]);
        $this->getJson('/api/v1/providers/catalogue')->assertOk()->assertJsonCount(1, 'sailings')->assertJsonPath('sailings.0.vessel_tracking.status', 'unavailable')->assertJsonPath('sailings.0.vessel_tracking.position', null);
    }
}
