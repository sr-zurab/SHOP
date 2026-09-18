import { useState, useEffect } from 'react';

function AttributeSelector({ groupedAttributes, onChange, selectedAttributes = {} }) {
  const [selected, setSelected] = useState(selectedAttributes);

  useEffect(() => {
    setSelected(selectedAttributes);
  }, [selectedAttributes]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  const handleSelect = (attrName, value, attrId, inStock) => {
    if (!inStock) return;
    setSelected((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  if (!groupedAttributes || Object.keys(groupedAttributes).length === 0) {
    return null;
  }

  return (
    <div className="attribute-selector">
      {Object.entries(groupedAttributes).map(([attrName, values]) => {
        const inStockValues = values.filter((v) => v.in_stock);
        const hasInStock = inStockValues.length > 0;
        const currentValue = selected[attrName];

        return (
          <div key={attrName} className={`attribute-group ${!hasInStock ? 'all-out-of-stock' : ''}`}>
            <label className="attribute-label">{attrName}</label>
            <div className="attribute-values" role="radiogroup" aria-label={attrName}>
              {values.map((attr) => (
                <button
                  key={attr.id}
                  type="button"
                  className={`attr-value-btn ${attr.in_stock ? '' : 'out-of-stock'} ${currentValue === attr.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(attrName, attr.value, attr.id, attr.in_stock)}
                  disabled={!attr.in_stock}
                  aria-pressed={currentValue === attr.value}
                  aria-disabled={!attr.in_stock}
                >
                  {attr.value}
                  {!attr.in_stock && <span className="attr-oos-badge">Нет в наличии</span>}
                </button>
              ))}
            </div>
            {!hasInStock && (
              <p className="attribute-oos-message">Все варианты недоступны</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AttributeSelector;