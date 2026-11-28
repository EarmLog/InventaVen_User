export const metadata = {
  title: "Tienda online · InventaVen",
  description: "Catálogo público compartido desde InventaVen.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function LayoutTiendaPublica({ children }) {
  return children;
}
