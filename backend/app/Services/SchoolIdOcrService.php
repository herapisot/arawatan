<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use thiagoalessio\TesseractOCR\TesseractOCR;

/**
 * Service to extract and validate student numbers from School ID images
 * using Tesseract OCR.
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
