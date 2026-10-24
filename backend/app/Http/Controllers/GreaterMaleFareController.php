<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GreaterMaleFareController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = config('greater_male_fares');
        $result = ['zones' => $data['zones'], 'currency' => 'MVR', 'source' => $data['source'],
            'currency_confirmed_by' => $data['currency_confirmed_by'], 'valid_from' => null, 'valid_until' => null, 'estimate' => null];
        if ($request->has('from') || $request->has('to')) {
            $input = $request->validate(['from' => ['required', 'string', Rule::in(array_column($data['zones'], 'id'))], 'to' => ['required', 'string', 'different:from', Rule::in(array_column($data['zones'], 'id'))]]);
            $result['estimate'] = ['from' => $input['from'], 'to' => $input['to'], 'amount_minor' => $data['fares_minor'][$input['from']][$input['to']],
                'currency' => 'MVR', 'same_zone' => $input['from'] === $input['to']];
        }

        return response()->json($result);
    }
}
