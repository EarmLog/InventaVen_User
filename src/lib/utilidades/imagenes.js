const TAMANO_MAXIMO_ARCHIVO = 8 * 1024 * 1024;

function cargarImagen(file) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(file);
    const imagen = new Image();
    imagen.onload = () => resolver({ imagen, url });
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No se pudo leer la imagen seleccionada."));
    };
    imagen.src = url;
  });
}

export async function comprimirImagen(file, { ladoMaximo = 1200, calidad = 0.78 } = {}) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  if (file.size > TAMANO_MAXIMO_ARCHIVO) {
    throw new Error("La imagen es demasiado grande. Usa una foto de menos de 8 MB.");
  }

  const usaBitmap = typeof createImageBitmap === "function";
  let fuente = null;
  let ancho = 0;
  let alto = 0;
  let urlTemporal = "";

  if (usaBitmap) {
    fuente = await createImageBitmap(file, { imageOrientation: "from-image" });
    ancho = fuente.width;
    alto = fuente.height;
  } else {
    const cargada = await cargarImagen(file);
    fuente = cargada.imagen;
    urlTemporal = cargada.url;
    ancho = fuente.naturalWidth;
    alto = fuente.naturalHeight;
  }

  if (!ancho || !alto) {
    if (usaBitmap) fuente.close?.();
    if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    throw new Error("La imagen seleccionada no tiene dimensiones válidas.");
  }

  const escala = Math.min(1, Number(ladoMaximo) / Math.max(ancho, alto));
  const anchoFinal = Math.max(1, Math.round(ancho * escala));
  const altoFinal = Math.max(1, Math.round(alto * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = anchoFinal;
  lienzo.height = altoFinal;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, anchoFinal, altoFinal);
  contexto.drawImage(fuente, 0, 0, anchoFinal, altoFinal);

  if (usaBitmap) fuente.close?.();
  if (urlTemporal) URL.revokeObjectURL(urlTemporal);

  return {
    datos: lienzo.toDataURL("image/jpeg", Number(calidad) || 0.78),
    mime: "image/jpeg",
    ancho: anchoFinal,
    alto: altoFinal,
  };
}

export function dataUrlABlob(dataUrl, mime = "image/jpeg") {
  const partes = String(dataUrl || "").split(",");
  if (partes.length < 2) throw new Error("La imagen no tiene un formato válido.");
  const binario = atob(partes[1]);
  const bytes = new Uint8Array(binario.length);
  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice);
  }
  return new Blob([bytes], { type: mime });
}
