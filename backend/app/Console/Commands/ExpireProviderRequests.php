<?php

namespace App\Console\Commands;

use App\Services\ProviderLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('heyvalla:expire-requests')]
#[Description('Resolve pending seat requests after departure')]
class ExpireProviderRequests extends Command
{
    public function handle(): int
    {
        $this->info('Expired '.ProviderLifecycle::expirePending().' pending requests.');

        return self::SUCCESS;
    }
}
