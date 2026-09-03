import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createReview, clearReviewsError } from '../features/reviews/reviewsSlice';

function ReviewForm({ productId }) {
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.reviews);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    dispatch(clearReviewsError());
    const result = await dispatch(createReview({ productId, rating, text }));
    setSubmitting(false);
    if (createReview.fulfilled.match(result)) {
      setText('');
      setRating(5);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="rating-selector">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= rating ? 'active' : ''}`}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        placeholder="Расскажите о своих впечатлениях (необязательно)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && <p className="auth-error">{typeof error === 'string' ? error : JSON.stringify(error)}</p>}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Отправляем...' : 'Оставить отзыв'}
      </button>
    </form>
  );
}

export default ReviewForm;