import { formatearVes } from "./formato";

export async function imprimirTicketTermico(venta, negocio = {}) {
  const anchoTicket = "58mm";
  const ventanaImpresion = window.open("", "_blank", "width=300,height=600");
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
      size: 58mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.2;
      width: 58mm;
      margin: 0;
      padding: 4mm;
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
    <div>${negocio.rif || ""}</div>
    <div class="font-bold" style="font-size: 13px;">${negocio.nombreNegocio || negocio.nombre || "InventaVen POS"}</div>
    <div>${negocio.descripcion || ""} ${negocio.codigoZonaPostal || negocio.codigo_postal || ""}</div>
  </div>
  <br>
  <div>
    <div><strong>RAZON SOCIAL:</strong> ${venta.clienteNombre || "CLIENTE GENERICO"}</div>
    <div><strong>CI/RIF:</strong> ${venta.clienteRif || "NO CI NO RIF"}</div>
    <div><strong>CAJA/CAJERA:</strong> ${negocio.caja || "POS"}</div>
    <div><strong>NO.:</strong> ${venta.numeroFactura || venta.codigo}</div>
    <div>
      <span><strong>FECHA:</strong> ${new Date(venta.fecha).toLocaleDateString()}</span>
      <span><strong>HORA:</strong> ${new Date(venta.fecha).toLocaleTimeString()}</span>
    </div>
  </div>
  <div>--------------------------</div>

  <div>
    ${(venta.items || []).map((item) => `
      <div>
        <div><span>${item.cantidad}x Bs ${formatearVes(item.precioUnitarioVes)}</span></div>
        <div class="flex">
          <span>${item.nombre}</span>
          <span class="text-right">${formatearVes(item.totalLineaVes)}</span>
        </div>
      </div>
    `).join("")}
  </div>
  <div>--------------------------</div>

  <div>
    <div class="flex" style="margin-top: 4px;">
      <span>EXENTO (E):</span>
      <span class="text-right">${formatearVes(venta.totalVes)}</span>
    </div>
    <div class="flex" style="margin-top: 2px;">
      <span>BI G (${venta.porcentajeIva || 16},00%):</span>
      <span class="text-right">${formatearVes(venta.baseVes)}</span>
    </div>
    <div class="flex" style="margin-top: 2px;">
      <span>IVA G (${venta.porcentajeIva || 16},00):</span>
      <span class="text-right">${formatearVes(venta.ivaVes)}</span>
    </div>
    <div class="flex font-bold" style="margin-top: 4px;">
      <span>TOTAL:</span>
      <span class="text-right">${formatearVes(venta.totalVes)}</span>
    </div>
    <div class="flex">
      <span>PAGO (${venta.tipoPago}):</span>
      <span class="text-right">${formatearVes(venta.totalVes)}</span>
    </div>
    <div class="flex">
      <span>CAMBIO:</span>
      <span class="text-right">${formatearVes(0)}</span>
    </div>
    <div class="flex">
      <span>CANTIDAD:</span>
      <span class="text-right">${(venta.items || []).reduce((t, i) => t + Number(i.cantidad) || 0, 0)}</span>
    </div>
  </div>

  <div class="text-center" style="margin-top: 10px; font-size: 10px;">
    <div>--------------------------</div>
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