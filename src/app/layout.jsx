import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ProveedorSesion } from "@/context/SesionContext";
import { ProveedorTema } from "@/context/TemaContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "InventaVen | Inventario, POS y análisis",
    template: "%s | InventaVen",
  },
  description:
    "Gestiona tu inventario, punto de venta, facturas y análisis con InventaVen.",
};

export const viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

const scriptTema = `(function(){try{var t=localStorage.getItem('inventaven-tema');if(t==='oscuro'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ProveedorTema>
          <ProveedorSesion>
            {children}
            <Toaster
              position="top-right"
              richColors
              toastOptions={{ style: { borderRadius: "12px" } }}
            />
          </ProveedorSesion>
        </ProveedorTema>
      </body>
    </html>
  );
}
