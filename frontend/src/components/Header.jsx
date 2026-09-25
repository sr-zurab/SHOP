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
  MessageCircle,
  Grid3X3,
  Home,
} from 'lucide-react';

import AuthForm from './AuthForm';
import LogoutButton from './LogoutButton';
import CategoryList from './CategoryList';

function Header({
  categories = [],
  activeCategory = null,
  onCategorySelect,
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

  const unreadChatCount = useSelector(
    (state) => state.chat.unreadCount
  );

  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] =
    useState(false);

  const formatCount = (count) =>
    count > 99 ? '99+' : count;

  const closeMobilePanels = () => {
    setCategoryOpen(false);
    setMenuOpen(false);
  };

  const handleCategorySelect = (slug) => {
    if (onCategorySelect) {
      onCategorySelect(slug);
    }

    setCategoryOpen(false);
  };

  const handleMobileChatOpen = () => {
    window.dispatchEvent(
      new CustomEvent('shop:open-chat')
    );
  };

  const handleMobileProfile = () => {
    closeMobilePanels();

    if (!isAuthenticated) {
      setAuthOpen(true);
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link
            to="/"
            className="logo"
            onClick={closeMobilePanels}
          >
            Магазин
          </Link>

          <button
            className="menu-toggle"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-label="Меню"
            aria-expanded={menuOpen}
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
              onClick={() =>
                setMenuOpen(false)
              }
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
              onClick={closeMobilePanels}
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
              onClick={closeMobilePanels}
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
                  onClick={closeMobilePanels}
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
                  onClick={closeMobilePanels}
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
                type="button"
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

        {authOpen && !isAuthenticated && (
          <div
            className="auth-modal-overlay"
            onClick={() =>
              setAuthOpen(false)
            }
          >
            <div
              className="auth-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className="auth-modal-close"
                onClick={() =>
                  setAuthOpen(false)
                }
                aria-label="Закрыть"
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

      {/* =========================================
          Мобильная панель категорий
         ========================================= */}

      {categoryOpen && (
        <div
          className="mobile-category-panel"
          role="dialog"
          aria-label="Категории"
        >
          <div className="mobile-category-header">
            <span>Категории</span>

            <button
              type="button"
              className="mobile-category-close"
              onClick={() =>
                setCategoryOpen(false)
              }
              aria-label="Закрыть категории"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mobile-category-content">
            <CategoryList
              categories={categories}
              activeSlug={activeCategory}
              onSelect={handleCategorySelect}
            />
          </div>
        </div>
      )}

      {/* =========================================
          Мобильная нижняя навигация
         ========================================= */}

      <nav
        className={`mobile-bottom-nav ${
          isAuthenticated
            ? 'mobile-bottom-nav-auth'
            : 'mobile-bottom-nav-guest'
        }`}
        aria-label="Мобильная навигация"
      >
        {/* Главная */}

        <Link
          to="/"
          className="mobile-nav-item"
          onClick={closeMobilePanels}
          aria-label="Главная"
        >
          <span className="mobile-nav-icon">
            <Home size={21} />
          </span>

          <span>Главная</span>
        </Link>

        {/* Категории */}

        <button
          type="button"
          className={`mobile-nav-item ${
            categoryOpen ? 'active' : ''
          }`}
          onClick={() => {
            setCategoryOpen(
              (value) => !value
            );
            setMenuOpen(false);
          }}
          aria-label="Категории"
          aria-expanded={categoryOpen}
        >
          <span className="mobile-nav-icon">
            <Grid3X3 size={21} />
          </span>

          <span>Категории</span>
        </button>

        {/* Корзина */}

        <Link
          to="/cart"
          className="mobile-nav-item"
          onClick={closeMobilePanels}
          aria-label="Корзина"
        >
          <span className="mobile-nav-icon">
            <ShoppingCart size={21} />

            {cartCount > 0 && (
              <span className="mobile-nav-badge">
                {formatCount(cartCount)}
              </span>
            )}
          </span>

          <span>Корзина</span>
        </Link>

        {/* Избранное */}

        <Link
          to="/wishlist"
          className="mobile-nav-item"
          onClick={closeMobilePanels}
          aria-label="Избранное"
        >
          <span className="mobile-nav-icon">
            <Heart size={21} />

            {wishlistCount > 0 && (
              <span className="mobile-nav-badge">
                {formatCount(wishlistCount)}
              </span>
            )}
          </span>

          <span>Избранное</span>
        </Link>

        {/* Профиль / Войти */}

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="mobile-nav-item"
            onClick={closeMobilePanels}
            aria-label="Профиль"
          >
            <span className="mobile-nav-icon">
              <User size={21} />
            </span>

            <span>Профиль</span>
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-nav-item"
            onClick={handleMobileProfile}
            aria-label="Войти"
          >
            <span className="mobile-nav-icon">
              <User size={21} />
            </span>

            <span>Войти</span>
          </button>
        )}

        {/* Чат — только авторизованным */}

        {isAuthenticated && (
          <button
            type="button"
            className="mobile-nav-item"
            onClick={handleMobileChatOpen}
            aria-label="Чат"
          >
            <span className="mobile-nav-icon">
              <MessageCircle size={21} />

              {unreadChatCount > 0 && (
                <span className="mobile-nav-badge">
                  {formatCount(
                    unreadChatCount
                  )}
                </span>
              )}
            </span>

            <span>Чат</span>
          </button>
        )}
      </nav>
    </>
  );
}

export default Header;