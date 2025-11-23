# Quick Start Guide

## 🚀 Deploy in 5 Minutes

### 1. Get OpenAI API Key
- Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create new API key
- Copy it

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd autofocus
vercel

# Add API key
vercel env add OPENAI_API_KEY
# Paste your key, select all environments

# Deploy to production
vercel --prod
```

Copy your deployment URL (e.g., `https://autofocus-xyz.vercel.app`)

### 3. Install Extension
1. Open `extension/background.js`
2. Line 8: Replace `http://localhost:8000` with your Vercel URL
3. Chrome → `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select `extension/` folder

### 4. Use It
1. Click extension icon
2. Enter project: "Study React"
3. Click "Start Focus Session"
4. Visit distraction site → Get nudged!

## 📝 That's It!

You're now using AI-powered focus assistance.

**Need help?** See [DEPLOY.md](DEPLOY.md) for detailed instructions.

