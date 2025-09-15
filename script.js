document.addEventListener('DOMContentLoaded', () => {

    const reviewForm = document.getElementById('review-form');
    const nameInput = document.getElementById('name-input');
    const anonCheckbox = document.getElementById('anon-checkbox');
    const starRatingContainer = document.getElementById('star-rating');
    const stars = starRatingContainer.querySelectorAll('.star');
    const ratingValueInput = document.getElementById('rating-value');
    const reviewsContainer = document.getElementById('reviews-container');

    let currentRating = 0;

    // --- Event Listeners ---

    // Anonymous checkbox functionality
    anonCheckbox.addEventListener('change', () => {
        if (anonCheckbox.checked) {
            nameInput.disabled = true;
            nameInput.value = 'Аноним';
            nameInput.required = false;
        } else {
            nameInput.disabled = false;
            nameInput.value = '';
            nameInput.required = true;
        }
    });

    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.dataset.value;
            ratingValueInput.value = currentRating;
            updateStarDisplay(currentRating);
        });

        // The hover effect is handled by CSS, but we can add classes if needed.
        // For this implementation, CSS is sufficient.
    });

    // Form submission
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent actual form submission

        if (currentRating === 0) {
            alert('Пожалуйста, бағаны таңдаңыз!');
            return;
        }

        const review = {
            id: Date.now(), // Unique ID for each review
            name: nameInput.value,
            isAnonymous: anonCheckbox.checked,
            className: document.getElementById('class-input').value,
            complaint: document.getElementById('complaint-input').value,
            text: document.getElementById('review-textarea').value,
            rating: currentRating
        };

        addReviewToDOM(review);
        saveReviewToLocalStorage(review);

        // Reset form
        reviewForm.reset();
        nameInput.disabled = false;
        currentRating = 0;
        ratingValueInput.value = 0;
        updateStarDisplay(0);
    });

    // --- Functions ---

    function updateStarDisplay(rating) {
        stars.forEach(star => {
            if (star.dataset.value <= rating) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
    }

    function addReviewToDOM(review) {
        const reviewCard = document.createElement('div');
        reviewCard.classList.add('review-card');
        reviewCard.setAttribute('data-id', review.id);

        const authorName = review.isAnonymous ? 'Аноним' : escapeHTML(review.name);

        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="review-author">
                    ${authorName}
                    <span class="class-info">(${escapeHTML(review.className)})</span>
                </div>
                <div class="review-rating">
                    ${'&#9733;'.repeat(review.rating)}${'&#9734;'.repeat(5 - review.rating)}
                </div>
            </div>
            <p class="review-complaint">Тақырып: ${escapeHTML(review.complaint)}</p>
            <p class="review-body">${escapeHTML(review.text)}</p>
        `;

        reviewsContainer.prepend(reviewCard); // Add new reviews to the top
    }

    function getReviewsFromLocalStorage() {
        return JSON.parse(localStorage.getItem('schoolReviews')) || [];
    }

    function saveReviewToLocalStorage(review) {
        const reviews = getReviewsFromLocalStorage();
        reviews.push(review);
        localStorage.setItem('schoolReviews', JSON.stringify(reviews));
    }

    function loadReviews() {
        const reviews = getReviewsFromLocalStorage();
        reviews.forEach(review => addReviewToDOM(review));
    }

    // Simple HTML escaping function to prevent XSS
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // --- Initial Load ---
    loadReviews();
});
