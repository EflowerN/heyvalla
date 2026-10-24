<?php

namespace App\Http\Controllers;

use App\Http\Requests\FerrySearchRequest;
use App\Services\DemoBookings;
use App\Services\JourneyDetails;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DemoBookingController extends Controller
{
    private function guest(Request $request): string
    {
        return Validator::make(['guest' => $request->header('X-Demo-Guest')], ['guest' => ['required', 'uuid']])->validate()['guest'];
    }

    public function index(Request $request, DemoBookings $bookings): JsonResponse
    {
        return response()->json(['bookings' => $bookings->list($this->guest($request))])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, DemoBookings $bookings): JsonResponse
    {
        $guest = $this->guest($request);
        $input = $request->validate(array_merge((new FerrySearchRequest)->rules(), [
            'sailing_id' => ['required', 'string', 'max:50'], 'request_id' => ['required', 'uuid'],
            'passenger_name' => ['required', 'string', 'max:100'], 'email' => ['required', 'email', 'max:255'],
            'seats' => ['required', 'integer', 'min:1', 'max:6'],
            ...JourneyDetails::rules(),
        ]));

        return response()->json(['booking' => $bookings->create($input, $guest)], 201)->header('Cache-Control', 'no-store');
    }

    public function cancel(Request $request, DemoBookings $bookings): JsonResponse
    {
        $input = $request->validate(['reference' => ['required', 'string'], 'version' => ['required', 'integer']]);

        return response()->json(['booking' => $bookings->cancel($input['reference'], (int) $input['version'], $this->guest($request))]);
    }
}
