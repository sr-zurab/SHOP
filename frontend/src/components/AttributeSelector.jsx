import { useState, useEffect } from 'react';

function AttributeSelector({
  groupedAttributes,
  variants = [],
  onChange,
  selectedAttributes = {},
}) {
  const [selected, setSelected] =
    useState(selectedAttributes);

  useEffect(() => {
    setSelected(selectedAttributes);
  }, [selectedAttributes]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  const normalizeAttributes = (
    attributes = {}
  ) => {
    const normalized = {};

    Object.entries(attributes).forEach(
      ([name, value]) => {
        if (
          name === undefined ||
          name === null ||
          value === undefined ||
          value === null
        ) {
          return;
        }

        normalized[
          String(name).trim()
        ] = String(value).trim();
      }
    );

    return normalized;
  };

  const attributesMatch = (
    variantAttributes,
    selectedAttributes
  ) => {
    const variant =
      normalizeAttributes(
        variantAttributes
      );

    const selected =
      normalizeAttributes(
        selectedAttributes
      );

    return Object.entries(
      selected
    ).every(
      ([name, value]) =>
        variant[name] === value
    );
  };

  const getMatchingVariants = (
    attributes
  ) => {
    return variants.filter(
      (variant) =>
        attributesMatch(
          variant.attributes,
          attributes
        )
    );
  };

  const isOptionAvailable = (
    attrName,
    value
  ) => {
    const candidateSelection = {
      ...selected,
      [attrName]: value,
    };

    const matchingVariants =
      getMatchingVariants(
        candidateSelection
      );

    return matchingVariants.some(
      (variant) =>
        variant.available !== false &&
        Number(variant.stock) > 0
    );
  };

  const handleSelect = (
    attrName,
    value
  ) => {
    if (
      !isOptionAvailable(
        attrName,
        value
      )
    ) {
      return;
    }

    setSelected((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  if (
    !groupedAttributes ||
    Object.keys(groupedAttributes).length === 0
  ) {
    return null;
  }

  return (
    <div className="attribute-selector">
      {Object.entries(
        groupedAttributes
      ).map(
        ([attrName, values]) => {
          const availableValues =
            values.filter((value) =>
              isOptionAvailable(
                attrName,
                value.value
              )
            );

          const hasAvailable =
            availableValues.length > 0;

          const currentValue =
            selected[attrName];

          return (
            <div
              key={attrName}
              className={`attribute-group ${
                !hasAvailable
                  ? 'all-out-of-stock'
                  : ''
              }`}
            >
              <label className="attribute-label">
                {attrName}
              </label>

              <div
                className="attribute-values"
                role="radiogroup"
                aria-label={attrName}
              >
                {values.map(
                  (attr) => {
                    const optionAvailable =
                      isOptionAvailable(
                        attrName,
                        attr.value
                      );

                    const isSelected =
                      currentValue ===
                      attr.value;

                    return (
                      <button
                        key={attr.id}
                        type="button"
                        className={`attr-value-btn ${
                          optionAvailable
                            ? ''
                            : 'out-of-stock'
                        } ${
                          isSelected
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          handleSelect(
                            attrName,
                            attr.value
                          )
                        }
                        disabled={
                          !optionAvailable
                        }
                        aria-pressed={
                          isSelected
                        }
                        aria-disabled={
                          !optionAvailable
                        }
                      >
                        {attr.value}

                        {!optionAvailable && (
                          <span className="attr-oos-badge">
                            Нет в наличии
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {!hasAvailable && (
                <p className="attribute-oos-message">
                  Все варианты недоступны
                </p>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

export default AttributeSelector;