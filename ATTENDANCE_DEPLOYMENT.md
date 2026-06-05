# CynexAI Attendance System — Deployment Guide

This guide explains how to deploy all three parts of the attendance system so that `cynexai.in/attendance` works live.

---

## Architecture Overview

```
cynexai.in             → Netlify/Cloudflare (Vite + React — main website)
  /attendance/*        → Proxied to → Vercel (Next.js attendance frontend)
                                           ↕ API calls
                              Render.com (Express backend API)
                                           ↕ Database
                                    Turso (LibSQL cloud database)
```

---

## Step 1 — Create a Turso Database (Free)

1. Go to [https://turso.tech](https://turso.tech) and sign up (free)
2. Create a new database (e.g., `cynexai-attendance`)
3. Note your:
   - `TURSO_DATABASE_URL` → looks like `libsql://cynexai-attendance-yourname.turso.io`
   - `TURSO_AUTH_TOKEN` → long token string

---

## Step 2 — Deploy the Backend to Render.com (Free)

1. Go to [https://render.com](https://render.com) and sign up
2. Click **New → Web Service**
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` file
5. Set these **Environment Variables** in the Render dashboard:

   | Variable | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | Your Turso database URL |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |
   | `JWT_SECRET` | Any long random string (e.g., run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
   | `FRONTEND_URL` | Leave blank for now, fill in after Step 3 |

6. Deploy — you'll get a URL like `https://cynexai-attendance-backend.onrender.com`
7. Run the database seed by going to **Render → Shell** and running: `npm run seed`

---

## Step 3 — Deploy the Frontend to Vercel (Free)

1. Go to [https://vercel.com](https://vercel.com) and sign up
2. Click **Add New Project → Import Git Repository**
3. Select your repository
4. **IMPORTANT:** Set the **Root Directory** to `attendance-frontend`
5. Set these **Environment Variables** in Vercel:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your Render.com backend URL from Step 2 |

6. Deploy — you'll get a URL like `https://cynexai-attendance.vercel.app`

---

## Step 4 — Link Everything Together

### 4a. Update Render's FRONTEND_URL
- Go back to Render → Environment Variables
- Set `FRONTEND_URL` = your Vercel URL from Step 3
- Redeploy the backend

### 4b. Update the _redirects file
Open `public/_redirects` and update the first line with your Vercel URL:

```
/attendance/* https://cynexai-attendance.vercel.app/:splat 200
/* /index.html 200
```

### 4c. Commit and Push
```bash
git add public/_redirects
git commit -m "fix: link /attendance route to Vercel deployment"
git push
```

Your main website will auto-redeploy on Netlify/Cloudflare.

---

## Step 5 — Verify

1. ✅ Backend health: `https://cynexai-attendance-backend.onrender.com/`
2. ✅ Frontend direct: `https://cynexai-attendance.vercel.app/attendance/login`
3. ✅ Via main domain: `https://cynexai.in/attendance/login`

### Default Login Credentials (created by seed script)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cynexai.in` | `Admin@1234` |
| Clerk | `clerk@cynexai.in` | `Clerk@1234` |
| Trainer | `trainer@cynexai.in` | `Trainer@1234` |
| Student | `student@cynexai.in` | `Student@1234` |

> ⚠️ **Change these passwords immediately after first login in production!**

---

## Local Development

```bash
# Terminal 1 — Backend
cd attendance-backend
npm install
npm run seed   # Only needed once
npm start      # Runs on http://localhost:5000

# Terminal 2 — Attendance Frontend
cd attendance-frontend
npm install
npm run dev    # Runs on http://localhost:3000/attendance

# Terminal 3 — Main Website
npm run dev    # Runs on http://localhost:5173 or 5174
```
