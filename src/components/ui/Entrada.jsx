"use client";

export default function Entrada({ className = "", ...props }) {
  return <input className={["campo", className].join(" ")} {...props} />;
}
