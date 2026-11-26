import { formatearUsd, formatearVes } from "./formato";

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

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function imprimirComprobanteCompra(compra, negocio = {}) {
  const ventanaImpresion = window.open("", "_blank", "width=340,height=650");
  if (!ventanaImpresion) {
    throw new Error("Permite las ventanas emergentes (pop-ups) para imprimir el comprobante.");
  }

  const items = Array.isArray(compra.items) && compra.items.length > 0
    ? compra.items
    : [
        {
          nombre: compra.productoNombre || compra.concepto || "Compra registrada",
          cantidad: Number(compra.cantidad) || 1,
          precioUnitarioUsd: Number(compra.precioCompraUsd) || 0,
          precioUnitarioVes: Number(compra.precioCompraVes) || 0,
          totalUsd: Number(compra.totalUsd) || 0,
          totalVes: Number(compra.totalVes) || 0,
        },
      ];

  const filas = items
    .map((item) => {
      const cantidad = Number(item.cantidad) || 1;
      const totalUsd = Number(item.totalUsd ?? item.totalLineaUsd) || 0;
      const totalVes = Number(item.totalVes ?? item.totalLineaVes) || 0;
      const unitarioUsd =
        Number(item.precioUnitarioUsd ?? item.precioCompraUsd) ||
        (cantidad > 0 ? totalUsd / cantidad : 0);
      const unitarioVes =
        Number(item.precioUnitarioVes ?? item.precioCompraVes) ||
        (cantidad > 0 ? totalVes / cantidad : 0);
      return `
        <tr>
          <td>${escaparHtml(item.nombre || item.productoNombre || "Compra")}</td>
          <td class="text-right">${escaparHtml(cantidad)}</td>
          <td class="text-right">${formatearUsd(unitarioUsd)}</td>
          <td class="text-right">${formatearUsd(totalUsd)}</td>
        </tr>
        <tr class="detalle-ves">
          <td colspan="3"></td>
          <td class="text-right">${formatearVes(totalVes)}</td>
        </tr>
      `;
    })
    .join("");

  const numero =
    compra.numeroFactura || compra.numeroControl || compra.codigo || compra.id || "—";
  const totalUsd = Number(compra.totalUsd) || 0;
  const totalVes = Number(compra.totalVes) || 0;
  const baseUsd = Number(compra.baseImponibleUsd) || 0;
  const baseVes = Number(compra.baseImponibleVes) || 0;
  const ivaUsd = Number(compra.ivaUsd) || 0;
  const ivaVes = Number(compra.ivaVes) || 0;
  const igtfUsd = Number(compra.igtfUsd) || 0;
  const igtfVes = Number(compra.igtfVes) || 0;
  const fecha = compra.fecha ? new Date(compra.fecha) : new Date();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Compra ${escaparHtml(numero)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: 80mm;
      margin: 0;
      padding: 5mm;
      color: #000;
      background: #fff;
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .separador { border-top: 1px dashed #000; margin: 6px 0; padding-top: 6px; }
    .flex { display: flex; justify-content: space-between; gap: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th, td { font-size: 10px; padding: 2px 0; vertical-align: top; }
    th { border-bottom: 1px dashed #000; text-align: left; }
    .detalle-ves td { color: #444; padding-top: 0; }
  </style>
</head>
<body>
  <div class="text-center">
    <div>${escaparHtml(negocio.rif || "")}</div>
    <div class="font-bold" style="font-size: 13px;">${escaparHtml(negocio.nombre || negocio.nombreNegocio || "InventaVen")}</div>
    <div>${escaparHtml(negocio.descripcion || "")} ${escaparHtml(negocio.codigoZonaPostal || "")}</div>
  </div>
  <div class="separador text-center font-bold uppercase">Comprobante de compra</div>
  <div class="flex"><span>NO.:</span><span>${escaparHtml(numero)}</span></div>
  <div class="flex"><span>TIPO:</span><span>${escaparHtml(compra.tipo || "compra")}</span></div>
  <div class="flex"><span>ESTADO:</span><span>${escaparHtml(compra.estado || "registrada")}</span></div>
  <div class="flex">
    <span>FECHA:</span>
    <span>${fecha.toLocaleDateString("es-VE")} ${fecha.toLocaleTimeString("es-VE")}</span>
  </div>
  <div class="separador">
    <div class="flex"><span>PROVEEDOR:</span><span>${escaparHtml(compra.proveedorNombre || compra.razonSocialProveedor || "No indicado")}</span></div>
    <div class="flex"><span>RIF:</span><span>${escaparHtml(compra.proveedorRif || compra.rifProveedor || "—")}</span></div>
    <div class="flex"><span>CAJA:</span><span>${escaparHtml(negocio.caja || "POS")}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="text-right">Cant.</th>
        <th class="text-right">P. USD</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="separador">
    <div class="flex"><span>BASE IMPONIBLE:</span><span>${formatearUsd(baseUsd)}</span></div>
    <div class="flex"><span>IVA:</span><span>${formatearUsd(ivaUsd)}</span></div>
    <div class="flex"><span>IGTF:</span><span>${formatearUsd(igtfUsd)}</span></div>
    <div class="flex font-bold"><span>TOTAL USD:</span><span>${formatearUsd(totalUsd)}</span></div>
    <div class="flex"><span>TOTAL Bs:</span><span>${formatearVes(totalVes)}</span></div>
    <div class="flex" style="color: #444;">
      <span>Base / IVA / IGTF Bs:</span>
      <span>${formatearVes(baseVes)} / ${formatearVes(ivaVes)} / ${formatearVes(igtfVes)}</span>
    </div>
  </div>
  <div class="text-center" style="margin-top: 10px; font-size: 10px;">
    <div>--------------------------</div>
    <div>Documento interno de compra</div>
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