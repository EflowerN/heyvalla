<?php

namespace Tests\Feature;

use App\Services\SeaJourneySearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SeaJourneyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 24)->setTime(12, 0));
    }

    private function search(array $change = [])
    {
        return $this->getJson('/api/v1/sea-journeys?'.http_build_query([...['from' => 'ld0422', 'to' => 'ld0152', 'date' => '2026-10-25', 'passengers' => 2], ...$change]));
    }

    public function test_connecting_and_direct_routes_without_flight_fields(): void
    {
        $this->search()->assertOk()->assertJsonCount(1, 'options')->assertJsonPath('options.0.transfer_minutes', 25)->assertJsonPath('options.0.total_minor', 35000)->assertJsonPath('options.0.legs.0.departure_at', '2026-10-25T10:00:00+05:00')->assertJsonPath('options.0.arrival_at', '2026-10-25T12:00:00+05:00');
        $this->search(['to' => 'ld0694'])->assertJsonCount(1, 'options.0.legs');
        $this->search(['from' => 'ld0205', 'to' => 'ld0442'])->assertJsonPath('options.0.id', 'DEMO-VM');
        $this->search(['from' => 'ld0152', 'to' => 'ld0422'])->assertJsonCount(0, 'options');
        $this->search(['to' => 'ld0422'])->assertUnprocessable();
        $this->search(['date' => '2026-10-23'])->assertUnprocessable();
    }

    public function test_transfer_window_rejects_missed_tight_and_very_long_connections(): void
    {
        $legs = SeaJourneySearch::sailings('2026-10-25', 1);
        $first = $legs[0];
        $next = $legs[1];
        foreach (['10:04', '10:19', '14:06'] as $time) {
            $next['departure_at'] = '2026-10-25T'.$time.':00+05:00';
            $this->assertSame([], SeaJourneySearch::connections([$first, $next], 'ld0422', 'ld0152'));
        }
        $next['departure_at'] = '2026-10-25T10:20:00+05:00';
        $this->assertCount(1, SeaJourneySearch::connections([$first, $next], 'ld0422', 'ld0152'));
    }

    public function test_entire_sea_journey_can_be_confirmed_retried_and_cancelled(): void
    {
        $this->withHeader('X-Demo-Guest', (string) Str::uuid());
        $input = ['kind' => 'sea', 'id' => 'DEMO-KV~DEMO-VG', 'date' => '2026-10-25', 'passengers' => 2, 'confirm' => false];
        $quote = $this->postJson('/api/v1/demo-checkout', $input)->assertOk()->assertJsonPath('quote.total_minor', 35000)->json('quote');
        $confirm = [...$input, 'confirm' => true, 'quote_hash' => $quote['quote_hash']];
        $receipt = $this->postJson('/api/v1/demo-checkout', $confirm)->assertCreated()->assertJsonCount(2, 'booking.items')->assertJsonPath('booking.items.0.mode', 'sea')->json('booking');
        $this->postJson('/api/v1/demo-checkout', $confirm)->assertCreated()->assertJsonPath('booking.reference', $receipt['reference']);
        $this->assertDatabaseCount('demo_service_bookings', 1);
        $this->getJson('/api/v1/demo-checkout')->assertJsonPath('bookings.0.travel_date', '2026-10-25');
        $this->postJson('/api/v1/demo-checkout', [...$input, 'id' => 'DEMO-VG~DEMO-KV'])->assertUnprocessable();
        $this->postJson('/api/v1/demo-checkout', [...$input, 'id' => 'DEMO-KV~DEMO-KV'])->assertUnprocessable();
        $this->postJson('/api/v1/demo-checkout/cancel', ['reference' => $receipt['reference']])->assertOk();
    }

    public function test_provider_routes_respect_owner_booking_mode_and_do_not_become_instant_bookings(): void
    {
        $this->artisan('heyvalla:demo')->assertSuccessful();
        $data = $this->search(['from' => 'ld0205', 'to' => 'ld0082'])->assertOk()->json('options');
        $this->assertNotEmpty($data);
        $this->assertFalse($data[0]['demo_checkout']);
        $this->withHeader('X-Demo-Guest', (string) Str::uuid())->postJson('/api/v1/demo-checkout', ['kind' => 'sea', 'id' => $data[0]['id'], 'date' => '2026-10-25', 'passengers' => 1, 'confirm' => false])->assertUnprocessable();
        DB::table('provider_vessels')->update(['booking_mode' => 'off']);
        $this->search(['from' => 'ld0205', 'to' => 'ld0082'])->assertJsonCount(0,'options');
    }
}
