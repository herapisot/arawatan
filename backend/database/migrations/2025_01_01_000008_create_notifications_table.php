<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // 'item_request', 'request_approved', 'new_message', 'transaction_completed', etc.
            $table->string('title');
            $table->text('message');
            $table->string('link')->nullable(); // frontend route to navigate to
            $table->unsignedBigInteger('related_id')->nullable(); // transaction_id or conversation_id
            $table->string('related_type')->nullable(); // 'transaction', 'conversation'
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
