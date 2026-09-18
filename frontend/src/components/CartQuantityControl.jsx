import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateQuantity, removeItem } from '../features/cart/cartSlice';
import QuantitySelector from './QuantitySelector';

function CartQuantityControl({ productId, quantity, maxStock, selectedAttributes = {} }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const changeQuantity = async (newQuantity) => {
    if (newQuantity < 1) {
      await dispatch(removeItem({ productId, selectedAttributes }));
      return;
    }
    if (newQuantity > maxStock) return;
    setIsLoading(true);
    await dispatch(updateQuantity({ productId, quantity: newQuantity, selectedAttributes }));
    setIsLoading(false);
  };

  return (
    <QuantitySelector
      quantity={quantity}
      onIncrease={() => changeQuantity(quantity + 1)}
      onDecrease={() => changeQuantity(quantity - 1)}
      disabled={isLoading}
    />
  );
}

export default CartQuantityControl;