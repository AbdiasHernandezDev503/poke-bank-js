export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet, FirebaseRunTx } = window;

  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS || !usuarioLS.cuenta) {
    swal("⚠️", "Sesión no válida. Inicie sesión nuevamente.", "warning")
      .then(() => (window.location.href = "../index.html"));
    return;
  }

  const anchors = [...document.querySelectorAll("a")]
    .filter(a => /^\$\d+$/i.test(a.textContent.trim())); // $10, $20, $30, $100, $200

  anchors.forEach(a => {
    a.addEventListener("click", async (ev) => {
      ev.preventDefault();

      const raw = a.textContent.trim().replace("$", "");
      const monto = Number(raw);
      if (!Number.isFinite(monto) || monto <= 0) {
        swal("Advertencia", "Monto inválido.", "warning");
        return;
      }

      try {
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

        // ⚠️ IMPORTANTE: revisar 'committed'
        const result = await FirebaseRunTx(
          userRef,
          (user) => {
            if (!user) return user; // no cambia nada

            const saldoActual = Number(user.saldo || 0);
            if (!Number.isFinite(saldoActual)) return user; // no cambiar

            // Si no alcanza, abortamos devolviendo 'undefined' → committed:false
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
              canal: "cajero"
            });

            // DEVOLVER el objeto actualizado para que se escriba
            return {
              ...user,
              saldo: nuevoSaldo,
              transacciones: lista
            };
          },
          { applyLocally: false }
        );

        // 👉 Si la transacción NO se comprometió, no se descontó nada
        if (!result.committed) {
          swal("⚠️ Saldo insuficiente", "No se pudo realizar el retiro.", "warning");
          return;
        }

        // Éxito real: la BD sí cambió
        swal("Retiro exitoso", `Se retiraron $${monto}.`, "success")
          .then(() => (window.location.href = "transaccion-completa.html"));

      } catch (err) {
        console.error("Error en retiro:", err);
        swal("Error", "No se pudo completar el retiro. Intente nuevamente.", "error");
      }
    });
  });
}
