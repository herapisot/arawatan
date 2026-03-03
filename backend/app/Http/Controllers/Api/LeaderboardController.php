<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    /**
     * Anonymous animal aliases for leaderboard display.
     */
    private const ANIMAL_ALIASES = [
        'Brave Eagle', 'Gentle Deer', 'Wise Owl', 'Swift Fox',
        'Calm Turtle', 'Bold Tiger', 'Kind Dolphin', 'Bright Hawk',
        'Noble Bear', 'Silent Cat', 'Happy Otter', 'Proud Lion',
        'Quiet Mouse', 'Warm Sparrow', 'Free Falcon', 'Pure Dove',
        'Strong Wolf', 'Clever Crow', 'Loyal Dog', 'Graceful Swan',
        'Playful Panda', 'Busy Bee', 'Mighty Whale', 'Gentle Lamb',
        'Watchful Heron', 'Friendly Seal', 'Fearless Lynx', 'Merry Robin',
        'Steady Bison', 'Agile Monkey',
    ];

    /**
     * Get leaderboard data with anonymized names.
     */
    public function index(Request $request)
    {
        $period = $request->get('period', 'all-time');

        $query = User::select('id', 'first_name', 'last_name', 'campus', 'tier', 'points', 'avatar_url', 'anonymous_alias')
            ->where('role', 'user')
            ->where('points', '>', 0)
            ->orderBy('points', 'desc');

        $users = $query->limit(100)->get();

        // Add rank and anonymize names
        $users = $users->map(function ($user, $index) {
            $user->rank = $index + 1;

            // Assign anonymous alias if not yet set
            if (!$user->anonymous_alias) {
                $alias = self::ANIMAL_ALIASES[$user->id % count(self::ANIMAL_ALIASES)] . ' #' . $user->id;
                $user->update(['anonymous_alias' => $alias]);
                $user->anonymous_alias = $alias;
            }

            // Replace real name with anonymous alias for display
            $user->display_name = $user->anonymous_alias;
            $user->makeHidden(['first_name', 'last_name']);

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
