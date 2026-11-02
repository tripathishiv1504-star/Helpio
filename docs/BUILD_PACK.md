# HELPIO BUILD PACK (single file)

This one file contains everything needed to build Helpio: master instructions (Section A), the PRD (Section B), build rules (Section C), PRD addendum (Section D) and the ten build parts (Section E). Read Section A first and obey it exactly.

---

# SECTION A — MASTER INSTRUCTIONS (READ FIRST, OBEY EXACTLY)

You are building the Helpio web app from this file. You will work through the parts one at a time, in order, inside a new project folder `helpio/`.

## A1. Setup (do this once, before Part 1)
1. Create `helpio/` with empty `docs/`, `shared/`, `server/`, `client/`.
2. Copy Section B (PRD) verbatim into `docs/PRD.md`, then append Section D (Addendum) to its end.
3. Copy Section C (Rules) verbatim into `docs/RULES.md`.
4. Create `docs/PROGRESS.md` with a heading for Part 1 to Part 10, each marked `not started`, plus an empty `Blockers` heading.
5. Keep a copy of this file as `docs/BUILD_PACK.md`. Do not write any app code during setup.

## A2. How to execute the parts
- Work on exactly ONE part at a time, starting with Part 1 and ending with Part 10.
- While working on Part N, follow only Part N's instructions. Do not read ahead, do not build anything described in a later part, and do not touch files outside Part N's ownership list (see Rules R1).
- When Part N is finished: run lint and tests, check every item in that part's "Done when", append only that part's section to `docs/PROGRESS.md` (files created, endpoints, how to verify) and mark it `done`.
- If every "Done when" item passes, continue to Part N+1 automatically.
- If any item fails and you cannot fix it inside Part N's own files, write the problem under `Blockers` in `docs/PROGRESS.md`, STOP, and tell me what failed. Do not "fix" it by editing another part's files.

## A3. Checkpoints (stop and wait for me)
Stop and wait for me to type `continue` after finishing Part 2, Part 6 and Part 9. At each checkpoint, give me a short summary: what was built, how to run it, and anything unclear.

## A4. Resuming
If this task is restarted or interrupted, read `docs/PROGRESS.md`, find the first part not marked `done`, and resume from the start of that part. Never redo a part marked `done`.

## A5. Changes after a part is done
Never rewrite or re-run a finished part. Any later change is a Patch (template in Section F) that may only touch the target part's files.

---

# SECTION B — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Helpio — Product Requirements Document
Hyperlocal Help & Workforce Platform · MVP web app · v1.0
Items marked (assumed) are decisions where the source presentation was silent.

### 1. Overview
Helpio connects people who need help with nearby, available and trusted helpers. A user posts a need (service, location, time, urgency). The platform matches it to suitable helpers, one helper accepts, completes the work, and the interaction ends in payment and rating.
- Tagline: "Local help. Just a tap away."
- Pillars: Instant · Local · Skilled · Trusted
- Lifecycle: Discover → Match → Connect → Work → Rate

### 2. Problem and goals
Problem: Local help is found through WhatsApp groups, personal contacts and manual searching. Requests get buried, comparing skills, availability and reliability is slow, and there is no single structured way to reach nearby help.

Goals:
- G1 Cut the time between needing help and a helper accepting.
- G2 One structured request (service, location, time, urgency) instead of scattered messages.
- G3 Build trust through helper verification, ratings and past performance.
- G4 Earn transaction-based revenue from paid services.
- G5 Give admins full oversight of users, helpers, orders, payments and disputes.

MVP success metrics: median time to first acceptance, request-to-completion rate, average rating, repeat-user rate, total paid volume and commission earned.

### 3. Roles
- User: posts requests, chats, pays, rates.
- Helper: registers, sets skills, location and availability, accepts or rejects requests, completes work, tracks earnings.
- Admin: verifies helpers, manages categories, monitors requests and payments, resolves disputes.
One account can be both User and Helper (a `roles` array). Admin accounts are created by seed only. (assumed)

### 4. Service areas
| Area | Examples | Pricing type |
|---|---|---|
| Community Help | Students, elderly, neighbours, everyday needs | Free (optional tip) |
| Professional Help | Electrician, plumber, carpenter, technician | Fixed visit charge |
| Instant Local Workforce | Short or urgent tasks | Hourly or per visit |
Each area contains subcategories, managed by Admin.

### 5. Core flow
1. User has a need and opens Helpio.
2. Post: service, location, time, urgency.
3. Match: system finds nearby, skilled, available helpers.
4. Helper receives the request, accepts or rejects.
5. Service: user and helper communicate, helper does the task.
6. Pay / Rate: after completion, payment (if paid) and ratings.

### 6. Functional requirements
6.1 User side
- U1 Register, log in, edit profile.
- U2 Post a request: category, subcategory, description, location (map pin, typed address or device location), time (ASAP or scheduled), urgency (Normal / Urgent / Emergency), pricing type and optional budget.
- U3 See live request status and, after acceptance, the helper's details.
- U4 Chat with the helper once accepted.
- U5 Cancel a request before work starts.
- U6 Confirm completion, pay (if paid), rate the helper.
- U7 View request history.
- U8 Report a problem or file a complaint on a request.

6.2 Helper side
- H1 Register and complete onboarding.
- H2 Select skills and services offered, with a rate per skill.
- H3 Set base location and service radius (km).
- H4 Set availability: online/offline toggle plus weekly schedule.
- H5 Receive nearby requests as offers with a countdown.
- H6 Accept or reject an offer.
- H7 Mark work started and completed.
- H8 Earnings dashboard (total, pending, per job).
- H9 Reputation: average rating, count, completion rate.

6.3 Admin
- A1 User management: list, search, suspend or reactivate.
- A2 Helper verification: approve or reject pending helpers with a note.
- A3 Categories: create, edit, disable categories and subcategories.
- A4 Requests and orders: monitor all requests, filter by status.
- A5 Payments: view transactions, set commission percentage.
- A6 Complaints and disputes: review, resolve, record resolution.
- A7 Ratings and reports: moderate abusive reviews.
- A8 Dashboard: totals and recent activity.

### 7. Trust and matching engine
Four signals: Location, Skill, Availability, Reputation.
Input: category + subcategory, location, time, urgency.

Step 1, hard filters: helper is approved, online, offers the requested skill, is inside min(helper radius, request search radius) and is available for the requested time.

Step 2, score (0 to 1). Normal urgency: 0.40 proximity + 0.30 reputation + 0.20 availability fit + 0.10 reliability. Urgent and Emergency: 0.55 proximity + 0.20 reputation + 0.15 availability + 0.10 reliability. (assumed weights, kept in one config file)
- proximity = 1 − distance ÷ search radius
- reputation = smoothed average rating ÷ 5 (new helpers start at a 3.5 prior worth 5 ratings)
- availability fit = 1 if online now for ASAP, 0.7 if a scheduled slot fits
- reliability = completed ÷ accepted jobs (0.8 for new helpers)

Step 3, offer: send the request to the top 5 helpers at once. First to accept wins; the others see "already taken".

Step 4, expiry: offer lifetime Emergency 5 min, Urgent 10 min, Normal 30 min. If nobody accepts, widen the radius by 50% once and offer to the next 5. If still nobody, mark the request EXPIRED and notify the user.

The engine is a pure function module (inputs in, ranked list out) with unit tests.

### 8. Request status machine
POSTED → OFFERED → ACCEPTED → IN_PROGRESS → COMPLETED → PAID → RATED
- CANCELLED: from POSTED, OFFERED or ACCEPTED, by the user.
- EXPIRED: from OFFERED when no helper accepts after the retry.
- DISPUTED: from COMPLETED or PAID when a complaint is filed.
- Free community jobs skip PAID: COMPLETED → RATED.
All legal transitions live in one file; no other code changes status directly.

### 9. Data model
- User: name, email, phone, passwordHash, roles[], status (active/suspended), createdAt.
- HelperProfile: user, bio, skills[{category, subcategory, rate, rateType}], location (GeoJSON Point), radiusKm, isOnline, weeklyAvailability[{day, start, end}], verificationStatus (pending/approved/rejected), verificationNote, stats{ratingAvg, ratingCount, completed, accepted, offered}, earningsTotal.
- Category: name, type (community/professional/instant), subcategories[], active.
- ServiceRequest: user, category, subcategory, description, location (GeoJSON + address text), asap, scheduledFor, urgency, pricingType (free/fixed/hourly), budget, status, helper, statusHistory[], searchRadiusKm, createdAt.
- Offer: request, helper, score, distanceKm, status (sent/accepted/rejected/expired/taken), expiresAt.
- Message: request, sender, text, createdAt.
- Payment: request, amount, platformFee, helperPayout, method, status (pending/paid/refunded), providerRef.
- Rating: request, from, to, stars (1–5), comment.
- Report: request, filedBy, against, reason, status (open/resolved), resolution.
- Notification: user, type, payload, read, createdAt.
- Setting: key/value, includes `commissionPercent` (default 10).
Geo fields use a 2dsphere index.

### 10. API surface
All routes under `/api`. Responses use `{ success, data, error }`.
- auth: POST /auth/register, POST /auth/login, GET /auth/me, PATCH /auth/me
- categories: GET /categories
- helpers: POST /helpers/onboard, GET/PATCH /helpers/me, PATCH /helpers/me/availability, PATCH /helpers/me/online, GET /helpers/me/earnings
- requests: POST /requests, GET /requests/mine, GET /requests/:id, POST /requests/:id/cancel
- offers: GET /offers/mine, POST /offers/:id/accept, POST /offers/:id/reject
- jobs: POST /jobs/:requestId/start, POST /jobs/:requestId/complete, GET/POST /jobs/:requestId/messages
- payments: POST /payments/:requestId/pay, GET /payments/mine
- ratings: POST /ratings/:requestId, GET /ratings/helper/:id
- reports: POST /reports
- notifications: GET /notifications, POST /notifications/:id/read
- admin: /admin/users, /admin/helpers, /admin/categories, /admin/requests, /admin/payments, /admin/reports, /admin/settings, /admin/stats

### 11. Screens
- Public: Landing (hero, how it works, service areas, CTA), Login, Register.
- User: Dashboard, Post Request, My Requests, Request Detail (status, helper, chat, pay, rate).
- Helper: Onboarding wizard, Helper Dashboard (online toggle, incoming offers, active job), Offers, Profile and Availability, Earnings.
- Admin: Overview, Users, Helper Verification, Categories, Requests, Payments, Disputes.
Mobile-first and responsive. Clean, friendly look with a location-pin motif.

### 12. Revenue model
Platform commission on paid services. Default 10%, editable by Admin. Example: ₹500 service → helper receives ₹450, Helpio retains ₹50. Free community help carries no fee. MVP payments run through a `PaymentProvider` interface with a simulated provider; a real gateway can replace it later without touching other code. (assumed)

### 13. Non-functional requirements
- Passwords hashed with bcrypt; JWT auth; role checks enforced on the server.
- Input validation on every endpoint; rate limiting on auth routes.
- Privacy: helpers see only an approximate area until they accept; exact address is revealed after acceptance.
- Typical API responses under 500 ms; nearby queries use the geo index.
- Consistent error format, structured logs, environment-based config.
- Accessible forms (labels, focus states, sufficient contrast).

### 14. Tech stack (assumed)
React + Vite + Tailwind CSS + React Router; Node.js + Express; MongoDB + Mongoose; Leaflet with OpenStreetMap; short polling every 5 seconds for chat and offers; Vitest or Jest for server logic.

### 15. Scope
In MVP: everything in sections 6 to 12. Out of MVP: native mobile apps, real payment settlement, document OCR or KYC, push notifications, multi-language, AI recommendations, subscriptions and ads.

### 16. Assumptions to confirm
1. Commission is 10% and editable. 2. Offers go to the top 5 helpers, first to accept wins. 3. Helper verification is manual by Admin. 4. Payments are simulated in the MVP. 5. Stack is React, Express, MongoDB. 6. Scoring weights are starting values.

---

# SECTION C — RULES (copy verbatim into docs/RULES.md)

R1 Ownership: a part edits only the folders named in its prompt. Never edit files owned by another part.
R2 Auto-registration: a server module lives in server/src/modules/<name>/ and its index.js exports { mountPath, router, service?, init? }. app.js loads every module and calls init() if present. A client feature lives in client/src/features/<name>/ and its routes.jsx exports an array of { path, element, roles, nav? }. The router and navbar load these automatically. Navbar widgets: any features/<name>/navWidget.jsx default export is rendered in the navbar. Never hand-edit app.js, the router or the navbar to add a feature.
R3 Frozen contracts: shared/constants.js, server/src/models/*, the response shape { success, data, error }, and the transition table in modules/requests/stateMachine.js. Changes are additive only (new field, new enum value). Never rename or delete.
R4 Request detail panels: any feature may add features/<name>/requestPanel.jsx whose default export is { id, order, visibleWhen(request, user), Component }. The request detail page loads them automatically.
R5 Only modules/requests/stateMachine.js changes request status. Other modules call transition(requestId, toStatus, actor, meta).
R6 Controllers stay thin; logic lives in <module>.service.js. A module may call another module only through that module's index.js exports or through the event emitter.
R7 Finish every part by: running lint and tests, appending ONLY that part's section to docs/PROGRESS.md (files created, endpoints, how to verify), then moving on only as Section A allows.
R8 No refactors, renames or extra features outside the part's scope. If blocked, write it under "Blockers" in docs/PROGRESS.md and stop.
R9 Configuration through .env; keep .env.example current; no secrets in code.

Repo layout:
helpio/
  docs/ (PRD.md, RULES.md, PROGRESS.md, BUILD_PACK.md)
  shared/ (constants.js)
  server/src/ (app.js, server.js, config/, middleware/, models/, modules/<name>/, utils/, seed/)
  client/src/ (app/, components/ui/, lib/, features/<name>/)

---

# SECTION D — PRD ADDENDUM (append to docs/PRD.md)

- ServiceRequest also has `finalAmount` (Number, set by the helper on completion for paid jobs).
- Event names on the internal emitter (server/src/modules/requests/events.js): `request:posted`, `status:changed`, `offer:created`, `message:created`.
- DISPUTED may transition (admin only) to PAID, RATED or CANCELLED.
- Rating the helper moves a request PAID→RATED (or COMPLETED→RATED for free jobs). The helper rating the user is optional and does not change status.

---

# SECTION E — THE PARTS

## PART 1 — Scaffold, design system, landing page
Read docs/PRD.md and docs/RULES.md. You own: root configs, shared/, server/src/{app.js,server.js,config,utils,middleware/errorHandler.js,middleware/validate.js}, client/src/{app,components/ui,lib}, client/src/features/landing.

SERVER (Node + Express, ES modules)
- app.js: helmet, cors, JSON body, request logging, module auto-loader (scan modules/*/index.js, mount at /api + mountPath, call init() if exported), /api/health, 404 and error handlers.
- config/: env loader and MongoDB connection (Mongoose). utils/: ok(res,data), fail(res,status,message), asyncHandler, haversineKm(a,b). middleware/validate.js: schema validation helper (zod). A small rate-limit helper.
- shared/constants.js: ROLES, URGENCY, REQUEST_STATUS (all states in PRD section 8), PRICING_TYPE, CATEGORY_TYPE, OFFER_STATUS, PAYMENT_STATUS, VERIFICATION_STATUS, REPORT_STATUS.

CLIENT (React + Vite + Tailwind + React Router)
- Alias @shared to ../shared. Tailwind theme tokens for colors, radius, spacing in one config. Palette: calm teal primary, warm amber accent, neutral grays. Mobile-first.
- app/: router that loads every features/*/routes.jsx via import.meta.glob, AppLayout with navbar built from route `nav` metadata filtered by the user's role, navWidget slots, RequireRole guard, 404 page.
- lib/api.js (fetch wrapper: attaches token, unwraps { success, data, error }, throws readable errors). lib/session.js (getUser, getToken, setSession, clearSession, useSession hook, persisted in localStorage).
- components/ui: Button, Input, Select, Textarea, Card, Badge, StatusBadge (maps REQUEST_STATUS to colors), Modal, Spinner, EmptyState, Toast, PageHeader, LocationPicker (Leaflet + OpenStreetMap; returns { lat, lng, address }, supports "use my location"), MapView.
- features/landing: route "/" with hero ("Local help. Just a tap away."), three value chips (Nearby Help, Trusted Helpers, Quick Service), How it works (Post, Match, Connect, Work, Rate), the three service areas, a "Become a helper" call to action, footer.
Do not build login, requests or any other feature.

Done when: both apps start with one command each; /api/health responds; landing page renders on mobile and desktop; a temporary modules/demo/index.js auto-mounts (then remove it).

## PART 2 — Data models, indexes, seed
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/models/*, server/src/seed/*, server/src/modules/categories.

- Create Mongoose models for every entity in PRD section 9 (User, HelperProfile, Category, ServiceRequest, Offer, Message, Payment, Rating, Report, Notification, Setting) with exactly those field names, plus ServiceRequest.finalAmount from the addendum. Use enums from shared/constants.js. Timestamps on all.
- Indexes: 2dsphere on HelperProfile.location and ServiceRequest.location; User.email unique; ServiceRequest {status, createdAt}, {user}, {helper}; Offer {request, helper} unique; Rating {request, from} unique.
- models/index.js exports all models.
- modules/categories: GET /api/categories (public) returns active categories grouped by type with subcategories.
- Seed script `npm run seed` (idempotent): one admin (email and password from env), Setting commissionPercent=10, categories with sample subcategories (Community: student help, elderly care, neighbour help, errands; Professional: electrician, plumber, carpenter, technician; Instant workforce: cleaning, moving help, delivery help, event help), and 8 demo helpers (approved, online) spread around a center point read from SEED_CENTER_LAT / SEED_CENTER_LNG. Do not hard-code a city.
No auth or other routes.

Done when: `npm run seed` runs twice without duplicates; GET /api/categories returns grouped data; geo queries return the seeded helpers.
CHECKPOINT: stop and wait for me to type `continue`.

## PART 3 — Authentication and session
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/auth, server/src/middleware/auth.js, client/src/features/auth.

SERVER
- POST /auth/register {name,email,phone,password,wantsToHelp}: roles = ["user"] or ["user","helper"]. POST /auth/login. GET /auth/me. PATCH /auth/me (name, phone, password change).
- bcrypt hashing, JWT (7 days), suspended users cannot log in, login rate-limited, validation with zod.
- middleware/auth.js exports requireAuth, requireRole(...roles), optionalAuth. Admin role is never creatable through register.
CLIENT
- Login and Register pages using components/ui, lib/api and lib/session. Public routes with no nav entry.
- features/auth/redirects.js: after login, admin goes to /admin, helper-only intent to /helper, everyone else to /dashboard.
- Profile page at /profile (all roles).
Do not create dashboards.

Done when: register, login, refresh persistence and logout work; a normal user hitting an admin route is blocked on both client and server.

## PART 4 — Helper onboarding, profile, availability
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/helpers, client/src/features/helper.

SERVER (all require role helper)
- POST /helpers/onboard (creates HelperProfile with verificationStatus=pending), GET and PATCH /helpers/me, PATCH /helpers/me/availability (weekly schedule), PATCH /helpers/me/online (only allowed when verificationStatus=approved), GET /helpers/me/earnings (reads Payment documents; zeros if none).
- Skills must reference active categories and subcategories; rate and rateType required per skill.
CLIENT
- Onboarding wizard in 4 steps: skills and rates; base location and service radius (LocationPicker); weekly availability; review and submit.
- /helper dashboard: verification status banner (pending, approved, rejected with note), online toggle (disabled until approved), key stats (rating, completed jobs).
- /helper/profile, /helper/availability, /helper/earnings (totals and per-job list).
- Nav entries for role helper. Do not build offers or job pages.

Done when: a new helper can complete onboarding and sees "pending"; after the seed admin approves in the database, the online toggle works.

## PART 5 — Service requests and status machine
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/requests (including stateMachine.js and events.js), client/src/features/requests.

SERVER
- events.js: a shared EventEmitter exported for all modules (event names from the addendum).
- stateMachine.js: one transition table for every legal move in PRD section 8 (including DISPUTED to PAID, RATED, CANCELLED for admin). Export transition(requestId, toStatus, actor, meta): validates actor and move, appends statusHistory, saves, emits `status:changed`. Throw a clear error on illegal moves. Unit-test the whole table.
- POST /requests (user): validate category and subcategory, description, location, asap or future scheduledFor, urgency, pricingType, optional budget. Save with status POSTED and emit `request:posted`. Do NOT do any matching here.
- GET /requests/mine, GET /requests/:id (owner, assigned helper, offered helper, or admin), POST /requests/:id/cancel (owner; from POSTED, OFFERED or ACCEPTED).
- Expose a service function to set finalAmount on a request (used later by the jobs module).
- serializeRequestFor(request, viewer): helpers who are not the assigned helper see rounded coordinates and no street address; the assigned helper sees everything once status is ACCEPTED or later.
CLIENT
- /dashboard (user): "Post a need" call to action and recent requests.
- /requests/new: form with category cards for the three service areas, subcategory, description, LocationPicker, ASAP or schedule, urgency, pricing type, budget.
- /requests: list with status badges. /requests/:id: detail page that renders every features/*/requestPanel.jsx sorted by `order` and filtered by visibleWhen. Provide two panels yourself: Summary and StatusTimeline.
Do not implement matching, chat, payment or rating.

Done when: a user can post and cancel a request; the request stays POSTED (no matcher exists yet); the transition table tests pass.

## PART 6 — Matching engine and offers
Read docs/PRD.md (section 7 especially), docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/matching, client/src/features/offers.

SERVER
- engine.js: PURE functions, no database access. rank(request, helpers, now) applies the hard filters and the scoring formula from PRD section 7, with weights and expiry times in config.js. Returns the sorted list with score and distanceKm.
- Unit tests for filters, each score component, urgency weight switch, radius widening and tie-breaks.
- service: on `request:posted` find candidates (geo query), call rank, create Offers for the top 5, call transition(POSTED→OFFERED), emit `offer:created` per offer.
- Routes: GET /offers/mine (helper), POST /offers/:id/accept, POST /offers/:id/reject. Accept must be atomic: only one helper can win; the request's helper is set, that offer becomes accepted, the rest become `taken`, then transition(OFFERED→ACCEPTED). Update helper stats counters.
- init(): a worker every 15 seconds expires old offers. When all offers are rejected or expired, widen the radius by 50% once and offer to the next 5; if still none, transition to EXPIRED.
CLIENT
- /helper/offers (nav for helper): live list (poll every 5 s) of incoming offers with distance, urgency, approximate area, countdown, Accept and Reject.
- requestPanel.jsx "MatchStatus" for the request owner: searching, number of helpers contacted, accepted helper summary or expired message.
Do not edit the requests module.

Done when: posting a request creates offers for seeded helpers; two helpers accepting at once yields exactly one winner; engine tests pass.
CHECKPOINT: stop and wait for me to type `continue`.

## PART 7 — Job lifecycle and chat
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/jobs, client/src/features/jobs.

SERVER
- POST /jobs/:requestId/start (assigned helper): transition ACCEPTED→IN_PROGRESS.
- POST /jobs/:requestId/complete (assigned helper): body { finalAmount? } required for paid pricing types; transition IN_PROGRESS→COMPLETED and store finalAmount using the function exposed by modules/requests (if none is exposed, write a Blocker and stop).
- GET and POST /jobs/:requestId/messages: only the request owner and the assigned helper, only while status is ACCEPTED through PAID. Emit `message:created`. Rate-limit and trim text to 1000 characters.
CLIENT
- requestPanel "Chat" (poll every 5 s, auto-scroll, shows nothing before acceptance).
- requestPanel "WorkControls" for the helper: Start job, Complete job (asks for final amount on paid jobs). Also show the exact address to the assigned helper.
- /helper/jobs (nav for helper): active and past jobs.
Do not implement payment or rating.

Done when: both sides can chat only after acceptance; start and complete drive the status exactly per the state machine.

## PART 8 — Payments, commission, earnings, ratings
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/payments, server/src/modules/ratings, client/src/features/payments, client/src/features/ratings.

SERVER
- payments/provider.js: PaymentProvider interface { charge(amount, meta) } with a simulated provider that always succeeds, selectable by env.
- POST /payments/:requestId/pay (request owner, status COMPLETED, paid pricing only): amount = finalAmount; platformFee = round(amount × commissionPercent / 100) using the Setting value; helperPayout = amount − platformFee. Create the Payment, add helperPayout to HelperProfile.earningsTotal, then transition COMPLETED→PAID. GET /payments/mine for both roles.
- ratings: POST /ratings/:requestId {stars 1-5, comment}. Owner rating the helper is allowed at PAID (paid jobs) or COMPLETED (free jobs) and then transitions to RATED; update HelperProfile.stats.ratingAvg and ratingCount incrementally. The helper may rate the user once after COMPLETED. One rating per direction. GET /ratings/helper/:id.
CLIENT
- requestPanel "Pay" for the owner when payable: amount, fee breakdown and a Pay button.
- requestPanel "Rating" for both sides when allowed: star input and comment.
- Show a helper's rating summary on the request detail for the owner.
Do not edit the helpers module; its earnings endpoint already reads Payment documents.

Done when: a ₹500 job at 10% pays out ₹450 and keeps ₹50; a free job skips payment; rating updates the helper's average exactly once per request.

## PART 9 — Admin panel, reports and disputes
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/admin, server/src/modules/reports, client/src/features/admin, client/src/features/reports.

SERVER (admin routes require role admin)
- /admin/stats (counts, paid volume, commission earned, requests by status), /admin/users (list, search, suspend and reactivate), /admin/helpers (pending list, approve or reject with a note), /admin/categories (create, edit, disable categories and subcategories), /admin/requests (filter by status), /admin/payments, /admin/settings (read and update commissionPercent), /admin/reports (list, resolve with a resolution note).
- reports: POST /reports (owner or assigned helper of a request) creates a Report. If the request is COMPLETED or PAID, also transition to DISPUTED. Resolving a report lets the admin choose the target status allowed from DISPUTED.
CLIENT
- /admin with sidebar pages: Overview, Users, Helper Verification, Categories, Requests, Payments, Disputes, Settings. Tables with search and status filters, confirm dialogs for suspend and reject.
- requestPanel "Report a problem" for owner and helper once a job is accepted.
Do not change any other module.

Done when: admin can approve a pending helper, change commission, suspend a user, and resolve a dispute; non-admins get 403.
CHECKPOINT: stop and wait for me to type `continue`.

## PART 10 — Notifications, end-to-end test, release
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md. You own: server/src/modules/notifications, client/src/features/notifications, server/tests/e2e, README.md, deployment config.

- notifications: subscribe in init() to `status:changed`, `offer:created` and `message:created` and create Notification documents for the right users. GET /notifications, POST /notifications/:id/read. navWidget.jsx bell with unread count (poll every 15 s) and a dropdown.
- server/tests/e2e: one automated API test of the full flow: register user and helper, admin approves helper, helper goes online, user posts, helper accepts, start, complete, pay, both rate, status ends RATED. Add a second test for reject, expiry and EXPIRED.
- BUG-FIX MODE: if the e2e test fails because of a defect in an earlier part, make the smallest possible fix in that file, and list every such fix under "Cross-part fixes" in docs/PROGRESS.md. Make no other cross-part edits.
- README with setup, env variables, seed, run, test, and a short architecture note. Add a production build script and a basic deploy config (Dockerfile or platform file).

Done when: the e2e tests pass on a fresh database, the bell shows notifications for offers, acceptance and messages, and the README lets a new person run the project.
FINISH: give me a final summary and the exact commands to run the project.

---

# SECTION F — PATCH TEMPLATE (for changes after a part is done)

PATCH <n> — <short title>
Read docs/PRD.md, docs/RULES.md, docs/PROGRESS.md first.
Target part: <Part number>. You may edit only that part's files plus the files listed below.
Change: <what to change and why>
Allowed extra files: <none | list>
Contracts touched: <none | additive-only change to ...>
Steps: <numbered steps>
Do not: rename or delete anything, touch other parts, re-run or rewrite the original part.
Done when: <how to verify>. Then add a "Patch <n>" note to docs/PROGRESS.md and stop.
