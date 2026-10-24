<?php

namespace Tests\Feature;

use Tests\TestCase;

class RtlBusTest extends TestCase
{
    public function test_published_bus_catalogue(): void
    {
        $response = $this->getJson('/api/v1/rtl-buses')->assertOk()->assertJsonCount(28, 'routes')->assertJsonPath('source', 'https://rtl.mv/#/busticket');
        $routes = collect($response->json('routes'));
        $this->assertCount(28, $routes->pluck('id')->unique());
        $this->assertCount(15, $routes->where('area', 'Greater Malé'));
        $this->assertCount(13, $routes->where('area', '!=', 'Greater Malé'));
        $this->assertCount(7, $routes->where('area', '!=', 'Greater Malé')->pluck('area')->unique());
        foreach ($routes as $route) {
            $this->assertNotEmpty($route['stops']);
            $this->assertSame($route['origin'], $route['stops'][0]);
            $this->assertSame($route['destination'], $route['stops'][count($route['stops']) - 1]);
            if ($route['fare_minor'] !== null) {
                $this->assertGreaterThan(0, $route['fare_minor']);
            }
            $this->assertSame('MVR', $route['currency']);
            $this->assertNull($route['valid_from']);
            $this->assertNull($route['valid_until']);
            foreach ($route['origin_departures'] as $time) {
                $this->assertMatchesRegularExpression('/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/', $time);
            }
            $this->assertNull($route['service_days']);
        }
    }

    public function test_airport_services_and_missing_schedules_are_explicit(): void
    {
        $routes = collect($this->getJson('/api/v1/rtl-buses')->assertOk()->json('routes'));
        $this->assertEqualsCanonicalizing(['R3', 'R4', 'R9', 'FM01', 'LF01', 'LG01'], $routes->where('airport_service', true)->pluck('id')->all());
        $this->assertEqualsCanonicalizing(['LR01', 'LR02', 'LF01', 'LG01'], $routes->whereNull('fare_minor')->pluck('id')->all());
        $this->assertSame(500, $routes->firstWhere('id', 'FM01')['fare_minor']);
        $r3 = $routes->firstWhere('id', 'R3');
        $this->assertSame(1000, $r3['fare_minor']);
        $this->assertContains('VIA Domestic Terminal', $r3['stops']);
        $this->assertNotEmpty($r3['origin_departures']);
        foreach ($routes->where('schedule_status', 'not_available_at_origin') as $route) {
            $this->assertSame([], $route['origin_departures']);
        }
    }
}
