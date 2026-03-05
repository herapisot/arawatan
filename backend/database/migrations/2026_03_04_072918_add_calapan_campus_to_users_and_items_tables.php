<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN campus ENUM('main','bongabong','calapan','victoria','pinamalayan') DEFAULT 'main'");
        DB::statement("ALTER TABLE items MODIFY COLUMN campus ENUM('main','bongabong','calapan','victoria','pinamalayan') DEFAULT 'main'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN campus ENUM('main','bongabong','victoria','pinamalayan') DEFAULT 'main'");
        DB::statement("ALTER TABLE items MODIFY COLUMN campus ENUM('main','bongabong','victoria','pinamalayan') DEFAULT 'main'");
    }
};
