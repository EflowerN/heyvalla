<?php

return [
    'operator_token' => env('DEMO_OPERATOR_TOKEN'),
    // Hosted demo only: lets heyvalla:demo create the fictional providers outside local/testing.
    'allow_hosted_demo_seed' => (bool) env('HEYVALLA_ALLOW_DEMO_SEED', false),
    'disembarkation_minutes' => 5,
    'journey_minutes' => 15,
];
