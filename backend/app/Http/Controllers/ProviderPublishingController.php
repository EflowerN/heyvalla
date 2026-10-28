<?php

namespace App\Http\Controllers;

use App\Services\FollowMeVessels;
use App\Services\ProviderLifecycle;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProviderPublishingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        ProviderLifecycle::expirePending();

        return response()->json(['vessels' => DB::table('provider_vessels')->where('provider_account_id', $account->id)->get(), 'sailings' => DB::table('provider_sailings')->where('provider_account_id', $account->id)->orderBy('departure_at')->get()])->header('Cache-Control', 'no-store');
    }

    public function vessel(Request $request, FollowMeVessels $followMe): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        $input = $request->validate(['id' => ['nullable', 'integer'], 'version' => ['required_with:id', 'integer'], 'followme_id' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('provider_vessels', 'followme_id')->ignore($request->input('id'))], 'followme_authorized' => ['nullable', 'boolean'], 'name' => ['required', 'string', 'max:100'], 'passenger_capacity' => ['required', 'integer', 'min:1', 'max:500'], 'booking_mode' => ['required', 'in:off,request_to_book'], 'cargo_enquiries' => ['required', 'boolean']]);
        $values = ['name' => $input['name'], 'passenger_capacity' => $input['passenger_capacity'], 'booking_mode' => $input['booking_mode'], 'cargo_enquiries' => $input['cargo_enquiries'], 'updated_at' => now()];
        $followMeId = trim((string) ($input['followme_id'] ?? ''));
        if ($followMeId !== '' && empty($input['followme_authorized'])) {
            throw ValidationException::withMessages(['followme_authorized' => 'Confirm that you operate this vessel and authorise showing its position.']);
        }
        $existing = ! empty($input['id']) ? DB::table('provider_vessels')->where('provider_account_id', $account->id)->find($input['id']) : null;
        if ($followMeId === '') {
            $values += ['followme_id' => null, 'followme_linked_at' => null];
        } elseif ($existing?->followme_id === $followMeId) {
            $values += ['followme_id' => $followMeId];
        } else {
            // Only boats the owner has made public on FollowMe can be linked; if the feed is down we cannot check, so the link stays labelled unverified.
            abort_if($followMe->isListed($followMeId) === false, 422, 'That vessel is not in the public FollowMe list. Make the boat public on FollowMe first.');
            $values += ['followme_id' => $followMeId, 'followme_linked_at' => now()];
        }
        if (! empty($input['id'])) {
            $vessel = DB::table('provider_vessels')->where('provider_account_id', $account->id)->find($input['id']);
            abort_unless($vessel, 404);
            $changed = DB::table('provider_vessels')->where('id', $vessel->id)->where('version', $input['version'])->update([...$values, 'version' => $input['version'] + 1]);
            abort_unless($changed, 409, 'Vessel changed. Refresh before saving.');
            $id = $vessel->id;
        } else {
            $id = DB::table('provider_vessels')->insertGetId([...$values, 'provider_account_id' => $account->id, 'version' => 1, 'created_at' => now()]);
        }

        return response()->json(['vessel' => DB::table('provider_vessels')->find($id)]);
    }

    public function sailing(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        $islands = collect(config('locations.islands'))->keyBy('id');
        $input = $request->validate([
            'id' => ['nullable', 'integer'], 'version' => ['required_with:id', 'integer'],
            'provider_vessel_id' => ['required', 'integer', Rule::exists('provider_vessels', 'id')->where('provider_account_id', $account->id)],
            'origin_id' => ['required', 'string', Rule::in($islands->keys()->all())],
            'destination_id' => ['required', 'string', 'different:origin_id', Rule::in($islands->keys()->all())],
            'departure_at' => ['required', 'date_format:Y-m-d\TH:i'], 'arrival_at' => ['required', 'date_format:Y-m-d\TH:i', 'after:departure_at'],
            'fare_minor' => ['nullable', 'integer', 'min:1', 'max:100000000'],
        ]);
        $departure = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['departure_at'], 'Indian/Maldives')->utc();
        $arrival = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['arrival_at'], 'Indian/Maldives')->utc();
        abort_unless($departure->isFuture(), 422, 'Departure must be in the future.');

        return DB::transaction(function () use ($input, $departure, $arrival, $account, $islands): JsonResponse {
            $values = ['provider_vessel_id' => $input['provider_vessel_id'], 'origin_id' => $input['origin_id'], 'destination_id' => $input['destination_id'], 'origin' => $islands[$input['origin_id']]['name'].' harbour (demo)', 'destination' => $islands[$input['destination_id']]['name'].' harbour (demo)', 'departure_at' => $departure->format('Y-m-d H:i:s'), 'arrival_at' => $arrival->format('Y-m-d H:i:s'), 'fare_minor' => $input['fare_minor'] ?? null, 'updated_at' => now()];
            if (! empty($input['id'])) {
                $sailing = DB::table('provider_sailings')->where('provider_account_id', $account->id)->where('id', $input['id'])->lockForUpdate()->first();
                abort_unless($sailing, 404);
                abort_unless($sailing->status === 'draft' && $sailing->version === (int) $input['version'], 409, 'Only the latest private draft can be edited.');
                abort_if(DB::table('provider_seat_requests')->where('provider_sailing_id', $sailing->id)->exists(), 409, 'Create a new draft to preserve the history of earlier requests.');
                $id = $sailing->id;
                DB::table('provider_sailings')->where('id', $id)->update([...$values, 'seat_capacity' => DB::table('provider_vessels')->where('id', $input['provider_vessel_id'])->value('passenger_capacity'), 'version' => $sailing->version + 1]);
            } else {
                $id = DB::table('provider_sailings')->insertGetId([...$values, 'provider_account_id' => $account->id, 'seat_capacity' => DB::table('provider_vessels')->where('id', $input['provider_vessel_id'])->value('passenger_capacity'), 'confirmed_seats' => 0, 'status' => 'draft', 'version' => 1, 'created_at' => now()]);
            }

            return response()->json(['sailing' => DB::table('provider_sailings')->find($id)], empty($input['id']) ? 201 : 200);
        }, 5);
    }

    public function publish(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        ProviderLifecycle::expirePending();
        $input = $request->validate(['id' => ['required', 'integer'], 'version' => ['required', 'integer'], 'status' => ['required', 'in:published,draft,cancelled'], 'reason' => ['required_if:status,cancelled', 'nullable', 'string', 'max:500']]);

        return DB::transaction(function () use ($input, $account): JsonResponse {
            $sailing = DB::table('provider_sailings')->where('provider_account_id', $account->id)->where('id', $input['id'])->lockForUpdate()->first();
            abort_unless($sailing, 404);
            abort_unless($sailing->version === (int) $input['version'] && $sailing->status !== 'cancelled', 409, 'Sailing changed. Refresh before taking action.');
            if ($input['status'] === 'published') {
                abort_unless(CarbonImmutable::parse($sailing->departure_at, 'UTC')->isFuture(), 422, 'Past sailings cannot be published.');
                abort_unless($sailing->origin_id && $sailing->destination_id && $sailing->origin_id !== $sailing->destination_id, 422, 'Edit this draft and choose distinct islands before publishing.');
                DB::table('provider_vessels')->where('id', $sailing->provider_vessel_id)->lockForUpdate()->first();
                $conflict = DB::table('provider_sailings')->where('provider_vessel_id', $sailing->provider_vessel_id)->where('id', '!=', $sailing->id)->where('status', 'published')->where('departure_at', '<', CarbonImmutable::parse($sailing->arrival_at, 'UTC')->addMinutes(15))->where('arrival_at', '>', CarbonImmutable::parse($sailing->departure_at, 'UTC')->subMinutes(15))->exists();
                abort_if($conflict, 409, 'This vessel has another published sailing within the trip or 15-minute demo turnaround window.');
            } elseif ($input['status'] === 'draft') {
                abort_if(DB::table('provider_seat_requests')->where('provider_sailing_id', $sailing->id)->whereIn('status', ['requested', 'confirmed'])->exists(), 409, 'Active bookings exist. Switch new bookings off, or explicitly cancel the sailing with a reason.');
            } else {
                $bookings = DB::table('provider_seat_requests')->where('provider_sailing_id', $sailing->id)->whereIn('status', ['requested', 'confirmed'])->lockForUpdate()->get();
                foreach ($bookings as $booking) {
                    DB::table('provider_seat_requests')->where('id', $booking->id)->update(['status' => 'cancelled', 'version' => $booking->version + 1, 'events' => json_encode(ProviderLifecycle::appendEvent($booking, 'cancelled', 'provider', $input['reason'])), 'updated_at' => now()]);
                    ProviderLifecycle::cancelTaxi('provider_seat_request_id', $booking->id, 'Ferry cancelled: '.$input['reason']);
                }
            }
            $events = json_decode($sailing->service_events ?: '[]', true);
            $events[] = ['status' => $input['status'], 'at' => now()->toIso8601String(), 'reason' => $input['reason'] ?? 'Publication status changed by owner.'];
            DB::table('provider_sailings')->where('id', $sailing->id)->update(['status' => $input['status'], 'version' => $sailing->version + 1, 'confirmed_seats' => $input['status'] === 'cancelled' ? 0 : $sailing->confirmed_seats, 'service_events' => json_encode($events), 'updated_at' => now()]);

            return response()->json(['sailing' => DB::table('provider_sailings')->find($sailing->id)]);
        }, 5);
    }

    public function operations(Request $request): JsonResponse
    {
        $account = ProviderAccountController::account($request);
        $input = $request->validate(['id' => ['required', 'integer'], 'version' => ['required', 'integer'], 'cargo_status' => ['required', 'in:not_accepting,loading,fully_loaded,last_call,departed'], 'loading_opens' => ['nullable', 'date_format:Y-m-d\TH:i'], 'loading_closes' => ['nullable', 'date_format:Y-m-d\TH:i', 'after:loading_opens'], 'note' => ['required', 'string', 'max:500'], 'share_location' => ['required', 'boolean'], 'latitude' => ['required_if:share_location,true', 'nullable', 'numeric', 'between:-90,90'], 'longitude' => ['required_if:share_location,true', 'nullable', 'numeric', 'between:-180,180']]);

        return DB::transaction(function () use ($input, $account): JsonResponse {
            $sailing = DB::table('provider_sailings')->where('provider_account_id', $account->id)->where('id', $input['id'])->lockForUpdate()->first();
            abort_unless($sailing, 404);
            abort_unless($sailing->version === (int) $input['version'] && $sailing->status === 'published', 409, 'Refresh and choose the latest published sailing.');
            abort_unless((bool) ($input['loading_opens'] ?? null) === (bool) ($input['loading_closes'] ?? null), 422, 'Enter both cargo loading times or leave both blank.');
            $opens = empty($input['loading_opens']) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['loading_opens'], 'Indian/Maldives');
            $closes = empty($input['loading_closes']) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['loading_closes'], 'Indian/Maldives');
            abort_if($closes && $closes->greaterThan(CarbonImmutable::parse($sailing->departure_at, 'UTC')), 422, 'Cargo loading must close by scheduled departure.');
            $operations = ['cargo_status' => $input['cargo_status'], 'loading_opens' => $opens?->toIso8601String(), 'loading_closes' => $closes?->toIso8601String(), 'note' => $input['note'], 'location' => $input['share_location'] ? ['latitude' => (float) $input['latitude'], 'longitude' => (float) $input['longitude'], 'source' => 'owner_reported_demo', 'updated_at' => now()->toIso8601String()] : null, 'updated_at' => now()->toIso8601String()];
            DB::table('provider_sailings')->where('id', $sailing->id)->update(['operations' => json_encode($operations), 'version' => $sailing->version + 1, 'updated_at' => now()]);
            $bookings = DB::table('provider_seat_requests')->where('provider_sailing_id', $sailing->id)->whereIn('status', ['requested', 'confirmed'])->lockForUpdate()->get();
            foreach ($bookings as $booking) {
                DB::table('provider_seat_requests')->where('id', $booking->id)->update(['events' => json_encode(ProviderLifecycle::appendEvent($booking, $input['cargo_status'], 'provider', $input['note'])), 'updated_at' => now()]);
            }

            return response()->json(['operations' => $operations, 'notified' => $bookings->count(), 'message' => 'Saved. In-app updates added for booked/requesting passengers; no SMS or external push sent.']);
        }, 5);
    }

    public function catalogue(FollowMeVessels $followMe): JsonResponse
    {
        $sailings = DB::table('provider_sailings as s')->join('provider_accounts as p', 'p.id', '=', 's.provider_account_id')->join('provider_vessels as v', 'v.id', '=', 's.provider_vessel_id')->where('s.status', 'published')->where('s.departure_at', '>', now())->orderBy('s.departure_at')->limit(200)->get(['s.operations', 's.id', 's.origin_id', 's.destination_id', 's.version', 's.seat_capacity', 's.confirmed_seats', 'v.booking_mode', 's.origin', 's.destination', 's.departure_at', 's.arrival_at', 's.fare_minor', 'p.organization_name', 'p.description', 'p.coverage', 'v.name as vessel_name', 'v.passenger_capacity', 'v.followme_id'])->map(fn (object $sailing): array => [...(array) $sailing, 'departure_at' => CarbonImmutable::parse($sailing->departure_at, 'UTC')->toIso8601String(), 'arrival_at' => CarbonImmutable::parse($sailing->arrival_at, 'UTC')->toIso8601String(), 'currency' => 'MVR', 'verification' => 'unverified', 'demo' => true, 'remaining_seats' => $sailing->seat_capacity - $sailing->confirmed_seats, 'booking_available' => (json_decode($sailing->operations ?? 'null', true)['cargo_status'] ?? null) !== 'departed' && $sailing->booking_mode === 'request_to_book' && $sailing->fare_minor !== null && $sailing->confirmed_seats < $sailing->seat_capacity, 'operations' => $sailing->operations ? json_decode($sailing->operations, true) : null, 'location_sharing' => ! empty(json_decode($sailing->operations ?? 'null', true)['location']) ? 'owner_reported' : 'off']);

        // Position is only shown from three hours before departure, and the FollowMe id itself is never published.
        $tracked = $sailings->filter(fn (array $s): bool => $s['followme_id'] !== null && CarbonImmutable::parse($s['departure_at'])->lessThanOrEqualTo(now()->addHours(3)))->pluck('followme_id')->unique()->values()->all();
        $feed = $followMe->positionsFor($tracked);
        $sailings = $sailings->map(function (array $s) use ($feed): array {
            $linked = $s['followme_id'] !== null;
            $inWindow = $linked && CarbonImmutable::parse($s['departure_at'])->lessThanOrEqualTo(now()->addHours(3));
            $position = $inWindow ? ($feed['positions'][$s['followme_id']] ?? null) : null;
            unset($s['followme_id']);

            return [...$s, 'vessel_tracking' => ! $linked ? null : ['source' => 'FollowMe', 'source_url' => 'https://followme.mv/', 'linked_by' => 'owner', 'verified' => false, 'status' => $inWindow ? $feed['status'] : 'not_yet', 'message' => $inWindow ? ($position ? $feed['message'] : 'No recent FollowMe position for this boat yet.') : 'Boat position appears about three hours before departure.', 'position' => $position]];
        });

        return response()->json(['sailings' => $sailings])->header('Cache-Control', 'no-store');
    }
}
