<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_service_bookings', function (Blueprint $table): void {
            $table->id();
            $table->string('reference')->unique();
            $table->string('guest_hash', 64);
            $table->string('context_key');
            $table->string('quote_hash', 64);
            $table->string('status');
            $table->string('journey_reference')->nullable();
            $table->unsignedInteger('details_version')->nullable();
            $table->text('snapshot');
            $table->timestamps();
            $table->unique(['guest_hash', 'context_key']);
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('alter table demo_service_bookings enable row level security');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_service_bookings');
    }
};
