import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Settings, Clock, Columns, FileText,
    ChevronRight, MoreHorizontal, Share2, Plus,
    Hash, List, CheckSquare, Image as ImageIcon,
    MessageSquare, History, Star
} from 'lucide-react';

// Cargamos Quill desde CDN para evitar problemas de dependencias locales
const QUILL_JS = 'https://cdn.quilljs.com/1.3.6/quill.js';
const QUILL_CSS = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';

const Markdowneditor = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const quillRef = useRef(null);
    const editorContainerRef = useRef(null);

    useEffect(() => {
        // Carga dinámica de Quill
        const loadQuill = () => {
            if (window.Quill) {
                initQuill();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = QUILL_CSS;
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = QUILL_JS;
            script.onload = initQuill;
            document.body.appendChild(script);
        };

        const initQuill = () => {
            if (!editorContainerRef.current || quillRef.current) return;

            quillRef.current = new window.Quill(editorContainerRef.current, {
                theme: 'snow',
                placeholder: 'Empieza a escribir o pulsa "/" para comandos...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image', 'video'],
                        ['clean']
                    ]
                }
            });

            // Estilo personalizado para que se parezca a Notion
            const editor = editorContainerRef.current.querySelector('.ql-editor');
            if (editor) {
                editor.style.minHeight = '70vh';
                editor.style.fontSize = '1.1rem';
                editor.style.lineHeight = '1.6';
                editor.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            }
        };

        loadQuill();
    }, []);

    return (
        <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden font-sans">



            {/* ÁREA PRINCIPAL DEL EDITOR */}
            <main className="flex-grow flex flex-col relative overflow-y-auto bg-white">

                {/* TOP BAR */}
                <header className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0 sticky top-0 bg-white/80 backdrop-blur-sm z-20">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                        >
                            <Columns size={18} />
                        </button>
                        <div className="flex items-center gap-1 text-sm text-slate-500 overflow-hidden">
                            <span className="hover:underline cursor-pointer">Privado</span>
                            <span>/</span>
                            <span className="font-medium text-slate-800 truncate">Reporte Mensual</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded text-sm text-slate-600">
                            <Share2 size={14} /> Compartir
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                            <MessageSquare size={18} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </header>

                {/* CONTENIDO DEL EDITOR */}
                <div className="max-w-4xl mx-auto w-full pt-16 pb-32 px-6 md:px-12">

                    {/* CONTENEDOR DE QUILL */}
                    <div className="notion-editor-wrapper">
                        <div ref={editorContainerRef}></div>
                    </div>
                </div>
            </main>

            {/* ESTILOS DE PERSONALIZACIÓN */}
            <style dangerouslySetInnerHTML={{
                __html: `
        /* Reset de Quill para parecer Notion */
        .ql-toolbar.ql-snow {
          border: none !important;
          background: #fff !important;
          position: sticky;
          top: 48px;
          z-index: 15;
          display: flex;
          justify-content: center;
          padding: 8px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .ql-editor {
          padding: 0 !important;
          color: #37352f !important;
        }
        .ql-editor h1 { font-size: 2.25em !important; font-weight: 700 !important; margin-top: 1.5em !important; }
        .ql-editor h2 { font-size: 1.5em !important; font-weight: 600 !important; margin-top: 1.25em !important; }
        .ql-editor p { margin-bottom: 0.5em !important; }
        .ql-editor blockquote {
          border-left: 3px solid #37352f !important;
          padding-left: 1em !important;
          font-style: normal !important;
          color: inherit !important;
        }
        .ql-editor.ql-blank::before {
          left: 0 !important;
          font-style: normal !important;
          color: #d3d1cb !important;
        }
        
        /* Ocultar barra de herramientas hasta que sea necesario o dejarla minimal */
        .notion-editor-wrapper .ql-toolbar {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .notion-editor-wrapper:hover .ql-toolbar {
          opacity: 1;
        }
      `}} />
        </div>
    );
};


export default Markdowneditor;