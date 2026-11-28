"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSesion } from "@/context/SesionContext";
import { solicitarConfiguracion } from "@/lib/api/auth";
import { guardarAjustes, obtenerAjustes } from "@/lib/db/repositorios";
import {
  CLAVES_CONFIGURACION_NUBE,
  CONFIGURACION_NUBE_POR_DEFECTO,
} from "@/lib/utilidades/constantes";

const ConfiguracionContext = createContext(null);

function soloClavesSincronizadas(cambios) {
  const resultado = {};
  for (const clave of CLAVES_CONFIGURACION_NUBE) {
    if (Object.prototype.hasOwnProperty.call(cambios || {}, clave)) {
      resultado[clave] = cambios[clave];
    }
  }
  return resultado;
}

export function ProveedorConfiguracion({ children }) {
  const { sesion } = useSesion();
  const [configuracion, setConfiguracion] = useState(CONFIGURACION_NUBE_POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [listo, setListo] = useState(false);
  const usuarioIdRef = useRef(null);
  const tokenRef = useRef(null);
  const aplicandoRemoto = useRef(false);
  const pendientes = useRef({});
  const temporizador = useRef(null);
  const cargandoRemoto = useRef(false);

  tokenRef.current = sesion?.access_token || null;
  usuarioIdRef.current = sesion?.user?.id || null;

  const aplicarLocalmente = useCallback(async (datos) => {
    aplicandoRemoto.current = true;
    try {
      await guardarAjustes(datos);
      window.dispatchEvent(new Event("inventaven-ajustes"));
    } finally {
      aplicandoRemoto.current = false;
    }
  }, []);

  const enviarCambios = useCallback(async () => {
    if (!usuarioIdRef.current || !tokenRef.current) return;
    const cambios = { ...pendientes.current };
    pendientes.current = {};
    if (!Object.keys(cambios).length) return;
    try {
      const respuesta = await solicitarConfiguracion("PATCH", cambios);
      if (respuesta?.configuracion) setConfiguracion(respuesta.configuracion);
    } catch {
      Object.assign(pendientes.current, cambios);
    }
  }, []);

  const recargar = useCallback(async () => {
    if (!usuarioIdRef.current || !tokenRef.current) {
      setConfiguracion(CONFIGURACION_NUBE_POR_DEFECTO);
      setCargando(false);
      setListo(true);
      return null;
    }
    if (cargandoRemoto.current) return null;
    cargandoRemoto.current = true;
    setCargando(true);
    try {
      const respuesta = await solicitarConfiguracion("GET");
      const locales = respuesta?.existente
        ? {}
        : await obtenerAjustes().catch(() => ({}));
      const datos = {
        ...CONFIGURACION_NUBE_POR_DEFECTO,
        ...soloClavesSincronizadas(locales),
        ...soloClavesSincronizadas(respuesta?.configuracion || {}),
      };
      await aplicarLocalmente(datos);
      setConfiguracion(datos);
      setListo(true);
      return datos;
    } catch {
      const locales = await obtenerAjustes().catch(() => ({}));
      const datos = {
        ...CONFIGURACION_NUBE_POR_DEFECTO,
        ...soloClavesSincronizadas(locales),
      };
      setConfiguracion(datos);
      setListo(true);
      return datos;
    } finally {
      cargandoRemoto.current = false;
      setCargando(false);
    }
  }, [aplicarLocalmente]);

  useEffect(() => {
    recargar();
  }, [sesion?.user?.id, recargar]);

  useEffect(() => {
    function alCambiar(evento) {
      if (aplicandoRemoto.current || !usuarioIdRef.current) return;
      const cambios = soloClavesSincronizadas(evento?.detail?.cambios);
      if (!Object.keys(cambios).length) return;
      setConfiguracion((anterior) => ({ ...anterior, ...cambios }));
      Object.assign(pendientes.current, cambios);
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(enviarCambios, 500);
    }
    window.addEventListener("inventaven-configuracion-local", alCambiar);
    return () => {
      window.removeEventListener("inventaven-configuracion-local", alCambiar);
      window.clearTimeout(temporizador.current);
    };
  }, [enviarCambios]);

  const actualizarConfiguracion = useCallback(
    async (cambios) => {
      const filtrados = soloClavesSincronizadas(cambios);
      if (!Object.keys(filtrados).length) return;
      setConfiguracion((anterior) => ({ ...anterior, ...filtrados }));
      await guardarAjustes(filtrados);
      Object.assign(pendientes.current, filtrados);
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(enviarCambios, 120);
    },
    [enviarCambios]
  );

  return (
    <ConfiguracionContext.Provider
      value={{
        configuracion,
        cargando,
        listo,
        recargar,
        actualizarConfiguracion,
      }}
    >
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  const contexto = useContext(ConfiguracionContext);
  if (!contexto) {
    throw new Error("useConfiguracion debe usarse dentro de ProveedorConfiguracion.");
  }
  return contexto;
}
