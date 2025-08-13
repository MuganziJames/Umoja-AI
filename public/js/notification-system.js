// Global Notification System - DISABLED
// All notifications silenced

class NotificationSystem {
  constructor() {
    console.log("NotificationSystem: All notifications disabled");
  }

  show(message, type, options) {
    console.log(`[${type}] ${message}`);
    return null;
  }

  // Standard method that submit.js expects
  showNotification(options) {
    const { type = "info", message, duration } = options || {};
    console.log(`[${type.toUpperCase()}] ${message}`);
    return null;
  }

  success(message, options) {
    console.log(`[SUCCESS] ${message}`);
    return null;
  }

  error(message, options) {
    console.log(`[ERROR] ${message}`);
    return null;
  }

  warning(message, options) {
    console.log(`[WARNING] ${message}`);
    return null;
  }

  info(message, options) {
    console.log(`[INFO] ${message}`);
    return null;
  }

  remove() {}
  clear() {}
}

// Create global instance
window.NotificationSystem = new NotificationSystem();

// Disable all notification functions
window.showNotification = () => null;
window.showSuccess = () => null;
window.showError = () => null;
window.showWarning = () => null;
window.showInfo = () => null;
