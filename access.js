(() => {
  let code = '';
  let firstSnapshot = null;
  const gate = document.getElementById('access-gate');
  const report = document.getElementById('dashboard');
  const form = document.getElementById('access-form');
  const input = document.getElementById('access-code');
  const message = document.getElementById('access-message');
  const submit = document.getElementById('access-submit');
  const logout = document.getElementById('logout');
  async function fetchReport(credential) {
    const response = await fetch(window.BON_DASHBOARD_CONFIG.endpoint, {
      method: 'GET', cache: 'no-store', credentials: 'omit',
      headers: {'x-dashboard-code': credential}, signal: AbortSignal.timeout(25000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Laporan belum bisa dibuka. Silakan coba kembali.');
      error.status = response.status;
      throw error;
    }
    if (!data.revision || !Array.isArray(data.invoices) || !Array.isArray(data.cases)) throw new Error('Data laporan belum tersedia.');
    return data;
  }
  function lock(text = '') {
    code = '';
    firstSnapshot = null;
    report.hidden = true;
    gate.hidden = false;
    logout.hidden = true;
    message.textContent = text;
    input.value = '';
    document.dispatchEvent(new Event('bon-dashboard-locked'));
  }
  window.bonDashboard = Object.freeze({
    isUnlocked: () => !!code,
    lock,
    read: async () => {
      if (firstSnapshot) {const result = firstSnapshot; firstSnapshot = null; return result;}
      return fetchReport(code);
    },
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!input.value.trim()) {message.textContent = 'Masukkan kode akses yang diberikan pengelola.'; return;}
    submit.disabled = true;
    submit.textContent = 'Membuka laporan…';
    message.textContent = '';
    try {
      const proposed = input.value.trim();
      const result = await fetchReport(proposed);
      code = proposed;
      input.value = '';
      firstSnapshot = result;
      report.hidden = false;
      gate.hidden = true;
      logout.hidden = false;
      document.dispatchEvent(new Event('bon-dashboard-unlocked'));
    } catch (error) {
      message.textContent = error.message === 'Failed to fetch'
        ? 'Koneksi laporan belum tersedia. Hubungi pengelola atau coba kembali.' : error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Buka dashboard';
    }
  });
  logout.addEventListener('click', () => lock());
})();
