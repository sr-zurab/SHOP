import { Plus, X } from 'lucide-react';

function ManagerProductForm({
  editingProduct,
  form,
  setForm,
  attributes,
  setAttributes,
  variants,
  setVariants,
  imageFile,
  setImageFile,
  galleryFiles,
  setGalleryFiles,
  orderedCategories,
  onSubmit,
  onReset,
}) {
  const updateFormField = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateAttribute = (
    index,
    field,
    value
  ) => {
    setAttributes((prev) => {
      const newAttributes = [
        ...prev,
      ];

      newAttributes[index] = {
        ...newAttributes[index],
        [field]: value,
      };

      return newAttributes;
    });
  };

  const removeAttribute = (
    index
  ) => {
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
        available: true,
      },
    ]);
  };

  const updateVariant = (
    index,
    field,
    value
  ) => {
    setVariants((prev) => {
      const newVariants = [
        ...prev,
      ];

      newVariants[index] = {
        ...newVariants[index],
        [field]: value,
      };

      return newVariants;
    });
  };

  const removeVariant = (
    index
  ) => {
    setVariants((prev) =>
      prev.filter(
        (_, variantIndex) =>
          variantIndex !== index
      )
    );
  };

  const getAttributeGroups =
    () => {
      const groups = {};

      attributes.forEach(
        (attribute) => {
          const name =
            attribute.name?.trim();
          const value =
            attribute.value?.trim();

          if (!name || !value) {
            return;
          }

          if (!groups[name]) {
            groups[name] = [];
          }

          if (
            !groups[name].some(
              (item) =>
                item.value === value
            )
          ) {
            groups[name].push({
              value,
              available:
                attribute.available !==
                false,
            });
          }
        }
      );

      return groups;
    };

  const generateCombinations =
    () => {
      const groups =
        getAttributeGroups();

      const groupNames =
        Object.keys(groups);

      if (
        groupNames.length === 0
      ) {
        setVariants([]);
        return;
      }

      const combinations = [
        {},
      ];

      groupNames.forEach(
        (name) => {
          const values =
            groups[name];

          const nextCombinations =
            [];

          combinations.forEach(
            (combination) => {
              values.forEach(
                (item) => {
                  nextCombinations.push(
                    {
                      ...combination,
                      [name]:
                        item.value,
                    }
                  );
                }
              );
            }
          );

          combinations.splice(
            0,
            combinations.length,
            ...nextCombinations
          );
        }
      );

      setVariants((previous) => {
        return combinations.map(
          (combination) => {
            const existing =
              previous.find(
                (variant) =>
                  JSON.stringify(
                    variant.attributes
                  ) ===
                  JSON.stringify(
                    combination
                  )
              );

            return {
              ...(existing?.id
                ? {
                    id: existing.id,
                  }
                : {}),
              attributes:
                combination,
              price:
                existing?.price ??
                form.price ??
                '',
              stock:
                existing?.stock ??
                0,
              available:
                existing?.available ??
                true,
            };
          }
        );
      });
    };

  const attributeGroups =
    getAttributeGroups();

  const hasVariants =
    variants.length > 0;

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
          placeholder="Цена товара"
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
          min="0"
          placeholder="Остаток товара"
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
                {`${'— '.repeat(
                  category.level
                )}${category.name}`}
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
              e.target.files?.[0] ||
                null
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
          Параметры товара
        </h3>

        <p className="manager-attributes-help">
          Здесь задаются доступные значения
          параметров. Остаток и цена задаются
          отдельно для каждого варианта ниже.
        </p>

        {attributes.map(
          (attr, index) => (
            <div
              key={
                attr.id ??
                `attribute-${index}`
              }
              className="manager-attribute-row"
            >
              <input
                type="text"
                placeholder="Название (например, Диагональ)"
                value={
                  attr.name
                }
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
                placeholder="Значение (например, 60'')"
                value={
                  attr.value
                }
                onChange={(e) =>
                  updateAttribute(
                    index,
                    'value',
                    e.target.value
                  )
                }
              />

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={
                    attr.available !==
                    false
                  }
                  onChange={(e) =>
                    updateAttribute(
                      index,
                      'available',
                      e.target.checked
                    )
                  }
                />
                Доступно
              </label>

              <button
                type="button"
                className="btn btn-remove"
                onClick={() =>
                  removeAttribute(
                    index
                  )
                }
                aria-label="Удалить параметр"
              >
                <X size={16} />
              </button>
            </div>
          )
        )}

        {attributes.length ===
          0 && (
          <p className="empty-text manager-attributes-empty">
            Параметров нет
          </p>
        )}

        <div className="manager-attributes-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={
              addAttribute
            }
          >
            <Plus size={16} />
            Добавить параметр
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={
              generateCombinations
            }
            disabled={
              Object.keys(
                attributeGroups
              ).length === 0
            }
          >
            <Plus size={16} />
            Сформировать варианты
          </button>
        </div>
      </div>

      <div className="manager-attributes-section">
        <h3>
          Варианты товара
        </h3>

        <p className="manager-attributes-help">
          Каждый вариант — конкретная комбинация
          параметров со своей ценой и остатком.
        </p>

        {!hasVariants && (
          <p className="empty-text manager-attributes-empty">
            Вариантов нет. Добавьте параметры и
            нажмите «Сформировать варианты».
          </p>
        )}

        {variants.map(
          (variant, index) => {
            const attributeText =
              Object.entries(
                variant.attributes ||
                  {}
              )
                .map(
                  ([name, value]) =>
                    `${name}: ${value}`
                )
                .join(', ');

            return (
              <div
                key={
                  variant.id ??
                  `variant-${index}`
                }
                className="manager-variant-row"
              >
                <div className="manager-variant-attributes">
                  {attributeText ||
                    'Без параметров'}
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Цена"
                  value={
                    variant.price
                  }
                  onChange={(e) =>
                    updateVariant(
                      index,
                      'price',
                      e.target.value
                    )
                  }
                  required
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Остаток"
                  value={
                    variant.stock
                  }
                  onChange={(e) =>
                    updateVariant(
                      index,
                      'stock',
                      parseInt(
                        e.target.value,
                        10
                      ) || 0
                    )
                  }
                  required
                />

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={
                      variant.available !==
                      false
                    }
                    onChange={(e) =>
                      updateVariant(
                        index,
                        'available',
                        e.target.checked
                      )
                    }
                  />
                  В продаже
                </label>

                <button
                  type="button"
                  className="btn btn-remove"
                  onClick={() =>
                    removeVariant(
                      index
                    )
                  }
                  aria-label="Удалить вариант"
                >
                  <X size={16} />
                </button>
              </div>
            );
          }
        )}
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