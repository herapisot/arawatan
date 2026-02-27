<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Item;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Report/flag an item.
     */
    public function reportItem(Request $request, Item $item)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $report = Report::create([
            'item_id' => $item->id,
            'reporter_id' => $request->user()->id,
            'reported_by' => 'Community Report',
            'reason' => $request->reason,
            'severity' => 'medium',
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Report submitted successfully.',
            'report' => $report,
        ], 201);
    }
}
