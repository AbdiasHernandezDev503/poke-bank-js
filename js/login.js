export async function init() {
  const { FirebaseDB, FirebaseRef, FirebaseGet } = window;

  // Remover usuarioActivo de localstorage 
  // ya que al dirigir se entiende que esta iniciando sesion o cerro sesion
  localStorage.removeItem("usuarioActivo")

  // Obtenemos los elementos del DOM de la vista index.html
  const txtPin = document.getElementById("txtPin");
  const btnLogin = document.getElementById("btnLogin");

  // Al hacer clic en ingresar, evaluar que el usuario ya exista
  btnLogin.addEventListener("click", async () => {
    const pinIngresado = txtPin.value.trim();

    if (!pinIngresado) {
      swal("Advertencia", "Por favor ingrese su PIN", "warning");
      return;
    }

    try {
      const snapshot = await FirebaseGet(
        FirebaseRef(FirebaseDB, "pokeBank/usuarios")
      );
      if (!snapshot.exists()) {
        swal(
          "Advertencia",
          "No hay usuarios registrados en la base de datos.",
          "warning"
        );
        return;
      }

      const data = snapshot.val();
      const usuarios = Array.isArray(data)
        ? data.filter(Boolean)
        : Object.values(data || {});

      const usuarioEncontrado = usuarios.find((u) => u?.pin === pinIngresado);

      if (usuarioEncontrado) {
        // Eliminamos el pin antes de guardar
        const { pin, ...usuarioSinPin } = usuarioEncontrado;

        // Guardamos solo la sesión sin PIN
        localStorage.setItem("usuarioActivo", JSON.stringify(usuarioSinPin));

        await swal("Bienvenido", `${usuarioSinPin.nombre}`, "success");
        window.location.href = "./pages/inicio.html";
      } else {
        swal("Error", "PIN incorrecto. Intente nuevamente.", "error");
      }
    } catch (err) {
      swal(
        "Error",
        "Hubo un problema al conectar con la base de datos.",
        "error"
      );
    }
  });
}
