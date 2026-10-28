<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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
        RateLimiter::for('transport', fn (Request $request): Limit => Limit::perMinute(60)->by(self::clientKey($request)));
        RateLimiter::for('provider-auth', fn (Request $request): array => [
            Limit::perMinute(20)->by('provider-auth-client:'.self::clientKey($request)),
            Limit::perMinute(5)->by('provider-auth-email:'.hash('sha256', strtolower(trim((string) $request->input('email'))))),
        ]);
    }

    private static function clientKey(Request $request): string
    {
        if ($token = $request->bearerToken()) {
            return 'provider:'.hash('sha256', $token);
        }
        $guest = $request->header('X-Demo-Guest');

        return is_string($guest) && Str::isUuid($guest) ? 'guest:'.hash('sha256', $guest) : 'anonymous:'.$request->ip();
    }
}
