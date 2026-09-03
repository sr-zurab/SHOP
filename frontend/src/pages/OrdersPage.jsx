import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../features/orders/ordersSlice';

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

function OrdersPage() {
  const dispatch = useDispatch();
  const { list: orders, loading } = useSelector((state) => state.orders);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrders());
    }
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="orders-page">
        <p className="empty-text">Войдите, чтобы посмотреть историю заказов</p>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    );
  }

  if (loading) return <p className="loading-text">Загрузка...</p>;

  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <p className="empty-text">У вас пока нет заказов</p>
        <Link to="/" className="btn btn-primary">Перейти к покупкам</Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>Мои заказы</h1>

      <div className="orders-list">
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="order-card">
            <div className="order-card-top">
              <div>
                <span className="order-card-number">Заказ #{order.id}</span>
                <span className="order-card-date">
                  {new Date(order.created).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
              <span className={`order-status order-status-${order.status}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>

            <div className="order-card-items-preview">
              {order.items.slice(0, 4).map((item) => (
                <span key={item.id} className="order-item-chip">
                  {item.product_name} × {item.quantity}
                </span>
              ))}
              {order.items.length > 4 && (
                <span className="order-item-chip">+{order.items.length - 4} ещё</span>
              )}
            </div>

            <div className="order-card-bottom">
              <span className="order-card-delivery">
                {DELIVERY_LABELS[order.delivery_method] || order.delivery_method}
              </span>
              <span className="order-card-total">{order.total_price} ₽</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default OrdersPage;