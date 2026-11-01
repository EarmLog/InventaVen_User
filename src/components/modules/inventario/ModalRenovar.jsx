"use client";

import { useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Alerta from "@/components/ui/Alerta";
import { renovarStock } from "@/lib/db/repositorios";
import { calcularPrecioDual, etiquetaEmpaque } from "@/lib/utilidades/precios";
import {
  formatearUsd,
  formatearVes,
  formatearNumero,
  limpiarNumero,
  redondear,
} from "@/lib/utilidades/formato";

export default function ModalRenovar({ abierto, producto, tasa, onCerrar, onGuardado }) {
  const [varianteId, setVarianteId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [moneda, setMoneda] = useState("VES");
  const [costoValor, setCostoValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tasaUsada = Number(tasa) || Number(producto?.tasaUsd) || 0;

  useEffect(() => {
    if (!abierto || !producto) return;
    setVarianteId(producto.variantes?.length ? producto.variantes[0].id : "");
    setCantidad("1");
    setMoneda("VES");
    setCostoValor("");
    setError("");
  }, [abierto, producto]);

  if (!producto) return null;

  const costo = calcularPrecioDual(costoValor, moneda, tasaUsada);
  const varianteSeleccionada = (producto.variantes || []).find(
    (variante) => variante.id === varianteId
  );
  const stockActual = varianteSeleccionada
    ? Number(varianteSeleccionada.stock)
    : Number(producto.stock);
  const nuevoStock = redondear(stockActual + limpiarNumero(cantidad, 0), 3);

  async function guardar() {
    setError("");
    if (limpiarNumero(cantidad, 0) <= 0) {
      setError("La cantidad a renovar debe ser mayor a cero.");
      return;
    }
    if (producto.variantes?.length && !varianteId) {
      setError("Selecciona la variante que deseas renovar.");
      return;
    }
    if (costoValor && costo.ves <= 0) {
      setError("El nuevo costo en bolívares no es válido.");
      return;
    }
    setGuardando(true);
    try {
      await renovarStock({
        productoId: producto.id,
        varianteId: varianteId || null,
        cantidad: limpiarNumero(cantidad, 0),
        precioCompraUsd: costoValor ? costo.usd : null,
        precioCompraVes: costoValor ? costo.ves : null,
        tasaUsd: tasaUsada,
      });
      toast.success("Stock renovado correctamente.");
      onGuardado?.();
      onCerrar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Renovar stock"
      descripcion={`${producto.nombre} · ${producto.sku}`}
      ancho="md"
      bloqueado={guardando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            <PackagePlus className="h-4 w-4" />
            Renovar stock
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Stock actual
            </p>
            <p className="text-lg font-bold">{formatearNumero(stockActual)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Agregar
            </p>
            <p className="text-lg font-bold text-[var(--primario)]">
              +{formatearNumero(cantidad)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Nuevo stock
            </p>
            <p className="text-lg font-bold">{formatearNumero(nuevoStock)}</p>
          </div>
        </div>

        {producto.variantes?.length ? (
          <Campo etiqueta="Variante a renovar" requerido>
            <Selector
              value={varianteId}
              onChange={(evento) => setVarianteId(evento.target.value)}
            >
              {producto.variantes.map((variante) => (
                <option key={variante.id} value={variante.id}>
                  {variante.nombre} · {variante.sku} (stock {variante.stock})
                </option>
              ))}
            </Selector>
          </Campo>
        ) : (
          <p className="rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-xs text-[var(--texto-suave)]">
            Empaque: {etiquetaEmpaque(producto)}.
          </p>
        )}

        <Campo
          etiqueta={`Cantidad de ${producto.tipoEmpaque === "bulto" ? "bultos" : "unidades"}`}
          requerido
        >
          <Entrada
            type="number"
            min="0.001"
            step="1"
            value={cantidad}
            onChange={(evento) => setCantidad(evento.target.value)}
            autoFocus
          />
        </Campo>

        <div className="rounded-2xl border border-[var(--borde)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
              Actualizar costo de compra (opcional)
            </p>
            <Selector
              className="w-auto py-1 text-xs"
              value={moneda}
              onChange={(evento) => setMoneda(evento.target.value)}
            >
              <option value="VES">VES</option>
              <option value="USD">USD</option>
            </Selector>
          </div>
          <div className="mt-3">
            <Entrada
              type="number"
              min="0"
              step="0.01"
              value={costoValor}
              onChange={(evento) => setCostoValor(evento.target.value)}
              placeholder={`Costo actual: ${formatearVes(producto.precioCompraVes)}`}
            />
          </div>
          {costoValor ? (
            <p className="mt-2 text-[11px] text-[var(--texto-suave)]">
              Se guardará como {formatearVes(costo.ves)} · {formatearUsd(costo.usd)}
            </p>
          ) : null}
        </div>

        <Alerta tipo="info">
          La fecha de renovación se actualizará automáticamente y quedará registrada
          en el producto.
        </Alerta>
      </div>
    </Modal>
  );
}
