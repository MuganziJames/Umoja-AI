// Database Manager for Umoja Project with Supabase
class DatabaseManager {
  constructor() {
    // Wait for UmojaConfig to be available
    this.initializeConfig();
  }

  async initializeConfig() {
    // Check if UmojaConfig is available
    if (window.UmojaConfig && window.UmojaConfig.supabase) {
      this.supabase = window.UmojaConfig.supabase;
      this.tables = window.UmojaConfig.TABLES;
      this.status = window.UmojaConfig.STORY_STATUS;
      this.isInitialized = true;
      console.log("✅ DatabaseManager initialized successfully");
      return true;
    } else {
      this.isInitialized = false;
      // Return false instead of infinite retry
      return false;
    }
  }

  // Static method to wait for UmojaConfig and create instance
  static async waitForConfigAndCreate(maxRetries = 50) {
    for (let i = 0; i < maxRetries; i++) {
      if (window.UmojaConfig && window.UmojaConfig.supabase) {
        const manager = new DatabaseManager();
        await manager.initializeConfig();
        return manager;
      }
      // Wait 100ms between retries
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      "Failed to initialize DatabaseManager: UmojaConfig not available after retries"
    );
  }

  // Check if the database manager is ready to use
  ensureInitialized() {
    if (!this.isInitialized || !this.supabase) {
      throw new Error(
        "Database manager not initialized. Please wait for Supabase configuration to load."
      );
    }
  }

  // User Authentication
  async signUp(email, password, userData) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      this.ensureInitialized();

      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      this.ensureInitialized();

      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error) {
        console.warn("Get user error:", error);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  // Story Management
  async submitStory(storyData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error("User must be authenticated to submit stories");
      }

      // Sanitize input data
      const sanitizedData = {
        title:
          window.InputSanitizer?.sanitizeText(storyData.title) ||
          storyData.title,
        content:
          window.InputSanitizer?.sanitizeText(storyData.content) ||
          storyData.content,
        category: storyData.category || "general",
        isAnonymous: Boolean(storyData.isAnonymous),
      };

      // AI-powered content moderation with error handling
      let moderationResult;
      try {
        moderationResult = await window.UmojaAI.moderateContent(
          sanitizedData.content
        );
        if (moderationResult.flagged) {
          return {
            success: false,
            error:
              "Content flagged by moderation system. Please review and modify your story.",
            moderation: moderationResult,
          };
        }
      } catch (error) {
        console.warn(
          "Content moderation failed, proceeding without it:",
          error
        );
        window.GlobalErrorHandler?.reportError(error, {
          context: "content_moderation",
        });
      }

      // AI-powered categorization if no category provided with error handling
      if (!sanitizedData.category || sanitizedData.category === "general") {
        try {
          sanitizedData.category = await window.UmojaAI.categorizeStory(
            sanitizedData.title,
            sanitizedData.content
          );
        } catch (error) {
          console.warn("Auto-categorization failed, using default:", error);
          sanitizedData.category = "general";
          window.GlobalErrorHandler?.reportError(error, {
            context: "auto_categorization",
          });
        }
      }

      // Generate AI summary with error handling
      let summary = "";
      try {
        summary = await window.UmojaAI.generateSummary(sanitizedData.content);
      } catch (error) {
        console.warn("Summary generation failed:", error);
        summary = sanitizedData.content.substring(0, 200) + "...";
        window.GlobalErrorHandler?.reportError(error, {
          context: "summary_generation",
        });
      }

      // Sentiment analysis with error handling
      let sentiment = "neutral";
      try {
        sentiment = await window.UmojaAI.analyzeSentiment(
          sanitizedData.content
        );
      } catch (error) {
        console.warn("Sentiment analysis failed:", error);
        sentiment = "neutral";
        window.GlobalErrorHandler?.reportError(error, {
          context: "sentiment_analysis",
        });
      }

      const storyRecord = {
        title: sanitizedData.title,
        content: sanitizedData.content,
        author_name: storyData.authorName,
        author_email: user.email,
        category: sanitizedData.category, // Fixed: use sanitizedData.category instead of storyData.category
        status: this.status.PENDING,
        summary: summary,
        sentiment_data: sentiment,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .insert([storyRecord])
        .select();

      if (error) throw error;

      return { success: true, story: data[0] };
    } catch (error) {
      console.error("Submit story error:", error);
      return { success: false, error: error.message };
    }
  }

  async getStories(filters = {}) {
    try {
      let query = this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("status", this.status.APPROVED)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, stories: data };
    } catch (error) {
      console.error("Get stories error:", error);
      return { success: false, error: error.message };
    }
  }

  async getStoryById(id) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("id", id)
        .eq("status", this.status.APPROVED)
        .single();

      if (error) throw error;

      // Get similar stories using AI (with error handling)
      try {
        const allStoriesResult = await this.getStories();
        if (allStoriesResult.success && window.UmojaAI) {
          const similarStories = await window.UmojaAI.findSimilarStories(
            data,
            allStoriesResult.stories
          );
          data.similar_stories = similarStories;
        }
      } catch (aiError) {
        console.warn("Similar stories AI failed:", aiError);
        // Continue without similar stories
      }

      // Track analytics
      await this.trackStoryView(id);

      return { success: true, story: data };
    } catch (error) {
      console.error("Get story by ID error:", error);
      return { success: false, error: error.message };
    }
  }

  async searchStories(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("status", this.status.APPROVED)
        .or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,author_name.ilike.%${searchTerm}%`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, stories: data };
    } catch (error) {
      console.error("Search stories error:", error);
      return { success: false, error: error.message };
    }
  }

  // Draft Management
  async saveDraft(draftData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        // Save to localStorage if not authenticated
        localStorage.setItem("story_draft", JSON.stringify(draftData));
        return { success: true, location: "local" };
      }

      const draftRecord = {
        ...draftData,
        user_id: user.id,
        status: this.status.DRAFT,
        updated_at: new Date().toISOString(),
      };

      // Check if draft already exists
      const { data: existingDraft } = await this.supabase
        .from(this.tables.STORIES)
        .select("id")
        .eq("user_id", user.id)
        .eq("status", this.status.DRAFT)
        .single();

      let result;
      if (existingDraft) {
        // Update existing draft
        result = await this.supabase
          .from(this.tables.STORIES)
          .update(draftRecord)
          .eq("id", existingDraft.id)
          .select();
      } else {
        // Create new draft
        result = await this.supabase
          .from(this.tables.STORIES)
          .insert([draftRecord])
          .select();
      }

      if (result.error) throw result.error;
      return { success: true, draft: result.data[0], location: "database" };
    } catch (error) {
      console.error("Save draft error:", error);
      return { success: false, error: error.message };
    }
  }

  async getDraft() {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        // Try to get from localStorage
        const localDraft = localStorage.getItem("story_draft");
        return localDraft
          ? { success: true, draft: JSON.parse(localDraft), location: "local" }
          : { success: false };
      }

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("user_id", user.id)
        .eq("status", this.status.DRAFT)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
      return data
        ? { success: true, draft: data, location: "database" }
        : { success: false };
    } catch (error) {
      console.error("Get draft error:", error);
      return { success: false, error: error.message };
    }
  }

  // Analytics
  async trackStoryView(storyId) {
    try {
      const { error } = await this.supabase
        .from(this.tables.STORY_ANALYTICS)
        .insert([
          {
            story_id: storyId,
            event_type: "view",
            timestamp: new Date().toISOString(),
          },
        ]);

      if (error) console.error("Analytics tracking error:", error);
    } catch (error) {
      console.error("Track story view error:", error);
    }
  }

  // Get user's stories
  async getUserStories(userId) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { success: true, stories: data };
    } catch (error) {
      console.error("Get user stories error:", error);
      return { success: false, error: error.message };
    }
  }

  // Delete story
  async deleteStory(storyId, userId = null) {
    try {
      this.ensureInitialized();

      // If userId is provided, verify ownership
      if (userId) {
        const { data: story, error: fetchError } = await this.supabase
          .from(this.tables.STORIES)
          .select("user_id")
          .eq("id", storyId)
          .single();

        if (fetchError) throw fetchError;

        if (story.user_id !== userId) {
          throw new Error("Unauthorized: You can only delete your own stories");
        }
      }

      const { error } = await this.supabase
        .from(this.tables.STORIES)
        .delete()
        .eq("id", storyId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Delete story error:", error);
      return { success: false, error: error.message };
    }
  }

  // Update story
  async updateStory(storyId, updatedData, userId = null) {
    try {
      this.ensureInitialized();

      // If userId is provided, verify ownership
      if (userId) {
        const { data: story, error: fetchError } = await this.supabase
          .from(this.tables.STORIES)
          .select("user_id")
          .eq("id", storyId)
          .single();

        if (fetchError) throw fetchError;

        if (story.user_id !== userId) {
          throw new Error("Unauthorized: You can only edit your own stories");
        }
      }

      // Sanitize input data
      const sanitizedData =
        window.InputSanitizer.sanitizeStoryData(updatedData);

      // Add update timestamp
      sanitizedData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .update(sanitizedData)
        .eq("id", storyId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, story: data };
    } catch (error) {
      console.error("Update story error:", error);
      return { success: false, error: error.message };
    }
  }

  // Get single story by ID
  async getStoryById(storyId) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("id", storyId)
        .single();

      if (error) throw error;

      return { success: true, story: data };
    } catch (error) {
      console.error("Get story by ID error:", error);
      return { success: false, error: error.message };
    }
  }

  // File Upload (for images)
  async uploadFile(file, bucket = "story-images") {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: publicURL } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        success: true,
        fileName: fileName,
        publicURL: publicURL.publicUrl,
      };
    } catch (error) {
      console.error("File upload error:", error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions
  subscribeToStories(callback) {
    return this.supabase
      .channel("stories-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.tables.STORIES,
          filter: `status=eq.${this.status.APPROVED}`,
        },
        callback
      )
      .subscribe();
  }
}

// Export DatabaseManager class for manual instantiation
window.DatabaseManager = DatabaseManager;
