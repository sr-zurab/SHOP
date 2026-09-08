import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare } from 'lucide-react';
import { logout } from '../features/auth/authSlice';

function ManagerHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
      <button className="manager-header-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Выйти</span>
      </button>
    </header>
  );
}

export default ManagerHeader;
