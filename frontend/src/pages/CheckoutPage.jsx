import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart } from '../features/cart/cartSlice';
import { createOrder, resetLastCreated } from '../features/orders/ordersSlice';

function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: cart } = useSelector((state) => state.cart);
  const { loading, error, lastCreated } = useSelector((state) => state.orders);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    delivery_method: 'courier',
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    dispatch(resetLastCreated());
    dispatch(fetchCart());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(createOrder(form));
    if (createOrder.fulfilled.match(result)) {
      dispatch(fetchCart());
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="checkout-page">
        <p className="empty-text">Оформление заказа доступно только для авторизованных пользователей</p>
        <Link to="/cart" className="btn btn-primary">Вернуться в корзину</Link>
      </div>
    );
  }

  if (lastCreated) {
    return (
      <div className="checkout-page checkout-success">
        <h1>Заказ оформлен!</h1>
        <p>Номер заказа: #{lastCreated.id}</p>
        <p>Сумма: {lastCreated.total_price} ₽</p>
        <Link to="/orders" className="btn btn-primary">Мои заказы</Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="checkout-page">
        <p className="empty-text">Корзина пуста</p>
        <Link to="/" className="btn btn-primary">Перейти к покупкам</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Оформление заказа</h1>

      <div className="checkout-content">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="delivery-method-selector">
            <label className={`delivery-option ${form.delivery_method === 'courier' ? 'active' : ''}`}>
              <input
                type="radio"
                name="delivery_method"
                value="courier"
                checked={form.delivery_method === 'courier'}
                onChange={handleChange}
              />
              Курьером
            </label>
            <label className={`delivery-option ${form.delivery_method === 'pickup' ? 'active' : ''}`}>
              <input
                type="radio"
                name="delivery_method"
                value="pickup"
                checked={form.delivery_method === 'pickup'}
                onChange={handleChange}
              />
              Самовывоз
            </label>
          </div>

          <label>
            Имя и фамилия
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Телефон
            <input name="phone" value={form.phone} onChange={handleChange} required />
          </label>

          {form.delivery_method === 'courier' && (
            <label>
              Адрес доставки
              <textarea name="address" value={form.address} onChange={handleChange} required />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Оформляем...' : 'Подтвердить заказ'}
          </button>
        </form>

        <div className="checkout-summary">
          <h2>Ваш заказ</h2>
          {cart.items.map((item) => (
            <div key={item.id} className="checkout-summary-item">
              <span>{item.product.name} × {item.quantity}</span>
              <span>{item.total_price} ₽</span>
            </div>
          ))}
          <div className="checkout-summary-total">
            <span>Итого:</span>
            <strong>{cart.total_price} ₽</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;