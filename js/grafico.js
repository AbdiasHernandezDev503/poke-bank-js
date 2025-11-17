export async function init() {
  console.log("✅ init grafico.js");

  const canvas = document.getElementById("graficoMovimientos");
  const lblCuenta = document.getElementById("lblNumeroCuenta");
  const lblDep = document.getElementById("lblTotalDepositos");
  const lblRet = document.getElementById("lblTotalRetiros");
  const lblServ = document.getElementById("lblTotalServicios");

  if (!canvas) {
    console.warn("grafico.js: no se encontró el canvas con id 'graficoMovimientos'");
    return;
  }

  // Leer sesión del usuario desde localStorage
  let usuarioLS = null;
  try {
    usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  } catch (e) {
    console.error("grafico.js: error parseando usuarioActivo", e);
  }

  if (!usuarioLS || !usuarioLS.cuenta) {
    console.warn("grafico.js: no hay usuarioActivo.cuenta, no se genera gráfico");
    return;
  }

  // Mostrar número de cuenta en el header
  if (lblCuenta) lblCuenta.textContent = usuarioLS.cuenta;

  // Toma transacciones desde el LS
  const trans = Array.isArray(usuarioLS.transacciones)
    ? usuarioLS.transacciones.slice()
    : [];

  const { totalDepositos, totalRetiros, totalServicios } =
    calcularTotalesPorTipo(trans);

  // Actualiza leyenda numérica
  if (lblDep) lblDep.textContent = formatMoney(totalDepositos);
  if (lblRet) lblRet.textContent = formatMoney(totalRetiros);
  if (lblServ) lblServ.textContent = formatMoney(totalServicios);

  //Dibuja gráfico
  crearGraficoMovimientos(canvas, {
    totalDepositos,
    totalRetiros,
    totalServicios,
  });
}

/**
 * Calcula los totales por tipo: depósitos, retiros, pagos de servicios
 * usando solo las transacciones de usuarioActivo.
 */
function calcularTotalesPorTipo(transacciones) {
  let totalDepositos = 0;
  let totalRetiros = 0;
  let totalServicios = 0;

  if (Array.isArray(transacciones) && transacciones.length > 0) {
    transacciones.forEach((tx) => {
      if (!tx) return;

      const tipo = (tx.tipo || "").toString().toLowerCase();
      const monto = Number(tx.monto || 0);
      if (!monto) return;

      // Entradas -> depósitos (incluimos transferencias recibidas)
      if (
        tipo.includes("depósito") ||
        tipo.includes("deposito") ||
        tipo === "transferencia-entrada"
      ) {
        totalDepositos += monto;

      // Retiros -> retiros + transferencias salientes
      } else if (
        tipo.includes("retiro") ||
        tipo === "transferencia-salida"
      ) {
        totalRetiros += monto;

      // Pagos de servicios
      } else if (
        tipo.includes("pago") ||
        tipo.includes("servicio")
      ) {
        totalServicios += monto;
      }
    });
  }

  return { totalDepositos, totalRetiros, totalServicios };
}

/**
 * Crea un gráfico Doughnut con Chart.js
 */
function crearGraficoMovimientos(canvas, totales) {
  if (typeof Chart === "undefined") {
    console.error(
      "grafico.js: Chart.js no está disponible. Asegúrate de incluir el script de Chart.js en grafico.html"
    );
    return;
  }

  const { totalDepositos, totalRetiros, totalServicios } = totales;

  const ctx = canvas.getContext("2d");

  // Si ya había un gráfico en ese canvas, lo destruimos para evitar errores
  if (canvas._graficoInstance) {
    canvas._graficoInstance.destroy();
  }

  const data = {
    labels: ["Depósitos", "Retiros", "Pago de servicios"],
    datasets: [
      {
        label: "Movimientos (USD)",
        data: [totalDepositos, totalRetiros, totalServicios],
        backgroundColor: [
          "rgba(59, 130, 246, 0.7)",  // azul depósitos
          "rgba(239, 68, 68, 0.7)",   // rojo retiros
          "rgba(245, 158, 11, 0.7)",  // amarillo servicios
        ],
        borderColor: [
          "rgba(37, 99, 235, 1)",
          "rgba(220, 38, 38, 1)",
          "rgba(217, 119, 6, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const valor = ctx.parsed || 0;
            return `${label}: ${formatMoney(valor)}`;
          },
        },
      },
    },
  };

  const chart = new Chart(ctx, {
    type: "doughnut",
    data,
    options,
  });

  canvas._graficoInstance = chart;
}

// Formato $x.xx
function formatMoney(num) {
  const n = Number(num) || 0;
  return "$" + n.toFixed(2);
}

// Si el usuario se actualiza en tiempo real, refrescamos el gráfico
window.addEventListener("usuario-updated", () => {
  init();
});
