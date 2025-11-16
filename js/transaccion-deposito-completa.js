export async function init() {

  const ref = document.getElementById("lblRef");
  const cuenta = document.getElementById("lblCuentaDestino");
  const monto = document.getElementById("lblMonto");

  // Leer datos del comprobante desde el LS
  const refNum = localStorage.getItem("compRef") || "";
  const cuentaDestino = localStorage.getItem("compCuentaDestino") || "";
  const cantidad = localStorage.getItem("compMonto") || "0.00";
  console.log(refNum)

  // Pintar datos
  if (ref) ref.textContent = refNum;
  if (cuenta) cuenta.textContent = cuentaDestino;
  if (monto) monto.textContent = `$ ${cantidad}`;

  const btnRetorno = document.getElementById("btnRetorno")
  btnRetorno.addEventListener('click', () => {
    // limpiamos comprobante después
   localStorage.removeItem("compRef")
   localStorage.removeItem("compCuentaDestino")
   localStorage.removeItem("compMonto")
   localStorage.removeItem("compNombreDestino")
   localStorage.removeItem("compTipo")
   localStorage.removeItem("depositoCuentaDestino")
   localStorage.removeItem("depositoNombreDestino")
  })

  
}
