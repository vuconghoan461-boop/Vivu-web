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

const CARS = [
  {
    id: 1,
    name: "VinFast VF8 Plus (Xe Điện SUV 5 Chỗ)",
    provider: "GreenSM Rental Official",
    perks: "Bảo hiểm vật chất 2 chiều & Cứu hộ giao thông 24/7 đi kèm",
    rating: 4.92,
    reviews: 380,
    seats: 5,
    transmission: "Tự động",
    fuel: "Điện",
    category: "oto",
    city: "Hà Nội",
    badge: "🍃 Xe Điện Xanh",
    features: [
      "Hệ thống ADAS lái thông minh",
      "Sạc pin miễn phí tại trạm VinFast",
      "Màn hình 15.6 inch"
    ],
    price: 950000,
    priceUnit: "/ngày"
  },
  {
    id: 2,
    name: "Kia Carnival Signature (MPV 7 Chỗ VIP)",
    provider: "Vietnam Luxury Car Rental",
    perks: "Bảo hiểm vật chất 2 chiều & Hỗ trợ tài xế riêng nếu cần",
    rating: 4.95,
    reviews: 520,
    seats: 7,
    transmission: "Tự động",
    fuel: "Dầu",
    category: "oto",
    city: "Hà Nội",
    badge: "",
    features: [
      "Ghế cơ trưởng massage chỉnh điện",
      "Cửa trượt điện 2 bên",
      "Cốp điện thông minh"
    ],
    price: 1650000,
    priceUnit: "/ngày"
  },
  {
    id: 3,
    name: "DCar Limousine 9 Chỗ Hạng Thương Gia",
    provider: "Eco Travel Limousine VIP",
    perks: "Đón trả tận nơi trong nội thành, đổi/hủy vé linh hoạt",
    rating: 4.9,
    reviews: 840,
    seats: 9,
    transmission: "Tự động",
    fuel: "Dầu",
    category: "limo",
    city: "Hà Nội",
    badge: "",
    features: [
      "Đón trả tận nơi tại khách sạn/nhà riêng",
      "Ghế ngả 180 độ massage",
      "Cổng sạc USB từng ghế"
    ],
    price: 280000,
    priceUnit: "/ghế"
  },
  {
    id: 4,
    name: "Toyota Innova Cross Hybrid (Đón sân bay)",
    provider: "VivuGo Airport Transfer",
    perks: "Tài xế đón tận cửa ra, theo dõi giờ bay tự động",
    rating: 4.85,
    reviews: 210,
    seats: 7,
    transmission: "Tự động",
    fuel: "Hybrid",
    category: "airport",
    city: "Hà Nội",
    badge: "",
    features: [
      "Đón tận cửa ra sân bay Nội Bài",
      "Tài xế mặc đồng phục, biển tên khách",
      "Nước suối miễn phí"
    ],
    price: 890000,
    priceUnit: "/lượt"
  },
  {
    id: 5,
    name: "Toyota Vios 2023 (Ô tô tự lái 4 chỗ)",
    provider: "VivuGo Self-Drive",
    perks: "Bảo hiểm vật chất cơ bản, hỗ trợ 24/7",
    rating: 4.7,
    reviews: 140,
    seats: 4,
    transmission: "Tự động",
    fuel: "Xăng",
    category: "oto",
    city: "Hà Nội",
    badge: "",
    features: [
      "Camera hành trình 2 kênh",
      "Cảm biến lùi 4 điểm",
      "Bảo hiểm vật chất cơ bản đi kèm"
    ],
    price: 650000,
    priceUnit: "/ngày"
  },
  {
    id: 6,
    name: "Mazda CX-5 2023 (Ô tô tự lái 5 chỗ)",
    provider: "Sài Gòn Car Rental",
    perks: "Giao xe tận sân bay Tân Sơn Nhất, xăng đầy bình",
    rating: 4.8,
    reviews: 96,
    seats: 5,
    transmission: "Tự động",
    fuel: "Xăng",
    category: "oto",
    city: "TP.HCM",
    badge: "",
    features: [
      "Giao xe tận sân bay Tân Sơn Nhất",
      "Camera 360 độ",
      "Bảo hiểm vật chất 2 chiều"
    ],
    price: 890000,
    priceUnit: "/ngày"
  },
  {
    id: 7,
    name: "Honda Air Blade 160 (Xe máy phượt)",
    provider: "Phượt Bike Rental",
    perks: "Kèm mũ bảo hiểm, áo mưa; bảo hiểm tai nạn đi kèm",
    rating: 4.7,
    reviews: 150,
    seats: 2,
    transmission: "Tay ga",
    fuel: "Xăng",
    category: "xemay",
    city: "Đà Lạt",
    badge: "",
    features: [
      "Cốp rộng 25L",
      "Bình xăng đầy khi giao xe",
      "Bảo hiểm tai nạn đi kèm"
    ],
    price: 180000,
    priceUnit: "/ngày"
  }
];

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
  initFilterBar();
  initToolbar();
  initModals();
  initBookingForm();
  filterAndRender();
});