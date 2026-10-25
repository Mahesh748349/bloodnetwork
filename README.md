# LifeFlow — Emergency Blood Donation & Donor Matching System

A full-stack, production-ready MERN web application engineered to coordinate urgent blood donation requests with registered potential donors using MongoDB 2dsphere geospatial radius queries, real-time availability tracking, and automated multi-channel notifications.

> **Clinical & Legal Disclaimer:**  
> LifeFlow is a donor discovery and coordination network. It **does not** replace hospitals, clinical laboratories, blood banks, or medical compatibility testing. Matching blood groups does not guarantee biological compatibility. All blood transfusions, donor eligibility screenings, and cross-matching must be verified at certified medical facilities.

---

## 1. System Architecture & Tech Stack

```mermaid
graph TD
    Client["React + Vite Client<br/>(Tailwind CSS, Leaflet OpenStreetMap, Axios)"] -->|REST API + JWT Bearer| Server["Node.js + Express.js Backend"]
    Server -->|Mongoose ODM + 2dsphere Indexes| MongoDB[("MongoDB Atlas / Local MongoDB<br/>(Geospatial & Relational Data)")]
    Server -->|Nodemailer / Ethereal / SMTP| Mailer["Email Dispatch Service"]
    Server -->|Role Middleware| RBAC["Role-Based Access Control<br/>(Donor, Requester, Admin)"]
    Server -->|Audit Logger| Audit[("Audit Log Collection")]
```

- **Frontend:** React 19, Vite, Tailwind CSS v4, Leaflet & React-Leaflet, Lucide Icons, React Router v7, Axios.
- **Backend:** Node.js, Express.js, Mongoose 8+, JWT (JSON Web Tokens), bcryptjs, Helmet, Morgan, Express-Rate-Limit.
- **Geospatial Engine:** MongoDB GeoJSON `Point` coordinates (`[longitude, latitude]`) with `2dsphere` indexes and `$geoNear` aggregation.
- **Notifications:** Nodemailer with automated Ethereal development mailboxes and custom SMTP configuration.
- **Maps:** Leaflet with OpenStreetMap tiles (custom sharp HTML DivIcons for collection points and donor proximity pins).

---

## 2. Implemented Core Features

| Feature | Implementation Highlights |
|---|---|
| **1. Registration & Auth** | Secure password hashing via `bcryptjs`, JWT bearer authentication, session validation, input sanitization, and account deactivation. |
| **2. Donor Profiles** | Blood group categorization, GeoJSON coordinates, live availability toggle, contact preferences, and clinical verification tracking. |
| **3. Emergency Requests** | Blood group, required units, hospital location, urgency levels (`low`, `medium`, `high`, `critical`), and required-by deadlines. |
| **4. Rule-Based Matching** | Multi-tier matching: blood group compatibility matrix, `availabilityStatus: true` filter, configurable radius (5–100 km), distance ranking via `$geoNear`. |
| **5. Notifications** | In-app notification center and email notifications sent on request creation, direct invitations, and donor responses. |
| **6. Request Tracking** | Strict backend-validated lifecycle state machine: `open` &rarr; `donors_contacted` &rarr; `awaiting_responses` &rarr; `coordination_in_progress` &rarr; `fulfilled` (or `cancelled`). |
| **7. Map Interface** | Interactive Leaflet OpenStreetMap with search radius rings, hospital markers, and privacy-preserving donor proximity circles. |
| **8. Real-Time Analytics** | Live MongoDB aggregations computing fulfillment rates, response times, blood group distributions, and an administrative audit trail. |

---

## 3. User Roles & Access Control (RBAC)

1. **Donor (`donor`)**
   - Manage availability status with 1-click live toggle.
   - View relevant emergency requests matching their blood group in their vicinity.
   - Accept or decline emergency requests with optional notes.
   - View donation history and notifications.
   - Update location or deactivate profile.

2. **Requester (`requester`)**
   - Create emergency blood requests for hospitals and collection centers.
   - Discover nearby available donors using interactive radius slider and map.
   - Send emergency contact invitations to matched donors.
   - Track donor responses (contacted, accepted, declined).
   - Coordinate transfusion and transition request statuses.

3. **Blood Bank Administrator (`admin`)**
   - View live operational dashboard metrics computed from actual database records.
   - Review and verify donor eligibility with medical screening notes.
   - Manage reported or duplicate blood requests.
   - Inspect the immutable audit trail of administrative actions.

---

## 4. Quick Demo Accounts

Pre-seeded synthetic demo accounts ready for immediate testing:

| Role | Email | Password | Details |
|---|---|---|---|
| **Administrator** | `admin@bloodnetwork.org` | `admin123` | Dr. Evelyn Reed (Blood Bank Admin) |
| **Requester** | `dr.sharma@citycare.org` | `requester123` | Dr. Rajesh Sharma (City Care Hospital) |
| **Requester** | `sarah.requester@metrohealth.org` | `requester123` | Metro Emergency Trauma Center |
| **Donor (O+)** | `rahul.verma@example.com` | `donor123` | Rahul Verma (Central Bangalore, Available) |
| **Donor (A+)** | `priya.nair@example.com` | `donor123` | Priya Nair (Indiranagar, Available) |
| **Donor (O-)** | `sneha.rao@example.com` | `donor123` | Sneha Rao (Universal Donor, Jayanagar) |

---

## 5. Getting Started (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017` or a MongoDB Atlas connection URI.

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Configure Environment Variables
Create `.env` in the `server` directory (or use default configuration):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/blood_donation_db
JWT_SECRET=emergency_blood_matching_secret_key_change_in_production_2026
JWT_EXPIRE=30d
ADMIN_INVITE_KEY=admin_emergency_2026
CLIENT_URL=http://localhost:5173
```

### Step 3: Seed Synthetic Demo Data
```bash
cd server
node src/utils/seed.js
```

### Step 4: Run the Application
Open two terminals or run concurrently:

**Terminal 1 (Backend Server):**
```bash
cd server
node src/server.js
# Backend API runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite client runs on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 6. Automated Testing

Run the automated integration and unit test suite verifying authentication, RBAC restrictions, geospatial queries, request lifecycle state transitions, and database aggregations:

```bash
cd server
node tests/run-tests.js
```

**Expected Result:**
```
======================================
TEST SUMMARY: 18 PASSED, 0 FAILED
======================================
```

---

## 7. REST API Documentation

### Authentication
- `POST /api/auth/register` — Register a new donor or requester.
- `POST /api/auth/login` — Authenticate and receive a signed JWT token.
- `GET /api/auth/me` — Retrieve the currently authenticated user's profile.
- `POST /api/auth/deactivate` — Soft-deactivate an account and set availability to false.

### Donors
- `GET /api/donors/me` — Get donor profile (Donor only).
- `PATCH /api/donors/me` — Update donor profile and address (Donor only).
- `PATCH /api/donors/availability` — Quick toggle availability boolean (Donor only).
- `GET /api/donors/requests` — Get relevant active requests matching blood group (Donor only).
- `GET /api/donors/history` — Get completed donation history (Donor only).
- `GET /api/donors/nearby` — Geospatial discovery matching donors by coordinates & radius (Requester/Admin).

### Blood Requests
- `POST /api/requests` — Create an emergency blood request (Requester/Admin).
- `GET /api/requests` — List blood requests with search/status/urgency filters.
- `GET /api/requests/:id` — Get single request with hospital location and responses.
- `PATCH /api/requests/:id/status` — Validated state transition (`open` &rarr; `donors_contacted` &rarr; `awaiting_responses` &rarr; `coordination_in_progress` &rarr; `fulfilled`).
- `POST /api/requests/:id/cancel` — Cancel active request with closure reason.
- `POST /api/requests/:id/contact` — Dispatch invitations to matched donors.
- `GET /api/requests/:id/matched-donors` — Discover matched donors for a specific request.

### Donor Responses
- `POST /api/requests/:id/responses` — Donor accepts, declines, or marks unavailable (Donor only).
- `GET /api/requests/:id/responses` — View response roster for a request (Requester/Admin).

### Notifications
- `GET /api/notifications` — Fetch user notifications with unread count.
- `PATCH /api/notifications/:id/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all user notifications as read.

### Administration
- `GET /api/admin/dashboard` — Live aggregate statistics computed from database.
- `GET /api/admin/donors` — List donors for administrative clinical review.
- `PATCH /api/admin/donors/:id/verify` — Verify or reject donor eligibility with notes.
- `GET /api/admin/audit-logs` — Paginated audit logs of administrative actions.

---

## 8. Postman Collection

Import `postman_collection.json` located in the root repository directly into Postman to run pre-configured requests against all endpoints with environment variables.

---

## 9. Privacy & Security Practices

1. **Minimal Disclosure:** Exact donor coordinates and contact details are masked during open discovery. They are only disclosed after a donor accepts an invitation.
2. **MongoDB 2dsphere Indexes:** Coordinates are indexed in `[longitude, latitude]` order, ensuring sub-millisecond proximity queries.
3. **Audit Logging:** Every administrative verification, request cancellation, and status transition is recorded in `AuditLog`.
4. **Rate Limiting & Headers:** Express-rate-limit safeguards sensitive authentication routes, and Helmet provides HTTP header security.

---

## 10. Deployment Instructions

### Database (MongoDB Atlas)
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist network access (`0.0.0.0/0`).
3. Obtain the connection string `mongodb+srv://...` and set as `MONGODB_URI`.

### Backend (Render / Railway)
1. Link your GitHub repository to Render as a **Web Service**.
2. Root directory: `server`.
3. Build command: `npm install`.
4. Start command: `node src/server.js`.
5. Add environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`.

### Frontend (Netlify / Vercel)
1. Link your GitHub repository to Netlify.
2. Base directory: `client`.
3. Build command: `npm run build`.
4. Publish directory: `dist`.
5. Set environment variable: `VITE_API_URL=https://your-render-backend.onrender.com/api`.

---

## 11. College Project Deliverables Checklist

- [x] Complete frontend (React + Vite + Leaflet) and backend (Node + Express) source code.
- [x] MongoDB schemas with 2dsphere indexes and unique response constraints.
- [x] RESTful API endpoints with JWT authentication and role authorization.
- [x] Comprehensive synthetic seed script (`server/src/utils/seed.js`).
- [x] Automated backend integration tests (`server/tests/run-tests.js`).
- [x] Postman collection file (`postman_collection.json`).
- [x] Role-specific dashboards for Donors, Requesters, and Blood Bank Admins.
- [x] Medical disclaimer and privacy-compliant donor proximity matching.
