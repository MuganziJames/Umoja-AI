// Enhanced Main.js with Backend and AI Integration
class UmojaMain {
  constructor() {
    this.featuredStories = [];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadFeaturedStories();
    this.setupNewsletterForm();
    this.setupMobileNavigation();
    this.setupAnimations();
  }

  setupEventListeners() {
    // Mobile navigation
    const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
    if (mobileNavToggle) {
      mobileNavToggle.addEventListener(
        "click",
        this.toggleMobileNav.bind(this)
      );
    }

    // Newsletter form
    const newsletterForm = document.querySelector(".newsletter-form");
    if (newsletterForm) {
      newsletterForm.addEventListener(
        "submit",
        this.handleNewsletterSubmission.bind(this)
      );
    }

    // CTA buttons with analytics
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", this.trackButtonClick.bind(this));
    });

    // Story card interactions
    document.addEventListener("click", this.handleStoryCardClick.bind(this));
  }

  async loadFeaturedStories() {
    try {
      const storiesContainer = document.querySelector(".stories-grid");
      if (!storiesContainer) return;

      // Show loading state
      storiesContainer.innerHTML = this.createLoadingHTML();

      // Load stories from backend
      const result = await window.UmojaDB?.getStories({ limit: 6 });

      if (result?.success && result.stories?.length > 0) {
        this.featuredStories = result.stories;
        this.displayFeaturedStories();
      } else {
        // Fallback to default content or show empty state
        this.displayDefaultStories();
      }
    } catch (error) {
      console.error("Error loading featured stories:", error);
      this.displayDefaultStories();
    }
  }

  displayFeaturedStories() {
    const storiesContainer = document.querySelector(".stories-grid");
    if (!storiesContainer) return;

    storiesContainer.innerHTML = this.featuredStories
      .map((story) => this.createFeaturedStoryHTML(story))
      .join("");

    // Add click handlers
    this.addStoryCardHandlers();

    // Animate cards
    this.animateStoryCards();
  }

  createFeaturedStoryHTML(story) {
    const readingTime = Math.ceil((story.content?.length || 0) / 250);
    const publishDate = new Date(story.published_at || story.created_at).toLocaleDateString();
    const excerpt = story.summary || this.generateExcerpt(story.content);

    return `
            <article class="story-card featured-story" data-story-id="${
              story.id
            }">
                <div class="story-image">
                    ${
                      story.image_url
                        ? `<img src="${story.image_url}" alt="${this.escapeHtml(
                            story.title
                          )}" loading="lazy">`
                        : `<div class="story-placeholder">
                             <i class="fas fa-book-open"></i>
                           </div>`
                    }
                    <div class="story-overlay">
                        <span class="category category-${story.category}">
                            ${story.category?.replace("-", " ") || "Story"}
                        </span>
                    </div>
                </div>
                <div class="story-content">
                    <div class="story-meta">
                        <span class="reading-time">
                            <i class="fas fa-clock"></i> ${readingTime} min read
                        </span>
                        <span class="publish-date">${publishDate}</span>
                    </div>
                    <h3 class="story-title">${this.escapeHtml(story.title)}</h3>
                    <p class="story-excerpt">${this.escapeHtml(excerpt)}</p>
                    <div class="story-author">
                        <i class="fas fa-user"></i>
                        <span>${this.escapeHtml(story.author_name)}</span>
                    </div>
                    <div class="story-actions">
                        <button class="read-more-btn" data-story-id="${
                          story.id
                        }">
                            Read More <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
  }

  createLoadingHTML() {
    return Array(6)
      .fill()
      .map(
        () => `
            <article class="story-card loading-card">
                <div class="story-image skeleton">
                    <div class="skeleton-content"></div>
                </div>
                <div class="story-content">
                    <div class="skeleton skeleton-text skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text skeleton-short"></div>
                </div>
            </article>
        `
      )
      .join("");
  }

  displayDefaultStories() {
    const storiesContainer = document.querySelector(".stories-grid");
    if (!storiesContainer) return;

    // Keep original static content as fallback
    const defaultHTML = `
            <article class="story-card">
                <div class="story-image">
                    <div class="story-placeholder">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="story-overlay">
                        <span class="category category-mental-health">Mental Health</span>
                    </div>
                </div>
                <div class="story-content">
                    <div class="story-meta">
                        <span class="reading-time"><i class="fas fa-clock"></i> 5 min read</span>
                        <span class="publish-date">Sample Story</span>
                    </div>
                    <h3 class="story-title">Breaking the Silence: My Journey with Mental Health</h3>
                    <p class="story-excerpt">A personal account of overcoming stigma and finding hope through community support and professional help.</p>
                    <div class="story-author">
                        <i class="fas fa-user"></i>
                        <span>Sarah Johnson</span>
                    </div>
                    <div class="story-actions">
                        <a href="pages/stories.html" class="read-more-btn">
                            Read More <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </article>
        `;

    storiesContainer.innerHTML = defaultHTML.repeat(3);
  }

  addStoryCardHandlers() {
    document.querySelectorAll(".read-more-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const storyId = btn.dataset.storyId;

        if (storyId) {
          await this.readStory(storyId);
        } else {
          // Fallback to stories page
          window.location.href = "pages/stories.html";
        }
      });
    });
  }

  async readStory(storyId) {
    try {
      // Track analytics
      this.trackStoryClick(storyId);

      // Load and display story
      const result = await window.UmojaDB?.getStoryById(storyId);

      if (result?.success) {
        this.displayStoryModal(result.story);
      } else {
        // Fallback to stories page
        window.location.href = `pages/stories.html?story=${storyId}`;
      }
    } catch (error) {
      console.error("Error reading story:", error);
      window.location.href = "pages/stories.html";
    }
  }

  displayStoryModal(story) {
    // Reuse modal from stories-enhanced.js if available
    if (window.StoriesManager) {
      const storiesManager = new window.StoriesManager();
      storiesManager.displayStoryModal(story);
    } else {
      // Simple fallback modal
      this.showSimpleModal(story);
    }
  }

  showSimpleModal(story) {
    const modal = document.createElement("div");
    modal.className = "simple-story-modal";
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${this.escapeHtml(story.title)}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <p class="story-author">By ${this.escapeHtml(
                      story.author_name
                    )}</p>
                    <div class="story-content">
                        ${this.formatStoryContent(story.content)}
                    </div>
                </div>
                <div class="modal-footer">
                    <a href="pages/stories.html" class="btn primary">Read More Stories</a>
                    <button class="btn outline modal-close">Close</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Add close handlers
    modal.querySelectorAll(".modal-close, .modal-backdrop").forEach((el) => {
      el.addEventListener("click", () => {
        modal.remove();
      });
    });

    // Show modal
    setTimeout(() => modal.classList.add("show"), 10);
  }

  setupNewsletterForm() {
    const newsletterForm = document.querySelector(".newsletter-form");
    if (!newsletterForm) return;

    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const submitBtn = newsletterForm.querySelector('button[type="submit"]');

    if (!emailInput || !submitBtn) return;

    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleNewsletterSubmission(e);
    });
  }

  async handleNewsletterSubmission(e) {
    e.preventDefault();

    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!emailInput || !submitBtn) return;

    const email = emailInput.value.trim();

    if (!email) {
      this.showMessage("Please enter a valid email address.", "error");
      return;
    }

    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
    submitBtn.disabled = true;

    try {
      // In a real implementation, you would send this to your backend
      // For now, we'll simulate the process
      await this.simulateNewsletterSignup(email);

      // Success
      emailInput.value = "";
      this.showMessage(
        "Thank you for subscribing to our newsletter!",
        "success"
      );

      // Track analytics
      this.trackNewsletterSignup(email);
    } catch (error) {
      console.error("Newsletter signup error:", error);
      this.showMessage(
        "Something went wrong. Please try again later.",
        "error"
      );
    } finally {
      // Reset button
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  }

  async simulateNewsletterSignup(email) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }

  toggleMobileNav() {
    const nav = document.querySelector("nav");
    const toggle = document.querySelector(".mobile-nav-toggle");

    if (!nav || !toggle) return;

    nav.classList.toggle("active");
    const isOpen = nav.classList.contains("active");

    toggle.innerHTML = isOpen
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';

    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  setupMobileNavigation() {
    // Close mobile nav when clicking on links
    document.querySelectorAll("nav a").forEach((link) => {
      link.addEventListener("click", () => {
        const nav = document.querySelector("nav");
        const toggle = document.querySelector(".mobile-nav-toggle");

        if (nav?.classList.contains("active")) {
          nav.classList.remove("active");
          if (toggle) {
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
          }
          document.body.style.overflow = "";
        }
      });
    });

    // Close mobile nav when clicking outside
    document.addEventListener("click", (e) => {
      const nav = document.querySelector("nav");
      const toggle = document.querySelector(".mobile-nav-toggle");

      if (
        nav?.classList.contains("active") &&
        !nav.contains(e.target) &&
        !toggle?.contains(e.target)
      ) {
        nav.classList.remove("active");
        if (toggle) {
          toggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
        document.body.style.overflow = "";
      }
    });
  }

  setupAnimations() {
    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements for animation
    document
      .querySelectorAll(".story-card, .cta-buttons, .stats-item")
      .forEach((el) => {
        observer.observe(el);
      });
  }

  animateStoryCards() {
    const cards = document.querySelectorAll(".story-card");
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add("animate-in");
      }, index * 150);
    });
  }

  handleStoryCardClick(e) {
    // Handle clicks on story cards for analytics
    const storyCard = e.target.closest(".story-card");
    if (storyCard) {
      const storyId = storyCard.dataset.storyId;
      if (storyId) {
        this.trackStoryClick(storyId);
      }
    }
  }

  // Analytics functions
  trackButtonClick(e) {
    const button = e.target.closest(".btn");
    if (!button) return;

    const buttonText = button.textContent.trim();
    const buttonHref = button.href || button.dataset.href;

    this.trackEvent("button_click", {
      button_text: buttonText,
      button_href: buttonHref,
      page: "home",
    });
  }

  trackStoryClick(storyId) {
    this.trackEvent("story_click", {
      story_id: storyId,
      page: "home",
    });
  }

  trackNewsletterSignup(email) {
    this.trackEvent("newsletter_signup", {
      email_domain: email.split("@")[1],
      page: "home",
    });
  }

  async trackEvent(eventName, properties = {}) {
    try {
      // Track with your analytics service
      if (window.gtag) {
        window.gtag("event", eventName, properties);
      }

      // Track with your backend
      if (window.UmojaDB) {
        // Custom analytics tracking
        console.log("Analytics:", eventName, properties);
      }
    } catch (error) {
      console.error("Analytics error:", error);
    }
  }

  // Utility functions
  generateExcerpt(content, maxLength = 120) {
    if (!content) return "";
    return content.length > maxLength
      ? content.substring(0, maxLength).trim() + "..."
      : content;
  }

  formatStoryContent(content) {
    if (!content) return "";
    return content
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`)
      .join("");
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showMessage(message, type = "info") {
    // Create notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

    // Add styles if not present
    if (!document.querySelector("#notification-styles")) {
      const styles = document.createElement("style");
      styles.id = "notification-styles";
      styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                }
                .notification-info { background: #3498db; color: white; }
                .notification-success { background: #2ecc71; color: white; }
                .notification-error { background: #e74c3c; color: white; }
                .notification-content { display: flex; justify-content: space-between; align-items: center; }
                .notification-content button { background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 10px; }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .simple-story-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; }
                .simple-story-modal.show { opacity: 1; }
                .simple-story-modal .modal-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); }
                .simple-story-modal .modal-content { position: relative; background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
                .simple-story-modal .modal-header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .simple-story-modal .modal-body { padding: 20px; }
                .simple-story-modal .modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; gap: 12px; justify-content: flex-end; }
                .simple-story-modal .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
            `;
      document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = "slideInRight 0.3s ease reverse";
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.umojaMain = new UmojaMain();
});

// Export for global access
window.UmojaMain = UmojaMain;
