<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Item;
use App\Models\ItemImage;
use App\Models\Badge;
use App\Models\GalleryPost;
use App\Models\Transaction;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'ARAWATAN',
            'email' => 'admin@minsu.edu.ph',
            'student_id' => 'ADMIN-001',
            'campus' => 'main',
            'user_type' => 'staff',
            'password' => Hash::make('password'),
            'is_verified' => true,
            'verification_status' => 'approved',
            'role' => 'admin',
            'tier' => 'Gold Community Champion',
            'points' => 999,
        ]);

        // Create demo users
        $users = [];
        $userSeeds = [
            ['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria.santos@minsu.edu.ph', 'student_id' => '2024-00001', 'campus' => 'main', 'points' => 150, 'tier' => 'Silver Contributor'],
            ['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'email' => 'juan.delacruz@minsu.edu.ph', 'student_id' => '2024-00002', 'campus' => 'main', 'points' => 85, 'tier' => 'Bronze Contributor'],
            ['first_name' => 'Ana', 'last_name' => 'Reyes', 'email' => 'ana.reyes@minsu.edu.ph', 'student_id' => '2024-00003', 'campus' => 'bongabong', 'points' => 250, 'tier' => 'Silver Contributor'],
            ['first_name' => 'Carlos', 'last_name' => 'Garcia', 'email' => 'carlos.garcia@minsu.edu.ph', 'student_id' => '2024-00004', 'campus' => 'victoria', 'points' => 520, 'tier' => 'Gold Community Champion'],
            ['first_name' => 'Sofia', 'last_name' => 'Mendoza', 'email' => 'sofia.mendoza@minsu.edu.ph', 'student_id' => '2024-00005', 'campus' => 'pinamalayan', 'points' => 45, 'tier' => 'Bronze Contributor'],
            ['first_name' => 'Gabriel', 'last_name' => 'Tan', 'email' => 'gabriel.tan@minsu.edu.ph', 'student_id' => '2024-00006', 'campus' => 'main', 'points' => 320, 'tier' => 'Silver Contributor'],
            ['first_name' => 'Isabella', 'last_name' => 'Cruz', 'email' => 'isabella.cruz@minsu.edu.ph', 'student_id' => '2024-00007', 'campus' => 'bongabong', 'points' => 180, 'tier' => 'Silver Contributor'],
            ['first_name' => 'Miguel', 'last_name' => 'Flores', 'email' => 'miguel.flores@minsu.edu.ph', 'student_id' => '2024-00008', 'campus' => 'main', 'points' => 95, 'tier' => 'Bronze Contributor'],
        ];

        foreach ($userSeeds as $seed) {
            $users[] = User::create(array_merge($seed, [
                'user_type' => 'student',
                'password' => Hash::make('password'),
                'is_verified' => true,
                'verification_status' => 'approved',
                'role' => 'user',
            ]));
        }

        // Create badges
        $badgeSeeds = [
            ['name' => 'First Exchange', 'icon' => '🎉', 'description' => 'Completed your first item exchange', 'points_required' => 0],
            ['name' => '10 Contributions', 'icon' => '🎁', 'description' => 'Shared 10 items with the community', 'points_required' => 100],
            ['name' => 'Trusted Donor', 'icon' => '⭐', 'description' => 'Consistently high-quality donations', 'points_required' => 200],
            ['name' => 'Silver Contributor', 'icon' => '🥈', 'description' => 'Reached Silver tier', 'points_required' => 100],
            ['name' => 'Gold Champion', 'icon' => '🏆', 'description' => 'Reached Gold tier', 'points_required' => 500],
            ['name' => 'Community Leader', 'icon' => '👑', 'description' => 'Top contributor in the community', 'points_required' => 1000],
        ];

        $badges = [];
        foreach ($badgeSeeds as $badgeSeed) {
            $badges[] = Badge::create($badgeSeed);
        }

        // Assign some badges to users
        $users[0]->badges()->attach([$badges[0]->id, $badges[1]->id, $badges[3]->id]);
        $users[2]->badges()->attach([$badges[0]->id, $badges[1]->id, $badges[2]->id, $badges[3]->id]);
        $users[3]->badges()->attach([$badges[0]->id, $badges[1]->id, $badges[2]->id, $badges[3]->id, $badges[4]->id]);
        $users[5]->badges()->attach([$badges[0]->id, $badges[1]->id, $badges[2]->id, $badges[3]->id]);

        // Create sample items
        $itemSeeds = [
            ['user' => $users[0], 'title' => 'Engineering Textbook - Dynamics', 'description' => 'Meriam & Kraige Engineering Mechanics: Dynamics, 8th Edition. Barely used, perfect condition with no highlights or annotations.', 'category' => 'books', 'condition' => 'like-new', 'campus' => 'main'],
            ['user' => $users[1], 'title' => 'Scientific Calculator - Casio fx-991ES', 'description' => 'Casio fx-991ES PLUS scientific calculator. Works perfectly, includes cover case. Great for engineering and math courses.', 'category' => 'electronics', 'condition' => 'excellent', 'campus' => 'main'],
            ['user' => $users[2], 'title' => 'School Uniform - PE Set', 'description' => 'MinSU PE uniform set (shirt and shorts), size Medium. Worn only a few times, still in great condition.', 'category' => 'clothing', 'condition' => 'good', 'campus' => 'bongabong'],
            ['user' => $users[3], 'title' => 'Laptop Stand - Adjustable', 'description' => 'Portable aluminum laptop stand, adjustable height. Perfect for online classes and study sessions.', 'category' => 'equipment', 'condition' => 'excellent', 'campus' => 'victoria'],
            ['user' => $users[0], 'title' => 'Drawing Set - Architecture Kit', 'description' => 'Complete architecture drawing set with T-square, triangles, compass, and mechanical pencils. Used for one semester only.', 'category' => 'supplies', 'condition' => 'good', 'campus' => 'main'],
            ['user' => $users[4], 'title' => 'Study Desk Lamp - LED', 'description' => 'LED desk lamp with 3 brightness levels and USB charging port. Energy efficient and eye-friendly.', 'category' => 'furniture', 'condition' => 'like-new', 'campus' => 'pinamalayan'],
            ['user' => $users[5], 'title' => 'Basketball - Molten GG7X', 'description' => 'Molten GG7X basketball, official size 7. Used for a few games but still in great shape.', 'category' => 'sports', 'condition' => 'good', 'campus' => 'main'],
            ['user' => $users[6], 'title' => 'General Chemistry Textbook', 'description' => 'Chang & Goldsby General Chemistry, 13th Edition. Some highlights but all pages intact.', 'category' => 'books', 'condition' => 'fair', 'campus' => 'bongabong'],
            ['user' => $users[7], 'title' => 'Notebook Bundle - College Ruled', 'description' => 'Bundle of 5 nearly-new college ruled notebooks. 200 pages each, spiral bound.', 'category' => 'supplies', 'condition' => 'like-new', 'campus' => 'main'],
            ['user' => $users[3], 'title' => 'Flash Drive - 64GB USB 3.0', 'description' => 'SanDisk Ultra 64GB USB 3.0 flash drive. Fast transfer speeds, barely used.', 'category' => 'electronics', 'condition' => 'excellent', 'campus' => 'victoria'],
        ];

        $items = [];
        foreach ($itemSeeds as $itemSeed) {
            $user = $itemSeed['user'];
            unset($itemSeed['user']);
            $items[] = Item::create(array_merge($itemSeed, [
                'user_id' => $user->id,
                'status' => 'active',
                'is_verified' => true,
                'meetup_location' => 'Arawatan Corner - ' . ucfirst($itemSeed['campus']) . ' Campus',
                'posted_at' => now()->subDays(rand(1, 30)),
                'views_count' => rand(5, 150),
            ]));
        }

        // Create placeholder images for items
        foreach ($items as $item) {
            ItemImage::create([
                'item_id' => $item->id,
                'image_path' => 'items/placeholder.jpg',
                'is_primary' => true,
                'sort_order' => 0,
            ]);
        }

        // Create some transactions
        $t1 = Transaction::create([
            'item_id' => $items[0]->id,
            'donor_id' => $users[0]->id,
            'receiver_id' => $users[1]->id,
            'status' => 'completed',
            'meetup_location' => 'Arawatan Corner - Main Campus',
            'requested_at' => now()->subDays(15),
            'approved_at' => now()->subDays(14),
            'completed_at' => now()->subDays(12),
        ]);

        $t2 = Transaction::create([
            'item_id' => $items[1]->id,
            'donor_id' => $users[1]->id,
            'receiver_id' => $users[2]->id,
            'status' => 'completed',
            'meetup_location' => 'Arawatan Corner - Main Campus',
            'requested_at' => now()->subDays(10),
            'approved_at' => now()->subDays(9),
            'completed_at' => now()->subDays(7),
        ]);

        $t3 = Transaction::create([
            'item_id' => $items[3]->id,
            'donor_id' => $users[3]->id,
            'receiver_id' => $users[0]->id,
            'status' => 'approved',
            'meetup_location' => 'Arawatan Corner - Victoria Campus',
            'requested_at' => now()->subDays(3),
            'approved_at' => now()->subDays(2),
        ]);

        Transaction::create([
            'item_id' => $items[6]->id,
            'donor_id' => $users[5]->id,
            'receiver_id' => $users[7]->id,
            'status' => 'requested',
            'meetup_location' => 'Arawatan Corner - Main Campus',
            'requested_at' => now()->subDays(1),
        ]);

        // Create conversations & messages
        $conv1 = Conversation::create([
            'item_id' => $items[0]->id,
            'participant_one_id' => $users[0]->id,
            'participant_two_id' => $users[1]->id,
        ]);

        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $users[1]->id,
            'text' => 'Hi! Is the Engineering Dynamics textbook still available?',
        ]);
        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $users[0]->id,
            'text' => 'Yes, it is! When would you like to pick it up?',
        ]);
        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $users[1]->id,
            'text' => 'Can we meet tomorrow at the Arawatan Corner around 2pm?',
        ]);
        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $users[0]->id,
            'text' => 'Sure! See you there 😊',
        ]);

        $conv2 = Conversation::create([
            'item_id' => $items[3]->id,
            'participant_one_id' => $users[3]->id,
            'participant_two_id' => $users[0]->id,
        ]);

        Message::create([
            'conversation_id' => $conv2->id,
            'sender_id' => $users[0]->id,
            'text' => 'Hello! I\'m interested in the laptop stand. Is it still available?',
        ]);
        Message::create([
            'conversation_id' => $conv2->id,
            'sender_id' => $users[3]->id,
            'text' => 'Yes it is! It\'s adjustable and works great. I can bring it to the Arawatan Corner.',
        ]);

        // Create gallery posts
        GalleryPost::create([
            'user_id' => $users[0]->id,
            'transaction_id' => $t1->id,
            'image_path' => 'gallery/placeholder1.jpg',
            'caption' => 'Shared my Engineering Dynamics textbook! Hope it helps a fellow MinSU student! 📚 #ArawatanExchange',
            'visibility' => 'public',
            'likes_count' => 12,
        ]);

        GalleryPost::create([
            'user_id' => $users[1]->id,
            'transaction_id' => $t2->id,
            'image_path' => 'gallery/placeholder2.jpg',
            'caption' => 'Passed on my calculator to someone who needs it for their finals! Good luck! 🧮 #HAPAG',
            'visibility' => 'public',
            'likes_count' => 8,
        ]);

        GalleryPost::create([
            'user_id' => $users[3]->id,
            'image_path' => 'gallery/placeholder3.jpg',
            'caption' => 'The Arawatan community keeps growing! Loving this initiative 💚 #MinSUCares',
            'visibility' => 'public',
            'likes_count' => 25,
        ]);
    }
}
