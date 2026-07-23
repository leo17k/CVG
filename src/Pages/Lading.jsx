import react from 'react';
import Nav from '../Componets/Nav.jsx';
import Bg from '../Componets/bg.jsx';

export default function Lading() {
  return (
    <div className="bg-white h-[100dvh]">

      <Nav /> <Bg />
      <div className="relative isolate px-6 pt-0 lg:px-8">

        <div className="mx-auto max-w-2xl py-30 sm:py-28 lg:py-26">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative group flex gap-2 items-center rounded-full px-3 py-1 text-sm/6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
              No estas registrado. {' '}
              <a href="#" className=" flex items-center font-semibold text-blue-600 dark:text-blue-400">
                <span aria-hidden="true" className="absolute inset-0" />
                Registrarce <span aria-hidden="true">
                  <span
                    aria-hidden="true"
                    className="transition duration-300 group-hover:translate-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-right"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M5 12l14 0" />
                      <path d="M15 16l4 -4" />
                      <path d="M15 8l4 4" />
                    </svg>
                  </span>
                </span>
              </a>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">
              Sistema de gestion de compra y venta
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
              Facilita el proceso para la solisitudes  de compra y venta de productos a traves de un sistema web diseñado para disminuir el tiempo de espera y la complejidad de la gestion de compras y ventas.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/Login"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Iniciar Seccion
              </a>
              <a href="/Login" className="text-sm font-semibold text-gray-600 border border-gray-600 rounded-xl px-3.5 py-2.5">
                Registrarce <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

      </div>


    </div>
  );
}