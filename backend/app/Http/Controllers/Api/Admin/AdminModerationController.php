<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;

class AdminModerationController extends Controller
{
    /**
     * List flagged items/reports.
     */
    public function index(Request $request)
    {
        $query = Report::with(['item.images', 'item.user', 'reportedUser', 'reporter', 'reviewer']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        $reports = $query->latest()->paginate(20);

        return response()->json($reports);
    }

    /**
     * Mark report as false positive (approve item).
     */
    public function approveFalsePositive(Request $request, Report $report)
    {
        $report->update([
            'status' => 'approved_false_positive',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Make item active again if it was under review
        if ($report->item && $report->item->status === 'pending_review') {
            $report->item->update(['status' => 'active']);
        }

        return response()->json([
            'message' => 'Report cleared as false positive.',
            'report' => $report->fresh()->load(['item', 'reviewer']),
        ]);
    }

    /**
     * Remove item and optionally enforce against user.
     */
    public function removeItem(Request $request, Report $report)
    {
        $request->validate([
            'enforcement_action' => 'nullable|in:warn,suspend,ban',
        ]);

        $report->update([
            'status' => 'removed',
            'enforcement_action' => $request->enforcement_action,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Remove the item
        if ($report->item) {
            $report->item->update(['status' => 'removed']);
        }

        return response()->json([
            'message' => 'Item removed and report resolved.',
            'report' => $report->fresh()->load(['item', 'reviewer']),
        ]);
    }
}
