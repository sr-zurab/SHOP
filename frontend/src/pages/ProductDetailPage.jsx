import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductBySlug, clearCurrentProduct } from '../features/products/productsSlice';
import { fetchReviews } from '../features/reviews/reviewsSlice';
import AddToCartButton from '../components/AddToCartButton';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';

function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { current: product, loading, error } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    dispatch(fetchProductBySlug(slug));
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, slug]);

  useEffect(() => {
    if (product) {
      setActiveImage(product.images?.[0]?.image || product.thumbnail);
      dispatch(fetchReviews(product.id));
    }
  }, [product, dispatch]);

  if (loading) return <p className="loading-text">Загрузка...</p>;
  if (error) return <p className="empty-text">Товар не найден</p>;
  if (!product) return null;

  return (
    <div className="product-detail">
      <Link to="/" className="back-link">← Назад к товарам</Link>

      <div className="product-detail-content">
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            {activeImage ? (
              <img src={activeImage} alt={product.name} />
            ) : (
              <div className="product-card-no-image">Нет фото</div>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="product-detail-thumbnails">
              {product.images.map((img) => (
                <img
                  key={img.id}
                  src={img.thumbnail}
                  alt={product.name}
                  className={activeImage === img.image ? 'active' : ''}
                  onClick={() => setActiveImage(img.image)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>

          {product.average_rating && (
            <div className="product-rating-summary">
              <span className="rating-stars">
                {'★'.repeat(Math.round(product.average_rating))}
                {'☆'.repeat(5 - Math.round(product.average_rating))}
              </span>
              <span className="rating-value">{product.average_rating}</span>
              <span className="rating-count">({product.reviews_count} отзывов)</span>
            </div>
          )}

          <p className="product-detail-price">{product.price} ₽</p>
          <p className={`product-detail-stock ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
            {product.in_stock ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
          </p>

          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          <AddToCartButton productId={product.id} disabled={!product.in_stock} />
        </div>
      </div>

      <div className="product-reviews-section">
        <h2>Отзывы</h2>
        {isAuthenticated && <ReviewForm productId={product.id} />}
        <ReviewList />
      </div>
    </div>
  );
}

export default ProductDetailPage;