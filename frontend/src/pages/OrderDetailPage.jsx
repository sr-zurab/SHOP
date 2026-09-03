import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderById, cancelOrder } from '../features/orders/ordersSlice';

const STATUS_LABELS = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const DELIVERY_LABELS = {
  courier: 'Курьером',
  pickup: 'Самовывоз',
};

function OrderDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { list: orders, loading } = useSelector((state) => state.orders);
  const order = orders.find((o) => String(o.id) === id);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!order) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id, order]);

  const handleCancel = async () => {
    setCancelling(true);
    await dispatch(cancelOrder(id));
    setCancelling(false);
    setConfirmingCancel(false);
  };

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

  const canCancel = order.status === 'pending' || order.status === 'paid';

  return (
    <div className="order-detail-page">
      <Link to="/orders" className="back-link">← К списку заказов</Link>

      <div className="order-detail-header">
        <h1>Заказ #{order.id}</h1>
        <span className={`order-status order-status-${order.status}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="order-detail-section">
        <h2>Доставка</h2>
        <p><strong>{DELIVERY_LABELS[order.delivery_method] || order.delivery_method}</strong></p>
        <p>{order.full_name}</p>
        <p>{order.email}</p>
        <p>{order.phone}</p>
        {order.address && <p>{order.address}</p>}
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

      {canCancel && (
        <div className="order-detail-actions">
          {!confirmingCancel ? (
            <button className="btn btn-remove" onClick={() => setConfirmingCancel(true)}>
              Отменить заказ
            </button>
          ) : (
            <div className="cancel-confirm">
              <p>Точно отменить заказ?</p>
              <button className="btn btn-remove" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Отменяем...' : 'Да, отменить'}
              </button>
              <button className="btn btn-outline" onClick={() => setConfirmingCancel(false)}>
                Не отменять
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderDetailPage;