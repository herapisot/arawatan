<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image_path');
            $table->text('caption')->nullable();
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->integer('likes_count')->default(0);
            $table->timestamps();
        });

        Schema::create('gallery_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gallery_post_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['gallery_post_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gallery_likes');
        Schema::dropIfExists('gallery_posts');
    }
};
