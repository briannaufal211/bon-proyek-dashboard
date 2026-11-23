const el = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("id-ID");
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Jakarta" });
const statuses = {
  "Cocok": ["matched", "#208376"],
  "Beda nominal": ["variance", "#d18b46"],
  "Belum ada pembayaran": ["pending", "#7890b3"],
  "Periksa referensi": ["check-ref", "#bd685c"],
};
const pageSize = 10;
let snapshot = null;
let page = 0;
let reviewOnly = true;
let trendData = [];
let trendPoints = [];

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function drawCategories(target, entries, active) {
  const max = Math.max(0, ...entries.map(([, value]) => value));
  if (!entries.length) {
    target.replaceChildren(element("p", "Tidak ada tagihan pada periode ini."));
    return;
  }
  target.replaceChildren(...entries.map(([label, value]) => {
    const row = element("button", undefined, "bar-row");
    row.type = "button";
    row.setAttribute("aria-pressed", String(active === label));
    row.addEventListener("click", () => {
      el("category").value = active === label ? "" : label;
      resetPage();
    });
    const labels = element("span", undefined, "bar-label");
    labels.append(element("span", label), element("strong", money.format(value)));
    const track = element("span", undefined, "bar-track");
    track.setAttribute("aria-hidden", "true");
    const fill = element("span", undefined, "bar-fill");
    fill.style.width = `${max ? Math.max(value, 0) / max * 100 : 0}%`;
    track.append(fill);
    row.append(labels, track);
    return row;
  }));
}

function drawStatus(counts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const donut = element("div", undefined, "donut");
  const inner = element("div", undefined, "donut-inner");
  inner.append(element("strong", number.format(total)), element("small", "kasus"));
  donut.append(inner);
  const legend = element("ul", undefined, "legend");
  const slices = [];
  let start = 0;
  for (const [label, count] of Object.entries(counts)) {
    const color = statuses[label][1];
    const entry = element("li");
    const dot = element("span");
    dot.style.background = color;
    dot.setAttribute("aria-hidden", "true");
    entry.append(dot, element("span", label), element("strong", number.format(count)));
    legend.append(entry);
    if (count) {
      const end = start + count / total * 100;
      slices.push(`${color} ${start}% ${Math.min(end, 100)}%`);
      start = end;
    }
  }
  if (slices.length) donut.style.background = `conic-gradient(${slices.join(", ")})`;
  el("status-chart").replaceChildren(donut, legend);
}

function buildTrend(invoices) {
  const monthly = new Map();
  for (const invoice of invoices) {
    if (!invoice.date) continue;
    const month = invoice.date.slice(0, 7);
    monthly.set(month, (monthly.get(month) || 0) + Number(invoice.amount));
  }
  const keys = [...monthly.keys()].sort();
  if (!keys.length) return [];
  const index = (key) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5)) - 1;
  const span = index(keys.at(-1)) - index(keys[0]) + 1;
  if (span > 72) {
    const annual = new Map();
    for (const [month, total] of monthly) {
      const year = month.slice(0, 4);
      annual.set(year, (annual.get(year) || 0) + total);
    }
    return [...annual].sort().map(([key, value]) => ({ label: key, value, length: "tahun" }));
  }
  const formatter = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" });
  const first = index(keys[0]);
  return Array.from({ length: span }, (_, offset) => {
    const month = first + offset;
    const year = Math.floor(month / 12);
    const number = month % 12;
    const key = `${year}-${String(number + 1).padStart(2, "0")}`;
    return { label: formatter.format(new Date(Date.UTC(year, number, 1))), value: monthly.get(key) || 0, length: "bulan" };
  });
}

function drawTrend() {
  const canvas = el("trend");
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = "#53627d";
  const points = trendData;
  trendPoints = [];
  el("trend-tip").hidden = true;
  if (!points.length) {
    ctx.fillText("Tidak ada tagihan bertanggal pada pilihan ini.", 4, 22);
    canvas.setAttribute("aria-label", "Tidak ada tagihan bertanggal pada pilihan ini.");
    el("trend-caption").textContent = "Nominal tagihan per bulan";
    return;
  }
  const left = 54, right = width - 18, top = 10, bottom = height - 25;
  const peak = Math.max(0, ...points.map(({ value }) => value));
  const stepBase = 10 ** Math.floor(Math.log10(Math.max(peak / 4, 1)));
  const step = ([1, 2, 2.5, 5, 10].find((candidate) => candidate * stepBase >= peak / 4) || 10) * stepBase;
  const max = step * 4;
  const short = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
  el("trend-caption").textContent = `Nominal tagihan per ${points[0].length} · IDR`;
  for (let i = 0; i <= 4; i++) {
    const y = top + (bottom - top) * i / 4;
    ctx.beginPath();
    ctx.strokeStyle = "#e5eaf4";
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(short.format(max - step * i), left - 8, y + 4);
  }
  trendPoints = points.map((point, i) => ({
    ...point,
    x: points.length === 1 ? (left + right) / 2 : left + (right - left) * i / (points.length - 1),
    y: bottom - Math.max(0, point.value) / max * (bottom - top),
  }));
  const first = trendPoints[0], last = trendPoints.at(-1);
  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(first.x, bottom);
    for (const { x, y } of trendPoints) ctx.lineTo(x, y);
    ctx.lineTo(last.x, bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, "#536ac74a");
    gradient.addColorStop(1, "#536ac710");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const { x, y } of trendPoints.slice(1)) ctx.lineTo(x, y);
    ctx.strokeStyle = "#4058b5";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#4058b5";
    ctx.fillRect(first.x - 18, first.y, 36, bottom - first.y);
  }
  ctx.fillStyle = "#53627d";
  const intervals = Math.min(points.length - 1, Math.max(1, Math.floor((right - left) / 72)));
  for (let i = 0; i <= intervals; i++) {
    const point = trendPoints[intervals ? Math.round(i * (points.length - 1) / intervals) : 0];
    ctx.textAlign = intervals && i === intervals ? "right" : intervals && i === 0 ? "left" : "center";
    ctx.fillText(point.label, point.x, bottom + 18);
  }
  const highest = points.reduce((best, point) => point.value > best.value ? point : best);
  canvas.setAttribute("aria-label", `Tren tagihan per ${points[0].length}. Dari ${first.label} hingga ${last.label}. Tertinggi ${highest.label}, ${money.format(highest.value)}.`);
}

function drawRows(cases, invoiceById) {
  const term = el("search").value.trim().toLocaleLowerCase("id-ID");
  const filtered = cases.filter((entry) => {
    if (reviewOnly && entry.status === "Cocok") return false;
    const searchable = [...entry.invoiceIds, ...entry.missing, ...entry.paymentIds];
    for (const id of entry.invoiceIds) {
      const invoice = invoiceById.get(id);
      searchable.push(invoice.category, invoice.detail, invoice.project);
    }
    return !term || searchable.join(" ").toLocaleLowerCase("id-ID").includes(term);
  });
  page = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const start = page * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const rows = visible.map((entry) => {
    const row = element("tr");
    const reference = element("td", entry.invoiceIds.join(", ") || "—");
    if (entry.paymentIds.length) reference.append(element("small", entry.paymentIds.join(", ")));
    if (entry.missing.length) reference.append(element("small", `ID tidak ditemukan: ${entry.missing.join(", ")}`));
    const detail = element("td");
    for (const id of entry.invoiceIds) {
      const invoice = invoiceById.get(id);
      detail.append(element("div", invoice.detail || invoice.category));
    }
    const status = element("td");
    status.append(element("span", entry.status, `status-pill ${statuses[entry.status][0]}`));
    row.append(
      reference, detail,
      element("td", money.format(entry.billed), "amount-cell"),
      element("td", entry.paymentIds.length ? money.format(entry.paid) : "—", "amount-cell"),
      element("td", entry.variance === null ? "—" : money.format(entry.variance), "amount-cell"),
      status,
    );
    return row;
  });
  if (!rows.length) {
    const row = element("tr");
    const empty = element("td", "Tidak ada kasus yang sesuai.");
    empty.colSpan = 6;
    row.append(empty);
    rows.push(row);
  }
  el("case-rows").replaceChildren(...rows);
  el("page-label").textContent = filtered.length
    ? `${start + 1}–${start + visible.length} dari ${number.format(filtered.length)} kasus` : "0 kasus";
  el("previous").disabled = page === 0;
  el("next").disabled = start + pageSize >= filtered.length;
}

function render() {
  if (!snapshot) return;
  const project = el("project").value;
  const category = el("category").value;
  const from = el("from-date").value;
  const to = el("to-date").value;
  const constrained = Boolean(project || category || from || to);
  const inPeriod = snapshot.invoices.filter((item) =>
    (!project || item.project === project)
    && (!from || item.date >= from)
    && (!to || (item.date && item.date <= to)));
  const selected = category ? inPeriod.filter((item) => item.category === category) : inPeriod;
  const ids = new Set(selected.map(({ id }) => id));
  const invoiceById = new Map(snapshot.invoices.map((item) => [item.id, item]));
  const cases = snapshot.cases.filter((entry) => !constrained || entry.invoiceIds.some((id) => ids.has(id)));
  const whollySelected = cases.filter((entry) => !constrained || (!entry.missing.length && entry.invoiceIds.every((id) => ids.has(id))));
  const values = new Map();
  let total = 0;
  for (const invoice of selected) {
    const amount = Number(invoice.amount);
    total += amount;
  }
  for (const invoice of inPeriod) values.set(invoice.category, (values.get(invoice.category) || 0) + Number(invoice.amount));
  const counts = Object.fromEntries(Object.keys(statuses).map((status) => [status, 0]));
  for (const entry of cases) counts[entry.status]++;
  el("total-billed").textContent = money.format(total);
  el("invoice-count").textContent = `${number.format(selected.length)} tagihan`;
  el("total-paid").textContent = money.format(whollySelected.reduce((sum, entry) => sum + Number(entry.paid), 0));
  el("payment-note").textContent = cases.length > whollySelected.length
    ? "Pembayaran lintas filter hanya tampil di daftar"
    : el("dashboard").dataset.cloud === "true" ? "Berdasarkan Google Sheets Pembayaran" : "Berdasarkan catatan pada payments-uji.xlsx";
  el("review-count").textContent = number.format(counts["Beda nominal"] + counts["Periksa referensi"]);
  el("pending-count").textContent = number.format(counts["Belum ada pembayaran"]);
  drawCategories(el("category-chart"), [...values].sort((a, b) => b[1] - a[1]), category);
  drawStatus(counts);
  trendData = buildTrend(selected);
  drawTrend();
  drawRows(cases, invoiceById);
}

function updateOptions(field, initial) {
  const select = el(field);
  const current = select.value;
  const values = [...new Set(snapshot.invoices.map((invoice) => invoice[field]))].sort();
  const placeholder = element("option", initial);
  placeholder.value = "";
  const options = values.map((value) => {
    const option = element("option", value);
    option.value = value;
    return option;
  });
  select.replaceChildren(placeholder, ...options);
  if (values.includes(current)) select.value = current;
}

function connection(message) {
  const state = el("connection");
  state.dataset.state = message ? "stale" : "live";
  const cloud = el("dashboard").dataset.cloud === "true";
  state.textContent = message ? "Menunggu pembaruan" : cloud ? "Terhubung ke Google Sheets" : "Terhubung ke Excel";
  el("warning").hidden = !message;
  el("warning").textContent = message || "";
}

let pollTimer;
let polling = false;
async function poll() {
  window.clearTimeout(pollTimer);
  if (polling) return;
  polling = true;
  try {
    if (!window.bonDashboard.isUnlocked()) return;
    const data = await window.bonDashboard.read();
    if (!window.bonDashboard.isUnlocked()) return;
    if (data.revision !== snapshot?.revision) {
      snapshot = data;
      updateOptions("project", "Semua proyek");
      updateOptions("category", "Semua kategori");
      render();
    }
    el("updated").textContent = `Data diperiksa ${dateTime.format(new Date(data.checkedAt || data.updatedAt))} WIB`;
    connection(data.warning || null);
  } catch (error) {
    if (error.status === 401 || error.status === 429) window.bonDashboard.lock(error.message);
    else connection("Pembaruan belum tersedia. Menampilkan data terakhir yang berhasil dibaca.");
  } finally {
    polling = false;
    pollTimer = window.setTimeout(poll, window.BON_DASHBOARD_CONFIG.refreshMs);
  }
}
document.addEventListener("bon-dashboard-unlocked", poll);
document.addEventListener("bon-dashboard-locked", () => {
  snapshot = null;
  el("case-rows").replaceChildren();
  for (const id of ["total-billed", "total-paid", "review-count", "pending-count"]) el(id).textContent = "—";
});

function resetPage() {
  page = 0;
  render();
}
for (const id of ["project", "category", "from-date", "to-date"]) el(id).addEventListener("change", resetPage);
el("search").addEventListener("input", resetPage);
el("clear-filters").addEventListener("click", () => {
  for (const id of ["project", "category", "from-date", "to-date", "search"]) el(id).value = "";
  resetPage();
});
for (const [id, flag] of [["needs-review", true], ["all-cases", false]]) {
  el(id).addEventListener("click", () => {
    reviewOnly = flag;
    el("needs-review").setAttribute("aria-pressed", String(flag));
    el("all-cases").setAttribute("aria-pressed", String(!flag));
    resetPage();
  });
}
el("previous").addEventListener("click", () => { page--; render(); });
el("next").addEventListener("click", () => { page++; render(); });
new ResizeObserver(drawTrend).observe(el("trend").parentElement);
el("trend").addEventListener("pointermove", (event) => {
  if (!trendPoints.length) return;
  const x = event.clientX - el("trend").getBoundingClientRect().left;
  const point = trendPoints.reduce((closest, candidate) => Math.abs(candidate.x - x) < Math.abs(closest.x - x) ? candidate : closest);
  el("trend-tip").textContent = `${point.label} · ${money.format(point.value)}`;
  el("trend-tip").hidden = false;
});
el("trend").addEventListener("pointerleave", () => { el("trend-tip").hidden = true; });
poll();
