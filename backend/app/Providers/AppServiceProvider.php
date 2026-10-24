<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('provider-auth', fn (Request $request): array => [
            Limit::perMinute(20)->by('provider-auth-ip:'.$request->ip()),
            Limit::perMinute(5)->by('provider-auth-email:'.$request->ip().':'.strtolower((string) $request->input('email'))),
        ]);
    }
}
