// Global Navigation Manager - DEPRECATED
// Navigation is now handled by auth-guard.js
class NavigationManager {
  constructor() {
    this.currentUser = null;
    this.authNavItem = null;
    this.isDeprecated = true;
  }

  async initialize() {
    console.log(
      "⚠️ NavigationManager is deprecated - auth-guard.js now handles navigation"
    );
    return;
  }

  async waitForDatabase() {
    return;
  }

  async updateNavigationState() {
    return;
  }

  showSignInButton() {
    return;
  }

  showProfileButton() {
    return;
  }

  getAuthPath() {
    return;
  }

  getProfilePath() {
    return;
  }

  getSubmitPath() {
    return;
  }

  toggleProfileDropdown() {
    return;
  }

  async logout() {
    return;
  }

  handleMobileToggle() {
    // Keep mobile navigation functionality
    const nav = document.querySelector("nav");
    if (nav) {
      nav.classList.toggle("active");
    }
  }
}

// Initialize navigation manager (but it's now deprecated)
let navManager;

document.addEventListener("DOMContentLoaded", async () => {
  navManager = new NavigationManager();
  await navManager.initialize();
});

// Keep mobile navigation functionality
document.addEventListener("DOMContentLoaded", function () {
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const nav = document.querySelector("nav");

  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", function () {
      nav.classList.toggle("active");
    });
  }
});
