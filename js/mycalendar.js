/* =====================================================================
 * Lịch của tôi: hiển thị các đặt chỗ (tour, khách sạn, xe, máy bay, tàu, xe khách)
 * của tài khoản đang đăng nhập. Dữ liệu do js/bookings.js quản lý:
 *   - có chạy `node server.js`  -> lưu ra file data/bookings.json
 *   - không có máy chủ           -> lưu trong trình duyệt (localStorage)
 * tour.json chỉ dùng để lấy lịch trình chi tiết + ảnh cho các đặt chỗ tour.
 * ===================================================================== */
const TOUR_JSON_URL = "../../../data/tour.json";
// Ảnh trong tour.json ghi theo trang tour ("../../assets/..."); trang lịch nằm sâu hơn 1 cấp nên thêm "../"
const TOUR_IMAGE_PREFIX = "../";
// Ảnh trong đặt chỗ ghi từ gốc dự án ("assets/...")
const ASSET_PREFIX = "../../../";

const TYPE_META = {
  tour:   { label: "Tour",            icon: "fa-ticket",     info: "Thông tin tour" },
  ai_plan:{ label: "Tour cá nhân hóa", icon: "fa-wand-magic-sparkles", info: "Thông tin kế hoạch AI" },
  hotel:  { label: "Khách sạn",       icon: "fa-hotel",      info: "Chi tiết đặt phòng" },
  car:    { label: "Thuê xe",         icon: "fa-car",        info: "Chi tiết thuê xe" },
  flight: { label: "Máy bay",         icon: "fa-plane",      info: "Chi tiết chuyến bay" },
  train:  { label: "Tàu hỏa",         icon: "fa-train",      info: "Chi tiết chuyến tàu" },
  bus:    { label: "Xe khách / Limo", icon: "fa-van-shuttle", info: "Chi tiết chuyến xe" }
};

let TRIPS = [];
let TOURS = null;           // { id: tour } từ tour.json (tải một lần)
let currentFilter = "all";
let currentTrip = null;
let currentDay = "";
let currentTab = "itinerary";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_COLOR_COUNT = 5; // tương ứng các class day-c0 ... day-c4 trong CSS
const STATUS_ORDER = { pending: 0, ongoing: 1, upcoming: 2, completed: 3, cancelled: 4 };

/* ---------- Tiện ích thao tác DOM ---------- */
const $ = (id) => document.getElementById(id);
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
const cloneTpl = (id) => $(id).content.cloneNode(true);

function fill(root, values) {
  Object.entries(values).forEach(([key, val]) => {
    root.querySelectorAll(`[data-f="${key}"]`).forEach(el => { el.textContent = val ?? ""; });
  });
}
function setIcon(root, iconClass, fallback) {
  const el = root.querySelector("[data-icon]");
  if (el) el.classList.add(iconClass || fallback || "fa-circle");
}
function setImage(el, url) {
  el.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "";
}
function renderList(container, tplId, items, build) {
  container.replaceChildren();
  items.forEach((item, i) => {
    const frag = cloneTpl(tplId);
    build(frag, item, i);
    container.appendChild(frag);
  });
}

/* ---------- Ngày tháng & trạng thái ---------- */
function parseDate(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(date, n) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
const pad = (n) => String(n).padStart(2, "0");
const fmtShort = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const fmtFull  = (d) => `${fmtShort(d)}/${d.getFullYear()}`;
const fmtMoney = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
const fmtStamp = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())} ${fmtFull(d)}`; };

// Thêm ?today=2026-12-10 vào URL để thử với một ngày giả lập
const TODAY_ISO = (() => {
  const q = new URLSearchParams(location.search).get("today");
  return /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : VGBookings.todayISO();
})();
const TODAY = parseDate(TODAY_ISO);

const statusOf = (trip) => VGBookings.statusOf(trip.raw, TODAY_ISO);
function statusLabel(status) {
  return document.querySelector(`#navList [data-filter="${status}"]`)?.dataset.label || status;
}
function dayInfo(trip, i) {
  if (trip.raw.type === "ai_plan" && !trip.raw.startDate) {
    return { short: "", title: trip.raw.itinerary?.days?.[i]?.title || "Chưa xếp ngày khởi hành", colorClass: `day-c${i % DAY_COLOR_COUNT}` };
  }
  const date = addDays(parseDate(trip.startDate), i);
  return {
    short: fmtShort(date),
    title: `${WEEKDAYS[date.getDay()]}, ${fmtFull(date)}`,
    colorClass: `day-c${i % DAY_COLOR_COUNT}`
  };
}
function durationText(trip) {
  if (trip.raw.type === "ai_plan") return trip.raw.itinerary?.duration || "Thời lượng chưa xác định";
  const nights = diffDays(parseDate(trip.startDate), parseDate(trip.endDate));
  return nights === 0 ? "Trong ngày" : `${nights + 1} ngày ${nights} đêm`;
}
function dateRangeShort(trip) {
  if (trip.raw.type === "ai_plan" && !trip.raw.startDate) return "Chưa chọn ngày đi";
  return trip.startDate === trip.endDate
    ? fmtFull(parseDate(trip.startDate))
    : `${fmtShort(parseDate(trip.startDate))} – ${fmtFull(parseDate(trip.endDate))}`;
}
function tripsInFilter() {
  return TRIPS
    .filter(t => currentFilter === "all" || statusOf(t) === currentFilter)
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] || a.startDate.localeCompare(b.startDate));
}
function defaultDay(trip) {
  if (statusOf(trip) === "ongoing") {
    const idx = diffDays(parseDate(trip.startDate), TODAY);
    if (idx < trip.days.length) return String(idx + 1);
  }
  return trip.days.length ? "1" : "";
}

/* ---------- Thông báo nhanh + hộp xác nhận ---------- */
let toastTimer = null;
function toast(text, isError) {
  const el = $("toast");
  el.textContent = text;
  el.classList.toggle("is-error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

function confirmBox({ title, text, yes }) {
  return new Promise(resolve => {
    const box = $("confirm"), opener = document.activeElement;
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmYes").textContent = yes;
    box.hidden = false;
    $("confirmNo").focus();
    const finish = (value) => {
      box.hidden = true;
      $("confirmYes").removeEventListener("click", onYes);
      $("confirmNo").removeEventListener("click", onNo);
      box.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      if (opener && opener.focus) opener.focus();
      resolve(value);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    const onBackdrop = (e) => { if (e.target === box) finish(false); };
    const onKey = (e) => { if (e.key === "Escape") finish(false); };
    $("confirmYes").addEventListener("click", onYes);
    $("confirmNo").addEventListener("click", onNo);
    box.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

/* ---------- Render: khu vực người dùng ---------- */
function renderUser() {
  const u = VGBookings.currentUser();
  $("userCard").hidden = !u;
  if (!u) return;
  const name = u.name || u.email.split("@")[0];
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase() || "?";
  $("userAvatar").textContent = initials;
  $("userName").textContent = name;
  $("userEmail").textContent = u.email;

  const active = TRIPS.filter(t => statusOf(t) !== "cancelled");
  $("statTotal").textContent = active.length;
  $("statUpcoming").textContent = active.filter(t => statusOf(t) === "upcoming").length;
  $("statSpent").textContent = fmtMoney(active.reduce((s, t) => s + (t.raw.type === "ai_plan" ? 0 : t.raw.payment.total), 0));

  const mode = VGBookings.mode();
  $("userMode").classList.toggle("is-server", mode === "server");
  $("userMode").textContent = mode === "server"
    ? "Đang lưu vào file data/bookings.json"
    : "Đang lưu trong trình duyệt này. Chạy “node server.js” để lưu ra file JSON.";
}

/* ---------- Render: sidebar ---------- */
function renderNav() {
  document.querySelectorAll("#navList li").forEach(li => {
    const f = li.dataset.filter;
    const count = TRIPS.filter(t => f === "all" || statusOf(t) === f).length;
    li.classList.toggle("active", f === currentFilter);
    li.querySelector(".count").textContent = count || "";
  });
}

function renderTripList() {
  const list = tripsInFilter();
  $("listTitle").textContent = document.querySelector(`#navList [data-filter="${currentFilter}"]`).dataset.title;
  $("listEmpty").hidden = list.length > 0 || !VGBookings.currentUser();

  renderList($("tripList"), "tpl-trip-item", list, (frag, t) => {
    const st = statusOf(t);
    fill(frag, { name: t.name, dates: dateRangeShort(t), place: t.place || (t.from && t.to ? `${t.from} → ${t.to}` : t.meta.label), type: t.meta.label, status: statusLabel(st) });
    setIcon(frag, t.meta.icon);
    frag.querySelector(".status-tag").classList.add(`st-${st}`);
    const thumb = frag.querySelector(".trip-thumb");
    if (t.thumbImage) setImage(thumb, t.thumbImage);
    else { thumb.classList.add("no-img", `type-${t.raw.type}`); thumb.innerHTML = `<i class="fa-solid ${t.meta.icon}" aria-hidden="true"></i>`; }
    const card = frag.querySelector(".trip-card");
    card.classList.toggle("selected", !!currentTrip && t.id === currentTrip.id);
    card.classList.toggle("is-cancelled", st === "cancelled");
    frag.querySelectorAll("[data-trip]").forEach(el => { el.dataset.trip = t.id; });
  });
}

/* ---------- Render: tab Lịch trình ---------- */
function renderTripHero() {
  const t = currentTrip, st = statusOf(t);
  $("tripName").textContent = t.name;
  $("tripDate").textContent = `${dateRangeShort(t)} · ${durationText(t)}`;
  $("tripPlace").textContent = t.place || (t.from && t.to ? `${t.from} → ${t.to}` : t.from) || "";
  $("tripType").textContent = t.meta.label;
  $("tripTypeIcon").className = `fa-solid ${t.meta.icon}`;
  const stEl = $("tripStatus");
  stEl.textContent = statusLabel(st);
  stEl.classList.toggle("st-pending", st === "pending");
  $("btnCancel").hidden = !VGBookings.canCancel(t.raw, TODAY_ISO);
  $("btnRemove").hidden = !VGBookings.canRemove(t.raw, TODAY_ISO);
  const hero = document.querySelector(".trip-hero");
  hero.classList.toggle("is-cancelled", st === "cancelled");
  setImage(hero, t.heroImage);
}

function renderDayChips() {
  renderList($("dayRow"), "tpl-day-chip", currentTrip.days, (frag, _, i) => {
    const n = i + 1;
    fill(frag, { num: n, date: dayInfo(currentTrip, i).short });
    const chip = frag.querySelector(".day-chip");
    chip.dataset.day = n;
    chip.classList.toggle("active", String(n) === currentDay);
  });
  const all = cloneTpl("tpl-day-chip-all");
  all.querySelector(".day-chip").classList.toggle("active", currentDay === "");
  $("dayRow").prepend(all);
}

function renderDays() {
  const days = currentTrip.days;
  $("daysEmpty").hidden = days.length > 0;

  renderList($("days"), "tpl-day-block", days, (frag, d, i) => {
    const n = i + 1, info = dayInfo(currentTrip, i);
    fill(frag, { badge: n, num: n, title: info.title });
    frag.querySelector(".day-badge").classList.add(info.colorClass);
    const block = frag.querySelector(".day-block");
    block.dataset.block = n;
    block.hidden = currentDay !== "" && String(n) !== currentDay;

    frag.querySelector(".day-empty").hidden = d.activities.length > 0;
    renderList(slot(frag, "activities"), "tpl-activity", d.activities, (af, a) => {
      fill(af, { time: a.time, title: a.title, note: a.note });
      const noteIcon = af.querySelector("[data-icon]");
      noteIcon.hidden = !a.icon;
      if (a.icon) noteIcon.classList.add(a.icon);
      const thumb = af.querySelector("[data-thumb]");
      thumb.hidden = !a.image;
      setImage(thumb, a.image);
    });
  });
}

/* ---------- Render: tab Thông tin ---------- */
function section(id, data, build) {
  const el = $(id);
  el.hidden = !data;
  if (data) build(el, data);
}

function renderInfo() {
  const info = currentTrip.info;
  $("infoEmpty").hidden = !!info;
  $("infoBody").hidden = !info;
  if (!info) return;

  section("infoBookings", info.bookings, (el, bk) => {
    fill(el, { status: bk.statusText, departureLabel: bk.startLabel, departure: bk.startText, code: bk.code });
    el.querySelector('[data-f="status"]').classList.toggle("bad", bk.cancelled);
    el.querySelector('[data-f="status"]').classList.toggle("ok", !bk.cancelled && !bk.pending);
    el.querySelector('[data-f="status"]').classList.toggle("pending", bk.pending);
    renderList(slot(el, "rows"), "tpl-booking-row", bk.rows, (frag, r) => {
      fill(frag, { title: r.title, state: r.state });
      setIcon(frag, r.icon, "fa-ticket");
      const pill = frag.querySelector(".pill");
      pill.classList.toggle("ok", !bk.cancelled && !bk.pending);
      pill.classList.toggle("bad", bk.cancelled);
      pill.classList.toggle("pending", bk.pending);
    });
  });

  section("infoHotel", info.hotel, (el, h) => {
    fill(el, { name: h.name, address: h.address, room: h.room, checkIn: h.checkIn, checkOut: h.checkOut });
    const hotelThumb = el.querySelector("[data-thumb]");
    hotelThumb.className = "hotel-thumb thumb-hotel";
    setImage(hotelThumb, h.image);
  });

  section("infoTransport", info.transport, (el, tr) => {
    fill(el, { title: tr.title });
    renderList(slot(el, "rows"), "tpl-kv-line", tr.rows, (frag, r) => fill(frag, { label: r.label, value: r.value }));
  });
  $("infoGrid").hidden = !info.hotel && !info.transport;

  section("infoPeople", info.people, (el, rows) => {
    renderList(slot(el, "rows"), "tpl-kv-line", rows, (frag, r) => fill(frag, { label: r.label, value: r.value }));
  });

  section("infoCosts", info.costs, (el, costs) => {
    fill(el, { total: fmtMoney(info.total) });
    renderList(slot(el, "rows"), "tpl-cost-row", costs, (frag, c) => {
      fill(frag, { label: c.label, note: c.note || "", date: c.date || "", amount: fmtMoney(c.amount) });
    });
  });

  section("infoNotes", info.notes, (el, notes) => {
    renderList(slot(el, "rows"), "tpl-note", notes, (frag, n) => fill(frag, { title: n.title, text: n.text }));
  });
}

/* ---------- Render: tổng hợp ---------- */
function showTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== tab; });
}

function renderMain() {
  const loggedIn = !!VGBookings.currentUser();
  const has = !!currentTrip;
  $("gate").hidden = loggedIn;
  $("emptyMain").hidden = !loggedIn || has;
  $("emptyAll").hidden = TRIPS.length > 0;
  $("emptyFilter").hidden = TRIPS.length === 0;
  $("tripView").hidden = !has || !loggedIn;
  if (!has || !loggedIn) return;
  renderTripHero();
  renderDayChips();
  renderDays();
  renderInfo();
  showTab(currentTab);
}

function renderAll() {
  renderUser();
  renderNav();
  renderTripList();
  renderMain();
}

/* ---------- Tương tác ---------- */
function applyFilter(filter) {
  currentFilter = filter;
  const list = tripsInFilter();
  if (!currentTrip || !list.includes(currentTrip)) {
    currentTrip = list[0] || null;
    currentDay = currentTrip ? defaultDay(currentTrip) : "";
  }
  renderAll();
}

function selectTrip(id) {
  const trip = TRIPS.find(t => t.id === id);
  if (!trip) return;
  currentTrip = trip;
  currentDay = defaultDay(trip);
  renderAll();
}

async function runAction(kind) {
  const t = currentTrip;
  if (!t) return;
  const cancel = kind === "cancel";
  const ok = await confirmBox(cancel
    ? { title: "Hủy đặt chỗ này?", text: `${t.name} (${t.raw.id}) sẽ chuyển sang trạng thái “Đã hủy”. Việc hoàn tiền theo chính sách của từng dịch vụ.`, yes: "Hủy đặt chỗ" }
    : { title: "Xóa khỏi lịch?", text: `${t.name} (${t.raw.id}) sẽ bị xóa khỏi “Lịch của tôi”.`, yes: "Xóa khỏi lịch" });
  if (!ok) return;
  const res = await (cancel ? VGBookings.cancel(t.raw.id, TODAY_ISO) : VGBookings.remove(t.raw.id, TODAY_ISO));
  if (!res.ok) { toast(res.error || "Không thực hiện được.", true); return; }
  await reload();
  toast(cancel ? `Đã hủy đặt chỗ ${t.raw.id}.` : "Đã xóa khỏi lịch.");
}

function downloadJSON() {
  const blob = new Blob([VGBookings.exportJSON()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vivugo-dat-cho-${TODAY_ISO}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importFile(file) {
  if (!file) return;
  if (file.size > 1e6) { toast("Tệp quá lớn (tối đa 1 MB).", true); return; }
  const res = await VGBookings.importJSON(await file.text());
  if (!res.ok) { toast(res.error, true); return; }
  await reload();
  toast(res.imported ? `Đã nhập ${res.imported} đặt chỗ${res.skipped ? `, bỏ qua ${res.skipped}` : ""}.` : `Không có đặt chỗ mới để nhập${res.skipped ? ` (bỏ qua ${res.skipped})` : ""}.`, !res.imported);
}

function bindEvents() {
  $("navList").addEventListener("click", e => {
    const li = e.target.closest("[data-filter]");
    if (li) applyFilter(li.dataset.filter);
  });
  $("tripList").addEventListener("click", e => {
    const el = e.target.closest("[data-trip]");
    if (el) selectTrip(el.dataset.trip);
  });
  $("dayRow").addEventListener("click", e => {
    const chip = e.target.closest(".day-chip");
    if (!chip) return;
    currentDay = chip.dataset.day || "";
    renderDayChips();
    renderDays();
  });
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

  $("btnCancel").addEventListener("click", () => runAction("cancel"));
  $("btnRemove").addEventListener("click", () => runAction("remove"));
  $("btnExport").addEventListener("click", downloadJSON);
  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", e => { importFile(e.target.files[0]); e.target.value = ""; });
  $("gateLogin").href = VGBookings.loginUrl();
  $("gateRegister").href = VGBookings.registerUrl();
  VGBookings.onChange(() => reload());
}

/* ---------- Đặt chỗ -> chuyến đi để hiển thị ---------- */
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tourImage = (src) => (/^(https?:|\/|data:)/.test(src) ? src : TOUR_IMAGE_PREFIX + src);
const assetImage = (src) => (src ? ASSET_PREFIX + src : "");

// Tour nhiều ngày (mốc "Ngày 1, Ngày 2...") -> mỗi mốc là 1 ngày; tour trong ngày -> 1 ngày gồm nhiều hoạt động theo giờ
function tourDays(tour, images) {
  const items = tour.itinerary || [];
  const multiDay = items.length > 0 && items.every(it => /^Ngày\s*\d+/i.test(it.time));
  if (multiDay) {
    return items.map((it, i) => ({
      activities: [{ time: "Cả ngày", title: it.title, note: it.desc, image: images.length ? images[i % images.length] : "" }]
    }));
  }
  return [{ activities: items.map(it => ({ time: it.time, title: it.title, note: it.desc })) }];
}

// Lịch trình theo ngày cho từng loại dịch vụ
function buildDays(b, total, tour, images) {
  if (b.type === "ai_plan") {
    return (b.itinerary?.days || []).map(day => ({
      activities: (day.activities || []).map(a => ({
        time: a.time || "Lịch dự kiến", title: a.title || "Hoạt động",
        note: [a.description, a.location, a.cost].filter(Boolean).join(" · "),
        icon: "fa-wand-magic-sparkles"
      }))
    }));
  }
  if (tour) {
    const days = tourDays(tour, images);
    while (days.length < total) days.push({ activities: [] });
    return days.slice(0, Math.max(total, 1));
  }
  const days = Array.from({ length: total }, () => ({ activities: [] }));
  const last = total - 1;
  const meta = TYPE_META[b.type];
  const add = (i, a) => days[i].activities.push(a);

  if (b.type === "hotel") {
    add(0, { time: b.startTime || "14:00", title: `Nhận phòng · ${b.title}`, note: b.subtitle, icon: "fa-key" });
    for (let i = 1; i < last; i++) add(i, { time: "Cả ngày", title: `Lưu trú tại ${b.title}`, note: b.place, icon: "fa-bed" });
    if (last > 0) add(last, { time: b.endTime || "12:00", title: `Trả phòng · ${b.title}`, note: b.place, icon: "fa-door-open" });
  } else if (b.type === "car") {
    add(0, { time: b.startTime || "Cả ngày", title: `Nhận xe tại ${b.from}`, note: b.title, icon: "fa-location-dot" });
    for (let i = 1; i < last; i++) add(i, { time: "Cả ngày", title: "Sử dụng xe", note: b.subtitle, icon: "fa-car-side" });
    if (last > 0) add(last, { time: b.endTime || "Cả ngày", title: `Trả xe tại ${b.to}`, note: b.title, icon: "fa-flag-checkered" });
  } else if (b.type === "tour") {
    add(0, { time: b.startTime || "Cả ngày", title: b.title, note: b.subtitle, icon: meta.icon });
  } else {   // máy bay / tàu / xe khách
    add(0, { time: b.startTime || "Cả ngày", title: `Khởi hành · ${b.from || b.title}`, note: b.title, icon: meta.icon });
    add(last, { time: b.endTime || "", title: `Đến nơi · ${b.to || ""}`, note: b.subtitle, icon: "fa-flag-checkered" });
  }
  return days;
}

function buildInfo(b, tour) {
  const meta = TYPE_META[b.type], cancelled = b.status === "cancelled";
  const pending = b.type === "ai_plan" && b.status === "pending";
  const detail = (label) => (b.details.find(d => d.label === label) || {}).value || "";
  const hotelLabels = new Set(["Phòng", "Địa chỉ"]);
  const state = cancelled ? "Đã hủy" : pending ? "Chờ tư vấn" : "Đã xác nhận";

  const tickets = (b.type === "flight" || b.type === "train") && b.passengers.length
    ? b.passengers.map(p => ({ title: `${p.name}${p.seat ? " · " + (b.type === "flight" ? "Ghế " : "Chỗ ") + p.seat : ""}`, state, icon: meta.icon }))
    : [{ title: b.title + (b.quantity > 1 ? ` × ${b.quantity}` : ""), state, icon: meta.icon }];

  const info = {
    bookings: {
      code: b.id, cancelled, pending, statusText: state, rows: tickets,
      startLabel: pending ? "Ngày đi dự kiến" : b.type === "hotel" ? "Nhận phòng" : b.type === "car" ? "Nhận xe" : "Ngày khởi hành",
      startText: b.startDate ? fmtFull(parseDate(b.startDate)) + (b.startTime ? ` · ${b.startTime}` : "") : "Chưa chọn ngày"
    },
    total: b.payment.total
  };

  if (b.type === "hotel") {
    info.hotel = {
      name: b.title, address: detail("Địa chỉ") || b.place, room: detail("Phòng") || b.subtitle,
      checkIn: `${fmtFull(parseDate(b.startDate))} · ${b.startTime || "14:00"}`,
      checkOut: `${fmtFull(parseDate(b.endDate))} · ${b.endTime || "12:00"}`,
      image: assetImage(b.image)
    };
  }

  const rows = [];
  if (b.from) rows.push({ label: b.type === "car" ? "Nhận xe tại" : "Điểm đi", value: b.from });
  if (b.to && b.type !== "hotel") rows.push({ label: b.type === "car" ? "Trả xe tại" : "Điểm đến", value: b.to });
  if (b.startTime && b.type !== "hotel") rows.push({ label: "Giờ khởi hành", value: b.endTime ? `${b.startTime} – ${b.endTime}` : b.startTime });
  b.details.filter(d => !(b.type === "hotel" && hotelLabels.has(d.label))).forEach(d => rows.push({ label: d.label, value: d.value }));
  if (tour) {
    if (tour.vehicle?.length) rows.push({ label: "Phương tiện", value: tour.vehicle.join(" · ") });
    if (tour.pickup) rows.push({ label: "Điểm đón", value: tour.pickup });
  }
  if (pending) {
    info.transport = { title: meta.info, rows: b.details.map(d => ({ label: d.label, value: d.value })) };
  } else if (rows.length) info.transport = { title: meta.info, rows };

  const people = [
    { label: "Người đặt", value: b.contact.name },
    b.contact.phone && { label: "Điện thoại", value: b.contact.phone },
    b.contact.email && { label: "Email", value: b.contact.email }
  ].filter(Boolean);
  b.passengers.forEach((p, i) => people.push({
    label: `Hành khách ${i + 1}${p.seat ? " · " + p.seat : ""}`,
    value: [p.name, p.idMasked].filter(Boolean).join(" · ")
  }));
  info.people = people;

  const created = fmtFull(new Date(b.createdAt));
  info.costs = pending ? null : b.payment.lines.length
    ? b.payment.lines.map(l => ({ label: l.label, amount: l.amount, date: created }))
    : [{ label: b.title, amount: b.payment.total, date: created }];

  const notes = [];
  if (b.payment.method) notes.push({ title: "Hình thức thanh toán", text: b.payment.method });
  if (b.note) notes.push({ title: "Ghi chú của bạn", text: b.note });
  if (pending) notes.push({ title: "Trạng thái yêu cầu", text: "VivuGo đã nhận kế hoạch. Đội ngũ sẽ xem xét và liên hệ bạn để tư vấn, hoàn thiện chương trình và trao đổi hợp đồng." });
  if (pending && b.itinerary?.overview) {
    if (b.itinerary.overview.summary) notes.push({ title: "Tổng quan kế hoạch", text: b.itinerary.overview.summary });
    if (b.itinerary.overview.bestTimeToVisit) notes.push({ title: "Thời điểm phù hợp", text: b.itinerary.overview.bestTimeToVisit });
    if (b.itinerary.overview.packingTips?.length) notes.push({ title: "Gợi ý chuẩn bị", text: b.itinerary.overview.packingTips.join(" · ") });
    if (b.itinerary.costBreakdown?.length) notes.push({ title: "Chi phí ước tính / người", text: b.itinerary.costBreakdown.map(x => `${x.category}: ${fmtMoney(x.amount)}`).join(" · ") });
  }
  notes.push({ title: pending ? "Mã yêu cầu" : "Mã đặt chỗ", text: `${b.id} · gửi lúc ${fmtStamp(b.createdAt)}` });
  if (cancelled) notes.push({ title: "Đã hủy", text: `Đặt chỗ này đã được hủy lúc ${fmtStamp(b.updatedAt)}.` });
  if (tour) {
    if (tour.itineraryNote) notes.push({ title: "Lưu ý lịch trình", text: tour.itineraryNote });
    if (tour.includes?.length) notes.push({ title: "Giá tour đã bao gồm", text: tour.includes.join(" · ") });
    if (tour.excludes?.length) notes.push({ title: "Chưa bao gồm", text: tour.excludes.join(" · ") });
    (tour.notes || []).forEach(text => notes.push({ title: "Lưu ý khi đi", text }));
    if (tour.policy) notes.push({ title: "Chính sách huỷ / đổi lịch", text: tour.policy });
  }
  info.notes = notes;
  return info;
}

function buildTrip(b) {
  const meta = TYPE_META[b.type];
  const tour = b.type === "tour" && TOURS ? TOURS[b.refId] : null;
  const tourImgs = tour ? (tour.images || []).map(tourImage) : [];
  const cover = tourImgs[0] || assetImage(b.image);
  const total = b.type === "ai_plan" ? (b.itinerary?.days || []).length : diffDays(parseDate(b.startDate), parseDate(b.endDate)) + 1;
  return {
    id: b.id, raw: b, meta,
    name: b.title, place: b.place, from: b.from, to: b.to,
    startDate: b.startDate || TODAY_ISO, endDate: b.endDate || TODAY_ISO,
    images: tourImgs, heroImage: cover, thumbImage: cover,
    days: buildDays(b, total, tour, tourImgs),
    info: buildInfo(b, tour)
  };
}

// Ảnh tour có kích thước rất khác nhau. Ảnh nhỏ bị phóng to lên khung banner sẽ bị mờ,
// nên đo kích thước thật rồi chọn ảnh rộng nhất của tour làm ảnh bìa.
function imageWidth(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth);
    img.onerror = () => resolve(0);
    img.src = src;
  });
}
const sharpCache = {};
async function chooseSharpestCovers(trips) {
  return Promise.all(trips.map(async trip => {
    if (!trip.images || trip.images.length < 2) return trip;
    const key = trip.images.join("|");
    if (!sharpCache[key]) {
      const widths = await Promise.all(trip.images.map(imageWidth));
      sharpCache[key] = trip.images[widths.indexOf(Math.max(...widths))];
    }
    return { ...trip, heroImage: sharpCache[key], thumbImage: sharpCache[key] };
  }));
}

async function loadTours() {
  if (TOURS) return;
  try {
    const res = await fetch(TOUR_JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    TOURS = Object.fromEntries((data.tours || []).map(t => [String(t.id), t]));
  } catch (err) {
    TOURS = {};   // không tải được: tour vẫn hiện, chỉ thiếu lịch trình chi tiết
    console.warn("Không tải được " + TOUR_JSON_URL, err);
  }
}

/* ---------- Tải lại dữ liệu và vẽ ---------- */
async function reload() {
  const selected = currentTrip && currentTrip.id;
  const bookings = VGBookings.currentUser() ? await VGBookings.list() : [];
  if (bookings.some(b => b.type === "tour")) await loadTours();
  TRIPS = await chooseSharpestCovers(bookings.map(buildTrip));
  currentTrip = TRIPS.find(t => t.id === selected) || null;
  if (currentTrip && !(currentDay === "" || Number(currentDay) <= currentTrip.days.length)) currentDay = defaultDay(currentTrip);
  applyFilter(currentFilter);
}

bindEvents();
reload();

/* ---------- Slider banner (giống trang Dịch vụ) ---------- */
/* Danh sách ảnh nằm ở data-slides trên thẻ <section class="module-hero"> trong HTML */
async function initHeroSlider(randomSources) {
  const hero = document.querySelector(".module-hero");
  if (!hero || hero.querySelector(".hero-slider")) return;
  const sources = (randomSources && randomSources.length ? randomSources : (hero.dataset.slides || "").split(","))
    .map(s => s.trim()).filter(Boolean);
  if (!sources.length) return;

  // Chỉ giữ những ảnh tải được; không ảnh nào tải được thì giữ nền xanh
  const loaded = await Promise.all(sources.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  })));
  const images = loaded.filter(Boolean);
  if (images.length) buildHeroSlider(hero, images);
}

function buildHeroSlider(hero, images) {
  const AUTOPLAY_MS = 5000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slider = document.createElement("div");
  slider.className = "hero-slider";
  images.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = "hero-slide" + (i === 0 ? " is-active" : "");
    slide.style.backgroundImage = `url(${JSON.stringify(src)})`;
    slider.appendChild(slide);
  });
  hero.prepend(slider);

  if (images.length < 2) return;

  const controls = document.createElement("div");
  controls.className = "hero-controls";
  controls.innerHTML =
    `<div class="hero-dots">${images.map((_, i) =>
      `<button type="button" class="hero-dot${i === 0 ? " is-active" : ""}" data-i="${i}" aria-label="Xem ảnh ${i + 1}"></button>`
    ).join("")}</div>` +
    `<div class="hero-arrows">
      <button type="button" class="hero-arrow" data-dir="-1" aria-label="Ảnh trước"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="hero-arrow" data-dir="1" aria-label="Ảnh sau"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  hero.appendChild(controls);

  const slides = slider.querySelectorAll(".hero-slide");
  const dots = controls.querySelectorAll(".hero-dot");
  let index = 0, timer = null;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle("is-active", n === index));
    dots.forEach((el, n) => el.classList.toggle("is-active", n === index));
  }
  function start() {
    if (reduceMotion || timer) return;
    timer = setInterval(() => show(index + 1), AUTOPLAY_MS);
  }
  function stop() { clearInterval(timer); timer = null; }

  controls.addEventListener("click", e => {
    const dot = e.target.closest(".hero-dot");
    const arrow = e.target.closest(".hero-arrow");
    if (dot) show(Number(dot.dataset.i));
    if (arrow) show(index + Number(arrow.dataset.dir));
    stop(); start();
  });

  // Dừng khi rê chuột / đang focus / đổi tab
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  // Vuốt trên điện thoại
  let touchX = null;
  hero.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", e => {
    if (touchX === null) return;
    const diff = e.changedTouches[0].clientX - touchX;
    if (Math.abs(diff) > 40) { show(index + (diff < 0 ? 1 : -1)); stop(); start(); }
    touchX = null;
  });

  start();
}
initHeroSlider();
