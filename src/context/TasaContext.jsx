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
      const respuesta = await fetch("/api/tasa-cambio", { cache: "no-store" });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Sin tasa disponible.");
      const nueva = Number(datos.tasa) || 0;
      if (nueva <= 0) throw new Error("La tasa recibida no es válida.");
      if (!montado.current) return;
      setTasa(nueva);
      setFechaTasa(datos.fecha || new Date().toISOString());
      setFuente(datos.fuente || "");
      setErrorTasa("");
      try {
        await guardarAjustes({
          [CLAVES_AJUSTES.TASA_USD]: nueva,
          [CLAVES_AJUSTES.TASA_ACTUALIZADA_EN]: new Date().toISOString(),
        });
      } catch {
        // La tasa se conserva en memoria aunque no se pueda persistir.
      }
    } catch (error) {
      if (!montado.current) return;
      const ajustes = await obtenerAjustes();
      const guardada = Number(ajustes[CLAVES_AJUSTES.TASA_USD]) || 0;
      if (guardada > 0 && !silencioso) {
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

  return (
    <TasaContext.Provider
      value={{
        tasa,
        fechaTasa,
        fuente,
        cargandoTasa,
        errorTasa,
        refrescarTasa: () => cargarTasa(false),
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
