import React from 'react';
import { Edit } from 'lucide-react';

export default function ServiceCard({ item, onEdit = () => {}, onView = () => {} }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] font-mono text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-md">{item.codigo_servicio}</div>
                    <h3 className="text-lg font-black text-slate-800 mt-2">{item.nombre_servicio}</h3>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-3">{item.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50"><Edit size={16} /></button>
                </div>
            </div>
        </div>
    );
}
