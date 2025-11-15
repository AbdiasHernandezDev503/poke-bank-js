export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet } = window;

  const tbody = document.getElementById('tbodyHistorial');
  const lblCuenta = document.getElementById('lblCuenta');

  const usuarioLS = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
  if (!usuarioLS || !usuarioLS.cuenta) {
    swal("Advertencia", "Sesión no válida. Inicie sesión nuevamente.", "warning")
      .then(() => (window.location.href = "../index.html"));
    return;
  }

  if (lblCuenta) {
    lblCuenta.textContent = usuarioLS.cuenta;
  }

  try {
    // Obtener todos los usuarios
    const snap = await FirebaseGet(FirebaseRef(FirebaseDB, "pokeBank/usuarios"));
    if (!snap.exists()) {
      pintarFilaVacia(tbody, "No hay transacciones registradas.");
      return;
    }

    const data = snap.val();
    const usuarios = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {});
    const usuario = usuarios.find(u => u?.cuenta === usuarioLS.cuenta);

    if (!usuario) {
      pintarFilaVacia(tbody, "Usuario no encontrado. Inicie sesión nuevamente.");
      return;
    }

    // Tomar transacciones, en caso que no haya alguna, seteamos lista vacía
    const trans = Array.isArray(usuario.transacciones)
      ? usuario.transacciones.slice()
      : [];

    if (!trans.length) {
      pintarFilaVacia(tbody, "No hay transacciones todavía.");
      return;
    }

    // Ordenar por fecha DESC osea las mas recientes primero
    trans.sort((a, b) => {
      const da = new Date(a.fechaISO || 0).getTime();
      const db = new Date(b.fechaISO || 0).getTime();
      return db - da;
    });

    tbody.innerHTML = "";
    trans.forEach(tx => {
      const tr = document.createElement('tr');
      tr.className = "border-b last:border-b-0";

      const fecha = formatFecha(tx.fechaISO);
      const tipo = tx.tipo || "N/A";
      const detalle = tx.detalle || "Descripción";
      const monto = Number(tx.monto || 0);

      const isDeposito = tipo.toLowerCase().includes("dep");
      const sign = isDeposito ? "+ " : "- ";
      const colorMonto = isDeposito ? "text-green-600" : "text-red-500";

      tr.innerHTML = `
        <td class="py-3 px-6 whitespace-nowrap">${fecha}</td>
        <td class="py-3 px-6">${capitalizar(tipo)}</td>
        <td class="py-3 px-6">${detalle}</td>
        <td class="py-3 px-6 text-right font-semibold ${colorMonto}">
          ${sign} $${monto.toFixed(2)}
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error cargando historial:", err);
    pintarFilaVacia(tbody, "No se pudo cargar el historial.");
  }
}

function pintarFilaVacia(tbody, mensaje) {
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="py-4 px-6 text-center text-gray-500">
        ${mensaje}
      </td>
    </tr>
  `;
}

function formatFecha(fechaISO) {
  if (!fechaISO) return "-";
  const d = new Date(fechaISO);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function capitalizar(txt = "") {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
