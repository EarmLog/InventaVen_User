import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatearUsd, formatearVes } from "./formato";

export function exportarExcelReporte(datos, nombreHoja = "Reporte", nombreArchivo = "reporte.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja.slice(0, 31));
  XLSX.writeFile(workbook, nombreArchivo);
}

export function exportarPdfReporte({ titulo = "Reporte InventaVen", columnas = [], filas = [], nombreArchivo = "reporte.pdf" }) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 26);

  doc.autoTable({
    startY: 32,
    head: [columnas],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  doc.save(nombreArchivo);
}
