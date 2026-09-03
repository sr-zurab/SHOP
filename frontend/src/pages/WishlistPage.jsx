import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWishlist } from '../features/wishlist/wishlistSlice';
import ProductCard from '../components/ProductCard';

function WishlistPage() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.wishlist);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="wishlist-page">
        <p className="empty-text">Войдите, чтобы видеть избранное</p>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    );
  }

  if (loading) return <p className="loading-text">Загрузка...</p>;

  if (items.length === 0) {
    return (
      <div className="wishlist-page">
        <p className="empty-text">В избранном пока ничего нет</p>
        <Link to="/" className="btn btn-primary">Перейти к покупкам</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1>Избранное</h1>
      <div className="product-grid">
        {items.map((item) => (
          <ProductCard key={item.id} product={item.product} />
        ))}
      </div>
    </div>
  );
}

export default WishlistPage;