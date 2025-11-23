# Project Structure

```
autofocus/
├── api/                      # Vercel serverless function
│   └── index.py             # Entry point for Vercel
│
├── backend/                  # FastAPI backend
│   ├── app.py               # Main API routes
│   ├── models.py            # Database models
│   ├── openai_service.py    # AI analysis service
│   ├── pyproject.toml       # uv dependencies
│   └── autofocus.db         # SQLite database (local only)
│
├── extension/               # Chrome extension
│   ├── manifest.json        # Extension configuration
│   ├── background.js        # Service worker (tab monitoring, analysis)
│   ├── content-nudge.js     # Modal overlay for nudges
│   ├── focus-wall.html      # Blocked page redirect
│   ├── focus-wall.js        # Focus wall logic
│   ├── popup/
│   │   ├── popup.html       # Extension popup UI
│   │   └── popup.js         # Popup logic
│   └── icons/
│       ├── icon16.png       # 16x16 icon
│       ├── icon48.png       # 48x48 icon
│       └── icon128.png      # 128x128 icon
│
├── vercel.json              # Vercel deployment config
├── requirements.txt         # Python dependencies for Vercel
├── package.json             # Node.js metadata
├── .gitignore              # Git ignore rules
├── env.example             # Environment variables template
├── README.md               # Main documentation
├── DEPLOY.md               # Deployment guide
└── STRUCTURE.md            # This file
```

## Key Files

### Backend
- **app.py**: FastAPI app with CORS, session management, and `/analyze/page` endpoint
- **openai_service.py**: OpenAI GPT-4o-mini integration for page relevance analysis
- **models.py**: SQLite database schema for focus sessions

### Extension
- **background.js**: Core logic - monitors tabs, analyzes pages, shows nudges
- **content-nudge.js**: Full-screen modal overlay with blur backdrop
- **popup.html/js**: Extension popup for starting/stopping sessions

### Deployment
- **vercel.json**: Routes all requests to `api/index.py`
- **api/index.py**: Imports and exposes FastAPI app for Vercel
- **requirements.txt**: Python dependencies (FastAPI, OpenAI, etc.)

## Data Flow

1. User starts session in extension popup
2. Background service worker monitors active tab
3. On tab change, extracts URL, title, content
4. Sends to backend `/analyze/page` endpoint
5. Backend calls OpenAI to analyze relevance
6. Returns relevance score (0-1) and reasoning
7. If score < 0.3, background injects content script
8. Content script shows modal overlay
9. User interacts (dismiss, mark relevant, or redirect)

