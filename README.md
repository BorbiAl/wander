<div align="center">

<img src="image.png" alt="HackTUES 12" width="400"/>

# Wander

**Discover authentic village experiences, matched to your personality.**

*Travel with purpose. Leave a lasting impact.*

---

> **HackTUES 12** — *"Code to Care"* — themes: **Travel with Purpose** + **Beyond the City**
> 50 hours · March 2026 · Team WanderGraph
>
> **Boyan** — Python + HMM Engine &nbsp;·&nbsp; **Boris** — C++ Graph Engine + REST Bridge &nbsp;·&nbsp; **Velina** — React + Next.js Frontend

---

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google)](https://ai.google.dev)
[![C++](https://img.shields.io/badge/C%2B%2B-17-blue?logo=c%2B%2B)](https://isocpp.org)
[![Python](https://img.shields.io/badge/Python-3.11-yellow?logo=python)](https://python.org)

</div>

---

## What is Wander?

Wander is a full-stack travel recommendation platform that connects travelers with authentic village experiences tailored to their personality. Instead of generic tourism feeds, Wander runs each user through a **15-step Hidden Markov Model personality assessment** — then surfaces experiences, hosts, and communities that genuinely match who they are.

Every booking contributes to a village's **Community Web Score (CWS)**, a readiness metric that tracks how well a community benefits from tourism. Wander turns travel into a regenerative act.

Three processes form the backbone: a **C++17 graph engine** for high-speed PageRank matching, a **Python HMM service** for ML reference, and a **Next.js 15 frontend** that proxies between them and serves the UI.

---

## Features

### Personality-Driven Matching
- **15-step onboarding quiz** collecting 24 behavioral observations:
  - 6 SwipeCard image-pair choices (left/right nature/culture preference)
  - 3 AudioReactor soundscape reactions (slider 0–3)
  - 3 ScrollCard reading-depth tests (time-on-card)
  - 2 EmojiScenario instant-reaction prompts
  - 1 BudgetSlider comfort/spending preference
- Custom **Hidden Markov Model (HMM)** with 5 hidden states × 24 observation alphabet runs the Forward algorithm and returns a 5D personality vector
- Five archetypes: **Explorer · Connector · Restorer · Achiever · Guardian**
- Match scoring via dot-product of personality vector × experience `personalityWeights`

### Personalized Discovery
- Browse experiences filtered by type, village, and sort mode (Best Match / Lowest Price / Impact First)
- 3D interactive globe (Three.js + react-globe.gl) on the landing page for destination selection
- 70+ major cities hard-coded as globe nodes; full geocoding via Nominatim for any location
- "I'm Feeling Lucky" button picks a random destination
- Dynamic data seeding: enter any location → geocode → load matching villages within 150 km → generate missing experiences on the fly with **Gemini 2.5 Flash** and persist them

### Community Impact (CWS)
- Every village has a **Community Web Score** (0–100) updated on every booking
- Booking revenue split: **70% host · 15% community fund · 10% cultural preservation · 5% platform**
- Points formula: `10 + floor((100 - village_cws) * 0.5)` — lower-CWS villages earn more points
- Animated Sankey diagram shows money flow in real time after each booking
- Per-village CWS delta tracked; cumulative impact displayed as a line chart
- Live impact feed via **WebSocket** from the C++ engine to every connected browser

### Group Travel Coordination
- Create or join travel groups from the Friends page; invite via shared link
- Group personality is the L1-normalised average of all member vectors
- Group-aware experience scoring returns: group fit %, per-member fit %, minimum member score
- Sort modes: "Group fit first" vs "Everyone satisfied" (maximise minimum)
- Compatibility matrix shows pairwise personality fit % for every member pair
- Group page polls for new members every 5 seconds (real-time join detection)
- `GroupRadarOverlay` visualises all members' personality vectors overlaid on one chart

### Authentication
- OTP-based email login via Nodemailer — no passwords stored
- 6-digit code is SHA-256 hashed (`code:email`) before persisting to `data/otp.json`
- Timing-safe comparison on verify; OTP consumed on first successful use
- Rate limits: **5 sends / 10 min** per email, **10 verify attempts / 10 min** per email
- Session state (personality, bookings, friends, groups) auto-saved to server every 2 s when logged in and restored on next login
- `data/users.json` stores `{ email, userId, state, createdAt, updatedAt, eventsBefore, eventsAfter }`

### Social & Sharing
- Friend profiles encoded as base64 URL parameters — no account required
- QR code generation for in-person profile exchange
- Add friends by pasting their share link; remove at any time
- Interactive social graph page shows personality breakdown across your network

### Booking & Reflection
- Date selection (month/day/year inputs)
- Post-booking **Reflection Modal** captures three questions:
  1. What did you learn?
  2. Will you return? (yes/maybe/no)
  3. One thing that surprised you?
- Calendar export: Google Calendar, Outlook, Apple Calendar, Android

### Profile & Gamification
- Personality Radar (5-axis SVG) + stacked bar chart of all dimensions
- Stats: total experiences booked, regions explored, total EUR spent
- Badge grid of earned achievements
- Villages visited list with embedded mini-map
- Before/after life events timeline (auto-extracted from booking reflections)

### Interactive Map
- Full-screen Leaflet village map with CWS colour overlays
- Click any village to view description, CWS score, and available experiences
- "Show visited only" toggle filter
- CWS labels: Pioneer (<45) · Emerging · Established · Thriving

---

## Architecture

Three processes communicate via HTTP and WebSocket:

```
Browser
  │  WebSocket (ws://localhost:8081/ws)     HTTP polling fallback
  │                                          ↓
  └──── Next.js Frontend :3000 ──────► C++ Graph Engine :8081
                │                           (PageRank, Dijkstra,
                │                            CWS, WebSocket)
                └────────────────────► Python HMM :5000
                                           (Forward, Viterbi,
                                            Baum-Welch)
```

**Request flow (onboarding):**
1. User completes 15-step quiz → Frontend POSTs observations to `/api/onboarding`
2. Next.js runs local HMM (TypeScript) → personality vector
3. Next.js tries C++ `/graph/match` (1 s timeout) → Personalized PageRank → ranked experiences
4. Falls back to local JS dot-product scoring if C++ unavailable
5. Results rendered; user navigates to `/discover`

**Resilient by design — every layer has a fallback:**
- C++ engine unavailable → JavaScript matching
- No JSON data for location → Gemini generates it
- Gemini unavailable → pre-computed experiences used
- WebSocket unavailable → polls `/graph/village/:id` every 2 s

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, standalone output) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5.9 (strict mode) |
| **Styling** | Tailwind CSS v4 |
| **State** | React Context + localStorage (auto-persisted) |
| **Animations** | Framer Motion / Motion |
| **3D / Globe** | Three.js, react-globe.gl |
| **Maps** | React Leaflet + OpenStreetMap tiles |
| **Charts** | Recharts (line, bar, radar) |
| **AI / Generation** | Google Gemini 2.5 Flash (`@google/genai`) |
| **Personality ML** | Custom HMM — TypeScript (frontend) + Python (reference) |
| **Performance Engine** | C++17 HTTP server — cpp-httplib + nlohmann/json (header-only) |
| **Python HMM** | Flask 3 + NumPy (Forward, Viterbi, Baum-Welch from scratch) |
| **Auth** | OTP via Nodemailer (SMTP) |
| **Geocoding** | OpenStreetMap Nominatim |
| **Real-time** | WebSocket (C++ engine → browser) |
| **QR Codes** | `qrcode` npm package |

---

## Project Structure

```
wander/
│
├── frontend/                         # Next.js 15 application
│   ├── app/
│   │   ├── page.tsx                  # Landing page (globe, destination search)
│   │   ├── layout.tsx                # Root layout + AppProvider
│   │   ├── globals.css
│   │   │
│   │   ├── onboarding/page.tsx       # 15-step HMM personality quiz
│   │   ├── discover/page.tsx         # Experience browser (map + feed)
│   │   ├── experience/[id]/page.tsx  # Detail view + booking flow
│   │   ├── map/page.tsx              # Full-screen Leaflet village map
│   │   ├── profile/page.tsx          # Radar, badges, visit history
│   │   ├── friends/page.tsx          # Friend management + group creation
│   │   ├── group/[groupId]/page.tsx  # Group planning & consensus
│   │   ├── graph/page.tsx            # Personality signal breakdown
│   │   ├── impact/page.tsx           # CWS dashboard + leaderboard
│   │   │
│   │   ├── api/
│   │   │   ├── auth/route.ts         # User state save/load (GET/POST)
│   │   │   ├── auth/otp/route.ts     # OTP send + verify (POST)
│   │   │   ├── onboarding/route.ts   # HMM decode → personality (POST)
│   │   │   ├── match/route.ts        # Score experiences vs vector (POST)
│   │   │   ├── group-match/route.ts  # Group consensus scoring (POST)
│   │   │   ├── book/route.ts         # Booking + CWS update (POST)
│   │   │   ├── seed/route.ts         # Geocode + Gemini generate (GET)
│   │   │   ├── villages/route.ts     # Village catalog (GET)
│   │   │   ├── experiences/route.ts  # Experience catalog (GET, filterable)
│   │   │   ├── community/route.ts    # Community data (GET)
│   │   │   ├── leaderboard/route.ts  # Global leaderboard (GET)
│   │   │   └── groups/
│   │   │       ├── route.ts          # List / create groups (GET, POST)
│   │   │       └── [groupId]/route.ts# Get / update / delete group
│   │   │
│   │   └── lib/
│   │       ├── store.tsx             # AppContext + AppProvider (all state)
│   │       ├── data.ts               # Core types + static fallback data
│   │       ├── hmm.ts                # HMM Forward algo + matchScore
│   │       ├── utils.ts              # Lookup helpers + CWS formatting
│   │       ├── friendUtils.ts        # Profile URL encode/decode (base64)
│   │       ├── questionBank.ts       # Randomised 15-step question generator
│   │       ├── fileCache.ts          # In-memory JSON file cache (TTL)
│   │       ├── fileLock.ts           # File-lock for concurrent JSON writes
│   │       └── rateLimit.ts          # In-memory rate limiter
│   │
│   ├── components/
│   │   ├── SwipeCard.tsx             # Drag/click image-pair choice
│   │   ├── AudioReactor.tsx          # Audio player + 0-3 slider response
│   │   ├── ScrollCard.tsx            # Scrollable narrative + CTA choice
│   │   ├── EmojiScenario.tsx         # Scenario text + 3-emoji reaction
│   │   ├── BudgetSlider.tsx          # Budget range selector
│   │   ├── ExperienceCard.tsx        # Compact experience summary tile
│   │   ├── GroupExperienceCard.tsx   # Experience card with group-fit data
│   │   ├── PersonalityRadar.tsx      # 5-axis SVG radar chart
│   │   ├── GroupRadarOverlay.tsx     # Multi-member radar overlay
│   │   ├── VillageMap.tsx            # Leaflet map with CWS colour markers
│   │   ├── MarketingGlobe.tsx        # Three.js interactive 3D globe
│   │   ├── HyperRealisticGlobe.tsx   # High-fidelity globe variant
│   │   ├── SankeyDiagram.tsx         # Animated booking money-flow SVG
│   │   ├── ImpactFeed.tsx            # Booking history impact list
│   │   ├── CWSCounter.tsx            # Before/after CWS delta display
│   │   ├── Leaderboard.tsx           # Top users by points/bookings
│   │   ├── BadgeGrid.tsx             # Achievement badge display
│   │   ├── EventBeforeAfter.tsx      # Before/after travel event timeline
│   │   ├── ProfileQR.tsx             # QR code from share URL
│   │   ├── AuthModal.tsx             # Email OTP login/register flow
│   │   └── Navbar.tsx                # Top nav with active-page highlight
│   │
│   └── hooks/
│       ├── useImpactStream.ts        # WebSocket hook → C++ live feed
│       └── use-mobile.ts             # Responsive breakpoint hook (<768px)
│
├── engine/                           # C++17 graph & matching engine
│   ├── Makefile
│   ├── include/
│   │   ├── httplib.h                 # cpp-httplib (header-only)
│   │   └── json.hpp                  # nlohmann/json (header-only)
│   └── src/
│       ├── main.cpp                  # HTTP server + endpoints (port 8081)
│       ├── graph.hpp / graph.cpp     # PropertyGraph (nodes, edges, props)
│       ├── algorithms.hpp / .cpp     # PageRank, Personalized PageRank,
│       │                             # Dijkstra, Label Propagation
│       ├── impact.hpp / impact.cpp   # CWS calculation + money split
│       └── websocket.cpp             # WebSocket broadcast server
│
├── hmm/                              # Python HMM reference service
│   ├── requirements.txt              # flask, numpy
│   ├── app.py                        # Flask entry (port 5000)
│   └── hmm/
│       ├── algorithms.py             # forward(), viterbi(), baum_welch()
│       ├── model.py                  # load_params() / save_params()
│       └── params.json               # Pre-trained A(5×5), B(5×24), π(5)
│
├── data/
│   ├── villages.json                 # Village records (id, name, lat, lng,
│   │                                 # region, country, cws, population,
│   │                                 # description, nearby, traditions)
│   ├── experiences.json              # Experience records (id, village_id,
│   │                                 # title, type, price_eur, duration_h,
│   │                                 # description, personality_weights,
│   │                                 # host_id, host_name, host_bio, rating)
│   ├── groups.json                   # Travel groups (id, name, members[],
│   │                                 # destination, createdAt, events)
│   ├── users.json                    # Auth users (email, userId, state,
│   │                                 # createdAt, updatedAt, events)
│   └── otp.json                      # Active OTPs (email → {hash, expiresAt})
│
├── scripts/
│   └── seed_db.py                    # Database seeding utility
│
├── start.sh                          # Launch all 3 processes (Linux/macOS)
└── start.ps1                         # Launch all 3 processes (Windows)
```

---

## Pages & Routes

| Route | Purpose | Key Components |
|---|---|---|
| `/` | Landing — globe + destination selector | MarketingGlobe, destination autocomplete, "I'm Feeling Lucky" |
| `/onboarding` | 15-step HMM personality quiz | SwipeCard, AudioReactor, ScrollCard, EmojiScenario, BudgetSlider, PersonalityRadar |
| `/discover` | Experience browser with map | VillageMap, ExperienceCard, type/village/sort filters |
| `/experience/[id]` | Detail view + booking flow | Date selector, Reflection Modal, calendar export, host bio, personality match % |
| `/map` | Full-screen interactive village map | VillageMap, side panel, "visited only" toggle |
| `/profile` | Personal stats & badges | PersonalityRadar, BadgeGrid, EventBeforeAfter, visit history |
| `/friends` | Friend management + groups | ProfileQR, GroupRadarOverlay, group create/join |
| `/group/[groupId]` | Group discovery & consensus | GroupRadarOverlay, GroupExperienceCard, compatibility matrix, 5 s polling |
| `/graph` | Personality signal breakdown | PersonalityRadar, signal weights table |
| `/impact` | Community impact dashboard | SankeyDiagram, CWSCounter, ImpactFeed, Leaderboard, WebSocket live feed |

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth?email=&userId=` | Load saved user state + life events |
| POST | `/api/auth` (`save`/`autosave`) | Persist full user state to `users.json` |
| POST | `/api/auth/otp` (`send`) | Generate + email 6-digit OTP (rate-limited: 5/10 min) |
| POST | `/api/auth/otp` (`verify`) | Validate OTP, create/update user, return state (rate-limited: 10/10 min) |
| POST | `/api/onboarding` | Observations → HMM forward → personality vector + matched experiences |
| POST | `/api/match` | Personality vector → top 10 scored experiences (C++ or JS fallback) |
| POST | `/api/group-match` | Group vector + member vectors → group-scored experiences |
| GET | `/api/villages` | All villages (C++ engine → seed JSON → static fallback) |
| GET | `/api/experiences?id=&villageId=&type=&limit=&offset=` | Paginated, filtered experience catalog |
| GET | `/api/community` | Community and cultural data |
| GET | `/api/seed?location=&allowGenerate=1` | Geocode location → load/generate villages + experiences |
| POST | `/api/book` | Create booking, compute CWS delta + split + points |
| GET | `/api/leaderboard` | Global user leaderboard by impact points |
| GET | `/api/groups` | List all groups |
| POST | `/api/groups` | Create new group |
| GET | `/api/groups/[groupId]` | Get group details + members |
| PATCH | `/api/groups/[groupId]` | Update group destination |
| DELETE | `/api/groups/[groupId]` | Disband group |

### C++ Engine Endpoints (port 8081)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` |
| POST | `/graph/match` | Personality vector → Personalized PageRank → ranked experiences |
| POST | `/graph/book` | Record booking, update CWS, broadcast WebSocket event |
| GET | `/graph/villages` | All villages with current CWS deltas applied |
| GET | `/graph/experiences` | All experiences |
| GET | `/graph/leaderboard` | Top users by score |
| WS | `ws://localhost:8081/ws` | Real-time `IMPACT_UPDATE` events on every booking |

### Python HMM Endpoints (port 5000)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | HMM service status |
| POST | `/hmm/decode` | Observations → `{ personality_vector, dominant_type, state_path }` |
| POST | `/hmm/train` | Re-estimate A, B, π using Baum-Welch EM |

---

## Personality System

The HMM uses a **5-state × 24-observation** model:

| # | Archetype | Colour | Emoji | Focus |
|---|---|---|---|---|
| S0 | Explorer | `#C8F55A` | 🧭 | Unmarked paths, novelty, solitude, speed |
| S1 | Connector | `#F5A623` | 🤝 | People, festivals, food, cultural exchange |
| S2 | Restorer | `#60A5FA` | 🌿 | Stillness, nature, silence, slow travel |
| S3 | Achiever | `#F87171` | ⛰️ | Challenge, summits, deep reads, measurable goals |
| S4 | Guardian | `#34D399` | ♻️ | Sustainability, volunteering, eco-preservation |

**24 observations** (the emission alphabet):

| Steps | Type | Observations |
|---|---|---|
| 0–5 | SwipeCard image pairs | 12 obs (2 per pair: left or right) |
| 6–8 | AudioReactor soundscapes | 3 obs (slider 0–3 discretised) |
| 9–11 | ScrollCard reading depth | 3 obs (<2 s skip / 2–8 s read / >8 s deep) |
| 12–13 | EmojiScenario reactions | 6 obs (3 emoji options × 2 scenarios) |
| 14 | BudgetSlider | 3 obs (<30 € / 30–80 € / >80 €) |

**Algorithms implemented from scratch (no external ML libs):**
- **Forward** — `P(observations | model)` → normalised state probability vector
- **Viterbi** — most likely hidden state sequence (used for `state_path`)
- **Baum-Welch EM** — offline re-estimation of A, B, π (Python only)

**Matching formula:**
```
matchScore = dot(personalityVector, experience.personalityWeights)
             scaled by 3.5 → [0, 1]
percentageMatch = round(matchScore * 100)
```

**Group vector:**
```
groupVector = L1-normalise(sum(memberVectors))
```

---

## Data Model

```typescript
// Core types — frontend/app/lib/data.ts

type Village = {
  id: string; name: string; lat: number; lng: number;
  region: string; country?: string; cws: number;
  population: number; description: string; nearby: string[];
}

type Experience = {
  id: string; villageId: string; name: string;
  type: 'craft' | 'hike' | 'homestay' | 'ceremony' |
        'cooking' | 'volunteer' | 'folklore' | 'sightseeing';
  price: number; duration: number; hostId: string;
  description: string; personalityWeights: number[5];
}

type Host = {
  id: string; villageId: string; name: string;
  bio: string; rating: number; experienceIds: string[];
}

type Booking = {
  id: string; experienceId: string; villageName: string;
  amount: number; split: MonetarySplit; timestamp: string;
  cwsDelta: number;
}

type MonetarySplit = {
  host: number; community: number; culture: number; platform: number;
}

type PersonalityResult = {
  vector: [number, number, number, number, number]; // sums to 1
  dominant: 'Explorer' | 'Connector' | 'Restorer' | 'Achiever' | 'Guardian';
  dominantIndex: 0 | 1 | 2 | 3 | 4;
}

type FriendProfile = {
  userId: string; displayName: string;
  vector: number[5]; dominant: string; addedAt: string;
}

type StoredGroup = {
  id: string; name: string; members: StoredMember[];
  destination: string; createdAt: string;
  eventsBefore?: string[]; eventsAfter?: string[];
}

type StoredMember = {
  userId: string; displayName: string;
  vector: number[5]; dominant: string; joinedAt: string;
}

// Persisted to data/users.json
type User = {
  email: string; userId: string; state: AppState;
  createdAt: string; updatedAt: string;
  eventsBefore: string[]; eventsAfter: string[];
}

// Persisted to data/otp.json (ephemeral)
type OTPRecord = { hash: string; expiresAt: number; attempts: number; }
```

**Global app state** (`AppContext`):
```typescript
{
  observations: number[];           // quiz answers collected so far
  personality: PersonalityResult | null;
  matches: (Experience & { score: number })[];
  bookings: Booking[];
  userId: string;
  points: number;
  badges: string[];
  totalImpact: number;              // total EUR spent
  villagesVisited: string[];
  destination: string;
  seedStatus: 'idle' | 'loading' | 'done' | 'error';
  friends: FriendProfile[];
  activeGroupId: string | null;
  email: string | null;
}
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Google Gemini API key
- SMTP credentials for OTP email (optional — app works without auth)

### Frontend only (quickest start)

```bash
git clone https://github.com/BorbiAl/wander.git
cd wander/frontend
npm install
cp ../.env.example ../.env   # add GEMINI_API_KEY
npm run dev
```

App runs at `http://localhost:3000`. The C++ engine and Python HMM are optional — every route has a JavaScript fallback.

### Start all three processes

```bash
# Linux / macOS
./start.sh

# Windows PowerShell
./start.ps1
```

Launches in sequence:
1. **C++ engine** — `cd engine && make && ./wander_engine` → `:8081`
2. **Python HMM** — `cd hmm && python app.py` → `:5000`
3. **Next.js** — `cd frontend && npm run dev` → `:3000`

### C++ engine only

```bash
cd engine
make                     # g++ -std=c++17 -O2, no external deps
./wander_engine          # → localhost:8081
```

### Python HMM only

```bash
cd hmm
pip install -r requirements.txt   # flask, numpy
python app.py                     # → localhost:5000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes (for seeding) | Google Generative AI key for on-demand experience generation |
| `GOOGLE_PLACES_API_KEY` | No | Google Maps/Places integration |
| `SMTP_HOST` | No (for auth) | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default 587) |
| `SMTP_USER` | No | SMTP sender address / username |
| `SMTP_PASS` | No | SMTP password |
| `DISABLE_HMR` | No | Set to `1` to disable webpack HMR (AI Studio compatibility) |

---

## Key Design Patterns

**Graceful degradation** — C++ engine timeouts (1–2 s) → JavaScript fallback scoring. Gemini unavailable → precomputed data. WebSocket disconnected → 2 s polling.

**File safety** — all JSON writes use `withFileLock()` to prevent race conditions between concurrent API requests.

**Rate limiting** — in-memory rate limiter on OTP routes prevents brute-force and spam.

**State persistence** — full `AppContext` state serialises to `localStorage` on every change. When logged in, auto-saves to server every 2 s. State is restored from server on next login.

**Lazy loading** — `MarketingGlobe`, `SankeyDiagram`, `Leaderboard`, and other heavy components use `next/dynamic` with `ssr: false` to keep the initial bundle small.

**Privacy-first** — OTP auth requires only an email address. Friend profiles can be shared via URL without any account. No passwords are ever stored.

---

<div align="center">

Built with care for travelers who want their journeys to matter.

</div>
