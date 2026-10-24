<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_inventories', function (Blueprint $table) {
            $table->string('sailing_id')->primary();
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('reserved')->default(0);
        });
        Schema::create('demo_bookings', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('guest_hash', 64)->index();
            $table->uuid('request_id');
            $table->string('payload_hash', 64);
            $table->string('sailing_id');
            $table->string('passenger_name', 100);
            $table->string('email');
            $table->unsignedInteger('seats');
            $table->text('journey');
            $table->timestamp('created_at');
            $table->unique(['guest_hash', 'request_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_bookings');
        Schema::dropIfExists('demo_inventories');
    }
};
