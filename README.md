# Paid Community Platform - Frontend Only

**₹120 UPI payment** → admin (or mock) verification → **registration** with optional **referral codes**, **JWT** auth, and an **admin** panel for users and payments.

**🎯 Zero backend required!** Everything runs in the browser using localStorage.

## Stack

- **Frontend:** React 18, Vite, React Router
- **Database:** localStorage (browser storage)
- **Cryptography:** Web Crypto API (SHA-256, HMAC-SHA256)
- **QR Code:** qrcode library

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- No MongoDB needed!
- No backend server needed!

## Features

✅ **Complete payment flow** - QR code generation, payment submission, status tracking  
✅ **User authentication** - Registration, login, JWT tokens (browser-compatible)  
✅ **Admin panel** - Approve/reject payments, manage users, view dashboard stats  
✅ **Referral system** - Generate referral codes, track referrals  
✅ **Dark theme UI** - Beautiful, responsive design  
✅ **Zero backend dependencies** - Everything runs in the browser  

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

**Default Admin:**
- Email: `jagan@gmail.com`
- Password: `jagan7523`

## End-to-end flow

1. User opens **Payment**, scans UPI QR (config from `VITE_UPI_VPA` / `VITE_UPI_PAYEE_NAME`), pays ₹120, submits **UPI Reference Number**.
2. **Admin** logs in at `/admin`, opens **Payments**, and **approves** the payment.
3. User **registers** with the same **email + UPI Reference Number**.
4. User **logs in** and sees the **dashboard** (platform member count, referral stats, link).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/payment` |
| `/payment` | Payment page with QR code and form |
| `/payment/pending?utr=xxx` | Check payment status |
| `/register` | User registration (after payment approved) |
| `/login` | Member login |
| `/dashboard` | Member dashboard (protected) |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard (protected) |
| `/admin/users` | User management |
| `/admin/payments` | Payment approval/rejection |

## Environment Variables (Optional)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_JWT_SECRET=your-secret-key-here
VITE_ADMIN_JWT_SECRET=your-admin-secret-key-here
VITE_PAYMENT_AMOUNT=120
VITE_UPI_VPA=merchant@upi
VITE_UPI_PAYEE_NAME=Community
```

## Data Storage

All data is stored in your browser's `localStorage`:
- `pc_db_users` - User accounts
- `pc_db_payments` - Payment submissions
- `pc_db_admins` - Admin accounts
- `pc_user_token` - User authentication token
- `pc_admin_token` - Admin authentication token

**Note:** Clearing your browser data will delete all users, payments, and admin accounts.

## Architecture

```
frontend/src/
├── api/
│   └── client.js          # API interceptor (routes to controllers)
├── controllers/
│   ├── authController.js  # Registration, login, me
│   ├── paymentController.js # Payment config, submit, status
│   └── adminController.js # Admin login, users, payments, stats
├── db/
│   └── index.js           # localStorage database layer (replaces MongoDB)
├── utils/
│   └── jwt.js             # Browser-compatible JWT utility
├── context/
│   └── AuthContext.jsx    # User authentication context
├── pages/                 # All page components
└── App.jsx                # Route definitions
```

## How It Works

Instead of calling a backend API, this version:
- Stores all data (users, payments, admins) in `localStorage`
- Uses browser-compatible JWT signing/verification (Web Crypto API)
- Uses SHA-256 for password hashing (Web Crypto API)
- Intercepts all API calls and routes them to local controllers
- Mimics the exact same logic as a backend version

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guides for:
- Netlify
- Vercel
- GitHub Pages
- Render (Static Site)

## Security notes

- Use **strong** `VITE_JWT_SECRET` and `VITE_ADMIN_JWT_SECRET` in production.
- Replace UPI details with your real **VPA**.
- Password hashing uses SHA-256 (good for demo, use bcrypt for production backend).

## Project layout

```
paid-community-platform/
├── .gitignore
├── DEPLOYMENT.md
├── README.md
├── render.yaml
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── netlify.toml
    ├── README.md
    └── src/
        ├── api/client.js
        ├── context/AuthContext.jsx
        ├── controllers/
        ├── db/
        ├── pages/
        └── utils/
```

## License

MIT
