// Profile Management JavaScript
class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userArticles = [];
    this.currentTab = "all";
  }

  async initialize() {
    try {
      // Wait for database to be ready
      if (!window.UmojaDB) {
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
    } catch (error) {
      // Removed error notification - just log to console
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
        window.SessionManager.setSession(user, false);
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
      // Removed error notification - just log to console
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
      // Clear all containers first to prevent "no articles" flash
      const containers = [
        "articles-list",
        "published-list",
        "drafts-list",
        "pending-list",
      ];
      containers.forEach((id) => {
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = '<div class="loading-spinner">Loading...</div>';
        }
      });

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

        // Force immediate re-render
        setTimeout(() => {
          this.renderArticles();
          this.updateStatistics();
        }, 100);
      } else {
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
    console.log(`🗑️ Attempting to delete ${status}: ${articleId}`);

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
      console.log("❌ Delete cancelled by user");
      return;
    }

    try {
      console.log("🔄 Processing deletion...");

      // Ensure database is available
      if (!this.db && window.UmojaDB) {
        this.db = window.UmojaDB;
      }

      if (!this.db) {
        throw new Error("Database not available. Please refresh the page.");
      }

      let result;
      if (status === "draft") {
        result = await this.db.deleteDraft(articleId);
      } else {
        result = await this.db.deleteStory(articleId);
      }

      console.log("📊 Delete result:", result);

      if (result.success) {
        console.log("✅ Story deleted successfully");

        // Show success message first
        if (window.NotificationSystem) {
          window.NotificationSystem.showNotification({
            type: "success",
            message: `${
              status === "draft" ? "Draft" : "Story"
            } deleted successfully`,
          });
        }

        // Force immediate page refresh for clean UI update
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.error("❌ Delete failed:", result.error);
        // Show error message
        if (window.NotificationSystem) {
          window.NotificationSystem.showNotification({
            type: "error",
            message: `Failed to delete ${status}: ${
              result.error || "Unknown error"
            }`,
          });
        }
      }
    } catch (error) {
      console.error("💥 Delete error:", error);
      // Show error message
      if (window.NotificationSystem) {
        window.NotificationSystem.showNotification({
          type: "error",
          message: `Failed to delete ${status}: ${error.message}`,
        });
      }
    }
  }

  async showConfirmationDialog(title, message, description, type = "warning") {
    return new Promise((resolve) => {
      // Clean simple modal
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; 
        justify-content: center; z-index: 999999;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background: white; border-radius: 8px; padding: 24px; 
        max-width: 400px; width: 90%; text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      `;

      const icons = { warning: "⚠️", error: "🗑️", info: "ℹ️" };
      const colors = { warning: "#f59e0b", error: "#ef4444", info: "#3b82f6" };

      modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">${
          icons[type] || icons.warning
        }</div>
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${title}</h3>
        <p style="margin: 0 0 8px 0; color: #6b7280;">${message}</p>
        <p style="margin: 0 0 24px 0; color: #9ca3af; font-size: 14px;">${description}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="cancel-btn" style="
            padding: 8px 16px; border: 1px solid #ddd; background: white; 
            color: #666; border-radius: 4px; cursor: pointer;
          ">Cancel</button>
          <button class="confirm-btn" style="
            padding: 8px 16px; border: none; background: ${
              colors[type] || colors.warning
            }; 
            color: white; border-radius: 4px; cursor: pointer;
          ">Delete</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      modal.querySelector(".cancel-btn").onclick = () => {
        overlay.remove();
        resolve(false);
      };
      modal.querySelector(".confirm-btn").onclick = () => {
        overlay.remove();
        resolve(true);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      };
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

        // Redirect to home page after a short delay
        setTimeout(() => {
          if (window.smoothNavigate) {
            window.smoothNavigate("../index.html");
          } else {
            window.location.href = "../index.html";
          }
        }, 1500);
      } else {
        // Error handling - could show user notification here
      }
    } catch (error) {
      // Still clear session and redirect even if database logout fails
      if (window.SessionManager) {
        window.SessionManager.logout();
      }
    }
  }

  editProfile() {
    // Feature coming soon
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    // Error handling placeholder
  }

  showSuccess(message) {
    // Success handling placeholder
  }
}

// Initialize profile manager when DOM is loaded
let profileManager;

// Expose ProfileManager globally
window.ProfileManager = ProfileManager;

// Initialize profileManager globally
document.addEventListener("DOMContentLoaded", function () {
  if (!profileManager) {
    profileManager = new ProfileManager();
    window.profileManager = profileManager; // Make it globally accessible
  }

  // Mobile navigation toggle
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const nav = document.querySelector("nav");

  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", function () {
      nav.classList.toggle("active");
    });
  }
});
