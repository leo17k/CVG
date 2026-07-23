import React, { useState } from 'react';
import { Modal } from './componentes dashboard/Modal.jsx';
import ConfirmationModal from './Confirmacion';
import { toast } from './GoeyToaster';
import { Lock } from 'lucide-react';
import { Input } from './Inputs';

const API = `http://${window.location.hostname}:5000`;

export default function ChangePasswordModal({ open, onClose, userId }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, val, setter) => {
    setter(val);
    if (errors[field]) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr[field];
        return newErr;
      });
    }
  };

  const handleRequestChange = () => {
    const newErrors = {};
    if (!currentPw) newErrors.currentPassword = "La contraseña actual es obligatoria";
    if (!newPw) {
      newErrors.newPassword = "La nueva contraseña es obligatoria";
    } else if (newPw.length < 6) {
      newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres";
    }
    if (!confirmPw) {
      newErrors.confirmPassword = "Debe confirmar la nueva contraseña";
    } else if (newPw !== confirmPw) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.warn("Por favor, complete los campos correctamente.");
      return;
    }

    setErrors({});
    setConfirmOpen(true);
  };

  const handleClose = () => {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setErrors({});
    onClose();
  };

  const doChange = async () => {
    setChanging(true);
    try {
      const resp = await fetch(`${API}/usuarios/${userId}/password`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.ok) {
        toast.success('Contraseña actualizada');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setErrors({});
        onClose();
      } else {
        toast.error(j.error || 'No se pudo cambiar la contraseña');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error interno al cambiar contraseña');
    } finally {
      setChanging(false);
      setConfirmOpen(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal onClose={handleClose} contenido={
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 rounded-full">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cambiar contraseña</h3>
              <p className="text-sm text-slate-500">Ingresa tu contraseña actual y la nueva contraseña.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input label="Contraseña actual" type="password" name="currentPassword" value={currentPw} onChange={e => handleInputChange('currentPassword', e.target.value, setCurrentPw)} error={errors.currentPassword} />
            <Input label="Nueva contraseña" type="password" name="newPassword" value={newPw} onChange={e => handleInputChange('newPassword', e.target.value, setNewPw)} error={errors.newPassword} />
            <Input label="Confirmar nueva contraseña" type="password" name="confirmPassword" value={confirmPw} onChange={e => handleInputChange('confirmPassword', e.target.value, setConfirmPw)} error={errors.confirmPassword} />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 bg-slate-100 rounded-xl">Cancelar</button>
            <button onClick={handleRequestChange} disabled={changing} className="px-4 py-2 bg-emerald-600 text-white rounded-xl">{changing ? 'Guardando...' : 'Cambiar contraseña'}</button>
          </div>
        </div>
      } />

      <ConfirmationModal
        isOpen={confirmOpen}
        title={'Confirmar cambio de contraseña'}
        message={'¿Deseas cambiar tu contraseña ahora?'}
        type={'question'}
        onConfirm={doChange}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
