function CategoryList({ categories, activeSlug, onSelect }) {
  return (
    <div className="category-list-vertical">
      <button
        className={`category-item ${!activeSlug ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        Все товары
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`category-item ${activeSlug === cat.slug ? 'active' : ''}`}
          onClick={() => onSelect(cat.slug)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryList;