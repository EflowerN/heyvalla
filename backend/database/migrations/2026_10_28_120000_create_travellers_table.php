<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A traveller account only recovers a guest identity across devices: itineraries stay keyed by guest_uuid.
        Schema::create('travellers', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->uuid('guest_uuid')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('travellers');
    }
};
