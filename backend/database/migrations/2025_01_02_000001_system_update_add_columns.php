<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add forum_deadline_at to transactions (12-hour deadline for forum posting)
        Schema::table('transactions', function (Blueprint $table) {
            $table->timestamp('forum_deadline_at')->nullable()->after('completed_at');
        });

        // Add status (pending/approved/rejected) to gallery_posts for admin approval flow
        Schema::table('gallery_posts', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('visibility');
            $table->text('rejection_reason')->nullable()->after('status');
        });

        // Add is_locked to conversations (lock chat after transaction completion)
        Schema::table('conversations', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('participant_two_id');
        });

        // Add anonymous_alias to users for leaderboard anonymity
        Schema::table('users', function (Blueprint $table) {
            $table->string('anonymous_alias')->nullable()->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('forum_deadline_at');
        });

        Schema::table('gallery_posts', function (Blueprint $table) {
            $table->dropColumn(['status', 'rejection_reason']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('is_locked');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('anonymous_alias');
        });
    }
};
