import { Plus, X } from 'lucide-react';

function ManagerProductForm({
  editingProduct,
  form,
  setForm,
  attributes,
  setAttributes,
  imageFile,
  setImageFile,
  galleryFiles,
  setGalleryFiles,
  orderedCategories,
  onSubmit,
  onReset,
}) {
  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateAttribute = (index, field, value) => {
    setAttributes((prev) => {
      const newAttributes = [...prev];

      newAttributes[index] = {
        ...newAttributes[index],
        [field]: value,
      };

      return newAttributes;
    });
  };

  const removeAttribute = (index) => {
    setAttributes((prev) =>
      prev.filter(
        (_, attributeIndex) =>
          attributeIndex !== index
      )
    );
  };

  const addAttribute = () => {
    setAttributes((prev) => [
      ...prev,
      {
        name: '',
        value: '',
        stock: 0,
        available: true,
      },
    ]);
  };

  return (
    <form
      className="manager-product-form"
      onSubmit={onSubmit}
    >
      <h2>
        {editingProduct
          ? 'Редактировать товар'
          : 'Новый товар'}
      </h2>

      <div className="form-row">
        <input
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

        <input
          placeholder="Slug"
          value={form.slug}
          onChange={(e) =>
            updateFormField(
              'slug',
              e.target.value
            )
          }
          required
        />
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
          step="0.01"
          placeholder="Цена"
          value={form.price}
          onChange={(e) =>
            updateFormField(
              'price',
              e.target.value
            )
          }
          required
        />

        <input
          type="number"
          placeholder="Остаток"
          value={form.stock}
          onChange={(e) =>
            updateFormField(
              'stock',
              e.target.value
            )
          }
          required
        />
      </div>

      <div className="form-row">
        <select
          value={form.category}
          onChange={(e) =>
            updateFormField(
              'category',
              e.target.value
            )
          }
          required
        >
          <option value="">
            Категория
          </option>

          {orderedCategories.map(
            (category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {`${'— '.repeat(category.level)}${category.name}`}
              </option>
            )
          )}
        </select>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) =>
              updateFormField(
                'available',
                e.target.checked
              )
            }
          />
          В продаже
        </label>
      </div>

      <label>
        Главная картинка

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setImageFile(
              e.target.files?.[0] || null
            )
          }
        />
      </label>

      <label>
        Картинки галереи

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) =>
            setGalleryFiles(
              Array.from(
                e.target.files || []
              )
            )
          }
        />
      </label>

      <div className="manager-attributes-section">
        <h3>
          Атрибуты (цвет, размер и т.д.)
        </h3>

        {attributes.map(
          (attr, index) => (
            <div
              key={index}
              className="manager-attribute-row"
            >
              <input
                type="text"
                placeholder="Название (напр. Цвет)"
                value={attr.name}
                onChange={(e) =>
                  updateAttribute(
                    index,
                    'name',
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Значение (напр. Красный)"
                value={attr.value}
                onChange={(e) =>
                  updateAttribute(
                    index,
                    'value',
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                min="0"
                placeholder="Остаток"
                value={attr.stock}
                onChange={(e) =>
                  updateAttribute(
                    index,
                    'stock',
                    parseInt(
                      e.target.value,
                      10
                    ) || 0
                  )
                }
              />

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={attr.available}
                  onChange={(e) =>
                    updateAttribute(
                      index,
                      'available',
                      e.target.checked
                    )
                  }
                />
                В наличии
              </label>

              <button
                type="button"
                className="btn btn-remove"
                onClick={() =>
                  removeAttribute(index)
                }
                aria-label="Удалить атрибут"
              >
                <X size={16} />
              </button>
            </div>
          )
        )}

        {attributes.length === 0 && (
          <p className="empty-text manager-attributes-empty">
            Атрибутов нет
          </p>
        )}

        <button
          type="button"
          className="btn btn-outline"
          onClick={addAttribute}
        >
          <Plus size={16} />
          Добавить атрибут
        </button>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
        >
          {editingProduct
            ? 'Сохранить'
            : 'Добавить'}
        </button>

        {editingProduct && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={onReset}
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

export default ManagerProductForm;