// /js/consulta-saldo.js
export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet } = window;

  const lblSaldo = document.getElementById("lblSaldoActual");
  const lblIngresos = document.getElementById("lblIngresosMes");
  const lblEgresos = document.getElementById("lblEgresosMes");
  const lblDisponible = document.getElementById("lblDisponible");
  const lblUltAct = document.getElementById("ultima-actualizacion");

  // 1) Leer sesión del usuario
  let usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");

  if (!usuarioLS || !usuarioLS.cuenta) {
    console.warn("consulta-saldo: no hay usuarioActivo, no se ejecuta.");
    return;
  }

  try {
    const snap = await FirebaseGet(
      FirebaseRef(FirebaseDB, "pokeBank/usuarios")
    );
    if (snap.exists()) {
      const data = snap.val();
      const usuarios = Array.isArray(data)
        ? data.filter(Boolean)
        : Object.values(data || {});

      const usuarioBD = usuarios.find((u) => u?.cuenta === usuarioLS.cuenta);

      if (usuarioBD) {
        const { pin, ...sinPin } = usuarioBD;
        localStorage.setItem("usuarioActivo", JSON.stringify(sinPin));
        usuarioLS = sinPin;
      }
    }
  } catch (err) {
    console.error("No se pudo refrescar usuario desde Firebase:", err);
    // Si falla, seguimos con lo que haya en LS
  }

  // Cargar saldo actual
  const saldoActual = Number(usuarioLS.saldo || 0);

  if (lblSaldo) lblSaldo.textContent = formatMoney(saldoActual);
  if (lblDisponible) lblDisponible.textContent = formatMoney(saldoActual);

  // Tomar transacciones desde el LS
  const trans = Array.isArray(usuarioLS.transacciones)
    ? usuarioLS.transacciones.slice()
    : [];

  // Si no hay transacciones setear todo en 0
  if (!trans.length) {
    if (lblIngresos) lblIngresos.textContent = formatMoney(0);
    if (lblEgresos) lblEgresos.textContent = formatMoney(0);

    if (lblUltAct)
      lblUltAct.textContent = "Última actualización: No hay movimientos";

    return;
  }

  // Obtener mes y año actual
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  let totalIngresos = 0;
  let totalEgresos = 0;
  let ultimaFecha = null;

  trans.forEach((tx) => {
    const tipo = (tx.tipo || "").toLowerCase();
    const monto = Number(tx.monto || 0);
    const fecha = tx.fechaISO ? new Date(tx.fechaISO) : null;

    if (!fecha || isNaN(fecha)) return;

    // ---- Determinar última transacción REAL ----
    if (!ultimaFecha || fecha > ultimaFecha) {
      ultimaFecha = fecha;
    }

    // ---- Filtrado mensual ----
    const esMismoMes =
      fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    if (!esMismoMes) return;

    // ---- Entradas ----
    const esEntrada =
      tipo.includes("entrada") ||
      tipo.includes("depósito") ||
      tipo.includes("deposito");

    // ---- Salidas ----
    const esSalida =
      tipo.includes("salida") ||
      tipo.includes("retiro") ||
      tipo.includes("pago");

    if (esEntrada) totalIngresos += monto;
    else if (esSalida) totalEgresos += monto;
  });

  // Pintar totales
  if (lblIngresos) lblIngresos.textContent = formatMoney(totalIngresos);
  if (lblEgresos) lblEgresos.textContent = formatMoney(totalEgresos);

  // Pintar fecha REAL de última actualización
  if (lblUltAct && ultimaFecha) {
    lblUltAct.textContent = buildUltimaActText(ultimaFecha);
  }
}

// Formato $x.xx
function formatMoney(num) {
  const n = Number(num) || 0;
  return "$" + n.toFixed(2);
}

// Fecha de Ultima actualizacion todo lo toma desde la ultima transaccion sea de entrada o salida
function buildUltimaActText(date) {
  const f = date.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const h = date.toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Última actualización: ${f}, ${h}`;
}

window.addEventListener("usuario-updated", () => {
  init(); 
});

