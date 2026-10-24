<?php

namespace App\Http\Controllers;

use App\Http\Requests\FerrySearchRequest;
use App\Services\DemoFerrySearch;
use Illuminate\Http\JsonResponse;

class FerrySearchController extends Controller
{
    public function islands(): JsonResponse
    {
        return response()->json([
            'islands' => config('locations.islands'),
            'airports' => config('locations.airports'),
            'routes' => collect(config('demo_ferries.sailings'))->pluck('island')->unique()->values()->map(fn (string $id): array => ['origin_id' => $id, 'airport_id' => 'VRNT', 'demo' => true]),
            'retrieved_at' => config('locations.retrieved_at'),
        ]);
    }

    public function search(FerrySearchRequest $request, DemoFerrySearch $search): JsonResponse
    {
        return response()->json($search->search($request->validated()));
    }
}
