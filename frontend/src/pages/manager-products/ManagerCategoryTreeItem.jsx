import {
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';

function ManagerCategoryTreeItem({
  category,
  childrenByParent,
  expandedCategories,
  onToggle,
  onDelete,
}) {
  const children =
    childrenByParent[category.id] || [];

  const hasChildren =
    children.length > 0;

  const isExpanded =
    !!expandedCategories[category.id];

  return (
    <div
      className="manager-category-tree-item"
    >
      <div className="manager-category-item-row">
        {hasChildren ? (
          <button
            type="button"
            className="manager-category-toggle"
            onClick={() =>
              onToggle(category.id)
            }
            aria-label={
              isExpanded
                ? `Свернуть ${category.name}`
                : `Развернуть ${category.name}`
            }
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        ) : (
          <span
            className="manager-category-toggle manager-category-toggle-empty"
            aria-hidden="true"
          />
        )}

        <span className="manager-category-name">
          {category.name}
        </span>

        <button
          type="button"
          className="manager-category-delete"
          onClick={() =>
            onDelete(category.slug)
          }
          aria-label={`Удалить категорию ${category.name}`}
        >
          <X size={14} />
        </button>
      </div>

      {hasChildren &&
        isExpanded && (
          <div className="manager-category-children">
            {children.map(
              (child) => (
                <ManagerCategoryTreeItem
                  key={child.id}
                  category={child}
                  childrenByParent={
                    childrenByParent
                  }
                  expandedCategories={
                    expandedCategories
                  }
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              )
            )}
          </div>
        )}
    </div>
  );
}

export default ManagerCategoryTreeItem;