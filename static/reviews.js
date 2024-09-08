document.addEventListener('DOMContentLoaded', () => {
    loadReviews();
});

function loadReviews() {
    fetch('static/data/Reviews.docx')
        .then(response => response.arrayBuffer())
        .then(data => mammoth.extractRawText({ arrayBuffer: data })) // Use extractRawText to get raw text content
        .then(result => {
            const reviewsContainer = document.getElementById('reviews-container');
            reviewsContainer.innerHTML = formatReviews(result.value); // Set the formatted HTML content from the docx file
        })
        .catch(error => console.error('Error loading reviews file:', error));
}

function formatReviews(content) {
    const reviewSections = content.split(/\n\n+/).filter(section => section.trim() !== '');
    let reviews = [];
    let currentReview = {};

    reviewSections.forEach((section, index) => {
        if (section.startsWith('⭐⭐')) {
            if (currentReview.rating) {
                reviews.push(currentReview);
                currentReview = {};
            }
            currentReview.rating = section;
        } else if (!currentReview.title) {
            currentReview.title = section;
        } else if (!currentReview.content) {
            currentReview.content = section;
        } else if (!currentReview.customer) {
            currentReview.customer = section;
        }
    });

    if (currentReview.rating) {
        reviews.push(currentReview);
    }

    return reviews.map(review => `
        <div class="review-card">
            <h3>${review.title || 'No title'}</h3>
            <p class="rating">${review.rating || 'No rating'}</p>
            <p>${review.content || 'No content available.'}</p>
            <p class="customer">${review.customer ? `- ${review.customer}` : '- Anonymous'}</p>
        </div>
    `).join('');
}
