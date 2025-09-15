// =================================================================================
// ВАЖНОЕ ПРИМЕЧАНИЕ / IMPORTANT NOTE
// =================================================================================
// Бэкэнд этого приложения был изменен. Ранее оно использовало внешний сервер
// (restdb.io), который перестал работать. Теперь все данные (отзывы) хранятся
// локально в вашем браузере, используя технологию localStorage.
//
// Это означает, что:
// - Ваши отзывы сохраняются только на вашем текущем компьютере и в вашем браузере.
// - Вы не увидите отзывы, оставленные другими пользователями.
// - Очистка данных браузера (кэша, localStorage) приведет к удалению всех отзывов.
//
// This application's backend has been modified. It previously used an external
// server (restdb.io) which is no longer functional. All review data is now
// stored locally in your browser using localStorage.
//
// This means:
// - Your reviews are saved only on your current computer and in your current browser.
// - You will not see reviews left by other people.
// - Clearing your browser's data (cache, localStorage) will delete all reviews.
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const form = document.getElementById('review-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');
    const paginationContainer = document.getElementById('pagination-container');
    const ratingFilter = document.getElementById('rating-filter');

    let editingReviewId = null;

    // --- State for Pagination, Filtering & Anti-Spam ---
    let allReviews = [];
    let currentPage = 1;
    const reviewsPerPage = 5;
    let currentFilter = 'all';
    const SUBMISSION_COOLDOWN = 60000; // 60 seconds

    // --- LocalStorage Logic ---
    const STORAGE_KEY = 'schoolReviewsApp.reviews';

    const getReviews = () => {
        const reviewsJson = localStorage.getItem(STORAGE_KEY);
        return reviewsJson ? JSON.parse(reviewsJson) : [];
    };

    const saveReviews = (reviews) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
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

    // --- App Initialization ---
    const loadAndRender = () => {
        allReviews = getReviews();
        // Sort by date descending
        allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderPage(1);
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

        const reviewData = { name: studentNameInput.value, class: document.getElementById('student-class').value, subject, text, rating: Number(ratingInput.value) };

        allReviews = getReviews();

        if (editingReviewId !== null) {
            const index = allReviews.findIndex(r => r._id === editingReviewId);
            if (index !== -1) {
                // Preserve original date when editing
                const originalDate = allReviews[index].date;
                allReviews[index] = { ...reviewData, _id: editingReviewId, date: originalDate };
            }
        } else {
            reviewData._id = Date.now().toString();
            reviewData.date = new Date().toISOString();
            allReviews.unshift(reviewData); // Add to the start
        }

        allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveReviews(allReviews);

        localStorage.setItem('lastSubmissionTime', Date.now());
        resetForm();
        renderPage(editingReviewId ? currentPage : 1);

        submitButton.disabled = false;
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
                allReviews = getReviews();
                const updatedReviews = allReviews.filter(r => r._id !== reviewId);
                saveReviews(updatedReviews);
                loadAndRender(); // Reload to update the view and pagination
            }
        }

        if (target.classList.contains('btn-edit')) {
            allReviews = getReviews();
            const reviewToEdit = allReviews.find(r => r._id === reviewId);

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

                editingReviewId = reviewToEdit._id;
                submitButton.textContent = 'Өзгерісті сақтау';
                form.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // --- Initial Load ---
    loadAndRender();
});
