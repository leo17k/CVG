import * as React from "react";
import { useState } from "react";
import { Modal } from './componentes dashboard/Modal';

// --- UTILIDAD DE CLASES (Opcional, puedes usar plantillas de cadena normales) ---
const clsx = (...classes) => classes.filter(Boolean).join(" ");

// --- COMPONENTE PRINCIPAL ---
export function Avatar({ className, size = "default", children, ...props }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <div
      className={clsx(
        "relative flex shrink-0 overflow-hidden rounded-full bg-gray-100",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// --- IMAGEN ---
export function AvatarImage({ className, src, alt = "avatar", ...props }) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={clsx("aspect-square cursor-pointer hover:scale-110 duration-150 h-full w-full object-cover", className)}
      {...props}
    />
  );
}

// --- FALLBACK (Lo que se ve si no hay imagen) ---
export function AvatarFallback({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        "flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-slate-600/50 font-medium text-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// --- BADGE (Punto de estado, ej: online) ---
export function AvatarBadge({ className, ...props }) {
  return (
    <span
      className={clsx(
        "absolute right-0 bottom-0 block h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500",
        className
      )}
      {...props}
    />
  );
}

export function AvatarGroup({ className, ...props }) {

  return (
    <div
      data-slot="avatar-group"
      className={
        "*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2"
      }
      {...props}
    />
  )
}
export function AvatarGroupCount({ 
  className, 
  funcion, 
  size = "default", 
  children, 
  ...props 
}) {
  const sizeClasses = {
    sm: "size-6 text-[10px]",
    default: "size-8 text-sm",
    lg: "size-10 text-base",
  };

  return (
    <div
      data-slot="avatar-group-count"
      // Validación simple: si 'funcion' existe, úsala; si no, haz nada.
      onClick={() => funcion && funcion()} 
      className={clsx(
        "bg-white/50 backdrop-blur-xs border-gray-600/50 text-gray-900/50  cursor-pointer  relative flex shrink-0 items-center justify-center rounded-full font-medium ring-2 transition-transform active:scale-95",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}