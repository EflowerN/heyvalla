<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('travellers', function (Blueprint $table): void {
            // type: customer | vessel_owner | vehicle_owner | business. Admin is a separate flag so staff can also test as a customer.
            $table->string('type', 20)->default('customer');
            // status: active | pending (owner or business awaiting approval) | suspended
            $table->string('status', 20)->default('active');
            $table->boolean('is_admin')->default(false);
            $table->string('organization_name', 100)->nullable();
            $table->string('phone', 40)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
        });
        Schema::create('traveller_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('traveller_id')->constrained('travellers')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('admin_audit', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('admin_id');
            $table->unsignedBigInteger('target_id');
            $table->string('action', 40);
            $table->text('detail')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::table('provider_accounts', function (Blueprint $table): void {
            $table->unsignedBigInteger('traveller_id')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('provider_accounts', function (Blueprint $table): void {
            $table->dropUnique(['traveller_id']);
            $table->dropColumn('traveller_id');
        });
        Schema::dropIfExists('admin_audit');
        Schema::dropIfExists('traveller_sessions');
        Schema::table('travellers', function (Blueprint $table): void {
            $table->dropColumn(['type', 'status', 'is_admin', 'organization_name', 'phone', 'approved_at', 'approved_by']);
        });
    }
};
