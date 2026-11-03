"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Plus, QrCode, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Interruptor from "@/components/ui/Interruptor";
import Alerta from "@/components/ui/Alerta";
import Etiqueta from "@/components/ui/Etiqueta";
import ModalEscanerCamara from "@/components/ui/ModalEscanerCamara";
import ModalEmparejamientoQR from "@/components/ui/ModalEmparejamientoQR";
import { guardarProducto } from "@/lib/db/repositorios";
import { db } from "@/lib/db/baseDatos";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";
import {
  CATEGORIAS_SUGERIDAS,
  SECUENCIAS,
  MONEDAS,
} from "@/lib/utilidades/constantes";
import { baseSku, numeracionCorrelativa } from "@/lib/utilidades/sku";
import {
  calcularGanancia,
  calcularPrecioDual,
  etiquetaEmpaque,
} from "@/lib/utilidades/precios";
import {
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  limpiarNumero,
  redondear,
} from "@/lib/utilidades/formato";

function formularioDesdeProducto(producto) {
  if (!producto) {
    return {
      nombre: "",
      sku: "",
      codigoBarra: "",
      descripcion: "",
      categoria: "Otros",
      tipoEmpaque: "unidad",
      unidadesPorBulto: 12,
      monedaCompra: "VES",
      compraValor: "",
      monedaVenta: "VES",
      ventaValor: "",
      stock: "0",
      stockMinimo: "0",
      activo: true,
      conVariantes: false,
      ofertaActiva: false,
      ofertaCantidad: "3",
      ofertaDescuento: "10",
      variantes: [],
    };
  }
  return {
    nombre: producto.nombre || "",
    sku: producto.sku || "",
    codigoBarra: producto.codigoBarra || "",
    descripcion: producto.descripcion || "",
    categoria: producto.categoria || "Otros",
    tipoEmpaque: producto.tipoEmpaque || "unidad",
    unidadesPorBulto: producto.unidadesPorBulto || 12,
    monedaCompra: "VES",
    compraValor: String(producto.precioCompraVes || ""),
    monedaVenta: "VES",
    ventaValor: String(producto.precioVentaVes || ""),
    stock: String(producto.stock || 0),
    stockMinimo: String(producto.stockMinimo || 0),
    activo: producto.activo !== false,
    conVariantes: Boolean(producto.variantes?.length),
    ofertaActiva: Boolean(producto.ofertaActiva),
    ofertaCantidad: String(producto.ofertaCantidad || 3),
    ofertaDescuento: String(producto.ofertaDescuento || 10),
    variantes: (producto.variantes || []).map((variante) => ({
      id: variante.id,
      sku: variante.sku,
      nombre: variante.nombre,
      stock: String(variante.stock ?? 0),
      precioVes: variante.precioVentaVes ? String(variante.precioVentaVes) : "",
      activo: variante.activo !== false,
    })),
  };
}

export default function ModalProducto({ abierto, producto, tasa, onCerrar, onGuardado }) {
  const [formulario, setFormulario] = useState(() => formularioDesdeProducto(producto));
  const [siguienteNumero, setSiguienteNumero] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [qrAbierto, setQrAbierto] = useState(false);

  const esEdicion = Boolean(producto?.id);
  const tasaUsada = Number(tasa) || Number(producto?.tasaUsd) || 0;

  useEffect(() => {
    if (!abierto) return;
    setFormulario(formularioDesdeProducto(producto));
    setError("");
    if (!producto) {
      (async () => {
        const secuencia = db ? await db.secuencias.get(SECUENCIAS.PRODUCTOS) : null;
        setSiguienteNumero(Number(secuencia?.valor || 0) + 1);
      })();
    }
  }, [abierto, producto]);

  function cambiar(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  const compra = calcularPrecioDual(
    formulario.compraValor,
    formulario.monedaCompra,
    tasaUsada
  );
  const venta = calcularPrecioDual(
    formulario.ventaValor,
    formulario.monedaVenta,
    tasaUsada
  );
  const ganancia = calcularGanancia(compra.usd, venta.usd, tasaUsada);
  const skuPreview = esEdicion
    ? producto.sku
    : `${baseSku(formulario.nombre)}-${numeracionCorrelativa(siguienteNumero, 3)}`;
  const stockVariantes = useMemo(
    () =>
      redondear(
        formulario.variantes.reduce(
          (total, variante) => total + limpiarNumero(variante.stock, 0),
          0
        ),
        3
      ),
    [formulario.variantes]
  );

  function agregarVariante() {
    setFormulario((anterior) => ({
      ...anterior,
      conVariantes: true,
      variantes: [
        ...anterior.variantes,
        { id: null, nombre: "", stock: "0", precioVes: "", activo: true },
      ],
    }));
  }

  function actualizarVariante(indice, campo, valor) {
    setFormulario((anterior) => {
      const variantes = [...anterior.variantes];
      variantes[indice] = { ...variantes[indice], [campo]: valor };
      return { ...anterior, variantes };
    });
  }

  function eliminarVariante(indice) {
    setFormulario((anterior) => ({
      ...anterior,
      variantes: anterior.variantes.filter((_, posicion) => posicion !== indice),
    }));
  }

  function aplicarCodigoEscaneado(codigo) {
    const limpio = String(codigo || "").trim();
    if (!limpio) return;
    cambiar("codigoBarra", limpio);
    reproducirPitidoExito();
    toast.success(`Código de barra capturado: ${limpio}`);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError("");
    if (!formulario.nombre.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }
    if (tasaUsada <= 0) {
      setError(
        "No hay tasa del dólar disponible. Actualiza la tasa desde la barra superior e intenta de nuevo."
      );
      return;
    }
    if (compra.usd <= 0) {
      setError("El precio de compra debe ser mayor a cero.");
      return;
    }
    if (venta.usd <= 0) {
      setError("El precio de venta debe ser mayor a cero.");
      return;
    }
    if (formulario.tipoEmpaque === "bulto" && Number(formulario.unidadesPorBulto) <= 0) {
      setError("Indica cuántas unidades trae cada bulto.");
      return;
    }
    if (formulario.conVariantes) {
      if (!formulario.variantes.length) {
        setError("Agrega al menos una variante o desactiva la opción de variantes.");
        return;
      }
      const nombres = new Set();
      for (const variante of formulario.variantes) {
        const nombre = variante.nombre.trim().toLowerCase();
        if (!nombre) {
          setError("Cada variante debe tener un nombre.");
          return;
        }
        if (nombres.has(nombre)) {
          setError(`La variante "${variante.nombre}" está repetida.`);
          return;
        }
        nombres.add(nombre);
      }
    }

    setGuardando(true);
    try {
      const variantes = formulario.conVariantes
        ? formulario.variantes.map((variante) => {
            const precioVes = Math.max(0, limpiarNumero(variante.precioVes, 0));
            return {
              id: variante.id || undefined,
              nombre: variante.nombre.trim(),
              sku: variante.sku || undefined,
              stock: Math.max(0, limpiarNumero(variante.stock, 0)),
              precioVentaVes: precioVes,
              precioVentaUsd:
                precioVes > 0 && tasaUsada > 0
                  ? redondear(precioVes / tasaUsada)
                  : 0,
              activo: variante.activo !== false,
            };
          })
        : [];

      const guardado = await guardarProducto({
        id: producto?.id,
        nombre: formulario.nombre.trim(),
        sku: formulario.sku,
        codigoBarra: formulario.codigoBarra.trim(),
        descripcion: formulario.descripcion,
        categoria: formulario.categoria,
        tipoEmpaque: formulario.tipoEmpaque,
        unidadesPorBulto: Number(formulario.unidadesPorBulto) || 1,
        precioCompraUsd: compra.usd,
        precioCompraVes: compra.ves,
        precioVentaUsd: venta.usd,
        precioVentaVes: venta.ves,
        tasaUsd: tasaUsada,
        stock: formulario.conVariantes ? stockVariantes : limpiarNumero(formulario.stock, 0),
        stockMinimo: limpiarNumero(formulario.stockMinimo, 0),
        activo: formulario.activo,
        ofertaActiva: formulario.ofertaActiva,
        ofertaCantidad: formulario.ofertaCantidad,
        ofertaDescuento: formulario.ofertaDescuento,
        variantes,
      });
      toast.success(
        esEdicion
          ? "Producto actualizado correctamente."
          : `Producto registrado con SKU ${guardado.sku}.`
      );
      onGuardado?.(guardado);
      onCerrar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Modal
        abierto={abierto}
      onCerrar={onCerrar}
      titulo={esEdicion ? "Editar producto" : "Registrar producto"}
      descripcion="Los cambios se guardan en la base de datos local de este dispositivo."
      ancho="xl"
      bloqueado={guardando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            {esEdicion ? "Guardar cambios" : "Registrar producto"}
          </Boton>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-5">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        {tasaUsada <= 0 ? (
          <Alerta tipo="advertencia" titulo="Tasa del dólar no disponible">
            Sin la tasa actual no se pueden convertir los precios a bolívares. Usa el
            botón de actualizar tasa en la barra superior.
          </Alerta>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del producto" requerido className="sm:col-span-2">
            <Entrada
              value={formulario.nombre}
              onChange={(evento) => cambiar("nombre", evento.target.value)}
              placeholder="Ej. Camisa deportiva, Harina de maíz..."
              maxLength={160}
              autoFocus
              required
            />
          </Campo>

          <Campo etiqueta="Categoría">
            <Selector
              value={formulario.categoria}
              onChange={(evento) => cambiar("categoria", evento.target.value)}
            >
              {CATEGORIAS_SUGERIDAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </Selector>
          </Campo>

          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="SKU Interno"
              ayuda="Código de referencia interno (se genera automático si se deja vacío)."
            >
              <Entrada
                value={formulario.sku}
                onChange={(evento) => cambiar("sku", evento.target.value)}
                placeholder={skuPreview}
                maxLength={60}
                className="font-mono uppercase"
              />
            </Campo>

            <Campo
              etiqueta="Código de barras (Escáner / POS)"
              ayuda="Código de barras escaneable del producto (EAN/UPC)."
            >
              <div className="flex gap-2">
                <Entrada
                  value={formulario.codigoBarra}
                  onChange={(evento) => cambiar("codigoBarra", evento.target.value)}
                  placeholder="Ej. 7591234567890"
                  maxLength={60}
                  className="flex-1 font-mono"
                />
                <Boton
                  variante="secundario"
                  onClick={() => setEscanerAbierto(true)}
                  title="Escanear con cámara"
                  className="shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Cámara</span>
                </Boton>
                <Boton
                  variante="secundario"
                  onClick={() => setQrAbierto(true)}
                  title="Conectar escáner móvil (QR)"
                  className="shrink-0"
                >
                  <QrCode className="h-4 w-4 text-[var(--primario)]" />
                  <span className="hidden sm:inline">QR</span>
                </Boton>
              </div>
            </Campo>
          </div>

          <Campo etiqueta="Descripción (opcional)" className="sm:col-span-2">
            <Entrada
              value={formulario.descripcion}
              onChange={(evento) => cambiar("descripcion", evento.target.value)}
              placeholder="Detalles, color, presentación..."
              maxLength={500}
            />
          </Campo>
        </div>

        <div className="rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
            Empaque
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Tipo de registro">
              <Selector
                value={formulario.tipoEmpaque}
                onChange={(evento) => cambiar("tipoEmpaque", evento.target.value)}
              >
                <option value="unidad">Unidad / Detal</option>
                <option value="bulto">Bulto / Mayorista</option>
              </Selector>
            </Campo>
            {formulario.tipoEmpaque === "bulto" ? (
              <Campo
                etiqueta="Unidades por bulto"
                ayuda="El stock y los precios se manejan por bulto completo."
              >
                <Entrada
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.unidadesPorBulto}
                  onChange={(evento) => cambiar("unidadesPorBulto", evento.target.value)}
                />
              </Campo>
            ) : (
              <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-3 py-2.5 text-xs text-[var(--texto-suave)]">
                Se venderá y controlará por unidad.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--borde)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                Precio de compra
              </h3>
              <Selector
                className="w-auto py-1 text-xs"
                value={formulario.monedaCompra}
                onChange={(evento) => cambiar("monedaCompra", evento.target.value)}
              >
                {MONEDAS.map((moneda) => (
                  <option key={moneda.valor} value={moneda.valor}>
                    {moneda.valor}
                  </option>
                ))}
              </Selector>
            </div>
            <div className="mt-3">
              <Entrada
                type="number"
                min="0"
                step="0.01"
                value={formulario.compraValor}
                onChange={(evento) => cambiar("compraValor", evento.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--superficie-2)] px-3 py-2 text-xs">
              <span className="text-[var(--texto-suave)]">Equivalente</span>
              <span className="font-semibold">
                {formatearVes(compra.ves)} · {formatearUsd(compra.usd)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--borde)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                Precio de venta
              </h3>
              <Selector
                className="w-auto py-1 text-xs"
                value={formulario.monedaVenta}
                onChange={(evento) => cambiar("monedaVenta", evento.target.value)}
              >
                {MONEDAS.map((moneda) => (
                  <option key={moneda.valor} value={moneda.valor}>
                    {moneda.valor}
                  </option>
                ))}
              </Selector>
            </div>
            <div className="mt-3">
              <Entrada
                type="number"
                min="0"
                step="0.01"
                value={formulario.ventaValor}
                onChange={(evento) => cambiar("ventaValor", evento.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--superficie-2)] px-3 py-2 text-xs">
              <span className="text-[var(--texto-suave)]">Equivalente</span>
              <span className="font-semibold">
                {formatearVes(venta.ves)} · {formatearUsd(venta.usd)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--primario)]/25 bg-[var(--primario-suave)] p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]/70">
              Ganancia por {etiquetaEmpaque(formulario).toLowerCase()}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[var(--primario-fuerte)]">
              {formatearVes(ganancia.gananciaVes)}
            </p>
            <p className="text-[11px] text-[var(--primario-fuerte)]/70">
              {formatearUsd(ganancia.gananciaUsd)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]/70">
              Margen
            </p>
            <p className="mt-0.5 text-lg font-bold text-[var(--primario-fuerte)]">
              {formatearPorcentaje(ganancia.margenPorcentaje)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]/70">
              Tasa aplicada
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--primario-fuerte)]">
              {tasaUsada > 0 ? formatearVes(tasaUsada) : "No disponible"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta={formulario.tipoEmpaque === "bulto" ? "Stock inicial (bultos)" : "Stock inicial"}
            ayuda="Puedes renovar el stock más adelante."
          >
            <Entrada
              type="number"
              min="0"
              step="1"
              value={formulario.conVariantes ? stockVariantes : formulario.stock}
              onChange={(evento) => cambiar("stock", evento.target.value)}
              disabled={formulario.conVariantes}
            />
          </Campo>
          <Campo etiqueta="Stock mínimo para alerta">
            <Entrada
              type="number"
              min="0"
              step="1"
              value={formulario.stockMinimo}
              onChange={(evento) => cambiar("stockMinimo", evento.target.value)}
            />
          </Campo>
        </div>

        <div className="rounded-2xl border border-[var(--borde)] p-4">
          <Interruptor
            activo={formulario.conVariantes}
            onCambio={(valor) =>
              setFormulario((anterior) => ({
                ...anterior,
                conVariantes: valor,
                variantes: valor ? anterior.variantes : [],
              }))
            }
            etiqueta="Este producto tiene variantes"
            descripcion="Cada variante tendrá su propio SKU, stock y opcionalmente su propio precio de venta."
          />

          {formulario.conVariantes ? (
            <div className="mt-4 space-y-2">
              {formulario.variantes.map((variante, indice) => (
                <div
                  key={variante.id || `nueva-${indice}`}
                  className="grid gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3 sm:grid-cols-[1.3fr_0.7fr_0.8fr_auto]"
                >
                  <Entrada
                    value={variante.nombre}
                    onChange={(evento) =>
                      actualizarVariante(indice, "nombre", evento.target.value)
                    }
                    placeholder="Variante (ej. Rojo / Talla M)"
                    maxLength={120}
                  />
                  <Entrada
                    type="number"
                    min="0"
                    step="1"
                    value={variante.stock}
                    onChange={(evento) =>
                      actualizarVariante(indice, "stock", evento.target.value)
                    }
                    placeholder="Stock"
                  />
                  <Entrada
                    type="number"
                    min="0"
                    step="0.01"
                    value={variante.precioVes}
                    onChange={(evento) =>
                      actualizarVariante(indice, "precioVes", evento.target.value)
                    }
                    placeholder="Precio Bs. (opc.)"
                  />
                  <Boton
                    variante="fantasma"
                    tamano="icono"
                    onClick={() => eliminarVariante(indice)}
                    title="Eliminar variante"
                  >
                    <Trash2 className="h-4 w-4 text-[var(--peligro)]" />
                  </Boton>
                  <div className="sm:col-span-4 flex flex-wrap items-center gap-2 text-[10px] text-[var(--texto-tenue)]">
                    <Etiqueta variante="neutra">
                      {variante.sku || "SKU automático"}
                    </Etiqueta>
                    <span>
                      Precio sin override: {formatearVes(venta.ves)} ·{" "}
                      {formatearUsd(venta.usd)}
                    </span>
                    {variante.precioVes ? (
                      <span className="font-semibold text-[var(--primario-fuerte)]">
                        Override: {formatearVes(variante.precioVes)} ·{" "}
                        {formatearUsd(
                          tasaUsada > 0
                            ? limpiarNumero(variante.precioVes) / tasaUsada
                            : 0
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
              <Boton variante="secundario" tamano="sm" onClick={agregarVariante}>
                <Plus className="h-3.5 w-3.5" />
                Agregar variante
              </Boton>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--borde)] p-4">
          <Interruptor
            activo={formulario.ofertaActiva}
            onCambio={(valor) => cambiar("ofertaActiva", valor)}
            etiqueta="Activar oferta por cantidad"
            descripcion="Si el cliente compra cierta cantidad, se aplica un descuento automático en el POS."
          />
          {formulario.ofertaActiva ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="A partir de (cantidad)">
                <Entrada
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.ofertaCantidad}
                  onChange={(evento) => cambiar("ofertaCantidad", evento.target.value)}
                />
              </Campo>
              <Campo etiqueta="Descuento (%)">
                <Entrada
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={formulario.ofertaDescuento}
                  onChange={(evento) => cambiar("ofertaDescuento", evento.target.value)}
                />
              </Campo>
              <p className="text-[11px] text-[var(--texto-suave)] sm:col-span-2">
                Ejemplo: a partir de {formulario.ofertaCantidad || 0}{" "}
                {formulario.tipoEmpaque === "bulto" ? "bultos" : "unidades"}, se
                descuenta {formulario.ofertaDescuento || 0}% en el POS.
              </p>
            </div>
          ) : null}
        </div>

        <Interruptor
          activo={formulario.activo}
          onCambio={(valor) => cambiar("activo", valor)}
          etiqueta="Producto activo"
          descripcion="Los productos inactivos no aparecen en el punto de venta."
        />
      </form>
      </Modal>

      <ModalEscanerCamara
        abierto={escanerAbierto}
        onCerrar={() => setEscanerAbierto(false)}
        onScan={(codigo) => {
          aplicarCodigoEscaneado(codigo);
          setEscanerAbierto(false);
        }}
      />

      <ModalEmparejamientoQR
        abierto={qrAbierto}
        onCerrar={() => setQrAbierto(false)}
        onScan={aplicarCodigoEscaneado}
        cerrarAlEscanear={false}
      />
    </>
  );
}
