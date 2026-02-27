<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    /**
     * Browse items with filters.
     */
    public function index(Request $request)
    {
        $query = Item::with(['images', 'user'])
            ->where('status', 'active');

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Campus filter
        if ($request->filled('campus') && $request->campus !== 'all') {
            $query->where('campus', $request->campus);
        }

        // Condition filter
        if ($request->filled('condition') && $request->condition !== 'all') {
            $query->where('condition', $request->condition);
        }

        // Sort
        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'oldest':
                $query->oldest();
                break;
            case 'popular':
                $query->orderBy('views_count', 'desc');
                break;
            default:
                $query->latest();
                break;
        }

        $items = $query->paginate($request->get('per_page', 12));

        return response()->json($items);
    }

    /**
     * Get a single item detail.
     */
    public function show(Item $item)
    {
        // Increment views
        $item->increment('views_count');

        $item->load(['images', 'user', 'transactions.receiver']);

        return response()->json($item);
    }

    /**
     * Create a new item listing.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|in:books,electronics,clothing,supplies,equipment,furniture,sports,others',
            'condition' => 'required|in:like-new,excellent,good,fair',
            'campus' => 'required|in:main,bongabong,victoria,pinamalayan',
            'meetup_location' => 'nullable|string|max:255',
            'images' => 'required|array|min:1|max:5',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        // Check monthly limit: 5 items per month
        $monthlyCount = Item::where('user_id', $request->user()->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        if ($monthlyCount >= 5) {
            return response()->json([
                'message' => 'You have reached the monthly limit of 5 item listings.',
            ], 422);
        }

        $item = Item::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'category' => $validated['category'],
            'condition' => $validated['condition'],
            'campus' => $validated['campus'],
            'meetup_location' => $validated['meetup_location'] ?? 'Arawatan Corner',
            'status' => 'pending_review',
            'posted_at' => now(),
        ]);

        // Handle image uploads
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                $path = $image->store('items', 'public');
                ItemImage::create([
                    'item_id' => $item->id,
                    'image_path' => $path,
                    'is_primary' => $index === 0,
                    'sort_order' => $index,
                ]);
            }
        }

        // Auto-approve for now (simulate AI screening pass)
        $item->update([
            'status' => 'active',
            'is_verified' => true,
        ]);

        return response()->json(
            $item->load('images'),
            201
        );
    }

    /**
     * Update an existing item.
     */
    public function update(Request $request, Item $item)
    {
        // Only owner can update
        if ($item->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => 'sometimes|in:books,electronics,clothing,supplies,equipment,furniture,sports,others',
            'condition' => 'sometimes|in:like-new,excellent,good,fair',
            'campus' => 'sometimes|in:main,bongabong,victoria,pinamalayan',
            'meetup_location' => 'sometimes|string|max:255',
        ]);

        $item->update($validated);

        return response()->json($item->load('images'));
    }

    /**
     * Delete an item listing.
     */
    public function destroy(Request $request, Item $item)
    {
        if ($item->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete associated images from storage
        foreach ($item->images as $image) {
            Storage::disk('public')->delete($image->image_path);
        }

        $item->delete();

        return response()->json(['message' => 'Item removed successfully']);
    }

    /**
     * Get current user's items.
     */
    public function myItems(Request $request)
    {
        $items = Item::with('images')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(12);

        return response()->json($items);
    }
}
