// Cargar SweetAlert
(() => {
  if (window.__sweetalert_loading) return; // evita doble carga
  window.__sweetalert_loading = true;

  window.SwalReady = new Promise((resolve, reject) => {
    if (window.swal) { resolve(window.swal); return; }

    const s = document.createElement('script');
    s.src = 'https://unpkg.com/sweetalert/dist/sweetalert.min.js';
    s.async = true;
    s.onload = () => {
      console.log('SweetAlert cargado');
      resolve(window.swal);
    };
    s.onerror = () => {
      console.error('No se pudo cargar SweetAlert');
      reject(new Error('CDN fallo'));
    };
    document.head.appendChild(s);
  });

  window.ensureSwal = (cb) => {
    window.SwalReady.then(() => cb && cb());
  };
})();
