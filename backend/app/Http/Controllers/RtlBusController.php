<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class RtlBusController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(config('rtl_buses'));
    }
}
