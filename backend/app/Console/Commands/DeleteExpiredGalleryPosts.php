<?php

namespace App\Console\Commands;

use App\Models\GalleryPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DeleteExpiredGalleryPosts extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'gallery:delete-expired';

    /**
     * The console command description.
     */
    protected $description = 'Delete gallery posts that are older than 30 days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $expiredPosts = GalleryPost::where('created_at', '<', now()->subDays(30))->get();

        if ($expiredPosts->isEmpty()) {
            $this->info('No expired gallery posts found.');
            return self::SUCCESS;
        }

        $count = 0;

        foreach ($expiredPosts as $post) {
            // Delete the image file from storage
            if ($post->image_path && Storage::disk('public')->exists($post->image_path)) {
                Storage::disk('public')->delete($post->image_path);
            }

            $post->delete();
            $count++;
        }

        $this->info("Deleted {$count} expired gallery post(s).");
        Log::info("Scheduled cleanup: Deleted {$count} expired gallery post(s) older than 30 days.");

        return self::SUCCESS;
    }
}
