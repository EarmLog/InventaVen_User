"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import Modal from "@/components/ui/Modal";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";

export default function ModalEscanerCamara({ abierto, onCerrar, onScan }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    onScanRef.current = onScan;
    onCerrarRef.current = onCerrar;
  }, [onScan, onCerrar]);

  useEffect(() => {
    if (!abierto) return;

    const scanner = new Html5QrcodeScanner(
      "reader-scanner",
      {
        fps: 10,
        qrbox: { width: 260, height: 160 },
        rememberLastUsedCamera: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const codigo = String(decodedText || "").trim();
        if (!codigo) return;
        scanner.clear().catch(() => null);
        reproducirPitidoExito();
        onScanRef.current?.(codigo);
        onCerrarRef.current?.();
      },
      () => {
        // Ignorar errores menores de escaneo continuo por fotograma
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => null);
    };
  }, [abierto]);

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
