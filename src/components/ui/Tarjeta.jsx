"use client";

export default function Tarjeta({ children, className = "", ...props }) {
  return (
    <section className={["tarjeta p-5", className].join(" ")} {...props}>
      {children}
    </section>
  );
}
