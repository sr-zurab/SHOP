import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../features/products/productsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { fetchCart } from '../features/cart/cartSlice';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import SortSelect from '../components/SortSelect';

function HomePage() {
  const dispatch = useDispatch();
  const { list: products, loading, next } = useSelector((state) => state.products);
  const { list: categories } = useSelector((state) => state.categories);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchCart());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProducts({ category: activeCategory, search, ordering, page }));
  }, [dispatch, activeCategory, search, ordering, page]);

  const handleCategorySelect = (slug) => {
    setActiveCategory(slug);
    setPage(1);
  };

  const handleSearch = useCallback((query) => {
    setSearch(query);
    setPage(1);
  }, []);

  const handleOrderingChange = (value) => {
    setOrdering(value);
    setPage(1);
  };

  return (
    <div className="home-page">
      <div className="home-toolbar">
        <SearchBar onSearch={handleSearch} />
        <SortSelect value={ordering} onChange={handleOrderingChange} />
      </div>

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
        <p className="empty-text">
          {search ? `По запросу «${search}» ничего не найдено` : 'Товары не найдены'}
        </p>
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