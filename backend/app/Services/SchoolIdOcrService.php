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
        'mindoro state university',
        'minsu',
        'min. state university',
        'mindoro state univ',
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
     * Resolve the Tesseract executable path.
     *
     * Priority:
     * 1. TESSERACT_PATH env / config value
     * 2. Common OS-specific default paths
     * 3. null (rely on system PATH)
     *
     * Works on both Windows (local dev) and Linux (hosting/server).
     */
    protected function resolveTesseractPath(): ?string
    {
        // 1. Explicit config / env
        $configured = config('services.tesseract.path');
        if (!empty($configured) && file_exists($configured)) {
            return $configured;
        }

        // 2. Auto-detect common locations
        $candidates = PHP_OS_FAMILY === 'Windows'
            ? ['C:\\Program Files\\Tesseract-OCR\\tesseract.exe']
            : ['/usr/bin/tesseract', '/usr/local/bin/tesseract'];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        // 3. Fall back to system PATH
        return null;
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

            // Resolve Tesseract executable path from config, env, or auto-detect
            $tesseractPath = $this->resolveTesseractPath();
            if ($tesseractPath) {
                $ocr->executable($tesseractPath);
            }

            // Configure Tesseract for best ID-card text recognition
            $ocr->lang('eng')          // English language data
                ->psm(3)               // Fully automatic page segmentation (best for ID cards with multiple text zones)
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

    // ── Text normalization ─────────────────────────────────────────

    /**
     * Normalize text by replacing accented/special characters with ASCII equivalents.
     * Handles common OCR substitutions and diacritical marks.
     *
     * @param  string  $text
     * @return string  Normalized ASCII text.
     */
    protected function normalizeText(string $text): string
    {
        $replacements = [
            'ñ' => 'n', 'Ñ' => 'n',
            'á' => 'a', 'Á' => 'a',
            'é' => 'e', 'É' => 'e',
            'í' => 'i', 'Í' => 'i',
            'ó' => 'o', 'Ó' => 'o',
            'ú' => 'u', 'Ú' => 'u',
            'ü' => 'u', 'Ü' => 'u',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $text);
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
        // Normalize both OCR text and user names to strip diacritical marks
        $ocrNorm = mb_strtolower($this->normalizeText($ocrText));
        $firstNorm = mb_strtolower(trim($this->normalizeText($firstName)));
        $lastNorm = mb_strtolower(trim($this->normalizeText($lastName)));

        // Forward check: user's input appears in OCR text
        $firstMatch = $this->exactWordMatch($ocrNorm, $firstNorm);
        $lastMatch  = $this->exactWordMatch($ocrNorm, $lastNorm);

        // Reverse check: extract the full name from the ID and verify the user
        // typed ALL parts of it (not just a partial match).
        // e.g. ID says "MEICAELLA FE J. BUNAG" — user must type "Meicaella Fe", not just "Meicaella"
        if ($firstMatch && $lastMatch) {
            $idFirstName = $this->extractFirstNameFromOcr($ocrNorm, $lastNorm);
            if ($idFirstName !== null) {
                // Remove single-letter middle initials (like "j", "j.") from the ID name
                $idNameWords = preg_split('/\s+/', trim($idFirstName));
                $idNameWords = array_filter($idNameWords, function ($w) {
                    $clean = rtrim($w, '.');
                    return mb_strlen($clean) > 1; // keep only real name parts, skip initials
                });
                $idFirstCleaned = implode(' ', $idNameWords);

                // User's first name (cleaned) must match the ID's first name exactly
                if (!empty($idFirstCleaned) && $idFirstCleaned !== $firstNorm) {
                    $firstMatch = false;
                    Log::info('Reverse name check failed', [
                        'id_first_name' => $idFirstCleaned,
                        'user_first_name' => $firstNorm,
                    ]);
                }
            }
        }

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
     * Extract the first name portion from the OCR text by finding the line
     * that contains the last name and returning everything before it.
     *
     * @param  string  $ocrNorm  Normalized, lowercased OCR text.
     * @param  string  $lastNorm Normalized, lowercased last name.
     * @return string|null  The first name portion, or null if not found.
     */
    protected function extractFirstNameFromOcr(string $ocrNorm, string $lastNorm): ?string
    {
        // Split OCR text into lines and find the line containing the last name
        $lines = preg_split('/[\n\r]+/', $ocrNorm);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Check if this line contains the last name
            $pos = mb_strpos($line, $lastNorm);
            if ($pos !== false) {
                // Everything before the last name on this line is the first+middle name
                $before = trim(mb_substr($line, 0, $pos));
                if (!empty($before)) {
                    return $before;
                }
            }
        }

        return null;
    }

    /**
     * Exact-match a target word against the OCR text (case-insensitive, diacriticals normalized).
     * No fuzzy/percentage matching — the name must appear exactly letter-by-letter.
     *
     * @param  string  $ocrTextLower  Lowercased, normalized OCR text.
     * @param  string  $targetWord    The word to search for.
     * @return bool
     */
    protected function exactWordMatch(string $ocrTextLower, string $targetWord): bool
    {
        $target = mb_strtolower(trim($targetWord));

        if (empty($target)) {
            return false;
        }

        // Exact substring match (letter-by-letter)
        if (str_contains($ocrTextLower, $target)) {
            return true;
        }

        // For multi-word targets (e.g. "Meicaella Fe"), check if ALL individual
        // words appear somewhere in the OCR text
        $targetWords = preg_split('/\s+/', $target);
        if (count($targetWords) > 1) {
            $allWordsFound = true;
            foreach ($targetWords as $word) {
                if (empty($word)) continue;
                if (!$this->exactWordMatch($ocrTextLower, $word)) {
                    $allWordsFound = false;
                    break;
                }
            }
            if ($allWordsFound) {
                return true;
            }
        }

        // Also check word-by-word exact match from OCR tokens
        // (handles cases where OCR splits/joins words differently)
        $ocrWords = preg_split('/[\s,.\-\/]+/', $ocrTextLower);
        foreach ($ocrWords as $ocrWord) {
            if (empty($ocrWord)) continue;
            if ($target === $ocrWord) {
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

        // Check if individual key words appear separately in the OCR text
        // (handles multiline OCR output where "MINDORO STATE UNIVERSITY" is split)
        $ocrWords = preg_split('/[\s,.\-\/\n\r]+/', $ocrLower);
        $hasMinoro  = in_array('mindoro', $ocrWords) || in_array('mindor0', $ocrWords) || in_array('mindord', $ocrWords);
        $hasState   = in_array('state', $ocrWords) || in_array('stale', $ocrWords) || in_array('stat', $ocrWords);
        $hasUniv    = false;
        foreach ($ocrWords as $w) {
            if (str_starts_with($w, 'univ') && strlen($w) >= 5) {
                $hasUniv = true;
                break;
            }
        }
        if ($hasMinoro && $hasState && $hasUniv) {
            return 'mindoro state university (word match)';
        }

        // Fuzzy check for OCR misreads of "mindoro state university"
        // e.g. "Mindanac State Universily"
        $ocrJoined = implode(' ', $ocrWords);

        foreach (['mindoro state university'] as $phrase) {
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
                'match'            => $distance <= 22, // Lenient for full ID vs logo crop
            ]);

            // Full ID vs logo will have higher distance; use lenient threshold
            return $distance <= 22;
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
