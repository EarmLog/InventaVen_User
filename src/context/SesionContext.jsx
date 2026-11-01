"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { solicitarPerfil, traducirErrorAuth } from "@/lib/api/auth";

const SesionContext = createContext(null);

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const montado = useRef(true);
  const perfilEnCurso = useRef(false);

  const cargarPerfil = useCallback(async (sesionActual) => {
    if (!sesionActual?.access_token) {
      if (montado.current) setPerfil(null);
      return null;
    }
    if (perfilEnCurso.current) return null;
    perfilEnCurso.current = true;
    if (montado.current) setCargandoPerfil(true);
    try {
      const datos = await solicitarPerfil(sesionActual.access_token);
      if (montado.current) setPerfil(datos);
      return datos;
    } catch (error) {
      if (montado.current) {
        setPerfil((anterior) => anterior || null);
      }
      return null;
    } finally {
      perfilEnCurso.current = false;
      if (montado.current) setCargandoPerfil(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    const supabase = obtenerClienteSupabase();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!montado.current) return;
        setSesion(data.session ?? null);
        if (data.session) cargarPerfil(data.session);
      })
      .catch(() => {
        if (montado.current) setSesion(null);
      });

    const { data: escucha } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!montado.current) return;
      setSesion(nuevaSesion ?? null);
      if (nuevaSesion) {
        if (evento !== "TOKEN_REFRESHED") cargarPerfil(nuevaSesion);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      montado.current = false;
      escucha?.subscription?.unsubscribe();
    };
  }, [cargarPerfil]);

  useEffect(() => {
    if (!sesion) return undefined;
    const intervalo = window.setInterval(() => {
      obtenerClienteSupabase()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session) cargarPerfil(data.session);
        });
    }, 60_000);
    return () => window.clearInterval(intervalo);
  }, [sesion, cargarPerfil]);

  const iniciarSesion = useCallback(async ({ correo, contrasena, captcha }) => {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena, captcha }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !datos.sesion) {
      throw new Error(datos.error || "No se pudo iniciar sesión.");
    }

    const supabase = obtenerClienteSupabase();
    const { error } = await supabase.auth.setSession({
      access_token: datos.sesion.access_token,
      refresh_token: datos.sesion.refresh_token,
    });
    if (error) {
      throw new Error(traducirErrorAuth(error));
    }
    return datos.sesion;
  }, []);

  const registrarUsuario = useCallback(
    async ({ correo, contrasena, nombreNegocio, telefono }) => {
      const supabase = obtenerClienteSupabase();
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim().toLowerCase(),
        password: contrasena,
        options: {
          data: {
            nombre_negocio: nombreNegocio,
            nombre: nombreNegocio,
            telefono: telefono || "",
          },
        },
      });
      if (error) throw new Error(traducirErrorAuth(error));
      return data;
    },
    []
  );

  const cerrarSesion = useCallback(async () => {
    const supabase = obtenerClienteSupabase();
    await supabase.auth.signOut();
    setPerfil(null);
    setSesion(null);
  }, []);

  const recuperarClave = useCallback(async (correo) => {
    const supabase = obtenerClienteSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(
      correo.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/actualizar-clave`,
      }
    );
    if (error) throw new Error(traducirErrorAuth(error));
  }, []);

  const cambiarClave = useCallback(async (nuevaClave) => {
    const supabase = obtenerClienteSupabase();
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });
    if (error) throw new Error(traducirErrorAuth(error));
  }, []);

  const actualizarPerfil = useCallback(
    async (datos) => {
      const supabase = obtenerClienteSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("No hay una sesión activa.");
      const actualizado = await solicitarPerfil(
        data.session.access_token,
        "PATCH",
        datos
      );
      setPerfil(actualizado);
      return actualizado;
    },
    []
  );

  const refrescarPerfil = useCallback(async () => {
    const supabase = obtenerClienteSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) return cargarPerfil(data.session);
    return null;
  }, [cargarPerfil]);

  return (
    <SesionContext.Provider
      value={{
        sesion,
        perfil,
        cargandoPerfil,
        iniciarSesion,
        registrarUsuario,
        cerrarSesion,
        recuperarClave,
        cambiarClave,
        actualizarPerfil,
        refrescarPerfil,
      }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  return contexto;
}
