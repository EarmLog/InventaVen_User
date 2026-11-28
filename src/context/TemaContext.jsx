"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useConfiguracion } from "@/context/ConfiguracionContext";
import { guardarAjuste } from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";

const TemaContext = createContext(null);
const CLAVE_LOCAL = "inventaven-tema";

function aplicarTema(tema) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  document.documentElement.style.colorScheme = tema === "oscuro" ? "dark" : "light";
}

export function ProveedorTema({ children }) {
  const { configuracion, listo } = useConfiguracion();
  const [tema, setTema] = useState("claro");
  const temaRemoto = configuracion[CLAVES_AJUSTES.TEMA];

  useEffect(() => {
    if (!listo) return;
    const guardado =
      temaRemoto ||
      window.localStorage.getItem(CLAVE_LOCAL) ||
      document.documentElement.getAttribute("data-tema") ||
      "claro";
    const normalizado = guardado === "oscuro" ? "oscuro" : "claro";
    setTema(normalizado);
    aplicarTema(normalizado);
    window.localStorage.setItem(CLAVE_LOCAL, normalizado);
  }, [listo, temaRemoto]);

  const cambiarTema = useCallback(async (nuevoTema) => {
    const normalizado = nuevoTema === "oscuro" ? "oscuro" : "claro";
    setTema(normalizado);
    aplicarTema(normalizado);
    window.localStorage.setItem(CLAVE_LOCAL, normalizado);
    try {
      await guardarAjuste(CLAVES_AJUSTES.TEMA, normalizado);
    } catch {
    }
  }, []);

  const alternarTema = useCallback(() => {
    cambiarTema(tema === "oscuro" ? "claro" : "oscuro");
  }, [cambiarTema, tema]);

  return (
    <TemaContext.Provider value={{ tema, cambiarTema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error("useTema debe usarse dentro de ProveedorTema.");
  return contexto;
}
