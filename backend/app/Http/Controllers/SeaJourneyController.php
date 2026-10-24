<?php

namespace App\Http\Controllers;

use App\Services\SeaJourneySearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SeaJourneyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate(['from' => ['required', Rule::in(array_column(config('locations.islands'), 'id'))], 'to' => ['required', 'different:from', Rule::in(array_column(config('locations.islands'), 'id'))], 'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.now('Indian/Maldives')->toDateString()], 'passengers' => ['required', 'integer', 'min:1', 'max:6']]);

        return response()->json(['options' => SeaJourneySearch::connections(SeaJourneySearch::sailings($input['date'], (int) $input['passengers']), $input['from'], $input['to']), 'minimum_transfer_minutes' => 15, 'maximum_transfer_minutes' => 240, 'message' => 'Direct or one-change journeys departing on the selected Maldives date. Demo fixtures and published provider sailings only; missing routes do not imply no real service. Connections assume the same island harbour; boarding points require operator verification.'])->header('Cache-Control', 'no-store');
    }
}
