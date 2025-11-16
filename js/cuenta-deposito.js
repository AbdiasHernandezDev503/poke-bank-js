export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet } = window;

  const txtCuentaDestino = document.getElementById("txtCuentaDestino");
  const btnValidar = document.getElementById("btnValidarCuenta");

  if (!txtCuentaDestino || !btnValidar) {
    console.warn("No se encontraron controles en cuenta-deposito.html");
    return;
  }

  // Siempre verificando que el usuario este logueado
  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS || !usuarioLS.cuenta) {
    swal("Avertencia", "Sesión no válida. Inicie sesión nuevamente.", "warning")
      .then(() => (window.location.href = "../index.html"));
    return;
  }

  btnValidar.addEventListener("click", async (ev) => {
    ev.preventDefault();

    const cuentaDestino = (txtCuentaDestino.value || "").trim();
    if (!cuentaDestino) {
      swal("Advertencia", "Ingrese un número de cuenta destino.", "warning");
      return;
    }

    // Evitar depositar a la misma cuenta
    if (cuentaDestino === usuarioLS.cuenta) {
      swal("Advertencia", "No puede hacer un depósito de cuenta a cuenta a la misma cuenta.", "warning");
      return;
    }

    try {
      const snap = await FirebaseGet(FirebaseRef(FirebaseDB, "pokeBank/usuarios"));
      if (!snap.exists()) {
        swal("Error", "No hay usuarios registrados en la base de datos.", "error");
        return;
      }

      const data = snap.val();
      const usuarios = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {});
      const usuarioDestino = usuarios.find(u => u?.cuenta === cuentaDestino);

      if (!usuarioDestino) {
        swal("Error", "La cuenta destino no existe. Verifique el número.", "error");
        return;
      }

      // Guardamos info del destino para usarla en cantidad-deposito.html
      localStorage.setItem("depositoCuentaDestino", usuarioDestino.cuenta);
      localStorage.setItem("depositoNombreDestino", usuarioDestino.nombre);

      await swal(
        "Cuenta válida",
        `Depósito a ${usuarioDestino.nombre} (${usuarioDestino.cuenta})`,
        "success"
      );

      // Ir a la pantalla donde elige la cantidad a depositar
      window.location.href = "cantidad-deposito.html";

    } catch (err) {
      console.error("Error validando cuenta destino:", err);
      swal("Error", "No se pudo validar la cuenta destino. Intente de nuevo.", "error");
    }
  });
}
