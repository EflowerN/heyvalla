<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('travel_journeys', function (Blueprint $table): void {
            $table->text('journey_details')->nullable();
            $table->unsignedInteger('details_version')->default(0);
            $table->string('details_hash', 64)->nullable();
            $table->string('details_booking_hash', 64)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('travel_journeys', function (Blueprint $table): void {
            $table->dropColumn(['journey_details', 'details_version', 'details_hash', 'details_booking_hash']);
        });
    }
};
