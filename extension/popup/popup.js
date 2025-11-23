// AutoFocus Popup Script
// Handles the UI for starting/stopping focus sessions

class AutoFocusPopup {
  constructor() {
    this.currentMode = 'nudge';
    this.sessionStartTime = null;
    this.timerInterval = null;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkSessionStatus();
  }

  initializeElements() {
    // Form elements
    this.sessionForm = document.getElementById('sessionForm');
    this.activeSession = document.getElementById('activeSession');
    this.projectName = document.getElementById('projectName');
    this.projectDescription = document.getElementById('projectDescription');
    this.duration = document.getElementById('duration');

    // Buttons
    this.startSessionBtn = document.getElementById('startSessionBtn');
    this.endSessionBtn = document.getElementById('endSessionBtn');

    // Active session display
    this.currentProject = document.getElementById('currentProject');
    this.currentDescription = document.getElementById('currentDescription');
    this.sessionTimer = document.getElementById('sessionTimer');
    this.currentModeDisplay = document.getElementById('currentMode');
  }

  setupEventListeners() {
    // Mode selector buttons
    const modeBtns = document.querySelectorAll('.mode-btn');
    if (modeBtns) {
      modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.selectMode(e.target.dataset.mode);
        });
      });
    }

    // Start session button
    if (this.startSessionBtn) {
      this.startSessionBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent any form submission
        this.startSession();
      });
    }

    // End session button
    if (this.endSessionBtn) {
      this.endSessionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.endSession();
      });
    }

    // Listen for session ended messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'session_ended') {
        this.showSessionForm();
      }
    });
  }

  selectMode(mode) {
    this.currentMode = mode;

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  async startSession() {
    const projectName = this.projectName.value.trim();
    if (!projectName) {
      alert('Please enter a project name');
      return;
    }

    const projectDescription = this.projectDescription.value.trim();
    if (!projectDescription) {
      alert('Please describe what you are working on');
      return;
    }

    const duration = this.duration.value ? parseInt(this.duration.value) : null;

    const sessionData = {
      projectName,
      projectDescription,
      mode: this.currentMode,
      duration
    };

    console.log('Starting session with:', sessionData);

    try {
      const response = await this.sendMessage({ action: 'start_session', sessionData });
      console.log('Start session response:', response);
      if (response && response.success) {
        // Add startTime to sessionData for immediate display
        sessionData.startTime = Date.now();
        this.showActiveSession(sessionData);
      } else {
        alert('Failed to start session - no success response');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Check if it's a connection error (background script not running)
      if (error.message.includes('Could not establish connection')) {
        alert('Extension background script is not running. Please reload the extension.');
      } else {
        alert('Failed to start session: ' + error.message);
      }
    }
  }

  async endSession() {
    try {
      const response = await this.sendMessage({ action: 'end_session' });
      if (response && response.success) {
        this.showSessionForm();
      }
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  }

  async checkSessionStatus() {
    try {
      console.log('Checking session status...');
      const response = await this.sendMessage({ action: 'get_session_status' });
      console.log('Session status response:', response);
      
      if (response && response.isActive && response.activeSession) {
        console.log('Active session found, showing it');
        this.showActiveSession(response.activeSession);
      } else {
        console.log('No active session, showing form');
        this.showSessionForm();
      }
    } catch (error) {
      console.error('Error checking session status:', error);
      this.showSessionForm();
    }
  }

  showSessionForm() {
    if (this.sessionForm) this.sessionForm.classList.add('active');
    if (this.activeSession) this.activeSession.classList.remove('active');
    this.clearTimer();
  }

  showActiveSession(sessionData) {
    if (this.sessionForm) this.sessionForm.classList.remove('active');
    if (this.activeSession) this.activeSession.classList.add('active');

    if (this.currentProject) this.currentProject.textContent = sessionData.projectName;
    if (this.currentDescription) this.currentDescription.textContent = sessionData.projectDescription;
    if (this.currentModeDisplay) this.currentModeDisplay.textContent = sessionData.mode.charAt(0).toUpperCase() + sessionData.mode.slice(1);

    this.sessionStartTime = sessionData.startTime || Date.now();
    this.startTimer();
  }

  startTimer() {
    this.clearTimer();
    this.updateTimer();

    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (!this.sessionStartTime) return;

    const elapsed = Date.now() - this.sessionStartTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    if (this.sessionTimer) {
      this.sessionTimer.textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    }
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }
      
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

// Start the popup
new AutoFocusPopup();