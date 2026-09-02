import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addItem } from '../features/cart/cartSlice';

function AddToCartButton({ productId, disabled }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await dispatch(addItem({ productId }));
    setIsLoading(false);
  };

  return (
    <button
      className="btn btn-primary add-to-cart-btn"
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Добавляем...' : disabled ? 'Нет в наличии' : 'В корзину'}
    </button>
  );
}

export default AddToCartButton;