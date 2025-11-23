// AutoFocus Background Service Worker
// Handles tab monitoring, session management, and intelligent distraction detection

// ============================================
// Configuration
// ============================================
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',
  RELEVANCE_THRESHOLD: 0.3,
  MIN_NOTIFICATION_INTERVAL: 60000, // 1 minute
  CHECK_DEBOUNCE_DELAY: 1000 // 1 second
};

// ============================================
// Notification Manager
// ============================================
class NotificationManager {
  constructor() {
    this.notificationId = 'autofocus-nudge';
    this.lastNotificationTime = 0;
  }

  async showNudge(projectName, reasoning) {
    const now = Date.now();
    if (now - this.lastNotificationTime < CONFIG.MIN_NOTIFICATION_INTERVAL) {
      console.log('Skipping nudge - too soon since last one');
      return;
    }

    try {
      // Clear any existing notification first
      await chrome.notifications.clear(this.notificationId);
      
      const options = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: `🎯 Focus Check: "${projectName}"`,
        message: reasoning || "This page might not be related to your current goal.",
        buttons: [
          { title: "It's relevant" },
          { title: "Back to work" }
        ],
        requireInteraction: true, // Make it stay until user interacts
        priority: 2
      };

      await chrome.notifications.create(this.notificationId, options);
      this.lastNotificationTime = now;
      console.log('✅ Notification created successfully');
      
      // Fallback: Also show a console warning in bright colors
      console.log('%c🚨 DISTRACTION DETECTED! 🚨', 'background: #ff5252; color: white; font-size: 20px; padding: 10px;');
      console.log(`%c"${projectName}" - ${reasoning}`, 'background: #764ba2; color: white; font-size: 14px; padding: 5px;');
      
    } catch (error) {
      console.error('Failed to show notification:', error);
      console.warn(`%c🚨 NUDGE: Are you working on "${projectName}"? ${reasoning}`, 'background: #ff5252; color: white; font-size: 16px; padding: 10px;');
    }
  }

  setupListeners(backgroundManager) {
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === this.notificationId) {
        if (buttonIndex === 0) {
          console.log('User marked page as relevant');
        } else {
          backgroundManager.redirectToFocusWall();
        }
        chrome.notifications.clear(notificationId);
      }
    });
    
    chrome.notifications.onClosed.addListener((notificationId) => {
      console.log('Notification closed:', notificationId);
    });
  }
}

// ============================================
// Main AutoFocus Manager
// ============================================
class AutoFocusManager {
  constructor() {
    this.activeSession = null;
    this.focusWallUrl = chrome.runtime.getURL('focus-wall.html');
    this.notificationManager = new NotificationManager();
    this.lastCheckedUrl = null;
    this.checkTimeout = null;
    this.isProcessing = false;
    
    this.init();
  }

  init() {
    console.log('AutoFocus Manager initializing...');
    this.notificationManager.setupListeners(this);
    this.setupListeners();
    this.loadStoredSession();
    console.log('AutoFocus Manager ready');
  }

  setupListeners() {
    // Monitor tab activation
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      this.scheduleCheck(activeInfo.tabId);
    });

    // Monitor tab updates (URL changes)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.scheduleCheck(tabId);
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background received message:', message.action);
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle alarms for session timing
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'session_end') {
        console.log('Session timer expired');
        this.endSession();
      }
    });
  }

  loadStoredSession() {
    chrome.storage.local.get(['activeSession'], (result) => {
      if (result.activeSession) {
        console.log('Restoring active session:', result.activeSession);
        this.activeSession = result.activeSession;
        this.monitorExistingTabs();
      }
    });
  }

  scheduleCheck(tabId) {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
    
    this.checkTimeout = setTimeout(() => {
      this.checkTab(tabId);
    }, CONFIG.CHECK_DEBOUNCE_DELAY);
  }

  async checkTab(tabId) {
    if (!this.activeSession || this.isProcessing) return;

    try {
      this.isProcessing = true;
      const tab = await chrome.tabs.get(tabId);
      
      // Skip chrome:// and internal pages
      if (!tab.url || 
          tab.url.startsWith('chrome://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') || 
          tab.url.includes('focus-wall.html')) {
        return;
      }

      // Skip if URL hasn't changed
      if (this.lastCheckedUrl === tab.url) return;
      this.lastCheckedUrl = tab.url;

      console.log('Checking tab:', tab.url);

      // Extract page content for analysis
      const pageContent = await this.extractPageContent(tabId);
      
      // Analyze relevance
      const analysis = await this.analyzeRelevance(
        this.activeSession.projectDescription,
        tab.url,
        tab.title,
        pageContent
      );

      // Take action based on relevance
      await this.handleAnalysisResult(analysis, tabId);
      
    } catch (error) {
      console.error('Error checking tab:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async extractPageContent(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
          const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText).join(' ');
          const p1 = document.querySelector('p')?.innerText || '';
          const body = document.body.innerText.substring(0, 500).replace(/\s+/g, ' ');
          return `${metaDesc} ${h1s} ${p1} ${body}`.substring(0, 1000);
        }
      });
      
      return results[0]?.result || '';
    } catch (e) {
      console.error('Failed to extract content:', e);
      return '';
    }
  }

  async analyzeRelevance(projectDescription, url, title, contentPreview) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/analyze/page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_description: projectDescription,
          url: url,
          title: title,
          content_preview: contentPreview
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis API failed:', error);
      // Fail open (allow by default if API is down)
      return { relevance_score: 1.0, reasoning: "Analysis failed - allowing by default" };
    }
  }

  async handleAnalysisResult(analysis, tabId) {
    console.log('Page Analysis:', analysis);
    
    if (analysis.relevance_score < CONFIG.RELEVANCE_THRESHOLD) {
      console.log('Distraction detected!');
      
      if (this.activeSession.mode === 'guardrail' || this.activeSession.mode === 'monk') {
        this.redirectToFocusWall();
      } else {
        // Nudge mode - show system notification
        await this.notificationManager.showNudge(
          this.activeSession.projectName, 
          analysis.reasoning
        );
        
        // Show in-page overlay
        try {
          // Inject content script (will only initialize once per page)
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-nudge.js']
          });
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // Send message to show the overlay
          const response = await chrome.tabs.sendMessage(tabId, {
            action: 'show_page_nudge',
            projectName: this.activeSession.projectName,
            reasoning: analysis.reasoning
          });
          
          if (response && response.success) {
            console.log('✅ In-page overlay shown on page');
          }
        } catch (error) {
          console.log('⚠️ In-page overlay failed:', error.message);
        }
      }
    } else {
      console.log('Page is relevant, score:', analysis.relevance_score);
    }
  }

  async redirectToFocusWall() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.update(tabs[0].id, { url: this.focusWallUrl });
    }
  }

  startSession(sessionData) {
    console.log('Starting session:', sessionData);
    
    this.activeSession = {
      ...sessionData,
      startTime: Date.now(),
      id: Date.now().toString()
    };

    // Set alarm if duration specified
    if (sessionData.duration) {
      chrome.alarms.create('session_end', {
        delayInMinutes: sessionData.duration
      });
    }

    // Save session to storage
    chrome.storage.local.set({ activeSession: this.activeSession });

    // Start monitoring all existing tabs
    this.monitorExistingTabs();
    
    console.log('Session started successfully');
  }

  async monitorExistingTabs() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.active) {
        this.scheduleCheck(tab.id);
      }
    }
  }

  endSession() {
    if (this.activeSession) {
      console.log('Ending session');
      
      const sessionData = {
        ...this.activeSession,
        endTime: Date.now(),
        duration: Date.now() - this.activeSession.startTime
      };

      // Save completed session
      this.saveCompletedSession(sessionData);
      this.activeSession = null;
      this.lastCheckedUrl = null;

      // Clear storage
      chrome.storage.local.remove('activeSession');

      // Clear alarm
      chrome.alarms.clear('session_end');

      // Try to notify popup if it's open (but don't throw error if closed)
      chrome.runtime.sendMessage({ action: 'session_ended' }).catch(() => {
        console.log('Popup not open, session ended silently');
      });
    }
  }

  async saveCompletedSession(session) {
    try {
      const result = await chrome.storage.local.get(['completedSessions']);
      const sessions = result.completedSessions || [];
      sessions.push(session);
      await chrome.storage.local.set({ completedSessions: sessions });
      console.log('Session saved to history');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('Handling message:', message.action);
    
    switch (message.action) {
      case 'start_session':
        this.startSession(message.sessionData);
        sendResponse({ success: true });
        break;

      case 'end_session':
        this.endSession();
        sendResponse({ success: true });
        break;

      case 'get_session_status':
        console.log('Sending session status:', {
          isActive: !!this.activeSession,
          session: this.activeSession
        });
        sendResponse({
          activeSession: this.activeSession,
          isActive: !!this.activeSession
        });
        break;
      
      case 'mark_as_relevant':
        console.log('User marked current page as relevant');
        // TODO: Store this feedback to improve future analysis
        sendResponse({ success: true });
        break;
      
      case 'back_to_work':
        console.log('User chose to go back to work');
        this.redirectToFocusWall();
        sendResponse({ success: true });
        break;

      default:
        console.warn('Unknown action:', message.action);
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// ============================================
// Initialize
// ============================================
const autoFocusManager = new AutoFocusManager();