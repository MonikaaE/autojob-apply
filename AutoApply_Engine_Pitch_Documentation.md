# 🚀 AutoApply Engine — End-to-End Technical & Theoretical Documentation
### Complete System Overview for Pitch Presentation

---

## 📌 Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Design](#5-database-design)
6. [End-to-End Pipeline Walkthrough](#6-end-to-end-pipeline-walkthrough)
7. [Intelligent Scheduling System](#7-intelligent-scheduling-system)
8. [Frontend Application](#8-frontend-application)
9. [AI Engine & Guardrails](#9-ai-engine--guardrails)
10. [API Surface Reference](#10-api-surface-reference)
11. [Security & Safety Design](#11-security--safety-design)
12. [Key Differentiators](#12-key-differentiators)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Problem Statement

Job seekers in competitive markets like **Dubai / UAE** face a brutal, repetitive challenge:

- **Volume Problem**: Hundreds of relevant job postings appear daily across LinkedIn, Indeed, Bayt, Naukrigulf, and more.
- **Time Problem**: A proper application — tailoring the CV, writing a compelling cover letter, filling in forms — takes 20–40 minutes per application.
- **Quality Tradeoff**: Applying in bulk means generic, untailored CVs that get rejected by ATS (Applicant Tracking System) filters before a human ever sees them.
- **Timing Problem**: The best positions fill up within 24–48 hours of posting. Manual job seekers often find postings too late.

> **Result**: Job seekers either apply at low quality in high volume (spray-and-pray), or invest quality time into very few applications — both leading to suboptimal outcomes.

---

## 2. Solution Overview

**AutoApply Engine** is a fully automated, AI-powered job application platform that solves all four problems simultaneously:

| Problem | AutoApply Solution |
|---|---|
| Volume — Too many jobs to track | Real-time LinkedIn scraper fetches only last 48 hours of postings |
| Time — Manual tailoring is slow | Claude AI tailors CV summary & skills per job in seconds |
| Quality — Generic CVs fail ATS | Generates company-specific ATS-optimized PDFs automatically |
| Timing — Postings expire fast | Cron scheduler auto-runs at 5–8 AM Dubai time (peak posting hours) |

The user sets up their **Master CV + Preferences once**, and the engine runs on autopilot every morning, finding, evaluating, tailoring, and submitting applications — all while the user sleeps.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           AutoApply Engine                                   │
│                                                                              │
│   ┌────────────────────────────────────┐                                     │
│   │     FRONTEND (React + Vite)        │  ← User Dashboard, Profile,        │
│   │     Port: 5173                     │    Settings, Live Pipeline View     │
│   └─────────────────┬──────────────────┘                                     │
│                     │  REST API (HTTP)                                        │
│   ┌─────────────────▼──────────────────┐                                     │
│   │     BACKEND (Express + TypeScript) │  ← Business Logic, Orchestration   │
│   │     Port: 5000                     │                                     │
│   │                                    │                                     │
│   │  ┌──────────────┐ ┌─────────────┐  │                                     │
│   │  │  Aggregator  │ │  AI Service │  │  ← Claude 3.5 (Sonnet + Haiku)    │
│   │  │  Service     │ │  (Anthropic)│  │                                     │
│   │  └──────────────┘ └─────────────┘  │                                     │
│   │  ┌──────────────┐ ┌─────────────┐  │                                     │
│   │  │  PDF Service │ │Apply Service│  │  ← PDFKit + Playwright             │
│   │  │  (PDFKit)    │ │ (Playwright)│  │                                     │
│   │  └──────────────┘ └─────────────┘  │                                     │
│   │  ┌──────────────┐ ┌─────────────┐  │                                     │
│   │  │  Pipeline    │ │  Scheduler  │  │  ← Orchestrator + node-cron        │
│   │  │  Service     │ │  Service    │  │                                     │
│   │  └──────────────┘ └─────────────┘  │                                     │
│   └─────────────────┬──────────────────┘                                     │
│                     │                                                         │
│   ┌─────────────────▼──────────────────┐                                     │
│   │     DATABASE (SQLite via sqlite3)  │  ← Users, Jobs, Matches,           │
│   │     autoapply.db                   │    Applications, PDFs               │
│   └────────────────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
  LinkedIn Jobs API                    Claude AI API
  (Public Scraper)                     (Anthropic SDK)
```

### Architectural Pattern
- **Monorepo with 3 packages**: `client/`, `server/`, `shared/` — TypeScript types are defined once in `shared/types.ts` and consumed by both the frontend and backend, eliminating type drift.
- **Service-Oriented Backend**: Each concern (aggregation, AI, PDF, apply, pipeline, scheduling) is its own injectable class-based service.
- **Single Pipeline Orchestrator**: `PipelineService` coordinates all services in a strict, sequential 4-stage flow.
- **Real-time Progress Polling**: The frontend polls `/api/pipeline/progress` every second while a pipeline run is active, giving users a live view of each stage.

---

## 4. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** + **TypeScript** | Latest | Runtime & type safety |
| **Express.js** | ^4.21 | HTTP REST API server |
| **Anthropic SDK** (`@anthropic-ai/sdk`) | ^0.36 | Claude AI integration |
| **Playwright** | ^1.50 | Headless browser automation for form submission |
| **PDFKit** | ^0.16 | Programmatic ATS-ready PDF CV generation |
| **node-cron** | ^3.0 | Dubai-timezone cron scheduling |
| **Luxon** | ^3.5 | Timezone-aware date/time handling (Asia/Dubai GST UTC+4) |
| **SQLite** + `sqlite3` | ^5.1 | Embedded relational database (zero-config, file-based) |
| **Axios** | ^1.18 | LinkedIn Jobs API HTTP scraping |
| **Multer** | ^1.4 | CV file upload handling (PDF + text, 10MB limit) |
| **pdf-parse** | ^1.1 | Extract raw text from uploaded PDF CVs |
| **dotenv** | ^16.4 | Environment variable management (API keys) |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | ^18 | Component-based UI |
| **Vite** | Latest | Ultra-fast dev server & bundler |
| **TypeScript** | ^5.7 | Type safety across the entire UI |
| **Tailwind CSS** | Utility classes | Dark-mode, responsive design |

### Shared
| Technology | Purpose |
|---|---|
| **`shared/types.ts`** | Single source of truth for all TypeScript interfaces used by both client and server |

---

## 5. Database Design

The system uses **SQLite** — a serverless, embedded relational database that requires zero infrastructure setup. The database file (`autoapply.db`) is created automatically on first startup.

### Entity Relationship Diagram

```
users (1) ─────────────────── (1) master_cv
  │
  │ (1) ──────────────── (many) matches
                                   │
                         job_listings (many) ─── (1) matches
                                   │
                         matches (1) ──────────── (1) tailored_cvs
                                   │
                         matches (1) ──────────── (1) applications
```

### Tables

#### `users`
Stores the job seeker's complete preferences and target parameters.

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | `'default-user'` (single-user system) |
| `email` | TEXT UNIQUE | Contact email |
| `fullName` | TEXT | Appears on generated PDF CVs |
| `targetTitles` | TEXT (JSON) | e.g. `["Software Engineer", "Full Stack Developer"]` |
| `targetSeniority` | TEXT | `entry`, `mid`, `senior`, `lead`, `executive` |
| `targetLocations` | TEXT (JSON) | e.g. `["Dubai", "Abu Dhabi", "Remote (UAE)"]` |
| `minSalary` | REAL | Minimum salary in AED/month |
| `keywordsInclude` | TEXT (JSON) | Required tech keywords (e.g. `["React", "TypeScript"]`) |
| `keywordsExclude` | TEXT (JSON) | Blacklisted terms (e.g. `["Unpaid Internship"]`) |
| `matchThreshold` | INTEGER | Minimum AI match score (0–100) to proceed (default: **70**) |
| `autoSubmitAnswers` | INTEGER | 0 = always review; 1 = auto-submit |
| `dryRunMode` | INTEGER | 1 = simulate only; 0 = live submission |

#### `master_cv`
Stores the uploaded CV, its extracted raw text, and AI-parsed structured data.

| Column | Type | Description |
|---|---|---|
| `rawText` | TEXT | Full text extracted from uploaded PDF |
| `parsedData` | TEXT (JSON) | Structured `ParsedCV` object (summary, skills, experience, education, certifications) |

#### `job_listings`
Raw job data fetched from LinkedIn. SHA-256 deduplication prevents re-processing the same job.

| Column | Type | Description |
|---|---|---|
| `dedupHash` | TEXT UNIQUE | `SHA256(company + title + location)` — prevents duplicate entries |
| `source` | TEXT | `LinkedIn`, `Indeed`, `Bayt`, `Naukrigulf`, `Mock` |
| `applicationMethod` | TEXT | `easy_apply`, `external_form`, `direct_link` |
| `postedAt` | TEXT | Original posting timestamp (used for recency filtering) |

#### `matches`
AI evaluation output for each job against the user's profile.

| Column | Type | Description |
|---|---|---|
| `matchScore` | INTEGER | 0–100 AI-generated compatibility score |
| `reasoning` | TEXT | 2–3 sentence explanation from Claude |
| `pros` | TEXT (JSON) | Array of positive match factors |
| `flags` | TEXT (JSON) | Array of concerns (e.g. salary not listed, tech gap) |
| `status` | TEXT | `matched`, `skipped`, `rejected` |

#### `tailored_cvs`
AI-generated, company-specific CV content and the generated PDF file reference.

| Column | Type | Description |
|---|---|---|
| `tailoredSummary` | TEXT | Job-specific executive summary rewritten by Claude |
| `tailoredSkills` | TEXT (JSON) | Reordered/filtered skill list for this specific job |
| `summaryDiff` | TEXT | Human-readable summary of what was changed |
| `pdfPath` | TEXT | Absolute file path on server |
| `pdfUrl` | TEXT | Public URL path served by Express static file server |

#### `applications`
Final application log with status, AI-generated answers, and audit trail.

| Column | Type | Description |
|---|---|---|
| `status` | TEXT | `applied`, `needs_manual_review`, `skipped`, `failed` |
| `answers` | TEXT (JSON) | Array of `{question, answer, requiresReview, reviewed}` |
| `notes` | TEXT | Human-readable notes (e.g. "ATS portal detected") |
| `errorMessage` | TEXT | Playwright or submission errors (for audit) |

#### `schedule_config`
Cron window settings for the automated daily run.

| Column | Default | Description |
|---|---|---|
| `timezone` | `Asia/Dubai` | GST (UTC+4) |
| `windowStart` | `05:00` | Daily run start time |
| `windowEnd` | `08:00` | Daily run end time |
| `enabled` | `1` | Toggle auto-run on/off |

---

## 6. End-to-End Pipeline Walkthrough

The core of the system is `PipelineService.runPipeline()` — a sequential 4-stage orchestration function that executes the entire job application workflow end-to-end.

### Pipeline State Machine

```
        IDLE
          │
          ▼  (trigger: manual button / cron)
    AGGREGATING  ──── fetch last 48hrs LinkedIn jobs ────
          │                                               │
          ▼  (jobs found)                          (0 jobs → COMPLETED)
      MATCHING  ──── Claude AI scores each job ─────────
          │                                               │
          ▼  (score >= threshold)                  (below threshold → SKIPPED)
      TAILORING  ─── Claude rewrites CV summary ─────────
          │          PDFKit generates PDF
          ▼
      APPLYING  ──── Playwright submits or flags ────────
          │
          ▼
      COMPLETED (or ERROR on exception)
```

---

### Stage 1 — Job Aggregation

**Service**: `server/src/services/aggregatorService.ts`

**What Happens**:
1. Reads the user's `targetTitles` (e.g. `["Software Engineer", "Full Stack Developer"]`).
2. For each title, calls LinkedIn's **guest jobs API** (no authentication required):
   ```
   https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
     ?keywords=<title>
     &location=Dubai
     &f_TPR=r172800        <- filter: last 172,800 seconds = last 48 hours
   ```
3. Parses the returned HTML with **regex extraction** to identify job cards: title, company, location, URL, posting date, LinkedIn job ID.
4. **Recency filter**: Any posting older than 48 hours (with a 12-hour buffer for timezone offsets) is skipped.
5. For each valid job, fetches the **full job description** from LinkedIn's detail API using the job ID.
6. Generates a **SHA-256 dedup hash** from `company + title + location`. If the hash already exists in the database, the job is skipped — preventing re-processing the same listing.
7. Inserts new unique job listings into the `job_listings` SQLite table.

**Key Design Decisions**:
- **48-hour recency filter** ensures only fresh opportunities are processed — jobs more than 2 days old are expired in most markets.
- **SHA-256 deduplication** prevents the same job (reposted or reindexed) from being applied to twice, protecting the user's reputation.
- **Per-search cap of 5 results** prevents API abuse and keeps pipeline run-time predictable.
- **Graceful degradation**: If LinkedIn scraping fails for any title, a warning is logged and processing continues with other titles.

---

### Stage 2 — AI-Powered Match Scoring

**Service**: `server/src/services/aiService.ts` — `AIService.matchJob()`

**What Happens**:
1. For each new job listing, check if an application already exists in the DB (skip if yes).
2. Call **Claude 3.5 Haiku** (fast, cost-efficient model) with a carefully engineered prompt containing:
   - User's target titles, seniority level, keyword requirements/exclusions, minimum salary
   - User's CV summary and skills
   - Full job title, company, location, and description (up to 2,500 chars)
3. Claude returns a structured JSON with:
   - `matchScore` (0–100 integer)
   - `reasoning` (2–3 sentence explanation)
   - `pros` (array: positive alignment factors)
   - `flags` (array: concerns like missing salary, tech gaps)
4. If `matchScore >= matchThreshold` (default: 70), the job is marked `matched` and proceeds to Stage 3. Otherwise it is `skipped`.
5. Result stored in the `matches` table.

**Fallback Heuristic Matcher** (when no API key):
- Checks title match (+12 points), location match (+8 points), keyword coverage (+4 per keyword, up to +15), excluded keyword penalty (−25 per match).
- Base score: 75 — always returns a plausible score for demo/offline use.

**Key Design Decisions**:
- **Haiku model for matching** (not Sonnet): Fast and cheap — each evaluation costs fractions of a cent; hundreds of matches per day remain affordable.
- **Match threshold is user-configurable** (0–100 slider in Settings), giving full control over quality vs. volume tradeoff.
- **Structured JSON output enforcement**: Prompt instructs Claude to return "ONLY valid JSON", and the response is regex-extracted and validated — preventing hallucinated text format from crashing the pipeline.

---

### Stage 3 — Intelligent CV Tailoring

**Service**: `server/src/services/aiService.ts` — `AIService.tailorCV()`

**What Happens**:
1. Passes the user's `ParsedCV` (summary + skills) and the job's full description to **Claude 3.5 Sonnet** (high-quality model).
2. Prompt includes a **critical truthfulness guardrail** (highlighted below).
3. Claude returns:
   - `tailoredSummary`: The professional summary rewritten to incorporate the target company and job description keywords naturally.
   - `tailoredSkills`: The user's existing skill list reordered and filtered to prioritize the most relevant skills for this specific job.
   - `summaryDiff`: A short human-readable note describing what was changed (shown in the dashboard for transparency).

**The Truthfulness Guardrail** (verbatim from prompt):
> *"CRITICAL INSTRUCTION: You MUST follow strict truthfulness guardrails. NEVER fabricate skills, companies, dates, or degrees that are not explicitly present in the original CV. You may ONLY reorder, rephrase, and emphasize existing experience to match the target job description keywords."*

**Why This Matters**: This is the difference between ethical AI-assisted job searching and fraud. The system never invents qualifications — it only optimizes presentation of real experience.

**Key Design Decisions**:
- **Sonnet for tailoring** (not Haiku): Higher quality writing matters more here — this is what the employer reads.
- **Tailoring per application** means every submitted CV is unique and targeted, dramatically improving ATS keyword match rates vs. generic CVs.
- **User can edit before submit**: The tailored summary and skills are shown in the ApplicationDetailModal and are editable before the final PDF is regenerated.

---

### Stage 4 — ATS PDF Generation

**Service**: `server/src/services/pdfService.ts`

**What Happens**:
1. Uses **PDFKit** to programmatically generate an A4-format PDF resume, tailored for the specific company.
2. Document structure (ATS-optimized):
   - **Header**: Full name (22pt bold) + contact info (email, phone, location, LinkedIn)
   - **Professional Summary**: AI-tailored executive summary (justified, 10pt)
   - **Core Skills & Technologies**: Skill list joined with bullet separator (ATS-parseable plain text)
   - **Professional Experience**: Each role with company, dates, location, and bullet points
   - **Education**: Degrees, institutions, graduation years
   - **Certifications**: Inline bulleted list
3. File saved to `server/storage/cvs/` as `CV_<Name>_<Company>_<timestamp>.pdf`
4. URL path stored in DB; served via Express static file route with `Content-Disposition: attachment` for browser download.

**ATS Optimization Principles Applied**:
- Plain text (no tables, no graphics, no multi-column layout) — these break ATS parsers.
- Standard section headings ("PROFESSIONAL SUMMARY", "CORE SKILLS & TECHNOLOGIES") that ATS engines recognize.
- Readable fonts (Helvetica — safe, standard, universally supported).
- No headers/footers — some ATS systems don't read these.
- Skills in plain comma/bullet format — not in tags or badges.

---

### Stage 5 — Playwright Auto-Application

**Service**: `server/src/services/applyService.ts`

**What Happens** (decision tree):

```
  Job Application Method?

  external_form / direct_link?
  → Status: needs_manual_review
    (External portals need human attention)

  easy_apply + dryRunMode=true?
  → Simulate delay (0.8–1.5s), no browser launch
    → autoSubmitAnswers=true?  → Status: applied
    → autoSubmitAnswers=false? → needs_manual_review

  easy_apply + dryRunMode=false (LIVE)?
  → Launch Playwright Chromium (headless)
  → Navigate to job URL (15s timeout)
  → Detect CAPTCHA / Workday / Greenhouse / Lever
    → If detected: needs_manual_review
  → Find file upload input → upload tailored PDF
  → Status: applied
```

**AI-Generated Custom Answers**:
- Before submission, Claude (Haiku model) generates a contextual answer to standard application questions like *"Why are you interested in joining our Dubai team?"*
- Answer is grounded in the user's actual CV and the specific job — professional, first-person, non-generic.
- Stored in `applications.answers` for full audit trail.
- If `requiresReview = true`, the answer is shown in the dashboard for human review before marking as submitted.

**Playwright Configuration**:
- Browser: `chromium` in **headless mode** (no visible window)
- Custom user-agent mimics Chrome 120 (anti-bot evasion)
- Detects known ATS portals (Workday, Greenhouse, Lever, Taleo) and flags them for manual handling — Playwright cannot reliably handle these proprietary multi-step forms.

---

### Stage 6 — Results Logging & Dashboard

**Route**: `GET /api/applications`

**What's Shown**:
After the pipeline completes, all data is joined across 4 tables and presented in the React Dashboard:

```sql
SELECT a.*, m.matchScore, m.reasoning, m.pros, m.flags,
       j.title, j.company, j.url, j.source,
       t.pdfUrl, t.tailoredSummary, t.tailoredSkills
FROM applications a
JOIN matches m ON a.matchId = m.id
JOIN job_listings j ON m.jobId = j.id
LEFT JOIN tailored_cvs t ON t.matchId = m.id
ORDER BY a.appliedAt DESC
```

**Per-Application Summary Card shows**:
- Job title, company, location, source, posting date
- AI match score with visual badge (green/yellow/red)
- Application status badge (`Applied`, `Needs Action`, `Skipped`)
- Expandable detail: AI reasoning, pros, flags, tailored summary diff
- Download link for the tailored PDF CV
- Edit button to modify tailored content and regenerate PDF
- Manual "Execute Auto-Apply" button for flagged applications

---

## 7. Intelligent Scheduling System

**Service**: `server/src/services/schedulerService.ts`

**How It Works**:
- Uses `node-cron` with timezone support: cron expression `0 5-8 * * *` (at minute 0, hours 5 through 8)
- Timezone: `Asia/Dubai` (GST, UTC+4) — matches the regional job market
- Fires at: **5:00 AM, 6:00 AM, 7:00 AM, and 8:00 AM GST** every day
- Each trigger calls `PipelineService.runPipeline('scheduler')` — the same full pipeline as manual trigger
- Records `lastRunAt` after each successful run
- Calculates and displays `nextRunAt` in the UI (next scheduled morning window)

**Why 5–8 AM Dubai Time?**
- The UAE job market is highly active in the early morning.
- Job postings from the previous evening get promoted overnight.
- Applying within the first hours of a post going live dramatically increases visibility (many ATS tools sort applications chronologically).
- Recruiters typically review morning submissions first.

**User Control**:
- Toggle enable/disable from the Settings view
- Window start/end times and timezone are configurable via `PUT /api/schedule`
- Settings persisted in the `schedule_config` SQLite table and reloaded on server restart

---

## 8. Frontend Application

**Framework**: React 18 + Vite + TypeScript  
**Styling**: Tailwind CSS (dark mode, `slate-950` base, indigo accent)

### Views & Components

| Component | File | Purpose |
|---|---|---|
| `App.tsx` | Root | State management, routing, pipeline polling |
| `Navbar.tsx` | Navigation | Tab switcher + "Start Apply" button with status indicator |
| `Dashboard.tsx` | Main view | Application cards, stats, filter/sort |
| `ApplicationDetailModal.tsx` | Modal | Full application detail: match score, AI reasoning, CV editor, apply button |
| `PipelineProgressModal.tsx` | Modal | Live stage indicator + real-time log stream during pipeline execution |
| `ProfileView.tsx` | Tab | Edit user details + CV upload (PDF drag-and-drop) |
| `SettingsView.tsx` | Tab | Configure match threshold, dry-run mode, scheduler window, keywords |

### Real-Time Pipeline Monitoring
When a pipeline run is triggered (manual or scheduled), the frontend:
1. Opens `PipelineProgressModal`
2. Polls `/api/pipeline/progress` every **1 second**
3. Displays current stage with animated visual indicator
4. Streams real-time logs (timestamped in GST)
5. Auto-stops polling when stage = `completed` or `error`
6. Refreshes the application list on completion

### CV Upload Flow (ProfileView)
1. User uploads PDF file (up to 10MB) via drag-and-drop or file picker
2. Multer middleware saves file to `server/storage/uploads/`
3. `pdf-parse` extracts raw text from PDF
4. `AIService.parseMasterCV()` sends text to Claude 3.5 Sonnet
5. Claude returns structured JSON: summary, skills, experience, education, certifications, contact info
6. Parsed data stored in `master_cv` table
7. Profile view displays parsed CV for user review — editable before saving

---

## 9. AI Engine & Guardrails

### Models Used

| Task | Model | Reason |
|---|---|---|
| **CV Parsing** | Claude 3.5 Sonnet | High complexity, structured extraction |
| **Job Matching** | Claude 3.5 Haiku | Fast, cheap, runs for every job fetched |
| **CV Tailoring** | Claude 3.5 Sonnet | High quality writing, employer-facing |
| **Answer Generation** | Claude 3.5 Haiku | Simple Q&A, speed matters |

### Prompt Engineering Patterns

1. **Schema Anchoring**: Every prompt specifies the exact JSON schema expected in the output, with explicit field types (e.g. `"matchScore": number (0 to 100 integer)`). This enforces predictable, machine-parseable responses.

2. **Regex Extraction Safety Net**: All AI responses are parsed with `response.match(/\{[\s\S]*\}/)` before `JSON.parse()` — this handles cases where the model adds explanatory text before/after the JSON.

3. **Range Clamping**: Match scores are always clamped: `Math.min(100, Math.max(0, Number(parsed.matchScore) || 50))` — preventing out-of-range values from corrupting downstream logic.

4. **Truthfulness Guardrail** (CV Tailoring): A verbatim ethical constraint at the top of the tailoring prompt prevents the model from fabricating any credentials, dates, or skills. This is both an ethical and legal safeguard.

5. **Graceful Fallback**: Every AI call is wrapped in try/catch. If the Anthropic API is unavailable or the key is missing, a **heuristic mock fallback** takes over — maintaining full system functionality without AI (useful for demos and testing).

### Offline / Demo Mode
If `ANTHROPIC_API_KEY` is not set in `.env`:
- **CV Parsing** → Returns a realistic sample CV (Dubai-based software engineer profile)
- **Job Matching** → Keyword heuristic scoring: title match, location match, keyword coverage, exclusion penalty
- **CV Tailoring** → Template-based rewrite using existing skills
- **Answer Generation** → Template answers based on question type detection

---

## 10. API Surface Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profile` | Get user profile + master CV |
| `PUT` | `/api/profile` | Update user preferences and settings |
| `POST` | `/api/profile/cv` | Upload PDF/text CV, extract + AI parse |
| `GET` | `/api/applications` | Get all application logs + stats |
| `PUT` | `/api/applications/:id/status` | Manually update application status |
| `PUT` | `/api/applications/:id/tailored-cv` | Edit tailored content + regenerate PDF |
| `POST` | `/api/applications/:id/auto-apply` | Manually trigger auto-apply for one application |
| `POST` | `/api/applications/auto-apply-all` | Batch submit all "needs_manual_review" applications |
| `POST` | `/api/pipeline/run` | Trigger full pipeline (async, returns immediately) |
| `GET` | `/api/pipeline/progress` | Get current pipeline stage + logs |
| `GET` | `/api/schedule` | Get scheduler config + next run time |
| `PUT` | `/api/schedule` | Update scheduler window/timezone/enable |
| `GET` | `/storage/cvs/:filename` | Download a generated tailored PDF CV |
| `GET` | `/health` | Server health check |

---

## 11. Security & Safety Design

| Risk | Mitigation |
|---|---|
| CV Fabrication | Hard-coded truthfulness guardrail in Claude prompt |
| Duplicate Applications | SHA-256 dedup hash per (company, title, location) prevents double-applying |
| Accidental Live Submission | **Dry-Run mode enabled by default** — must be explicitly disabled |
| ATS Portal Submission Errors | Playwright detects Workday/Greenhouse/Lever and routes to manual review |
| File Upload Abuse | Multer enforces 10MB file size limit; only PDF/text accepted |
| API Key Exposure | Loaded via `dotenv` from `.env` file (not committed to version control) |
| Over-applying | `matchThreshold` (default: 70/100) ensures only strong matches are processed |
| External Review Control | `autoSubmitAnswers=false` by default — all AI answers shown for human review first |

---

## 12. Key Differentiators

| Feature | AutoApply Engine | Generic Job Boards | Manual Applying |
|---|---|---|---|
| Real-time job discovery | Yes — last 48 hours only | No — days/weeks old | No — manual search |
| AI match scoring | Yes — 0–100 with reasoning | No | No — gut feel |
| Per-job CV tailoring | Yes — Claude AI rewrite | No | Hours of work |
| ATS-optimized PDF | Yes — auto-generated | No | Manual formatting |
| Auto form submission | Yes — Playwright headless | No | Manual |
| Dubai timezone awareness | Yes — GST cron 5–8 AM | No | No |
| Truthfulness guardrails | Yes — hardcoded | N/A | Self-controlled |
| Full audit trail | Yes — all decisions logged | No | No |
| Duplicate prevention | Yes — SHA-256 dedup | No | Memory |
| Dry run / safe mode | Yes — default enabled | N/A | N/A |

---

## 13. Future Roadmap

### Phase 2 — Multi-Source Aggregation
- Add **Indeed**, **Bayt.com**, **Naukrigulf**, and **GlassDoor** scrapers alongside LinkedIn
- Implement source-specific HTML parsers for each platform
- Unified dedup across all sources

### Phase 3 — Multi-User SaaS
- Move from single `default-user` to full user authentication (JWT/OAuth)
- Subscription tiers: Free (5 applications/day), Pro (unlimited)
- Per-user isolated databases or multi-tenant SQLite/PostgreSQL migration

### Phase 4 — Cover Letter & Email Generation
- AI-generated cover letters (Sonnet) per application
- Automated recruiter email drafting for direct outreach jobs
- Email open tracking integration

### Phase 5 — Interview Preparation
- When an application moves to "Interview" stage, auto-generate:
  - Company research brief
  - Common interview questions for the role
  - STAR-format answer templates based on user's CV

### Phase 6 — Analytics & Optimization
- A/B testing: test different CV summary styles and track interview callback rate
- Match score calibration: learn from outcomes (applied → interview → offer) to tune thresholds
- Application funnel visualization dashboard

### Phase 7 — Mobile App
- React Native app for mobile pipeline monitoring and manual review actions
- Push notifications when high-score jobs are found

---

## Appendix: File Structure Reference

```
ai job apply/
├── shared/
│   └── types.ts                    <- Shared TypeScript interfaces
│
├── client/                         <- React + Vite Frontend
│   └── src/
│       ├── App.tsx                 <- Root app + state + polling
│       ├── components/
│       │   ├── Dashboard.tsx       <- Application cards & stats
│       │   ├── ApplicationDetailModal.tsx  <- Per-job detail & edit
│       │   ├── PipelineProgressModal.tsx   <- Live pipeline view
│       │   ├── ProfileView.tsx     <- CV upload & profile edit
│       │   ├── SettingsView.tsx    <- Match threshold & scheduler
│       │   └── Navbar.tsx          <- Navigation & trigger button
│       └── services/
│           └── api.ts              <- Typed API client
│
└── server/                         <- Express + TypeScript Backend
    └── src/
        ├── index.ts                <- Server boot, middleware, routes
        ├── db/
        │   └── database.ts         <- SQLite init & schema migration
        ├── routes/
        │   └── apiRoutes.ts        <- All REST endpoints
        └── services/
            ├── aggregatorService.ts    <- LinkedIn scraper + dedup
            ├── aiService.ts            <- Claude AI: parse, match, tailor, answer
            ├── pdfService.ts           <- PDFKit ATS CV generator
            ├── applyService.ts         <- Playwright browser automation
            ├── pipelineService.ts      <- 4-stage orchestrator
            └── schedulerService.ts     <- node-cron Dubai window scheduler
```

---

*AutoApply Engine — Built with React, Express, Playwright, Claude AI, node-cron & SQLite*  
*Dubai GST (UTC+4) • Daily Auto-Run Window: 5:00 - 8:00 AM*
