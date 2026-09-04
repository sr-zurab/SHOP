import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ShoppingCart, User, Heart, Package, Menu, X } from 'lucide-react';
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
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <Link to="/cart" className="icon-link cart-link" aria-label="Корзина">
            <ShoppingCart size={20} />
            <span className="icon-link-label">Корзина</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {isAuthenticated && (
            <>
              <Link to="/profile" className="icon-link" aria-label="Профиль">
                <User size={20} />
                <span className="icon-link-label">Профиль</span>
              </Link>
              <Link to="/wishlist" className="icon-link" aria-label="Избранное">
                <Heart size={20} />
                <span className="icon-link-label">Избранное</span>
              </Link>
              <Link to="/orders" className="icon-link" aria-label="Мои заказы">
                <Package size={20} />
                <span className="icon-link-label">Мои заказы</span>
              </Link>
            </>
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