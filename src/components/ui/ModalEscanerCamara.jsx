"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";
import { Camera, RefreshCw, Check, RotateCcw } from "lucide-react";

export default function ModalEscanerCamara({ abierto, onCerrar, onScan }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCerrarRef = useRef(onCerrar);
  const [camaraTrasera, setCamaraTrasera] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const [codigoDetectado, setCodigoDetectado] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
    onCerrarRef.current = onCerrar;
  }, [onScan, onCerrar]);

  useEffect(() => {
    if (!abierto) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => null);
        scannerRef.current = null;
      }
      setCodigoDetectado("");
      return;
    }

    if (codigoDetectado) return;

    setCargando(true);
    setErrorCamara("");

    const html5QrCode = new Html5Qrcode("reader-scanner-box");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 260, height: 160 },
      aspectRatio: 1.0,
    };

    const iniciarCamara = async () => {
      try {
        const idCamara = camaraTrasera ? { facingMode: "environment" } : { facingMode: "user" };
        await html5QrCode.start(
          idCamara,
          config,
          (decodedText) => {
            const codigo = String(decodedText || "").trim();
            if (!codigo) return;
            html5QrCode.stop().catch(() => null);
            scannerRef.current = null;
            reproducirPitidoExito();
            setCodigoDetectado(codigo);
          },
          () => {}
        );
        setCargando(false);
      } catch (err) {
        console.error("Error al iniciar cámara:", err);
        setErrorCamara("No se pudo acceder a la cámara. Verifica los permisos en tu navegador.");
        setCargando(false);
      }
    };

    iniciarCamara();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => null);
        scannerRef.current = null;
      }
    };
  }, [abierto, camaraTrasera, codigoDetectado]);

  const cambiarCamara = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => null).finally(() => {
        setCamaraTrasera((prev) => !prev);
      });
    } else {
      setCamaraTrasera((prev) => !prev);
    }
  };

  const confirmarCodigo = () => {
    if (!codigoDetectado) return;
    onScanRef.current?.(codigoDetectado);
    onCerrarRef.current?.();
  };

  const reintentarEscaneo = () => {
    setCodigoDetectado("");
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Escanear código de barras"
      descripcion="Apunta la cámara de tu teléfono hacia el código de barras."
      ancho="sm"
    >
      <div className="space-y-4">
        {codigoDetectado ? (
          <div className="rounded-2xl bg-[var(--superficie-2)] border border-[var(--borde)] p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--texto-suave)] uppercase tracking-wide">
                Código detectado con éxito
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-wider">{codigoDetectado}</p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                ¿Es correcto este código para agregarlo al producto?
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Boton
                type="button"
                variante="secundario"
                onClick={reintentarEscaneo}
                className="flex-1 bg-white text-slate-800 border border-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Escanear de nuevo
              </Boton>
              <Boton
                type="button"
                variante="primario"
                onClick={confirmarCodigo}
                className="flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Sí, usar código
              </Boton>
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-black border border-[var(--borde)] aspect-square flex items-center justify-center shadow-inner">
              <div id="reader-scanner-box" className="w-full h-full"></div>
              {cargando && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xs font-semibold gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Iniciando cámara...
                </div>
              )}
              {errorCamara && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center text-xs space-y-2">
                  <p className="text-red-300 font-semibold">{errorCamara}</p>
                  <Boton variante="secundario" onClick={() => setCamaraTrasera((p) => !p)} className="bg-white text-black font-bold">
                    Intentar con otra cámara
                  </Boton>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Boton
                type="button"
                variante="secundario"
                onClick={cambiarCamara}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 text-xs"
              >
                <RefreshCw className="h-4 w-4" />
                Cambiar cámara ({camaraTrasera ? "Trasera" : "Frontal"})
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={onCerrar}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-5 rounded-xl shadow-sm text-xs"
              >
                Cerrar
              </Boton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
