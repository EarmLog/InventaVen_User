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
import { componerNombreNegocio } from "@/lib/seguridad/validaciones";

const SesionContext = createContext(null);
const CLAVE_SESION_OFFLINE = "inventaven-sesion-offline";

function leerSesionOffline() {
  if (typeof window === "undefined") return null;
  try {
    const contenido = window.localStorage.getItem(CLAVE_SESION_OFFLINE);
    if (!contenido) return null;
    const datos = JSON.parse(contenido);
    if (!datos?.sesion?.user?.id) return null;
    return datos;
  } catch {
    return null;
  }
}

function guardarSesionOffline(sesionActual, perfilActual) {
  if (typeof window === "undefined") return;
  const usuario = sesionActual?.user;
  if (!usuario?.id) return;
  try {
    window.localStorage.setItem(
      CLAVE_SESION_OFFLINE,
      JSON.stringify({
        version: 1,
        guardadoEn: new Date().toISOString(),
        sesion: {
          user: {
            id: usuario.id,
            email: usuario.email || perfilActual?.correo || "",
          },
        },
        perfil: perfilActual || null,
      })
    );
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue con la sesión en memoria.
  }
}

function limpiarSesionOffline() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE_SESION_OFFLINE);
  } catch {
  }
}

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [onboardingAbierto, setOnboardingAbierto] = useState(false);
  const montado = useRef(true);
  const perfilEnCurso = useRef(false);
  const perfilRef = useRef(null);
  const cerrandoSesion = useRef(false);

  const cargarPerfil = useCallback(async (sesionActual) => {
    if (!sesionActual?.access_token) {
      perfilRef.current = null;
      if (montado.current) {
        setPerfil(null);
        setCargandoPerfil(false);
      }
      return null;
    }
    if (perfilEnCurso.current) return null;
    perfilEnCurso.current = true;
    if (montado.current && !perfilRef.current) setCargandoPerfil(true);
    try {
      const datos = await solicitarPerfil(sesionActual.access_token);
      perfilRef.current = datos;
      guardarSesionOffline(sesionActual, datos);
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
    const sesionGuardada = leerSesionOffline();

    if (sesionGuardada) {
      perfilRef.current = sesionGuardada.perfil || null;
      setSesion(sesionGuardada.sesion);
      setPerfil(sesionGuardada.perfil || null);
      setCargandoPerfil(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!montado.current) return;
        if (data.session) {
          setSesion(data.session);
          cargarPerfil(data.session);
          return;
        }
        const respaldo = leerSesionOffline();
        if (respaldo) {
          perfilRef.current = respaldo.perfil || null;
          setSesion(respaldo.sesion);
          setPerfil(respaldo.perfil || null);
          setCargandoPerfil(false);
          return;
        }
        perfilRef.current = null;
        setSesion(null);
        setPerfil(null);
        setCargandoPerfil(false);
      })
      .catch(() => {
        if (!montado.current) return;
        const respaldo = leerSesionOffline();
        if (respaldo) {
          perfilRef.current = respaldo.perfil || null;
          setSesion(respaldo.sesion);
          setPerfil(respaldo.perfil || null);
          setCargandoPerfil(false);
          return;
        }
        perfilRef.current = null;
        setSesion(null);
        setPerfil(null);
        setCargandoPerfil(false);
      });

    const { data: escucha } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!montado.current) return;
      if (nuevaSesion) {
        setSesion(nuevaSesion);
        if (evento !== "TOKEN_REFRESHED") {
          cargarPerfil(nuevaSesion);
        } else {
          guardarSesionOffline(nuevaSesion, perfilRef.current);
        }
        return;
      }

      if (evento === "SIGNED_OUT") {
        const respaldo = leerSesionOffline();
        const sinConexion =
          typeof navigator !== "undefined" && navigator.onLine === false;
        if (!cerrandoSesion.current && sinConexion && respaldo) {
          perfilRef.current = respaldo.perfil || null;
          setSesion(respaldo.sesion);
          setPerfil(respaldo.perfil || null);
          setCargandoPerfil(false);
          return;
        }
        limpiarSesionOffline();
      }

      perfilRef.current = null;
      setSesion(null);
      setPerfil(null);
      setCargandoPerfil(false);
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
    async ({
      correo,
      contrasena,
      nombreNegocio,
      telefono,
      tipoCuenta,
      negocioRegistrado,
      sufijoLegal,
      rif,
    }) => {
      const supabase = obtenerClienteSupabase();
      const nombreCompleto = componerNombreNegocio(nombreNegocio, sufijoLegal);
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim().toLowerCase(),
        password: contrasena,
        options: {
          data: {
            nombre_negocio: nombreCompleto,
            nombre: nombreCompleto,
            telefono: telefono || "",
            tipo_cuenta: tipoCuenta || "personal",
            negocio_registrado: Boolean(negocioRegistrado),
            sufijo_legal: sufijoLegal || "",
            rif: rif || "",
            onboardingVisto: false,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?destino=/panel`,
        },
      });
      if (error) throw new Error(traducirErrorAuth(error));
      if (data.session) {
        await supabase.auth.signOut();
        return { user: data.user, session: null };
      }
      return data;
    },
    []
  );

  const reenviarConfirmacion = useCallback(async (correo) => {
    const supabase = obtenerClienteSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: String(correo || "").trim().toLowerCase(),
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?destino=/panel` },
    });
    if (error) throw new Error(traducirErrorAuth(error));
    return true;
  }, []);

  const cambiarCorreo = useCallback(async (nuevoCorreo) => {
    const supabase = obtenerClienteSupabase();
    const { error } = await supabase.auth.updateUser({
      email: String(nuevoCorreo || "").trim().toLowerCase(),
    });
    if (error) throw new Error(traducirErrorAuth(error));
    return true;
  }, []);

  const cerrarSesion = useCallback(async () => {
    cerrandoSesion.current = true;
    limpiarSesionOffline();
    try {
      const supabase = obtenerClienteSupabase();
      await supabase.auth.signOut();
    } catch {
    } finally {
      perfilRef.current = null;
      setPerfil(null);
      setSesion(null);
      setCargandoPerfil(false);
      cerrandoSesion.current = false;
    }
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
      perfilRef.current = actualizado;
      guardarSesionOffline(data.session, actualizado);
      setPerfil(actualizado);
      return actualizado;
    },
    []
  );

  const marcarOnboardingCompletado = useCallback(async () => {
    const supabase = obtenerClienteSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await solicitarPerfil(data.session.access_token, "PATCH", { onboardingVisto: true });
    }
  }, []);

  const abrirOnboarding = useCallback(() => {
    setOnboardingAbierto(true);
  }, []);

  const cerrarOnboarding = useCallback(async () => {
    setOnboardingAbierto(false);
    try {
      await marcarOnboardingCompletado();
    } catch {
      // Se mantiene cerrado en pantalla para reintentar.
    }
  }, [marcarOnboardingCompletado]);

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
        reenviarConfirmacion,
        cambiarCorreo,
        cerrarSesion,
        recuperarClave,
        cambiarClave,
        actualizarPerfil,
        marcarOnboardingCompletado,
        abrirOnboarding,
        cerrarOnboarding,
        onboardingAbierto,
        setOnboardingAbierto,
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
