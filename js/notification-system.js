/**
 * Global Notification System for Umoja-AI
 * Provides consistent, non-intrusive notifications across all pages
 */

class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container if it doesn't exist
    if (!document.querySelector('.notification-container')) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.notification-container');
    }

    // Add CSS if not already added
    this.addStyles();
  }

  addStyles() {
    if (document.querySelector('#notification-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      }

      .notification {
        position: relative;
        padding: 16px 20px;
        margin-bottom: 12px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(400px);
        transition: all 0.3s ease-in-out;
        pointer-events: auto;
        cursor: pointer;
        min-width: 300px;
        max-width: 400px;
        word-wrap: break-word;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .notification.show {
        transform: translateX(0);
      }

      .notification.success {
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .notification.error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }

      .notification.warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .notification.info {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }

      .notification-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        font-weight: 700;
        margin-bottom: 4px;
      }

      .notification-message {
        font-weight: 500;
        opacity: 0.95;
      }

      .notification-close {
        font-size: 16px;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s ease;
        flex-shrink: 0;
        padding: 4px;
        border-radius: 4px;
      }

      .notification-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }

      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 8px 8px;
        transition: width linear;
      }

      @media (max-width: 480px) {
        .notification-container {
          left: 12px;
          right: 12px;
          top: 12px;
        }

        .notification {
          min-width: auto;
          max-width: none;
          transform: translateY(-100px);
        }

        .notification.show {
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  getIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  show(message, type = 'info', options = {}) {
    const {
      title = '',
      duration = 5000,
      closable = true,
      persistent = false
    } = options;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Build notification content
    let content = `
      <i class="notification-icon ${this.getIcon(type)}"></i>
      <div class="notification-content">
        ${title ? `<div class="notification-title">${this.escapeHtml(title)}</div>` : ''}
        <div class="notification-message">${this.escapeHtml(message)}</div>
      </div>
    `;

    if (closable) {
      content += `<i class="notification-close fas fa-times"></i>`;
    }

    if (!persistent && duration > 0) {
      content += `<div class="notification-progress"></div>`;
    }

    notification.innerHTML = content;

    // Add click handlers
    if (closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(notification);
      });
    }

    // Click to dismiss
    notification.addEventListener('click', () => {
      if (closable) {
        this.remove(notification);
      }
    });

    // Add to container
    this.container.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto-hide if not persistent
    if (!persistent && duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressBar.style.width = '0%';
          progressBar.style.transition = `width ${duration}ms linear`;
        }, 100);
      }

      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  }

  remove(notification) {
    if (!notification || !notification.parentNode) return;

    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  clear() {
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(notification => this.remove(notification));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
window.NotificationSystem = new NotificationSystem();

// Add convenience methods to window object
window.showNotification = (message, type = 'info', options = {}) => {
  return window.NotificationSystem.show(message, type, options);
};

window.showSuccess = (message, options = {}) => {
  return window.NotificationSystem.success(message, options);
};

window.showError = (message, options = {}) => {
  return window.NotificationSystem.error(message, options);
};

window.showWarning = (message, options = {}) => {
  return window.NotificationSystem.warning(message, options);
};

window.showInfo = (message, options = {}) => {
  return window.NotificationSystem.info(message, options);
};

// Global confirmation dialog function
window.showConfirmationDialog = (title, message, confirmText = 'Confirm', cancelText = 'Cancel') => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    `;

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      text-align: center;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">${title}</h3>
      <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="confirm-btn" style="
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">${confirmText}</button>
        <button class="cancel-btn" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">${cancelText}</button>
      </div>
    `;

    // Add hover effects
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.background = '#c82333';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.background = '#dc3545';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#5a6268';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#6c757d';
    });

    // Handle button clicks
    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    // Handle overlay click (cancel)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add CSS animations if not already present
    if (!document.querySelector('#confirmation-styles')) {
      const styles = document.createElement('style');
      styles.id = 'confirmation-styles';
      styles.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(styles);
    }
  });
};

// Global prompt dialog function
window.showPromptDialog = (title, message, defaultValue = '', placeholder = '') => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    `;

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.className = 'prompt-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: #666; line-height: 1.5;">${message}</p>
      <input type="text" class="prompt-input" value="${defaultValue}" placeholder="${placeholder}" style="
        width: 100%;
        padding: 12px;
        border: 2px solid #e1e5e9;
        border-radius: 6px;
        font-size: 14px;
        margin-bottom: 20px;
        box-sizing: border-box;
        transition: border-color 0.2s;
      ">
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="cancel-btn" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">Cancel</button>
        <button class="ok-btn" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">OK</button>
      </div>
    `;

    // Get elements
    const input = dialog.querySelector('.prompt-input');
    const okBtn = dialog.querySelector('.ok-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    // Focus input and select text
    setTimeout(() => {
      input.focus();
      if (defaultValue) {
        input.select();
      }
    }, 100);

    // Add hover effects
    okBtn.addEventListener('mouseenter', () => {
      okBtn.style.background = '#0056b3';
    });
    okBtn.addEventListener('mouseleave', () => {
      okBtn.style.background = '#007bff';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#5a6268';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#6c757d';
    });

    // Input focus effects
    input.addEventListener('focus', () => {
      input.style.borderColor = '#007bff';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e1e5e9';
    });

    // Handle button clicks
    okBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(input.value);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.body.removeChild(overlay);
        resolve(input.value);
      } else if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    // Handle overlay click (cancel)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
};
