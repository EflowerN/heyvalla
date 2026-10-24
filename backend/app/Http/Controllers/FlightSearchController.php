<?php

namespace App\Http\Controllers;

use App\Services\FlightCatalogue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FlightSearchController extends Controller
{
    public function index(Request $request, FlightCatalogue $catalogue): JsonResponse
    {
        $input = $request->validate([
            'from' => ['required', 'string', Rule::in(array_column(config('locations.airports'), 'id'))],
            'to' => ['required', 'string', 'different:from', Rule::in(array_column(config('locations.airports'), 'id'))],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.now('Indian/Maldives')->toDateString()],
            'fare_profile' => ['required', Rule::in(['maldivian_adult', 'other'])],
        ]);

        return response()->json($catalogue->search($input))->header('Cache-Control', 'no-store');
    }
}
