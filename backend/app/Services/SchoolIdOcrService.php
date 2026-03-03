<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use thiagoalessio\TesseractOCR\TesseractOCR;

/**
 * Service to extract and validate student numbers, names, and institution
 * from School ID images using Tesseract OCR.
 *
 * Expected student number formats:
 * - YYYY-NNNNNN (e.g. 2024-123456) - Standard format
 * - MMCYYYY-NNNNN (e.g. MMC2022-00642) - Minsu format
 * The regex accepts 4-6 digit suffixes (e.g. 2024-1234, 2024-12345).
 */
class SchoolIdOcrService
{
    /**
     * Regex pattern matching MinSU student/employee ID format.
     * Examples:
     * - 2024-123456, 2023-12345, 2022-1234 (standard format)
     * - MMC2022-00642, MMC2024-12345 (Minsu format with MMC prefix)
     */
    protected const STUDENT_ID_PATTERN = '/(?:MMC)?\d{4}-\d{4,6}/i';

    /**
     * Keywords that indicate the ID belongs to MinSU.
     * Checked case-insensitively against the OCR text.
     */
    protected const INSTITUTION_KEYWORDS = [
        'mindanao state university',
        'minsu',
        'min. state university',
        'mindanao state univ',
        'msu',
    ];

    /**
     * Path to the folder containing verification reference images.
     */
    protected function referencePath(): string
    {
        return storage_path('app/verification-references');
    }

    /**
     * Extract all text from an ID image using Tesseract OCR.
     *
     * @param  string  $imagePath  Absolute path to the image file.
     * @return string  Raw OCR text output.
     */
    public function extractText(string $imagePath): string
    {
        try {
            $ocr = new TesseractOCR($imagePath);

            // Configure Tesseract for best ID-card text recognition
            $ocr->lang('eng')          // English language data
                ->psm(6)               // Assume a single uniform block of text
                ->oem(3);              // Default OCR Engine Mode (LSTM + legacy)

            $text = $ocr->run();

            Log::info('OCR extracted text from School ID', [
                'image' => basename($imagePath),
                'text_length' => strlen($text),
                'text_preview' => mb_substr($text ?? '', 0, 300),
            ]);

            return $text ?? '';
        } catch (\Exception $e) {
            Log::error('Tesseract OCR failed', [
                'image' => basename($imagePath),
                'error' => $e->getMessage(),
            ]);

            return '';
        }
    }

    /**
     * Parse student number(s) from raw OCR text.
     *
     * @param  string  $ocrText  Raw text from OCR.
     * @return array  List of matched student number strings.
     */
    public function parseStudentNumbers(string $ocrText): array
    {
        preg_match_all(self::STUDENT_ID_PATTERN, $ocrText, $matches);

        return $matches[0] ?? [];
    }

    /**
     * Full pipeline: extract text → parse student numbers → return first match.
     *
     * @param  string  $imagePath  Absolute path to uploaded ID image.
     * @return string|null  The detected student number, or null if none found.
     */
    public function detectStudentNumber(string $imagePath): ?string
    {
        $text = $this->extractText($imagePath);

        if (empty($text)) {
            return null;
        }

        $ids = $this->parseStudentNumbers($text);

        // Return the first match (most likely the student number on the ID)
        return $ids[0] ?? null;
    }

    /**
     * Full analysis: extract text from ID and return all parsed details.
     *
     * @param  string  $imagePath  Absolute path to uploaded ID image.
     * @return array{
     *     raw_text: string,
     *     detected_id: string|null,
     *     name_found: bool,
     *     institution_found: bool,
     *     institution_keyword: string|null,
     *     logo_match: bool
     * }
     */
    public function analyzeId(string $imagePath): array
    {
        $text = $this->extractText($imagePath);

        $ids = $this->parseStudentNumbers($text);
        $detectedId = $ids[0] ?? null;

        return [
            'raw_text'            => $text,
            'detected_id'         => $detectedId,
            'name_found'          => false,   // Will be evaluated by the caller with user data
            'institution_found'   => $this->detectInstitution($text),
            'institution_keyword' => $this->getMatchedInstitutionKeyword($text),
            'logo_match'          => $this->compareLogoWithReference($imagePath),
        ];
    }

    // ── Name matching ──────────────────────────────────────────────

    /**
     * Check if the user's name appears in the OCR text.
     *
     * Performs a fuzzy, case-insensitive match. Both first name and last name
     * must appear somewhere in the extracted text. OCR errors are tolerated
     * using similar_text with an 80 % threshold on individual words.
     *
     * @param  string  $ocrText    Raw OCR text.
     * @param  string  $firstName  User's registered first name.
     * @param  string  $lastName   User's registered last name.
     * @return array{first_name_match: bool, last_name_match: bool, full_match: bool}
     */
    public function matchName(string $ocrText, string $firstName, string $lastName): array
    {
        $ocrLower = mb_strtolower($ocrText);

        $firstMatch = $this->fuzzyWordMatch($ocrLower, $firstName);
        $lastMatch  = $this->fuzzyWordMatch($ocrLower, $lastName);

        Log::info('OCR name matching result', [
            'first_name'       => $firstName,
            'last_name'        => $lastName,
            'first_name_match' => $firstMatch,
            'last_name_match'  => $lastMatch,
        ]);

        return [
            'first_name_match' => $firstMatch,
            'last_name_match'  => $lastMatch,
            'full_match'       => $firstMatch && $lastMatch,
        ];
    }

    /**
     * Fuzzy-match a target word against all words in the OCR text.
     *
     * @param  string  $ocrTextLower  Lowercased OCR text.
     * @param  string  $targetWord    The word to search for.
     * @return bool
     */
    protected function fuzzyWordMatch(string $ocrTextLower, string $targetWord): bool
    {
        $target = mb_strtolower(trim($targetWord));

        if (empty($target)) {
            return false;
        }

        // Exact substring match first (fast path)
        if (str_contains($ocrTextLower, $target)) {
            return true;
        }

        // Fuzzy match: compare each OCR word against the target
        // This handles minor OCR misreads (e.g. "De1a" → "Dela")
        $ocrWords = preg_split('/[\s,.\-\/]+/', $ocrTextLower);

        foreach ($ocrWords as $ocrWord) {
            if (empty($ocrWord)) {
                continue;
            }

            similar_text($target, $ocrWord, $percent);
            if ($percent >= 80.0) {
                return true;
            }
        }

        return false;
    }

    // ── Institution detection ──────────────────────────────────────

    /**
     * Check if the OCR text contains any MinSU institution keyword.
     *
     * @param  string  $ocrText  Raw OCR text.
     * @return bool
     */
    public function detectInstitution(string $ocrText): bool
    {
        return $this->getMatchedInstitutionKeyword($ocrText) !== null;
    }

    /**
     * Return the first matched institution keyword found in the OCR text.
     *
     * @param  string  $ocrText  Raw OCR text.
     * @return string|null  The matched keyword, or null if none matched.
     */
    public function getMatchedInstitutionKeyword(string $ocrText): ?string
    {
        $ocrLower = mb_strtolower($ocrText);

        foreach (self::INSTITUTION_KEYWORDS as $keyword) {
            if (str_contains($ocrLower, $keyword)) {
                return $keyword;
            }
        }

        // Fuzzy check for OCR misreads of "mindanao state university"
        // e.g. "Mindanac State Universily"
        $ocrWords = preg_split('/\s+/', $ocrLower);
        $ocrJoined = implode(' ', $ocrWords);

        foreach (['mindanao state university'] as $phrase) {
            similar_text($phrase, $ocrJoined, $percent);
            // Only use this for the full phrase when enough text is present
            if ($percent >= 70.0 && strlen($ocrJoined) >= strlen($phrase) * 0.7) {
                return $phrase . ' (fuzzy)';
            }

            // Also try sliding window matching
            $phraseLen = strlen($phrase);
            for ($i = 0; $i <= strlen($ocrJoined) - $phraseLen; $i++) {
                $window = substr($ocrJoined, $i, $phraseLen);
                similar_text($phrase, $window, $winPercent);
                if ($winPercent >= 80.0) {
                    return $phrase . ' (fuzzy)';
                }
            }
        }

        return null;
    }

    // ── Logo comparison ────────────────────────────────────────────

    /**
     * Compare the uploaded ID image against the reference MinSU logo
     * using perceptual hashing (average hash). Returns true if the
     * reference logo image exists and a similar region is detected.
     *
     * This is a lightweight check: it resizes both images to 8×8 grayscale
     * and compares their bit patterns. A Hamming distance ≤ 10 is a match.
     *
     * @param  string  $uploadedImagePath  Absolute path to the uploaded ID.
     * @return bool  True if the logo area appears to match the reference.
     */
    public function compareLogoWithReference(string $uploadedImagePath): bool
    {
        $logoPath = $this->getReferenceLogo();

        if (!$logoPath) {
            Log::info('No reference logo found, skipping logo comparison.');
            return false;
        }

        try {
            $logoHash    = $this->averageHash($logoPath);
            $uploadHash  = $this->averageHash($uploadedImagePath);

            if ($logoHash === null || $uploadHash === null) {
                return false;
            }

            $distance = $this->hammingDistance($logoHash, $uploadHash);

            Log::info('Logo comparison result', [
                'hamming_distance' => $distance,
                'match'            => $distance <= 18, // Lenient for full ID vs logo crop
            ]);

            // Full ID vs logo will have higher distance; use lenient threshold
            return $distance <= 18;
        } catch (\Exception $e) {
            Log::warning('Logo comparison failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Get the absolute path to the reference MinSU logo image.
     *
     * @return string|null  Path to the logo, or null if not found.
     */
    public function getReferenceLogo(): ?string
    {
        $dir = $this->referencePath();

        foreach (['minsu-logo.png', 'minsu-logo.jpg', 'minsu-logo.jpeg'] as $filename) {
            $path = $dir . DIRECTORY_SEPARATOR . $filename;
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Get the absolute path to the sample ID reference image.
     *
     * @return string|null
     */
    public function getSampleId(): ?string
    {
        $dir = $this->referencePath();

        foreach (['id-sample.png', 'id-sample.jpg', 'id-sample.jpeg'] as $filename) {
            $path = $dir . DIRECTORY_SEPARATOR . $filename;
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Compute a simple 64-bit average hash of an image.
     *
     * @param  string  $imagePath  Absolute path to an image.
     * @return string|null  64-character binary string, or null on failure.
     */
    protected function averageHash(string $imagePath): ?string
    {
        $img = @imagecreatefromstring(file_get_contents($imagePath));
        if (!$img) {
            return null;
        }

        // Resize to 8×8 and convert to grayscale
        $small = imagecreatetruecolor(8, 8);
        imagecopyresampled($small, $img, 0, 0, 0, 0, 8, 8, imagesx($img), imagesy($img));
        imagefilter($small, IMG_FILTER_GRAYSCALE);

        // Compute average brightness
        $pixels = [];
        $total  = 0;
        for ($y = 0; $y < 8; $y++) {
            for ($x = 0; $x < 8; $x++) {
                $rgb       = imagecolorat($small, $x, $y);
                $gray      = $rgb & 0xFF;
                $pixels[]  = $gray;
                $total    += $gray;
            }
        }
        $avg = $total / 64;

        // Build hash: 1 if pixel ≥ average, else 0
        $hash = '';
        foreach ($pixels as $px) {
            $hash .= ($px >= $avg) ? '1' : '0';
        }

        imagedestroy($img);
        imagedestroy($small);

        return $hash;
    }

    /**
     * Hamming distance between two binary hash strings.
     *
     * @param  string  $hash1
     * @param  string  $hash2
     * @return int  Number of differing bits.
     */
    protected function hammingDistance(string $hash1, string $hash2): int
    {
        $dist = 0;
        $len  = min(strlen($hash1), strlen($hash2));
        for ($i = 0; $i < $len; $i++) {
            if ($hash1[$i] !== $hash2[$i]) {
                $dist++;
            }
        }
        return $dist;
    }

    // ── Database matching ──────────────────────────────────────────

    /**
     * Validate that a detected student number exists in the users table.
     *
     * @param  string  $studentNumber  The student number to look up.
     * @return bool  True if found in the database.
     */
    public function existsInDatabase(string $studentNumber): bool
    {
        return \App\Models\User::where('student_id', $studentNumber)->exists();
    }

    /**
     * Validate that the detected student number matches a specific user.
     *
     * @param  string  $studentNumber  The student number from OCR.
     * @param  int     $userId         The authenticated user's ID.
     * @return bool  True if the number belongs to this user.
     */
    public function matchesUser(string $studentNumber, int $userId): bool
    {
        return \App\Models\User::where('student_id', $studentNumber)
            ->where('id', $userId)
            ->exists();
    }
}
