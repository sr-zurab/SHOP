import {
  Trash2,
  Edit2,
} from 'lucide-react';

function ManagerProductList({
  products,
  managerNext,
  onEdit,
  onDelete,
  onLoadMore,
}) {
  return (
    <>
      <div className="manager-products-list">
        {products.length === 0 && (
          <p className="empty-text">
            Ничего не найдено
          </p>
        )}

        {products.map((product) => (
          <div
            key={product.id}
            className="manager-product-row"
          >
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
              />
            ) : (
              <div className="manager-product-no-image" />
            )}

            <div className="manager-product-info">
              <span className="manager-product-name">
                {product.name}
              </span>

              <span className="manager-product-meta">
                {product.price} ₽ · остаток:{' '}
                {product.stock}
              </span>
            </div>

            <div className="manager-product-actions">
              <button
                type="button"
                onClick={() =>
                  onEdit(product)
                }
                aria-label="Редактировать"
              >
                <Edit2 size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  onDelete(product.slug)
                }
                aria-label="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {managerNext && (
        <button
          type="button"
          className="btn btn-outline load-more"
          onClick={onLoadMore}
        >
          Показать ещё
        </button>
      )}
    </>
  );
}

export default ManagerProductList;