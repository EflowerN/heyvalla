<?php

use App\Http\Controllers\DemoBookingController;
use App\Http\Controllers\DemoTaxiController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:60,1')->group(function (): void {
    Route::post('/v1/demo-taxis', [DemoTaxiController::class, 'store']);
    Route::post('/v1/demo-taxis/accept', [DemoTaxiController::class, 'accept']);
    Route::get('/v1/operator/taxis', [DemoTaxiController::class, 'index']);
    Route::post('/v1/operator/taxis', [DemoTaxiController::class, 'operatorUpdate']);
    Route::get('/v1/demo-bookings', [DemoBookingController::class, 'index']);
    Route::post('/v1/demo-bookings', [DemoBookingController::class, 'store']);
});
