import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { removeItem } from '../features/cart/cartSlice';

function RemoveFromCartButton({ productId, selectedAttributes = {} }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await dispatch(removeItem({ productId, selectedAttributes }));
    setIsLoading(false);
  };

  return (
    <button
      className="btn btn-remove"
      onClick={handleClick}
      disabled={isLoading}
      aria-label="Удалить из корзины"
    >
      Удалить
    </button>
  );
}

export default RemoveFromCartButton;