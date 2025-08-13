// Database Manager for Umoja Project with Supabase
class DatabaseManager {
  constructor() {
    this.isInitialized = false;
  }

  async initializeConfig() {
    // Check if UmojaConfig is available
    if (window.UmojaConfig && window.UmojaConfig.supabase) {
      this.supabase = window.UmojaConfig.supabase;
      this.tables = window.UmojaConfig.TABLES;
      this.status = window.UmojaConfig.STORY_STATUS;
      this.isInitialized = true;
      return true;
    } else {
      this.isInitialized = false;
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

  // Story Management - Fixed to match exact schema
  async submitStory(storyData) {
    try {
      this.ensureInitialized();

      // Try to get current user but don't require it
      const user = await this.getCurrentUser();
      console.log("Submitting story as user:", user ? user.email : "Anonymous user");

      // Validate required fields (simplified)
      if (!storyData.title || !storyData.content) {
        throw new Error("Missing required fields: title or content");
      }

      // Get category ID from category slug if category is provided
      let categoryId = null;
      if (storyData.category) {
        console.log("🔍 Looking up category:", storyData.category);
        const { data: categoryData, error: categoryError } = await this.supabase
          .from("categories")
          .select("id")
          .eq("slug", storyData.category)
          .single();

        if (!categoryError && categoryData) {
          categoryId = categoryData.id;
          console.log("✅ Found category ID:", categoryId);
        } else {
          console.warn("⚠️ Category not found, will use default");
        }
      }

      // Calculate reading time (200 words per minute)
      const wordCount = storyData.content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      // Create story record matching EXACT schema - DIRECT PUBLICATION
      const storyRecord = {
        title: storyData.title.trim(),
        content: storyData.content.trim(),
        summary:
          storyData.content.substring(0, 200) +
          (storyData.content.length > 200 ? "..." : ""),
        author_name: storyData.authorName.trim(),
        author_email: user ? user.email : "anonymous@example.com",
        category: storyData.category || "community",
        status: "approved", // CHANGED: Direct approval - no review needed
        is_anonymous: Boolean(storyData.isAnonymous),
        is_featured: false,
        is_trending: false,
        allow_comments: true,
        image_url: storyData.imageUrl || null,
        audio_url: null,
        video_url: null,
        reading_time: readingTime,
        sentiment_data: null,
        ai_metadata: {
          processing_date: new Date().toISOString(),
          ai_enabled: false,
          auto_approved: true,
        },
        seo_metadata: {},
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        bookmark_count: 0,
        user_id: user ? user.id : null,
        category_id: categoryId,
        moderator_id: null,
        moderation_notes: "Auto-approved on submission",
        rejection_reason: null,
        published_at: new Date().toISOString(), // Published immediately
        featured_at: null,
        archived_at: null,
      };

      console.log("📝 Final story record to insert:", storyRecord);

      // Insert into database
      const { data, error } = await this.supabase
        .from("stories")
        .insert([storyRecord])
        .select()
        .single();

      if (error) {
        console.error("❌ Database insertion error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log("✅ Story inserted successfully:", data);
      console.log("✅ UPLOAD SUCCESS AT:", new Date().toISOString());

      return {
        success: true,
        story: data,
        message:
          "Thank you for uploading your story! Every story matters to us. Your story is now live on the website.",
      };
    } catch (error) {
      console.error("❌ Submit story error:", error);
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  // Get stories with proper filtering and joins
  async getStories(filters = {}) {
    try {
      this.ensureInitialized();

      console.log("🔍 Getting stories with filters:", filters);

      // Build query without joins since relationships don't exist
      // This should get ALL approved stories from ALL users
      let query = this.supabase
        .from("stories")
        .select("*")
        .eq("status", "approved")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false }); // Sort by published_at instead of created_at

      // Apply filters
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Get stories error:", error);
        // If there's an RLS error, try to bypass it by getting all public stories
        console.log("🔄 Attempting to get public stories...");
        return await this.getPublicStories(filters);
      }

      console.log("✅ Retrieved stories:", data?.length || 0);
      return { success: true, stories: data || [] };
    } catch (error) {
      console.error("Get stories error:", error);
      // Fallback to public stories
      return await this.getPublicStories(filters);
    }
  }

  // Get public stories (bypass RLS issues)
  async getPublicStories(filters = {}) {
    try {
      console.log("🌍 Getting public stories (bypassing RLS)...");

      // Use service role or public access to get all approved stories
      let query = this.supabase
        .from("stories")
        .select("*")
        .eq("status", "approved")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });

      // Apply filters
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Get public stories error:", error);
        return { success: false, error: error.message, stories: [] };
      }

      console.log("✅ Retrieved public stories:", data?.length || 0);
      return { success: true, stories: data || [] };
    } catch (error) {
      console.error("Get public stories error:", error);
      return { success: false, error: error.message, stories: [] };
    }
  }

  // Get all stories (including pending) for admin/moderation
  async getAllStories(filters = {}) {
    try {
      this.ensureInitialized();

      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      console.log("🔍 Getting ALL stories with filters:", filters);

      let query = this.supabase
        .from("stories")
        .select("*")
        .eq("status", "approved") // Explicitly filter for approved stories
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });

      // Apply additional filters
      if (filters.status && filters.status !== "approved") {
        query = query.eq("status", filters.status);
      }

      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Get all stories error:", error);
        throw error;
      }

      console.log("✅ Retrieved all stories:", data?.length || 0);
      return { success: true, stories: data || [] };
    } catch (error) {
      console.error("Get all stories error:", error);
      return { success: false, error: error.message, stories: [] };
    }
  }

  async getStoryById(id) {
    try {
      this.ensureInitialized();

      const { data, error } = await this.supabase
        .from("stories")
        .select("*")
        .eq("id", id)
        .eq("status", "approved")
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
        .from("stories")
        .select("*")
        .eq("status", "approved")
        .not("published_at", "is", null)
        .or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,author_name.ilike.%${searchTerm}%`
        )
        .order("published_at", { ascending: false });

      if (error) throw error;
      return { success: true, stories: data };
    } catch (error) {
      console.error("Search stories error:", error);
      return { success: false, error: error.message };
    }
  }

  // Draft Management
  async saveDraft(draftData, draftId = null) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        // Save to localStorage if not authenticated
        const localDrafts = this.getLocalDrafts();
        const draftToSave = {
          ...draftData,
          id: draftId || "local_" + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (draftId) {
          // Update existing local draft
          const index = localDrafts.findIndex((d) => d.id === draftId);
          if (index !== -1) {
            localDrafts[index] = { ...localDrafts[index], ...draftToSave };
          } else {
            localDrafts.push(draftToSave);
          }
        } else {
          localDrafts.push(draftToSave);
        }

        localStorage.setItem("story_drafts", JSON.stringify(localDrafts));
        return { success: true, draft: draftToSave, location: "local" };
      }

      const draftRecord = {
        title: draftData.title || "Untitled Draft",
        content: draftData.content,
        category: draftData.category || "general",
        is_anonymous: draftData.isAnonymous || false,
        image_url: draftData.imageUrl || null,
        user_id: user.id,
        status: this.status.DRAFT,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (draftId) {
        // Update existing draft
        result = await this.supabase
          .from(this.tables.STORIES)
          .update(draftRecord)
          .eq("id", draftId)
          .eq("user_id", user.id) // Ensure user owns the draft
          .select();
      } else {
        // Create new draft
        draftRecord.created_at = new Date().toISOString();
        result = await this.supabase
          .from(this.tables.STORIES)
          .insert([draftRecord])
          .select();
      }

      if (result.error) throw result.error;

      // Clear localStorage draft if successfully saved to database
      localStorage.removeItem("story_draft");

      return { success: true, draft: result.data[0], location: "database" };
    } catch (error) {
      console.error("Save draft error:", error);
      return { success: false, error: error.message };
    }
  }

  getLocalDrafts() {
    try {
      const drafts = localStorage.getItem("story_drafts");
      return drafts ? JSON.parse(drafts) : [];
    } catch {
      return [];
    }
  }

  async getAllDrafts() {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        // Return local drafts if not authenticated
        return {
          success: true,
          drafts: this.getLocalDrafts(),
          location: "local",
        };
      }

      this.ensureInitialized();

      const { data, error } = await this.supabase
        .from(this.tables.STORIES)
        .select("*")
        .eq("user_id", user.id)
        .eq("status", this.status.DRAFT)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return { success: true, drafts: data || [], location: "database" };
    } catch (error) {
      console.error("Get drafts error:", error);
      return { success: false, error: error.message };
    }
  }

  async deleteDraft(draftId) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        // Delete from localStorage
        const localDrafts = this.getLocalDrafts();
        const filteredDrafts = localDrafts.filter((d) => d.id !== draftId);
        localStorage.setItem("story_drafts", JSON.stringify(filteredDrafts));
        return { success: true, location: "local" };
      }

      this.ensureInitialized();

      const { error } = await this.supabase
        .from(this.tables.STORIES)
        .delete()
        .eq("id", draftId)
        .eq("user_id", user.id)
        .eq("status", this.status.DRAFT);

      if (error) throw error;

      return { success: true, location: "database" };
    } catch (error) {
      console.error("Delete draft error:", error);
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

  // Debug function to check what stories exist
  async debugGetAllStories() {
    try {
      this.ensureInitialized();
      console.log("🔍 DEBUG: Getting ALL stories regardless of status...");

      const { data, error } = await this.supabase
        .from("stories")
        .select("id, title, status, published_at, created_at, author_name")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ DEBUG: Error getting all stories:", error);
        throw error;
      }

      console.log("📊 DEBUG: All stories in database:", data);
      console.log(
        "📊 DEBUG: Stories by status:",
        data.reduce((acc, story) => {
          acc[story.status] = (acc[story.status] || 0) + 1;
          return acc;
        }, {})
      );

      return { success: true, stories: data || [] };
    } catch (error) {
      console.error("DEBUG: Get all stories error:", error);
      return { success: false, error: error.message, stories: [] };
    }
  }
}

// Export DatabaseManager class for manual instantiation
window.DatabaseManager = DatabaseManager;
