<?php

use App\Http\Controllers\FerrySearchController;
use App\Http\Controllers\GreaterMaleFareController;
use App\Http\Controllers\RtlBusController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
        'application' => 'Dhathuru App',
        'service_id' => 'dhathuru-api',
        'mode' => 'demo',
        'service_timezone' => 'Indian/Maldives',
    ]);
})->name('api.health');

Route::get('/api/v1/islands', [FerrySearchController::class, 'islands'])->middleware('throttle:transport')->name('api.islands');
Route::get('/api/v1/ferry-search', [FerrySearchController::class, 'search'])->middleware('throttle:transport')->name('api.ferry-search');

Route::get('/api/v1/greater-male-fares', [GreaterMaleFareController::class, 'index'])->middleware('throttle:transport')->name('api.greater-male-fares');

Route::get('/api/v1/rtl-buses', [RtlBusController::class, 'index'])->middleware('throttle:transport')->name('api.rtl-buses');
