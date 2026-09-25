import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, clearCart } from '../features/cart/cartSlice';
import {
  calculateDiscounts,
  clearCalculation,
} from '../features/discounts/discountsSlice';
import CartQuantityControl from '../components/CartQuantityControl';
import RemoveFromCartButton from '../components/RemoveFromCartButton';

function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: cart, loading } = useSelector(
    (state) => state.cart
  );

  const {
    calculation,
    loading: discountLoading,
  } = useSelector(
    (state) => state.discounts
  );

  const [selectedItemIds, setSelectedItemIds] = useState([]);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const getVariant = (item) => {
    if (!item?.variant) {
      return null;
    }

    const variantId =
      typeof item.variant === 'object'
        ? item.variant.id
        : item.variant;

    const variants = Array.isArray(
      item.product?.variants
    )
      ? item.product.variants
      : [];

    return (
      variants.find(
        (variant) =>
          variant.id === variantId
      ) || null
    );
  };

  const getMaxStock = (item) => {
    if (
      item.attribute_stock !== undefined &&
      item.attribute_stock !== null
    ) {
      return Number(item.attribute_stock);
    }

    return Number(
      item.product?.stock || 0
    );
  };

  const getUnitPrice = (item) => {
    const variant = getVariant(item);

    if (variant) {
      return Number(variant.price || 0);
    }

    if (
      item.variant &&
      item.quantity > 0 &&
      item.total_price !== undefined
    ) {
      return (
        Number(item.total_price || 0) /
        item.quantity
      );
    }

    return Number(
      item.product?.price || 0
    );
  };

  const isItemOutOfStock = (item) => {
    if (
      item.product.available === false
    ) {
      return true;
    }

    const variant = getVariant(item);

    if (item.variant && !variant) {
      return true;
    }

    if (
      variant &&
      variant.available === false
    ) {
      return true;
    }

    return getMaxStock(item) <= 0;
  };

  useEffect(() => {
    if (!cart?.items) {
      return;
    }

    const availableIds = cart.items
      .filter(
        (item) =>
          !isItemOutOfStock(item)
      )
      .map((item) => item.id);

    setSelectedItemIds(
      (currentIds) => {
        if (currentIds.length === 0) {
          return availableIds;
        }

        return currentIds.filter(
          (id) =>
            availableIds.includes(id)
        );
      }
    );
  }, [cart?.items]);

  useEffect(() => {
    if (selectedItemIds.length === 0) {
      dispatch(clearCalculation());
      return;
    }

    dispatch(
      calculateDiscounts(selectedItemIds)
    );
  }, [
    dispatch,
    selectedItemIds,
  ]);

  const formatAttributes = (attrs) => {
    if (
      !attrs ||
      Object.keys(attrs).length === 0
    ) {
      return null;
    }

    return Object.entries(attrs)
      .map(
        ([name, value]) =>
          `${name}: ${value}`
      )
      .join(', ');
  };

  if (
    loading &&
    cart.items.length === 0
  ) {
    return (
      <p className="loading-text">
        Загрузка...
      </p>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <p className="empty-text">
          Корзина пуста
        </p>

        <Link
          to="/"
          className="btn btn-primary"
        >
          Перейти к покупкам
        </Link>
      </div>
    );
  }

  const sortedCartItems = [
    ...cart.items,
  ].sort((a, b) => a.id - b.id);

  const availableItems =
    sortedCartItems.filter(
      (item) =>
        !isItemOutOfStock(item)
    );

  const allAvailableSelected =
    availableItems.length > 0 &&
    availableItems.every(
      (item) =>
        selectedItemIds.includes(
          item.id
        )
    );

  const selectedItems =
    sortedCartItems.filter(
      (item) =>
        selectedItemIds.includes(
          item.id
        )
    );

  const selectedSubtotal =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total_price || 0
        ),
      0
    );

  const discountTotal = Number(
    calculation?.discount_total || 0
  );

  const checkoutTotal =
    calculation?.total !== undefined
      ? Number(calculation.total)
      : selectedSubtotal;

  const toggleItem = (item) => {
    if (isItemOutOfStock(item)) {
      return;
    }

    setSelectedItemIds(
      (currentIds) => {
        if (
          currentIds.includes(item.id)
        ) {
          return currentIds.filter(
            (id) => id !== item.id
          );
        }

        return [
          ...currentIds,
          item.id,
        ];
      }
    );
  };

  const toggleAllAvailable = () => {
    if (allAvailableSelected) {
      setSelectedItemIds([]);
      return;
    }

    setSelectedItemIds(
      availableItems.map(
        (item) => item.id
      )
    );
  };

  const handleCheckout = () => {
    if (
      selectedItemIds.length === 0
    ) {
      return;
    }

    navigate('/checkout', {
      state: {
        selectedItemIds,
      },
    });
  };

  return (
    <div className="cart-page">
      <h1>Корзина</h1>

      {availableItems.length > 0 && (
        <div className="cart-select-all">
          <label>
            <input
              type="checkbox"
              checked={
                allAvailableSelected
              }
              onChange={
                toggleAllAvailable
              }
            />

            {allAvailableSelected
              ? 'Снять выбор'
              : 'Выбрать все доступные'}
          </label>
        </div>
      )}

      <div className="cart-items">
        {sortedCartItems.map(
          (item) => {
            const attrString =
              formatAttributes(
                item.selected_attributes
              );

            const maxStock =
              getMaxStock(item);

            const outOfStock =
              isItemOutOfStock(item);

            const isSelected =
              selectedItemIds.includes(
                item.id
              );

            const unitPrice =
              getUnitPrice(item);

            return (
              <div
                key={item.id}
                className={`cart-item ${
                  outOfStock
                    ? 'out-of-stock'
                    : ''
                } ${
                  isSelected
                    ? 'selected'
                    : ''
                }`}
              >
                <div className="cart-item-select">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={
                      outOfStock
                    }
                    onChange={() =>
                      toggleItem(item)
                    }
                    aria-label={`Выбрать ${item.product.name}`}
                  />
                </div>

                <Link
                  to={`/products/${item.product.slug}`}
                  className="cart-item-image"
                >
                  {item.product.thumbnail ? (
                    <img
                      src={
                        item.product
                          .thumbnail
                      }
                      alt={
                        item.product.name
                      }
                    />
                  ) : (
                    <div className="product-card-no-image">
                      Нет фото
                    </div>
                  )}
                </Link>

                <div className="cart-item-info">
                  <Link
                    to={`/products/${item.product.slug}`}
                    className="cart-item-name"
                  >
                    {item.product.name}
                  </Link>

                  <p className="cart-item-price">
                    {unitPrice.toFixed(2)} ₽
                  </p>

                  {attrString && (
                    <p className="cart-item-attributes">
                      {attrString}
                    </p>
                  )}

                  {outOfStock && (
                    <p className="cart-item-stock-error">
                      Нет в наличии
                    </p>
                  )}
                </div>

                <CartQuantityControl
                  productId={
                    item.product.id
                  }
                  quantity={
                    item.quantity
                  }
                  maxStock={
                    maxStock
                  }
                  selectedAttributes={
                    item.selected_attributes ||
                    {}
                  }
                />

                <p className="cart-item-total">
                  {Number(
                    item.total_price || 0
                  ).toFixed(2)}{' '}
                  ₽
                </p>

                <RemoveFromCartButton
                  productId={
                    item.product.id
                  }
                  selectedAttributes={
                    item.selected_attributes ||
                    {}
                  }
                />
              </div>
            );
          }
        )}
      </div>

      <div className="cart-summary">
        <button
          className="btn btn-outline"
          onClick={() =>
            dispatch(clearCart())
          }
        >
          Очистить корзину
        </button>

        <div className="cart-total">
          <div>
            <span>Товары:</span>

            <strong>
              {calculation
                ? Number(
                    calculation.subtotal
                  ).toFixed(2)
                : selectedSubtotal.toFixed(
                    2
                  )}{' '}
              ₽
            </strong>
          </div>

          {discountTotal > 0 && (
            <div className="cart-discount">
              <span>Скидка:</span>

              <strong>
                −
                {discountTotal.toFixed(
                  2
                )}{' '}
                ₽
              </strong>
            </div>
          )}

          <div>
            <span>
              К оформлению:
            </span>

            <strong>
              {checkoutTotal.toFixed(
                2
              )}{' '}
              ₽
            </strong>
          </div>
        </div>

        <button
          className="btn btn-primary checkout-btn"
          onClick={
            handleCheckout
          }
          disabled={
            selectedItemIds.length ===
              0 ||
            discountLoading
          }
        >
          Оформить выбранные
        </button>
      </div>
    </div>
  );
}

export default CartPage;