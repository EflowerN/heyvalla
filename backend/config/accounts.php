<?php

return [
    // Turn off in production: boat owners then sign up through Create account and wait for admin approval.
    'provider_self_registration' => (bool) env('PROVIDER_SELF_REGISTRATION', true),
];
