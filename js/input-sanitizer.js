// Input Sanitizer and Rate Limiting for Umoja Project
class InputSanitizer {
  constructor() {
    this.rateLimitStore = new Map();
    console.log("✅ Input Sanitizer initialized");
  }

  // Sanitize text input to prevent XSS and other security issues
  sanitizeText(text) {
    if (typeof text !== "string") return "";

    // Remove HTML tags and dangerous characters
    return text
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .trim();
  }

  // Sanitize HTML content (for rich text editors)
  sanitizeHTML(html) {
    if (typeof html !== "string") return "";

    // Create a temporary div to parse HTML
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Remove dangerous elements and attributes
    const dangerous = temp.querySelectorAll("script, iframe, object, embed");
    dangerous.forEach((el) => el.remove());

    // Remove dangerous attributes
    const allElements = temp.querySelectorAll("*");
    allElements.forEach((el) => {
      // Remove event handlers
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        if (attr.name.startsWith("on") || attr.name === "style") {
          el.removeAttribute(attr.name);
        }
      }
    });

    return temp.innerHTML;
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate URL format
  validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Rate limiting functionality
  checkRateLimit(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, []);
    }

    const requests = this.rateLimitStore.get(key);

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if under limit
    if (validRequests.length >= limit) {
      console.log(
        `⚠️ Rate limit exceeded for ${key}: ${validRequests.length}/${limit}`
      );
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(key, validRequests);

    return true; // Request allowed
  }

  // Reset rate limit for a specific key (for testing)
  resetRateLimit(key) {
    this.rateLimitStore.delete(key);
    console.log(`🔄 Rate limit reset for key: ${key}`);
  }

  // Get remaining requests for rate limit
  getRemainingRequests(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.rateLimitStore.has(key)) {
      return limit;
    }

    const requests = this.rateLimitStore.get(key);
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    return Math.max(0, limit - validRequests.length);
  }

  // Clean up old rate limit data (run periodically)
  cleanupRateLimitStore() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [key, requests] of this.rateLimitStore.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > cutoff);
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        this.rateLimitStore.set(key, validRequests);
      }
    }
  }

  // Validate file upload
  validateFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(", ")}`);
    }

    // Check file name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push("File name contains invalid characters");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  // Validate file upload (wrapper for validateFile with different return format)
  validateFileUpload(file, options = {}) {
    const validation = this.validateFile(file, options);
    return {
      isValid: validation.valid,
      errors: validation.errors,
    };
  }

  // Validate story content specifically
  validateStoryContent(content) {
    if (!content || typeof content !== "string") {
      return {
        isValid: false,
        errors: ["Content is required"],
        sanitized: "",
      };
    }

    const trimmed = content.trim();

    // Check minimum length
    if (trimmed.length < 10) {
      return {
        isValid: false,
        errors: ["Story content must be at least 10 characters long"],
        sanitized: trimmed,
      };
    }

    // Check maximum length
    if (trimmed.length > 5000) {
      return {
        isValid: false,
        errors: ["Story content must not exceed 5000 characters"],
        sanitized: trimmed,
      };
    }

    // Check word count (minimum 5 words)
    const wordCount = trimmed
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    if (wordCount < 5) {
      return {
        isValid: false,
        errors: ["Story must contain at least 5 words"],
        sanitized: trimmed,
      };
    }

    // Sanitize the content
    const sanitized = this.sanitizeText(trimmed);

    // Check for profanity
    if (this.containsProfanity(sanitized)) {
      return {
        isValid: false,
        errors: ["Content contains inappropriate language"],
        sanitized: sanitized,
      };
    }

    return {
      isValid: true,
      errors: [],
      sanitized: sanitized,
    };
  }

  // Sanitize story data object
  sanitizeStoryData(storyData) {
    return {
      title: this.sanitizeText(storyData.title || ""),
      content: this.sanitizeText(storyData.content || ""),
      category: this.sanitizeText(storyData.category || ""),
      authorName: this.sanitizeText(storyData.authorName || ""),
      isAnonymous: Boolean(storyData.isAnonymous),
      imageUrl:
        storyData.imageUrl && this.validateURL(storyData.imageUrl)
          ? storyData.imageUrl
          : null,
    };
  }

  // Content length validation
  validateContentLength(content, min = 0, max = Infinity) {
    const length = content ? content.length : 0;
    return {
      valid: length >= min && length <= max,
      length: length,
      message:
        length < min
          ? `Content must be at least ${min} characters`
          : length > max
          ? `Content must be no more than ${max} characters`
          : null,
    };
  }

  // Profanity filter (basic implementation)
  containsProfanity(text) {
    // Basic profanity list - in production, use a more comprehensive solution
    const profanityList = [
      // Add appropriate words for your context
      "spam",
      "scam",
    ];

    const lowerText = text.toLowerCase();
    return profanityList.some((word) => lowerText.includes(word));
  }

  // Password strength validation
  validatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      valid: score >= 3,
      score: score,
      checks: checks,
      strength: score < 2 ? "weak" : score < 4 ? "medium" : "strong",
    };
  }
}

// Cleanup rate limit store every hour
setInterval(() => {
  if (window.InputSanitizer) {
    window.InputSanitizer.cleanupRateLimitStore();
  }
}, 60 * 60 * 1000);

// Export Input Sanitizer
window.InputSanitizer = new InputSanitizer();
