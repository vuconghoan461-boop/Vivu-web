const HERO_SLIDES = [
  "../../assets/slicer/pic2.jpg",
  "../../assets/slicer/pic1.jpg",
  "../../assets/slicer/pic3.jpg"
];
/* TRANG SERVICE CHUNG */
document.addEventListener("DOMContentLoaded", async function () {
  const headerContainer = document.getElementById("site-header");

  if (headerContainer) {
    try {
      const response = await fetch("header.html");
      if (!response.ok) {
        throw new Error("Không thể tải header.html");
      }
      headerContainer.innerHTML = await response.text();
    } catch (error) {
      console.error("Lỗi khi tải Header:", error);
    }
  }

  const footerContainer = document.getElementById("site-footer");

  if (footerContainer) {
    try {
      const response = await fetch("footer.html");
      if (!response.ok) {
        throw new Error("Không thể tải footer.html");
      }
      footerContainer.innerHTML = await response.text();
    } catch (error) {
      console.error("Lỗi khi tải Footer:", error);
    }
  }


  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }


  const tabButtons = document.querySelectorAll("[data-tab-target]");

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const targetId = btn.getAttribute("data-tab-target");
      const tabGroup = btn.closest("[data-tab-group]");

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

  const resultCountEl = document.querySelector("[data-result-count]");

  if (resultCountEl) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const count = btn.getAttribute("data-count");

        if (count) {
          resultCountEl.textContent = "Tìm thấy " + count + " dịch vụ phù hợp";
        }
      });
    });
  }

  /* ===================================================================
     6. ẨN / HIỆN BỘ LỌC TRÊN MOBILE
     =================================================================== */

  const filterToggle = document.querySelector("[data-filter-toggle]");
  const filterPanel = document.querySelector(".filter-panel");

  if (filterToggle && filterPanel) {
    filterToggle.addEventListener("click", function () {
      filterPanel.classList.toggle("is-open");
    });
  }

  /* ===================================================================
     7. SLIDER 3 ẢNH Ở BANNER ĐẦU TRANG
     =================================================================== */

  const hero = document.querySelector(".module-hero");

  if (hero) {
    /* Ưu tiên danh sách ảnh ghi trực tiếp trên thẻ: <section class="module-hero" data-slides="a.jpg,b.jpg,c.jpg"> */
    const sources = (hero.dataset.slides ? hero.dataset.slides.split(",") : HERO_SLIDES)
      .map(function (src) { return src.trim(); })
      .filter(Boolean);

    /* Chỉ giữ những ảnh tải được. Không ảnh nào tải được thì giữ nguyên nền xanh + mặt trời */
    const loaded = await Promise.all(sources.map(function (src) {
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () { resolve(src); };
        img.onerror = function () { resolve(null); };
        img.src = src;
      });
    }));

    const images = loaded.filter(Boolean);
    if (images.length) {
      buildHeroSlider(hero, images);
    }
  }
});

/*----------Slider banner--------*/
function buildHeroSlider(hero, images) {
  const AUTOPLAY_MS = 5000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slider = document.createElement("div");
  slider.className = "hero-slider";
  slider.innerHTML = images.map(function (src, i) {
    return '<div class="hero-slide' + (i === 0 ? " is-active" : "") +
           '" style="background-image:url(\'' + src + '\')"></div>';
  }).join("");
  hero.prepend(slider);

  if (images.length < 2) return;

  const controls = document.createElement("div");
  controls.className = "hero-controls";
  controls.innerHTML =
    '<div class="hero-dots">' + images.map(function (_, i) {
      return '<button type="button" class="hero-dot' + (i === 0 ? " is-active" : "") +
             '" data-i="' + i + '" aria-label="Xem ảnh ' + (i + 1) + '"></button>';
    }).join("") + '</div>' +
    '<div class="hero-arrows">' +
      '<button type="button" class="hero-arrow" data-dir="-1" aria-label="Ảnh trước">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<button type="button" class="hero-arrow" data-dir="1" aria-label="Ảnh sau">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
    '</div>';
  hero.appendChild(controls);

  const slides = slider.querySelectorAll(".hero-slide");
  const dots = controls.querySelectorAll(".hero-dot");
  let index = 0;
  let timer = null;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (el, n) { el.classList.toggle("is-active", n === index); });
    dots.forEach(function (el, n) { el.classList.toggle("is-active", n === index); });
  }

  function start() {
    if (reduceMotion || timer) return;
    timer = setInterval(function () { show(index + 1); }, AUTOPLAY_MS);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }

  controls.addEventListener("click", function (e) {
    const dot = e.target.closest(".hero-dot");
    const arrow = e.target.closest(".hero-arrow");
    if (dot) show(Number(dot.dataset.i));
    if (arrow) show(index + Number(arrow.dataset.dir));
    stop(); start();   /* bấm tay thì đếm lại 5 giây */
  });

  /* Dừng khi rê chuột / đang focus / đổi tab */
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stop(); } else { start(); }
  });

  /* Vuốt trên điện thoại */
  let touchX = null;
  hero.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    const diff = e.changedTouches[0].clientX - touchX;
    if (Math.abs(diff) > 40) { show(index + (diff < 0 ? 1 : -1)); stop(); start(); }
    touchX = null;
  });

  start();
}