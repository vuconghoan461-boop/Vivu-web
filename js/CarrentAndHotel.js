/* PHẦN DÙNG CHUNG: header, footer, menu mobile, hàm hỗ trợ, popup */
document.addEventListener("DOMContentLoaded", async function () {
  // Load header + footer
  const parts = [
    ["site-header", "header.html"],
    ["site-footer", "footer.html"]
  ];
  for (const [id, file] of parts) {
    const el = document.getElementById(id);
    if (!el) continue;
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error("Không thể tải " + file);
      el.innerHTML = await res.text();
    } catch (err) {
      console.error("Lỗi khi tải " + file + ":", err);
    }
  }
  // Menu điều hướng mobile (header vừa được nạp xong nên query được)
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
});
/* Mở / đóng popup (dùng chung cho mọi popup) */
function openModal(overlayId) {
  document.getElementById(overlayId).classList.add("is-open");
}
function closeModal(overlayId) {
  document.getElementById(overlayId).classList.remove("is-open");
}

/*JS CỦA MODULE CON: CARRENT*/
let CARS = [];
let currentCarId = null;
let promoApplied = false;

/* Khởi tạo carrent */
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("carGrid")) return;

  initFilterBar();
  initToolbar();
  initModals();
  initBookingForm();

  // Đường dẫn tính từ web page/service/CarRent.html -> data/CarRent.json
  fetch("../../data/CarRent.json")
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(data => {
      // Giá sau giảm = giá gốc × (1 − %giảm / 100)
      CARS = data.map(c => {
        const original = c.priceOriginal || c.price;
        const discount = Number(c.discount) || 0;
        return {
          ...c,
          priceOriginal: original,
          discount: discount,
          price: Math.round(original * (1 - discount / 100))
        };
      });
      filterAndRender();
    })
    .catch(err => {
      console.error("Lỗi tải CarRent.json:", err);
      document.getElementById("carGrid").innerHTML =
        '<div class="empty-message">Không tải được dữ liệu xe. Hãy chạy bằng Live Server / localhost.</div>';
    });
});

/* Trạng thái bộ lọc */
const state = {
  vehicleType: "oto",
  category: "all",
  seat: "all",
  city: "Tất cả"
};

function formatCurrency(n) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

/* Bỏ dấu + hạ chữ thường để gõ "cau giay" vẫn khớp "Cầu Giấy" */
function normCar(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").toLowerCase().trim();
}

/* Ô trống => khớp hết. Có chữ => phải khớp 1 địa điểm trong danh sách.
   (Thành phố đã có bộ lọc riêng nên không so với city ở đây) */
function matchPlace(list, keyword) {
  const k = normCar(keyword);
  if (!k) return true;
  return (list || []).some(p => normCar(p).includes(k));
}

/* Hiển thị danh sách xe */
function carCardHTML(car) {
  const image = car.image
    ? `<img src="../../assets/cars/${car.image}" alt="${car.name}" onerror="this.remove()">`
    : "";
  const discountTag = car.discount
    ? `<span class="car-discount-tag"><small>GIẢM</small><strong>${car.discount}%</strong></span>`
    : "";
  const oldPrice = car.discount
    ? `<span class="price-old">${formatCurrency(car.priceOriginal)}</span>`
    : "";
  const featuresHTML = car.features.map(f => `<li>${f}</li>`).join("");
  return `
    <article class="car-card" data-id="${car.id}">
      <div class="car-media">
         ${discountTag}
        <div class="image-box" data-label="${car.name}">${image}</div>
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
          <div><span class="spec-label">Chỗ ngồi: </span><span class="spec-value">${car.seats} chỗ</span></div>
          <div><span class="spec-label">Hộp số: </span><span class="spec-value">${car.transmission}</span></div>
          <div><span class="spec-label">Nhiên liệu: </span><span class="spec-value">${car.fuel}</span></div>
        </div>
        <ul class="car-features">${featuresHTML}</ul>
        <div class="car-foot">
          <div class="price-box">
            <span class="price-label">Giá thuê</span>
             ${oldPrice}
            <span class="price-value">${formatCurrency(car.price)} <span>${car.priceUnit}</span></span>
          </div>
          <button type="button" class="btn-book" data-id="${car.id}">Đặt xe nhanh</button>
        </div>
      </div>
    </article>
  `;
}

function filterAndRender() {
  // Điểm nhận: so với pickupLocations trong JSON
  const pickup = document.getElementById("pickupLocation").value;
  // Điểm trả: so với dropoffLocations; bỏ tick "Trả xe tại địa điểm khác" => không lọc điểm trả
  const dropoff = document.getElementById("diffLocation").checked
    ? document.getElementById("dropoffLocation").value
    : "";

  const list = CARS.filter(car => {
    if (car.category !== state.vehicleType) return false;
    if (state.city !== "Tất cả" && car.city !== state.city) return false;
    if (state.seat !== "all" && String(car.seats) !== String(state.seat)) return false;
    if (!matchPlace(car.pickupLocations, pickup)) return false;    // điểm nhận
    if (!matchPlace(car.dropoffLocations, dropoff)) return false;  // điểm trả
    return true;
  });

  const sortType = document.getElementById("Sort").value;
  list.sort((a, b) => {
    if (sortType === "priceAsc")  return a.price - b.price;
    if (sortType === "priceDesc") return b.price - a.price;
    if (sortType === "az") return a.name.localeCompare(b.name, "vi");
    if (sortType === "za") return b.name.localeCompare(a.name, "vi");
    return b.reviews - a.reviews;   // mặc định: phổ biến nhất
  });

  const grid = document.getElementById("carGrid");
  const resultCount = document.getElementById("resultCount");

  grid.innerHTML = list.length
    ? list.map(carCardHTML).join("")
    : `<div class="empty-message">Không tìm thấy xe phù hợp. Vui lòng thử bộ lọc khác.</div>`;
  resultCount.textContent = `Tìm thấy ${list.length} xe phù hợp`;
}

/* Thanh filter hàng 1 */
function initFilterBar() {
  const diffLocation = document.getElementById("diffLocation");
  const dropoffField = document.getElementById("dropoffField");
  const pickupLocation = document.getElementById("pickupLocation");
  const dropoffLocation = document.getElementById("dropoffLocation");
  const vehicleToggle = document.getElementById("vehicleTypeToggle");
  const searchBtn = document.getElementById("searchCarsBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Tick ô box ẩn/hiện điểm trả
  function syncDropoffVisibility() {
    dropoffField.style.display = diffLocation.checked ? "flex" : "none";
  }
  diffLocation.addEventListener("change", () => {
    syncDropoffVisibility();
    filterAndRender();
  });
  syncDropoffVisibility();

  // Lọc ngay khi gõ địa điểm
  [pickupLocation, dropoffLocation].forEach(inp =>
    inp.addEventListener("input", filterAndRender)
  );

  // Chọn Ô tô / Xe máy
  vehicleToggle.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      vehicleToggle.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.vehicleType = btn.dataset.type;

      // Đổi loại xe thì bỏ lọc số chỗ cũ (xe máy không có loại 5 chỗ...)
      state.seat = "all";
      document.querySelectorAll(".filter-pill").forEach(b => {
        b.classList.toggle("is-active", b.dataset.seat === "all");
      });
      filterAndRender();
    });
  });

  // Nút Tìm kiếm
  searchBtn.addEventListener("click", () => {
    filterAndRender();
    document.getElementById("resultCount").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Nút Xoá lọc: xoá chữ đã gõ, rồi bấm lại nút đầu tiên của mỗi nhóm (Ô tô, Tất cả, Tất cả địa điểm)
  resetBtn.addEventListener("click", () => {
    pickupLocation.value = "";
    dropoffLocation.value = "";
    document.getElementById("Sort").value = "popular";
    diffLocation.checked = true;
    syncDropoffVisibility();
    vehicleToggle.querySelector(".toggle-btn").click();
    document.querySelector("#seatFilter .filter-pill").click();
    document.querySelector("#locationDropdown button").click();
  });
}

/* Thanh filter hàng 2 */
function initToolbar() {
  const locationSelect = document.getElementById("locationSelect");
  const locationDropdown = document.getElementById("locationDropdown");
  const locationLabel = document.getElementById("locationLabel");
  locationLabel.textContent = locationDropdown.querySelector("button").textContent;

  document.getElementById("Sort").addEventListener("change", filterAndRender);

  locationSelect.addEventListener("click", (e) => {
    e.stopPropagation();
    locationDropdown.classList.toggle("is-open");
  });

  locationDropdown.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();   // không cho sự kiện nổi lên locationSelect, tránh danh sách mở lại
      state.city = btn.dataset.city;
      locationLabel.textContent = btn.textContent;
      locationDropdown.querySelectorAll("button").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      locationDropdown.classList.remove("is-open");

      // Địa điểm đã gõ thuộc thành phố cũ nên xoá đi
      document.getElementById("pickupLocation").value = "";
      document.getElementById("dropoffLocation").value = "";
      filterAndRender();
    });
  });
  document.addEventListener("click", () => locationDropdown.classList.remove("is-open"));

  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.seat = btn.dataset.seat;
      filterAndRender();
    });
  });
}

/* ---------------- Popup chi tiết thuê xe ---------------- */
function openCarDetail(carId) {
  const car = CARS.find(c => c.id === Number(carId));
  if (!car) return;

  const image = car.image
    ? `<img src="../../assets/cars/${car.image}" alt="${car.name}" onerror="this.remove()">`
    : "";
  const oldPrice = car.discount
    ? `<div class="price-old-row">
         <span class="price-old">${formatCurrency(car.priceOriginal)}</span>
         <span class="discount-badge">-${car.discount}%</span>
       </div>`
    : "";

  document.getElementById("carDetailModal").innerHTML = `
    <button type="button" class="modal-close" onclick="closeModal('carDetailOverlay')">×</button>

    <div class="detail-header">
      <h2>${car.name}</h2>
      <p class="detail-address">Đơn vị cho thuê: ${car.provider}</p>
    </div>

    <div class="detail-body" style="padding-top:14px">
      <div class="car-detail-top">
        <div class="image-box" data-label="${car.name}">${image}</div>
        <div>
          <h4>Thông số</h4>
          <table class="amenity-table">
            <tr><th>Số chỗ ngồi</th><td>${car.seats} chỗ</td></tr>
            <tr><th>Hộp số</th><td>${car.transmission}</td></tr>
            <tr><th>Nhiên liệu</th><td>${car.fuel}</td></tr>
            <tr><th>Tiện ích</th><td>${(car.features || []).join(", ")}</td></tr>
          </table>
        </div>
      </div>

      <h4 class="car-detail-title">Chính sách thuê xe</h4>
      <p class="policy-text">${car.policy}</p>

      <div class="car-detail-foot">
        <div class="price-box">
          <span class="price-label">Giá thuê</span>
          ${oldPrice}
          <span class="price-value">${formatCurrency(car.price)} <span>${car.priceUnit}</span></span>
        </div>
        <button type="button" class="btn-book"
          onclick="closeModal('carDetailOverlay'); openBookingModal(${car.id})">Đặt xe nhanh</button>
      </div>
    </div>`;

  document.getElementById("carDetailModal").scrollTop = 0;
  openModal("carDetailOverlay");
}

/* ---------------- Form điền thông tin đặt xe ---------------- */
function openBookingModal(carId) {
  const car = CARS.find(c => c.id === Number(carId));
  if (!car) return;
  currentCarId = car.id;
  promoApplied = false;

  document.getElementById("bookingForm").reset();
  document.getElementById("bookingCarName").textContent = car.name;
  document.getElementById("bookingProvider").textContent = `Đơn vị cung cấp: ${car.provider}`;
  document.getElementById("bookingPerks").textContent = car.perks;
  document.getElementById("bookingPricePerDay").innerHTML =
    `${formatCurrency(car.price)}<small>${car.priceUnit}</small>`;

  // Điền sẵn chữ khách đã gõ ở thanh tìm kiếm (vẫn là ô tự điền, sửa được)
  document.getElementById("pickupPlace").value =
    document.getElementById("pickupLocation").value.trim();
  document.getElementById("dropoffPlace").value =
    document.getElementById("diffLocation").checked
      ? document.getElementById("dropoffLocation").value.trim()
      : "";

  document.getElementById("rentalDays").value = "2";
  document.getElementById("bookingPickupDate").value = new Date().toISOString().slice(0, 10);

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
  const subtotal = base + driverFee;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;

  document.getElementById("sumBase").textContent = formatCurrency(base);
  document.getElementById("sumDriverRow").style.display = withDriver ? "flex" : "none";
  document.getElementById("sumDriver").textContent = formatCurrency(driverFee);
  document.getElementById("sumPromoRow").style.display = promoApplied ? "flex" : "none";
  document.getElementById("sumPromo").textContent = "-" + formatCurrency(discount);
  document.getElementById("totalLabel").textContent = `Tổng tiền (${days} ngày)`;
  document.getElementById("totalAmount").textContent = formatCurrency(subtotal - discount);
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

    closeBookingModal();
    openSuccessModal({
      name: document.getElementById("renterName").value.trim(),
      phone: document.getElementById("renterPhone").value.trim(),
      service: car.name,
      pickup: document.getElementById("pickupPlace").value.trim(),
      dropoff: document.getElementById("dropoffPlace").value.trim(),
      total: document.getElementById("totalAmount").textContent
    });
  });
}

/* Modal thành công */
function openSuccessModal(info) {
  const code = "CAR-" + Math.floor(100000 + Math.random() * 900000);
  document.getElementById("orderCode").textContent = code;
  document.getElementById("infoName").textContent = info.name;
  document.getElementById("infoPhone").textContent = info.phone;
  document.getElementById("infoService").textContent = info.service;
  document.getElementById("infoPickup").textContent = info.pickup;
  document.getElementById("infoDropoff").textContent = info.dropoff;
  document.getElementById("infoTotal").textContent = info.total;
  document.getElementById("successModalOverlay").classList.add("is-open");
}

function closeSuccessModal() {
  document.getElementById("successModalOverlay").classList.remove("is-open");
}

/* Khởi tạo chung các form */
function initModals() {
  document.getElementById("closeBookingModal").addEventListener("click", closeBookingModal);
  document.getElementById("closeSuccessModal").addEventListener("click", closeSuccessModal);

  document.getElementById("bookingModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "bookingModalOverlay") closeBookingModal();
  });
  document.getElementById("successModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "successModalOverlay") closeSuccessModal();
  });

  document.getElementById("goToMyTrips").addEventListener("click", () => {
    closeSuccessModal();
    // TODO: đổi sang đường dẫn thật của module "Lịch của tôi" khi có
    // window.location.href = "lich-cua-toi.html";
  });

  // Event delegation cho nút "Đặt xe nhanh" trong grid
    document.getElementById("carGrid").addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-book");
      if (btn) { openBookingModal(btn.dataset.id); return; }

      const card = e.target.closest(".car-card");
      if (card) openCarDetail(card.dataset.id);
    });

    // Bấm ra vùng tối để đóng popup chi tiết
    document.getElementById("carDetailOverlay").addEventListener("click", (e) => {
      if (e.target.id === "carDetailOverlay") closeModal("carDetailOverlay");
    });
}


/* JS MODULE CON: HOTEL */
let HOTELS = [];
let PROMOS = [];
let currentHotel = null;
let currentRoom = null;

// Bộ lọc đang chọn
const filters = { city: "all", type: "all" };

/* ---------- Hàm hỗ trợ nhỏ ---------- */
function money(n) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

// Bỏ dấu để gõ "ha noi" vẫn tìm ra "Hà Nội"
function removeAccent(text) {
  return text.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

// Phòng rẻ nhất của khách sạn (dùng cho "Giá từ" và sắp xếp)
function getCheapestRoom(hotel) {
  return hotel.rooms.reduce((min, r) => (r.price < min.price ? r : min), hotel.rooms[0]);
}

// Có ảnh thì hiện ảnh, chưa có thì hiện khung sọc xanh
const HOTEL_IMG_PATH = "../../assets/hotels/";
function imageHTML(hotel, index, label) {
  const file = hotel.images[index];
  const img = file
    ? `<img src="${HOTEL_IMG_PATH}${file}" alt="${hotel.name}" onerror="this.remove()">`
    : "";
  return `<div class="image-box" data-label="${label}">${img}</div>`;
}

/* ---------- 2. TẢI DỮ LIỆU ---------- */
function loadHotels() {
  fetch("../../data/hotel.json")
    .then(res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(data => {
      HOTELS = data.Hotels;
      PROMOS = data.promoCodes;

      // Giá sau giảm = giá gốc × (1 − %giảm / 100), tính riêng cho từng phòng
      HOTELS.forEach(h => {
        h.discount = Number(h.discount) || 0;
        h.rooms.forEach(r => {
          r.discount = h.discount;
          r.price = Math.round(r.priceOriginal * (1 - r.discount / 100));
        });
      });

      renderHotels();
    });
}

/* ---------- 3. TÌM KIẾM + LỌC + SẮP XẾP ---------- */
function getFilteredHotels() {
  const keyword = removeAccent(document.getElementById("keyword").value.trim());
  const sortType = document.getElementById("Sort").value;

  const list = HOTELS.filter(h => {
    const text = removeAccent(h.name + " " + h.city + " " + h.address);
    return (filters.city === "all" || h.city === filters.city)
        && (filters.type === "all" || h.type === filters.type)
        && text.includes(keyword);
  });

  list.sort((a, b) => {
    if (sortType === "priceAsc")  return getCheapestRoom(a).price - getCheapestRoom(b).price;
    if (sortType === "priceDesc") return getCheapestRoom(b).price - getCheapestRoom(a).price;
    if (sortType === "az") return a.name.localeCompare(b.name, "vi");
    if (sortType === "za") return b.name.localeCompare(a.name, "vi");
    return b.reviews - a.reviews;   // mặc định: phổ biến nhất
  });

  return list;
}

// Bấm 1 nút trong nhóm pill -> đổi màu active + lưu bộ lọc
function setupPillGroup(groupId, key, dataName) {
  const buttons = document.querySelectorAll(`#${groupId} .filter-pill`);
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      filters[key] = btn.dataset[dataName];
      renderHotels();
    });
  });
}

function resetFilters() {
  document.getElementById("keyword").value = "";
  document.getElementById("Sort").value = "popular";
  document.querySelector("#cityFilter .filter-pill").click();       // nút "Tất cả địa điểm"
  document.querySelector("#categoryHotels .filter-pill").click();   // nút "Tất cả loại hình"
}

/* ---------- 4. DANH SÁCH KHÁCH SẠN ---------- */
function hotelCardHTML(hotel) {
  const room = getCheapestRoom(hotel);
  const stars = "★".repeat(hotel.stars) + "☆".repeat(5 - hotel.stars);

  const ratingText = hotel.reviews > 0
    ? `★ ${hotel.rating}<span>/${hotel.ratingMax} (${hotel.reviews.toLocaleString("vi-VN")})</span>`
    : "Chưa có đánh giá";

  const oldPrice = room.discount
    ? `<span class="price-old-row">
         <span class="price-old">${money(room.priceOriginal)}</span>
         <span class="discount-badge">-${room.discount}%</span>
       </span>`
    : "";

  const tags = hotel.keywords.slice(0, 4).map(k => `<span class="tag">${k}</span>`).join("");

  return `
    <article class="hotel-card" data-id="${hotel.id}">
      <div class="hotel-media">
        <span class="hotel-rating">${ratingText}</span>
        ${imageHTML(hotel, 0, hotel.name)}
      </div>
      <div class="hotel-body">
        <div class="hotel-stars">${stars}<span>${hotel.type}</span></div>
        <h3 class="hotel-name">${hotel.name}</h3>
        <p class="hotel-addr">${hotel.address}</p>
        <p class="hotel-desc">${hotel.description}</p>
        <div class="tag-list">${tags}</div>
        <div class="hotel-foot">
          <div class="price-box">
            <span class="price-label">Giá từ</span>
            ${oldPrice}
            <span class="price-value">${money(room.price)}<span> /đêm</span></span>
          </div>
          <button type="button" class="btn-book">Đặt phòng ngay</button>
        </div>
      </div>
    </article>`;
}

function renderHotels() {
  const list = getFilteredHotels();
  const grid = document.getElementById("hotelGrid");

  grid.innerHTML = list.length
    ? list.map(hotelCardHTML).join("")
    : '<div class="empty-message">Không tìm thấy khách sạn phù hợp. Hãy thử bộ lọc khác.</div>';

  document.getElementById("resultCount").textContent = `Tìm thấy ${list.length} khách sạn phù hợp`;
}

/* ---------- 5. POPUP CHI TIẾT KHÁCH SẠN ---------- */
function openHotelDetail(hotelId) {
  const hotel = HOTELS.find(h => h.id === hotelId);
  if (!hotel) return;
  currentHotel = hotel;

  const roomsHTML = hotel.rooms.map((room, index) => {
    const oldPrice = room.discount
      ? `<div class="price-old-row">
          <span class="price-old">${money(room.priceOriginal)}</span>
          <span class="discount-badge">-${room.discount}%</span>
        </div>`
      : "";

    const amenities = room.amenities
      .map(a => `<span class="tag">${a}</span>`).join("");
    const roomImg = room.image
      ? `<img src="${HOTEL_IMG_PATH}${room.image}" alt="${room.name}" onerror="this.remove()">`
      : "";

    return `
      <div class="room-row">
        <div class="image-box" data-label="Ảnh phòng">${roomImg}</div>

        <div>
          <div class="room-name">${room.name}</div>
          <div class="room-info">${room.info} · Tối đa ${room.capacity} người</div>
          <div class="tag-list">${amenities}</div>
        </div>

        <div class="room-side">
          ${oldPrice}
          <div class="room-price-line">
            <span class="room-price">${money(room.price)}</span>
            <span class="room-note">/đêm</span>
          </div>
          <button type="button" class="btn-book" onclick="openBooking(${index})">Đặt phòng này</button>
        </div>
      </div>`;
  }).join("");

  document.getElementById("detailModal").innerHTML = `
    <button type="button" class="modal-close" onclick="closeModal('detailModalOverlay')">×</button>

    <div class="detail-header">
      <div>
        <h2>${hotel.name}</h2>
        <p class="detail-address">${hotel.address}</p>
        <p class="detail-desc">${hotel.description}</p>
      </div>
    </div>

    <div class="detail-body" style="padding-top:14px">
      <div class="hotel-gallery" style="padding:0">
        ${imageHTML(hotel, 0, "Ảnh minh họa")}
        ${imageHTML(hotel, 1, "Ảnh minh họa")}
        ${imageHTML(hotel, 2, "Ảnh minh họa")}
      </div>

      <div class="tab-list" style="margin-top:14px">
        <button type="button" class="tab-button is-active" onclick="switchTab(this, 'tabRooms')">Danh sách phòng</button>
        <button type="button" class="tab-button" onclick="switchTab(this, 'tabInfo1')">Chi tiết tiện ích</button>
        <button type="button" class="tab-button" onclick="switchTab(this, 'tabInfo2')">Chính sách</button>
      </div>

      <div class="tab-content is-active" id="tabRooms">
        <div class="room-list">${roomsHTML}</div>
      </div>

        <div class="tab-content" id="tabInfo1">
          <h4>Tiện nghi khách sạn</h4>
          <table class="amenity-table">
            ${hotel.amenities.map(a => `<tr><th>${a.group}</th><td>${a.items}</td></tr>`).join("")}
          </table>
        </div>

       <div class="tab-content" id="tabInfo2">
          <h4>Chi tiết chính sách lưu trú:</h4>
          <p class="policy-text" style ="text-align: justify">${hotel.policy}</p>
        </div>
    </div>`;

  document.getElementById("detailModal").scrollTop = 0;
  openModal("detailModalOverlay");
}

function switchTab(btn, panelId) {
  const modal = document.getElementById("detailModal");
  modal.querySelectorAll(".tab-button").forEach(b => b.classList.remove("is-active"));
  modal.querySelectorAll(".tab-content").forEach(p => p.classList.remove("is-active"));

  btn.classList.add("is-active");
  document.getElementById(panelId).classList.add("is-active");
}

/* ---------- 6. POPUP FORM ĐẶT PHÒNG ---------- */
function openBooking(roomIndex) {
  currentRoom = currentHotel.rooms[roomIndex];
  document.getElementById("bookingForm").reset();
  document.getElementById("bookingHotel").textContent = currentHotel.name;
  document.getElementById("bookingRoom").textContent = `${currentRoom.name} · ${currentRoom.info}`;
  document.getElementById("bookingPrice").innerHTML = `${money(currentRoom.price)}<small>/đêm</small>`;

  // Ngày hôm nay theo giờ máy (tránh lệch múi giờ)
  const now = new Date();
  const today = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById("checkInDate").min = today;
  document.getElementById("checkInDate").value = today;
  document.getElementById("roomQty").max = currentRoom.left;

  updateHotelSummary();
  openModal("bookingModalOverlay");
}

// Tiền = giá phòng × số đêm × số phòng
function updateHotelSummary() {
  const nights = Number(document.getElementById("nights").value);
  const rooms = Math.max(1, Number(document.getElementById("roomQty").value) || 1);
  const total = currentRoom.price * nights * rooms;

  document.getElementById("sumLabel").textContent = `Tạm tính (${rooms} phòng × ${nights} đêm)`;
  document.getElementById("sumBase").textContent = money(total);
  document.getElementById("totalAmount").textContent = money(total);
  document.getElementById("confirmBtn").textContent = `Hoàn Tất Đặt Chỗ (${money(total)})`;
  return total;
}

function applyPromo() {
  const code = document.getElementById("promoCode").value.trim().toUpperCase();
  const promo = PROMOS.find(p => p.code === code);

  promoPercent = promo ? promo.percent : 0;
  if (!promo && code !== "") alert("Mã ưu đãi không hợp lệ hoặc đã hết hạn.");
  updateHotelSummary();
}

function submitBooking(e) {
  e.preventDefault();   // không cho trang tải lại

  const rooms = Number(document.getElementById("roomQty").value);
  const guests = Number(document.getElementById("guestQty").value);
  const nights = Number(document.getElementById("nights").value);

  if (rooms < 1 || rooms > currentRoom.left) {
    alert(`Số phòng phải từ 1 đến ${currentRoom.left}.`);
    return;
  }
  if (guests < 1 || guests > currentRoom.capacity * rooms) {
    alert(`Tối đa ${currentRoom.capacity * rooms} khách cho ${rooms} phòng này.`);
    return;
  }

  // 7. Điền thông tin vào popup thành công
  const checkIn = new Date(document.getElementById("checkInDate").value);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);

  document.getElementById("orderCode").textContent = "HOTEL-" + Math.floor(100000 + Math.random() * 900000);
  document.getElementById("infoName").textContent = document.getElementById("renterName").value.trim();
  document.getElementById("infoEmail").textContent = document.getElementById("renterEmail").value.trim();
  document.getElementById("infoService").textContent = `${currentHotel.name} - ${currentRoom.name}`;
  document.getElementById("infoStay").textContent =
    `${checkIn.toLocaleDateString("vi-VN")} → ${checkOut.toLocaleDateString("vi-VN")} (${nights} đêm, ${rooms} phòng)`;
  document.getElementById("infoTotal").textContent = money(updateHotelSummary());
  document.getElementById("infoPay").textContent = document.getElementById("payMethod").value;

  closeModal("bookingModalOverlay");
  closeModal("detailModalOverlay");
  openModal("successModalOverlay");
  // TODO: gửi đơn lên server / lưu vào "Kế hoạch của tôi"
}

/* ---------- 7. MỞ / ĐÓNG POPUP (dùng chung cho cả 3 popup) ---------- */
function openModal(overlayId) {
  document.getElementById(overlayId).classList.add("is-open");
}
function closeModal(overlayId) {
  document.getElementById(overlayId).classList.remove("is-open");
}

/* ---------- 8. GẮN SỰ KIỆN KHI TRANG TẢI XONG ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Chỉ chạy ở trang hotel
  if (!document.getElementById("hotelGrid")) return;

  // Thanh tìm kiếm
  document.getElementById("keyword").addEventListener("input", renderHotels);
  document.getElementById("searchhotelBtn").addEventListener("click", renderHotels);
  document.getElementById("resetBtn").addEventListener("click", resetFilters);

  // Lọc thành phố, loại hình, sắp xếp
  setupPillGroup("cityFilter", "city", "city");
  setupPillGroup("categoryHotels", "type", "category");
  document.getElementById("Sort").addEventListener("change", renderHotels);

  // Bấm vào thẻ khách sạn -> mở popup chi tiết
  document.getElementById("hotelGrid").addEventListener("click", e => {
    const card = e.target.closest(".hotel-card");
    if (card) openHotelDetail(Number(card.dataset.id));
  });

  // Form đặt phòng
  document.getElementById("nights").addEventListener("change", updateHotelSummary);
  document.getElementById("roomQty").addEventListener("input", updateHotelSummary);
  document.getElementById("applyPromo").addEventListener("click", applyPromo);
  document.getElementById("bookingForm").addEventListener("submit", submitBooking);

  // Đóng popup: nút × và bấm ra vùng tối
  document.getElementById("closeBookingModal").addEventListener("click", () => closeModal("bookingModalOverlay"));
  document.getElementById("closeSuccessModal").addEventListener("click", () => closeModal("successModalOverlay"));
  ["detailModalOverlay", "bookingModalOverlay", "successModalOverlay"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => {
      if (e.target.id === id) closeModal(id);
    });
  });

  document.getElementById("goToMyTrips").addEventListener("click", () => {
    window.location.href = "../../index.html";   // TODO: đổi sang trang "Kế hoạch của tôi"
  });

  // Cuối cùng: tải dữ liệu
  loadHotels();
});