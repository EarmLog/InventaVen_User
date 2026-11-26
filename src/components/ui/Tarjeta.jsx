"use client";

export default function Tarjeta({
  children,
  className = "",
  as: Componente = "section",
  ...props
}) {
  return (
    <Componente className={["tarjeta p-5", className].join(" ")} {...props}>
      {children}
    </Componente>
  );
}
