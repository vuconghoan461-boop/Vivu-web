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
            < style="display: flex; gap: 6px;">
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