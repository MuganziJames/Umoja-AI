// DOM Elements
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const nav = document.querySelector('nav');
const storyCards = document.querySelectorAll('.story-card');
const newsletterForm = document.querySelector('.newsletter-form');

// Mobile Navigation Toggle
if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        const isNavVisible = nav.classList.contains('active');
        mobileNavToggle.innerHTML = isNavVisible 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
}

// Add animation to story cards
if (storyCards.length > 0) {
    // Use Intersection Observer to trigger animation when cards come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fadeIn');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    storyCards.forEach(card => {
        observer.observe(card);
    });
}

// Newsletter Form Submission
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (email) {
            // In a real application, this would send data to a server
            // For now, we'll just show a success message
            emailInput.value = '';
            
            const successMessage = document.createElement('p');
            successMessage.textContent = 'Thank you for subscribing!';
            successMessage.style.color = 'var(--success)';
            
            // Remove any existing success message
            const existingMessage = newsletterForm.nextElementSibling;
            if (existingMessage && existingMessage.classList.contains('success-message')) {
                existingMessage.remove();
            }
            
            successMessage.classList.add('success-message');
            newsletterForm.after(successMessage);
            
            // Remove the message after 3 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 3000);
        }
    });
}

// Current Year for Footer Copyright
document.addEventListener('DOMContentLoaded', () => {
    const yearElement = document.querySelector('.current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// Helper Functions
function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#" or it's not a scroll target
        if (href === '#' || href.startsWith('#/')) return;
        
        e.preventDefault();
        
        const targetElement = document.querySelector(href);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
            
            // Update URL but don't scroll again
            history.pushState(null, null, href);
        }
    });
}); 