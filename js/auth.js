// Authentication JavaScript for Umoja Project
class AuthManager {
  constructor() {
    this.currentTab = "signin";
    this.isLoading = false;
    // Don't auto-initialize - wait for static initialize method
  }

  async initializeDatabase() {
    if (window.UmojaDB && window.UmojaDB.isInitialized) {
      this.db = window.UmojaDB;
      console.log("✅ AuthManager database connection established");
      return true;
    } else {
      return false;
    }
  }

  // Static method to properly initialize auth manager
  static async initialize() {
    try {
      console.log("🔄 Starting AuthManager initialization...");

      // Wait for database to be ready
      if (!window.UmojaDB) {
        throw new Error("Database manager not available");
      }

      const authManager = new AuthManager();
      console.log("✅ AuthManager instance created");

      // Initialize database connection
      const dbReady = await authManager.initializeDatabase();
      if (!dbReady) {
        throw new Error("Database initialization failed");
      }
      console.log("✅ Database connection established");

      // Initialize event listeners and check auth status
      authManager.initializeEventListeners();
      console.log("✅ Event listeners attached");

      authManager.checkAuthStatus();
      console.log("✅ Auth status checked");

      console.log("✅ AuthManager fully initialized");
      return authManager;
    } catch (error) {
      console.error("❌ AuthManager initialization failed:", error);
      throw error;
    }
  }

  initializeEventListeners() {
    console.log("🔄 Setting up auth event listeners...");

    // Tab switching
    const tabButtons = document.querySelectorAll(".auth-tab");
    console.log(`Found ${tabButtons.length} tab buttons`);

    tabButtons.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        console.log(`Tab clicked: ${e.target.dataset.tab}`);
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Form switching links
    document.querySelectorAll("[data-switch]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        console.log(`Switch link clicked: ${e.target.dataset.switch}`);
        this.switchTab(e.target.dataset.switch);
      });
    });

    // Form submissions
    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");

    if (signinForm) {
      signinForm.addEventListener("submit", (e) => {
        this.handleSignIn(e);
      });
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        this.handleSignUp(e);
      });
    }

    // OAuth buttons
    const googleSignin = document.getElementById("google-signin");
    const googleSignup = document.getElementById("google-signup");

    if (googleSignin) {
      googleSignin.addEventListener("click", () => {
        this.handleGoogleAuth();
      });
    }

    if (googleSignup) {
      googleSignup.addEventListener("click", () => {
        this.handleGoogleAuth();
      });
    }

    // Forgot password
    const forgotPassword = document.getElementById("forgot-password");
    if (forgotPassword) {
      forgotPassword.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleForgotPassword();
      });
    }

    // Password validation on input
    const passwordInput = document.getElementById("signup-password");
    const confirmInput = document.getElementById("signup-confirm");

    if (passwordInput) {
      passwordInput.addEventListener("input", () => {
        this.validatePassword(passwordInput.value);
      });
    }

    if (confirmInput) {
      confirmInput.addEventListener("input", () => {
        this.validatePasswordMatch();
      });
    }
  }

  switchTab(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);
    this.currentTab = tabName;

    // Update tab buttons
    const tabButtons = document.querySelectorAll(".auth-tab");
    tabButtons.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle("active", isActive);
      console.log(
        `Tab ${tab.dataset.tab}: ${isActive ? "active" : "inactive"}`
      );
    });

    // Update forms
    const forms = document.querySelectorAll(".auth-form");
    forms.forEach((form) => {
      const isActive = form.id === `${tabName}-form`;
      form.classList.toggle("active", isActive);
      console.log(`Form ${form.id}: ${isActive ? "active" : "inactive"}`);
    });

    // Clear any previous errors
    this.clearErrors();
  }

  async handleSignIn(e) {
    e.preventDefault();

    if (this.isLoading) return;

    const formData = new FormData(e.target);
    const email = formData.get("email").trim();
    const password = formData.get("password");
    const rememberMe = formData.get("rememberMe") === "on";

    // Validate inputs
    if (!this.validateSignInForm(email, password)) return;

    this.setLoading(true);

    try {
      this.ensureDatabaseReady();

      const result = await this.db.signIn(email, password);

      if (result.success) {
        // Set session with remember me preference
        if (window.SessionManager) {
          window.SessionManager.setSession(result.user, rememberMe);
        }

        this.showNotification("Welcome back! Redirecting...", "success");

        // Dispatch custom event for other listeners
        window.dispatchEvent(
          new CustomEvent("userSignedIn", {
            detail: { user: result.user },
          })
        );

        // Check for redirect URL from session storage
        const redirectUrl = sessionStorage.getItem(
          "umoja_redirect_after_login"
        );
        sessionStorage.removeItem("umoja_redirect_after_login");

        // Redirect after brief delay
        setTimeout(() => {
          const returnUrl =
            redirectUrl ||
            new URLSearchParams(window.location.search).get("return") ||
            "../index.html"; // Default to home page
          window.location.href = returnUrl;
        }, 1500);
      } else {
        this.showNotification(result.error || "Sign in failed", "error");
        this.showFieldError("signin-email", result.error);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      this.showNotification("An unexpected error occurred", "error");
    } finally {
      this.setLoading(false);
    }
  }

  async handleSignUp(e) {
    e.preventDefault();

    if (this.isLoading) return;

    const formData = new FormData(e.target);
    const fullName = formData.get("fullName").trim();
    const email = formData.get("email").trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    // Validate inputs
    if (!this.validateSignUpForm(fullName, email, password, confirmPassword))
      return;

    this.setLoading(true);

    try {
      this.ensureDatabaseReady();

      const result = await this.db.signUp(email, password, {
        full_name: fullName,
      });

      if (result.success) {
        this.showNotification(
          "Account created successfully! Please check your email to verify your account.",
          "success"
        );

        // Switch to sign in tab after brief delay
        setTimeout(() => {
          this.switchTab("signin");
          // Pre-fill email
          document.getElementById("signin-email").value = email;
        }, 2000);
      } else {
        this.showNotification(
          result.error || "Account creation failed",
          "error"
        );
        this.showFieldError("signup-email", result.error);
      }
    } catch (error) {
      console.error("Sign up error:", error);
      this.showNotification("An unexpected error occurred", "error");
    } finally {
      this.setLoading(false);
    }
  }

  async handleGoogleAuth() {
    if (this.isLoading) return;

    this.setLoading(true);

    try {
      const { data, error } =
        await window.UmojaConfig.supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/pages/submit.html`,
          },
        });

      if (error) {
        throw error;
      }

      // OAuth will redirect automatically
    } catch (error) {
      console.error("Google auth error:", error);
      this.showNotification(
        "Google sign-in failed. Please try again.",
        "error"
      );
      this.setLoading(false);
    }
  }

  async handleForgotPassword() {
    const email = document.getElementById("signin-email").value.trim();

    if (!email) {
      this.showNotification("Please enter your email address first", "error");
      document.getElementById("signin-email").focus();
      return;
    }

    try {
      const { error } =
        await window.UmojaConfig.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/pages/auth.html`,
        });

      if (error) {
        throw error;
      }

      this.showNotification(
        "Password reset email sent! Check your inbox.",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      this.showNotification("Failed to send password reset email", "error");
    }
  }

  validateSignInForm(email, password) {
    let isValid = true;

    // Email validation
    if (!email) {
      this.showFieldError("signin-email", "Email is required");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showFieldError("signin-email", "Please enter a valid email address");
      isValid = false;
    }

    // Password validation
    if (!password) {
      this.showFieldError("signin-password", "Password is required");
      isValid = false;
    }

    return isValid;
  }

  validateSignUpForm(fullName, email, password, confirmPassword) {
    let isValid = true;

    // Full name validation
    if (!fullName || fullName.length < 2) {
      this.showFieldError("signup-name", "Please enter your full name");
      isValid = false;
    }

    // Email validation
    if (!email) {
      this.showFieldError("signup-email", "Email is required");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showFieldError("signup-email", "Please enter a valid email address");
      isValid = false;
    }

    // Password validation
    if (!this.validatePassword(password)) {
      isValid = false;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      this.showFieldError("signup-confirm", "Passwords do not match");
      isValid = false;
    }

    return isValid;
  }

  validatePassword(password) {
    let isValid = true;

    if (!password) {
      this.showFieldError("signup-password", "Password is required");
      isValid = false;
    } else if (password.length < 8) {
      this.showFieldError(
        "signup-password",
        "Password must be at least 8 characters long"
      );
      isValid = false;
    } else {
      // Clear previous error if validation passes
      this.clearFieldError("signup-password");
    }

    return isValid;
  }

  validatePasswordMatch() {
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm").value;

    if (confirmPassword && password !== confirmPassword) {
      this.showFieldError("signup-confirm", "Passwords do not match");
      return false;
    } else {
      this.clearFieldError("signup-confirm");
      return true;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = field.parentNode.querySelector(".error-message");

    field.classList.add("error");
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = field.parentNode.querySelector(".error-message");

    field.classList.remove("error");
    errorElement.style.display = "none";
  }

  clearErrors() {
    document.querySelectorAll(".error-message").forEach((error) => {
      error.style.display = "none";
    });
    document.querySelectorAll("input.error").forEach((input) => {
      input.classList.remove("error");
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    const overlay = document.getElementById("loading-overlay");
    const submitButtons = document.querySelectorAll(".auth-submit");
    const oauthButtons = document.querySelectorAll(".oauth-btn");

    if (loading) {
      overlay.style.display = "flex";
      submitButtons.forEach((btn) => (btn.disabled = true));
      oauthButtons.forEach((btn) => (btn.disabled = true));
    } else {
      overlay.style.display = "none";
      submitButtons.forEach((btn) => (btn.disabled = false));
      oauthButtons.forEach((btn) => (btn.disabled = false));
    }
  }

  showNotification(message, type = "info") {
    // All notifications removed as requested - just log to console
    console.log(`[AUTH ${type.toUpperCase()}] ${message}`);
  }

  async checkAuthStatus() {
    try {
      // Check session first, then database
      if (window.SessionManager && window.SessionManager.isAuthenticated()) {
        const returnUrl =
          sessionStorage.getItem("umoja_redirect_after_login") ||
          new URLSearchParams(window.location.search).get("return");

        if (returnUrl) {
          sessionStorage.removeItem("umoja_redirect_after_login");
          console.log("User already authenticated, redirecting to:", returnUrl);
          window.location.href = returnUrl;
        } else {
          // Redirect to home if already authenticated
          console.log("User already authenticated, redirecting to home");
          window.location.href = "../index.html";
        }
        return;
      }

      // Fallback to database check
      const user = await this.db.getCurrentUser();
      if (user) {
        // User is in database but not in session - set session
        if (window.SessionManager) {
          window.SessionManager.setSession(user, false); // Default to 24h timeout
        }

        const returnUrl = new URLSearchParams(window.location.search).get(
          "return"
        );
        if (returnUrl) {
          console.log(
            "User authenticated in database, redirecting to:",
            returnUrl
          );
          window.location.href = returnUrl;
        } else {
          console.log("User authenticated in database, redirecting to home");
          window.location.href = "../index.html";
        }
      }
    } catch (error) {
      // User not signed in, continue with auth page
      console.log("User not authenticated");
    }
  }

  // Helper method to ensure database is ready
  ensureDatabaseReady() {
    if (!this.db || !this.db.isInitialized) {
      throw new Error(
        "Database connection not ready. Please wait a moment and try again."
      );
    }
  }
}

// Export for external use
window.AuthManager = AuthManager;
