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

    // --- State for Pagination & Filtering ---
    let allReviews = [];
    let currentPage = 1;
    const reviewsPerPage = 5;
    let currentFilter = 'all';

    // --- Loader Functions ---
    const showLoader = () => loaderOverlay.classList.add('visible');
    const hideLoader = () => loaderOverlay.classList.remove('visible');

    // --- Profanity Filter ---
    const profanityWords = ['қотақ', 'сігейін', 'көт', 'жәлеп', 'долбаеб'];
    const containsProfanity = (text) => {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return profanityWords.some(word => lowerCaseText.includes(word));
    };

    // --- Rendering & Pagination Logic ---
    const renderPage = (page) => {
        currentPage = page;
        reviewsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        // Apply filter first
        const filteredReviews = allReviews.filter(review => {
            if (currentFilter === 'all') {
                return true;
            }
            return String(review.rating) === currentFilter;
        });

        if (filteredReviews.length === 0) {
            reviewsContainer.innerHTML = '<p style="text-align: center;">Бұл фильтр бойынша пікірлер табылмады.</p>';
            return;
        }

        const pageCount = Math.ceil(filteredReviews.length / reviewsPerPage);
        const startIndex = (page - 1) * reviewsPerPage;
        const endIndex = page * reviewsPerPage;
        const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

        paginatedReviews.forEach(review => {
            const reviewCard = createReviewCard(review);
            reviewsContainer.appendChild(reviewCard);
        });

        renderPaginationControls(pageCount);
    };

    const renderPaginationControls = (pageCount) => {
        if (pageCount <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = '‹';
        prevButton.classList.add('pagination-btn');
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => renderPage(currentPage - 1));
        paginationContainer.appendChild(prevButton);

        for (let i = 1; i <= pageCount; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('pagination-btn');
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => renderPage(i));
            paginationContainer.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = '›';
        nextButton.classList.add('pagination-btn');
        nextButton.disabled = currentPage === pageCount;
        nextButton.addEventListener('click', () => renderPage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    };

    // --- API Communication ---
    const fetchAndRender = async () => {
        showLoader();
        try {
            const response = await fetch(API_URL, { headers: FETCH_HEADERS });
            if (!response.ok) throw new Error('Серверден пікірлерді жүктеу сәтсіз аяқталды.');

            const reviews = await response.json();
            if (Array.isArray(reviews)) {
                allReviews = reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                renderPage(1);
            } else {
                allReviews = [];
                renderPage(1);
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            hideLoader();
        }
    };

    // --- Event Listeners ---
    ratingFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderPage(1); // Go back to first page when filter changes
    });

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

        const reviewData = {
            name: studentNameInput.value,
            class: document.getElementById('student-class').value,
            subject: subject,
            text: text,
            rating: Number(ratingInput.value),
        };

        try {
            let response;
            if (editingReviewId !== null) {
                response = await fetch(`${API_URL}/${editingReviewId}`, {
                    method: 'PATCH',
                    headers: FETCH_HEADERS,
                    body: JSON.stringify(reviewData),
                });
            } else {
                reviewData.date = new Date().toISOString();
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
            await fetchAndRender();
        } catch (error) {
            console.error(error);
            alert(error.message);
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
                    const response = await fetch(`${API_URL}/${reviewId}`, {
                        method: 'DELETE',
                        headers: FETCH_HEADERS
                    });
                    if (!response.ok) throw new Error('Пікірді жою мүмкін болмады.');
                    await fetchAndRender();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
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
                console.error(error);
                alert(error.message);
            } finally {
                hideLoader();
            }
        }
    });

    // --- Initial Load ---
    fetchAndRender();
});
