export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet } = window;
  const lblNombre = document.getElementById("lblNombre");
  const lblCuenta = document.getElementById("lblCuenta");

  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS) {
    window.location.href = "../index.html";
    return;
  }

  lblNombre && (lblNombre.textContent = `${usuarioLS.nombre} (cargando…)`);
  lblCuenta && (lblCuenta.textContent = usuarioLS.cuenta);

  try {
    const snap = await FirebaseGet(
      FirebaseRef(FirebaseDB, "pokeBank/usuarios")
    );
    if (!snap.exists()) 
      return;

    const data = snap.val();
    const usuarios = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data || {});
    const usuario = usuarios.find((u) => u?.cuenta === usuarioLS.cuenta);

    if (!usuario) {
      localStorage.clear();
      window.location.href = "../index.html";
      return;
    }
    
    lblNombre && (lblNombre.textContent = usuario.nombre);
    lblCuenta && (lblCuenta.textContent = usuario.cuenta);
    const { pin, ...sinPin } = usuario;
    localStorage.setItem("usuarioActivo", JSON.stringify(sinPin));
  } catch (e) {
    console.error(e);
  }
}
