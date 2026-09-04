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

      <div className="orders-table">
        <div className="orders-table-header">
          <span>Заказ</span>
          <span>Дата</span>
          <span>Доставка</span>
          <span>Статус</span>
          <span className="orders-table-total-col">Сумма</span>
        </div>

        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="order-row">
            <span className="order-row-number">
              #{order.id}
              <span className="order-row-items-count">
                {order.items.length} {order.items.length === 1 ? 'товар' : 'товара(ов)'}
              </span>
            </span>

            <span className="order-row-date">
              {new Date(order.created).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>

            <span className="order-row-delivery">
              {DELIVERY_LABELS[order.delivery_method] || order.delivery_method}
            </span>

            <span className={`order-status order-status-${order.status}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>

            <span className="order-row-total">{order.total_price} ₽</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default OrdersPage;