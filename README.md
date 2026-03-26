<div align="center">

# Wander

**Discover authentic village experiences, matched to your personality.**

*Travel with purpose. Leave a lasting impact.*

---

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google)](https://ai.google.dev)

</div>

---

## What is Wander?

Wander is a full-stack travel recommendation platform that connects travelers with authentic village experiences tailored to their personality. Instead of generic tourism feeds, Wander runs each user through a 15-step Hidden Markov Model personality assessment — then surfaces experiences, hosts, and communities that genuinely match who they are.

Every booking contributes to a village's **Community Web Score (CWS)**, a readiness metric that tracks how well a community benefits from tourism. Wander turns travel into a regenerative act.

---

## Features

### Personality-Driven Matching
- 15-step onboarding quiz using swipe cards, audio reactions, scroll gestures, and emoji scenarios
- Custom **Hidden Markov Model (HMM)** computes a 5-dimensional personality vector
- Five archetypes: **Explorer · Connector · Restorer · Achiever · Guardian**
- Match scoring via dot-product similarity between personality and experience weights

### Personalized Discovery
- Browse experiences filtered by type, price, or best match
- 3D interactive globe (Three.js) for destination selection
- Dynamic data seeding: enter any location and Wander geocodes it, loads matching villages, and generates missing experiences on the fly with **Gemini 2.5 Flash**

### Community Impact (CWS)
- Every village has a **Community Web Score** (0–100) indicating tourism readiness
- Booking revenue is split transparently: host · community fund · cultural preservation · platform
- Users accumulate impact points, badges, and leaderboard rankings

### Group Travel Coordination
- Create or join travel groups
- Group personality is computed as the arithmetic mean of all member vectors
- Experiences scored for the entire group's collective fit
- Groups persisted server-side; members join via shared link

### Social & Sharing
- Friend profiles with personality vectors
- Profile sharing via parameterized URLs — no account required
- QR code generation for in-person profile exchange
- Interactive social graph visualization

### Interactive Map
- Leaflet-based village map with CWS color overlays
- Click any village to explore its experiences and host profiles

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS v4 |
| **State** | React Context + localStorage |
| **Animations** | Framer Motion |
| **3D / Globe** | Three.js, react-globe.gl |
| **Maps** | React Leaflet |
| **Charts** | Recharts |
| **AI / Generation** | Google Gemini 2.5 Flash |
| **Personality ML** | Custom HMM (TypeScript) |
| **Performance Engine** | C++ HTTP server (localhost:8081) |
| **Geocoding** | OpenStreetMap Nominatim |

---

## Project Structure

```
wander/
├── frontend/                  # Next.js application
│   ├── app/
│   │   ├── api/               # 10 serverless API routes
│   │   ├── discover/          # Main discovery interface
│   │   ├── experience/[id]/   # Experience detail page
│   │   ├── friends/           # Friend management & sharing
│   │   ├── graph/             # Social graph visualization
│   │   ├── group/[groupId]/   # Group discovery & consensus
│   │   ├── impact/            # Bookings, stats & leaderboard
│   │   ├── map/               # Interactive village map
│   │   ├── onboarding/        # 15-step personality quiz
│   │   ├── profile/           # User profile & badges
│   │   └── lib/
│   │       ├── store.tsx      # Global state (AppProvider)
│   │       ├── data.ts        # Core types & static data
│   │       ├── hmm.ts         # Hidden Markov Model
│   │       └── utils.ts       # Shared utilities
│   └── components/            # 19 reusable TSX components
│
├── engine/                    # C++ matching & graph engine
│   └── src/
│       ├── main.cpp           # HTTP server (port 8081)
│       ├── algorithms.cpp     # Matching & influence scoring
│       ├── graph.cpp          # Graph data structures
│       └── impact.cpp         # CWS computation
│
├── hmm/                       # Python HMM reference implementation
├── data/
│   ├── villages.json          # Village definitions
│   ├── experiences.json       # 1,000+ experience records
│   └── groups.json            # Persisted travel groups
└── scripts/                   # Data & utility scripts
```

---

## Pages & Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/onboarding` | 15-step HMM personality quiz |
| `/discover` | Main discovery interface with globe |
| `/experience/[id]` | Experience detail & booking |
| `/map` | Interactive Leaflet village map |
| `/profile` | Personality radar, badges, stats |
| `/friends` | Friend management & QR sharing |
| `/graph` | Social graph visualization |
| `/impact` | Bookings feed & impact leaderboard |
| `/group/[groupId]` | Group discovery & consensus view |

---

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/onboarding` | POST | Compute personality from HMM observations |
| `/api/match` | POST | Score experiences against personality vector |
| `/api/villages` | GET | Fetch village data |
| `/api/experiences` | GET | Fetch experience catalog |
| `/api/seed` | GET | Geocode location & seed data via Gemini |
| `/api/groups` | GET / POST | List or create travel groups |
| `/api/groups/[groupId]` | GET / PATCH | Group details / add member |
| `/api/book` | POST | Create booking & update impact metrics |
| `/api/leaderboard` | GET | Global community impact leaderboard |
| `/api/group-match` | POST | Score experiences for an entire group |

---

## Personality System

The HMM uses a **5-state, 24-observation** model:

| Archetype | Focus |
|---|---|
| Explorer | Unmarked paths, discovery, solitude |
| Connector | People, stories, human connection |
| Restorer | Stillness, nature, slow travel |
| Achiever | Challenge, summits, measurable progress |
| Guardian | Sustainability, giving back, preservation |

Each onboarding step records one of 24 observation types (image pairs, audio reactions, scroll gestures, emoji scenarios). The forward algorithm produces a probability vector across all 5 states — the dominant state becomes the user's archetype.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/BorbiAl/wander.git
cd wander/frontend

# Install dependencies
npm install

# Set up environment variables
cp ../.env.example ../.env
# Add your GEMINI_API_KEY to .env

# Start the development server
npm run dev
```

App runs at `http://localhost:3000`.

### Optional: C++ Engine

```bash
cd engine
make
./wander_engine   # Starts on localhost:8081
```

The Next.js API routes automatically fall back to JavaScript implementations if the C++ engine is unavailable.

---

## Architecture Notes

**Resilient by design** — every layer has a fallback:
- C++ engine unavailable → JavaScript matching
- No JSON data for location → Gemini generates it
- Gemini unavailable → precomputed experiences used
- No data for country → graceful empty state

**Privacy-first** — no user database. Profiles are encoded in URL parameters. Friend discovery is fully decentralized.

**Consistent typing** — TypeScript strict mode across frontend, API routes, and data models.

---

## Data Model

```typescript
// Core types (frontend/app/lib/data.ts)

type Village       = { id, name, lat, lng, region, cws, population, description, nearby, country? }
type Experience    = { id, villageId, name, type, price, duration, hostId, description, personalityWeights }
type Host          = { id, villageId, name, bio, rating, experienceIds }
type Booking       = { id, experienceId, villageName, amount, split, timestamp, cwsDelta }
type FriendProfile = { userId, displayName, vector, dominant, addedAt }
type StoredGroup   = { id, name, members, destination, createdAt }
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Generative AI API key (required for seeding) |
| `GOOGLE_PLACES_API_KEY` | Google Maps/Places integration (optional) |
| `DISABLE_HMR` | Set to `1` to disable webpack HMR (AI Studio compatibility) |

---

<div align="center">

Built with care for travelers who want their journeys to matter.

</div>
