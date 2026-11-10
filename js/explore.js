(function () {
  "use strict";

  /* ==========================================================================
     1. CẤU HÌNH ĐƯỜNG DẪN & HẰNG SỐ DỰ ÁN
     ========================================================================== */
  var DATA_URL = "../data/explore.json";      // Dữ liệu bài viết Khám phá
  var TOUR_DATA_URL = "../data/tour.json";    // Dữ liệu danh sách Tour
  var IMG_BASE = "../assets/explore/";        // Thư mục ảnh bài viết
  var REVIEW_KEY = "vivugo_kpdd_reviews";     // Khóa LocalStorage lưu đánh giá
  var PAGE_SIZE = 9;
  var FEATURED_MAX = 3;
  var ROUTE = "#bai-viet/";

  /* ==========================================================================
     2. HÀM TIỆN ÍCH DÙNG CHUNG
     ========================================================================== */
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
  function dateVN(s) { return s ? s.split('-').reverse().join('/') : ''; }
  function fixImgPath(path) { return path ? path.replace('/images/tours/', '/tours/') : ''; }

  function avatar(name, large) {
    var w = String(name || "?").trim().split(/\s+/);
    var ini = (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : w[0][0]).toUpperCase();
    var h = 0;
    for (var i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) % 4;
    return '<span class="kp-avatar' + (large ? " kp-avatar--lg" : "") + '" data-tone="' + h + '" aria-hidden="true">' + esc(ini) + "</span>";
  }

  /* ==========================================================================
     3. QUẢN LÝ TRẠNG THÁI (STATE)
     ========================================================================== */
  var data = {};
  var articles = [];
  var tourDataList = [];
  var tourPolicy = "";
  var currentTour = null;
  var state = { q: "", region: "", type: "", cat: "", shown: PAGE_SIZE };
  var listScroll = 0;
  var toastTimer = null;
  var scrim = null;

  /* ==========================================================================
     4. TẠO HTML CHO CARDS & BỘ LỌC BÀI VIẾT (ĐÃ XÓA ICON)
     ========================================================================== */
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

  function cardHtml(a, feature) {
    var aTypes = a.types || [];
    var tags = aTypes.slice(0, 3).map(function (t) { return '<span class="kp-tag">' + esc(t) + "</span>"; }).join("");
    var authorName = (a.author && a.author.name) || "VivuGo";
    var tourPrice = (a.tour && a.tour.price) ? fmt(a.tour.price) : "Liên hệ";

    return '<a class="kp-card' + (feature ? " kp-card--feature" : "") + '" href="' + ROUTE + encodeURIComponent(a.id) + '" aria-label="Đọc bài: ' + esc(a.title) + '">' +
      (feature ? '<span class="kp-card__flag">NỔI BẬT</span>' : "") +
      coverHtml(a) +
      '<div class="kp-card__body">' +
        '<div class="kp-card__top"><span class="kp-kicker">' + esc(a.cat) + '</span><span class="kp-rate" style="color: #FF9D16;">★ ' + rate(a.rating) + "</span></div>" +
        "<h3>" + esc(a.title) + "</h3>" +
        '<div class="kp-loc">' + esc(a.dest) + " · " + esc(a.region) + "</div>" +
        '<p class="kp-card__ex">' + esc(a.excerpt) + "</p>" +
        (tags ? '<div class="kp-tags">' + tags + "</div>" : "") +
        '<div class="kp-byline">' + avatar(authorName) + "<strong>" + esc(authorName) + '</strong><span class="kp-dot">·</span><span>' + esc(a.read || 5) + " phút đọc</span></div>" +
        '<div class="kp-card__foot"><span>' + (a.tour && a.tour.price ? 'Tour từ <b>' + tourPrice + '</b>' : 'Bài viết kinh nghiệm') + '</span><span class="kp-card__go">ĐỌC BÀI VIẾT</span></div>' +
      "</div></a>";
  }

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

      if ($("kpFeatured")) {
        $("kpFeatured").hidden = !feat.length;
        if ($("kpFeaturedGrid")) $("kpFeaturedGrid").innerHTML = feat.map(function (a) { return cardHtml(a, true); }).join("");
      }

      if ($("kpLatestTitle")) $("kpLatestTitle").textContent = "Tất cả bài viết";
      var remainingArticles = items.filter(function (a) {
        return !feat.some(function (f) { return f.id === a.id; });
      }).sort(function (x, y) {
        return (y.published || "").localeCompare(x.published || "");
      });

      var visible = remainingArticles.slice(0, state.shown);
      if ($("kpGrid")) $("kpGrid").innerHTML = visible.map(function (a) { return cardHtml(a, false); }).join("");
      if ($("kpMoreBox")) $("kpMoreBox").hidden = remainingArticles.length <= visible.length;

    } else {
      if ($("kpFeatured")) $("kpFeatured").hidden = true;
      if ($("kpLatestTitle")) $("kpLatestTitle").textContent = "Kết quả phù hợp";
      if ($("kpLatestSub")) $("kpLatestSub").textContent = state.q.trim() ? 'Kết quả cho "' + state.q.trim() + '"' : "Bài viết khớp với bộ lọc của bạn.";

      var visibleSearch = items.slice(0, state.shown);
      if ($("kpGrid")) $("kpGrid").innerHTML = visibleSearch.map(function (a) { return cardHtml(a, false); }).join("");
      if ($("kpMoreBox")) $("kpMoreBox").hidden = items.length <= visibleSearch.length;
    }
  }

  function refresh() { state.shown = PAGE_SIZE; renderFilterPanel(); renderList(); }
  function resetFilters() { state.q = ""; state.region = ""; state.type = ""; state.cat = ""; if ($("kpQuery")) $("kpQuery").value = ""; refresh(); }
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

  /* ==========================================================================
     5. POPUP FORM ĐẶT TOUR VÀ THÔNG BÁO THÀNH CÔNG
     ========================================================================== */
  function openBookingFormPopup() {
    var t = currentTour;
    if (!t) return;

    var deps = (t.departures || []).map(function (d, i) {
      return '<option value="' + i + '">' + dateVN(d.date) + ' · ' + esc(d.time) + '</option>';
    }).join('');

    var formHtml =
      '<div class="modal-overlay is-open" id="kpBookingOverlay" style="z-index: 10000;">' +
        '<div class="booking-modal" role="dialog" aria-modal="true">' +
          '<div class="booking-modal-head">' +
            '<div><span class="modal-kicker">Đặt tour</span><h3>' + esc(t.name) + '</h3></div>' +
            '<button type="button" class="modal-close" id="closeKpBookingModal">&times;</button>' +
          '</div>' +
          '<div class="booking-provider-bar">' +
            '<div><strong>' + esc(t.from) + ' → ' + esc(t.to) + '</strong><p>Thời lượng: ' + esc(t.duration) + '</p></div>' +
            '<div class="booking-price">' + fmt(t.price) + '<small>/khách</small></div>' +
          '</div>' +
          '<form id="kpBookingForm" class="booking-form" novalidate>' +
            '<div class="form-row">' +
              '<div class="form-group"><label for="kpDepDate">Ngày khởi hành</label><select id="kpDepDate">' + deps + '</select></div>' +
              '<div class="form-group"><label for="kpQty">Số lượng vé</label><input type="number" id="kpQty" min="1" value="1" /></div>' +
            '</div>' +
            '<div class="form-group"><label for="kpName">Họ và tên *</label><input type="text" id="kpName" placeholder="Nguyễn Văn A" required /></div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label for="kpPhone">Số điện thoại *</label><input type="tel" id="kpPhone" placeholder="0912 345 678" required /></div>' +
              '<div class="form-group"><label for="kpEmail">Email *</label><input type="email" id="kpEmail" placeholder="email@example.com" required /></div>' +
            '</div>' +
            '<div class="form-group"><label for="kpNote">Ghi chú (tuỳ chọn)</label><input type="text" id="kpNote" placeholder="Ăn chay, đón khách sạn..." /></div>' +
            '<div class="form-group">' +
              '<label for="kpPay">Thanh toán</label>' +
              '<select id="kpPay"><option>VietQR - Quét mã</option><option>Thẻ Visa / Master</option><option>Ví MoMo</option><option>Thanh toán sau</option></select>' +
            '</div>' +
            '<div class="booking-summary">' +
              '<div class="summary-line"><span>Đơn giá</span><span id="kpSumBase">' + fmt(t.price) + '</span></div>' +
              '<div class="summary-total"><span id="kpTotalLabel">Tổng tiền (1 vé)</span><strong id="kpTotalAmount">' + fmt(t.price) + '</strong></div>' +
            '</div>' +
            '<button type="submit" class="btn-confirm">Xác Nhận Đặt Tour</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    var oldB = $("kpBookingOverlay");
    if (oldB) oldB.remove();

    document.body.insertAdjacentHTML("beforeend", formHtml);

    function calcTotal() {
      var q = Math.max(1, parseInt($("kpQty").value, 10) || 1);
      var total = t.price * q;
      if ($("kpSumBase")) $("kpSumBase").textContent = fmt(total);
      if ($("kpTotalLabel")) $("kpTotalLabel").textContent = "Tổng tiền (" + q + " vé)";
      if ($("kpTotalAmount")) $("kpTotalAmount").textContent = fmt(total);
      return total;
    }

    if ($("kpQty")) $("kpQty").oninput = calcTotal;

    function closeB() {
      var b = $("kpBookingOverlay");
      if (b) b.remove();
    }

    if ($("closeKpBookingModal")) $("closeKpBookingModal").onclick = closeB;
    if ($("kpBookingOverlay")) {
      $("kpBookingOverlay").onclick = function (e) { if (e.target === this) closeB(); };
    }

    if ($("kpBookingForm")) {
      $("kpBookingForm").onsubmit = function (e) {
        e.preventDefault();
        var name = $("kpName").value.trim();
        var phone = $("kpPhone").value.trim();
        var email = $("kpEmail").value.trim();

        if (!name || !phone || !email) {
          alert("Vui lòng điền đầy đủ thông tin Họ tên, Số điện thoại và Email!");
          return;
        }

        var totalMoney = calcTotal();
        closeB();
        var detailModal = $("kpTourPopupOverlay");
        if (detailModal) detailModal.remove();
        document.body.classList.remove("kp-lock");

        showSuccessPopup(t, name, email, totalMoney);
      };
    }
  }

  function showSuccessPopup(t, name, email, totalMoney) {
    var code = 'TOUR-' + Math.floor(100000 + Math.random() * 900000);
    var successHtml =
      '<div class="modal-overlay is-open" id="kpSuccessOverlay" style="z-index: 10001;">' +
        '<div class="success-modal" role="dialog" aria-modal="true">' +
          '<div class="success-head">' +
            '<div><strong>Đặt Chỗ Thành Công</strong><p>Xác nhận tức thời</p></div>' +
            '<button type="button" class="modal-close" id="closeKpSuccess">&times;</button>' +
          '</div>' +
          '<div class="success-body">' +
            '<div class="success-check">✓</div>' +
            '<h3>Chúc mừng bạn đã đặt chỗ thành công!</h3>' +
            '<div class="order-code">' + code + '</div>' +
            '<div class="success-info">' +
              '<div class="info-row"><span>Khách hàng:</span><strong>' + esc(name) + '</strong></div>' +
              '<div class="info-row"><span>Email:</span><strong>' + esc(email) + '</strong></div>' +
              '<div class="info-row"><span>Dịch vụ:</span><strong>' + esc(t.name) + '</strong></div>' +
              '<div class="info-row"><span>Tổng thanh toán:</span><strong class="amount">' + fmt(totalMoney) + '</strong></div>' +
            '</div>' +
            '<button type="button" class="btn-primary btn-block" id="kpBtnCloseSuccess">Đóng</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var oldS = $("kpSuccessOverlay");
    if (oldS) oldS.remove();

    document.body.insertAdjacentHTML("beforeend", successHtml);

    function closeS() {
      var s = $("kpSuccessOverlay");
      if (s) s.remove();
    }

    if ($("closeKpSuccess")) $("closeKpSuccess").onclick = closeS;
    if ($("kpBtnCloseSuccess")) $("kpBtnCloseSuccess").onclick = closeS;
    if ($("kpSuccessOverlay")) {
      $("kpSuccessOverlay").onclick = function (e) { if (e.target === this) closeS(); };
    }
  }

  /* ==========================================================================
     6. POPUP CHI TIẾT TOUR
     ========================================================================== */
  function openTourDetailPopup(tourId) {
    var t = currentTour = tourDataList.find(function (x) { return x.id === Number(tourId); });
    if (!t) {
      toast("Không tìm thấy thông tin tour!");
      return;
    }

    var li = function (a) { return (a || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); };
    var tl = (t.itinerary || []).map(function (s) {
      return '<li><span class="t-time">' + esc(s.time) + '</span><div>' + esc(s.title) + (s.desc ? '<span class="t-desc">' + esc(s.desc) + '</span>' : '') + '</div></li>';
    }).join('');

    var rows = [1, 2, 4, 6].map(function (n) {
      return '<tr><td>' + n + ' khách</td><td>' + fmt(t.price) + '</td><td><strong>' + fmt(t.price * n) + '</strong></td></tr>';
    }).join('');

    var badges = (t.booked >= 40000 ? '<span class="car-badge hot">Hot</span>' : '') +
                 (t.discount ? '<span class="car-badge sale">Giảm ' + t.discount + '%</span>' : '');

    var media = function (i, label) {
      var src = t.images && t.images[i] ? fixImgPath(t.images[i]) : '';
      return '<div class="media-placeholder" data-label="' + label + '">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(t.name) + '">' : '') + '</div>';
    };

    var popupHtml =
      '<div class="modal-overlay is-open" id="kpTourPopupOverlay" style="z-index: 9999;">' +
        '<div class="booking-modal detail-modal" id="kpTourDetailModal" role="dialog" aria-modal="true">' +
          '<button type="button" class="modal-close" id="closeKpTourPopup">&times;</button>' +
          '<div class="gallery">' + [0, 1, 2, 3, 4].map(function (i) { return media(i, i ? 'Ảnh ' + (i + 1) : 'Ảnh chính'); }).join('') + '</div>' +
          '<div class="detail-top">' +
            '<div><h2>' + esc(t.name) + '</h2><div class="badge-row" style="position:static;margin-top:8px">' + badges + '</div>' +
              '<div class="detail-price">' + fmt(t.price) + ' <small>/khách · đã gồm thuế</small></div>' +
              (t.discount ? '<span class="old-price">' + fmt(t.priceOriginal) + '</span>' : '') +
            '</div>' +
            '<button type="button" class="btn-cta btn-trigger-booking">Đặt tour ngay</button>' +
          '</div>' +
          '<div class="quick-info">' +
            '<div><span>Đánh giá</span><span style="color:#FF9D16;">★</span> ' + rate(t.rating) + ' (' + (t.reviews || 0).toLocaleString('vi-VN') + ')</div>' +
            '<div><span>Thời lượng</span>' + esc(t.duration) + '</div>' +
            '<div><span>Khởi hành từ</span>' + esc(t.from) + '</div>' +
          '</div>' +
          '<div class="detail-body">' +
            '<div class="tab-bar">' + ['Lịch trình', 'Bao gồm', 'Bảng giá', 'Chính sách'].map(function (n, i) {
              return '<button type="button" class="tab-btn' + (i === 0 ? ' is-active' : '') + '" data-tab="' + i + '">' + n + '</button>';
            }).join('') + '</div>' +

            '<div class="tab-panel is-active">' +
              '<h4 class="panel-h">Điểm nổi bật</h4><ul class="hl-list">' + li(t.highlights) + '</ul>' +
              '<h4 class="panel-h">Lịch trình chi tiết</h4>' +
              '<button type="button" class="acc-head" id="kpAccHead">Ngày 1 · ' + esc(t.to) + ' <span>▾</span></button>' +
              '<ul class="timeline" id="kpAccBody">' + tl + '</ul>' +
              '<p class="section-sub">' + esc(t.itineraryNote || '') + '</p>' +
            '</div>' +

            '<div class="tab-panel">' +
              '<h4 class="panel-h">Bao gồm</h4><ul class="inc-list">' + li(t.includes) + '</ul>' +
              '<h4 class="panel-h">Không bao gồm</h4><ul class="exc-list">' + li(t.excludes) + '</ul>' +
              '<h4 class="panel-h">Phương tiện</h4><ul class="note-list">' + li(t.vehicle) + '</ul>' +
              '<h4 class="panel-h">Tập trung / đón khách</h4><p style="font-size:13.5px">' + esc(t.pickup || '') + '</p>' +
            '</div>' +

            '<div class="tab-panel"><table class="price-table"><tr><th>Số lượng</th><th>Đơn giá</th><th>Tổng</th></tr>' + rows + '</table>' +
              '<p class="section-sub">Giá quy đổi ước tính, đã bao gồm thuế.</p>' +
            '</div>' +

            '<div class="tab-panel">' +
              '<h4 class="panel-h">Điều kiện &amp; chính sách hủy</h4><p style="font-size:13.5px">' + esc(tourPolicy) + '</p>' +
              '<h4 class="panel-h">Lưu ý trước khi đặt</h4><ul class="note-list">' + li(t.notes) + '</ul>' +
            '</div>' +
          '</div>' +
          '<div class="detail-cta"><span class="section-sub" style="margin:0">Giá từ <strong>' + fmt(t.price) + '</strong>/khách</span>' +
            '<button type="button" class="btn-cta btn-trigger-booking">Đặt tour ngay</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var oldPopup = $("kpTourPopupOverlay");
    if (oldPopup) oldPopup.remove();

    document.body.insertAdjacentHTML("beforeend", popupHtml);
    document.body.classList.add("kp-lock");

    function closePopup() {
      var p = $("kpTourPopupOverlay");
      if (p) p.remove();
      document.body.classList.remove("kp-lock");
    }

    if ($("closeKpTourPopup")) $("closeKpTourPopup").onclick = closePopup;
    if ($("kpTourPopupOverlay")) {
      $("kpTourPopupOverlay").onclick = function (e) {
        if (e.target === this) closePopup();
      };
    }

    var popupElem = $("kpTourDetailModal");
    if (popupElem) {
      popupElem.querySelectorAll('.btn-trigger-booking').forEach(function (btn) {
        btn.onclick = openBookingFormPopup;
      });

      popupElem.querySelectorAll('.tab-btn').forEach(function (b) {
        b.onclick = function () {
          popupElem.querySelectorAll('.tab-btn').forEach(function (x) { x.classList.toggle('is-active', x === b); });
          popupElem.querySelectorAll('.tab-panel').forEach(function (p, i) { p.classList.toggle('is-active', i === +b.dataset.tab); });
        };
      });

      var accBtn = $("kpAccHead");
      if (accBtn) {
        accBtn.onclick = function () {
          var body = $("kpAccBody");
          if (body) body.hidden = !body.hidden;
        };
      }
      popupElem.scrollTop = 0;
    }
  }

  /* ==========================================================================
     7. CHI TIẾT BÀI VIẾT (ẨN KHỐI CTA NẾU BÀI VIẾT KHÔNG CÓ TOUR)
     ========================================================================== */
  function getReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); } catch (e) { return {}; }
  }

  function reviewHtml(r, mine) {
    return '<div class="kp-review"><div class="kp-review__top"><div class="kp-review__who">' + avatar(r.user) +
      '<div><div class="kp-review__name"><span>' + esc(r.user) + '</span><span class="kp-sample">' + (mine ? "Mới gửi" : "Đánh giá") + "</span></div>" +
      '<div class="kp-review__meta">' + esc(r.date) + (r.tag ? " · " + esc(r.tag) : "") + "</div></div></div>" +
      '<div class="kp-review__stars" style="color: #FF9D16;">★ ' + esc(r.rating) + "/5</div></div><p>" + esc(r.comment) + "</p></div>";
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
    var allReviews = mine.concat(sampleReviews);
    var count = allReviews.length;
    var avgRating = 5.0;

    if (count > 0) {
      var totalStars = allReviews.reduce(function (sum, r) { return sum + (Number(r.rating) || 5); }, 0);
      avgRating = totalStars / count;
    }

    var authorName = (a.author && a.author.name) || "VivuGo";
    var authorDate = (a.author && a.author.date) || a.published || "";

    // Kiểm tra xem bài viết có tour liên quan hay không
    var hasTour = a.tour && (a.tour.id || a.tour.name);
    var tourCtaHtml = "";

    if (hasTour) {
      var tourName = a.tour.name || "Tour du lịch";
      var tourPrice = a.tour.price ? fmt(a.tour.price) : "Liên hệ";
      var tourUnit = a.tour.unit || "khách";
      var priceStr = tourPrice + "/" + esc(tourUnit);
      var tourId = a.tour.id || 1;

      tourCtaHtml = 
        '<h3>Gợi ý tour</h3>' +
        '<div class="kp-cta kp-cta--end">' +
          '<div><b>Sẵn sàng cho chuyến đi này?</b><small>' + esc(tourName) + ' · từ ' + priceStr + '</small></div>' +
          '<button type="button" class="kp-btn kp-btn--cta" id="kpBtnOpenTourModal" data-tour-id="' + tourId + '">Xem tour & Đặt tour</button>' +
        '</div>';
    }

    var mainImageHtml = a.image 
      ? '<div class="kp-section-image"><img src="' + esc(IMG_BASE + encodeURIComponent(a.image)) + '" alt="' + esc(a.title) + '" /></div>' 
      : coverHtml(a);

    var body = (a.sections || []).map(function (s) {
      var imgHtml = s.image 
        ? '<figure class="kp-section-image"><img src="' + esc(IMG_BASE + encodeURIComponent(s.image)) + '" alt="' + esc(s.imageCaption || s.h) + '" /><figcaption>' + esc(s.imageCaption || "") + '</figcaption></figure>' 
        : "";
      return '<div class="kp-content-section"><h2>' + esc(s.h) + '</h2><p>' + esc(s.p) + '</p>' + imgHtml + '</div>';
    }).join("");

    var more = related(a);

    $("kpArticle").innerHTML =
      '<span class="kp-kicker">' + esc(a.dest) + " · " + esc(a.cat) + " · " + esc(a.region) + "</span>" +
      '<h1 class="kp-article-title">' + esc(a.title) + '</h1>' +
      
      '<div class="kp-byline" style="margin-bottom: 20px; font-size: 15px; display: flex; align-items: center; gap: 8px;">' + 
        avatar(authorName) + 
        '<strong>' + esc(authorName) + '</strong><span class="kp-dot">·</span><span>' + esc(authorDate) + '</span><span class="kp-dot">·</span>' +
        '<span class="kp-rate" style="color: #FF9D16; font-weight: 600;">★ ' + rate(avgRating) + '</span>' +
        '<span style="color: #6b7280; font-size: 14px;"> (' + count + ' đánh giá)</span>' +
      '</div>' +

      mainImageHtml +
      '<p class="kp-lead-plain">' + esc(a.excerpt) + "</p>" +
      '<div class="kp-body-text">' + body + "</div>" +
      
      /* Chèn khối CTA (Chỉ xuất hiện khi bài viết có Tour) */
      tourCtaHtml +
        
      '<section class="kp-reviews" id="kpReviews">' +
        '<div class="kp-reviews__head"><h2>Đánh giá</h2><button type="button" class="kp-btn kp-btn--ghost kp-btn--sm" id="kpToggleForm">+ Viết đánh giá</button></div>' +
        '<div class="kp-score"><strong style="color:#FF9D16;">★ ' + rate(avgRating) + "</strong><span>Đánh giá từ du khách về " + esc(a.dest) + ".<br>" + count + " lượt đánh giá.</span></div>" +
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

    // Gắn sự kiện mở Popup Chi tiết Tour khi click nút CTA
    if ($("kpBtnOpenTourModal")) {
      $("kpBtnOpenTourModal").onclick = function () {
        var tid = this.getAttribute("data-tour-id");
        openTourDetailPopup(tid);
      };
    }

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
      $("kpToggleForm").onclick = function () {
        form.hidden = !form.hidden;
        if (!form.hidden && $("kpRevName")) $("kpRevName").focus();
      };
    }
    if (form) {
      form.onsubmit = function (e) {
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
        
        if ($("kpRevName")) $("kpRevName").value = ""; 
        if ($("kpRevText")) $("kpRevText").value = ""; 
        form.hidden = true;
        toast("Cảm ơn bạn! Đánh giá đã được ghi nhận.");
        openArticle(a.id);
      };
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

  function bindEvents() {
    if ($("kpSearchForm")) $("kpSearchForm").onsubmit = function (e) { e.preventDefault(); closePanel(); };
    if ($("kpQuery")) {
      $("kpQuery").oninput = function () { state.q = this.value; state.shown = PAGE_SIZE; renderList(); };
      $("kpQuery").onfocus = closePanel;
    }

    if ($("kpFilterBtn")) $("kpFilterBtn").onclick = function () { $("kpFilterPanel").hidden ? openPanel() : closePanel(); };
    if ($("kpFilterClose")) $("kpFilterClose").onclick = closePanel;
    if ($("kpFilterDone")) {
      $("kpFilterDone").onclick = function () {
        closePanel();
        if ($("kpLatest")) window.scrollTo({ top: Math.max(0, $("kpLatest").getBoundingClientRect().top + window.pageYOffset - 90), behavior: "smooth" });
      };
    }
    if ($("kpFilterClear")) $("kpFilterClear").onclick = resetFilters;
    if ($("kpEmptyClear")) $("kpEmptyClear").onclick = resetFilters;

    if ($("kpFilterBody")) {
      $("kpFilterBody").onclick = function (e) {
        var b = e.target.closest("[data-f]");
        if (!b) return;
        state[b.getAttribute("data-f")] = b.getAttribute("data-v");
        refresh();
      };
    }

    if ($("kpActive")) {
      $("kpActive").onclick = function (e) {
        var b = e.target.closest("[data-clear]");
        if (!b) return;
        var k = b.getAttribute("data-clear");
        if (k === "all") { state.region = ""; state.type = ""; state.cat = ""; } else state[k] = "";
        refresh();
      };
    }

    if ($("kpMore")) $("kpMore").onclick = function () { state.shown += PAGE_SIZE; renderList(); };

    document.onclick = function (e) {
      if (!$("kpFilterPanel") || $("kpFilterPanel").hidden || isMobile() || !e.target.isConnected) return;
      if (!e.target.closest("#kpFilterPanel") && !e.target.closest("#kpFilterBtn")) closePanel();
    };
    document.onkeydown = function (e) { if (e.key === "Escape") closePanel(); };

    if ($("kpMain")) {
      $("kpMain").onclick = function (e) {
        if (e.target.closest("a.kp-card") && $("kpList") && !$("kpList").hidden) listScroll = window.pageYOffset;
      };
    }
    if ($("kpBack")) $("kpBack").onclick = function () { location.hash = ""; };

    window.onhashchange = route;
    window.onresize = fixHeaderOffset;
    window.onload = fixHeaderOffset;
  }

  function init(exploreJson) {
    data = exploreJson;
    articles = exploreJson.articles || [];
    if ($("kpNote")) $("kpNote").textContent = (exploreJson.meta && exploreJson.meta.note) || "";

    bindEvents();
    renderFilterPanel();
    renderList();
    fixHeaderOffset();
    route();
  }

  function showError(err) {
    if ($("kpGrid")) {
      $("kpGrid").innerHTML = '<div class="kp-loading">Không nạp được dữ liệu bài viết hoặc tour.json. Vui lòng kiểm tra Live Server.</div>';
    }
    console.error("Lỗi:", err);
  }

  // Tải đồng thời dữ liệu explore.json và tour.json
  Promise.all([
    fetch(DATA_URL).then(function (r) { return r.json(); }),
    fetch(TOUR_DATA_URL).then(function (r) { return r.json(); })
  ]).then(function (res) {
    tourDataList = res[1].tours || [];
    tourPolicy = res[1].policy || "";
    init(res[0]);
  }).catch(showError);

})();