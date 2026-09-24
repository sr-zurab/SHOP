import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Edit2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  createManagerDiscount,
  deleteManagerDiscount,
  fetchManagerDiscounts,
  updateManagerDiscount,
} from '../../features/discounts/discountsSlice';

const initialForm = {
  name: '',
  description: '',
  discount_type: 'percent',
  value: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  priority: 0,
  is_stackable: false,
  max_discount_amount: '',
  usage_limit: '',
  usage_limit_per_user: '',
};

const toDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number) =>
    String(number).padStart(2, '0');

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
};

const discountToForm = (discount) => ({
  name: discount.name || '',
  description: discount.description || '',
  discount_type:
    discount.discount_type || 'percent',
  value: discount.value || '',
  status: discount.status || 'draft',
  starts_at: toDateTimeLocal(
    discount.starts_at
  ),
  ends_at: toDateTimeLocal(
    discount.ends_at
  ),
  priority: discount.priority ?? 0,
  is_stackable:
    Boolean(discount.is_stackable),
  max_discount_amount:
    discount.max_discount_amount ?? '',
  usage_limit:
    discount.usage_limit ?? '',
  usage_limit_per_user:
    discount.usage_limit_per_user ?? '',
});

function ManagerDiscounts({
  product,
}) {
  const dispatch = useDispatch();

  const {
    items: discounts,
    managerLoading,
    managerError,
  } = useSelector(
    (state) => state.discounts
  );

  const [editingDiscount, setEditingDiscount] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState(initialForm);

  useEffect(() => {
    dispatch(fetchManagerDiscounts());
  }, [dispatch]);

  const updateFormField = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingDiscount(null);
    setShowForm(false);
  };

  const handleNewDiscount = () => {
    setForm({
      ...initialForm,
    });

    setEditingDiscount(null);
    setShowForm(true);
  };

  const handleEditDiscount = (
    discount
  ) => {
    setForm(discountToForm(discount));
    setEditingDiscount(discount);
    setShowForm(true);
  };

  const buildDiscountData = () => {
    const data = {
      name: form.name,
      description: form.description,
      discount_type: form.discount_type,
      value: form.value,
      status: form.status,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      priority: Number(form.priority) || 0,
      is_stackable: form.is_stackable,
      products: [product.id],
    };

    if (form.max_discount_amount !== '') {
      data.max_discount_amount =
        form.max_discount_amount;
    } else {
      data.max_discount_amount = null;
    }

    if (form.usage_limit !== '') {
      data.usage_limit =
        Number(form.usage_limit);
    } else {
      data.usage_limit = null;
    }

    if (
      form.usage_limit_per_user !== ''
    ) {
      data.usage_limit_per_user =
        Number(form.usage_limit_per_user);
    } else {
      data.usage_limit_per_user = null;
    }

    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      form.discount_type === 'percent' &&
      Number(form.value) > 100
    ) {
      alert(
        'Процент скидки не может быть больше 100.'
      );
      return;
    }

    if (
      form.starts_at &&
      form.ends_at &&
      new Date(form.ends_at) <=
        new Date(form.starts_at)
    ) {
      alert(
        'Дата окончания должна быть позже даты начала.'
      );
      return;
    }

    const data = buildDiscountData();

    let result;

    if (editingDiscount) {
      result = await dispatch(
        updateManagerDiscount({
          id: editingDiscount.id,
          data,
        })
      );
    } else {
      result = await dispatch(
        createManagerDiscount(data)
      );
    }

    if (
      createManagerDiscount.fulfilled.match(
        result
      ) ||
      updateManagerDiscount.fulfilled.match(
        result
      )
    ) {
      resetForm();
    }
  };

  const handleToggleProduct = async (
    discount
  ) => {
    const currentProducts =
      Array.isArray(discount.products)
        ? discount.products
        : [];

    const isAttached =
      currentProducts.includes(
        product.id
      );

    const nextProducts = isAttached
      ? currentProducts.filter(
          (productId) =>
            productId !== product.id
        )
      : [
          ...currentProducts,
          product.id,
        ];

    await dispatch(
      updateManagerDiscount({
        id: discount.id,
        data: {
          products: nextProducts,
        },
      })
    );
  };

  const handleDeleteDiscount = async (
    discount
  ) => {
    if (
      !window.confirm(
        `Удалить скидку «${discount.name}»?`
      )
    ) {
      return;
    }

    const result = await dispatch(
      deleteManagerDiscount(discount.id)
    );

    if (
      deleteManagerDiscount.fulfilled.match(
        result
      ) &&
      editingDiscount?.id === discount.id
    ) {
      resetForm();
    }
  };

  const productDiscounts =
    discounts.filter(
      (discount) =>
        Array.isArray(
          discount.products
        ) &&
        discount.products.includes(
          product.id
        )
    );

  return (
    <div className="manager-discounts-section">
      <div className="manager-section-header">
        <h2>Скидки товара</h2>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleNewDiscount}
          disabled={managerLoading}
        >
          <Plus size={16} />
          Новая скидка
        </button>
      </div>

      {managerError && (
        <p className="error-text">
          {managerError}
        </p>
      )}

      {showForm && (
        <form
          className="manager-discount-form"
          onSubmit={handleSubmit}
        >
          <h3>
            {editingDiscount
              ? 'Редактировать скидку'
              : 'Новая скидка'}
          </h3>

          <div className="form-row">
            <input
              type="text"
              placeholder="Название"
              value={form.name}
              onChange={(e) =>
                updateFormField(
                  'name',
                  e.target.value
                )
              }
              required
            />

            <select
              value={form.discount_type}
              onChange={(e) =>
                updateFormField(
                  'discount_type',
                  e.target.value
                )
              }
            >
              <option value="percent">
                Процент
              </option>

              <option value="fixed">
                Фиксированная сумма
              </option>
            </select>
          </div>

          <textarea
            placeholder="Описание"
            value={form.description}
            onChange={(e) =>
              updateFormField(
                'description',
                e.target.value
              )
            }
          />

          <div className="form-row">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={
                form.discount_type ===
                'percent'
                  ? 'Процент'
                  : 'Сумма скидки'
              }
              value={form.value}
              onChange={(e) =>
                updateFormField(
                  'value',
                  e.target.value
                )
              }
              required
            />

            <select
              value={form.status}
              onChange={(e) =>
                updateFormField(
                  'status',
                  e.target.value
                )
              }
            >
              <option value="draft">
                Черновик
              </option>

              <option value="active">
                Активна
              </option>

              <option value="paused">
                Приостановлена
              </option>

              <option value="expired">
                Завершена
              </option>
            </select>
          </div>

          <div className="form-row">
            <label>
              Начало
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) =>
                  updateFormField(
                    'starts_at',
                    e.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Окончание
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) =>
                  updateFormField(
                    'ends_at',
                    e.target.value
                  )
                }
                required
              />
            </label>
          </div>

          <div className="form-row">
            <input
              type="number"
              min="0"
              placeholder="Приоритет"
              value={form.priority}
              onChange={(e) =>
                updateFormField(
                  'priority',
                  e.target.value
                )
              }
            />

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.is_stackable}
                onChange={(e) =>
                  updateFormField(
                    'is_stackable',
                    e.target.checked
                  )
                }
              />
              Можно совмещать
            </label>
          </div>

          <div className="form-row">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Максимальная скидка"
              value={
                form.max_discount_amount
              }
              onChange={(e) =>
                updateFormField(
                  'max_discount_amount',
                  e.target.value
                )
              }
            />

            <input
              type="number"
              min="0"
              placeholder="Лимит использований"
              value={form.usage_limit}
              onChange={(e) =>
                updateFormField(
                  'usage_limit',
                  e.target.value
                )
              }
            />
          </div>

          <input
            type="number"
            min="0"
            placeholder="Лимит на пользователя"
            value={
              form.usage_limit_per_user
            }
            onChange={(e) =>
              updateFormField(
                'usage_limit_per_user',
                e.target.value
              )
            }
          />

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={managerLoading}
            >
              <Save size={16} />
              {editingDiscount
                ? 'Сохранить'
                : 'Создать'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={resetForm}
              disabled={managerLoading}
            >
              <X size={16} />
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="manager-discounts-list">
        {productDiscounts.length === 0 && (
          <p className="empty-text">
            Для этого товара скидок нет
          </p>
        )}

        {productDiscounts.map(
          (discount) => (
            <div
              key={discount.id}
              className="manager-discount-row"
            >
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    handleToggleProduct(
                      discount
                    )
                  }
                  disabled={managerLoading}
                />

                <span>
                  {discount.name}
                </span>
              </label>

              <div className="manager-discount-info">
                <span>
                  {discount.discount_type ===
                  'percent'
                    ? `${discount.value}%`
                    : `${discount.value} ₽`}
                </span>

                <span>
                  {discount.status}
                </span>
              </div>

              <div className="manager-product-actions">
                <button
                  type="button"
                  onClick={() =>
                    handleEditDiscount(
                      discount
                    )
                  }
                  aria-label="Редактировать скидку"
                  disabled={managerLoading}
                >
                  <Edit2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteDiscount(
                      discount
                    )
                  }
                  aria-label="Удалить скидку"
                  disabled={managerLoading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default ManagerDiscounts;