// Enhanced Submit.js with AI and Backend Integration
// DOM Elements
const storyForm = document.getElementById("story-submission-form");
const storyContent = document.getElementById("story-content");
const currentCount = document.getElementById("current-count");
const maxCount = document.getElementById("max-count");
const wordCount = document.getElementById("word-count");
const charWarning = document.getElementById("char-warning");
const fileInput = document.getElementById("story-image");
const fileName = document.getElementById("file-name");
const submitBtn = document.getElementById("submit-story");
const saveDraftBtn = document.getElementById("save-draft");
const submissionSuccess = document.getElementById("submission-success");
const submitAnother = document.getElementById("submit-another");

// AI-enhanced elements (add these to your HTML)
const aiSuggestionsBtn = document.getElementById("ai-suggestions");
const aiSuggestionsPanel = document.getElementById("ai-suggestions-panel");
const autoCategorizationBtn = document.getElementById("auto-categorize");
const contentModerationIndicator =
  document.getElementById("content-moderation");

// Constants
const MAX_CHARS = parseInt(maxCount?.textContent || "3000", 10);
const WARNING_THRESHOLD = MAX_CHARS * 0.8;
const DRAFT_KEY = "story_draft";

// Initialize page
document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
  // Set up event listeners
  setupEventListeners();

  // Load existing draft
  await loadDraft();

  // Initialize character count
  if (storyContent) {
    updateCharacterCount();
  }
}

function setupEventListeners() {
  // Character count tracking
  if (storyContent) {
    storyContent.addEventListener("input", updateCharacterCount);
    storyContent.addEventListener("input", debounceModeration);
  }

  // Form submission
  if (storyForm) {
    storyForm.addEventListener("submit", handleSubmission);
  }

  // Draft saving
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", handleSaveDraft);
  }

  // File input
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelection);
  }

  // AI features
  setupAIFeatures();

  // Submit another story
  if (submitAnother) {
    submitAnother.addEventListener("click", resetForm);
  }
}

function setupAIFeatures() {
  // AI Writing Suggestions
  if (aiSuggestionsBtn) {
    aiSuggestionsBtn.addEventListener("click", handleAISuggestions);
  }

  // Auto-categorization
  if (autoCategorizationBtn) {
    autoCategorizationBtn.addEventListener("click", handleAutoCategorization);
  }
}

// Character count functionality
function updateCharacterCount() {
  if (!storyContent || !currentCount) return;

  const text = storyContent.value;
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  // Update counts
  currentCount.textContent = chars;
  if (wordCount) {
    wordCount.textContent = `(${words} word${words !== 1 ? "s" : ""})`;
  }

  // Update styling based on count
  if (chars > MAX_CHARS) {
    currentCount.className = "danger";
    if (charWarning) charWarning.classList.remove("hidden");
    if (submitBtn) submitBtn.disabled = true;
  } else if (chars > WARNING_THRESHOLD) {
    currentCount.className = "warning";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = false;
  } else if (chars > 0) {
    currentCount.className = "success";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = false;
  } else {
    currentCount.className = "";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Enhanced form submission with comprehensive error handling
async function handleSubmission(e) {
  e.preventDefault();

  console.log("🚀 Form submission started");

  if (!validateForm()) {
    console.log("❌ Form validation failed");
    return;
  }

  // Show loading state
  setButtonLoading(submitBtn, "Submitting Story...");

  try {
    // Wait for database manager to be ready
    if (!window.UmojaDB) {
      console.log("⏳ Waiting for database manager...");
      window.UmojaDB = await window.DatabaseManager.waitForConfigAndCreate();
    }

    // Check authentication
    const user = await window.UmojaDB.getCurrentUser();
    if (!user) {
      throw new Error(
        "You must be signed in to submit a story. Please sign in first."
      );
    }

    console.log("✅ User authenticated:", user.email);

    // Collect form data
    const formData = new FormData(storyForm);
    const storyData = {
      title: formData.get("story-title"),
      content: formData.get("story-content"),
      authorName: formData.get("full-name"),
      category: formData.get("story-category"),
      isAnonymous: false,
    };

    console.log("📋 Collected form data:", storyData);

    // Final validation
    if (!storyData.title?.trim()) {
      throw new Error("Story title is required");
    }
    if (!storyData.content?.trim()) {
      throw new Error("Story content is required");
    }
    if (!storyData.authorName?.trim()) {
      throw new Error("Author name is required");
    }
    if (!storyData.category) {
      throw new Error("Please select a category");
    }

    // Handle file upload if present
    if (fileInput?.files[0]) {
      try {
        console.log("📎 Uploading file...");
        const uploadResult = await window.UmojaDB?.uploadFile(
          fileInput.files[0]
        );
        if (uploadResult?.success) {
          storyData.imageUrl = uploadResult.publicURL;
          console.log("✅ File uploaded:", uploadResult.publicURL);
        }
      } catch (uploadError) {
        console.warn("⚠️ File upload failed:", uploadError);
        showNotification(
          "File upload failed, but story will still be submitted",
          "warning"
        );
      }
    }

    console.log("🚀 Submitting to database...");

    // Submit to database
    const result = await window.UmojaDB.submitStory(storyData);

    console.log("📝 Submission result:", result);

    if (result?.success) {
      console.log("✅ Story published successfully!");
      showNotification(
        "Story published successfully! It is now live on the website.",
        "success"
      );

      // Track successful submission
      try {
        await window.UmojaDB.supabase.from("story_analytics").insert([
          {
            story_id: result.story.id,
            user_id: user.id,
            event_type: "publication",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (analyticsError) {
        console.warn("Analytics tracking failed:", analyticsError);
      }

      // Clear draft and redirect to success page
      clearLocalDraft();

      // Redirect to success page with story ID
      setTimeout(() => {
        window.location.href = `success.html?story=${result.story.id}`;
      }, 1500);
    } else {
      throw new Error(result?.error || "Submission failed for unknown reason");
    }
  } catch (error) {
    console.error("❌ Submission error:", error);
    let errorMessage = error.message;

    // Provide user-friendly error messages
    if (errorMessage.includes("auth")) {
      errorMessage = "Please sign in to submit your story.";
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch")
    ) {
      errorMessage =
        "Network error. Please check your connection and try again.";
    } else if (
      errorMessage.includes("database") ||
      errorMessage.includes("insert")
    ) {
      errorMessage = "Database error. Please try again in a moment.";
    }

    showNotification(`Error: ${errorMessage}`, "error");
  } finally {
    resetButtonState(
      submitBtn,
      '<i class="fas fa-paper-plane"></i> Submit Your Story'
    );
  }
}

// AI-powered writing suggestions
async function handleAISuggestions() {
  const content = storyContent?.value.trim();
  if (!content) {
    showNotification(
      "Please write your story first to get AI suggestions.",
      "warning"
    );
    return;
  }

  setButtonLoading(aiSuggestionsBtn, "Analyzing...");

  try {
    const suggestions = await window.UmojaAI?.getWritingSuggestions(content);
    if (suggestions) {
      displayAISuggestions(suggestions);
    } else {
      showNotification(
        "AI suggestions are temporarily unavailable.",
        "warning"
      );
    }
  } catch (error) {
    console.error("AI suggestions error:", error);
    showNotification("Error getting AI suggestions.", "error");
  } finally {
    resetButtonState(aiSuggestionsBtn, "Get AI Suggestions");
  }
}

// Auto-categorization
async function handleAutoCategorization() {
  const title = document.getElementById("story-title")?.value.trim();
  const content = storyContent?.value.trim();

  if (!title || !content) {
    showNotification(
      "Please fill in the title and story content first.",
      "warning"
    );
    return;
  }

  setButtonLoading(autoCategorizationBtn, "Categorizing...");

  try {
    const category = await window.UmojaAI?.categorizeStory(title, content);
    const categorySelect = document.getElementById("story-category");

    if (categorySelect && category) {
      categorySelect.value = category;
      highlightElement(categorySelect);
      showNotification(
        `Story automatically categorized as: ${category.replace("-", " ")}`,
        "success"
      );
    }
  } catch (error) {
    console.error("Auto-categorization error:", error);
    showNotification("Error with auto-categorization.", "error");
  } finally {
    resetButtonState(autoCategorizationBtn, "Auto-Categorize");
  }
}

// Enhanced draft saving with backend
async function handleSaveDraft(e) {
  e.preventDefault();

  setButtonLoading(saveDraftBtn, "Saving...");

  try {
    const formData = new FormData(storyForm);
    const draftData = {
      title: formData.get("story-title"),
      content: formData.get("story-content"),
      author_name: formData.get("full-name"),
      category: formData.get("story-category"),
    };

    const result = await window.UmojaDB?.saveDraft(draftData);

    if (result?.success) {
      const location =
        result.location === "local" ? "locally" : "to your account";
      showNotification(`Draft saved ${location}!`, "success");
    } else {
      // Fallback to localStorage
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      showNotification("Draft saved locally!", "success");
    }
  } catch (error) {
    console.error("Draft save error:", error);
    // Fallback to localStorage
    try {
      const formData = new FormData(storyForm);
      const draftData = Object.fromEntries(formData.entries());
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      showNotification("Draft saved locally!", "success");
    } catch (fallbackError) {
      showNotification("Error saving draft.", "error");
    }
  } finally {
    resetButtonState(saveDraftBtn, "Save Draft");
  }
}

// Load draft functionality
async function loadDraft() {
  try {
    // Try to load from database first
    const result = await window.UmojaDB?.getDraft();

    if (result?.success && result.draft) {
      populateFormWithDraft(result.draft);
      const location = result.location === "local" ? "local" : "cloud";
      showNotification(`Draft loaded from ${location} storage!`, "info");
      return;
    }

    // Fallback to localStorage
    const localDraft = localStorage.getItem(DRAFT_KEY);
    if (localDraft) {
      const draftData = JSON.parse(localDraft);
      populateFormWithDraft(draftData);
      showNotification("Draft loaded from local storage!", "info");
    }
  } catch (error) {
    console.error("Draft load error:", error);
    // Try localStorage as fallback
    try {
      const localDraft = localStorage.getItem(DRAFT_KEY);
      if (localDraft) {
        const draftData = JSON.parse(localDraft);
        populateFormWithDraft(draftData);
      }
    } catch (fallbackError) {
      console.error("Fallback draft load error:", fallbackError);
    }
  }
}

function populateFormWithDraft(draft) {
  if (draft.title) {
    const titleEl = document.getElementById("story-title");
    if (titleEl) titleEl.value = draft.title;
  }

  if (draft.content) {
    if (storyContent) {
      storyContent.value = draft.content;
      updateCharacterCount();
    }
  }

  if (draft.author_name) {
    const nameEl = document.getElementById("full-name");
    if (nameEl) nameEl.value = draft.author_name;
  }

  if (draft.category) {
    const categoryEl = document.getElementById("story-category");
    if (categoryEl) categoryEl.value = draft.category;
  }
}

// File handling
function handleFileSelection() {
  if (!fileInput || !fileName) return;

  const file = fileInput.files[0];
  if (file) {
    fileName.textContent = file.name;
    fileName.style.display = "inline";
  } else {
    fileName.textContent = "";
    fileName.style.display = "none";
  }
}

// Real-time content moderation
let moderationTimeout;
function debounceModeration() {
  clearTimeout(moderationTimeout);

  moderationTimeout = setTimeout(async () => {
    const content = storyContent?.value.trim();
    if (content && content.length > 100) {
      try {
        const moderation = await window.UmojaAI?.moderateContent(content);
        if (moderation) {
          updateModerationIndicator(moderation);
        }
      } catch (error) {
        console.error("Real-time moderation error:", error);
      }
    }
  }, 2000);
}

// Helper Functions
function validateForm() {
  const title = document.getElementById("story-title")?.value.trim();
  const content = storyContent?.value.trim();
  const authorName = document.getElementById("full-name")?.value.trim();
  const category = document.getElementById("story-category")?.value;

  console.log("🔍 Validating form:", {
    title: !!title,
    content: !!content,
    authorName: !!authorName,
    category: !!category,
  });

  if (!title) {
    showNotification("Please enter a story title.", "error");
    return false;
  }

  if (!content) {
    showNotification("Please write your story.", "error");
    return false;
  }

  if (content.length < 100) {
    showNotification(
      "Your story must be at least 100 characters long.",
      "error"
    );
    return false;
  }

  if (content.length > MAX_CHARS) {
    showNotification(
      `Your story exceeds the ${MAX_CHARS} character limit.`,
      "error"
    );
    return false;
  }

  if (!authorName) {
    showNotification("Please enter your name.", "error");
    return false;
  }

  if (!category) {
    showNotification("Please select a category for your story.", "error");
    return false;
  }

  // Check consent checkbox
  const consentCheckbox = document.getElementById("consent");
  if (consentCheckbox && !consentCheckbox.checked) {
    showNotification("Please consent to having your story published.", "error");
    return false;
  }

  console.log("✅ Form validation passed");
  return true;
}

function setButtonLoading(button, text) {
  if (!button) return;
  button.disabled = true;
  button.dataset.originalText = button.innerHTML;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function resetButtonState(button, text) {
  if (!button) return;
  button.disabled = false;
  button.innerHTML = button.dataset.originalText || text;
}

function highlightElement(element, duration = 2000) {
  if (!element) return;

  element.style.backgroundColor = "#e8f5e8";
  element.style.transition = "background-color 0.3s ease";

  setTimeout(() => {
    element.style.backgroundColor = "";
  }, duration);
}

function showSuccessState(story) {
  console.log("🎉 Showing success state for story:", story);

  if (storyForm) storyForm.style.display = "none";
  if (submissionSuccess) submissionSuccess.classList.remove("hidden");

  // Show AI insights if available
  if (story?.sentiment_data) {
    showSubmissionInsights(story);
  }

  // Scroll to success message
  if (submissionSuccess) {
    submissionSuccess.scrollIntoView({ behavior: "smooth" });
  }
}

function resetForm() {
  if (storyForm) {
    storyForm.reset();
    storyForm.style.display = "block";
    updateCharacterCount();
  }

  if (submissionSuccess) {
    submissionSuccess.classList.add("hidden");
  }

  if (fileName) {
    fileName.textContent = "";
    fileName.style.display = "none";
  }
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error("Error clearing local draft:", error);
  }
}

function displayAISuggestions(suggestions) {
  if (!aiSuggestionsPanel) {
    // Create panel if it doesn't exist
    const panel = document.createElement("div");
    panel.id = "ai-suggestions-panel";
    panel.className = "ai-suggestions-panel";
    storyForm?.appendChild(panel);
  }

  const panel = document.getElementById("ai-suggestions-panel");
  if (!panel) return;

  panel.innerHTML = `
        <div class="suggestions-header">
            <h4><i class="fas fa-lightbulb"></i> AI Writing Suggestions</h4>
            <button type="button" class="close-suggestions" onclick="this.closest('.ai-suggestions-panel').style.display='none'">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="suggestions-content">
            ${suggestions
              .split("\n")
              .map((suggestion) =>
                suggestion.trim()
                  ? `<p><i class="fas fa-arrow-right"></i> ${suggestion.trim()}</p>`
                  : ""
              )
              .join("")}
        </div>
    `;
  panel.style.display = "block";
}

function updateModerationIndicator(moderation) {
  if (!contentModerationIndicator) {
    // Create indicator if it doesn't exist
    const indicator = document.createElement("div");
    indicator.id = "content-moderation";
    indicator.className = "content-moderation-indicator";
    storyContent?.parentNode?.appendChild(indicator);
  }

  const indicator = document.getElementById("content-moderation");
  if (!indicator) return;

  if (moderation.flagged) {
    indicator.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            Content may need review. Please ensure your story follows our community guidelines.
        `;
    indicator.className = "content-moderation-indicator moderation-warning";
  } else {
    indicator.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Content looks good!
        `;
    indicator.className = "content-moderation-indicator moderation-success";

    // Hide after 3 seconds
    setTimeout(() => {
      indicator.style.display = "none";
    }, 3000);
  }

  indicator.style.display = "block";
}

function showSubmissionInsights(story) {
  if (!submissionSuccess || !story) return;

  const insights = document.createElement("div");
  insights.className = "submission-insights";
  insights.innerHTML = `
        <h4><i class="fas fa-chart-line"></i> Story Insights</h4>
        <div class="insights-content">
            <p>Your story has been analyzed:</p>
            <ul>
                <li><strong>Category:</strong> ${
                  story.category?.replace("-", " ") || "Not specified"
                }</li>
                <li><strong>Reading time:</strong> ~${Math.ceil(
                  (story.content?.length || 0) / 250
                )} minutes</li>
                ${
                  story.sentiment_data
                    ? `<li><strong>Emotional tone:</strong> ${story.sentiment_data.label}</li>`
                    : ""
                }
                <li><strong>Status:</strong> Pending review</li>
            </ul>
            <p><small>These insights help us understand the impact of your story and will help other readers discover it.</small></p>
        </div>
    `;

  submissionSuccess.appendChild(insights);
}

function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  // Create new notification
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.closest('.notification').remove()">×</button>
        </div>
    `;

  // Add styles if not already present
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
                animation: slideIn 0.3s ease;
            }
            .notification-info { background: #3498db; color: white; }
            .notification-success { background: #2ecc71; color: white; }
            .notification-warning { background: #f39c12; color: white; }
            .notification-error { background: #e74c3c; color: white; }
            .notification-content { display: flex; justify-content: space-between; align-items: center; }
            .notification-close { background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 10px; }
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `;
    document.head.appendChild(styles);
  }

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideIn 0.3s ease reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Export functions for global access
window.UmojaSubmit = {
  handleSubmission,
  handleAISuggestions,
  handleAutoCategorization,
  showNotification,
  validateForm,
};
