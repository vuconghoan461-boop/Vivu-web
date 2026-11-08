(function () {
  'use strict';

  var DEFAULT_SRC = '../../data/Vehicles.json';
  // Số tuyến tối đa mỗi loại hiển thị ở tab "Tất cả"
  var ALL_PER_MODE = 3;

  var holder = document.querySelector('[data-vehicles-src]');
  var DATA_URL = (holder && holder.getAttribute('data-vehicles-src')) || DEFAULT_SRC;

  // Trạng thái bộ lọc chuyến bay
  var flightState = { airline: 'all', cls: 'economy' };
  var allFlights = [];

  /* ---------- Tiện ích ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function duration(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + ' phút';
    if (!m) return h + ' giờ';
    return h + ' giờ ' + (m < 10 ? '0' : '') + m + ' phút';
  }

  function byPrice(a, b) {
    return a.price - b.price;
  }

  /* ---------- Chuẩn hóa dữ liệu về cùng một dạng thẻ ---------- */

  // cls: 'economy' | 'business'. showClass: hiện tên hạng ghế trên thẻ (dùng ở tab Máy bay)
  function fromFlight(f, cls, showClass) {
    var isBiz = cls === 'business';
    var mode = 'Máy bay · ' + f.airline + ' ' + f.flightNumber;
    if (showClass) mode += ' · ' + (isBiz ? 'Thương gia' : 'Phổ thông');
    return {
      type: 'flight',
      id: f.id,
      mode: mode,
      from: f.fromCity,
      to: f.toCity,
      meta: [
        'Khởi hành ' + f.departureTime,
        'Thời gian: ' + duration(f.durationMinutes),
        f.stops === 0 ? 'Bay thẳng' : f.stops + ' điểm dừng'
      ],
      price: isBiz ? f.priceBusiness : f.priceEconomy,
      unit: 'vé',
      cta: 'Đặt vé',
      categories: f.categories
    };
  }

  function fromTrain(t) {
    return {
      type: 'train',
      id: t.id,
      mode: 'Tàu hỏa · ' + t.trainCode,
      from: t.fromCity,
      to: t.toCity,
      meta: [
        'Khởi hành ' + t.departureTime,
        'Thời gian: ' + duration(t.durationMinutes),
        'Còn ' + t.seatsLeft + ' chỗ'
      ],
      price: t.priceFrom,
      unit: 'vé',
      cta: 'Đặt vé',
      categories: t.categories
    };
  }

  function fromBus(b) {
    return {
      type: 'bus',
      id: b.id,
      mode: b.vehicleType + ' · ' + b.operator,
      from: b.fromCity,
      to: b.toCity,
      meta: [
        'Khởi hành ' + b.departureTime,
        'Thời gian: ' + duration(b.durationMinutes),
        'Còn ' + b.seatsLeft + ' chỗ'
      ],
      price: b.priceFrom,
      unit: b.priceUnit || 'vé',
      cta: 'Đặt vé',
      categories: b.categories
    };
  }

  /* ---------- Render ---------- */

  function cardHtml(c) {
    return '' +
      '<article class="route-card" data-id="' + esc(c.id) + '" data-mode="' + esc(c.type) + '">' +
        '<div>' +
          '<div class="route-mode"><span class="icon-dot"></span>' + esc(c.mode) + '</div>' +
          '<div class="route-points">' +
            '<span class="route-city">' + esc(c.from) + '</span>' +
            '<span class="route-track"></span>' +
            '<span class="route-city">' + esc(c.to) + '</span>' +
          '</div>' +
          '<div class="route-meta">' +
            c.meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
        '<div class="route-side">' +
          '<div class="price"><span class="from">Giá chỉ từ</span>' +
            '<span class="amount">' + money(c.price) + ' <span>/' + esc(c.unit) + '</span></span></div>' +
          '<a href="#" class="btn-outline btn-sm">' + esc(c.cta) + '</a>' +
        '</div>' +
      '</article>';
  }

  function fill(listEl, cards) {
    listEl.innerHTML = cards.length
      ? cards.map(cardHtml).join('')
      : '<p>Chưa có tuyến phù hợp.</p>';
  }

  /* =====================================================================
   * THÀNH PHẦN DÙNG CHUNG cho Máy bay / Tàu hỏa / Xe ghép Limo
   * (thẻ chuyến, khối hành khách, mã ưu đãi, thanh toán, hóa đơn, màn hình thành công)
   * ===================================================================== */

  var HOTLINE = '1900 0000'; // TODO: thay bằng số hotline thật (nút "Liên hệ trực tiếp")

  function fillHotline(root) {
    root.querySelectorAll('[data-hotline]').forEach(function (a) {
      a.textContent = HOTLINE;
      a.setAttribute('href', 'tel:' + HOTLINE.replace(/\s/g, ''));
    });
  }

  // o: { mode, id, logo(html), title, sub(html), dep:{time,label}, arr:{time,label,off}, dur, stop,
  //      chips(html), best, priceLabel, price, btnAttrs, note }
  function vtCardHtml(o) {
    function pt(p) {
      return '<div class="vt-pt"><b>' + esc(p.time) + (p.off ? '<sup class="vt-off">+' + p.off + '</sup>' : '') + '</b><small>' + esc(p.label) + '</small></div>';
    }
    return '<article class="vt-card vivugo-card" data-id="' + esc(o.id) + '" data-mode="' + esc(o.mode) + '">' +
      '<div class="vt-stub">' + o.logo + '</div>' +
      '<div class="vt-main">' +
        '<div class="vt-info">' +
          '<h3 class="vt-title">' + esc(o.title) + '</h3>' +
          '<p class="vt-sub">' + o.sub + '</p>' +
          '<div class="vt-times">' + pt(o.dep) +
            '<div class="vt-route"><span>' + esc(o.dur) + '</span><div class="vt-line"></div><span class="vt-stop">' + esc(o.stop) + '</span></div>' +
            pt(o.arr) + '</div>' +
          (o.chips ? '<div class="tag-row vt-chips">' + o.chips + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="vt-buy">' + (o.best ? '<span class="vt-best">Giá tốt nhất</span>' : '') +
        '<div class="price"><span class="from">' + esc(o.priceLabel) + '</span><span class="amount">' + money(o.price) + '</span></div>' +
        '<button type="button" class="btn-primary btn-block" ' + o.btnAttrs + '>Chọn đặt vé</button>' +
        (o.note ? '<small>' + esc(o.note) + '</small>' : '') +
      '</div>' +
    '</article>';
  }

  function logoHtml(src, alt, fallback) {
    return src
      ? '<img class="vt-logo-img" src="' + esc(src) + '" alt="' + esc(alt) + '" data-t="' + esc(fallback) + '" />'
      : esc(fallback);
  }

  function dotJoin(parts) {
    return parts.filter(Boolean).join(' <span class="vt-dot">•</span> ');
  }

  // Tính tiền: tiền vé − ưu đãi + phí dịch vụ
  function pricing(n, unit, promo) {
    var sub = unit * n;
    var p = promo ? PROMOS[promo] : null;
    var disc = p ? (p.pct ? Math.round(sub * p.pct / 100) : Math.min(p.flat, sub)) : 0;
    var fee = SERVICE_FEE * n;
    return { n: n, price: unit, sub: sub, disc: disc, fee: fee, total: sub - disc + fee };
  }

  function billHtml(b, promo) {
    return '<div class="summary-line"><span>Tiền vé (' + b.n + ' × ' + money(b.price) + ')</span><span>' + money(b.sub) + '</span></div>' +
      '<div class="summary-line"><span>Mã ưu đãi' + (promo ? ' (' + esc(promo) + ')' : '') + '</span><span>' + (b.disc ? '− ' + money(b.disc) : 'Chưa áp dụng') + '</span></div>' +
      '<div class="summary-line"><span>Phí dịch vụ (' + b.n + ' × ' + money(SERVICE_FEE) + ')</span><span>' + money(b.fee) + '</span></div>' +
      '<div class="summary-total"><span>Tổng thanh toán</span><strong>' + money(b.total) + '</strong></div>';
  }

  function promoHtml() {
    return '<h4 class="panel-h">MÃ ƯU ĐÃI</h4>' +
      '<div class="promo-row"><input type="text" data-promo-input placeholder="Nhập mã (VD: VIVUGO10, GIAM50K)" autocomplete="off" />' +
        '<button type="button" class="btn-outline btn-sm" data-promo-apply>Áp dụng</button></div>' +
      '<p class="section-sub" data-promo-msg></p>';
  }

  // Đọc ô nhập mã trong hộp thoại `root`, ghi kết quả vào state.promo
  function applyPromo(root, state) {
    var code = root.querySelector('[data-promo-input]').value.trim().toUpperCase();
    var pm = root.querySelector('[data-promo-msg]');
    if (!code) { state.promo = ''; pm.textContent = ''; }
    else if (PROMOS[code]) { state.promo = code; pm.textContent = '✓ ' + PROMOS[code].text; }
    else { state.promo = ''; pm.textContent = 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.'; }
  }

  function payHtml(name) {
    return '<div class="filter-group"><h4>Phương thức thanh toán</h4>' +
      '<label class="filter-option"><input type="radio" name="' + name + '" value="Chuyển khoản / QR" checked /> Chuyển khoản / QR</label>' +
      '<label class="filter-option"><input type="radio" name="' + name + '" value="Thẻ Visa / Mastercard" /> Thẻ Visa / Mastercard</label>' +
      '<label class="filter-option"><input type="radio" name="' + name + '" value="Ví điện tử" /> Ví điện tử</label></div>';
  }

  function contactHtml() {
    return '<p class="vt-contact">Cần hỗ trợ? Liên hệ trực tiếp qua hotline <a data-hotline href="#"></a></p>';
  }

  // Thẻ thông tin một hành khách. attr = tên thuộc tính định danh (data-pax / data-lmp), key = ghế hoặc số thứ tự
  function paxCardHtml(attr, key, heading, p, opt) {
    function fg(k, label, ph, type) {
      return '<div class="form-group"><label>' + label + '</label><input type="' + (type || 'text') + '" ' + attr + '="' + esc(key) + '" data-k="' + k +
        '" placeholder="' + ph + '" value="' + esc(p[k] || '') + '" autocomplete="off" /></div>';
    }
    return '<div class="bk-pax"><h4 class="panel-h">' + heading + '</h4><div class="vt-pax-grid">' +
      fg('name', 'Họ và tên (IN HOA không dấu) *', 'NGUYEN VAN A') +
      fg('id', opt.idLabel, '012345678901') +
      fg('phone', 'Số điện thoại *', '0912 345 678', 'tel') +
      (opt.email ? fg('email', 'Email nhận vé điện tử *', 'passenger@gmail.com', 'email') : '') +
      '</div></div>';
  }

  // o: { sub, code, rows:[[nhãn, giá trị, laTien?]], policy:[...], close:'data-xx-close' }
  function successHtml(o) {
    return '<div class="success-body"><div class="success-check">✓</div><h3>Đặt vé thành công</h3>' +
      '<p class="success-sub">' + o.sub + '</p>' +
      '<div class="order-code">' + o.code + '</div>' +
      '<div class="success-info">' + o.rows.map(function (r) {
        return '<div class="info-row"><span>' + r[0] + '</span><strong' + (r[2] ? ' class="amount"' : '') + '>' + r[1] + '</strong></div>';
      }).join('') + '</div>' +
      '<div class="bk-policy"><b>Chính sách hủy / đổi vé (demo)</b><ul>' +
        o.policy.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' +
      '<button type="button" class="btn-confirm btn-block" ' + o.close + '>Đóng</button></div>';
  }

  /* ---------- Thẻ chuyến bay (tab Máy bay) ---------- */

  function lum(hex) {
    var n = parseInt(String(hex).replace('#', ''), 16) || 0;
    return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  }

  // Logo hãng: đọc từ các thẻ <img data-code="VN" src="..."> trong khối [data-airline-logos] của HTML.
  // Nếu HTML không có thì dùng window.AIRLINE_LOGOS (AirlineLogos.js, tùy chọn).
  var LOGOS = {};
  (function () {
    var k;
    for (k in (window.AIRLINE_LOGOS || {})) LOGOS[k] = window.AIRLINE_LOGOS[k];
    document.querySelectorAll('[data-airline-logos] img[data-code]').forEach(function (img) {
      LOGOS[img.getAttribute('data-code')] = img.getAttribute('src');
    });
  })();

  // Ảnh logo lỗi (404...) thì quay về chữ viết tắt thay vì hiện icon ảnh vỡ
  document.addEventListener('error', function (e) {
    var i = e.target;
    if (!i || !i.classList || !i.classList.contains('vt-logo-img')) return;
    i.replaceWith(document.createTextNode(i.getAttribute('data-t') || ''));
  }, true);

  // Thẻ chuyến bay: cùng bố cục với thẻ tàu hỏa / xe ghép Limo (vtCardHtml)
  function flightCardHtml(f, cls, date, best) {
    var biz = cls === 'business';
    var code = f.airlineCode || f.airline.slice(0, 2);
    var clsLabel = biz ? 'Thương gia' : 'Phổ thông';
    return vtCardHtml({
      mode: 'flight',
      id: f.id,
      logo: logoHtml(LOGOS[f.airlineCode], f.airline, code),
      title: f.airline + ' (' + f.flightNumber + ')',
      sub: dotJoin([esc(clsLabel), date ? 'Ngày ' + esc(showDate(date)) : '', f.aircraft ? esc(f.aircraft) : '']),
      dep: { time: f.departureTime, label: f.fromCity + ' (' + f.fromCode + ')' },
      arr: { time: f.arrivalTime, label: f.toCity + ' (' + f.toCode + ')' },
      dur: duration(f.durationMinutes),
      stop: f.stops === 0 ? 'Bay thẳng' : f.stops + ' điểm dừng',
      chips: f.baggageIncluded ? '<span class="tag-chip">' + esc(f.baggageIncluded) + '</span>' : '',
      best: best,
      priceLabel: 'Giá 1 vé · ' + clsLabel,
      price: biz ? f.priceBusiness : f.priceEconomy,
      btnAttrs: 'data-book="' + esc(f.id) + '" data-cls="' + cls + '" data-date="' + esc(date || '') + '"'
    });
  }

  /* ---------- Đặt vé hộ & chọn ghế ---------- */
  // Dùng lại class của css.css: modal-overlay, booking-modal, booking-provider-bar, booking-form,
  // form-row/form-group, seat-pill, segmented/seg-btn, booking-summary, btn-confirm, success-*.

  var modal = null;
  var dlg = null;
  var B = null; // { f, cls, date, seats[], pax{} }
  var MAX_SEATS = 9;

  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function seatPrice() { return B.cls === 'business' ? B.f.priceBusiness : B.f.priceEconomy; }
  function clsName() { return B.cls === 'business' ? 'Thương gia' : 'Phổ thông'; }
  function q(name) { return modal.querySelector('[data-bk="' + name + '"]'); }
  function noAccent(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase();
  }

  // Sơ đồ ghế: Thương gia 2-2 (hàng 1–5), Phổ thông 3-3 (hàng 10–24).
  // Ghế "đã có người" được tạo giả lập cố định theo chuyến bay (demo).
  function seatMapHtml() {
    var biz = B.cls === 'business';
    var L = biz ? ['A', 'C'] : ['A', 'B', 'C'];
    var R = biz ? ['D', 'F'] : ['D', 'E', 'F'];
    var rows = biz ? range(1, 5) : range(10, 24);
    function btn(row, c) {
      var id = row + c;
      var off = hash(B.f.id + B.cls + id) % 100 < 28;
      var on = B.seats.indexOf(id) > -1;
      return '<button type="button" class="seat-pill' + (on ? ' is-active' : '') + '" data-seat="' + id + '"' +
        (off ? ' disabled' : '') + ' aria-pressed="' + on + '">' + id + '</button>';
    }
    return rows.map(function (r) {
      return '<div class="st-row">' + L.map(function (c) { return btn(r, c); }).join('') +
        '<span class="st-gap"></span>' + R.map(function (c) { return btn(r, c); }).join('') + '</div>';
    }).join('');
  }

  function renderInfo() {
    var chips = B.seats.length
      ? B.seats.map(function (s) { return '<span class="tag-chip">' + s + '</span>'; }).join(' ')
      : '<i>chưa chọn</i>';
    q('info').innerHTML =
      '<div><strong>Khởi hành lúc ' + esc(B.f.departureTime) + (B.date ? ' • Ngày ' + esc(showDate(B.date)) : '') +
        ' • Hạ cánh ' + esc(B.f.arrivalTime) + '</strong>' +
      '<p>Hạng: <b>' + clsName() + '</b> • Ghế đã chọn: ' + chips + '</p></div>' +
      '<div class="booking-price">' + money(seatPrice()) + '<br><small>/ghế · Đã gồm thuế &amp; phí</small></div>';
    modal.querySelectorAll('[data-mclass]').forEach(function (b) {
      var on = b.getAttribute('data-mclass') === B.cls;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function renderSeats() { q('seats').innerHTML = seatMapHtml(); }

  function renderPax() {
    var box = q('pax');
    if (!B.seats.length) {
      box.innerHTML = '<p class="section-sub">Hãy chọn ghế để nhập thông tin hành khách (mỗi ghế một hành khách).</p>';
      return;
    }
    box.innerHTML = B.seats.map(function (s, i) {
      return paxCardHtml('data-pax', s, 'Hành khách ' + (i + 1) + ' · Ghế ' + s, B.pax[s] || {}, { email: true, idLabel: 'Số CCCD / Hộ chiếu *' });
    }).join('');
  }

  function renderTotal() {
    q('bill').innerHTML = billHtml(pricing(B.seats.length, seatPrice(), B.promo), B.promo);
  }

  function refreshAll() { renderInfo(); renderSeats(); renderPax(); renderTotal(); q('msg').textContent = ''; }

  function ensureModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="booking-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="bk-title"></div>';
    dlg = modal.firstChild;
    document.body.appendChild(modal);
    modal.addEventListener('click', onModalClick);
    modal.addEventListener('input', onModalInput);
    modal.addEventListener('change', onModalChange);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeBooking();
    });
  }

  function closeBooking() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openBooking(id, cls, date) {
    var f = allFlights.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    B = { f: f, cls: cls === 'business' ? 'business' : 'economy', date: date, seats: [], pax: {}, promo: '' };
    ensureModal();
    dlg.innerHTML =
      '<div class="booking-modal-head"><div><span class="modal-kicker">Đặt vé máy bay &amp; chọn ghế</span>' +
        '<h3 id="bk-title">' + esc(f.airline) + ' • ' + esc(f.flightNumber) + '</h3>' +
        '<p class="section-sub">' + esc(f.fromCity) + ' (' + esc(f.fromCode) + ') → ' + esc(f.toCity) + ' (' + esc(f.toCode) + ')</p></div>' +
        '<button type="button" class="modal-close" data-bk-close aria-label="Đóng">✕</button></div>' +
      '<div class="booking-provider-bar" data-bk="info"></div>' +
      '<div class="booking-form">' +
        '<div class="listing-toolbar"><h4 class="panel-h">CHỌN GHẾ NGỒI TRÊN MÁY BAY</h4>' +
          '<div class="segmented" role="group" aria-label="Hạng ghế">' +
            '<button type="button" class="seg-btn" data-mclass="economy">Phổ thông</button>' +
            '<button type="button" class="seg-btn" data-mclass="business">Thương gia</button></div></div>' +
        '<div class="bk-cabin"><p class="bk-front">Buồng lái · Phía đầu máy bay</p><div data-bk="seats"></div>' +
          '<div class="bk-legend"><span><i></i>Còn trống</span><span><i class="on"></i>Đang chọn</span><span><i class="off"></i>Đã có người</span></div></div>' +
        '<h4 class="panel-h">THÔNG TIN HÀNH KHÁCH</h4><div data-bk="pax"></div>' +
        promoHtml() + payHtml('bk-pay') +
        '<div class="booking-summary" data-bk="bill"></div>' + contactHtml() +
        '<p class="form-error" data-bk="msg" role="alert"></p>' +
        '<button type="button" class="btn-confirm" data-bk-submit>Hoàn tất đặt vé</button>' +
      '</div>';
    fillHotline(dlg);
    refreshAll();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    dlg.scrollTop = 0;
  }

  function onModalClick(e) {
    var t = e.target;
    if (t === modal || t.closest('[data-bk-close]')) { closeBooking(); return; }

    var s = t.closest('[data-seat]');
    if (s) {
      var id = s.getAttribute('data-seat');
      var i = B.seats.indexOf(id);
      if (i > -1) B.seats.splice(i, 1);
      else if (B.seats.length >= MAX_SEATS) { q('msg').textContent = 'Tối đa ' + MAX_SEATS + ' ghế cho mỗi lần đặt.'; return; }
      else B.seats.push(id);
      refreshAll();
      return;
    }

    var c = t.closest('[data-mclass]');
    if (c) {
      B.cls = c.getAttribute('data-mclass');
      B.seats = []; // sơ đồ ghế khác nhau theo hạng nên chọn lại
      refreshAll();
      return;
    }

    if (t.closest('[data-promo-apply]')) { applyPromo(modal, B); renderTotal(); return; }

    if (t.closest('[data-bk-submit]')) submitBooking();
  }

  function onModalInput(e) {
    var el = e.target;
    var seat = el.getAttribute && el.getAttribute('data-pax');
    if (!seat) return;
    (B.pax[seat] = B.pax[seat] || {})[el.getAttribute('data-k')] = el.value;
  }

  function onModalChange(e) {
    var el = e.target;
    if (el.getAttribute && el.getAttribute('data-k') === 'name') {
      el.value = noAccent(el.value).replace(/\s+/g, ' ').trim();
      onModalInput(e);
    }
  }

  function submitBooking() {
    var msg = q('msg');
    if (!B.seats.length) { msg.textContent = 'Vui lòng chọn ít nhất 1 ghế.'; return; }
    for (var i = 0; i < B.seats.length; i++) {
      var p = B.pax[B.seats[i]] || {};
      var who = 'Hành khách ' + (i + 1) + ' (ghế ' + B.seats[i] + '): ';
      if (!/^[A-Z]+( [A-Z]+)+$/.test(noAccent((p.name || '').trim()))) { msg.textContent = who + 'nhập đầy đủ họ và tên, không dấu.'; return; }
      if (!/^[A-Za-z0-9]{8,12}$/.test((p.id || '').trim())) { msg.textContent = who + 'số CCCD / hộ chiếu không hợp lệ.'; return; }
      if (!/^(0|\+84)\d{9}$/.test((p.phone || '').replace(/[\s.-]/g, ''))) { msg.textContent = who + 'số điện thoại không hợp lệ.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((p.email || '').trim())) { msg.textContent = who + 'email không hợp lệ.'; return; }
    }
    msg.textContent = '';

    var pay = modal.querySelector('input[name="bk-pay"]:checked');
    var bill = pricing(B.seats.length, seatPrice(), B.promo);
    var code = 'VG-' + (100000 + hash(B.f.id + Date.now()) % 900000);
    dlg.innerHTML = successHtml({
      sub: 'VivuGo sẽ đặt vé hộ bạn và gửi vé điện tử qua email của từng hành khách sau khi xác nhận thanh toán.',
      code: code,
      rows: [
        ['Chuyến bay', esc(B.f.airline) + ' ' + esc(B.f.flightNumber)],
        ['Hành trình', esc(B.f.fromCode) + ' → ' + esc(B.f.toCode) + (B.date ? ' · ' + esc(showDate(B.date)) : '')],
        ['Hạng ghế', clsName()],
        ['Ghế', B.seats.join(', ')],
        ['Thanh toán', esc(pay ? pay.value : '')],
        ['Tổng tiền', money(bill.total), true]
      ],
      policy: [
        'Hủy / đổi trước giờ bay từ 24 giờ: phí theo quy định của hãng (tối thiểu 10% giá vé).',
        'Từ 3 đến dưới 24 giờ: phí 30% giá vé.',
        'Dưới 3 giờ hoặc không có mặt: không hoàn, không đổi.',
        'Mang theo CCCD / hộ chiếu trùng với thông tin đã đặt khi làm thủ tục.'
      ],
      close: 'data-bk-close'
    });
  }

  /* ---------- Tìm chuyến bay ---------- */

  var airportMap = {}; // mã sân bay -> { city, name }
  var query = null;    // null = chưa lọc (hiện tất cả); có giá trị sau khi bấm "Tìm chuyến bay"

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function showDate(s) {
    if (!s) return '';
    var p = s.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function cityOf(code) {
    return airportMap[code] ? airportMap[code].city : code;
  }

  function searchFlights(from, to) {
    return allFlights
      .filter(function (f) {
        return (!from || f.fromCode === from) && (!to || f.toCode === to) &&
               (flightState.airline === 'all' || f.airline === flightState.airline);
      })
      .sort(function (a, b) {
        return flightState.cls === 'business' ? a.priceBusiness - b.priceBusiness : a.priceEconomy - b.priceEconomy;
      });
  }

  // '' = để trống (không lọc), null = không tìm thấy sân bay
  function findAirport(txt) {
    var t = normTxt(txt);
    if (!t) return '';
    var list = Object.keys(airportMap).map(function (c) { return { code: c, city: airportMap[c].city, name: airportMap[c].name }; });
    var m = list.filter(function (a) { return normTxt(a.city) === t || normTxt(a.name) === t || a.code.toLowerCase() === t; });
    if (!m.length) m = list.filter(function (a) { return normTxt(a.city).indexOf(t) > -1 || normTxt(a.name).indexOf(t) > -1; });
    return m.length ? m[0].code : null;
  }

  function placeName(code) {
    return code ? cityOf(code) + ' (' + code + ')' : 'Tất cả';
  }

  function isFiltered() {
    return !!query || flightState.airline !== 'all';
  }

  function resultHtml(label, from, to, date, flights, plain) {
    var title = plain
      ? esc(label)
      : esc(label) + ' · ' + esc(placeName(from)) + ' → ' + esc(placeName(to)) + (date ? ' · ' + esc(showDate(date)) : '');
    title += ' <span class="vf-result-count">— ' + flights.length + ' chuyến bay</span>';
    var body = flights.length
      ? '<div class="route-list">' + flights.map(function (f, i) {
          return flightCardHtml(f, flightState.cls, date, i === 0 && flights.length > 1);
        }).join('') + '</div>'
      : '<div class="car-empty">' +
          '<p>Không có chuyến bay phù hợp với bộ lọc hiện tại trong bộ dữ liệu demo.</p>' +
          '<button type="button" class="btn-outline btn-sm" data-reset-flight>Bỏ lọc, xem tất cả chuyến bay</button>' +
        '</div>';
    return '<div class="vf-result"><h3 class="vf-result-title">' + title + '</h3>' + body + '</div>';
  }

  function renderFlights() {
    var list = document.querySelector('[data-list="flight"]');
    if (!list) return;

    var html;
    if (!query) {
      // Chưa tìm kiếm: hiện tất cả chuyến bay (chỉ áp dụng hãng nếu đã chọn)
      html = resultHtml('Tất cả chuyến bay', '', '', '', searchFlights('', ''), true);
    } else {
      var round = query.trip === 'round-trip';
      html = resultHtml(round ? 'Chiều đi' : 'Chuyến bay', query.from, query.to, query.date,
                        searchFlights(query.from, query.to));
      if (round) {
        html += resultHtml('Chiều về', query.to, query.from, query.returnDate,
                           searchFlights(query.to, query.from));
      }
    }
    // Nút "Bỏ lọc" ở tiêu đề kết quả đầu tiên khi đang có lọc
    if (isFiltered()) {
      html = html.replace('</h3>', ' <button type="button" class="btn-ghost btn-sm vf-clear" data-reset-flight>✕ Bỏ lọc</button></h3>');
    }
    list.innerHTML = html;
  }

  function addOptions(select, items) {
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it.value;
      o.textContent = it.label;
      select.appendChild(o);
    });
  }

  function validateQuery(q) {
    if (q.from === null) return 'Không tìm thấy điểm đi "' + q.fromTxt + '". Hãy chọn từ danh sách gợi ý.';
    if (q.to === null) return 'Không tìm thấy điểm đến "' + q.toTxt + '". Hãy chọn từ danh sách gợi ý.';
    if (q.from && q.to && q.from === q.to) return 'Điểm khởi hành và điểm đến phải khác nhau.';
    if (!q.date) return 'Vui lòng chọn ngày bay.';
    if (q.date < todayStr()) return 'Ngày bay không được ở trong quá khứ.';
    if (q.trip === 'round-trip') {
      if (!q.returnDate) return 'Vui lòng chọn ngày về.';
      if (q.returnDate < q.date) return 'Ngày về không được trước ngày bay.';
    }
    return '';
  }

  function setupFlightFilter(data) {
    var form = document.querySelector('[data-flight-filter]');
    if (!form) return;

    var fromSel = form.querySelector('[data-f="from"]');
    var toSel = form.querySelector('[data-f="to"]');
    var dateInp = form.querySelector('[data-f="date"]');
    var retInp = form.querySelector('[data-f="return"]');
    var retField = form.querySelector('[data-return-field]');
    var airSel = form.querySelector('[data-f="airline"]');
    var msgEl = form.querySelector('[data-flight-msg]');
    var radios = form.querySelectorAll('input[name="flight-trip"]');
    var segBtns = form.querySelectorAll('[data-class]');

    // Danh sách sân bay
    var airports = data.airports || [];
    airports.forEach(function (a) { airportMap[a.code] = { city: a.city, name: a.name }; });
    var dl = document.getElementById('flight-airports');
    if (dl) dl.innerHTML = airports.map(function (a) { return '<option value="' + esc(a.city) + '">' + esc(a.name) + '</option>'; }).join('');

    // Danh sách hãng
    if (airSel) {
      addOptions(airSel, (data.airlines || []).map(function (a) { return { value: a.name, label: a.name }; }));
      airSel.addEventListener('change', function () {
        flightState.airline = airSel.value;
        renderFlights();
      });
    }

    // Ngày bay mặc định là hôm nay
    var today = todayStr();
    dateInp.min = today;
    if (!dateInp.value) dateInp.value = today;
    retInp.min = dateInp.value;

    function currentTrip() {
      var r = form.querySelector('input[name="flight-trip"]:checked');
      return r ? r.value : 'one-way';
    }

    function readForm() {
      return {
        trip: currentTrip(),
        from: findAirport(fromSel.value),
        to: findAirport(toSel.value),
        fromTxt: fromSel.value,
        toTxt: toSel.value,
        date: dateInp.value,
        returnDate: retInp.value
      };
    }

    function syncTrip() {
      var round = currentTrip() === 'round-trip';
      retField.hidden = !round;
      form.classList.toggle('is-round', round);
      if (round && !retInp.value) retInp.value = dateInp.value;
    }

    radios.forEach(function (r) { r.addEventListener('change', syncTrip); });
    dateInp.addEventListener('change', function () {
      retInp.min = dateInp.value || today;
      if (retInp.value && retInp.value < retInp.min) retInp.value = retInp.min;
    });

    // Nút "Tìm chuyến bay"
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = readForm();
      var err = validateQuery(q);
      if (msgEl) msgEl.textContent = err;
      if (err) return;
      query = q;
      renderFlights();
    });

    // Hạng ghế
    function setClass(cls) {
      flightState.cls = cls;
      segBtns.forEach(function (b) {
        var on = b.getAttribute('data-class') === cls;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    segBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setClass(btn.getAttribute('data-class'));
        renderFlights();
      });
    });

    // Bỏ lọc: đưa form về trạng thái ban đầu và hiện tất cả chuyến bay
    function resetAll() {
      fromSel.value = '';
      toSel.value = '';
      if (airSel) airSel.value = 'all';
      flightState.airline = 'all';
      setClass('economy');
      radios.forEach(function (r) { r.checked = r.value === 'one-way'; });
      dateInp.value = today;
      retInp.value = '';
      retInp.min = today;
      syncTrip();
      if (msgEl) msgEl.textContent = '';
      query = null;
      renderFlights();
    }

    // Nút quay lại chặng mặc định khi không có kết quả
    var list = document.querySelector('[data-list="flight"]');
    if (list) {
      list.addEventListener('click', function (e) {
        var bk = e.target.closest('[data-book]');
        if (bk) {
          openBooking(bk.getAttribute('data-book'), bk.getAttribute('data-cls'), bk.getAttribute('data-date') || dateInp.value);
          return;
        }
        if (e.target.closest('[data-reset-flight]')) resetAll();
      });
    }

    syncTrip(); // mở trang: chưa lọc, hiện tất cả chuyến bay (query = null)
  }

  /* =====================================================================
   * TÀU HỎA: tìm chuyến, thẻ vé, hộp thoại đặt vé (loại khoang, sơ đồ chỗ, hành khách, hóa đơn)
   * ===================================================================== */

  var allTrains = [];
  var stations = [];
  var trQuery = null; // null = chưa lọc (hiện tất cả chuyến tàu)
  var SERVICE_FEE = 15000; // phí dịch vụ mỗi vé (demo)
  var PROMOS = {           // mã ưu đãi demo
    VIVUGO10: { pct: 10, text: 'Giảm 10% tiền vé' },
    GIAM50K: { flat: 50000, text: 'Giảm 50.000đ cho đơn hàng' }
  };
  var TRAIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>';

  // Cấu trúc sơ đồ theo loại khoang: số nhóm (hàng/khoang), ký hiệu chỗ trong mỗi nhóm
  var COACH_LAYOUT = {
    'soft-seat': { groups: 8, seats: ['A', 'B', 'C', 'D'], label: 'Hàng', short: 'Toa ghế', title: 'Sơ đồ toa ghế ngồi mềm' },
    'berth-6': { groups: 4, seats: ['A', 'D', 'B', 'E', 'C', 'F'], label: 'Khoang', short: 'Khoang 6', title: 'Sơ đồ khoang 6 giường nằm' },
    'berth-4': { groups: 4, seats: ['A', 'C', 'B', 'D'], label: 'Khoang', short: 'Khoang 4', title: 'Sơ đồ khoang 4 giường nằm' },
    'vip-2': { groups: 4, seats: ['A', 'B'], label: 'Khoang', short: 'VIP 2', title: 'Sơ đồ khoang VIP 2 giường nằm' }
  };


  function normTxt(s) { return noAccent(String(s || '')).toLowerCase().trim(); }

  // '' = để trống (không lọc), null = không tìm thấy ga, còn lại là mã ga
  function findStation(txt) {
    var t = normTxt(txt);
    if (!t) return '';
    var m = stations.filter(function (s) {
      return normTxt(s.city) === t || normTxt(s.name) === t || s.code.toLowerCase() === t;
    });
    if (!m.length) {
      m = stations.filter(function (s) { return normTxt(s.city).indexOf(t) > -1 || normTxt(s.name).indexOf(t) > -1; });
    }
    return m.length ? m[0].code : null;
  }

  function stCity(code) {
    for (var i = 0; i < stations.length; i++) if (stations[i].code === code) return stations[i].city;
    return code;
  }

  function cheapestCoach(t) {
    var list = (t.coachTypes || []).slice().sort(function (a, b) { return a.priceFrom - b.priceFrom; });
    return list[0] || { label: '', priceFrom: t.priceFrom, seatsLeft: t.seatsLeft };
  }

  function getCoach(t, id) {
    var l = t.coachTypes || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return l[0];
  }

  /* ---------- Thẻ vé tàu ---------- */

  function trainCardHtml(t, date, best) {
    var cc = cheapestCoach(t);
    var typeName = (t.categories && t.categories.serviceType === 'express') ? 'Tàu Nhanh' : 'Tàu Thường';
    return vtCardHtml({
      mode: 'train',
      id: t.id,
      logo: LOGOS.DSVN ? logoHtml(LOGOS.DSVN, t.company, 'VN') : TRAIN_ICON,
      title: t.company + ' (' + t.trainCode + ' ' + typeName + ')',
      sub: dotJoin(['Tàu ' + esc(t.trainCode), esc(cc.label), date ? 'Ngày ' + esc(showDate(date)) : '']),
      dep: { time: t.departureTime, label: t.fromStation },
      arr: { time: t.arrivalTime, label: t.toStation, off: t.arrivalDayOffset },
      dur: t.duration || duration(t.durationMinutes),
      stop: t.stops === 0 ? 'Không dừng' : (t.stopsLabel || t.stops + ' điểm dừng'),
      best: best,
      priceLabel: 'Giá 1 vé từ',
      price: t.priceFrom,
      btnAttrs: 'data-book-train="' + esc(t.id) + '" data-date="' + esc(date || '') + '"',
      note: 'Còn ' + cc.seatsLeft + ' ghế trống'
    });
  }

  /* ---------- Danh sách kết quả ---------- */

  function searchTrains(from, to) {
    return allTrains
      .filter(function (t) { return (!from || t.fromCode === from) && (!to || t.toCode === to); })
      .sort(function (a, b) { return a.priceFrom - b.priceFrom; });
  }

  function trResultHtml(label, from, to, date, trains, plain) {
    var title = plain
      ? esc(label)
      : esc(label) + ' · ' + esc(from ? stCity(from) : 'Tất cả') + ' → ' + esc(to ? stCity(to) : 'Tất cả') + (date ? ' · ' + esc(showDate(date)) : '');
    title += ' <span class="vf-result-count">— ' + trains.length + ' chuyến tàu</span>';
    var body = trains.length
      ? '<div class="route-list">' + trains.map(function (t, i) { return trainCardHtml(t, date, i === 0 && trains.length > 1); }).join('') + '</div>'
      : '<div class="car-empty"><p>Không có chuyến tàu phù hợp với bộ lọc hiện tại trong bộ dữ liệu demo.</p>' +
        '<button type="button" class="btn-outline btn-sm" data-reset-train>Bỏ lọc, xem tất cả chuyến tàu</button></div>';
    return '<div class="vf-result"><h3 class="vf-result-title">' + title + '</h3>' + body + '</div>';
  }

  function renderTrains() {
    var list = document.querySelector('[data-list="train"]');
    if (!list) return;
    var html;
    if (!trQuery) {
      html = trResultHtml('Tất cả chuyến tàu', '', '', '', searchTrains('', ''), true);
    } else {
      var round = trQuery.trip === 'round-trip';
      html = trResultHtml(round ? 'Chiều đi' : 'Chuyến tàu', trQuery.from, trQuery.to, trQuery.date, searchTrains(trQuery.from, trQuery.to));
      if (round) html += trResultHtml('Chiều về', trQuery.to, trQuery.from, trQuery.returnDate, searchTrains(trQuery.to, trQuery.from));
      html = html.replace('</h3>', ' <button type="button" class="btn-ghost btn-sm vf-clear" data-reset-train>✕ Bỏ lọc</button></h3>');
    }
    list.innerHTML = html;
  }

  /* ---------- Form tìm kiếm tàu ---------- */

  function setupTrainFilter(data) {
    var form = document.querySelector('[data-train-filter]');
    if (!form) return;
    allTrains = data.trains || [];
    stations = data.stations || [];

    var dl = document.getElementById('train-stations');
    if (dl) {
      dl.innerHTML = stations.map(function (s) { return '<option value="' + esc(s.city) + '">' + esc(s.name) + '</option>'; }).join('');
    }

    var fromInp = form.querySelector('[data-t="from"]');
    var toInp = form.querySelector('[data-t="to"]');
    var dateInp = form.querySelector('[data-t="date"]');
    var retInp = form.querySelector('[data-t="return"]');
    var retField = form.querySelector('[data-return-field]');
    var msgEl = form.querySelector('[data-train-msg]');
    var radios = form.querySelectorAll('input[name="train-trip"]');
    var today = todayStr();

    dateInp.min = today;
    dateInp.value = today;
    retInp.min = today;

    function trip() {
      var r = form.querySelector('input[name="train-trip"]:checked');
      return r ? r.value : 'one-way';
    }
    function syncTrip() {
      var round = trip() === 'round-trip';
      retField.hidden = !round;
      if (round && !retInp.value) retInp.value = dateInp.value;
    }
    radios.forEach(function (r) { r.addEventListener('change', syncTrip); });
    dateInp.addEventListener('change', function () {
      retInp.min = dateInp.value || today;
      if (retInp.value && retInp.value < retInp.min) retInp.value = retInp.min;
    });

    function resetAll() {
      fromInp.value = '';
      toInp.value = '';
      radios.forEach(function (r) { r.checked = r.value === 'one-way'; });
      dateInp.value = today;
      retInp.value = '';
      retInp.min = today;
      syncTrip();
      if (msgEl) msgEl.textContent = '';
      trQuery = null;
      renderTrains();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = findStation(fromInp.value);
      var t = findStation(toInp.value);
      var q = { trip: trip(), from: f, to: t, date: dateInp.value, returnDate: retInp.value };
      var err = '';
      if (f === null) err = 'Không tìm thấy ga đi "' + fromInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (t === null) err = 'Không tìm thấy ga đến "' + toInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (f && t && f === t) err = 'Ga đi và ga đến phải khác nhau.';
      else if (!q.date) err = 'Vui lòng chọn ngày đi.';
      else if (q.date < todayStr()) err = 'Ngày đi không được ở trong quá khứ.';
      else if (q.trip === 'round-trip' && !q.returnDate) err = 'Vui lòng chọn ngày về.';
      else if (q.trip === 'round-trip' && q.returnDate < q.date) err = 'Ngày về không được trước ngày đi.';
      if (msgEl) msgEl.textContent = err;
      if (err) return;
      trQuery = q;
      renderTrains();
    });

    var list = document.querySelector('[data-list="train"]');
    if (list) {
      list.addEventListener('click', function (e) {
        var bk = e.target.closest('[data-book-train]');
        if (bk) { openTrainBooking(bk.getAttribute('data-book-train'), bk.getAttribute('data-date') || dateInp.value); return; }
        if (e.target.closest('[data-reset-train]')) resetAll();
      });
    }
    syncTrip(); // mở trang: chưa lọc, hiện tất cả chuyến tàu
  }

  /* ---------- Đặt vé tàu: loại khoang → sơ đồ chỗ → hành khách → hóa đơn ---------- */

  var tmodal = null;
  var tdlg = null;
  var T = null; // { t, coach, date, seats[], pax{}, promo }

  function tq(name) { return tmodal.querySelector('[data-tk="' + name + '"]'); }
  function coachNow() { return getCoach(T.t, T.coach); }
  function tPrice() { return coachNow().priceFrom; }

  function calcBill() {
    return pricing(T.seats.length, tPrice(), T.promo);
  }

  // Chỗ "đã đặt" giả lập cố định theo chuyến tàu + loại khoang (demo)
  function seatOff(id) { return hash(T.t.id + T.coach + id) % 100 < 35; }

  function trFree() {
    var L = COACH_LAYOUT[T.coach] || COACH_LAYOUT['soft-seat'];
    var n = 0;
    for (var g = 1; g <= L.groups; g++) L.seats.forEach(function (c) { if (!seatOff(g + c)) n++; });
    return n;
  }

  function trMapHtml() {
    var L = COACH_LAYOUT[T.coach] || COACH_LAYOUT['soft-seat'];
    var html = '';
    for (var g = 1; g <= L.groups; g++) {
      html += '<div class="tr-grp"><div class="tr-grp-h">' + g + '</div><div class="tr-grid">' +
        L.seats.map(function (c) {
          var id = g + c;
          var off = seatOff(id);
          var on = T.seats.indexOf(id) > -1;
          return '<button type="button" class="tr-seat' + (on ? ' is-on' : '') + '" data-tseat="' + id + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + on + '">' + id + '</button>';
        }).join('') + '</div></div>';
    }
    return html;
  }

  function trRenderInfo() {
    var c = coachNow();
    var chips = T.seats.length ? T.seats.map(function (s) { return '<span class="tag-chip">' + s + '</span>'; }).join(' ') : '<i>chưa chọn</i>';
    tq('info').innerHTML =
      '<div><strong>' + esc(T.t.trainCode) + ' • ' + esc(T.t.departureTime) + ' → ' + esc(T.t.arrivalTime) +
        (T.t.arrivalDayOffset ? ' (+' + T.t.arrivalDayOffset + ' ngày)' : '') + (T.date ? ' • Ngày ' + esc(showDate(T.date)) : '') + '</strong>' +
      '<p>Hạng chỗ: <b>' + esc(c.label) + '</b> • Số chỗ: <b>' + T.seats.length + '</b> • Đã chọn: ' + chips + '</p></div>' +
      '<div class="booking-price">' + money(c.priceFrom) + '<br><small>/chỗ · Đã gồm thuế</small></div>';
    tq('coaches').innerHTML = (T.t.coachTypes || []).map(function (x) {
      return '<button type="button" class="seat-pill' + (x.id === T.coach ? ' is-active' : '') + '" data-tcoach="' + esc(x.id) + '" aria-pressed="' + (x.id === T.coach) + '">' + esc(x.label) + '</button>';
    }).join('');
    var L = COACH_LAYOUT[T.coach] || COACH_LAYOUT['soft-seat'];
    tq('maptitle').textContent = L.title;
    tq('mapsub').textContent = L.short + ' • ' + c.label + ' • Còn ' + trFree() + ' chỗ trống';
    tq('doorlabel').textContent = L.short;
  }

  function trRenderPax() {
    var box = tq('pax');
    if (!T.seats.length) { box.innerHTML = '<p class="section-sub">Hãy chọn chỗ trên sơ đồ để nhập thông tin hành khách (mỗi chỗ một hành khách).</p>'; return; }
    box.innerHTML = T.seats.map(function (s, i) {
      return paxCardHtml('data-pax', s, 'Hành khách ' + (i + 1) + ' · Chỗ ' + s, T.pax[s] || {}, { email: true, idLabel: 'Số CCCD / Hộ chiếu *' });
    }).join('');
  }

  function trRenderBill() {
    tq('bill').innerHTML = billHtml(calcBill(), T.promo);
  }

  function trRefresh(keepPax) {
    trRenderInfo();
    tq('map').innerHTML = trMapHtml();
    if (!keepPax) trRenderPax();
    trRenderBill();
    tq('msg').textContent = '';
  }

  function ensureTrainModal() {
    if (tmodal) return;
    tmodal = document.createElement('div');
    tmodal.className = 'modal-overlay';
    tmodal.innerHTML = '<div class="booking-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="tk-title"></div>';
    tdlg = tmodal.firstChild;
    document.body.appendChild(tmodal);
    tmodal.addEventListener('click', onTrainClick);
    tmodal.addEventListener('input', onTrainInput);
    tmodal.addEventListener('change', onTrainChange);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && tmodal.classList.contains('is-open')) closeTrainBooking();
    });
  }

  function closeTrainBooking() {
    if (!tmodal) return;
    tmodal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openTrainBooking(id, date) {
    var t = allTrains.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var def = (t.coachTypes || []).filter(function (c) { return c['default']; })[0] || (t.coachTypes || [])[0];
    T = { t: t, coach: def ? def.id : 'soft-seat', date: date, seats: [], pax: {}, promo: '' };
    ensureTrainModal();
    tdlg.innerHTML =
      '<div class="booking-modal-head"><div><span class="modal-kicker">Đặt vé tàu hỏa &amp; chọn chỗ</span>' +
        '<h3 id="tk-title">' + esc(t.company) + ' • ' + esc(t.trainCode) + '</h3>' +
        '<p class="section-sub">' + esc(t.fromStation) + ' → ' + esc(t.toStation) + '</p></div>' +
        '<button type="button" class="modal-close" data-tk-close aria-label="Đóng">✕</button></div>' +
      '<div class="booking-provider-bar" data-tk="info"></div>' +
      '<div class="booking-form">' +
        '<h4 class="panel-h">CHỌN LOẠI KHOANG / GIƯỜNG / GHẾ</h4>' +
        '<div class="seat-filter" data-tk="coaches"></div>' +
        '<div class="tr-cabin"><div class="tr-cabin-head"><div class="tr-ic">' + TRAIN_ICON + '</div>' +
          '<div class="tr-cabin-t"><b data-tk="maptitle"></b><small data-tk="mapsub"></small></div>' +
          '<div class="tr-legend"><span><i class="free"></i>Còn trống</span><span><i class="busy"></i>Đã đặt</span><span><i class="mine"></i>Chỗ bạn chọn</span></div></div>' +
          '<div class="tr-wrap"><div class="tr-door"><span data-tk="doorlabel"></span><span class="door"></span></div>' +
            '<div class="tr-map" data-tk="map"></div></div>' +
          '<p class="tr-note">ⓘ Bản đồ sơ đồ khoang có thể thay đổi theo loại toa.</p></div>' +
        '<h4 class="panel-h">THÔNG TIN HÀNH KHÁCH</h4><div data-tk="pax"></div>' +
        promoHtml() + payHtml('tk-pay') +
        '<div class="booking-summary" data-tk="bill"></div>' + contactHtml() +
        '<p class="form-error" data-tk="msg" role="alert"></p>' +
        '<button type="button" class="btn-confirm" data-tk-submit>Hoàn tất đặt vé</button>' +
      '</div>';
    fillHotline(tdlg);
    trRefresh();
    tmodal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    tmodal.scrollTop = 0;
    tdlg.scrollTop = 0;
  }

  function onTrainClick(e) {
    var t = e.target;
    if (t === tmodal || t.closest('[data-tk-close]')) { closeTrainBooking(); return; }

    var s = t.closest('[data-tseat]');
    if (s) {
      var id = s.getAttribute('data-tseat');
      var i = T.seats.indexOf(id);
      if (i > -1) T.seats.splice(i, 1);
      else if (T.seats.length >= MAX_SEATS) { tq('msg').textContent = 'Tối đa ' + MAX_SEATS + ' chỗ cho mỗi lần đặt.'; return; }
      else T.seats.push(id);
      trRefresh();
      return;
    }

    var c = t.closest('[data-tcoach]');
    if (c) {
      T.coach = c.getAttribute('data-tcoach');
      T.seats = []; // sơ đồ khác nhau theo loại khoang nên chọn lại
      trRefresh();
      return;
    }

    if (t.closest('[data-promo-apply]')) { applyPromo(tmodal, T); trRenderBill(); return; }

    if (t.closest('[data-tk-submit]')) submitTrainBooking();
  }

  function onTrainInput(e) {
    var el = e.target;
    var seat = el.getAttribute && el.getAttribute('data-pax');
    if (!seat) return;
    (T.pax[seat] = T.pax[seat] || {})[el.getAttribute('data-k')] = el.value;
  }

  function onTrainChange(e) {
    var el = e.target;
    if (el.getAttribute && el.getAttribute('data-k') === 'name') {
      el.value = noAccent(el.value).replace(/\s+/g, ' ').trim();
      onTrainInput(e);
    }
  }

  function submitTrainBooking() {
    var msg = tq('msg');
    if (!T.seats.length) { msg.textContent = 'Vui lòng chọn ít nhất 1 chỗ trên sơ đồ.'; return; }
    for (var i = 0; i < T.seats.length; i++) {
      var p = T.pax[T.seats[i]] || {};
      var who = 'Hành khách ' + (i + 1) + ' (chỗ ' + T.seats[i] + '): ';
      if (!/^[A-Z]+( [A-Z]+)+$/.test(noAccent((p.name || '').trim()))) { msg.textContent = who + 'nhập đầy đủ họ và tên.'; return; }
      if (!/^[A-Za-z0-9]{8,12}$/.test((p.id || '').trim())) { msg.textContent = who + 'số CCCD / hộ chiếu không hợp lệ.'; return; }
      if (!/^(0|\+84)\d{9}$/.test((p.phone || '').replace(/[\s.-]/g, ''))) { msg.textContent = who + 'số điện thoại không hợp lệ.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((p.email || '').trim())) { msg.textContent = who + 'email không hợp lệ (bắt buộc để nhận vé điện tử).'; return; }
    }
    msg.textContent = '';

    var pay = tmodal.querySelector('input[name="tk-pay"]:checked');
    var b = calcBill();
    var code = 'VT-' + (100000 + hash(T.t.id + Date.now()) % 900000);
    tdlg.innerHTML = successHtml({
      sub: 'Vé điện tử sẽ được gửi qua email (và Zalo theo số điện thoại đã đăng ký) sau khi VivuGo xác nhận thanh toán.',
      code: code,
      rows: [
        ['Chuyến tàu', esc(T.t.trainCode) + ' · ' + esc(T.t.fromCity) + ' → ' + esc(T.t.toCity)],
        ['Khởi hành', esc(T.t.departureTime) + (T.date ? ' · ' + esc(showDate(T.date)) : '')],
        ['Hạng chỗ', esc(coachNow().label)],
        ['Chỗ ngồi', T.seats.join(', ')],
        ['Thanh toán', esc(pay ? pay.value : '')],
        ['Tổng tiền', money(b.total), true]
      ],
      policy: [
        'Hủy / đổi trước giờ tàu chạy từ 24 giờ: phí 10% giá vé.',
        'Từ 4 đến dưới 24 giờ: phí 20% giá vé.',
        'Dưới 4 giờ: không hoàn, không đổi.',
        'Mang theo CCCD / hộ chiếu trùng với thông tin đã đặt khi lên tàu.'
      ],
      close: 'data-tk-close'
    });
  }

  /* =====================================================================
   * XE GHÉP LIMO: tìm chuyến (một chiều / khứ hồi), thẻ chuyến, biểu mẫu đăng ký đặt vé
   * ===================================================================== */

  var allBuses = [];
  var busCities = [];
  var busQuery = null; // null = chưa tìm (hiện tất cả chuyến xe ghép)

  function isLimo(b) { return !!b.isSharedRide; }

  // '' = để trống (không lọc), null = không tìm thấy thành phố
  function findCity(txt) {
    var t = normTxt(txt);
    if (!t) return '';
    var m = busCities.filter(function (c) { return normTxt(c) === t; });
    if (!m.length) m = busCities.filter(function (c) { return normTxt(c).indexOf(t) > -1; });
    return m.length ? m[0] : null;
  }

  function searchBuses(from, to) {
    return allBuses
      .filter(function (b) { return isLimo(b) && (!from || b.fromCity === from) && (!to || b.toCity === to); })
      .sort(function (a, b) { return a.priceFrom - b.priceFrom; });
  }

  function initials(name) {
    var w = String(name).trim().split(/\s+/);
    return (w.length > 1 ? w[0].charAt(0) + w[w.length - 1].charAt(0) : w[0].slice(0, 2)).toUpperCase();
  }

  function stars(r) {
    return '<span class="lm-rate"><i class="fa-solid fa-star"></i> ' + Number(r).toFixed(1) + '</span>';
  }

  /* ---------- Thẻ chuyến xe ghép ---------- */

  function limoCardHtml(b, date, best) {
    var chips = [];
    if (b.driverVerified) chips.push('<span class="lm-chip lm-ok"><i class="fa-solid fa-shield-halved"></i> Tài xế đã xác minh</span>');
    (b.amenities || []).slice(0, 3).forEach(function (a) { chips.push('<span class="tag-chip">' + esc(a) + '</span>'); });
    return vtCardHtml({
      mode: 'bus',
      id: b.id,
      logo: b.logo ? logoHtml(b.logo, b.operator, initials(b.operator)) : esc(initials(b.operator)),
      title: b.operator,
      sub: dotJoin([esc(b.vehicleType), 'Ghế ghép', date ? 'Ngày ' + esc(showDate(date)) : '',
        stars(b.rating) + ' <span class="lm-rv">(' + b.reviewCount + ' đánh giá)</span>']),
      dep: { time: b.departureTime, label: b.pickupPoint || b.fromCity },
      arr: { time: b.arrivalTime, label: b.dropoffPoint || b.toCity, off: b.arrivalDayOffset },
      dur: b.duration || duration(b.durationMinutes),
      stop: b.fromCity + ' → ' + b.toCity,
      chips: chips.join(''),
      best: best,
      priceLabel: 'Giá 1 ghế từ',
      price: b.priceFrom,
      btnAttrs: 'data-book-limo="' + esc(b.id) + '" data-date="' + esc(date || '') + '"',
      note: 'Còn ' + b.seatsLeft + ' ghế trống'
    });
  }

  function limoResultHtml(label, from, to, date, buses, plain) {
    var title = plain
      ? esc(label)
      : esc(label) + ' · ' + esc(from || 'Tất cả') + ' → ' + esc(to || 'Tất cả') + (date ? ' · ' + esc(showDate(date)) : '');
    title += ' <span class="vf-result-count">— ' + buses.length + ' chuyến xe</span>';
    var body = buses.length
      ? '<div class="route-list">' + buses.map(function (b, i) { return limoCardHtml(b, date, i === 0 && buses.length > 1); }).join('') + '</div>'
      : '<div class="car-empty"><p>Không có chuyến xe ghép phù hợp với tìm kiếm hiện tại trong bộ dữ liệu demo.</p>' +
        '<button type="button" class="btn-outline btn-sm" data-reset-bus>Bỏ lọc, xem tất cả chuyến xe</button></div>';
    return '<div class="vf-result"><h3 class="vf-result-title">' + title + '</h3>' + body + '</div>';
  }

  function renderBuses() {
    var list = document.querySelector('[data-list="bus"]');
    if (!list) return;
    var html;
    if (!busQuery) {
      html = limoResultHtml('Tất cả chuyến xe ghép', '', '', '', searchBuses('', ''), true);
    } else {
      var round = busQuery.trip === 'round-trip';
      html = limoResultHtml(round ? 'Chiều đi' : 'Chuyến xe', busQuery.from, busQuery.to, busQuery.date, searchBuses(busQuery.from, busQuery.to));
      if (round) html += limoResultHtml('Chiều về', busQuery.to, busQuery.from, busQuery.returnDate, searchBuses(busQuery.to, busQuery.from));
      html = html.replace('</h3>', ' <button type="button" class="btn-ghost btn-sm vf-clear" data-reset-bus>✕ Bỏ lọc</button></h3>');
    }
    list.innerHTML = html;
  }

  /* ---------- Form tìm kiếm ---------- */

  function setupBusFilter(data) {
    var form = document.querySelector('[data-bus-filter]');
    if (!form) return;
    allBuses = data.buses || [];

    var shared = allBuses.filter(isLimo);
    var set = {};
    shared.forEach(function (b) { set[b.fromCity] = 1; set[b.toCity] = 1; });
    busCities = Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'vi'); });

    var dl = document.getElementById('bus-cities');
    if (dl) dl.innerHTML = busCities.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('');

    fillHotline(document);

    var fromInp = form.querySelector('[data-b="from"]');
    var toInp = form.querySelector('[data-b="to"]');
    var dateInp = form.querySelector('[data-b="date"]');
    var retInp = form.querySelector('[data-b="return"]');
    var retField = form.querySelector('[data-return-field]');
    var msgEl = form.querySelector('[data-bus-msg]');
    var radios = form.querySelectorAll('input[name="bus-trip"]');
    var today = todayStr();
    dateInp.min = today;
    dateInp.value = today;
    retInp.min = today;

    function trip() {
      var r = form.querySelector('input[name="bus-trip"]:checked');
      return r ? r.value : 'one-way';
    }
    function syncTrip() {
      var round = trip() === 'round-trip';
      retField.hidden = !round;
      if (round && !retInp.value) retInp.value = dateInp.value;
    }
    radios.forEach(function (r) { r.addEventListener('change', syncTrip); });
    dateInp.addEventListener('change', function () {
      retInp.min = dateInp.value || today;
      if (retInp.value && retInp.value < retInp.min) retInp.value = retInp.min;
    });

    function resetAll() {
      fromInp.value = '';
      toInp.value = '';
      radios.forEach(function (r) { r.checked = r.value === 'one-way'; });
      dateInp.value = today;
      retInp.value = '';
      retInp.min = today;
      syncTrip();
      if (msgEl) msgEl.textContent = '';
      busQuery = null;
      renderBuses();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = findCity(fromInp.value);
      var t = findCity(toInp.value);
      var q = { trip: trip(), from: f, to: t, date: dateInp.value, returnDate: retInp.value };
      var err = '';
      if (f === null) err = 'Không tìm thấy điểm đi "' + fromInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (t === null) err = 'Không tìm thấy điểm đến "' + toInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (f && t && f === t) err = 'Điểm đi và điểm đến phải khác nhau.';
      else if (!q.date) err = 'Vui lòng chọn ngày đi.';
      else if (q.date < todayStr()) err = 'Ngày đi không được ở trong quá khứ.';
      else if (q.trip === 'round-trip' && !q.returnDate) err = 'Vui lòng chọn ngày về.';
      else if (q.trip === 'round-trip' && q.returnDate < q.date) err = 'Ngày về không được trước ngày đi.';
      if (msgEl) msgEl.textContent = err;
      if (err) return;
      busQuery = q;
      renderBuses();
    });

    var list = document.querySelector('[data-list="bus"]');
    if (list) {
      list.addEventListener('click', function (e) {
        var bk = e.target.closest('[data-book-limo]');
        if (bk) { openLimoBooking(bk.getAttribute('data-book-limo'), bk.getAttribute('data-date') || dateInp.value); return; }
        if (e.target.closest('[data-reset-bus]')) resetAll();
      });
    }
    syncTrip();
  }

  /* ---------- Biểu mẫu đăng ký đặt vé xe ghép ---------- */
  // Luồng: danh sách nhà xe cùng tuyến (lọc nhanh theo số chỗ) → số ghế → thông tin hành khách → hóa đơn → hoàn tất.

  var lmodal = null;
  var ldlg = null;
  var L = null; // { from, to, date, trips[], tripId, cap, qty, pax[], email, promo }

  function lq(name) { return lmodal.querySelector('[data-lm="' + name + '"]'); }
  function lmTrip() {
    for (var i = 0; i < L.trips.length; i++) if (L.trips[i].id === L.tripId) return L.trips[i];
    return L.trips[0];
  }
  function lmVisible() {
    return L.trips.filter(function (b) { return L.cap === 'all' || String(b.seatCapacity) === L.cap; });
  }
  function lmMaxQty() { return Math.min(lmTrip().seatsLeft, MAX_SEATS); }

  function lmBill() {
    return pricing(L.qty, lmTrip().priceFrom, L.promo);
  }

  function lmRenderInfo() {
    var b = lmTrip();
    var off = b.arrivalDayOffset ? ' (+' + b.arrivalDayOffset + ' ngày)' : '';
    lq('info').innerHTML =
      '<div><strong>' + esc(b.operator) + ' • ' + esc(b.vehicleType) + '</strong>' +
      '<p>Khởi hành <b>' + esc(b.departureTime) + '</b> → đến ' + esc(b.arrivalTime) + off + (L.date ? ' • Ngày ' + esc(showDate(L.date)) : '') +
        ' • Đón: ' + esc(b.pickupPoint || b.fromCity) + '</p></div>' +
      '<div class="booking-price">' + money(b.priceFrom) + '<br><small>/ghế · Giá chia sẻ</small></div>';
  }

  function lmRenderFilter() {
    var caps = [];
    L.trips.forEach(function (b) { if (caps.indexOf(b.seatCapacity) < 0) caps.push(b.seatCapacity); });
    caps.sort(function (a, b) { return a - b; });
    if (caps.length < 2) { lq('filter').innerHTML = ''; return; } // chỉ có 1 loại xe thì ẩn lọc nhanh
    var opts = [{ v: 'all', t: 'Tất cả' }].concat(caps.map(function (c) { return { v: String(c), t: c + ' chỗ' }; }));
    lq('filter').innerHTML = opts.map(function (o) {
      var on = o.v === L.cap;
      return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" data-lm-cap="' + o.v + '" aria-pressed="' + on + '">' + o.t + '</button>';
    }).join('');
  }

  function lmRenderTrips() {
    var vis = lmVisible();
    lq('trips').innerHTML = vis.map(function (b) {
      var on = b.id === L.tripId;
      return '<button type="button" class="lm-opt' + (on ? ' is-on' : '') + '" data-lm-trip="' + esc(b.id) + '" aria-pressed="' + on + '">' +
        '<span class="lm-opt-radio"></span>' +
        '<span class="lm-opt-main"><b>' + esc(b.operator) + '</b><small>' + esc(b.vehicleType) + ' · ' + stars(b.rating) + ' (' + b.reviewCount + ')' +
          (b.driverVerified ? ' · <i class="fa-solid fa-shield-halved lm-ok-ic"></i> Đã xác minh' : '') + '</small></span>' +
        '<span class="lm-opt-time"><b>' + esc(b.departureTime) + ' → ' + esc(b.arrivalTime) + '</b><small>' + esc(b.duration || duration(b.durationMinutes)) + '</small></span>' +
        '<span class="lm-opt-price"><b>' + money(b.priceFrom) + '</b><small>Còn ' + b.seatsLeft + ' ghế</small></span>' +
      '</button>';
    }).join('') || '<p class="section-sub">Không có xe nào với số chỗ này.</p>';
  }

  function lmRenderQty() {
    var max = lmMaxQty();
    var h = '';
    for (var i = 1; i <= max; i++) {
      h += '<button type="button" class="seat-pill' + (i === L.qty ? ' is-active' : '') + '" data-lm-qty="' + i + '" aria-pressed="' + (i === L.qty) + '">' + i + '</button>';
    }
    lq('qty').innerHTML = h;
  }

  function lmRenderPax() {
    var h = '';
    for (var i = 0; i < L.qty; i++) {
      h += paxCardHtml('data-lmp', i, 'Hành khách ' + (i + 1), L.pax[i] || {}, { email: false, idLabel: 'Số CCCD *' });
    }
    lq('pax').innerHTML = h;
  }

  function lmRenderBill() {
    lq('bill').innerHTML = billHtml(lmBill(), L.promo);
  }

  function lmRefreshAll() {
    lmRenderInfo(); lmRenderFilter(); lmRenderTrips(); lmRenderQty(); lmRenderPax(); lmRenderBill();
    lq('msg').textContent = '';
  }

  function ensureLimoModal() {
    if (lmodal) return;
    lmodal = document.createElement('div');
    lmodal.className = 'modal-overlay';
    lmodal.innerHTML = '<div class="booking-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="lm-title"></div>';
    ldlg = lmodal.firstChild;
    document.body.appendChild(lmodal);
    lmodal.addEventListener('click', onLimoClick);
    lmodal.addEventListener('input', onLimoInput);
    lmodal.addEventListener('change', onLimoChange);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lmodal.classList.contains('is-open')) closeLimoBooking();
    });
  }

  function closeLimoBooking() {
    if (!lmodal) return;
    lmodal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openLimoBooking(id, date) {
    var b0 = allBuses.filter(function (x) { return x.id === id; })[0];
    if (!b0) return;
    var trips = allBuses
      .filter(function (x) { return isLimo(x) && x.fromCity === b0.fromCity && x.toCity === b0.toCity; })
      .sort(function (a, b) { return a.departureTime < b.departureTime ? -1 : 1; });
    L = { from: b0.fromCity, to: b0.toCity, date: date, trips: trips, tripId: id, cap: 'all', qty: 1, pax: [], email: '', promo: '' };
    ensureLimoModal();
    ldlg.innerHTML =
      '<div class="booking-modal-head"><div><span class="modal-kicker">Đăng ký vé xe ghép Limo</span>' +
        '<h3 id="lm-title">' + esc(L.from) + ' → ' + esc(L.to) + '</h3>' +
        '<p class="section-sub">' + trips.length + ' chuyến phù hợp' + (date ? ' • Ngày ' + esc(showDate(date)) : '') + '</p></div>' +
        '<button type="button" class="modal-close" data-lm-close aria-label="Đóng">✕</button></div>' +
      '<div class="booking-provider-bar" data-lm="info"></div>' +
      '<div class="booking-form">' +
        '<div class="listing-toolbar"><h4 class="panel-h">CHỌN NHÀ XE · LOẠI XE · GIỜ KHỞI HÀNH</h4>' +
          '<div class="segmented lm-seg" role="group" aria-label="Lọc nhanh theo số chỗ" data-lm="filter"></div></div>' +
        '<div class="lm-opts" data-lm="trips"></div>' +
        '<h4 class="panel-h">SỐ GHẾ ĐẶT</h4><div class="seat-filter" data-lm="qty"></div>' +
        '<h4 class="panel-h">THÔNG TIN HÀNH KHÁCH</h4><div data-lm="pax"></div>' +
        '<div class="form-group lm-email"><label>Email nhận vé điện tử (không bắt buộc)</label>' +
          '<input type="email" data-lm-email placeholder="passenger@gmail.com" autocomplete="off" /></div>' +
        promoHtml() + payHtml('lm-pay') +
        '<div class="booking-summary" data-lm="bill"></div>' + contactHtml() +
        '<p class="form-error" data-lm="msg" role="alert"></p>' +
        '<button type="button" class="btn-confirm" data-lm-submit>Hoàn tất đặt vé</button>' +
      '</div>';
    fillHotline(ldlg);
    lmRefreshAll();
    lmodal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lmodal.scrollTop = 0;
    ldlg.scrollTop = 0;
  }

  function onLimoClick(e) {
    var t = e.target;
    if (t === lmodal || t.closest('[data-lm-close]')) { closeLimoBooking(); return; }

    var cp = t.closest('[data-lm-cap]');
    if (cp) {
      L.cap = cp.getAttribute('data-lm-cap');
      var vis = lmVisible();
      if (vis.length && vis.indexOf(lmTrip()) < 0) {
        L.tripId = vis[0].id;
        L.qty = Math.min(L.qty, lmMaxQty());
        lmRenderInfo(); lmRenderQty(); lmRenderPax(); lmRenderBill();
      }
      lmRenderFilter(); lmRenderTrips();
      return;
    }

    var tp = t.closest('[data-lm-trip]');
    if (tp) {
      L.tripId = tp.getAttribute('data-lm-trip');
      L.qty = Math.min(L.qty, lmMaxQty());
      lmRefreshAll();
      return;
    }

    var q = t.closest('[data-lm-qty]');
    if (q) {
      L.qty = parseInt(q.getAttribute('data-lm-qty'), 10);
      lmRenderQty(); lmRenderPax(); lmRenderBill();
      lq('msg').textContent = '';
      return;
    }

    if (t.closest('[data-promo-apply]')) { applyPromo(lmodal, L); lmRenderBill(); return; }

    if (t.closest('[data-lm-submit]')) submitLimoBooking();
  }

  function onLimoInput(e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-lm-email')) { L.email = el.value; return; }
    var i = el.getAttribute && el.getAttribute('data-lmp');
    if (i === null || i === undefined) return;
    (L.pax[+i] = L.pax[+i] || {})[el.getAttribute('data-k')] = el.value;
  }

  function onLimoChange(e) {
    var el = e.target;
    if (el.getAttribute && el.getAttribute('data-k') === 'name') {
      el.value = noAccent(el.value).replace(/\s+/g, ' ').trim();
      onLimoInput(e);
    }
  }

  function submitLimoBooking() {
    var msg = lq('msg');
    for (var i = 0; i < L.qty; i++) {
      var p = L.pax[i] || {};
      var who = 'Hành khách ' + (i + 1) + ': ';
      if (!/^[A-Z]+( [A-Z]+)+$/.test(noAccent((p.name || '').trim()))) { msg.textContent = who + 'nhập đầy đủ họ và tên.'; return; }
      if (!/^(\d{9}|\d{12})$/.test((p.id || '').trim())) { msg.textContent = who + 'số CCCD phải gồm 9 hoặc 12 chữ số.'; return; }
      if (!/^(0|\+84)\d{9}$/.test((p.phone || '').replace(/[\s.-]/g, ''))) { msg.textContent = who + 'số điện thoại không hợp lệ.'; return; }
    }
    if (L.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(L.email.trim())) { msg.textContent = 'Email không hợp lệ.'; return; }
    msg.textContent = '';

    var b = lmTrip();
    var bill = lmBill();
    var pay = lmodal.querySelector('input[name="lm-pay"]:checked');
    var code = 'VL-' + (100000 + hash(b.id + Date.now()) % 900000);
    ldlg.innerHTML = successHtml({
      sub: 'Vé điện tử sẽ được gửi qua Zalo theo số điện thoại hành khách' + (L.email.trim() ? ' và email ' + esc(L.email.trim()) : '') + ' sau khi VivuGo xác nhận thanh toán.',
      code: code,
      rows: [
        ['Nhà xe', esc(b.operator) + ' · ' + esc(b.vehicleType)],
        ['Hành trình', esc(b.fromCity) + ' → ' + esc(b.toCity)],
        ['Khởi hành', esc(b.departureTime) + (L.date ? ' · ' + esc(showDate(L.date)) : '')],
        ['Điểm đón', esc(b.pickupPoint || b.fromCity)],
        ['Số ghế', String(L.qty)],
        ['Thanh toán', esc(pay ? pay.value : '')],
        ['Tổng tiền', money(bill.total), true]
      ],
      policy: [
        'Hủy / đổi trước giờ xe chạy từ 24 giờ: phí 10% giá vé.',
        'Từ 4 đến dưới 24 giờ: phí 30% giá vé.',
        'Dưới 4 giờ: không hoàn, không đổi.',
        'Có mặt đúng điểm đón trước giờ khởi hành 10 phút và mang theo CCCD.'
      ],
      close: 'data-lm-close'
    });
  }

  /* ---------- Render toàn trang ---------- */

  function render(data) {
    allFlights = data.flights || [];

    var groups = {
      bus: (data.buses || []).map(fromBus).sort(byPrice),
      train: (data.trains || []).map(fromTrain).sort(byPrice),
      flightAll: allFlights.map(function (f) { return fromFlight(f, 'economy', false); }).sort(byPrice)
    };

    // Tab "Tất cả": vài tuyến giá tốt nhất của mỗi loại
    var all = [].concat(
      groups.bus.slice(0, ALL_PER_MODE),
      groups.flightAll.slice(0, ALL_PER_MODE),
      groups.train.slice(0, ALL_PER_MODE)
    );

    document.querySelectorAll('[data-list]').forEach(function (el) {
      var key = el.getAttribute('data-list');
      if (key === 'all') fill(el, all);
      // key === 'flight' do renderFlights() xử lý
    });

    setupFlightFilter(data);
    renderFlights();
    setupTrainFilter(data);
    renderTrains();
    setupBusFilter(data);
    renderBuses();
  }

  function showError() {
    document.querySelectorAll('[data-list]').forEach(function (el) {
      el.innerHTML = '<p>Không tải được dữ liệu. Nếu đang mở trực tiếp file HTML, hãy chạy qua máy chủ (http://) và kiểm tra lại đường dẫn: ' + esc(DATA_URL) + '</p>';
    });
  }

  /* ---------- Chuyển tab (dự phòng, không xung đột với js.js) ---------- */

  // Đặt trạng thái active rõ ràng (không dùng kiểu bật/tắt luân phiên),
  // nên chạy song song với js.js cũng không bị đảo trạng thái.
  function initTabs() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab-target]');
      if (!btn) return;
      var group = btn.closest('[data-tab-group]');
      if (!group) return;
      var target = btn.getAttribute('data-tab-target');

      group.querySelectorAll('[data-tab-target]').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      group.querySelectorAll('[data-tab-panel]').forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-tab-panel') === target);
      });
    });
  }

  /* ---------- Khởi chạy ---------- */

  /* ---------- CSS lõi của thẻ chuyến ----------
   * Tự chèn vào trang để thẻ luôn đúng bố cục 3 cột (logo | thông tin | giá),
   * kể cả khi file HTML đang dùng là bản cũ chưa có các quy tắc này. */
  function injectCardStyle() {
    if (document.getElementById('vt-core-style')) return;
    var st = document.createElement('style');
    st.id = 'vt-core-style';
    st.textContent =
      '.vt-card{display:grid;grid-template-columns:210px minmax(0,1fr) 210px;position:relative}' +
      '.vt-stub{position:relative;display:grid;place-items:center;min-height:150px;overflow:hidden;font-size:38px;font-weight:800;border-radius:14px 0 0 14px;background:var(--vt-soft,#F3FAFF);color:var(--vt-ac,#008FE5)}' +
      '.vt-stub img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:center}' +
      '.vt-stub svg{width:64px;height:64px}' +
      '.vt-main{display:flex;align-items:center;min-width:0}' +
      '@media(max-width:760px){.vt-card{grid-template-columns:1fr}.vt-stub{min-height:120px;border-radius:14px 14px 0 0}}';
    document.head.appendChild(st); // đặt cuối <head> để luôn thắng quy tắc cũ cùng tên trong HTML
  }

  function init() {
    injectCardStyle();
    initTabs();
    fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(render)
      .catch(showError);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();