import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '../features/wishlist/wishlistSlice';

function WishlistButton({ productId }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const inWishlist = useSelector((state) => state.wishlist.productIds.includes(productId));

  if (!isAuthenticated) return null;

  const handleClick = (e) => {
    e.preventDefault(); // чтобы клик не срабатывал как переход по ссылке карточки
    dispatch(toggleWishlist(productId));
  };

  return (
    <button
      className={`wishlist-btn ${inWishlist ? 'active' : ''}`}
      onClick={handleClick}
      aria-label={inWishlist ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      {inWishlist ? '♥' : '♡'}
    </button>
  );
}

export default WishlistButton;