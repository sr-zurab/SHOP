import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../features/products/productsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { fetchCart } from '../features/cart/cartSlice';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';

function HomePage() {
  const dispatch = useDispatch();
  const { list: products, loading, count, next } = useSelector((state) => state.products);
  const { list: categories } = useSelector((state) => state.categories);
  const [activeCategory, setActiveCategory] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchCart());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProducts({ category: activeCategory, page }));
  }, [dispatch, activeCategory, page]);

  const handleCategorySelect = (slug) => {
    setActiveCategory(slug);
    setPage(1);
  };

  return (
    <div className="home-page">
      <CategoryList
        categories={categories}
        activeSlug={activeCategory}
        onSelect={handleCategorySelect}
      />

      {loading && <p className="loading-text">Загрузка...</p>}

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <p className="empty-text">Товары не найдены</p>
      )}

      {next && (
        <button className="btn btn-outline load-more" onClick={() => setPage(page + 1)}>
          Показать ещё
        </button>
      )}
    </div>
  );
}

export default HomePage;