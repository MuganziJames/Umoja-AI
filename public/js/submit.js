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

// AI-enhanced elements
const aiSuggestionsBtn = document.getElementById("ai-suggestions");
const aiSuggestionsPanel = document.getElementById("ai-suggestions-panel");
const autoCategorizationBtn = document.getElementById("auto-categorize");
const contentModerationIndicator =
  document.getElementById("content-moderation");
const similarStoriesPanel = document.getElementById("similar-stories");

// Constants
const MAX_CHARS = parseInt(maxCount.textContent, 10);
const WARNING_THRESHOLD = MAX_CHARS * 0.8; // 80% of max chars

// Draft key for localStorage
const DRAFT_KEY = "story_draft";

// Check for edit mode
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get("edit");
let editMode = false;
let editStory = null;

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

// Character count live tracker
storyContent.addEventListener("input", updateCharacterCount);

function updateCharacterCount() {
  const text = storyContent.value;
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  // Update counts
  currentCount.textContent = chars;
  wordCount.textContent = `(${words} word${words !== 1 ? "s" : ""})`;

  // Update styling based on count
  if (chars > MAX_CHARS) {
    currentCount.className = "danger";
    charWarning.classList.remove("hidden");
    submitBtn.disabled = true;
  } else if (chars > WARNING_THRESHOLD) {
    currentCount.className = "warning";
    charWarning.classList.add("hidden");
    submitBtn.disabled = false;
  } else if (chars > 0) {
    currentCount.className = "success";
    charWarning.classList.add("hidden");
    submitBtn.disabled = false;
  } else {
    currentCount.className = "";
    charWarning.classList.add("hidden");
    submitBtn.disabled = false;
  }
}

// File upload handling with enhanced security
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // Use input sanitizer for validation
    const validation = window.InputSanitizer.validateFileUpload(file);

    if (!validation.isValid) {
      console.error("File validation failed: " + validation.errors.join(", "));
      fileInput.value = "";
      fileName.textContent = "No file chosen";
      return;
    }

    fileName.textContent = file.name;
    console.log(`Image "${file.name}" selected successfully`);
  } else {
    fileName.textContent = "No file chosen";
  }
});

// Save draft functionality
saveDraftBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await saveDraft();
});

async function saveDraft() {
  try {
    // Show loading state
    const originalText = saveDraftBtn.textContent;
    saveDraftBtn.disabled = true;
    saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const formData = new FormData(storyForm);
    const draftData = {
      title: formData.get("story-title") || "",
      content: formData.get("story-content") || "",
      category: formData.get("story-category") || "general",
      isAnonymous: formData.get("anonymous") === "on",
    };

    // Don't save empty drafts
    if (!draftData.title.trim() && !draftData.content.trim()) {
      console.log("Please add some content before saving as draft");
      return;
    }

    // Use database manager if available
    if (window.UmojaDB) {
      const result = await window.UmojaDB.saveDraft(draftData);
      if (result.success) {
        console.log("Draft saved successfully!");

        // Clear localStorage backup since it's saved to database
        localStorage.removeItem("story_draft");
      } else {
        throw new Error(result.error);
      }
    } else {
      // Fallback to localStorage
      localStorage.setItem("story_draft", JSON.stringify(draftData));
      console.log("Draft saved locally!");
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    console.error("Failed to save draft: " + error.message);
  } finally {
    // Restore button state
    saveDraftBtn.disabled = false;
    saveDraftBtn.innerHTML = '<i class="fas fa-save"></i> Save Draft';
  }
}

// Load draft if exists
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

  // Try to load draft from database first, then localStorage
  let draftLoaded = false;

  if (window.UmojaDB) {
    try {
      const result = await window.UmojaDB.getAllDrafts();
      if (result.success && result.drafts.length > 0) {
        // Load the most recent draft
        const latestDraft = result.drafts[0];
        populateFormWithDraft(latestDraft);

        console.log("Your latest draft has been loaded");
        draftLoaded = true;
      }
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
  }

  // Fallback to localStorage if no database draft found
  if (!draftLoaded) {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        populateFormWithDraft(draftData);

        console.log("A saved draft has been loaded from local storage");
      } catch (error) {
        console.error("Error parsing local draft:", error);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }

  updateCharacterCount();
});

function populateFormWithDraft(draftData) {
  // Populate form fields
  if (draftData.title) {
    const titleField = document.querySelector(
      'input[name="story-title"], #story-title'
    );
    if (titleField) titleField.value = draftData.title;
  }

  if (draftData.content) {
    storyContent.value = draftData.content;
  }

  if (draftData.category) {
    const categoryField = document.querySelector(
      'select[name="story-category"], #story-category'
    );
    if (categoryField) categoryField.value = draftData.category;
  }

  if (draftData.isAnonymous || draftData.anonymous === "on") {
    const anonymousField = document.querySelector(
      'input[name="anonymous"], #anonymous'
    );
    if (anonymousField) anonymousField.checked = true;
  }
}

// Load story for edit
async function loadStoryForEdit() {
  if (!editMode || !editId) return;

  try {
    if (!window.UmojaDB) {
      throw new Error("Database not available");
    }

    const result = await window.UmojaDB.getStoryById(editId);
    if (result.success && result.story) {
      editStory = result.story;
      populateFormWithDraft(editStory);
      console.log("Story loaded for editing");
    } else {
      throw new Error(result.error || "Story not found");
    }
  } catch (error) {
    console.error("Error loading story for edit:", error);
    console.error("Failed to load story for editing: " + error.message);
    // Redirect back to profile after error
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 3000);
  }
}

// Form submission
storyForm.addEventListener("submit", handleSubmission);

async function handleSubmission(e) {
  e.preventDefault();

  // Rate limiting check
  if (!window.InputSanitizer.checkRateLimit("story_submission", 3, 300000)) {
    // 3 submissions per 5 minutes
    console.error("Too many submissions. Please wait before submitting again.");
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Get form data
    const storyText = storyContent.value.trim();
    const storyTitle =
      document.getElementById("story-title")?.value?.trim() || "";

    // Validate and sanitize story content
    const contentValidation =
      window.InputSanitizer.validateStoryContent(storyText);
    if (!contentValidation.isValid) {
      console.error(
        "Story content validation failed. Please ensure your story is between 10-5000 characters and contains at least 5 words."
      );
      return;
    }

    // Sanitize title
    const sanitizedTitle = window.InputSanitizer.sanitizeText(storyTitle);
    if (sanitizedTitle.length < 3) {
      console.error("Story title must be at least 3 characters long.");
      return;
    }

    // Additional validation
    if (storyText.length < 500) {
      console.error("Your story must be at least 500 characters long.");
      return;
    }

    if (storyText.length > MAX_CHARS) {
      console.error(
        `Your story exceeds the maximum ${MAX_CHARS} character limit.`
      );
      return;
    }

    // Create sanitized submission data
    const submissionData = {
      title: sanitizedTitle,
      content: contentValidation.sanitized,
      category: document.getElementById("story-category")?.value || "general",
      isAnonymous: document.getElementById("anonymous")?.checked || false,
    };

    console.log("Sanitized submission data:", submissionData);

    // Submit to database if available
    if (window.UmojaDB) {
      const result = await window.UmojaDB.submitStory(submissionData);
      if (result.success) {
        console.log("Your story has been submitted successfully!");
      } else {
        throw new Error(result.error);
      }
    } else {
      // Fallback for demo mode
      console.log("Story submitted successfully! (Demo mode)");
    }

    // Hide the form and show success message
    storyForm.style.display = "none";
    submissionSuccess.classList.remove("hidden");

    // Clear localStorage draft
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem("story_drafts");

    // Scroll to top of success message
    submissionSuccess.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Submission error:", error);
    console.error("Failed to submit story: " + error.message);
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Story';
  }
}

// Submit another story button
submitAnother.addEventListener("click", () => {
  // Clear the form
  storyForm.reset();
  fileName.textContent = "No file chosen";
  updateCharacterCount();

  // Hide success and show form
  submissionSuccess.classList.add("hidden");
  storyForm.style.display = "block";

  // Scroll to top of form
  storyForm.scrollIntoView({ behavior: "smooth" });
});

// Load story for editing if in edit mode
document.addEventListener("DOMContentLoaded", () => {
  loadStoryForEdit();
});
