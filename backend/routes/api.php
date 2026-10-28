<?php

use App\Http\Controllers\AdminAccountController;
use App\Http\Controllers\DemoBookingController;
use App\Http\Controllers\DemoCheckoutController;
use App\Http\Controllers\DemoTaxiController;
use App\Http\Controllers\FlightSearchController;
use App\Http\Controllers\JourneyController;
use App\Http\Controllers\LiveVesselController;
use App\Http\Controllers\ProviderAccountController;
use App\Http\Controllers\ProviderBookingController;
use App\Http\Controllers\ProviderPublishingController;
use App\Http\Controllers\SeaJourneyController;
use App\Http\Controllers\TravellerAccountController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:transport')->group(function (): void {
    Route::get('/v1/live-vessels', LiveVesselController::class);
    Route::get('/v1/demo-checkout', [DemoCheckoutController::class, 'index']);
    Route::post('/v1/demo-checkout', [DemoCheckoutController::class, 'store']);
    Route::post('/v1/demo-checkout/cancel', [DemoCheckoutController::class, 'cancel']);
    Route::get('/v1/sea-journeys', [SeaJourneyController::class, 'index']);
    Route::get('/v1/flights', [FlightSearchController::class, 'index']);
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

Route::prefix('v1/providers')->middleware('throttle:transport')->group(function (): void {
    Route::post('/register', [ProviderAccountController::class, 'register'])->middleware('throttle:provider-auth');
    Route::post('/login', [ProviderAccountController::class, 'login'])->middleware('throttle:provider-auth');
    Route::get('/account', [ProviderAccountController::class, 'show']);
    Route::post('/account', [ProviderAccountController::class, 'update']);
    Route::delete('/account', [ProviderAccountController::class, 'logout']);
    Route::get('/publishing', [ProviderPublishingController::class, 'index']);
    Route::post('/operations', [ProviderPublishingController::class, 'operations']);
    Route::post('/vessels', [ProviderPublishingController::class, 'vessel']);
    Route::post('/sailings', [ProviderPublishingController::class, 'sailing']);
    Route::post('/publish', [ProviderPublishingController::class, 'publish']);
    Route::get('/requests', [ProviderBookingController::class, 'operatorIndex']);
    Route::post('/requests', [ProviderBookingController::class, 'operatorUpdate']);
    Route::get('/catalogue', [ProviderPublishingController::class, 'catalogue']);
});

Route::prefix('v1/provider-bookings')->middleware('throttle:transport')->group(function (): void {
    Route::get('/', [ProviderBookingController::class, 'index']);
    Route::post('/', [ProviderBookingController::class, 'store']);
    Route::post('/cancel', [ProviderBookingController::class, 'cancel']);
});

Route::prefix('v1/travellers')->middleware('throttle:60,1')->group(function (): void {
    Route::post('/register', [TravellerAccountController::class, 'register'])->middleware('throttle:traveller-auth');
    Route::post('/login', [TravellerAccountController::class, 'login'])->middleware('throttle:traveller-auth');
    Route::get('/me', [TravellerAccountController::class, 'show']);
    Route::post('/logout', [TravellerAccountController::class, 'logout']);
});

Route::prefix('v1/admin')->middleware('throttle:60,1')->group(function (): void {
    Route::get('/users', [AdminAccountController::class, 'index']);
    Route::post('/users/{id}', [AdminAccountController::class, 'update'])->whereNumber('id');
    Route::get('/audit', [AdminAccountController::class, 'audit']);
});
