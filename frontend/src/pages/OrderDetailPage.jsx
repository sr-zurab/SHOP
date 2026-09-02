import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderById } from '../features/orders/ordersSlice';

const STATUS_LABELS = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

function OrderDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { list: orders, loading } = useSelector((state) => state.orders);
  const order = orders.find((o) => String(o.id) === id);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!order) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id, order]);

  if (loading && !order) {
    return <p className="loading-text">Загрузка...</p>;
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <p className="empty-text">Заказ не найден</p>
        <Link to="/orders" className="btn btn-primary">К списку заказов</Link>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <Link to="/orders" className="back-link">← К списку заказов</Link>

      <h1>Заказ #{order.id}</h1>
      <span className={`order-status order-status-${order.status}`}>
        {STATUS_LABELS[order.status] || order.status}
      </span>

      <div className="order-detail-section">
        <h2>Доставка</h2>
        <p>{order.full_name}</p>
        <p>{order.email}</p>
        <p>{order.phone}</p>
        <p>{order.address}</p>
      </div>

      <div className="order-detail-section">
        <h2>Состав заказа</h2>
        {order.items.map((item) => (
          <div key={item.id} className="checkout-summary-item">
            <span>{item.product_name} × {item.quantity}</span>
            <span>{item.price * item.quantity} ₽</span>
          </div>
        ))}
        <div className="checkout-summary-total">
          <span>Итого:</span>
          <strong>{order.total_price} ₽</strong>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;