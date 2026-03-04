<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ForumController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminVerificationController;
use App\Http\Controllers\Api\Admin\AdminModerationController;
use App\Http\Controllers\Api\Admin\AdminForumController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public item browsing
Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/custom-categories', [ItemController::class, 'customCategories']);
Route::get('/items/{encryptedId}', [ItemController::class, 'show']);

// Public leaderboard
Route::get('/leaderboard', [LeaderboardController::class, 'index']);

// Public forum
Route::get('/forum', [ForumController::class, 'index']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Profile
    Route::get('/user/profile', [ProfileController::class, 'show']);
    Route::put('/user/profile', [ProfileController::class, 'update']);
    Route::get('/users/{encryptedId}', [ProfileController::class, 'publicProfile']);

    // Verification
    Route::post('/verification/upload', [VerificationController::class, 'upload']);
    Route::get('/verification/status', [VerificationController::class, 'status']);

    // Items (authenticated)
    Route::post('/items', [ItemController::class, 'store'])->middleware('verified.user');
    Route::put('/items/{encryptedId}', [ItemController::class, 'update']);
    Route::delete('/items/{encryptedId}', [ItemController::class, 'destroy']);
    Route::get('/user/items', [ItemController::class, 'myItems']);

    // Item requests / transactions
    Route::post('/items/{encryptedId}/request', [TransactionController::class, 'requestItem']);
    Route::get('/transactions/{encryptedId}', [TransactionController::class, 'show']);
    Route::put('/transactions/{encryptedId}/approve', [TransactionController::class, 'approve']);
    Route::put('/transactions/{encryptedId}/meeting', [TransactionController::class, 'startMeeting']);
    Route::put('/transactions/{encryptedId}/complete', [TransactionController::class, 'complete']);
    Route::post('/transactions/{encryptedId}/proof', [TransactionController::class, 'uploadProof']);
    Route::put('/transactions/{encryptedId}/cancel', [TransactionController::class, 'cancel']);
    Route::get('/user/requests', [TransactionController::class, 'myRequests']);
    Route::get('/user/donations', [TransactionController::class, 'myDonations']);

    // Chat
    Route::get('/conversations', [ChatController::class, 'index']);
    Route::get('/conversations/{encryptedId}/messages', [ChatController::class, 'messages']);
    Route::post('/conversations/{encryptedId}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/conversations/start', [ChatController::class, 'startConversation']);

    // Forum (authenticated)
    Route::get('/forum/mine', [ForumController::class, 'myPosts']);
    Route::post('/forum', [ForumController::class, 'store']);
    Route::post('/forum/{encryptedId}/like', [ForumController::class, 'toggleLike']);

    // Reports
    Route::post('/items/{encryptedId}/report', [ReportController::class, 'reportItem']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{encryptedId}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/analytics', [AdminDashboardController::class, 'analytics']);
        Route::get('/verifications', [AdminVerificationController::class, 'index']);
        Route::post('/verifications/{encryptedId}/approve', [AdminVerificationController::class, 'approve']);
        Route::post('/verifications/{encryptedId}/reject', [AdminVerificationController::class, 'reject']);
        Route::get('/moderation', [AdminModerationController::class, 'index']);
        Route::post('/moderation/{encryptedId}/approve', [AdminModerationController::class, 'approveFalsePositive']);
        Route::post('/moderation/{encryptedId}/remove', [AdminModerationController::class, 'removeItem']);

        // Forum approval
        Route::get('/forum', [AdminForumController::class, 'index']);
        Route::post('/forum/{encryptedId}/approve', [AdminForumController::class, 'approve']);
        Route::post('/forum/{encryptedId}/reject', [AdminForumController::class, 'reject']);
    });
});
