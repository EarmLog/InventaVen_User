import { formatearUsd, formatearVes } from "./formato";

export async function imprimirTicketTermico(venta, negocio = {}) {
  const anchoTicket = "58mm";
  const ventanaImpresion = window.open("", "_blank", "width=350,height=600");
  if (!ventanaImpresion) {
    throw new Error("Permite las ventanas emergentes (pop-ups) para imprimir el ticket.");
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${venta.numeroFactura || venta.codigo}</title>
  <style>
    @page {
      size: ${anchoTicket} auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.2;
      width: 58mm;
      margin: 0 auto;
      padding: 5px;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .border-t { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; }
    .flex { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th, td { font-size: 10px; text-align: left; padding: 2px 0; }
    th { border-bottom: 1px dashed #000; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="font-bold uppercase" style="font-size: 13px;">${negocio.nombreNegocio || "InventaVen POS"}</div>
    ${negocio.rif ? `<div>RIF: ${negocio.rif}</div>` : ""}
    ${negocio.telefono ? `<div>Tel: ${negocio.telefono}</div>` : ""}
    <div style="font-size: 10px; margin-top: 2px;">${new Date(venta.fecha).toLocaleString()}</div>
  </div>

  <div class="border-t">
    <div><strong>Factura:</strong> ${venta.numeroFactura || venta.codigo}</div>
    <div><strong>Cajero:</strong> ${negocio.nombre || "Principal"}</div>
    ${venta.clienteNombre ? `<div><strong>Cliente:</strong> ${venta.clienteNombre}</div>` : ""}
    <div><strong>Pago:</strong> <span class="uppercase">${venta.tipoPago}</span></div>
  </div>

  <div class="border-t">
    <table>
      <thead>
        <tr>
          <th>Cant / Prod</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(venta.items || [])
          .map(
            (item) => `
          <tr>
            <td colspan="2"><strong>${item.cantidad}x ${item.nombre}</strong> ${item.variante ? `(${item.variante})` : ""}</td>
          </tr>
          <tr>
            <td>${formatearUsd(item.precioUnitarioUsd)} c/u</td>
            <td class="text-right">${formatearUsd(item.totalLineaUsd)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="border-t">
    <div class="flex">
      <span>Subtotal USD:</span>
      <span>${formatearUsd(venta.subtotalUsd)}</span>
    </div>
    ${venta.ivaUsd > 0 ? `
    <div class="flex">
      <span>IVA (${venta.porcentajeIva || 16}%):</span>
      <span>${formatearUsd(venta.ivaUsd)}</span>
    </div>
    ` : ""}
    <div class="flex font-bold" style="font-size: 12px; margin-top: 4px;">
      <span>TOTAL USD:</span>
      <span>${formatearUsd(venta.totalUsd)}</span>
    </div>
    <div class="flex" style="margin-top: 2px; font-size: 12px;">
      <span>TOTAL VES:</span>
      <span>${formatearVes(venta.totalVes)}</span>
    </div>
    <div style="font-size: 9px; margin-top: 2px;">Tasa BCV: ${formatearVes(venta.tasaUsd)} / $</div>
  </div>

  <div class="border-t text-center" style="margin-top: 10px; font-size: 10px;">
    <div>¡Gracias por su compra!</div>
    <div>InventaVen · Sistema POS Offline</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.setTimeout(() => window.close(), 500);
    };
  </script>
</body>
</html>`;

  ventanaImpresion.document.open();
  ventanaImpresion.document.write(html);
  ventanaImpresion.document.close();
}
