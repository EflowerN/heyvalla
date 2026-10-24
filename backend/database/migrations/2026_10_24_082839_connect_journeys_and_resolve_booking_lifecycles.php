<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_accounts', function (Blueprint $table): void {
            $table->string('demo_seed_key')->nullable()->unique();
        });
        Schema::table('provider_sailings', function (Blueprint $table): void {
            $table->string('origin_id')->nullable()->index();
            $table->string('destination_id')->nullable()->index();
            $table->text('service_events')->nullable();
        });
        Schema::table('demo_bookings', function (Blueprint $table): void {
            $table->string('status')->default('demo_confirmed');
            $table->unsignedInteger('version')->default(1);
        });
        Schema::table('demo_taxi_requests', function (Blueprint $table): void {
            $table->unsignedBigInteger('demo_booking_id')->nullable()->change();
            $table->foreignId('provider_seat_request_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->text('events')->nullable();
        });
        Schema::create('travel_journeys', function (Blueprint $table): void {
            $table->id();
            $table->string('reference')->unique();
            $table->string('guest_hash', 64)->index();
            $table->foreignId('demo_booking_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('provider_seat_request_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->text('flight_plan')->nullable();
            $table->timestamps();
        });
        foreach (['demo_bookings' => 'demo_booking_id', 'provider_seat_requests' => 'provider_seat_request_id'] as $table => $column) {
            DB::table($table)->orderBy('id')->chunkById(100, function ($bookings) use ($column): void {
                foreach ($bookings as $booking) {
                    $snapshot = json_decode($booking->journey, true);
                    DB::table('travel_journeys')->insert(['reference' => 'JY-'.strtoupper(Str::random(12)), 'guest_hash' => $booking->guest_hash, $column => $booking->id, 'flight_plan' => isset($snapshot['flight_at']) ? json_encode($snapshot) : null, 'created_at' => now(), 'updated_at' => now()]);
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('travel_journeys');
        DB::table('demo_taxi_requests')->whereNull('demo_booking_id')->delete();
        Schema::table('demo_taxi_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('provider_seat_request_id');
            $table->dropColumn('events');
            $table->unsignedBigInteger('demo_booking_id')->nullable(false)->change();
        });
        Schema::table('demo_bookings', fn (Blueprint $table) => $table->dropColumn(['status', 'version']));
        Schema::table('provider_sailings', fn (Blueprint $table) => $table->dropColumn(['origin_id', 'destination_id', 'service_events']));
        Schema::table('provider_accounts', fn (Blueprint $table) => $table->dropColumn('demo_seed_key'));
    }
};
