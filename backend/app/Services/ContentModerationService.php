<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use thiagoalessio\TesseractOCR\TesseractOCR;

/**
 * AI Content Moderation Service
 *
 * Screens text and images for prohibited content including:
 * drugs, alcohol, weapons, tobacco, vape products, gambling,
 * hazardous materials, and other unsafe or inappropriate items.
 *
 * Uses keyword matching with context awareness + OCR-based image text detection.
 */
class ContentModerationService
{
    /**
     * Prohibited content categories with associated keywords.
     * Each category has a severity level (critical/high/medium) and keyword list.
     */
    protected const PROHIBITED_CATEGORIES = [
        'drugs' => [
            'severity' => 'critical',
            'keywords' => [
                'marijuana', 'cannabis', 'weed', 'shabu', 'methamphetamine',
                'cocaine', 'heroin', 'ecstasy', 'mdma', 'lsd', 'acid trip',
                'mushroom trip', 'magic mushroom', 'psilocybin', 'opium',
                'fentanyl', 'ketamine', 'meth', 'crack', 'dope',
                'narcotics', 'illegal drugs', 'controlled substance',
                'drug paraphernalia', 'rolling paper', 'bong', 'pipe for smoking',
                'grinder weed', 'edibles thc', 'thc', 'cbd oil',
                'prescription drugs', 'xanax', 'adderall', 'oxycodone',
                'percocet', 'codeine', 'tramadol', 'morphine',
                'droga', 'damo', 'juts', 'pot session',
            ],
        ],
        'alcohol' => [
            'severity' => 'high',
            'keywords' => [
                'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'rum',
                'tequila', 'gin', 'brandy', 'sake', 'soju',
                'alcoholic beverage', 'hard drink', 'spirits',
                'red horse', 'san miguel beer', 'tanduay', 'emperador',
                'GSM blue', 'fundador', 'alak', 'inumin',
                'cocktail mix', 'home brew', 'moonshine',
            ],
        ],
        'weapons' => [
            'severity' => 'critical',
            'keywords' => [
                'gun', 'pistol', 'rifle', 'shotgun', 'firearm', 'ammunition',
                'ammo', 'bullet', 'baril', 'revolver', 'handgun',
                'knife for combat', 'combat knife', 'switchblade', 'butterfly knife',
                'balisong', 'brass knuckle', 'knuckle duster', 'taser',
                'stun gun', 'pepper spray', 'airsoft gun', 'bb gun',
                'crossbow', 'throwing star', 'ninja star', 'nunchaku',
                'machete weapon', 'sword', 'katana', 'dagger',
                'explosive', 'bomb', 'grenade', 'firecracker',
                'baril', 'paltik', 'sumpak', 'panga',
            ],
        ],
        'tobacco_vape' => [
            'severity' => 'high',
            'keywords' => [
                'cigarette', 'tobacco', 'cigar', 'yosi', 'sigarilyo',
                'vape', 'vaping', 'e-cigarette', 'e-cig', 'juul',
                'vape juice', 'e-liquid', 'e-juice', 'pod mod',
                'vape mod', 'coil build', 'atomizer', 'disposable vape',
                'elf bar', 'relx', 'smok', 'puff bar',
                'nicotine', 'nic salt', 'tobacco leaf',
            ],
        ],
        'gambling' => [
            'severity' => 'high',
            'keywords' => [
                'gambling', 'casino chips', 'poker chips', 'slot machine',
                'betting', 'sports bet', 'online gambling', 'sugal',
                'pustahan', 'talpakan', 'sabong', 'cockfight',
                'jueteng', 'illegal gambling', 'dice gambling',
            ],
        ],
        'hazardous' => [
            'severity' => 'critical',
            'keywords' => [
                'poison', 'toxic chemical', 'explosive material', 'acid chemical',
                'radioactive', 'biohazard', 'hazardous material', 'dangerous chemical',
                'flammable liquid', 'corrosive', 'pesticide',
                'cyanide', 'arsenic', 'mercury liquid',
            ],
        ],
        'inappropriate' => [
            'severity' => 'high',
            'keywords' => [
                'pornography', 'adult content', 'sex toy', 'sexual',
                'nude', 'naked', 'explicit content', 'nsfw',
                'escort service', 'prostitution',
                'counterfeit', 'fake id', 'fake diploma', 'fake certificate',
                'stolen goods', 'stolen item', 'nakaw',
                'exam answers', 'test answers', 'cheat sheet for exam',
                'academic fraud', 'thesis for sale', 'assignment for sale',
            ],
        ],
        'unsafe_services' => [
            'severity' => 'medium',
            'keywords' => [
                'hacking service', 'hack account', 'phishing',
                'malware', 'virus', 'trojan', 'ransomware',
                'social media hack', 'facebook hack', 'wifi hack',
                'password crack', 'spy app', 'stalker app',
                'pyramid scheme', 'ponzi scheme', 'networking scam',
                'money doubling', 'investment scam',
            ],
        ],
    ];

    /**
     * Words that, when appearing with certain keywords, indicate safe context.
     * Prevents false positives (e.g., "wine red notebook" should not be flagged).
     */
    protected const SAFE_CONTEXT_PATTERNS = [
        'beer' => ['root beer', 'ginger beer', 'beer pong table'],
        'wine' => ['wine red', 'wine color', 'wine colored', 'wine stain'],
        'gun' => ['gun metal', 'gunmetal', 'glue gun', 'heat gun', 'nail gun', 'top gun', 'gun gray', 'nerf gun'],
        'shot' => ['screenshot', 'shot glass display', 'moon shot'],
        'pipe' => ['pipe wrench', 'pipe cutter', 'water pipe', 'pipe fitting', 'pvc pipe'],
        'acid' => ['acid wash', 'acid washed', 'acid wash jeans', 'amino acid', 'folic acid'],
        'joint' => ['joint compound', 'joint paper', 'ball joint', 'universal joint'],
        'blunt' => ['blunt scissors', 'blunt tip', 'blunt needle'],
        'crack' => ['cracked screen', 'crack repair', 'anti-crack'],
        'pot' => ['flower pot', 'cooking pot', 'pot holder', 'potter', 'instant pot', 'crock pot', 'clay pot'],
        'rolling paper' => ['rolling paper craft'],
        'high' => ['high quality', 'high performance', 'high grade', 'high top', 'highlight'],
        'coke' => ['coke zero', 'diet coke', 'coca cola'],
        'bong' => ['bongabong'],
        'damo' => ['damo campus'],
        'crystal' => ['crystal clear', 'crystal case', 'crystal ball'],
        'smoke' => ['smoke detector', 'smoke alarm', 'smoke gray', 'anti-smoke'],
        'weed' => ['weed cutter', 'weed trimmer', 'weed eater', 'weed remover'],
        'mushroom' => ['mushroom recipe', 'mushroom book', 'mushroom growing kit'],
        'stun' => ['stunning', 'stun gun toy'],
        'sword' => ['sword art online', 'sword art', 'replica sword', 'toy sword', 'cosplay sword'],
        'knife' => ['kitchen knife', 'butter knife', 'palette knife', 'utility knife', 'pen knife', 'pocket knife'],
    ];

    /**
     * Screen text content for prohibited material.
     *
     * @param  string  $text  The text to check (title, description, caption, comment).
     * @return array{
     *     flagged: bool,
     *     categories: array,
     *     matched_keywords: array,
     *     severity: string|null,
     *     confidence: float,
     *     reason: string|null
     * }
     */
    public function screenText(string $text): array
    {
        $textLower = mb_strtolower(trim($text));
        $flaggedCategories = [];
        $matchedKeywords = [];
        $highestSeverity = null;
        $severityOrder = ['critical' => 3, 'high' => 2, 'medium' => 1];

        foreach (self::PROHIBITED_CATEGORIES as $category => $config) {
            foreach ($config['keywords'] as $keyword) {
                $keywordLower = mb_strtolower($keyword);

                // Check if keyword appears in text
                if (mb_strpos($textLower, $keywordLower) === false) {
                    continue;
                }

                // Check for safe context (false positive prevention)
                if ($this->isSafeContext($textLower, $keywordLower)) {
                    continue;
                }

                $flaggedCategories[$category] = $config['severity'];
                $matchedKeywords[] = [
                    'keyword' => $keyword,
                    'category' => $category,
                    'severity' => $config['severity'],
                ];

                if (
                    $highestSeverity === null
                    || $severityOrder[$config['severity']] > $severityOrder[$highestSeverity]
                ) {
                    $highestSeverity = $config['severity'];
                }
            }
        }

        $flagged = !empty($matchedKeywords);
        $confidence = $this->calculateConfidence($matchedKeywords, $text);

        $reason = $flagged
            ? $this->buildReason($matchedKeywords)
            : null;

        Log::info('Content moderation text screening', [
            'text_preview' => mb_substr($text, 0, 100),
            'flagged' => $flagged,
            'categories' => array_keys($flaggedCategories),
            'severity' => $highestSeverity,
            'confidence' => $confidence,
        ]);

        return [
            'flagged' => $flagged,
            'categories' => $flaggedCategories,
            'matched_keywords' => $matchedKeywords,
            'severity' => $highestSeverity,
            'confidence' => $confidence,
            'reason' => $reason,
        ];
    }

    /**
     * Screen an image for prohibited content using OCR text extraction.
     * Extracts any visible text from the image and runs it through text screening.
     *
     * @param  string  $imagePath  Absolute path to the image file.
     * @return array{
     *     flagged: bool,
     *     categories: array,
     *     matched_keywords: array,
     *     severity: string|null,
     *     confidence: float,
     *     reason: string|null,
     *     ocr_text: string
     * }
     */
    public function screenImage(string $imagePath): array
    {
        $ocrText = $this->extractTextFromImage($imagePath);

        if (empty(trim($ocrText))) {
            return [
                'flagged' => false,
                'categories' => [],
                'matched_keywords' => [],
                'severity' => null,
                'confidence' => 0,
                'reason' => null,
                'ocr_text' => '',
            ];
        }

        $result = $this->screenText($ocrText);
        $result['ocr_text'] = $ocrText;

        Log::info('Content moderation image screening', [
            'image' => basename($imagePath),
            'ocr_text_length' => strlen($ocrText),
            'flagged' => $result['flagged'],
        ]);

        return $result;
    }

    /**
     * Full screening pipeline: check text fields + all images.
     * Returns combined results with overall pass/fail.
     *
     * @param  array   $textFields   Associative array of field => text to screen.
     * @param  array   $imagePaths   Array of absolute image file paths.
     * @return array{
     *     approved: bool,
     *     text_results: array,
     *     image_results: array,
     *     overall_severity: string|null,
     *     overall_confidence: float,
     *     reasons: array,
     *     flagged_categories: array
     * }
     */
    public function screenContent(array $textFields, array $imagePaths = []): array
    {
        $textResults = [];
        $imageResults = [];
        $allReasons = [];
        $allCategories = [];
        $highestSeverity = null;
        $maxConfidence = 0;
        $severityOrder = ['critical' => 3, 'high' => 2, 'medium' => 1];

        // Screen all text fields
        foreach ($textFields as $fieldName => $text) {
            if (empty(trim($text))) continue;

            $result = $this->screenText($text);
            $textResults[$fieldName] = $result;

            if ($result['flagged']) {
                $allReasons[] = ucfirst($fieldName) . ': ' . $result['reason'];
                $allCategories = array_merge($allCategories, array_keys($result['categories']));
                $maxConfidence = max($maxConfidence, $result['confidence']);

                if (
                    $highestSeverity === null
                    || $severityOrder[$result['severity']] > ($severityOrder[$highestSeverity] ?? 0)
                ) {
                    $highestSeverity = $result['severity'];
                }
            }
        }

        // Screen all images
        foreach ($imagePaths as $index => $imagePath) {
            if (!file_exists($imagePath)) continue;

            $result = $this->screenImage($imagePath);
            $imageResults["image_{$index}"] = $result;

            if ($result['flagged']) {
                $allReasons[] = "Image " . ($index + 1) . ': ' . $result['reason'];
                $allCategories = array_merge($allCategories, array_keys($result['categories']));
                $maxConfidence = max($maxConfidence, $result['confidence']);

                if (
                    $highestSeverity === null
                    || $severityOrder[$result['severity']] > ($severityOrder[$highestSeverity] ?? 0)
                ) {
                    $highestSeverity = $result['severity'];
                }
            }
        }

        $approved = empty($allReasons);
        $allCategories = array_unique($allCategories);

        Log::info('Content moderation full screening', [
            'approved' => $approved,
            'severity' => $highestSeverity,
            'confidence' => $maxConfidence,
            'categories' => $allCategories,
        ]);

        return [
            'approved' => $approved,
            'text_results' => $textResults,
            'image_results' => $imageResults,
            'overall_severity' => $highestSeverity,
            'overall_confidence' => $maxConfidence,
            'reasons' => $allReasons,
            'flagged_categories' => $allCategories,
        ];
    }

    // ── Private helpers ────────────────────────────────────────────

    /**
     * Check if a keyword match is in a safe context (false positive).
     */
    protected function isSafeContext(string $textLower, string $keywordLower): bool
    {
        // Check the first word of multi-word keywords
        $baseWord = explode(' ', $keywordLower)[0];

        $safePatterns = self::SAFE_CONTEXT_PATTERNS[$baseWord]
            ?? self::SAFE_CONTEXT_PATTERNS[$keywordLower]
            ?? [];

        foreach ($safePatterns as $safePhrase) {
            if (mb_strpos($textLower, mb_strtolower($safePhrase)) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate confidence score based on number/quality of matches.
     */
    protected function calculateConfidence(array $matchedKeywords, string $text): float
    {
        if (empty($matchedKeywords)) return 0.0;

        $baseConfidence = 0.5;
        $matchCount = count($matchedKeywords);
        $matchBonus = min(0.3, $matchCount * 0.1); // Up to 30% bonus for multiple matches

        // Severity bonus
        $sevBonus = 0;
        foreach ($matchedKeywords as $match) {
            if ($match['severity'] === 'critical') $sevBonus = max($sevBonus, 0.15);
            elseif ($match['severity'] === 'high') $sevBonus = max($sevBonus, 0.10);
            else $sevBonus = max($sevBonus, 0.05);
        }

        // Text length penalty: very short text with match is more suspicious
        $textLength = mb_strlen($text);
        $lengthBonus = $textLength < 50 ? 0.05 : 0;

        return min(1.0, round($baseConfidence + $matchBonus + $sevBonus + $lengthBonus, 2));
    }

    /**
     * Build a human-readable reason string.
     */
    protected function buildReason(array $matchedKeywords): string
    {
        $categories = [];
        foreach ($matchedKeywords as $match) {
            $categories[$match['category']][] = $match['keyword'];
        }

        $parts = [];
        $labelMap = [
            'drugs' => 'Drugs/Narcotics',
            'alcohol' => 'Alcohol',
            'weapons' => 'Weapons',
            'tobacco_vape' => 'Tobacco/Vape',
            'gambling' => 'Gambling',
            'hazardous' => 'Hazardous Materials',
            'inappropriate' => 'Inappropriate Content',
            'unsafe_services' => 'Unsafe Services',
        ];

        foreach ($categories as $cat => $keywords) {
            $label = $labelMap[$cat] ?? $cat;
            $uniqueKeywords = array_unique($keywords);
            $keywordList = implode(', ', array_slice($uniqueKeywords, 0, 3));
            $parts[] = "{$label} ({$keywordList})";
        }

        return 'Prohibited content detected: ' . implode('; ', $parts);
    }

    /**
     * Extract text from an image using Tesseract OCR.
     */
    protected function extractTextFromImage(string $imagePath): string
    {
        try {
            $ocr = new TesseractOCR($imagePath);

            $tesseractPath = $this->resolveTesseractPath();
            if ($tesseractPath) {
                $ocr->executable($tesseractPath);
            }

            $ocr->lang('eng')
                ->psm(3)
                ->oem(3);

            $text = $ocr->run();

            return $text ?? '';
        } catch (\Exception $e) {
            Log::warning('Content moderation OCR failed', [
                'image' => basename($imagePath),
                'error' => $e->getMessage(),
            ]);

            return '';
        }
    }

    /**
     * Resolve Tesseract executable path.
     */
    protected function resolveTesseractPath(): ?string
    {
        $configured = config('services.tesseract.path');
        if (!empty($configured) && file_exists($configured)) {
            return $configured;
        }

        $candidates = PHP_OS_FAMILY === 'Windows'
            ? ['C:\\Program Files\\Tesseract-OCR\\tesseract.exe']
            : ['/usr/bin/tesseract', '/usr/local/bin/tesseract'];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }
}
