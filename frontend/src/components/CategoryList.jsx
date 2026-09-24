import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

function CategoryList({
  categories,
  activeSlug,
  onSelect,
}) {
  const [expanded, setExpanded] =
    useState({});

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

  const toggleCategory = (
    categoryId
  ) => {
    setExpanded((prev) => ({
      ...prev,
      [categoryId]:
        !prev[categoryId],
    }));
  };

  const renderCategories = (
    parentId = null
  ) => {
    const children =
      childrenByParent[parentId] ||
      [];

    return children.map(
      (category) => {
        const categoryChildren =
          childrenByParent[
            category.id
          ] || [];

        const hasChildren =
          categoryChildren.length > 0;

        const isExpanded =
          !!expanded[
            category.id
          ];

        return (
          <div
            key={category.id}
            className="category-tree-item"
          >
            <div className="category-item-row">
              {hasChildren ? (
                <button
                  type="button"
                  className="category-item-toggle"
                  onClick={() =>
                    toggleCategory(
                      category.id
                    )
                  }
                  aria-label={
                    isExpanded
                      ? `Свернуть ${category.name}`
                      : `Развернуть ${category.name}`
                  }
                  aria-expanded={
                    isExpanded
                  }
                >
                  {isExpanded ? (
                    <ChevronDown
                      size={16}
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                    />
                  )}
                </button>
              ) : (
                <span
                  className="category-item-toggle category-item-toggle-empty"
                  aria-hidden="true"
                />
              )}

              <button
                type="button"
                className={`category-item category-item-name ${
                  activeSlug ===
                  category.slug
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  onSelect(
                    category.slug
                  )
                }
              >
                {category.name}
              </button>
            </div>

            {hasChildren &&
              isExpanded && (
                <div className="category-children">
                  {renderCategories(
                    category.id
                  )}
                </div>
              )}
          </div>
        );
      }
    );
  };

  return (
    <div className="category-list-vertical">
      <button
        type="button"
        className={`category-item ${
          !activeSlug ? 'active' : ''
        }`}
        onClick={() => onSelect(null)}
      >
        Все товары
      </button>

      {renderCategories()}
    </div>
  );
}

export default CategoryList;