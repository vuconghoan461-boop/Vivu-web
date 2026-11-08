/* ---------- Cấu hình nguồn dữ liệu ---------- */
// data.json : các chuyến đi khách đã đăng ký (ngày đi, mã đặt chỗ, khách sạn, chi phí...). Mỗi chuyến có thể có "tourId"
// tour.json : dữ liệu chính thức của tour. Chuyến nào có "tourId" sẽ lấy tên, ảnh, lịch trình, lưu ý... từ đây
const DATA_JSON_URL = "data.json";
const TOUR_JSON_URL = "tour.json";   // ĐỔI cho đúng đường dẫn tới tour.json trên website của bạn
// Ảnh trong tour.json ghi theo trang tour ("../../assets/..."); trang lịch nằm sâu hơn 1 cấp nên thêm "../"
const TOUR_IMAGE_PREFIX = "../";

let QUICK_ADDS = [], ACTIVITY_TYPES = [], MODAL_DEFAULTS = {}, TRIPS = [];
let currentFilter = "all";
let currentTrip = null;
let currentDay = "";
let currentTab = "itinerary";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_COLOR_COUNT = 5; // tương ứng các class day-c0 ... day-c4 trong CSS
const STATUS_ORDER = { ongoing: 0, upcoming: 1, completed: 2 };
const BOOKING_ICONS = { flight: "fa-plane", hotel: "fa-hotel", bus: "fa-bus", tour: "fa-ticket" };

/* ---------- Tiện ích thao tác DOM ---------- */
const $ = (id) => document.getElementById(id);
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);

// Nhân bản một <template> trong HTML
const cloneTpl = (id) => $(id).content.cloneNode(true);

// Điền văn bản vào các phần tử có data-f="khóa"
function fill(root, values) {
  Object.entries(values).forEach(([key, val]) => {
    root.querySelectorAll(`[data-f="${key}"]`).forEach(el => { el.textContent = val ?? ""; });
  });
}

// Gắn class biểu tượng Font Awesome vào phần tử có data-icon
function setIcon(root, iconClass, fallback) {
  const el = root.querySelector("[data-icon]");
  if (el) el.classList.add(iconClass || fallback || "fa-circle");
}

// Gán ảnh nền (từ đường link) cho một phần tử; không có link thì giữ nền mặc định
function setImage(el, url) {
  el.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "";
}

// Dựng một danh sách bằng cách nhân bản template cho từng phần tử dữ liệu
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

// Thêm ?today=2026-10-05 vào URL để thử với một ngày giả lập
function getToday() {
  const q = new URLSearchParams(location.search).get("today");
  const d = q ? parseDate(q) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
const TODAY = getToday();

function statusOf(trip) {
  if (TODAY < parseDate(trip.startDate)) return "upcoming";
  if (TODAY > parseDate(trip.endDate))   return "completed";
  return "ongoing";
}
// Nhãn trạng thái lấy từ HTML (data-label của mục menu)
function statusLabel(status) {
  return document.querySelector(`#navList [data-filter="${status}"]`).dataset.label;
}
function dayInfo(trip, i) {
  const date = addDays(parseDate(trip.startDate), i);
  return {
    short: fmtShort(date),
    title: `${WEEKDAYS[date.getDay()]}, ${fmtFull(date)}`,
    colorClass: `day-c${i % DAY_COLOR_COUNT}`
  };
}
function durationText(trip) {
  const nights = diffDays(parseDate(trip.startDate), parseDate(trip.endDate));
  return `${nights + 1} ngày ${nights} đêm`;
}
function dateRangeShort(trip) {
  return `${fmtShort(parseDate(trip.startDate))} – ${fmtFull(parseDate(trip.endDate))}`;
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
  $("listEmpty").hidden = list.length > 0;

  renderList($("tripList"), "tpl-trip-item", list, (frag, t) => {
    const st = statusOf(t);
    fill(frag, { name: t.sidebarName, dates: dateRangeShort(t), place: t.place, status: statusLabel(st) });
    frag.querySelector(".status-tag").classList.add(`st-${st}`);
    if (t.thumbClass) frag.querySelector(".trip-thumb").classList.add(t.thumbClass);
    setImage(frag.querySelector(".trip-thumb"), t.thumbImage || t.image);
    frag.querySelector(".trip-card").classList.toggle("selected", !!currentTrip && t.id === currentTrip.id);
    frag.querySelectorAll("[data-trip]").forEach(el => { el.dataset.trip = t.id; });
  });
}

function renderQuickAdds() {
  renderList($("quickGrid"), "tpl-quick", QUICK_ADDS, (frag, q) => {
    fill(frag, { title: q.title, desc: q.desc });
    setIcon(frag, q.icon);
  });
}

/* ---------- Render: tab Lịch trình ---------- */
function renderTripHero() {
  const t = currentTrip;
  $("tripName").textContent = t.name;
  $("tripDate").textContent = `📅 ${fmtFull(parseDate(t.startDate))} – ${fmtFull(parseDate(t.endDate))} · ${durationText(t)}`;
  $("tripPlace").textContent = "📍 " + t.place;
  $("tripStatus").textContent = statusLabel(statusOf(t));
  setImage(document.querySelector(".trip-hero"), t.heroImage || t.image);
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

    renderList(slot(frag, "activities"), "tpl-activity", d.activities, (af, a) => {
      fill(af, { time: a.time, title: a.title, note: a.note });
      const thumb = af.querySelector("[data-thumb]");
      thumb.hidden = !a.thumb && !a.image;
      if (a.thumb) thumb.classList.add(a.thumb);
      setImage(thumb, a.image);
    });
  });
}

/* ---------- Render: tab Thông tin chuyến đi ---------- */
// Hiện/ẩn một khối trong HTML, nếu có dữ liệu thì gọi build để điền vào
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

  const start = parseDate(currentTrip.startDate);

  section("infoBookings", info.bookings, (el, bookings) => {
    fill(el, { status: info.status, departure: fmtShort(start), code: info.bookingCode });
    renderList(slot(el, "rows"), "tpl-booking-row", bookings, (frag, b) => {
      fill(frag, { title: b.title, state: b.status });
      setIcon(frag, BOOKING_ICONS[b.type], "fa-ticket");
    });
  });

  section("infoHotel", info.hotel, (el, h) => {
    fill(el, { name: h.name, address: h.address, room: h.room, checkIn: h.checkIn, checkOut: h.checkOut });
    const hotelThumb = el.querySelector("[data-thumb]");
    hotelThumb.className = `hotel-thumb ${h.thumbClass || "thumb-hotel"}`;
    setImage(hotelThumb, h.image);
  });

  section("infoTransport", info.transport, (el, tr) => {
    fill(el, { title: tr.title });
    renderList(slot(el, "rows"), "tpl-kv-line", tr.rows, (frag, r) => fill(frag, { label: r.label, value: r.value }));
  });
  $("infoGrid").hidden = !info.hotel && !info.transport;

  section("infoCosts", info.costs, (el, costs) => {
    const total = costs.reduce((sum, c) => sum + c.amount, 0);
    fill(el, { total: fmtMoney(total) });
    renderList(slot(el, "rows"), "tpl-cost-row", costs, (frag, c) => {
      fill(frag, {
        label: c.label,
        note: c.note || "",
        date: c.date ? fmtFull(parseDate(c.date)) : "",
        amount: fmtMoney(c.amount)
      });
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
  const has = !!currentTrip;
  $("tripView").hidden = !has;
  $("emptyMain").hidden = has;
  if (!has) return;
  renderTripHero();
  renderDayChips();
  renderDays();
  renderInfo();
  showTab(currentTab);
}

function renderAll() {
  renderNav();
  renderTripList();
  renderMain();
}

function renderModal() {
  renderList($("typeRow"), "tpl-type-chip", ACTIVITY_TYPES, (frag, t) => {
    fill(frag, { icon: t.icon, label: t.label });
    frag.querySelector(".type-chip").classList.toggle("active", !!t.active);
  });
  $("inputDate").value = MODAL_DEFAULTS.date;
  $("inputTime").value = MODAL_DEFAULTS.time;
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

function openModal()  { $("overlay").classList.add("open"); }
function closeModal() { $("overlay").classList.remove("open"); }

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

  $("typeRow").addEventListener("click", e => {
    const chip = e.target.closest(".type-chip");
    if (!chip) return;
    $("typeRow").querySelectorAll(".type-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
  });

  // Các nút có data-action="open-modal" / "close-modal"
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "open-modal")  openModal();
    if (btn.dataset.action === "close-modal") closeModal();
  });

  // Bấm ra vùng nền tối để đóng modal
  $("overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

/* ---------- Ghép dữ liệu tour.json vào chuyến đi ---------- */
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function tourImage(src) {
  return /^(https?:|\/|data:)/.test(src) ? src : TOUR_IMAGE_PREFIX + src;
}

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

// Thông tin tour: phần của tour.json ghi đè, phần riêng của khách (bookings, hotel, costs...) giữ từ data.json
function tourInfo(own, tour, dep) {
  const info = { ...(own || {}) };

  const rows = [];
  if (tour.code)            rows.push({ label: "Mã tour", value: tour.code });
  if (dep)                  rows.push({ label: "Giờ khởi hành", value: dep.endTime ? `${dep.time} – ${dep.endTime}` : dep.time });
  if (tour.duration)        rows.push({ label: "Thời lượng", value: tour.duration });
  if (tour.vehicle?.length) rows.push({ label: "Phương tiện", value: tour.vehicle.join(" · ") });
  if (tour.pickup)          rows.push({ label: "Điểm đón", value: tour.pickup });
  if (rows.length) info.transport = { title: "Thông tin tour", rows };

  const notes = [];
  if (tour.itineraryNote)    notes.push({ title: "Lưu ý lịch trình", text: tour.itineraryNote });
  if (tour.includes?.length) notes.push({ title: "Giá tour đã bao gồm", text: tour.includes.join(" · ") });
  if (tour.excludes?.length) notes.push({ title: "Chưa bao gồm", text: tour.excludes.join(" · ") });
  (tour.notes || []).forEach(text => notes.push({ title: "Lưu ý khi đi", text }));
  if (tour.policy)           notes.push({ title: "Chính sách huỷ / đổi lịch", text: tour.policy });
  if (notes.length) info.notes = notes;

  // Khách chưa có bảng chi phí riêng thì lấy giá tour/khách từ tour.json
  if (!info.costs && tour.price) {
    info.costs = [{ label: "Giá tour", note: `${tour.name} · giá/khách`, amount: tour.price }];
  }
  return info;
}

function mergeTour(trip, tour) {
  if (!tour) return trip;
  const images = (tour.images || []).map(tourImage);
  const cover = images.length ? images[Math.floor(Math.random() * images.length)] : "";   // ảnh bìa: ngẫu nhiên trong ảnh của tour
  const days = tourDays(tour, images);
  const dep = (tour.departures || []).find(d => d.date === trip.startDate);
  return {
    ...trip,
    name: tour.name,
    sidebarName: tour.city || trip.sidebarName,
    place: tour.city || trip.place,
    endDate: toISO(addDays(parseDate(trip.startDate), Math.max(days.length, 1) - 1)),
    days,
    images,
    heroImage: cover || trip.heroImage,
    thumbImage: cover || trip.thumbImage,
    info: tourInfo(trip.info, tour, dep)
  };
}

/* ---------- Khởi tạo: tải data.json (+ tour.json) rồi dựng giao diện ---------- */
async function init() {
  bindEvents();
  try {
    const res = await fetch(DATA_JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    QUICK_ADDS     = data.quickAdds;
    ACTIVITY_TYPES = data.activityTypes;
    MODAL_DEFAULTS = data.modalDefaults;
    TRIPS          = data.trips;
  } catch (err) {
    $("loadError").hidden = false;
    $("listError").hidden = false;
    console.error(err);
    return;
  }

  // tour.json: dữ liệu chính thức. Không tải được thì vẫn dùng thông tin trong data.json
  try {
    const res = await fetch(TOUR_JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const tourData = await res.json();
    const tours = Object.fromEntries((tourData.tours || []).map(t => [t.id, t]));
    TRIPS = TRIPS.map(t => mergeTour(t, tours[t.tourId]));
  } catch (err) {
    console.warn("Không tải được " + TOUR_JSON_URL + ", dùng dữ liệu trong data.json", err);
  }

  renderQuickAdds();
  renderModal();
  applyFilter("all");
}
init();

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

  const arrowSvg = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const controls = document.createElement("div");
  controls.className = "hero-controls";
  controls.innerHTML =
    `<div class="hero-dots">${images.map((_, i) =>
      `<button type="button" class="hero-dot${i === 0 ? " is-active" : ""}" data-i="${i}" aria-label="Xem ảnh ${i + 1}"></button>`
    ).join("")}</div>` +
    `<div class="hero-arrows">
      <button type="button" class="hero-arrow" data-dir="-1" aria-label="Ảnh trước">${arrowSvg("M15 18l-6-6 6-6")}</button>
      <button type="button" class="hero-arrow" data-dir="1" aria-label="Ảnh sau">${arrowSvg("M9 18l6-6-6-6")}</button>
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