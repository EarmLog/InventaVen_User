import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";

export function exportarExcelReporte(datos, nombreHoja = "Reporte", nombreArchivo = "reporte.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja.slice(0, 31));
  XLSX.writeFile(workbook, nombreArchivo);
}

export function exportarPdfReporte({
  titulo = "Reporte InventaVen",
  columnas = [],
  filas = [],
  nombreArchivo = "reporte.pdf",
  negocio = null,
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 26);

  let y = 32;
  if (negocio?.nombre) {
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Negocio: ${negocio.nombre}`, 14, y);
    y += 6;
    if (negocio.rif) doc.text(`RIF: ${negocio.rif}`, 14, y);
    if (negocio.direccion) doc.text(`Direccion: ${negocio.direccion}`, 14, y);
    if (negocio.zonaPostal) doc.text(`Zona Postal: ${negocio.zonaPostal}`, 14, y);
    y += 2;
  }

  const inicioTabla = y + 4;
  autoTable(doc, {
    startY: inicioTabla,
    head: [columnas],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const finalTabla = doc.lastAutoTable?.finalY || inicioTabla + 20;
  const totales = [];
  for (let i = 0; i < columnas.length; i += 1) {
    let suma = 0;
    for (const fila of filas) {
      const valor = Number(fila[i]);
      if (Number.isFinite(valor)) suma += valor;
    }
    if (suma > 0) totales.push(`${columnas[i]}: ${suma.toFixed(2)}`);
  }
  if (totales.length) {
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total: ${totales.join(" | ")}`, 14, finalTabla + 6);
  }

  doc.save(nombreArchivo);
}

export function exportarAnalisisExcel({
  resumen = [],
  facturas = [],
  productos = [],
  categorias = [],
  nombreArchivo = "analisis.xlsx",
}) {
  const libro = XLSX.utils.book_new();

  const hojas = [
    { nombre: "Resumen", datos: resumen },
    { nombre: "Facturas", datos: facturas },
    { nombre: "Productos", datos: productos },
    { nombre: "Categorias", datos: categorias },
  ];

  hojas.forEach((hoja) => {
    if (!hoja.datos.length) return;
    const worksheet = XLSX.utils.json_to_sheet(hoja.datos);
    XLSX.utils.book_append_sheet(libro, worksheet, hoja.nombre.slice(0, 31));
  });

  XLSX.writeFile(libro, nombreArchivo);
}

export function exportarAnalisisPdf({
  titulo = "Análisis de ventas",
  subtitulo = "",
  resumen = [],
  columnas = [],
  filas = [],
  nombreArchivo = "analisis.pdf",
}) {
  const doc = new jsPDF({
    orientation: columnas.length > 6 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  if (subtitulo) doc.text(subtitulo, 14, 26);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, subtitulo ? 31 : 26);

  autoTable(doc, {
    startY: subtitulo ? 37 : 32,
    head: [["Indicador", "Valor"]],
    body: resumen,
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  if (columnas.length && filas.length) {
    const inicio = (doc.lastAutoTable?.finalY || 40) + 8;
    autoTable(doc, {
      startY: inicio,
      head: [columnas],
      body: filas,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2 },
    });
  }

  doc.save(nombreArchivo);
}
