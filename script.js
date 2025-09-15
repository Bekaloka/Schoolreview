document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const form = document.getElementById('review-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');

    let editingReviewId = null; // This will now be the restdb.io '_id'
    const API_URL = 'https://schoolreviews172-d66a.restdb.io/rest/reviews';
    const API_KEY = 'f1719bd7fea04e3b221bf3b7a0ae3906bf6ca';

    const FETCH_HEADERS = {
        'Content-Type': 'application/json',
        'x-apikey': API_KEY,
        'cache-control': 'no-cache' // Important for restdb.io
    };

    // --- Profanity Filter ---
    const profanityWords = ['қотақ', 'сігейін', 'көт', 'жәлеп', 'долбаеб'];
    const containsProfanity = (text) => {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return profanityWords.some(word => lowerCaseText.includes(word));
    };

    // --- API Communication & Rendering ---
    const loadAndRenderReviews = async () => {
        try {
            const response = await fetch(API_URL, { headers: FETCH_HEADERS });
            if (!response.ok) throw new Error('Серверден пікірлерді жүктеу сәтсіз аяқталды.');

            const reviews = await response.json();
            reviewsContainer.innerHTML = '';

            if (Array.isArray(reviews)) {
                const sortedReviews = reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                sortedReviews.forEach(review => {
                    const reviewCard = createReviewCard(review);
                    reviewsContainer.appendChild(reviewCard);
                });
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // --- Star Rating Logic ---
    let currentRating = 0;
    const updateStars = (rating = currentRating) => {
        stars.forEach(star => star.classList.toggle('selected', star.getAttribute('data-value') <= rating));
    };
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.getAttribute('data-value');
            ratingInput.value = currentRating;
            updateStars();
        });
        star.addEventListener('mouseover', () => updateStars(star.getAttribute('data-value')));
        star.addEventListener('mouseout', () => updateStars());
    });

    // --- Anonymous Mode Logic ---
    anonymousModeCheckbox.addEventListener('change', () => {
        studentNameInput.disabled = anonymousModeCheckbox.checked;
        studentNameInput.value = anonymousModeCheckbox.checked ? 'Аноним' : '';
    });

    // --- Form Submission Logic (Create and Update) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;

        if (ratingInput.value === '0') {
            alert('Баға беріңіз!');
            submitButton.disabled = false;
            return;
        }

        const subject = document.getElementById('complaint-subject').value;
        const text = document.getElementById('review-text').value;

        if (containsProfanity(subject) || containsProfanity(text)) {
            alert('Орынсыз сөздерді қолдануға тыйым салынады!');
            submitButton.disabled = false;
            return;
        }

        const reviewData = {
            name: studentNameInput.value,
            class: document.getElementById('student-class').value,
            subject: subject,
            text: text,
            rating: Number(ratingInput.value), // Ensure rating is a number
        };

        try {
            let response;
            if (editingReviewId !== null) {
                // UPDATE (PATCH) an existing review
                response = await fetch(`${API_URL}/${editingReviewId}`, {
                    method: 'PATCH',
                    headers: FETCH_HEADERS,
                    body: JSON.stringify(reviewData),
                });
            } else {
                // CREATE (POST) a new review
                reviewData.date = new Date().toISOString(); // Add date only on creation
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: FETCH_HEADERS,
                    body: JSON.stringify(reviewData),
                });
            }

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(`Сервер қатесі: ${err.message || response.statusText}`);
            }

            resetForm();
            await loadAndRenderReviews();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            submitButton.disabled = false;
        }
    });

    // --- Form Reset Function ---
    const resetForm = () => {
        editingReviewId = null;
        form.reset();
        submitButton.textContent = 'Пікірді жіберу';
        anonymousModeCheckbox.checked = false;
        studentNameInput.disabled = false;
        currentRating = 0;
        ratingInput.value = '0';
        updateStars();
    };

    // --- Review Card Creation ---
    function createReviewCard(review) {
        const card = document.createElement('div');
        card.classList.add('review-card');
        card.dataset.id = review._id; // Use _id from restdb.io
        const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const formattedDate = new Date(review.date).toLocaleString('kk-KZ');
        card.innerHTML = `
            <div class="review-header">
                <div class="student-info">${review.name}, ${review.class} сынып</div>
                <div class="review-rating">${ratingStars}</div>
            </div>
            <div class="review-body"><h4>${review.subject}</h4><p>${review.text}</p></div>
            <div class="review-footer">
                <div class="review-date">${formattedDate}</div>
                <div class="review-actions">
                    <button class="btn-edit">Өзгерту</button>
                    <button class="btn-delete">Жою</button>
                </div>
            </div>`;
        return card;
    }

    // --- Event Delegation for Edit/Delete ---
    reviewsContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const card = target.closest('.review-card');
        if (!card) return;

        const reviewId = card.dataset.id; // This is the _id string

        // Handle Delete
        if (target.classList.contains('btn-delete')) {
            if (confirm('Бұл пікірді жоюға сенімдісіз бе?')) {
                target.disabled = true;
                try {
                    const response = await fetch(`${API_URL}/${reviewId}`, {
                        method: 'DELETE',
                        headers: FETCH_HEADERS
                    });
                    if (!response.ok) throw new Error('Пікірді жою мүмкін болмады.');
                    await loadAndRenderReviews();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                    target.disabled = false;
                }
            }
        }

        // Handle Edit
        if (target.classList.contains('btn-edit')) {
            // We need to fetch the single record to make sure we have the latest data
             try {
                const response = await fetch(`${API_URL}/${reviewId}`, { headers: FETCH_HEADERS });
                if (!response.ok) throw new Error('Өзгерту үшін пікірді жүктеу мүмкін болмады.');
                const reviewToEdit = await response.json();

                studentNameInput.value = reviewToEdit.name;
                document.getElementById('student-class').value = reviewToEdit.class;
                document.getElementById('complaint-subject').value = reviewToEdit.subject;
                document.getElementById('review-text').value = reviewToEdit.text;
                anonymousModeCheckbox.checked = reviewToEdit.name === 'Аноним';
                studentNameInput.disabled = anonymousModeCheckbox.checked;
                ratingInput.value = reviewToEdit.rating;
                currentRating = reviewToEdit.rating;
                updateStars();

                editingReviewId = reviewToEdit._id;
                submitButton.textContent = 'Өзгерісті сақтау';
                form.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        }
    });

    // --- Initial Load ---
    loadAndRenderReviews();
});
