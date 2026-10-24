<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_accounts', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_name', 100);
            $table->string('email')->unique();
            $table->string('password');
            $table->string('organization_name', 100);
            $table->text('description')->nullable();
            $table->string('coverage', 500)->nullable();
            $table->timestamps();
        });
        Schema::create('provider_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_account_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
        });
        Schema::create('provider_vessels', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_account_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->unsignedInteger('passenger_capacity');
            $table->string('booking_mode')->default('off');
            $table->boolean('cargo_enquiries')->default(false);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('provider_sailings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_vessel_id')->constrained()->cascadeOnDelete();
            $table->string('origin', 150);
            $table->string('destination', 150);
            $table->timestamp('departure_at');
            $table->timestamp('arrival_at');
            $table->unsignedInteger('fare_minor')->nullable();
            $table->string('status')->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_sailings');
        Schema::dropIfExists('provider_vessels');
        Schema::dropIfExists('provider_sessions');
        Schema::dropIfExists('provider_accounts');
    }
};
