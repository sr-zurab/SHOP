import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addItem, updateQuantity, removeItem } from '../features/cart/cartSlice';
import QuantitySelector from './QuantitySelector';

function AddToCartButton({ productId, product, selectedAttributes = {}, isInCart, isFullySelected, onAddToCart, disabled, totalInCart }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!isFullySelected) {
      if (onAddToCart) {
        onAddToCart();
      } else if (product?.slug) {
        navigate(`/products/${product.slug}`);
      }
      return;
    }
    setIsLoading(true);
    await dispatch(addItem({ productId, quantity: 1, selectedAttributes }));
    setIsLoading(false);
  };

  const handleQuantityChange = async (newQuantity) => {
    if (newQuantity < 1) {
      await dispatch(removeItem({ productId, selectedAttributes }));
      return;
    }
    setIsLoading(true);
    await dispatch(updateQuantity({ productId, quantity: newQuantity, selectedAttributes }));
    setIsLoading(false);
  };

  // Для товаров с атрибутами на карточке: totalInCart передается как prop
  // Для товаров без атрибутов: isInCart это cartItem объект
  const quantity = typeof isInCart === 'object' && isInCart !== null
    ? isInCart.quantity
    : (totalInCart || 1);
  const maxStock = typeof isInCart === 'object' && isInCart !== null
    ? (isInCart.attribute_stock ?? product?.stock ?? 999)
    : (product?.stock ?? 999);

  if (isInCart) {
    return (
      <QuantitySelector
        quantity={quantity}
        onIncrease={() => handleQuantityChange(quantity + 1)}
        onDecrease={() => handleQuantityChange(quantity - 1)}
        disabled={isLoading || quantity >= maxStock}
      />
    );
  }

  return (
    <button
      className="btn btn-primary add-to-cart-btn"
      onClick={handleAdd}
      disabled={disabled || isLoading || !isFullySelected}
    >
      {isLoading ? 'Добавляем...' : disabled ? 'Нет в наличии' : 'В корзину'}
    </button>
  );
}

export default AddToCartButton;