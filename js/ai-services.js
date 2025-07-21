// AI Services for Umoja Project - OpenRouter Integration
// This module handles AI-powered features using OpenRouter

class AIServices {
  constructor() {
    // Get API key from configuration
    this.OPENROUTER_API_KEY = window.CONFIG
      ? window.CONFIG.OPENROUTER_API_KEY
      : null;

    // Multiple free models for better reliability
    this.FREE_MODELS = [
      "meta-llama/llama-3.1-70b-instruct:free",
      "meta-llama/llama-3-70b-instruct:free",
      "openchat/openchat-3.5-0106:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-7b-it:free",
      "meta-llama/llama-4-maverick:free",
    ];

    this.PRIMARY_MODEL = this.FREE_MODELS[0]; // Use first free model as primary
    this.currentModelIndex = 0;
    this.BASE_URL = "https://openrouter.ai/api/v1";

    this.AI_ENABLED =
      !!this.OPENROUTER_API_KEY &&
      this.OPENROUTER_API_KEY !== "your_openrouter_api_key_here";

    if (this.AI_ENABLED) {
      console.log("AI Services initialized with OpenRouter API");
    } else {
      console.log(
        "AI Services initialized - AI features disabled (no API key)"
      );
    }
  }

  // Make OpenRouter API call with fallback models and rate limiting
  async makeOpenRouterCall(messages, options = {}) {
    if (!this.AI_ENABLED || !this.OPENROUTER_API_KEY) {
      console.warn("AI features disabled");
      throw new Error("AI features disabled");
    }

    const { maxTokens = 200, temperature = 0.7 } = options;

    // Rate limiting check - 10 AI requests per minute
    if (!window.InputSanitizer?.checkRateLimit("ai_requests", 10, 60000)) {
      throw new Error(
        "Rate limit exceeded. Please wait before making more AI requests."
      );
    }

    // Try each free model until one works
    for (let i = 0; i < this.FREE_MODELS.length; i++) {
      const modelToTry = this.FREE_MODELS[i];

      // Debug logging
      console.log(`🤖 AI Request (attempt ${i + 1}): ${modelToTry}`, {
        messages,
        options,
      });

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
            model: modelToTry,
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
        console.log(`✅ AI Response: ${modelToTry}`, data);
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error(`❌ AI Error with ${modelToTry}:`, error);

        // If this is the last model, throw the error
        if (i === this.FREE_MODELS.length - 1) {
          throw error;
        }

        // Otherwise continue to next model
        console.log(`Trying next model...`);
      }
    }
  }

  // AI Chat Support - Empathetic conversation for emotional support
  async provideSupportChat(userMessage, conversationHistory = [], opts = {}) {
    if (!this.AI_ENABLED) {
      return {
        success: false,
        message:
          "AI chat support is currently unavailable. Please try again later.",
      };
    }

    try {
      // Build conversation context
      const systemPrompt = {
        role: "system",
        content: `You are Umoja AI, a compassionate and understanding AI counselor for the Voices of Change platform. Your role is to:

1. Provide emotional support and validation
2. Listen actively and respond with empathy
3. Ask thoughtful, caring questions
4. Help users process their feelings
5. Be culturally sensitive and inclusive
6. Recognize when someone needs professional help

Key principles:
- Always be supportive and non-judgmental
- Validate emotions and experiences
- Focus on mental health, social justice, and personal empowerment
- If someone mentions self-harm, suicide, or crisis - provide immediate resources
- Encourage healthy coping strategies
- Remember this is a safe space for vulnerable sharing

Crisis Resources to share when needed:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

Respond in a warm, understanding tone as if talking to a friend who needs support.`,
      };

      // Build message history
      const messages = [systemPrompt];

      // Add conversation history (last 10 messages for context)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage,
      });

      // Check for crisis keywords
      const crisisKeywords = [
        "suicide",
        "kill myself",
        "end it all",
        "want to die",
        "self-harm",
        "hurt myself",
      ];
      const isCrisis = crisisKeywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      const response = await this.makeOpenRouterCall(messages, {
        maxTokens: opts.maxTokens || 300,
        temperature: 0.8, // More creative and empathetic responses
      });

      return {
        success: true,
        message: response,
        isCrisis: isCrisis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Support chat error:", error);
      return {
        success: false,
        message:
          "I'm having trouble responding right now. Your feelings are valid, and I'm here when you're ready to try again.",
        error: error.message,
      };
    }
  }

  // Auto-categorization based on content analysis
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
        text.includes("protest") ||
        text.includes("activism") ||
        text.includes("inequality") ||
        text.includes("racism")
      ) {
        return "social-justice";
      }

      return "community"; // Default category
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Based on the title and content below, categorize this story into one of these categories: mental-health, gender-issues, social-justice, community, personal-growth, environment, entrepreneurship.

Title: ${title}
Content: ${content.substring(0, 500)}...

Respond with just the category name, nothing else.`,
        },
      ];

      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 20,
        temperature: 0.1,
      });

      const category = result.toLowerCase().trim();
      const validCategories = [
        "mental-health",
        "gender-issues",
        "social-justice",
        "community",
        "personal-growth",
        "environment",
        "entrepreneurship",
      ];

      return validCategories.includes(category) ? category : "community";
    } catch (error) {
      console.error("Categorization error:", error);
      return "community"; // Default fallback
    }
  }

  // Sentiment analysis for stories
  async analyzeSentiment(text) {
    if (!this.AI_ENABLED) {
      // Simple keyword-based sentiment analysis fallback
      const positiveWords = [
        "happy",
        "joy",
        "success",
        "hope",
        "love",
        "grateful",
        "amazing",
        "wonderful",
        "inspiring",
      ];
      const negativeWords = [
        "sad",
        "angry",
        "depressed",
        "frustrated",
        "difficult",
        "struggle",
        "pain",
        "hurt",
        "challenging",
      ];

      const words = text.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach((word) => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });

      const totalScore = positiveScore - negativeScore;
      return {
        sentiment:
          totalScore > 0 ? "positive" : totalScore < 0 ? "negative" : "neutral",
        confidence: Math.min(Math.abs(totalScore) * 0.1, 1.0),
        positive_score: positiveScore,
        negative_score: negativeScore,
      };
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Analyze the sentiment of this text and respond in JSON format: {"sentiment": "positive/negative/neutral", "confidence": 0.0-1.0, "emotions": ["emotion1", "emotion2"]}

Text: "${text.substring(0, 500)}"`,
        },
      ];

      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 100,
        temperature: 0.1,
      });

      const analysis = JSON.parse(result);
      return analysis;
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { sentiment: "neutral", confidence: 0.5, emotions: [] };
    }
  }

  // Writing suggestions and improvements
  async getWritingSuggestions(text) {
    if (!this.AI_ENABLED) {
      return {
        suggestions: ["AI writing suggestions are currently unavailable."],
        improvements: [],
      };
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Provide writing suggestions to improve this text. Focus on clarity, emotional impact, and storytelling. Respond in JSON format: {"suggestions": ["suggestion1", "suggestion2"], "improvements": ["improvement1", "improvement2"]}

Text: "${text.substring(0, 800)}"`,
        },
      ];

      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 200,
        temperature: 0.6,
      });

      const suggestions = JSON.parse(result);
      return suggestions;
    } catch (error) {
      console.error("Writing suggestions error:", error);
      return { suggestions: [], improvements: [] };
    }
  }

  // Generate summary for stories
  async generateSummary(content) {
    if (!this.AI_ENABLED) {
      return content.substring(0, 150) + "...";
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Create a compelling 2-sentence summary of this story that captures its essence and emotional impact:

${content.substring(0, 1000)}`,
        },
      ];

      const summary = await this.makeOpenRouterCall(messages, {
        maxTokens: 100,
        temperature: 0.7,
      });

      return summary;
    } catch (error) {
      console.error("Summary generation error:", error);
      return content.substring(0, 150) + "...";
    }
  }

  // Find similar stories using AI-powered analysis
  async findSimilarStories(story, allStories) {
    if (!this.AI_ENABLED) {
      // Fallback to simple keyword matching
      const storyKeywords = this.extractKeywords(story.content);
      const similarStories = allStories
        .filter((s) => s.id !== story.id)
        .map((s) => ({
          story: s,
          similarity: this.calculateSimilarity(
            storyKeywords,
            this.extractKeywords(s.content)
          ),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map((item) => item.story);

      return similarStories;
    }

    try {
      const messages = [
        {
          role: "user",
          content: `Based on this story, find the most similar stories from the list below. Consider themes, emotions, and topics. Return just the IDs of the 3 most similar stories as a JSON array.

Target story: "${story.title}" - ${story.content.substring(0, 300)}

Available stories:
${allStories
  .slice(0, 20)
  .map((s) => `ID: ${s.id} - "${s.title}" - ${s.content.substring(0, 100)}`)
  .join("\n")}`,
        },
      ];

      const result = await this.makeOpenRouterCall(messages, {
        maxTokens: 50,
        temperature: 0.3,
      });

      const similarIds = JSON.parse(result);
      return allStories.filter((s) => similarIds.includes(s.id)).slice(0, 3);
    } catch (error) {
      console.error("Similar stories error:", error);
      return [];
    }
  }

  // Helper function to extract keywords
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
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word))
      .slice(0, 20);
  }

  // Simple similarity calculation
  calculateSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

// Initialize AI services when the script loads
window.UmojaAI = new AIServices();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AIServices;
}
