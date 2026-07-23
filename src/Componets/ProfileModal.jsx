import React, { useEffect, useState, useRef } from 'react';
import { Modal } from './componentes dashboard/Modal.jsx';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar.jsx';
import { useAuth } from '../Constext/AuthToken.jsx';
import { toast } from './GoeyToaster';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import { Edit2, Lock } from 'lucide-react';

const API = `http://${window.location.hostname}:5000`;

export default function ProfileModal({ open, onClose }) {
  const { datauser, getDataUser, updateAvatar } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const fetchFull = async () => {
      if (!datauser) return;
      setLoading(true);
      try {
        const uid = datauser.userId;
        const resp = await fetch(`${API}/users?columna=id_usuario&busqueda=${uid}`, { credentials: 'include' });
        if (resp.ok) {
          const j = await resp.json();
          if (mounted) setProfile((j.usuarios && j.usuarios[0]) || null);
        }
      } catch (err) {
        console.error('Error fetching full profile', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchFull();
    return () => { mounted = false; };
  }, [open, datauser]);

  useEffect(() => {
    if (!avatarFile) { setPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setAvatarFile(f);
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !profile) return toast.warn('Selecciona una imagen');
    setSavingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const resp = await fetch(`${API}/usuarios/${profile.id_usuario}/avatar`, { method: 'POST', credentials: 'include', body: fd });
      const j = await resp.json();
      if (resp.ok) {
        toast.success('Avatar actualizado');
        setProfile(p => ({ ...p, avatar: j.avatar }));
        try { updateAvatar && updateAvatar(j.avatar); } catch (e) { /* ignore */ }
        try { await getDataUser(); } catch (e) { /* ignore */ }
      } else {
        toast.error(j.error || 'Error al subir avatar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error interno al subir avatar');
    } finally {
      setSavingAvatar(false);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!open) return null;

  const initials = (profile?.nombres?.charAt(0) || datauser?.data?.name?.charAt(0) || '').toUpperCase();

  return (
    <>
      <Modal onClose={onClose} hidden={true} contenido={
     <div className="max-w-md mx-auto bg-white p-6 rounded-2">
  {/* Header de perfil */}
      <div className="flex gap-5  flex-col items-center justify-center">
    <div className="relative ">
      <div className="p-0.5 rounded-full bg-linear-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md">
        <Avatar className="h-30 w-30 rounded-full border-2 border-white bg-slate-50">
          {profile && profile.avatar ? (
            <AvatarImage src={profile.avatar} className="object-cover" />
          ) : (
            <AvatarFallback className="text-2xl font-semibold text-slate-600 bg-slate-100">{initials}</AvatarFallback>
          )}
        </Avatar>
      </div>

      <button 
        onClick={handleAvatarClick} 
        title="Editar foto" 
        className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      <input ref={fileInputRef} id="avatar-up" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
    </div>

    <div className="flex-1 min-w-0">
      <h3 className="text-xl font-bold text-slate-800 truncate">
        {profile ? `${profile.nombres} ${profile.apellidos}` : datauser?.data?.name}
      </h3>
      <p className="text-sm text-slate-500 truncate mt-0.5">
        {profile?.email || datauser?.data?.email}
      </p>
      
      {/* Badges / Datos secundarios */}
      <div className="mt-3 flex flex-col gap-1.5">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-md">Rol</span>
          <span className="font-semibold text-slate-700">{profile?.nombre_rol || datauser?.data?.rol}</span>
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-md">Gerencia</span>
          <span className="font-semibold text-slate-700 truncate">{profile?.nombre_gerencia || '—'}</span>
        </p>
      </div>
    </div>
  </div>

  {/* Contenedor de Preview de imagen */}
  {preview && (
    <div className="mt-5  items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <img src={preview} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
        <span className="text-xs text-slate-500 font-medium">¿Guardar nueva foto?</span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={uploadAvatar} 
          disabled={savingAvatar} 
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs shadow-sm shadow-indigo-100 transition-colors disabled:opacity-50"
        >
          {savingAvatar ? 'Subiendo...' : 'Subir'}
        </button>
        <button 
          onClick={() => { setAvatarFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} 
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-xl text-xs border border-slate-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )}

  {/* Footer con Botones de Acción */}
  <div className="mt-6 pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
    <button 
      onClick={() => setShowChangePw(true)} 
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-emerald-100 active:scale-[0.98] transition-all"
    >
      <Lock className="w-4 h-4" />
      Cambiar contraseña
    </button>
    <button 
      onClick={onClose} 
      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl active:scale-[0.98] transition-all"
    >
      Cerrar
    </button>
  </div>
</div>
      } />

      {showChangePw && (
        <ChangePasswordModal open={showChangePw} onClose={() => setShowChangePw(false)} userId={profile?.id_usuario || datauser?.userId} />
      )}
    </>
  );
}
