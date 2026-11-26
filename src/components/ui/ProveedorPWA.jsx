"use client";

import { useEffect } from "react";

export default function ProveedorPWA() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    navigator.storage.persist().catch(() => null);
  }, []);

  return null;
}
