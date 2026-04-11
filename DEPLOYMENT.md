# Full Stack Deployment Guide - Paid Community Platform

This guide walks you through deploying the frontend (React/Vite) and backend (Node.js/Express) together on **Render's free tier** using a single GitHub repository.

---

## 📋 Overview

- **Frontend**: React (Vite) → Built and served by backend
- **Backend**: Node.js + Express API
- **Hosting**: Render (Free Tier)
- **Database**: MongoDB Atlas (Free Tier)
- **Result**: Single URL serving both frontend and API

---

## 🚀 Step-by-Step Deployment

### 1️⃣ Prepare Your MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0)
3. Create a database user
4. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/paid-community`
5. Whitelist all IPs: `0.0.0.0/0` (for free tier)

### 2️⃣ Initialize Git Repository

Open Command Prompt and run:

```bash
cd C:\Users\Sahan\OneDrive\Desktop\paid-community-platform
git init
git add .
git commit -m "Initial commit: full stack platform"
git branch -M main
```

### 3️⃣ Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new **public** repository (required for free Render tier)
3. Name it: `paid-community-platform`
4. **Do NOT** initialize with README (you already have one)
5. Copy the repository URL

### 4️⃣ Push Code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/paid-community-platform.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### 5️⃣ Deploy to Render

#### Option A: Using render.yaml (Automatic)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and configure everything
5. Set the required environment variables (see below)
6. Click **"Apply"**

#### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your repository
4. Configure:
   - **Name**: `paid-community-platform`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repo root)
   - **Runtime**: Node
   - **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install && mkdir -p dist && xcopy /E /I /Y ..\frontend\dist dist`
   - **Start Command**: `cd backend && npm start`
   - **Instance Type**: Free

---

## ⚙️ Environment Variables

Set these in Render Dashboard → Your Service → Environment:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `MONGO_URI` | Your MongoDB Atlas connection string | ✅ |
| `JWT_SECRET` | Auto-generated or custom secret | ✅ |
| `PORT` | `10000` (Render default) | ✅ |
| `CLIENT_ORIGIN` | `https://your-app-name.onrender.com` | ✅ |
| `SEED_ADMIN_EMAIL` | `admin@community.local` | Optional |
| `SEED_ADMIN_PASSWORD` | `Admin123!` (change after deploy) | Optional |

---

## 📁 Project Structure

```
paid-community-platform/
├── .gitignore              # Excludes node_modules, .env, dist, uploads
├── render.yaml             # Render auto-configuration
├── DEPLOYMENT.md           # This file
├── backend/
│   ├── server.js           # Express server + static file serving
│   ├── package.json        # Backend dependencies + build scripts
│   ├── config/             # Database configuration
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth, validation, etc.
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── utils/              # Helper functions
│   ├── scripts/            # Admin seed script
│   └── uploads/            # User uploads (not committed)
└── frontend/
    ├── package.json        # Frontend dependencies
    ├── vite.config.js      # Vite configuration
    ├── index.html          # React entry point
    ├── src/                # React components
    └── dist/               # Built files (not committed, copied to backend)
```

---

## 🔧 How It Works

### Build Process

1. **Render runs build command**:
   - Installs frontend dependencies
   - Builds React app (`npm run build` → `frontend/dist/`)
   - Installs backend dependencies
   - Copies `frontend/dist/` to `backend/dist/`

2. **Backend serves everything**:
   - API routes: `/api/*` → Express handlers
   - Uploads: `/uploads/*` → Static files
   - All other routes: → React app (`index.html`)

### Production Flow

```
User → https://your-app.onrender.com
  ├─ /api/auth/* → Authentication API
  ├─ /api/payments/* → Payment API
  ├─ /api/admin/* → Admin API
  ├─ /uploads/* → Uploaded files
  └─ /* → React SPA (frontend)
```

---

## ✅ Post-Deployment Checklist

- [ ] API Health Check: Visit `https://your-app.onrender.com/api/health`
  - Should return: `{"ok": true}`
  
- [ ] Frontend Loads: Visit `https://your-app.onrender.com`
  - Should see your React app
  
- [ ] Admin Login: Login with seeded admin credentials
  - Email: `admin@community.local`
  - Password: `Admin123!` (or your custom value)
  
- [ ] Change Admin Password: **Immediately** after first login

- [ ] Test API Endpoints: Verify all routes work correctly

---

## 🔍 Troubleshooting

### Build Fails

**Error**: `npm install` fails
- **Fix**: Check `package.json` files for syntax errors
- Check Render logs in Dashboard → Logs tab

**Error**: Frontend build fails
- **Fix**: Ensure all dependencies are in `frontend/package.json`
- Check for missing imports in React components

### API Returns 500 Error

**Error**: Database connection fails
- **Fix**: Verify `MONGO_URI` is correct in Render env vars
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify database user credentials

**Error**: JWT errors
- **Fix**: Ensure `JWT_SECRET` is set in Render env vars
- Must be at least 32 characters for security

### Frontend Shows Blank Page

**Error**: White screen
- **Fix**: Check browser console for errors
- Verify `VITE_API_URL` is set to `/api` in `.env.production`
- Check build logs to ensure `dist/` was copied correctly

### CORS Errors

**Fix**: The code automatically handles CORS in production
- If issues persist, verify `CLIENT_ORIGIN` matches your Render URL

---

## 🔄 Updating Your App

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Render will **automatically redeploy** when you push to the `main` branch.

---

## 💰 Cost Breakdown

- **Render Web Service**: FREE (750 hours/month, perfect for single app)
- **MongoDB Atlas**: FREE (M0 shared cluster, 512MB storage)
- **GitHub**: FREE (public repositories)
- **Total**: **$0/month** 🎉

---

## 📝 Notes

- ⚠️ **Do NOT push `.env` files** to GitHub (they're in `.gitignore`)
- ⚠️ **Do NOT commit `node_modules/`** (adds ~245MB unnecessarily)
- ⚠️ Free tier spins down after 15 minutes of inactivity (first request after spin-down will be slow)
- ✅ All source code is in the repository
- ✅ Build happens on Render's servers (not your local machine)
- ✅ Single URL serves both frontend and backend

---

## 🔐 Security Best Practices

1. **Change default admin password** immediately after deployment
2. **Use strong JWT_SECRET** (at least 32 random characters)
3. **Enable MongoDB Atlas network access** restrictions
4. **Use HTTPS only** (Render does this automatically)
5. **Keep dependencies updated** regularly

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **GitHub Issues**: https://github.com/YOUR_USERNAME/paid-community-platform/issues

---

**Deployed successfully! 🚀**
