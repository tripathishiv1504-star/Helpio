# Helpio — Hyperlocal Help & Workforce Platform

> **"Local help. Just a tap away."**  
> An instant, local, skilled, and trusted peer-to-peer workforce platform connecting people needing help with verified, nearby helpers across Community Help, Professional Help, and Instant Local Workforce.

---

## 🏗️ System Architecture

Helpio is built using a clean, modular architecture enforcing strict modular boundaries, frozen contracts, and dynamic auto-registration.

```
helpio/
├── docs/                 # PRD, Rules, Progress, and Build Specifications
├── shared/               # Shared constants (Roles, Urgency, Statuses, Categories)
├── server/               # Express + Mongoose API Backend
│   ├── src/
│   │   ├── config/       # Env loader and MongoDB connection (with memory fallback)
│   │   ├── middleware/   # JWT auth, Zod validation, rate limiting, error handling
│   │   ├── models/       # 11 core Mongoose entities
│   │   ├── modules/      # Auto-mounting feature modules
│   │   │   ├── admin/          # Admin oversight, metrics, and user management
│   │   │   ├── auth/           # Authentication, session, and JWT handling
│   │   │   ├── categories/     # Service areas and categories
│   │   │   ├── helpers/        # Helper onboarding, profiles, availability
│   │   │   ├── jobs/           # Job lifecycle (start, complete) and direct chat
│   │   │   ├── matching/       # Pure ranking engine, offers, and expiry worker
│   │   │   ├── notifications/  # Event-driven system notifications
│   │   │   ├── payments/       # Fee deduction (10%) and payout management
│   │   │   ├── ratings/        # Direction-aware rating aggregation
│   │   │   ├── reports/        # Dispute filing and admin resolution
│   │   │   └── requests/       # State machine, events, and request handling
│   │   └── seed/         # Idempotent platform seeder
│   └── tests/            # 67 unit & E2E tests covering every workflow
└── client/               # Vite + React 18 + Tailwind CSS Frontend
    └── src/
        ├── app/          # Dynamic router & navbar with auto-discovered nav items & widgets
        ├── components/ui # Reusable Tailwind UI components (Button, Modal, Leaflet picker, etc.)
        ├── lib/          # API fetch wrapper and session management
        └── features/     # Feature modules with auto-discovered routes, widgets, & panels
```

### Core Architecture Rules:
- **Strict Module Ownership**: Business logic is self-contained in `modules/<name>/<name>.service.js`. Modules interact solely via index exports or the central `EventEmitter`.
- **Deterministic State Machine**: Status changes occur strictly via `transition()` in `modules/requests/stateMachine.js`.
- **Dynamic Auto-Discovery**:
  - Server auto-mounts all `server/src/modules/*/index.js` at `/api + mountPath` and triggers `init()`.
  - Client auto-mounts all `client/src/features/*/routes.jsx`, nav items, `navWidget.jsx` navbar widgets (such as the Notification Bell), and `requestPanel.jsx` detail panels.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0+ (v20+ recommended)
- **npm**: v9.0.0+
- **MongoDB**: Standalone MongoDB instance, or rely on the built-in automatic `mongodb-memory-server` fallback.

### 1. Installation

```bash
# Clone the repository and enter the directory
cd helpio

# Install root dependencies and run full setup
npm run install:all
```

Or install individual packages:
```bash
# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

---

## ⚙️ Environment Variables

Copy `.env.example` in `server/` to `.env`:

```bash
cp server/.env.example server/.env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express server |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb://localhost:27017/helpio` | MongoDB connection URI (falls back to in-memory DB if unavailable) |
| `JWT_SECRET` | `helpio_secret_change_in_production_2026` | Secret key used for signing JWT auth tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `COMMISSION_PERCENT` | `10` | Platform service fee percentage on paid jobs |
| `PAYMENT_PROVIDER` | `simulated` | Payment gateway provider (`simulated`) |
| `ADMIN_EMAIL` | `admin@helpio.local` | Default administrator account email |
| `ADMIN_PASSWORD` | `AdminPassword123!` | Default administrator account password |

---

## 🌱 Database Seeding

Run the idempotent seed script to populate categories, platform settings, the default admin account, and 8 geographically distributed verified helpers:

```bash
cd server
npm run seed
```

---

## 🏃 Running the Application

### Development Mode (Concurrent)

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server starts on http://localhost:5000
# Responds to http://localhost:5000/api/health
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite dev server opens on http://localhost:5173
```

### Production Build

```bash
# Build frontend for production
cd client
npm run build

# Start production server
cd ../server
npm start
```

---

## 🧪 Testing

Helpio includes a comprehensive test suite of 67 unit and end-to-end integration tests:

```bash
cd server
npm test
```

### Test Suites Included:
- `tests/e2e.test.js`: Full happy path lifecycle from registration to completed rating, plus expiry and radius widening.
- `tests/stateMachine.test.js`: Validates all 20 legal/illegal status transitions and actor permissions.
- `tests/matchingEngine.test.js`: Pure deterministic candidate scoring, geo proximity, reputation, and radius widening.
- `tests/jobs.test.js`: Start/complete validations, fee recording, direct chat limits, and participant privacy.
- `tests/paymentsAndRatings.test.js`: Commission calculation (10% fee, 90% payout) and star rating average updates.
- `tests/adminAndReports.test.js`: Helper verification with notes, dispute creation (`DISPUTED`), and resolution.

---

## 🐳 Docker Deployment

Deploy Helpio using Docker Compose:

```bash
# Build and run containers in background
docker compose up -d --build

# View container logs
docker compose logs -f
```

The app will be available on port `5000`.

---

## 🔑 Demo Credentials

After running `npm run seed`:

- **Platform Administrator**:
  - Email: `admin@helpio.local`
  - Password: `AdminPassword123!`
  - Access: Portal at `/admin` (Review helpers, dispute resolution, commission settings)
- **Demo Helper**:
  - Email: `helper1@helpio.local`
  - Password: `Password123!`
  - Access: `/helper` & `/helper/offers`
- **Customer User**:
  - Register any new account at `/register` or post needs directly from `/dashboard`.

---

## 📄 License
ISC © 2026 Helpio Platform.
