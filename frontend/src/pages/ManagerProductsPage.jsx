import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchManagerProducts, createProduct, updateProduct, deleteProduct,
} from '../features/products/productsSlice';
import {
  fetchCategories, createCategory, deleteCategory,
} from '../features/categories/categoriesSlice';
import useDebounce from '../hooks/useDebounce';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

function ManagerProductsPage() {
  const dispatch = useDispatch();
  const { data: profile } = useSelector((state) => state.profile);
  const { managerList: products, managerNext } = useSelector((state) => state.products);
  const { list: categories } = useSelector((state) => state.categories);

  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', price: '', stock: '', category: '', available: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [listSearch, setListSearch] = useState('');
  const [listSort, setListSort] = useState('');
  const [listCategory, setListCategory] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(listSearch, 400);

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(fetchCategories());
    }
  }, [dispatch, profile]);

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(fetchManagerProducts({
        category: listCategory,
        search: debouncedSearch,
        ordering: listSort,
        page,
      }));
    }
  }, [dispatch, profile, debouncedSearch, listSort, listCategory, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listSort, listCategory]);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', price: '', stock: '', category: '', available: true });
    setImageFile(null);
    setGalleryFiles([]);
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      category: product.category?.id || '',
      available: product.in_stock,
    });
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('slug', form.slug);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('stock', form.stock);
    formData.append('category', form.category);
    formData.append('available', form.available);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    galleryFiles.forEach((file) => formData.append('gallery_images', file));
    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = buildFormData();

    if (editingProduct) {
      await dispatch(updateProduct({ slug: editingProduct.slug, formData }));
    } else {
      await dispatch(createProduct(formData));
    }
    resetForm();
    dispatch(fetchManagerProducts({
      category: listCategory,
      search: debouncedSearch,
      ordering: listSort,
      page,
    }));
  };

  const handleDelete = async (slug) => {
    if (window.confirm('Удалить товар?')) {
      await dispatch(deleteProduct(slug));
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
    await dispatch(createCategory({ name: newCategoryName.trim(), slug }));
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (slug) => {
    if (!window.confirm('Удалить категорию?')) return;
    const result = await dispatch(deleteCategory(slug));
    if (deleteCategory.rejected.match(result)) {
      alert(result.payload || 'Не удалось удалить категорию');
    }
  };

  if (!profile?.is_manager) {
    return (
      <div className="manager-chat-page-denied">
        <p className="empty-text">Доступ только для менеджеров</p>
        <Link to="/manager/login" className="btn btn-primary">Войти</Link>
      </div>
    );
  }

  return (
    <div className="manager-products-page">
      <div className="manager-products-main">
        <div className="manager-section-header">
          <h1>Товары</h1>
        </div>

        <form className="manager-product-form" onSubmit={handleSubmit}>
          <h2>{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h2>

          <div className="form-row">
            <input
              placeholder="Название"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>

          <textarea
            placeholder="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="form-row">
            <input
              type="number"
              step="0.01"
              placeholder="Цена"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Остаток"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="">Категория</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              В продаже
            </label>
          </div>

          <label>
            Главная картинка
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          </label>

          <label>
            Картинки галереи
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setGalleryFiles(Array.from(e.target.files))}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Сохранить' : 'Добавить'}
            </button>
            {editingProduct && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Отмена
              </button>
            )}
          </div>
        </form>

        <div className="manager-list-toolbar">
          <input
            className="manager-list-search"
            placeholder="Найти товар по названию..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
          <select
            className="manager-list-sort"
            value={listSort}
            onChange={(e) => setListSort(e.target.value)}
          >
            <option value="">По названию</option>
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Цена: сначала дешевле</option>
            <option value="price_desc">Цена: сначала дороже</option>
          </select>
          <select
            className="manager-list-category"
            value={listCategory}
            onChange={(e) => setListCategory(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </div>

        <div className="manager-products-list">
          {products.length === 0 && (
            <p className="empty-text">Ничего не найдено</p>
          )}
          {products.map((product) => (
            <div key={product.id} className="manager-product-row">
              {product.thumbnail ? (
                <img src={product.thumbnail} alt={product.name} />
              ) : (
                <div className="manager-product-no-image" />
              )}
              <div className="manager-product-info">
                <span className="manager-product-name">{product.name}</span>
                <span className="manager-product-meta">{product.price} ₽ · остаток: {product.stock}</span>
              </div>
              <div className="manager-product-actions">
                <button onClick={() => handleEdit(product)} aria-label="Редактировать">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(product.slug)} aria-label="Удалить">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {managerNext && (
          <button className="btn btn-outline load-more" onClick={() => setPage(page + 1)}>
            Показать ещё
          </button>
        )}
      </div>

      <div className="manager-products-sidebar">
        <h2>Категории</h2>

        <form className="manager-category-form" onSubmit={handleAddCategory}>
          <input
            placeholder="Новая категория"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button type="submit" aria-label="Добавить категорию">
            <Plus size={16} />
          </button>
        </form>

        <div className="manager-category-list">
          {categories.map((cat) => (
            <div key={cat.id} className="manager-category-item">
              <span>{cat.name}</span>
              <button onClick={() => handleDeleteCategory(cat.slug)} aria-label="Удалить категорию">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManagerProductsPage;