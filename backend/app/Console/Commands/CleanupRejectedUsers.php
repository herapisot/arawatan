<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Verification;
use Illuminate\Console\Command;

class CleanupRejectedUsers extends Command
{
    protected $signature = 'users:cleanup-rejected';
    protected $description = 'Remove unverified/rejected user accounts that should not persist';

    public function handle(): int
    {
        $stale = User::where('is_verified', false)
            ->where('verification_status', '!=', 'approved')
            ->where('role', '!=', 'admin')
            ->get();

        $this->info("Found {$stale->count()} unverified/rejected users to clean up.");

        foreach ($stale as $user) {
            $this->line("  Deleting: {$user->email} (status: {$user->verification_status})");
            Verification::where('user_id', $user->id)->delete();
            $user->tokens()->delete();
            $user->delete();
        }

        $this->info("Done. Cleaned up {$stale->count()} records.");
        return 0;
    }
}
