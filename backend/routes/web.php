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
        'mode' => 'demo',
        'service_timezone' => 'Indian/Maldives',
    ]);
})->name('api.health');

Route::get('/api/v1/islands', [FerrySearchController::class, 'islands'])->name('api.islands');
Route::get('/api/v1/ferry-search', [FerrySearchController::class, 'search'])->name('api.ferry-search');

Route::get('/api/v1/greater-male-fares', [GreaterMaleFareController::class, 'index'])->name('api.greater-male-fares');

Route::get('/api/v1/rtl-buses', [RtlBusController::class, 'index'])->name('api.rtl-buses');
