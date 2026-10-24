<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SeaJourneySearch
{
    public static function sailings(string $date, int $passengers): array
    {
        $islands = collect(config('locations.islands'))->keyBy('id');
        $result = [];
        foreach (config('demo_sea_routes') as $route) {
            $depart = CarbonImmutable::parse($date.' '.$route['departure'], 'Indian/Maldives');
            $arrival = CarbonImmutable::parse($date.' '.$route['arrival'], 'Indian/Maldives');
            if ($arrival->lessThanOrEqualTo($depart)) {
                $arrival = $arrival->addDay();
            }
            if (! $depart->isFuture()) {
                continue;
            }
            $result[] = [...$route, 'origin' => $islands[$route['from']]['name'], 'destination' => $islands[$route['to']]['name'], 'departure_at' => $depart->toIso8601String(), 'arrival_at' => $arrival->toIso8601String(), 'source' => 'fictional_demo', 'booking' => 'demo_checkout', 'price_minor' => $route['fare_minor'] * $passengers];
        }
        $start = CarbonImmutable::parse($date, 'Indian/Maldives')->startOfDay();
        $providers = DB::table('provider_sailings as s')->join('provider_vessels as v', 'v.id', '=', 's.provider_vessel_id')->where('s.status', 'published')->whereBetween('s.departure_at', [$start->utc(), $start->endOfDay()->utc()])->where('s.departure_at', '>', now())->get(['s.*', 'v.name as vessel_name', 'v.booking_mode']);
        foreach ($providers as $s) {
            if (! $s->origin_id || ! $s->destination_id || $s->booking_mode !== 'request_to_book' || $s->fare_minor === null || $s->seat_capacity - $s->confirmed_seats < $passengers || (json_decode($s->operations ?? 'null', true)['cargo_status'] ?? null) === 'departed') {
                continue;
            }
            $result[] = ['id' => 'provider-'.$s->id, 'provider_sailing_id' => $s->id, 'version' => $s->version, 'remaining_seats' => $s->seat_capacity - $s->confirmed_seats, 'from' => $s->origin_id, 'to' => $s->destination_id, 'origin' => $islands[$s->origin_id]['name'], 'destination' => $islands[$s->destination_id]['name'], 'label' => $s->vessel_name, 'departure_at' => CarbonImmutable::parse($s->departure_at, 'UTC')->setTimezone('Indian/Maldives')->toIso8601String(), 'arrival_at' => CarbonImmutable::parse($s->arrival_at, 'UTC')->setTimezone('Indian/Maldives')->toIso8601String(), 'fare_minor' => $s->fare_minor, 'price_minor' => $s->fare_minor * $passengers, 'source' => 'provider_demo', 'booking' => 'request_to_book'];
        }

        return $result;
    }

    public static function connections(array $sailings, string $from, string $to): array
    {
        $options = [];
        foreach ($sailings as $first) {
            if ($first['from'] !== $from) {
                continue;
            }
            if ($first['to'] === $to) {
                $options[] = self::option([$first], 0);

                continue;
            }
            foreach ($sailings as $next) {
                if ($first['to'] !== $next['from'] || $next['to'] !== $to) {
                    continue;
                }
                $wait = (int) CarbonImmutable::parse($first['arrival_at'])->diffInMinutes(CarbonImmutable::parse($next['departure_at']), false);
                if ($wait >= 15 && $wait <= 240) {
                    $options[] = self::option([$first, $next], $wait);
                }
            }
        }
        usort($options, fn (array $a, array $b): int => strcmp($a['arrival_at'], $b['arrival_at']) ?: count($a['legs']) <=> count($b['legs']));

        return array_slice($options, 0, 30);
    }

    private static function option(array $legs, int $wait): array
    {
        return ['id' => implode('~', array_column($legs, 'id')), 'legs' => $legs, 'departure_at' => $legs[0]['departure_at'], 'arrival_at' => $legs[count($legs) - 1]['arrival_at'], 'transfer_minutes' => $wait, 'total_minor' => array_sum(array_column($legs, 'price_minor')), 'demo_checkout' => collect($legs)->every(fn (array $leg): bool => $leg['source'] === 'fictional_demo')];
    }

    public static function selected(string $id, string $date, int $passengers): array
    {
        $ids = explode('~', $id);
        abort_unless(count($ids) >= 1 && count($ids) <= 2 && count(array_unique($ids)) === count($ids), 422, 'Choose a valid direct or connecting ferry journey.');
        $catalogue = collect(self::sailings($date, $passengers))->keyBy('id');
        $legs = [];
        foreach ($ids as $key) {
            $leg = $catalogue->get($key);
            abort_unless($leg && $leg['source'] === 'fictional_demo', 422, 'This ferry requires provider approval or is no longer available.');
            $legs[] = $leg;
        }
        $option = collect(self::connections($legs, $legs[0]['from'], $legs[count($legs) - 1]['to']))->firstWhere('id',$id);
        abort_unless($option,422,'The selected ferries do not make a safe connection. Search again.');

        return $option;
    }
}
