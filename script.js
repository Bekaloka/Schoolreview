document.addEventListener('DOMContentLoaded', () => {

    // --- Constants and State ---
    const API_URL = 'https://api.jsonbin.io/v3/b/68c848fbd0ea881f407ee729';
    const API_KEY = '$2a$10$m.A3/6Ccy3J0XCf9Q2QaieLJSlJT6g.9L.6NkgrXVN7v07CyMNrhm'; // Using Master Key for full access
    const SPAM_COOLDOWN_MS = 60000; // 60 seconds

    const reviewForm = document.getElementById('review-form');
    const nameInput = document.getElementById('name-input');
    const anonCheckbox = document.getElementById('anon-checkbox');
    const classInput = document.getElementById('class-input');
    const complaintInput = document.getElementById('complaint-input');
    const reviewTextarea = document.getElementById('review-textarea');
    const starRatingContainer = document.getElementById('star-rating');
    const stars = starRatingContainer.querySelectorAll('.star');
    const ratingValueInput = document.getElementById('rating-value');
    const reviewsContainer = document.getElementById('reviews-container');
    const submitButton = reviewForm.querySelector('button[type="submit"]');

    let currentRating = 0;
    let reviews = []; // Local cache of reviews
    let editingReviewId = null; // To track if we are editing a review

    // --- API Functions ---

    async function fetchReviews() {
        try {
            const response = await fetch(`${API_URL}/latest`);
            if (!response.ok) {
                // If the bin is new/empty, jsonbin might return 404, which is fine.
                if (response.status === 404) {
                    console.log('Bin is empty or not found. Initializing with empty array.');
                    reviews = [];
                    renderReviews();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // The actual data is in the 'record' property.
            // Handle our workaround for empty bins.
            if (data.record && Array.isArray(data.record.reviews)) {
                reviews = data.record.reviews; // It's our wrapper object
            } else if (Array.isArray(data.record)) {
                reviews = data.record; // It's a normal array of reviews
            } else {
                reviews = []; // Default to empty if structure is unexpected
            }
            renderReviews();
        } catch (error) {
            console.error("Could not fetch reviews:", error);
            reviewsContainer.innerHTML = '<p style="color: red;">Пікірлерді жүктеу мүмкін болмады. Интернет байланысыңызды тексеріңіз.</p>';
        }
    }

    async function updateReviewsOnServer(updatedReviews) {
        try {
            // WORKAROUND: If the array is empty, send a wrapper object instead,
            // as JSONBin API rejects empty arrays with a 400 error.
            const payload = updatedReviews.length > 0 ? updatedReviews : { "reviews": [] };

            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Update local cache and re-render
            reviews = updatedReviews;
            renderReviews();
        } catch (error) {
            console.error("Could not update reviews:", error);
            alert('Серверге пікірді сақтау мүмкін болмады.');
        }
    }

    // --- DOM Manipulation ---

    function renderReviews() {
        reviewsContainer.innerHTML = ''; // Clear existing reviews
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p>Әзірге пікірлер жоқ. Бірінші болып қалдырыңыз!</p>';
        } else {
            // Newest first
            reviews.slice().reverse().forEach(review => {
                const reviewCard = document.createElement('div');
                reviewCard.classList.add('review-card');
                reviewCard.setAttribute('data-id', review.id);
                reviewCard.innerHTML = createReviewCardHTML(review);
                reviewsContainer.appendChild(reviewCard);
            });
        }
    }

    function createReviewCardHTML(review) {
        const authorName = review.isAnonymous ? 'Аноним' : escapeHTML(review.name);
        return `
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
            <div class="review-actions">
                <button class="edit-btn" data-id="${review.id}">Өңдеу</button>
                <button class="delete-btn" data-id="${review.id}">Жою</button>
            </div>
        `;
    }

    // --- Event Handlers ---

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentRating === 0) {
            alert('Пожалуйста, бағаны таңдаңыз!');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Жіберілуде...';

        if (editingReviewId) {
            // --- Update existing review ---
            const updatedReviews = reviews.map(review => {
                if (review.id === editingReviewId) {
                    return { ...review, // keep original id and date
                        name: nameInput.value,
                        isAnonymous: anonCheckbox.checked,
                        className: classInput.value,
                        complaint: complaintInput.value,
                        text: reviewTextarea.value,
                        rating: currentRating
                    };
                }
                return review;
            });
            await updateReviewsOnServer(updatedReviews);
            editingReviewId = null; // Reset editing state
        } else {
            // --- Add new review ---
            if (checkSpam()) {
                alert(`Тым жиі пікір қалдыруға болмайды. ${SPAM_COOLDOWN_MS / 1000} секундтан кейін қайталап көріңіз.`);
                resetForm(); // Reset button state
                return;
            }
            const newReview = {
                id: Date.now(),
                name: nameInput.value,
                isAnonymous: anonCheckbox.checked,
                className: classInput.value,
                complaint: complaintInput.value,
                text: reviewTextarea.value,
                rating: currentRating
            };
            const updatedReviews = [...reviews, newReview];
            await updateReviewsOnServer(updatedReviews);
            updateSpamTimestamp(); // Set spam timestamp only on new posts
        }

        // --- Reset form state ---
        resetForm();
    });

    reviewsContainer.addEventListener('click', async (e) => {
        const reviewId = parseInt(e.target.dataset.id);

        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Бұл пікірді жоюға сенімдісіз бе?')) {
                const updatedReviews = reviews.filter(review => review.id !== reviewId);
                await updateReviewsOnServer(updatedReviews);
            }
        }

        if (e.target.classList.contains('edit-btn')) {
            const reviewToEdit = reviews.find(review => review.id === reviewId);
            if (reviewToEdit) {
                window.scrollTo(0, 0); // Scroll to top to see the form
                nameInput.value = reviewToEdit.name;
                anonCheckbox.checked = reviewToEdit.isAnonymous;
                nameInput.disabled = reviewToEdit.isAnonymous;
                classInput.value = reviewToEdit.className;
                complaintInput.value = reviewToEdit.complaint;
                reviewTextarea.value = reviewToEdit.text;
                updateStarDisplay(reviewToEdit.rating);
                currentRating = reviewToEdit.rating;

                editingReviewId = reviewToEdit.id;
                submitButton.textContent = 'Пікірді жаңарту';
            }
        }
    });

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

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.dataset.value;
            ratingValueInput.value = currentRating;
            updateStarDisplay(currentRating);
        });
    });

    // --- Helper Functions ---

    function resetForm() {
        reviewForm.reset();
        nameInput.disabled = false;
        currentRating = 0;
        updateStarDisplay(0);
        editingReviewId = null;
        submitButton.disabled = false;
        submitButton.textContent = 'Пікірді жіберу';
    }

    function updateStarDisplay(rating) {
        stars.forEach(star => {
            star.classList.toggle('selected', star.dataset.value <= rating);
        });
    }

    function checkSpam() {
        const lastPostTimestamp = localStorage.getItem('lastPostTimestamp');
        if (!lastPostTimestamp) return false;
        return (Date.now() - parseInt(lastPostTimestamp)) < SPAM_COOLDOWN_MS;
    }

    function updateSpamTimestamp() {
        localStorage.setItem('lastPostTimestamp', Date.now().toString());
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    }

    // --- Initial Load ---
    fetchReviews();
});
