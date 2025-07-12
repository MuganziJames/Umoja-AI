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
  try {
    // Set up event listeners
    setupEventListeners();

    // Load existing draft
    await loadDraft();

    // Initialize character count
    if (storyContent) {
      updateCharacterCount();
    }
  } catch (error) {
    console.error("Error initializing submit page:", error);
    // Don't throw the error further to avoid unhandled promise rejection
  }
}

function setupEventListeners() {
  // Character count tracking
  if (storyContent) {
    storyContent.addEventListener("input", updateCharacterCount);
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

// Button state management
function setButtonLoading(button, loadingText) {
  if (!button) return;

  button.originalText = button.textContent;
  button.textContent = loadingText;
  button.disabled = true;
  button.style.opacity = "0.7";
  button.style.cursor = "not-allowed";
}

function resetButtonState(button, originalText) {
  if (!button) return;

  button.textContent =
    originalText || button.originalText || button.textContent;
  button.disabled = false;
  button.style.opacity = "1";
  button.style.cursor = "pointer";
}

// Notification helper function
function showNotification(message, type = "info", duration = 5000) {
  // Use global notification system if available
  if (window.NotificationSystem) {
    switch (type) {
      case "success":
        return window.showSuccess?.(message, { duration });
      case "error":
        return window.showError?.(message, { duration });
      case "warning":
        return window.showWarning?.(message, { duration });
      default:
        return window.showInfo?.(message, { duration });
    }
  }

  // Fallback to console if notification system not available
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Validation functions
function validateForm() {
  const title = document.getElementById("story-title")?.value?.trim();
  const content = document.getElementById("story-content")?.value?.trim();
  const authorName = document.getElementById("full-name")?.value?.trim();
  const category = document.getElementById("story-category")?.value;

  // Clear any existing error messages
  clearFieldErrors();

  let isValid = true;

  // Validate title
  if (!title) {
    showFieldError("story-title", "Story title is required");
    isValid = false;
  } else if (title.length < 5) {
    showFieldError("story-title", "Title must be at least 5 characters long");
    isValid = false;
  }

  // Validate content
  if (!content) {
    showFieldError("story-content", "Story content is required");
    isValid = false;
  } else if (content.length < 100) {
    showFieldError(
      "story-content",
      "Story must be at least 100 characters long"
    );
    isValid = false;
  } else if (content.length > MAX_CHARS) {
    showFieldError(
      "story-content",
      `Story must be less than ${MAX_CHARS} characters`
    );
    isValid = false;
  }

  // Validate author name
  if (!authorName) {
    showFieldError("full-name", "Author name is required");
    isValid = false;
  }

  // Validate category
  if (!category) {
    showFieldError("story-category", "Please select a category");
    isValid = false;
  }

  return isValid;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Add error styling
  field.style.borderColor = "#dc3545";
  field.style.backgroundColor = "#fff5f5";

  // Create or update error message
  let errorDiv = field.parentNode.querySelector(".field-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.style.cssText = `
      color: #dc3545;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    `;
    field.parentNode.appendChild(errorDiv);
  }
  errorDiv.textContent = message;

  // Show notification for better visibility
  window.showError?.(message) || showNotification(message, "error");
}

function clearFieldErrors() {
  const errorDivs = document.querySelectorAll(".field-error");
  errorDivs.forEach((div) => div.remove());

  const fields = [
    "story-title",
    "story-content",
    "full-name",
    "story-category",
  ];
  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.style.borderColor = "";
      field.style.backgroundColor = "";
    }
  });
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
    console.log("🚀 Attempting story submission");

    // Wait for database manager to be ready
    if (!window.UmojaDB) {
      console.log("⏳ Waiting for database manager...");
      window.UmojaDB = await window.DatabaseManager.waitForConfigAndCreate();
    }

    // Check authentication - but don't block submission
    const user = await window.UmojaDB.getCurrentUser();
    if (!user) {
      console.warn("⚠️ User not authenticated, but continuing with submission");
      window.showWarning?.(
        "Please note: You should be logged in to submit stories. We'll try to submit anyway, but it may not work correctly."
      );
    } else {
      console.log("✅ User authenticated:", user.email);
    }

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

    // Submit or update story based on mode
    let result;
    if (editMode && editId) {
      console.log("📝 Updating existing story:", editId);
      result = await window.UmojaDB.updateStory(editId, storyData, user.id);
    } else {
      console.log("📝 Submitting new story");
      result = await window.UmojaDB.submitStory(storyData);
    }

    console.log("📝 Submission result:", result);

    if (result?.success) {
      console.log(
        `✅ Story ${editMode ? "updated" : "published"} successfully!`
      );

      // Show prominent success notification
      const message = editMode
        ? "Your story has been updated successfully!"
        : "Thank you for uploading your story! Every story matters to us. Your story is now live on the website.";

      window.showSuccess?.(message, {
        title: editMode ? "Story Updated!" : "SUCCESS!",
        duration: 8000,
      }) ||
        showNotification(
          message,
          "success",
          8000 // Show for 8 seconds
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
    // Wait for database to be available before trying to load draft
    if (window.UmojaDB) {
      const result = await window.UmojaDB.getDraft();

      if (result?.success && result.draft) {
        populateFormWithDraft(result.draft);
        const location = result.location === "local" ? "local" : "cloud";
        showNotification(`Draft loaded from ${location} storage!`, "info");
        return;
      }
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

function clearLocalDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    console.log("✅ Local draft cleared");
  } catch (error) {
    console.error("Error clearing local draft:", error);
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

// Enhanced Draft Management and Edit Mode
let editMode = false;
let editStory = null;

// Check for edit mode
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get("edit");

if (editId) {
  editMode = true;
  // Update page title and UI for edit mode
  document.title = "Edit Story - Voices of Change";
  const pageHeader = document.querySelector(".page-header h1");
  if (pageHeader) pageHeader.textContent = "Edit Your Story";

  const submitButton = document.getElementById("submit-story");
  if (submitButton) {
    submitButton.innerHTML = '<i class="fas fa-save"></i> Update Story';
  }
}

async function loadStoryForEdit() {
  if (!editMode || !editId) return;

  try {
    if (!window.UmojaDB) {
      throw new Error("Database not available");
    }

    const result = await window.UmojaDB.getStoryById(editId);
    if (result.success && result.story) {
      editStory = result.story;
      populateFormWithStory(editStory);

      window.showInfo?.("Story loaded for editing", {
        title: "Edit Mode",
      });
    } else {
      throw new Error(result.error || "Story not found");
    }
  } catch (error) {
    console.error("Error loading story for edit:", error);
    window.showError?.("Failed to load story for editing: " + error.message);
    // Redirect back to profile after error
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 3000);
  }
}

function populateFormWithStory(story) {
  // Populate form fields
  if (story.title) {
    const titleField = document.querySelector(
      'input[name="story-title"], #story-title'
    );
    if (titleField) titleField.value = story.title;
  }

  if (story.content && storyContent) {
    storyContent.value = story.content;
  }

  if (story.category) {
    const categoryField = document.querySelector(
      'select[name="story-category"], #story-category'
    );
    if (categoryField) categoryField.value = story.category;
  }

  if (story.is_anonymous) {
    const anonymousField = document.querySelector(
      'input[name="anonymous"], #anonymous'
    );
    if (anonymousField) anonymousField.checked = true;
  }

  // Update character count
  updateCharacterCount();
}

// Enhanced save draft functionality
async function saveDraftEnhanced() {
  try {
    // Show loading state
    const saveDraftBtn = document.getElementById("save-draft");
    if (saveDraftBtn) {
      const originalText = saveDraftBtn.textContent;
      saveDraftBtn.disabled = true;
      saveDraftBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    const formData = new FormData(storyForm);
    const draftData = {
      title: formData.get("story-title") || "",
      content: formData.get("story-content") || "",
      category: formData.get("story-category") || "general",
      isAnonymous: formData.get("anonymous") === "on",
    };

    // Don't save empty drafts
    if (!draftData.title.trim() && !draftData.content.trim()) {
      window.showWarning?.("Please add some content before saving as draft");
      return;
    }

    // Use database manager if available
    if (window.UmojaDB) {
      const draftId = editMode ? editId : null;
      const result = await window.UmojaDB.saveDraft(draftData, draftId);
      if (result.success) {
        window.showSuccess?.("Draft saved successfully!", {
          title: "Draft Saved",
        });

        // Clear localStorage backup since it's saved to database
        localStorage.removeItem("story_draft");
      } else {
        throw new Error(result.error);
      }
    } else {
      // Fallback to localStorage
      localStorage.setItem("story_draft", JSON.stringify(draftData));
      window.showSuccess?.("Draft saved locally!");
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    window.showError?.("Failed to save draft: " + error.message);
  } finally {
    // Restore button state
    const saveDraftBtn = document.getElementById("save-draft");
    if (saveDraftBtn) {
      saveDraftBtn.disabled = false;
      saveDraftBtn.innerHTML = '<i class="fas fa-save"></i> Save Draft';
    }
  }
}

// Character count update function
function updateCharacterCount() {
  if (!storyContent || !currentCount) return;

  const text = storyContent.value;
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const maxChars = parseInt(maxCount?.textContent || "5000", 10);
  const warningThreshold = maxChars * 0.8;

  // Update counts
  if (currentCount) currentCount.textContent = chars;
  if (wordCount)
    wordCount.textContent = `(${words} word${words !== 1 ? "s" : ""})`;

  // Update styling based on count
  const submitButton = document.getElementById("submit-story");

  if (chars > maxChars) {
    if (currentCount) currentCount.className = "danger";
    if (charWarning) charWarning.classList.remove("hidden");
    if (submitButton) submitButton.disabled = true;
  } else if (chars > warningThreshold) {
    if (currentCount) currentCount.className = "warning";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitButton) submitButton.disabled = false;
  } else if (chars > 0) {
    if (currentCount) currentCount.className = "success";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitButton) submitButton.disabled = false;
  } else {
    if (currentCount) currentCount.className = "";
    if (charWarning) charWarning.classList.add("hidden");
    if (submitButton) submitButton.disabled = false;
  }
}

// Initialize enhanced features
document.addEventListener("DOMContentLoaded", async () => {
  // Wait for notification system
  await new Promise((resolve) => {
    if (window.NotificationSystem) {
      resolve();
    } else {
      const checkSystem = setInterval(() => {
        if (window.NotificationSystem) {
          clearInterval(checkSystem);
          resolve();
        }
      }, 100);
    }
  });

  // Set up character counting
  if (storyContent) {
    storyContent.addEventListener("input", updateCharacterCount);
    updateCharacterCount(); // Initial count
  }

  // Set up save draft button
  const saveDraftBtn = document.getElementById("save-draft");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await saveDraftEnhanced();
    });
  }

  // Load story for edit if in edit mode
  if (editMode) {
    await loadStoryForEdit();
  } else {
    // Try to load draft from database or localStorage
    await loadExistingDraft();
  }

  // Enhanced file upload handling
  if (fileInput && fileName) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // Use input sanitizer for validation
        const validation = window.InputSanitizer?.validateFileUpload(file);

        if (validation && !validation.isValid) {
          window.showError?.(
            "File validation failed: " + validation.errors.join(", "),
            {
              title: "Invalid File",
            }
          );
          fileInput.value = "";
          fileName.textContent = "No file chosen";
          return;
        }

        fileName.textContent = file.name;
        window.showSuccess?.(`Image "${file.name}" selected successfully`);
      } else {
        fileName.textContent = "No file chosen";
      }
    });
  }
});

async function loadExistingDraft() {
  let draftLoaded = false;

  if (window.UmojaDB) {
    try {
      const result = await window.UmojaDB.getAllDrafts();
      if (result.success && result.drafts.length > 0) {
        // Load the most recent draft
        const latestDraft = result.drafts[0];
        populateFormWithStory(latestDraft);

        window.showInfo?.("Your latest draft has been loaded", {
          title: "Draft Loaded",
          duration: 4000,
        });
        draftLoaded = true;
      }
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
  }

  // Fallback to localStorage if no database draft found
  if (!draftLoaded) {
    const savedDraft = localStorage.getItem("story_draft");
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        populateFormWithStory(draftData);

        window.showInfo?.("A saved draft has been loaded from local storage", {
          title: "Local Draft Loaded",
          duration: 4000,
        });
      } catch (error) {
        console.error("Error parsing local draft:", error);
        localStorage.removeItem("story_draft");
      }
    }
  }
}

// Export enhanced functions
window.UmojaSubmit = {
  ...window.UmojaSubmit,
  saveDraftEnhanced,
  loadStoryForEdit,
  populateFormWithStory,
  updateCharacterCount,
  editMode,
  editStory,
};
