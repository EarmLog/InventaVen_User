"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useConfiguracion } from "@/context/ConfiguracionContext";
import { guardarAjustes, obtenerAjustes } from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { evaluarTasa } from "@/lib/utilidades/tasa";

const TasaContext = createContext(null);

export function ProveedorTasa({ children }) {
  const { configuracion } = useConfiguracion();
  const [tasa, setTasa] = useState(0);
  const [fechaTasa, setFechaTasa] = useState(null);
  const [fuente, setFuente] = useState("");
  const [cargandoTasa, setCargandoTasa] = useState(true);
  const [errorTasa, setErrorTasa] = useState("");
  const montado = useRef(true);
  const manualRef = useRef(false);
  const esManual = Boolean(configuracion[CLAVES_AJUSTES.TASA_MANUAL]);
  const valorManual = Number(configuracion[CLAVES_AJUSTES.TASA_MANUAL_VALOR]) || 0;
  manualRef.current = esManual && valorManual > 0;

  const cargarTasa = useCallback(async (silencioso = false, forzar = false) => {
    if (manualRef.current && !forzar) return;
    if (!silencioso && montado.current) setCargandoTasa(true);
    try {
      const ajustes = await obtenerAjustes();
      const guardada = Number(ajustes[CLAVES_AJUSTES.TASA_USD]) || 0;
      const respuesta = await fetch("/api/tasa-cambio", { cache: "no-store" });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Sin tasa disponible.");
      const nueva = Number(datos.tasa) || 0;
      const evaluacion = evaluarTasa(nueva, guardada);
      if (!evaluacion.valida) {
        if (!montado.current) return;
        if (guardada > 0) {
          setTasa(guardada);
          setFechaTasa(ajustes[CLAVES_AJUSTES.TASA_ACTUALIZADA_EN] || null);
          setFuente("tasa guardada");
        }
        setErrorTasa(evaluacion.motivo);
        return;
      }
      if (!montado.current) return;
      setTasa(nueva);
      setFechaTasa(datos.fecha || new Date().toISOString());
      setFuente(datos.fuente || "");
      setErrorTasa("");
      try {
        await guardarAjustes({
          [CLAVES_AJUSTES.TASA_USD]: nueva,
          [CLAVES_AJUSTES.TASA_ACTUALIZADA_EN]: new Date().toISOString(),
          [CLAVES_AJUSTES.TASA_MANUAL]: false,
          [CLAVES_AJUSTES.TASA_MANUAL_VALOR]: 0,
        });
      } catch {
      }
    } catch (error) {
      if (!montado.current) return;
      const ajustes = await obtenerAjustes();
      const guardada = Number(ajustes[CLAVES_AJUSTES.TASA_USD]) || 0;
      if (guardada > 0) {
        setTasa(guardada);
        setFechaTasa(ajustes[CLAVES_AJUSTES.TASA_ACTUALIZADA_EN] || null);
        setFuente("tasa guardada");
      }
      setErrorTasa(error.message || "No se pudo consultar la tasa.");
    } finally {
      if (montado.current) setCargandoTasa(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (manualRef.current) {
      const ajustes = configuracion;
      setTasa(valorManual);
      setFechaTasa(ajustes[CLAVES_AJUSTES.TASA_ACTUALIZADA_EN] || null);
      setFuente("tasa manual");
      setErrorTasa("");
      setCargandoTasa(false);
      return undefined;
    }
    (async () => {
      try {
        const ajustes = await obtenerAjustes();
        const guardada = Number(ajustes[CLAVES_AJUSTES.TASA_USD]) || 0;
        if (guardada > 0 && montado.current) {
          setTasa(guardada);
          setFechaTasa(ajustes[CLAVES_AJUSTES.TASA_ACTUALIZADA_EN] || null);
          setFuente("tasa guardada");
        }
      } catch {
      }
      await cargarTasa();
    })();
    const intervalo = window.setInterval(() => cargarTasa(true), 30 * 60 * 1000);
    return () => window.clearInterval(intervalo);
  }, [esManual, valorManual, cargarTasa]);

  const establecerTasaManual = useCallback(async (valor) => {
    const nueva = Number(valor);
    if (!Number.isFinite(nueva) || nueva < 10) {
      throw new Error("La tasa manual debe ser un número igual o mayor a 10 VES por USD.");
    }
    setTasa(nueva);
    setFechaTasa(new Date().toISOString());
    setFuente("tasa manual");
    setErrorTasa("");
    await guardarAjustes({
      [CLAVES_AJUSTES.TASA_USD]: nueva,
      [CLAVES_AJUSTES.TASA_ACTUALIZADA_EN]: new Date().toISOString(),
      [CLAVES_AJUSTES.TASA_MANUAL]: true,
      [CLAVES_AJUSTES.TASA_MANUAL_VALOR]: nueva,
    });
    return nueva;
  }, []);

  const restablecerTasaAutomatica = useCallback(async () => {
    await guardarAjustes({
      [CLAVES_AJUSTES.TASA_MANUAL]: false,
      [CLAVES_AJUSTES.TASA_MANUAL_VALOR]: 0,
    });
    await cargarTasa(false, true);
  }, [cargarTasa]);

  return (
    <TasaContext.Provider
      value={{
        tasa,
        fechaTasa,
        fuente,
        cargandoTasa,
        errorTasa,
        esManual,
        refrescarTasa: () => cargarTasa(false),
        establecerTasaManual,
        restablecerTasaAutomatica,
      }}
    >
      {children}
    </TasaContext.Provider>
  );
}

export function useTasa() {
  const contexto = useContext(TasaContext);
  if (!contexto) throw new Error("useTasa debe usarse dentro de ProveedorTasa.");
  return contexto;
}
