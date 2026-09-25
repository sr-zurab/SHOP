import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProductBySlug,
  clearCurrentProduct,
} from '../features/products/productsSlice';
import {
  fetchReviews,
} from '../features/reviews/reviewsSlice';
import {
  fetchCart,
  addItem,
} from '../features/cart/cartSlice';
import AddToCartButton from '../components/AddToCartButton';
import AttributeSelector from '../components/AttributeSelector';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';

function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();

  const {
    current: product,
    loading,
    error,
  } = useSelector((state) => state.products);

  const { data: cart } = useSelector(
    (state) => state.cart
  );

  const { isAuthenticated } =
    useSelector((state) => state.auth);

  const [activeImage, setActiveImage] =
    useState(null);

  const [
    selectedAttributes,
    setSelectedAttributes,
  ] = useState({});

  const [showAttrModal, setShowAttrModal] =
    useState(false);

  useEffect(() => {
    dispatch(fetchProductBySlug(slug));

    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, slug]);

  useEffect(() => {
    if (product) {
      setActiveImage(
        product.main_image ||
          product.images?.[0]?.image ||
          product.thumbnail
      );

      dispatch(fetchReviews(product.id));
      dispatch(fetchCart());
    }
  }, [product, dispatch]);

  const findCartItem = (
    productId,
    attrs
  ) => {
    if (!cart?.items) {
      return null;
    }

    return cart.items.find(
      (item) =>
        item.product.id === productId &&
        JSON.stringify(
          item.selected_attributes || {}
        ) ===
          JSON.stringify(attrs || {})
    );
  };

  const isInCart =
    product &&
    findCartItem(
      product.id,
      selectedAttributes
    );

  const attributeNames =
    product?.grouped_attributes
      ? Object.keys(
          product.grouped_attributes
        )
      : [];

  const isFullySelected =
    attributeNames.length === 0 ||
    attributeNames.every(
      (name) =>
        selectedAttributes[name] !==
          undefined &&
        selectedAttributes[name] !==
          null &&
        selectedAttributes[name] !== ''
    );

  const productVariants =
    Array.isArray(product?.variants)
      ? product.variants
      : [];

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

  const findSelectedVariant = () => {
    if (!isFullySelected) {
      return null;
    }

    const selected =
      normalizeAttributes(
        selectedAttributes
      );

    return (
      productVariants.find(
        (variant) => {
          const attributes =
            normalizeAttributes(
              variant.attributes
            );

          const attributeKeys =
            Object.keys(attributes);

          const selectedKeys =
            Object.keys(selected);

          if (
            attributeKeys.length !==
            selectedKeys.length
          ) {
            return false;
          }

          return Object.entries(
            selected
          ).every(
            ([name, value]) =>
              attributes[name] === value
          );
        }
      ) || null
    );
  };

  const selectedVariant =
    findSelectedVariant();

  const selectedVariantInStock =
    !product?.has_attributes ||
    (
      selectedVariant !== null &&
      selectedVariant.available !== false &&
      Number(selectedVariant.stock) > 0
    );

  if (loading) {
    return (
      <p className="loading-text">
        Загрузка...
      </p>
    );
  }

  if (error) {
    return (
      <p className="empty-text">
        Товар не найден
      </p>
    );
  }

  if (!product) {
    return null;
  }

  const discount = product.discount;

  const availableVariants =
    productVariants.filter(
      (variant) =>
        variant.available !== false &&
        Number(variant.stock) > 0
    );

  const minVariantPrice =
    availableVariants.length > 0
      ? Math.min(
          ...availableVariants.map(
            (variant) =>
              Number(variant.price)
          )
        )
      : null;

  const displayPrice =
    product.has_attributes
      ? selectedVariant
        ? Number(selectedVariant.price)
        : minVariantPrice !== null
          ? minVariantPrice
          : Number(product.price)
      : Number(product.price);

  const isVariantPrice =
    product.has_attributes &&
    selectedVariant !== null;

  const hasPercentDiscount =
    discount?.type === 'percent' &&
    Number(discount.value || 0) > 0;

  const discountedPrice =
    displayPrice *
    (
      1 -
      Number(discount?.value || 0) / 100
    );

  const handleAddToCart = async () => {
    if (
      !isFullySelected ||
      !selectedVariantInStock
    ) {
      setShowAttrModal(true);
      return;
    }

    await dispatch(
      addItemWithAttrs()
    );

    setShowAttrModal(false);
  };

  const addItemWithAttrs = () => {
    return dispatch(
      addItem({
        productId: product.id,
        quantity: 1,
        selectedAttributes,
      })
    );
  };

  return (
    <div className="product-detail">
      <Link
        to="/"
        className="back-link"
      >
        ← Назад к товарам
      </Link>

      <div className="product-detail-content">
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
              />
            ) : (
              <div className="product-card-no-image">
                Нет фото
              </div>
            )}
          </div>

          {(product.main_image ||
            product.images?.length > 0) && (
            <div className="product-detail-thumbnails">
              {product.main_image && (
                <img
                  src={
                    product.thumbnail ||
                    product.main_image
                  }
                  alt={`${product.name} главная картинка`}
                  className={
                    activeImage ===
                    product.main_image
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setActiveImage(
                      product.main_image
                    )
                  }
                />
              )}

              {product.images.map(
                (img) => (
                  <img
                    key={img.id}
                    src={img.thumbnail}
                    alt={product.name}
                    className={
                      activeImage ===
                      img.image
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setActiveImage(
                        img.image
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>

          {product.average_rating && (
            <div className="product-rating-summary">
              <span className="rating-stars">
                {'★'.repeat(
                  Math.round(
                    product.average_rating
                  )
                )}
                {'☆'.repeat(
                  5 -
                    Math.round(
                      product.average_rating
                    )
                )}
              </span>

              <span className="rating-value">
                {product.average_rating}
              </span>

              <span className="rating-count">
                ({product.reviews_count}{' '}
                отзывов)
              </span>
            </div>
          )}

          {hasPercentDiscount ? (
            <div className="product-detail-price">
              {!isVariantPrice &&
                product.has_attributes && (
                  <span>от </span>
                )}

              <span className="product-detail-old-price">
                {displayPrice.toFixed(2)} ₽
              </span>

              <span className="product-detail-new-price">
                {discountedPrice.toFixed(2)} ₽
              </span>

              <span className="product-detail-discount">
                −{discount.value}%
              </span>
            </div>
          ) : (
            <p className="product-detail-price">
              {!isVariantPrice &&
                product.has_attributes && (
                  <span>от </span>
                )}

              {displayPrice.toFixed(2)} ₽
            </p>
          )}

          <p
            className={`product-detail-stock ${
              product.in_stock
                ? 'in-stock'
                : 'out-of-stock'
            }`}
          >
            {product.in_stock
              ? 'В наличии'
              : 'Нет в наличии'}
          </p>

          {product.description && (
            <p className="product-detail-description">
              {product.description}
            </p>
          )}

          {product.grouped_attributes &&
            Object.keys(
              product.grouped_attributes
            ).length > 0 && (
              <AttributeSelector
                groupedAttributes={
                  product.grouped_attributes
                }
                variants={
                  product.variants || []
                }
                onChange={
                  setSelectedAttributes
                }
                selectedAttributes={
                  selectedAttributes
                }
              />
            )}

          <AddToCartButton
            productId={product.id}
            product={product}
            selectedAttributes={
              selectedAttributes
            }
            attributeGroups={
              product.grouped_attributes || {}
            }
            isInCart={isInCart}
            isFullySelected={
              isFullySelected
            }
            onAddToCart={
              handleAddToCart
            }
            disabled={
              product.has_attributes
                ? !product.in_stock
                : !product.in_stock
            }
          />
        </div>
      </div>

      {showAttrModal && (
        <div
          className="attr-modal-overlay"
          onClick={() =>
            setShowAttrModal(false)
          }
        >
          <div
            className="attr-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3>
              Выберите параметры
            </h3>

            <AttributeSelector
              groupedAttributes={
                product.grouped_attributes
              }
              variants={
                product.variants || []
              }
              onChange={
                setSelectedAttributes
              }
              selectedAttributes={
                selectedAttributes
              }
            />

            <div className="attr-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() =>
                  setShowAttrModal(false)
                }
              >
                Отмена
              </button>

              <button
                className="btn btn-primary"
                onClick={() => {
                  if (
                    isFullySelected &&
                    selectedVariantInStock
                  ) {
                    addItemWithAttrs();
                    setShowAttrModal(false);
                  }
                }}
                disabled={
                  !isFullySelected ||
                  !selectedVariantInStock
                }
              >
                В корзину
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="product-reviews-section">
        <h2>Отзывы</h2>

        {isAuthenticated && (
          <ReviewForm
            productId={product.id}
          />
        )}

        <ReviewList />
      </div>
    </div>
  );
}

export default ProductDetailPage;