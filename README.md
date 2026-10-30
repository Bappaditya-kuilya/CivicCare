# CivicCare Haldia — Municipal Civic Issue Tracker & Real-Time Response Platform

**CivicCare Haldia** (`team-nova`) is a full-stack municipal civic issue reporting, automated priority triage, live geospatial tracking, and authority dispatch platform purpose-built for **Haldia Municipality**. It connects citizens and municipal ward officers through a unified real-time workspace backed by **Firebase Authentication**, **Cloud Firestore**, **Leaflet + OpenStreetMap Nominatim + Esri World Imagery**, and a sub-30ms **CivicCare AI Assistant**.

---

## Table of Contents

1. [Key Capabilities](#key-capabilities)
2. [System Architecture & Mermaid Diagrams](#system-architecture--mermaid-diagrams)
   - [High-Level System Architecture](#1-high-level-system-architecture)
   - [End-to-End Civic Issue Lifecycle & Audit Trail](#2-end-to-end-civic-issue-lifecycle--audit-trail)
   - [Cloud Firestore Data Model (ER Diagram)](#3-cloud-firestore-data-model-er-diagram)
3. [Project File Tree](#project-file-tree)
4. [Tech Stack](#tech-stack)
5. [How to Run Locally & in Production](#how-to-run-locally--in-production)
6. [Authentication & Authority Credentials](#authentication--authority-credentials)

---

## Key Capabilities

- **Dual-Portal Responsive Workspace**:
  - **Citizen / Resident Portal (`#/user`, `#/report`, `#/track`)**: Submit civic issues with real camera/gallery photos, pin exact GPS coordinates on an interactive street/satellite map, follow community issues, and inspect the timestamped status audit trail.
  - **Authority Admin Console (`#/admin`)**: Priority-ranked dispatch table ($0\text{–}100$ deterministic severity score), category & ward filters, status workflow transitions (`Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`) with mandatory audit notes, and benchmark accuracy validation ($\ge 85\%$).
  - **Firebase Authentication Entry Gate (`AuthPage.tsx`)**: Shown at the start of the site before entering the workspace; supports Google OAuth 2.0 sign-in for citizens and municipal officers, quick citizen entry, and Authority Master Key verification (`NOVA-HALDIA-KEY-2026`).
- **Timestamped Activity Log & Audit Trail**:
  - 3-stage visual milestone stepper (`Reported` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`) calculating exact turnaround durations (`+Xh Ym`) and total resolution SLA time, plus exportable chronological audit entries.
- **Real-Time Geospatial Map (`HaldiaIssueMap.tsx`)**:
  - Live HTML5 GPS tracking (`getCurrentPosition` + `watchPosition`), OpenStreetMap Nominatim address search & reverse geocoding, Esri World Imagery satellite layer toggle, and direct Google Maps verification links.
- **3-Tier Resilient Real Photo Engine (`CivicRealImage.tsx` & `/api/upload-photo`)**:
  - Multipart/base64 camera photo upload to `/public/assets/photos/`, verified Wikimedia Commons / Unsplash real photography per civic category, and an offline photographic canvas fallback so broken image icons never occur.
- **Ultra-Fast Multilingual CivicCare AI Chatbot (`CivicAiChatbot.tsx`)**:
  - Instant $<30\text{ms}$ deterministic responses for `#ID` issue lookups, ward analytics, and structured report drafting in **English, Bengali (বাংলা), and Hindi (हिन्दी)**, augmented by bounded Gemini (`gemini-3.8-flash`) assistance.

---

## System Architecture & Mermaid Diagrams

### 1. High-Level System Architecture

```mermaid
graph TB
  subgraph Client["Frontend SPA (React 19 + TypeScript + Tailwind CSS v4)"]
    Nav["Responsive App Shell & Hash Router (#/user, #/report, #/track, #/admin, #/login)"]
    AuthUI["Firebase Auth Login Portal (AuthPage.tsx)"]
    UserUI["Citizen Dashboard & Community Feed (UserPortalView.tsx)"]
    ReportUI["Report Wizard + Live Triage Preview (ResidentViews.tsx)"]
    TrackUI["Issue Tracker + Activity Audit Log (IssueActivityLog.tsx)"]
    AdminUI["Ward Authority Dispatch Console (AdminViews.tsx)"]
    MapUI["Interactive Leaflet GPS + Satellite Map (HaldiaIssueMap.tsx)"]
    ChatUI["CivicCare Multilingual AI Assistant (CivicAiChatbot.tsx)"]
  end

  subgraph Triage["Shared Deterministic Triage Engine (src/lib/triage.ts)"]
    Classifier["Keyword Category Classifier (Road, Water, Electricity, Sanitation, Other)"]
    Priority["Severity & Priority Scorer (0-100 Formula: Base + Urgency + Similar + Age)"]
    Dedup["Jaccard Token Similarity Deduplicator"]
  end

  subgraph Server["Backend Express Server (server.ts on Port 3000)"]
    UploadAPI["POST /api/upload-photo (Real Image Persistence)"]
    ChatAPI["POST /api/ai/chat (<30ms Fast Path + Gemini 3.8 Flash)"]
    RestAPI["/api/issues & /api/stats (SQLite Mirror & REST Endpoints)"]
  end

  subgraph Cloud["Cloud & External Services"]
    FBAuth["Firebase Authentication (Google OAuth 2.0)"]
    Firestore[("Cloud Firestore Database\n(issues, timeline_events, counters)")]
    OSM["OpenStreetMap Nominatim & Esri World Imagery"]
    Gemini["Google Gemini API (@google/genai)"]
  end

  Nav --> AuthUI & UserUI & ReportUI & TrackUI & AdminUI
  ReportUI & AdminUI & UserUI --> MapUI
  Nav --> ChatUI

  AuthUI --> FBAuth
  UserUI & ReportUI & TrackUI & AdminUI --> Firestore
  ReportUI & AdminUI --> Triage

  ReportUI --> UploadAPI
  ChatUI --> ChatAPI
  ChatAPI --> Gemini
  MapUI --> OSM
```

---

### 2. End-to-End Civic Issue Lifecycle & Audit Trail

```mermaid
sequenceDiagram
  autonumber
  actor Citizen as Haldia Resident
  participant UI as CivicCare React SPA
  participant Geo as GPS & OSM Nominatim
  participant Triage as Triage Engine
  participant FS as Cloud Firestore
  actor Officer as Ward Authority Officer

  Citizen->>UI: Open Report Wizard (#/report) or Login (#/login)
  Citizen->>Geo: Click "Use My Live GPS" or Tap Map
  Geo-->>UI: Return (lat, lng) + Reverse-Geocoded Haldia Ward Landmark
  Citizen->>UI: Upload/Capture Real Photo + Enter Title & Description
  UI->>Triage: Run Live Preview (classify + urgencyHits + Jaccard similarity)
  Triage-->>UI: Category, Priority Score (0-100), Similar Issue IDs
  Citizen->>UI: Submit Civic Report
  UI->>FS: Atomic Write: /issues/{id} (status="Open") + /timeline_events (Reported)
  FS-->>Citizen: Return Tracking ID (e.g., #29)

  Officer->>UI: Authenticate via Firebase Google Auth or Master Key (#/login)
  Officer->>FS: Load Priority-Sorted Dispatch Queue (#/admin)
  Officer->>FS: Update Status: "Open" -> "In Progress" (with Officer Audit Note)
  FS->>FS: Append /timeline_events (status_after="In Progress", timestamp)
  Officer->>FS: Update Status: "In Progress" -> "Resolved" (with Resolution Note)
  FS->>FS: Append /timeline_events (status_after="Resolved", timestamp)

  Citizen->>UI: Inspect Issue (#/issue/29)
  UI->>FS: Fetch Issue + Chronological Timeline Events
  FS-->>UI: Render 3-Stage Stepper & Timestamped Activity Audit Log
```

---

### 3. Cloud Firestore Data Model (ER Diagram)

```mermaid
erDiagram
  ISSUES ||--o{ TIMELINE_EVENTS : "tracks_audit_trail"
  COUNTERS ||--|| ISSUES : "allocates_sequential_id"

  ISSUES {
    int id PK "Sequential Tracking ID (e.g., 1..28+)"
    string title "Concise issue headline (5-120 chars)"
    string description "Detailed field report (10-1000 chars)"
    string location "Haldia Ward & Landmark (3-120 chars)"
    string photo_url "Verified HTTP(S) or /assets/photos/*.jpg URL"
    float lat "WGS84 Latitude (22.00 - 22.12)"
    float lng "WGS84 Longitude (88.00 - 88.18)"
    string category "Road | Water | Electricity | Sanitation | Other"
    string status "Open | In Progress | Resolved"
    int urgency_hits "Matched hazard keywords (0-3)"
    int similar_count "Cluster count of nearby/similar reports"
    string created_at "ISO-8601 UTC creation timestamp"
    string updated_at "ISO-8601 UTC last status timestamp"
  }

  TIMELINE_EVENTS {
    string doc_id PK "Auto-generated Firestore Document ID"
    int issue_id FK "References ISSUES.id"
    string event_type "created | status_change"
    string status_before "Nullable previous status (Open | In Progress)"
    string status_after "New status (Open | In Progress | Resolved)"
    string note "Citizen filing note or Officer dispatch audit note"
    string created_at "ISO-8601 UTC transition timestamp"
  }

  COUNTERS {
    string id PK "Document ID: 'issues'"
    int seq "Latest allocated sequential issue number"
  }
```

---

## Project File Tree

```text
/
├── README.md                          # Architecture, Mermaid diagrams, tech stack & setup guide
├── index.html                         # HTML5 entry point + Leaflet CSS & SEO metadata
├── metadata.json                      # AI Studio applet capability manifest
├── package.json                       # Dependencies & npm scripts (dev, build, start, lint)
├── tsconfig.json                      # TypeScript compiler configuration
├── vite.config.ts                     # Vite bundler & Tailwind CSS v4 plugin config
├── firebase-applet-config.json        # Provisioned Firebase project & Firestore DB configuration
├── firebase-blueprint.json            # Firestore schema blueprint for issues & timeline_events
├── firestore.rules                    # Production security rules (RBAC + schema validation)
├── server.ts                          # Express full-stack server (Photo upload, AI Chat, Vite middleware)
├── public/
│   └── assets/
│       └── photos/                    # User-uploaded real camera/gallery civic photos (*.jpg)
└── src/
    ├── main.tsx                       # React 19 DOM root mount
    ├── index.css                      # Tailwind CSS v4 import & custom map/scrollbar utilities
    ├── types.ts                       # Shared TypeScript interfaces (Issues, Timeline, Triage, Stats)
    ├── App.tsx                        # Responsive application shell, hash router & navigation bars
    ├── components/
    │   ├── AuthPage.tsx               # Dedicated Firebase Google Auth & Authority Key Login page (#/login)
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
| **Frontend Framework** | **React 19 + TypeScript** | Component architecture, hooks, and strict static typing |
| **Styling & Design** | **Tailwind CSS v4 (`@tailwindcss/vite`)** | Responsive mobile-first layout, civic slate palette, WCAG AA contrast |
| **Authentication** | **Firebase Authentication** | Google OAuth 2.0 (`signInWithPopup`) + Role/Master Key RBAC |
| **Primary Database** | **Cloud Firestore (Firebase JS SDK v12)** | Real-time persistent storage for `issues`, `timeline_events`, and `counters` |
| **Geospatial & Maps** | **Leaflet + OpenStreetMap Nominatim + Esri** | Interactive street & real satellite maps, live HTML5 GPS, reverse geocoding |
| **Backend Runtime** | **Node.js + Express + `tsx`** | Full-stack server on Port 3000 serving `/api/upload-photo` and `/api/ai/chat` |
| **AI & Triage Engine** | **Deterministic Triage + `@google/genai`** | Instant $<30\text{ms}$ local triage/lookup + bounded `gemini-3.8-flash` synthesis |
| **Icons** | **`lucide-react`** | Clean, accessible vector iconography |

---

## How to Run Locally & in Production

### Prerequisites
- **Node.js** $\ge 20.x$ and **npm** $\ge 10.x$

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional for Local Override)
Create a `.env` file (or inspect `.env.example`):
```env
GEMINI_API_KEY="your_gemini_api_key_here"
ADMIN_TOKEN="NOVA-HALDIA-KEY-2026"
PORT=3000
```
*(Note: Firebase configuration is automatically loaded from `firebase-applet-config.json`. On first boot, the app automatically verifies and seeds the 28 Haldia municipal issues into Cloud Firestore if the collection is empty.)*

### 3. Start the Full-Stack Development Server
```bash
npm run dev
```
- Starts the Express + Vite middleware server on **`http://localhost:3000`**.

### 4. Type-Check & Build for Production
```bash
npm run lint
npm run build
npm start
```

---

## Authentication & Authority Credentials

- **Dedicated Login Route**: Navigate to **`#/login`** (or click **Sign In / Account** in the top bar, left sidebar, or mobile bottom bar).
- **Citizen Access**:
  - Sign in with any Google account via **Firebase Authentication**, or use the public citizen session to report and track issues immediately.
- **Ward Authority Access (`#/admin` & `#/login`)**:
  - **Provisioned Authority Master Key**:
    ```text
    NOVA-HALDIA-KEY-2026
    ```
  - **Firebase Google OAuth**: Sign in with an authorized Google account via the **Ward Authority Login** tab on `#/login` to unlock status transitions (`Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`) and audit logging.
