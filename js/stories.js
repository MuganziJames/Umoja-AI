// DOM Elements
const storyGrid = document.getElementById("stories-grid");
const searchInput = document.getElementById("story-search");
const searchBtn = document.getElementById("search-btn");
const categoryFilter = document.getElementById("category-filter");
const sortStories = document.getElementById("sort-stories");
const savedStoriesToggle = document.getElementById("saved-stories-toggle");
const noResults = document.querySelector(".no-results");
const resetFiltersBtn = document.getElementById("reset-filters");

// Pagination Elements
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const currentPageSpan = document.querySelector(".current-page");
const totalPagesSpan = document.querySelector(".total-pages");

// Application State
let currentPage = 1;
const storiesPerPage = 6;
let allStories = []; // All stories from database
let filteredStories = []; // Filtered stories for display

// Load saved stories from localStorage
let savedStories = localStorage.getItem("savedStories")
  ? JSON.parse(localStorage.getItem("savedStories"))
  : [];

// Database instance
let UmojaDB = null;

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔄 Initializing stories page...");

  try {
    // Wait for UmojaConfig and DatabaseManager to be ready
    await waitForDependencies();

    // Initialize database
    UmojaDB = await window.DatabaseManager.waitForConfigAndCreate();
    console.log("✅ Database initialized for stories page");

    // Load stories from database
    await loadStoriesFromDatabase();

    // Set up pagination and display
    updatePagination();
    displayStories();

    // Set up event listeners
    setupEventListeners();

    // Check URL parameters for any pre-selected filters
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category");

    if (categoryParam && categoryFilter) {
      categoryFilter.value = categoryParam;
      filterStories();
    }
  } catch (error) {
    console.error("❌ Stories page initialization failed:", error);
    showErrorMessage("Failed to load stories. Please refresh the page.");
  }
});

// Wait for dependencies to load
async function waitForDependencies() {
  let retries = 0;
  while ((!window.UmojaConfig || !window.DatabaseManager) && retries < 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries++;
  }

  if (!window.UmojaConfig || !window.DatabaseManager) {
    throw new Error("Required components not available");
  }
}

// Load stories from database
async function loadStoriesFromDatabase() {
  try {
    console.log("🔍 Loading stories from database...");

    const result = await UmojaDB.getStories();
    console.log("📊 Stories loaded:", result);

    if (result?.success && result.stories?.length > 0) {
      allStories = result.stories;
      filteredStories = [...allStories];
      console.log(`✅ Loaded ${allStories.length} stories from database`);
    } else {
      allStories = [];
      filteredStories = [];
      console.log("📭 No stories found in database");
    }
  } catch (error) {
    console.error("❌ Failed to load stories:", error);
    allStories = [];
    filteredStories = [];
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Search functionality
  if (searchBtn) {
    searchBtn.addEventListener("click", filterStories);
  }

  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        filterStories();
      }
    });
  }

  // Filter change events
  if (categoryFilter) {
    categoryFilter.addEventListener("change", filterStories);
  }

  if (sortStories) {
    sortStories.addEventListener("change", filterStories);
  }

  if (savedStoriesToggle) {
    savedStoriesToggle.addEventListener("change", filterStories);
  }

  // Reset filters
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", resetAllFilters);
  }

  // Pagination event listeners
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayStories();
        updatePagination();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayStories();
        updatePagination();
      }
    });
  }

  console.log("🎯 Event listeners set up");
}

// Filter and sort stories
function filterStories() {
  if (!searchInput || !categoryFilter || !sortStories || !savedStoriesToggle) {
    console.warn("Filter elements not found");
    return;
  }

  const searchTerm = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const sortBy = sortStories.value;
  const showSavedOnly = savedStoriesToggle.checked;

  console.log(
    `🔧 Filtering: search="${searchTerm}", category="${category}", sort="${sortBy}", savedOnly=${showSavedOnly}`
  );

  // Reset to first page whenever filters change
  currentPage = 1;

  // Filter stories from database data
  filteredStories = allStories.filter((story) => {
    // Text search
    const matchesSearch =
      searchTerm === "" ||
      story.title.toLowerCase().includes(searchTerm) ||
      story.content.toLowerCase().includes(searchTerm) ||
      story.author_name.toLowerCase().includes(searchTerm);

    // Category filter
    const matchesCategory = category === "all" || story.category === category;

    // Saved filter
    const matchesSaved =
      !showSavedOnly || savedStories.includes(story.id.toString());

    return matchesSearch && matchesCategory && matchesSaved;
  });

  // Sort stories
  filteredStories.sort((a, b) => {
    if (sortBy === "newest" || sortBy === "latest") {
      return (
        new Date(b.published_at || b.created_at) -
        new Date(a.published_at || a.created_at)
      );
    } else if (sortBy === "oldest") {
      return (
        new Date(a.published_at || a.created_at) -
        new Date(b.published_at || b.created_at)
      );
    } else if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    } else if (sortBy === "popular") {
      return (b.view_count || 0) - (a.view_count || 0);
    }
    return 0;
  });

  console.log(
    `✅ Filter result: ${filteredStories.length} stories match criteria`
  );

  // Update pagination and display stories
  updatePagination();
  displayStories();
}

// Reset all filters
function resetAllFilters() {
  if (searchInput) searchInput.value = "";
  if (categoryFilter) categoryFilter.value = "all";
  if (sortStories) sortStories.value = "newest";
  if (savedStoriesToggle) savedStoriesToggle.checked = false;

  filteredStories = [...allStories];
  currentPage = 1;
  updatePagination();
  displayStories();

  console.log("🔄 All filters reset");
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStories.length / storiesPerPage)
  );

  totalPagesSpan.textContent = totalPages;
  currentPageSpan.textContent = currentPage;

  // Enable/disable pagination buttons
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

// Display stories for current page
function displayStories() {
  if (!storyGrid) return;

  // Calculate start and end indices for current page
  const startIndex = (currentPage - 1) * storiesPerPage;
  const endIndex = Math.min(
    startIndex + storiesPerPage,
    filteredStories.length
  );

  // Get stories for current page
  const paginatedStories = filteredStories.slice(startIndex, endIndex);

  console.log(
    `📖 Displaying page ${currentPage}, stories ${
      startIndex + 1
    }-${endIndex} of ${filteredStories.length}`
  );

  // Clear existing content
  storyGrid.innerHTML = "";

  if (paginatedStories.length === 0) {
    storyGrid.innerHTML = `
      <div class="no-stories" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
        <h3 style="color: #666; margin-bottom: 0.5rem;">No Stories Found</h3>
        <p style="color: #999; margin-bottom: 1.5rem;">Try adjusting your search or filters.</p>
        <button onclick="resetAllFilters()" class="btn secondary">Reset Filters</button>
      </div>
    `;
    return;
  }

  // Display stories
  paginatedStories.forEach((story, index) => {
    const readingTime = Math.ceil((story.content?.length || 0) / 250);
    const publishDate = new Date(
      story.published_at || story.created_at
    ).toLocaleDateString();
    const excerpt = story.summary || story.content.substring(0, 150) + "...";

    const storyCard = document.createElement("article");
    storyCard.className = "story-card";
    storyCard.dataset.storyId = story.id;
    storyCard.dataset.category = story.category || "general";
    storyCard.dataset.date = story.published_at || story.created_at;

    const isBookmarked = savedStories.includes(story.id.toString());

    storyCard.innerHTML = `
      <div class="story-image">
        ${
          story.image_url
            ? `<img src="${story.image_url}" alt="${story.title}" loading="lazy">`
            : `<img src="../images/story1.jpg" alt="${story.title}" loading="lazy">`
        }
        <div class="save-story ${isBookmarked ? "saved" : ""}" data-story-id="${
      story.id
    }">
          <i class="${isBookmarked ? "fas" : "far"} fa-bookmark"></i>
        </div>
      </div>
      <div class="story-content">
        <span class="category">${
          story.category?.replace("-", " ") || "General"
        }</span>
        <h3>${story.title}</h3>
        <p>${excerpt}</p>
        <div class="story-meta">
          <span class="author">By ${story.author_name}</span>
          <span class="date">${publishDate}</span>
          <span class="reading-time">${readingTime} min read</span>
        </div>
        <a href="#" class="read-more" data-story-id="${
          story.id
        }">Read Full Story</a>
      </div>
    `;

    storyGrid.appendChild(storyCard);
  });

  console.log(
    `✅ Added ${paginatedStories.length} stories to page ${currentPage}`
  );

  // Update pagination display
  if (currentPageSpan) currentPageSpan.textContent = currentPage;

  // Set up event listeners for new elements
  setupStoryEventListeners();
}

// Set up event listeners for story cards
function setupStoryEventListeners() {
  // Save/bookmark buttons
  document.querySelectorAll(".save-story").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const storyId = e.currentTarget.dataset.storyId;
      toggleBookmark(storyId, e.currentTarget);
    });
  });

  // Read more buttons - could open modal or navigate to full story
  document.querySelectorAll(".read-more").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      const storyId = e.currentTarget.dataset.storyId;
      console.log("📖 Opening story:", storyId);

      try {
        const storyResult = await UmojaDB.getStoryById(storyId);
        if (storyResult?.success) {
          // Create a modal to display the story
          const modal = document.createElement("div");
          modal.className = "story-modal";
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          `;
          modal.innerHTML = `
            <div class="story-modal-content" style="
              background: white;
              padding: 2rem;
              border-radius: 8px;
              max-width: 800px;
              max-height: 80vh;
              overflow-y: auto;
              position: relative;
            ">
              <button class="close-modal" style="
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
              ">&times;</button>
              <h2>${storyResult.story.title}</h2>
              <p class="story-author">By ${storyResult.story.author_name}</p>
              <div class="story-full-content">
                ${storyResult.story.content.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          // Close button functionality
          modal.querySelector(".close-modal").addEventListener("click", () => {
            modal.remove();
          });

          // Close on click outside
          modal.addEventListener("click", (e) => {
            if (e.target === modal) {
              modal.remove();
            }
          });
        }
      } catch (error) {
        console.error("Error loading story:", error);
        window.showError?.("Error loading story. Please try again.") || 
        window.showError?.("Error loading story. Please try again.");
      }
    });
  });
}

// Toggle bookmark status
function toggleBookmark(storyId, buttonElement) {
  const isCurrentlySaved = savedStories.includes(storyId);

  if (isCurrentlySaved) {
    savedStories = savedStories.filter((id) => id !== storyId);
    buttonElement.classList.remove("saved");
    buttonElement.innerHTML = '<i class="far fa-bookmark"></i>';
  } else {
    savedStories.push(storyId);
    buttonElement.classList.add("saved");
    buttonElement.innerHTML = '<i class="fas fa-bookmark"></i>';
  }

  // Save to localStorage
  localStorage.setItem("savedStories", JSON.stringify(savedStories));
  console.log(
    `🔖 Story ${storyId} ${
      isCurrentlySaved ? "removed from" : "added to"
    } bookmarks`
  );
}

// Show error message
function showErrorMessage(message) {
  if (storyGrid) {
    storyGrid.innerHTML = `
      <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
        <h3 style="color: #e74c3c; margin-bottom: 0.5rem;">Error</h3>
        <p style="color: #666; margin-bottom: 1.5rem;">${message}</p>
        <button onclick="location.reload()" class="btn primary">Retry</button>
      </div>
    `;
  }
}
