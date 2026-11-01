"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

const COLORES = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

function TooltipPersonalizado({ active, payload, label, sufijo = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--texto)]">{label}</p>
      {payload.map((entrada) => (
        <p key={entrada.dataKey} className="mt-0.5 text-[var(--texto-suave)]">
          {entrada.name}:{" "}
          <span className="font-semibold text-[var(--texto)]">
            {sufijo === "usd"
              ? formatearUsd(entrada.value)
              : sufijo === "ves"
                ? formatearVes(entrada.value)
                : `${entrada.value}${sufijo}`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function GraficoVentasDias({ datos = [], altura = 280 }) {
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
            width={58}
          />
          <Tooltip content={<TooltipPersonalizado sufijo="ves" />} />
          <Bar
            dataKey="totalVes"
            name="Ventas en Bs."
            fill="#059669"
            radius={[8, 8, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoPagos({ datos = [], altura = 280 }) {
  if (!datos.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-[var(--texto-suave)]">
        Sin ventas para graficar.
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="totalVes"
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
          <Tooltip content={<TooltipPersonalizado sufijo="ves" />} />
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

export function GraficoProductos({ datos = [], altura = 300, color = "#059669" }) {
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
          <Tooltip content={<TooltipPersonalizado sufijo=" uds." />} />
          <Bar dataKey="cantidad" name="Vendidos" fill={color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
