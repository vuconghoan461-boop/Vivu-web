(function () {
  "use strict";

  /* ===== CẤU HÌNH ĐƯỜNG DẪN ===== */
  var DATA_URL = "../../data/kpdd.json";
  var IMG_BASE = "../../assest/images/Khamphadd/";
  var TOUR_URL = "../service/tour.html";
  var REVIEW_KEY = "vivugo_kpdd_reviews";
  var PAGE_SIZE = 9;
  var FEATURED_MAX = 3;
  var ROUTE = "#bai-viet/";

  /* ===== TIỆN ÍCH ===== */
  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fold(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  }
  function fmt(n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; }
  function rate(n) { return n ? Number(n).toFixed(1).replace(".", ",") : "5,0"; }
  function avatar(name, large) {
    var w = String(name || "?").trim().split(/\s+/);
    var ini = (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : w[0][0]).toUpperCase();
    var h = 0;
    for (var i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) % 4;
    return '<span class="kp-avatar' + (large ? " kp-avatar--lg" : "") + '" data-tone="' + h + '" aria-hidden="true">' + esc(ini) + "</span>";
  }

  /* ===== TRẠNG THÁI ===== */
  var data = {};
  var articles = [];
  var state = { q: "", region: "", type: "", cat: "", shown: PAGE_SIZE };
  var listScroll = 0;
  var toastTimer = null;
  var scrim = null;

  /* ===== ẢNH BÌA THẺ BÀI VIẾT ===== */
  function coverHtml(a) {
    return '<div class="kp-cover" data-region="' + esc(a.region) + '">' +
      '<div class="kp-cover__ph"><span>' + esc(a.dest) + "</span><small>" + esc(a.region) + "</small></div>" +
      '<img class="kp-img" src="' + esc(IMG_BASE + encodeURIComponent(a.image || "")) + '" alt="' + esc(a.title) + '" loading="lazy" />' +
      "</div>";
  }
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img.tagName === "IMG" && img.classList.contains("kp-img")) img.parentNode.classList.add("is-failed");
  }, true);

  /* ===== LỌC + SẮP XẾP ===== */
  function hasFilter() { return !!(state.q.trim() || state.region || state.type || state.cat); }

  function filtered() {
    var q = fold(state.q.trim());
    return articles.filter(function (a) {
      var aTypes = a.types || [];
      if (state.region && a.region !== state.region) return false;
      if (state.type && aTypes.indexOf(state.type) === -1) return false;
      if (state.cat && a.cat !== state.cat) return false;
      if (q) {
        var tourName = (a.tour && a.tour.name) || "";
        var hay = fold([a.title, a.dest, a.region, a.cat, a.excerpt, tourName].concat(aTypes).join(" "));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (x, y) { return (y.published || "").localeCompare(x.published || ""); });
  }

  /* ===== THẺ BÀI VIẾT ===== */
  function cardHtml(a, feature) {
    var aTypes = a.types || [];
    var tags = aTypes.slice(0, 3).map(function (t) { return '<span class="kp-tag">' + esc(t) + "</span>"; }).join("");
    var authorName = (a.author && a.author.name) || "VivuGo";
    var tourPrice = (a.tour && a.tour.price) ? fmt(a.tour.price) : "Liên hệ";

    return '<a class="kp-card' + (feature ? " kp-card--feature" : "") + '" href="' + ROUTE + encodeURIComponent(a.id) + '" aria-label="Đọc bài: ' + esc(a.title) + '">' +
      (feature ? '<span class="kp-card__flag">★ NỔI BẬT</span>' : "") +
      coverHtml(a) +
      '<div class="kp-card__body">' +
        '<div class="kp-card__top"><span class="kp-kicker">' + esc(a.cat) + '</span><span class="kp-rate">★ ' + rate(a.rating) + "</span></div>" +
        "<h3>" + esc(a.title) + "</h3>" +
        '<div class="kp-loc"><span aria-hidden="true">📍</span>' + esc(a.dest) + " · " + esc(a.region) + "</div>" +
        '<p class="kp-card__ex">' + esc(a.excerpt) + "</p>" +
        (tags ? '<div class="kp-tags">' + tags + "</div>" : "") +
        '<div class="kp-byline">' + avatar(authorName) + "<strong>" + esc(authorName) + '</strong><span class="kp-dot">·</span><span>' + esc(a.read || 5) + " phút đọc</span></div>" +
        '<div class="kp-card__foot"><span>Tour từ <b>' + tourPrice + '</b></span><span class="kp-card__go">ĐỌC BÀI VIẾT →</span></div>' +
      "</div></a>";
  }

  /* ===== DANH SÁCH BÀI VIẾT ===== */
  function renderActive() {
    var chips = ["region", "type", "cat"].filter(function (k) { return state[k]; });
    var box = $("kpActive");
    if ($("kpFilterCount")) {
      $("kpFilterCount").hidden = !chips.length;
      $("kpFilterCount").textContent = chips.length;
    }
    if (box) {
      box.hidden = !chips.length;
      box.innerHTML = chips.length
        ? chips.map(function (k) {
            return '<span class="kp-chip">' + esc(state[k]) + '<button type="button" data-clear="' + k + '" aria-label="Bỏ lọc ' + esc(state[k]) + '">×</button></span>';
          }).join("") + '<button type="button" class="kp-link-btn" data-clear="all">Xóa bộ lọc</button>'
        : "";
    }
  }

  function renderFilterPanel() {
    function group(title, key, items) {
      if (!items || !items.length) return "";
      return '<div class="kp-fgroup"><h3>' + title + '</h3><div class="kp-pills">' +
        '<button type="button" class="kp-pill' + (!state[key] ? " is-active" : "") + '" data-f="' + key + '" data-v="">Tất cả</button>' +
        items.map(function (v) {
          return '<button type="button" class="kp-pill' + (state[key] === v ? " is-active" : "") + '" data-f="' + key + '" data-v="' + esc(v) + '">' + esc(v) + "</button>";
        }).join("") + "</div></div>";
    }
    if ($("kpFilterBody")) {
      $("kpFilterBody").innerHTML =
        group("Vùng miền", "region", data.regions) +
        group("Trải nghiệm", "type", data.experienceTypes) +
        group("Chuyên mục", "cat", data.categories);
    }
  }

  function renderList() {
    var items = filtered();
    var filtering = hasFilter();
    var rest = items;

    renderActive();
    if ($("kpEmpty")) $("kpEmpty").hidden = items.length > 0;
    if ($("kpLatest")) $("kpLatest").hidden = items.length === 0;
    if ($("kpCount")) $("kpCount").textContent = items.length + " bài viết";
    if (!items.length) { 
      if ($("kpFeatured")) $("kpFeatured").hidden = true; 
      if ($("kpMoreBox")) $("kpMoreBox").hidden = true; 
      return; 
    }

    if (!filtering) {
      var feat = items.filter(function (a) { return a.featured; }).slice(0, FEATURED_MAX);
      rest = items.filter(function (a) { return feat.indexOf(a) === -1; });
      if ($("kpFeatured")) {
        $("kpFeatured").hidden = !feat.length;
        if ($("kpFeaturedGrid")) $("kpFeaturedGrid").innerHTML = feat.map(function (a) { return cardHtml(a, true); }).join("");
      }
      if ($("kpLatestTitle")) $("kpLatestTitle").textContent = "Mới nhất";
      if ($("kpLatestSub")) $("kpLatestSub").textContent = "Cập nhật những cẩm nang và lịch trình mới.";
    } else {
      if ($("kpFeatured")) $("kpFeatured").hidden = true;
      if ($("kpLatestTitle")) $("kpLatestTitle").textContent = "Kết quả phù hợp";
      if ($("kpLatestSub")) $("kpLatestSub").textContent = state.q.trim() ? 'Kết quả cho "' + state.q.trim() + '"' : "Bài viết khớp với bộ lọc của bạn.";
    }

    var visible = rest.slice(0, state.shown);
    if ($("kpGrid")) $("kpGrid").innerHTML = visible.map(function (a) { return cardHtml(a, false); }).join("");
    if ($("kpMoreBox")) $("kpMoreBox").hidden = rest.length <= visible.length;
  }

  function refresh() { state.shown = PAGE_SIZE; renderFilterPanel(); renderList(); }

  function resetFilters() {
    state.q = ""; state.region = ""; state.type = ""; state.cat = "";
    if ($("kpQuery")) $("kpQuery").value = "";
    refresh();
  }

  function isMobile() { return window.matchMedia("(max-width: 720px)").matches; }

  function openPanel() {
    if ($("kpFilterPanel")) $("kpFilterPanel").hidden = false;
    if ($("kpFilterBtn")) $("kpFilterBtn").setAttribute("aria-expanded", "true");
    if (isMobile()) {
      scrim = document.createElement("div");
      scrim.className = "kp-scrim";
      scrim.addEventListener("click", closePanel);
      document.body.appendChild(scrim);
      document.body.classList.add("kp-lock");
    }
  }
  function closePanel() {
    if ($("kpFilterPanel")) $("kpFilterPanel").hidden = true;
    if ($("kpFilterBtn")) $("kpFilterBtn").setAttribute("aria-expanded", "false");
    if (scrim) { scrim.remove(); scrim = null; }
    document.body.classList.remove("kp-lock");
  }

  /* ===== TRANG ĐỌC BÀI VIẾT ===== */
  function getReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); } catch (e) { return {}; }
  }

  function reviewHtml(r, mine) {
    return '<div class="kp-review"><div class="kp-review__top"><div class="kp-review__who">' + avatar(r.user) +
      '<div><div class="kp-review__name">' + esc(r.user) + '<span class="kp-sample">' + (mine ? "Mới gửi" : "Đánh giá") + "</span></div>" +
      '<div class="kp-review__meta">' + esc(r.date) + (r.tag ? " · " + esc(r.tag) : "") + "</div></div></div>" +
      '<div class="kp-review__stars">★ ' + esc(r.rating) + "/5</div></div><p>" + esc(r.comment) + "</p></div>";
  }

  function related(a) {
    return articles.filter(function (x) { return x.id !== a.id; }).map(function (x) {
      var sameTour = (x.tour && a.tour && x.tour.id === a.tour.id) ? 3 : 0;
      return { a: x, s: sameTour + (x.region === a.region ? 1 : 0) + (x.cat === a.cat ? 0.5 : 0) };
    }).sort(function (p, q) { return q.s - p.s; }).slice(0, 2).map(function (p) { return p.a; });
  }

  function openArticle(id) {
    var a = articles.filter(function (x) { return x.id === id; })[0];
    if (!a) return false;
    var mine = getReviews()[a.id] || [];
    var sampleReviews = a.reviews || [];
    var count = (a.reviewsCount || sampleReviews.length) + mine.length;
    var tourName = (a.tour && a.tour.name) || "Tour du lịch";
    var tourPrice = (a.tour && a.tour.price) ? fmt(a.tour.price) : "Liên hệ";
    var tourUnit = (a.tour && a.tour.unit) || "khách";
    var priceStr = tourPrice + "/" + esc(tourUnit);
    var tourLink = (a.tour && a.tour.url) ? esc(a.tour.url) : esc(TOUR_URL);

    var authorName = (a.author && a.author.name) || "VivuGo";
    var authorDate = (a.author && a.author.date) || a.published || "";

    // Render ảnh bìa chính
    var mainImageHtml = a.image 
      ? '<div class="kp-section-image"><img src="' + esc(IMG_BASE + encodeURIComponent(a.image)) + '" alt="' + esc(a.title) + '" /></div>' 
      : coverHtml(a);

    // Render các section nội dung và ảnh đính kèm
    var body = (a.sections || []).map(function (s) {
      var imgHtml = s.image 
        ? '<figure class="kp-section-image"><img src="' + esc(IMG_BASE + encodeURIComponent(s.image)) + '" alt="' + esc(s.imageCaption || s.h) + '" /><figcaption>' + esc(s.imageCaption || "") + '</figcaption></figure>' 
        : "";
      return '<div class="kp-content-section">' +
        "<h2>" + esc(s.h) + "</h2>" +
        "<p>" + esc(s.p) + "</p>" +
        imgHtml +
      '</div>';
    }).join("");

    var more = related(a);

    // Render giao diện đọc bài với Tác giả, Ngày đăng và Sao đánh giá bên dưới tiêu đề
    $("kpArticle").innerHTML =
      '<span class="kp-kicker">📍 ' + esc(a.dest) + " · " + esc(a.cat) + " · " + esc(a.region) + "</span>" +
      '<h1 class="kp-article-title">' + esc(a.title) + '</h1>' +
      
      '<div class="kp-byline" style="margin-bottom: 20px; font-size: 15px;">' + 
        avatar(authorName) + 
        '<strong>' + esc(authorName) + '</strong>' +
        '<span class="kp-dot">·</span>' +
        '<span>' + esc(authorDate) + '</span>' +
        '<span class="kp-dot">·</span>' +
        '<span class="kp-rate" style="color: #f59e0b; font-weight: 600;">★ ' + rate(a.rating) + '</span>' +
        '<span style="color: #6b7280; font-size: 14px;"> (' + count + ' đánh giá)</span>' +
      '</div>' +

      mainImageHtml +
      
      '<p class="kp-lead-plain">' + esc(a.excerpt) + "</p>" +
      
      '<div class="kp-body-text">' + body + "</div>" +
      
      '<h3>Gợi ý tour</h3>' +
      '<div class="kp-cta kp-cta--end"><div><b>Sẵn sàng cho chuyến đi này?</b><small>' + esc(tourName) + " · từ " + priceStr + "</small></div>" +
        '<a class="kp-btn kp-btn--cta" href="' + tourLink + '">XEM TOUR &amp; ĐẶT TOUR →</a></div>' +
        
      '<section class="kp-reviews" id="kpReviews">' +
        '<div class="kp-reviews__head"><h2>Đánh giá</h2><button type="button" class="kp-btn kp-btn--ghost kp-btn--sm" id="kpToggleForm">+ Viết đánh giá</button></div>' +
        '<div class="kp-score"><strong>★ ' + rate(a.rating) + "</strong><span>Đánh giá từ du khách về " + esc(a.dest) + ".<br>" + count + " lượt đánh giá.</span></div>" +
        '<form class="kp-form" id="kpReviewForm" novalidate hidden>' +
          "<h3>Gửi đánh giá cho " + esc(a.dest) + "</h3>" +
          '<div class="kp-field"><label for="kpRevName">Họ và tên</label><input id="kpRevName" type="text" maxlength="60" placeholder="VD: Nguyễn Văn A" /></div>' +
          '<div class="kp-field"><label for="kpRevStars">Số sao</label><select id="kpRevStars"><option value="5">★★★★★ — 5 sao</option><option value="4">★★★★ — 4 sao</option><option value="3">★★★ — 3 sao</option><option value="2">★★ — 2 sao</option><option value="1">★ — 1 sao</option></select></div>' +
          '<div class="kp-field"><label for="kpRevText">Cảm nhận của bạn</label><textarea id="kpRevText" rows="3" maxlength="600" placeholder="Chia sẻ kinh nghiệm chuyến đi, món ăn, chỗ ở..."></textarea></div>' +
          '<div class="kp-form__err" id="kpRevErr" role="alert"></div>' +
          '<button type="submit" class="kp-btn kp-btn--primary">Gửi đánh giá</button>' +
        "</form>" +
        '<div id="kpReviewList">' + mine.map(function (r) { return reviewHtml(r, true); }).join("") +
          sampleReviews.map(function (r) { return reviewHtml(r, false); }).join("") + "</div>" +
      "</section>" +
      (more.length ? '<section class="kp-related"><h2>Bài viết cùng chủ đề</h2><div class="kp-grid">' + more.map(function (x) { return cardHtml(x, false); }).join("") + "</div></section>" : "");

    bindReviewForm(a);
    if ($("kpList")) $("kpList").hidden = true;
    if ($("kpRead")) $("kpRead").hidden = false;
    document.title = a.title + " | VivuGo";
    window.scrollTo(0, 0);
    return true;
  }

  function bindReviewForm(a) {
    var form = $("kpReviewForm");
    if ($("kpToggleForm")) {
      $("kpToggleForm").addEventListener("click", function () {
        form.hidden = !form.hidden;
        if (!form.hidden && $("kpRevName")) $("kpRevName").focus();
      });
    }
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("kpRevName").value.trim();
        var text = $("kpRevText").value.trim();
        var bad = name.length < 2 ? "kpRevName" : text.length < 5 ? "kpRevText" : "";
        if ($("kpRevName")) $("kpRevName").classList.remove("is-invalid");
        if ($("kpRevText")) $("kpRevText").classList.remove("is-invalid");
        if (bad) {
          if ($("kpRevErr")) $("kpRevErr").textContent = bad === "kpRevName" ? "Vui lòng nhập họ tên." : "Vui lòng nhập cảm nhận của bạn.";
          if ($(bad)) { $(bad).classList.add("is-invalid"); $(bad).focus(); }
          return;
        }
        if ($("kpRevErr")) $("kpRevErr").textContent = "";
        var review = { user: name, rating: parseInt($("kpRevStars").value, 10) || 5, date: "Vừa xong", tag: "", comment: text };
        try {
          var all = getReviews();
          all[a.id] = [review].concat(all[a.id] || []);
          localStorage.setItem(REVIEW_KEY, JSON.stringify(all));
        } catch (err) {}
        if ($("kpReviewList")) $("kpReviewList").insertAdjacentHTML("afterbegin", reviewHtml(review, true));
        if ($("kpRevName")) $("kpRevName").value = ""; 
        if ($("kpRevText")) $("kpRevText").value = ""; 
        form.hidden = true;
        toast("Cảm ơn bạn! Đánh giá đã được ghi nhận.");
      });
    }
  }

  function showList() {
    if ($("kpRead")) $("kpRead").hidden = true;
    if ($("kpList")) $("kpList").hidden = false;
    document.title = "Khám phá điểm đến | VivuGo";
    window.requestAnimationFrame(function () { window.scrollTo(0, listScroll); });
  }

  function route() {
    var h = decodeURIComponent(location.hash || "");
    if (h.indexOf(ROUTE) === 0 && openArticle(h.slice(ROUTE.length))) return;
    if (h.indexOf(ROUTE) === 0) location.hash = "";
    showList();
  }

  function toast(msg) {
    var t = $("kpToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 3200);
  }

  function fixHeaderOffset() {
    var hd = document.querySelector(".site-header");
    var main = $("kpMain");
    if (!hd || !main) return;
    main.style.paddingTop = "";
    if (getComputedStyle(hd).position !== "fixed") return;
    var covered = hd.getBoundingClientRect().bottom - main.getBoundingClientRect().top;
    if (covered > 0) main.style.paddingTop = Math.ceil(covered) + "px";
  }

  /* ===== SỰ KIỆN ===== */
  function bindEvents() {
    if ($("kpSearchForm")) $("kpSearchForm").addEventListener("submit", function (e) { e.preventDefault(); closePanel(); });
    if ($("kpQuery")) {
      $("kpQuery").addEventListener("input", function () { state.q = this.value; state.shown = PAGE_SIZE; renderList(); });
      $("kpQuery").addEventListener("focus", closePanel);
    }

    if ($("kpFilterBtn")) $("kpFilterBtn").addEventListener("click", function () { $("kpFilterPanel").hidden ? openPanel() : closePanel(); });
    if ($("kpFilterClose")) $("kpFilterClose").addEventListener("click", closePanel);
    if ($("kpFilterDone")) {
      $("kpFilterDone").addEventListener("click", function () {
        closePanel();
        if ($("kpLatest")) window.scrollTo({ top: Math.max(0, $("kpLatest").getBoundingClientRect().top + window.pageYOffset - 90), behavior: "smooth" });
      });
    }
    if ($("kpFilterClear")) $("kpFilterClear").addEventListener("click", resetFilters);
    if ($("kpEmptyClear")) $("kpEmptyClear").addEventListener("click", resetFilters);

    if ($("kpFilterBody")) {
      $("kpFilterBody").addEventListener("click", function (e) {
        var b = e.target.closest("[data-f]");
        if (!b) return;
        state[b.getAttribute("data-f")] = b.getAttribute("data-v");
        refresh();
      });
    }

    if ($("kpActive")) {
      $("kpActive").addEventListener("click", function (e) {
        var b = e.target.closest("[data-clear]");
        if (!b) return;
        var k = b.getAttribute("data-clear");
        if (k === "all") { state.region = ""; state.type = ""; state.cat = ""; } else state[k] = "";
        refresh();
      });
    }

    if ($("kpMore")) $("kpMore").addEventListener("click", function () { state.shown += PAGE_SIZE; renderList(); });

    document.addEventListener("click", function (e) {
      if (!$("kpFilterPanel") || $("kpFilterPanel").hidden || isMobile() || !e.target.isConnected) return;
      if (!e.target.closest("#kpFilterPanel") && !e.target.closest("#kpFilterBtn")) closePanel();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

    if ($("kpMain")) {
      $("kpMain").addEventListener("click", function (e) {
        if (e.target.closest("a.kp-card") && $("kpList") && !$("kpList").hidden) listScroll = window.pageYOffset;
      });
    }
    if ($("kpBack")) $("kpBack").addEventListener("click", function () { location.hash = ""; });

    window.addEventListener("hashchange", route);
    window.addEventListener("resize", fixHeaderOffset);
    window.addEventListener("load", fixHeaderOffset);

    var hdBox = $("site-header");
    if (hdBox && window.MutationObserver) new MutationObserver(fixHeaderOffset).observe(hdBox, { childList: true, subtree: true });
  }

  /* ===== KHỞI TẠO ===== */
  function init(d) {
    data = d;
    articles = d.articles || [];
    if ($("kpNote")) $("kpNote").textContent = (d.meta && d.meta.note) || "";
    
    var heroElem = document.querySelector('.kp-hero');
    if (heroElem && d.meta && d.meta.bannerImage) {
      var bannerUrl = IMG_BASE + encodeURIComponent(d.meta.bannerImage);
      heroElem.style.backgroundImage = 'linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("' + bannerUrl + '")';
    }

    bindEvents();
    renderFilterPanel();
    renderList();
    fixHeaderOffset();
    route();
  }

  function showError(err) {
    if ($("kpGrid")) {
      $("kpGrid").innerHTML = '<div class="kp-loading">' + (location.protocol === "file:"
        ? "Không đọc được kpdd.json khi mở trực tiếp từ file. Hãy mở bằng Live Server."
        : "Không đọc được dữ liệu. Kiểm tra file data/kpdd.json và đường dẫn DATA_URL.") + "</div>";
    }
    console.error("Lỗi nạp dữ liệu Khám phá điểm đến:", err);
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) { try { init(d); } catch (err) { showError(err); } })
    .catch(showError);
})();