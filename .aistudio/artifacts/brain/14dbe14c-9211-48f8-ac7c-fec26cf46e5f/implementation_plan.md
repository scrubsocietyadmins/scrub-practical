# Scrub Practical — Medical Practical Examination Platform

A lightweight, offline-first medical practical examination system built for medical students, clinical tutors, and examiners. Scrub Practical provides end-to-end authoring and administration of practical exams (OSPE/OSCE stations, Spotters, Image MCQs, Clinical Vignettes), seamless ZIP package portability with zero server dependencies, and an authentic timed exam station experience.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices have been aligned and confirmed:

- **Preloaded Starter Packages**: Ships with high-yield medical starter exams (Anatomy Gross & Neuroanatomy Spotters, Histopathology & Diagnostic Pathology Stations) loaded on first boot into IndexedDB, enabling immediate testing and export.
- **Spotter Interaction Mechanics**: Spotter stations support both typed identification (with normalized keyword/synonym fuzzy matching) and multiple-choice selector modes, configurable per question.
- **OSPE / OSCE Timing Engine**: Supports dual timing modes:
  1. *Total Exam Countdown*: Overall duration with self-paced question navigation.
  2. *Station Bell-Ring Timer*: Traditional medical OSPE bell timer (e.g. 60s, 90s, 120s per station) with synthesized chime alerts and optional automatic station advancement.
- **Strict Offline & Zero-API Mandate**: No external backends, no AI/Gemini calls, no Firebase/Supabase. Everything runs hermetically in the browser using Dexie.js (IndexedDB) for persistent blob/record storage and JSZip with Zod validation for ZIP package import/export.

---

## 1. Overview & Core Concept

**Scrub Practical** bridges the gap between static flashcards and complex enterprise testing suites. In medical education, practical exams (Objectively Structured Practical Examinations / OSPE) require students to rotate through timed physical stations featuring gross pathology specimens, histology slides, radiology scans, or anatomical dissections with labeled pins.

- **Admin Studio**: Medical educators create subjects (e.g., Pathology, Anatomy, Forensic Medicine, Radiology), construct multi-question practical exams, pin pointers onto specimen images, set station timers, and export self-contained `.scrub` / `.zip` packages.
- **Student Simulator**: Candidates import exam packages, review exam instructions, and enter a focused examination environment equipped with high-resolution image zoom/pan, pointer overlays, station timers, question flagging, and automated instant grading with clinical rationale.
- **Package Hub**: Fast drag-and-drop import/export engine that validates data integrity with Zod schemas, extracts binary assets, detects existing package collisions, and offers non-destructive versioning.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Color Palette (60-30-10 Rule)**:
  - **60% Clinical Canvas**: Crisp surgical white (`#FFFFFF`) and sterile soft tint (`#F8FAFC`).
  - **30% Structural Surfaces**: Rich medical burgundy brand anchors (`#881337`, `#721C24`, `#9F1239`), hairline neutral borders (`#E2E8F0`), and charcoal slate typography (`#0F172A`, `#334155`).
  - **10% Clinical Accents**: Surgical emerald (`#059669`) for correct answers and confirmation states; deep amber (`#D97706`) for station warning bells and flagged stations; rich crimson (`#DC2626`) for incorrect findings.
- **Typography & Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans` / `Outfit` (SemiBold 600, Bold 700).
  - Clinical Vignettes & Questions: Clean, high-legibility sans-serif with comfortable line height (`1.65`).
  - Telemetry & Timing: Monospace tabular numerals (`font-mono tabular-nums`) for station countdowns and score tallies.
- **Zero-Pill Discipline**:
  - Metadata rendered as quiet inline unboxed typography (`Pathology · Station 04 of 20 · 90s Bell`).
  - Interactive switches rendered as structured segmented button groups.
  - Zero decorative pulsing dots or mechanical code comments (`//`).

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Scrub Practical Shell                            │
│  [ Scrub Practical ] ────── [ Exams ] [ Authoring ] [ Packages ] ── [ Mode ]│
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
        ┌──────────────┴──────────────┐ ┌──────────────┴──────────────┐
        │        Student Mode         │ │         Admin Studio        │
        ├─────────────────────────────┤ ├─────────────────────────────┤
        │ • Browse Available Exams    │ │ • Manage Subjects & Topics  │
        │ • Launch Timed Simulation   │ │ • Create & Edit Exams       │
        │ • Station Zoom & Pointer    │ │ • Question Station Editor   │
        │ • Flag / Review Grid        │ │   - Image MCQ               │
        │ • Bell Ring Alerts (Audio)  │ │   - Spotter with Pin Mark   │
        │ • Results & Explanation Key │ │   - Text MCQ & Vignettes    │
        │ • Retake Weak Stations      │ │ • Export Standalone ZIP     │
        └─────────────────────────────┘ └─────────────────────────────┘
                       │                               │
                       └──────────────┬────────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       │      Offline Package Hub    │
                       │ • Drop .zip package to load │
                       │ • Zod Schema Validation     │
                       │ • Deduplication / Override  │
                       │ • Bulk Export with Images   │
                       └─────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

1. **Storage: Dexie.js (IndexedDB) over localStorage**:
   - *Rationale*: Medical specimens and histology images can range from 200KB to 5MB each. `localStorage` caps out at ~5MB total and blocks the main thread with synchronous string serialization. Dexie.js provides fast, asynchronous IndexedDB queries and stores binary Blobs directly.
2. **ZIP Portability with Embedded Blobs**:
   - *Rationale*: Educators frequently build exams on one machine and distribute them to students via USB or learning management systems. A standard ZIP contains `manifest.json` (schema-validated) and an `images/` directory. No server hosting is needed.
3. **Web Audio API Synthesized Bell**:
   - *Rationale*: Eliminates reliance on external `.mp3` audio files that might fail to load in offline air-gapped clinical environments. We synthesize an authentic brass bell chime using oscillator nodes and exponential gain decay.
4. **Spotter Question Pointer Tool**:
   - *Rationale*: True practical spotters point to specific structures (e.g. "Identify the pinned artery", "Name the cellular inclusion at pointer A"). We support interactive normalized coordinate markers `(x%, y%)` on uploaded images with arrow, target circle, or numbered badge overlays.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Presentation Layer (React 19)                    │
│                                                                             │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │     Admin Studio     │ │   Student Engine     │ │    Package Hub       │ │
│  │ ├ ExamFormModal      │ │ ├ ExamStationViewer  │ │ ├ ZipDropzone        │ │
│  │ ├ QuestionEditor     │ │ ├ StationTimer       │ │ ├ PackageValidator   │ │
│  │ ├ SpotterMarkerTool  │ │ ├ SpecimenZoomPan    │ │ ├ ConflictResolver   │ │
│  │ └ SubjectManager     │ │ └ ResultReportView   │ │ └ ZipExporter        │ │
│  └──────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘ │
└─────────────┼────────────────────────┼────────────────────────┼─────────────┘
              ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Business Logic & State Services                      │
│                                                                             │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │    Exam Validator    │ │    Audio Bell Chime  │ │    Scoring Engine    │ │
│  │  (Zod V3 Schemas)    │ │  (Web Audio Synth)   │ │  (Exact + Fuzzy Key) │ │
│  └──────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘ │
│             │                        │                        │             │
│  ┌──────────▼────────────────────────▼────────────────────────▼───────────┐ │
│  │                        JSZip Package Serialization                     │ │
│  │    manifest.json + metadata + raw ArrayBuffer images in ZIP archive    │ │
│  └───────────────────────────────────┬────────────────────────────────────┘ │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Client Database Layer (Dexie.js)                       │
│                                                                             │
│  IndexedDB Stores:                                                          │
│  • subjects   : id, name, code, description, color, createdAt               │
│  • exams      : id, subjectId, title, code, description, timingMode, ...   │
│  • questions  : id, examId, order, type, text, imageId, spotterPin, ...     │
│  • images     : id, name, mimeType, blob, thumbnailBlob                     │
│  • attempts   : id, examId, timestamp, answers, score, timeSpentSeconds    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Schema (Zod & Dexie Models)

- **`QuestionType`**: `'image_mcq' | 'spotter' | 'text_mcq' | 'clinical_mcq'`
- **`TimingMode`**: `'bell_ring' | 'total_timer' | 'flexible'`
- **`SpotterPin`**: `{ x: number; y: number; label?: string; pointerType: 'arrow' | 'ring' | 'crosshair' }`
- **`Question`**:
  - `id`: string (uuid)
  - `examId`: string
  - `orderIndex`: number
  - `type`: QuestionType
  - `clinicalVignette`?: string (for clinical vignette questions)
  - `questionText`: string
  - `imageId`?: string (foreign key to image store)
  - `spotterPin`?: SpotterPin
  - `options`?: { id: string; text: string; isCorrect: boolean }[] (for MCQs or multi-choice spotter)
  - `acceptableAnswers`?: string[] (for typed spotter identification, case-insensitive / normalized)
  - `explanation`: string
  - `stationDurationSeconds`?: number (per-station override)
  - `points`: number
- **`ExamPackageManifest`**:
  - Version `1.0.0` specification
  - Exam metadata, question lists, and image filename mappings
  - Verified with strict Zod parsing before any database insertion

---

## 5. Verification Plan

1. **Database & Storage Test**: Verify Dexie initialization, schema upgrades, and image blob saving/loading without memory leaks.
2. **Authoring Workflow Test**: Create a Subject, create an Exam, add all 4 question types (Image MCQ, Spotter with placed pin, Text MCQ, Clinical Vignette), and verify instant preview.
3. **Student Engine Test**:
   - Test Total Timer and Station Bell-Ring countdowns with chime audio.
   - Test high-res image zoom/pan and pin visibility.
   - Test question flagging, answer recording, station skipping, and final submission.
   - Test result scoring accuracy (both MCQ options and typed spotter matching) and explanation reviews.
4. **ZIP Package Portability Test**:
   - Export an exam to `.zip`.
   - Clear test exam or launch in incognito, import the `.zip`.
   - Verify all questions, options, explanations, and specimen images are 100% restored with identical IDs and zero corruption.
   - Verify conflict detection when re-importing an existing exam.
5. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to ensure zero TypeScript errors or styling defects.
