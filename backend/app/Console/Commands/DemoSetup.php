<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

#[Signature('heyvalla:demo {--reset : Replace only the two marked fictional providers and their dependent demo records}')]
#[Description('Create repeatable local demo providers and future dated sailings')]
class DemoSetup extends Command
{
    public function handle(): int
    {
        if (! app()->environment(['local', 'testing']) && ! config('demo_taxis.allow_hosted_demo_seed')) {
            $this->error('Demo setup is restricted to local and testing environments unless HEYVALLA_ALLOW_DEMO_SEED is enabled.');

            return self::FAILURE;
        }
        $date = CarbonImmutable::now('Indian/Maldives')->addDay()->startOfDay();
        DB::transaction(function () use ($date): void {
            foreach (['lagoon', 'coral'] as $index => $key) {
                $email = $key.'@heyvalla.example';
                $existing = DB::table('provider_accounts')->where('demo_seed_key', $key)->first();
                if ($existing && ! $this->option('reset')) {
                    continue;
                }
                abort_if(DB::table('provider_accounts')->where('email', $email)->whereNull('demo_seed_key')->exists(), 409, 'Demo email belongs to an unmarked account; nothing overwritten.');
                if ($existing) {
                    DB::table('provider_accounts')->where('id', $existing->id)->delete();
                }
                $owner = DB::table('provider_accounts')->insertGetId(['demo_seed_key' => $key, 'owner_name' => ucfirst($key).' Demo Owner', 'email' => $email, 'password' => Hash::make('heyvalla-demo-2026'), 'organization_name' => ucfirst($key).' Demo Launches', 'description' => 'Fictional provider for the HeyValla demonstration. No actual transport offered.', 'coverage' => 'Thaa Atoll demo', 'created_at' => now(), 'updated_at' => now()]);
                $vessel = DB::table('provider_vessels')->insertGetId(['provider_account_id' => $owner, 'name' => ucfirst($key).' Demo One', 'passenger_capacity' => 12, 'booking_mode' => 'request_to_book', 'cargo_enquiries' => false, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
                for ($day = 0; $day < 3; $day++) {
                    foreach ([['08:00', '09:30', 'published'], ['11:00', '12:30', 'published'], ['15:00', '16:30', 'draft']] as [$start, $end, $status]) {
                        $origin = $index === 0 ? 'ld0205' : 'ld0694';
                        $name = collect(config('locations.islands'))->firstWhere('id', $origin)['name'];
                        DB::table('provider_sailings')->insert(['provider_account_id' => $owner, 'provider_vessel_id' => $vessel, 'origin_id' => $origin, 'destination_id' => 'ld0082', 'origin' => $name.' harbour (demo)', 'destination' => 'Thimarafushi harbour (demo)', 'departure_at' => $date->addDays($day)->setTimeFromTimeString($start)->utc()->format('Y-m-d H:i:s'), 'arrival_at' => $date->addDays($day)->setTimeFromTimeString($end)->utc()->format('Y-m-d H:i:s'), 'fare_minor' => $index === 0 ? 15000 : 12000, 'seat_capacity' => 12, 'confirmed_seats' => 0, 'status' => $status, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
                    }
                }
            }
        });
        $this->info('Demo ready. Existing marked records are preserved unless --reset is supplied.');
        $this->line('Providers: lagoon@heyvalla.example / coral@heyvalla.example');
        $this->line('Local fictional password: heyvalla-demo-2026');
        $this->line('New fixtures start '.$date->toDateString().'. Try Vilufushi → Thimarafushi, flight 12:00, check-in 60 minutes; choose Lagoon 08:00.');
        $this->line('Approve in /providers, request taxi in /journeys, quote in /operator, then accept in /journeys. Nothing is a real booking.');

        return self::SUCCESS;
    }
}
