import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { Html5Qrcode } from "html5-qrcode";

export function iniciarEscaneoCamara({ elementoId, facingMode, fps, qrbox, onCodigo }) {
  const html5QrCode = new Html5Qrcode(elementoId);
  const config = {
    fps: fps || 10,
    qrbox: qrbox || { width: 260, height: 160 },
    aspectRatio: 1.0,
  };

  const iniciar = async () => {
    const idCamara = facingMode === "environment" ? { facingMode: "environment" } : { facingMode: "user" };
    await html5QrCode.start(idCamara, config, onCodigo, () => {});
    return true;
  };

  const detener = () => html5QrCode.stop().catch(() => null);

  return { iniciar, detener, instancia: html5QrCode };
}

export function crearCanalEscaneo(canalId) {
  const supabase = obtenerClienteSupabase();
  const canal = supabase.channel(`scanner-${canalId}`);
  const estado = { conectado: false, ultimaCodigo: "", totalEscaneos: 0 };

  canal.on("broadcast", { event: "codigo-escaneado" }, ({ payload }) => {
    const codigo = String(payload?.codigo || "").trim();
    if (!codigo) return;
    estado.ultimaCodigo = codigo;
    estado.totalEscaneos += 1;
  });

  canal.subscribe((status) => {
    if (status === "SUBSCRIBED") estado.conectado = true;
  });

  return {
    canal,
    estado,
    limpiar: () => supabase.removeChannel(canal),
  };
}

export async function enviarCodigoEscaneado(canal, codigo) {
  return canal.send({
    type: "broadcast",
    event: "codigo-escaneado",
    payload: { codigo },
  });
}
