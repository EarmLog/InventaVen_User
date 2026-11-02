"use client";

import { Fragment } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatearUsd, formatearVes, redondear } from "@/lib/utilidades/formato";
import {
  DIAS_SEMANA,
  DIAS_SEMANA_CORTOS,
} from "@/lib/utilidades/analisis";

const COLORES = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

function compacto(valor) {
  const numero = Number(valor) || 0;
  const absoluto = Math.abs(numero);
  if (absoluto >= 1_000_000) return `${redondear(numero / 1_000_000, 1)}M`;
  if (absoluto >= 1_000) return `${redondear(numero / 1_000, 0)}k`;
  return `${redondear(numero, 0)}`;
}

function formatearMonto(valor, moneda) {
  return moneda === "USD" ? formatearUsd(valor) : formatearVes(valor);
}

function TooltipAnalitico({ active, payload, label, moneda = "VES", sufijo = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--texto)]">{label}</p>
      {payload.map((entrada) => {
        const esPorcentaje =
          String(entrada.dataKey || "").toLowerCase().includes("margen") ||
          entrada.unit === "%";
        return (
          <p key={entrada.dataKey} className="mt-0.5 text-[var(--texto-suave)]">
            {entrada.name}:{" "}
            <span className="font-semibold text-[var(--texto)]">
              {esPorcentaje
                ? `${redondear(entrada.value, 1)}%`
                : moneda
                  ? formatearMonto(entrada.value, moneda)
                  : `${entrada.value}${sufijo}`}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function GraficoVentasDias({ datos = [], altura = 280, moneda = "VES" }) {
  const clave = moneda === "USD" ? "totalUsd" : "totalVes";
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--borde)" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
            tickFormatter={compacto}
            width={58}
          />
          <Tooltip content={<TooltipAnalitico moneda={moneda} />} />
          <Bar
            dataKey={clave}
            name={moneda === "USD" ? "Ventas en USD" : "Ventas en Bs."}
            fill="#059669"
            radius={[8, 8, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoComparacion({ datos = [], altura = 280, moneda = "VES" }) {
  const claveActual = moneda === "USD" ? "actualUsd" : "actualVes";
  const claveAnterior = moneda === "USD" ? "anteriorUsd" : "anteriorVes";

  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin ventas para comparar.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--borde)" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
            tickFormatter={compacto}
            width={58}
          />
          <Tooltip content={<TooltipAnalitico moneda={moneda} />} />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(valor) => (
              <span style={{ fontSize: 11, color: "var(--texto-suave)" }}>{valor}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey={claveActual}
            name="Período actual"
            stroke="#059669"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey={claveAnterior}
            name="Período anterior"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoGananciaMargen({ datos = [], altura = 280, moneda = "VES" }) {
  const claveGanancia = moneda === "USD" ? "gananciaUsd" : "gananciaVes";
  const claveMargen = moneda === "USD" ? "margenUsd" : "margenVes";

  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin ventas para calcular ganancia.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 12, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--borde)" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
          />
          <YAxis
            yAxisId="izquierda"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
            tickFormatter={compacto}
            width={58}
          />
          <YAxis
            yAxisId="derecha"
            orientation="right"
            domain={[-100, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--texto-suave)" }}
            tickFormatter={(valor) => `${redondear(valor, 0)}%`}
            width={44}
          />
          <Tooltip content={<TooltipAnalitico moneda={moneda} />} />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(valor) => (
              <span style={{ fontSize: 11, color: "var(--texto-suave)" }}>{valor}</span>
            )}
          />
          <Bar
            yAxisId="izquierda"
            dataKey={claveGanancia}
            name="Ganancia bruta"
            fill="#0ea5e9"
            radius={[6, 6, 0, 0]}
            maxBarSize={38}
          />
          <Line
            yAxisId="derecha"
            type="monotone"
            dataKey={claveMargen}
            name="Margen"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoPagos({ datos = [], altura = 280, moneda = "VES" }) {
  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin ventas para graficar.
      </div>
    );
  }
  const clave = moneda === "USD" ? "totalUsd" : "totalVes";
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey={clave}
            nameKey="nombre"
            cx="50%"
            cy="48%"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
          >
            {datos.map((entrada, indice) => (
              <Cell key={entrada.nombre} fill={COLORES[indice % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipAnalitico moneda={moneda} />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(valor) => (
              <span style={{ fontSize: 11, color: "var(--texto-suave)" }}>{valor}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoProductos({
  datos = [],
  altura = 300,
  color = "#059669",
  moneda = null,
  sufijo = " uds.",
  nombre = "Vendidos",
}) {
  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin productos vendidos en el período.
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="var(--borde)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombreCorto"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--texto-suave)" }}
          />
          <Tooltip content={<TooltipAnalitico moneda={moneda} sufijo={sufijo} />} />
          <Bar dataKey="valor" name={nombre} fill={color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoCategorias({ datos = [], altura = 300, moneda = "VES" }) {
  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin categorías para graficar.
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="var(--borde)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombreCorto"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--texto-suave)" }}
          />
          <Tooltip content={<TooltipAnalitico moneda={moneda} />} />
          <Bar dataKey="valor" name="Ingresos" radius={[0, 8, 8, 0]}>
            {datos.map((entrada, indice) => (
              <Cell key={entrada.nombre} fill={COLORES[indice % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatearHora(hora) {
  return `${String(hora).padStart(2, "0")}:00`;
}

export function MapaCalorHorarios({ resumen, moneda = "VES", altura = 260 }) {
  if (!resumen) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin ventas para analizar horarios.
      </div>
    );
  }

  const campo = moneda === "USD" ? "totalUsd" : "totalVes";
  const maximo = moneda === "USD" ? resumen.maxUsd : resumen.maxVes;
  const mejor = moneda === "USD" ? resumen.mejorUsd : resumen.mejorVes;
  const formatear = (valor) => formatearMonto(valor, moneda);
  const horas = Array.from({ length: 24 }, (_, indice) => indice);

  return (
    <div className="space-y-3" style={{ minHeight: altura }}>
      {mejor ? (
        <p className="text-[11px] text-[var(--texto-suave)]">
          Mejor momento:{" "}
          <strong className="text-[var(--texto)]">
            {DIAS_SEMANA[mejor.dia]} a las {formatearHora(mejor.hora)}
          </strong>{" "}
          · {formatear(mejor.total)}
        </p>
      ) : (
        <p className="text-[11px] text-[var(--texto-suave)]">
          Sin ventas en el período seleccionado.
        </p>
      )}

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[660px]">
          <div className="grid grid-cols-[42px_repeat(24,minmax(18px,1fr))] gap-1">
            <span />
            {horas.map((hora) => (
              <span
                key={`hora-${hora}`}
                className="text-center text-[9px] font-medium text-[var(--texto-tenue)]"
              >
                {hora % 3 === 0 ? hora : ""}
              </span>
            ))}
            {resumen.matriz.map((fila, dia) => (
              <Fragment key={`dia-${dia}`}>
                <span className="flex items-center text-[10px] font-semibold text-[var(--texto-suave)]">
                  {DIAS_SEMANA_CORTOS[dia]}
                </span>
                {fila.map((celda, hora) => {
                  const valor = celda[campo];
                  const intensidad = maximo > 0 ? Math.min(1, valor / maximo) : 0;
                  const porcentaje = Math.round(18 + intensidad * 82);
                  return (
                    <div
                      key={`celda-${dia}-${hora}`}
                      title={`${DIAS_SEMANA[dia]} ${formatearHora(hora)} · ${formatear(valor)} · ${celda.cantidad} venta${celda.cantidad === 1 ? "" : "s"}`}
                      className="h-5 rounded-[4px] border border-[var(--borde)]/40"
                      style={
                        valor > 0
                          ? {
                              backgroundColor: `color-mix(in srgb, var(--primario) ${porcentaje}%, transparent)`,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-[var(--texto-tenue)]">
        Menos
        <span
          className="h-3 w-5 rounded-[3px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primario) 20%, transparent)",
          }}
        />
        <span
          className="h-3 w-5 rounded-[3px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primario) 50%, transparent)",
          }}
        />
        <span className="h-3 w-5 rounded-[3px] bg-[var(--primario)]" />
        Más
      </div>
    </div>
  );
}
