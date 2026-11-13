export const NOMBRE_APP = "InventaVen";
export const NOMBRE_BASE_DATOS = "InventaVenDB";

export const TIPOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "biopago", etiqueta: "Biopago" },
  { valor: "pagomovil", etiqueta: "Pago Móvil" },
];

export const PORCENTAJE_IVA = 16;
export const PORCENTAJE_IGTF = 3;

export const TIPOS_EMPAQUE = [
  { valor: "unidad", etiqueta: "Unidad" },
  { valor: "bulto", etiqueta: "Bulto / Mayor" },
];

export const MONEDAS = [
  { valor: "VES", etiqueta: "Bolívares (VES)" },
  { valor: "USD", etiqueta: "Dólares (USD)" },
];

export const TIPOS_ERROR_VENTA = [
  { valor: "producto_equivocado", etiqueta: "Producto equivocado" },
  { valor: "precio_incorrecto", etiqueta: "Precio incorrecto" },
  { valor: "pago_no_recibido", etiqueta: "Pago no recibido" },
  { valor: "factura_duplicada", etiqueta: "Factura duplicada" },
  { valor: "cliente_arrepentido", etiqueta: "Cliente arrepentido" },
  { valor: "otro", etiqueta: "Otro error" },
];

export const CATEGORIAS_SUGERIDAS = [
  "Alimentos",
  "Bebidas",
  "Limpieza",
  "Cuidado personal",
  "Papelería",
  "Ferretería",
  "Ropa",
  "Tecnología",
  "Otros",
];

export const TIPOS_CUENTA = [
  {
    valor: "personal",
    etiqueta: "Personal",
    descripcion: "Uso personal, sin datos fiscales.",
  },
  {
    valor: "micronegocio",
    etiqueta: "Micro negocio",
    descripcion: "Emprendimiento, venta informal o desde casa.",
  },
  {
    valor: "negocio",
    etiqueta: "Negocio / Mercado",
    descripcion: "Local, mercado, abasto o negocio establecido.",
  },
  {
    valor: "empresa",
    etiqueta: "Empresa",
    descripcion: "Empresa constituida legalmente en Venezuela.",
  },
];

export const SUFIJOS_LEGALES_VE = [
  { valor: "C.A.", etiqueta: "C.A. — Compañía Anónima" },
  { valor: "S.A.", etiqueta: "S.A. — Sociedad Anónima" },
  {
    valor: "S.R.L.",
    etiqueta: "S.R.L. — Sociedad de Responsabilidad Limitada",
  },
  { valor: "C.A.S.A.", etiqueta: "C.A.S.A. — Compañía Anónima S.A." },
  { valor: "S.C.", etiqueta: "S.C. — Sociedad Civil" },
  { valor: "Cooperativa", etiqueta: "Cooperativa" },
];

export const SUGERENCIAS_VARIANTES = {
  Alimentos: [
    "Tamaño personal",
    "Tamaño familiar",
    "Paquete",
    "Caja",
    "Unidad",
    "Granel",
  ],
  Bebidas: [
    "Lata",
    "Botella 350 ml",
    "Botella 1 L",
    "Botella 2 L",
    "Pack",
    "Caja",
  ],
  Limpieza: ["Pequeño", "Mediano", "Grande", "Galón", "Pack", "Recarga"],
  "Cuidado personal": [
    "Pequeño",
    "Mediano",
    "Grande",
    "Pack",
    "Recarga",
    "Unidad",
  ],
  Papelería: ["Unidad", "Paquete", "Caja", "Resma", "Bloc"],
  Ferretería: ["Unidad", "Metro", "Kilo", "Caja", "Paquete"],
  Ropa: ["Talla S", "Talla M", "Talla L", "Talla XL", "Color", "Pack"],
  Tecnología: [
    "Modelo básico",
    "Modelo estándar",
    "Modelo premium",
    "Color",
    "Capacidad",
  ],
  Otros: ["Pequeño", "Mediano", "Grande", "Unidad", "Pack"],
};

export function sugerenciasParaCategoria(categoria) {
  return SUGERENCIAS_VARIANTES[categoria] || SUGERENCIAS_VARIANTES.Otros;
}

export const CLAVES_AJUSTES = {
  TEMA: "tema",
  ACTUALIZAR_PRECIOS_AUTO: "actualizarPreciosAuto",
  TASA_USD: "tasaUsd",
  TASA_ACTUALIZADA_EN: "tasaActualizadaEn",
  ULTIMA_ACTUALIZACION_PRECIOS: "ultimaActualizacionPrecios",
  TASA_ULTIMA_APLICADA: "tasaUltimaAplicada",
  NOMBRE_NEGOCIO: "nombreNegocio",
  RIF_NEGOCIO: "rifNegocio",
  ONBOARDING_VISTO: "onboardingVisto",
  SINC_NUBE: "sincronizacionNube",
};

export const SECUENCIAS = {
  PRODUCTOS: "productos",
  VENTAS: "ventas",
  FACTURAS: "facturas",
};
