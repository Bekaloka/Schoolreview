document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const form = document.getElementById('review-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');

    let editingReviewId = null;
    const API_URL = 'https://api.npoint.io/cbdfaec8fd2dbd129f4d';

    // --- Profanity Filter ---
    const profanityWords = ['қотақ', 'сігейін', 'көт', 'жәлеп', 'долбаеб'];
    const containsProfanity = (text) => {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return profanityWords.some(word => lowerCaseText.includes(word));
    };

    // --- API Communication Functions ---
    const getRemoteReviews = async () => {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Дерекқордан пікірлерді жүктеу мүмкін болмады.');
        return await response.json(); // Returns the whole DB object, e.g., { reviews: [] }
    };

    const updateRemoteReviews = async (db) => {
        const response = await fetch(API_URL, {
            method: 'POST', // npoint.io uses POST to update the entire bin
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db),
        });
        if (!response.ok) throw new Error('Дерекқорды жаңарту мүмкін болмады.');
    };

    const loadAndRenderReviews = async () => {
        try {
            const db = await getRemoteReviews();
            reviewsContainer.innerHTML = '';
            const sortedReviews = db.reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
            sortedReviews.forEach(review => {
                const reviewCard = createReviewCard(review);
                reviewsContainer.appendChild(reviewCard);
            });
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

        try {
            const db = await getRemoteReviews();
            const reviewData = {
                name: studentNameInput.value,
                class: document.getElementById('student-class').value,
                subject: subject,
                text: text,
                rating: ratingInput.value,
            };

            if (editingReviewId !== null) {
                const reviewIndex = db.reviews.findIndex(r => r.id === editingReviewId);
                if (reviewIndex !== -1) {
                    db.reviews[reviewIndex] = { ...db.reviews[reviewIndex], ...reviewData };
                }
            } else {
                db.reviews.push({ ...reviewData, id: Date.now(), date: new Date().toISOString() });
            }

            await updateRemoteReviews(db);
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
        card.dataset.id = review.id;
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

        const reviewId = Number(card.dataset.id);

        if (target.classList.contains('btn-delete')) {
            if (confirm('Бұл пікірді жоюға сенімдісіз бе?')) {
                target.disabled = true;
                try {
                    const db = await getRemoteReviews();
                    db.reviews = db.reviews.filter(r => r.id !== reviewId);
                    await updateRemoteReviews(db);
                    await loadAndRenderReviews();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                    target.disabled = false;
                }
            }
        }

        if (target.classList.contains('btn-edit')) {
            const db = await getRemoteReviews();
            const reviewToEdit = db.reviews.find(r => r.id === reviewId);
            if (reviewToEdit) {
                studentNameInput.value = reviewToEdit.name;
                document.getElementById('student-class').value = reviewToEdit.class;
                document.getElementById('complaint-subject').value = reviewToEdit.subject;
                document.getElementById('review-text').value = reviewToEdit.text;
                anonymousModeCheckbox.checked = reviewToEdit.name === 'Аноним';
                studentNameInput.disabled = anonymousModeCheckbox.checked;
                ratingInput.value = reviewToEdit.rating;
                currentRating = reviewToEdit.rating;
                updateStars();
                editingReviewId = reviewId;
                submitButton.textContent = 'Өзгерісті сақтау';
                form.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // --- Initial Load ---
    loadAndRenderReviews();
});
