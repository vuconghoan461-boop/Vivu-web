/**
 * Vehicles.js
 * Đọc dữ liệu phương tiện (máy bay, tàu hỏa, xe khách)
 * từ file JSON, render các thẻ .route-card vào các danh sách [data-list]
 * và xử lý form tìm chuyến bay (một chiều/khứ hồi, nơi đi, nơi đến, ngày bay, hãng, hạng ghế),
 * thẻ chuyến bay và hộp thoại đặt vé hộ + chọn ghế + nhập thông tin hành khách;
 * tương tự cho tàu hỏa (tìm chuyến, loại khoang, sơ đồ chỗ, mã ưu đãi, hóa đơn).
 *
 * Cách dùng trong HTML:
 *   <section data-tab-group data-vehicles-src="../../data/Vehicles.json"> ... </section>
 *   <div class="route-list" data-list="all|flight|train|bus"></div>
 *   <form data-flight-filter> ... </form>    (form tìm chuyến bay, xem transportation.html)
 *   <script src="../../assest/Vehicles.js" defer></script>
 *
 * Lưu ý: đường dẫn trong data-vehicles-src được tính từ trang HTML đang mở,
 * không phải từ vị trí file Vehicles.js.
 */
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

  // Ảnh logo lỗi (404...) thì tự quay về ô màu + mã hãng thay vì hiện icon ảnh vỡ
  document.addEventListener('error', function (e) {
    var i = e.target;
    if (!i || !i.classList || !i.classList.contains('fl-logo-img')) return;
    var s = document.createElement('span');
    s.className = 'fl-logo';
    s.style.background = i.getAttribute('data-c');
    s.style.color = i.getAttribute('data-fg');
    s.textContent = i.getAttribute('data-t');
    i.replaceWith(s);
  }, true);

  var PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';

  // Thẻ chuyến bay dạng vé: [logo + hãng] ┆ [giờ đi → giờ đến] ┆ [giá + nút]
  // Dùng lại class của css.css: vivugo-card, route-track, tag-row/tag-chip, price, btn-primary.
  function flightCardHtml(f, cls, date, best) {
    var biz = cls === 'business';
    var price = biz ? f.priceBusiness : f.priceEconomy;
    var c = f.airlineLogoColor || '#008FE5';
    var code = f.airlineCode || f.airline.slice(0, 2);
    var logo = LOGOS[f.airlineCode]
      ? '<img class="fl-logo-img" src="' + esc(LOGOS[f.airlineCode]) + '" alt="' + esc(f.airline) + '" data-c="' + esc(c) +
        '" data-fg="' + (lum(c) > 170 ? '#0f172a' : '#fff') + '" data-t="' + esc(code) + '" />'
      : '<span class="fl-logo" style="background:' + esc(c) + ';color:' + (lum(c) > 170 ? '#0f172a' : '#fff') + '">' + esc(code) + '</span>';
    var chips = [];
    if (date) chips.push('Ngày ' + showDate(date));
    if (f.aircraft) chips.push(f.aircraft);
    if (f.baggageIncluded) chips.push(f.baggageIncluded);

    return '<article class="fl-card vivugo-card" style="--ac:' + esc(c) + '" data-id="' + esc(f.id) + '" data-mode="flight">' +
      '<div class="fl-stub">' + logo + '<b>' + esc(f.airline) + '</b><small>Chuyến ' + esc(f.flightNumber) + '</small></div>' +
      '<div class="fl-main">' +
        '<div class="fl-row">' +
          '<div class="fl-pt"><b>' + esc(f.departureTime) + '</b><span>' + esc(f.fromCode) + '</span><small>' + esc(f.fromCity) + '</small></div>' +
          '<div class="fl-route"><span>' + esc(duration(f.durationMinutes)) + '</span>' +
            '<div class="route-track">' + PLANE + '</div>' +
            '<span>' + (f.stops === 0 ? 'Bay thẳng' : f.stops + ' điểm dừng') + '</span></div>' +
          '<div class="fl-pt"><b>' + esc(f.arrivalTime) + '</b><span>' + esc(f.toCode) + '</span><small>' + esc(f.toCity) + '</small></div>' +
        '</div>' +
        (chips.length ? '<div class="tag-row">' + chips.map(function (t) { return '<span class="tag-chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '</div>' +
      '<div class="fl-buy">' + (best ? '<span class="fl-best">Giá tốt nhất</span>' : '') +
        '<div class="price"><span class="from">Giá / khách · ' + (biz ? 'Thương gia' : 'Phổ thông') + '</span>' +
          '<span class="amount">' + money(price) + '</span></div>' +
        '<button type="button" class="btn-primary btn-block" data-book="' + esc(f.id) + '" data-cls="' + cls + '" data-date="' + esc(date || '') + '">Chọn đặt vé</button>' +
      '</div>' +
    '</article>';
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
      var p = B.pax[s] || {};
      function fg(k, label, ph, type) {
        return '<div class="form-group"><label>' + label + '</label><input type="' + (type || 'text') +
          '" data-pax="' + s + '" data-k="' + k + '" placeholder="' + ph + '" value="' + esc(p[k] || '') + '" autocomplete="off" /></div>';
      }
      return '<div class="bk-pax"><h4 class="panel-h">Hành khách ' + (i + 1) + ' · Ghế ' + s + '</h4>' +
        '<div class="form-row">' + fg('name', 'Họ và tên (IN HOA không dấu) *', 'NGUYEN VAN A') + fg('id', 'Số CCCD / Hộ chiếu *', '012345678901') + '</div>' +
        '<div class="form-row">' + fg('phone', 'Số điện thoại nhận SMS *', '0912 345 678', 'tel') + fg('email', 'Gmail nhận vé điện tử *', 'passenger@gmail.com', 'email') + '</div></div>';
    }).join('');
  }

  function renderTotal() {
    q('total').textContent = money(seatPrice() * B.seats.length);
    q('count').textContent = B.seats.length + ' ghế × ' + money(seatPrice());
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
    B = { f: f, cls: cls === 'business' ? 'business' : 'economy', date: date, seats: [], pax: {} };
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
        '<div class="filter-group"><h4>Phương thức thanh toán</h4>' +
          '<label class="filter-option"><input type="radio" name="bk-pay" value="Chuyển khoản / QR" checked /> Chuyển khoản / QR</label>' +
          '<label class="filter-option"><input type="radio" name="bk-pay" value="Thẻ Visa / Mastercard" /> Thẻ Visa / Mastercard</label>' +
          '<label class="filter-option"><input type="radio" name="bk-pay" value="Ví điện tử" /> Ví điện tử</label></div>' +
        '<div class="booking-summary"><div class="summary-line"><span>Số ghế</span><span data-bk="count"></span></div>' +
          '<div class="summary-total"><span>Tổng thanh toán vé</span><strong data-bk="total"></strong></div></div>' +
        '<p class="form-error" data-bk="msg" role="alert"></p>' +
        '<button type="button" class="btn-confirm" data-bk-submit>Hoàn tất đặt vé</button>' +
      '</div>';
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
    var code = 'VG-' + (100000 + hash(B.f.id + Date.now()) % 900000);
    function row(k, v, amount) { return '<div class="info-row"><span>' + k + '</span><strong' + (amount ? ' class="amount"' : '') + '>' + v + '</strong></div>'; }
    dlg.innerHTML =
      '<div class="success-body"><div class="success-check">✓</div><h3>Đã gửi yêu cầu đặt vé</h3>' +
      '<p class="success-sub">VivuGo sẽ đặt vé hộ bạn và gửi vé điện tử qua email của từng hành khách sau khi xác nhận thanh toán.</p>' +
      '<div class="order-code">' + code + '</div>' +
      '<div class="success-info">' +
        row('Chuyến bay', esc(B.f.airline) + ' ' + esc(B.f.flightNumber)) +
        row('Hành trình', esc(B.f.fromCode) + ' → ' + esc(B.f.toCode) + (B.date ? ' · ' + esc(showDate(B.date)) : '')) +
        row('Hạng ghế', clsName()) +
        row('Ghế', B.seats.join(', ')) +
        row('Thanh toán', esc(pay ? pay.value : '')) +
        row('Tổng tiền', money(seatPrice() * B.seats.length), true) +
      '</div><button type="button" class="btn-confirm btn-block" data-bk-close>Đóng</button></div>';
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
    var airportOpts = airports.map(function (a) {
      return { value: a.code, label: a.city + ' (' + a.code + ')' };
    });
    var anyOpt = [{ value: '', label: 'Tất cả sân bay' }];
    addOptions(fromSel, anyOpt.concat(airportOpts));
    addOptions(toSel, anyOpt.concat(airportOpts));
    fromSel.value = '';
    toSel.value = '';

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
        from: fromSel.value,
        to: toSel.value,
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
  var TR_GREEN = '#2E7D4F';
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
    var logo = LOGOS.DSVN
      ? '<img src="' + esc(LOGOS.DSVN) + '" alt="' + esc(t.company) + '" />'
      : TRAIN_ICON;
    var off = t.arrivalDayOffset ? '<sup class="tt-off">+' + t.arrivalDayOffset + '</sup>' : '';
    return '<article class="tt-card vivugo-card" data-id="' + esc(t.id) + '" data-mode="train">' +
      '<div class="tt-main">' +
        '<div class="tt-logo">' + logo + '</div>' +
        '<div class="tt-info">' +
          '<h3 class="tt-title">' + esc(t.company) + ' (' + esc(t.trainCode) + ' ' + typeName + ')</h3>' +
          '<p class="tt-sub">Tàu ' + esc(t.trainCode) + ' • ' + esc(cc.label) + (date ? ' • Ngày ' + esc(showDate(date)) : '') + '</p>' +
          '<div class="tt-times">' +
            '<div class="tt-pt"><b>' + esc(t.departureTime) + '</b><small>' + esc(t.fromStation) + '</small></div>' +
            '<div class="tt-route"><span>' + esc(t.duration || duration(t.durationMinutes)) + '</span><div class="tt-line"></div>' +
              '<span class="tt-stop">' + (t.stops === 0 ? 'Không dừng' : esc(t.stopsLabel || t.stops + ' điểm dừng')) + '</span></div>' +
            '<div class="tt-pt"><b>' + esc(t.arrivalTime) + off + '</b><small>' + esc(t.toStation) + '</small></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fl-buy">' + (best ? '<span class="fl-best">Giá tốt nhất</span>' : '') +
        '<div class="price"><span class="from">Giá 1 vé từ</span><span class="amount">' + money(t.priceFrom) + '</span></div>' +
        '<button type="button" class="btn-primary btn-block" data-book-train="' + esc(t.id) + '" data-date="' + esc(date || '') + '">Chọn vé</button>' +
        '<small>Còn ' + cc.seatsLeft + ' ghế trống</small>' +
      '</div>' +
    '</article>';
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
    var n = T.seats.length;
    var sub = tPrice() * n;
    var p = T.promo ? PROMOS[T.promo] : null;
    var disc = p ? (p.pct ? Math.round(sub * p.pct / 100) : Math.min(p.flat, sub)) : 0;
    var fee = SERVICE_FEE * n;
    return { n: n, sub: sub, disc: disc, fee: fee, total: sub - disc + fee };
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
      var p = T.pax[s] || {};
      function fg(k, label, ph, type) {
        return '<div class="form-group"><label>' + label + '</label><input type="' + (type || 'text') + '" data-pax="' + s + '" data-k="' + k +
          '" placeholder="' + ph + '" value="' + esc(p[k] || '') + '" autocomplete="off" /></div>';
      }
      return '<div class="bk-pax"><h4 class="panel-h">Hành khách ' + (i + 1) + ' · Chỗ ' + s + '</h4>' +
        '<div class="form-row">' + fg('name', 'Họ và tên *', 'NGUYEN VAN A') + fg('id', 'Số CCCD / Hộ chiếu *', '012345678901') + '</div>' +
        '<div class="form-row">' + fg('phone', 'Số điện thoại *', '0912 345 678', 'tel') + fg('email', 'Email nhận vé điện tử *', 'passenger@gmail.com', 'email') + '</div></div>';
    }).join('');
  }

  function trRenderBill() {
    var b = calcBill();
    tq('bill').innerHTML =
      '<div class="summary-line"><span>Tiền vé (' + b.n + ' × ' + money(tPrice()) + ')</span><span>' + money(b.sub) + '</span></div>' +
      '<div class="summary-line"><span>Mã ưu đãi' + (T.promo ? ' (' + esc(T.promo) + ')' : '') + '</span><span>' + (b.disc ? '− ' + money(b.disc) : 'Chưa áp dụng') + '</span></div>' +
      '<div class="summary-line"><span>Phí dịch vụ (' + b.n + ' × ' + money(SERVICE_FEE) + ')</span><span>' + money(b.fee) + '</span></div>' +
      '<div class="summary-total"><span>Tổng thanh toán</span><strong>' + money(b.total) + '</strong></div>';
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
        '<h4 class="panel-h">MÃ ƯU ĐÃI</h4>' +
        '<div class="promo-row"><input type="text" data-tk="promo" placeholder="Nhập mã (VD: VIVUGO10, GIAM50K)" autocomplete="off" />' +
          '<button type="button" class="btn-outline btn-sm" data-tk-apply>Áp dụng</button></div>' +
        '<p class="section-sub" data-tk="promomsg"></p>' +
        '<div class="filter-group"><h4>Phương thức thanh toán</h4>' +
          '<label class="filter-option"><input type="radio" name="tk-pay" value="Chuyển khoản / QR" checked /> Chuyển khoản / QR</label>' +
          '<label class="filter-option"><input type="radio" name="tk-pay" value="Thẻ Visa / Mastercard" /> Thẻ Visa / Mastercard</label>' +
          '<label class="filter-option"><input type="radio" name="tk-pay" value="Ví điện tử" /> Ví điện tử</label></div>' +
        '<div class="booking-summary" data-tk="bill"></div>' +
        '<p class="form-error" data-tk="msg" role="alert"></p>' +
        '<button type="button" class="btn-confirm" data-tk-submit>Hoàn tất đặt vé</button>' +
      '</div>';
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

    if (t.closest('[data-tk-apply]')) {
      var code = tq('promo').value.trim().toUpperCase();
      var pm = tq('promomsg');
      if (!code) { T.promo = ''; pm.textContent = ''; }
      else if (PROMOS[code]) { T.promo = code; pm.textContent = '✓ ' + PROMOS[code].text; }
      else { T.promo = ''; pm.textContent = 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.'; }
      trRenderBill();
      return;
    }

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
    function row(k, v, amount) { return '<div class="info-row"><span>' + k + '</span><strong' + (amount ? ' class="amount"' : '') + '>' + v + '</strong></div>'; }
    tdlg.innerHTML =
      '<div class="success-body"><div class="success-check">✓</div><h3>Đặt vé thành công</h3>' +
      '<p class="success-sub">Vé điện tử sẽ được gửi qua email (và Zalo theo số điện thoại đã đăng ký) sau khi VivuGo xác nhận thanh toán.</p>' +
      '<div class="order-code">' + code + '</div>' +
      '<div class="success-info">' +
        row('Chuyến tàu', esc(T.t.trainCode) + ' · ' + esc(T.t.fromCity) + ' → ' + esc(T.t.toCity)) +
        row('Khởi hành', esc(T.t.departureTime) + (T.date ? ' · ' + esc(showDate(T.date)) : '')) +
        row('Hạng chỗ', esc(coachNow().label)) +
        row('Chỗ ngồi', T.seats.join(', ')) +
        row('Thanh toán', esc(pay ? pay.value : '')) +
        row('Tổng tiền', money(b.total), true) +
      '</div>' +
      '<div class="bk-policy"><b>Chính sách hủy / đổi vé (demo)</b><ul>' +
        '<li>Hủy / đổi trước giờ tàu chạy từ 24 giờ: phí 10% giá vé.</li>' +
        '<li>Từ 4 đến dưới 24 giờ: phí 20% giá vé.</li>' +
        '<li>Dưới 4 giờ: không hoàn, không đổi.</li>' +
        '<li>Mang theo CCCD / hộ chiếu trùng với thông tin đã đặt khi lên tàu.</li></ul></div>' +
      '<button type="button" class="btn-confirm btn-block" data-tk-close>Đóng</button></div>';
  }

  /* =====================================================================
   * XE KHÁCH: bộ lọc (loại xe, nhà xe) + tìm chuyến (điểm đi, điểm đến, ngày đi)
   * ===================================================================== */

  var allBuses = [];
  var busCities = [];
  var busQuery = null; // null = chưa tìm (hiện tất cả chuyến xe)
  var busState = { type: 'all', operator: 'all' };

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
      .filter(function (b) {
        return (!from || b.fromCity === from) && (!to || b.toCity === to) &&
          (busState.type === 'all' || b.vehicleType === busState.type) &&
          (busState.operator === 'all' || b.operator === busState.operator);
      })
      .sort(function (a, b) { return a.priceFrom - b.priceFrom; });
  }

  function busFiltered() {
    return !!busQuery || busState.type !== 'all' || busState.operator !== 'all';
  }

  function renderBuses() {
    var list = document.querySelector('[data-list="bus"]');
    if (!list) return;
    var from = busQuery ? busQuery.from : '';
    var to = busQuery ? busQuery.to : '';
    var buses = searchBuses(from, to);
    var title = busQuery
      ? 'Chuyến xe · ' + (from || 'Tất cả') + ' → ' + (to || 'Tất cả') + (busQuery.date ? ' · ' + showDate(busQuery.date) : '')
      : 'Tất cả chuyến xe';
    var clear = busFiltered() ? ' <button type="button" class="btn-ghost btn-sm vf-clear" data-reset-bus>✕ Bỏ lọc</button>' : '';
    var body = buses.length
      ? '<div class="route-list">' + buses.map(function (b) { return cardHtml(fromBus(b)); }).join('') + '</div>'
      : '<div class="car-empty"><p>Không có chuyến xe phù hợp với bộ lọc hiện tại trong bộ dữ liệu demo.</p>' +
        '<button type="button" class="btn-outline btn-sm" data-reset-bus>Bỏ lọc, xem tất cả chuyến xe</button></div>';
    list.innerHTML = '<div class="vf-result"><h3 class="vf-result-title">' + esc(title) +
      ' <span class="vf-result-count">— ' + buses.length + ' chuyến xe</span>' + clear + '</h3>' + body + '</div>';
  }

  function setupBusFilter(data) {
    var form = document.querySelector('[data-bus-filter]');
    if (!form) return;
    allBuses = data.buses || [];

    function uniq(arr) {
      return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
    }
    busCities = uniq(allBuses.map(function (b) { return b.fromCity; }).concat(allBuses.map(function (b) { return b.toCity; })));

    var dl = document.getElementById('bus-cities');
    if (dl) dl.innerHTML = busCities.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('');

    var typeSel = form.querySelector('[data-b="type"]');
    var opSel = form.querySelector('[data-b="operator"]');
    addOptions(typeSel, uniq(allBuses.map(function (b) { return b.vehicleType; })).map(function (v) { return { value: v, label: v }; }));
    addOptions(opSel, uniq(allBuses.map(function (b) { return b.operator; })).map(function (v) { return { value: v, label: v }; }));
    typeSel.addEventListener('change', function () { busState.type = typeSel.value; renderBuses(); });
    opSel.addEventListener('change', function () { busState.operator = opSel.value; renderBuses(); });

    var fromInp = form.querySelector('[data-b="from"]');
    var toInp = form.querySelector('[data-b="to"]');
    var dateInp = form.querySelector('[data-b="date"]');
    var msgEl = form.querySelector('[data-bus-msg]');
    var today = todayStr();
    dateInp.min = today;
    dateInp.value = today;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = findCity(fromInp.value);
      var t = findCity(toInp.value);
      var err = '';
      if (f === null) err = 'Không tìm thấy điểm đi "' + fromInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (t === null) err = 'Không tìm thấy điểm đến "' + toInp.value + '". Hãy chọn từ danh sách gợi ý.';
      else if (f && t && f === t) err = 'Điểm đi và điểm đến phải khác nhau.';
      else if (!dateInp.value) err = 'Vui lòng chọn ngày đi.';
      else if (dateInp.value < todayStr()) err = 'Ngày đi không được ở trong quá khứ.';
      if (msgEl) msgEl.textContent = err;
      if (err) return;
      busQuery = { from: f, to: t, date: dateInp.value };
      renderBuses();
    });

    var list = document.querySelector('[data-list="bus"]');
    if (list) {
      list.addEventListener('click', function (e) {
        if (!e.target.closest('[data-reset-bus]')) return;
        fromInp.value = '';
        toInp.value = '';
        typeSel.value = 'all';
        opSel.value = 'all';
        busState.type = 'all';
        busState.operator = 'all';
        dateInp.value = today;
        if (msgEl) msgEl.textContent = '';
        busQuery = null;
        renderBuses();
      });
    }
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

  function init() {
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