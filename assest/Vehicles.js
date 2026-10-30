/**
 * Vehicles.js
 * Đọc dữ liệu phương tiện (máy bay, tàu hỏa, xe khách, đưa đón sân bay)
 * từ file JSON, render các thẻ .route-card vào các danh sách [data-list]
 * và xử lý form tìm chuyến bay (một chiều/khứ hồi, nơi đi, nơi đến, ngày bay, hãng, hạng ghế).
 *
 * Cách dùng trong HTML:
 *   <section data-tab-group data-vehicles-src="../../data/Vehicles.json"> ... </section>
 *   <div class="route-list" data-list="all|flight|train|bus|transfer"></div>
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

  function fromTransfer(t) {
    return {
      type: 'transfer',
      id: t.id,
      mode: 'Đưa đón sân bay',
      from: t.fromName,
      to: t.toName,
      meta: t.features,
      price: t.priceFrom,
      unit: t.priceUnit || 'lượt',
      cta: 'Đặt xe',
      categories: t.categories
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

  /* ---------- Tìm chuyến bay ---------- */

  var DEFAULT_FROM = 'HAN';
  var DEFAULT_TO = 'SGN';
  var airportMap = {}; // mã sân bay -> { city, name }
  var query = null;    // điều kiện tìm kiếm đã áp dụng (sau khi bấm "Tìm chuyến bay")

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
        return f.fromCode === from && f.toCode === to &&
               (flightState.airline === 'all' || f.airline === flightState.airline);
      })
      .map(function (f) { return fromFlight(f, flightState.cls, true); })
      .sort(byPrice);
  }

  function resultHtml(label, from, to, date, cards) {
    var title = esc(label) + ' · ' + esc(cityOf(from)) + ' (' + esc(from) + ') → ' +
                esc(cityOf(to)) + ' (' + esc(to) + ')' +
                (date ? ' · ' + esc(showDate(date)) : '') +
                ' <span class="vf-result-count">— ' + cards.length + ' chuyến bay</span>';
    var body = cards.length
      ? '<div class="route-list">' + cards.map(cardHtml).join('') + '</div>'
      : '<div class="vf-empty">' +
          '<p>Không có chuyến bay thẳng phù hợp cho chặng này trong bộ dữ liệu demo.</p>' +
          '<button type="button" class="vf-reset" data-reset-flight>Xem chặng ' +
            esc(cityOf(DEFAULT_FROM)) + ' → ' + esc(cityOf(DEFAULT_TO)) + '</button>' +
        '</div>';
    return '<div class="vf-result"><h3 class="vf-result-title">' + title + '</h3>' + body + '</div>';
  }

  function renderFlights() {
    var list = document.querySelector('[data-list="flight"]');
    if (!list || !query) return;

    var round = query.trip === 'round-trip';
    var html = resultHtml(round ? 'Chiều đi' : 'Chuyến bay', query.from, query.to, query.date,
                          searchFlights(query.from, query.to));
    if (round) {
      html += resultHtml('Chiều về', query.to, query.from, query.returnDate,
                         searchFlights(query.to, query.from));
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
    if (q.from === q.to) return 'Điểm khởi hành và điểm đến phải khác nhau.';
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
    addOptions(fromSel, airportOpts);
    addOptions(toSel, airportOpts);
    fromSel.value = airportMap[DEFAULT_FROM] ? DEFAULT_FROM : (airports[0] ? airports[0].code : '');
    toSel.value = airportMap[DEFAULT_TO] ? DEFAULT_TO : (airports[1] ? airports[1].code : '');

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
    segBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        flightState.cls = btn.getAttribute('data-class');
        segBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderFlights();
      });
    });

    // Nút quay lại chặng mặc định khi không có kết quả
    var list = document.querySelector('[data-list="flight"]');
    if (list) {
      list.addEventListener('click', function (e) {
        if (!e.target.closest('[data-reset-flight]')) return;
        if (airportMap[DEFAULT_FROM]) fromSel.value = DEFAULT_FROM;
        if (airportMap[DEFAULT_TO]) toSel.value = DEFAULT_TO;
        if (msgEl) msgEl.textContent = '';
        query = readForm();
        renderFlights();
      });
    }

    syncTrip();
    query = readForm(); // tìm sẵn chặng mặc định khi mở trang
  }

  /* ---------- Render toàn trang ---------- */

  function render(data) {
    allFlights = data.flights || [];

    var groups = {
      bus: (data.buses || []).map(fromBus).sort(byPrice),
      train: (data.trains || []).map(fromTrain).sort(byPrice),
      transfer: (data.transfers || []).map(fromTransfer).sort(byPrice),
      flightAll: allFlights.map(function (f) { return fromFlight(f, 'economy', false); }).sort(byPrice)
    };

    // Tab "Tất cả": vài tuyến giá tốt nhất của mỗi loại
    var all = [].concat(
      groups.bus.slice(0, ALL_PER_MODE),
      groups.flightAll.slice(0, ALL_PER_MODE),
      groups.train.slice(0, ALL_PER_MODE),
      groups.transfer.slice(0, ALL_PER_MODE)
    );

    document.querySelectorAll('[data-list]').forEach(function (el) {
      var key = el.getAttribute('data-list');
      if (key === 'all') fill(el, all);
      else if (key === 'train') fill(el, groups.train);
      else if (key === 'bus') fill(el, groups.bus);
      else if (key === 'transfer') fill(el, groups.transfer);
      // key === 'flight' do renderFlights() xử lý
    });

    setupFlightFilter(data);
    renderFlights();
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