function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  disabled = false,
  increaseDisabled = false,
  decreaseDisabled = false,
}) {
  return (
    <div className="qty-selector">
      <button
        className="qty-btn"
        onClick={onDecrease}
        disabled={
          disabled ||
          decreaseDisabled ||
          quantity <= 0
        }
        aria-label="Уменьшить количество"
      >
        −
      </button>

      <span className="qty-value">
        {quantity}
      </span>

      <button
        className="qty-btn"
        onClick={onIncrease}
        disabled={
          disabled ||
          increaseDisabled
        }
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}

export default QuantitySelector;