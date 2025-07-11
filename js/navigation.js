// Global Navigation Manager
class NavigationManager {
  constructor() {
    this.currentUser = null;
    this.authNavItem = null;
  }

  async initialize() {
    try {
      console.log("🔄 Initializing NavigationManager...");

      // Find the auth navigation item
      this.authNavItem = document.getElementById("auth-nav-item");

      if (!this.authNavItem) {
        // If there's no auth-nav-item, this might be a page that doesn't need dynamic nav
        console.log("⚠️ No auth-nav-item found, skipping navigation update");
        return;
      }

      // Wait for database to be ready with more attempts
      if (!window.UmojaDB || !window.UmojaDB.isInitialized) {
        console.log("⏳ Waiting for database to be ready...");
        await this.waitForDatabase();
      }

      this.db = window.UmojaDB;

      // Check current authentication status
      await this.updateNavigationState();

      console.log("✅ NavigationManager initialized successfully");
    } catch (error) {
      console.error("❌ NavigationManager initialization failed:", error);
      // Fall back to showing sign in button
      this.showSignInButton();
    }
  }

  async waitForDatabase(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.UmojaDB && window.UmojaDB.isInitialized) {
        return;
      }
      // Wait longer on initial attempts, then shorter intervals
      const waitTime = i < 20 ? 200 : 100;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    throw new Error("Database not available");
  }

  async updateNavigationState() {
    try {
      if (!this.db || !this.db.isInitialized) {
        console.log("⏳ Database not ready for auth check");
        return;
      }

      const userResult = await this.db.getCurrentUser();
      console.log("🔍 Auth check result:", userResult);

      if (userResult) {
        console.log("✅ User is authenticated, showing profile button");
        this.currentUser = userResult;
        this.showProfileButton();
      } else {
        console.log("❌ User not authenticated, showing sign-in button");
        this.currentUser = null;
        this.showSignInButton();
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { user: this.currentUser },
        })
      );
    } catch (error) {
      console.error("Error checking auth state:", error);
      this.showSignInButton();
    }
  }

  showSignInButton() {
    if (this.authNavItem) {
      console.log("🔄 Updating navigation to show sign-in button");
      this.authNavItem.innerHTML = `
        <a href="${this.getAuthPath()}" class="btn outline">Sign In</a>
      `;
      console.log("✅ Sign-in button displayed");
    } else {
      console.log("❌ Cannot show sign-in button - missing authNavItem");
    }
  }

  showProfileButton() {
    if (this.authNavItem && this.currentUser) {
      console.log("🔄 Updating navigation to show profile button");
      const userData = this.currentUser.user_metadata || {};
      const displayName =
        userData.name ||
        userData.firstName ||
        this.currentUser.email.split("@")[0];

      this.authNavItem.innerHTML = `
        <div class="profile-dropdown">
          <button class="btn outline profile-btn" onclick="navManager.toggleProfileDropdown()">
            <i class="fas fa-user"></i>
          </button>
          <div class="profile-dropdown-menu" id="profile-dropdown-menu">
            <a href="${this.getProfilePath()}" class="dropdown-item">
              <i class="fas fa-user"></i> Profile
            </a>
            <a href="${this.getSubmitPath()}" class="dropdown-item">
              <i class="fas fa-plus"></i> Write Story
            </a>
            <button class="dropdown-item" onclick="navManager.logout()">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      `;
      console.log("✅ Profile button displayed");
    } else {
      console.log(
        "❌ Cannot show profile button - missing authNavItem or currentUser"
      );
    }
  }

  getInitials(name) {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }

  getAuthPath() {
    // Determine the correct path to auth.html based on current page
    const currentPath = window.location.pathname;
    if (currentPath.includes("/pages/")) {
      return "auth.html";
    } else {
      return "pages/auth.html";
    }
  }

  getProfilePath() {
    // Determine the correct path to profile.html based on current page
    const currentPath = window.location.pathname;
    if (currentPath.includes("/pages/")) {
      return "profile.html";
    } else {
      return "pages/profile.html";
    }
  }

  getSubmitPath() {
    // Determine the correct path to submit.html based on current page
    const currentPath = window.location.pathname;
    if (currentPath.includes("/pages/")) {
      return "submit.html";
    } else {
      return "pages/submit.html";
    }
  }

  toggleProfileDropdown() {
    const dropdown = document.getElementById("profile-dropdown-menu");
    if (dropdown) {
      dropdown.classList.toggle("show");
    }
  }

  async logout() {
    if (!confirm("Are you sure you want to logout?")) {
      return;
    }

    try {
      const result = await this.db.signOut();
      if (result.success) {
        this.currentUser = null;
        this.showSignInButton();

        // Redirect to home page if on profile page
        if (window.location.pathname.includes("profile.html")) {
          window.location.href = this.getHomePath();
        } else {
          // Just update the navigation
          this.updateNavigationState();
        }
      } else {
        alert("Failed to logout: " + result.error);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Failed to logout");
    }
  }

  getHomePath() {
    const currentPath = window.location.pathname;
    if (currentPath.includes("/pages/")) {
      return "../index.html";
    } else {
      return "index.html";
    }
  }

  // Manual trigger for testing
  async forceNavigationUpdate() {
    console.log("🔧 Manual navigation update triggered");
    await this.updateNavigationState();
  }

  // Close dropdown when clicking outside
  closeDropdownOnOutsideClick() {
    document.addEventListener("click", (event) => {
      const dropdown = document.getElementById("profile-dropdown-menu");
      const profileBtn = document.querySelector(".profile-btn");

      if (dropdown && !profileBtn?.contains(event.target)) {
        dropdown.classList.remove("show");
      }
    });
  }

  // Listen for auth state changes from other parts of the app
  setupAuthStateListener() {
    // Listen for custom auth events
    window.addEventListener("authStateChanged", (event) => {
      this.currentUser = event.detail.user;
      if (this.currentUser) {
        this.showProfileButton();
      } else {
        this.showSignInButton();
      }
    });

    // Listen for sign-in events specifically
    window.addEventListener("userSignedIn", async (event) => {
      console.log("🔔 User signed in event received");
      this.currentUser = event.detail.user;
      this.showProfileButton();
    });

    // Periodically check auth state (every 3 seconds when page is visible)
    let authCheckInterval;

    const startAuthCheck = () => {
      authCheckInterval = setInterval(async () => {
        if (document.visibilityState === "visible") {
          await this.updateNavigationState();
        }
      }, 3000); // Reduced from 5 seconds to 3 seconds
    };

    const stopAuthCheck = () => {
      if (authCheckInterval) {
        clearInterval(authCheckInterval);
      }
    };

    // Start checking when page becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.updateNavigationState();
        startAuthCheck();
      } else {
        stopAuthCheck();
      }
    });

    // Start immediately if page is visible
    if (document.visibilityState === "visible") {
      startAuthCheck();
    }
  }
}

// Global instance
let navManager;

// Initialize navigation manager when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Add a small delay to ensure all scripts are loaded
  setTimeout(async () => {
    navManager = new NavigationManager();
    window.navManager = navManager; // Make it globally accessible
    await navManager.initialize();
    navManager.closeDropdownOnOutsideClick();
    navManager.setupAuthStateListener();
    console.log("✅ Navigation manager ready and globally accessible");
  }, 100);
});
