document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const form = document.getElementById('review-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    const paginationContainer = document.getElementById('pagination-container');
    const ratingFilter = document.getElementById('rating-filter');

    let editingReviewId = null;
    const API_URL = 'https://schoolreviews172-d66a.restdb.io/rest/reviews';
    const API_KEY = 'f1719bd7fea04e3b221bf3b7a0ae3906bf6ca';

    const FETCH_HEADERS = {
        'Content-Type': 'application/json',
        'x-apikey': API_KEY,
        'cache-control': 'no-cache'
    };

    // --- State for Pagination, Filtering & Anti-Spam ---
    let allReviews = [];
    let currentPage = 1;
    const reviewsPerPage = 5;
    let currentFilter = 'all';
    const SUBMISSION_COOLDOWN = 60000; // 60 seconds

    // --- Helper Functions ---
    const showLoader = () => loaderOverlay.classList.add('visible');
    const hideLoader = () => loaderOverlay.classList.remove('visible');

    const handleApiError = (error) => {
        console.error(error);
        let userMessage = 'Белгісіз қате пайда болды. Бетті жаңартып, қайталап көріңіз.';
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'Серверге қосылу мүмкін болмады. Интернет қосылымыңызды тексеріп, қайталап көріңіз.';
        } else {
            userMessage = `Сервер қатесі: ${error.message}`;
        }
        alert(userMessage);
    };

    // --- Profanity Filter ---
    const profanityWords = ['қотақ', 'сігейін', 'көт', 'жәлеп', 'долбаеб'];
    const containsProfanity = (text) => {
        if (!text) return false;
        return profanityWords.some(word => text.toLowerCase().includes(word));
    };

    // --- Rendering & Pagination Logic ---
    const renderPage = (page) => {
        currentPage = page;
        reviewsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const filteredReviews = allReviews.filter(review => {
            if (currentFilter === 'all') return true;
            return String(review.rating) === currentFilter;
        });

        if (filteredReviews.length === 0) {
            reviewsContainer.innerHTML = '<p style="text-align: center;">Бұл фильтр бойынша пікірлер табылмады.</p>';
            return;
        }

        const pageCount = Math.ceil(filteredReviews.length / reviewsPerPage);
        // Ensure current page is valid after filtering
        if (page > pageCount) {
            currentPage = pageCount;
        }

        const startIndex = (currentPage - 1) * reviewsPerPage;
        const endIndex = currentPage * reviewsPerPage;
        const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

        paginatedReviews.forEach(review => {
            reviewsContainer.appendChild(createReviewCard(review));
        });

        renderPaginationControls(pageCount);
    };

    const renderPaginationControls = (pageCount) => {
        if (pageCount <= 1) return;

        const createButton = (text, pageNum, disabled = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.classList.add('pagination-btn');
            button.disabled = disabled;
            button.addEventListener('click', () => renderPage(pageNum));
            return button;
        };
        paginationContainer.appendChild(createButton('‹', currentPage - 1, currentPage === 1));
        for (let i = 1; i <= pageCount; i++) {
            const pageButton = createButton(i, i);
            if (i === currentPage) pageButton.classList.add('active');
            paginationContainer.appendChild(pageButton);
        }
        paginationContainer.appendChild(createButton('›', currentPage + 1, currentPage === pageCount));
    };

    // --- API Communication ---
    const fetchAndRender = async () => {
        showLoader();
        try {
            const response = await fetch(API_URL, { headers: FETCH_HEADERS });
            if (!response.ok) throw new Error('Пікірлерді жүктеу кезінде қате пайда болды.');

            const reviews = await response.json();
            allReviews = Array.isArray(reviews) ? reviews.sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
            renderPage(1);
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoader();
        }
    };

    // --- Event Listeners ---
    ratingFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderPage(1);
    });

    // --- Star Rating Logic ---
    let currentRating = 0;
    const updateStars = (rating = currentRating) => {
        stars.forEach(star => star.classList.toggle('selected', star.getAttribute('data-value') <= rating));
    };
    stars.forEach(star => {
        star.addEventListener('click', () => { currentRating = star.dataset.value; ratingInput.value = currentRating; updateStars(); });
        star.addEventListener('mouseover', () => updateStars(star.dataset.value));
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

        const lastSubmissionTime = localStorage.getItem('lastSubmissionTime');
        if (lastSubmissionTime && (Date.now() - lastSubmissionTime < SUBMISSION_COOLDOWN)) {
            const timeLeft = Math.ceil((SUBMISSION_COOLDOWN - (Date.now() - lastSubmissionTime)) / 1000);
            alert(`Пікірді жиі жіберуге болмайды. ${timeLeft} секундтан кейін қайталап көріңіз.`);
            return;
        }

        submitButton.disabled = true;
        showLoader();

        if (ratingInput.value === '0') {
            alert('Баға беріңіз!');
            submitButton.disabled = false;
            hideLoader();
            return;
        }

        const subject = document.getElementById('complaint-subject').value;
        const text = document.getElementById('review-text').value;

        if (containsProfanity(subject) || containsProfanity(text)) {
            alert('Орынсыз сөздерді қолдануға тыйым салынады!');
            submitButton.disabled = false;
            hideLoader();
            return;
        }

        const reviewData = { name: studentNameInput.value, class: document.getElementById('student-class').value, subject, text, rating: Number(ratingInput.value) };

        try {
            let response;
            let updatedReview;

            if (editingReviewId !== null) {
                response = await fetch(`${API_URL}/${editingReviewId}`, { method: 'PATCH', headers: FETCH_HEADERS, body: JSON.stringify(reviewData) });
            } else {
                reviewData.date = new Date().toISOString();
                response = await fetch(API_URL, { method: 'POST', headers: FETCH_HEADERS, body: JSON.stringify(reviewData) });
            }

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(`Сервер қатесі: ${err.message || response.statusText}`);
            }

            updatedReview = await response.json();

            // Optimistic UI Update
            if (editingReviewId !== null) {
                const index = allReviews.findIndex(r => r._id === editingReviewId);
                if (index !== -1) allReviews[index] = updatedReview;
            } else {
                allReviews.unshift(updatedReview); // Add to the start
            }
            // No need to sort again if we unshift, but let's be safe
            allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));

            localStorage.setItem('lastSubmissionTime', Date.now());
            resetForm();
            // Render the current page (if editing) or the first page (if new)
            renderPage(editingReviewId ? currentPage : 1);

        } catch (error) {
            handleApiError(error);
        } finally {
            submitButton.disabled = false;
            hideLoader();
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
        card.dataset.id = review._id;
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

        const reviewId = card.dataset.id;

        if (target.classList.contains('btn-delete')) {
            if (confirm('Бұл пікірді жоюға сенімдісіз бе?')) {
                showLoader();
                target.disabled = true;
                try {
                    const response = await fetch(`${API_URL}/${reviewId}`, { method: 'DELETE', headers: FETCH_HEADERS });
                    if (!response.ok) throw new Error('Пікірді жою мүмкін болмады.');
                    // On delete, we must re-fetch to get the correct pagination
                    await fetchAndRender();
                } catch (error) {
                    handleApiError(error);
                    target.disabled = false;
                } finally {
                    hideLoader();
                }
            }
        }

        if (target.classList.contains('btn-edit')) {
            showLoader();
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
                handleApiError(error);
            } finally {
                hideLoader();
            }
        }
    });

    // --- Initial Load ---
    fetchAndRender();
});
