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

# SECTION D — PRD ADDENDUM (append to docs/PRD.md)

- ServiceRequest also has `finalAmount` (Number, set by the helper on completion for paid jobs).
- Event names on the internal emitter (server/src/modules/requests/events.js): `request:posted`, `status:changed`, `offer:created`, `message:created`.
- DISPUTED may transition (admin only) to PAID, RATED or CANCELLED.
- Rating the helper moves a request PAID→RATED (or COMPLETED→RATED for free jobs). The helper rating the user is optional and does not change status.
