export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseRunTx } = window;

  const txtMonto = document.getElementById("txtMontoDeposito");
  const btnDepositar = document.getElementById("btnDepositar");

  if (!txtMonto || !btnDepositar) {
    console.warn("No se encontraron controles en cantidad-deposito.html");
    return;
  }

  // Usuario origen osea el que envia la transaccion
  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS || !usuarioLS.cuenta) {
    swal("Advertencia", "Sesión no válida. Inicie sesión nuevamente.", "warning")
      .then(() => (window.location.href = "../index.html"));
    return;
  }

  // Cuenta destino la que se guardo en el localstorage
  const cuentaDestino = localStorage.getItem("depositoCuentaDestino");
  const nombreDestino = localStorage.getItem("depositoNombreDestino") || "";
  if (!cuentaDestino) {
    swal("Advertencia", "No se ha seleccionado una cuenta destino.", "warning")
      .then(() => (window.location.href = "./cuenta-deposito.html"));
    return;
  }

  btnDepositar.addEventListener("click", async (ev) => {
    ev.preventDefault();

    const raw = (txtMonto.value || "").trim();
    const monto = Number(raw);

    if (!raw || !Number.isFinite(monto) || monto <= 0) {
      swal("Advertencia", "Ingrese un monto válido mayor que 0.", "warning");
      return;
    }

     // ✅ CONFIRMACIÓN ANTES DE HACER LA TRANSACCIÓN
    const confirmado = await swal({
      title: "Confirmar operación",
      text: `¿Está seguro que desea enviar $${monto.toFixed(2)} a la cuenta ${cuentaDestino} que pertenece a ${nombreDestino || "este usuario"}?`,
      icon: "warning",
      buttons: ["Cancelar", "Sí, confirmar"],
      dangerMode: true,
    });

    if (!confirmado) {
      // El usuario canceló, no hacemos nada
      return;
    }

    try {
      const usuariosRef = FirebaseRef(FirebaseDB, "pokeBank/usuarios");

      const result = await FirebaseRunTx(
        usuariosRef,
        (usuarios) => {
          if (!usuarios || !Array.isArray(usuarios)) return usuarios;

          const copia = usuarios.slice();

          const idxOrigen = copia.findIndex(
            (u) => u && u.cuenta === usuarioLS.cuenta
          );
          const idxDestino = copia.findIndex(
            (u) => u && u.cuenta === cuentaDestino
          );

          if (idxOrigen < 0 || idxDestino < 0) {
            // cuenta no existe
            return usuarios;
          }

          if (idxOrigen === idxDestino) {
            // evitar transferencias a sí mismo
            return usuarios;
          }

          const origen = copia[idxOrigen];
          const destino = copia[idxDestino];

          const saldoOrigen = Number(origen.saldo || 0);
          if (!Number.isFinite(saldoOrigen) || saldoOrigen < monto) {
            // saldo insuficiente, se procede a abortar la transaccion
            return;
          }

          const nuevoSaldoOrigen = +(saldoOrigen - monto).toFixed(2);
          const saldoDestino = Number(destino.saldo || 0);
          const nuevoSaldoDestino = +(saldoDestino + monto).toFixed(2);

          // Transacciones origen
          const transOrigen = Array.isArray(origen.transacciones)
            ? origen.transacciones.slice()
            : [];

          transOrigen.push({
            id: Date.now(),
            tipo: "transferencia-salida",
            monto,
            fechaISO: new Date().toISOString(),
            cuentaDestino,
            detalle: `Transferencia a ${cuentaDestino}`,
          });

          // Transacciones destino
          const transDestino = Array.isArray(destino.transacciones)
            ? destino.transacciones.slice()
            : [];

          transDestino.push({
            id: Date.now() + 1, // para que no choquen
            tipo: "transferencia-entrada",
            monto,
            fechaISO: new Date().toISOString(),
            cuentaOrigen: usuarioLS.cuenta,
            detalle: `Transferencia recibida de ${usuarioLS.cuenta}`,
          });

          // Actualizar ambos usuarios
          copia[idxOrigen] = {
            ...origen,
            saldo: nuevoSaldoOrigen,
            transacciones: transOrigen,
          };

          copia[idxDestino] = {
            ...destino,
            saldo: nuevoSaldoDestino,
            transacciones: transDestino,
          };

          return copia;
        },
        { applyLocally: false }
      );

      // Si NO se aplicó la transacción (saldo insuficiente u otro problema de lógica)
      if (!result.committed) {
        swal(
          "Saldo insuficiente",
          "No se pudo realizar la transferencia. Verifique su saldo.",
          "warning"
        );
        return;
      }

      // actualizar usuarioActivo en localStorage con el nuevo saldo
      const usuariosFinales = result.snapshot.val();
      if (Array.isArray(usuariosFinales)) {
        const usuarioActualizado = usuariosFinales.find(
          (u) => u && u.cuenta === usuarioLS.cuenta
        );
        if (usuarioActualizado) {
          const { pin, ...sinPin } = usuarioActualizado;
          localStorage.setItem("usuarioActivo", JSON.stringify(sinPin));
        }
      }

      swal(
        "Transferencia realizada",
        `Se transfirieron $${monto.toFixed(2)} a ${nombreDestino || cuentaDestino}.`,
        "success"
      ).then(() => {
        // Guardar datos del comprobante en el LS
        localStorage.setItem("compRef", String(Date.now()));
        localStorage.setItem("compCuentaDestino", cuentaDestino);
        localStorage.setItem("compNombreDestino", nombreDestino || "");
        localStorage.setItem("compMonto", monto.toFixed(2));
        localStorage.setItem("compTipo", "transferencia");

        window.location.href = "./transaccion-deposito-completa.html";
      });

    } catch (err) {
      console.error("Error en transferencia:", err);
      swal("Error", "No se pudo completar la transferencia. Intente nuevamente mas tarde.", "error");
    }
  });
}
