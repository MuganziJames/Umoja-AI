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
      alert("File validation failed:\n" + validation.errors.join("\n"));
      fileInput.value = "";
      fileName.textContent = "No file chosen";
      return;
    }

    fileName.textContent = file.name;
  } else {
    fileName.textContent = "No file chosen";
  }
});

// Save draft functionality
saveDraftBtn.addEventListener("click", saveDraft);

function saveDraft() {
  const formData = new FormData(storyForm);
  const draftData = {};

  // Convert FormData to object (excluding file inputs)
  for (const [key, value] of formData.entries()) {
    if (key !== "story-image") {
      draftData[key] = value;
    }
  }

  // Save to localStorage
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));

  // Show confirmation
  const confirmation = document.createElement("div");
  confirmation.className = "draft-saved";
  confirmation.innerHTML =
    '<i class="fas fa-check"></i> Draft saved successfully!';
  confirmation.style.position = "fixed";
  confirmation.style.bottom = "20px";
  confirmation.style.right = "20px";
  confirmation.style.padding = "10px 20px";
  confirmation.style.backgroundColor = "var(--success)";
  confirmation.style.color = "white";
  confirmation.style.borderRadius = "var(--radius-md)";
  confirmation.style.boxShadow = "var(--shadow-md)";
  confirmation.style.zIndex = "1000";

  document.body.appendChild(confirmation);

  setTimeout(() => {
    confirmation.style.opacity = "0";
    confirmation.style.transition = "opacity 0.5s ease";
    setTimeout(() => {
      document.body.removeChild(confirmation);
    }, 500);
  }, 3000);
}

// Load draft if exists
document.addEventListener("DOMContentLoaded", () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);

  if (savedDraft) {
    const draftData = JSON.parse(savedDraft);

    // Populate form fields
    Object.keys(draftData).forEach((key) => {
      const element = document.querySelector(`[name="${key}"]`);

      if (element) {
        if (element.type === "checkbox") {
          element.checked = draftData[key] === "on";
        } else {
          element.value = draftData[key];
        }
      }
    });

    // Update character count
    updateCharacterCount();

    // Show draft loaded notification
    const notification = document.createElement("div");
    notification.className = "draft-loaded";
    notification.innerHTML =
      '<i class="fas fa-info-circle"></i> A saved draft has been loaded.';
    notification.style.backgroundColor = "var(--info)";
    notification.style.color = "white";
    notification.style.padding = "10px";
    notification.style.borderRadius = "var(--radius-md)";
    notification.style.marginBottom = "20px";

    storyForm.insertBefore(notification, storyForm.firstChild);

    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s ease";
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);
  }
});

// Form submission
storyForm.addEventListener("submit", handleSubmission);

function handleSubmission(e) {
  e.preventDefault();

  // Rate limiting check
  if (!window.InputSanitizer.checkRateLimit("story_submission", 3, 300000)) {
    // 3 submissions per 5 minutes
    alert("Too many submissions. Please wait before submitting again.");
    return;
  }

  // Get form data
  const storyText = storyContent.value.trim();
  const storyTitle =
    document.getElementById("story-title")?.value?.trim() || "";

  // Validate and sanitize story content
  const contentValidation =
    window.InputSanitizer.validateStoryContent(storyText);
  if (!contentValidation.isValid) {
    alert(
      "Story content validation failed. Please ensure your story is between 10-5000 characters and contains at least 5 words."
    );
    return;
  }

  // Sanitize title
  const sanitizedTitle = window.InputSanitizer.sanitizeText(storyTitle);
  if (sanitizedTitle.length < 3) {
    alert("Story title must be at least 3 characters long.");
    return;
  }

  // Additional validation
  if (storyText.length < 500) {
    alert("Your story must be at least 500 characters long.");
    return;
  }

  if (storyText.length > MAX_CHARS) {
    alert(`Your story exceeds the maximum ${MAX_CHARS} character limit.`);
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

  // In a real app, this would submit to a server
  // For now, we'll just show success message and clear the form

  // Hide the form and show success message
  storyForm.style.display = "none";
  submissionSuccess.classList.remove("hidden");

  // Clear localStorage draft
  localStorage.removeItem(DRAFT_KEY);

  // Scroll to top of success message
  submissionSuccess.scrollIntoView({ behavior: "smooth" });
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
