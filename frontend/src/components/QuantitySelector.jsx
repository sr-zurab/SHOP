function QuantitySelector({ quantity, onIncrease, onDecrease, disabled }) {
  return (
    <div className="qty-selector">
      <button
        className="qty-btn"
        onClick={onDecrease}
        disabled={disabled || quantity <= 0}
        aria-label="Уменьшить количество"
      >
        −
      </button>
      <span className="qty-value">{quantity}</span>
      <button
        className="qty-btn"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}

export default QuantitySelector;