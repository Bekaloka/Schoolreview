document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('review-form');
    const anonymousModeCheckbox = document.getElementById('anonymous-mode');
    const studentNameInput = document.getElementById('student-name');
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-container');

    // --- Star Rating Logic ---
    let currentRating = 0;

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.getAttribute('data-value');
            ratingInput.value = currentRating;
            updateStars();
        });

        star.addEventListener('mouseover', () => {
            const hoverValue = star.getAttribute('data-value');
            stars.forEach(s => {
                s.classList.toggle('selected', s.getAttribute('data-value') <= hoverValue);
            });
        });

        star.addEventListener('mouseout', () => {
            updateStars(); // Revert to the selected rating
        });
    });

    function updateStars() {
        stars.forEach(star => {
            star.classList.toggle('selected', star.getAttribute('data-value') <= currentRating);
        });
    }

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

    // --- Form Submission Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const studentName = studentNameInput.value;
        const studentClass = document.getElementById('student-class').value;
        const complaintSubject = document.getElementById('complaint-subject').value;
        const reviewText = document.getElementById('review-text').value;
        const rating = ratingInput.value;

        if (rating === '0') {
            alert('Пожалуйста, поставьте оценку (баға беріңіз)!');
            return;
        }

        // Create review card
        const reviewCard = createReviewCard({
            name: studentName,
            class: studentClass,
            subject: complaintSubject,
            text: reviewText,
            rating: rating,
            date: new Date()
        });

        // Add to the top of the container
        reviewsContainer.prepend(reviewCard);

        // Reset form
        form.reset();
        studentNameInput.disabled = false; // Re-enable name input
        currentRating = 0;
        ratingInput.value = '0';
        updateStars();
    });

    // --- Function to Create a Review Card ---
    function createReviewCard(review) {
        const card = document.createElement('div');
        card.classList.add('review-card');

        const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const formattedDate = review.date.toLocaleString('kk-KZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
            <div class="review-date">${formattedDate}</div>
        `;
        return card;
    }
});
