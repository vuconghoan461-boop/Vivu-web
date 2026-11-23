(function () {
  // ---------- [KEY: UTILS] HÀM TIỆN ÍCH DÙNG CHUNG ----------
  const $ = id => document.getElementById(id);
  const money = n => (n ? n.toLocaleString('vi-VN') + 'đ' : '0đ');
  const dateVN = s => (s ? s.split('-').reverse().join('/') : '');
  const norm = s => (s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase() : '');
  const kfmt = n => (n >= 1000 ? (n / 1000).toLocaleString('vi-VN') + 'K+' : n);
  const openModal = id => $(id) &&$(id).classList.add('is-open');
  const closeModal = id => $(id) && $(id).classList.remove('is-remove',$(id).classList.remove('is-open'));

  const fixImgPath = path => (path ? path.replace('/images/tours/', '/tours/') : '');

  let DATA = { tours: [], promoCodes: [], policy: '' };
  let state = { cat: 'all' };
  let current = null;

  // ---------- [KEY: FETCH_DATA] KHỞI TẠO VÀ NẠP DỮ LIỆU TOUR.JSON ----------
  document.addEventListener('DOMContentLoaded', () => {
    if (!$('tourGrid')) return;
    
    fetch('../../data/tour.json')
      .then(r => r.json())
      .then(d => {
        DATA = {
          tours: d.tours || d.Tours || [],
          policy: d.policy || ''
        };
        init();
      })
      .catch((err) => {
        console.error('Lỗi nạp dữ liệu tour.json:', err);
        $('tourGrid').innerHTML = '<div class="car-empty">Không tải được tour.json. Vui lòng mở bằng Live Server/Localhost.</div>';
      });
  });

  function init() {
    const T = DATA.tours, uniq = a => [...new Set(a)];

    if ($('fType')) {$('fType').innerHTML = '<option value="">Tất cả các loại tour</option>' + 
        uniq(T.flatMap(t => t.types || [])).map(v => `<option>${v}</option>`).join('');
    }

    if ($('categoryTabs')) {$('categoryTabs').innerHTML = '<button class="cat-tab is-active" data-cat="all">Tất cả loại hình</button>' +
        uniq(T.map(t => t.category)).map(c => `<button class="cat-tab" data-cat="${c}">${c}</button>`).join('');
      
      $('categoryTabs').addEventListener('click', e => {
        const b = e.target.closest('.cat-tab'); if (!b) return;
        state.cat = b.dataset.cat; toggleActive('#categoryTabs .cat-tab', b); render();
      });
    }

    ['fType', 'fFrom', 'fTo', 'fSort'].forEach(i => $(i) &&$(i).addEventListener('change', render));
    if ($('keyword'))$('keyword').addEventListener('input', render);
    if ($('searchBtn'))$('searchBtn').onclick = render;
    if ($('resetBtn')) {$('resetBtn').onclick = () => {
        ['keyword', 'fType', 'fFrom', 'fTo'].forEach(i => $(i) && ($(i).value = ''));
        if ($('fSort'))$('fSort').value = 'popular';
        state = { cat: 'all' };
        toggleActive('#categoryTabs .cat-tab', document.querySelector('#categoryTabs .cat-tab'));
        render();
      };
    }

    // ---------- [KEY: EVENT_CARD] BẮT SỰ KIỆN CLICK TRÊN THẺ TOUR ----------
    $('tourGrid').addEventListener('click', e => {
      const card = e.target.closest('.car-card');
      const btnDetail = e.target.closest('.btn-detail');
      const btnBook = e.target.closest('.btn-quickbook');

      if (btnBook) {
        e.stopPropagation();
        current = DATA.tours.find(x => x.id === +btnBook.dataset.id);
        if (current) openBooking();
      } else if (btnDetail) {
        e.stopPropagation();
        openDetail(+btnDetail.dataset.id);
      } else if (card) {
        openDetail(+card.dataset.id);
      }
    });

    if ($('closeBookingModal'))$('closeBookingModal').onclick = () => closeModal('bookingModalOverlay');
    if ($('closeSuccessModal'))$('closeSuccessModal').onclick = () => closeModal('successModalOverlay');
    
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { 
      if (e.target === o) o.classList.remove('is-open'); 
    }));
    
    if ($('ticketQty'))$('ticketQty').addEventListener('input', calc);
    if ($('bookingForm'))$('bookingForm').addEventListener('submit', submitBooking);
    if ($('goToMyTrips'))$('goToMyTrips').onclick = () => { window.location.href = '../../index.html'; };
    
    render();
  }

  function toggleActive(sel, btn) { 
    if (!btn) return;
    document.querySelectorAll(sel).forEach(x => x.classList.toggle('is-active', x === btn)); 
  }

  // ---------- [KEY: FILTER_LOGIC] THUẬT TOÁN LỌC VÀ SẮP XẾP ----------
  function filtered() {
    const type = $('fType') ?$('fType').value : '';
    const from = $('fFrom') ?$('fFrom').value : '';
    const to = $('fTo') ?$('fTo').value : '';
    const kw = $('keyword') ? norm($('keyword').value.trim()) : '';

    const list = DATA.tours.filter(t =>
      (state.cat === 'all' || t.category === state.cat) &&
      (!type || (t.types && t.types.includes(type))) &&
      (!t.departures || t.departures.some(d => (!from || d.date >= from) && (!to || d.date <= to))) &&
      (!kw || norm(t.name + ' ' + t.from + ' ' + t.to).includes(kw))
    );

    const by = {
      popular: (a, b) => b.booked - a.booked,
      az: (a, b) => a.name.localeCompare(b.name, 'vi'),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      soon: (a, b) => {
        const dA = a.departures && a.departures[0] ? a.departures[0].date : '';
        const dB = b.departures && b.departures[0] ? b.departures[0].date : '';
        return dA.localeCompare(dB);
      }
    };
    
    const sortVal = $('fSort') ?$('fSort').value : 'popular';
    return list.sort(by[sortVal] || by.popular);
  }

  const badges = t =>
    (t.booked >= 40000 ? '<span class="car-badge hot">Hot</span>' : '') +
    (t.discount ? `<span class="car-badge sale">Giảm ${t.discount}%</span>` : '');
    
  const media = (t, i, label) => `<div class="media-placeholder" data-label="${label}">${t.images && t.images[i] ? `<img src="${fixImgPath(t.images[i])}" alt="${t.name}">` : ''}</div>`;

  // ---------- [KEY: RENDER_GRID] VẼ DANH SÁCH TOUR (ĐÃ XÓA SỐ CHỖ CÒN LẠI) ----------
  function render() {
    const list = filtered();
    if ($('resultCount'))$('resultCount').textContent = `Tìm thấy ${list.length} tour phù hợp`;
    
    $('tourGrid').innerHTML = list.length ? list.map(t => {
      const d = (t.departures && t.departures[0]) || { date: '' };
      return `<article class="car-card" data-id="${t.id}">
        <div class="car-media"><div class="badge-row">${badges(t)}</div>${media(t, 0, 'Ảnh tour')}</div>
        <div class="car-body">
          <div class="car-rating-row"><span class="rating">★ ${t.rating}</span><span class="dot">·</span>
            <span class="provider">${t.reviews.toLocaleString('vi-VN')} đánh giá</span><span class="dot">·</span><span>${kfmt(t.booked)} đã đặt</span></div>
          <h3 class="car-name">${t.name}</h3>
          <div class="tour-route"> ${t.from} → ${t.to}</div>
          <div class="car-specs">
            <div><span class="spec-label">Thời lượng</span><span class="spec-value">${t.duration ? t.duration.split(' (')[0] : ''}</span></div>
            <div><span class="spec-label">Khởi hành</span><span class="spec-value">${dateVN(d.date).slice(0, 5)}</span></div>
          </div>
          <div class="car-foot">
            <div class="car-price">${t.discount ? `<span class="old-price">${money(t.priceOriginal)}</span>` : '<span class="label">Giá từ</span>'}
              <span class="value">${money(t.price)}<span>/khách</span></span></div>
            <div class="card-btn-group">
              <button type="button" class="btn-detail" data-id="${t.id}">Xem chi tiết</button>
              <button type="button" class="btn-quickbook" data-id="${t.id}">Đặt ngay</button>
            </div>
          </div>
        </div></article>`;
    }).join('') : '<div class="car-empty">Không tìm thấy tour phù hợp. Hãy thử thay đổi bộ lọc.</div>';
  }

  // ---------- [KEY: POPUP_DETAIL] POPUP CHI TIẾT TOUR (ĐÃ XÓA TAG CHIP & SỐ CHỖ) ----------
  function openDetail(id) {
    const t = current = DATA.tours.find(x => x.id === id);
    if (!t) return;
    
    const li = a => (a || []).map(x => `<li>${x}</li>`).join('');
    const tl = (t.itinerary || []).map(s => `<li><span class="t-time">${s.time}</span><div>${s.title}${s.desc ? `<span class="t-desc">${s.desc}</span>` : ''}</div></li>`).join('');
    const rows = [1, 2, 4, 6].map(n => `<tr><td>${n} khách</td><td>${money(t.price)}</td><td><strong>${money(t.price * n)}</strong></td></tr>`).join('');
    const m = $('detailModal');
    
    m.innerHTML = `
      <button type="button" class="modal-close" data-x>×</button>
      <div class="gallery">${[0, 1, 2, 3, 4].map(i => media(t, i, i ? 'Ảnh ' + (i + 1) : 'Ảnh chính')).join('')}</div>
      <div class="detail-top">
        <div><h2>${t.name}</h2><div class="badge-row" style="position:static;margin-top:8px">${badges(t)}</div>
          <div class="detail-price">${money(t.price)} <small>/khách · đã gồm thuế</small></div>
          ${t.discount ? `<span class="old-price">${money(t.priceOriginal)}</span>` : ''}</div>
        <button type="button" class="btn-cta" data-book>Đặt tour ngay</button>
      </div>
      <div class="quick-info">
        <div><span>Đánh giá</span>★ ${t.rating} (${t.reviews.toLocaleString('vi-VN')})</div>
        <div><span>Thời lượng</span>${t.duration}</div>
        <div><span>Khởi hành từ</span>${t.from}</div>
      </div>
      <div class="detail-body">
        <div class="tab-bar">${['Lịch trình', 'Bao gồm', 'Bảng giá', 'Chính sách'].map((n, i) => `<button type="button" class="tab-btn${i ? '' : ' is-active'}" data-tab="${i}">${n}</button>`).join('')}</div>
        <div class="tab-panel is-active">
          <h4 class="panel-h">Điểm nổi bật</h4><ul class="hl-list">${li(t.highlights)}</ul>
          <h4 class="panel-h">Lịch trình chi tiết</h4>
          <button type="button" class="acc-head" data-acc>Ngày 1 · ${t.to}<span>▾</span></button>
          <ul class="timeline" id="accBody">${tl}</ul>
          <p class="section-sub">${t.itineraryNote || ''}</p></div>
        <div class="tab-panel">
          <h4 class="panel-h">Bao gồm</h4><ul class="inc-list">${li(t.includes)}</ul>
          <h4 class="panel-h">Không bao gồm</h4><ul class="exc-list">${li(t.excludes)}</ul>
          <h4 class="panel-h">Phương tiện</h4><ul class="note-list">${li(t.vehicle)}</ul>
          <h4 class="panel-h">Tập trung / đón khách</h4><p style="font-size:13.5px">${t.pickup || ''}</p></div>
        <div class="tab-panel"><table class="price-table"><tr><th>Số lượng</th><th>Đơn giá</th><th>Tổng</th></tr>${rows}</table>
          <p class="section-sub">Giá quy đổi ước tính, đã bao gồm thuế.</p></div>
        <div class="tab-panel"><h4 class="panel-h">Điều kiện &amp; chính sách hủy</h4><p style="font-size:13.5px">${DATA.policy}</p>
          <h4 class="panel-h">Lưu ý trước khi đặt</h4><ul class="note-list">${li(t.notes)}</ul></div>
      </div>
      <div class="detail-cta"><span class="section-sub" style="margin:0">Giá từ <strong>${money(t.price)}</strong>/khách</span>
        <button type="button" class="btn-cta" data-book>Đặt tour ngay</button></div>`;
        
    m.querySelector('[data-x]').onclick = () => closeModal('detailModalOverlay');
    m.querySelectorAll('[data-book]').forEach(b => b.onclick = openBooking);
    m.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
      m.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('is-active', x === b));
      m.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('is-active', i === +b.dataset.tab));
    });
    
    const accBtn = m.querySelector('[data-acc]');
    if (accBtn) {
      accBtn.onclick = () => { const b = $('accBody'); if (b) b.hidden = !b.hidden; };
    }
    
    m.scrollTop = 0; openModal('detailModalOverlay');
  }

  // ---------- [KEY: BOOKING_LOGIC] XỬ LÝ ĐẶT TOUR ----------
  function openBooking() {
    const t = current;
    if (!t) return;

    $('bookingTourName').textContent = t.name;
    $('bookingRoute').textContent = `${t.from} → ${t.to}`;
    $('bookingMeta').textContent = `Thời lượng: ${t.duration}`;
    $('bookingPrice').innerHTML = `${money(t.price)}<small>/khách</small>`;
    
    $('departureDate').innerHTML = (t.departures || []).map((d, i) => 
      `<option value="${i}">${dateVN(d.date)} · ${d.time}</option>`
    ).join('');
    
    $('bookingForm').reset(); 
    calc(); 
    openModal('bookingModalOverlay');
  }

  function calc() {
    if (!current) return 0;
    const q = Math.max(1, +$('ticketQty').value || 1);
    const sub = current.price * q;
    $('sumBase').textContent = money(sub);$('totalLabel').textContent = `Tổng tiền (${q} vé)`;
    $('totalAmount').textContent = money(sub);
    return sub;
  }

  function submitBooking(e) {
    e.preventDefault();
    const q = +$('ticketQty').value;
    const d = current.departures[+$('departureDate').value];
    if (q < 1) { alert(`Số lượng vé tối thiểu là 1.`); return; }

    $('orderCode').textContent = 'TOUR-' + Math.floor(100000 + Math.random() * 900000);
    $('infoName').textContent =$('renterName').value;
    $('infoEmail').textContent =$('renterEmail').value;
    $('infoService').textContent = current.name;
    $('infoDate').textContent = `${dateVN(d.date)} · ${d.time}`;
    $('infoTotal').textContent = money(calc());
    $('infoPay').textContent =$('payMethod').value;
    
    closeModal('bookingModalOverlay'); 
    closeModal('detailModalOverlay'); 
    openModal('successModalOverlay');
    render();
  }
})();