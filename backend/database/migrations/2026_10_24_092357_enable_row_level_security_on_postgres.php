<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Supabase exposes the public schema through its REST API. Laravel connects as the
     * table owner, so enabling RLS without policies blocks anon/authenticated API access only.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (DB::table('pg_tables')->where('schemaname', 'public')->pluck('tablename') as $table) {
            DB::statement(sprintf('alter table public."%s" enable row level security', $table));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (DB::table('pg_tables')->where('schemaname', 'public')->pluck('tablename') as $table) {
            DB::statement(sprintf('alter table public."%s" disable row level security', $table));
        }
    }
};
