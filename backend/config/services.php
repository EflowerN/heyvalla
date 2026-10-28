<?php

return [

    'followme' => [
        'key' => env('FOLLOWME_API_KEY'),
        // Confirm these paths against the first authorized v5 response before enabling.
        'data_path' => env('FOLLOWME_DATA_PATH', ''),
        'fields' => [
            'id' => env('FOLLOWME_ID_FIELD', 'id'),
            'name' => env('FOLLOWME_NAME_FIELD', 'name'),
            'latitude' => env('FOLLOWME_LATITUDE_FIELD', 'latitude'),
            'longitude' => env('FOLLOWME_LONGITUDE_FIELD', 'longitude'),
            'reported_at' => env('FOLLOWME_REPORTED_AT_FIELD', 'updated_at'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
