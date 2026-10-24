<?php

namespace App\Http\Controllers;

use App\Services\DemoCheckout;
use App\Services\TravelJourneys;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoCheckoutController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);

        return response()->json(['bookings' => DB::table('demo_service_bookings')->where('guest_hash', $guest)->orderByDesc('id')->limit(100)->get()->map(fn (object $booking): array => DemoCheckout::present($booking))])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);
        $input = $request->validate(['kind' => ['required', 'in:journey,flight,taxi,bus,sea'], 'id' => ['required_unless:kind,taxi', 'nullable', 'string', 'max:100'], 'from' => ['required_if:kind,taxi', 'string', 'max:80'], 'to' => ['required_if:kind,taxi', 'string', 'max:80'], 'date' => ['required_if:kind,taxi,bus,sea', 'date_format:Y-m-d', 'after_or_equal:'.now('Indian/Maldives')->toDateString()], 'passengers' => ['required', 'integer', 'min:1', 'max:6'], 'onward' => ['sometimes', 'in:taxi,bus'], 'confirm' => ['required', 'boolean'], 'quote_hash' => ['required_if:confirm,true', 'string', 'size:64']]);

        return DB::transaction(function () use ($guest, $input): JsonResponse {
            $quote = DemoCheckout::quote($input, $guest);
            if (! $input['confirm']) {
                return response()->json(['quote' => $quote]);
            }
            abort_unless(hash_equals($quote['quote_hash'], $input['quote_hash']), 409, 'The journey changed. Review the new quote before confirming.');
            DB::table('demo_service_bookings')->insertOrIgnore(['reference' => 'DEMO-'.strtoupper(Str::random(12)), 'guest_hash' => $guest, 'context_key' => $quote['context_key'], 'quote_hash' => $quote['quote_hash'], 'status' => 'demo_confirmed', 'journey_reference' => $quote['journey_reference'], 'details_version' => $quote['details_version'], 'snapshot' => json_encode($quote), 'created_at' => now(), 'updated_at' => now()]);
            $booking = DB::table('demo_service_bookings')->where('guest_hash', $guest)->where('context_key', $quote['context_key'])->lockForUpdate()->first();
            if ($booking->status === 'cancelled') {
                DB::table('demo_service_bookings')->where('id', $booking->id)->update(['quote_hash' => $quote['quote_hash'], 'status' => 'demo_confirmed', 'snapshot' => json_encode($quote), 'details_version' => $quote['details_version'], 'updated_at' => now()]);
                $booking = DB::table('demo_service_bookings')->find($booking->id);
            }
            abort_unless($booking->quote_hash === $quote['quote_hash'], 409, 'A different demo reservation already exists. Cancel it in My itineraries before changing services.');

            return response()->json(['booking' => DemoCheckout::present($booking)], 201);
        }, 5);
    }

    public function cancel(Request $request): JsonResponse
    {
        $guest = TravelJourneys::guest($request);
        $input = $request->validate(['reference' => ['required', 'string']]);
        $booking = DB::table('demo_service_bookings')->where('guest_hash', $guest)->where('reference', $input['reference'])->first();
        abort_unless($booking, 404);
        DB::table('demo_service_bookings')->where('id', $booking->id)->update(['status' => 'cancelled', 'updated_at' => now()]);

        return response()->json(['message' => 'Demo reservation cancelled. No real services or payments were affected.']);
    }
}
