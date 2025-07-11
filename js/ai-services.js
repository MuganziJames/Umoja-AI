// AI Services for Umoja Project - OpenRouter Integration
// This module handles AI-powered features using OpenRouter

class AIServices {
  constructor() {
    // ⚠️ SECURITY: API key removed for security - AI features temporarily disabled
    // TODO: Implement proper environment variable handling or server-side API calls
    this.OPENROUTER_API_KEY = null; // REMOVED FOR SECURITY

    this.PRIMARY_MODEL = "deepseek/deepseek-r1-0528-qwen3-8b"; // DeepSeek R1 0528 Qwen3 8B (free)
    this.BACKUP_MODEL = "meta-llama/llama-4-maverick:free"; // Meta Llama 4 Maverick (free)
    this.BASE_URL = "https://openrouter.ai/api/v1";

    this.AI_ENABLED = false; // Disabled until proper key management is implemented

    console.log(
      "⚠️ AI Services initialized with AI features DISABLED for security"
    );
  }

  // Make OpenRouter API call with fallback model and rate limiting
  async makeOpenRouterCall(messages, options = {}) {
    // AI features disabled for security - return safe fallback
    if (!this.AI_ENABLED || !this.OPENROUTER_API_KEY) {
      console.warn("🔒 AI features disabled for security");
      throw new Error("AI features temporarily disabled for security reasons");
    }

    const {
      model = this.PRIMARY_MODEL,
      maxTokens = 200,
      temperature = 0.7,
    } = options;

    // Rate limiting check - 10 AI requests per minute
    if (!window.InputSanitizer?.checkRateLimit("ai_requests", 10, 60000)) {
      throw new Error(
        "Rate limit exceeded. Please wait before making more AI requests."
      );
    }

    // Debug logging
    console.log(`🤖 AI Request: ${model}`, { messages, options });

    try {
      const response = await fetch(`${this.BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Umoja AI - Voices of Change",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log(`✅ AI Response: ${model}`, data);
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error(`❌ AI Error with ${model}:`, error);

      // Try backup model if primary fails
      if (model === this.PRIMARY_MODEL) {
        return await this.makeOpenRouterCall(messages, {
          ...options,
          model: this.BACKUP_MODEL,
        });
      }

      throw error;
    }
  }

  // Content moderation using AI (fallback to simple word filtering)
  async moderateContent(text) {
    if (!this.AI_ENABLED) {
      // Simple fallback moderation using keyword filtering
      const harmfulPatterns = [
        /\b(hate|violence|threat|kill|die|suicide)\b/i,
        /\b(f\*\*k|sh\*t|damn|hell)\b/i, // Add more patterns as needed
      ];

      const flagged = harmfulPatterns.some((pattern) => pattern.test(text));

      return {
        flagged: flagged,
        categories: flagged ? ["potential-harmful-content"] : [],
        reason: flagged
          ? "Content contains potentially harmful language"
          : null,
      };
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Analyze this text for harmful content. Respond with JSON format: {"flagged": true/false, "reason": "explanation if flagged", "categories": ["category1", "category2"]}

Text to analyze: "${text}"`,
        },
      ];

      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 100,
        temperature: 0.1,
      });

      try {
        const parsed = JSON.parse(result);
        return {
          flagged: parsed.flagged || false,
          categories: parsed.categories || [],
          reason: parsed.reason || null,
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        const flagged =
          result.toLowerCase().includes("true") ||
          result.toLowerCase().includes("flagged");
        return { flagged, error: false };
      }
    } catch (error) {
      console.error("Content moderation error:", error);
      return { flagged: false, error: true };
    }
  }

  // Automatic story categorization (fallback to keyword-based)
  async categorizeStory(title, content) {
    if (!this.AI_ENABLED) {
      // Simple keyword-based categorization fallback
      const text = (title + " " + content).toLowerCase();

      if (
        text.includes("mental") ||
        text.includes("depression") ||
        text.includes("anxiety") ||
        text.includes("therapy") ||
        text.includes("counseling") ||
        text.includes("wellbeing")
      ) {
        return "mental-health";
      }

      if (
        text.includes("gender") ||
        text.includes("women") ||
        text.includes("equality") ||
        text.includes("discrimination") ||
        text.includes("feminist") ||
        text.includes("sexism")
      ) {
        return "gender-issues";
      }

      if (
        text.includes("justice") ||
        text.includes("rights") ||
        text.includes("activism") ||
        text.includes("protest") ||
        text.includes("inequality") ||
        text.includes("fairness")
      ) {
        return "social-justice";
      }

      return "community"; // Default category
    }

    const messages = [
      {
        role: "user",
        content: `Analyze this story and categorize it into ONE of these categories:
- mental-health: Stories about mental health struggles, recovery, awareness
- gender-issues: Stories about gender equality, discrimination, identity  
- social-justice: Stories about inequality, activism, community action
- community: Stories about community building, local initiatives, helping others

Title: ${title}
Content: ${content.substring(0, 500)}...

Return ONLY the category name (mental-health, gender-issues, social-justice, or community).`,
      },
    ];

    try {
      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 10,
        temperature: 0.1,
      });

      // Validate the response is one of our categories
      const validCategories = [
        "mental-health",
        "gender-issues",
        "social-justice",
        "community",
      ];
      const category = result.toLowerCase().trim();

      return validCategories.includes(category) ? category : "community";
    } catch (error) {
      console.error("Story categorization error:", error);
      return "community"; // Default category
    }
  }

  // Sentiment analysis
  async analyzeSentiment(text) {
    const messages = [
      {
        role: "user",
        content: `Analyze the sentiment of this text. Respond with JSON format: {"sentiment": "positive/negative/neutral", "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Text: "${text.substring(0, 500)}"`,
      },
    ];

    try {
      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 100,
        temperature: 0.3,
      });

      try {
        const parsed = JSON.parse(result);
        return {
          label: parsed.sentiment?.toUpperCase() || "NEUTRAL",
          score: parsed.confidence || 0.5,
          reasoning: parsed.reasoning,
        };
      } catch (parseError) {
        // Simple fallback sentiment detection
        const lowerText = result.toLowerCase();
        if (lowerText.includes("positive"))
          return { label: "POSITIVE", score: 0.7 };
        if (lowerText.includes("negative"))
          return { label: "NEGATIVE", score: 0.7 };
        return { label: "NEUTRAL", score: 0.5 };
      }
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { label: "NEUTRAL", score: 0.5 };
    }
  }

  // Writing assistance - suggest improvements
  async getWritingSuggestions(text) {
    const messages = [
      {
        role: "user",
        content: `Review this personal story for a social impact blog and provide helpful writing suggestions.
Focus on:
1. Clarity and readability
2. Emotional impact  
3. Structure and flow
4. Sensitivity (this is a personal story that may contain difficult topics)

Story: ${text}

Provide 2-3 brief, constructive suggestions in a supportive tone.`,
      },
    ];

    try {
      return await this.makeOpenRouterCall(messages, {
        maxTokens: 250,
        temperature: 0.7,
      });
    } catch (error) {
      console.error("Writing suggestions error:", error);
      return "Unable to generate suggestions at this time. Please try again later.";
    }
  }

  // Generate story summary
  async generateSummary(content) {
    const messages = [
      {
        role: "user",
        content: `Create a brief, compelling summary (1-2 sentences) for this personal story.
Make it engaging but respectful of the personal nature of the content.

Story: ${content.substring(0, 800)}...

Summary:`,
      },
    ];

    try {
      return await this.makeOpenRouterCall(messages, {
        maxTokens: 60,
        temperature: 0.7,
      });
    } catch (error) {
      console.error("Summary generation error:", error);
      return null;
    }
  }

  // Find similar stories for recommendations
  async findSimilarStories(story, allStories) {
    // Simple implementation using keyword matching
    // In production, you'd use more sophisticated similarity algorithms
    const storyWords = this.extractKeywords(story.title + " " + story.content);
    const similarities = [];

    for (const otherStory of allStories) {
      if (otherStory.id === story.id) continue;

      const otherWords = this.extractKeywords(
        otherStory.title + " " + otherStory.content
      );
      const similarity = this.calculateSimilarity(storyWords, otherWords);

      if (similarity > 0.1) {
        // Threshold for similarity
        similarities.push({
          story: otherStory,
          similarity: similarity,
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3) // Return top 3 similar stories
      .map((item) => item.story);
  }

  // Helper method to extract keywords
  extractKeywords(text) {
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "can",
      "may",
      "might",
      "must",
      "shall",
    ];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.includes(word));
  }

  // Helper method to calculate similarity between keyword arrays
  calculateSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size; // Jaccard similarity
  }
}

// Export AI services
window.UmojaAI = new AIServices();
