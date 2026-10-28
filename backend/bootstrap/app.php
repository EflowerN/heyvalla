<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request): Response {
            if (! $request->is('api/*') || ! $response instanceof JsonResponse) {
                return $response;
            }
            $data = $response->getData(true);
            if (! is_array($data)) {
                return $response;
            }
            unset($data['exception'], $data['file'], $data['line'], $data['trace']);
            if ($response->getStatusCode() >= 500) {
                $data = ['message' => 'The transport service is temporarily unavailable. Please try again shortly.'];
            }

            return $response->setData($data)->header('Cache-Control', 'no-store');
        });
    })->create();
