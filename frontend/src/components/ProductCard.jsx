import { Link } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <div className="product-card-image-wrap">
        <Link to={`/products/${product.slug}`} className="product-card-link">
          <div className="product-card-image">
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.name} loading="lazy" />
            ) : (
              <div className="product-card-no-image">Нет фото</div>
            )}
          </div>
        </Link>
        <WishlistButton productId={product.id} />
      </div>

      <Link to={`/products/${product.slug}`} className="product-card-link">
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-price">{product.price} ₽</p>
      </Link>

      <AddToCartButton productId={product.id} disabled={!product.in_stock} />
    </div>
  );
}

export default ProductCard;