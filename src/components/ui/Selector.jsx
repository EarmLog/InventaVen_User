"use client";

export default function Selector({ className = "", children, ...props }) {
  return (
    <select className={["campo appearance-none pr-8", className].join(" ")} {...props}>
      {children}
    </select>
  );
}
