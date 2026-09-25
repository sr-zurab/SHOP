import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

function ProductCard({ product }) {
  const { data: cart } = useSelector(
    (state) => state.cart
  );

  const findCartItemWithoutAttrs = (
    productId
  ) => {
    if (!cart?.items) {
      return null;
    }

    return cart.items.find(
      (item) =>
        item.product.id === productId &&
        (!item.selected_attributes ||
          Object.keys(
            item.selected_attributes
          ).length === 0)
    );
  };

  const getTotalQuantityInCart = (
    productId
  ) => {
    if (!cart?.items) {
      return 0;
    }

    return cart.items
      .filter(
        (item) =>
          item.product.id === productId
      )
      .reduce(
        (sum, item) =>
          sum + item.quantity,
        0
      );
  };

  const hasAttributes =
    product.has_attributes;

  const variants = Array.isArray(
    product.variants
  )
    ? product.variants
    : [];

  /*
   * Для товара с вариантами наличие определяется
   * только по вариантам.
   *
   * Product.stock в этом случае не используется.
   */
  const hasAvailableVariant =
    hasAttributes &&
    variants.some(
      (variant) =>
        variant.available !== false &&
        Number(variant.stock) > 0
    );

  /*
   * Для простого товара используем product.in_stock.
   * Для товара с вариантами — наличие конкретного
   * доступного варианта.
   */
  const productInStock =
    hasAttributes
      ? hasAvailableVariant
      : product.in_stock;

  const cartItem =
    findCartItemWithoutAttrs(
      product.id
    );

  const totalInCart =
    getTotalQuantityInCart(
      product.id
    );

  const isInCart = hasAttributes
    ? totalInCart > 0
    : !!cartItem;

  /*
   * Если товар уже находится в корзине,
   * кнопка должна позволять открыть управление
   * количеством конкретных вариантов.
   */
  const buttonDisabled = isInCart
    ? false
    : !productInStock;

  const getDisplayPrice = () => {
    if (!hasAttributes) {
      return {
        value: Number(
          product.price || 0
        ),
        prefix: '',
      };
    }

    const availablePrices =
      variants
        .filter(
          (variant) =>
            variant.available !== false &&
            Number(variant.stock) > 0
        )
        .map((variant) =>
          Number(variant.price)
        )
        .filter(
          (price) =>
            Number.isFinite(price)
        );

    if (
      availablePrices.length === 0
    ) {
      return {
        value: Number(
          product.price || 0
        ),
        prefix: '',
      };
    }

    return {
      value: Math.min(
        ...availablePrices
      ),
      prefix: 'от ',
    };
  };

  const displayPrice =
    getDisplayPrice();

  const discount =
    product.discount;

  const hasPercentDiscount =
    discount?.type === 'percent' &&
    Number(discount.amount) > 0;

  const discountValue =
    hasPercentDiscount
      ? Number(
          discount.value || 0
        )
      : 0;

  const discountedPrice =
    hasPercentDiscount
      ? displayPrice.value *
        (1 - discountValue / 100)
      : null;

  return (
    <div
      className={`product-card ${
        !productInStock
          ? 'out-of-stock'
          : ''
      }`}
    >
      <div className="product-card-image-wrap">
        <Link
          to={`/products/${product.slug}`}
          className="product-card-link"
        >
          <div className="product-card-image">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
                loading="lazy"
              />
            ) : (
              <div className="product-card-no-image">
                Нет фото
              </div>
            )}
          </div>

          {!productInStock && (
            <span className="product-card-oos-badge">
              Нет в наличии
            </span>
          )}
        </Link>

        <WishlistButton
          productId={product.id}
        />
      </div>

      <Link
        to={`/products/${product.slug}`}
        className="product-card-link"
      >
        <h3 className="product-card-name">
          {product.name}
        </h3>

        {hasPercentDiscount ? (
          <div className="product-card-price">
            <span className="product-card-old-price">
              {displayPrice.prefix}
              {displayPrice.value.toFixed(
                2
              )}{' '}
              ₽
            </span>

            <span className="product-card-new-price">
              {displayPrice.prefix}
              {discountedPrice.toFixed(
                2
              )}{' '}
              ₽
            </span>

            <span className="product-card-discount">
              −{discountValue}%
            </span>
          </div>
        ) : (
          <p className="product-card-price">
            {displayPrice.prefix}
            {displayPrice.value.toFixed(
              2
            )}{' '}
            ₽
          </p>
        )}
      </Link>

      <AddToCartButton
        productId={product.id}
        product={product}
        selectedAttributes={
          cartItem?.selected_attributes ||
          {}
        }
        attributeGroups={
          product.grouped_attributes ||
          {}
        }
        isInCart={isInCart}
        isFullySelected={!hasAttributes}
        disabled={buttonDisabled}
        totalInCart={
          hasAttributes
            ? totalInCart
            : cartItem?.quantity || 0
        }
      />
    </div>
  );
}

export default ProductCard;