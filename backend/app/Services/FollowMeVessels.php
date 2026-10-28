<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FollowMeVessels
{
    public function publicFeed(): array
    {
        $key = trim((string) config('services.followme.key'));
        $base = ['source' => 'FollowMe', 'source_url' => 'https://followme.mv/api/v5/', 'refresh_after_seconds' => 65, 'fetched_at' => null, 'vessels' => []];
        if ($key === '') {
            return [...$base, 'status' => 'not_configured', 'message' => 'Live boat tracking is not connected yet. A FollowMe API key is required.'];
        }

        $cacheKey = 'followme:v5:public:'.hash('sha256', $key.json_encode(config('services.followme.fields')).config('services.followme.data_path'));
        $previous = Cache::get($cacheKey, $base);
        // Atomic shared gate includes failed requests; browser refreshes never bypass it.
        if (! Cache::add('followme:v5:next-request', true, 65)) {
            return $this->freshness([...$previous, 'status' => $previous['status'] ?? 'unavailable', 'message' => $previous['message'] ?? 'The vessel feed is refreshing. Please try again in a minute.']);
        }

        try {
            $response = Http::acceptJson()->connectTimeout(3)->timeout(8)->withoutRedirecting()
                ->get('https://followme.mv/api/v5/public/'.rawurlencode($key).'/');
            if (! $response->successful()) {
                throw new \RuntimeException('FollowMe is unavailable.');
            }
            $payload = $response->json();
            $path = (string) config('services.followme.data_path', '');
            $rows = $path === '' ? $payload : data_get($payload, $path);
            if (! is_array($rows) || ! array_is_list($rows)) {
                throw new \UnexpectedValueException('Check the configured JSON paths.');
            }
            $vessels = [];
            foreach ($rows as $row) {
                $vessel = $this->vessel($row);
                if ($vessel !== null) {
                    $vessels[$vessel['id']] = $vessel;
                }
            }
            if ($rows !== [] && $vessels === []) {
                throw new \UnexpectedValueException('No usable vessel coordinates.');
            }
            $feed = [...$base, 'status' => 'ok', 'message' => $rows === [] ? 'FollowMe returned no public vessels.' : 'Latest reported public vessel positions from FollowMe.', 'fetched_at' => now()->toIso8601String(), 'vessels' => array_values($vessels)];
        } catch (\UnexpectedValueException) {
            $feed = [...$previous, 'status' => 'unavailable', 'message' => 'The vessel feed format could not be read. Check the FollowMe field mapping. Showing saved positions, if available.'];
        } catch (\Throwable) {
            // The credential is part of the upstream URL: never expose/log the exception or raw body.
            $feed = [...$previous, 'status' => 'unavailable', 'message' => 'FollowMe is unavailable. Showing saved positions, if available.'];
        }
        Cache::put($cacheKey, $feed, 3600);

        return $this->freshness($feed);
    }

    /**
     * Positions for owner-linked vessels, keyed by FollowMe id. Uses the shared, rate-gated public feed,
     * so calling this per catalogue request never adds upstream traffic beyond one request a minute.
     *
     * @param  list<string>  $ids
     * @return array{status: string, message: string, source: string, positions: array<string, array>}
     */
    public function positionsFor(array $ids): array
    {
        if ($ids === []) {
            return ['status' => 'not_requested', 'message' => '', 'source' => 'FollowMe', 'positions' => []];
        }
        $feed = $this->publicFeed();
        $wanted = array_flip($ids);
        $positions = [];
        foreach ($feed['vessels'] as $vessel) {
            if (isset($wanted[$vessel['id']])) {
                $positions[$vessel['id']] = ['latitude' => $vessel['latitude'], 'longitude' => $vessel['longitude'], 'reported_at' => $vessel['reported_at'], 'freshness' => $vessel['freshness']];
            }
        }

        return ['status' => $feed['status'], 'message' => $feed['message'], 'source' => 'FollowMe', 'positions' => $positions];
    }

    /** Whether the id is currently listed as a public vessel; null when the feed cannot say. */
    public function isListed(string $id): ?bool
    {
        $feed = $this->publicFeed();
        if ($feed['status'] !== 'ok') {
            return null;
        }

        return in_array($id, array_column($feed['vessels'], 'id'), true);
    }

    private function vessel(mixed $row): ?array
    {
        if (! is_array($row)) {
            return null;
        }
        $fields = config('services.followme.fields');
        $id = data_get($row, $fields['id']);
        $name = data_get($row, $fields['name']);
        $latitude = data_get($row, $fields['latitude']);
        $longitude = data_get($row, $fields['longitude']);
        if ((! is_string($id) && ! is_int($id)) || trim((string) $id) === '' || ! is_string($name) || trim($name) === '' || ! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }
        $latitude = (float) $latitude;
        $longitude = (float) $longitude;
        if (! is_finite($latitude) || ! is_finite($longitude) || abs($latitude) > 90 || abs($longitude) > 180) {
            return null;
        }

        return ['id' => mb_substr((string) $id, 0, 100), 'name' => mb_substr(trim($name), 0, 160), 'latitude' => $latitude, 'longitude' => $longitude, 'reported_at' => $this->timestamp(data_get($row, $fields['reported_at']))];
    }

    private function timestamp(mixed $value): ?string
    {
        try {
            if (is_numeric($value) && (float) $value > 0) {
                $date = CarbonImmutable::createFromTimestampUTC((float) $value > 100000000000 ? (float) $value / 1000 : (float) $value);
            } elseif (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:?\d{2})$/i', $value)) {
                $date = CarbonImmutable::parse($value);
            } else {
                return null;
            }

            return $date->greaterThan(now()->addMinute()) ? null : $date->utc()->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    private function freshness(array $feed): array
    {
        $tooOld = ! $feed['fetched_at'] || CarbonImmutable::parse($feed['fetched_at'])->lessThan(now()->subHour());
        $feed['vessels'] = $tooOld ? [] : array_map(function (array $vessel) use ($feed): array {
            $vessel['freshness'] = ! $vessel['reported_at'] ? 'unknown' : (CarbonImmutable::parse($vessel['reported_at'])->lessThan(now()->subMinutes(10)) || $feed['status'] !== 'ok' ? 'stale' : 'recent');

            return $vessel;
        }, $feed['vessels']);

        return $feed;
    }
}
