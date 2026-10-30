# CivicCare Haldia — Municipal Civic Issue Tracker & Real-Time Authority Dispatch Platform

**CivicCare Haldia** (`team-nova`) is an end-to-end municipal civic issue reporting, automated priority triage, live geospatial mapping, and authority dispatch platform purpose-built for **Haldia Municipality**. It connects citizens and municipal ward engineers through a unified real-time workspace backed by **Firebase Authentication**, **Google Cloud Firestore**, **Leaflet + OpenStreetMap Nominatim + Esri World Imagery**, and a sub-30ms **CivicCare AI Assistant**.

---

## Table of Contents

1. [Project Overview & Problem Statement](#project-overview--problem-statement)
2. [Key Capabilities](#key-capabilities)
3. [System Architecture & Mermaid Diagrams](#system-architecture--mermaid-diagrams)
   - [1. High-Level System Architecture](#1-high-level-system-architecture)
   - [2. End-to-End Civic Issue Lifecycle](#2-end-to-end-civic-issue-lifecycle)
   - [3. Issue Status State Machine & Audit Trail](#3-issue-status-state-machine--audit-trail)
   - [4. Cloud Firestore Data Model (ER Diagram)](#4-cloud-firestore-data-model-er-diagram)
4. [Automated Triage & Priority Scoring Engine](#automated-triage--priority-scoring-engine)
5. [Project File Tree](#project-file-tree)
6. [Tech Stack](#tech-stack)
7. [How to Run Locally & in Production](#how-to-run-locally--in-production)
8. [Authentication & Authority Credentials](#authentication--authority-credentials)

---

## Project Overview & Problem Statement

Urban and industrial municipalities like **Haldia** face recurring civic infrastructure challenges—waterlogged roads, burst pipelines, exposed high-voltage cables, uncollected solid waste, and non-functional streetlights. Traditional grievance systems suffer from four core bottlenecks:

1. **Delayed & Unstructured Reporting**: Citizens lack a fast, multilingual way to submit exact GPS coordinates and real field photos.
2. **Manual Triage Overload**: Municipal officers must manually read hundreds of complaints to determine which department (`Road`, `Water`, `Electricity`, `Sanitation`, `Other`) handles each issue.
3. **Duplicate Flooding & Lack of Prioritization**: Multiple residents report the same hazard (for example, a broken water main at Durga Chowk), cluttering the queue without surfacing life-safety emergencies first.
4. **Zero Public Accountability**: Once a complaint is filed, citizens rarely see when an issue moves from `Reported` to `In Progress` to `Resolved`, or how long each stage took.

**CivicCare Haldia** solves these problems by combining a 60-second GPS + Camera reporting wizard, a deterministic multilingual triage and deduplication engine, a priority-ranked municipal dispatch console, and a transparent timestamped activity audit log.

---

## Key Capabilities

- **Firebase Authentication Entry Gate (`AuthPage.tsx`)**:
  - Presented at the start of the site before entering the workspace.
  - **Citizen / Resident Login**: One-click **Firebase Google OAuth 2.0** (`signInWithPopup`) and **Firebase Email & Password** login to sync reported and followed issues across sessions.
  - **Ward Authority Login**: Verified Google Officer login or **Authority Master Key (`NOVA-HALDIA-KEY-2026`)** verification to unlock municipal dispatch operations.
- **Citizen Dashboard & Resident Portal**:
  - **Citizen Dashboard (`UserPortalView.tsx`)**: Real-time municipal KPIs (Total Issues, Open, In Progress, Resolved, Resolution Rate), a searchable **Community Civic Feed**, a **My Reported & Followed Issues** tracker, and a live **Ward Map**.
  - **Smart Report Wizard (`ResidentViews.tsx`)**: Debounced live triage preview, real camera/gallery photo upload, and HTML5 GPS + OpenStreetMap Nominatim reverse geocoding.
  - **Public Issue Tracker (`ResidentViews.tsx`)**: Instant lookup of any issue by tracking ID with full photographic, geospatial, and audit timeline visibility.
- **Timestamped Activity Log & Audit Trail (`IssueActivityLog.tsx`)**:
  - **3-Stage Lifecycle Milestone Stepper**: Tracks `1. Reported (Open)` → `2. In Progress` → `3. Resolved` with exact timestamps, relative time ago, elapsed turnaround duration (`+Xh Ym`), and **Total Resolution SLA** time.
  - **Exportable Chronological Audit Log**: Lists every status change (`01`, `02`, `03`) with transition badges, local time + UTC ISO-8601 timestamp, verified actor attribution (`Resident Portal Filing` vs. `Ward Authority Officer`), sort toggle, and one-click clipboard copy.
- **Real-Time Geospatial & Satellite Mapping (`HaldiaIssueMap.tsx`)**:
  - Live HTML5 GPS tracking (`getCurrentPosition` + `watchPosition`), OpenStreetMap Nominatim address search & reverse geocoding, **Street Map vs. Esri World Imagery Real Satellite** toggle, and direct Google Maps verification links.
- **3-Tier Resilient Real Photo Engine (`CivicRealImage.tsx` & `POST /api/upload-photo`)**:
  - Multipart/base64 camera photo upload to `/public/assets/photos/`, verified Wikimedia Commons / Unsplash real photography per civic category, and an offline photographic canvas fallback so broken image icons never occur.
- **Ultra-Fast Multilingual CivicCare AI Chatbot (`CivicAiChatbot.tsx`)**:
  - Sub-30ms deterministic responses for issue ID lookups, ward analytics, and structured report drafting in **English, Bengali (বাংলা), and Hindi (हिन्दी)**, augmented by bounded Google Gemini (`gemini-3.8-flash`) assistance.

---

## System Architecture & Mermaid Diagrams

### 1. High-Level System Architecture

```mermaid
flowchart TB
  subgraph Client["Frontend SPA (React 19 + TypeScript + Tailwind CSS v4)"]
    AuthGate["Firebase Auth Entry Gate (AuthPage.tsx)"]
    AppShell["Responsive App Shell and Router (App.tsx)"]
    UserPortal["Citizen Dashboard and Community Feed (UserPortalView.tsx)"]
    ReportWizard["Report Issue Wizard and Live Triage (ResidentViews.tsx)"]
    TrackView["Issue Tracker and Activity Audit Log (IssueActivityLog.tsx)"]
    AdminConsole["Ward Authority Dispatch Console (AdminViews.tsx)"]
    LeafletMap["Interactive Leaflet GPS and Satellite Map (HaldiaIssueMap.tsx)"]
    AiChatbot["CivicCare Multilingual AI Assistant (CivicAiChatbot.tsx)"]
  end

  subgraph TriageEngine["Deterministic Triage Engine (src/lib/triage.ts)"]
    Classifier["Multilingual Keyword Classifier"]
    PriorityScorer["Severity and Priority Scorer (0 to 100)"]
    Deduplicator["Jaccard Token Similarity Deduplicator"]
  end

  subgraph ExpressServer["Backend Express Server (server.ts on Port 3000)"]
    UploadEndpoint["POST /api/upload-photo (Real Image Persistence)"]
    ChatEndpoint["POST /api/ai/chat (Fast Path + Gemini AI)"]
    RestEndpoints["GET / POST / PATCH /api/issues (REST Mirror)"]
  end

  subgraph CloudServices["Cloud and External Services"]
    FirebaseAuth["Firebase Authentication (Google OAuth + Email)"]
    CloudFirestore[("Google Cloud Firestore (issues, events, admins)")]
    MapServices["OpenStreetMap Nominatim and Esri Satellite Tiles"]
    GeminiApi["Google Gemini API (gemini-3.8-flash)"]
  end

  AuthGate --> FirebaseAuth
  AuthGate --> AppShell
  AppShell --> UserPortal
  AppShell --> ReportWizard
  AppShell --> TrackView
  AppShell --> AdminConsole
  AppShell --> AiChatbot

  UserPortal --> LeafletMap
  ReportWizard --> LeafletMap
  AdminConsole --> LeafletMap

  ReportWizard --> Classifier
  ReportWizard --> PriorityScorer
  ReportWizard --> Deduplicator
  AdminConsole --> PriorityScorer

  UserPortal --> CloudFirestore
  ReportWizard --> CloudFirestore
  TrackView --> CloudFirestore
  AdminConsole --> CloudFirestore

  ReportWizard --> UploadEndpoint
  AiChatbot --> ChatEndpoint
  ChatEndpoint --> GeminiApi
  LeafletMap --> MapServices
```

---

### 2. End-to-End Civic Issue Lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor Citizen as Haldia Resident
  participant Gate as Firebase Auth Gate
  participant SPA as CivicCare React SPA
  participant Geo as GPS and OSM Nominatim
  participant Triage as Triage Engine
  participant FS as Cloud Firestore
  actor Officer as Ward Authority Officer

  Citizen->>Gate: Sign in via Google OAuth or Email/Password
  Gate-->>SPA: Unlock Citizen Portal Session
  Citizen->>SPA: Open Report Issue Wizard
  Citizen->>Geo: Request Live GPS or Pin Location on Map
  Geo-->>SPA: Return WGS84 (lat, lng) and Reverse-Geocoded Ward Landmark
  Citizen->>SPA: Capture/Upload Real Photo and Enter Title + Description
  SPA->>Triage: Run Debounced Triage Preview
  Triage-->>SPA: Return Category, Priority Score (0-100), Similar Issues
  Citizen->>SPA: Submit Civic Issue Report
  SPA->>FS: Create /issues/{id} (status=Open) and /issues/{id}/events (Reported)
  FS-->>Citizen: Confirm Submission and Issue Tracking ID

  Officer->>Gate: Sign in via Officer Google Account or Master Key
  Gate-->>SPA: Unlock Ward Authority Dispatch Console
  Officer->>FS: Query Priority-Sorted Issues Queue
  Officer->>FS: Update Status from Open to In Progress with Audit Note
  FS->>FS: Append /issues/{id}/events (to=In Progress, timestamp)
  Officer->>FS: Update Status from In Progress to Resolved with Resolution Note
  FS->>FS: Append /issues/{id}/events (to=Resolved, timestamp)

  Citizen->>SPA: Open Track Issue View
  SPA->>FS: Fetch Issue Details and Events Subcollection
  FS-->>Citizen: Render 3-Stage Milestone Stepper and Activity Audit Log
```

---

### 3. Issue Status State Machine & Audit Trail

```mermaid
stateDiagram-v2
  [*] --> Open : Citizen Files Report (Event 01 Recorded)
  Open --> Open : Duplicate Report Linked (similar_count + 1)
  Open --> InProgress : Ward Officer Dispatches Crew (Event 02 + Audit Note)
  InProgress --> Resolved : Field Verification Completed (Event 03 + Resolution Note)
  Resolved --> [*] : SLA Turnaround Calculated
```

---

### 4. Cloud Firestore Data Model (ER Diagram)

```mermaid
erDiagram
  ISSUES ||--o{ STATUS_EVENTS : "has_audit_events"
  ADMINS ||--o{ ISSUES : "manages_dispatch"

  ISSUES {
    int id PK "Sequential Tracking ID (1 to 1000000)"
    string title "Issue headline (5 to 120 chars)"
    string description "Detailed field description (10 to 2000 chars)"
    string location "Haldia Ward and Landmark (3 to 200 chars)"
    string photo_url "Verified HTTP(S) or uploaded photo URL"
    float lat "WGS84 Latitude (-90 to 90)"
    float lng "WGS84 Longitude (-180 to 180)"
    string category "Road, Water, Electricity, Sanitation, Other"
    string status "Open, In Progress, Resolved"
    int urgency_hits "Matched urgency keywords count"
    int similar_count "Cluster count of duplicate reports"
    string created_at "ISO-8601 UTC creation timestamp"
    string updated_at "ISO-8601 UTC last update timestamp"
    string authorityKey "Optional verified master key token"
  }

  STATUS_EVENTS {
    string event_id PK "Subcollection /issues/{issueId}/events/{eventId}"
    int issue_id FK "References parent ISSUES.id"
    string from "Previous status (nullable on creation)"
    string to "Target status (Open, In Progress, Resolved)"
    string note "Citizen filing note or Officer audit note"
    string at "ISO-8601 UTC transition timestamp"
  }

  ADMINS {
    string uid PK "Firebase Auth UID (/admins/{adminUid})"
    string email "Verified officer email address"
    string role "ward_officer"
  }
```

---

## Automated Triage & Priority Scoring Engine

All triage rules are implemented deterministically in `src/lib/triage.ts` so both the client preview and authority queue produce identical, auditable results:

1. **Multilingual Category Classification**:
   - Evaluates weighted keyword matches across **English, Bengali, and Hindi** civic vocabularies for `Road`, `Water`, `Electricity`, `Sanitation`, and `Other`.
   - Validated against a 20-case benchmark suite achieving **≥ 85% classification accuracy**.
2. **Jaccard Duplicate Clustering**:
   - Tokenizes incoming reports and compares against active (`Open` / `In Progress`) issues in the same category/ward using Jaccard similarity (`threshold ≥ 0.28`).
3. **Priority Score Formula (`0–100`)**:
   ```text
   Priority = min(100, CategoryBase + (15 * min(3, UrgencyHits)) + (5 * min(4, SimilarCount)) + min(15, floor(AgeHours / 6)))
   ```
   - **Category Base Weights**: `Electricity` (35), `Water` (32), `Road` (28), `Sanitation` (25), `Other` (18).
   - **Urgency Boost**: `+15` per critical safety keyword (e.g., `live wire`, `sparking`, `hospital`, `school`, `flooding`, `sewage`), up to `+45`.
   - **Duplicate Cluster Boost**: `+5` per linked similar report, up to `+20`.
   - **Aging SLA Boost**: `+1` per 6 hours unresolved, up to `+15`.

---

## Project File Tree

```text
/
├── README.md                          # Project documentation, Mermaid diagrams, tech stack & setup guide
├── index.html                         # HTML5 entry point, Leaflet CSS & OpenGraph metadata
├── metadata.json                      # Application capability manifest
├── package.json                       # Dependencies & npm scripts (dev, build, start, lint)
├── tsconfig.json                      # TypeScript compiler configuration
├── vite.config.ts                     # Vite bundler & Tailwind CSS v4 plugin configuration
├── firebase-applet-config.json        # Provisioned Firebase project & Firestore DB configuration
├── firebase-blueprint.json            # Firestore schema blueprint for issues, events & admins
├── firestore.rules                    # Production Firestore security rules (RBAC + state machine)
├── server.ts                          # Express full-stack server (Photo upload, AI Chat, Vite middleware)
├── public/
│   └── assets/
│       └── photos/                    # User-uploaded real camera/gallery civic photos (*.jpg)
└── src/
    ├── main.tsx                       # React 19 DOM root mount
    ├── index.css                      # Tailwind CSS v4 import & map/layout utilities
    ├── types.ts                       # Shared TypeScript interfaces (Issues, Timeline, Triage, Stats)
    ├── App.tsx                        # Responsive application shell, entry gate & hash router
    ├── components/
    │   ├── AuthPage.tsx               # Initial Firebase Auth Entry Gate (Citizen & Authority login)
    │   ├── UserPortalView.tsx         # Citizen Dashboard, KPIs, Community Feed & Followed Issues (#/user)
    │   ├── ResidentViews.tsx          # Report Issue Wizard (#/report), Success View & Track View (#/track)
    │   ├── AdminViews.tsx             # Authority Dispatch Console, Priority Queue & Drawer (#/admin)
    │   ├── IssueActivityLog.tsx       # 3-Stage Milestone Stepper & Timestamped Audit Trail Log
    │   ├── HaldiaIssueMap.tsx         # Interactive Leaflet Map (Live GPS, Nominatim Search, Satellite)
    │   ├── CivicRealImage.tsx         # 3-Tier resilient real photographic renderer
    │   ├── CivicAiChatbot.tsx         # Multilingual (<30ms) AI Civic Assistant drawer
    │   └── DemoWalkthroughDrawer.tsx  # Interactive 3-minute guided evaluation checklist
    └── lib/
        ├── firebase.ts                # Firebase Auth, Firestore CRUD, chunked batching & error handler
        ├── triage.ts                  # Deterministic classification, priority formula & benchmark suite
        ├── seed.ts                    # 28 realistic Haldia municipal seed issues with GPS coordinates
        └── syntheticAssets.ts         # Verified real photographs per civic category & URL healer
```

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript** | Modular functional components, hooks, and strict static typing |
| **Styling & Responsive UI** | **Tailwind CSS v4 (`@tailwindcss/vite`)** | Mobile-first responsive layout, civic slate palette, WCAG AA contrast |
| **Authentication** | **Firebase Authentication** | Google OAuth 2.0 (`signInWithPopup`), Email/Password, and Master Key RBAC |
| **Primary Database** | **Google Cloud Firestore (Firebase SDK v12)** | Real-time persistent storage for `issues`, `events` subcollections, and `admins` |
| **Geospatial & Maps** | **Leaflet + OpenStreetMap Nominatim + Esri** | Interactive street & real satellite maps, live HTML5 GPS, reverse geocoding |
| **Backend Runtime** | **Node.js + Express + `tsx`** | Full-stack server on Port 3000 serving `/api/upload-photo` and `/api/ai/chat` |
| **AI & Triage Engine** | **Deterministic Triage + `@google/genai`** | Instant `<30ms` local triage/lookup + bounded `gemini-3.8-flash` synthesis |
| **Icons** | **`lucide-react`** | Clean, accessible vector iconography |

---

## How to Run Locally & in Production

### Prerequisites
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional Local Override)
Create a `.env` file in the project root:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
ADMIN_TOKEN="NOVA-HALDIA-KEY-2026"
PORT=3000
```
*(Note: Firebase configuration is loaded automatically from `firebase-applet-config.json`. On first boot, the app automatically verifies and seeds the 28 Haldia municipal issues into Cloud Firestore if the collection is empty.)*

### 3. Start the Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Type-Check & Build for Production
```bash
npm run lint
npm run build
npm start
```

---

## Authentication & Authority Credentials

When you launch **CivicCare Haldia**, the **Firebase Authentication Entry Gate** is displayed first:

1. **Citizen / Resident Access**:
   - Click **Sign In with Google (Firebase Auth)** or use the **Firebase Email & Password** form to enter the **Citizen Dashboard (`#/user`)**.
2. **Municipal Ward Authority Access**:
   - Switch to the **Ward Authority Login** tab at the entry gate.
   - Sign in with an authorized Google Officer account (`bappadityakuilya@gmail.com`) or enter the provisioned **Authority Master Key**:
     ```text
     NOVA-HALDIA-KEY-2026
     ```
   - Unlocks full dispatch privileges in `#/admin` to transition issues (`Open` → `In Progress` → `Resolved`) and record official audit trail notes.
