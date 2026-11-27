"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Building2,
  Clock3,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  HardDrive,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Share2,
  Sun,
  Users,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/baseDatos";
import { useSesion } from "@/context/SesionContext";
import { useTasa } from "@/context/TasaContext";
import { useTema } from "@/context/TemaContext";
import SeccionConfiguracion from "@/components/modules/configuracion/SeccionConfiguracion";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Etiqueta from "@/components/ui/Etiqueta";
import Interruptor from "@/components/ui/Interruptor";
import Modal from "@/components/ui/Modal";
import Alerta from "@/components/ui/Alerta";
import { descargarRespaldo, restaurarRespaldo } from "@/lib/db/respaldo";
import { ejecutarCopiaAutomatica } from "@/lib/db/copiaAutomatica";
import {
  descargarRespaldoNube,
  listarRespaldosNube,
} from "@/lib/db/respaldoNube";
import { actualizarPreciosPorTasa, guardarAjuste } from "@/lib/db/repositorios";
import { validarContrasena } from "@/lib/seguridad/contrasena";
import {
  componerNombreNegocio,
  limpiarRif,
  limpiarTelefono,
  separarNombreSufijo,
  validarNombreCuenta,
  validarRifVe,
  validarTelefonoVe,
} from "@/lib/seguridad/validaciones";
import {
  CLAVES_AJUSTES,
  SUFIJOS_LEGALES_VE,
  TIPOS_CUENTA,
} from "@/lib/utilidades/constantes";
import { formatearFechaHora, formatearNumero, formatearVes } from "@/lib/utilidades/formato";
import { tasaBajoSospechosa } from "@/lib/utilidades/tasa";

function formatearTamano(bytes) {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PaginaConfiguracion() {
  const router = useRouter();
  const {
    sesion,
    perfil,
    actualizarPerfil,
    cambiarClave,
    cerrarSesion,
    abrirOnboarding,
  } = useSesion();
  const {
    tasa,
    fechaTasa,
    fuente,
    cargandoTasa,
    errorTasa,
    refrescarTasa,
    establecerTasaManual,
  } = useTasa();
  const { tema, cambiarTema } = useTema();

  const [seccionAbierta, setSeccionAbierta] = useState("negocio");

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("personal");
  const [negocioRegistrado, setNegocioRegistrado] = useState(false);
  const [sufijoLegal, setSufijoLegal] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rif, setRif] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [telegramNegocio, setTelegramNegocio] = useState("");
  const [instagramNegocio, setInstagramNegocio] = useState("");
  const [correoContactoNegocio, setCorreoContactoNegocio] = useState("");
  const [horarioNegocio, setHorarioNegocio] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [recalculandoPrecios, setRecalculandoPrecios] = useState(false);
  const [tasaManual, setTasaManual] = useState("");
  const [guardandoTasaManual, setGuardandoTasaManual] = useState(false);

  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const [generando, setGenerando] = useState(false);
  const [archivoRespaldo, setArchivoRespaldo] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const [errorRestauracion, setErrorRestauracion] = useState("");
  const entradaArchivo = useRef(null);

  const [respaldosNube, setRespaldosNube] = useState([]);
  const [cargandoNube, setCargandoNube] = useState(false);
  const [creandoCopiaNube, setCreandoCopiaNube] = useState(false);
  const [errorNube, setErrorNube] = useState("");
  const [modalNubeAbierto, setModalNubeAbierto] = useState(false);
  const [respaldoNubeSeleccionado, setRespaldoNubeSeleccionado] = useState(null);
  const [restaurandoNube, setRestaurandoNube] = useState(false);
  const [errorRestauracionNube, setErrorRestauracionNube] = useState("");
  const [modalDriveAbierto, setModalDriveAbierto] = useState(false);
  const [preparandoOffline, setPreparandoOffline] = useState(false);

  const [metodoDeudaActivo, setMetodoDeudaActivo] = useState(false);
  const [actualizarSaldosDolar, setActualizarSaldosDolar] = useState(false);
  const [comisionCashea, setComisionCashea] = useState("0");
  const [guardandoComision, setGuardandoComision] = useState(false);
  const ajustesInicializados = useRef(false);

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
  const ultimaTasaAplicada =
    Number(ajustes[CLAVES_AJUSTES.TASA_ULTIMA_APLICADA]) || 0;
  const diasLicencia = Number(perfil?.diasLicencia ?? 0);
  const copiaNubeActiva = Boolean(ajustes[CLAVES_AJUSTES.COPIA_NUBE_ACTIVA]);
  const ultimaCopiaNube = ajustes[CLAVES_AJUSTES.COPIA_NUBE_ULTIMA];
  const fechaUltimaCopiaNube = ajustes[CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA];
  const errorCopiaNube = ajustes[CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR];

  useEffect(() => {
    const { nombre, sufijo } = separarNombreSufijo(perfil?.nombreNegocio || "");
    setNombreNegocio(nombre);
    setTipoCuenta(perfil?.tipoCuenta || "personal");
    setNegocioRegistrado(
      Boolean(perfil?.negocioRegistrado) || Boolean(sufijo) || Boolean(perfil?.rif)
    );
    setSufijoLegal(perfil?.sufijoLegal || sufijo || "");
    setTelefono(perfil?.telefono || "");
    setRif(perfil?.rif || ajustes[CLAVES_AJUSTES.RIF_NEGOCIO] || "");
  }, [perfil, ajustes]);

  useEffect(() => {
    if (ajustesInicializados.current || !Object.keys(ajustes).length) return;
    ajustesInicializados.current = true;
    setMetodoDeudaActivo(
      Boolean(ajustes[CLAVES_AJUSTES.METODO_DEUDA_ACTIVO])
    );
    setActualizarSaldosDolar(
      Boolean(ajustes[CLAVES_AJUSTES.ACTUALIZAR_SALDOS_DEUDOR_DOLAR])
    );
    setComisionCashea(
      String(Number(ajustes[CLAVES_AJUSTES.COMISION_CASHEA] ?? 0))
    );
  }, [ajustes]);

  useEffect(() => {
    setTelegramNegocio(String(ajustes[CLAVES_AJUSTES.TIENDA_TELEGRAM] || ""));
    setInstagramNegocio(String(ajustes[CLAVES_AJUSTES.TIENDA_INSTAGRAM] || ""));
    setCorreoContactoNegocio(
      String(ajustes[CLAVES_AJUSTES.TIENDA_CORREO_CONTACTO] ?? perfil?.correo ?? "")
    );
    setHorarioNegocio(String(ajustes[CLAVES_AJUSTES.TIENDA_HORARIO] || ""));
  }, [ajustes, perfil?.correo]);

  function alternarSeccion(id) {
    setSeccionAbierta((actual) => (actual === id ? null : id));
  }

  function cambiarTipoCuenta(valor) {
    setTipoCuenta(valor);
    if (valor === "personal") {
      setNegocioRegistrado(false);
      setSufijoLegal("");
      setRif("");
    } else if (valor === "empresa") {
      setNegocioRegistrado(true);
    }
  }

  function cambiarRegistroNegocio(valor) {
    setNegocioRegistrado(valor);
    if (!valor) setSufijoLegal("");
  }

  async function guardarNegocio() {
    const errorNombre = validarNombreCuenta(nombreNegocio);
    if (errorNombre) {
      toast.error(errorNombre);
      return;
    }
    if (tipoCuenta !== "personal" && negocioRegistrado && !sufijoLegal) {
      toast.error("Selecciona el sufijo legal de tu negocio.");
      return;
    }
    const errorTelefono = validarTelefonoVe(telefono);
    if (errorTelefono) {
      toast.error(errorTelefono);
      return;
    }
    const errorRif = validarRifVe(rif, {
      obligatorio: false,
    });
    if (errorRif) {
      toast.error(errorRif);
      return;
    }

    setGuardandoPerfil(true);
    try {
      const actualizado = await actualizarPerfil({
        nombreNegocio,
        telefono,
        rif,
        tipoCuenta,
        negocioRegistrado,
        sufijoLegal,
      });
      await guardarAjuste(
        CLAVES_AJUSTES.NOMBRE_NEGOCIO,
        componerNombreNegocio(nombreNegocio, sufijoLegal)
      );
      await guardarAjuste(CLAVES_AJUSTES.RIF_NEGOCIO, rif);
      setNombreNegocio(
        separarNombreSufijo(actualizado?.nombreNegocio || nombreNegocio).nombre
      );
      toast.success("Datos del negocio actualizados.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function guardarContactoTienda() {
    const telegram = String(telegramNegocio).trim();
    const instagram = String(instagramNegocio).trim();
    const correoContacto = String(correoContactoNegocio).trim();
    const horario = String(horarioNegocio).trim();
    setGuardandoContacto(true);
    try {
      await guardarAjuste(CLAVES_AJUSTES.TIENDA_TELEGRAM, telegram);
      await guardarAjuste(CLAVES_AJUSTES.TIENDA_INSTAGRAM, instagram);
      await guardarAjuste(CLAVES_AJUSTES.TIENDA_CORREO_CONTACTO, correoContacto);
      await guardarAjuste(CLAVES_AJUSTES.TIENDA_HORARIO, horario);
      window.dispatchEvent(new Event("inventaven-ajustes"));
      setTelegramNegocio(telegram);
      setInstagramNegocio(instagram);
      setCorreoContactoNegocio(correoContacto);
      setHorarioNegocio(horario);
      toast.success("Contacto y horario guardados.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoContacto(false);
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

  async function alternarMetodoDeuda(activo) {
    try {
      await guardarAjuste(CLAVES_AJUSTES.METODO_DEUDA_ACTIVO, activo);
      setMetodoDeudaActivo(activo);
      window.dispatchEvent(new Event("inventaven-ajustes"));
      toast.success(
        activo
          ? "Método de pago Deuda activado en el POS."
          : "Método de pago Deuda desactivado en el POS."
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function alternarSaldosDolar(activo) {
    try {
      await guardarAjuste(CLAVES_AJUSTES.ACTUALIZAR_SALDOS_DEUDOR_DOLAR, activo);
      setActualizarSaldosDolar(activo);
      window.dispatchEvent(new Event("inventaven-ajustes"));
      toast.success(
        activo
          ? "Los saldos de deudores se actualizarán con la tasa vigente."
          : "Los saldos de deudores ya no se actualizarán con la tasa."
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function guardarComisionCashea() {
    const valor = Number(String(comisionCashea).replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      toast.error("La comisión Cashea debe estar entre 0 y 100%.");
      return;
    }
    setGuardandoComision(true);
    try {
      const comision = Math.round(valor * 100) / 100;
      await guardarAjuste(CLAVES_AJUSTES.COMISION_CASHEA, comision);
      setComisionCashea(String(comision));
      window.dispatchEvent(new Event("inventaven-ajustes"));
      toast.success(`Comisión Cashea guardada: ${comision}%.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoComision(false);
    }
  }

  async function guardarTasaManual() {
    const valor = Number(String(tasaManual).replace(",", "."));
    if (!Number.isFinite(valor) || valor < 10) {
      toast.error("La tasa manual debe ser un número igual o mayor a 10 VES por USD.");
      return;
    }
    setGuardandoTasaManual(true);
    try {
      await establecerTasaManual(valor);
      setTasaManual("");
      toast.success(`Tasa manual guardada: ${formatearVes(valor)} por USD.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoTasaManual(false);
    }
  }

  async function recalcularPreciosAhora() {
    if (ultimaTasaAplicada > 0 && tasaBajoSospechosa(tasa, ultimaTasaAplicada)) {
      toast.error(
        "La tasa actual bajó 10% o más respecto a la última aplicada. Los precios no se actualizaron para protegerlos."
      );
      return;
    }
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

  const cargarRespaldosNube = useCallback(async () => {
    if (!sesion) return;
    setCargandoNube(true);
    try {
      const lista = await listarRespaldosNube();
      setRespaldosNube(lista);
      setErrorNube("");
    } catch (error) {
      setErrorNube(error.message);
    } finally {
      setCargandoNube(false);
    }
  }, [sesion]);

  useEffect(() => {
    cargarRespaldosNube();
  }, [cargarRespaldosNube]);

  useEffect(() => {
    const alCambiarCopia = () => cargarRespaldosNube();
    window.addEventListener("inventaven-copia-nube", alCambiarCopia);
    return () => window.removeEventListener("inventaven-copia-nube", alCambiarCopia);
  }, [cargarRespaldosNube]);

  async function alternarCopiaNube(activo) {
    try {
      await guardarAjuste(CLAVES_AJUSTES.COPIA_NUBE_ACTIVA, activo);
      if (!activo) {
        toast.success("Copia automática diaria desactivada.");
        return;
      }
      setCreandoCopiaNube(true);
      const resultado = await ejecutarCopiaAutomatica({ forzar: true });
      if (!resultado.ejecutada) {
        toast.info(resultado.motivo || "La copia no se pudo ejecutar todavía.");
        return;
      }
      toast.success(`Copia automática activada. Se guardó ${resultado.nombre}.`);
      await cargarRespaldosNube();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreandoCopiaNube(false);
    }
  }

  async function crearCopiaNubeAhora() {
    setCreandoCopiaNube(true);
    try {
      const resultado = await ejecutarCopiaAutomatica({ forzar: true });
      if (!resultado.ejecutada) {
        toast.info(resultado.motivo || "La copia no se pudo ejecutar todavía.");
        return;
      }
      toast.success(`Copia guardada en la nube: ${resultado.nombre}`);
      await cargarRespaldosNube();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreandoCopiaNube(false);
    }
  }

  async function prepararModoSinConexion() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      toast.error("Este navegador no permite el modo sin conexión.");
      return;
    }
    setPreparandoOffline(true);
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, rechazar) =>
          setTimeout(
            () => rechazar(new Error("El service worker no está activo.")),
            8000
          )
        ),
      ]);
      const rutas = [
        "/panel",
        "/panel/inventario",
        "/panel/pos",
        "/panel/deudores",
        "/panel/analisis",
        "/panel/fiscal",
        "/panel/auditoria",
        "/panel/pendientes",
        "/panel/tienda",
        "/panel/configuracion",
        "/offline",
      ];
      await Promise.all(
        rutas.map((ruta) =>
          fetch(ruta, { cache: "reload" }).catch(() => null)
        )
      );
      if (navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => null);
      }
      toast.success(
        "Modo sin conexión preparado. Abre la app desde el acceso directo aunque no tengas internet."
      );
    } catch {
      toast.error(
        "No se pudo preparar el modo sin conexión. Abre la app una vez con internet e intenta de nuevo."
      );
    } finally {
      setPreparandoOffline(false);
    }
  }

  async function descargarCopiaNube(nombre) {
    try {
      const blob = await descargarRespaldoNube(nombre);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success("Copia descargada.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  function abrirRestauracionNube() {
    setRespaldoNubeSeleccionado(null);
    setErrorRestauracionNube("");
    setModalNubeAbierto(true);
    cargarRespaldosNube();
  }

  async function confirmarRestauracionNube() {
    if (!respaldoNubeSeleccionado) return;
    setErrorRestauracionNube("");
    setRestaurandoNube(true);
    try {
      const blob = await descargarRespaldoNube(respaldoNubeSeleccionado.nombre);
      const archivo = new File([blob], respaldoNubeSeleccionado.nombre, {
        type: "application/zip",
      });
      const resultado = await restaurarRespaldo(archivo, { reemplazar: true });
      toast.success(
        `Copia restaurada: ${resultado.productos} productos y ${resultado.ventas} ventas.`
      );
      setModalNubeAbierto(false);
      setRespaldoNubeSeleccionado(null);
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setErrorRestauracionNube(error.message);
    } finally {
      setRestaurandoNube(false);
    }
  }

  async function cambiarContrasena() {
    const errorClave = validarContrasena(nuevaClave);
    if (errorClave) {
      toast.error(errorClave);
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

      <div className="space-y-3">
        <SeccionConfiguracion
          id="negocio"
          abierto={seccionAbierta === "negocio"}
          onAlternar={alternarSeccion}
          icono={Building2}
          titulo="Datos del negocio"
          descripcion="Se muestran en las facturas y en el panel."
          tono="primario"
        >
          <div className="space-y-3">
            <Campo
              etiqueta="Tipo de cuenta"
              ayuda={
                TIPOS_CUENTA.find((tipo) => tipo.valor === tipoCuenta)?.descripcion
              }
            >
              <Selector
                value={tipoCuenta}
                onChange={(evento) => cambiarTipoCuenta(evento.target.value)}
              >
                {TIPOS_CUENTA.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo
              etiqueta={
                tipoCuenta === "personal"
                  ? "Nombre de la cuenta"
                  : "Nombre del negocio"
              }
              requerido
            >
              <Entrada
                value={nombreNegocio}
                onChange={(evento) => setNombreNegocio(evento.target.value)}
                maxLength={160}
              />
            </Campo>
            {tipoCuenta !== "personal" ? (
              <div className="space-y-3 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3">
                <Interruptor
                  activo={negocioRegistrado}
                  onCambio={cambiarRegistroNegocio}
                  disabled={tipoCuenta === "empresa"}
                  etiqueta="Negocio registrado legalmente"
                  descripcion={
                    tipoCuenta === "empresa"
                      ? "Las empresas siempre deben indicar su sufijo legal."
                      : "Actívalo para usar un sufijo legal en tus facturas."
                  }
                />
                {negocioRegistrado ? (
                  <Campo etiqueta="Sufijo legal" requerido>
                    <Selector
                      value={sufijoLegal}
                      onChange={(evento) => setSufijoLegal(evento.target.value)}
                    >
                      <option value="">Selecciona el sufijo</option>
                      {SUFIJOS_LEGALES_VE.map((sufijo) => (
                        <option key={sufijo.valor} value={sufijo.valor}>
                          {sufijo.etiqueta}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                ) : null}
                <Campo
                  etiqueta="RIF del negocio (opcional)"
                  ayuda="Formato venezolano, por ejemplo J-12345678-9."
                >
                  <Entrada
                    value={rif}
                    onChange={(evento) =>
                      setRif(limpiarRif(evento.target.value))
                    }
                    maxLength={12}
                    placeholder="J-12345678-9"
                    className="font-mono uppercase"
                  />
                </Campo>
              </div>
            ) : null}
            <Campo
              etiqueta="Teléfono"
              ayuda="Solo números, sin espacios ni guiones."
            >
              <Entrada
                value={telefono}
                onChange={(evento) =>
                  setTelefono(limpiarTelefono(evento.target.value))
                }
                maxLength={13}
                inputMode="numeric"
                placeholder="04121234567"
              />
            </Campo>
            <div className="flex items-center justify-between rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-[11px]">
              <span className="text-[var(--texto-suave)]">Correo de la cuenta</span>
              <strong>{perfil?.correo || "—"}</strong>
            </div>
            <Boton variante="secundario" onClick={abrirOnboarding} className="w-full">
              Ver tutorial
            </Boton>
            <Boton onClick={guardarNegocio} cargando={guardandoPerfil} className="w-full">
              Guardar cambios
            </Boton>
          </div>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="contacto"
          abierto={seccionAbierta === "contacto"}
          onAlternar={alternarSeccion}
          icono={Share2}
          titulo="Redes sociales y horario de la tienda"
          descripcion="Se muestran en el detalle de cada producto de tu tienda online."
          tono="info"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Telegram" ayuda="Usuario o enlace, por ejemplo @minegocio">
              <Entrada
                value={telegramNegocio}
                onChange={(evento) => setTelegramNegocio(evento.target.value)}
                maxLength={32}
                placeholder="@minegocio o https://t.me/minegocio"
              />
            </Campo>
            <Campo etiqueta="Instagram" ayuda="Usuario o enlace, por ejemplo @minegocio">
              <Entrada
                value={instagramNegocio}
                onChange={(evento) => setInstagramNegocio(evento.target.value)}
                maxLength={60}
                placeholder="@minegocio o https://instagram.com/minegocio"
              />
            </Campo>
            <Campo
              etiqueta="Correo de contacto"
              ayuda="Se usa como botón Correo en el detalle del producto"
            >
              <Entrada
                type="email"
                value={correoContactoNegocio}
                onChange={(evento) => setCorreoContactoNegocio(evento.target.value)}
                maxLength={120}
                placeholder="contacto@minegocio.com"
              />
            </Campo>
            <Campo
              etiqueta={
                <>
                  <Clock3 className="h-3.5 w-3.5" />
                  Horario de atención
                </>
              }
              ayuda="Ejemplo: Lun-Vie 08:00-18:00; Sáb 09:00-13:00; Dom Cerrado"
              className="sm:col-span-2"
            >
              <Entrada
                value={horarioNegocio}
                onChange={(evento) => setHorarioNegocio(evento.target.value)}
                maxLength={240}
              />
            </Campo>
          </div>
          <Alerta tipo="info" className="mt-3">
            Estos datos se guardan en este dispositivo. Para mostrarlos en el enlace
            público, pulsa Publicar cambios en Tienda online.
          </Alerta>
          <Boton
            onClick={guardarContactoTienda}
            cargando={guardandoContacto}
            className="mt-3 w-full"
          >
            Guardar contacto y horario
          </Boton>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="tasa"
          abierto={seccionAbierta === "tasa"}
          onAlternar={alternarSeccion}
          icono={RefreshCw}
          titulo="Tasa del dólar"
          descripcion="Fuente automática para precios en bolívares."
          tono="info"
        >
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
            <div className="mt-3 border-t border-[var(--borde)] pt-3">
              <Campo
                etiqueta="Tasa manual (VES por USD)"
                ayuda="Úsala solo si la tasa automática falla o si necesitas corregirla. No se aplica a los precios automáticamente si baja 10% o más."
              >
                <div className="flex gap-2">
                  <Entrada
                    value={tasaManual}
                    onChange={(evento) => setTasaManual(evento.target.value)}
                    placeholder={Number(tasa) > 0 ? String(tasa) : "Ej. 36,50"}
                    inputMode="decimal"
                  />
                  <Boton
                    variante="secundario"
                    onClick={guardarTasaManual}
                    cargando={guardandoTasaManual}
                    disabled={!tasaManual}
                  >
                    Guardar
                  </Boton>
                </div>
              </Campo>
            </div>
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
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="deudores"
          abierto={seccionAbierta === "deudores"}
          onAlternar={alternarSeccion}
          icono={Users}
          titulo="Deudores y Cashea"
          descripcion="Crédito en el POS, saldos y comisión de Cashea."
          tono="advertencia"
        >
          <div className="space-y-4">
            <Interruptor
              activo={metodoDeudaActivo}
              onCambio={alternarMetodoDeuda}
              etiqueta="Activar método de pago Deuda en POS"
              descripcion="Permite registrar ventas a crédito desde el punto de venta."
            />
            <Interruptor
              activo={actualizarSaldosDolar}
              onCambio={alternarSaldosDolar}
              etiqueta="Actualizar saldo de deudores con el dólar"
              descripcion="Cada cambio de tasa recalcula el saldo en bolívares desde el saldo en dólares."
            />
            <div className="border-t border-[var(--borde)] pt-4">
              <Campo
                etiqueta="Comisión Cashea (%)"
                ayuda="Porcentaje aplicado a las ventas con origen Cashea."
              >
                <div className="flex gap-2">
                  <Entrada
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={comisionCashea}
                    onChange={(evento) => setComisionCashea(evento.target.value)}
                  />
                  <Boton
                    variante="secundario"
                    onClick={guardarComisionCashea}
                    cargando={guardandoComision}
                    disabled={comisionCashea === ""}
                  >
                    Guardar
                  </Boton>
                </div>
              </Campo>
            </div>
          </div>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="apariencia"
          abierto={seccionAbierta === "apariencia"}
          onAlternar={alternarSeccion}
          icono={tema === "oscuro" ? Moon : Sun}
          titulo="Apariencia"
          descripcion="Elige el tema de la aplicación en este dispositivo."
          tono="violeta"
        >
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
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="respaldo"
          abierto={seccionAbierta === "respaldo"}
          onAlternar={alternarSeccion}
          icono={CloudDownload}
          titulo="Copia de seguridad"
          descripcion="Supabase conserva las últimas 14 copias. También puedes descargar un ZIP."
          tono="advertencia"
        >
          <div className="space-y-2">
            <Boton
              onClick={crearCopiaNubeAhora}
              cargando={creandoCopiaNube}
              className="w-full"
            >
              <Cloud className="h-4 w-4" />
              Crear copia ahora
            </Boton>
            <Boton
              variante="secundario"
              onClick={abrirRestauracionNube}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar desde la nube
            </Boton>
            <div className="grid grid-cols-2 gap-2">
              <Boton
                variante="secundario"
                onClick={descargar}
                cargando={generando}
                className="w-full"
              >
                <CloudDownload className="h-4 w-4" />
                ZIP local
              </Boton>
              <Boton
                variante="secundario"
                onClick={() => entradaArchivo.current?.click()}
                className="w-full"
              >
                <CloudUpload className="h-4 w-4" />
                Restaurar ZIP
              </Boton>
            </div>
            <input
              ref={entradaArchivo}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={seleccionarRespaldo}
            />
            <Interruptor
              activo={copiaNubeActiva}
              onCambio={alternarCopiaNube}
              disabled={creandoCopiaNube}
              etiqueta="Copia automática diaria"
              descripcion="Se hace al abrir la app o al recuperar internet. Supabase guarda 14 días."
            />
          </div>
          <div className="mt-3 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5">
            <p className="text-[10px] text-[var(--texto-suave)]">
              Última copia en la nube:{" "}
              <strong>
                {fechaUltimaCopiaNube
                  ? formatearFechaHora(fechaUltimaCopiaNube)
                  : "todavía no"}
              </strong>
            </p>
            {ultimaCopiaNube ? (
              <p className="mt-0.5 truncate text-[10px] text-[var(--texto-tenue)]">
                Archivo: {ultimaCopiaNube}
              </p>
            ) : null}
            {errorCopiaNube ? (
              <p className="mt-1 text-[10px] text-[var(--peligro)]">{errorCopiaNube}</p>
            ) : null}
            {errorNube ? (
              <p className="mt-1 text-[10px] text-[var(--advertencia)]">{errorNube}</p>
            ) : null}
          </div>
          <Alerta tipo="advertencia" className="mt-3">
            Restaurar reemplaza el inventario y las ventas de este dispositivo. Haz una
            copia antes de continuar. La copia automática solo corre con la app abierta.
          </Alerta>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="drive"
          abierto={seccionAbierta === "drive"}
          onAlternar={alternarSeccion}
          icono={HardDrive}
          titulo="Google Drive (opcional)"
          descripcion="Copia diaria permanente en tu propio Drive."
          tono="info"
        >
          <Alerta tipo="info" titulo="Cómo funcionará">
            Cuando conectes tu Google Drive, se guardará una copia diaria permanente en tu
            Drive. Supabase Storage seguirá guardando las últimas 14 copias para
            restauración rápida.
          </Alerta>
          <div className="mt-3 space-y-2">
            <Boton
              variante="secundario"
              onClick={() => setModalDriveAbierto(true)}
              className="w-full"
            >
              <HardDrive className="h-4 w-4" />
              Conectar Google Drive
            </Boton>
            <p className="text-[10px] text-[var(--texto-tenue)]">
              Próximamente: falta configurar el acceso de Google. Por ahora las copias se
              guardan en Supabase.
            </p>
          </div>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="offline"
          abierto={seccionAbierta === "offline"}
          onAlternar={alternarSeccion}
          icono={Wifi}
          titulo="Modo sin conexión"
          descripcion="Deja la app guardada en este dispositivo para abrirla sin internet."
          tono="primario"
        >
          <Alerta tipo="info">
            Después de prepararlo, abre InventaVen desde el acceso directo del navegador.
            Tus datos siguen guardados localmente en este equipo.
          </Alerta>
          <Boton
            variante="secundario"
            onClick={prepararModoSinConexion}
            cargando={preparandoOffline}
            className="mt-3 w-full"
          >
            <Wifi className="h-4 w-4" />
            Preparar modo sin conexión
          </Boton>
          <p className="mt-2 text-[10px] text-[var(--texto-tenue)]">
            En PC funciona mejor con Chrome o Edge. En teléfonos el soporte puede variar.
          </p>
        </SeccionConfiguracion>

        <SeccionConfiguracion
          id="seguridad"
          abierto={seccionAbierta === "seguridad"}
          onAlternar={alternarSeccion}
          icono={KeyRound}
          titulo="Seguridad de la cuenta"
          descripcion="Cambia la contraseña con la que inicias sesión."
          tono="peligro"
        >
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
        </SeccionConfiguracion>
      </div>

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

      <Modal
        abierto={modalNubeAbierto}
        onCerrar={() => {
          if (!restaurandoNube) {
            setModalNubeAbierto(false);
            setRespaldoNubeSeleccionado(null);
          }
        }}
        titulo={
          respaldoNubeSeleccionado
            ? "Restaurar copia de la nube"
            : "Copias guardadas en la nube"
        }
        descripcion={
          respaldoNubeSeleccionado
            ? respaldoNubeSeleccionado.nombre
            : "Supabase conserva las copias de los últimos 14 días."
        }
        ancho="md"
        bloqueado={restaurandoNube}
        pie={
          respaldoNubeSeleccionado ? (
            <>
              <Boton
                variante="secundario"
                onClick={() => setRespaldoNubeSeleccionado(null)}
                disabled={restaurandoNube}
              >
                Cancelar
              </Boton>
              <Boton
                variante="peligro"
                onClick={confirmarRestauracionNube}
                cargando={restaurandoNube}
              >
                <RotateCcw className="h-4 w-4" />
                Reemplazar mis datos
              </Boton>
            </>
          ) : (
            <>
              <Boton
                variante="secundario"
                onClick={cargarRespaldosNube}
                cargando={cargandoNube}
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Boton>
              <Boton
                variante="secundario"
                onClick={() => setModalNubeAbierto(false)}
              >
                Cerrar
              </Boton>
            </>
          )
        }
      >
        <div className="space-y-3">
          {errorRestauracionNube ? (
            <Alerta tipo="error">{errorRestauracionNube}</Alerta>
          ) : null}
          {respaldoNubeSeleccionado ? (
            <Alerta tipo="advertencia" titulo="Se reemplazará todo el contenido actual">
              Se eliminarán los {formatearNumero(productos)} productos y{" "}
              {formatearNumero(ventas)} ventas de este dispositivo, y se cargarán los
              datos de la copia del{" "}
              {formatearFechaHora(
                respaldoNubeSeleccionado.fecha ||
                  respaldoNubeSeleccionado.creadoEn
              )}
              .
            </Alerta>
          ) : (
            <>
              {errorNube ? <Alerta tipo="advertencia">{errorNube}</Alerta> : null}
              {cargandoNube && !respaldosNube.length ? (
                <p className="text-xs text-[var(--texto-suave)]">Cargando copias...</p>
              ) : null}
              {!cargandoNube && !respaldosNube.length ? (
                <p className="text-xs text-[var(--texto-suave)]">
                  Todavía no hay copias en la nube. Activa la copia automática o usa
                  “Crear copia ahora”.
                </p>
              ) : null}
              <div className="space-y-2">
                {respaldosNube.map((respaldo) => (
                  <div
                    key={respaldo.nombre}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {formatearFechaHora(respaldo.fecha || respaldo.creadoEn)}
                      </p>
                      <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                        {respaldo.nombre} · {formatearTamano(respaldo.tamano)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => descargarCopiaNube(respaldo.nombre)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Boton>
                      <Boton
                        tamano="sm"
                        onClick={() => setRespaldoNubeSeleccionado(respaldo)}
                      >
                        Restaurar
                      </Boton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        abierto={modalDriveAbierto}
        onCerrar={() => setModalDriveAbierto(false)}
        titulo="Google Drive (próximamente)"
        descripcion="Copia diaria permanente en tu propio Drive."
        ancho="sm"
        pie={
          <Boton variante="secundario" onClick={() => setModalDriveAbierto(false)}>
            Entendido
          </Boton>
        }
      >
        <div className="space-y-3">
          <Alerta tipo="info">
            Cuando conectes tu Google Drive, se guardará una copia diaria permanente en tu
            Drive. Supabase Storage seguirá guardando las últimas 14 copias para
            restauración rápida.
          </Alerta>
          <p className="text-xs text-[var(--texto-suave)]">
            Para activarlo falta configurar el acceso de Google en este proyecto. Mientras
            tanto, todas las copias se guardan en Supabase y puedes descargarlas o
            restaurarlas desde esta pantalla.
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            Google Drive depende del espacio disponible de tu cuenta. No es almacenamiento
            ilimitado.
          </p>
        </div>
      </Modal>
    </div>
  );
}
