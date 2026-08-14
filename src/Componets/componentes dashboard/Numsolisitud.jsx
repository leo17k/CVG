import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FullModal } from "./Modal";
import { Input, TextArea, Select, InputNumber } from "../Inputs";
import { useAuth } from "../../Constext/AuthToken";
import { gooeyToast } from 'goey-toast';
import {
  Plus, Check, ShoppingCart, Search, Trash2, Upload,
  Wrench, Building2, LayoutGrid, XCircle, ArrowLeft, Loader2, AlertTriangle, User, Package
} from 'lucide-react';

const API = `http://${window.location.hostname}:5000`;

// ── Resultados de búsqueda global (Infinite Scroll) ───────────────
const PAGE_SIZE = 24;
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
              <button data-tour={`catalog-add-product-${item.id_producto}`} type="button" onClick={() => !sel && onAdd(item)} className={`p-2 rounded-lg transition-all ${sel ? 'text-emerald-500 bg-emerald-50' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
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
                  <button data-tour={`catalog-add-product-${item.id_producto}`} type="button" onClick={() => !sel && onAdd(item)} className={`p-2 rounded-lg transition-all ${sel ? 'text-emerald-500 bg-emerald-50' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
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

// ── Catálogo Servicios ─────────────────────────────────────────
const isServicioObra = (item) => {
  const nombre = String(item?.nombre_servicio ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const codigo = String(item?.codigo_servicio ?? '').toLowerCase();

  return nombre.includes('obra') ||
    nombre.includes('servicio de obra') ||
    nombre.includes('serviciodeobra') ||
    codigo.includes('obra') ||
    codigo === '95884';
};

const CatalogoServicios = ({ items, selected, onAdd, search }) => {
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const baseItems = items.filter(item => !isServicioObra(item));
    return q ? baseItems.filter(i =>
      i.nombre_servicio?.toLowerCase().includes(q) ||
      i.codigo_servicio?.toLowerCase().includes(q)
    ) : baseItems;
  }, [items, search]);
  return (
    <div className="space-y-3">
      {filtered.length === 0
        ? <p className="text-center py-12 text-sm text-slate-400">{search ? 'Sin servicios que coincidan' : 'Sin servicios registrados'}</p>
        : <div className="space-y-3">
          {filtered.map(item => {
            const sel = selected.some(p => p.id_servicio === item.id_servicio);
            return (
              <div key={item.id_servicio} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${sel ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><Wrench size={16} className="text-slate-500" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.nombre_servicio}</p>
                    <p className="text-[11px] text-slate-400">COD: {item.codigo_servicio}</p>
                  </div>
                </div>
                <button data-tour={`catalog-add-service-${item.id_servicio}`} type="button" onClick={() => !sel && onAdd(item)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sel ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-amber-600'}`}>
                  {sel ? 'Agregado ✓' : 'Agregar'}
                </button>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
};

// ── Boton Principal ────────────────────────────────────────────
export const Boton = ({ onRefresh }) => {
  const { insertarSolicitud, permiso } = useAuth();
  const isAdmin = [1, 5].includes(Number(permiso?.id_rol));

  const [activo, setActivo] = useState(false);
  const [step, setStep] = useState(1);
  const [tipoSolicitud, setTipoSolicitud] = useState('');
  const [resumen, setResumen] = useState('');
  const [requerimientos, setRequerimientos] = useState('');
  const [justTexto, setJustTexto] = useState('');
  const [justFile, setJustFile] = useState(null);
  const [justModo, setJustModo] = useState('texto');
  const [reqFile, setReqFile] = useState(null);
  const [reqModo, setReqModo] = useState('texto');
  const [selectedItems, setSelectedItems] = useState([]);
  const [solicitanteId, setSolicitanteId] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [errors, setErrors] = useState({});

  // Catálogo
  const [showCatalog, setShowCatalog] = useState(false);
  const [catView, setCatView] = useState('categories');
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catLoaded, setCatLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal solicitud de creación de producto
  const [showSolProd, setShowSolProd] = useState(false);
  const [solProd, setSolProd] = useState({ nombre: '', descripcion: '', cantidad: 1, id_categoria: '' });
  const [sendingSolProd, setSendingSolProd] = useState(false);
  const justPdfInputId = useRef(`justificacion-pdf-${Math.random().toString(36).slice(2)}`);
  const reqPdfInputId = useRef(`requerimientos-pdf-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const handleSolicitudCreada = () => {
      setActivo(false);
      resetForm();
    };

    window.addEventListener('solicitud-creada', handleSolicitudCreada);
    return () => window.removeEventListener('solicitud-creada', handleSolicitudCreada);
  }, []);

  // Cargar usuarios si es admin
  useEffect(() => {
    if (!isAdmin || !activo) return;
    fetch(`${API}/users`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.usuarios) setUsuarios(d.usuarios); })
      .catch(() => { });
  }, [isAdmin, activo]);

  const loadCatalogs = useCallback(async () => {
    if (catLoading || catLoaded) return;
    setCatLoading(true);
    try {
      const [cR, pR, sR] = await Promise.all([
        fetch(`${API}/categorias`, { credentials: 'include' }),
        fetch(`${API}/productos`, { credentials: 'include' }),
        fetch(`${API}/Servicios`, { credentials: 'include' }),
      ]);
      if (cR.ok) setCategories((await cR.json()).data || []);
      if (pR.ok) setProducts((await pR.json()).data || []);
      if (sR.ok) {
        const servicios = (await sR.json()).data || [];
        setServices(servicios.filter(item => !isServicioObra(item)));
      }
      setCatLoaded(true);
    } catch {
      gooeyToast.error('Error al cargar catálogo', { description: 'Verifica la conexión con el servidor.', showTimestamp: false });
    } finally {
      setCatLoading(false);
    }
  }, [catLoading, catLoaded]);

  const sendSolProd = async () => {
    if (!solProd.nombre.trim()) return gooeyToast.warning('El nombre del producto es obligatorio', { showTimestamp: false });
    setSendingSolProd(true);
    try {
      const res = await fetch(`${API}/solicitudes-producto`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_producto: solProd.nombre,
          descripcion: solProd.descripcion,
          cantidad_requerida: solProd.cantidad,
          id_categoria: solProd.id_categoria || null,
        }),
      });
      if (!res.ok) throw new Error();
      gooeyToast.success('¡Solicitud enviada a Almacén!', { description: `Producto: ${solProd.nombre}`, showTimestamp: false });
      setShowSolProd(false);
      setSolProd({ nombre: '', descripcion: '', cantidad: 1, id_categoria: '' });
    } catch {
      gooeyToast.error('Error al enviar la solicitud', { showTimestamp: false });
    } finally {
      setSendingSolProd(false);
    }
  };

  useEffect(() => { if (showCatalog) loadCatalogs(); }, [showCatalog]);

  const closeCatalog = () => { setShowCatalog(false); setCatView('categories'); setSearch(''); };

  const resetForm = () => {
    setStep(1); setTipoSolicitud(''); setResumen('');
    setRequerimientos(''); setJustTexto(''); setJustFile(null);
    setReqFile(null); setReqModo('texto'); setJustModo('texto'); setSelectedItems([]); setSolicitanteId('');
    setShowCatalog(false); setCatView('categories'); setSearch(''); setSelCat(null);
    setErrors({});
  };

  const handleAdd = (item) => {
    const id = item.id_producto || item.id_servicio;
    setSelectedItems(prev => {
      if (prev.some(p => (p.id_producto || p.id_servicio) === id)) return prev;
      return [...prev, { ...item, cantidad: 1 }];
    });
    gooeyToast.success('Agregado', { description: item.nombre_producto || item.nombre_servicio, showTimestamp: false });
  };

  const removeItem = (id) => setSelectedItems(prev => prev.filter(p => (p.id_producto || p.id_servicio) !== id));

  const updateQty = (id, delta) => setSelectedItems(prev =>
    prev.map(p => (p.id_producto || p.id_servicio) === id
      ? { ...p, cantidad: Math.max(1, (p.cantidad || 1) + delta) }
      : p
    )
  );

  const setQty = (id, value) => setSelectedItems(prev =>
    prev.map(p => (p.id_producto || p.id_servicio) === id
      ? { ...p, cantidad: Math.max(1, Number(value) || 1) }
      : p
    )
  );

  const goNext = () => {
    const newErrors = {};
    if (step === 1 && !tipoSolicitud) {
      newErrors.tipoSolicitud = "Debe seleccionar el tipo de solicitud";
    }
    if (step === 2 && !resumen.trim()) {
      newErrors.resumen = "El resumen de la solicitud es obligatorio";
    }
    if (step === 2 && tipoSolicitud !== 'Obra' && selectedItems.length === 0) {
      gooeyToast.warning('Agrega al menos un ítem del catálogo', { showTimestamp: false });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      gooeyToast.error('Complete los campos obligatorios', { showTimestamp: false });
      return;
    }

    setErrors({});
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!resumen.trim()) {
      newErrors.resumen = "El resumen de la solicitud es obligatorio";
    }
    if (tipoSolicitud !== 'Obra' && selectedItems.length === 0) {
      gooeyToast.warning('Agrega al menos un ítem', { showTimestamp: false });
      return;
    }
    if (justModo === 'texto' && !justTexto.trim()) {
      newErrors.justificacion = "La justificación es obligatoria";
    }
    if (justModo === 'archivo' && !justFile) {
      newErrors.justificacion_pdf = "Debe adjuntar el archivo PDF de justificación";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      gooeyToast.error('Complete los campos obligatorios', { showTimestamp: false });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      // justificacion: texto o nombre del archivo
      const justificacion = justModo === 'texto' ? justTexto : (justFile?.name || '');
      // requerimientos_texto: siempre texto
      const requerimientosTexto = reqModo === 'texto' ? requerimientos : (reqFile?.name || '');

      const justFileObj = justModo === 'archivo' ? justFile : null;
      const reqFileObj = reqModo === 'archivo' ? reqFile : null;

      await insertarSolicitud(
        resumen,
        justificacion,
        requerimientosTexto,
        justFileObj,
        reqFileObj,
        selectedItems,
        tipoSolicitud,
        'Media',
        isAdmin && solicitanteId ? solicitanteId : null
      );
      gooeyToast.success('¡Solicitud enviada!', { description: `Tipo: ${tipoSolicitud}`, showTimestamp: false });
      setActivo(false); resetForm();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error al enviar solicitud:', err);
      const msg = err?.response?.data?.mensaje || 'No se pudo procesar la solicitud.';
      gooeyToast.error('Error al enviar', { description: msg, showTimestamp: false });
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = tipoSolicitud === 'Obra' ? ['Tipo', 'Justificación'] : ['Tipo', 'Ítems', 'Justificación'];
  const stepCount = STEPS.length;

  const usersOptions = usuarios.map(u => ({
    value: u.id_usuario,
    label: `${u.nombres} ${u.apellidos} — ${u.username}`
  }));

  return (
    <>
      <button type="button" id="new-request-btn" onClick={() => { setActivo(true); resetForm(); }}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-3xl font-bold text-sm shadow-lg transition-all">
        <Plus size={18} strokeWidth={2.5} /> <span className='max-sm:hidden'>Nueva Solicitud</span>
      </button>

      {/* ── WIZARD ── */}
      {activo && (
        <FullModal padding={false} hidden={true} onClose={() => { setActivo(false); resetForm(); }} contenido={
          <div id="new-request-modal" data-tour-root="new-request" className="flex flex-col h-full bg-slate-50">

            {/* Stepper */}
            <div data-tour="new-request-stepper" className="px-8  py-5 bg-white border-b border-slate-100">
              <div className="max-w-sm mx-auto flex items-center">
                {STEPS.map((label, i) => {
                  const n = i + 1, done = step > n, active = step === n;
                  return (
                    <React.Fragment key={n}>
                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          {done ? <Check size={15} strokeWidth={3} /> : n}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                      </div>
                      {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 mx-1 ${step > n ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 max-sm:px-1.5">
              <div className="max-w-4xl mx-auto space-y-6">

                {/* STEP 1 — Tipo de solicitud + solicitante si admin */}
                {step === 1 && (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecciona el tipo de solicitud</p>
                    {errors.tipoSolicitud && (
                      <p className="text-xs font-bold text-red-500 mb-2">{errors.tipoSolicitud}</p>
                    )}
                    <div className="grid  grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'Compra', icon: ShoppingCart, label: 'Compra', color: 'blue' },
                        { id: 'Servicio', icon: Wrench, label: 'Servicio', color: 'amber' },
                        { id: 'Obra', icon: Building2, label: 'Obra', color: 'violet' },
                      ].map(t => (
                        <button type="button" key={t.id}
                          data-tour={`new-request-type-${String(t.id).toLowerCase()}`}
                          onClick={() => {
                            setTipoSolicitud(t.id);
                            setSelectedItems([]);
                            setShowCatalog(false);
                            setCatView('categories');
                            setSearch('');
                            setSelCat(null);
                            if (errors.tipoSolicitud) {
                              setErrors(prev => {
                                const newErr = { ...prev };
                                delete newErr.tipoSolicitud;
                                return newErr;
                              });
                            }
                            setStep(2);
                          }}
                          className={`p-8 shadow-xl rounded-3xl border-2 flex flex-col items-center gap-3 transition-all hover:shadow-xl ${tipoSolicitud === t.id ? 'border-blue-500 bg-blue-50 shadow-lg' : (errors.tipoSolicitud ? 'border-red-300 hover:border-red-400 bg-white' : 'border-slate-100 bg-white hover:border-blue-300')}`}>
                          <div className={`p-4 rounded-2xl ${tipoSolicitud === t.id ? 'bg-blue-100' : 'bg-slate-50'}`}>
                            <t.icon size={30} className={tipoSolicitud === t.id ? 'text-blue-600' : 'text-slate-400'} />
                          </div>
                          <span className="font-black text-slate-800 text-sm text-center">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* STEP 2 — Resumen y, si aplica, selección de ítems */}
                {step === 2 && (
                  <>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Información de la solicitud</p>
                      {isAdmin && (
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User size={14} className="text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solicitante (Admin)</span>
                          </div>
                          <Select
                            label="Seleccionar solicitante"
                            name="solicitante"
                            value={solicitanteId}
                            options={usersOptions}
                            onChange={e => setSolicitanteId(e.target.value)}
                          />
                        </div>
                      )}
                      <Input
                        data-tour="new-request-resumen"
                        label="Resumen *"
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

                      {tipoSolicitud !== 'Obra' ? (
                        <>
                          <button data-tour="new-request-catalog" type="button" onClick={() => setShowCatalog(true)}
                            className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                            <Search size={16} /> Abrir catálogo de {tipoSolicitud === 'Compra' ? 'Productos' : 'Servicios'}
                          </button>

                          {selectedItems.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{selectedItems.length} ítem(s) seleccionado(s)</p>
                              {selectedItems.map((p, i) => {
                                const itemId = p.id_producto || p.id_servicio;
                                const isServicio = tipoSolicitud === 'Servicio' || !!p.id_servicio;
                                return (
                                  <div key={i} data-tour={`new-request-selected-${i}`} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs">{i + 1}</div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-700">{p.nombre_producto || p.nombre_servicio}</p>
                                        <p className="text-[11px] text-slate-400">{p.codigo_producto || p.codigo_servicio}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1">
                                        <button
                                          type="button"
                                          onClick={() => updateQty(itemId, -1)}
                                          disabled={isServicio}
                                          className={`w-6 h-6 flex items-center justify-center font-black text-base transition-colors ${isServicio ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900'}`}>
                                          −
                                        </button>
                                        <input
                                          data-tour={`new-request-qty-${itemId}`}
                                          type="number"
                                          min={1}
                                          value={isServicio ? 1 : p.cantidad}
                                          readOnly={isServicio}
                                          onChange={(e) => setQty(itemId, e.target.value)}
                                          onBlur={() => { if (!p.cantidad || Number(p.cantidad) < 1) setQty(itemId, 1); }}
                                          className={`w-12 text-sm text-center bg-transparent outline-none font-black ${isServicio ? 'text-slate-400' : ''}`}
                                        />
                                        {!isServicio && (
                                          <button type="button" onClick={() => updateQty(itemId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 font-black text-base transition-colors">+</button>
                                        )}
                                      </div>
                                      <button type="button" onClick={() => removeItem(itemId)} className="text-rose-400 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-xs font-bold">
                              <AlertTriangle size={14} /> Agrega al menos un ítem del catálogo
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          Solicitudes de Obra no requieren selección de catálogo. Continúa con la justificación técnica y requerimientos.
                        </div>
                      )}
                    </div>

                    {tipoSolicitud === 'Obra' && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Justificación técnica</p>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-[220px]">
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
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${justModo === 'texto' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
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
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${justModo === 'archivo' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                        {justModo === 'texto' ? (
                          <TextArea
                            label="Escribe la justificación técnica"
                            name="justificacion"
                            value={justTexto}
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
                            error={errors.justificacion}
                          />
                        ) : (
                          <div
                            onClick={() => document.getElementById(justPdfInputId.current)?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all ${errors.justificacion_pdf ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}>
                            <Upload size={32} className={errors.justificacion_pdf ? 'text-red-400' : 'text-slate-300'} />
                            <span className={`text-xs font-bold text-center ${errors.justificacion_pdf ? 'text-red-600' : 'text-slate-400'}`}>
                              {justFile ? `✅ ${justFile.name}` : 'Haz clic para subir un PDF de justificación'}
                            </span>
                            {errors.justificacion_pdf && (
                              <span className="text-xs font-bold text-red-500 block">{errors.justificacion_pdf}</span>
                            )}
                            <input
                              id={justPdfInputId.current}
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
                        )}
                        <div className="flex items-center justify-between gap-3 mt-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requerimientos técnicos</p>
                          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-[220px]">
                            <button type="button" onClick={() => setReqModo('texto')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reqModo === 'texto' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Texto</button>
                            <button type="button" onClick={() => setReqModo('archivo')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reqModo === 'archivo' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>PDF</button>
                          </div>
                        </div>
                        {reqModo === 'texto'
                          ? <TextArea label="Escribe los requerimientos técnicos" name="requerimientos" defaultValue={requerimientos} onChange={e => setRequerimientos(e.target.value)} />
                          : (
                            <div onClick={() => document.getElementById(reqPdfInputId.current)?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                              <Upload size={32} className="text-slate-300" />
                              <span className="text-xs font-bold text-slate-400 text-center">
                                {reqFile ? `✅ ${reqFile.name}` : 'Haz clic para subir un PDF de requerimientos'}
                              </span>
                              <input id={reqPdfInputId.current} type="file" hidden accept=".pdf" onChange={e => setReqFile(e.target.files[0])} />
                            </div>
                          )}
                      </div>
                    )}
                  </>
                )}

                {/* STEP 3 — Justificación y requerimientos */}
                {step === 3 && (
                  <>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Justificación técnica</p>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-[220px]">
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
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${justModo === 'texto' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
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
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${justModo === 'archivo' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                          >
                            PDF
                          </button>
                        </div>
                      </div>

                      {justModo === 'texto' ? (
                        <TextArea
                          label="Escribe la justificación técnica"
                          name="justificacion"
                          value={justTexto}
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
                          error={errors.justificacion}
                        />
                      ) : (
                        <div
                          onClick={() => document.getElementById(justPdfInputId.current)?.click()}
                          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all ${errors.justificacion_pdf ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}>
                          <Upload size={32} className={errors.justificacion_pdf ? 'text-red-400' : 'text-slate-300'} />
                          <span className={`text-xs font-bold text-center ${errors.justificacion_pdf ? 'text-red-600' : 'text-slate-400'}`}>
                            {justFile ? `✅ ${justFile.name}` : 'Haz clic para subir un PDF de justificación'}
                          </span>
                          {errors.justificacion_pdf && (
                            <span className="text-xs font-bold text-red-500 block">{errors.justificacion_pdf}</span>
                          )}
                          <input
                            id={justPdfInputId.current}
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
                      )}
                      <div className="flex items-center justify-between gap-3 mt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requerimientos técnicos</p>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-[220px]">
                          <button type="button" onClick={() => setReqModo('texto')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reqModo === 'texto' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Texto</button>
                          <button type="button" onClick={() => setReqModo('archivo')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reqModo === 'archivo' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>PDF</button>
                        </div>
                      </div>
                      {reqModo === 'texto'
                        ? <TextArea label="Escribe los requerimientos técnicos" name="requerimientos" defaultValue={requerimientos} onChange={e => setRequerimientos(e.target.value)} />
                        : (
                          <div onClick={() => document.getElementById(reqPdfInputId.current)?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                            <Upload size={32} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400 text-center">
                              {reqFile ? `✅ ${reqFile.name}` : 'Haz clic para subir un PDF de requerimientos'}
                            </span>
                            <input id={reqPdfInputId.current} type="file" hidden accept=".pdf" onChange={e => setReqFile(e.target.files[0])} />
                          </div>
                        )}
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
              <button type="button" onClick={() => {
                if (step > 1) setStep(s => s - 1);
                else { setActivo(false); resetForm(); }
              }}
                className={`px-5 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-700 transition-colors`}>
                {step > 1 ? '← Regresar' : 'Salir'}
              </button>
              {step < stepCount
                ? <button data-tour="new-request-next" type="button" onClick={goNext} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                  Siguiente →
                </button>
                : <button data-tour="new-request-submit" type="button" onClick={handleSubmit} disabled={submitting}
                  className="bg-emerald-600 text-white px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              }
            </div>
          </div>
        } />
      )}

      {/* ── MODAL CATÁLOGO ── */}
      {showCatalog && tipoSolicitud !== 'Obra' && (
        <FullModal padding={false} onClose={closeCatalog} contenido={
          <div className="flex flex-col h-full bg-white">
            <header className="px-7 py-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase">
                    {tipoSolicitud === 'Compra' ? 'Catálogo de Productos' : 'Catálogo de Servicios'}
                  </h2>
                  {tipoSolicitud === 'Compra' && catView === 'items' && selCat && !search && (
                    <p className="text-xs text-slate-400 mt-0.5">Categoría: <span className="font-bold text-blue-600">{selCat.nombre_categoria}</span></p>
                  )}
                  {tipoSolicitud === 'Compra' && search && (
                    <p className="text-xs text-slate-400 mt-0.5">Búsqueda global en <span className="font-bold text-blue-600">{products.length} productos</span></p>
                  )}
                </div>
              </div>
              {/* Búsqueda global de productos */}
              {tipoSolicitud === 'Compra' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); if (catView === 'items' && e.target.value) setCatView('categories'); }}
                    placeholder={catView === 'items' ? 'Buscar en todos los productos...' : 'Buscar producto o categoría...'}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><XCircle size={15} /></button>}
                </div>
              )}
              {tipoSolicitud === 'Servicio' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><XCircle size={15} /></button>}
                </div>
              )}
            </header>

            <div className="flex-1 p-7 overflow-y-auto">
              {catLoading
                ? <div className="flex flex-col items-center justify-center h-52 gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <p className="text-sm font-bold">Cargando catálogo...</p>
                </div>
                : tipoSolicitud === 'Compra'
                  ? search
                    /* ── Búsqueda global: busca en TODOS los productos cargados ── */
                    ? <GlobalProductResults
                      items={products.filter(p => {
                        const q = search.toLowerCase();
                        return p.nombre_producto?.toLowerCase().includes(q) ||
                          p.codigo_producto?.toLowerCase().includes(q) ||
                          p.nombre_categoria?.toLowerCase().includes(q);
                      })}
                      selected={selectedItems}
                      onAdd={handleAdd}
                    />
                    /* ── Sin búsqueda: navegación por categorías ── */
                    : catView === 'categories'
                      ? (() => {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {categories.length === 0
                              ? <p className="col-span-3 text-center py-12 text-sm text-slate-400">No hay categorías</p>
                              : categories.map(cat => {
                                const cnt = products.filter(p => p.id_categoria === cat.id_categoria).length;
                                return (
                                  <button type="button" key={cat.id_categoria}
                                    onClick={() => { setSelCat(cat); setCatView('items'); }}
                                    className="p-5 border-2 border-slate-100 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group">
                                    <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                      <LayoutGrid size={20} className="text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-center text-slate-700">{cat.nombre_categoria}</span>
                                    <span className="text-[10px] text-slate-400">{cnt} producto{cnt !== 1 ? 's' : ''}</span>
                                  </button>
                                );
                              })
                            }
                          </div>
                        );
                      })()
                      : <CatalogoProductos
                        items={products.filter(p => p.id_categoria === selCat?.id_categoria)}
                        selected={selectedItems}
                        onAdd={handleAdd}
                        onBack={() => { setCatView('categories'); }}
                      />
                  : <CatalogoServicios items={services} selected={selectedItems} onAdd={handleAdd} search={search} />
              }
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button type="button" onClick={() => setShowSolProd(true)}
                className="flex items-center gap-1.5 text-[11px] font-black text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-xl transition-colors">
                <Plus size={13} strokeWidth={3} /> Solicitar nuevo producto
              </button>
              <button data-tour="new-request-confirm-selection" type="button" onClick={closeCatalog}
                className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-md">
                Confirmar Selección
              </button>
            </div>
          </div>
        } />
      )}

      {/* ── MODAL SOLICITAR NUEVO PRODUCTO ── */}
      {showSolProd && (
        <FullModal padding={false} onClose={() => setShowSolProd(false)} contenido={
          <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f1f5ff 100%)' }}>

            {/* Header con gradiente */}
            <div className="relative px-8 py-6 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Solicitar nuevo producto</h2>
                  <p className="text-violet-200 text-xs mt-0.5">La solicitud será notificada al módulo de Almacén en tiempo real</p>
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-xl mx-auto space-y-2">

                <Input
                  label="Nombre del producto *"
                  value={solProd.nombre}
                  onChange={e => setSolProd(s => ({ ...s, nombre: e.target.value }))}
                />

                <TextArea
                  label="Descripción / Especificaciones"
                  name="descripcion_sol"
                  defaultValue={solProd.descripcion}
                  onChange={e => setSolProd(s => ({ ...s, descripcion: e.target.value }))}
                />

                <InputNumber
                  label="Cantidad requerida"
                  name="cantidad_sol"
                  defaultValue={solProd.cantidad}
                  min={1}
                  step={1}
                  onChange={e => setSolProd(s => ({ ...s, cantidad: Number(e.target.value) || 1 }))}
                />

                <Select
                  label="Categoría (opcional)"
                  name="categoria_sol"
                  value={solProd.id_categoria}
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...categories.map(c => ({ value: String(c.id_categoria), label: c.nombre_categoria }))
                  ]}
                  onChange={e => setSolProd(s => ({ ...s, id_categoria: e.target.value }))}
                />

                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-violet-700 uppercase tracking-widest">Aclaración</p>
                    <p className="text-xs text-violet-500 mt-0.5 leading-relaxed">
                      Esta solicitud <strong>no crea el producto directamente</strong>. Almacén la recibirá y decidirá si se incorpora al catálogo.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
              <button type="button" onClick={() => setShowSolProd(false)}
                className="px-5 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-700 transition-colors">
                ← Salir
              </button>
              <button type="button" onClick={sendSolProd} disabled={sendingSolProd}
                className="flex items-center gap-2 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-violet-200"
                style={{ background: sendingSolProd ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                {sendingSolProd
                  ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
                  : <><Package size={13} /> Enviar a Almacén</>
                }
              </button>
            </div>
          </div>
        } />
      )}
    </>
  );
};

const Numsolisitud = ({ title, number, description }) => (
  <div className="flex flex-col whitespace-nowrap h-full p-4 rounded-xl border border-gray-200 bg-white shadow-sm max-w-sm">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
    <span className="text-xl font-bold text-blue-700 leading-tight">{number}</span>
    <p className="text-[10px] text-gray-900/50 mt-1 leading-relaxed">{description}</p>
  </div>
);

const HacerSolisitud = ({ onRefresh }) => (
  <div className="flex h-full gap-3 whitespace-nowrap flex-col p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hacer una solicitud</h3>
    <div className="flex items-center justify-center">
      <Boton onRefresh={onRefresh} />
    </div>
  </div>
);

export { Numsolisitud, HacerSolisitud };
