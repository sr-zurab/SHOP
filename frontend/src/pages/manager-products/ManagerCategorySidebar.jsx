import { Plus } from 'lucide-react';
import ManagerCategoryTree from './ManagerCategoryTree';

function ManagerCategorySidebar({
  categories,
  orderedCategories,
  newCategoryName,
  setNewCategoryName,
  newCategoryParent,
  setNewCategoryParent,
  onAddCategory,
  childrenByParent,
  expandedCategories,
  onToggleCategory,
  onDeleteCategory,
}) {
  return (
    <div className="manager-products-sidebar">
      <h2>Категории</h2>

      <form
        className="manager-category-form"
        onSubmit={onAddCategory}
      >
        <input
          placeholder="Новая категория"
          value={newCategoryName}
          onChange={(e) =>
            setNewCategoryName(
              e.target.value
            )
          }
        />

        <select
          value={newCategoryParent}
          onChange={(e) =>
            setNewCategoryParent(
              e.target.value
            )
          }
        >
          <option value="">
            Без родительской категории
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

        <button
          type="submit"
          aria-label="Добавить категорию"
        >
          <Plus size={16} />
          Добавить категорию
        </button>
      </form>

      <div className="manager-category-list">
        <ManagerCategoryTree
          categories={categories}
          childrenByParent={
            childrenByParent
          }
          expandedCategories={
            expandedCategories
          }
          onToggle={
            onToggleCategory
          }
          onDelete={
            onDeleteCategory
          }
        />
      </div>
    </div>
  );
}

export default ManagerCategorySidebar;