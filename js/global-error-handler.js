// Global Error Handling for Umoja Project
class GlobalErrorHandler {
  constructor() {
    this.setupUnhandledErrorHandling();
    this.setupUnhandledRejectionHandling();
    this.setupNetworkErrorHandling();
  }

  // Handle unhandled JavaScript errors
  setupUnhandledErrorHandling() {
    window.addEventListener("error", (event) => {
      this.logError("JavaScript Error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });

      this.showUserFriendlyError(
        "Something went wrong. Please refresh the page and try again."
      );
    });
  }

  // Handle unhandled promise rejections
  setupUnhandledRejectionHandling() {
    window.addEventListener("unhandledrejection", (event) => {
      this.logError("Unhandled Promise Rejection", {
        reason: event.reason,
        promise: event.promise,
      });

      this.showUserFriendlyError(
        "A network or processing error occurred. Please try again."
      );

      // Prevent the default browser behavior
      event.preventDefault();
    });
  }

  // Handle network errors
  setupNetworkErrorHandling() {
    // Monitor fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          this.logError("Network Error", {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
          });

          if (response.status >= 500) {
            this.showUserFriendlyError("Server error. Please try again later.");
          } else if (response.status === 429) {
            this.showUserFriendlyError(
              "Too many requests. Please wait a moment and try again."
            );
          } else if (response.status >= 400) {
            this.showUserFriendlyError(
              "Request failed. Please check your input and try again."
            );
          }
        }

        return response;
      } catch (error) {
        this.logError("Network Fetch Error", {
          url: args[0],
          error: error.message,
        });

        this.showUserFriendlyError(
          "Network connection failed. Please check your internet connection."
        );
        throw error;
      }
    };
  }

  // Log errors (in production, send to logging service)
  logError(type, details) {
    const errorInfo = {
      type: type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: details,
    };

    console.error(`[${type}]`, errorInfo);

    // In production, send to logging service
    // this.sendToLoggingService(errorInfo);
  }

  // Show user-friendly error messages
  showUserFriendlyError(message) {
    // Check if an error message is already displayed
    const existingError = document.getElementById("global-error-message");
    if (existingError) {
      existingError.remove();
    }

    // Create error notification
    const errorDiv = document.createElement("div");
    errorDiv.id = "global-error-message";
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ff6b6b;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideInRight 0.3s ease-out;
    `;

    errorDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="flex: 1; margin-right: 10px;">
          <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
          ${message}
        </span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0;">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.style.animation = "slideOutRight 0.3s ease-in";
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 8000);
  }

  // Manual error reporting method
  static reportError(error, context = {}) {
    const handler = window.globalErrorHandler;
    if (handler) {
      handler.logError("Manual Report", {
        error: error.message || error,
        stack: error.stack,
        context: context,
      });
    }
  }
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize global error handler
window.globalErrorHandler = new GlobalErrorHandler();

// Export for manual error reporting
window.GlobalErrorHandler = GlobalErrorHandler;
