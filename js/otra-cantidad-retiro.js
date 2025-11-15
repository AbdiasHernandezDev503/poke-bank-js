export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet, FirebaseRunTx } = window;

  // 1) Sesión
  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null")
  if (!usuarioLS || !usuarioLS.cuenta) {
    swal("Advertencia", "Sesión no válida. Inicie sesión nuevamente.", "warning")
      .then(() => (window.location.href = "../index.html"))
    return;
  }

  // 2) Elementos de la vista
  const txtMonto = document.getElementById("txtMonto")
  const btnRetirar = document.getElementById("btnRetirarOtro")

  btnRetirar.addEventListener("click", async (ev) => {
    ev.preventDefault();

    // Leer y validar el monto
    const raw = (txtMonto.value || "").trim();
    const monto = Number(raw);

    if (!raw || !Number.isFinite(monto) || monto <= 0) {
      swal("Advertencia", "Ingrese una cantidad válida mayor que 0.", "warning");
      return;
    }

    try {
      // 3) Obtener usuarios para ubicar índice
      const snap = await FirebaseGet(FirebaseRef(FirebaseDB, "pokeBank/usuarios"));
      if (!snap.exists()) {
        swal("Error", "No se encontraron usuarios en la base.", "error");
        return;
      }

      const data = snap.val();
      const usuarios = Array.isArray(data) ? data.slice() : Object.values(data || {});
      const idx = usuarios.findIndex(u => u?.cuenta === usuarioLS.cuenta);

      if (idx < 0) {
        swal("Advertencia", "Usuario no encontrado. Inicie sesión nuevamente.", "warning");
        localStorage.removeItem("usuarioActivo");
        window.location.href = "../index.html";
        return;
      }

      const userRef = FirebaseRef(FirebaseDB, `pokeBank/usuarios/${idx}`);

      const result = await FirebaseRunTx(
        userRef,
        (user) => {
          if (!user) return user;

          const saldoActual = Number(user.saldo || 0);
          if (!Number.isFinite(saldoActual)) return user;

          if (saldoActual < monto) return;

          const nuevoSaldo = +(saldoActual - monto).toFixed(2);

          const lista = Array.isArray(user.transacciones)
            ? user.transacciones.slice()
            : [];

          lista.push({
            id: Date.now(),
            tipo: "retiro",
            monto,
            fechaISO: new Date().toISOString(),
            canal: "cajero",
          });

          return {
            ...user,
            saldo: nuevoSaldo,
            transacciones: lista,
          };
        },
        { applyLocally: false }
      );

      if (!result.committed) {
        swal("Saldo insuficiente", "No se pudo realizar el retiro.", "warning");
        return;
      }

      swal("Retiro exitoso", `Se retiraron $${monto}.`, "success")
        .then(() => (window.location.href = "transaccion-completa.html"));

    } catch (err) {
      console.error("Error en retiro (otra cantidad):", err);
      swal("Error", "No se pudo completar el retiro. Intente nuevamente.", "error");
    }
  });
}
