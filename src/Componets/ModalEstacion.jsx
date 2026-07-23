import React, { useState } from 'react';

const ModalEstacion = ({ isOpen, onClose, accion, estacion, onConfirm }) => {
  if (!isOpen) return null;

  // Estado local para los campos del formulario (opcional, según la acción)
  const [formData, setFormData] = useState({ ...estacion });

  const renderContent = () => {
    switch (accion) {
      case 'editar':
        return (
          <>
            <h3>Editar Estación: {estacion.nombre}</h3>
            <input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre"
            />
            <input
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Ubicación"
            />
          </>
        );
      case 'eliminar':
        return (
          <>
            <h3>¿Estás seguro?</h3>
            <p>Vas a eliminar la estación <strong>{estacion.nombre}</strong>. Esta acción es irreversible.</p>
          </>
        );
      case 'mensaje':
        return (
          <>
            <h3>Enviar Mensaje a {estacion.nombre}</h3>
            <textarea placeholder="Escribe tu mensaje aquí..." rows="4" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {renderContent()}

        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button
            className={`btn-${accion}`}
            onClick={() => onConfirm(accion, formData)}
          >
            {accion === 'editar' ? 'Guardar' : accion === 'eliminar' ? 'Eliminar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEstacion;