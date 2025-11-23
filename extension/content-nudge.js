// Content script for showing visible nudges when notifications don't work
// This creates an overlay on the page itself

// Wrap everything to prevent duplicate declaration errors
(function() {
  // Skip if already loaded
  if (window.autoFocusNudge) {
    console.log('AutoFocus content script already loaded');
    return;
  }

class PageNudge {
  constructor() {
    this.overlayId = 'autofocus-nudge-overlay';
    this.setupListeners();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'show_page_nudge') {
        this.showOverlay(message.projectName, message.reasoning);
        sendResponse({ success: true });
      } else if (message.action === 'hide_page_nudge') {
        this.hideOverlay();
        sendResponse({ success: true });
      }
      return true;
    });
  }

  showOverlay(projectName, reasoning) {
    // Remove existing overlay if any
    this.hideOverlay();

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = this.overlayId;
    overlay.className = 'af-backdrop';
    overlay.innerHTML = `
      <div class="af-nudge-container">
        <div class="af-nudge-icon">🎯</div>
        <div class="af-nudge-content">
          <div class="af-nudge-title">Focus Check: "${projectName}"</div>
          <div class="af-nudge-message">${reasoning}</div>
        </div>
        <div class="af-nudge-buttons">
          <button class="af-btn af-btn-relevant">It's Relevant</button>
          <button class="af-btn af-btn-back">Back to Work</button>
        </div>
        <button class="af-close">×</button>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .af-backdrop {
        position: fixed;
        inset: 0;
        z-index: 999999999;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes scaleIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      .af-nudge-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
        max-width: 500px;
        width: 90%;
        animation: scaleIn 0.3s ease-out;
      }

      .af-nudge-icon {
        font-size: 48px;
        margin-bottom: 16px;
        text-align: center;
      }

      .af-nudge-title {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 12px;
        text-align: center;
      }

      .af-nudge-message {
        font-size: 16px;
        opacity: 0.95;
        margin-bottom: 24px;
        line-height: 1.6;
        text-align: center;
      }

      .af-nudge-buttons {
        display: flex;
        gap: 10px;
      }

      .af-btn {
        flex: 1;
        padding: 14px 24px;
        border: 2px solid white;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.2s;
      }

      .af-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .af-btn-back {
        background: #ff5252;
        border-color: #ff5252;
      }

      .af-btn-back:hover {
        background: #ff3838;
      }

      .af-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }

      .af-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;

    overlay.appendChild(style);
    document.body.appendChild(overlay);

    // Get the container element
    const container = overlay.querySelector('.af-nudge-container');

    // Add event listeners for buttons
    overlay.querySelector('.af-btn-relevant').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'mark_as_relevant' });
      this.hideOverlay();
    });

    overlay.querySelector('.af-btn-back').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'back_to_work' });
      this.hideOverlay();
    });

    overlay.querySelector('.af-close').addEventListener('click', () => {
      this.hideOverlay();
    });

    // Click backdrop to dismiss (but not the container itself)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideOverlay();
      }
    });

    // Prevent clicks on container from bubbling to backdrop
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  hideOverlay() {
    const existing = document.getElementById(this.overlayId);
    if (existing) {
      existing.style.animation = 'fadeOut 0.3s ease-in';
      setTimeout(() => {
        existing.remove();
        // Restore body scroll
        document.body.style.overflow = '';
      }, 300);
    }
  }
}

// Initialize
window.autoFocusNudge = new PageNudge();
console.log('AutoFocus content script loaded');

})(); // End of wrapper function

