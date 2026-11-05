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
