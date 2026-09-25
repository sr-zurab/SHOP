import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart } from '../features/cart/cartSlice';
import {
  createOrder,
  resetLastCreated,
} from '../features/orders/ordersSlice';
import {
  calculateDiscounts,
} from '../features/discounts/discountsSlice';

function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: cart, loading: cartLoading } = useSelector(
    (state) => state.cart
  );

  const { loading, error, lastCreated } = useSelector(
    (state) => state.orders
  );

  const {
    calculation: discountCalculation,
    loading: discountLoading,
    error: discountError,
  } = useSelector(
    (state) => state.discounts
  );

  const { isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [form, setForm] = useState({
    delivery_method: 'courier',
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  const selectedItemIds =
    location.state?.selectedItemIds || [];

  useEffect(() => {
    dispatch(resetLastCreated());
    dispatch(fetchCart());
  }, [dispatch]);

  useEffect(() => {
    if (
      cartLoading ||
      selectedItemIds.length === 0
    ) {
      return;
    }

    dispatch(
      calculateDiscounts(selectedItemIds)
    );
  }, [
    dispatch,
    cartLoading,
    selectedItemIds,
  ]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const selectedItems = useMemo(() => {
    if (!cart?.items) {
      return [];
    }

    return cart.items.filter((item) =>
      selectedItemIds.includes(item.id)
    );
  }, [cart?.items, selectedItemIds]);

  const selectedTotal = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) =>
        sum + Number(item.total_price || 0),
      0
    );
  }, [selectedItems]);

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

  const getItemStock = (item) => {
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

  const isItemUnavailable = (item) => {
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

    const stock = getItemStock(item);

    return stock < item.quantity;
  };

  const hasUnavailableItems =
    selectedItems.some(
      (item) =>
        isItemUnavailable(item)
    );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      selectedItemIds.length === 0
    ) {
      return;
    }

    if (
      selectedItems.length !==
      selectedItemIds.length
    ) {
      return;
    }

    if (hasUnavailableItems) {
      return;
    }

    const result = await dispatch(
      createOrder({
        ...form,
        selected_item_ids:
          selectedItemIds,
      })
    );

    if (
      createOrder.fulfilled.match(
        result
      )
    ) {
      dispatch(fetchCart());
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="checkout-page">
        <p className="empty-text">
          Оформление заказа доступно только для авторизованных пользователей
        </p>

        <Link
          to="/cart"
          className="btn btn-primary"
        >
          Вернуться в корзину
        </Link>
      </div>
    );
  }

  if (lastCreated) {
    return (
      <div className="checkout-page checkout-success">
        <h1>Заказ оформлен!</h1>

        <p>
          Номер заказа: #{lastCreated.id}
        </p>

        <p>
          Сумма: {lastCreated.total_price} ₽
        </p>

        <Link
          to="/orders"
          className="btn btn-primary"
        >
          Мои заказы
        </Link>
      </div>
    );
  }

  if (
    !cartLoading &&
    selectedItemIds.length === 0
  ) {
    return (
      <div className="checkout-page">
        <p className="empty-text">
          Не выбраны товары для оформления
        </p>

        <Link
          to="/cart"
          className="btn btn-primary"
        >
          Вернуться в корзину
        </Link>
      </div>
    );
  }

  if (
    !cartLoading &&
    selectedItems.length === 0
  ) {
    return (
      <div className="checkout-page">
        <p className="empty-text">
          Выбранные товары больше не находятся в корзине
        </p>

        <Link
          to="/cart"
          className="btn btn-primary"
        >
          Вернуться в корзину
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Оформление заказа</h1>

      <div className="checkout-content">
        <form
          className="checkout-form"
          onSubmit={handleSubmit}
        >
          <div className="delivery-method-selector">
            <label
              className={`delivery-option ${
                form.delivery_method ===
                'courier'
                  ? 'active'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="delivery_method"
                value="courier"
                checked={
                  form.delivery_method ===
                  'courier'
                }
                onChange={handleChange}
              />
              Курьером
            </label>

            <label
              className={`delivery-option ${
                form.delivery_method ===
                'pickup'
                  ? 'active'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="delivery_method"
                value="pickup"
                checked={
                  form.delivery_method ===
                  'pickup'
                }
                onChange={handleChange}
              />
              Самовывоз
            </label>
          </div>

          <label>
            Имя и фамилия
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Телефон
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </label>

          {form.delivery_method ===
            'courier' && (
            <label>
              Адрес доставки
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </label>
          )}

          {hasUnavailableItems && (
            <p className="auth-error">
              Один или несколько выбранных товаров больше недоступны в нужном количестве. Вернитесь в корзину и обновите выбор.
            </p>
          )}

          {discountError && (
            <p className="auth-error">
              {discountError}
            </p>
          )}

          {error && (
            <p className="auth-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              loading ||
              cartLoading ||
              hasUnavailableItems ||
              selectedItems.length !==
                selectedItemIds.length
            }
          >
            {loading
              ? 'Оформляем...'
              : 'Подтвердить заказ'}
          </button>
        </form>

        <div className="checkout-summary">
          <h2>Ваш заказ</h2>

          {selectedItems.map((item) => {
            const attributes =
              item.selected_attributes ||
              {};

            const attributeString =
              Object.keys(attributes)
                .length > 0
                ? Object.entries(
                    attributes
                  )
                    .map(
                      ([name, value]) =>
                        `${name}: ${value}`
                    )
                    .join(', ')
                : null;

            const itemStock =
              getItemStock(item);

            const unavailable =
              isItemUnavailable(item);

            return (
              <div
                key={item.id}
                className={`checkout-summary-item ${
                  unavailable
                    ? 'out-of-stock'
                    : ''
                }`}
              >
                <div>
                  <span>
                    {item.product.name} ×{' '}
                    {item.quantity}
                  </span>

                  {attributeString && (
                    <small>
                      {attributeString}
                    </small>
                  )}

                  {unavailable && (
                    <small>
                      Нет в наличии
                    </small>
                  )}
                </div>

                <span>
                  {item.total_price} ₽
                </span>
              </div>
            );
          })}

          {discountCalculation &&
          !discountLoading ? (
            <>
              <div className="checkout-summary-total">
                <span>Товары:</span>

                <span>
                  {
                    discountCalculation.subtotal
                  }{' '}
                  ₽
                </span>
              </div>

              <div className="checkout-summary-total">
                <span>Скидка:</span>

                <span>
                  −
                  {
                    discountCalculation.discount_total
                  }{' '}
                  ₽
                </span>
              </div>

              <div className="checkout-summary-total">
                <span>Итого:</span>

                <strong>
                  {
                    discountCalculation.total
                  }{' '}
                  ₽
                </strong>
              </div>
            </>
          ) : (
            <div className="checkout-summary-total">
              <span>Итого:</span>

              <strong>
                {discountLoading
                  ? 'Расчёт...'
                  : `${selectedTotal.toFixed(
                      2
                    )} ₽`}
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;