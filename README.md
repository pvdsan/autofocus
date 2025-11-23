# AutoFocus – Dopamine Loop Breaker

A Chrome extension that helps you stay focused by using AI to intelligently detect distractions and gently nudge you back to work.

## 🎯 Features

- **AI-Powered Detection**: Uses OpenAI GPT-4o-mini to analyze page relevance
- **Contextual Understanding**: Tell it what you're working on in plain English
- **Gentle Nudges**: Full-screen modal alerts when distracted
- **Smart Learning**: Considers tools like ChatGPT, Stack Overflow as helpful resources
- **Session Tracking**: Track focus time and productivity

## 🚀 Quick Start

### 1. Deploy Backend to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/autofocus)

**Manual Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd autofocus
vercel

# Add environment variable
vercel env add OPENAI_API_KEY
```

Get your OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

### 2. Install Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `autofocus/extension/` folder

### 3. Configure Extension

Update `extension/background.js` line 4 with your Vercel backend URL:

```javascript
const API_BASE_URL = 'https://your-app.vercel.app';
```

### 4. Start Focusing

1. Click the extension icon
2. Enter your project (e.g., "Study React hooks")
3. Select mode: Nudge (gentle) or Guardrail (blocks)
4. Click "Start Focus Session"

## 📁 Project Structure

```
autofocus/
├── backend/              # FastAPI backend
│   ├── app.py           # Main API
│   ├── openai_service.py # AI analysis
│   ├── models.py        # Database models
│   └── pyproject.toml   # Dependencies
├── extension/           # Chrome extension
│   ├── manifest.json    # Extension config
│   ├── background.js    # Service worker
│   ├── popup/          # Extension UI
│   ├── content-nudge.js # Modal overlay
│   └── icons/          # Extension icons
├── vercel.json         # Vercel deployment config
├── requirements.txt    # Python dependencies
└── README.md
```

## 🛠️ Local Development

### Backend

```bash
cd autofocus/backend

# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Install uv package manager
pip install uv

# Install dependencies
uv sync

# Run server
uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Extension

1. Load unpacked extension from `extension/` folder
2. Update `API_BASE_URL` in `background.js` to `http://localhost:8000`
3. Reload extension after changes

## 🧪 Testing

1. Start a session with project: "Practice LeetCode"
2. Visit `pokemon.com` or `reddit.com`
3. Modal should appear with blur overlay
4. Test interactions:
   - Click "Back to Work" → Redirects to focus wall
   - Click "It's Relevant" → Dismisses modal
   - Click backdrop → Dismisses modal
   - Click X → Dismisses modal

## 🔒 Privacy

- Only URL, title, and first 500 characters of content are sent to backend
- Data is processed by OpenAI but not stored permanently
- Analysis results are cached temporarily for performance

## 📝 Environment Variables

**Backend (Vercel):**
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `RELEVANCE_THRESHOLD` - Score below which pages are flagged (default: 0.3)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

MIT © 2025 AutoFocus
