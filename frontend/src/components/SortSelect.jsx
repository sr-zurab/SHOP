import { useState, useRef, useEffect } from 'react';
import { FiSliders, FiCheck } from 'react-icons/fi';

const OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'newest', label: 'Новинки' },
  { value: 'popular', label: 'Популярные' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
];

function SortSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className="sort-select" ref={containerRef}>
      <button
        type="button"
        className={`sort-select-toggle ${value ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Сортировка"
      >
        <FiSliders size={20} />
      </button>

      {open && (
        <div className="sort-select-menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`sort-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <FiCheck size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SortSelect;