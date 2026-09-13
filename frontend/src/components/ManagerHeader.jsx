import { useDispatch } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, MessageSquare, Package } from 'lucide-react';
import { logout } from '../features/auth/authSlice';

function ManagerHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

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