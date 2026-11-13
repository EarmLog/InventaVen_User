export function validarContrasena(clave) {
  if (typeof clave !== "string" || clave.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(clave)) {
    return "La contraseña debe incluir al menos una letra.";
  }
  if (!/[0-9]/.test(clave)) {
    return "La contraseña debe incluir al menos un número.";
  }
  if (/\s/.test(clave)) {
    return "La contraseña no puede contener espacios.";
  }
  return "";
}
