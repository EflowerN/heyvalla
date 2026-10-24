<?php

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
        'application' => 'HeyValla',
        'mode' => 'demo',
        'service_timezone' => 'Indian/Maldives',
    ]);
})->name('api.health');
