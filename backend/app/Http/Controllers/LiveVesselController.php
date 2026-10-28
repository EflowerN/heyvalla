<?php

namespace App\Http\Controllers;

use App\Services\FollowMeVessels;
use Illuminate\Http\JsonResponse;

class LiveVesselController extends Controller
{
    public function __invoke(FollowMeVessels $feed): JsonResponse
    {
        return response()->json($feed->publicFeed())->header('Cache-Control', 'no-store');
    }
}
