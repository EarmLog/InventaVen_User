import { db } from "./baseDatos";
import { generarId, redondear } from "@/lib/utilidades/formato";

const PRODUCTOS_DEMO = [
  { nombre: "Harina P.A.N. 1kg", categoria: "Alimentos", compra: 1.10, venta: 1.45, stock: 120 },
  { nombre: "Arroz Blanco Mary 1kg", categoria: "Alimentos", compra: 1.00, venta: 1.30, stock: 95 },
  { nombre: "Pasta Capri 500g", categoria: "Alimentos", compra: 0.90, venta: 1.20, stock: 80 },
  { nombre: "Atún Margarita 140g", categoria: "Alimentos", compra: 1.50, venta: 1.95, stock: 60 },
  { nombre: "Refresco Hit 2L", categoria: "Bebidas", compra: 1.60, venta: 2.10, stock: 75 },
  { nombre: "Maltín Polar Lata", categoria: "Bebidas", compra: 0.65, venta: 0.90, stock: 150 },
  { nombre: "Chocolate Savoy Toronto", categoria: "Chucherías", compra: 1.20, venta: 1.60, stock: 90 },
  { nombre: "Cocosette", categoria: "Chucherías", compra: 0.40, venta: 0.65, stock: 140 },
  { nombre: "Susy", categoria: "Chucherías", compra: 0.40, venta: 0.65, stock: 135 },
  { nombre: "Galletas Oreo 108g", categoria: "Chucherías", compra: 0.85, venta: 1.15, stock: 110 },
  { nombre: "Doritos 45g", categoria: "Chucherías", compra: 0.50, venta: 0.75, stock: 100 },
  { nombre: "Cheetos 45g", categoria: "Chucherías", compra: 0.50, venta: 0.75, stock: 95 },
  { nombre: "Toddy 200g", categoria: "Bebidas", compra: 2.20, venta: 2.90, stock: 45 },
  { nombre: "Aceite Mazeite 1L", categoria: "Alimentos", compra: 2.80, venta: 3.50, stock: 50 },
  { nombre: "Caraotas Negras 1kg", categoria: "Alimentos", compra: 1.40, venta: 1.85, stock: 70 },
  { nombre: "Café Negrito 200g", categoria: "Alimentos", compra: 2.50, venta: 3.20, stock: 40 },
  { nombre: "Diablitos Underwood 115g", categoria: "Alimentos", compra: 1.30, venta: 1.70, stock: 85 },
  { nombre: "Mayonesa Mavesa 400g", categoria: "Alimentos", compra: 2.10, venta: 2.75, stock: 55 },
  { nombre: "Margarina Mavesa 500g", categoria: "Alimentos", compra: 1.80, venta: 2.30, stock: 65 },
  { nombre: "Chinotto 1.5L", categoria: "Bebidas", compra: 1.45, venta: 1.90, stock: 60 }
];

export async function sembrarDatosDemo() {
  if (!db) return;
  const totalProductos = await db.productos.count();
  if (totalProductos > 0) return; // Ya tiene datos

  const tasaUsd = 36.50;
  const ahora = new Date();
  const productosCreados = [];

  // 1. Crear productos
  for (let i = 0; i < PRODUCTOS_DEMO.length; i++) {
    const p = PRODUCTOS_DEMO[i];
    const id = generarId();
    const sku = `PROD-${101 + i}`;
    const producto = {
      id,
      sku,
      nombre: p.nombre,
      descripcion: `Producto fresco de alta rotación - ${p.categoria}`,
      categoria: p.categoria,
      tipoEmpaque: "unidad",
      unidadesPorBulto: 1,
      precioCompraUsd: p.compra,
      precioCompraVes: redondear(p.compra * tasaUsd),
      precioVentaUsd: p.venta,
      precioVentaVes: redondear(p.venta * tasaUsd),
      tasaUsd,
      stock: p.stock,
      stockMinimo: 10,
      activo: true,
      ofertaActiva: Math.random() > 0.7,
      ofertaCantidad: 3,
      ofertaDescuento: 10,
      variantes: [],
      creadoEn: new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      actualizadoEn: ahora.toISOString(),
      fechaRenovacion: ahora.toISOString()
    };
    await db.productos.put(producto);
    productosCreados.push(producto);
  }

  // 2. Generar ventas de 2 meses (60 días)
  const tiposPago = ["efectivo", "pago_movil", "punto_venta", "zelle"];
  const clientes = ["Juan Pérez", "María Rodríguez", "Carlos Silva", "Ana Gómez", "José Hernández", "Luisa Martínez", "Comercial El Trigal", "Cliente Frecuente", ""];
  
  let ventaSeq = 1;
  let facturaSeq = 1;

  for (let dia = 60; dia >= 0; dia--) {
    // 3 a 6 ventas por día
    const ventasDia = Math.floor(Math.random() * 4) + 3;
    for (let v = 0; v < ventasDia; v++) {
      const fechaVenta = new Date(ahora.getTime() - dia * 24 * 60 * 60 * 1000);
      fechaVenta.setHours(8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));

      const cantidadItems = Math.floor(Math.random() * 3) + 1;
      const itemsVenta = [];
      let subtotalUsd = 0;

      for (let it = 0; it < cantidadItems; it++) {
        const prod = productosCreados[Math.floor(Math.random() * productosCreados.length)];
        const cant = Math.floor(Math.random() * 4) + 1;
        const totalLineaUsd = redondear(prod.precioVentaUsd * cant);
        const totalLineaVes = redondear(totalLineaUsd * tasaUsd);

        itemsVenta.push({
          productoId: prod.id,
          varianteId: null,
          nombre: prod.nombre,
          variante: null,
          sku: prod.sku,
          tipoEmpaque: "unidad",
          unidadesPorBulto: 1,
          cantidad: cant,
          precioUnitarioUsd: prod.precioVentaUsd,
          precioUnitarioVes: prod.precioVentaVes,
          costoUnitarioUsd: prod.precioCompraUsd,
          costoTotalUsd: redondear(prod.precioCompraUsd * cant),
          descuentoPorcentaje: 0,
          subtotalUsd: totalLineaUsd,
          subtotalVes: totalLineaVes,
          totalLineaUsd,
          totalLineaVes,
        });
        subtotalUsd += totalLineaUsd;
      }

      subtotalUsd = redondear(subtotalUsd);
      const subtotalVes = redondear(subtotalUsd * tasaUsd);
      const ivaUsd = redondear(subtotalUsd * 0.16);
      const ivaVes = redondear(subtotalVes * 0.16);
      const totalUsd = redondear(subtotalUsd + ivaUsd);
      const totalVes = redondear(subtotalVes + ivaVes);
      const costoTotalUsd = redondear(itemsVenta.reduce((acc, i) => acc + i.costoTotalUsd, 0));
      const gananciaUsd = redondear(subtotalUsd - costoTotalUsd);

      const ventaId = generarId();
      const ventaObj = {
        id: ventaId,
        codigo: `VENTA-${String(ventaSeq++).padStart(6, "0")}`,
        numeroFactura: `FAC-${String(facturaSeq++).padStart(6, "0")}`,
        fecha: fechaVenta.toISOString(),
        estado: "completada",
        tipoPago: tiposPago[Math.floor(Math.random() * tiposPago.length)],
        clienteNombre: clientes[Math.floor(Math.random() * clientes.length)],
        clienteDocumento: Math.random() > 0.5 ? `V-${Math.floor(Math.random() * 20000000) + 1000000}` : "",
        notas: "",
        items: itemsVenta,
        subtotalUsd,
        subtotalVes,
        descuentoUsd: 0,
        descuentoVes: 0,
        baseUsd: subtotalUsd,
        baseVes: subtotalVes,
        porcentajeIva: 16,
        ivaUsd,
        ivaVes,
        totalUsd,
        totalVes,
        costoTotalUsd,
        gananciaUsd,
        tasaUsd,
        montoRecibidoVes: totalVes,
        vueltoVes: 0,
        creadoEn: fechaVenta.toISOString(),
        actualizadoEn: fechaVenta.toISOString(),
        historialEdiciones: [],
      };

      await db.ventas.add(ventaObj);
    }
  }

  // Actualizar secuencias
  await db.secuencias.put({ nombre: "productos", valor: productosCreados.length });
  await db.secuencias.put({ nombre: "ventas", valor: ventaSeq - 1 });
  await db.secuencias.put({ nombre: "facturas", valor: facturaSeq - 1 });
}
