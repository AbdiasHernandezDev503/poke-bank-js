export async function init() {
  const lblServicio     = document.getElementById("lblServicio");
  const lblProveedor    = document.getElementById("lblProveedor");
  const lblReferencia   = document.getElementById("lblReferencia");
  const lblCuentaOrigen = document.getElementById("lblCuentaOrigen");
  const lblMonto        = document.getElementById("lblMonto");
  const btnRetorno      = document.getElementById("btnRetorno")

  let payload = null;

  try {
    payload = JSON.parse(localStorage.getItem("ultimoPagoServicio") || "null");
  } catch {
    payload = null;
  }

  if (!payload) {
    console.warn("No hay datos de último pago de servicio en LS.");
    return;
  }

  const { servicio, proveedor, referencia, cuentaOrigen, monto } = payload;

  if (lblServicio && servicio)     lblServicio.textContent = servicio;
  if (lblProveedor && proveedor)   lblProveedor.textContent = proveedor;
  if (lblReferencia && referencia) lblReferencia.textContent = referencia;
  if (lblCuentaOrigen && cuentaOrigen) lblCuentaOrigen.textContent = cuentaOrigen;
  if (lblMonto && Number.isFinite(Number(monto))) {
    lblMonto.textContent = `$ ${Number(monto).toFixed(2)}`;
  }

  btnRetorno.addEventListener('click', () => {
    localStorage.removeItem("ultimoPagoServicio")
  })
}
