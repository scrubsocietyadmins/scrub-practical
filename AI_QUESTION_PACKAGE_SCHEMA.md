# AI Clinical Question Package Authoring & Schema Guidelines
**Application:** Scrub Practical OSPE / Spotter Platform  
**Package Format Version:** `1.0.0`

---

## 1. Core Principles for AI Question Generation

When generating medical and surgical OSPE / Spotter packages for Scrub Practical:

1. **Never Hallucinate or Invent Ghost Images**:
   - If an image file is not physically packed in the `images/` directory of the ZIP archive, you must explicitly flag it with `"status": "missing"` and `"source": "MANUAL_UPLOAD_REQUIRED"`.
   - Never generate dummy or random base64 strings or non-existent file references without declaring them as missing.

2. **Immutable, Unique Image Identifiers**:
   - Every specimen slide, gross surgical specimen, or radiological scan MUST have a persistent, unique identifier (`id`), e.g., `"img-upper-limb-brachial-01"`.
   - Any question referencing this image MUST use the exact same `imageId` in its `imageId` field.

3. **Strict File Naming Conventions**:
   - File names MUST be all lowercase, alphanumeric with hyphens or underscores only: `[a-z0-9_-]+\.(jpg|png|webp|svg)`.
   - **No spaces, no uppercase characters, no special symbols** in file names (e.g. `reed_sternberg_cell_he.jpg`, NOT `Reed Sternberg Cell (1).JPG`).

4. **Image Manifest Declarations (`imageFiles`)**:
   - Every image referenced by any question in the package MUST be declared in the root `imageFiles` array of `manifest.json`.
   - Fields supported:
     ```json
     {
       "id": "img-peptic-ulcer-01",
       "fileName": "gastric_peptic_ulcer_gross.jpg",
       "mimeType": "image/jpeg",
       "required": true,
       "status": "available",
       "altText": "Gross specimen of chronic benign gastric ulcer with punched-out borders",
       "source": "CLINICAL_PATHOLOGY_ATLAS"
     }
     ```

5. **Offline Manual Upload & Missing Image Support**:
   - Images can be intentionally omitted from the ZIP archive (to keep package size light or when waiting for institutional slides).
   - In this case, mark:
     ```json
     {
       "id": "img-thyroid-papillary-02",
       "fileName": "papillary_thyroid_carcinoma_psammoma.png",
       "mimeType": "image/png",
       "required": true,
       "status": "missing",
       "altText": "Histopathology of papillary thyroid carcinoma showing orphan annie eyes",
       "source": "MANUAL_UPLOAD_REQUIRED"
     }
     ```
   - Scrub Practical's **Missing Images Manager** will detect these missing assets automatically and allow the user or educator to upload the specimen slide directly via the UI with zero loss of coordinates.

6. **Exam Lifecycle: Default to `draft` for AI Packages**:
   - All newly generated AI packages MUST set `"status": "draft"`.
   - Visual questions with missing images or unreviewed pointers remain in `draft` mode until a medical educator conducts peer review.
   - An exam CANNOT be transitioned to `"published"` or launched by students until all specimen images are attached and valid.

7. **Strict Multiple Choice Rules**:
   - Single-choice MCQs (`text_mcq`, `clinical_mcq`, `image_mcq`) MUST contain **at least 2 options**, and **EXACTLY ONE option marked as `isCorrect: true`**.
   - Having 0 or >1 correct options in a single-choice question is an invalid schema error that blocks publishing.
   - Option text must never be empty or generic placeholders like "Option 1".

8. **Spotter Question Requirements**:
   - Every `spotter` station MUST include `imageId`.
   - If `spotterAnswerMode` is `"typed"` or `"both"`, `acceptableAnswers` MUST be provided with at least one high-yield clinical synonym (e.g., `["reed sternberg cell", "reed-sternberg cell", "rs cell"]`).
   - If `spotterAnswerMode` is `"multiple_choice"` or `"both"`, `options` MUST contain valid choices with exactly 1 correct answer.
   - `spotterPin` MUST provide normalized coordinates between `0` and `100` (`x: number`, `y: number`) and a pointer shape (`"arrow" | "ring" | "crosshair"`).

9. **Clinical Review Before Publication**:
   - No exam should ever be published to students without pedagogical verification by a qualified physician or clinical tutor.

---

## 2. Manifest Directory Structure

A compliant ZIP package has the following root structure:

```
exam-package.zip
├── manifest.json
└── images/
    ├── img-peptic-ulcer-01.jpg
    └── circle_of_willis.svg
```

*(Missing images are listed in `manifest.json` under `imageFiles` with `"status": "missing"` and do not have to be inside `images/`).*

---

## 3. Allowed Question Types

| Type | Description | Mandatory Fields |
|---|---|---|
| `spotter` | Visual pinned landmark identification | `imageId`, `spotterPin`, `acceptableAnswers` (if typed) |
| `image_mcq` | Diagnostic slide / radiology / histology MCQ | `imageId`, `options` (>=2 choices, exactly 1 correct) |
| `clinical_mcq` | Case vignette + clinical MCQ | `clinicalVignette`, `options` (>=2 choices, exactly 1 correct) |
| `text_mcq` | High-yield conceptual medical question | `options` (>=2 choices, exactly 1 correct) |

---

## 4. Normalization Rules for Typed Spotter Answers

The grading engine deterministically normalizes input:
- Lowercase conversion and accent diacritic stripping.
- Punctuation characters (`-`, `/`, `,`, `.`) replaced with single spaces.
- Indefinite/definite articles (`a`, `an`, `the`) omitted.
- Multi-word anatomical keys verified by token sets to prevent false positives.
