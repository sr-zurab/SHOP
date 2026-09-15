import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchManagerOrders, updateManagerOrderStatus, addManagerOrderComment,
} from '../features/orders/ordersSlice';
import useDebounce from '../hooks/useDebounce';
import { Send } from 'lucide-react';

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

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

function ManagerOrdersPage() {
  const dispatch = useDispatch();
  const { data: profile } = useSelector((state) => state.profile);
  const { managerList: orders, managerLoading, error } = useSelector((state) => state.orders);

  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [commentText, setCommentText] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(fetchManagerOrders({ status: statusFilter, search: debouncedSearch }));
    }
  }, [dispatch, profile, statusFilter, debouncedSearch]);

  const selected = orders.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !orders.some((o) => o.id === selectedId)) {
      setSelectedId(null);
    }
  }, [orders, selectedId]);

  const handleStatusChange = async (e) => {
    if (!selected) return;
    const nextStatus = e.target.value;
    if (nextStatus === selected.status) return;
    setSavingStatus(true);
    await dispatch(updateManagerOrderStatus({ orderId: selected.id, status: nextStatus }));
    setSavingStatus(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selected || !commentText.trim()) return;
    setSendingComment(true);
    const result = await dispatch(addManagerOrderComment({
      orderId: selected.id,
      text: commentText.trim(),
    }));
    if (addManagerOrderComment.fulfilled.match(result)) {
      setCommentText('');
    }
    setSendingComment(false);
  };

  if (!profile?.is_manager) {
    return (
      <div className="manager-chat-page-denied">
        <p className="empty-text">Доступ только для менеджеров</p>
        <Link to="/manager/login" className="btn btn-primary">Войти</Link>
      </div>
    );
  }

  return (
    <div className="manager-orders-page">
      <div className="manager-orders-sidebar">
        <div className="manager-section-header">
          <h1>Заказы</h1>
        </div>

        <div className="manager-list-toolbar">
          <input
            className="manager-list-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
          />
          <select
            className="manager-list-sort"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {managerLoading && <p className="empty-text">Загрузка...</p>}
        {!managerLoading && orders.length === 0 && (
          <p className="empty-text">Заказов не найдено</p>
        )}

        <div className="manager-orders-list">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className={`manager-order-item ${selectedId === order.id ? 'active' : ''}`}
              onClick={() => setSelectedId(order.id)}
            >
              <div className="manager-order-item-top">
                <span className="manager-order-item-id">#{order.id}</span>
                <span className={`order-status order-status-${order.status}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <span className="manager-order-item-name">{order.full_name}</span>
              <div className="manager-order-item-meta">
                <span>
                  {new Date(order.created).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                <span>{order.total_price} ₽</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="manager-orders-detail">
        {!selected ? (
          <p className="empty-text">Выберите заказ слева</p>
        ) : (
          <>
            <div className="manager-order-detail-header">
              <div>
                <h2>Заказ #{selected.id}</h2>
                <p className="manager-order-detail-sub">
                  {selected.username ? `@${selected.username}` : 'Гость'} ·{' '}
                  {new Date(selected.created).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="manager-order-status-control">
                <label htmlFor="manager-order-status">Статус</label>
                <select
                  id="manager-order-status"
                  value={selected.status}
                  onChange={handleStatusChange}
                  disabled={savingStatus}
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="manager-order-error">{error}</p>}

            <div className="manager-order-section">
              <h3>Покупатель</h3>
              <p>{selected.full_name}</p>
              <p>{selected.email}</p>
              <p>{selected.phone}</p>
              <p>
                <strong>{DELIVERY_LABELS[selected.delivery_method] || selected.delivery_method}</strong>
                {selected.address ? ` · ${selected.address}` : ''}
              </p>
            </div>

            <div className="manager-order-section">
              <h3>Состав</h3>
              {selected.items.map((item) => (
                <div key={item.id} className="checkout-summary-item">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{item.price * item.quantity} ₽</span>
                </div>
              ))}
              <div className="checkout-summary-total">
                <span>Итого:</span>
                <strong>{selected.total_price} ₽</strong>
              </div>
            </div>

            <div className="manager-order-section">
              <h3>Комментарии</h3>
              <div className="manager-order-comments">
                {(selected.comments || []).length === 0 && (
                  <p className="empty-text">Пока нет комментариев</p>
                )}
                {(selected.comments || []).map((comment) => (
                  <div key={comment.id} className="manager-order-comment">
                    <div className="manager-order-comment-meta">
                      <strong>{comment.author_username || 'Менеджер'}</strong>
                      <span>
                        {new Date(comment.created).toLocaleString('ru-RU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p>{comment.text}</p>
                  </div>
                ))}
              </div>

              <form className="manager-order-comment-form" onSubmit={handleAddComment}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Комментарий для покупателя..."
                  maxLength={2000}
                />
                <button type="submit" disabled={sendingComment || !commentText.trim()} aria-label="Отправить">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ManagerOrdersPage;
