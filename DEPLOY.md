# Vercel Deployment Guide

## Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- OpenAI API key ([platform.openai.com/api-keys](https://platform.openai.com/api-keys))
- Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Push to Git

```bash
cd autofocus
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/autofocus.git
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
4. Add environment variable:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
5. Click "Deploy"

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd autofocus
vercel

# Add environment variable
vercel env add OPENAI_API_KEY
# Paste your API key when prompted
# Select: Production, Preview, Development

# Redeploy with env vars
vercel --prod
```

## Step 3: Get Your Backend URL

After deployment, Vercel will give you a URL like:
```
https://autofocus-xyz123.vercel.app
```

Copy this URL.

## Step 4: Update Extension

1. Open `extension/background.js`
2. Find line 4:
   ```javascript
   const API_BASE_URL = 'http://localhost:8000';
   ```
3. Replace with your Vercel URL:
   ```javascript
   const API_BASE_URL = 'https://autofocus-xyz123.vercel.app';
   ```
4. Reload the extension in Chrome

## Step 5: Test

1. Open Chrome → `chrome://extensions/`
2. Reload your extension
3. Open Service Worker console
4. Start a focus session
5. Visit a distraction site
6. Check logs for API calls

## Troubleshooting

### "Failed to fetch" error

**Cause**: Backend URL is wrong or backend is down

**Fix**: 
- Check the URL in `background.js` matches your Vercel URL
- Visit your Vercel URL in a browser to test if it's live
- Check Vercel deployment logs for errors

### "OpenAI API Error"

**Cause**: API key not set or invalid

**Fix**:
- Go to Vercel dashboard → Your project → Settings → Environment Variables
- Add `OPENAI_API_KEY` with your valid key
- Redeploy: `vercel --prod`

### CORS errors

**Cause**: Chrome extension origin not allowed

**Fix**: The backend already allows all origins (`allow_origins=["*"]`). If you want to restrict, update `backend/app.py`:
```python
allow_origins=["chrome-extension://your-extension-id"],
```

### Database errors on Vercel

**Note**: Vercel serverless functions are stateless. The SQLite database will reset between deployments. For production, consider:
- Using Vercel Postgres
- Using PlanetScale
- Using Supabase

## Optional: Custom Domain

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain
3. Update `extension/background.js` with new URL
4. Reload extension

## Environment Variables

Required:
- `OPENAI_API_KEY` - Your OpenAI API key

Optional:
- `RELEVANCE_THRESHOLD` - Relevance score threshold (default: 0.3)

## Continuous Deployment

Once connected to Git, Vercel will automatically deploy on every push to main branch.

To deploy:
```bash
git add .
git commit -m "Update"
git push
```

Vercel will build and deploy automatically.

