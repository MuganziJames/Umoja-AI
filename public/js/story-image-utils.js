// Story Image Utilities
class StoryImageUtils {
  static getPlaceholderImage(category = "general") {
    const placeholders = {
      "mental-health": "images/mental-health-placeholder.svg",
      "gender-issues": "images/gender-issues-placeholder.svg",
      "social-justice": "images/social-justice-placeholder.svg",
      general: "images/story-placeholder.svg",
      default: "images/story-placeholder.svg",
    };

    return placeholders[category] || placeholders["default"];
  }

  static getRandomPlaceholder() {
    const placeholders = [
      "images/story-placeholder.svg",
      "images/mental-health-placeholder.svg",
      "images/gender-issues-placeholder.svg",
      "images/social-justice-placeholder.svg",
    ];

    return placeholders[Math.floor(Math.random() * placeholders.length)];
  }

  static getStoryImageUrl(story) {
    // If story has an image, use it
    if (story.image_url && story.image_url.trim()) {
      return story.image_url;
    }

    // Otherwise, use category-appropriate placeholder
    const category = story.category || "general";
    return this.getPlaceholderImage(category);
  }

  static createImageElement(story, options = {}) {
    const img = document.createElement("img");
    const imageUrl = this.getStoryImageUrl(story);

    img.src = imageUrl;
    img.alt = story.title || "Story image";
    img.loading = options.loading || "lazy";

    // Add error handling to fallback to default placeholder
    img.onerror = () => {
      if (img.src !== this.getPlaceholderImage("default")) {
        img.src = this.getPlaceholderImage("default");
      }
    };

    return img;
  }
}

// Make it globally available
window.StoryImageUtils = StoryImageUtils;
