const HERO_SLIDES = [
  "https://www.youtube.com/watch?v=_8uioycwhhc",
    "../../assets/slicer/pic1.jpg",
  "../../assets/slicer/pic2.jpg",
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

  /*5. BỘ ĐẾM SỐ LƯỢNG KẾT QUẢ */

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

  /* 6. ẨN / HIỆN BỘ LỌC TRÊN MOBILE */

  const filterToggle = document.querySelector("[data-filter-toggle]");
  const filterPanel = document.querySelector(".filter-panel");

  if (filterToggle && filterPanel) {
    filterToggle.addEventListener("click", function () {
      filterPanel.classList.toggle("is-open");
    });
  }

  /* 7. SLIDER ẢNH / VIDEO Ở BANNER ĐẦU TRANG */

  const hero = document.querySelector(".module-hero");

  if (hero) {
    /* Ưu tiên danh sách ghi trực tiếp trên thẻ: <section class="module-hero" data-slides="a.jpg,b.mp4,https://www.youtube.com/watch?v=...">
       Mỗi mục có thể là ảnh, video .mp4/.webm hoặc link YouTube */
    const sources = (hero.dataset.slides ? hero.dataset.slides.split(",") : HERO_SLIDES)
      .map(function (src) { return src.trim(); })
      .filter(Boolean);

    /* Phân loại từng mục (ảnh / video / YouTube) rồi chỉ giữ những mục tải được.
       Không mục nào tải được thì giữ nguyên nền xanh + mặt trời */
    const loaded = await Promise.all(sources.map(function (src) {
      return checkHeroSlide(parseHeroSlide(src));
    }));

    const items = loaded.filter(Boolean);
    if (items.length) {
      buildHeroSlider(hero, items);
    }
  }
});

/*----------Slider banner--------*/

/* Phân loại một mục trong HERO_SLIDES:
   - link YouTube (watch?v=..., youtu.be/..., embed/..., shorts/...)
   - video tải sẵn (.mp4 / .webm / .ogg)
   - còn lại là ảnh */
function parseHeroSlide(src) {
  const youtube = src.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );

  if (youtube) {
    return { type: "youtube", src: src, id: youtube[1] };
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(src)) {
    return { type: "video", src: src };
  }

  return { type: "image", src: src };
}

/* Kiểm tra mục có tải được không. Trả về chính mục đó, hoặc null nếu lỗi */
function checkHeroSlide(item) {
  return new Promise(function (resolve) {
    /* YouTube không kiểm tra trước được, cứ nhận */
    if (item.type === "youtube") {
      resolve(item);
      return;
    }

    if (item.type === "video") {
      const video = document.createElement("video");
      let done = false;

      function finish(result) {
        if (done) return;
        done = true;
        resolve(result);
      }

      video.preload = "metadata";
      video.onloadedmetadata = function () { finish(item); };
      video.onerror = function () { finish(null); };
      /* mạng chậm: quá 5 giây vẫn nhận, để trình duyệt tự tải tiếp */
      setTimeout(function () { finish(item); }, 5000);
      video.src = item.src;
      return;
    }

    const img = new Image();
    img.onload = function () { resolve(item); };
    img.onerror = function () { resolve(null); };
    img.src = item.src;
  });
}

function buildHeroSlider(hero, items) {
  const AUTOPLAY_MS = 5000;   /* ảnh: đổi slide sau 5 giây */
  const YOUTUBE_MS = 20000;   /* YouTube: không biết lúc video hết nên đổi slide sau 20 giây */
  const YOUTUBE_UI_MS = 3500;  /* YouTube tự hiện nút điều khiển vài giây đầu, đợi chúng ẩn rồi mới hiện video */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const single = items.length < 2;

  const slider = document.createElement("div");
  slider.className = "hero-slider";
  slider.innerHTML = items.map(function (item, i) {
    const active = i === 0 ? " is-active" : "";

    if (item.type === "video") {
      return '<div class="hero-slide hero-slide-video' + active + '">' +
               '<video class="hero-video" src="' + item.src + '" playsinline preload="auto"' +
               (single ? " loop" : "") + '></video>' +
             '</div>';
    }

    if (item.type === "youtube") {
      return '<div class="hero-slide hero-slide-embed' + active + '" ' +
             'style="background-image:url(\'https://img.youtube.com/vi/' + item.id + '/hqdefault.jpg\')"></div>';
    }

    return '<div class="hero-slide' + active +
           '" style="background-image:url(\'' + item.src + '\')"></div>';
  }).join("");
  hero.prepend(slider);

  const slides = slider.querySelectorAll(".hero-slide");
  let controls = null;
  let dots = [];
  let index = 0;
  let timer = null;
  let running = false;

  if (!single) {
    controls = document.createElement("div");
    controls.className = "hero-controls";
    controls.innerHTML =
      '<div class="hero-dots">' + items.map(function (_, i) {
        return '<button type="button" class="hero-dot' + (i === 0 ? " is-active" : "") +
               '" data-i="' + i + '" aria-label="Xem slide ' + (i + 1) + '"></button>';
      }).join("") + '</div>' +
      '<div class="hero-arrows">' +
        '<button type="button" class="hero-arrow" data-dir="-1" aria-label="Slide trước">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<button type="button" class="hero-arrow" data-dir="1" aria-label="Slide sau">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
      '</div>';
    hero.appendChild(controls);
    dots = controls.querySelectorAll(".hero-dot");
  }

  /* ----- Video tải sẵn ----- */
  function videoOf(n) {
    return items[n].type === "video" ? slides[n].querySelector("video") : null;
  }

  function playActiveVideo() {
    const video = videoOf(index);
    if (!video || reduceMotion) return;
    video.muted = true;   /* video có tiếng thì trình duyệt không cho tự phát */
    const result = video.play();
    if (result && result.catch) result.catch(function () {});
  }

  items.forEach(function (item, n) {
    const video = videoOf(n);
    if (!video) return;
    video.muted = true;
    /* Video hết thì sang slide kế tiếp (chỉ khi đang tự chạy) */
    video.addEventListener("ended", function () {
      if (running && !single && n === index) show(index + 1);
    });
  });

  /* ----- YouTube: chỉ nạp khung nhúng khi slide đang hiện, rời slide thì gỡ ra để dừng video ----- */
  function setEmbed(n, on) {
    const slide = slides[n];
    const frame = slide.querySelector("iframe");

    if (!on) {
      if (frame) frame.remove();
      return;
    }
    if (frame) return;

    const id = items[n].id;
    const iframe = document.createElement("iframe");
    let params = "?autoplay=" + (reduceMotion ? 0 : 1) +
      "&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1";

    /* Không dùng tham số loop/playlist vì nó làm YouTube hiện nút "bài trước". Việc phát lại do code bên dưới lo */
    if (location.protocol === "http:" || location.protocol === "https:") {
      params += "&origin=" + encodeURIComponent(location.origin);
    }

    iframe.src = "https://www.youtube.com/embed/" + id + params;
    iframe.title = "Video giới thiệu";
    iframe.setAttribute("allow", "autoplay; encrypted-media");
    iframe.setAttribute("tabindex", "-1");
    iframe.setAttribute("aria-hidden", "true");
    slide.appendChild(iframe);
    controlEmbed(iframe);
  }

  /* Điều khiển khung YouTube từ bên ngoài, để người xem chỉ thấy hình video, không thấy nút của YouTube:
     - luôn ra lệnh phát mỗi khi slide được chuyển tới
     - khung chỉ hiện khi video đang phát và đã qua vài giây đầu (lúc đó nút của YouTube đã tự ẩn)
     - video tạm dừng / hết thì ẩn khung (chỉ còn ảnh bìa) rồi phát lại từ đầu, tránh lộ nút dừng và màn hình gợi ý cuối video */
  function controlEmbed(iframe) {
    let revealTimer = null;
    let fallbackTimer = null;

    function send(func, args) {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: func, args: args || [] }), "*"
      );
    }

    function hide() {
      clearTimeout(revealTimer);
      revealTimer = null;
      iframe.classList.remove("is-ready");
    }

    function reveal() {
      iframe.classList.add("is-ready");
    }

    function onState(state) {
      if (state === 1) {
        /* đang phát: đợi nút của YouTube ẩn rồi mới hiện video */
        if (!revealTimer && !iframe.classList.contains("is-ready")) {
          revealTimer = setTimeout(function () { revealTimer = null; reveal(); }, YOUTUBE_UI_MS);
        }
        return;
      }
      if (state === 0) {            /* hết video: phát lại từ đầu */
        hide();
        send("seekTo", [0, true]);
        send("playVideo");
      } else if (state === 2) {     /* tạm dừng: ẩn và phát tiếp */
        hide();
        send("playVideo");
      } else if (state === -1 || state === 5) {   /* chưa chạy: ra lệnh phát */
        send("playVideo");
      }
    }

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;

      let data = e.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (err) { return; }
      }
      if (!data) return;

      if (data.event === "onReady") {
        send("playVideo");
      } else if (data.event === "onStateChange" && typeof data.info === "number") {
        onState(data.info);
      } else if (data.event === "infoDelivery" && data.info && typeof data.info.playerState === "number") {
        onState(data.info.playerState);
      }
    }

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", function () {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      send("playVideo");
    });

    /* dự phòng: không nhận được tín hiệu nào từ YouTube thì vẫn hiện video sau 8 giây */
    fallbackTimer = setTimeout(function () {
      if (!iframe.classList.contains("is-ready")) reveal();
    }, 8000);

    /* khung bị gỡ khỏi trang (slide khác được chọn) thì dọn dẹp */
    const cleanup = setInterval(function () {
      if (!iframe.isConnected) {
        clearInterval(cleanup);
        clearTimeout(revealTimer);
        clearTimeout(fallbackTimer);
        window.removeEventListener("message", onMessage);
      }
    }, 1000);
  }

  function show(i) {
    index = (i + slides.length) % slides.length;

    slides.forEach(function (el, n) {
      const on = n === index;
      el.classList.toggle("is-active", on);

      const video = videoOf(n);
      if (video) {
        if (on) { video.currentTime = 0; } else { video.pause(); }
      }
      if (items[n].type === "youtube") setEmbed(n, on);
    });
    dots.forEach(function (el, n) { el.classList.toggle("is-active", n === index); });

    playActiveVideo();
    schedule();
  }

  /* Ảnh / YouTube: hẹn giờ đổi slide. Video tải sẵn: đợi sự kiện "ended" ở trên */
  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!running || single || reduceMotion) return;

    const type = items[index].type;
    if (type === "video") return;

    timer = setTimeout(function () { show(index + 1); }, type === "youtube" ? YOUTUBE_MS : AUTOPLAY_MS);
  }

  function start() {
    if (reduceMotion || running || single) return;
    running = true;

    const video = videoOf(index);
    if (video && video.ended) {
      show(index + 1);   /* video đã hết trong lúc đang tạm dừng */
      return;
    }
    playActiveVideo();
    schedule();
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    timer = null;

    const video = videoOf(index);
    if (video) video.pause();
  }

  show(0);
  if (single) return;

  controls.addEventListener("click", function (e) {
    const dot = e.target.closest(".hero-dot");
    const arrow = e.target.closest(".hero-arrow");
    if (dot) show(Number(dot.dataset.i));
    if (arrow) show(index + Number(arrow.dataset.dir));
    stop(); start();   /* bấm tay thì đếm lại từ đầu */
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