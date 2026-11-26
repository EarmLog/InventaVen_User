"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { guardarAjustes, obtenerAjustes } from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { evaluarTasa } from "@/lib/utilidades/tasa";

const TasaContext = createContext(null);

export function ProveedorTasa({ children }) {
  const [tasa, setTasa] = useState(0);
  const [fechaTasa, setFechaTasa] = useState(null);
  const [fuente, setFuente] = useState("");
  const [cargandoTasa, setCargandoTasa] = useState(true);
  const [errorTasa, setErrorTasa] = useState("");
  const montado = useRef(true);

  const cargarTasa = useCallback(async (silencioso = false) => {
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
        });
      } catch {
        // La tasa se conserva en memoria aunque no se pueda persistir.
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
        // Ignoramos errores de lectura local.
      }
      await cargarTasa();
    })();
    const intervalo = window.setInterval(() => cargarTasa(true), 30 * 60 * 1000);
    return () => {
      montado.current = false;
      window.clearInterval(intervalo);
    };
  }, [cargarTasa]);

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
    });
    return nueva;
  }, []);

  return (
    <TasaContext.Provider
      value={{
        tasa,
        fechaTasa,
        fuente,
        cargandoTasa,
        errorTasa,
        refrescarTasa: () => cargarTasa(false),
        establecerTasaManual,
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
