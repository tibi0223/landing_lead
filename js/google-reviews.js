/**
 * Google reviews via server proxy (reviews.php). No API keys in the browser.
 */
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchGoogleReviews() {
  try {
    const url = new URL('reviews.php', window.location.href).toString();
    const response = await fetch(url, { credentials: 'same-origin' });
    const data = await response.json();
    if (!data || !data.ok) {
      return null;
    }
    return {
      rating: typeof data.rating === 'number' ? data.rating : parseFloat(data.rating),
      totalReviews: data.totalReviews,
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
    };
  } catch (e) {
    return null;
  }
}

function generateStars(rating) {
  const r = Number(rating);
  if (Number.isNaN(r)) return '★★★★★';
  const fullStars = Math.floor(r);
  const hasHalfStar = r % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < fullStars; i++) {
    stars += '★';
  }
  if (hasHalfStar && fullStars < 5) {
    stars += '☆';
  }
  for (let i = stars.length; i < 5; i++) {
    stars += '☆';
  }
  return stars;
}

async function updateGoogleReviews() {
  const reviewsData = await fetchGoogleReviews();

  if (!reviewsData || reviewsData.rating == null || Number.isNaN(reviewsData.rating)) {
    return;
  }

  const ratingElement = document.querySelector('.reviews__rating');
  const starsElement = document.querySelector('.reviews__stars');

  if (ratingElement) {
    ratingElement.textContent = reviewsData.rating.toFixed(1);
  }

  if (starsElement) {
    starsElement.textContent = generateStars(reviewsData.rating);
  }

  if (reviewsData.reviews && reviewsData.reviews.length) {
    updateReviewCards(reviewsData.reviews);
  }
}

function updateReviewCards(reviews) {
  const carousel = document.getElementById('reviewsCarousel');
  if (!carousel || !reviews.length) return;

  const latestReviews = reviews.slice(0, 3);

  carousel.innerHTML = latestReviews
    .map((review) => {
      const name = review.author_name || 'Vendég';
      const text = review.text || '';
      const rating = review.rating || 5;
      const initial = name.charAt(0).toUpperCase();
      return `
        <div class="reviews__card">
            <div class="reviews__card-top">
                <div class="reviews__avatar">${escapeHtml(initial)}</div>
                <div class="reviews__info">
                    <span class="reviews__name">${escapeHtml(name)}</span>
                    <span class="reviews__stars-row">${generateStars(rating)}</span>
                </div>
            </div>
            <p class="reviews__text">"${escapeHtml(text)}"</p>
        </div>`;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', function () {
  updateGoogleReviews();
  setInterval(updateGoogleReviews, 3600000);
});

window.updateGoogleReviewsManually = updateGoogleReviews;
