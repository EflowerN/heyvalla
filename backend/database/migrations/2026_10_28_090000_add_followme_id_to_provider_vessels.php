<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_vessels', function (Blueprint $table): void {
            // One owner per public FollowMe vessel: the first authorised claim wins.
            $table->string('followme_id', 100)->nullable()->unique();
            $table->timestamp('followme_linked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('provider_vessels', function (Blueprint $table): void {
            $table->dropUnique(['followme_id']);
            $table->dropColumn(['followme_id', 'followme_linked_at']);
        });
    }
};
