<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MakeAdmin extends Command
{
    protected $signature = 'accounts:make-admin {email : Email of an existing account} {--revoke : Remove admin rights instead}';

    protected $description = 'Grant or remove admin rights. Admins can only be created here, never through the website.';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $traveller = DB::table('travellers')->where('email', $email)->first();
        if (! $traveller) {
            $this->error("No account for {$email}. Ask them to create an account first, then run this again.");

            return self::FAILURE;
        }
        if ($this->option('revoke')) {
            if (DB::table('travellers')->where('is_admin', true)->where('status', 'active')->count() <= 1 && $traveller->is_admin) {
                $this->error('That is the last active admin. Make another admin first.');

                return self::FAILURE;
            }
            DB::table('travellers')->where('id', $traveller->id)->update(['is_admin' => false, 'updated_at' => now()]);
            DB::table('traveller_sessions')->where('traveller_id', $traveller->id)->delete();
            $this->info("{$email} is no longer an admin.");

            return self::SUCCESS;
        }
        DB::table('travellers')->where('id', $traveller->id)->update(['is_admin' => true, 'status' => 'active', 'updated_at' => now()]);
        DB::table('traveller_sessions')->where('traveller_id', $traveller->id)->delete();
        $this->info("{$email} is now an admin. They need to sign in again.");

        return self::SUCCESS;
    }
}
