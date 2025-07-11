// Enhanced Stories.js with AI and Backend Integration
class StoriesManager {
  constructor() {
    this.stories = [];
    this.filteredStories = [];
    this.currentCategory = "all";
    this.currentPage = 1;
    this.storiesPerPage = 6;
    this.searchTerm = "";
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadStories();
    this.setupRealTimeUpdates();
  }

  setupEventListeners() {
    // Category filter
    const categoryButtons = document.querySelectorAll(".category-btn");
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleCategoryFilter(e));
    });

    // Search functionality
    const searchInput = document.getElementById("story-search");
    const searchBtn = document.getElementById("search-btn");

    if (searchInput) {
      searchInput.addEventListener("input", this.debounceSearch.bind(this));
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleSearch();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", this.handleSearch.bind(this));
    }

    // AI-powered recommendations
    const aiRecommendBtn = document.getElementById("ai-recommendations");
    if (aiRecommendBtn) {
      aiRecommendBtn.addEventListener(
        "click",
        this.getAIRecommendations.bind(this)
      );
    }

    // Sentiment filter
    const sentimentFilter = document.getElementById("sentiment-filter");
    if (sentimentFilter) {
      sentimentFilter.addEventListener(
        "change",
        this.handleSentimentFilter.bind(this)
      );
    }

    // Pagination
    this.setupPagination();
  }

  async loadStories(filters = {}) {
    try {
      this.showLoading(true);

      const result = await window.UmojaDB?.getStories(filters);

      if (result?.success) {
        this.stories = result.stories;
        this.filterStories();
        this.displayStories();
        this.updateStoryCount();
      } else {
        this.showError("Failed to load stories. Please try again later.");
      }
    } catch (error) {
      console.error("Error loading stories:", error);
      this.showError("Error loading stories.");
    } finally {
      this.showLoading(false);
    }
  }

  async handleSearch() {
    const searchInput = document.getElementById("story-search");
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim();
    this.searchTerm = searchTerm;

    if (searchTerm) {
      try {
        this.showLoading(true);
        const result = await window.UmojaDB?.searchStories(searchTerm);

        if (result?.success) {
          this.stories = result.stories;
          this.filterStories();
          this.displayStories();
          this.updateStoryCount();
          this.highlightSearchTerms(searchTerm);
        }
      } catch (error) {
        console.error("Search error:", error);
        this.showError("Search failed. Please try again.");
      } finally {
        this.showLoading(false);
      }
    } else {
      // Reset to all stories
      await this.loadStories();
    }
  }

  debounceSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (this.searchTerm !== document.getElementById("story-search")?.value) {
        this.handleSearch();
      }
    }, 500);
  }

  handleCategoryFilter(e) {
    const category = e.target.dataset.category;
    this.currentCategory = category;
    this.currentPage = 1;

    // Update button states
    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    e.target.classList.add("active");

    this.filterStories();
    this.displayStories();
    this.updateStoryCount();
  }

  handleSentimentFilter(e) {
    const sentiment = e.target.value;
    this.currentSentiment = sentiment;
    this.currentPage = 1;

    this.filterStories();
    this.displayStories();
    this.updateStoryCount();
  }

  filterStories() {
    this.filteredStories = this.stories.filter((story) => {
      // Category filter
      if (
        this.currentCategory !== "all" &&
        story.category !== this.currentCategory
      ) {
        return false;
      }

      // Sentiment filter
      if (this.currentSentiment && this.currentSentiment !== "all") {
        if (
          !story.sentiment_data ||
          story.sentiment_data.label !== this.currentSentiment
        ) {
          return false;
        }
      }

      return true;
    });
  }

  displayStories() {
    const storiesContainer = document.getElementById("stories-container");
    if (!storiesContainer) return;

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.storiesPerPage;
    const endIndex = startIndex + this.storiesPerPage;
    const paginatedStories = this.filteredStories.slice(startIndex, endIndex);

    if (paginatedStories.length === 0) {
      storiesContainer.innerHTML = this.getEmptyState();
      return;
    }

    // Render stories
    storiesContainer.innerHTML = paginatedStories
      .map((story) => this.createStoryCard(story))
      .join("");

    // Update pagination
    this.updatePagination();

    // Add click handlers for story cards
    this.addStoryCardHandlers();
  }

  createStoryCard(story) {
    const readingTime = Math.ceil((story.content?.length || 0) / 250);
    const publishDate = new Date(story.created_at).toLocaleDateString();
    const sentimentEmoji = this.getSentimentEmoji(story.sentiment_data);

    return `
            <article class="story-card" data-story-id="${story.id}">
                <div class="story-header">
                    <div class="story-meta">
                        <span class="category category-${story.category}">${
      story.category?.replace("-", " ") || "General"
    }</span>
                        <span class="reading-time">
                            <i class="fas fa-clock"></i> ${readingTime} min read
                        </span>
                        ${
                          sentimentEmoji
                            ? `<span class="sentiment-indicator" title="Story sentiment">${sentimentEmoji}</span>`
                            : ""
                        }
                    </div>
                    <time class="publish-date">${publishDate}</time>
                </div>
                
                <div class="story-content">
                    <h3 class="story-title">${this.escapeHtml(story.title)}</h3>
                    <p class="story-excerpt">${this.escapeHtml(
                      story.summary || this.generateExcerpt(story.content)
                    )}</p>
                    <p class="story-author">
                        <i class="fas fa-user"></i> ${this.escapeHtml(
                          story.author_name
                        )}
                    </p>
                </div>
                
                <div class="story-footer">
                    <div class="story-actions">
                        <button class="btn primary story-read-btn" data-story-id="${
                          story.id
                        }">
                            <i class="fas fa-book-open"></i> Read Story
                        </button>
                        <button class="btn outline story-share-btn" data-story-id="${
                          story.id
                        }" data-story-title="${this.escapeHtml(story.title)}">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                    </div>
                </div>
                
                <!-- AI-powered similar stories preview -->
                ${
                  story.similar_stories && story.similar_stories.length > 0
                    ? `
                    <div class="similar-stories-preview">
                        <small><i class="fas fa-lightbulb"></i> AI found ${story.similar_stories.length} similar stories</small>
                    </div>
                `
                    : ""
                }
            </article>
        `;
  }

  addStoryCardHandlers() {
    // Read story buttons
    document.querySelectorAll(".story-read-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const storyId = e.target.dataset.storyId;
        this.readStory(storyId);
      });
    });

    // Share buttons
    document.querySelectorAll(".story-share-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const storyId = e.target.dataset.storyId;
        const storyTitle = e.target.dataset.storyTitle;
        this.shareStory(storyId, storyTitle);
      });
    });
  }

  async readStory(storyId) {
    try {
      const result = await window.UmojaDB?.getStoryById(storyId);

      if (result?.success) {
        this.displayStoryModal(result.story);
      } else {
        this.showError("Failed to load story.");
      }
    } catch (error) {
      console.error("Error reading story:", error);
      this.showError("Error loading story.");
    }
  }

  displayStoryModal(story) {
    const modal = this.createStoryModal(story);
    document.body.appendChild(modal);

    // Add event listeners for modal
    this.setupModalEventListeners(modal, story);

    // Show modal
    setTimeout(() => modal.classList.add("show"), 10);
  }

  createStoryModal(story) {
    const readingTime = Math.ceil((story.content?.length || 0) / 250);
    const publishDate = new Date(story.created_at).toLocaleDateString();

    const modal = document.createElement("div");
    modal.className = "story-modal";
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="story-meta">
                        <span class="category category-${story.category}">${
      story.category?.replace("-", " ") || "General"
    }</span>
                        <span class="reading-time"><i class="fas fa-clock"></i> ${readingTime} min read</span>
                        <time class="publish-date">${publishDate}</time>
                    </div>
                    <button class="modal-close" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <h1 class="story-title">${this.escapeHtml(story.title)}</h1>
                    <p class="story-author">
                        <i class="fas fa-user"></i> By ${this.escapeHtml(
                          story.author_name
                        )}
                    </p>
                    
                    <div class="story-content">
                        ${this.formatStoryContent(story.content)}
                    </div>
                    
                    <!-- AI Insights -->
                    ${this.createAIInsights(story)}
                    
                    <!-- Similar Stories -->
                    ${this.createSimilarStoriesSection(story.similar_stories)}
                </div>
                
                <div class="modal-footer">
                    <button class="btn outline share-story-btn">
                        <i class="fas fa-share-alt"></i> Share This Story
                    </button>
                    <button class="btn secondary close-modal-btn">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

    return modal;
  }

  createAIInsights(story) {
    if (!story.sentiment_data) return "";

    return `
            <div class="ai-insights">
                <h4><i class="fas fa-robot"></i> AI Story Insights</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Emotional Tone:</span>
                        <span class="insight-value">${
                          story.sentiment_data.label || "Not analyzed"
                        }</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Category:</span>
                        <span class="insight-value">${
                          story.category?.replace("-", " ") || "General"
                        }</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Reading Level:</span>
                        <span class="insight-value">Accessible</span>
                    </div>
                </div>
            </div>
        `;
  }

  createSimilarStoriesSection(similarStories) {
    if (!similarStories || similarStories.length === 0) return "";

    return `
            <div class="similar-stories">
                <h4><i class="fas fa-lightbulb"></i> AI Recommended Similar Stories</h4>
                <div class="similar-stories-grid">
                    ${similarStories
                      .map(
                        (story) => `
                        <div class="similar-story-card" data-story-id="${
                          story.id
                        }">
                            <h5>${this.escapeHtml(story.title)}</h5>
                            <p>By ${this.escapeHtml(story.author_name)}</p>
                            <span class="category category-${
                              story.category
                            }">${story.category?.replace("-", " ")}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  setupModalEventListeners(modal, story) {
    // Close modal handlers
    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    modal
      .querySelector(".close-modal-btn")
      .addEventListener("click", closeModal);
    modal
      .querySelector(".modal-backdrop")
      .addEventListener("click", closeModal);

    // Share button
    modal.querySelector(".share-story-btn").addEventListener("click", () => {
      this.shareStory(story.id, story.title);
    });

    // Similar story handlers
    modal.querySelectorAll(".similar-story-card").forEach((card) => {
      card.addEventListener("click", () => {
        const storyId = card.dataset.storyId;
        closeModal();
        this.readStory(storyId);
      });
    });

    // Escape key handler
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }

  async getAIRecommendations() {
    const btn = document.getElementById("ai-recommendations");
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
      // Simple recommendation based on reading history or popular stories
      const filters = { limit: 6 };
      const result = await window.UmojaDB?.getStories(filters);

      if (result?.success) {
        this.stories = result.stories;
        this.filteredStories = this.stories;
        this.displayStories();
        this.showNotification("AI recommendations loaded!", "success");
      }
    } catch (error) {
      console.error("AI recommendations error:", error);
      this.showNotification("Failed to get AI recommendations.", "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  shareStory(storyId, storyTitle) {
    if (navigator.share) {
      navigator.share({
        title: storyTitle,
        text: `Check out this inspiring story: ${storyTitle}`,
        url: `${window.location.origin}/pages/stories.html?story=${storyId}`,
      });
    } else {
      // Fallback - copy link
      const url = `${window.location.origin}/pages/stories.html?story=${storyId}`;
      navigator.clipboard.writeText(url).then(() => {
        this.showNotification("Story link copied to clipboard!", "success");
      });
    }
  }

  setupRealTimeUpdates() {
    if (window.UmojaDB?.subscribeToStories) {
      window.UmojaDB.subscribeToStories((payload) => {
        console.log("Real-time update:", payload);
        if (payload.eventType === "INSERT") {
          this.loadStories(); // Refresh stories
          this.showNotification("New story published!", "info");
        }
      });
    }
  }

  setupPagination() {
    // Pagination will be updated dynamically
  }

  updatePagination() {
    const totalPages = Math.ceil(
      this.filteredStories.length / this.storiesPerPage
    );
    const paginationContainer = document.getElementById("pagination");

    if (!paginationContainer || totalPages <= 1) {
      if (paginationContainer) paginationContainer.style.display = "none";
      return;
    }

    paginationContainer.style.display = "flex";
    paginationContainer.innerHTML = this.createPaginationHTML(totalPages);

    // Add pagination event listeners
    paginationContainer.querySelectorAll(".page-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = parseInt(e.target.dataset.page);
        this.goToPage(page);
      });
    });
  }

  createPaginationHTML(totalPages) {
    let html = "";

    // Previous button
    html += `
            <button class="page-btn ${
              this.currentPage === 1 ? "disabled" : ""
            }" 
                    data-page="${this.currentPage - 1}" 
                    ${this.currentPage === 1 ? "disabled" : ""}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= this.currentPage - 2 && i <= this.currentPage + 2)
      ) {
        html += `
                    <button class="page-btn ${
                      i === this.currentPage ? "active" : ""
                    }" 
                            data-page="${i}">
                        ${i}
                    </button>
                `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        html += '<span class="pagination-dots">...</span>';
      }
    }

    // Next button
    html += `
            <button class="page-btn ${
              this.currentPage === totalPages ? "disabled" : ""
            }" 
                    data-page="${this.currentPage + 1}"
                    ${this.currentPage === totalPages ? "disabled" : ""}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

    return html;
  }

  goToPage(page) {
    if (
      page < 1 ||
      page > Math.ceil(this.filteredStories.length / this.storiesPerPage)
    )
      return;

    this.currentPage = page;
    this.displayStories();

    // Scroll to top of stories
    document
      .getElementById("stories-container")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  updateStoryCount() {
    const countElement = document.getElementById("story-count");
    if (countElement) {
      const total = this.filteredStories.length;
      const showing = Math.min(this.storiesPerPage, total);
      countElement.textContent = `Showing ${showing} of ${total} stories`;
    }
  }

  // Utility methods
  generateExcerpt(content, maxLength = 150) {
    if (!content) return "";
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
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

  getSentimentEmoji(sentimentData) {
    if (!sentimentData) return "";

    switch (sentimentData.label?.toLowerCase()) {
      case "positive":
        return "😊";
      case "negative":
        return "😔";
      case "neutral":
        return "😐";
      default:
        return "";
    }
  }

  highlightSearchTerms(searchTerm) {
    if (!searchTerm) return;

    const storyCards = document.querySelectorAll(".story-card");
    storyCards.forEach((card) => {
      const title = card.querySelector(".story-title");
      const excerpt = card.querySelector(".story-excerpt");

      if (title) this.highlightText(title, searchTerm);
      if (excerpt) this.highlightText(excerpt, searchTerm);
    });
  }

  highlightText(element, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, "gi");
    element.innerHTML = element.textContent.replace(regex, "<mark>$1</mark>");
  }

  getEmptyState() {
    return `
            <div class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-search"></i>
                    <h3>No stories found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                    <button class="btn primary" onclick="window.storiesManager.resetFilters()">
                        Reset Filters
                    </button>
                </div>
            </div>
        `;
  }

  resetFilters() {
    this.currentCategory = "all";
    this.currentSentiment = "all";
    this.searchTerm = "";
    this.currentPage = 1;

    // Reset UI
    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.category === "all") {
        btn.classList.add("active");
      }
    });

    const searchInput = document.getElementById("story-search");
    if (searchInput) searchInput.value = "";

    const sentimentFilter = document.getElementById("sentiment-filter");
    if (sentimentFilter) sentimentFilter.value = "all";

    this.loadStories();
  }

  showLoading(show) {
    const loader = document.getElementById("stories-loader");
    const container = document.getElementById("stories-container");

    if (show) {
      if (loader) loader.style.display = "flex";
      if (container) container.style.opacity = "0.5";
    } else {
      if (loader) loader.style.display = "none";
      if (container) container.style.opacity = "1";
    }
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type = "info") {
    // Reuse the notification system from submit-enhanced.js
    if (window.UmojaSubmit?.showNotification) {
      window.UmojaSubmit.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.storiesManager = new StoriesManager();
});

// Export for global access
window.StoriesManager = StoriesManager;
