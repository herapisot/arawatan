<?php

namespace App\Console\Commands;

use App\Models\ForumPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DeleteExpiredForumPosts extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'forum:delete-expired';

    /**
     * The console command description.
     */
    protected $description = 'Delete forum posts that are older than 30 days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $expiredPosts = ForumPost::where('created_at', '<', now()->subDays(30))->get();

        if ($expiredPosts->isEmpty()) {
            $this->info('No expired forum posts found.');
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

        $this->info("Deleted {$count} expired forum post(s).");
        Log::info("Scheduled cleanup: Deleted {$count} expired forum post(s) older than 30 days.");

        return self::SUCCESS;
    }
}
