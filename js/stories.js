// DOM Elements
const storyGrid = document.getElementById('stories-grid');
const storyCards = document.querySelectorAll('.story-card');
const searchInput = document.getElementById('story-search');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const sortStories = document.getElementById('sort-stories');
const savedStoriesToggle = document.getElementById('saved-stories-toggle');
const noResults = document.querySelector('.no-results');
const resetFiltersBtn = document.getElementById('reset-filters');
const saveButtons = document.querySelectorAll('.save-story');

// Pagination Elements
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.querySelector('.current-page');
const totalPagesSpan = document.querySelector('.total-pages');

// Pagination State
let currentPage = 1;
const storiesPerPage = 6;
let filteredStories = [...storyCards];

// Load saved stories from localStorage
let savedStories = localStorage.getItem('savedStories') 
    ? JSON.parse(localStorage.getItem('savedStories')) 
    : [];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set up save buttons based on localStorage
    updateSaveButtons();
    
    // Initialize pagination
    updatePagination();
    displayStories();
    
    // Check URL parameters for any pre-selected filters
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        categoryFilter.value = categoryParam;
        filterStories();
    }
});

// Search functionality
searchBtn.addEventListener('click', () => {
    filterStories();
});

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        filterStories();
    }
});

// Filter change events
categoryFilter.addEventListener('change', filterStories);
sortStories.addEventListener('change', filterStories);
savedStoriesToggle.addEventListener('change', filterStories);

// Reset filters
resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = 'all';
    sortStories.value = 'latest';
    savedStoriesToggle.checked = false;
    filterStories();
});

// Save story functionality
saveButtons.forEach(button => {
    button.addEventListener('click', function() {
        const storyCard = this.closest('.story-card');
        const storyId = storyCard.id;
        
        // Toggle saved state
        if (savedStories.includes(storyId)) {
            // Remove from saved
            savedStories = savedStories.filter(id => id !== storyId);
            this.classList.remove('saved');
            this.innerHTML = '<i class="far fa-bookmark"></i>';
        } else {
            // Add to saved
            savedStories.push(storyId);
            this.classList.add('saved');
            this.innerHTML = '<i class="fas fa-bookmark"></i>';
        }
        
        // Save to localStorage
        localStorage.setItem('savedStories', JSON.stringify(savedStories));
        
        // If we're currently viewing saved stories only, we need to refresh the view
        if (savedStoriesToggle.checked) {
            filterStories();
        }
    });
});

// Pagination event listeners
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayStories();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayStories();
    }
});

// Filter and sort stories
function filterStories() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sortBy = sortStories.value;
    const showSavedOnly = savedStoriesToggle.checked;
    
    // Reset to first page whenever filters change
    currentPage = 1;
    
    // Filter stories
    filteredStories = [...storyCards].filter(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const content = card.querySelector('p').textContent.toLowerCase();
        const cardCategory = card.dataset.category;
        const storyId = card.id;
        
        // Text search
        const matchesSearch = searchTerm === '' || 
            title.includes(searchTerm) || 
            content.includes(searchTerm);
        
        // Category filter
        const matchesCategory = category === 'all' || cardCategory === category;
        
        // Saved filter
        const matchesSaved = !showSavedOnly || savedStories.includes(storyId);
        
        return matchesSearch && matchesCategory && matchesSaved;
    });
    
    // Sort stories
    filteredStories.sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.dataset.date) - new Date(a.dataset.date);
        } else if (sortBy === 'oldest') {
            return new Date(a.dataset.date) - new Date(b.dataset.date);
        } else if (sortBy === 'popular') {
            return parseInt(b.dataset.popular) - parseInt(a.dataset.popular);
        }
        return 0;
    });
    
    // Update pagination and display stories
    updatePagination();
    displayStories();
    
    // Show/hide no results message
    if (filteredStories.length === 0) {
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
    }
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredStories.length / storiesPerPage));
    
    totalPagesSpan.textContent = totalPages;
    currentPageSpan.textContent = currentPage;
    
    // Enable/disable pagination buttons
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Display stories for current page
function displayStories() {
    // Hide all stories first
    storyCards.forEach(card => {
        card.style.display = 'none';
    });
    
    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * storiesPerPage;
    const endIndex = Math.min(startIndex + storiesPerPage, filteredStories.length);
    
    // Show only the stories for current page
    for (let i = startIndex; i < endIndex; i++) {
        filteredStories[i].style.display = 'block';
    }
    
    // Update pagination display
    currentPageSpan.textContent = currentPage;
}

// Update save buttons based on localStorage
function updateSaveButtons() {
    saveButtons.forEach(button => {
        const storyCard = button.closest('.story-card');
        const storyId = storyCard.id;
        
        if (savedStories.includes(storyId)) {
            button.classList.add('saved');
            button.innerHTML = '<i class="fas fa-bookmark"></i>';
        } else {
            button.classList.remove('saved');
            button.innerHTML = '<i class="far fa-bookmark"></i>';
        }
    });
} 