// Profile Management JavaScript
class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userArticles = [];
    this.currentTab = 'all';
  }

  async initialize() {
    try {
      console.log('🔄 Initializing ProfileManager...');
      
      // Wait for database to be ready
      if (!window.UmojaDB) {
        console.log('⏳ Waiting for database...');
        await this.waitForDatabase();
      }

      this.db = window.UmojaDB;
      
      // Check if user is authenticated
      const authResult = await this.checkAuthentication();
      if (!authResult.success) {
        this.redirectToAuth();
        return;
      }

      this.currentUser = authResult.user;
      
      // Initialize the page
      await this.loadProfileData();
      this.setupEventListeners();
      this.updateNavigation();
      
      console.log('✅ ProfileManager initialized successfully');
    } catch (error) {
      console.error('❌ ProfileManager initialization failed:', error);
      this.showError('Failed to load profile. Please try again.');
    }
  }

  async waitForDatabase(maxAttempts = 50) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.UmojaDB && window.UmojaDB.isInitialized) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Database not available');
  }

  async checkAuthentication() {
    try {
      const user = await this.db.getCurrentUser();
      if (!user.success || !user.user) {
        return { success: false, error: 'Not authenticated' };
      }
      return { success: true, user: user.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  redirectToAuth() {
    window.location.href = 'auth.html';
  }

  async loadProfileData() {
    try {
      // Update profile header
      this.updateProfileHeader();
      
      // Load user articles
      await this.loadUserArticles();
      
      // Update statistics
      this.updateStatistics();
      
    } catch (error) {
      console.error('Error loading profile data:', error);
      this.showError('Failed to load profile data');
    }
  }

  updateProfileHeader() {
    const nameElement = document.getElementById('profile-name');
    const emailElement = document.getElementById('profile-email');
    const memberSinceElement = document.getElementById('member-since');
    const lastActiveElement = document.getElementById('last-active');

    if (this.currentUser) {
      const userData = this.currentUser.user_metadata || {};
      const displayName = userData.name || userData.firstName || this.currentUser.email.split('@')[0];
      
      nameElement.textContent = displayName;
      emailElement.textContent = this.currentUser.email;
      
      const createdAt = new Date(this.currentUser.created_at);
      memberSinceElement.textContent = createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
      
      const lastSignIn = new Date(this.currentUser.last_sign_in_at || this.currentUser.created_at);
      lastActiveElement.textContent = lastSignIn.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  async loadUserArticles() {
    try {
      const result = await this.db.getUserStories(this.currentUser.id);
      if (result.success) {
        this.userArticles = result.stories || [];
        this.renderArticles();
      } else {
        console.error('Failed to load articles:', result.error);
        this.userArticles = [];
        this.renderArticles();
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      this.userArticles = [];
      this.renderArticles();
    }
  }

  updateStatistics() {
    const publishedCount = this.userArticles.filter(article => article.status === 'published').length;
    const draftCount = this.userArticles.filter(article => article.status === 'draft').length;
    const totalViews = this.userArticles.reduce((sum, article) => sum + (article.views || 0), 0);

    document.getElementById('published-count').textContent = publishedCount;
    document.getElementById('draft-count').textContent = draftCount;
    document.getElementById('total-views').textContent = totalViews;
  }

  renderArticles() {
    const tabs = ['all', 'published', 'drafts', 'pending'];
    
    tabs.forEach(tab => {
      const container = document.getElementById(`${tab === 'all' ? 'articles' : tab === 'drafts' ? 'drafts' : tab}-list`);
      if (!container) return;

      let filteredArticles = this.userArticles;
      
      switch (tab) {
        case 'published':
          filteredArticles = this.userArticles.filter(article => article.status === 'published');
          break;
        case 'drafts':
          filteredArticles = this.userArticles.filter(article => article.status === 'draft');
          break;
        case 'pending':
          filteredArticles = this.userArticles.filter(article => article.status === 'pending');
          break;
      }

      if (filteredArticles.length === 0) {
        container.innerHTML = this.getEmptyStateHTML(tab);
      } else {
        container.innerHTML = filteredArticles.map(article => this.createArticleHTML(article)).join('');
      }
    });
  }

  createArticleHTML(article) {
    const statusClass = `status-${article.status || 'draft'}`;
    const statusText = (article.status || 'draft').charAt(0).toUpperCase() + (article.status || 'draft').slice(1);
    const createdDate = new Date(article.created_at).toLocaleDateString();
    const updatedDate = new Date(article.updated_at || article.created_at).toLocaleDateString();

    return `
      <div class="article-item" data-article-id="${article.id}">
        <div class="article-info">
          <h3>${this.escapeHtml(article.title || 'Untitled')}</h3>
          <div class="article-meta">
            <span><i class="fas fa-calendar"></i> Created: ${createdDate}</span>
            <span><i class="fas fa-edit"></i> Updated: ${updatedDate}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${article.views ? `<span><i class="fas fa-eye"></i> ${article.views} views</span>` : ''}
          </div>
        </div>
        <div class="article-actions">
          ${article.status === 'published' ? `<button class="action-btn view-btn" onclick="profileManager.viewArticle('${article.id}')"><i class="fas fa-eye"></i> View</button>` : ''}
          <button class="action-btn edit-btn" onclick="profileManager.editArticle('${article.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="action-btn delete-btn" onclick="profileManager.deleteArticle('${article.id}', '${this.escapeHtml(article.title || 'Untitled')}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `;
  }

  getEmptyStateHTML(tab) {
    const messages = {
      all: { icon: 'fas fa-pen', text: 'No articles yet', subtext: 'Start by writing your first story!' },
      published: { icon: 'fas fa-globe', text: 'No published articles', subtext: 'Publish your stories to share with the world' },
      drafts: { icon: 'fas fa-file-alt', text: 'No drafts', subtext: 'Save drafts while working on your stories' },
      pending: { icon: 'fas fa-clock', text: 'No pending articles', subtext: 'Articles awaiting review will appear here' }
    };

    const message = messages[tab] || messages.all;

    return `
      <div class="empty-state">
        <i class="${message.icon}"></i>
        <h3>${message.text}</h3>
        <p>${message.subtext}</p>
        ${tab === 'all' ? '<a href="submit.html" class="btn primary">Write Your First Story</a>' : ''}
      </div>
    `;
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
      this.editProfile();
    });
  }

  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`${tab === 'all' ? 'all' : tab === 'drafts' ? 'draft' : tab}-articles`);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentTab = tab;
  }

  async viewArticle(articleId) {
    // Redirect to the article view page
    window.location.href = `story-detail.html?id=${articleId}`;
  }

  async editArticle(articleId) {
    // Redirect to edit page with article ID
    window.location.href = `submit.html?edit=${articleId}`;
  }

  async deleteArticle(articleId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await this.db.deleteStory(articleId);
      if (result.success) {
        this.showSuccess('Article deleted successfully');
        // Reload articles
        await this.loadUserArticles();
        this.updateStatistics();
      } else {
        this.showError('Failed to delete article: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      this.showError('Failed to delete article');
    }
  }

  async logout() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      const result = await this.db.signOut();
      if (result.success) {
        // Clear any cached data
        this.currentUser = null;
        this.userArticles = [];
        
        // Redirect to home page
        window.location.href = '../index.html';
      } else {
        this.showError('Failed to logout: ' + result.error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      this.showError('Failed to logout');
    }
  }

  editProfile() {
    // For now, just show an alert. This could be expanded to a modal or separate page
    alert('Profile editing feature coming soon!');
  }

  updateNavigation() {
    // Update the navigation to show profile link instead of sign in
    const authNavItem = document.getElementById('auth-nav-item');
    if (authNavItem && this.currentUser) {
      const userData = this.currentUser.user_metadata || {};
      const displayName = userData.name || userData.firstName || 'Profile';
      
      authNavItem.innerHTML = `
        <a href="profile.html" class="btn outline">
          <i class="fas fa-user"></i> ${displayName}
        </a>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    // Simple error display - could be enhanced with a toast or modal
    alert('Error: ' + message);
  }

  showSuccess(message) {
    // Simple success display - could be enhanced with a toast or modal
    alert('Success: ' + message);
  }
}

// Initialize profile manager when DOM is loaded
let profileManager;

document.addEventListener('DOMContentLoaded', async () => {
  profileManager = new ProfileManager();
  await profileManager.initialize();
});

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function() {
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const nav = document.querySelector('nav');
  
  if (mobileToggle && nav) {
    mobileToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }
});
