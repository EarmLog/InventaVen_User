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
  if (mensaje.includes("unable to validate email address") || mensaje.includes("email address") || mensaje.includes("invalid email")) {
    return "El correo electrónico no es válido o está en un formato no permitido.";
  }
  if (mensaje.includes("rate limit") || mensaje.includes("over_email_send_rate_limit")) {
    return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  }
  if (mensaje.includes("signups not allowed")) {
    return "El registro de nuevos usuarios está deshabilitado temporalmente.";
  }
  if (mensaje.includes("same password")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }
  if (
    mensaje.includes("email link is invalid") ||
    mensaje.includes("email link has expired") ||
    mensaje.includes("confirmation link")
  ) {
    return "El enlace de confirmación es inválido o expiró. Solicita uno nuevo.";
  }
  if (mensaje.includes("email rate limit")) {
    return "Demasiados correos enviados. Espera unos minutos e intenta de nuevo.";
  }
  if (mensaje.includes("new email should be different")) {
    return "El nuevo correo debe ser diferente al actual.";
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
    throw new Error(datos.error || datos.detalle || "No se pudo cargar el perfil.");
  }
  return datos.perfil;
}
