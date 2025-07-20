// Page Transition Manager for Smooth Navigation
class PageTransitionManager {
  constructor() {
    this.isTransitioning = false;
    this.transitionDuration = 300;
  }

  init() {
    console.log("🎬 Initializing page transitions...");

    // Add loaded class when page loads
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        document.body.classList.add("loaded");
        console.log("✅ Page loaded class added");
      }, 50);
    });

    // Also add loaded class if DOM is already loaded
    if (document.readyState === "loading") {
      // Document is still loading
    } else {
      // Document has finished loading, add class immediately
      setTimeout(() => {
        document.body.classList.add("loaded");
        console.log("✅ Page loaded class added (document already ready)");
      }, 50);
    }

    // Handle all navigation links
    this.attachToLinks();
    console.log("✅ Page transitions initialized");
  }

  attachToLinks() {
    // Handle regular navigation links
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (link && this.shouldTransition(link)) {
        e.preventDefault();
        this.navigateWithTransition(link.href);
      }
    });
  }

  shouldTransition(link) {
    const href = link.getAttribute("href");

    // Skip if:
    // - External link
    // - Hash link
    // - Download link
    // - mailto/tel links
    // - Already has smooth-nav class (to prevent double handling)
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.hasAttribute("download") ||
      link.target === "_blank" ||
      link.classList.contains("no-transition")
    ) {
      return false;
    }

    return true;
  }

  async navigateWithTransition(url) {
    if (this.isTransitioning) return;

    this.isTransitioning = true;

    try {
      // Show loading indicator
      this.showLoadingIndicator();

      // Start exit animation
      document.body.classList.add("page-exit");

      // Wait for animation to complete
      await new Promise((resolve) =>
        setTimeout(resolve, this.transitionDuration)
      );

      // Navigate to new page
      window.location.href = url;
    } catch (error) {
      console.error("Navigation error:", error);
      this.isTransitioning = false;
      document.body.classList.remove("page-exit");
      this.hideLoadingIndicator();
    }
  }

  showLoadingIndicator() {
    // Remove existing indicator if present
    this.hideLoadingIndicator();

    const indicator = document.createElement("div");
    indicator.className = "page-loading";
    indicator.innerHTML = '<div class="loading-bar"></div>';
    document.body.appendChild(indicator);
  }

  hideLoadingIndicator() {
    const existing = document.querySelector(".page-loading");
    if (existing) {
      existing.remove();
    }
  }

  // Method for programmatic navigation
  static navigateTo(url, options = {}) {
    const manager = window.pageTransitionManager || new PageTransitionManager();
    manager.navigateWithTransition(url);
  }
}

// Page Preloader for faster transitions
class PagePreloader {
  constructor() {
    this.preloadedPages = new Set();
  }

  preloadPage(url) {
    if (this.preloadedPages.has(url)) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);

    this.preloadedPages.add(url);
  }

  preloadCriticalPages() {
    // Preload commonly accessed pages based on current page
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    let criticalPages = [];

    switch (currentPage) {
      case "index.html":
      case "":
        criticalPages = [
          "pages/auth.html",
          "pages/stories.html",
          "pages/about.html",
        ];
        break;
      case "profile.html":
        criticalPages = ["submit.html", "stories.html", "auth.html"];
        break;
      case "stories.html":
        criticalPages = ["submit.html", "profile.html"];
        break;
      default:
        criticalPages = ["index.html", "pages/stories.html"];
    }

    // Preload after a short delay to not interfere with initial page load
    setTimeout(() => {
      criticalPages.forEach((page) => this.preloadPage(page));
    }, 2000);
  }
}

// Initialize page transition manager and preloader
// Run immediately and also on DOMContentLoaded to ensure it works in all cases
function initializePageTransitions() {
  // Initialize page transitions
  window.pageTransitionManager = new PageTransitionManager();
  window.pageTransitionManager.init();

  // Initialize preloader
  const preloader = new PagePreloader();
  preloader.preloadCriticalPages();

  // Export smooth navigate function for global use
  window.smoothNavigate = PageTransitionManager.navigateTo;

  console.log("🎬 Page transitions fully initialized");
}

// Try to initialize immediately
if (document.readyState === "loading") {
  // Document is still loading, wait for DOMContentLoaded
  document.addEventListener("DOMContentLoaded", initializePageTransitions);
} else {
  // Document is already loaded, initialize immediately
  initializePageTransitions();
}

// Also listen for DOMContentLoaded as a backup
document.addEventListener("DOMContentLoaded", () => {
  if (!window.pageTransitionManager) {
    console.log("🔄 Backup initialization of page transitions");
    initializePageTransitions();
  }
});

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PageTransitionManager, PagePreloader };
}
