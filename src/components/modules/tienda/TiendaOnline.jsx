"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Copy,
  ExternalLink,
  Globe,
  Link2,
  MessageCircle,
  PackageOpen,
  RefreshCw,
  Search,
  Send,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/baseDatos";
import { guardarAjuste } from "@/lib/db/repositorios";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { useSesion } from "@/context/SesionContext";
import { useTasa } from "@/context/TasaContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Etiqueta from "@/components/ui/Etiqueta";
import Interruptor from "@/components/ui/Interruptor";
import Alerta from "@/components/ui/Alerta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { limpiarTelefono, validarTelefonoVe } from "@/lib/seguridad/validaciones";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import {
  formatearFechaHora,
  formatearNumero,
  formatearUsd,
  formatearVes,
} from "@/lib/utilidades/formato";
import VistaPreviaTienda from "./VistaPreviaTienda";

const CLAVES_TIENDA_CONTACTO = {
  HORARIO: CLAVES_AJUSTES.TIENDA_HORARIO || "tiendaHorario",
  TELEGRAM: CLAVES_AJUSTES.TIENDA_TELEGRAM || "tiendaTelegram",
  INSTAGRAM: CLAVES_AJUSTES.TIENDA_INSTAGRAM || "tiendaInstagram",
  CORREO: CLAVES_AJUSTES.TIENDA_CORREO_CONTACTO || "tiendaCorreoContacto",
};

function normalizarSlug(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function imagenABase64(datos) {
  const texto = String(datos || "");
  if (!texto) return "";
  const coma = texto.indexOf(",");
  return coma >= 0 ? texto.slice(coma + 1) : texto;
}

function construirUrlTienda(slug, token) {
  if (typeof window === "undefined") return "";
  const base = `${window.location.origin}/tienda/${encodeURIComponent(slug || "")}`;
  return token ? `${base}/${encodeURIComponent(token)}` : base;
}

function imagenParaVista(registro) {
  const datos = String(registro?.datos || "");
  if (!datos) return "";
  if (datos.startsWith("data:")) return datos;
  const mime = /^image\//.test(String(registro?.mime || "")) ? registro.mime : "image/jpeg";
  return `data:${mime};base64,${datos}`;
}

function textoBusqueda(producto) {
  const variantes = Array.isArray(producto?.variantes)
    ? producto.variantes.map((variante) => variante?.sku || variante?.codigo || "")
    : [];
  return [
    producto?.nombre,
    producto?.sku,
    producto?.codigoBarra,
    producto?.codigo,
    ...variantes,
  ]
    .join(" ")
    .toLowerCase();
}

async function obtenerEncabezadosAutenticados() {
  const supabase = obtenerClienteSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error("Inicia sesión nuevamente para publicar la tienda.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

async function leerRespuesta(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || datos.mensaje || "No se pudo completar la solicitud.");
  }
  return datos;
}

function Miniatura({ imagenUrl }) {
  if (imagenUrl) {
    return (
      <img
        src={imagenUrl}
        alt="Imagen del producto"
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
        onError={(evento) => {
          evento.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--superficie-3)] text-[var(--texto-tenue)]">
      <PackageOpen className="h-4 w-4" />
    </div>
  );
}

export default function TiendaOnline() {
  const { perfil } = useSesion();
  const { tasa } = useTasa();

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
  const productos =
    useLiveQuery(() => (db ? db.productos.toArray() : []), [], []) || [];
  const imagenes =
    useLiveQuery(() => (db ? db.imagenesProducto.toArray() : []), [], []) || [];

  const [slugTienda, setSlugTienda] = useState("");
  const [tokenTienda, setTokenTienda] = useState("");
  const [telefonoTienda, setTelefonoTienda] = useState("");
  const [telegramTienda, setTelegramTienda] = useState("");
  const [instagramTienda, setInstagramTienda] = useState("");
  const [correoContactoTienda, setCorreoContactoTienda] = useState("");
  const [horarioTienda, setHorarioTienda] = useState("");
  const [urlTienda, setUrlTienda] = useState("");
  const [publicandoTienda, setPublicandoTienda] = useState(false);
  const [renovandoTienda, setRenovandoTienda] = useState(false);
  const [catalogoPublico, setCatalogoPublico] = useState(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [enlaceInvalido, setEnlaceInvalido] = useState(false);
  const [versionCatalogo, setVersionCatalogo] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("todos");
  const [guardandoId, setGuardandoId] = useState("");
  const ajustesInicializados = useRef(false);

  const imagenesPorProducto = useMemo(
    () => new Map(imagenes.map((imagen) => [imagen.productoId, imagen])),
    [imagenes]
  );
  const categorias = useMemo(
    () =>
      Array.from(
        new Set(productos.map((producto) => String(producto.categoria || "Otros")))
      ).sort((a, b) => a.localeCompare(b, "es")),
    [productos]
  );
  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideTexto = !texto || textoBusqueda(producto).includes(texto);
      const coincideCategoria =
        !categoria || String(producto.categoria || "Otros") === categoria;
      const coincideEstado =
        estado === "todos" ||
        (estado === "visibles"
          ? producto.visibleTienda === true
          : producto.visibleTienda !== true);
      return coincideTexto && coincideCategoria && coincideEstado;
    });
  }, [productos, busqueda, categoria, estado]);

  const cantidadVisibles = productos.filter(
    (producto) => producto.visibleTienda === true
  ).length;
  const fechaPublicacionTienda = ajustes[CLAVES_AJUSTES.TIENDA_PUBLICADA_EN];
  const urlVisible = urlTienda || construirUrlTienda(slugTienda, tokenTienda);

  useEffect(() => {
    if (ajustesInicializados.current || !Object.keys(ajustes).length) return;
    ajustesInicializados.current = true;
    const slug = String(ajustes[CLAVES_AJUSTES.TIENDA_SLUG] || "");
    const token = String(ajustes[CLAVES_AJUSTES.TIENDA_TOKEN] || "");
    setSlugTienda(slug);
    setTokenTienda(token);
    setTelefonoTienda(String(ajustes[CLAVES_AJUSTES.TIENDA_TELEFONO] || ""));
    setTelegramTienda(String(ajustes[CLAVES_TIENDA_CONTACTO.TELEGRAM] || ""));
    setInstagramTienda(String(ajustes[CLAVES_TIENDA_CONTACTO.INSTAGRAM] || ""));
    setCorreoContactoTienda(
      String(ajustes[CLAVES_TIENDA_CONTACTO.CORREO] || perfil?.correo || "")
    );
    setHorarioTienda(String(ajustes[CLAVES_TIENDA_CONTACTO.HORARIO] || ""));
    setUrlTienda(token ? construirUrlTienda(slug, token) : "");
  }, [ajustes, perfil?.correo]);

  useEffect(() => {
    if (!ajustesInicializados.current) return;
    if (ajustes[CLAVES_TIENDA_CONTACTO.CORREO]) return;
    if (!perfil?.correo) return;
    setCorreoContactoTienda((actual) => actual || String(perfil.correo || ""));
  }, [ajustes, perfil?.correo]);

  useEffect(() => {
    if (!slugTienda || !tokenTienda) {
      setCatalogoPublico(null);
      setEnlaceInvalido(false);
      setErrorCatalogo("");
      setCargandoCatalogo(false);
      return undefined;
    }

    const control = new AbortController();
    let activo = true;
    setCargandoCatalogo(true);
    setErrorCatalogo("");

    fetch(
      `/api/tienda/${encodeURIComponent(slugTienda)}/${encodeURIComponent(tokenTienda)}`,
      { cache: "no-store", signal: control.signal }
    )
      .then(async (respuesta) => {
        const contenido = await respuesta.json().catch(() => ({}));
        if (respuesta.status === 404) return { invalido: true };
        if (!respuesta.ok) {
          throw new Error(contenido.error || "No se pudo cargar el catálogo publicado.");
        }
        return { datos: contenido };
      })
      .then((resultado) => {
        if (!activo) return;
        if (resultado.invalido) {
          setEnlaceInvalido(true);
          setCatalogoPublico(null);
          setErrorCatalogo(
            "El enlace guardado ya no está disponible. Renueva el link o publica la tienda de nuevo."
          );
          return;
        }
        setEnlaceInvalido(false);
        setCatalogoPublico(resultado.datos);
      })
      .catch((error) => {
        if (error?.name === "AbortError" || !activo) return;
        setCatalogoPublico(null);
        setErrorCatalogo(error.message || "No se pudo cargar el catálogo publicado.");
      })
      .finally(() => {
        if (activo) setCargandoCatalogo(false);
      });

    return () => {
      activo = false;
      control.abort();
    };
  }, [slugTienda, tokenTienda, versionCatalogo]);

  async function guardarRespuestaTienda(datos, slug) {
    const slugFinal = datos?.slug || slug;
    const token = datos?.token || tokenTienda;
    const telefono = limpiarTelefono(telefonoTienda);
    const telegram = String(telegramTienda || "").trim();
    const instagram = String(instagramTienda || "").trim();
    const correoContacto = String(correoContactoTienda || "").trim();
    const horario = String(horarioTienda || "").trim();
    const url = construirUrlTienda(slugFinal, token);
    await guardarAjuste(CLAVES_AJUSTES.TIENDA_SLUG, slugFinal);
    await guardarAjuste(CLAVES_AJUSTES.TIENDA_TOKEN, token);
    await guardarAjuste(CLAVES_AJUSTES.TIENDA_ACTIVA, true);
    await guardarAjuste(CLAVES_AJUSTES.TIENDA_TELEFONO, telefono);
    await guardarAjuste(CLAVES_TIENDA_CONTACTO.TELEGRAM, telegram);
    await guardarAjuste(CLAVES_TIENDA_CONTACTO.INSTAGRAM, instagram);
    await guardarAjuste(CLAVES_TIENDA_CONTACTO.CORREO, correoContacto);
    await guardarAjuste(CLAVES_TIENDA_CONTACTO.HORARIO, horario);
    await guardarAjuste(
      CLAVES_AJUSTES.TIENDA_PUBLICADA_EN,
      datos?.publicadaEn || new Date().toISOString()
    );
    setSlugTienda(slugFinal);
    setTokenTienda(token);
    setTelefonoTienda(telefono);
    setTelegramTienda(telegram);
    setInstagramTienda(instagram);
    setCorreoContactoTienda(correoContacto);
    setHorarioTienda(horario);
    setUrlTienda(url);
    setVersionCatalogo((valor) => valor + 1);
    window.dispatchEvent(new Event("inventaven-ajustes"));
    return url;
  }

  async function publicarTienda() {
    const slug = normalizarSlug(slugTienda);
    if (!slug) {
      toast.error("Escribe un slug para la tienda online.");
      return;
    }
    const errorTelefono = validarTelefonoVe(telefonoTienda, { obligatorio: false });
    if (errorTelefono) {
      toast.error(errorTelefono);
      return;
    }
    if (!(Number(tasa) > 0)) {
      toast.error("No hay una tasa de cambio disponible para publicar la tienda.");
      return;
    }

    setPublicandoTienda(true);
    try {
      const productosPublicar = productos
        .filter((producto) => producto.visibleTienda === true)
        .map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion || "",
          categoria: producto.categoria || "Otros",
          precioUsd: Number(producto.precioVentaUsd) || 0,
          precioVes: Number(producto.precioVentaVes) || 0,
          imagenBase64: imagenABase64(
            imagenesPorProducto.get(producto.id)?.datos
          ),
          sku: producto.sku || "",
          stock: Number(producto.stock) || 0,
          variantes: Array.isArray(producto.variantes)
            ? producto.variantes
                .filter((variante) => variante?.activo !== false)
                .map((variante) => ({
                  id: variante.id,
                  nombre: variante.nombre || "",
                  sku: variante.sku || variante.codigo || "",
                  stock: Number(variante.stock) || 0,
                  precioUsd: Number(variante.precioVentaUsd) || 0,
                  precioVes: Number(variante.precioVentaVes) || 0,
                  activo: variante.activo !== false,
                }))
            : [],
        }));
      const encabezados = await obtenerEncabezadosAutenticados();
      const respuesta = await fetch("/api/tienda/publicar", {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify({
          slug,
          nombreNegocio:
            perfil?.nombreNegocio ||
            ajustes[CLAVES_AJUSTES.NOMBRE_NEGOCIO] ||
            "Mi negocio",
          telefono: limpiarTelefono(telefonoTienda),
          telegram: String(telegramTienda || "").trim(),
          instagram: String(instagramTienda || "").trim(),
          correoContacto: String(correoContactoTienda || "").trim(),
          horario: String(horarioTienda || "").trim(),
          tasa: Number(tasa),
          productos: productosPublicar,
        }),
      });
      const datos = await leerRespuesta(respuesta);
      await guardarRespuestaTienda(datos, slug);
      toast.success(
        `Tienda publicada con ${formatearNumero(
          Number.isFinite(datos.productos) ? datos.productos : productosPublicar.length
        )} productos.`
      );
    } catch (error) {
      toast.error(error.message || "No se pudo publicar la tienda.");
    } finally {
      setPublicandoTienda(false);
    }
  }

  async function renovarLinkTienda() {
    if (!tokenTienda) {
      toast.error("Primero publica la tienda para poder renovar el enlace.");
      return;
    }
    setRenovandoTienda(true);
    try {
      const encabezados = await obtenerEncabezadosAutenticados();
      const respuesta = await fetch("/api/tienda/renovar", {
        method: "POST",
        headers: encabezados,
      });
      const datos = await leerRespuesta(respuesta);
      await guardarRespuestaTienda(datos, datos?.slug || slugTienda);
      toast.success("Enlace de la tienda renovado correctamente.");
    } catch (error) {
      toast.error(error.message || "No se pudo renovar el enlace.");
    } finally {
      setRenovandoTienda(false);
    }
  }

  function abrirTienda() {
    if (!urlVisible) {
      toast.error("Publica la tienda para obtener un enlace.");
      return;
    }
    window.open(urlVisible, "_blank", "noopener,noreferrer");
  }

  async function copiarLinkTienda() {
    if (!urlVisible) {
      toast.error("Publica la tienda para obtener un enlace.");
      return;
    }
    let copiado = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlVisible);
        copiado = true;
      }
    } catch {
      copiado = false;
    }
    if (!copiado) {
      const area = document.createElement("textarea");
      area.value = urlVisible;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      copiado = document.execCommand("copy");
      area.remove();
    }
    if (copiado) {
      toast.success("Enlace copiado al portapapeles.");
      return;
    }
    toast.error("No se pudo copiar el enlace.");
  }

  function compartirTienda(red) {
    if (!urlVisible) {
      toast.error("Publica la tienda para poder compartirla.");
      return;
    }
    const texto = `Mira los productos de ${
      perfil?.nombreNegocio || "mi negocio"
    }: ${urlVisible}`;
    const telefono = limpiarTelefono(telefonoTienda);
    let destino = "";
    if (red === "whatsapp") {
      destino = telefono
        ? `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`
        : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    } else if (red === "facebook") {
      destino = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlVisible)}`;
    } else {
      destino = `https://twitter.com/intent/tweet?url=${encodeURIComponent(urlVisible)}&text=${encodeURIComponent(texto)}`;
    }
    window.open(destino, "_blank", "noopener,noreferrer");
  }

  async function cambiarVisibleProducto(producto, activo) {
    if (!db) {
      toast.error("La base de datos local no está disponible.");
      return;
    }
    setGuardandoId(producto.id);
    try {
      await db.productos.update(producto.id, {
        visibleTienda: activo,
        actualizadoEn: new Date().toISOString(),
      });
      toast.success(
        activo
          ? `${producto.nombre} ahora aparece en la tienda online.`
          : `${producto.nombre} ya no aparece en la tienda online.`
      );
    } catch (error) {
      toast.error(
        error.message || "No se pudo actualizar la visibilidad del producto."
      );
    } finally {
      setGuardandoId("");
    }
  }

  const usarVistaLocal = !catalogoPublico || enlaceInvalido;
  const nombreNegocioVista =
    catalogoPublico?.nombreNegocio ||
    perfil?.nombreNegocio ||
    ajustes[CLAVES_AJUSTES.NOMBRE_NEGOCIO] ||
    "Mi negocio";
  const telefonoVista = usarVistaLocal
    ? telefonoTienda
    : catalogoPublico?.telefono || telefonoTienda;
  const telegramVista = usarVistaLocal
    ? telegramTienda
    : catalogoPublico?.telegram || telegramTienda;
  const instagramVista = usarVistaLocal
    ? instagramTienda
    : catalogoPublico?.instagram || instagramTienda;
  const correoContactoVista = usarVistaLocal
    ? correoContactoTienda
    : catalogoPublico?.correoContacto || correoContactoTienda;
  const horarioVista = usarVistaLocal
    ? horarioTienda
    : catalogoPublico?.horario || horarioTienda;
  const tasaVista = Number(catalogoPublico?.tasa) > 0 ? catalogoPublico.tasa : tasa;
  const publicadaEnVista =
    catalogoPublico?.publicadaEn || fechaPublicacionTienda;
  const productosVista = usarVistaLocal
    ? productos
        .filter((producto) => producto.visibleTienda === true)
        .map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion || "",
          categoria: producto.categoria || "Otros",
          precioUsd: Number(producto.precioVentaUsd) || 0,
          precioVes: Number(producto.precioVentaVes) || 0,
          imagenUrl: imagenParaVista(imagenesPorProducto.get(producto.id)),
        }))
    : Array.isArray(catalogoPublico?.productos)
      ? catalogoPublico.productos
      : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tienda online</h1>
        <p className="mt-1 text-sm text-[var(--texto-suave)]">
          Publica tu catálogo, comparte el enlace y revisa lo que ven tus clientes.
        </p>
      </div>

      <Tarjeta className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Enlace y compartir</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Configura la dirección pública de tu tienda y compártela.
            </p>
          </div>
        </div>

        {enlaceInvalido ? (
          <Alerta tipo="error" titulo="El enlace guardado fue invalidado" className="mb-4">
            El enlace público ya no está disponible. Renueva el link o publica la tienda de
            nuevo para generar un acceso válido.
          </Alerta>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Campo
              etiqueta="Slug de la tienda"
              ayuda="Se usa en el enlace público. Solo letras, números y guiones."
            >
              <Entrada
                value={slugTienda}
                onChange={(evento) => setSlugTienda(normalizarSlug(evento.target.value))}
                placeholder="mi-tienda"
                maxLength={48}
              />
            </Campo>
            <Campo
              etiqueta="Teléfono de WhatsApp (opcional)"
              ayuda="Solo números, sin espacios ni guiones."
            >
              <Entrada
                value={telefonoTienda}
                onChange={(evento) =>
                  setTelefonoTienda(limpiarTelefono(evento.target.value))
                }
                maxLength={13}
                inputMode="numeric"
                placeholder="04121234567"
              />
            </Campo>
            <Campo etiqueta="Telegram (usuario o enlace)">
              <Entrada
                value={telegramTienda}
                onChange={(evento) => setTelegramTienda(evento.target.value)}
                placeholder="@minegocio o https://t.me/minegocio"
              />
            </Campo>
            <Campo etiqueta="Instagram (usuario o enlace)">
              <Entrada
                value={instagramTienda}
                onChange={(evento) => setInstagramTienda(evento.target.value)}
                placeholder="@minegocio o https://instagram.com/minegocio"
              />
            </Campo>
            <Campo etiqueta="Correo de contacto">
              <Entrada
                type="email"
                value={correoContactoTienda}
                onChange={(evento) => setCorreoContactoTienda(evento.target.value)}
                placeholder="contacto@minegocio.com"
              />
            </Campo>
            <Campo
              etiqueta="Horario de atención"
              ayuda='Se mostrará abajo de la tasa con estado "Abierto ahora".'
            >
              <Entrada
                value={horarioTienda}
                onChange={(evento) => setHorarioTienda(evento.target.value)}
                placeholder="Lun-Vie 08:00-18:00; Sáb 09:00-13:00; Dom Cerrado"
              />
            </Campo>
            <div className="flex flex-wrap gap-2">
              <Boton onClick={publicarTienda} cargando={publicandoTienda} disabled={!slugTienda}>
                <Store className="h-4 w-4" />
                Publicar cambios
              </Boton>
              <Boton
                variante="secundario"
                onClick={renovarLinkTienda}
                cargando={renovandoTienda}
                disabled={!tokenTienda}
              >
                <RefreshCw className="h-4 w-4" />
                Renovar link
              </Boton>
              <Boton variante="secundario" onClick={copiarLinkTienda} disabled={!urlVisible}>
                <Copy className="h-4 w-4" />
                Copiar link
              </Boton>
              <Boton variante="secundario" onClick={abrirTienda} disabled={!urlVisible}>
                <ExternalLink className="h-4 w-4" />
                Abrir tienda
              </Boton>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                <Link2 className="h-3 w-3" />
                Enlace público
              </p>
              <p className="break-all font-mono text-[11px]">
                {urlVisible || "Todavía no publicaste la tienda."}
              </p>
              <p className="text-[10px] text-[var(--texto-tenue)]">
                Última publicación:{" "}
                <strong>
                  {fechaPublicacionTienda
                    ? formatearFechaHora(fechaPublicacionTienda)
                    : "todavía no"}
                </strong>
              </p>
            </div>
            <div className="rounded-xl border border-[var(--borde)] px-3 py-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Compartir
              </p>
              <div className="flex flex-wrap gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => compartirTienda("whatsapp")}
                  disabled={!urlVisible}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </Boton>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => compartirTienda("facebook")}
                  disabled={!urlVisible}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Facebook
                </Boton>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => compartirTienda("x")}
                  disabled={!urlVisible}
                >
                  <Send className="h-3.5 w-3.5" />
                  X
                </Boton>
              </div>
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--info-suave)] text-[var(--info)]">
              <PackageOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Productos en la tienda online</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Elige qué productos aparecen en el catálogo y publica los cambios.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta variante="exito">
              {formatearNumero(cantidadVisibles)} visibles
            </Etiqueta>
            <Boton
              onClick={publicarTienda}
              cargando={publicandoTienda}
              disabled={!slugTienda}
            >
              <Store className="h-4 w-4" />
              Publicar cambios
            </Boton>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
              <Entrada
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Nombre, SKU o código"
                className="pl-9"
              />
            </div>
          </Campo>
          <Campo etiqueta="Categoría">
            <Selector value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Estado">
            <Selector value={estado} onChange={(evento) => setEstado(evento.target.value)}>
              <option value="todos">Todos</option>
              <option value="visibles">Visibles</option>
              <option value="no-visibles">No visibles</option>
            </Selector>
          </Campo>
        </div>

        {productosFiltrados.length === 0 ? (
          <EstadoVacio
            icono={PackageOpen}
            titulo="No hay productos para mostrar"
            descripcion="Ajusta los filtros o marca productos como visibles desde el inventario."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[var(--superficie-2)] text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">En tienda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borde)]">
                  {productosFiltrados.map((producto) => {
                    const imagenUrl = imagenParaVista(
                      imagenesPorProducto.get(producto.id)
                    );
                    const visible = producto.visibleTienda === true;
                    return (
                      <tr key={producto.id} className="transition hover:bg-[var(--superficie-2)]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Miniatura imagenUrl={imagenUrl} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{producto.nombre}</p>
                              <p className="text-[11px] text-[var(--texto-suave)]">
                                {producto.sku || "Sin SKU"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{producto.categoria || "Otros"}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {formatearUsd(producto.precioVentaUsd)}
                          </p>
                          <p className="text-[11px] text-[var(--texto-suave)]">
                            {formatearVes(producto.precioVentaVes)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Etiqueta variante={visible ? "exito" : "neutra"}>
                            {visible ? "Visible" : "No visible"}
                          </Etiqueta>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-40">
                            <Interruptor
                              activo={visible}
                              onCambio={(activo) => cambiarVisibleProducto(producto, activo)}
                              disabled={guardandoId === producto.id}
                              etiqueta="Visible"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {productosFiltrados.map((producto) => {
                const imagenUrl = imagenParaVista(
                  imagenesPorProducto.get(producto.id)
                );
                const visible = producto.visibleTienda === true;
                return (
                  <Tarjeta key={producto.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <Miniatura imagenUrl={imagenUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{producto.nombre}</p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {producto.sku || "Sin SKU"} · {producto.categoria || "Otros"}
                        </p>
                      </div>
                      <Etiqueta variante={visible ? "exito" : "neutra"}>
                        {visible ? "Visible" : "No visible"}
                      </Etiqueta>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[var(--superficie-2)] px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                          USD
                        </p>
                        <p className="text-xs font-semibold">
                          {formatearUsd(producto.precioVentaUsd)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--superficie-2)] px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                          Bs.
                        </p>
                        <p className="text-xs font-semibold">
                          {formatearVes(producto.precioVentaVes)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-[var(--borde)] pt-3">
                      <Interruptor
                        activo={visible}
                        onCambio={(activo) => cambiarVisibleProducto(producto, activo)}
                        disabled={guardandoId === producto.id}
                        etiqueta="Mostrar en la tienda online"
                      />
                    </div>
                  </Tarjeta>
                );
              })}
            </div>
          </>
        )}
      </Tarjeta>

      <Tarjeta className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--info-suave)] text-[var(--info)]">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Vista previa para clientes</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Así se ve tu catálogo desde un teléfono.
            </p>
          </div>
        </div>

        {usarVistaLocal ? (
          <Alerta tipo={enlaceInvalido ? "error" : "info"} titulo="Vista local">
            {enlaceInvalido
              ? "El enlace guardado ya no está disponible. Se muestran los productos visibles de este dispositivo mientras renuevas o publicas de nuevo."
              : "Todavía no hay un enlace publicado. Se muestran los productos visibles guardados en este dispositivo. Publica la tienda para ver el catálogo real de tus clientes."}
          </Alerta>
        ) : (
          <Alerta tipo="exito" titulo="Catálogo publicado">
            Este catálogo fue cargado desde el enlace público de tu tienda.
          </Alerta>
        )}
        {errorCatalogo && !enlaceInvalido ? (
          <Alerta tipo="advertencia" className="mt-2">
            {errorCatalogo}
          </Alerta>
        ) : null}

        <div className="mt-4 flex justify-center">
          <VistaPreviaTienda
            nombreNegocio={nombreNegocioVista}
            telefono={telefonoVista}
            telegram={telegramVista}
            instagram={instagramVista}
            correoContacto={correoContactoVista}
            horario={horarioVista}
            tasa={tasaVista}
            publicadaEn={publicadaEnVista}
            productos={productosVista}
          />
        </div>
        {cargandoCatalogo ? (
          <p className="mt-3 text-center text-[10px] text-[var(--texto-tenue)]">
            Actualizando el catálogo publicado…
          </p>
        ) : null}
      </Tarjeta>
    </div>
  );
}
