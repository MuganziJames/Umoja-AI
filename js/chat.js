// AI Support Chat JavaScript
class ChatManager {
  constructor() {
    this.conversationHistory = [];
    this.isTyping = false;
    this.currentUser = null;
    this.chatStartTime = new Date();

    // DOM elements
    this.chatMessages = document.getElementById("chat-messages");
    this.chatInput = document.getElementById("chat-input");
    this.sendButton = document.getElementById("send-button");
    this.typingIndicator = document.getElementById("typing-indicator");
    this.charCount = document.getElementById("char-count");
    this.clearButton = document.getElementById("clear-chat");
    this.saveButton = document.getElementById("save-chat");
    this.loadingOverlay = document.getElementById("loading-overlay");

    this.init();
  }

  async init() {
    try {
      // Wait for dependencies
      await this.waitForDependencies();

      // Get current user (optional for chat)
      this.currentUser = await this.getCurrentUser();

      // Setup event listeners
      this.setupEventListeners();

      // Load any existing conversation
      await this.loadStoredConversation();

      console.log("✅ Chat Manager initialized");
    } catch (error) {
      console.error("❌ Chat initialization error:", error);
      this.showError(
        "Chat service is temporarily unavailable. Please try refreshing the page."
      );
    }
  }

  async waitForDependencies() {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      if (window.UmojaAI && window.UmojaDB) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.UmojaAI) {
      throw new Error("AI services not available");
    }
  }

  async getCurrentUser() {
    try {
      if (window.UmojaDB) {
        return await window.UmojaDB.getCurrentUser();
      }
      return null;
    } catch (error) {
      console.log("User not authenticated - anonymous chat mode");
      return null;
    }
  }

  setupEventListeners() {
    // Send button click
    this.sendButton.addEventListener("click", () => this.sendMessage());

    // Enter key to send (Shift+Enter for new line)
    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea and character count
    this.chatInput.addEventListener("input", () => {
      this.updateCharacterCount();
      this.autoResizeTextarea();
      this.updateSendButton();
    });

    // Clear chat
    this.clearButton.addEventListener("click", () => this.clearChat());

    // Save chat (if user is logged in)
    if (this.saveButton) {
      this.saveButton.addEventListener("click", () => this.saveChat());
    }

    // Auto-scroll on new messages
    this.setupAutoScroll();
  }

  updateCharacterCount() {
    const length = this.chatInput.value.length;
    const maxLength = 2000;

    this.charCount.textContent = length;

    // Update styling based on character count
    this.charCount.parentElement.classList.remove("warning", "danger");
    if (length > maxLength * 0.9) {
      this.charCount.parentElement.classList.add("danger");
    } else if (length > maxLength * 0.8) {
      this.charCount.parentElement.classList.add("warning");
    }
  }

  autoResizeTextarea() {
    this.chatInput.style.height = "auto";
    this.chatInput.style.height =
      Math.min(this.chatInput.scrollHeight, 120) + "px";
  }

  updateSendButton() {
    const hasText = this.chatInput.value.trim().length > 0;
    this.sendButton.disabled = !hasText || this.isTyping;
  }

  setupAutoScroll() {
    // Auto-scroll to bottom when new messages are added
    const observer = new MutationObserver(() => {
      this.scrollToBottom();
    });

    observer.observe(this.chatMessages, {
      childList: true,
      subtree: true,
    });
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isTyping) return;

    // Add user message to chat
    this.addMessage(message, "user");

    // Clear input
    this.chatInput.value = "";
    this.updateCharacterCount();
    this.autoResizeTextarea();
    this.updateSendButton();

    // Show typing indicator
    this.showTyping();

    try {
      // Get AI response
      const response = await window.UmojaAI.provideSupportChat(
        message,
        this.conversationHistory,
        { maxTokens: 600 }
      );

      // Hide typing indicator
      this.hideTyping();

      if (response.success) {
        // Add AI response
        this.addMessage(response.message, "ai", response.isCrisis);

        // Handle crisis situations
        if (response.isCrisis) {
          this.showCrisisAlert();
        }

        // Store conversation
        await this.storeConversation();
      } else {
        this.addMessage(
          response.message ||
            "I'm having trouble responding right now. Please try again in a moment.",
          "ai"
        );
      }
    } catch (error) {
      this.hideTyping();
      console.error("Chat error:", error);
      this.addMessage(
        "I'm having trouble connecting right now. Your feelings are still valid, and I'm here when you're ready to try again.",
        "ai"
      );
    }
  }

  addMessage(content, sender, isCrisis = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Store in conversation history
    this.conversationHistory.push({
      role: sender,
      content: content,
      timestamp: timestamp.toISOString(),
      isCrisis: isCrisis,
    });

    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas ${sender === "user" ? "fa-user" : "fa-heart"}"></i>
      </div>
      <div class="message-content">
        <div class="message-text">
          ${this.formatMessage(content)}
          <!-- Crisis resources removed -->
        </div>
        <div class="message-time">${timeString}</div>
      </div>
    `;

    this.chatMessages.appendChild(messageDiv);

    // Animate message appearance
    setTimeout(() => {
      messageDiv.style.opacity = "0";
      messageDiv.style.transform = "translateY(20px)";
      messageDiv.style.transition = "all 0.3s ease";

      requestAnimationFrame(() => {
        messageDiv.style.opacity = "1";
        messageDiv.style.transform = "translateY(0)";
      });
    }, 10);
  }

  formatMessage(content) {
    // Convert line breaks to paragraphs
    const paragraphs = content.split("\n").filter((p) => p.trim());
    return paragraphs.map((p) => `<p>${this.escapeHtml(p)}</p>`).join("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // getCrisisResourcesHTML removed – crisis resources panel no longer shown

  showCrisisAlert() {
    // Optional: Could show a persistent crisis alert at the top of the chat
    console.log("Crisis situation detected - resources provided");
  }

  showTyping() {
    this.isTyping = true;
    this.typingIndicator.classList.add("show");
    this.updateSendButton();
    this.scrollToBottom();
  }

  hideTyping() {
    this.isTyping = false;
    this.typingIndicator.classList.remove("show");
    this.updateSendButton();
  }

  async clearChat() {
    const confirmed = await this.showConfirmation(
      "Clear Conversation",
      "Are you sure you want to clear this conversation? This action cannot be undone.",
      "Clear"
    );

    if (confirmed) {
      // Clear messages (except welcome message)
      const messages = this.chatMessages.querySelectorAll(
        ".message:not(:first-child)"
      );
      messages.forEach((msg) => msg.remove());

      // Clear conversation history
      this.conversationHistory = [];

      // Clear stored conversation
      localStorage.removeItem("chat_conversation");

      console.log("✅ Chat cleared");
    }
  }

  async saveChat() {
    if (!this.currentUser || this.conversationHistory.length === 0) {
      this.showNotification("Please sign in to save conversations", "info");
      return;
    }

    try {
      // Save to database for authenticated users
      await this.saveChatToDatabase();
      this.showNotification("Conversation saved", "success");
      console.log("Chat saved for user:", this.currentUser.id);
    } catch (error) {
      console.error("Save chat error:", error);
      this.showNotification("Failed to save conversation", "error");
    }
  }

  async saveChatToDatabase() {
    if (!window.UmojaDB || !this.currentUser) return;

    try {
      // Create a new chat session row
      const sessionInsert = {
        user_id: this.currentUser.id,
        session_start: this.chatStartTime.toISOString(),
        session_end: new Date().toISOString(),
        is_anonymous: false,
        crisis_detected: this.conversationHistory.some((m) => m.isCrisis),
      };

      const { data: session, error: sessionErr } = await window.UmojaDB.supabase
        .from("chat_sessions")
        .insert([sessionInsert])
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // Map messages to chat_messages table format
      const messagesToInsert = this.conversationHistory.map((m) => ({
        session_id: session.id,
        role: m.role,
        content: m.content,
        is_crisis: m.isCrisis,
        timestamp: m.timestamp,
      }));

      if (messagesToInsert.length > 0) {
        const { error: msgErr } = await window.UmojaDB.supabase
          .from("chat_messages")
          .insert(messagesToInsert);

        if (msgErr) throw msgErr;
      }

      console.log(
        "✅ Chat session and messages saved to database:",
        session.id
      );
      return session;
    } catch (error) {
      console.error("❌ Failed to save chat session:", error);
      throw error;
    }
  }

  async storeConversation() {
    // Store conversation in localStorage for session persistence
    try {
      localStorage.setItem(
        "chat_conversation",
        JSON.stringify({
          history: this.conversationHistory,
          timestamp: new Date().toISOString(),
          userId: this.currentUser?.id || "anonymous",
        })
      );

      // Auto-save to database for authenticated users (every 5 messages)
      if (this.currentUser && this.conversationHistory.length % 5 === 0) {
        try {
          await this.saveChatToDatabase();
          console.log("✅ Auto-saved chat to database");
        } catch (error) {
          console.warn("Auto-save to database failed:", error);
        }
      }
    } catch (error) {
      console.warn("Failed to store conversation locally:", error);
    }
  }

  async loadStoredConversation() {
    // First try to load from database for authenticated users
    if (this.currentUser) {
      try {
        await this.loadChatHistoryFromDatabase();
        return;
      } catch (error) {
        console.warn(
          "Failed to load from database, falling back to local storage:",
          error
        );
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem("chat_conversation");
      if (!stored) return;

      const data = JSON.parse(stored);

      // Only load if it's from today
      const storedDate = new Date(data.timestamp);
      const today = new Date();

      if (storedDate.toDateString() === today.toDateString()) {
        // Load recent conversation history (but don't display messages)
        this.conversationHistory = data.history || [];
        console.log(
          "Loaded conversation context from localStorage:",
          this.conversationHistory.length,
          "messages"
        );
      } else {
        // Clear old conversation
        localStorage.removeItem("chat_conversation");
      }
    } catch (error) {
      console.warn("Failed to load stored conversation:", error);
      localStorage.removeItem("chat_conversation");
    }
  }

  async loadChatHistoryFromDatabase() {
    if (!window.UmojaDB || !this.currentUser) return;

    try {
      // Get the most recent chat session from today
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await window.UmojaDB.supabase
        .from("chat_sessions")
        .select("id, session_start")
        .eq("user_id", this.currentUser.id)
        .gte("session_start", `${today}T00:00:00.000Z`)
        .order("session_start", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          // Not "no rows returned"
          throw error;
        }
        console.log("No previous chat sessions found for today");
        return;
      }

      if (data) {
        // Fetch messages for this session
        const { data: msgs, error: msgErr } = await window.UmojaDB.supabase
          .from("chat_messages")
          .select("role, content, is_crisis, timestamp")
          .eq("session_id", data.id)
          .order("timestamp", { ascending: true });

        if (msgErr) throw msgErr;

        this.conversationHistory = (msgs || []).map((m) => ({
          role: m.role,
          content: m.content,
          isCrisis: m.is_crisis,
          timestamp: m.timestamp,
        }));
        console.log(
          "✅ Loaded conversation context from database:",
          this.conversationHistory.length,
          "messages"
        );
      }
    } catch (error) {
      console.error("❌ Failed to load chat history from database:", error);
      throw error;
    }
  }

  async showConfirmation(title, message, confirmText) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirmation-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex; align-items: center; justify-content: center;
        z-index: 10001;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background: white; border-radius: 12px; padding: 2rem;
        max-width: 400px; width: 90%; text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      `;

      modal.innerHTML = `
        <h3 style="margin: 0 0 1rem 0; color: #2d3748;">${title}</h3>
        <p style="margin: 0 0 2rem 0; color: #4a5568;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="cancel-btn" style="padding: 0.75rem 1.5rem; border: 2px solid #e2e8f0; background: white; color: #4a5568; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancel</button>
          <button class="confirm-btn" style="padding: 0.75rem 1.5rem; border: none; background: #f56565; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">${confirmText}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const cleanup = (result) => {
        document.body.removeChild(overlay);
        resolve(result);
      };

      modal.querySelector(".cancel-btn").onclick = () => cleanup(false);
      modal.querySelector(".confirm-btn").onclick = () => cleanup(true);
      overlay.onclick = (e) => e.target === overlay && cleanup(false);
    });
  }

  showNotification(message, type = "info") {
    // Use existing notification system if available
    if (window.NotificationSystem) {
      window.NotificationSystem.show(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  showError(message) {
    this.showNotification(message, "error");
  }
}

// Initialize chat when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.chatManager = new ChatManager();
});

// Mobile navigation toggle (reuse from other pages)
document.addEventListener("DOMContentLoaded", function () {
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const nav = document.querySelector("nav");

  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", function () {
      nav.classList.toggle("active");
    });
  }
});
