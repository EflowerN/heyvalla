<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_sailings', function (Blueprint $table): void {
            $table->unsignedInteger('seat_capacity')->default(0);
            $table->unsignedInteger('confirmed_seats')->default(0);
        });
        foreach (DB::table('provider_sailings')->get() as $sailing) {
            DB::table('provider_sailings')->where('id', $sailing->id)->update(['seat_capacity' => DB::table('provider_vessels')->where('id', $sailing->provider_vessel_id)->value('passenger_capacity')]);
        }
        Schema::create('provider_seat_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_sailing_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->unique();
            $table->string('guest_hash', 64);
            $table->uuid('idempotency_key');
            $table->string('passenger_name', 100);
            $table->unsignedInteger('seats');
            $table->unsignedInteger('total_minor');
            $table->text('journey');
            $table->string('status')->default('requested');
            $table->unsignedInteger('version')->default(1);
            $table->text('events');
            $table->timestamps();
            $table->unique(['guest_hash', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_seat_requests');
        Schema::table('provider_sailings', function (Blueprint $table): void {
            $table->dropColumn(['seat_capacity', 'confirmed_seats']);
        });
    }
};
