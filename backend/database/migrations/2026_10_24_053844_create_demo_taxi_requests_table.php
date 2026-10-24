<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_taxi_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_booking_id')->unique()->constrained('demo_bookings');
            $table->string('reference')->unique();
            $table->string('status')->default('requested');
            $table->unsignedInteger('passengers');
            $table->unsignedInteger('bags');
            $table->string('pickup_at');
            $table->unsignedInteger('price_minor')->nullable();
            $table->string('quote_expires_at')->nullable();
            $table->string('operator_note', 500)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_taxi_requests');
    }
};
