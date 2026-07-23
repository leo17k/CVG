import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bold, Italic, HelpCircle, Heading1, Heading2, List, Link, Image, Code, Eye, EyeOff } from 'lucide-react';

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

const Input = ({ label, type = 'text', name, defaultValue, value, onChange, error, ...props }) => {
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
    <div className='flex flex-col w-full'>
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
          className={`h-12 min-w-0 w-full bg-white text-gray-800 px-4 border rounded-xl outline-none transition-all duration-300
          autofill:shadow-[0_0_0_30px_white_inset]
          ${error 
            ? 'border-red-500 ring-1 ring-red-500/20' 
            : (isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300')}`}
        />

        <label
          className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none
          bg-white 
          ${isFocused || hasContent
              ? `-top-2.5 text-[13px] ${error ? 'text-red-500' : 'text-blue-600'} font-semibold z-10`
              : `top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400'} text-base`}`}
        >
          {label}
        </label>
      </div>

      {error && (
        <span className="text-[11px] text-red-500 font-medium ml-1 -mt-1 mb-2 animate-in fade-in duration-200">
          {error}
        </span>
      )}

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

const InputNumber = ({ label, name, defaultValue, onChange, step = 1, min = 0, error }) => {
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
    <div className="relative mt-2 mb-1 block min-w-0 w-full">
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
          className={`h-12 min-w-0 w-full  bg-white text-center px-10 border rounded-xl outline-none transition-all duration-300
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${error
              ? 'border-red-500 ring-1 ring-red-500/20'
              : (isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300')}`}
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
              ? `-top-2.5 left-4 text-[13px] ${error ? 'text-red-500' : 'text-blue-600'} font-semibold z-10`
              : `top-1/2 -translate-y-1/2 left-10 ${error ? 'text-red-400' : 'text-gray-400'} text-base`}`}
        >
          {label}
        </label>
      </div>
      {error && (
        <span className="text-[11px] text-red-500 font-medium ml-1 mt-1 block animate-in fade-in duration-200">
          {error}
        </span>
      )}
    </div>
  );
};

const TextArea = ({ label, name, defaultValue, onChange, className, error }) => {
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
    <div className="relative mt-2 mb-1 block w-full">
      <textarea
        ref={textareaRef}
        name={name}
        defaultValue={defaultValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={`h-32 py-3 w-full min-w-0 bg-white text-gray-800 px-4 border rounded-xl outline-none transition-all duration-300 resize-none
          ${error
            ? 'border-red-500 ring-1 ring-red-500/20'
            : (isFocused || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300')} ${className || ''}`}
      />
      <label
        className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none bg-white
          ${isFocused || hasContent
            ? `-top-2.5 text-[13px] ${error ? 'text-red-500' : 'text-blue-600'} font-semibold z-10`
            : `top-3 ${error ? 'text-red-400' : 'text-gray-400'} text-base`}`}
      >
        {label}
      </label>
      {error && (
        <span className="text-[11px] text-red-500 font-medium ml-1 mt-1 block animate-in fade-in duration-200">
          {error}
        </span>
      )}
    </div>
  );
};

const MarkdownEditor = ({ label, name, defaultValue, value, onChange }) => {
  const [text, setText] = useState(defaultValue || value || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setText(value);
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
        case 'B':
          e.preventDefault();
          insertFormat('**', '**', 'texto en negrita');
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          insertFormat('*', '*', 'texto en cursiva');
          break;
        default:
          break;
      }
    }
  };

  const handleEditorInput = (e) => {
    const newValue = e.currentTarget.textContent || '';
    setText(newValue);
    if (onChange) onChange({ target: { name, value: newValue } });
  };

  const insertFormat = (before, after = '', placeholder = '') => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const selectedText = selection.toString() || placeholder;
    const textNode = document.createTextNode(before + selectedText + after);
    range.deleteContents();
    range.insertNode(textNode);

    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    const newText = editor.textContent || '';
    setText(newText);
    if (onChange) onChange({ target: { name, value: newText } });
  };

  const formatButtons = [
    { icon: Bold, action: () => insertFormat('**', '**', 'texto en negrita'), tooltip: 'Negrita (Ctrl+B)' },
    { icon: Italic, action: () => insertFormat('*', '*', 'texto en cursiva'), tooltip: 'Cursiva (Ctrl+I)' },
    { icon: Heading1, action: () => insertFormat('# ', '', 'Título principal'), tooltip: 'Título H1' },
    { icon: Heading2, action: () => insertFormat('## ', '', 'Subtítulo'), tooltip: 'Título H2' },
    { icon: List, action: () => insertFormat('- ', '', 'Elemento de lista'), tooltip: 'Lista' },
    { icon: Link, action: () => insertFormat('[', '](url)', 'texto del enlace'), tooltip: 'Enlace' },
    { icon: Image, action: () => insertFormat('![', '](url)', 'alt text'), tooltip: 'Imagen' },
    { icon: Code, action: () => insertFormat('`', '`', 'código'), tooltip: 'Código inline' },
  ];

  const renderedHtml = useMemo(() => {
    const raw = String(text || '');
    if (!raw.trim()) return '<p class="text-slate-400 italic text-sm">La vista previa aparecerá aquí...</p>';

    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const withHeaders = escaped
      .replace(/^######\s*(.+)$/gm, '<h6 class="text-sm font-bold text-slate-700 mt-4 mb-2">$1</h6>')
      .replace(/^#####\s*(.+)$/gm, '<h5 class="text-base font-bold text-slate-700 mt-4 mb-2">$1</h5>')
      .replace(/^####\s*(.+)$/gm, '<h4 class="text-lg font-bold text-slate-700 mt-4 mb-2">$1</h4>')
      .replace(/^###\s*(.+)$/gm, '<h3 class="text-xl font-bold text-slate-700 mt-4 mb-2">$1</h3>')
      .replace(/^##\s*(.+)$/gm, '<h2 class="text-2xl font-bold text-slate-700 mt-4 mb-2">$1</h2>')
      .replace(/^#\s*(.+)$/gm, '<h1 class="text-3xl font-black text-slate-800 mt-6 mb-3">$1</h1>');

    const withImages = withHeaders.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-3 shadow-sm border border-slate-200" />');
    const withLinks = withImages.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">$1</a>');
    const withBold = withLinks.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    const withItalic = withBold.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');
    const withCode = withItalic.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm font-mono">$1</code>');

    const withListItems = withCode.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>');
    const withLists = withListItems.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul class="list-disc list-inside mb-3 text-slate-700">$1</ul>');

    const withBlockquotes = withLists.replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 py-2 my-3 bg-blue-50 text-slate-700 italic">$1</blockquote>');

    const withParagraphs = withBlockquotes
      .replace(/^(?!<h|<ul|<li|<img|<p|<blockquote|<code)(.+)$/gm, '<p class="mb-3 text-slate-700 leading-relaxed">$1</p>')
      .replace(/<p><\/p>/g, '');

    const withTables = withParagraphs.replace(/^(\|.*\|)\s*$/gm, (match) => {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;

      const headers = rows[0].split('|').slice(1, -1).map(h => h.trim());
      const dataRows = rows.slice(2);

      let tableHtml = '<div class="overflow-x-auto mb-4"><table class="min-w-full border border-slate-300 text-sm bg-white rounded-lg overflow-hidden"><thead class="bg-slate-100"><tr>';
      headers.forEach(header => {
        tableHtml += `<th class="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">${header}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      dataRows.forEach(row => {
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr class="hover:bg-slate-50">';
        cells.forEach(cell => {
          tableHtml += `<td class="border border-slate-300 px-3 py-2 text-slate-600">${cell}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });

    return withTables.replace(/\n/g, '');
  }, [text]);

  return (
    <div className="w-full">
      {/* Header with label and expand button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md transition-colors"
            title="Ayuda con Markdown"
          >
            <HelpCircle size={14} />
            Ayuda
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Ocultar' : 'Mostrar'}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            {isExpanded ? 'Contraer' : 'Expandir Editor'}
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className={`relative bg-white border rounded-2xl overflow-hidden transition-all duration-500 ease-in-out ${isExpanded
        ? 'shadow-2xl shadow-blue-500/10 border-blue-300'
        : 'shadow-md border-slate-300'
        }`}>
        {/* Toolbar - Only visible when expanded */}
        <div className={`flex items-center gap-1 p-3 bg-slate-50 border-b border-slate-200 transition-all duration-300 ${isExpanded ? 'opacity-100 max-h-16' : 'opacity-0 max-h-0 overflow-hidden'
          }`}>
          {formatButtons.map((btn, index) => {
            const Icon = btn.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={btn.action}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 group"
                title={btn.tooltip}
              >
                <Icon size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            );
          })}
          <div className="ml-2 text-xs text-slate-500 border-l border-slate-300 pl-2">
            Usa Ctrl+B para negrita, Ctrl+I para cursiva
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex flex-col transition-all duration-500 ease-in-out gap-3">
          {/* Preview - Only visible when expanded and showPreview is true */}
          {showPreview && isExpanded && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm overflow-auto">
              <div className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                <Eye size={14} />
                Vista Previa
              </div>
              <div
                className="prose prose-slate max-w-none prose-sm"
                dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="text-slate-400 italic">La vista previa aparecerá aquí...</p>' }}
              />
            </div>
          )}

          {/* Editor de texto oculto visualmente, edición directa sobre la vista previa */}
          <div className="relative p-4">
            {!text && (
              <div className="pointer-events-none absolute inset-0 px-4 py-4 text-slate-400">
                Escribe aquí usando Markdown... Presiona Enter para nueva línea.
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              spellCheck="false"
              onInput={handleEditorInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              className={`min-h-[128px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-gray-800 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-200 whitespace-pre-wrap break-words ${isExpanded ? 'min-h-[384px]' : 'min-h-[128px]'
                }`}
            >{text}</div>
          </div>
        </div>

        {/* Expand indicator */}
        {!isExpanded && text && (
          <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white/90 px-2 py-1 rounded-md shadow-sm border">
            Contenido escrito - Expande para editar
          </div>
        )}

        {/* Character count */}
        {isExpanded && (
          <div className="absolute bottom-2 left-4 text-xs text-slate-500">
            {text.length} caracteres
          </div>
        )}
      </div>

      {/* Panel de Ayuda */}
      {showHelp && (
        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <HelpCircle size={16} />
            Guía de Markdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-amber-700 mb-2">Formato Básico</h5>
              <ul className="space-y-1 text-amber-600">
                <li><code>**texto**</code> o <code>__texto__</code> → <strong>negrita</strong></li>
                <li><code>*texto*</code> o <code>_texto_</code> → <em>cursiva</em></li>
                <li><code>~~texto~~</code> → <del>tachado</del></li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-amber-700 mb-2">Encabezados</h5>
              <ul className="space-y-1 text-amber-600">
                <li><code># Título</code> → Título grande</li>
                <li><code>## Subtítulo</code> → Subtítulo mediano</li>
                <li><code>### Sub-subtítulo</code> → Subtítulo pequeño</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-amber-700 mb-2">Listas</h5>
              <ul className="space-y-1 text-amber-600">
                <li><code>- item</code> → Lista con viñetas</li>
                <li><code>1. item</code> → Lista numerada</li>
                <li><code>   - subitem</code> → Sub-elemento</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-amber-700 mb-2">Otros</h5>
              <ul className="space-y-1 text-amber-600">
                <li><code>`código`</code> → <code>código inline</code></li>
                <li><code>[texto](url)</code> → enlace</li>
                <li><code>&gt; cita</code> → bloque de cita</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-600">
              <strong>Atajos de teclado:</strong> Ctrl+B (negrita), Ctrl+I (cursiva)
            </p>
          </div>
        </div>
      )}
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
  searchable = true,
  className = "",
  error,
  renderOption,
  renderValue
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

  // Dropdown auto-positioning: decide whether to open above or below trigger
  const [openDirection, setOpenDirection] = useState('bottom'); // 'bottom' or 'top'
  const [maxDropdownHeight, setMaxDropdownHeight] = useState(240);

  const decidePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const desired = 240; // default desired dropdown height

    if (spaceBelow < desired && spaceAbove > spaceBelow) {
      setOpenDirection('top');
      setMaxDropdownHeight(Math.max(80, Math.min(desired, spaceAbove - 12)));
    } else {
      setOpenDirection('bottom');
      setMaxDropdownHeight(Math.max(80, Math.min(desired, spaceBelow - 12)));
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => decidePosition();
    const onScroll = () => decidePosition();
    window.addEventListener('resize', onResize);
    // capture scroll events from ancestors as well
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, decidePosition]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      decidePosition();
      setIsOpen(true);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, options]);

  // Manejo de teclado
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        decidePosition();
        setIsOpen(true);
        setFocusedIndex(0);
      }
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

  const renderOptionContent = (option) => {
    if (renderOption) return renderOption(option);

    if (option?.avatar) {
      const initials = (option.label || '').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="border border-slate-200">
            <AvatarImage src={option.avatar} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-700">{option.label}</span>
        </div>
      );
    }

    return option?.label;
  };

  const renderTriggerContent = () => {
    if (renderValue) return renderValue(selectedOption);

    if (selectedOption?.avatar) {
      const initials = (selectedOption.label || '').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="border border-slate-200">
            <AvatarImage src={selectedOption.avatar} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-slate-700">{selectedOption.label}</span>
        </div>
      );
    }

    return selectedOption?.label;
  };

  return (
    <div
      className="relative mt-2 mb-2 block group w-full"
      ref={containerRef}
      onKeyDown={handleKeyDown} // Capturar teclas en todo el contenedor
    >
      {/* Gatillo del Select */}
      <div
        onClick={handleToggle}
        tabIndex="0" // Hacer que el div sea enfocable
        className={`h-12 min-w-40 bg-white text-gray-800 px-4 w-full border rounded-xl outline-none transition-all duration-300 flex items-center cursor-pointer
          ${error
            ? 'border-red-500 ring-1 ring-red-500/20'
            : (isOpen || hasContent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300')}
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${className}`}
      >
        <span className={`text-base ${!selectedOption ? 'opacity-0' : 'opacity-100'} w-full`}>
          {renderTriggerContent()}
        </span>
      </div>

      {/* Etiqueta Flotante */}
      <label className={`absolute left-4 px-1 transition-all duration-300 pointer-events-none select-none bg-white 
          ${isOpen || hasContent
            ? `-top-2.5 text-[13px] ${error ? 'text-red-500' : 'text-blue-600'} font-semibold z-10`
            : `top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400'} text-base`}`}>
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
      <div className={`absolute left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 ${openDirection === 'bottom' ? 'mt-2 origin-top' : 'mb-2 bottom-full origin-bottom'} ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-2'}`}>
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

        <ul ref={listRef} className="custom-scrollbar overflow-y-auto py-1" style={{ maxHeight: `${maxDropdownHeight}px` }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={option.value != null ? String(option.value) : `opt-${index}`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)} // Sincronizar mouse con teclado
                className={`px-4 py-3 text-sm transition-all duration-150 cursor-pointer
                  ${selectedOption?.value === option.value ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                  ${focusedIndex === index ? 'bg-blue-50 text-blue-600 pl-6' : 'text-gray-700'}`}
              >
                {renderOptionContent(option)}
              </li>
            ))
          ) : (
            <li key="no-results" className="px-4 py-3 text-sm text-gray-400 text-center italic">No hay resultados</li>
          )}
        </ul>
      </div>

      {error && (
        <span className="text-[11px] text-red-500 font-medium ml-1 mt-1 block animate-in fade-in duration-200">
          {error}
        </span>
      )}

      <input type="hidden" name={name} value={selectedOption?.value || ""} />
    </div>
  );
};

export { Input, TextArea, InputNumber, MarkdownEditor, Select };
