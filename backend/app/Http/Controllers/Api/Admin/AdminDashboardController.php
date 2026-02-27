<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Item;
use App\Models\Transaction;
use App\Models\Verification;
use App\Models\Report;
use App\Models\GalleryPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Get dashboard analytics.
     */
    public function analytics(Request $request)
    {
        $totalUsers = User::count();
        $verifiedUsers = User::where('is_verified', true)->count();
        $totalItems = Item::count();
        $activeItems = Item::where('status', 'active')->count();
        $totalTransactions = Transaction::count();
        $completedTransactions = Transaction::where('status', 'completed')->count();
        $pendingVerifications = Verification::where('status', 'pending')->count();
        $pendingReports = Report::where('status', 'pending')->count();
        $totalGalleryPosts = GalleryPost::count();

        // Monthly transactions for chart
        $monthlyTransactions = Transaction::select(
            DB::raw('MONTH(created_at) as month'),
            DB::raw('YEAR(created_at) as year'),
            DB::raw('COUNT(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get();

        // Category distribution
        $categoryDistribution = Item::select('category', DB::raw('COUNT(*) as count'))
            ->groupBy('category')
            ->get();

        // Campus activity
        $campusActivity = Item::select('campus', DB::raw('COUNT(*) as count'))
            ->groupBy('campus')
            ->get();

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'verified_users' => $verifiedUsers,
                'total_items' => $totalItems,
                'active_items' => $activeItems,
                'total_transactions' => $totalTransactions,
                'completed_transactions' => $completedTransactions,
                'pending_verifications' => $pendingVerifications,
                'pending_reports' => $pendingReports,
                'total_gallery_posts' => $totalGalleryPosts,
            ],
            'monthly_transactions' => $monthlyTransactions,
            'category_distribution' => $categoryDistribution,
            'campus_activity' => $campusActivity,
        ]);
    }
}
