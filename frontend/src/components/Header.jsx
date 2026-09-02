import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AuthForm from './AuthForm';
import LogoutButton from './LogoutButton';

function Header() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartCount = useSelector((state) =>
    state.cart.data.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="logo">Магазин</Link>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          ☰
        </button>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <Link to="/cart" className="cart-link">
            Корзина {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {isAuthenticated && (
            <Link to="/orders" className="orders-link">Мои заказы</Link>
          )}

          {isAuthenticated ? (
            <LogoutButton />
          ) : (
            <button className="btn btn-outline" onClick={() => setAuthOpen(true)}>
              Войти
            </button>
          )}
        </nav>
      </div>

      {authOpen && !isAuthenticated && (
        <div className="auth-modal-overlay" onClick={() => setAuthOpen(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setAuthOpen(false)}>×</button>
            <AuthForm onClose={() => setAuthOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;