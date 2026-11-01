export function traducirErrorAuth(error) {
  const mensaje = String(error?.message || "").toLowerCase();
  if (!mensaje) return "Ocurrió un error inesperado. Intenta de nuevo.";
  if (mensaje.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (mensaje.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (mensaje.includes("user already registered")) {
    return "Ya existe una cuenta registrada con este correo.";
  }
  if (mensaje.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (mensaje.includes("unable to validate email address")) {
    return "El correo electrónico no es válido.";
  }
  if (mensaje.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  }
  if (mensaje.includes("same password")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }
  return error?.message || "Ocurrió un error inesperado. Intenta de nuevo.";
}

export async function solicitarPerfil(token, metodo = "GET", cuerpo = null) {
  const respuesta = await fetch("/api/auth/perfil", {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    cache: "no-store",
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || "No se pudo cargar el perfil.");
  }
  return datos.perfil;
}
