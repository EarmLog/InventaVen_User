"use client";

import {
  AtSign,
  Mail,
  MessageCircle,
  PackageOpen,
  Phone,
  Send,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

function limpiarDigitos(valor) {
  return String(valor ?? "")
    .replace(/\D/g, "")
    .slice(0, 20);
}

function limpiarUsuario(valor, permitirPunto = false) {
  let texto = String(valor ?? "")
    .trim()
    .replace(/^@+/, "");
  if (!texto) return "";

  if (
    /^(https?:\/\/|www\.|(?:t\.me|telegram\.me|instagram\.com)\/)/i.test(
      texto
    )
  ) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(texto) ? texto : `https://${texto}`
      );
      texto = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] || "");
    } catch {
      texto = "";
    }
  }

  return texto
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "")
    .replace(permitirPunto ? /[^A-Za-z0-9._]/g : /[^A-Za-z0-9_]/g, "")
    .slice(0, 32);
}

function limpiarCorreo(valor) {
  const correo = String(valor ?? "")
    .trim()
    .toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? correo : "";
}

function datosStock(stock) {
  if (stock === null || stock === undefined || stock === "") {
    return { numero: null, etiqueta: "" };
  }
  const numero = Number(stock);
  if (!Number.isFinite(numero)) return { numero: null, etiqueta: "" };
  if (numero <= 0) return { numero, etiqueta: "Agotado" };
  if (numero <= 5) return { numero, etiqueta: "Últimas unidades" };
  return { numero, etiqueta: "Disponible" };
}

function clasesStock(etiqueta) {
  if (etiqueta === "Agotado") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }
  if (etiqueta === "Últimas unidades") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
}

function precioDiferente(variante, precioVesBase, precioUsdBase) {
  const precios = [];

  if (
    variante?.precioVes !== null &&
    variante?.precioVes !== undefined &&
    variante?.precioVes !== ""
  ) {
    const ves = Number(variante.precioVes);
    if (Number.isFinite(ves) && ves !== precioVesBase) {
      precios.push(formatearVes(ves));
    }
  }

  if (
    variante?.precioUsd !== null &&
    variante?.precioUsd !== undefined &&
    variante?.precioUsd !== ""
  ) {
    const usd = Number(variante.precioUsd);
    if (Number.isFinite(usd) && usd !== precioUsdBase) {
      precios.push(formatearUsd(usd));
    }
  }

  return precios.join(" · ");
}

export default function ModalDetalleProductoPublico({
  abierto,
  producto,
  contactos,
  onCerrar,
}) {
  if (!producto) return null;

  const nombre = String(producto.nombre || "Producto");
  const categoria = String(producto.categoria || "").trim();
  const descripcion = String(producto.descripcion || "").trim();
  const imagenUrl = String(producto.imagenUrl || "").trim();
  const sku = String(producto.sku || "").trim();
  const precioVes = Number(producto.precioVes) || 0;
  const precioUsd = Number(producto.precioUsd) || 0;
  const stock = datosStock(producto.stock);
  const variantes = (
    Array.isArray(producto.variantes) ? producto.variantes : []
  ).filter((variante) => variante && variante.activo !== false);

  const nombreNegocio = String(contactos?.nombreNegocio || "").trim();
  const telefono = limpiarDigitos(contactos?.telefono);
  const usuarioTelegram = limpiarUsuario(contactos?.telegram);
  const usuarioInstagram = limpiarUsuario(contactos?.instagram, true);
  const correo = limpiarCorreo(contactos?.correoContacto);
  const mensaje = `Hola${nombreNegocio ? ` ${nombreNegocio}` : ""}, quiero información sobre ${nombre}${sku ? ` (SKU ${sku})` : ""}.`;
  const asunto = `Consulta sobre ${nombre}${sku ? ` (SKU ${sku})` : ""}`;

  const claseBoton =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.99]";
  const botonesContacto = [
    telefono
      ? {
          etiqueta: "WhatsApp",
          href: `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
          icono: MessageCircle,
          clase: "bg-emerald-600 text-white hover:bg-emerald-700",
          externo: true,
        }
      : null,
    telefono
      ? {
          etiqueta: "Llamar",
          href: `tel:${telefono}`,
          icono: Phone,
          clase: "border border-[var(--borde)] bg-[var(--superficie-2)] text-[var(--texto)] hover:bg-[var(--superficie-3)]",
          externo: false,
        }
      : null,
    usuarioTelegram
      ? {
          etiqueta: "Telegram",
          href: `https://t.me/${usuarioTelegram}`,
          icono: Send,
          clase: "bg-sky-600 text-white hover:bg-sky-700",
          externo: true,
        }
      : null,
    correo
      ? {
          etiqueta: "Correo",
          href: `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`,
          icono: Mail,
          clase: "border border-[var(--borde)] bg-[var(--superficie-2)] text-[var(--texto)] hover:bg-[var(--superficie-3)]",
          externo: false,
        }
      : null,
    usuarioInstagram
      ? {
          etiqueta: "Instagram",
          href: `https://instagram.com/${usuarioInstagram}`,
          icono: AtSign,
          clase: "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
          externo: true,
        }
      : null,
  ].filter(Boolean);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={nombre}
      descripcion={categoria || "Detalle del producto"}
      ancho="md"
      pie={
        botonesContacto.length > 0 ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {botonesContacto.map((boton) => {
              const Icono = boton.icono;
              return (
                <a
                  key={boton.etiqueta}
                  href={boton.href}
                  target={boton.externo ? "_blank" : undefined}
                  rel={boton.externo ? "noopener noreferrer" : undefined}
                  className={`${claseBoton} ${boton.clase}`}
                >
                  <Icono className="h-4 w-4 shrink-0" />
                  {boton.etiqueta}
                </a>
              );
            })}
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[var(--borde)] bg-white sm:aspect-[4/3]">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={nombre}
              className="h-full w-full object-contain p-3"
              onError={(evento) => {
                evento.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--texto-tenue)]">
              <PackageOpen className="h-10 w-10" />
              <span className="text-xs font-semibold">Sin imagen</span>
            </div>
          )}
          {stock.etiqueta ? (
            <span
              className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 text-[11px] font-extrabold shadow-sm ${clasesStock(stock.etiqueta)}`}
            >
              {stock.etiqueta}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categoria ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {categoria}
            </span>
          ) : null}
          {sku ? (
            <span className="rounded-full border border-[var(--borde)] px-2.5 py-1 text-[11px] font-semibold text-[var(--texto-suave)]">
              SKU {sku}
            </span>
          ) : null}
        </div>

        {descripcion ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--texto-suave)]">
            {descripcion}
          </p>
        ) : null}

        <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--texto-tenue)]">
            Precios
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-2xl font-extrabold leading-tight text-emerald-700 dark:text-emerald-400">
              {formatearVes(precioVes)}
            </p>
            <p className="text-sm text-[var(--texto-suave)]">
              {formatearUsd(precioUsd)}
            </p>
          </div>
        </div>

        {variantes.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[var(--texto-tenue)]">
              Variantes activas
            </p>
            <div className="overflow-hidden rounded-xl border border-[var(--borde)]">
              <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1fr] gap-2 border-b border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--texto-tenue)] sm:grid">
                <span>Variante</span>
                <span>SKU</span>
                <span>Stock</span>
                <span>Precio</span>
              </div>
              {variantes.map((variante, indice) => {
                const nombreVariante = String(variante.nombre || "Variante");
                const skuVariante = String(variante.sku || "").trim();
                const stockVariante = datosStock(variante.stock);
                const precioVariante = precioDiferente(
                  variante,
                  precioVes,
                  precioUsd
                );
                return (
                  <div
                    key={variante.id || `${nombreVariante}-${indice}`}
                    className="grid grid-cols-2 gap-2 border-b border-[var(--borde)] px-3 py-2.5 text-xs last:border-b-0 sm:grid-cols-[1.4fr_1fr_0.8fr_1fr] sm:items-center"
                  >
                    <span className="col-span-2 font-semibold text-[var(--texto)] sm:col-span-1">
                      {nombreVariante}
                    </span>
                    <span className="text-[var(--texto-suave)]">
                      {skuVariante || "—"}
                    </span>
                    <span className="text-[var(--texto-suave)]">
                      {stockVariante.etiqueta === "Disponible"
                        ? `${stockVariante.numero} und.`
                        : stockVariante.etiqueta || "—"}
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {precioVariante || "Igual al producto"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
