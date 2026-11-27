const ZONA_HORARIA = "America/Caracas";

function limpiarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizar(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .trim();
}

function numeroDia(valor) {
  const texto = normalizar(valor);
  const dias = {
    lun: 1,
    lunes: 1,
    mar: 2,
    martes: 2,
    mie: 3,
    mier: 3,
    miercoles: 3,
    jue: 4,
    jueves: 4,
    vie: 5,
    viernes: 5,
    sab: 6,
    sabado: 6,
    dom: 7,
    domingo: 7,
  };
  return dias[texto] || null;
}

function todosLosDias() {
  return new Set([1, 2, 3, 4, 5, 6, 7]);
}

function diasDesdeTexto(valor) {
  const texto = normalizar(valor);
  const dias = new Set();
  if (!texto) return dias;

  for (const trozo of texto.split(/,|\s+y\s+/).map((parte) => parte.trim()).filter(Boolean)) {
    const rango = trozo.match(/^([a-z]+)\s*(?:-|–|—|hasta|\ba\b)\s*([a-z]+)$/);
    if (rango) {
      const inicio = numeroDia(rango[1]);
      const fin = numeroDia(rango[2]);
      if (inicio && fin) {
        let actual = inicio;
        for (let paso = 0; paso < 7; paso += 1) {
          dias.add(actual);
          if (actual === fin) break;
          actual = (actual % 7) + 1;
        }
        continue;
      }
    }
    const dia = numeroDia(trozo.replace(/\bcerrado\b/g, ""));
    if (dia) dias.add(dia);
  }

  if (dias.size === 0 && /\btodos\b|\bdiario\b|\bcerrado\b/.test(texto)) {
    return todosLosDias();
  }
  return dias;
}

function minutosDesde(horas, minutos) {
  const hora = Number(horas);
  const minuto = Number(minutos || 0);
  if (!Number.isInteger(hora) || hora > 23 || minuto > 59) return null;
  return hora * 60 + minuto;
}

function tiemposDesde(segmento) {
  const expresion = /(\d{1,2})(?::(\d{2}))?\s*(?:-|–|—|\ba\b|hasta)\s*(\d{1,2})(?::(\d{2}))?/gi;
  const tiempos = [];
  let coincidencia;
  while ((coincidencia = expresion.exec(segmento)) !== null) {
    const inicio = minutosDesde(coincidencia[1], coincidencia[2]);
    const fin = minutosDesde(coincidencia[3], coincidencia[4]);
    if (inicio !== null && fin !== null) tiempos.push({ inicio, fin });
  }
  return tiempos;
}

function interpretarHorario(texto) {
  const rangosPorDia = new Map();
  const cerrados = new Set();
  let diasPrevios = null;
  let interpretado = false;

  for (const bloque of texto.split(/[;\n|]+/)) {
    for (const parte of bloque.split(/,/)) {
      const segmento = parte.trim();
      if (!segmento) continue;

      const tiempos = tiemposDesde(segmento);
      const textoDias = limpiarTexto(
        segmento.replace(/(\d{1,2})(?::(\d{2}))?\s*(?:-|–|—|\ba\b|hasta)\s*(\d{1,2})(?::(\d{2}))?/gi, " ")
      );
      const cerrado = /\bcerrado\b/i.test(textoDias);
      let dias = textoDias ? diasDesdeTexto(textoDias) : diasPrevios;
      if (dias && dias.size > 0) diasPrevios = dias;
      if (!dias || dias.size === 0) continue;

      interpretado = true;
      if (cerrado || tiempos.length === 0) {
        if (cerrado) {
          for (const dia of dias) {
            rangosPorDia.delete(dia);
            cerrados.add(dia);
          }
        }
        continue;
      }

      for (const dia of dias) {
        cerrados.delete(dia);
        if (!rangosPorDia.has(dia)) rangosPorDia.set(dia, []);
        rangosPorDia.get(dia).push(...tiempos);
      }
    }
  }

  return interpretado ? { rangosPorDia, cerrados } : null;
}

function sinHorario(texto) {
  return { etiqueta: "Sin horario", abierto: null, texto };
}

export function estadoHorario(horario, fecha = new Date()) {
  const texto = limpiarTexto(horario);
  if (!texto) return sinHorario(texto);

  try {
    const horarioInterpretado = interpretarHorario(texto);
    if (!horarioInterpretado) return sinHorario(texto);

    const partes = new Intl.DateTimeFormat("es-VE", {
      timeZone: ZONA_HORARIA,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(fecha);
    const dia = numeroDia(partes.find((parte) => parte.type === "weekday")?.value);
    if (!dia) return sinHorario(texto);

    const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0) % 24;
    const minuto = Number(partes.find((parte) => parte.type === "minute")?.value || 0);
    const ahora = hora * 60 + minuto;
    const rangos = horarioInterpretado.rangosPorDia.get(dia) || [];
    const abierto =
      !horarioInterpretado.cerrados.has(dia) &&
      rangos.some(({ inicio, fin }) =>
        fin > inicio ? ahora >= inicio && ahora < fin : ahora >= inicio || ahora < fin
      );

    return { etiqueta: abierto ? "Abierto ahora" : "Cerrado", abierto, texto };
  } catch {
    return sinHorario(texto);
  }
}
