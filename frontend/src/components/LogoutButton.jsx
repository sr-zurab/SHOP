import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { fetchCart } from '../features/cart/cartSlice';

function LogoutButton() {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(fetchCart()); // после выхода — снова анонимная/новая корзина
  };

  return (
    <button className="btn btn-outline" onClick={handleLogout}>
      Выход
    </button>
  );
}

export default LogoutButton;