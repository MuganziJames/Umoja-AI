// DOM Elements
const messageForm = document.getElementById('message-form');
const formSuccess = document.getElementById('form-success');
const sendAnother = document.getElementById('send-another');
const faqItems = document.querySelectorAll('.faq-item');

// Form submission
if (messageForm) {
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // In a real application, this would send data to a server
        // For now, we'll just show the success message
        
        // Hide form and show success message
        messageForm.style.display = 'none';
        formSuccess.classList.remove('hidden');
    });
}

// Send another message button
if (sendAnother) {
    sendAnother.addEventListener('click', () => {
        // Clear the form
        messageForm.reset();
        
        // Hide success and show form
        formSuccess.classList.add('hidden');
        messageForm.style.display = 'block';
    });
}

// FAQ accordion functionality
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
        // Toggle active class on clicked item
        const isActive = item.classList.contains('active');
        
        // Close all items first
        faqItems.forEach(faqItem => {
            faqItem.classList.remove('active');
        });
        
        // If the clicked item wasn't active, make it active
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Automatically open first FAQ item on page load
document.addEventListener('DOMContentLoaded', () => {
    if (faqItems.length > 0) {
        faqItems[0].classList.add('active');
    }
}); 