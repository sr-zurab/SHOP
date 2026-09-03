import { useDispatch, useSelector } from 'react-redux';
import { deleteReview } from '../features/reviews/reviewsSlice';

function ReviewList() {
  const dispatch = useDispatch();
  const { list: reviews, loading } = useSelector((state) => state.reviews);
  const { data: profile } = useSelector((state) => state.profile);

  if (loading) return <p className="loading-text">Загрузка отзывов...</p>;
  if (reviews.length === 0) return <p className="empty-text">Отзывов пока нет</p>;

  return (
    <div className="review-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-item">
          <div className="review-item-header">
            <span className="review-author">{review.username}</span>
            <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
          </div>
          {review.text && <p className="review-text">{review.text}</p>}
          <div className="review-item-footer">
            <span className="review-date">
              {new Date(review.created).toLocaleDateString('ru-RU')}
            </span>
            {profile?.username === review.username && (
              <button
                className="review-delete-btn"
                onClick={() => dispatch(deleteReview(review.id))}
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReviewList;