import ManagerCategoryTreeItem from './ManagerCategoryTreeItem';

function ManagerCategoryTree({
  categories,
  childrenByParent,
  expandedCategories,
  onToggle,
  onDelete,
}) {
  const rootCategories =
    childrenByParent[null] || [];

  if (categories.length === 0) {
    return null;
  }

  return (
    <>
      {rootCategories.map(
        (category) => (
          <ManagerCategoryTreeItem
            key={category.id}
            category={category}
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
    </>
  );
}

export default ManagerCategoryTree;