import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchManagerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../features/products/productsSlice';
import {
  fetchCategories,
  createCategory,
  deleteCategory,
} from '../features/categories/categoriesSlice';
import useDebounce from '../hooks/useDebounce';
import ManagerProductForm from './manager-products/ManagerProductForm';
import ManagerProductFilters from './manager-products/ManagerProductFilters';
import ManagerProductList from './manager-products/ManagerProductList';
import ManagerCategorySidebar from './manager-products/ManagerCategorySidebar';
import ManagerDiscounts from './manager-products/ManagerDiscounts';

function ManagerProductsPage() {
  const dispatch = useDispatch();

  const { data: profile } = useSelector(
    (state) => state.profile
  );

  const {
    managerList: products,
    managerNext,
  } = useSelector(
    (state) => state.products
  );

  const {
    list: categories,
  } = useSelector(
    (state) => state.categories
  );

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    available: true,
  });

  const [attributes, setAttributes] =
    useState([]);

  const [imageFile, setImageFile] =
    useState(null);

  const [galleryFiles, setGalleryFiles] =
    useState([]);

  const [newCategoryName, setNewCategoryName] =
    useState('');

  const [newCategoryParent, setNewCategoryParent] =
    useState('');

  const [expandedCategories, setExpandedCategories] =
    useState({});

  const [listSearch, setListSearch] =
    useState('');

  const [listSort, setListSort] =
    useState('');

  const [listCategory, setListCategory] =
    useState('');

  const [page, setPage] =
    useState(1);

  const debouncedSearch = useDebounce(
    listSearch,
    400
  );

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(fetchCategories());
    }
  }, [dispatch, profile]);

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(
        fetchManagerProducts({
          category: listCategory,
          search: debouncedSearch,
          ordering: listSort,
          page,
        })
      );
    }
  }, [
    dispatch,
    profile,
    debouncedSearch,
    listSort,
    listCategory,
    page,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    listSort,
    listCategory,
  ]);

  const childrenByParent =
    categories.reduce(
      (acc, category) => {
        const parentId =
          category.parent ?? null;

        if (!acc[parentId]) {
          acc[parentId] = [];
        }

        acc[parentId].push(category);

        return acc;
      },
      {}
    );

  const orderedCategories = [];

  const addCategoriesRecursively = (
    parentId = null,
    level = 0
  ) => {
    const children =
      childrenByParent[parentId] || [];

    children.forEach((category) => {
      orderedCategories.push({
        ...category,
        level,
      });

      addCategoriesRecursively(
        category.id,
        level + 1
      );
    });
  };

  addCategoriesRecursively();

  const toggleCategory = (
    categoryId
  ) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]:
        !prev[categoryId],
    }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      slug: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      available: true,
    });

    setAttributes([]);
    setImageFile(null);
    setGalleryFiles([]);
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);

    setForm({
      name: product.name,
      slug: product.slug,
      description:
        product.description || '',
      price: product.price,
      stock: product.stock,
      category:
        product.category?.id || '',
      available: product.in_stock,
    });

    setAttributes(
      product.attributes || []
    );
  };

  const buildFormData = () => {
    const formData = new FormData();

    formData.append(
      'name',
      form.name
    );

    formData.append(
      'slug',
      form.slug
    );

    formData.append(
      'description',
      form.description
    );

    formData.append(
      'price',
      form.price
    );

    formData.append(
      'stock',
      form.stock
    );

    formData.append(
      'category',
      form.category
    );

    formData.append(
      'available',
      form.available
    );

    if (imageFile) {
      formData.append(
        'image',
        imageFile
      );
    }

    galleryFiles.forEach((file) => {
      formData.append(
        'gallery_images',
        file
      );
    });

    formData.append(
      'attributes',
      JSON.stringify(attributes)
    );

    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData =
      buildFormData();

    if (editingProduct) {
      await dispatch(
        updateProduct({
          slug: editingProduct.slug,
          formData,
        })
      );
    } else {
      await dispatch(
        createProduct(formData)
      );
    }

    resetForm();

    dispatch(
      fetchManagerProducts({
        category: listCategory,
        search: debouncedSearch,
        ordering: listSort,
        page,
      })
    );
  };

  const handleDelete = async (
    slug
  ) => {
    if (
      window.confirm(
        'Удалить товар?'
      )
    ) {
      await dispatch(
        deleteProduct(slug)
      );
    }
  };

  const handleAddCategory = async (
    e
  ) => {
    e.preventDefault();

    const name =
      newCategoryName.trim();

    if (!name) {
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-');

    await dispatch(
      createCategory({
        name,
        slug,
        parent:
          newCategoryParent
            ? Number(
                newCategoryParent
              )
            : null,
      })
    );

    setNewCategoryName('');
    setNewCategoryParent('');
  };

  const handleDeleteCategory =
    async (slug) => {
      if (
        !window.confirm(
          'Удалить категорию?'
        )
      ) {
        return;
      }

      const result =
        await dispatch(
          deleteCategory(slug)
        );

      if (
        deleteCategory.rejected.match(
          result
        )
      ) {
        alert(
          result.payload ||
            'Не удалось удалить категорию'
        );
      }
    };

  if (!profile?.is_manager) {
    return (
      <div className="manager-chat-page-denied">
        <p className="empty-text">
          Доступ только для менеджеров
        </p>

        <Link
          to="/manager/login"
          className="btn btn-primary"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="manager-products-page">
      <div className="manager-products-main">
        <div className="manager-section-header">
          <h1>Товары</h1>
        </div>

        <ManagerProductForm
          editingProduct={
            editingProduct
          }
          form={form}
          setForm={setForm}
          attributes={attributes}
          setAttributes={
            setAttributes
          }
          imageFile={imageFile}
          setImageFile={
            setImageFile
          }
          galleryFiles={
            galleryFiles
          }
          setGalleryFiles={
            setGalleryFiles
          }
          orderedCategories={
            orderedCategories
          }
          onSubmit={handleSubmit}
          onReset={resetForm}
        />

        {editingProduct && (
          <ManagerDiscounts
            product={editingProduct}
          />
        )}

        <ManagerProductFilters
          listSearch={listSearch}
          setListSearch={
            setListSearch
          }
          listSort={listSort}
          setListSort={
            setListSort
          }
          listCategory={
            listCategory
          }
          setListCategory={
            setListCategory
          }
          orderedCategories={
            orderedCategories
          }
        />

        <ManagerProductList
          products={products}
          managerNext={
            managerNext
          }
          onEdit={handleEdit}
          onDelete={
            handleDelete
          }
          onLoadMore={() =>
            setPage(
              page + 1
            )
          }
        />
      </div>

      <ManagerCategorySidebar
        categories={categories}
        orderedCategories={
          orderedCategories
        }
        newCategoryName={
          newCategoryName
        }
        setNewCategoryName={
          setNewCategoryName
        }
        newCategoryParent={
          newCategoryParent
        }
        setNewCategoryParent={
          setNewCategoryParent
        }
        onAddCategory={
          handleAddCategory
        }
        childrenByParent={
          childrenByParent
        }
        expandedCategories={
          expandedCategories
        }
        onToggleCategory={
          toggleCategory
        }
        onDeleteCategory={
          handleDeleteCategory
        }
      />
    </div>
  );
}

export default ManagerProductsPage;