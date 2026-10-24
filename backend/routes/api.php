<?php

use App\Http\Controllers\DemoBookingController;
use App\Http\Controllers\DemoTaxiController;
use App\Http\Controllers\JourneyController;
use App\Http\Controllers\ProviderAccountController;
use App\Http\Controllers\ProviderBookingController;
use App\Http\Controllers\ProviderPublishingController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:60,1')->group(function (): void {
    Route::post('/v1/demo-taxis', [DemoTaxiController::class, 'store']);
    Route::get('/v1/journeys', [JourneyController::class, 'index']);
    Route::post('/v1/journeys', [JourneyController::class, 'flight']);
    Route::patch('/v1/journeys', [JourneyController::class, 'details']);
    Route::post('/v1/demo-bookings/cancel', [DemoBookingController::class, 'cancel']);
    Route::post('/v1/demo-taxis/cancel', [DemoTaxiController::class, 'cancel']);
    Route::post('/v1/demo-taxis/accept', [DemoTaxiController::class, 'accept']);
    Route::get('/v1/operator/taxis', [DemoTaxiController::class, 'index']);
    Route::post('/v1/operator/taxis', [DemoTaxiController::class, 'operatorUpdate']);
    Route::get('/v1/demo-bookings', [DemoBookingController::class, 'index']);
    Route::post('/v1/demo-bookings', [DemoBookingController::class, 'store']);
});

Route::prefix('v1/providers')->middleware('throttle:60,1')->group(function (): void {
    Route::post('/register', [ProviderAccountController::class, 'register'])->middleware('throttle:provider-auth');
    Route::post('/login', [ProviderAccountController::class, 'login'])->middleware('throttle:provider-auth');
    Route::get('/account', [ProviderAccountController::class, 'show']);
    Route::post('/account', [ProviderAccountController::class, 'update']);
    Route::delete('/account', [ProviderAccountController::class, 'logout']);
    Route::get('/publishing', [ProviderPublishingController::class, 'index']);
    Route::post('/vessels', [ProviderPublishingController::class, 'vessel']);
    Route::post('/sailings', [ProviderPublishingController::class, 'sailing']);
    Route::post('/publish', [ProviderPublishingController::class, 'publish']);
    Route::get('/requests', [ProviderBookingController::class, 'operatorIndex']);
    Route::post('/requests', [ProviderBookingController::class, 'operatorUpdate']);
    Route::get('/catalogue', [ProviderPublishingController::class, 'catalogue']);
});

Route::prefix('v1/provider-bookings')->middleware('throttle:60,1')->group(function (): void {
    Route::get('/', [ProviderBookingController::class, 'index']);
    Route::post('/', [ProviderBookingController::class, 'store']);
    Route::post('/cancel', [ProviderBookingController::class, 'cancel']);
});
