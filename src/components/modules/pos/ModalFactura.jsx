"use client";

import { Printer, ReceiptText, ScrollText, Cpu } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import { imprimirTicketTermico } from "@/lib/utilidades/impresora";
import { emitirComprobanteFiscal } from "@/lib/utilidades/impresoraFiscal";
import {
  formatearFechaHora,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
} from "@/lib/utilidades/formato";

export default function ModalFactura({ abierto, venta, perfil, onCerrar }) {
  if (!venta) return null;
  const metodo =
    TIPOS_PAGO.find((tipo) => tipo.valor === venta.tipoPago)?.etiqueta ||
    venta.tipoPago;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Factura ${venta.numeroFactura}`}
      descripcion="Venta registrada correctamente. Puedes imprimir ticket térmico o factura."
      ancho="lg"
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          className="zona-impresion rounded-xl border border-[var(--borde)] bg-white p-5 text-slate-900"
          style={{ maxWidth: "58mm" }}
        >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-bold tracking-tight">
              {perfil?.nombreNegocio || "InventaVen"}
            </p>
            <p className="text-[11px] text-slate-500">
              {perfil?.telefono ? `${perfil.telefono} · ` : ""}
              {perfil?.correo || ""}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Comprobante de venta generado con InventaVen
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Factura
            </p>
            <p className="font-mono text-sm font-bold">{venta.numeroFactura}</p>
            <p className="mt-1 text-[10px] text-slate-500">{formatearFechaHora(venta.fecha)}</p>
          </div>
        </div>

        <div className="grid gap-2 border-b border-slate-200 py-3 text-[11px] sm:grid-cols-3">
          <div>
            <p className="text-slate-500">Cliente</p>
            <p className="font-semibold">{venta.clienteNombre || "Consumidor final"}</p>
          </div>
          <div>
            <p className="text-slate-500">Documento</p>
            <p className="font-semibold">{venta.clienteDocumento || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Método de pago</p>
            <p className="font-semibold">{metodo}</p>
          </div>
        </div>

        <table className="mt-3 w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2">Producto</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(venta.items || []).map((item, indice) => (
              <tr key={`${item.sku}-${indice}`} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <p className="font-semibold">{item.nombre}</p>
                  <p className="text-[10px] text-slate-500">
                    {item.variante ? `${item.variante} · ` : ""}
                    {item.sku}
                    {item.descuentoPorcentaje > 0
                      ? ` · oferta -${formatearPorcentaje(item.descuentoPorcentaje)}`
                      : ""}
                  </p>
                </td>
                <td className="py-2 text-center">{formatearNumero(item.cantidad)}</td>
                <td className="py-2 text-right">{formatearVes(item.precioUnitarioVes)}</td>
                <td className="py-2 text-right font-semibold">
                  {formatearVes(item.totalLineaVes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 ml-auto w-full max-w-xs space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatearVes(venta.subtotalVes)}</span>
          </div>
          {venta.descuentoVes > 0 ? (
            <div className="flex justify-between text-slate-500">
              <span>Descuento por ofertas</span>
              <span>-{formatearVes(venta.descuentoVes)}</span>
            </div>
          ) : null}
          {venta.ivaVes > 0 ? (
            <div className="flex justify-between text-slate-500">
              <span>IVA ({venta.porcentajeIva}%)</span>
              <span>{formatearVes(venta.ivaVes)}</span>
            </div>
          ) : null}
          <div className="flex items-end justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold uppercase tracking-wide text-slate-500">Total</span>
            <div className="text-right">
              <p className="text-lg font-bold">{formatearVes(venta.totalVes)}</p>
              <p className="text-[10px] text-slate-500">Ref. {formatearUsd(venta.totalUsd)}</p>
            </div>
          </div>
          {venta.tipoPago === "efectivo" ? (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Recibido</span>
                <span>{formatearVes(venta.montoRecibidoVes)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Vuelto</span>
                <span>{formatearVes(venta.vueltoVes)}</span>
              </div>
            </>
          ) : null}
          {venta.tasaUsd > 0 ? (
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Tasa aplicada</span>
              <span>{formatearVes(venta.tasaUsd)}</span>
            </div>
          ) : null}
        </div>

        {venta.notas ? (
          <p className="mt-3 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            Notas: {venta.notas}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-[10px] text-slate-500">
          <ReceiptText className="h-3.5 w-3.5" />
          Gracias por su compra · {venta.codigo}
        </div>
        </div>
        <div className="flex w-full flex-col gap-2 lg:w-64">
          <Boton onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir factura
          </Boton>
          <Boton variante="secundario" onClick={onCerrar}>
            Nueva venta
          </Boton>
          <Boton variante="secundario" onClick={() => imprimirTicketTermico(venta, perfil)}>
            <ScrollText className="h-4 w-4" />
            Ticket Térmico (58mm)
          </Boton>
          <Boton
            variante="secundario"
            onClick={() =>
              emitirComprobanteFiscal({
                venta,
                perfil,
                tipoImpresora: "the_factory",
                datosMaquina: { registro: "MAQ-0001" },
              })
            }
          >
            <Cpu className="h-4 w-4" />
            Emisor Fiscal (Driver)
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
