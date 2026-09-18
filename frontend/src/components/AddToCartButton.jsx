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

  const { data: cart } = useSelector((state) => state.cart);

  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState({});

  const hasAttributes = product?.has_attributes;

  const attributeNames = Object.keys(
    attributeGroups || {}
  );


  /*
   * Все позиции этого товара в корзине.
   */
  const cartItemsForProduct = (
    cart?.items || []
  ).filter(
    (item) => item.product?.id === productId
  );


  /*
   * Только варианты с выбранными атрибутами.
   */
  const attributeCartItems =
    cartItemsForProduct.filter(
      (item) =>
        item.selected_attributes &&
        Object.keys(
          item.selected_attributes
        ).length > 0
    );


  /*
   * Добавление нового товара.
   */
  const handleAdd = async () => {
    /*
     * disabled означает только запрет
     * добавления НОВОЙ позиции.
     *
     * Уже находящаяся в корзине позиция
     * управляется отдельно.
     */
    if (disabled) {
      return;
    }

    /*
     * Товар с атрибутами —
     * открываем выбор варианта.
     */
    if (hasAttributes) {
      setSelected({});
      setShowModal(true);
      return;
    }


    /*
     * Товар без атрибутов.
     */
    if (!isFullySelected) {
      if (onAddToCart) {
        onAddToCart();
      }

      return;
    }


    setIsLoading(true);

    try {
      await dispatch(
        addItem({
          productId,
          quantity: 1,
          selectedAttributes,
        })
      ).unwrap();
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * Выбор значения атрибута.
   */
  const handleSelectAttribute = (
    name,
    value
  ) => {
    setSelected((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  /*
   * Проверяем, выбраны ли все группы
   * атрибутов.
   */
  const isSelectionComplete =
    attributeNames.length > 0 &&
    attributeNames.every(
      (name) =>
        selected[name] !== undefined
    );


  /*
   * Добавление выбранного варианта.
   */
  const handleConfirmAdd = async () => {
    if (
      !isSelectionComplete ||
      disabled
    ) {
      return;
    }

    setIsLoading(true);

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
      setIsLoading(false);
    }
  };


  /*
   * Изменение количества конкретной
   * позиции корзины.
   */
  const handleQuantityChange = async (
    item,
    newQuantity
  ) => {
    /*
     * При уменьшении ниже 1 —
     * удаляем позицию.
     */
    if (newQuantity < 1) {
      await dispatch(
        removeItem({
          productId,
          selectedAttributes:
            item.selected_attributes || {},
        })
      );

      return;
    }


    setIsLoading(true);

    try {
      await dispatch(
        updateQuantity({
          productId,
          quantity: newQuantity,
          selectedAttributes:
            item.selected_attributes || {},
        })
      ).unwrap();
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * =========================================================
   * ТОВАР БЕЗ АТРИБУТОВ
   * =========================================================
   */

  if (
    isInCart &&
    !hasAttributes
  ) {
    const quantity =
      typeof isInCart === 'object' &&
      isInCart !== null
        ? isInCart.quantity
        : (totalInCart || 1);


    /*
     * Для товара без атрибутов
     * остаток берём из product.stock.
     */
    const maxStock =
      typeof isInCart === 'object' &&
      isInCart !== null
        ? (
            isInCart.attribute_stock ??
            product?.stock ??
            999
          )
        : (
            product?.stock ??
            999
          );


    return (
      <QuantitySelector
        quantity={quantity}
        onIncrease={() =>
          handleQuantityChange(
            isInCart,
            quantity + 1
          )
        }
        onDecrease={() =>
          handleQuantityChange(
            isInCart,
            quantity - 1
          )
        }
        disabled={isLoading}
        increaseDisabled={
          quantity >= maxStock
        }
      />
    );
  }


  /*
   * =========================================================
   * ТОВАР С АТРИБУТАМИ
   *
   * ОДИН ВАРИАНТ В КОРЗИНЕ
   * =========================================================
   */

  if (
    hasAttributes &&
    attributeCartItems.length === 1
  ) {
    const cartItem =
      attributeCartItems[0];

    const quantity =
      cartItem.quantity;

    /*
     * Для атрибутного товара
     * используем ТОЛЬКО остаток
     * конкретного варианта.
     */
    const maxStock =
      cartItem.attribute_stock ?? 0;


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
        disabled={isLoading}
        increaseDisabled={
          quantity >= maxStock
        }
      />
    );
  }


  /*
   * =========================================================
   * ОБЩЕЕ КОЛИЧЕСТВО ВАРИАНТОВ
   * =========================================================
   */

  const totalQuantity =
    attributeCartItems.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );


  const hasVariantsInCart =
    hasAttributes &&
    attributeCartItems.length > 0;


  /*
   * =========================================================
   * НЕСКОЛЬКО ВАРИАНТОВ В КОРЗИНЕ
   * =========================================================
   */

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
          disabled={isLoading}
        >
          В корзине: {totalQuantity} шт.
        </button>


        {showModal && (
          <div
            className="attribute-modal-overlay"
            onClick={() => {
              if (!isLoading) {
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
                  disabled={isLoading}
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


                    /*
                     * Остаток конкретного
                     * варианта.
                     */
                    const maxStock =
                      item.attribute_stock ??
                      0;


                    return (
                      <div
                        key={item.id}
                        className="cart-variant-row"
                      >
                        <div className="cart-variant-info">
                          <div className="cart-variant-name">
                            {attributeText}
                          </div>

                          <div className="cart-variant-stock">
                            Остаток: {maxStock}
                          </div>
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
                            isLoading
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
                  disabled={isLoading}
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


  /*
   * =========================================================
   * НОВЫЙ ТОВАР С АТРИБУТАМИ
   * =========================================================
   */

  return (
    <>
      <button
        className="btn btn-primary add-to-cart-btn"
        onClick={handleAdd}
        disabled={
          disabled ||
          isLoading
        }
      >
        {isLoading
          ? 'Добавляем...'
          : disabled
            ? 'Нет в наличии'
            : hasVariantsInCart
              ? `В корзине: ${totalQuantity} шт.`
              : 'В корзину'}
      </button>


      {showModal && !disabled && (
        <div
          className="attribute-modal-overlay"
          onClick={() => {
            if (!isLoading) {
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
                disabled={isLoading}
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
                            !option.in_stock ||
                            option.stock <= 0;

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
                                isLoading
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
                disabled={isLoading}
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
                  isLoading
                }
              >
                {isLoading
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