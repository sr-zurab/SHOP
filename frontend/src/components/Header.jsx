import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ShoppingCart,
  User,
  Heart,
  Package,
  Menu,
  X,
  Grid2X2,
  MessageCircle,
} from 'lucide-react';
import AuthForm from './AuthForm';
import LogoutButton from './LogoutButton';
import CategoryList from './CategoryList';

function Header({
  categories,
  activeCategory,
  onCategorySelect,
  chatOpen,
  onChatOpen,
}) {
  const { isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const cartCount = useSelector((state) =>
    state.cart.data.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    )
  );

  const wishlistCount = useSelector(
    (state) => state.wishlist.productIds.length
  );

  const ordersCount = useSelector(
    (state) => state.orders.list.length
  );

  const formatCount = (count) =>
    count > 99 ? '99+' : count;

  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] =
    useState(false);

  const handleCategorySelect = (slug) => {
    onCategorySelect(slug);
    setCategoriesOpen(false);
    setMenuOpen(false);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      return;
    }

    setAuthOpen(true);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          to="/"
          className="logo"
        >
          Магазин
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          {menuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>

        {menuOpen && (
          <div
            className="menu-overlay"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <nav
          className={`header-nav ${
            menuOpen ? 'open' : ''
          }`}
        >
          <Link
            to="/cart"
            className="icon-link cart-link"
            aria-label="Корзина"
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingCart size={20} />

            <span className="icon-link-label">
              Корзина
            </span>

            {cartCount > 0 && (
              <span className="cart-badge">
                {formatCount(cartCount)}
              </span>
            )}
          </Link>

          <Link
            to="/wishlist"
            className="icon-link"
            aria-label="Избранное"
            onClick={() => setMenuOpen(false)}
          >
            <Heart size={20} />

            <span className="icon-link-label">
              Избранное
            </span>

            {wishlistCount > 0 && (
              <span className="cart-badge">
                {formatCount(wishlistCount)}
              </span>
            )}
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/profile"
                className="icon-link"
                aria-label="Профиль"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                <User size={20} />

                <span className="icon-link-label">
                  Профиль
                </span>
              </Link>

              <Link
                to="/orders"
                className="icon-link"
                aria-label="Мои заказы"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                <Package size={20} />

                <span className="icon-link-label">
                  Мои заказы
                </span>

                {ordersCount > 0 && (
                  <span className="cart-badge">
                    {formatCount(ordersCount)}
                  </span>
                )}
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <LogoutButton />
          ) : (
            <button
              className="btn btn-outline"
              onClick={() => {
                setAuthOpen(true);
                setMenuOpen(false);
              }}
            >
              Войти
            </button>
          )}
        </nav>
      </div>

      <div
        className={`mobile-category-panel ${
          categoriesOpen ? 'open' : ''
        }`}
      >
        {categoriesOpen && (
          <div className="mobile-category-content">
            <CategoryList
              categories={categories}
              activeSlug={activeCategory}
              onSelect={handleCategorySelect}
            />
          </div>
        )}
      </div>

      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-item ${
            categoriesOpen ? 'active' : ''
          }`}
          onClick={() =>
            setCategoriesOpen(
              (prev) => !prev
            )
          }
          aria-label="Категории"
        >
          <Grid2X2 size={22} />

          <span>Категории</span>
        </button>

        <Link
          to="/cart"
          className="mobile-nav-item"
          aria-label="Корзина"
        >
          <span className="mobile-nav-icon">
            <ShoppingCart size={22} />

            {cartCount > 0 && (
              <span className="mobile-nav-badge">
                {formatCount(cartCount)}
              </span>
            )}
          </span>

          <span>Корзина</span>
        </Link>

        <Link
          to="/wishlist"
          className="mobile-nav-item"
          aria-label="Избранное"
        >
          <span className="mobile-nav-icon">
            <Heart size={22} />

            {wishlistCount > 0 && (
              <span className="mobile-nav-badge">
                {formatCount(wishlistCount)}
              </span>
            )}
          </span>

          <span>Избранное</span>
        </Link>

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="mobile-nav-item"
            aria-label="Профиль"
          >
            <User size={22} />

            <span>Профиль</span>
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-nav-item"
            onClick={handleProfileClick}
            aria-label="Профиль"
          >
            <User size={22} />

            <span>Профиль</span>
          </button>
        )}

        <button
          type="button"
          className={`mobile-nav-item ${
            chatOpen ? 'active' : ''
          }`}
          onClick={onChatOpen}
          aria-label="Чат"
        >
          <span className="mobile-nav-icon">
            <MessageCircle size={22} />
          </span>

          <span>Чат</span>
        </button>
      </nav>

      {authOpen && !isAuthenticated && (
        <div
          className="auth-modal-overlay"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="auth-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="auth-modal-close"
              onClick={() =>
                setAuthOpen(false)
              }
            >
              ×
            </button>

            <AuthForm
              onClose={() =>
                setAuthOpen(false)
              }
            />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;