import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import { logout } from '../features/auth/authSlice';
import { fetchManagerUnreadCount } from '../features/chat/chatSlice';
import useManagerNotificationsSocket from '../hooks/useManagerNotificationsSocket';

function ManagerHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useSelector((state) => state.chat.managerUnreadCount);

  useManagerNotificationsSocket(true);

  useEffect(() => {
    dispatch(fetchManagerUnreadCount());
    const intervalId = window.setInterval(() => {
      dispatch(fetchManagerUnreadCount());
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/manager/login', { replace: true });
  };

  return (
    <header className="manager-header">
      <div className="manager-header-brand">
        <MessageSquare size={20} />
        <span>Поддержка магазина</span>
      </div>

      <nav className="manager-header-nav">
        <Link
          to="/manager/chats"
          className={`manager-header-link ${location.pathname === '/manager/chats' ? 'active' : ''}`}
        >
          Чаты
          {unreadCount > 0 && (
            <span className="manager-header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </Link>
        <Link
          to="/manager/orders"
          className={`manager-header-link ${location.pathname === '/manager/orders' ? 'active' : ''}`}
        >
          <ShoppingBag size={16} />
          Заказы
        </Link>
        <Link
          to="/manager/products"
          className={`manager-header-link ${location.pathname === '/manager/products' ? 'active' : ''}`}
        >
          <Package size={16} />
          Товары
        </Link>
      </nav>

      <button className="manager-header-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Выйти</span>
      </button>
    </header>
  );
}

export default ManagerHeader;