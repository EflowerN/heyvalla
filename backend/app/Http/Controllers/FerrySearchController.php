<?php

namespace App\Http\Controllers;

use App\Http\Requests\FerrySearchRequest;
use App\Services\DemoFerrySearch;
use Illuminate\Http\JsonResponse;

class FerrySearchController extends Controller
{
    public function islands(): JsonResponse
    {
        return response()->json(['islands' => collect(config('demo_ferries.islands'))
            ->map(fn (string $name, string $id): array => ['id' => $id, 'name' => $name])->values()]);
    }

    public function search(FerrySearchRequest $request, DemoFerrySearch $search): JsonResponse
    {
        return response()->json($search->search($request->validated()));
    }
}
