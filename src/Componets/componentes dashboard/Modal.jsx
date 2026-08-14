import React, { useEffect, useState } from "react";

const Close = ({ onClose, hidden, className }) => (
  <button onClick={onClose} className={`${hidden ? 'hidden' : ''} ${className} absolute top-4 right-6 group z-10`}>
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

const Modal = ({ onClose, hidden = false, contenido, padding = true, title, fullscreen = false }) => {

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsMounted(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] modal-overlay ${isMounted ? 'active' : ''}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-white relative shadow-2xl modal-content
          flex flex-col 
          ${fullscreen ? 'w-full h-full rounded-none' : 'rounded-2xl min-w-[400px] min-h-[400px] max-sm:w-full max-sm:h-full'}
        `}
      >
        {title && (
          <div className="px-8 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
        )}
        <Close onClose={handleClose} hidden={hidden} />

        {/* Contenedor de contenido optimizado */}
        <div className={`w-full h-full custom-scrollbar overflow-auto ${padding ? 'p-8' : 'p-0'}`}>
          {contenido}
        </div>
      </div>
    </div>
  );
};
const FullModal = ({ onClose, contenido, hidden = false, padding = true, title, fullscreen = false }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsMounted(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed  inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] modal-overlay ${isMounted ? 'active' : ''} `}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
           justify-center items-center relative shadow-2xl modal-content
          flex flex-col 
          w-dvw h-full rounded-none
        `}
      >

        <Close onClose={handleClose} className='hidden' />

        {/* Contenedor de contenido optimizado */}
        <div className={`w-9/10 h-9/10 overflow-hidden rounded-2xl custom-scrollbar ${padding ? 'p-8' : 'p-0'}`}>
          {contenido}
        </div>
      </div>
    </div>
  );

}
export { Modal, FullModal };