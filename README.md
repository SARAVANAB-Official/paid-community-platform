# Paid community platform

Full-stack app: **₹120 UPI payment** → admin (or mock) verification → **registration** with optional **referral codes**, **JWT** auth, and an **admin** panel for users and payments.

## Stack

- **Frontend:** React 18, Vite, React Router, Axios
- **Backend:** Node.js 18+, Express, Mongoose, JWT, bcryptjs, express-validator, Multer (payment screenshots), QR code for UPI URI
- **Database:** MongoDB

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally or a connection string

## Database schema (MongoDB collections)

### `users`

| Field           | Type     | Notes                                      |
|----------------|----------|--------------------------------------------|
| `_id`          | ObjectId |                                            |
| `name`         | String   | Required                                   |
| `email`        | String   | Unique, lowercase                          |
| `password`     | String   | bcrypt hash, `select: false` by default    |
| `referralCode` | String   | Unique, uppercase                          |
| `referredBy`   | String   | Referrer’s `referralCode` or null         |
| `referralsCount` | Number | Default 0                                  |
| `paymentApproved`| Boolean | **Must be true** to access dashboard       |
| `createdAt` | Date | From timestamps                             |

Indexes: `email`, `referralCode`.

### `payments`

| Field                   | Type     | Notes                                                    |
|-------------------------|----------|----------------------------------------------------------|
| `_id`                   | ObjectId |                                                          |
| `name`                  | String   | From payment submission                                  |
| `email`                 | String   | From payment submission                                  |
| `utr`                   | String   | **Unique**, validated with `/^[A-Z0-9]{12,18}$/`         |
| `screenshot`            | String   | Upload path/URL (`/uploads/payments/...`)                |
| `status`                | String   | `pending` \| `approved` \| `rejected` \| `suspicious`    |
| `amount`                | Number   | Default ₹120                                             |
| `createdAt`             | Date     | From timestamps                                          |

### `admins`

| Field       | Type     | Notes                           |
|------------|----------|---------------------------------|
| `_id`      | ObjectId |                                 |
| `email`    | String   | Unique                          |
| `password` | String   | bcrypt hash                     |
| `createdAt` / `updatedAt` | Date | From `timestamps: true` |

### Referral relationships

- New users may submit an optional **referral code** at registration (or open `/register?ref=CODE`).
- On successful registration, `referredBy` stores the referrer’s code and the referrer’s `referralsCount` is incremented by 1.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, ADMIN_JWT_SECRET, UPI_VPA, etc.
npm install
npm run dev
```

API: `http://localhost:5000` (health: `GET /api/health`).

On startup, a default admin is created if none exists (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`, or `admin@community.local` / `Admin123!`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`. Vite proxies `/api` to the backend.

Optional: copy `frontend/.env.example` to `.env` and set `VITE_API_URL` if the API is not on the same origin.

### 3. End-to-end flow

1. User opens **Payment**, scans UPI QR (config from `UPI_VPA` / `UPI_PAYEE_NAME`), pays ₹120, submits **transaction ID** (+ optional email).
2. **Admin** logs in at `/admin`, opens **Payments**, and **approves** the payment.
3. User **registers** with the same **email + UTR**.
4. User **logs in** and sees the **dashboard** (platform member count, referral stats, link).

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register after payment is `approved` |
| POST | `/api/auth/login` | — | User JWT |
| GET | `/api/auth/me` | User JWT | **Requires** `paymentApproved=true` |
| GET | `/api/payments/config` | — | UPI URI + QR data URL |
| POST | `/api/payments/submit` | — | Submit `multipart/form-data` with screenshot → `pending` |
| GET | `/api/payments/status` | — | Query `utr` |
| POST | `/api/admin/login` | — | Admin JWT (`role: admin`) |
| GET | `/api/admin/stats` | Admin | Counts |
| GET | `/api/admin/users` | Admin | Users + linked payment snippet |
| DELETE | `/api/admin/users/:id` | Admin | Delete user; adjusts referrer count if needed |
| GET | `/api/admin/payments` | Admin | All payments |
| PATCH | `/api/admin/payments/:id/verify` | Admin | Body: `{ "action": "approved" \| "rejected" \| "suspicious" \| "pending" }` |

## Security notes

- Use **strong** `JWT_SECRET` and `ADMIN_JWT_SECRET` in production.
- Replace UPI details with your real **VPA**; consider a payment gateway for automated verification.

## Project layout

```
paid-community-platform/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/seedAdmin.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/client.js
│       ├── context/AuthContext.jsx
│       ├── pages/
│       └── ...
└── README.md
```
