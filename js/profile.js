// Profile Management JavaScript
class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userArticles = [];
    this.currentTab = "all";
  }

  async initialize() {
    try {
      console.log("🔄 Initializing ProfileManager...");

      // Wait for database to be ready
      if (!window.UmojaDB) {
        console.log("⏳ Waiting for database...");
        await this.waitForDatabase();
      }

      this.db = window.UmojaDB;

      // Check if user is authenticated
      const authResult = await this.checkAuthentication();
      if (!authResult.success) {
        this.redirectToAuth();
        return;
      }

      this.currentUser = authResult.user;

      // Initialize the page
      await this.loadProfileData();
      this.setupEventListeners();
      // Navigation will be handled by auth-guard.js

      console.log("✅ ProfileManager initialized successfully");
    } catch (error) {
      console.error("❌ ProfileManager initialization failed:", error);
      this.showError("Failed to load profile. Please try again.");
    }
  }

  async waitForDatabase(maxAttempts = 50) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.UmojaDB && window.UmojaDB.isInitialized) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Database not available");
  }

  async checkAuthentication() {
    try {
      // First check session manager
      if (window.SessionManager && window.SessionManager.isAuthenticated()) {
        const user = window.SessionManager.getCurrentUser();
        if (user) {
          return { success: true, user: user };
        }
      }

      // Fallback to database check
      const user = await this.db.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Update session if database has user but session doesn't
      if (window.SessionManager) {
        window.SessionManager.setSession(user, false); // Default to 24h timeout
      }

      return { success: true, user: user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  redirectToAuth() {
    // Use smooth transition instead of direct redirect
    if (window.smoothNavigate) {
      window.smoothNavigate("auth.html");
    } else {
      window.location.href = "auth.html";
    }
  }

  async loadProfileData() {
    try {
      // Update profile header
      this.updateProfileHeader();

      // Load user articles
      await this.loadUserArticles();

      // Update statistics
      this.updateStatistics();
    } catch (error) {
      console.error("Error loading profile data:", error);
      this.showError("Failed to load profile data");
    }
  }

  updateProfileHeader() {
    const nameElement = document.getElementById("profile-name");
    const emailElement = document.getElementById("profile-email");
    const memberSinceElement = document.getElementById("member-since");
    const lastActiveElement = document.getElementById("last-active");

    if (this.currentUser) {
      const userData = this.currentUser.user_metadata || {};
      const displayName =
        userData.name ||
        userData.firstName ||
        this.currentUser.email.split("@")[0];

      nameElement.textContent = displayName;
      emailElement.textContent = this.currentUser.email;

      const createdAt = new Date(this.currentUser.created_at);
      memberSinceElement.textContent = createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      const lastSignIn = new Date(
        this.currentUser.last_sign_in_at || this.currentUser.created_at
      );
      lastActiveElement.textContent = lastSignIn.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  async loadUserArticles() {
    try {
      const result = await this.db.getUserStories(this.currentUser.id);
      if (result.success) {
        this.userArticles = result.stories || [];

        // Also load drafts separately
        const draftResult = await this.db.getAllDrafts();
        if (draftResult.success) {
          // Merge drafts with articles, avoiding duplicates
          const draftIds = this.userArticles
            .filter((a) => a.status === "draft")
            .map((a) => a.id);
          const newDrafts = draftResult.drafts.filter(
            (d) => !draftIds.includes(d.id)
          );
          this.userArticles = [...this.userArticles, ...newDrafts];
        }

        this.renderArticles();
      } else {
        console.error("Failed to load articles:", result.error);
        this.userArticles = [];
        this.renderArticles();
      }
    } catch (error) {
      console.error("Error loading articles:", error);
      this.userArticles = [];
      this.renderArticles();
    }
  }

  updateStatistics() {
    const publishedCount = this.userArticles.filter(
      (article) => article.status === "approved"
    ).length;
    const draftCount = this.userArticles.filter(
      (article) => article.status === "draft"
    ).length;
    const totalViews = this.userArticles.reduce(
      (sum, article) => sum + (article.views || 0),
      0
    );

    document.getElementById("published-count").textContent = publishedCount;
    document.getElementById("draft-count").textContent = draftCount;
    document.getElementById("total-views").textContent = totalViews;
  }

  renderArticles() {
    const tabs = ["all", "published", "drafts", "pending"];

    tabs.forEach((tab) => {
      const container = document.getElementById(
        `${tab === "all" ? "articles" : tab === "drafts" ? "drafts" : tab}-list`
      );
      if (!container) return;

      let filteredArticles = this.userArticles;

      switch (tab) {
        case "published":
          filteredArticles = this.userArticles.filter(
            (article) => article.status === "approved"
          );
          break;
        case "drafts":
          filteredArticles = this.userArticles.filter(
            (article) => article.status === "draft"
          );
          break;
        case "pending":
          filteredArticles = this.userArticles.filter(
            (article) => article.status === "pending"
          );
          break;
      }

      if (filteredArticles.length === 0) {
        container.innerHTML = this.getEmptyStateHTML(tab);
      } else {
        container.innerHTML = filteredArticles
          .map((article) => this.createArticleHTML(article))
          .join("");
      }
    });
  }

  createArticleHTML(article) {
    const statusClass = `status-${article.status || "draft"}`;
    let statusText =
      (article.status || "draft").charAt(0).toUpperCase() +
      (article.status || "draft").slice(1);

    // Show "Published" instead of "Approved" for better UX
    if (article.status === "approved") {
      statusText = "Published";
    }
    const createdDate = new Date(article.created_at).toLocaleDateString();
    const updatedDate = new Date(
      article.updated_at || article.created_at
    ).toLocaleDateString();

    return `
      <div class="article-item" data-article-id="${article.id}">
        <div class="article-info">
          <h3>${this.escapeHtml(article.title || "Untitled")}</h3>
          <div class="article-meta">
            <span><i class="fas fa-calendar"></i> Created: ${createdDate}</span>
            <span><i class="fas fa-edit"></i> Updated: ${updatedDate}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${
              article.views
                ? `<span><i class="fas fa-eye"></i> ${article.views} views</span>`
                : ""
            }
            ${
              article.status === "draft"
                ? `<span class="draft-indicator"><i class="fas fa-file-alt"></i> Draft</span>`
                : ""
            }
          </div>
        </div>
        <div class="article-actions">
          ${
            article.status === "approved"
              ? `<button class="action-btn view-btn" onclick="profileManager.viewArticle('${article.id}')">
                   <i class="fas fa-eye"></i> View
                 </button>`
              : ""
          }
          <button class="action-btn edit-btn" onclick="profileManager.editArticle('${
            article.id
          }')">
            <i class="fas fa-edit"></i> ${
              article.status === "draft" ? "Continue" : "Edit"
            }
          </button>
          <button class="action-btn delete-btn" onclick="profileManager.deleteArticle('${
            article.id
          }', '${this.escapeHtml(article.title || "Untitled")}', '${
      article.status
    }')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }

  getEmptyStateHTML(tab) {
    const messages = {
      all: {
        icon: "fas fa-pen",
        text: "No articles yet",
        subtext: "Start by writing your first story!",
      },
      published: {
        icon: "fas fa-globe",
        text: "No published articles",
        subtext: "Publish your stories to share with the world",
      },
      drafts: {
        icon: "fas fa-file-alt",
        text: "No drafts",
        subtext: "Save drafts while working on your stories",
      },
      pending: {
        icon: "fas fa-clock",
        text: "No pending articles",
        subtext: "Articles awaiting review will appear here",
      },
    };

    const message = messages[tab] || messages.all;

    return `
      <div class="empty-state">
        <i class="${message.icon}"></i>
        <h3>${message.text}</h3>
        <p>${message.subtext}</p>
        ${
          tab === "all"
            ? '<a href="submit.html" class="btn primary smooth-nav">Write Your First Story</a>'
            : ""
        }
      </div>
    `;
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Logout button
    document.getElementById("logout-btn").addEventListener("click", () => {
      this.logout();
    });

    // Edit profile button
    document
      .getElementById("edit-profile-btn")
      .addEventListener("click", () => {
        this.editProfile();
      });
  }

  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    const targetContent = document.getElementById(
      `${tab === "all" ? "all" : tab === "drafts" ? "draft" : tab}-articles`
    );
    if (targetContent) {
      targetContent.classList.add("active");
    }

    this.currentTab = tab;
  }

  async viewArticle(articleId) {
    // Use smooth transition for article view
    const url = `story-detail.html?id=${articleId}`;
    if (window.smoothNavigate) {
      window.smoothNavigate(url);
    } else {
      window.location.href = url;
    }
  }

  async editArticle(articleId) {
    // Use smooth transition for edit page
    const url = `submit.html?edit=${articleId}`;
    if (window.smoothNavigate) {
      window.smoothNavigate(url);
    } else {
      window.location.href = url;
    }
  }

  async deleteArticle(articleId, title, status = "story") {
    // Create custom confirmation dialog
    const isConfirmed = await this.showConfirmationDialog(
      `Delete ${status === "draft" ? "Draft" : "Story"}`,
      `Are you sure you want to delete "${title}"?`,
      `This ${
        status === "draft" ? "draft" : "story"
      } will be permanently removed and cannot be recovered.`,
      status === "draft" ? "warning" : "error"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      // Show loading notification
      const loadingNotification = window.showInfo(`Deleting ${status}...`, {
        title: "Please wait",
        persistent: true,
        closable: false,
      });

      let result;
      if (status === "draft") {
        result = await this.db.deleteDraft(articleId);
      } else {
        result = await this.db.deleteStory(articleId);
      }

      // Remove loading notification
      window.NotificationSystem.remove(loadingNotification);

      if (result.success) {
        window.showSuccess(
          `${status === "draft" ? "Draft" : "Story"} deleted successfully`,
          {
            title: "Deleted Successfully",
          }
        );

        // Remove from UI immediately for better UX
        const articleElement = document.querySelector(
          `[data-article-id="${articleId}"]`
        );
        if (articleElement) {
          articleElement.style.transition = "all 0.3s ease";
          articleElement.style.opacity = "0";
          articleElement.style.transform = "translateX(-20px)";
          setTimeout(() => {
            articleElement.remove();
          }, 300);
        }

        // Reload articles after a short delay
        setTimeout(async () => {
          await this.loadUserArticles();
          this.updateStatistics();
        }, 500);
      } else {
        window.showError(`Failed to delete ${status}: ${result.error}`, {
          title: "Delete Failed",
        });
      }
    } catch (error) {
      console.error(`Error deleting ${status}:`, error);
      window.showError(`Failed to delete ${status}`, {
        title: "Delete Failed",
      });
    }
  }

  async showConfirmationDialog(title, message, description, type = "warning") {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement("div");
      overlay.className = "confirmation-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

      // Create modal
      const modal = document.createElement("div");
      modal.className = "confirmation-modal";
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      `;

      const iconColors = {
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
      };

      const iconNames = {
        warning: "fas fa-exclamation-triangle",
        error: "fas fa-trash",
        info: "fas fa-info-circle",
      };

      modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <i class="${iconNames[type]}" style="font-size: 48px; color: ${iconColors[type]}; margin-bottom: 16px;"></i>
          <h3 style="margin: 0; color: #1f2937; font-size: 20px;">${title}</h3>
          <p style="margin: 8px 0; color: #4b5563; font-size: 16px;">${message}</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${description}</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="cancel-btn" style="
            padding: 8px 16px;
            border: 2px solid #d1d5db;
            background: white;
            color: #374151;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">Cancel</button>
          <button class="confirm-btn" style="
            padding: 8px 16px;
            border: none;
            background: ${iconColors[type]};
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">Delete</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Show modal with animation
      setTimeout(() => {
        overlay.style.opacity = "1";
        modal.style.transform = "scale(1)";
      }, 10);

      // Handle clicks
      const handleClose = (confirmed) => {
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.9)";
        setTimeout(() => {
          document.body.removeChild(overlay);
          resolve(confirmed);
        }, 300);
      };

      modal
        .querySelector(".cancel-btn")
        .addEventListener("click", () => handleClose(false));
      modal
        .querySelector(".confirm-btn")
        .addEventListener("click", () => handleClose(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) handleClose(false);
      });

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", handleEscape);
          handleClose(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
    });
  }

  async logout() {
    const isConfirmed = await this.showConfirmationDialog(
      "Sign Out",
      "Are you sure you want to sign out?",
      "You will need to sign in again to access your account.",
      "info"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      const result = await this.db.signOut();
      if (result.success) {
        // Clear session
        if (window.SessionManager) {
          window.SessionManager.logout();
        }

        // Clear any cached data
        this.currentUser = null;
        this.userArticles = [];

        window.showSuccess("Successfully signed out", {
          title: "Goodbye!",
        });

        // Redirect to home page after a short delay
        setTimeout(() => {
          if (window.smoothNavigate) {
            window.smoothNavigate("../index.html");
          } else {
            window.location.href = "../index.html";
          }
        }, 1500);
      } else {
        window.showError("Failed to logout: " + result.error);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Still clear session and redirect even if database logout fails
      if (window.SessionManager) {
        window.SessionManager.logout();
      }
      window.showError("Failed to logout");
    }
  }

  editProfile() {
    window.showInfo("Profile editing feature is coming soon!", {
      title: "Feature Coming Soon",
    });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    window.showError(message);
  }

  showSuccess(message) {
    window.showSuccess(message);
  }
}

// Initialize profile manager when DOM is loaded
let profileManager;

document.addEventListener("DOMContentLoaded", async () => {
  profileManager = new ProfileManager();
  await profileManager.initialize();
});

// Mobile navigation toggle
document.addEventListener("DOMContentLoaded", function () {
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const nav = document.querySelector("nav");

  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", function () {
      nav.classList.toggle("active");
    });
  }
});
