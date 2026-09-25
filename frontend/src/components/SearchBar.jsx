import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import useDebounce from '../hooks/useDebounce';

function SearchBar({ onSearch }) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const debouncedInput = useDebounce(input, 400);
  const inputRef = useRef(null);

  useEffect(() => {
    onSearch(debouncedInput.trim());
  }, [debouncedInput, onSearch]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  const handleToggle = () => {
    setExpanded((value) => !value);
  };

  const handleClear = () => {
    setInput('');
    setExpanded(false);
  };

  const handleBlur = () => {
    if (!input) {
      setExpanded(false);
    }
  };

  return (
    <div
      className={`search-bar ${
        expanded ? 'expanded' : ''
      }`}
    >
      <button
        type="button"
        className="search-bar-toggle"
        onClick={handleToggle}
        aria-label={
          expanded
            ? 'Закрыть поиск'
            : 'Открыть поиск'
        }
      >
        <FiSearch size={20} />
      </button>

      <input
        ref={inputRef}
        type="text"
        className="search-bar-input"
        placeholder="Поиск товаров..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={handleBlur}
      />

      {expanded && input && (
        <button
          type="button"
          className="search-bar-clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          aria-label="Очистить"
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;