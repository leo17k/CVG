import React from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const FloatingHelpWidget = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Mostrar la guía solamente en el módulo de Solicitudes (Dashboard) o
  // cuando el modal de detalle/creación de solicitudes esté abierto.
  const isBrowser = typeof document !== 'undefined';
  const hasSolicitudModalGlobal = isBrowser && !!document.querySelector('#solicitud-modal');
  const hasNewRequestModalGlobal = isBrowser && !!document.querySelector('#new-request-modal');
  const allowedPaths = ['/dashboard', '/dashboard-admin'];
  const showHelpWidget = allowedPaths.includes(currentPath) || hasSolicitudModalGlobal || hasNewRequestModalGlobal;

  // Ejecución directa del tour interactivo
  const startModuleTour = () => {
    let steps = [];

    // Detectar modales o elementos que indiquen un contexto concreto (detalles / nueva solicitud)
    const hasSolicitudModal = !!document.querySelector('#solicitud-modal');
    const hasNewRequestModal = !!document.querySelector('#new-request-modal');
    const hasAlmacenPage = !!document.querySelector('#almacen-page') || currentPath === '/Almacen';

    // Paso 1 común para todos los módulos: explicación del flujo de estados.
    // No la mostramos cuando estamos ejecutando la guía dentro del modal de "Nueva Solicitud" (el usuario ya vio el botón en otra guía).
    const flowStep = {
      element: 'body',
      popover: {
        title: 'Flujo de las Solicitudes',
        description: `
          <div style="font-family: system-ui, -apple-system, sans-serif; text-align: left; margin-top: 4px;">
            <p style="margin-bottom: 14px; font-size: 12.5px; color: #475569; line-height: 1.5;">
              Aquí tienes una explicación rápida del ciclo de vida y la recta de estados de una solicitud:
            </p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: #f59e0b; color: white; border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-top: 2px; min-width: 75px; text-align: center;">Pendiente</span>
                <div style="font-size: 12.5px; color: #1e293b;"><strong style="color: #0f172a;">Aprobación Gerencial:</strong> El Gerente del departamento firma digitalmente la solicitud.</div>
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: #3b82f6; color: white; border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-top: 2px; min-width: 75px; text-align: center;">Verificado</span>
                <div style="font-size: 12.5px; color: #1e293b;"><strong style="color: #0f172a;">Inventario Almacén:</strong> Almacén verifica si existen los productos en stock físico para despacho rápido.</div>
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: #6366f1; color: white; border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-top: 2px; min-width: 75px; text-align: center;">En Compras</span>
                <div style="font-size: 12.5px; color: #1e293b;"><strong style="color: #0f172a;">Proceso Compras:</strong> Si no hay stock disponible, el expediente pasa a Compras para cotizar con proveedores.</div>
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: #10b981; color: white; border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-top: 2px; min-width: 75px; text-align: center;">Aprobada</span>
                <div style="font-size: 12.5px; color: #1e293b;"><strong style="color: #0f172a;">Compra Aprobada:</strong> La gerencia general o administrador autoriza el presupuesto final y la compra.</div>
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: #059669; color: white; border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-top: 2px; min-width: 75px; text-align: center;">Finalizado</span>
                <div style="font-size: 12.5px; color: #1e293b;"><strong style="color: #0f172a;">Ingreso y Entrega:</strong> Los artículos ingresan al stock del almacén y se entregan al solicitante original.</div>
              </div>
            </div>
          </div>
        `,
        side: 'center',
        align: 'center'
      }
    };

    if (!hasNewRequestModal) steps.push(flowStep);



    // Helper: verificar soporte y visibilidad de selectores
    const supportsSelector = (sel) => {
      try { document.querySelectorAll(sel); return true; } catch (e) { return false; }
    };

    const isVisible = (sel) => {
      try {
        if (!sel) return false;
        if (sel === 'body') return true;
        if (supportsSelector(sel)) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0) return true;
          }
          return false;
        }

        // Fallback básico para selectores :has(...) que no soporten querySelectorAll
        if (sel.includes(':has(')) {
          const parts = sel.split(':has(');
          const parent = parts[0].trim();
          const inner = parts[1].replace(/\)$/, '').trim();
          if (!inner) return false;
          const innerEls = document.querySelectorAll(inner);
          for (const innerEl of innerEls) {
            const ancestor = innerEl.closest(parent);
            if (ancestor) {
              const rect = ancestor.getBoundingClientRect();
              const style = window.getComputedStyle(ancestor);
              if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0) return true;
            }
          }
        }

        return false;
      } catch (e) { return false; }
    };

    // Construir pasos según contexto. Si hay un modal (detalle o nuevo request) *no* añadimos pasos globales de página.
    if (hasSolicitudModal) {
      steps.push(
        {
          element: '#solicitud-modal',
          popover: {
            title: 'Detalle de Solicitud',
            description: 'Aquí ves el expediente completo: resumen, justificación y metadatos. Revisa los ítems y las acciones disponibles en la parte inferior.',
            side: 'center',
            align: 'center'
          }
        },
        {
          element: '#solicitud-modal [data-tour="solicitud-items"]',
          popover: {
            title: 'Ítems de la Solicitud',
            description: 'Lista de productos o servicios incluidos en la solicitud con cantidades y códigos.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#solicitud-modal [data-tour="solicitud-actions"]',
          popover: {
            title: 'Acciones y Seguimiento',
            description: 'Desde aquí puedes aprobar, rechazar, generar PDF o solicitar ajustes.',
            side: 'bottom',
            align: 'center'
          }
        }
      );
    } else if (hasNewRequestModal || document.querySelector('#new-request-btn')) {
      // Si el modal ya está abierto no mostramos el botón superior (el usuario ya lo vio en otra guía)
      if (!hasNewRequestModal && document.querySelector('#new-request-btn')) {
        steps.push({
          element: '#new-request-btn',
          popover: {
            title: 'Crear Nueva Solicitud',
            description: 'Haz clic aquí para abrir el asistente para crear una nueva solicitud (Compra/Servicio/Obra).',
            side: 'bottom',
            align: 'center'
          }
        });
      }

      if (hasNewRequestModal) {
        // Guía enfocada al wizard de creación: NO mostrar estados globales ni el botón superior.
        steps.push(
          {
            element: '#new-request-modal',
            popover: {
              title: 'Asistente de Creación',
              description: 'Esta guía te mostrará paso a paso cómo crear una solicitud. Haz clic en los elementos cuando te lo indique el asistente.',
              side: 'center',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-stepper"]',
            popover: {
              title: 'Pasos del Wizard',
              description: 'Tipo → Ítems → Justificación. Empezaremos por seleccionar el tipo (Compra).',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-type-compra"]',
            popover: {
              title: 'Selecciona Tipo: Compra',
              description: 'Haz clic en "Compra" para comenzar una solicitud de compra. No se hará clic automáticamente en este paso.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-resumen"]',
            popover: {
              title: 'Resumen de la Solicitud',
              description: 'Escribe un resumen corto de lo que solicitas. Te ayudaremos a rellenarlo.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-catalog"]',
            popover: {
              title: 'Catálogo',
              description: 'Abre el catálogo para buscar y agregar productos o servicios a la solicitud. Puedes seleccionar los ítems manualmente.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-next"]',
            popover: {
              title: 'Siguiente',
              description: 'Haz clic en "Siguiente" para avanzar a la justificación. En esta guía avanzaremos y te ayudaremos a rellenar la justificación.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-justificacion"]',
            popover: {
              title: 'Justificación',
              description: 'Rellena la justificación técnica. El asistente puede ayudarte a completar un texto de ejemplo.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-modal [data-tour="new-request-submit"]',
            popover: {
              title: 'Enviar Solicitud',
              description: 'Revisa los datos. Aquí verás el botón para enviar la solicitud; la guía no lo pulsará automáticamente.',
              side: 'bottom',
              align: 'center'
            }
          }
        );
      }
    } else if (hasAlmacenPage) {
      steps.push(
        {
          element: '#almacen-page .col-span-4',
          popover: {
            title: 'Bandeja de Almacén',
            description: 'Aquí gestionas las solicitudes que requieren verificación física y control de stock.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#almacen-page .col-span-1',
          popover: {
            title: 'Panel Lateral de Estadísticas',
            description: 'Muestra contadores útiles: productos, categorías, stock crítico y solicitudes.',
            side: 'left',
            align: 'center'
          }
        }
      );
    } else {
      // Solo añadir pasos globales de la página cuando NO hay un modal abierto
      if (currentPath === '/dashboard' || currentPath === '/dashboard-admin') {
        steps.push(
          {
            element: '#tabs-roles',
            popover: {
              title: 'Pestañas de Vista y Segmentación',
              description: 'Cambia rápidamente de pestaña según tu rol: "Mis Solicitudes" (personales), "Compras" (procura activa) y "Auditar todas" (vista completa para administradores).',
              side: 'bottom',
              align: 'start'
            }
          },
          {
            element: 'button[title="Refrescar tabla"]',
            popover: {
              title: 'Refrescar Información',
              description: 'Recarga los datos de las solicitudes de forma inmediata para mantenerte al día en tiempo real.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: 'button:has(svg.lucide-filter)',
            popover: {
              title: 'Panel de Filtros y Búsqueda',
              description: 'Permite buscar por resumen o ID (incluso con prefijos #, C- o S-) y filtrar por estados específicos de solicitudes.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#new-request-btn',
            popover: {
              title: 'Crear Nueva Solicitud',
              description: 'Abre el wizard interactivo de creación de solicitudes de Compra, Servicio u Obra.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '.custom-scrollbar',
            popover: {
              title: 'Tabla de Solicitudes',
              description: 'Haz clic en el icono del "Ojo" para abrir el modal de detalles y seguir paso a paso su ciclo de vida.',
              side: 'top',
              align: 'center'
            }
          }
        );
      } else if (currentPath === '/Almacen') {
        steps.push(
          {
            element: '.col-span-4',
            popover: {
              title: 'Módulo de Almacén',
              description: 'Bandeja principal para gestionar stock de productos, registrar nuevas existencias y verificar solicitudes de despacho.',
              side: 'right',
              align: 'center'
            }
          },
          {
            element: '.col-span-1',
            popover: {
              title: 'Contadores de Inventario',
              description: 'Supervisa de un vistazo categorías registradas, stock crítico bajo mínimo e inventario global.',
              side: 'left',
              align: 'center'
            }
          }
        );
      } else if (currentPath === '/compras') {
        steps.push(
          {
            element: '.flex-col.w-full.h-full.bg-white',
            popover: {
              title: 'Panel de Compras',
              description: 'Gestión y licitación de solicitudes autorizadas por Gerencia. Aquí se marcan como Finalizadas o Rechazadas.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: 'button:has(svg.lucide-refresh-cw)',
            popover: {
              title: 'Refrescar Compras',
              description: 'Sincroniza y recarga las compras asignadas a tu área en tiempo real.',
              side: 'bottom',
              align: 'center'
            }
          }
        );
      } else {
        steps.push(
          {
            element: 'aside',
            popover: {
              title: 'Menú Lateral',
              description: 'Navega cómodamente entre los diferentes módulos habilitados para tu cuenta.',
              side: 'right',
              align: 'center'
            }
          }
        );
      }
    }

    // Autocompletado del wizard deshabilitado por petición del usuario.

    // Filtrar pasos que no están presentes o no son visibles
    const filteredSteps = steps.filter(step => {
      if (typeof step.element === 'string') {
        return isVisible(step.element);
      }
      return true;
    });

    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      steps: filteredSteps
    });

    driverObj.drive();
  };

  return (
    <>
      {/* Botón Flotante con Gatillo Directo de Driver.js */}
      {showHelpWidget && (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
          <button
            onClick={startModuleTour}
            className="w-14 h-14 rounded-full bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-xl hover:shadow-blue-200/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
            title="Iniciar Guía del Módulo"
          >
            <HelpCircle size={26} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute right-16 scale-0 group-hover:scale-100 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shadow-lg">
              Guía rápida
            </span>
          </button>
        </div>
      )}

      {/* Estilos Personalizados - Diseño Premium con Botones Azul Royale */}
      <style>{`
        .driver-popover {
          border-radius: 24px !important;
          padding: 24px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          max-width: 440px !important;
          background: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(8px) !important;
        }
        .driver-popover-title {
          font-size: 16px !important;
          font-weight: 900 !important;
          color: #0f172a !important;
          letter-spacing: -0.01em !important;
          margin-bottom: 8px !important;
          text-transform: uppercase !important;
          font-family: inherit !important;
        }
        .driver-popover-description {
          font-size: 13px !important;
          color: #475569 !important;
          line-height: 1.6 !important;
          font-family: inherit !important;
        }
        .driver-popover-next-btn, .driver-popover-done-btn {
          background-color: #4169E1 !important; /* Azul Royale */
          color: white !important;
          text-shadow: none !important;
          border: none !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          padding: 8px 18px !important;
          border-radius: 12px !important;
          transition: all 0.2s ease-in-out !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3) !important;
        }
        .driver-popover-next-btn:hover, .driver-popover-done-btn:hover {
          background-color: #274fc9 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 18px rgba(65, 105, 225, 0.4) !important;
        }
        .driver-popover-prev-btn {
          background-color: #f1f5f9 !important;
          color: #64748b !important;
          text-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          padding: 8px 18px !important;
          border-radius: 12px !important;
          transition: all 0.2s ease-in-out !important;
          cursor: pointer !important;
        }
        .driver-popover-prev-btn:hover {
          background-color: #e2e8f0 !important;
          color: #334155 !important;
        }
        .driver-popover-progress-text {
          color: #94a3b8 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }
        .driver-popover-close-btn {
          color: #94a3b8 !important;
          transition: color 0.2s !important;
        }
        .driver-popover-close-btn:hover {
          color: #475569 !important;
        }
      `}</style>
    </>
  );
};

export default FloatingHelpWidget;
