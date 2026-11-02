"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function ModalEscanerCamara({ abierto, onCerrar, onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    const scanner = new Html5QrcodeScanner(
      "reader-scanner",
      { fps: 10, qrbox: { width: 250, height: 150 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => null);
        onScan(decodedText);
        onCerrar();
      },
      () => {
        // Ignorar errores menores de escaneo continuo por fotograma
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => null);
    };
  }, [abierto, onCerrar]);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Escanear código de barras"
      descripcion="Apunta con la cámara de tu teléfono o PC al código de barras."
      ancho="sm"
    >
      <div className="flex flex-col items-center justify-center">
        <div id="reader-scanner" className="w-full overflow-hidden rounded-xl bg-black"></div>
      </div>
    </Modal>
  );
}
