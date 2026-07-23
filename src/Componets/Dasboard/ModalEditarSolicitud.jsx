import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FullModal } from '../componentes dashboard/Modal.jsx';
import { Input, TextArea, Select } from '../Inputs';
import { toast } from '../GoeyToaster';
import {
  Plus, Check, Trash2, Search, Loader2, Save, X, Wrench, Package, ShoppingCart, LayoutGrid, Upload, FileText, ArrowLeft
} from 'lucide-react';

const API = `http://${window.location.hostname}:5000`;
const PAGE_SIZE = 24;

// ── Resultados de búsqueda global (Infinite Scroll) ───────────────
const GlobalProductResults = ({ items, selected, onAdd }) => {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef(null);
  const visible = useMemo(() => items.slice(0, page * PAGE_SIZE), [items, page]);
  const hasMore = visible.length < items.length;

  useEffect(() => { setPage(1); }, [items]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setPage(p => p + 1); }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, visible.length]);

  if (items.length === 0) return <p className="text-center py-16 text-sm text-slate-400">Sin resultados para esa búsqueda</p>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map(item => {
          const sel = selected.some(p => p.id_producto === item.id_producto);
          return (
            <div key={item.id_producto} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${sel ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
              <div>
                <p className="text-sm font-bold text-slate-800">{item.nombre_producto}</p>
                <p className="text-[11px] text-slate-400">COD: {item.codigo_producto} · Cat: {item.nombre_categoria ?? '—'} · Stock: {item.stock_actual ?? '—'}</p>
              </div>
              <button type="button" onClick={() => !sel && onAdd(item)} className={`p-2 rounded-lg transition-all ${sel ? 'text-emerald-500 bg-emerald-50' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                {sel ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
      </div>
      {hasMore && <div ref={sentinelRef} className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-blue-400" /></div>}
    </>
  );
};

// ── Catálogo Productos por categoría (Infinite Scroll) ─────────────
const CatalogoProductos = ({ items, selected, onAdd, onBack }) => {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef(null);
  const visible = useMemo(() => items.slice(0, page * PAGE_SIZE), [items, page]);
  const hasMore = visible.length < items.length;

  useEffect(() => { setPage(1); }, [items]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setPage(p => p + 1); }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, visible.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={18} /></button>
        <span className="text-xs text-slate-400">{items.length} producto{items.length !== 1 ? 's' : ''} en esta categoría</span>
      </div>
      {items.length === 0
        ? <p className="text-center py-12 text-sm text-slate-400">Sin productos en esta categoría</p>
        : <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map(item => {
              const sel = selected.some(p => p.id_producto === item.id_producto);
              return (
                <div key={item.id_producto} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${sel ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.nombre_producto}</p>
                    <p className="text-[11px] text-slate-400">COD: {item.codigo_producto} · Stock: {item.stock_actual ?? '—'}</p>
                  </div>
                  <button type="button" onClick={() => !sel && onAdd(item)} className={`p-2 rounded-lg transition-all ${sel ? 'text-emerald-500 bg-emerald-50' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                    {sel ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
          {hasMore && <div ref={sentinelRef} className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-blue-400" /></div>}
        </>
      }
    </div>
  );
};

export default function ModalEditarSolicitud({ solicitud, detallesIniciales, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('generales'); // 'generales' | 'items'
  const [resumen, setResumen] = useState(solicitud?.resumen || '');
  const [errors, setErrors] = useState({});

  // Estados para justificación (Texto o PDF)
  const [justModo, setJustModo] = useState(solicitud?.justificacion_pdf_url ? 'archivo' : 'texto');
  const [justTexto, setJustTexto] = useState(!solicitud?.justificacion_pdf_url ? (solicitud?.justificacion || '') : '');
  const [justFile, setJustFile] = useState(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState(solicitud?.justificacion_pdf_url || null);
  const [existingPdfName, setExistingPdfName] = useState(solicitud?.justificacion_pdf_url ? (solicitud?.justificacion || '') : '');

  const [requerimientos, setRequerimientos] = useState(solicitud?.requerimientos_texto || '');
  const [prioridad, setPrioridad] = useState(solicitud?.prioridad || 'Media');
  const [tipoSolicitud, setTipoSolicitud] = useState(solicitud?.tipo_solicitud || 'Compra');

  // Listado de productos/servicios seleccionados
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados del catálogo de productos
  const [showCatalog, setShowCatalog] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [catView, setCatView] = useState('categories'); // 'categories' | 'items'
  const [selCat, setSelCat] = useState(null);
  const [catLoaded, setCatLoaded] = useState(false);

  // Cargar ítems iniciales
  useEffect(() => {
    if (detallesIniciales) {
      setSelectedItems(
        detallesIniciales.map(d => ({
          id_producto: d.id_producto || null,
          id_servicio: d.id_servicio || null,
          nombre_producto: d.nombre_item || '',
          nombre_servicio: d.nombre_item || '',
          codigo_producto: d.codigo_item || '',
          codigo_servicio: d.codigo_item || '',
          cantidad: d.cantidad || 1
        }))
      );
    }
  }, [detallesIniciales]);

  // Cargar catálogos al abrir catálogo
  const loadCatalogs = async () => {
    if (catLoading || catLoaded) return;
    setCatLoading(true);
    try {
      const [catResp, prodResp, servResp] = await Promise.all([
        fetch(`${API}/categorias`, { credentials: 'include' }),
        fetch(`${API}/productos`, { credentials: 'include' }),
        fetch(`${API}/Servicios`, { credentials: 'include' })
      ]);
      if (catResp.ok) setCategories((await catResp.json()).data || []);
      if (prodResp.ok) setProducts((await prodResp.json()).data || []);
      if (servResp.ok) setServices((await servResp.json()).data || []);
      setCatLoaded(true);
    } catch {
      toast.warning('Error', { description: 'No se pudo cargar el catálogo.' });
    } finally {
      setCatLoading(false);
    }
  };

  useEffect(() => {
    if (showCatalog) loadCatalogs();
  }, [showCatalog]);

  const handleAddItem = (item) => {
    const isProd = tipoSolicitud === 'Compra';
    const itemId = isProd ? item.id_producto : item.id_servicio;
    setSelectedItems(prev => {
      const exists = prev.some(p => (isProd ? p.id_producto : p.id_servicio) === itemId);
      if (exists) return prev;
      return [...prev, { ...item, cantidad: 1 }];
    });
  };

  const handleRemoveItem = (itemId) => {
    const isProd = tipoSolicitud === 'Compra';
    setSelectedItems(prev => prev.filter(p => (isProd ? p.id_producto : p.id_servicio) !== itemId));
  };

  const handleUpdateQty = (itemId, delta) => {
    const isProd = tipoSolicitud === 'Compra';
    setSelectedItems(prev =>
      prev.map(p => {
        const match = isProd ? p.id_producto === itemId : p.id_servicio === itemId;
        if (match) {
          return { ...p, cantidad: Math.max(1, p.cantidad + delta) };
        }
        return p;
      })
    );
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!resumen.trim()) {
      newErrors.resumen = "El resumen es obligatorio";
    }

    if (justModo === 'texto' && !justTexto.trim()) {
      newErrors.justificacion = "La justificación es obligatoria";
    } else if (justModo === 'archivo' && !justFile && !existingPdfUrl) {
      newErrors.justificacion_pdf = "Debe adjuntar un archivo PDF";
    }

    if (selectedItems.length === 0) {
      toast.warning('Ítems requeridos', { description: 'Debe agregar al menos un producto o servicio.' });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Campos obligatorios', { description: 'Por favor, complete todos los campos obligatorios.' });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const finalJustificacionText = justModo === 'texto' ? justTexto : (justFile ? justFile.name : existingPdfName);
      const fd = new FormData();
      fd.append('resumen', resumen);
      fd.append('justificacion', finalJustificacionText);
      fd.append('requerimientos_texto', requerimientos);
      fd.append('prioridad', prioridad);
      fd.append('tipo_solicitud', tipoSolicitud);
      fd.append('productos', JSON.stringify(selectedItems));

      if (justModo === 'archivo') {
        if (justFile) {
          fd.append('justificacion_pdf', justFile);
        } else if (existingPdfUrl) {
          fd.append('justificacion_pdf_url', existingPdfUrl);
        }
      } else {
        fd.append('justificacion_pdf_url', '');
      }

      const response = await fetch(`${API}/solicitudes/${solicitud.id_solicitud}`, {
        method: 'PUT',
        credentials: 'include',
        body: fd
      });

      const json = await response.json();
      if (response.ok && json.success !== false) {
        toast.success('Operación Finalizada', {
          description: `La solicitud #${solicitud.id_solicitud} ha sido actualizada correctamente.`,
        });
        onRefresh();
        onClose();
      } else {
        throw new Error(json.message || 'Error al guardar los cambios');
      }
    } catch (e) {
      console.error(e);
      toast.warning('Error', { description: e.message || 'No se pudo guardar la solicitud.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de productos en catálogo
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.nombre_producto?.toLowerCase().includes(q) ||
      p.codigo_producto?.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Filtrado de servicios en catálogo
  const filteredServices = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s =>
      s.nombre_servicio?.toLowerCase().includes(q) ||
      s.codigo_servicio?.toLowerCase().includes(q)
    );
  }, [services, search]);

  return (
    <FullModal
      hidden={false}
      padding={false}
      onClose={onClose}
      contenido={
        <div className="flex flex-col h-full bg-slate-50">
          {/* Header */}
          <div className="px-8 py-5 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Editor de solicitudes</p>
              <h2 className="text-xl font-black text-slate-800">
                Editar Solicitud #{solicitud?.id_solicitud}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={14} />}
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-slate-100 flex px-8 shrink-0">
            <button
              onClick={() => setActiveTab('generales')}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'generales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              Datos Generales
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'items' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              Ítems ({selectedItems.length})
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              {activeTab === 'generales' ? (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-5">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-2">Información Principal</h3>

                  <Input
                    label="Resumen de la Solicitud *"
                    value={resumen}
                    onChange={e => {
                      setResumen(e.target.value);
                      if (errors.resumen) {
                        setErrors(prev => {
                          const newErr = { ...prev };
                          delete newErr.resumen;
                          return newErr;
                        });
                      }
                    }}
                    placeholder="Ej: Adquisición de repuestos para flota"
                    error={errors.resumen}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Tipo de Solicitud"
                      value={tipoSolicitud}
                      options={[
                        { value: 'Compra', label: 'Compra' },
                        { value: 'Servicio', label: 'Servicio' },
                        { value: 'Obra', label: 'Obra' }
                      ]}
                      onChange={e => {
                        setTipoSolicitud(e.target.value);
                        setSelectedItems([]); // Limpiar items al cambiar tipo
                      }}
                    />

                    <Select
                      label="Prioridad"
                      value={prioridad}
                      options={[
                        { value: 'Baja', label: 'Baja' },
                        { value: 'Media', label: 'Media' },
                        { value: 'Alta', label: 'Alta' }
                      ]}
                      onChange={e => setPrioridad(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                      Justificación Técnica *
                    </label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setJustModo('texto');
                          if (errors.justificacion_pdf) {
                            setErrors(prev => {
                              const newErr = { ...prev };
                              delete newErr.justificacion_pdf;
                              return newErr;
                            });
                          }
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${justModo === 'texto' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJustModo('archivo');
                          if (errors.justificacion) {
                            setErrors(prev => {
                              const newErr = { ...prev };
                              delete newErr.justificacion;
                              return newErr;
                            });
                          }
                        }}
                        className={`flex-1 py-2 ${justTexto === null || '' ? 'text-blue-500' : 'hidden text-red-500'} rounded-lg text-xs font-black uppercase tracking-widest transition-all ${justModo === 'archivo' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Adjuntar PDF
                      </button>
                    </div>

                    {justModo === 'texto' ? (
                      <TextArea
                        label=""
                        name="justificacion"
                        defaultValue={justTexto}
                        onChange={e => {
                          setJustTexto(e.target.value);
                          if (errors.justificacion) {
                            setErrors(prev => {
                              const newErr = { ...prev };
                              delete newErr.justificacion;
                              return newErr;
                            });
                          }
                        }}
                        placeholder="Detalle por qué se requiere esta adquisición..."
                        error={errors.justificacion}
                      />
                    ) : (
                      <div className="space-y-2">
                        {existingPdfUrl && !justFile && (
                          <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <FileText className="text-blue-600 shrink-0" size={18} />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Archivo Guardado</p>
                                <p className="text-xs font-bold text-slate-700 truncate max-w-[240px]">
                                  {existingPdfName || 'justificacion.pdf'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 rounded-md">
                              Guardado
                            </span>
                          </div>
                        )}

                        <div
                          onClick={() => document.getElementById('edit-pdf-up').click()}
                          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all text-center
                            ${errors.justificacion_pdf ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}
                        >
                          <Upload size={24} className={errors.justificacion_pdf ? 'text-red-400' : 'text-slate-300'} />
                          <span className={`text-xs font-bold ${errors.justificacion_pdf ? 'text-red-600' : 'text-slate-500'}`}>
                            {justFile
                              ? `✅ Nuevo archivo: ${justFile.name}`
                              : existingPdfUrl
                                ? 'Haga clic para reemplazar el archivo PDF actual'
                                : 'Haga clic para seleccionar o arrastrar un archivo PDF'
                            }
                          </span>
                          <span className={`text-[9px] uppercase tracking-widest font-semibold ${errors.justificacion_pdf ? 'text-red-500' : 'text-slate-400'}`}>Solo archivos PDF (máx. 10MB)</span>
                          {errors.justificacion_pdf && (
                            <span className="text-xs font-bold text-red-500 block mt-1">{errors.justificacion_pdf}</span>
                          )}
                          <input
                            id="edit-pdf-up"
                            type="file"
                            hidden
                            accept=".pdf"
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                setJustFile(e.target.files[0]);
                                if (errors.justificacion_pdf) {
                                  setErrors(prev => {
                                    const newErr = { ...prev };
                                    delete newErr.justificacion_pdf;
                                    return newErr;
                                  });
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <TextArea
                    label="Requerimientos Adicionales"
                    name="requerimientos"
                    defaultValue={requerimientos}
                    onChange={e => setRequerimientos(e.target.value)}
                    placeholder="Indique requerimientos técnicos específicos..."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Ítems de la solicitud ({selectedItems.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCatalog(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Agregar ítem
                    </button>
                  </div>

                  {selectedItems.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 text-sm">
                      <ShoppingCart size={32} className="mx-auto mb-3 text-slate-300" />
                      No hay productos o servicios agregados.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item, idx) => {
                        const isProd = tipoSolicitud === 'Compra';
                        const itemId = isProd ? item.id_producto : item.id_servicio;
                        const code = isProd ? item.codigo_producto : item.codigo_servicio;
                        const name = isProd ? item.nombre_producto : item.nombre_servicio;

                        return (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{name || 'Ítem sin nombre'}</p>
                                <p className="text-[11px] text-slate-400">COD: {code || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(itemId, -1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 font-bold text-sm"
                                >
                                  −
                                </button>
                                <span className="text-xs font-black text-slate-800 w-6 text-center">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(itemId, 1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 font-bold text-sm"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(itemId)}
                                className="text-rose-400 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MODAL CATÁLOGO DENTRO DE EDICIÓN */}
          {showCatalog && (
            <FullModal
              padding={false}
              onClose={() => setShowCatalog(false)}
              contenido={
                <div className="flex flex-col h-full bg-white text-gray-800">
                  <header className="px-7 py-5 border-b border-slate-100 flex flex-col gap-3 bg-slate-50 shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase">
                          Catálogo de {tipoSolicitud === 'Compra' ? 'Productos' : 'Servicios'}
                        </h2>
                        {tipoSolicitud === 'Compra' && catView === 'items' && selCat && !search && (
                          <p className="text-xs text-slate-400 mt-0.5">Categoría: <span className="font-bold text-blue-600">{selCat.nombre_categoria}</span></p>
                        )}
                        {tipoSolicitud === 'Compra' && search && (
                          <p className="text-xs text-slate-400 mt-0.5">Búsqueda global en <span className="font-bold text-blue-600">{products.length} productos</span></p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowCatalog(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {tipoSolicitud === 'Compra' && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          value={search}
                          onChange={e => { setSearch(e.target.value); if (catView === 'items' && e.target.value) setCatView('categories'); }}
                          placeholder={catView === 'items' ? 'Buscar en todos los productos...' : 'Buscar producto o categoría...'}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><X size={15} /></button>}
                      </div>
                    )}
                    {tipoSolicitud === 'Servicio' && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><X size={15} /></button>}
                      </div>
                    )}
                  </header>

                  <div className="flex-1 p-7 overflow-y-auto">
                    {catLoading ? (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                        <span className="text-sm font-bold">Cargando catálogo...</span>
                      </div>
                    ) : tipoSolicitud === 'Compra' ? (
                      search ? (
                        <GlobalProductResults
                          items={products.filter(p => {
                            const q = search.toLowerCase();
                            return p.nombre_producto?.toLowerCase().includes(q) ||
                              p.codigo_producto?.toLowerCase().includes(q) ||
                              p.nombre_categoria?.toLowerCase().includes(q);
                          })}
                          selected={selectedItems}
                          onAdd={handleAddItem}
                        />
                      ) : catView === 'categories' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {categories.length === 0 ? (
                            <p className="col-span-3 text-center py-12 text-sm text-slate-400">No hay categorías</p>
                          ) : (
                            categories.map(cat => {
                              const cnt = products.filter(p => p.id_categoria === cat.id_categoria).length;
                              return (
                                <button
                                  type="button"
                                  key={cat.id_categoria}
                                  onClick={() => { setSelCat(cat); setCatView('items'); }}
                                  className="p-5 border-2 border-slate-100 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                                >
                                  <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                    <LayoutGrid size={20} className="text-blue-500" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase text-center text-slate-700">{cat.nombre_categoria}</span>
                                  <span className="text-[10px] text-slate-400">{cnt} producto{cnt !== 1 ? 's' : ''}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <CatalogoProductos
                          items={products.filter(p => p.id_categoria === selCat?.id_categoria)}
                          selected={selectedItems}
                          onAdd={handleAddItem}
                          onBack={() => setCatView('categories')}
                        />
                      )
                    ) : (
                      <div className="space-y-3">
                        {services.filter(s => {
                          const q = search.toLowerCase();
                          return !q || s.nombre_servicio?.toLowerCase().includes(q) || s.codigo_servicio?.toLowerCase().includes(q);
                        }).length === 0 ? (
                          <p className="text-center py-12 text-sm text-slate-400">No se encontraron servicios</p>
                        ) : (
                          services.filter(s => {
                            const q = search.toLowerCase();
                            return !q || s.nombre_servicio?.toLowerCase().includes(q) || s.codigo_servicio?.toLowerCase().includes(q);
                          }).map(item => {
                            const sel = selectedItems.some(p => p.id_servicio === item.id_servicio);
                            return (
                              <div
                                key={item.id_servicio}
                                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${sel ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-300'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg">
                                    <Wrench size={16} className="text-slate-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{item.nombre_servicio}</p>
                                    <p className="text-[11px] text-slate-400">COD: {item.codigo_servicio}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => !sel && handleAddItem(item)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sel ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-amber-600'
                                    }`}
                                >
                                  {sel ? 'Agregado ✓' : 'Agregar'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCatalog(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-colors"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              }
            />
          )}
        </div>
      }
    />
  );
}
