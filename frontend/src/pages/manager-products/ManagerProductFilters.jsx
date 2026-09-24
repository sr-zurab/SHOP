function ManagerProductFilters({
  listSearch,
  setListSearch,
  listSort,
  setListSort,
  listCategory,
  setListCategory,
  orderedCategories,
}) {
  return (
    <div className="manager-list-toolbar">
      <input
        className="manager-list-search"
        placeholder="Найти товар по названию..."
        value={listSearch}
        onChange={(e) =>
          setListSearch(e.target.value)
        }
      />

      <select
        className="manager-list-sort"
        value={listSort}
        onChange={(e) =>
          setListSort(e.target.value)
        }
      >
        <option value="">
          По названию
        </option>

        <option value="newest">
          Сначала новые
        </option>

        <option value="price_asc">
          Цена: сначала дешевле
        </option>

        <option value="price_desc">
          Цена: сначала дороже
        </option>
      </select>

      <select
        className="manager-list-category"
        value={listCategory}
        onChange={(e) =>
          setListCategory(e.target.value)
        }
      >
        <option value="">
          Все категории
        </option>

        {orderedCategories.map(
          (category) => (
            <option
              key={category.id}
              value={category.slug}
            >
              {`${'— '.repeat(
                category.level
              )}${category.name}`}
            </option>
          )
        )}
      </select>
    </div>
  );
}

export default ManagerProductFilters;