import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Heading2, Quote } from 'lucide-react';

const RichEditor = ({ label, onChange, value, name }) => {
const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange && onChange(html);
    },
    editorProps: {
      attributes: {
        // Añadimos 'prose-blue' para que los links y elementos activos sean azules
        // 'focus:outline-none' quita el borde negro feo al escribir
        class: 'prose prose-sm md:prose-base focus:outline-none max-w-none min-h-[200px] cursor-text',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== undefined && value !== currentHtml) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const insertOrToggle = (commandFn, exampleHtml) => {
    editor.chain().focus().run();
    const hasSelection = !editor.state.selection.empty;
    if (hasSelection) {
      commandFn();
    } else {
      editor.chain().focus().insertContent(exampleHtml).run();
    }
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all">
      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1 p-3 border-b bg-slate-50">
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleBold().run(), '<strong>texto en negrita</strong>')}
            active={editor.isActive('bold')}
            icon={<Bold size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleItalic().run(), '<em>texto en cursiva</em>')}
            active={editor.isActive('italic')}
            icon={<Italic size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleStrike().run(), '<s>texto tachado</s>')}
            active={editor.isActive('strike')}
            icon={<Strikethrough size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleCode().run(), '<code>código</code>')}
            active={editor.isActive('code')}
            icon={<Code size={16} />}
          />
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), '<h2>Título de ejemplo</h2>')}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleBulletList().run(), '<ul><li>Elemento de lista</li></ul>')}
            active={editor.isActive('bulletList')}
            icon={<List size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleOrderedList().run(), '<ol><li>Elemento numerado</li></ol>')}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={16} />}
          />
          <MenuButton
            onClick={() => insertOrToggle(() => editor.chain().focus().toggleBlockquote().run(), '<blockquote>Texto de cita</blockquote>')}
            active={editor.isActive('blockquote')}
            icon={<Quote size={16} />}
          />
        </div>
        <div className="relative p-4 min-h-[240px]">
          <span className="absolute top-3 right-4 text-[10px] font-bold text-slate-300 uppercase pointer-events-none">
            {label}
          </span>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

// Sub-componente para los botones del menú
const MenuButton = ({ onClick, active, icon }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`p-2 rounded-md transition-colors ${
      active ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'
    }`}
  >
    {icon}
  </button>
);

export default RichEditor;