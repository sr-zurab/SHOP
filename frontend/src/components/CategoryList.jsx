function CategoryList({ categories, activeSlug, onSelect }) {
  return (
    <div className="category-list">
      <button
        className={`category-chip ${!activeSlug ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        Все товары
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`category-chip ${activeSlug === cat.slug ? 'active' : ''}`}
          onClick={() => onSelect(cat.slug)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryList;