// Session Management System
class SessionManager {
  constructor() {
    this.SESSION_KEY = "umoja_session";
    this.ACTIVITY_KEY = "umoja_last_activity";
    this.REMEMBER_KEY = "umoja_remember_me";

    // Session timeouts in milliseconds
    this.DEFAULT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    this.REMEMBER_TIMEOUT = 48 * 60 * 60 * 1000; // 48 hours
  }

  // Set session with user data and remember me preference
  setSession(userData, rememberMe = false) {
    const sessionData = {
      user: userData,
      loginTime: Date.now(),
      rememberMe: rememberMe,
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(this.REMEMBER_KEY, rememberMe.toString());
    this.updateActivity();
  }

  // Update last activity timestamp
  updateActivity() {
    localStorage.setItem(this.ACTIVITY_KEY, Date.now().toString());
  }

  // Get current session if valid
  getSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      const lastActivity = localStorage.getItem(this.ACTIVITY_KEY);
      const rememberMe = localStorage.getItem(this.REMEMBER_KEY) === "true";

      if (!sessionData || !lastActivity) {
        return null;
      }

      const session = JSON.parse(sessionData);
      const now = Date.now();
      const timeSinceActivity = now - parseInt(lastActivity);

      // Determine timeout based on remember me preference
      const timeout = rememberMe ? this.REMEMBER_TIMEOUT : this.DEFAULT_TIMEOUT;

      // Check if session has expired
      if (timeSinceActivity > timeout) {
        this.clearSession();
        return null;
      }

      // Update activity on successful session check
      this.updateActivity();
      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      this.clearSession();
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getSession() !== null;
  }

  // Get current user data
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  // Clear session data
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.ACTIVITY_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
  }

  // Force logout
  logout() {
    this.clearSession();
  }

  // Get remaining session time in milliseconds
  getRemainingTime() {
    const lastActivity = localStorage.getItem(this.ACTIVITY_KEY);
    const rememberMe = localStorage.getItem(this.REMEMBER_KEY) === "true";

    if (!lastActivity) return 0;

    const now = Date.now();
    const timeSinceActivity = now - parseInt(lastActivity);
    const timeout = rememberMe ? this.REMEMBER_TIMEOUT : this.DEFAULT_TIMEOUT;

    return Math.max(0, timeout - timeSinceActivity);
  }

  // Check if session will expire soon (within 1 hour)
  isExpiringSoon() {
    const remainingTime = this.getRemainingTime();
    return remainingTime > 0 && remainingTime < 60 * 60 * 1000; // 1 hour
  }
}

// Global session manager instance
window.SessionManager = new SessionManager();

// Auto-update activity on page interactions
document.addEventListener("DOMContentLoaded", () => {
  // Update activity on page load
  if (window.SessionManager.isAuthenticated()) {
    window.SessionManager.updateActivity();
  }

  // Update activity on user interactions
  const events = ["click", "keypress", "scroll", "mousemove"];
  let activityTimeout;

  events.forEach((event) => {
    document.addEventListener(
      event,
      () => {
        if (window.SessionManager.isAuthenticated()) {
          // Debounce activity updates to avoid excessive localStorage writes
          clearTimeout(activityTimeout);
          activityTimeout = setTimeout(() => {
            window.SessionManager.updateActivity();
          }, 30000); // Update every 30 seconds at most
        }
      },
      { passive: true }
    );
  });
});
