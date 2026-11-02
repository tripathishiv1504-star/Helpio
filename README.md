# Helpio — Hyperlocal Help & Workforce Platform

[![CI/CD Pipeline](https://github.com/actions/workflows/status/helpio/ci.yml?branch=main&label=CI%2FCD%20Tests&logo=github)](https://github.com)
[![Node.js Version](https://img.shields.io/badge/node-v18%2B%20%7C%20v20%2B-brightgreen?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose-green?logo=mongodb)](https://mongodb.com)
[![Deployed with Vercel](https://img.shields.io/badge/Deployed%20with-Vercel-black?logo=vercel)](https://vercel.com)

> **"Local help. Just a tap away."**  
> An instant, local, skilled, and trusted peer-to-peer workforce platform connecting people needing help with verified, nearby helpers across Community Help, Professional Help, and Instant Local Workforce.

---

## 📑 Table of Contents
- [🏗️ System Architecture](#️-system-architecture)
- [☁️ Production Cloud Deployment](#️-production-cloud-deployment)
  - [1. MongoDB Atlas (Cloud Database)](#1-mongodb-atlas-cloud-database)
  - [2. Render / Railway (Backend API)](#2-render--railway-backend-api)
  - [3. Vercel (Frontend Client)](#3-vercel-frontend-client)
- [🔄 CI/CD Automation Workflow](#-cicd-automation-workflow)
- [🔑 Demo Credentials & Accounts](#-demo-credentials--accounts)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [🚀 Local Development Setup](#-local-development-setup)
- [📡 API Reference](#-api-reference)
- [🧪 Testing Suite](#-testing-suite)
- [🐳 Docker Deployment](#-docker-deployment)

---

## 🏗️ System Architecture

Helpio uses a modern, separated client-server decoupled architecture designed for high availability, low latency, and zero cold-start state synchronization:

```
                                  +-----------------------------+
                                  |     Vercel Edge Network     |
                                  |  (React 18 + Vite + Tailwind)|
                                  +--------------+--------------+
                                                 |
                                     HTTPS REST  | (VITE_API_URL)
                                                 v
                                  +-----------------------------+
                                  |    Render / Railway Node    |
                                  |   (Express + Matching Engine|
                                  |    + 15s Expiry Worker)     |
                                  +--------------+--------------+
                                                 |
                                     TLS Socket  | (MONGODB_URI)
                                                 v
                                  +-----------------------------+
                                  |      MongoDB Atlas M0       |
                                  | (GeoJSON 2dsphere Indexes,  |
                                  |  Users, Jobs, and Offers)   |
                                  +-----------------------------+
```

### Directory Structure:
```
helpio/
├── .github/workflows/    # Automated CI/CD (Tests & Build Checks)
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
    ├── vercel.json       # Production SPA route rewrite config
    └── src/
        ├── app/          # Dynamic router & navbar with auto-discovered nav items & widgets
        ├── components/ui # Reusable Tailwind UI components (Button, Modal, Leaflet picker, etc.)
        ├── lib/          # API fetch wrapper (dynamic VITE_API_URL) and session management
        └── features/     # Feature modules with auto-discovered routes, widgets, & panels
```

---

## ☁️ Production Cloud Deployment

### 1. MongoDB Atlas (Cloud Database)
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (Free M0 Shared Cluster).
2. Under **Security > Database Access**:
   - Add a database user (e.g. `helpio_admin`) and a secure password.
3. Under **Security > Network Access**:
   - Click **Add IP Address** > Select **Allow Access From Anywhere** (`0.0.0.0/0`) > Save.
4. Under **Deployment > Database**:
   - Click **Connect** > **Drivers** (Node.js).
   - Copy your connection string:
     ```
     mongodb+srv://helpio_admin:<password>@cluster0.abcde.mongodb.net/helpio?retryWrites=true&w=majority
     ```

### 2. Render / Railway (Backend API)
1. Sign in to [render.com](https://render.com) using your GitHub account.
2. Click **New +** > **Web Service** and choose your `helpio` repository.
3. Configure the service:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string from Step 1>`
   - `JWT_SECRET`: `<A secure random 32+ character string>`
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
5. Click **Deploy Web Service** and copy your live backend URL (e.g. `https://helpio-api.onrender.com`).
> **Note:** On first boot, the server automatically seeds the database with the admin account, categories, and test helpers!

### 3. Vercel (Frontend Client)
1. Sign in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** > **Project** and import your `helpio` repository.
3. Configure project settings:
   - **Root Directory**: Click **Edit** and select `client`.
   - **Framework Preset**: `Vite` (automatically detected).
4. Add the following **Environment Variable**:
   - `VITE_API_URL`: `<Your Render Backend URL from Step 2>` (e.g. `https://helpio-api.onrender.com`)
5. Click **Deploy**. Your site is now live at `https://your-project.vercel.app`!

---

## 🔄 CI/CD Automation Workflow

Helpio is configured with GitHub Actions (`.github/workflows/ci.yml`). Every commit and Pull Request pushed to `main` automatically runs:

1. **Backend Test Suite**:
   - Sets up Node.js v20 with dependency caching.
   - Installs server dependencies via `npm ci`.
   - Executes all 67 unit & integration tests covering state transitions, geospatial matching, payments, and admin auditing.
2. **Frontend Build Verification**:
   - Sets up Node.js v20.
   - Installs client dependencies via `npm ci`.
   - Runs `npm run build` (Vite) to ensure 0 bundle errors or missing assets.

---

## 🔑 Demo Credentials & Accounts

Once deployed (or after running `npm run seed` locally), the following accounts are immediately available:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@helpio.local` *(or `admin@helpio.com`)* | `AdminPassword123!` *(or `Admin123!`)* | Access to `/admin`: verify helpers, resolve disputes, view GMV & revenue metrics. |
| **Demo Helper (Verified)** | `helper1@helpio.local` *(or `helper.aarav@helpio.com`)* | `Password123!` *(or `Helper123!`)* | Access to `/helper` dashboard, toggle availability, receive matched offers at `/helper/offers`, and track earnings. |
| **Customer User** | Any registered email via `/register` | User choice | Post help requests, view live interactive map, choose helper offers, chat in real-time, pay and rate. |

---

## ⚙️ Environment Configuration

### Backend (`server/.env`):
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/helpio?retryWrites=true&w=majority
JWT_SECRET=production-secret-jwt-key-helpio-2026
JWT_EXPIRES_IN=7d
COMMISSION_PERCENT=10
PAYMENT_PROVIDER=simulated
ADMIN_EMAIL=admin@helpio.local
ADMIN_PASSWORD=AdminPassword123!
```

### Frontend (`client/.env`):
```env
VITE_API_URL=https://helpio-api.onrender.com
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+ (Node.js v20 LTS recommended)
- npm v9+

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/<YOUR_USER>/helpio.git
cd helpio

# 2. Install all dependencies
npm run install:all

# 3. Seed database (optional, runs automatically on in-memory server)
npm run seed

# 4. Start Development Servers
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📡 API Reference

All API routes are mounted under `/api`. Protected routes require `Authorization: Bearer <token>`.

| Route | Method | Description | Access |
| :--- | :---: | :--- | :--- |
| `/api/auth/register` | `POST` | Register a new user | Public |
| `/api/auth/login` | `POST` | Login and receive JWT token | Public |
| `/api/auth/me` | `GET` | Get current user profile | Authenticated |
| `/api/categories` | `GET` | List active service categories | Public |
| `/api/requests` | `POST` | Create a new help request | User |
| `/api/requests/:id` | `GET` | Get full details & status of request | Owner/Helper/Admin |
| `/api/requests/:id/cancel` | `PATCH` | Cancel active request | Owner/Admin |
| `/api/offers/mine` | `GET` | List offers sent to logged-in helper | Helper |
| `/api/offers/:id/accept` | `PATCH` | Helper accepts offer (creates Job) | Helper |
| `/api/offers/:id/decline` | `PATCH` | Helper declines offer | Helper |
| `/api/jobs/:id/start` | `POST` | Helper marks job in-progress | Assigned Helper |
| `/api/jobs/:id/complete` | `POST` | Complete job & release payout | Assigned Helper |
| `/api/jobs/:id/messages` | `GET, POST` | Direct chat between job participants | Participants |
| `/api/payments/pay` | `POST` | Process simulated escrow payment | Customer |
| `/api/ratings` | `POST` | Submit 1-5 star review | Customer / Helper |
| `/api/reports` | `POST` | File dispute or report | Customer / Helper |
| `/api/admin/metrics` | `GET` | Platform stats (GMV, active jobs) | Admin |
| `/api/admin/helpers/verify` | `PATCH` | Approve/reject helper verification | Admin |
| `/api/admin/reports/:id/resolve` | `PATCH` | Resolve dispute & refund/payout | Admin |
| `/api/health` | `GET` | System health check & uptime | Public |

---

## 🧪 Testing Suite

Helpio has a complete testing suite with 67 tests across 6 dedicated test files:

```bash
cd server
npm test
```

```
PASS tests/matchingEngine.test.js
PASS tests/stateMachine.test.js
PASS tests/jobs.test.js
PASS tests/paymentsAndRatings.test.js
PASS tests/adminAndReports.test.js
PASS tests/e2e.test.js

Test Suites: 6 passed, 6 total
Tests:       67 passed, 67 total
Snapshots:   0 total
Time:        ~12.5 s
```

---

## 🐳 Docker Deployment

To spin up Helpio with Docker:

```bash
docker compose up -d --build
```

Access the application at `http://localhost:5000`.

---

## 📄 License
ISC License © 2026 Helpio Platform.
