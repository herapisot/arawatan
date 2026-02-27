<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->enum('category', ['books', 'electronics', 'clothing', 'supplies', 'equipment', 'furniture', 'sports', 'others'])->default('others');
            $table->enum('condition', ['like-new', 'excellent', 'good', 'fair'])->default('good');
            $table->enum('campus', ['main', 'bongabong', 'victoria', 'pinamalayan'])->default('main');
            $table->string('meetup_location')->default('Arawatan Corner');
            $table->enum('status', ['pending_review', 'active', 'reserved', 'completed', 'removed'])->default('pending_review');
            $table->boolean('is_verified')->default(false);
            $table->integer('views_count')->default(0);
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('item_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->onDelete('cascade');
            $table->string('image_path');
            $table->boolean('is_primary')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_images');
        Schema::dropIfExists('items');
    }
};
