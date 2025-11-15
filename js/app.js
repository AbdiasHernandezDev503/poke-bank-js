(async () => {
  // Cargamos SweetAlert
  await import("/js/swal-loader.js");

  // Cargaamos Firebase
  await import("/js/firebase-loader.js");

  const page = document.body.dataset.page || 'default';

  // Tabla de rutas → import dinámico
  const dyn = (rel) => import(new URL(rel, import.meta.url).href);

  const routes = {
    login:        () => dyn('../js/login.js'),
    inicio:       () => dyn('../js/inicio.js'),
    'cantidad-retiro': () => dyn('../js/cantidad-retiro.js'),
    'otra-cantidad-retiro':   () => dyn('../js/otra-cantidad-retiro.js'),
    historial:        () => dyn('../js/historial.js'),
  };

  try {
    const loader = routes[page];
    if (!loader) {
      console.warn(`No hay módulo para page="${page}".`);
      return;
    }

    const mod = await loader();
    if (typeof mod.init === 'function') {
      await mod.init();
    } else {
      console.warn(`El módulo "${page}" no exporta init().`);
    }
  } catch (err) {
    console.error('Error cargando módulo de página:', err);
    swal('Error', 'No se pudo cargar la página.', 'error');
  }
})();
