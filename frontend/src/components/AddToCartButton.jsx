import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  addItem,
  updateQuantity,
  removeItem,
} from '../features/cart/cartSlice';

import QuantitySelector from './QuantitySelector';

function AddToCartButton({
  productId,
  product,
  selectedAttributes = {},
  attributeGroups = {},
  isInCart,
  isFullySelected,
  onAddToCart,
  disabled,
  totalInCart,
}) {
  const dispatch = useDispatch();

  const { data: cart } = useSelector(
    (state) => state.cart
  );

  const [loadingItemId, setLoadingItemId] =
    useState(null);

  const [isAdding, setIsAdding] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const [selected, setSelected] =
    useState({});

  const hasAttributes =
    product?.has_attributes;

  const attributeNames = Object.keys(
    attributeGroups || {}
  );

  const productVariants = Array.isArray(
    product?.variants
  )
    ? product.variants
    : [];

  const hasAvailableVariant =
    hasAttributes &&
    productVariants.some(
      (variant) =>
        variant.available !== false &&
        Number(variant.stock) > 0
    );

  const effectiveDisabled =
    hasAttributes
      ? !hasAvailableVariant
      : disabled;

  const cartItemsForProduct = (
    cart?.items || []
  ).filter(
    (item) => item.product?.id === productId
  );

  const attributeCartItems =
    cartItemsForProduct.filter(
      (item) =>
        item.selected_attributes &&
        Object.keys(
          item.selected_attributes
        ).length > 0
    );

  const normalizeAttributes = (
    attributes = {}
  ) => {
    const normalized = {};

    Object.entries(attributes).forEach(
      ([name, value]) => {
        if (
          name === undefined ||
          name === null ||
          value === undefined ||
          value === null
        ) {
          return;
        }

        normalized[
          String(name).trim()
        ] = String(value).trim();
      }
    );

    return normalized;
  };

  const attributesMatch = (
    variantAttributes,
    selectedAttributes
  ) => {
    const variant =
      normalizeAttributes(
        variantAttributes
      );

    const selected =
      normalizeAttributes(
        selectedAttributes
      );

    return Object.entries(
      selected
    ).every(
      ([name, value]) =>
        variant[name] === value
    );
  };

  const findVariant = (
    attributes
  ) => {
    const normalized =
      normalizeAttributes(
        attributes
      );

    return (
      productVariants.find(
        (variant) => {
          const variantAttributes =
            normalizeAttributes(
              variant.attributes
            );

          const variantKeys =
            Object.keys(
              variantAttributes
            );

          const selectedKeys =
            Object.keys(
              normalized
            );

          if (
            variantKeys.length !==
            selectedKeys.length
          ) {
            return false;
          }

          return Object.entries(
            normalized
          ).every(
            ([name, value]) =>
              variantAttributes[
                name
              ] === value
          );
        }
      ) || null
    );
  };

  const getMatchingVariants = (
    attributes
  ) => {
    return productVariants.filter(
      (variant) =>
        attributesMatch(
          variant.attributes,
          attributes
        )
    );
  };

  const isOptionAvailable = (
    name,
    value
  ) => {
    const candidateSelection = {
      ...selected,
      [name]: value,
    };

    const matchingVariants =
      getMatchingVariants(
        candidateSelection
      );

    return matchingVariants.some(
      (variant) =>
        variant.available !== false &&
        Number(variant.stock) > 0
    );
  };

  const isSelectionComplete =
    attributeNames.length > 0 &&
    attributeNames.every(
      (name) =>
        selected[name] !== undefined
    );

  const selectedVariant =
    isSelectionComplete
      ? findVariant(selected)
      : null;

  const selectedVariantInStock =
    selectedVariant !== null &&
    selectedVariant.available !== false &&
    Number(selectedVariant.stock) > 0;

  const handleAdd = async () => {
    if (effectiveDisabled) {
      return;
    }

    if (hasAttributes) {
      setSelected({});
      setShowModal(true);
      return;
    }

    if (!isFullySelected) {
      if (onAddToCart) {
        onAddToCart();
      }

      return;
    }

    setIsAdding(true);

    try {
      await dispatch(
        addItem({
          productId,
          quantity: 1,
          selectedAttributes,
        })
      ).unwrap();
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelectAttribute = (
    name,
    value
  ) => {
    setSelected((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmAdd = async () => {
    if (
      !isSelectionComplete ||
      !selectedVariantInStock ||
      effectiveDisabled
    ) {
      return;
    }

    setIsAdding(true);

    try {
      await dispatch(
        addItem({
          productId,
          quantity: 1,
          selectedAttributes: selected,
        })
      ).unwrap();

      setShowModal(false);
      setSelected({});
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = async (
    item,
    newQuantity
  ) => {
    if (!item?.id) {
      return;
    }

    if (newQuantity < 1) {
      setLoadingItemId(item.id);

      try {
        await dispatch(
          removeItem({
            productId: item.product.id,
            selectedAttributes:
              item.selected_attributes || {},
          })
        ).unwrap();
      } finally {
        setLoadingItemId(null);
      }

      return;
    }

    setLoadingItemId(item.id);

    try {
      await dispatch(
        updateQuantity({
          productId: item.product.id,
          quantity: newQuantity,
          selectedAttributes:
            item.selected_attributes || {},
        })
      ).unwrap();
    } finally {
      setLoadingItemId(null);
    }
  };

  if (
    isInCart &&
    !hasAttributes
  ) {
    const cartItem =
      typeof isInCart === 'object' &&
      isInCart !== null
        ? isInCart
        : cartItemsForProduct[0];

    if (!cartItem) {
      return null;
    }

    const quantity =
      cartItem.quantity;

    const maxStock =
      cartItem.attribute_stock ??
      product?.stock ??
      0;

    const itemLoading =
      loadingItemId === cartItem.id;

    return (
      <QuantitySelector
        quantity={quantity}
        onIncrease={() =>
          handleQuantityChange(
            cartItem,
            quantity + 1
          )
        }
        onDecrease={() =>
          handleQuantityChange(
            cartItem,
            quantity - 1
          )
        }
        disabled={itemLoading}
        increaseDisabled={
          quantity >= maxStock
        }
      />
    );
  }

  if (
    hasAttributes &&
    attributeCartItems.length === 1
  ) {
    const cartItem =
      attributeCartItems[0];

    const quantity =
      cartItem.quantity;

    const maxStock =
      cartItem.attribute_stock ?? 0;

    const itemLoading =
      loadingItemId === cartItem.id;

    return (
      <QuantitySelector
        quantity={quantity}
        onIncrease={() =>
          handleQuantityChange(
            cartItem,
            quantity + 1
          )
        }
        onDecrease={() =>
          handleQuantityChange(
            cartItem,
            quantity - 1
          )
        }
        disabled={itemLoading}
        increaseDisabled={
          quantity >= maxStock
        }
      />
    );
  }

  const totalQuantity =
    attributeCartItems.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  const hasVariantsInCart =
    hasAttributes &&
    attributeCartItems.length > 0;

  if (
    hasAttributes &&
    attributeCartItems.length > 1
  ) {
    return (
      <>
        <button
          className="btn btn-primary add-to-cart-btn"
          onClick={() =>
            setShowModal(true)
          }
          disabled={isAdding}
        >
          В корзине: {totalQuantity} шт.
        </button>

        {showModal && (
          <div
            className="attribute-modal-overlay"
            onClick={() => {
              if (
                !isAdding &&
                !loadingItemId
              ) {
                setShowModal(false);
              }
            }}
          >
            <div
              className="attribute-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="attribute-modal-header">
                <h3>
                  Товары в корзине
                </h3>

                <button
                  type="button"
                  className="attribute-modal-close"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={
                    isAdding ||
                    loadingItemId !== null
                  }
                >
                  ×
                </button>
              </div>

              <div className="attribute-modal-body">
                {attributeCartItems.map(
                  (item) => {
                    const itemAttributes =
                      item.selected_attributes ||
                      {};

                    const attributeText =
                      Object.entries(
                        itemAttributes
                      )
                        .map(
                          ([name, value]) =>
                            `${name}: ${value}`
                        )
                        .join(', ');

                    const maxStock =
                      item.attribute_stock ?? 0;

                    const itemLoading =
                      loadingItemId ===
                      item.id;

                    return (
                      <div
                        key={item.id}
                        className={`cart-variant-row ${
                          maxStock <= 0
                            ? 'out-of-stock'
                            : ''
                        }`}
                      >
                        <div className="cart-variant-info">
                          <div className="cart-variant-name">
                            {attributeText}
                          </div>

                          <div className="cart-variant-stock">
                            Остаток: {maxStock}
                          </div>

                          {maxStock <= 0 && (
                            <div className="cart-variant-stock-error">
                              Нет в наличии
                            </div>
                          )}
                        </div>

                        <QuantitySelector
                          quantity={
                            item.quantity
                          }
                          onIncrease={() =>
                            handleQuantityChange(
                              item,
                              item.quantity + 1
                            )
                          }
                          onDecrease={() =>
                            handleQuantityChange(
                              item,
                              item.quantity - 1
                            )
                          }
                          disabled={
                            itemLoading
                          }
                          increaseDisabled={
                            item.quantity >=
                            maxStock
                          }
                        />
                      </div>
                    );
                  }
                )}
              </div>

              <div className="attribute-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={
                    isAdding ||
                    loadingItemId !== null
                  }
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        className="btn btn-primary add-to-cart-btn"
        onClick={handleAdd}
        disabled={
          effectiveDisabled ||
          isAdding
        }
      >
        {isAdding
          ? 'Добавляем...'
          : effectiveDisabled
            ? 'Нет в наличии'
            : hasVariantsInCart
              ? `В корзине: ${totalQuantity} шт.`
              : 'В корзину'}
      </button>

      {showModal && !effectiveDisabled && (
        <div
          className="attribute-modal-overlay"
          onClick={() => {
            if (!isAdding) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="attribute-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="attribute-modal-header">
              <h3>
                Выберите параметры
              </h3>

              <button
                type="button"
                className="attribute-modal-close"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={isAdding}
              >
                ×
              </button>
            </div>

            <div className="attribute-modal-body">
              {attributeNames.map(
                (name) => (
                  <div
                    key={name}
                    className="attribute-group"
                  >
                    <div className="attribute-group-name">
                      {name}
                    </div>

                    <div className="attribute-options">
                      {attributeGroups[
                        name
                      ].map(
                        (option) => {
                          const optionDisabled =
                            !option.available ||
                            !isOptionAvailable(
                              name,
                              option.value
                            );

                          const isSelected =
                            selected[name] ===
                            option.value;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={`attribute-option ${
                                isSelected
                                  ? 'selected'
                                  : ''
                              } ${
                                optionDisabled
                                  ? 'disabled'
                                  : ''
                              }`}
                              disabled={
                                optionDisabled ||
                                isAdding
                              }
                              onClick={() =>
                                handleSelectAttribute(
                                  name,
                                  option.value
                                )
                              }
                            >
                              {option.value}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="attribute-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={isAdding}
              >
                Отмена
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  handleConfirmAdd
                }
                disabled={
                  !isSelectionComplete ||
                  !selectedVariantInStock ||
                  isAdding
                }
              >
                {isAdding
                  ? 'Добавляем...'
                  : 'Добавить в корзину'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AddToCartButton;