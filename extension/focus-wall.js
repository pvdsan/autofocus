// Focus Wall Script
// Displays when user tries to access disallowed domain during focus session

class FocusWall {
  constructor() {
    this.sessionData = null;
    this.sessionStartTime = null;
    this.distractionsBlocked = 0;

    this.initializeElements();
    this.loadSessionData();
    this.startTimer();
  }

  initializeElements() {
    this.projectName = document.getElementById('projectName');
    this.allowedDomains = document.getElementById('allowedDomains');
    this.sessionTime = document.getElementById('sessionTime');
    this.distractionsBlocked = document.getElementById('distractionsBlocked');
  }

  async loadSessionData() {
    try {
      // Get session data from background script
      const response = await this.sendMessage({ action: 'get_session_status' });

      if (response.isActive && response.activeSession) {
        this.sessionData = response.activeSession;
        this.sessionStartTime = this.sessionData.startTime;

        this.updateDisplay();
        this.loadDistractionCount();
      } else {
        // No active session, redirect to a safe page
        this.redirectToSafePage();
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      this.redirectToSafePage();
    }
  }

  updateDisplay() {
    if (!this.sessionData) return;

    this.projectName.textContent = this.sessionData.projectName;
    this.allowedDomains.textContent = this.sessionData.allowedDomains.join(', ');
  }

  async loadDistractionCount() {
    try {
      const result = await chrome.storage.local.get(['distractionsBlocked']);
      const count = result.distractionsBlocked || 0;
      document.getElementById('distractionsBlocked').textContent = count;

      // Increment distraction count
      await chrome.storage.local.set({
        distractionsBlocked: count + 1
      });
    } catch (error) {
      console.error('Error loading distraction count:', error);
    }
  }

  startTimer() {
    this.updateTimer();
    setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (!this.sessionStartTime) return;

    const elapsed = Date.now() - this.sessionStartTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      this.sessionTime.textContent = `${hours}:${String(minutes).padStart(2, '0')}`;
    } else {
      this.sessionTime.textContent = `${minutes}m`;
    }
  }

  redirectToSafePage() {
    // If no active session, redirect to a safe default
    window.location.href = 'https://www.google.com';
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Global functions for HTML buttons
function goToAllowedSite() {
  // Open a new tab with the first allowed domain or a safe default
  const focusWall = window.focusWall;
  if (focusWall && focusWall.sessionData && focusWall.sessionData.allowedDomains.length > 0) {
    const firstAllowed = focusWall.sessionData.allowedDomains[0];
    const url = firstAllowed.startsWith('http') ? firstAllowed : `https://${firstAllowed}`;
    chrome.tabs.create({ url });
  } else {
    chrome.tabs.create({ url: 'https://www.google.com' });
  }
}

function openPopup() {
  // Open the extension popup
  chrome.action.openPopup();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.focusWall = new FocusWall();
});
