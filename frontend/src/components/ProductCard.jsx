import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

function ProductCard({ product }) {
  const { data: cart } = useSelector((state) => state.cart);

  // Для товаров БЕЗ атрибутов — ищем конкретный cart item с пустыми атрибутами
  const findCartItemWithoutAttrs = (productId) => {
    if (!cart?.items) return null;
    return cart.items.find((item) =>
      item.product.id === productId &&
      (!item.selected_attributes || Object.keys(item.selected_attributes).length === 0)
    );
  };

  // Для товаров С атрибутами — суммируем количество по всем вариантам
  const getTotalQuantityInCart = (productId) => {
    if (!cart?.items) return 0;
    return cart.items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const hasAttributes = product.has_attributes;
  const cartItem = findCartItemWithoutAttrs(product.id);
  const totalInCart = getTotalQuantityInCart(product.id);
  const isInCart = hasAttributes ? totalInCart > 0 : !!cartItem;

  return (
    <div className={`product-card ${!product.in_stock ? 'out-of-stock' : ''}`}>
      <div className="product-card-image-wrap">
        <Link to={`/products/${product.slug}`} className="product-card-link">
          <div className="product-card-image">
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.name} loading="lazy" />
            ) : (
              <div className="product-card-no-image">Нет фото</div>
            )}
          </div>
          {!product.in_stock && (
            <span className="product-card-oos-badge">Нет в наличии</span>
          )}
        </Link>
        <WishlistButton productId={product.id} />
      </div>

      <Link to={`/products/${product.slug}`} className="product-card-link">
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-price">{product.price} ₽</p>
      </Link>

      <AddToCartButton
        productId={product.id}
        product={product}
        selectedAttributes={cartItem?.selected_attributes || {}}
        isInCart={isInCart}
        isFullySelected={!hasAttributes}
        disabled={!product.in_stock}
        totalInCart={hasAttributes ? totalInCart : (cartItem?.quantity || 0)}
      />
    </div>
  );
}

export default ProductCard;