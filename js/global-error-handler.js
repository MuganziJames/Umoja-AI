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

  // Show user-friendly error messages - DISABLED
  showUserFriendlyError(message) {
    // Log error to console instead of showing notification
    console.error("Error:", message);
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
