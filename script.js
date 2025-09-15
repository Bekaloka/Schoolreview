document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const form = document.getElementById('review-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');

    let reviews = []; // The single source of truth for our reviews
    let editingReviewId = null; // To track which review is being edited

    // --- Profanity Filter ---
    const profanityWords = ['қотақ', 'сігейін', 'көт', 'жәлеп', 'долбаеб']; // Example list
    const containsProfanity = (text) => {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return profanityWords.some(word => lowerCaseText.includes(word));
    };

    // --- Data Persistence Functions ---
    const saveReviews = () => {
        localStorage.setItem('schoolReviews', JSON.stringify(reviews));
    };

    const loadReviews = () => {
        const storedReviews = localStorage.getItem('schoolReviews');
        if (storedReviews) {
            reviews = JSON.parse(storedReviews);
            renderReviews();
        }
    };

    // --- Rendering Functions ---
    const renderReviews = () => {
        reviewsContainer.innerHTML = ''; // Clear existing reviews
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
        reviews.forEach(review => {
            const reviewCard = createReviewCard(review);
            reviewsContainer.appendChild(reviewCard); // Append to respect the sort order
        });
    };

    // --- Star Rating Logic ---
    let currentRating = 0;
    const updateStars = (rating = currentRating) => {
        stars.forEach(star => {
            star.classList.toggle('selected', star.getAttribute('data-value') <= rating);
        });
    };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.getAttribute('data-value');
            ratingInput.value = currentRating;
            updateStars();
        });

        star.addEventListener('mouseover', () => {
            const hoverValue = star.getAttribute('data-value');
            updateStars(hoverValue);
        });

        star.addEventListener('mouseout', () => {
            updateStars(); // Revert to the selected rating
        });
    });

    // --- Anonymous Mode Logic ---
    anonymousModeCheckbox.addEventListener('change', () => {
        if (anonymousModeCheckbox.checked) {
            studentNameInput.value = 'Аноним';
            studentNameInput.disabled = true;
            studentNameInput.style.backgroundColor = '#e9e9e9';
        } else {
            studentNameInput.value = '';
            studentNameInput.disabled = false;
            studentNameInput.style.backgroundColor = '#fff';
        }
    });

    // --- Form Submission Logic (Create and Update) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (ratingInput.value === '0') {
            alert('Баға беріңіз!');
            return;
        }

        const subject = document.getElementById('complaint-subject').value;
        const text = document.getElementById('review-text').value;

        if (containsProfanity(subject) || containsProfanity(text)) {
            alert('Орынсыз сөздерді қолдануға тыйым салынады!');
            return;
        }

        if (editingReviewId !== null) {
            // --- UPDATE an existing review ---
            const reviewIndex = reviews.findIndex(review => review.id === editingReviewId);
            if (reviewIndex !== -1) {
                reviews[reviewIndex] = {
                    ...reviews[reviewIndex], // Keep original id and date
                    name: studentNameInput.value,
                    class: document.getElementById('student-class').value,
                    subject: document.getElementById('complaint-subject').value,
                    text: document.getElementById('review-text').value,
                    rating: ratingInput.value,
                };
            }
        } else {
            // --- CREATE a new review ---
            const newReview = {
                id: Date.now(),
                name: studentNameInput.value,
                class: document.getElementById('student-class').value,
                subject: document.getElementById('complaint-subject').value,
                text: document.getElementById('review-text').value,
                rating: ratingInput.value,
                date: new Date().toISOString()
            };
            reviews.push(newReview);
        }

        // --- Common cleanup and re-render ---
        saveReviews();
        renderReviews();
        resetForm();
    });

    // --- Form Reset Function ---
    const resetForm = () => {
        editingReviewId = null;
        form.reset();
        submitButton.textContent = 'Пікірді жіберу';
        anonymousModeCheckbox.checked = false;
        studentNameInput.disabled = false;
        studentNameInput.style.backgroundColor = '#fff';
        currentRating = 0;
        ratingInput.value = '0';
        updateStars();
    };

    // --- Function to Create a Review Card ---
    function createReviewCard(review) {
        const card = document.createElement('div');
        card.classList.add('review-card');
        card.dataset.id = review.id;

        const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const formattedDate = new Date(review.date).toLocaleString('kk-KZ', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        card.innerHTML = `
            <div class="review-header">
                <div class="student-info">${review.name}, ${review.class} сынып</div>
                <div class="review-rating">${ratingStars}</div>
            </div>
            <div class="review-body">
                <h4>${review.subject}</h4>
                <p>${review.text}</p>
            </div>
            <div class="review-footer">
                <div class="review-date">${formattedDate}</div>
                <div class="review-actions">
                    <button class="btn-edit">Өзгерту</button>
                    <button class="btn-delete">Жою</button>
                </div>
            </div>
        `;
        return card;
    }

    // --- Event Delegation for Edit/Delete ---
    reviewsContainer.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.review-card');
        if (!card) return;

        const reviewId = Number(card.dataset.id);

        // Handle Delete
        if (target.classList.contains('btn-delete')) {
            if (confirm('Бұл пікірді жоюға сенімдісіз бе?')) {
                reviews = reviews.filter(review => review.id !== reviewId);
                saveReviews();
                renderReviews();
            }
        }

        // Handle Edit
        if (target.classList.contains('btn-edit')) {
            const reviewToEdit = reviews.find(review => review.id === reviewId);
            if (reviewToEdit) {
                // Populate form
                studentNameInput.value = reviewToEdit.name;
                document.getElementById('student-class').value = reviewToEdit.class;
                document.getElementById('complaint-subject').value = reviewToEdit.subject;
                document.getElementById('review-text').value = reviewToEdit.text;

                if (reviewToEdit.name === 'Аноним') {
                    anonymousModeCheckbox.checked = true;
                    studentNameInput.disabled = true;
                } else {
                    anonymousModeCheckbox.checked = false;
                    studentNameInput.disabled = false;
                }

                ratingInput.value = reviewToEdit.rating;
                currentRating = reviewToEdit.rating;
                updateStars();

                // Set editing state
                editingReviewId = reviewId;
                submitButton.textContent = 'Өзгерісті сақтау';
                form.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // --- Initial Load ---
    loadReviews();
});
