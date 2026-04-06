# Deployment Guide - Public Telemetry Interface

This guide will walk you through deploying your public telemetry interface to free hosting platforms.

## Overview

- **Backend** → Railway.app (free 500 hours/month)
- **Frontend** → Vercel (unlimited free hosting)
- **Admin Interface** → Stays local (secure)

## Prerequisites

1. **GitHub Account** - Both Railway and Vercel work best with GitHub
2. **Git Installed** - To push your code to GitHub
3. **Accounts Created**:
   - [Railway.app](https://railway.app) - Sign up with GitHub
   - [Vercel.com](https://vercel.com) - Sign up with GitHub

---

## Part 1: Prepare Your Code for GitHub

### 1.1 Create .gitignore Files

**For the main project** (if not already exists):
```bash
cd "e:\Admin Telemetry Interface"
```

Create/update `.gitignore`:
```
node_modules/
.env
.env.local
dist/
*.log
.DS_Store
server/serviceAccountKey.json
```

**For the server directory**:
```bash
cd server
```

Create `.gitignore`:
```
node_modules/
.env
serviceAccountKey.json
*.log
```

### 1.2 Initialize Git Repository (if not already done)

```bash
cd "e:\Admin Telemetry Interface"
git init
git add .
git commit -m "Initial commit - Telemetry interface ready for deployment"
```

### 1.3 Create GitHub Repository

1. Go to [GitHub.com](https://github.com/new)
2. Create a new repository (e.g., `rocket-telemetry`)
3. **Do NOT** initialize with README (you already have code)
4. Copy the repository URL

### 1.4 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/rocket-telemetry.git
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `rocket-telemetry` repository
5. Railway will detect it's a Node.js project

### 2.2 Configure Railway Service

1. Click on your deployed service
2. Go to **Settings** → **Root Directory**
3. Set root directory to: `server`
4. Click **"Deploy"**

### 2.3 Set Environment Variables

1. In Railway, go to **Variables** tab
2. Add the following variables:

```
PORT=3000
MQTT_BROKER=mqtt://localhost:1883
MQTT_TOPIC=rocket/telemetry
FRONTEND_URL=https://your-app.vercel.app
```

> **Note**: We'll update `FRONTEND_URL` after deploying to Vercel

### 2.4 Upload Firebase Service Account

Since `serviceAccountKey.json` is not in Git (for security), you need to upload it:

**Option A: Use Railway CLI**
```bash
railway login
railway link
railway variables set FIREBASE_SERVICE_ACCOUNT="$(cat server/serviceAccountKey.json)"
```

**Option B: Manual Upload**
1. Copy the contents of `server/serviceAccountKey.json`
2. In Railway Variables, create a new variable `FIREBASE_SERVICE_ACCOUNT`
3. Paste the JSON content

Then update `server/index.js` to read from environment variable if available.

### 2.5 Get Your Railway URL

1. Go to **Settings** → **Domains**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://your-app.railway.app`)
4. **Save this URL** - you'll need it for Vercel

### 2.6 Test Backend

Visit: `https://your-app.railway.app/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T...",
  "services": { ... }
}
```

---

## Part 3: Deploy Frontend to Vercel

### 3.1 Update Environment Variables

Edit `User-Telemetry-Interface/.env.production`:

```env
VITE_WS_URL=wss://your-app.railway.app
VITE_API_URL=https://your-app.railway.app
```

Replace `your-app.railway.app` with your actual Railway domain.

### 3.2 Commit Changes

```bash
git add User-Telemetry-Interface/.env.production
git commit -m "Update production environment variables"
git push
```

### 3.3 Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your `rocket-telemetry` repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `User-Telemetry-Interface`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**

### 3.4 Set Environment Variables in Vercel

1. Go to **Settings** → **Environment Variables**
2. Add the following (for Production):

```
VITE_WS_URL=wss://your-app.railway.app
VITE_API_URL=https://your-app.railway.app
```

3. Click **"Save"**
4. Go to **Deployments** → Redeploy latest deployment

### 3.5 Get Your Vercel URL

1. After deployment completes, copy your Vercel URL (e.g., `https://rocket-telemetry.vercel.app`)
2. **This is your public URL!** Share it with anyone.

---

## Part 4: Update Backend CORS

Now that you have your Vercel URL, update Railway:

1. Go back to Railway
2. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://rocket-telemetry.vercel.app
   ```
3. Railway will automatically redeploy

---

## Part 5: Testing

### 5.1 Test Public Interface

1. Open your Vercel URL in a browser
2. Enter a name
3. Verify the dashboard loads
4. Check that data appears (from Firebase)

### 5.2 Test Real-Time Updates

1. On your local machine, start the backend server:
   ```bash
   cd "e:\Admin Telemetry Interface\server"
   node mock_publisher.js
   ```

2. Watch the deployed public interface update in real-time

### 5.3 Test from Different Device

1. Open the Vercel URL on your phone
2. Verify everything works

---

## Troubleshooting

### Backend Issues

**Problem**: Health check fails
- Check Railway logs: **Deployments** → Click on deployment → **View Logs**
- Verify all environment variables are set
- Check Firebase service account is uploaded

**Problem**: CORS errors
- Verify `FRONTEND_URL` matches your Vercel URL exactly
- Check Railway logs for CORS errors

### Frontend Issues

**Problem**: WebSocket connection fails
- Check that `VITE_WS_URL` uses `wss://` (not `ws://`)
- Verify Railway backend is running
- Check browser console for errors

**Problem**: No data appears
- Check Firebase configuration in `HybridDataService.js`
- Verify Firebase rules allow public read access
- Check browser console for Firebase errors

**Problem**: Build fails on Vercel
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Try building locally first: `npm run build`

---

## Maintenance

### Updating Your Deployment

**Backend Changes**:
```bash
cd "e:\Admin Telemetry Interface"
git add server/
git commit -m "Update backend"
git push
```
Railway will automatically redeploy.

**Frontend Changes**:
```bash
git add User-Telemetry-Interface/
git commit -m "Update frontend"
git push
```
Vercel will automatically redeploy.

### Monitoring

- **Railway**: Check logs and metrics in Railway dashboard
- **Vercel**: Check analytics and logs in Vercel dashboard
- **Firebase**: Monitor usage in Firebase console

---

## Cost Considerations

### Railway (Free Tier)
- 500 hours/month of runtime
- $5 credit/month
- Should be sufficient for hobby projects

### Vercel (Free Tier)
- Unlimited deployments
- 100 GB bandwidth/month
- Serverless function executions

### Firebase (Free Tier - Spark Plan)
- 1 GB storage
- 10 GB/month bandwidth
- 100 simultaneous connections

---

## Security Notes

1. **Never commit** `serviceAccountKey.json` to Git
2. **Never commit** `.env` files with secrets
3. The Firebase config in `HybridDataService.js` is safe to be public (it's client-side)
4. Admin credentials are stored securely on the backend only
5. Public interface is read-only (no control capabilities)

---

## Next Steps

1. Share your public URL: `https://your-app.vercel.app`
2. Monitor usage in Railway and Vercel dashboards
3. Set up custom domain (optional - available on both platforms)
4. Enable analytics (optional - Vercel has built-in analytics)

---

## Support

If you encounter issues:

1. Check Railway logs
2. Check Vercel deployment logs
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Test locally first before deploying

**Your Public URL**: `https://your-app.vercel.app` (replace with actual URL)
