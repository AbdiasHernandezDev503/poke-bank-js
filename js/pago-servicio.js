export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet, FirebaseRunTx } = window;

  const selServicio = document.getElementById("selServicio");
  const selProveedor = document.getElementById("selProveedor");
  const txtReferencia = document.getElementById("txtReferencia");
  const txtMonto = document.getElementById("txtMontoServicio");
  const txtCuentaOrigen = document.getElementById("txtCuentaOrigen");
  const btnPagar = document.getElementById("btnPagarServicio");

  if (!btnPagar) return;

  // Leer sesión
  let usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS || !usuarioLS.cuenta) {
    if (typeof swal === "function") {
      swal("Sesión inválida", "Inicie sesión nuevamente.", "warning").then(
        () => (window.location.href = "../index.html")
      );
    }
    return;
  }

  // Autocompletar cuenta de origen con la cuenta del usuario
  if (txtCuentaOrigen) {
    txtCuentaOrigen.value = usuarioLS.cuenta;
    txtCuentaOrigen.readOnly = true;
  }

  btnPagar.addEventListener("click", async () => {
    const servicio = selServicio?.value || "";
    const proveedor = selProveedor?.value || "";
    const referencia = (txtReferencia?.value || "").trim();
    const montoNum = Number(txtMonto?.value || 0);
    const cuentaOrig = (txtCuentaOrigen?.value || "").trim();

    // Validaciones básicas
    if (!servicio) {
      swal("Advertencia", "Seleccione el servicio a pagar.", "warning");
      return;
    }

    if (!proveedor) {
      swal("Advertencia", "Seleccione el proveedor.", "warning");
      return;
    }

    if (!referencia) {
      swal(
        "Advertencia",
        "Ingrese el número de referencia o NIC del servicio.",
        "warning"
      );
      return;
    }

    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      swal("Advertencia", "Ingrese un monto válido mayor a 0.", "warning");
      return;
    }

    if (cuentaOrig !== usuarioLS.cuenta) {
      swal(
        "Advertencia",
        "La cuenta de origen no coincide con la de su sesión.",
        "warning"
      );
      return;
    }

    const saldoActualLS = Number(usuarioLS.saldo || 0);
    if (montoNum > saldoActualLS) {
      swal(
        "Saldo insuficiente",
        "El monto a pagar es mayor que su saldo disponible.",
        "error"
      );
      return;
    }

    // Confirmación previa
    const confirmado = await swal({
      title: "Confirmar pago",
      text: `¿Desea pagar $${montoNum.toFixed(
        2
      )} en ${servicio} con ${proveedor}?`,
      icon: "warning",
      buttons: ["Cancelar", "Sí, pagar"],
      dangerMode: true,
    });

    if (!confirmado) return;

    try {
      // Buscar índice del usuario en la lista de usuarios
      const snap = await FirebaseGet(
        FirebaseRef(FirebaseDB, "pokeBank/usuarios")
      );
      if (!snap.exists()) {
        swal(
          "Error",
          "No se encontraron usuarios en la base de datos.",
          "error"
        );
        return;
      }

      const data = snap.val();
      const usuarios = Array.isArray(data)
        ? data.filter(Boolean)
        : Object.values(data || {});

      const idx = usuarios.findIndex((u) => u?.cuenta === usuarioLS.cuenta);
      if (idx < 0) {
        swal(
          "Error",
          "Usuario no encontrado. Inicie sesión nuevamente.",
          "error"
        );
        return;
      }

      const userRef = FirebaseRef(FirebaseDB, `pokeBank/usuarios/${idx}`);

      // Transacción atómica: descontar saldo y registrar movimiento
      await FirebaseRunTx(
        userRef,
        (user) => {
          if (!user) return;

          const saldoActual = Number(user.saldo || 0);
          if (!Number.isFinite(saldoActual) || saldoActual < montoNum) {
            // Si aquí también no alcanza, cancelamos sin cambios
            return;
          }

          const nuevoSaldo = +(saldoActual - montoNum).toFixed(2);

          const lista = Array.isArray(user.transacciones)
            ? user.transacciones.slice()
            : [];

          lista.push({
            id: Date.now(),
            tipo: "pago-servicio",
            servicio,
            proveedor,
            referencia,
            monto: montoNum,
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

      const payload = {
        servicio,
        proveedor,
        referencia,
        cuentaOrigen: cuentaOrig,
        monto: montoNum,
      };

      localStorage.setItem("ultimoPagoServicio", JSON.stringify(payload));

      // Éxito
      swal(
        "Pago exitoso",
        `Se ha pagado $${montoNum.toFixed(2)} en ${servicio} (${proveedor}).`,
        "success"
      ).then(() => {
        window.location.href = "pago-servicios-completo.html";
      });
    } catch (err) {
      console.error("Error realizando pago de servicio:", err);
      swal(
        "Error",
        "No se pudo completar el pago. Intente nuevamente.",
        "error"
      );
    }
  });
}
