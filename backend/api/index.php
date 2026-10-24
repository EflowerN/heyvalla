<?php

// Vercel serverless entrypoint. Present the request as if it hit public/index.php,
// otherwise Laravel treats "/api" as the base path and strips it from every route.
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/../public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require __DIR__.'/../public/index.php';
