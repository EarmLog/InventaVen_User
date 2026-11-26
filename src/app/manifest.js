export default function manifest() {
  return {
    name: "InventaVen | Inventario, POS y análisis",
    short_name: "InventaVen",
    description:
      "Gestiona tu inventario, punto de venta, facturas y análisis con InventaVen.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    lang: "es",
    orientation: "any",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Punto de venta",
        short_name: "POS",
        url: "/panel/pos",
      },
      {
        name: "Inventario",
        short_name: "Inventario",
        url: "/panel/inventario",
      },
      {
        name: "Configuración",
        short_name: "Configuración",
        url: "/panel/configuracion",
      },
    ],
  };
}
