import React, { useState, useRef, useEffect } from 'react';


const CustomSelect = ({ options, placeholder, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const selectRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    setSelectedValue(option);
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  return (
    <div className="relative w-[200px] m-4" ref={selectRef}>

      <div
        className="flex items-center justify-between p-2  border border-gray-300 rounded-md cursor-pointer bg-white/50 backdrop-blur-md text-[var( --text-color)]  transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedValue ? selectedValue.label : placeholder || 'Selecciona una opción...'}
        </span>
        {/* Icono de flecha */}
        <svg
          className={`w-4 h-4 ml-2 transform ${isOpen ? 'rotate-180' : 'rotate-0'} transition-transform duration-200`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>


      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white/50 backdrop-blur-md border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="p-2 text-[var(--text-color)]">No hay opciones disponibles</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className={`p-2 cursor-pointer hover:bg-[var(--text-color)]/10 ${selectedValue && selectedValue.value === option.value ? 'bg-[var(--text-color)]/20 tex' : 'text-[var(--text-color)]'}`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


export default CustomSelect;