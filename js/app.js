(async () => {
  // Cargamos SweetAlert
  await import("/js/swal-loader.js");

  // Cargaamos Firebase
  await import("/js/firebase-loader.js");
  iniciarWatcherTiempoReal();

  const page = document.body.dataset.page || "default";

  // Tabla de rutas → import dinámico
  const dyn = (rel) => import(new URL(rel, import.meta.url).href);

  const routes = {
    login: () => dyn("../js/login.js"),
    inicio: () => dyn("../js/inicio.js"),
    "cantidad-retiro": () => dyn("../js/cantidad-retiro.js"),
    "otra-cantidad-retiro": () => dyn("../js/otra-cantidad-retiro.js"),
    historial: () => dyn("../js/historial.js"),
    "cuenta-deposito": () => dyn("../js/cuenta-deposito.js"),
    "cantidad-deposito": () => dyn("../js/cantidad-deposito.js"),
    "transaccion-deposito-completa": () =>
      dyn("../js/transaccion-deposito-completa.js"),
    "consulta-saldo": () => dyn("./consulta-saldo.js"),
  };

  try {
    const loader = routes[page];
    if (!loader) {
      console.warn(`No hay módulo para page="${page}".`);
      return;
    }

    const mod = await loader();
    if (typeof mod.init === "function") {
      await mod.init();
    } else {
      console.warn(`El módulo "${page}" no exporta init().`);
    }
  } catch (err) {
    console.error("Error cargando módulo de página:", err);
    swal("Error", "No se pudo cargar la página.", "error");
  }
})();

function iniciarWatcherTiempoReal() {
  const {
    FirebaseDB,
    FirebaseRef,
    FirebaseGet,
    FirebaseChild,
    FirebaseOnValue,
  } = window;

  // Verificar si FirebaseOnValue está disponible
  if (!FirebaseOnValue) {
    console.warn("onValue no está disponible desde firebase-loader.js");
    return;
  }

  // Leer el localstorage para saber la cuenta del usuario
  const usuarioLS = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
  if (!usuarioLS || !usuarioLS.cuenta) return;

  // Necesitamos refrescar el usuario
  FirebaseGet(FirebaseRef(FirebaseDB, "pokeBank/usuarios")).then((snap) => {
    if (!snap.exists()) return;

    const data = snap.val();
    const usuarios = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data || {});

    const idx = usuarios.findIndex((u) => u?.cuenta === usuarioLS.cuenta);
    if (idx < 0) return;

    // Listener en tiempo REAL para EL USUARIO directo
    const userRef = FirebaseRef(FirebaseDB, `pokeBank/usuarios/${idx}`);

    FirebaseOnValue(userRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();

      // Eliminar pin antes de guardar
      const { pin, ...sinPin } = data;
      localStorage.setItem("usuarioActivo", JSON.stringify(sinPin));
      window.dispatchEvent(new Event("usuario-updated"));

      console.log("usuarioActivo actualizado en tiempo real:", sinPin);
    });
  });
}
