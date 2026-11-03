"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Package } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import Tarjeta from "@/components/ui/Tarjeta";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Proveedores() {
  const productos = useLiveQuery(() => (db ? db.productos.toArray() : []), [], []) || [];

  const proveedores = useMemo(() => {
    const mapa = new Map();
    productos.forEach((producto) => {
      const clave = producto.proveedorId || producto.proveedorNombre || "Sin proveedor";
      const actual = mapa.get(clave) || {
        clave,
        nombre: producto.proveedorId || producto.proveedorNombre || "Sin proveedor",
        productos: [],
      };
      actual.productos.push(producto);
      mapa.set(clave, actual);
    });
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  const totalProductos = proveedores.reduce(
    (total, proveedor) => total + proveedor.productos.length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
            <Etiqueta variante="info">
              <Package className="h-3 w-3" />
              {proveedores.length} proveedores
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Relación local de productos por proveedor con costos de compra.
          </p>
        </div>
      </div>

      {proveedores.length === 0 ? (
        <EstadoVacio
          icono={Package}
          titulo="Sin proveedores registrados"
          descripcion="Los productos anotados con proveedor aparecerán aquí."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {proveedores.map((proveedor) => (
            <Tarjeta key={proveedor.clave} className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{proveedor.nombre}</h2>
                <Etiqueta variante="neutra">{proveedor.productos.length} productos</Etiqueta>
              </div>
              <div className="space-y-2">
                {proveedor.productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borde)] pb-2 text-[11px] last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{producto.nombre}</p>
                      <p className="text-[10px] text-[var(--texto-suave)]">
                        SKU: {producto.sku || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase text-[var(--texto-suave)]">
                        Costo
                      </span>
                      <span className="font-semibold">
                        {Number(producto.precioCompraUsd || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })}{" "}
                        USD
                      </span>
                      <span className="font-semibold">
                        {Number(producto.precioCompraVes || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })}{" "}
                        VES
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      <Tarjeta className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Total productos anotados</p>
          <p className="text-lg font-bold">{totalProductos}</p>
        </div>
      </Tarjeta>
    </div>
  );
}
