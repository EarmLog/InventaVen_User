import { formatearVes } from "./formato";

const ANCHO_TICKET = "58mm";
const CSS_TICKET = `
    @page {
      size: ${ANCHO_TICKET} auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      line-height: 1.25;
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
`;

function abrirVentanaImpresion(html) {
  const ventanaImpresion = window.open("", "_blank", "width=350,height=600");
  if (!ventanaImpresion) {
    throw new Error("Permite las ventanas emergentes (pop-ups) para imprimir el ticket.");
  }
  ventanaImpresion.document.open();
  ventanaImpresion.document.write(html);
  ventanaImpresion.document.close();
}

export async function imprimirTicketTermico(venta, negocio = {}) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${venta.numeroFactura || venta.codigo}</title>
${CSS_TICKET}
</head>
<body>
  <div class="text-center">
    <div>${negocio.rif || ""}</div>
    <div class="font-bold" style="font-size: 13px;">${negocio.nombreNegocio || negocio.nombre || "InventaVen POS"}</div>
    <div>${negocio.descripcion || ""} ${negocio.codigoZonaPostal || negocio.codigo_postal || ""}</div>
  </div>

  <div>
    <div><strong>RAZON SOCIAL:</strong> ${venta.clienteNombre || "CLIENTE GENERICO"}</div>
    <div><strong>CI/RIF:</strong> ${venta.clienteRif || "NO CI NO RIF"}</div>
    <div><strong>CAJA4/CAJERA:</strong> ${negocio.caja || "POS"}</div>
    <div><strong>NO.:</strong> ${venta.numeroFactura || venta.codigo}</div>
    <div>
      <span><strong>FECHA:</strong> ${new Date(venta.fecha).toLocaleDateString()}</span>
      <span><strong>HORA:</strong> ${new Date(venta.fecha).toLocaleTimeString()}</span>
    </div>
  </div>
  <div>--------------</div>

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
  <div>--------------</div>

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
    <div>
      <span>PAGO (${venta.tipoPago}):</span>
      <span class="text-right">${formatearVes(venta.totalVes)}</span>
    </div>
    <div>
      <span>CAMBIO:</span>
      <span class="text-right">${formatearVes(0)}</span>
    </div>
    <div>
      <span>CATIDAD:</span>
      <span class="text-right">${(venta.items || []).reduce((t, i) => t + Number(i.cantidad) || 0, 0)}</span>
    </div>
  </div>

  <div class="text-center" style="margin-top: 10px; font-size: 10px;">
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

  abrirVentanaImpresion(html);
}

export async function imprimirComprobanteCompra(compra, negocio = {}) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Compra ${compra.numeroFactura || compra.codigo}</title>
${CSS_TICKET}
</head>
<body>
  <div class="text-center">
    <div>COMPRA / PROVEEDOR</div>
    <div class="font-bold" style="font-size: 13px;">${negocio.nombreNegocio || negocio.nombre || "InventaVen POS"}</div>
    <div>${negocio.rif || ""}</div>
    <div>${negocio.descripcion || ""} ${negocio.codigoZonaPostal || negocio.codigo_postal || ""}</div>
  </div>

  <div>
    <div><strong>PROVEEDOR:</strong> ${compra.proveedorNombre || "PROVEEDOR GENERICO"}</div>
    <div><strong>PROVEEDOR CI/RIF:</strong> ${compra.proveedorRif || "NO RIF"}</div>
    <div><strong>NO.:</strong> ${compra.numeroFactura || compra.codigo}</div>
    <div>
      <span><strong>FECHA:</strong> ${new Date(compra.fecha).toLocaleDateString()}</span>
      <span><strong>HORA:</strong> ${new Date(compra.fecha).toLocaleTimeString()}</span>
    </div>
  </div>
  <div>--------------</div>

  <div>
    ${(compra.items || [
      {
        cantidad: compra.cantidad,
        nombre: compra.productoNombre || "Producto",
        precioUnitarioVes: compra.precioCompraVes,
        totalLineaVes: compra.totalVes,
      },
    ]).map((item) => `
      <div>
        <div><span>${item.cantidad}x Bs ${formatearVes(item.precioUnitarioVes)}</span></div>
        <div class="flex">
          <span>${item.nombre}</span>
          <span class="text-right">${formatearVes(item.totalLineaVes)}</span>
        </div>
      </div>
    `).join("")}
  </div>
  <div>--------------</div>

  <div>
    <div class="flex" style="margin-top: 4px;">
      <span>BASE IMPONIBLE:</span>
      <span class="text-right">${formatearVes(compra.baseImponibleVes)}</span>
    </div>
    <div class="flex" style="margin-top: 2px;">
      <span>IVA:</span>
      <span class="text-right">${formatearVes(compra.ivaVes)}</span>
    </div>
    <div class="flex font-bold" style="margin-top: 4px;">
      <span>TOTAL:</span>
      <span class="text-right">${formatearVes(compra.totalVes)}</span>
    </div>
    <div>
      <span>CATIDAD:</span>
      <span class="text-right">${compra.cantidad}</span>
    </div>
  </div>

  <div class="text-center" style="margin-top: 10px; font-size: 10px;">
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

  abrirVentanaImpresion(html);
}
