import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, clearCart } from '../features/cart/cartSlice';
import CartQuantityControl from '../components/CartQuantityControl';
import RemoveFromCartButton from '../components/RemoveFromCartButton';

function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: cart, loading } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  if (loading && cart.items.length === 0) {
    return <p className="loading-text">Загрузка...</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <p className="empty-text">Корзина пуста</p>
        <Link to="/" className="btn btn-primary">Перейти к покупкам</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Корзина</h1>

      <div className="cart-items">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item">
            <Link to={`/products/${item.product.slug}`} className="cart-item-image">
              {item.product.thumbnail ? (
                <img src={item.product.thumbnail} alt={item.product.name} />
              ) : (
                <div className="product-card-no-image">Нет фото</div>
              )}
            </Link>

            <div className="cart-item-info">
              <Link to={`/products/${item.product.slug}`} className="cart-item-name">
                {item.product.name}
              </Link>
              <p className="cart-item-price">{item.product.price} ₽</p>
            </div>

            <CartQuantityControl
              productId={item.product.id}
              quantity={item.quantity}
              maxStock={item.product.stock}
            />

            <p className="cart-item-total">{item.total_price} ₽</p>

            <RemoveFromCartButton productId={item.product.id} />
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <button className="btn btn-outline" onClick={() => dispatch(clearCart())}>
          Очистить корзину
        </button>

        <div className="cart-total">
          <span>Итого:</span>
          <strong>{cart.total_price} ₽</strong>
        </div>

        <button className="btn btn-primary checkout-btn" onClick={() => navigate('/checkout')}>
          Оформить заказ
        </button>
      </div>
    </div>
  );
}

export default CartPage;