<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    /**
     * Get leaderboard data.
     */
    public function index(Request $request)
    {
        $period = $request->get('period', 'all-time');

        $query = User::select('id', 'first_name', 'last_name', 'campus', 'tier', 'points', 'avatar_url')
            ->where('role', 'user')
            ->where('points', '>', 0)
            ->orderBy('points', 'desc');

        $users = $query->limit(100)->get();

        // Add rank
        $users = $users->map(function ($user, $index) {
            $user->rank = $index + 1;
            return $user;
        });

        // Get current user's rank
        $currentUserRank = null;
        if ($request->user()) {
            $currentUserRank = User::where('points', '>', $request->user()->points)->count() + 1;
        }

        return response()->json([
            'leaderboard' => $users,
            'current_user_rank' => $currentUserRank,
        ]);
    }
}
