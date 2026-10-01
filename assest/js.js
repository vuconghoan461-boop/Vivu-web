/* TRANG SERVICE CHUNG */
document.addEventListener("DOMContentLoaded", async function () {
  /* ===================================================================
     1. LOAD HEADER
     =================================================================== */

  const headerContainer =
    document.getElementById("site-header");

  if (headerContainer) {

    try {

      const response =
        await fetch("header.html");

      if (!response.ok) {
        throw new Error("Không thể tải header.html");
      }

      const headerHTML =
        await response.text();

      headerContainer.innerHTML =
        headerHTML;


    } catch (error) {

      console.error(
        "Lỗi khi tải Header:",
        error
      );

    }
  }


  /* ===================================================================
     2. LOAD FOOTER
     =================================================================== */

  const footerContainer =
    document.getElementById("site-footer");

  if (footerContainer) {

    try {

      const response =
        await fetch("footer.html");

      if (!response.ok) {
        throw new Error("Không thể tải footer.html");
      }

      footerContainer.innerHTML =
        await response.text();

    } catch (error) {

      console.error(
        "Lỗi khi tải Footer:",
        error
      );

    }
  }


  /* ===================================================================
     3. MENU ĐIỀU HƯỚNG MOBILE
     =================================================================== */

  const navToggle =
    document.querySelector(".nav-toggle");

  const mainNav =
    document.querySelector(".main-nav");


  if (navToggle && mainNav) {

    navToggle.addEventListener("click", function () {

      const isOpen =
        mainNav.classList.toggle("is-open");

      navToggle.setAttribute(
        "aria-expanded",
        isOpen ? "true" : "false"
      );

    });

  }

  /* ===================================================================
     4. TABS LỌC DỊCH VỤ
     =================================================================== */

  const tabButtons =
    document.querySelectorAll("[data-tab-target]");


  tabButtons.forEach(function (btn) {

    btn.addEventListener("click", function () {

      const targetId =
        btn.getAttribute("data-tab-target");

      const tabGroup =
        btn.closest("[data-tab-group]");


      if (!tabGroup) {
        return;
      }


      /* Xóa trạng thái active cũ */

      tabGroup
        .querySelectorAll("[data-tab-target]")
        .forEach(function (button) {

          button.classList.remove("is-active");

        });


      /* Active tab hiện tại */

      btn.classList.add("is-active");


      /* Hiển thị panel tương ứng */

      tabGroup
        .querySelectorAll("[data-tab-panel]")
        .forEach(function (panel) {

          panel.classList.toggle(
            "is-active",
            panel.getAttribute("data-tab-panel") === targetId
          );

        });

    });

  });


  /* ===================================================================
     5. BỘ ĐẾM SỐ LƯỢNG KẾT QUẢ
     =================================================================== */

  const resultCountEl =
    document.querySelector("[data-result-count]");


  if (resultCountEl) {

    tabButtons.forEach(function (btn) {

      btn.addEventListener("click", function () {

        const count =
          btn.getAttribute("data-count");


        if (count) {

          resultCountEl.textContent =
            "Tìm thấy " +
            count +
            " dịch vụ phù hợp";

        }

      });

    });

  }


  /* ===================================================================
     6. ẨN / HIỆN BỘ LỌC TRÊN MOBILE
     =================================================================== */

  const filterToggle =
    document.querySelector("[data-filter-toggle]");

  const filterPanel =
    document.querySelector(".filter-panel");


  if (filterToggle && filterPanel) {

    filterToggle.addEventListener("click", function () {

      filterPanel.classList.toggle("is-open");

    });

  }

});


/*---- TRANG CARRENT ----*/
/* =========================================================
   thue-xe.js — logic cho module "Thuê xe tự lái"
   -----------------------------------------------------------
   DỮ LIỆU MẪU: mảng CARS bên dưới. Sau này khi có file JSON
   thật, chỉ cần thay khối "const CARS = [...]" bằng:

     let CARS = [];
     fetch('data/cars.json')
       .then(r => r.json())
       .then(data => { CARS = data; filterAndRender(); });

   Toàn bộ phần render/filter/modal phía dưới KHÔNG cần sửa gì
   thêm vì đều đọc từ biến CARS.
   ========================================================= */

let CARS = [];

/* Nhóm loại phương tiện: dùng cho toggle "Ô tô / Xe máy" ở thanh filter chung */
const TYPE_MAP = { oto: "oto", limo: "oto", airport: "oto", xemay: "xemay" };

const state = {
  vehicleType: "oto",
  category: "all",
  seat: "all",
  city: "Hà Nội"
};

let currentCarId = null;
let promoApplied = false;

function formatCurrency(n) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

/* ---------------- Render danh sách xe ---------------- */
function carCardHTML(car) {
  const badge = car.badge ? `<span class="car-badge">${car.badge}</span>` : "";
  const featuresHTML = car.features.map(f => `<li>${f}</li>`).join("");
  return `
    <article class="car-card">
      <div class="car-media">
        ${badge}
        <div class="media-placeholder" data-label="${car.name}"></div>
      </div>
      <div class="car-body">
        <div class="car-rating-row">
          <span class="rating">★ ${car.rating.toFixed(2)}</span>
          <span class="dot">·</span>
          <span>${car.reviews} chuyến</span>
          <span class="dot">·</span>
          <span class="provider">${car.provider}</span>
        </div>
        <h3 class="car-name">${car.name}</h3>
        <div class="car-specs">
          <div><span class="spec-label">Chỗ ngồi</span><span class="spec-value">${car.seats} chỗ</span></div>
          <div><span class="spec-label">Hộp số</span><span class="spec-value">${car.transmission}</span></div>
          <div><span class="spec-label">Nhiên liệu</span><span class="spec-value">${car.fuel}</span></div>
        </div>
        <ul class="car-features">${featuresHTML}</ul>
        <div class="car-foot">
          <div class="car-price">
            <span class="label">Giá thuê</span>
            <span class="value">${formatCurrency(car.price)} <span>${car.priceUnit}</span></span>
          </div>
          <button type="button" class="btn-quickbook" data-id="${car.id}">Đặt xe nhanh →</button>
        </div>
      </div>
    </article>
  `;
}

function filterAndRender() {
  const list = CARS.filter(car => {
    if (TYPE_MAP[car.category] !== state.vehicleType) return false;
    if (state.category !== "all" && car.category !== state.category) return false;
    if (state.seat !== "all" && String(car.seats) !== String(state.seat)) return false;
    if (state.city !== "all" && car.city !== state.city) return false;
    return true;
  });

  const grid = document.getElementById("carGrid");
  const resultCount = document.getElementById("resultCount");
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<div class="car-empty">Không tìm thấy xe phù hợp. Vui lòng thử bộ lọc khác.</div>`;
  } else {
    grid.innerHTML = list.map(carCardHTML).join("");
  }
  if (resultCount) resultCount.textContent = `Tìm thấy ${list.length} xe phù hợp`;
}

/* ---------------- Thanh filter chung (6.1) ---------------- */
function initFilterBar() {
  const diffLocation = document.getElementById("diffLocation");
  const dropoffField = document.getElementById("dropoffField");
  const pickupLocation = document.getElementById("pickupLocation");
  const dropoffLocation = document.getElementById("dropoffLocation");
  const pickupDatetime = document.getElementById("pickupDatetime");
  const dropoffDatetime = document.getElementById("dropoffDatetime");
  const durationPill = document.getElementById("durationPill");
  const vehicleToggle = document.getElementById("vehicleTypeToggle");
  const searchBtn = document.getElementById("searchCarsBtn");

  function syncDropoffVisibility() {
    if (!diffLocation) return;
    if (diffLocation.checked) {
      dropoffField.style.display = "flex";
    } else {
      dropoffField.style.display = "none";
      dropoffLocation.value = pickupLocation.value;
    }
  }

  function updateDuration() {
    if (!pickupDatetime.value || !dropoffDatetime.value) return;
    const pick = new Date(pickupDatetime.value);
    const drop = new Date(dropoffDatetime.value);
    let days = Math.round((drop - pick) / (1000 * 60 * 60 * 24));
    if (isNaN(days) || days < 1) days = 1;
    durationPill.textContent = `${days} ngày`;
  }

  if (diffLocation) diffLocation.addEventListener("change", syncDropoffVisibility);
  if (pickupDatetime) pickupDatetime.addEventListener("change", updateDuration);
  if (dropoffDatetime) dropoffDatetime.addEventListener("change", updateDuration);

  if (vehicleToggle) {
    vehicleToggle.querySelectorAll(".seg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        vehicleToggle.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.vehicleType = btn.dataset.type;
        // Khi chuyển sang xe máy, mặc định chọn tab "Xe máy phượt"; ngược lại về "Tất cả"
        const targetCat = state.vehicleType === "xemay" ? "xemay" : "all";
        setActiveCategory(targetCat);
      });
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      updateDuration();
      filterAndRender();
      document.getElementById("resultCount")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  syncDropoffVisibility();
  updateDuration();
}

/* ---------------- Location dropdown + tabs + seat filter (6.2) ---------------- */
function setActiveCategory(cat) {
  state.category = cat;
  document.querySelectorAll(".cat-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.cat === cat);
  });
  filterAndRender();
}

function initToolbar() {
  const locationSelect = document.getElementById("locationSelect");
  const locationDropdown = document.getElementById("locationDropdown");
  const locationLabel = document.getElementById("locationLabel");

  if (locationSelect && locationDropdown) {
    locationSelect.addEventListener("click", (e) => {
      e.stopPropagation();
      locationDropdown.classList.toggle("is-open");
    });
    locationDropdown.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        state.city = btn.dataset.city;
        locationLabel.textContent = btn.dataset.city;
        locationDropdown.querySelectorAll("button").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        locationDropdown.classList.remove("is-open");
        filterAndRender();
      });
    });
    document.addEventListener("click", () => locationDropdown.classList.remove("is-open"));
  }

  document.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => setActiveCategory(btn.dataset.cat));
  });

  document.querySelectorAll(".seat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seat-pill").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.seat = btn.dataset.seat;
      filterAndRender();
    });
  });
}

/* ---------------- Form đặt xe nhanh (6.3) ---------------- */
function openBookingModal(carId) {
  const car = CARS.find(c => c.id === Number(carId));
  if (!car) return;
  currentCarId = car.id;
  promoApplied = false;

  document.getElementById("bookingCarName").textContent = car.name;
  document.getElementById("bookingProvider").textContent = `Đơn vị cung cấp: ${car.provider}`;
  document.getElementById("bookingPerks").textContent = car.perks;
  document.getElementById("bookingPricePerDay").innerHTML =
    `${formatCurrency(car.price)}<small>${car.priceUnit}</small>`;

  document.getElementById("bookingForm").reset();
  document.getElementById("rentalDays").value = "2";
  document.getElementById("promoCode").value = "";
  document.getElementById("sumPromoRow").style.display = "none";

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("bookingPickupDate").value = today;

  updateSummary();
  document.getElementById("bookingModalOverlay").classList.add("is-open");
}

function closeBookingModal() {
  document.getElementById("bookingModalOverlay").classList.remove("is-open");
}

function updateSummary() {
  const car = CARS.find(c => c.id === currentCarId);
  if (!car) return;
  const days = parseInt(document.getElementById("rentalDays").value, 10) || 1;
  const withDriver = document.getElementById("withDriver").checked;

  const base = car.price * days;
  const driverFee = withDriver ? 500000 * days : 0;
  let subtotal = base + driverFee;
  let discount = 0;
  if (promoApplied) discount = Math.round(subtotal * 0.1);
  const total = subtotal - discount;

  document.getElementById("sumBase").textContent = formatCurrency(base);

  const driverRow = document.getElementById("sumDriverRow");
  driverRow.style.display = withDriver ? "flex" : "none";
  document.getElementById("sumDriver").textContent = formatCurrency(driverFee);

  const promoRow = document.getElementById("sumPromoRow");
  promoRow.style.display = promoApplied ? "flex" : "none";
  document.getElementById("sumPromo").textContent = "-" + formatCurrency(discount);

  document.getElementById("totalLabel").textContent = `Tổng tiền (${days} ngày)`;
  document.getElementById("totalAmount").textContent = formatCurrency(total);
}

function initBookingForm() {
  document.getElementById("rentalDays").addEventListener("change", updateSummary);
  document.getElementById("withDriver").addEventListener("change", updateSummary);

  document.getElementById("applyPromo").addEventListener("click", () => {
    const code = document.getElementById("promoCode").value.trim().toUpperCase();
    if (code === "VIVU10") {
      promoApplied = true;
    } else {
      promoApplied = false;
      alert("Mã ưu đãi không hợp lệ hoặc đã hết hạn.");
    }
    updateSummary();
  });

  document.getElementById("bookingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const car = CARS.find(c => c.id === currentCarId);
    if (!car) return;

    const name = document.getElementById("renterName").value.trim();
    const phone = document.getElementById("renterPhone").value.trim();
    const address = document.getElementById("deliveryAddress").value.trim();
    if (!name || !phone || !address) return;

    const totalText = document.getElementById("totalAmount").textContent;

    closeBookingModal();
    openSuccessModal({
      name,
      phone,
      service: car.name,
      total: totalText
    });
  });
}

/* ---------------- Modal thành công ---------------- */
function openSuccessModal(info) {
  const code = "CAR-" + Math.floor(100000 + Math.random() * 900000);
  document.getElementById("orderCode").textContent = code;
  document.getElementById("infoName").textContent = info.name;
  document.getElementById("infoPhone").textContent = info.phone;
  document.getElementById("infoService").textContent = info.service;
  document.getElementById("infoTotal").textContent = info.total;
  document.getElementById("successModalOverlay").classList.add("is-open");
}

function closeSuccessModal() {
  document.getElementById("successModalOverlay").classList.remove("is-open");
}

/* ---------------- Khởi tạo chung ---------------- */
function initModals() {
  document.getElementById("closeBookingModal").addEventListener("click", closeBookingModal);
  document.getElementById("closeSuccessModal").addEventListener("click", closeSuccessModal);

  document.getElementById("bookingModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "bookingModalOverlay") closeBookingModal();
  });
  document.getElementById("successModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "successModalOverlay") closeSuccessModal();
  });

  // Nút "Xem vé trong Chuyến của tôi" -> điều hướng sang module "KH của tôi" / "Lịch của tôi"
  document.getElementById("goToMyTrips").addEventListener("click", () => {
    closeSuccessModal();
    // TODO: đổi sang đường dẫn thật của module "Lịch của tôi" khi có
    // window.location.href = "lich-cua-toi.html";
  });

  // Event delegation cho nút "Đặt xe nhanh" trong grid (grid re-render liên tục)
  document.getElementById("carGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-quickbook");
    if (btn) openBookingModal(btn.dataset.id);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("carGrid")) {
    initFilterBar();
    initToolbar();
    initModals();
    initBookingForm();
    filterAndRender();
 
    // Đường dẫn tính từ web page/service/CarRent.html -> data/car.json
    fetch("../../data/car.json")
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(data => { CARS = data; filterAndRender(); })
      .catch(err => {
        console.error("Lỗi tải car.json:", err);
        document.getElementById("carGrid").innerHTML =
          '<div class="car-empty">Không tải được dữ liệu xe. Hãy chạy bằng Live Server / localhost.</div>';
      });
  }
});

function copyVoucher(code, button) {
  navigator.clipboard.writeText(code).then(() => {
    const oldText = button.textContent;

    button.textContent = "Đã copy";

    setTimeout(() => {
      button.textContent = oldText;
    }, 1500);
  }).catch(() => {
    alert("Không thể sao chép mã. Bạn hãy copy thủ công: " + code);
  });
}

/* ---- MODULE CON: TOUR (dán vào cuối assest/js.js) ---- */
/* Trang Tour (cấu trúc giống thue-xe.js: render từ JSON, modal .is-open) */
(function () {
  const $ = id => document.getElementById(id);
  const money = n => n.toLocaleString('vi-VN') + 'đ';
  const dateVN = s => s.split('-').reverse().join('/');
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const kfmt = n => (n >= 1000 ? (n / 1000).toLocaleString('vi-VN') + 'K+' : n);
  const open = id => $(id).classList.add('is-open');
  const close = id => $(id).classList.remove('is-open');

  let DATA = { tours: [], promoCodes: [], policy: '' };
  let state = { cat: 'all', dest: 'all' };
  let current = null, promo = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('tourGrid')) return; // chỉ chạy trên trang Tour
    fetch('../../data/tour.json').then(r => r.json()).then(d => { DATA = d; init(); })
      .catch(() => { $('tourGrid').innerHTML = '<div class="car-empty">Không tải được tour.json. Hãy chạy bằng Live Server / localhost.</div>'; });
  });

  function init() {
    const T = DATA.tours, uniq = a => [...new Set(a)];
    $('fType').innerHTML = '<option value="">Tất cả loại chi tiết</option>' + uniq(T.flatMap(t => t.types)).map(v => `<option>${v}</option>`).join('');
    $('categoryTabs').innerHTML = '<button class="cat-tab is-active" data-cat="all">Tất cả loại hình</button>' +
      uniq(T.map(t => t.category)).map(c => `<button class="cat-tab" data-cat="${c}">${c}</button>`).join('');
    const dests = uniq(T.flatMap(t => uniq([t.from, t.to])));
    $('destFilter').innerHTML = '<button class="seat-pill is-active" data-dest="all">Tất cả điểm đến</button>' +
      dests.map(d => `<button class="seat-pill" data-dest="${d}">${d} (${T.filter(t => t.from === d || t.to === d).length})</button>`).join('');

    $('categoryTabs').addEventListener('click', e => {
      const b = e.target.closest('.cat-tab'); if (!b) return;
      state.cat = b.dataset.cat; toggle('#categoryTabs .cat-tab', b); render();
    });
    $('destFilter').addEventListener('click', e => {
      const b = e.target.closest('.seat-pill'); if (!b) return;
      state.dest = b.dataset.dest; toggle('#destFilter .seat-pill', b); render();
    });
    ['fType', 'fFrom', 'fTo', 'fSort'].forEach(i => $(i).addEventListener('change', render));
    $('keyword').addEventListener('input', render);
    $('searchBtn').onclick = render;
    $('resetBtn').onclick = () => {
      ['keyword', 'fType', 'fFrom', 'fTo'].forEach(i => $(i).value = ''); $('fSort').value = 'popular';
      state = { cat: 'all', dest: 'all' };
      toggle('#categoryTabs .cat-tab', document.querySelector('#categoryTabs .cat-tab'));
      toggle('#destFilter .seat-pill', document.querySelector('#destFilter .seat-pill')); render();
    };

    $('tourGrid').addEventListener('click', e => {
      const c = e.target.closest('.car-card'); if (c) openDetail(+c.dataset.id);
    });
    $('closeBookingModal').onclick = () => close('bookingModalOverlay');
    $('closeSuccessModal').onclick = () => close('successModalOverlay');
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('is-open'); }));
    $('ticketQty').addEventListener('input', calc);
    $('applyPromo').onclick = applyPromo;
    $('bookingForm').addEventListener('submit', submitBooking);
    $('goToMyTrips').onclick = () => { window.location.href = '../../index.html'; /* TODO: link tới module "Kế hoạch của tôi" */ };
    render();
  }

  function toggle(sel, btn) { document.querySelectorAll(sel).forEach(x => x.classList.toggle('is-active', x === btn)); }

  /* ---------- Lọc + sắp xếp ---------- */
  function filtered() {
    const type = $('fType').value, from = $('fFrom').value, to = $('fTo').value, kw = norm($('keyword').value.trim());
    const list = DATA.tours.filter(t =>
      (state.cat === 'all' || t.category === state.cat) &&
      (state.dest === 'all' || t.from === state.dest || t.to === state.dest) &&
      (!type || t.types.includes(type)) &&
      t.departures.some(d => (!from || d.date >= from) && (!to || d.date <= to)) &&
      (!kw || norm(t.name + ' ' + t.from + ' ' + t.to).includes(kw)));
    const by = {
      popular: (a, b) => b.booked - a.booked, az: (a, b) => a.name.localeCompare(b.name, 'vi'),
      priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      soon: (a, b) => a.departures[0].date.localeCompare(b.departures[0].date)
    };
    return list.sort(by[$('fSort').value]);
  }

  const badges = t =>
    (t.booked >= 40000 ? '<span class="car-badge hot">🔥 Hot</span>' : '') +
    (t.discount ? `<span class="car-badge sale">Giảm ${t.discount}%</span>` : '');
  const media = (t, i, label) => `<div class="media-placeholder" data-label="${label}">${t.images[i] ? `<img src="${t.images[i]}" alt="${t.name}">` : ''}</div>`;

  function render() {
    const list = filtered();
    $('resultCount').textContent = `Tìm thấy ${list.length} tour phù hợp`;
    $('tourGrid').innerHTML = list.length ? list.map(t => {
      const d = t.departures[0];
      return `<article class="car-card" data-id="${t.id}">
        <div class="car-media"><div class="badge-row">${badges(t)}</div>${media(t, 0, 'Ảnh tour')}</div>
        <div class="car-body">
          <div class="car-rating-row"><span class="rating">★ ${t.rating}</span><span class="dot">·</span>
            <span class="provider">${t.reviews.toLocaleString('vi-VN')} đánh giá</span><span class="dot">·</span><span>${kfmt(t.booked)} đã đặt</span></div>
          <h3 class="car-name">${t.name}</h3>
          <div class="tour-route">📍 ${t.from} → ${t.to}</div>
          <div class="car-specs">
            <div><span class="spec-label">Thời lượng</span><span class="spec-value">${t.duration.split(' (')[0]}</span></div>
            <div><span class="spec-label">Khởi hành</span><span class="spec-value">${dateVN(d.date).slice(0, 5)}</span></div>
            <div><span class="spec-label">Còn chỗ</span><span class="spec-value">${d.slots}</span></div></div>
          <div class="car-foot">
            <div class="car-price">${t.discount ? `<span class="old-price">${money(t.priceOriginal)}</span>` : '<span class="label">Giá từ</span>'}
              <span class="value">${money(t.price)}<span>/khách</span></span></div>
            <button type="button" class="btn-quickbook" data-id="${t.id}">Đặt ngay</button></div>
        </div></article>`;
    }).join('') : '<div class="car-empty">Không tìm thấy tour phù hợp. Hãy thử thay đổi bộ lọc.</div>';
  }

  /* ---------- Popup chi tiết ---------- */
  function openDetail(id) {
    const t = current = DATA.tours.find(x => x.id === id), d = t.departures[0];
    const li = a => a.map(x => `<li>${x}</li>`).join('');
    const tl = t.itinerary.map(s => `<li><span class="t-time">${s.time}</span><div>${s.title}${s.desc ? `<span class="t-desc">${s.desc}</span>` : ''}</div></li>`).join('');
    const rows = [1, 2, 4, 6].map(n => `<tr><td>${n} khách</td><td>${money(t.price)}</td><td><strong>${money(t.price * n)}</strong></td></tr>`).join('');
    const m = $('detailModal');
    m.innerHTML = `
      <button type="button" class="modal-close" data-x>×</button>
      <div class="gallery">${[0, 1, 2, 3, 4].map(i => media(t, i, i ? 'Ảnh ' + (i + 1) : 'Ảnh chính')).join('')}</div>
      <div class="detail-top">
        <div><h2>${t.name}</h2><div class="badge-row" style="position:static;margin-top:8px">${badges(t)}</div>
          <div class="detail-price">${money(t.price)} <small>/khách · đã gồm thuế</small></div>
          ${t.discount ? `<span class="old-price">${money(t.priceOriginal)}</span>` : ''}</div>
        <button type="button" class="btn-cta" data-book>Đặt tour ngay</button>
      </div>
      <div class="quick-info">
        <div><span>Đánh giá</span>★ ${t.rating} (${t.reviews.toLocaleString('vi-VN')})</div>
        <div><span>Thời lượng</span>${t.duration}</div>
        <div><span>Khởi hành từ</span>${t.from}</div>
        <div><span>Còn lại</span>${d.slots} chỗ</div>
      </div>
      <div class="detail-body">
        <div class="tag-row" style="margin-bottom:12px">${t.tags.map(x => `<span class="tag-chip">${x}</span>`).join('')}</div>
        <div class="tab-bar">${['Lịch trình', 'Bao gồm', 'Bảng giá', 'Chính sách'].map((n, i) => `<button type="button" class="tab-btn${i ? '' : ' is-active'}" data-tab="${i}">${n}</button>`).join('')}</div>
        <div class="tab-panel is-active">
          <h4 class="panel-h">Điểm nổi bật</h4><ul class="hl-list">${li(t.highlights)}</ul>
          <h4 class="panel-h">Lịch trình chi tiết</h4>
          <button type="button" class="acc-head" data-acc>Ngày 1 · ${t.to}<span>▾</span></button>
          <ul class="timeline" id="accBody">${tl}</ul>
          <p class="section-sub">${t.itineraryNote}</p></div>
        <div class="tab-panel">
          <h4 class="panel-h">Bao gồm</h4><ul class="inc-list">${li(t.includes)}</ul>
          <h4 class="panel-h">Không bao gồm</h4><ul class="exc-list">${li(t.excludes)}</ul>
          <h4 class="panel-h">Phương tiện</h4><ul class="note-list">${li(t.vehicle)}</ul>
          <h4 class="panel-h">Tập trung / đón khách</h4><p style="font-size:13.5px">${t.pickup}</p></div>
        <div class="tab-panel"><table class="price-table"><tr><th>Số lượng</th><th>Đơn giá</th><th>Tổng</th></tr>${rows}</table>
          <p class="section-sub">Giá quy đổi ước tính, đã bao gồm thuế.</p></div>
        <div class="tab-panel"><h4 class="panel-h">Điều kiện &amp; chính sách hủy</h4><p style="font-size:13.5px">${DATA.policy}</p>
          <h4 class="panel-h">Lưu ý trước khi đặt</h4><ul class="note-list">${li(t.notes)}</ul></div>
      </div>
      <div class="detail-cta"><span class="section-sub" style="margin:0">Giá từ <strong>${money(t.price)}</strong>/khách</span>
        <button type="button" class="btn-cta" data-book>Đặt tour ngay</button></div>`;
    m.querySelector('[data-x]').onclick = () => close('detailModalOverlay');
    m.querySelectorAll('[data-book]').forEach(b => b.onclick = openBooking);
    m.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
      m.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('is-active', x === b));
      m.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('is-active', i === +b.dataset.tab));
    });
    m.querySelector('[data-acc]').onclick = () => { const b = $('accBody'); b.hidden = !b.hidden; };
    m.scrollTop = 0; open('detailModalOverlay');
  }

  /* ---------- Form đặt tour ---------- */
  function openBooking() {
    const t = current; promo = null;
    $('bookingTourName').textContent = t.name;
    $('bookingRoute').textContent = `${t.from} → ${t.to}`;
    $('bookingMeta').textContent = `Thời lượng: ${t.duration}`;
    $('bookingPrice').innerHTML = `${money(t.price)}<small>/khách</small>`;
    $('departureDate').innerHTML = t.departures.map((d, i) => `<option value="${i}">${dateVN(d.date)} · ${d.time} (còn ${d.slots} chỗ)</option>`).join('');
    $('bookingForm').reset(); $('ticketQty').max = t.departures[0].slots;
    $('sumPromoRow').style.display = 'none'; calc(); open('bookingModalOverlay');
  }

  function calc() {
    const q = Math.max(1, +$('ticketQty').value || 1), sub = current.price * q;
    const dis = promo ? Math.round(sub * promo.percent / 100) : 0;
    $('sumBase').textContent = money(sub);
    $('sumPromoRow').style.display = promo ? 'flex' : 'none';
    $('sumPromo').textContent = '-' + money(dis);
    $('totalLabel').textContent = `Tổng tiền (${q} vé)`;
    $('totalAmount').textContent = money(sub - dis);
    return sub - dis;
  }

  function applyPromo() {
    const p = DATA.promoCodes.find(x => x.code === $('promoCode').value.trim().toUpperCase());
    promo = p || null; calc();
    if (!p && $('promoCode').value.trim()) alert('Mã ưu đãi không hợp lệ.');
  }

  function submitBooking(e) {
    e.preventDefault();
    const q = +$('ticketQty').value, d = current.departures[+$('departureDate').value];
    if (!(q >= 1 && q <= d.slots)) { alert(`Số lượng vé phải từ 1 đến ${d.slots}.`); return; }
    $('orderCode').textContent = 'TOUR-' + Math.floor(100000 + Math.random() * 900000);
    $('infoName').textContent = $('renterName').value;
    $('infoEmail').textContent = $('renterEmail').value;
    $('infoService').textContent = current.name;
    $('infoDate').textContent = `${dateVN(d.date)} · ${d.time}`;
    $('infoTotal').textContent = money(calc());
    $('infoPay').textContent = $('payMethod').value;
    close('bookingModalOverlay'); close('detailModalOverlay'); open('successModalOverlay');
    // TODO: gửi đơn lên server / lưu vào module "Kế hoạch của tôi"
  }
})();

/* ---- MODULE CON: HOTEL (dán vào cuối assest/js.js) ---- */
/* Trang Khách sạn: danh sách, lọc, popup chọn phòng, form đặt phòng */
(function () {
  const $ = id => document.getElementById(id);
  const money = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const open = id => $(id).classList.add('is-open');
  const close = id => $(id).classList.remove('is-open');
  const uniq = a => [...new Set(a)];
  const dateVN = d => d.toLocaleDateString('vi-VN');

  let DATA = { hotels: [], promoCodes: [] };
  let state = { type: 'all', city: 'all' };
  let hotel = null, room = null, promo = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('hotelGrid')) return; // chỉ chạy trên trang Khách sạn
    fetch('../../data/hotel.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { DATA = d; init(); })
      .catch(() => { $('hotelGrid').innerHTML = '<div class="car-empty">Không tải được hotel.json. Hãy chạy bằng Live Server / localhost.</div>'; });
  });

  const minRoom = h => h.rooms.reduce((a, b) => (b.price < a.price ? b : a));
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const hasRating = h => h.rating > 0 && h.reviews > 0;
  const media = (h, i, label) => `<div class="media-placeholder" data-label="${label}">${h.images[i] ? `<img src="${h.images[i]}" alt="${h.name}">` : ''}</div>`;

  function init() {
    const H = DATA.hotels;
    $('categoryTabs').innerHTML = '<button class="cat-tab is-active" data-v="all">Tất cả loại hình</button>' +
      uniq(H.map(h => h.type)).map(t => `<button class="cat-tab" data-v="${t}">${t}</button>`).join('');
    $('cityFilter').innerHTML = '<button class="seat-pill is-active" data-v="all">Tất cả địa điểm</button>' +
      uniq(H.map(h => h.city)).map(c => `<button class="seat-pill" data-v="${c}">${c} (${H.filter(h => h.city === c).length})</button>`).join('');

    $('categoryTabs').addEventListener('click', e => pick(e, '.cat-tab', 'type', '#categoryTabs .cat-tab'));
    $('cityFilter').addEventListener('click', e => pick(e, '.seat-pill', 'city', '#cityFilter .seat-pill'));
    $('fSort').addEventListener('change', render);
    $('keyword').addEventListener('input', render);
    $('searchBtn').onclick = render;
    $('resetBtn').onclick = () => {
      $('keyword').value = ''; $('fSort').value = 'popular'; state = { type: 'all', city: 'all' };
      mark('#categoryTabs .cat-tab', document.querySelector('#categoryTabs .cat-tab'));
      mark('#cityFilter .seat-pill', document.querySelector('#cityFilter .seat-pill')); render();
    };
    $('hotelGrid').addEventListener('click', e => { const c = e.target.closest('.hotel-card'); if (c) openDetail(+c.dataset.id); });
    $('closeBookingModal').onclick = () => close('bookingModalOverlay');
    $('closeSuccessModal').onclick = () => close('successModalOverlay');
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('is-open'); }));
    ['nights', 'roomQty', 'checkInDate'].forEach(i => $(i).addEventListener('input', calc));
    $('applyPromo').onclick = applyPromo;
    $('bookingForm').addEventListener('submit', submitBooking);
    $('goToMyTrips').onclick = () => { window.location.href = '../../index.html'; /* TODO: link tới module "Kế hoạch của tôi" */ };
    render();
  }

  function mark(sel, btn) { document.querySelectorAll(sel).forEach(x => x.classList.toggle('is-active', x === btn)); }
  function pick(e, cls, key, sel) {
    const b = e.target.closest(cls); if (!b) return;
    state[key] = b.dataset.v; mark(sel, b); render();
  }

  /* ---------- Lọc + sắp xếp ---------- */
  function filtered() {
    const kw = norm($('keyword').value.trim());
    const list = DATA.hotels.filter(h =>
      (state.type === 'all' || h.type === state.type) &&
      (state.city === 'all' || h.city === state.city) &&
      (!kw || norm(h.name + ' ' + h.city + ' ' + h.address).includes(kw)));
    const by = {
      popular: (a, b) => b.booked - a.booked || b.reviews - a.reviews,
      priceAsc: (a, b) => minRoom(a).price - minRoom(b).price,
      priceDesc: (a, b) => minRoom(b).price - minRoom(a).price,
      az: (a, b) => a.name.localeCompare(b.name, 'vi'),
      za: (a, b) => b.name.localeCompare(a.name, 'vi')
    };
    return list.sort(by[$('fSort').value]);
  }

  function render() {
    const list = filtered();
    $('resultCount').textContent = `Tìm thấy ${list.length} khách sạn phù hợp`;
    $('hotelGrid').innerHTML = list.length ? list.map(h => {
      const r = minRoom(h);
      return `<article class="hotel-card" data-id="${h.id}">
        <div class="hotel-media">
          <span class="hotel-rating">${hasRating(h) ? `★ ${h.rating}<span>/${h.ratingMax} (${h.reviews.toLocaleString('vi-VN')})</span>` : 'Chưa có đánh giá'}</span>
          ${media(h, 0, h.name)}</div>
        <div class="hotel-body">
          <div class="hotel-stars">${stars(h.stars)}<span>${h.type}</span></div>
          <h3 class="hotel-name">${h.name}</h3>
          <p class="hotel-addr">📍 ${h.address}</p>
          <p class="hotel-desc">${h.description}</p>
          <div class="tag-row">${h.keywords.slice(0, 4).map(k => `<span class="tag-chip">${k}</span>`).join('')}</div>
          <div class="hotel-foot">
            <div class="car-price"><span class="label">Giá từ</span>
              ${r.discount ? `<span class="old-price">${money(r.priceOriginal)}</span>` : ''}
              <span class="value">${money(r.price)}<span> /đêm</span></span></div>
            <button type="button" class="btn-quickbook">Chọn phòng →</button></div>
        </div></article>`;
    }).join('') : '<div class="car-empty">Không tìm thấy khách sạn phù hợp. Hãy thử bộ lọc khác.</div>';
  }

  /* ---------- Popup chi tiết + danh sách phòng ---------- */
  function openDetail(id) {
    hotel = DATA.hotels.find(h => h.id === id);
    const h = hotel, li = a => a.map(x => `<li>${x}</li>`).join('');
    const rooms = h.rooms.map((r, i) => ({ r, i })).sort((a, b) => b.r.price - a.r.price); // giá cao → thấp
    const m = $('detailModal');
    m.innerHTML = `
      <button type="button" class="modal-close" data-x>×</button>
      <div class="detail-top"><div style="padding-right:36px"><h2>${h.name}</h2>
        <p class="hotel-meta">📍 ${h.address}</p><p class="hotel-meta">${h.description}</p></div>
        <div class="hotel-score">${hasRating(h) ? `<strong>★ ${h.rating}/${h.ratingMax}</strong>${h.reviews.toLocaleString('vi-VN')} đánh giá` : 'Chưa có đánh giá'}</div></div>
      <div class="detail-body" style="padding-top:14px">
        <div class="tab-bar"><button type="button" class="tab-btn is-active" data-tab="0">Danh sách loại phòng</button>
          <button type="button" class="tab-btn" data-tab="1">Tiện nghi, chính sách &amp; đánh giá</button></div>
        <div class="tab-panel is-active">
          <div class="gallery" style="padding:0">${[0, 1, 2, 3, 4].map(i => media(h, i, i ? 'Ảnh ' + (i + 1) : 'Ảnh chính / 360°')).join('')}</div>
          <div class="room-list">${rooms.map(({ r, i }) => `
            <div class="room-row">
              <div class="media-placeholder" data-label="Ảnh phòng"></div>
              <div><div class="room-name">${r.name}</div>
                <div class="room-info">${r.info} · Tối đa ${r.capacity} người</div>
                <div class="tag-row">${r.amenities.map(a => `<span class="tag-chip">${a}</span>`).join('')}</div></div>
              <div class="room-side">
                ${r.discount ? `<span class="old-price">${money(r.priceOriginal)}</span>` : ''}
                <span class="room-price">${money(r.price)}</span>
                <span class="room-note">/đêm, chưa gồm mã giảm</span>
                <span class="room-left">Còn ${r.left} phòng</span>
                <button type="button" class="btn-quickbook" data-room="${i}">Đặt phòng này</button></div>
            </div>`).join('')}</div></div>
        <div class="tab-panel">
          <h4 class="panel-h">Tiện nghi khách sạn</h4><ul class="inc-list">${li(h.amenities)}</ul>
          <h4 class="panel-h">Chính sách</h4><p style="font-size:13.5px">${h.policy}</p>
          <p style="font-size:13.5px;margin-top:6px">Nhận phòng: <strong>${h.checkIn}</strong> · Trả phòng: <strong>${h.checkOut}</strong></p>
          <h4 class="panel-h">Đánh giá</h4>
          <div class="rating-box">${hasRating(h) ? `<strong>${h.rating}/${h.ratingMax}</strong><span>${h.reviews.toLocaleString('vi-VN')} lượt đánh giá · ${h.booked > 0 ? 'hơn ' + h.booked.toLocaleString('vi-VN') + ' lượt đặt' : ''}</span>` : '<span>Khách sạn chưa có đánh giá.</span>'}</div>
          <p class="section-sub">Nội dung từng review sẽ hiển thị khi có dữ liệu.</p></div>
      </div>`;
    m.querySelector('[data-x]').onclick = () => close('detailModalOverlay');
    m.querySelectorAll('[data-room]').forEach(b => b.onclick = () => openBooking(+b.dataset.room));
    m.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
      m.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('is-active', x === b));
      m.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('is-active', i === +b.dataset.tab));
    });
    m.scrollTop = 0; open('detailModalOverlay');
  }

  /* ---------- Form đặt phòng ---------- */
  function openBooking(i) {
    room = hotel.rooms[i]; promo = null;
    $('bookingForm').reset();
    $('bookingHotel').textContent = hotel.name;
    $('bookingRoom').textContent = `${room.name} · ${room.info}`;
    $('bookingTimes').textContent = `Nhận phòng ${hotel.checkIn} · Trả phòng ${hotel.checkOut}`;
    $('bookingPrice').innerHTML = `${money(room.price)}<small>/đêm</small>`;
    const today = new Date().toISOString().slice(0, 10);
    $('checkInDate').min = today; $('checkInDate').value = today;
    $('nights').value = '2'; $('roomQty').max = room.left; $('guestQty').max = room.capacity;
    $('sumPromoRow').style.display = 'none'; calc(); open('bookingModalOverlay');
  }

  function calc() {
    const n = +$('nights').value, q = Math.max(1, +$('roomQty').value || 1);
    const sub = room.price * n * q, dis = promo ? Math.round(sub * promo.percent / 100) : 0;
    $('sumLabel').textContent = `Tạm tính (${q} phòng × ${n} đêm)`;
    $('sumBase').textContent = money(sub);
    $('sumPromoRow').style.display = promo ? 'flex' : 'none';
    $('sumPromo').textContent = '-' + money(dis);
    $('totalAmount').textContent = money(sub - dis);
    $('confirmBtn').textContent = `Hoàn Tất Đặt Chỗ (${money(sub - dis)})`;
    return sub - dis;
  }

  function applyPromo() {
    const p = DATA.promoCodes.find(x => x.code === $('promoCode').value.trim().toUpperCase());
    promo = p || null; calc();
    if (!p && $('promoCode').value.trim()) alert('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
  }

  function submitBooking(e) {
    e.preventDefault();
    const q = +$('roomQty').value, g = +$('guestQty').value, n = +$('nights').value;
    if (!(q >= 1 && q <= room.left)) { alert(`Số phòng phải từ 1 đến ${room.left}.`); return; }
    if (!(g >= 1 && g <= room.capacity * q)) { alert(`Tối đa ${room.capacity * q} khách cho ${q} phòng này.`); return; }
    const inD = new Date($('checkInDate').value), outD = new Date(inD); outD.setDate(outD.getDate() + n);
    $('orderCode').textContent = 'HOTEL-' + Math.floor(100000 + Math.random() * 900000);
    $('infoName').textContent = $('renterName').value;
    $('infoEmail').textContent = $('renterEmail').value;
    $('infoService').textContent = `${hotel.name} - ${room.name}`;
    $('infoStay').textContent = `${dateVN(inD)} ${hotel.checkIn} → ${dateVN(outD)} ${hotel.checkOut} (${n} đêm, ${q} phòng)`;
    $('infoTotal').textContent = money(calc());
    $('infoPay').textContent = $('payMethod').value;
    close('bookingModalOverlay'); close('detailModalOverlay'); open('successModalOverlay');
    // TODO: gửi đơn lên server / lưu vào module "Kế hoạch của tôi"
  }
})();