# MinSU ID Verification Reference Images

This folder contains reference images used by the ID verification system to validate
uploaded MinSU IDs during user registration.

## Required Files

Place the following files in this folder:

### 1. `minsu-logo.png`
- The official MinSU (Mindanao State University) logo image
- Used to verify that the uploaded ID belongs to the MinSU institution
- The system compares this logo against the uploaded ID using image matching
- **Format:** PNG (preferred) or JPG
- **Recommended size:** 200×200 px or larger, clear and high-resolution

### 2. `id-sample.png`
- A sample/template of a valid MinSU ID card
- Used as a visual reference for understanding the expected layout
- Helps the system know where to look for key fields (name, student number, logo)
- **Format:** PNG (preferred) or JPG
- **Note:** Redact or anonymize any real personal information on the sample

## How Verification Works

When a user uploads their MinSU ID during registration, the system:

1. **Extracts text** from the ID using Tesseract OCR
2. **Checks the name** — the first name and last name on the ID must match what the user entered in the registration form
3. **Checks the student/employee ID number** — the ID number on the card must match the one entered during registration
4. **Checks the institution** — the system looks for MinSU-related keywords (e.g., "Mindanao State University", "MinSU") and optionally compares the logo on the ID with the reference logo
5. **Scores confidence** — each matching check contributes to an overall confidence score; if the score meets the threshold (70%), the user is auto-approved

## Notes

- Keep the reference images up to date if the university changes its branding or ID format
- The logo matching uses image hashing (perceptual hash) for fuzzy comparison
- All reference images are stored locally and never exposed publicly
