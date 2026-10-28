<?php

namespace Tests\Feature;

use App\Services\FollowMeVessels;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FollowMeVesselsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2030-11-01T07:00:00Z'));
        config(['cache.default' => 'array', 'services.followme.key' => 'test-secret-key']);
        Cache::flush();
        Http::preventStrayRequests();
    }

    private function row(array $changes = []): array
    {
        // Synthetic adapter fixtures, not a verified FollowMe v5 response.
        return [...['id' => 1000, 'name' => 'Test boat', 'latitude' => '2.2', 'longitude' => '73.1', 'updated_at' => '2030-11-01T06:59:00Z', 'private_phone' => 'not-for-client'], ...$changes];
    }

    public function test_missing_key_is_explicit_and_never_calls_the_upstream(): void
    {
        config(['services.followme.key' => '']);
        $this->getJson('/api/v1/live-vessels')->assertOk()->assertJsonPath('status', 'not_configured')->assertJsonPath('vessels', [])->assertHeader('Cache-Control', 'no-store, private');
        Http::assertNothingSent();
    }

    public function test_public_feed_is_normalized_allowlisted_and_cached_across_visitors(): void
    {
        Http::fake(['followme.mv/api/v5/public/test-secret-key/' => Http::response([$this->row(), $this->row(['id' => 2, 'latitude' => 999]), $this->row(['id' => 3, 'longitude' => null])])]);
        $first = $this->getJson('/api/v1/live-vessels')->assertOk()->assertJsonPath('status', 'ok')->assertJsonCount(1, 'vessels')->assertJsonPath('vessels.0.latitude', 2.2)->assertJsonPath('vessels.0.freshness', 'recent');
        $this->assertStringNotContainsString('test-secret-key', $first->getContent());
        $first->assertJsonMissingPath('vessels.0.private_phone');
        $this->withHeader('X-Demo-Guest', 'd41d8cd9-8f00-4204-a980-0998ecf8427e')->getJson('/api/v1/live-vessels')->assertOk();
        $this->travel(64)->seconds();
        app(FollowMeVessels::class)->publicFeed();
        Http::assertSentCount(1);
        $this->travel(2)->seconds();
        app(FollowMeVessels::class)->publicFeed();
        Http::assertSentCount(2);
    }

    public function test_failed_requests_also_obey_the_gate_and_hide_upstream_details(): void
    {
        Http::fake(['*' => Http::response('Invalid test-secret-key /private/server/path', 401)]);
        $response = $this->getJson('/api/v1/live-vessels')->assertOk()->assertJsonPath('status', 'unavailable')->assertJsonPath('vessels', []);
        $this->assertStringNotContainsString('test-secret-key', $response->getContent());
        $this->assertStringNotContainsString('/private/server/path', $response->getContent());
        app(FollowMeVessels::class)->publicFeed();
        Http::assertSentCount(1);
    }

    public function test_failures_keep_last_known_positions_without_claiming_a_fresh_report(): void
    {
        Http::fake(['*' => Http::sequence()->push([$this->row()])->pushStatus(503)]);
        app(FollowMeVessels::class)->publicFeed();
        $this->travel(66)->seconds();
        $feed = app(FollowMeVessels::class)->publicFeed();
        $this->assertSame('unavailable', $feed['status']);
        $this->assertSame('stale', $feed['vessels'][0]['freshness']);
        $this->assertSame('2030-11-01T07:00:00+00:00', $feed['fetched_at']);
        $this->travel(61)->minutes();
        $this->assertSame([], app(FollowMeVessels::class)->publicFeed()['vessels']);
    }

    public function test_timestamps_do_not_substitute_fetch_time_for_unknown_or_old_reports(): void
    {
        Http::fake(['*' => Http::response([
            $this->row(['id' => 1, 'updated_at' => '2030-11-01T06:00:00Z']),
            $this->row(['id' => 2, 'updated_at' => '2030-11-01 07:00:00']),
            $this->row(['id' => 3, 'updated_at' => '2030-11-01T09:00:00Z']),
            $this->row(['id' => 4, 'updated_at' => now()->subMinute()->timestamp * 1000]),
        ])]);
        $vessels = app(FollowMeVessels::class)->publicFeed()['vessels'];
        $this->assertSame(['stale', 'unknown', 'unknown', 'recent'], array_column($vessels, 'freshness'));
        $this->assertNull($vessels[1]['reported_at']);
    }

    public function test_configured_paths_support_wrapped_responses_and_invalid_schema_is_unavailable(): void
    {
        config(['services.followme.data_path' => 'boats', 'services.followme.fields.latitude' => 'position.lat', 'services.followme.fields.longitude' => 'position.lon']);
        Http::fake(['*' => Http::sequence()->push(['boats' => [$this->row(['position' => ['lat' => 2.3, 'lon' => 73.4]])]])->push(['error' => 'not a vessel list'])->push(['boats' => [$this->row(['position' => ['lat' => 999, 'lon' => 73]])]])->push(['boats' => []])]);
        $this->assertSame(2.3, app(FollowMeVessels::class)->publicFeed()['vessels'][0]['latitude']);
        $this->travel(66)->seconds();
        $this->assertSame('unavailable', app(FollowMeVessels::class)->publicFeed()['status']);
        $this->travel(66)->seconds();
        $this->assertSame('unavailable', app(FollowMeVessels::class)->publicFeed()['status']);
        $this->travel(66)->seconds();
        $feed = app(FollowMeVessels::class)->publicFeed();
        $this->assertSame('ok', $feed['status']);
        $this->assertSame([], $feed['vessels']);
    }
}
