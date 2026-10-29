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
/*----------Voucher--------*/
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


/* JSS CỦA MODULE CON: CARRENT */
let CARS = [];
let currentCarId = null;
let promoApplied = false;
/*Khởi tạo carren*/
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("carGrid")) return;  
 
  initFilterBar();
  initToolbar();
  initModals();
  initBookingForm();
 
  // Đường dẫn tính từ web page/service/CarRent.html -> data/CarRent.json
  fetch("../../data/CarRent.json")
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(data => { CARS = data; filterAndRender(); })
    .catch(err => {
      console.error("Lỗi tải CarRent.json:", err);
      document.getElementById("carGrid").innerHTML =
        '<div class="car-empty">Không tải được dữ liệu xe. Hãy chạy bằng Live Server / localhost.</div>';
    });
});

/* Nhóm loại phương tiện: dùng cho "Ô tô / Xe máy" ở thanh filter chung */
const TYPE_MAP = { oto: "oto", xemay: "xemay" };
const state = {
  vehicleType: "oto",
  category: "all",
  seat: "all",
  city: "Tất cả"
};

function formatCurrency(n) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}
/* Hiển thị danh sách xe*/
function carCardHTML(car) {
  // Có trường "image" trong JSON thì hiện ảnh, không có thì giữ khung sọc xanh
  const image = car.image
    ? `<img src="../../assest/images/cars/${car.image}" alt="${car.name}" onerror="this.remove()">`
    : "";
  const featuresHTML = car.features.map(f => `<li>${f}</li>`).join("");
  return `
    <article class="car-card">
      <div class="car-media">
        <div class="media-placeholder" data-label="${car.name}">${image}</div>
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
          <div class="car-price">
            <span class="label">Giá thuê</span>
            <span class="value">${formatCurrency(car.price)} <span>${car.priceUnit}</span></span>
          </div>
          <button type="button" class="btn-quickbook" data-id="${car.id}">Đặt xe nhanh</button>
        </div>
      </div>
    </article>
  `;
}

function filterAndRender() {
  //Gán giá trị từ ô nhập điểm nhận và trả xe
    const pickup = document.getElementById("pickupLocation").value.trim().toLowerCase();
    const dropoff = document.getElementById("diffLocation").checked
      ? document.getElementById("dropoffLocation").value.trim().toLowerCase(): "";
  //Lấy data
  const list = CARS.filter(car => {
    const place = (car.city + " " + (car.locations || []).join(" ")).toLowerCase();
    if (car.category !== state.vehicleType) return false;
    if (state.city !== "Tất cả" && car.city !== state.city) return false;
    if (state.seat !== "all" && String(car.seats) !== String(state.seat)) return false;
    if (!place.includes(pickup)) return false;
    if (!place.includes(dropoff)) return false;
    return true;
  });

  const grid = document.getElementById("carGrid");
  const resultCount = document.getElementById("resultCount");

  if (list.length === 0) {
    grid.innerHTML = `<div class="car-empty">Không tìm thấy xe phù hợp. Vui lòng thử bộ lọc khác.</div>`;
  } 
  else {
    grid.innerHTML = list.map(carCardHTML).join("");
  }
  resultCount.textContent = `Tìm thấy ${list.length} xe phù hợp`;
}

/*Thanh filter hàng 1 */
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

  //Tick ô box ẩn/hiển điểm trả nhận
  function syncDropoffVisibility() {
    if (diffLocation.checked) {
      dropoffField.style.display = "flex";
    } 
    else {
      dropoffField.style.display = "none";
    }
  }
 diffLocation.addEventListener("change", syncDropoffVisibility);
  syncDropoffVisibility();

  // Chọn Ô tô / Xe máy
  vehicleToggle.querySelectorAll(".seg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      vehicleToggle.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.vehicleType = btn.dataset.type;
 
      // Đổi loại xe thì bỏ lọc số chỗ cũ (xe máy không có loại 5 chỗ...)
      state.seat = "all";
      document.querySelectorAll(".seat-pill").forEach(b => {
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
 
  // Nút Xoá lọc: xoá chữ đã gõ, rồi bấm lại nút đầu tiên của mỗi nhóm (Ô tô, Tất cả, Hà Nội)
  resetBtn.addEventListener("click", () => {
    pickupLocation.value = "";
    dropoffLocation.value = "";
    diffLocation.checked = true;
    syncDropoffVisibility();
    vehicleToggle.querySelector(".seg-btn").click();
    document.querySelector("#seatFilter .seat-pill").click();
    document.querySelector("#locationDropdown button").click();
  });
}

/* Thanh filter hàng 2 */
function initToolbar() {
  const locationSelect = document.getElementById("locationSelect");
  const locationDropdown = document.getElementById("locationDropdown");
  const locationLabel = document.getElementById("locationLabel");
  locationLabel.textContent = locationDropdown.querySelector("button").textContent;
 
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
 
  document.querySelectorAll(".seat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seat-pill").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.seat = btn.dataset.seat;
      filterAndRender();
    });
  });
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
  document.getElementById("infoTotal").textContent = info.total;
  document.getElementById("successModalOverlay").classList.add("is-open");
}
 
function closeSuccessModal() {
  document.getElementById("successModalOverlay").classList.remove("is-open");
}

/*Khởi tạo chung các form */
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
 
  // Event delegation cho nút "Đặt xe nhanh" trong grid (grid được vẽ lại liên tục)
  document.getElementById("carGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-quickbook");
    if (btn) openBookingModal(btn.dataset.id);
  });
}

/*--JSS MODULE CON: HOTEL-- */
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
const HOTEL_IMG_PATH = "../../assest/images/hotels/";
function imageHTML(hotel, index, label) {
  const file = hotel.images[index];
  const img = file
    ? `<img src="${HOTEL_IMG_PATH}${file}" alt="${hotel.name}" onerror="this.remove()">`
    : "";
  return `<div class="media-placeholder" data-label="${label}">${img}</div>`;
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
      renderHotels();
    })
    .catch(err => {
      console.error("Lỗi tải hotel.json:", err);
      document.getElementById("hotelGrid").innerHTML =
        '<div class="car-empty">Không tải được dữ liệu. Kiểm tra đường dẫn hotel.json và chạy bằng Live Server.</div>';
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
    if (sortType === "priceDesc") return getCheapestRoom(b).price - getCheapestRoom(b).price;
    if (sortType === "az") return a.name.localeCompare(b.name, "vi");
    if (sortType === "za") return b.name.localeCompare(a.name, "vi");
    return b.reviews - a.reviews;   // mặc định: phổ biến nhất
  });
 
  return list;
}
 
// Bấm 1 nút trong nhóm pill -> đổi màu active + lưu bộ lọc
function setupPillGroup(groupId, key, dataName) {
  const buttons = document.querySelectorAll(`#${groupId} .seat-pill`);
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
  document.querySelector("#cityFilter .seat-pill").click();       // nút "Tất cả địa điểm"
  document.querySelector("#categoryHotels .seat-pill").click();   // nút "Tất cả loại hình"
}
 
/* ---------- 4. DANH SÁCH KHÁCH SẠN ---------- */
function hotelCardHTML(hotel) {
  const room = getCheapestRoom(hotel);
  const stars = "★".repeat(hotel.stars) + "☆".repeat(5 - hotel.stars);
 
const ratingText = hotel.reviews > 0
  ? `★ ${hotel.rating}<span>/${hotel.ratingMax} (${hotel.reviews.toLocaleString("vi-VN")})</span>`
  : "Chưa có đánh giá";

  const oldPrice = room.discount ? `<span class="old-price">${money(room.priceOriginal)}</span>` : "";
  const tags = hotel.keywords.slice(0, 4).map(k => `<span class="tag-chip">${k}</span>`).join("");
 
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
        <div class="tag-row">${tags}</div>
        <div class="hotel-foot">
          <div class="car-price">
            <span class="label">Giá từ</span>
            ${oldPrice}
            <span class="value">${money(room.price)}<span> /đêm</span></span>
          </div>
          <button type="button" class="btn-quickbook">Đặt phòng ngay</button>
        </div>
      </div>
    </article>`;
}
 
function renderHotels() {
  const list = getFilteredHotels();
  const grid = document.getElementById("hotelGrid");
 
  grid.innerHTML = list.length
    ? list.map(hotelCardHTML).join("")
    : '<div class="car-empty">Không tìm thấy kết quả phù hợp. Hãy thử bộ lọc khác.</div>';
 
  document.getElementById("resultCount").textContent = `Tìm thấy ${list.length} kết quả phù hợp`;
}
 
/* ---------- 5. POPUP CHI TIẾT KHÁCH SẠN ---------- */
function openHotelDetail(hotelId) {
  const hotel = HOTELS.find(h => h.id === hotelId);
  if (!hotel) return;
  currentHotel = hotel;

  const roomsHTML = hotel.rooms.map((room, index) => {
    const oldPrice = room.discount
      ? `<span class="old-price">${money(room.priceOriginal)}</span>` : "";
    const amenities = room.amenities
      .map(a => `<span class="tag-chip">${a}</span>`).join("");
    const roomImg = room.image
      ? `<img src="${HOTEL_IMG_PATH}${room.image}" alt="${room.name}" onerror="this.remove()">`
      : "";

    return `
      <div class="room-row">
        <div class="media-placeholder" data-label="Ảnh phòng">${roomImg}</div>

        <div>
          <div class="room-name">${room.name}</div>
          <div class="room-info">${room.info} · Tối đa ${room.capacity} người</div>
          <div class="tag-row">${amenities}</div>
        </div>

        <div class="room-side">
          ${oldPrice}
          <div class="room-price-line">
            <span class="room-price">${money(room.price)}</span>
            <span class="room-note">/đêm</span>
          </div>
          <button type="button" class="btn-quickbook" onclick="openBooking(${index})">Đặt phòng này</button>
        </div>
      </div>`;
  }).join("");

  const hotelAmenities = hotel.amenities.map(a => `<li>${a}</li>`).join("");

  document.getElementById("detailModal").innerHTML = `
    <button type="button" class="modal-close" onclick="closeModal('detailModalOverlay')">×</button>

    <div class="detail-top">
      <div>
        <h2>${hotel.name}</h2>
        <p class="hotel-adr">${hotel.address}</p>
        <p class="hotel-meta">${hotel.description}</p>
      </div>
    </div>

    <div class="detail-body" style="padding-top:14px">
      <div class="hotel-gallery" style="padding:0">
        ${imageHTML(hotel, 0, "Ảnh minh họa")}
        ${imageHTML(hotel, 1, "Ảnh minh họa")}
        ${imageHTML(hotel, 2, "Ảnh minh họa")}
      </div>

      <div class="tab-bar" style="margin-top:14px">
        <button type="button" class="tab-btn is-active" onclick="switchTab(this, 'tabRooms')">Danh sách phòng</button>
        <button type="button" class="tab-btn" onclick="switchTab(this, 'tabInfo1')">Chi tiết tiện ích</button>
        <button type="button" class="tab-btn" onclick="switchTab(this, 'tabInfo2')">Chính sách</button>
      </div>

      <div class="tab-panel is-active" id="tabRooms">
        <div class="room-list">${roomsHTML}</div>
      </div>

      <div class="tab-panel" id="tabInfo1">
        <h4>Tiện nghi khách sạn</h4>
        <ul class="inc-list-hotel">${hotelAmenities}</ul>
      </div>

      <div class="tab-panel" id="tabInfo2">
        <h4>Chính sách khách sạn</h4>
        <ul class="inc-list-hotel">
          <li>Khách sạn nhận phòng từ <strong>${hotel.checkIn}</strong> và trả phòng trước <strong>${hotel.checkOut}</strong></li>
          <li>${hotel.policy}</li>
        </ul>
      </div>
    </div>`;

  document.getElementById("detailModal").scrollTop = 0;
  openModal("detailModalOverlay");
}

function switchTab(btn, panelId) {
  const modal = document.getElementById("detailModal");
  modal.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("is-active"));
  modal.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));

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
 
// Tiền = giá phòng × số đêm × số phòng, trừ giảm giá
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
 

/* ---- MODULE CON: TOUR (SỬA LẠI ĐỒNG BỘ ĐẶT TOUR CHUẨN XÁC) ---- */
(function () {
  const $ = id => document.getElementById(id);
  const money = n => (n || 0).toLocaleString('vi-VN') + 'đ';
  const dateVN = s => s ? s.split('-').reverse().join('/') : '';
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const kfmt = n => (n >= 1000 ? (n / 1000).toLocaleString('vi-VN') + 'K+' : n);
  const open = id => { const el = $(id); if (el) el.classList.add('is-open'); };
  const close = id => { const el = $(id); if (el) el.classList.remove('is-open'); };

  let DATA = { tours: [], promoCodes: [], policy: '' };
  let state = { cat: 'all', dest: 'all' };
  let current = null, promo = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('tourGrid')) return; // Chỉ chạy trên trang Tour
    fetch('../../data/tour.json')
      .then(r => r.json())
      .then(d => { 
        DATA = {
          tours: d.Tours || d.tours || [],
          promoCodes: d.promoCodes || [],
          policy: d.policy || ''
        }; 
        init(); 
      })
      .catch(() => { 
        if ($('tourGrid')) {
          $('tourGrid').innerHTML = '<div class="car-empty">Không tải được tour.json. Hãy chạy bằng Live Server / localhost.</div>'; 
        }
      });
  });

  function init() {
    const T = DATA.tours, uniq = a => [...new Set(a.filter(Boolean))];
    
    if ($('fType')) {
      $('fType').innerHTML = '<option value="">Tất cả loại hình</option>' + uniq(T.flatMap(t => t.types || [t.type])).map(v => `<option value="${v}">${v}</option>`).join('');
    }
    if ($('categoryTabs')) {
      $('categoryTabs').innerHTML = '<button type="button" class="seat-pill is-active" data-cat="all">Tất cả danh mục</button>' +
        uniq(T.map(t => t.category)).map(c => `<button type="button" class="seat-pill" data-cat="${c}">${c}</button>`).join('');
    }
    if ($('destFilter')) {
      const dests = uniq(T.flatMap(t => uniq([t.from, t.to || t.city])));
      $('destFilter').innerHTML = '<button type="button" class="seat-pill is-active" data-dest="all">Tất cả điểm đến</button>' +
        dests.map(d => `<button type="button" class="seat-pill" data-dest="${d}">${d}</button>`).join('');
    }

    if ($('categoryTabs')) {
      $('categoryTabs').addEventListener('click', e => {
        const b = e.target.closest('.seat-pill'); if (!b) return;
        state.cat = b.dataset.cat; toggle('#categoryTabs .seat-pill', b); render();
      });
    }
    if ($('destFilter')) {
      $('destFilter').addEventListener('click', e => {
        const b = e.target.closest('.seat-pill'); if (!b) return;
        state.dest = b.dataset.dest; toggle('#destFilter .seat-pill', b); render();
      });
    }

    ['fType', 'fFrom', 'fTo', 'fSort'].forEach(i => { if ($(i)) $(i).addEventListener('change', render); });
    if ($('keyword')) $('keyword').addEventListener('input', render);
    if ($('searchBtn')) $('searchBtn').onclick = render;
    if ($('resetBtn')) {
      $('resetBtn').onclick = () => {
        ['keyword', 'fType', 'fFrom', 'fTo'].forEach(i => { if ($(i)) $(i).value = ''; }); 
        if ($('fSort')) $('fSort').value = 'popular';
        state = { cat: 'all', dest: 'all' };
        toggle('#categoryTabs .seat-pill', document.querySelector('#categoryTabs .seat-pill'));
        toggle('#destFilter .seat-pill', document.querySelector('#destFilter .seat-pill')); 
        render();
      };
    }

    // Sự kiện click chọn Tour
    $('tourGrid').addEventListener('click', e => {
      const bookBtn = e.target.closest('.btn-quickbook[data-book]');
      if (bookBtn) {
        e.stopPropagation();
        openBooking(+bookBtn.dataset.book);
        return;
      }
      const c = e.target.closest('.car-card'); 
      if (c) openDetail(+c.dataset.id);
    });

    if ($('closeBookingModal')) $('closeBookingModal').onclick = () => close('bookingModalOverlay');
    if ($('closeSuccessModal')) $('closeSuccessModal').onclick = () => close('successModalOverlay');
    
    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => { if (e.target === o) o.classList.remove('is-open'); });
    });

    if ($('ticketQty')) $('ticketQty').addEventListener('input', calc);
    if ($('applyPromo')) $('applyPromo').onclick = applyPromo;
    if ($('bookingForm')) $('bookingForm').addEventListener('submit', submitBooking);
    if ($('goToMyTrips')) $('goToMyTrips').onclick = () => { window.location.href = '../../index.html'; };
    
    render();
  }

  function toggle(sel, btn) { 
    document.querySelectorAll(sel).forEach(x => x.classList.toggle('is-active', x === btn)); 
  }

  /* ---------- Lọc + Sắp xếp ---------- */
  function filtered() {
    const type = $('fType') ? $('fType').value : '', 
          from = $('fFrom') ? $('fFrom').value : '', 
          to = $('fTo') ? $('fTo').value : '', 
          kw = norm($('keyword') ? $('keyword').value.trim() : '');

    const list = DATA.tours.filter(t => {
      const types = t.types || [t.type];
      const deps = t.departures || [];
      const dest = t.to || t.city;

      return (state.cat === 'all' || t.category === state.cat) &&
        (state.dest === 'all' || t.from === state.dest || dest === state.dest) &&
        (!type || types.includes(type)) &&
        (!from && !to || deps.some(d => (!from || d.date >= from) && (!to || d.date <= to))) &&
        (!kw || norm(t.name + ' ' + t.from + ' ' + dest).includes(kw));
    });

    const sortVal = $('fSort') ? $('fSort').value : 'popular';
    const by = {
      popular: (a, b) => (b.booked || 0) - (a.booked || 0),
      az: (a, b) => a.name.localeCompare(b.name, 'vi'),
      priceAsc: (a, b) => (a.price || 0) - (b.price || 0),
      priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0),
      soon: (a, b) => {
        const da = (a.departures && a.departures[0]) ? a.departures[0].date : '';
        const db = (b.departures && b.departures[0]) ? b.departures[0].date : '';
        return da.localeCompare(db);
      }
    };
    return list.sort(by[sortVal] || by.popular);
  }

  const badges = t =>
    (t.booked >= 10000 ? '<span class="car-badge hot">🔥 Hot</span>' : '') +
    (t.discount ? `<span class="car-badge sale">Giảm ${t.discount}%</span>` : '');

  const media = (t, i, label) => {
    const imgs = t.images || [];
    return `<div class="media-placeholder" data-label="${label}">${imgs[i] ? `<img src="${imgs[i]}" alt="${t.name}">` : ''}</div>`;
  };

  function render() {
    const list = filtered();
    if ($('resultCount')) $('resultCount').textContent = `Tìm thấy ${list.length} tour phù hợp`;
    if (!$('tourGrid')) return;

    $('tourGrid').innerHTML = list.length ? list.map(t => {
      const d = (t.departures && t.departures[0]) ? t.departures[0] : { date: '', slots: 0 };
      const dest = t.to || t.city;
      return `<article class="car-card" data-id="${t.id}">
        <div class="car-media"><div class="badge-row">${badges(t)}</div>${media(t, 0, 'Ảnh tour')}</div>
        <div class="car-body">
          <div class="car-rating-row">
            ${t.rating ? `<span class="rating">★ ${t.rating}</span><span class="dot">·</span>` : ''}
            <span class="provider">${(t.reviews || 0).toLocaleString('vi-VN')} đánh giá</span>
            ${t.booked ? `<span class="dot">·</span><span>${kfmt(t.booked)} đã đặt</span>` : ''}
          </div>
          <h3 class="car-name" style="cursor:pointer;">${t.name}</h3>
          <div class="tour-route">📍 ${t.from} → ${dest}</div>
          <div class="car-specs">
            <div><span class="spec-label">Thời lượng</span><span class="spec-value">${(t.duration || '—').split(' (')[0]}</span></div>
            <div><span class="spec-label">Khởi hành</span><span class="spec-value">${d.date ? dateVN(d.date) : 'Liên hệ'}</span></div>
            <div><span class="spec-label">Còn chỗ</span><span class="spec-value">${d.slots || '—'}</span></div>
          </div>
          <div class="car-foot">
            <div class="car-price">
              ${t.discount && t.priceOriginal ? `<span class="old-price">${money(t.priceOriginal)}</span>` : '<span class="label">Giá từ</span>'}
              <span class="value">${money(t.price)}<span>/khách</span></span>
            </div>
            <button type="button" class="btn-quickbook" data-detail="${t.id}" style="background:#f1f5f9; color:#0f172a;">Xem chi tiết</button>
            <button type="button" class="btn-quickbook" data-book="${t.id}">Đặt ngay</button>
          </div>
        </div></article>`;
    }).join('') : '<div class="car-empty">Không tìm thấy tour phù hợp. Hãy thử thay đổi bộ lọc.</div>';
  }

  /* ---------- Popup Chi Tiết ---------- */
  function openDetail(id) {
    const t = DATA.tours.find(x => x.id === id);
    if (!t) return;
    current = t;
    const d = (t.departures && t.departures[0]) ? t.departures[0] : { date: '', slots: 0 };
    const dest = t.to || t.city;
    const li = a => (a || []).map(x => `<li>${x}</li>`).join('');
    const tl = (t.itinerary || []).map(s => `<li><span class="t-time">${s.time || '•'}</span><div><strong>${s.title}</strong>${s.desc ? `<span class="t-desc">${s.desc}</span>` : ''}</div></li>`).join('');
    
    const m = $('detailModal');
    if (!m) return;
  /*hiển thị ảnh tour */
    m.innerHTML = `
      <button type="button" class="modal-close" data-x>×</button>
      <div class="gallery">${[0, 1, 2, 3, 4].map(i => media(t, i, i ? 'Ảnh ' + (i + 1) : 'Ảnh chính')).join('')}</div>
      <div class="detail-top">
        <div>
          <h2>${t.name}</h2>
          <div class="tour-route" style="margin-top:4px;">📍 ${t.from} → ${dest}</div>
          <div class="detail-price" style="margin-top:8px;">${money(t.price)} <small>/khách</small></div>
          ${t.discount && t.priceOriginal ? `<span class="old-price">${money(t.priceOriginal)}</span>` : ''}
        </div>
        <button type="button" class="btn-cta" data-book-btn>Đặt tour ngay</button>
      </div>
      <div class="quick-info">
        <div><span>Đánh giá</span>★ ${t.rating || '5.0'}</div>
        <div><span>Thời lượng</span>${t.duration || '—'}</div>
        <div><span>Điểm đi</span>${t.from}</div>
        <div><span>Còn lại</span>${d.slots || 0} chỗ</div>
      </div>
      <div class="detail-body">
        <p>${t.description || ''}</p>
        ${(t.highlights && t.highlights.length) ? `<h4 class="panel-h">Điểm nổi bật</h4><ul class="hl-list">${li(t.highlights)}</ul>` : ''}
        ${tl ? `<h4 class="panel-h">Lịch trình chi tiết</h4><ul class="timeline">${tl}</ul>` : ''}
        ${(t.includes && t.includes.length) ? `<h4 class="panel-h">Giá bao gồm</h4><ul class="inc-list">${li(t.includes)}</ul>` : ''}
      </div>
      <div class="detail-cta">
        <span class="section-sub" style="margin:0">Giá từ <strong>${money(t.price)}</strong>/khách</span>
        <button type="button" class="btn-cta" data-book-btn>Đặt tour ngay</button>
      </div>`;

    const closeBtn = m.querySelector('[data-x]');
    if (closeBtn) closeBtn.onclick = () => close('detailModalOverlay');
    
    m.querySelectorAll('[data-book-btn]').forEach(b => {
      b.onclick = () => openBooking(t.id);
    });

    m.scrollTop = 0; 
    open('detailModalOverlay');
  }

  /* ---------- Form Đặt Tour ---------- */
  function openBooking(id) {
    const t = DATA.tours.find(x => x.id === (id || (current ? current.id : null)));
    if (!t) return;
    current = t; 
    promo = null;

    if ($('bookingTourName')) $('bookingTourName').textContent = t.name;
    if ($('bookingRoute')) $('bookingRoute').textContent = `${t.from} → ${t.to || t.city}`;
    if ($('bookingMeta')) $('bookingMeta').textContent = `Thời lượng: ${t.duration || '—'}`;
    if ($('bookingPrice')) $('bookingPrice').innerHTML = `${money(t.price)}<small>/khách</small>`;
    
    const deps = t.departures || [];
    if ($('departureDate')) {
      $('departureDate').innerHTML = deps.map((d, i) => 
        `<option value="${i}">${dateVN(d.date)}${d.time ? ' · ' + d.time : ''} (còn ${d.slots} chỗ)</option>`
      ).join('');
    }

    if ($('bookingForm')) $('bookingForm').reset(); 
    if ($('ticketQty')) {
      $('ticketQty').value = 1;
      $('ticketQty').max = deps[0] ? deps[0].slots : 20;
    }
    if ($('sumPromoRow')) $('sumPromoRow').style.display = 'none'; 
    if ($('promoMsg')) $('promoMsg').textContent = '';

    calc(); 
    close('detailModalOverlay');
    open('bookingModalOverlay');
  }

  function calc() {
    if (!current) return 0;
    const q = Math.max(1, +($('ticketQty') ? $('ticketQty').value : 1) || 1);
    const sub = (current.price || 0) * q;
    const dis = promo ? Math.round(sub * promo.percent / 100) : 0;

    if ($('sumBase')) $('sumBase').textContent = money(sub);
    if ($('sumPromoRow')) $('sumPromoRow').style.display = promo ? 'flex' : 'none';
    if ($('sumPromo')) $('sumPromo').textContent = '-' + money(dis);
    if ($('totalLabel')) $('totalLabel').textContent = `Tổng tiền (${q} vé)`;
    if ($('totalAmount')) $('totalAmount').textContent = money(sub - dis);

    return sub - dis;
  }

  function applyPromo() {
    const code = $('promoCode') ? $('promoCode').value.trim().toUpperCase() : '';
    const p = DATA.promoCodes.find(x => x.code === code);
    promo = p || null; 
    calc();

    if ($('promoMsg')) {
      if (p) {
        $('promoMsg').textContent = `Áp dụng thành công mã giảm ${p.percent}%`;
        $('promoMsg').className = 'promo-msg ok';
      } else if (code) {
        $('promoMsg').textContent = 'Mã ưu đãi không hợp lệ.';
        $('promoMsg').className = 'promo-msg bad';
      } else {
        $('promoMsg').textContent = '';
      }
    }
  }

  function submitBooking(e) {
    e.preventDefault();
    if (!current) return;

    const q = +($('ticketQty') ? $('ticketQty').value : 1);
    const deps = current.departures || [];
    const depIdx = +($('departureDate') ? $('departureDate').value : 0);
    const d = deps[depIdx] || { date: '', time: '', slots: 20 };

    if (!(q >= 1 && q <= d.slots)) { 
      alert(`Số lượng vé phải từ 1 đến ${d.slots}.`); 
      return; 
    }

    if ($('orderCode')) $('orderCode').textContent = 'TOUR-' + Math.floor(100000 + Math.random() * 900000);
    if ($('infoName')) $('infoName').textContent = $('renterName') ? $('renterName').value : '';
    if ($('infoEmail')) $('infoEmail').textContent = $('renterEmail') ? $('renterEmail').value : '';
    if ($('infoService')) $('infoService').textContent = current.name;
    if ($('infoDate')) $('infoDate').textContent = `${dateVN(d.date)}${d.time ? ' · ' + d.time : ''}`;
    if ($('infoTotal')) $('infoTotal').textContent = money(calc());
    if ($('infoPay')) $('infoPay').textContent = $('payMethod') ? $('payMethod').value : 'Thanh toán sau';

    close('bookingModalOverlay'); 
    close('detailModalOverlay'); 
    open('successModalOverlay');
  }
})();