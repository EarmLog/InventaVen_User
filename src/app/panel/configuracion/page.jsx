"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Building2,
  CloudDownload,
  CloudUpload,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/baseDatos";
import { useSesion } from "@/context/SesionContext";
import { useTasa } from "@/context/TasaContext";
import { useTema } from "@/context/TemaContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Etiqueta from "@/components/ui/Etiqueta";
import Interruptor from "@/components/ui/Interruptor";
import Modal from "@/components/ui/Modal";
import Alerta from "@/components/ui/Alerta";
import { descargarRespaldo, restaurarRespaldo } from "@/lib/db/respaldo";
import { actualizarPreciosPorTasa, guardarAjuste } from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { formatearFechaHora, formatearNumero, formatearVes } from "@/lib/utilidades/formato";

export default function PaginaConfiguracion() {
  const router = useRouter();
  const { perfil, actualizarPerfil, cambiarClave, cerrarSesion } = useSesion();
  const { tasa, fechaTasa, fuente, cargandoTasa, errorTasa, refrescarTasa } = useTasa();
  const { tema, cambiarTema } = useTema();

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [recalculandoPrecios, setRecalculandoPrecios] = useState(false);

  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const [generando, setGenerando] = useState(false);
  const [archivoRespaldo, setArchivoRespaldo] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const [errorRestauracion, setErrorRestauracion] = useState("");
  const entradaArchivo = useRef(null);

  const productos =
    useLiveQuery(() => (db ? db.productos.count() : 0), [], 0) || 0;
  const ventas = useLiveQuery(() => (db ? db.ventas.count() : 0), [], 0) || 0;
  const ajustes =
    useLiveQuery(
      async () => {
        if (!db) return {};
        const filas = await db.ajustes.toArray();
        return filas.reduce((acumulado, fila) => {
          acumulado[fila.clave] = fila.valor;
          return acumulado;
        }, {});
      },
      [],
      {}
    ) || {};

  const autoPrecios = Boolean(ajustes[CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO]);
  const ultimaActualizacion = ajustes[CLAVES_AJUSTES.ULTIMA_ACTUALIZACION_PRECIOS];
  const diasLicencia = Number(perfil?.diasLicencia ?? 0);
  const sincronizacionNube = Boolean(ajustes[CLAVES_AJUSTES.SINC_NUBE]);

  useEffect(() => {
    setNombreNegocio(perfil?.nombreNegocio || "");
    setTelefono(perfil?.telefono || "");
  }, [perfil]);

  async function guardarNegocio() {
    if (!nombreNegocio.trim()) {
      toast.error("El nombre del negocio es obligatorio.");
      return;
    }
    setGuardandoPerfil(true);
    try {
      await actualizarPerfil({ nombreNegocio, telefono });
      toast.success("Datos del negocio actualizados.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function alternarAutoPrecios(activo) {
    try {
      await guardarAjuste(CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO, activo);
      window.dispatchEvent(new Event("inventaven-ajustes"));
      toast.success(
        activo
          ? "Actualización automática activada. Se aplicará con la tasa vigente."
          : "Actualización automática desactivada."
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function recalcularPreciosAhora() {
    setRecalculandoPrecios(true);
    try {
      const actualizados = await actualizarPreciosPorTasa(tasa);
      toast.success(
        `Precios recalculados en bolívares con la tasa de ${formatearVes(tasa)} (${actualizados} productos).`
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRecalculandoPrecios(false);
    }
  }

  async function alternarSincronizacionNube(activo) {
    try {
      await guardarAjuste(CLAVES_AJUSTES.SINC_NUBE, activo);
      toast.success(
        activo
          ? "Sincronización en la nube habilitada."
          : "Sincronización en la nube deshabilitada."
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function cambiarContrasena() {
    if (nuevaClave.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaClave !== confirmarClave) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setCambiandoClave(true);
    try {
      await cambiarClave(nuevaClave);
      setNuevaClave("");
      setConfirmarClave("");
      toast.success("Contraseña actualizada correctamente.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCambiandoClave(false);
    }
  }

  async function descargar() {
    setGenerando(true);
    try {
      const nombre = await descargarRespaldo();
      toast.success(`Respaldo generado: ${nombre}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGenerando(false);
    }
  }

  function seleccionarRespaldo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setErrorRestauracion("");
    setArchivoRespaldo(archivo);
  }

  async function confirmarRestauracion() {
    if (!archivoRespaldo) return;
    setErrorRestauracion("");
    setRestaurando(true);
    try {
      const resultado = await restaurarRespaldo(archivoRespaldo, { reemplazar: true });
      toast.success(
        `Respaldo restaurado: ${resultado.productos} productos y ${resultado.ventas} ventas.`
      );
      setArchivoRespaldo(null);
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setErrorRestauracion(error.message);
    } finally {
      setRestaurando(false);
    }
  }

  async function salir() {
    await cerrarSesion();
    router.replace("/login");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Datos del negocio, tasa, respaldo, seguridad y apariencia.
          </p>
        </div>
        <Boton variante="secundario" onClick={salir}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Boton>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Datos del negocio</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Se muestran en las facturas y en el panel.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Campo etiqueta="Nombre del negocio" requerido>
              <Entrada
                value={nombreNegocio}
                onChange={(evento) => setNombreNegocio(evento.target.value)}
                maxLength={160}
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Entrada
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                maxLength={40}
                placeholder="0412-0000000"
              />
            </Campo>
            <div className="flex items-center justify-between rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-[11px]">
              <span className="text-[var(--texto-suave)]">Correo de la cuenta</span>
              <strong>{perfil?.correo || "—"}</strong>
            </div>
            <Boton onClick={guardarNegocio} cargando={guardandoPerfil} className="w-full">
              Guardar cambios
            </Boton>
          </div>
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--info-suave)] text-[var(--info)]">
              <RefreshCw className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Tasa del dólar</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Fuente automática para precios en bolívares.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                  Tasa actual
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {Number(tasa) > 0 ? formatearVes(tasa) : "No disponible"}
                </p>
              </div>
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={refrescarTasa}
                cargando={cargandoTasa}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar
              </Boton>
            </div>
            <p className="mt-2 text-[10px] text-[var(--texto-tenue)]">
              Fuente: {fuente || "—"} · {fechaTasa ? formatearFechaHora(fechaTasa) : "sin fecha"}
            </p>
            {errorTasa ? (
              <p className="mt-1 text-[10px] text-[var(--advertencia)]">{errorTasa}</p>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            <Interruptor
              activo={autoPrecios}
              onCambio={alternarAutoPrecios}
              disabled={recalculandoPrecios}
              etiqueta="Actualizar precios en Bs. automáticamente"
              descripcion="Al activarlo, los precios de venta en bolívares se recalculan desde su equivalente en dólares cada vez que cambia la tasa. Al desactivarlo, los precios se quedan congelados en el último valor."
            />
            <div className="flex flex-wrap items-center gap-2">
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={recalcularPreciosAhora}
                cargando={recalculandoPrecios}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recalcular precios ahora
              </Boton>
              <p className="text-[10px] text-[var(--texto-suave)]">
                Se recalculan los precios en bolívares a partir de los equivalentes en dólares con la tasa vigente.
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-[var(--superficie-2)] px-3 py-2 text-[10px] text-[var(--texto-suave)]">
            Última actualización de precios:{" "}
            <strong>
              {ultimaActualizacion ? formatearFechaHora(ultimaActualizacion) : "nunca"}
            </strong>
          </p>
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              {tema === "oscuro" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
            <div>
              <h2 className="text-sm font-bold">Apariencia</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Elige el tema de la aplicación en este dispositivo.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cambiarTema("claro")}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-semibold transition",
                tema === "claro"
                  ? "border-[var(--primario)] bg-[var(--primario-suave)] text-[var(--primario-fuerte)]"
                  : "border-[var(--borde)] hover:bg-[var(--superficie-2)]",
              ].join(" ")}
            >
              <Sun className="h-5 w-5" />
              Modo claro
            </button>
            <button
              type="button"
              onClick={() => cambiarTema("oscuro")}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-semibold transition",
                tema === "oscuro"
                  ? "border-[var(--primario)] bg-[var(--primario-suave)] text-[var(--primario-fuerte)]"
                  : "border-[var(--borde)] hover:bg-[var(--superficie-2)]",
              ].join(" ")}
            >
              <Moon className="h-5 w-5" />
              Modo oscuro
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[var(--superficie-2)] py-2">
              <p className="text-lg font-bold">{formatearNumero(productos)}</p>
              <p className="text-[10px] text-[var(--texto-tenue)]">productos</p>
            </div>
            <div className="rounded-lg bg-[var(--superficie-2)] py-2">
              <p className="text-lg font-bold">{formatearNumero(ventas)}</p>
              <p className="text-[10px] text-[var(--texto-tenue)]">ventas</p>
            </div>
            <div className="rounded-lg bg-[var(--superficie-2)] py-2">
              <p className="text-lg font-bold">{diasLicencia}</p>
              <p className="text-[10px] text-[var(--texto-tenue)]">días licencia</p>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--advertencia-suave)] text-[var(--advertencia)]">
              <CloudDownload className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Copia de seguridad</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Descarga un ZIP con Excel y los datos completos.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Boton onClick={descargar} cargando={generando} className="w-full">
              <CloudDownload className="h-4 w-4" />
              Descargar respaldo
            </Boton>
            <Boton
              variante="secundario"
              onClick={() => entradaArchivo.current?.click()}
              className="w-full"
            >
              <CloudUpload className="h-4 w-4" />
              Restaurar desde un ZIP
            </Boton>
            <input
              ref={entradaArchivo}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={seleccionarRespaldo}
            />
            <Interruptor
              activo={sincronizacionNube}
              onCambio={alternarSincronizacionNube}
              disabled
              etiqueta="Sincronización con la nube"
              descripcion="Próximamente. El respaldo opcional en la nube aún no está disponible."
            />
          </div>
          <Alerta tipo="advertencia" className="mt-3">
            Restaurar reemplaza el inventario y las ventas de este dispositivo. Haz una
            copia antes de continuar.
          </Alerta>
        </Tarjeta>
      </div>

      <Tarjeta className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--peligro-suave)] text-[var(--peligro)]">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Seguridad de la cuenta</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Cambia la contraseña con la que inicias sesión.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nueva contraseña" requerido>
            <Entrada
              type="password"
              value={nuevaClave}
              onChange={(evento) => setNuevaClave(evento.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </Campo>
          <Campo etiqueta="Confirmar contraseña" requerido>
            <Entrada
              type="password"
              value={confirmarClave}
              onChange={(evento) => setConfirmarClave(evento.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </Campo>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Boton
            onClick={cambiarContrasena}
            cargando={cambiandoClave}
            disabled={!nuevaClave || !confirmarClave}
          >
            <KeyRound className="h-4 w-4" />
            Actualizar contraseña
          </Boton>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            La licencia actual es de {diasLicencia} día{diasLicencia === 1 ? "" : "s"}.
          </p>
        </div>
      </Tarjeta>

      <Modal
        abierto={Boolean(archivoRespaldo)}
        onCerrar={() => {
          if (!restaurando) setArchivoRespaldo(null);
        }}
        titulo="Restaurar respaldo"
        descripcion={archivoRespaldo?.name}
        ancho="sm"
        bloqueado={restaurando}
        pie={
          <>
            <Boton
              variante="secundario"
              onClick={() => setArchivoRespaldo(null)}
              disabled={restaurando}
            >
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarRestauracion} cargando={restaurando}>
              <RotateCcw className="h-4 w-4" />
              Reemplazar mis datos
            </Boton>
          </>
        }
      >
        <div className="space-y-3">
          {errorRestauracion ? <Alerta tipo="error">{errorRestauracion}</Alerta> : null}
          <Alerta tipo="advertencia" titulo="Se reemplazará todo el contenido actual">
            Se eliminarán los {formatearNumero(productos)} productos y{" "}
            {formatearNumero(ventas)} ventas actuales de este dispositivo, y se cargarán
            los datos del archivo ZIP seleccionado.
          </Alerta>
          <div className="flex flex-wrap gap-1.5">
            <Etiqueta variante="neutra">respaldo.json</Etiqueta>
            <Etiqueta variante="neutra">Inventario.xlsx</Etiqueta>
            <Etiqueta variante="neutra">Ventas.xlsx</Etiqueta>
          </div>
        </div>
      </Modal>
    </div>
  );
}
