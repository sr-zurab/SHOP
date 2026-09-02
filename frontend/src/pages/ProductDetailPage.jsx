import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductBySlug, clearCurrentProduct } from '../features/products/productsSlice';
import AddToCartButton from '../components/AddToCartButton';

function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { current: product, loading, error } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProductBySlug(slug));
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, slug]);

  if (loading) return <p className="loading-text">Загрузка...</p>;
  if (error) return <p className="empty-text">Товар не найден</p>;
  if (!product) return null;

  const mainImage = product.images?.[0]?.image || product.thumbnail;

  return (
    <div className="product-detail">
      <Link to="/" className="back-link">← Назад к товарам</Link>

      <div className="product-detail-content">
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            {mainImage ? (
              <img src={mainImage} alt={product.name} />
            ) : (
              <div className="product-card-no-image">Нет фото</div>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="product-detail-thumbnails">
              {product.images.map((img) => (
                <img key={img.id} src={img.thumbnail} alt={product.name} />
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-detail-price">{product.price} ₽</p>
          <p className={`product-detail-stock ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
            {product.in_stock ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
          </p>

          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          <AddToCartButton productId={product.id} disabled={!product.in_stock} />
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;