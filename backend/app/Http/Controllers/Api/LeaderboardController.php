<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

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
        $users = User::where('role', 'user')
            ->where('points', '>', 0)
            ->orderBy('points', 'desc')
            ->limit(100)
            ->get();

        // Add rank, items_shared count, and anonymize names
        $leaderboard = $users->map(function ($user, $index) {
            // Assign anonymous alias if not yet set
            if (!$user->anonymous_alias) {
                $alias = self::ANIMAL_ALIASES[$user->id % count(self::ANIMAL_ALIASES)] . ' #' . $user->id;
                $user->update(['anonymous_alias' => $alias]);
                $user->anonymous_alias = $alias;
            }

            return [
                'rank' => $index + 1,
                'display_name' => $user->anonymous_alias,
                'tier' => $user->tier,
                'points' => $user->points,
                'items_shared' => $user->items_shared,
                'campus' => $user->campus,
            ];
        });

        // Get current user's rank (resolve from token on public route)
        $authUser = $request->user() ?? $this->resolveUserFromToken($request);
        $currentUserRank = null;
        if ($authUser) {
            $currentUserRank = User::where('role', 'user')
                ->where('points', '>', $authUser->points)
                ->count() + 1;
        }

        return response()->json([
            'leaderboard' => $leaderboard,
            'current_user_rank' => $currentUserRank,
        ]);
    }

    /**
     * Resolve user from Bearer token on public routes.
     */
    private function resolveUserFromToken(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) return null;

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) return null;

        return $accessToken->tokenable;
    }
}
