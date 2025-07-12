// Authentication Guard - Include this on pages that require authentication
class AuthGuard {
  constructor(options = {}) {
    // Determine correct paths based on current location
    const isInPagesFolder = window.location.pathname.includes("/pages/");
    this.redirectUrl =
      options.redirectUrl ||
      (isInPagesFolder ? "auth.html" : "pages/auth.html");
    this.homeUrl = isInPagesFolder ? "../index.html" : "index.html";
    this.currentPageIsAuth = options.isAuthPage || false;
    this.showProfileIcon = options.showProfileIcon !== false; // default true
  }

  async initialize() {
    // Wait for session manager to be available
    if (!window.SessionManager) {
      await this.waitForSessionManager();
    }

    // Check authentication
    const isAuthenticated = window.SessionManager.isAuthenticated();

    if (!isAuthenticated && !this.currentPageIsAuth) {
      // Redirect to auth page if not authenticated
      this.redirectToAuth();
      return false;
    }

    if (isAuthenticated && this.currentPageIsAuth) {
      // Redirect to home if already authenticated and on auth page
      this.redirectToHome();
      return false;
    }

    if (isAuthenticated && this.showProfileIcon) {
      // Update navigation to show profile icon
      this.updateNavigationForAuthenticatedUser();
    }

    return true;
  }

  async waitForSessionManager(maxAttempts = 50) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.SessionManager) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("SessionManager not available");
  }

  redirectToAuth() {
    // Store current page for redirect after login
    sessionStorage.setItem(
      "umoja_redirect_after_login",
      window.location.pathname + window.location.search
    );
    window.location.href = this.redirectUrl;
  }

  redirectToHome() {
    window.location.href = this.homeUrl;
  }

  updateNavigationForAuthenticatedUser() {
    const authNavItem = document.getElementById("auth-nav-item");
    if (!authNavItem) return;

    const currentUser = window.SessionManager.getCurrentUser();
    if (!currentUser) return;

    const userData = currentUser.user_metadata || {};
    const displayName =
      userData.name ||
      userData.firstName ||
      currentUser.email?.split("@")[0] ||
      "Profile";

    // Determine correct paths based on current location
    const isInPagesFolder = window.location.pathname.includes("/pages/");
    const profilePath = isInPagesFolder ? "profile.html" : "pages/profile.html";
    const submitPath = isInPagesFolder ? "submit.html" : "pages/submit.html";

    // Create profile dropdown
    authNavItem.innerHTML = `
      <div class="profile-dropdown">
        <button class="profile-btn" id="profile-toggle">
          <div class="profile-icon">
            ${this.getInitials(displayName)}
          </div>
        </button>
        <div class="profile-menu" id="profile-menu">
          <a href="${profilePath}" class="profile-menu-item">
            <i class="fas fa-user"></i> My Profile
          </a>
          <a href="${submitPath}" class="profile-menu-item">
            <i class="fas fa-pen"></i> Write Story
          </a>
          <hr class="profile-divider">
          <button class="profile-menu-item logout-btn" id="auth-logout">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    `;

    // Add styles for profile dropdown
    this.addProfileStyles();

    // Setup dropdown functionality
    this.setupProfileDropdown();
  }

  getInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  addProfileStyles() {
    if (document.getElementById("profile-dropdown-styles")) return;

    const styles = `
      <style id="profile-dropdown-styles">
        .profile-dropdown {
          position: relative;
          display: inline-block;
        }

        .profile-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0px 4px 4px 4px;
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }

        .profile-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .profile-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .profile-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 200px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all var(--transition-fast);
          z-index: 1000;
          border: 1px solid var(--border-color);
        }

        .profile-menu.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .profile-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          text-decoration: none;
          color: var(--text-primary);
          transition: background-color var(--transition-fast);
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: var(--font-size-sm);
        }

        .profile-menu-item:hover {
          background: var(--background-light);
        }

        .profile-divider {
          margin: 8px 0;
          border: none;
          border-top: 1px solid var(--border-color);
        }

        .logout-btn {
          color: var(--danger) !important;
        }

        .logout-btn:hover {
          background: rgba(220, 53, 69, 0.1) !important;
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .profile-menu {
            right: -10px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML("beforeend", styles);
  }

  setupProfileDropdown() {
    const profileToggle = document.getElementById("profile-toggle");
    const profileMenu = document.getElementById("profile-menu");
    const logoutBtn = document.getElementById("auth-logout");

    if (profileToggle && profileMenu) {
      profileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle("active");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", () => {
        profileMenu.classList.remove("active");
      });

      // Prevent dropdown from closing when clicking inside
      profileMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.logout();
      });
    }
  }

  async logout() {
    // Use modern confirmation dialog instead of browser confirm
    const confirmLogout = await window.showConfirmationDialog(
      "Logout Confirmation",
      "Are you sure you want to logout?",
      "Logout",
      "Cancel"
    );

    if (!confirmLogout) {
      return; // User cancelled
    }

    try {
      // If UmojaDB is available, sign out through it
      if (window.UmojaDB) {
        await window.UmojaDB.signOut();
      }

      // Clear session
      window.SessionManager.logout();

      // Redirect to home page
      window.location.href = this.homeUrl;
    } catch (error) {
      console.error("Error during logout:", error);
      // Still clear session and redirect even if database logout fails
      window.SessionManager.logout();
      window.location.href = this.homeUrl;
    }
  }
}

// Auto-initialize auth guard (can be overridden by pages)
document.addEventListener("DOMContentLoaded", async () => {
  // Special handling for auth page
  if (window.location.pathname.includes("auth.html")) {
    const authGuard = new AuthGuard({ isAuthPage: true });
    await authGuard.initialize();
    return;
  }

  // Regular initialization for other pages
  const authGuard = new AuthGuard();
  await authGuard.initialize();
});
