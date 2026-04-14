import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Lógica compartida para determinar si el label debe estar arriba.
 * Verifica si el elemento del DOM tiene contenido.
 */
const checkElementHasValue = (el) => {
  if (!el) return false;
  const val = el.value;
  if (val === 0 || val === "0") return true;
  return val !== undefined && val !== null && val.toString().trim() !== "";
};

const Input = ({ label, type = 'text', name, defaultValue, value, onChange, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasContent, setHasContent] = useState(!!defaultValue || !!value || value === 0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setHasContent(!!value || value === 0);
    }
  }, [value]);

  const handleBlur = (e) => {
    setIsFocused(false);
    setHasContent(checkElementHasValue(e.target));
  };

  const handleInputChange = (e) => {
    setHasContent(checkElementHasValue(e.target));
    if (onChange) onChange(e);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className=' flex flex-col'>
      <div className="relative mt-2 mb-2 block group">
        <input
          ref={inputRef}
          type={inputType}
          name={name}
          defaultValue={defaultValue}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}

          autoComplete="off"
          {...props}
          className={`h-12 min-w-80 w-full bg-white text-gray-800 px-4 border rounded-xl outline-none transition-all duration-300
          autofill:shadow-[0_0_0_30px_white_inset]
          ${isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300'}`}
        />

        <label
          className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none
          bg-white 
          ${isFocused || hasContent
              ? '-top-2.5 text-[13px] text-blue-600 font-semibold z-10'
              : 'top-1/2 -translate-y-1/2 text-gray-400 text-base'}`}
        >
          {label}
        </label>


      </div>

      {type === 'password' && (
        <label className="relative flex items-center cursor-pointer group ml-1 text-white/50 backdrop-blur-lg">
          <input
            id="show-password-check"
            type="checkbox"
            className="peer sr-only"
            autoComplete="off"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
          />
          <div className="w-5 h-5 mt-2 rounded-lg border-2 border-blue-500 transition-all duration-300 ease-in-out peer-checked:bg-gradient-to-br from-blue-500 to-pink-500 peer-checked:border-0 peer-checked:rotate-12 after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-5 after:h-5 after:opacity-0 after:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSIyMCA2IDkgMTcgNCAxMiI+PC9wb2x5bGluZT48L3N2Zz4=')] after:bg-contain after:bg-no-repeat peer-checked:after:opacity-100 after:transition-opacity after:duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
          <span className="ml-3 mt-2 text-sm text-black font-medium ">{!showPassword ? 'Mostrar Contraseña' : 'Ocultar Contraseña'}</span>
        </label>
      )}
    </div>
  );
};

const InputNumber = ({ label, name, defaultValue, onChange, step = 1, min = 0 }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(!!defaultValue || defaultValue === 0);
  const inputRef = useRef(null);

  const handleBlur = (e) => {
    setIsFocused(false);
    setHasContent(checkElementHasValue(e.target));
  };

  const handleInputChange = (e) => {
    setHasContent(checkElementHasValue(e.target));
    if (onChange) onChange(e);
  };

  const handleStep = (increment) => {
    if (!inputRef.current) return;

    const currentValue = parseFloat(inputRef.current.value) || 0;
    const newValue = increment ? currentValue + step : currentValue - step;

    if (!increment && newValue < min) return;

    inputRef.current.value = newValue;
    setHasContent(true);

    if (onChange) {
      onChange({
        target: { name, value: newValue }
      });
    }
  };

  return (
    <div className="relative mt-2 mb-1 block min-w-80">
      <div className="relative flex items-center group">
        <button
          type="button"
          onClick={() => handleStep(false)}
          className="absolute left-2 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-90"
        >
          -
        </button>

        <input
          ref={inputRef}
          type="number"
          name={name}
          defaultValue={defaultValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className={`h-12 min-w-80 w-full  bg-white text-center px-10 border rounded-xl outline-none transition-all duration-300
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300'}`}
        />

        <button
          type="button"
          onClick={() => handleStep(true)}
          className="absolute right-2 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-90"
        >
          +
        </button>

        <label
          className={`absolute px-1 transition-all duration-300 pointer-events-none select-none bg-white
            ${isFocused || hasContent
              ? '-top-2.5 left-4 text-[13px] text-blue-600 font-semibold z-10'
              : 'top-1/2 -translate-y-1/2 left-10 text-gray-400 text-base'}`}
        >
          {label}
        </label>
      </div>
    </div>
  );
};

const TextArea = ({ label, name, defaultValue, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(!!defaultValue);
  const textareaRef = useRef(null);

  const handleBlur = (e) => {
    setIsFocused(false);
    setHasContent(checkElementHasValue(e.target));
  };

  const handleInputChange = (e) => {
    setHasContent(checkElementHasValue(e.target));
    if (onChange) onChange(e);
  };

  return (
    <div className="relative mt-2 mb-1 block">
      <textarea
        ref={textareaRef}
        name={name}
        defaultValue={defaultValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={`h-32 py-3 w-full min-w-80 bg-white text-gray-800 px-4 border rounded-xl outline-none transition-all duration-300 resize-none
          ${isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300'}`}
      />
      <label
        className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none bg-white
          ${isFocused || hasContent
            ? '-top-2.5 text-[13px] text-blue-600 font-semibold z-10'
            : 'top-3 text-gray-400 text-base'}`}
      >
        {label}
      </label>
    </div>
  );
};


const Select = ({
  label,
  options = [],
  name,
  defaultValue,
  value,
  onChange,
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1); // Rastrear navegación por teclado
  const [selectedOption, setSelectedOption] = useState(
    options.find(opt => opt.value === (value !== undefined ? value : defaultValue)) || null
  );

  useEffect(() => {
    if (value !== undefined) {
      setSelectedOption(options.find(opt => String(opt.value) === String(value)) || null);
    }
  }, [value, options]);

  const containerRef = useRef(null);
  const listRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, options]);

  // Manejo de teclado
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Auto-scroll para seguir el foco del teclado
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = (option) => {

    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: option.value } });
      console.log("Enviando al padre:", { name, value: option.value });
    }
  };

  const hasContent = !!selectedOption;

  return (
    <div
      className="relative mt-2 mb-2 block group"
      ref={containerRef}
      onKeyDown={handleKeyDown} // Capturar teclas en todo el contenedor
    >
      {/* Gatillo del Select */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        tabIndex="0" // Hacer que el div sea enfocable
        className={`h-12 min-w-80 bg-white text-gray-800 px-4 w-full border rounded-xl outline-none transition-all duration-300 flex items-center cursor-pointer
          ${isOpen || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300'}
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20`}
      >
        <span className={`text-base ${!selectedOption ? 'opacity-0' : 'opacity-100'}`}>
          {selectedOption?.label}
        </span>
      </div>

      {/* Etiqueta Flotante */}
      <label className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none bg-white 
          ${isOpen || hasContent ? '-top-2.5 text-[13px] text-blue-600 font-semibold z-10' : 'top-1/2 -translate-y-1/2 text-gray-400 text-base'}`}>
        {label}
      </label>

      {/* Flecha */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <svg className={`w-5 h-5 transition-all duration-500 ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transformOrigin: 'center' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Menú Desplegable */}
      <div className={`absolute  left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 origin-top
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-2'}`}
      >
        {searchable && (
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <input
              type="text"
              autoFocus={isOpen} // Auto-enfocar el buscador al abrir
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFocusedIndex(0); // Resetear foco al primer resultado filtrado
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <ul ref={listRef} className="max-h-[240px]  custom-scrollbar overflow-y-auto py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)} // Sincronizar mouse con teclado
                className={`px-4 py-3 text-sm transition-all duration-150 cursor-pointer
                  ${selectedOption?.value === option.value ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                  ${focusedIndex === index ? 'bg-blue-50 text-blue-600 pl-6' : 'text-gray-700'}`}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-gray-400 text-center italic">No hay resultados</li>
          )}
        </ul>
      </div>

      <input type="hidden" name={name} value={selectedOption?.value || ""} />
    </div>
  );
};

export { Input, TextArea, InputNumber, Select };
