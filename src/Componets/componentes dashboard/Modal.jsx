import React, { useEffect, useState } from "react";

const Close = ({ onClose }) => (
  <button onClick={onClose} className="absolute top-4 right-6 group z-10">
    <svg
      className="transition-transform duration-300 group-hover:scale-110 stroke-blue-600"
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M10 10l4 4m0 -4l-4 4" />
      <path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" />
    </svg>
  </button>
);

const Modal = ({ onClose, contenido }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Al montar, activamos la clase de CSS
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsMounted(false); // Inicia animación de salida en CSS
    setTimeout(onClose, 300); // Desmonta el componente tras la animación
  };

  return (
    <div
      className={`fixed  inset-0 custom-scrollbar z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] modal-overlay ${isMounted ? 'active' : ''}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-white relative rounded-2xl shadow-2xl modal-content
          min-w-[400px] min-h-[400px] max-sm:w-full max-sm:h-full
          flex flex-col custom-scrollbar
        `}
      >
        <Close onClose={handleClose} />
        <div className="p-8 w-full h-full ">
          {contenido}
        </div>
      </div>
    </div>
  );
};

export { Modal };