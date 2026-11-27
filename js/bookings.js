/* ===== VivuGo – Kho lưu đặt chỗ (dùng chung cho mọi trang dịch vụ + "Lịch của tôi") =====
 *
 * Chạy được ở 2 nơi:
 *   - Trình duyệt:  window.VGBookings   (các trang dịch vụ, mycalendar.js)
 *   - Node.js:      require('./js/bookings.js')  ->  { sanitize, VERSION, ... }   (server.js)
 *
 * Mỗi lần khách đặt dịch vụ thành công, các trang gọi:  VGBookings.save({...})
 * Dữ liệu lưu trong localStorage (khóa "vg_bookings"). Nếu chạy bằng "node server.js" thì đặt chỗ
 * còn được đồng bộ ra file data/bookings.json qua /api/bookings; không có server (VD Netlify) thì
 * tự dùng localStorage, trang vẫn chạy bình thường.
 *
 * Một đặt chỗ (sau khi chuẩn hóa):
 * {
 *   id, type: 'tour'|'hotel'|'car'|'flight'|'train'|'bus',
 *   title, subtitle, place, from, to, startDate, endDate (YYYY-MM-DD), startTime, endTime,
 *   refId, quantity, image,
 *   contact:    { name, phone, email },
 *   details:    [{ label, value }],
 *   passengers: [{ name, phone, email, idMasked, seat }],     // CCCD/hộ chiếu chỉ giữ 3 ký tự cuối
 *   payment:    { method, total, currency, lines: [{ label, amount }] },
 *   note, status: 'confirmed'|'cancelled', deleted,
 *   createdAt, updatedAt (ISO), userEmail (khóa tài khoản: email, nếu không có thì SĐT)
 * }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.VGBookings = factory(root);
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var VERSION = 2;
  var KEY = 'vg_bookings';      // danh sách đặt chỗ
  var USER_KEY = 'vg_user';     // tài khoản đang đăng nhập (do userlogic.js lưu)
  var TYPES = ['tour', 'hotel', 'car', 'flight', 'train', 'bus'];
  var MASK = '•';          // •
  var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

  /* ---------------------------------------------------------------
   * Tiện ích thuần (dùng được cả trong Node)
   * ------------------------------------------------------------- */
  function str(v, max, multiline) {
    var s = v == null ? '' : String(v);
    s = s.replace(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ');
    return s.trim().slice(0, max);
  }
  function int(v, min, max, fallback) {
    var n = Math.round(Number(v));
    return isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }
  function isISODate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  function isStamp(s) { return typeof s === 'string' && s.length <= 40 && !isNaN(Date.parse(s)); }
  function toISODate(v) {                       // "2026-12-01" hoặc "01/12/2026" -> "2026-12-01"
    var s = str(v, 20);
    if (isISODate(s)) return s;
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    var iso = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    return isISODate(iso) ? iso : '';
  }
  // "1.500.000đ" -> 1500000
  function toNumber(v) {
    if (typeof v === 'number') return v;
    return parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10) || 0;
  }
  function todayISO() {
    var now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function addDaysISO(date, days) {
    var parts = String(date || todayISO()).split('-').map(Number);
    var value = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    value.setUTCDate(value.getUTCDate() + Number(days || 0));
    return value.toISOString().slice(0, 10);
  }
  function newCode(prefix) {
    return String(prefix || 'VG').toUpperCase() + '-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  }
  function isPhone(value) { return /^0\d{9}$/.test(String(value || '').replace(/\D/g, '')); }
  function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
  function tourDayCount(tour) {
    var match = String((tour && tour.duration) || '').match(/(\d+)\s*ngày/i);
    return match ? Math.max(1, Number(match[1])) : 1;
  }

  // Che số CCCD / hộ chiếu: chỉ giữ 3 ký tự cuối. "012345678901" -> "•••••••••901". Gọi lại nhiều lần vẫn cho cùng kết quả.
  function maskId(id) {
    var s = String(id == null ? '' : id).replace(/\s+/g, '');
    if (!s) return '';
    if (s.length > 20) s = s.slice(-20);
    var keep = s.length > 4 ? 3 : 0;
    return new Array(s.length - keep + 1).join(MASK) + s.slice(s.length - keep);
  }

  function cleanImage(v) {
    var s = str(v, 300);
    return /^\s*(javascript|data|vbscript):/i.test(s) ? '' : s;
  }
  function userKey(acc) { return str(acc && (acc.email || acc.phone), 120).toLowerCase(); }

  /* Chuyển dữ liệu kiểu cũ { customer, service, payment } (explore.js, đơn lưu từ bản trước) sang kiểu hiện tại */
  function normalize(b, fallbackDate) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return {};
    var out;
    if (b.title != null || !(b.service || b.customer)) {
      out = Object.assign({}, b);
    } else {
      var svc = b.service || {}, cus = b.customer || b.contact || {};
      out = {
        id: b.id, type: b.type, userEmail: b.userEmail, status: b.status, deleted: b.deleted,
        createdAt: b.createdAt, updatedAt: b.updatedAt,
        title: svc.name, subtitle: svc.subtitle, place: svc.place, from: svc.from, to: svc.to,
        startDate: toISODate(svc.startDate || svc.departureDate) || fallbackDate || '',
        endDate: toISODate(svc.endDate),
        startTime: svc.startTime || svc.departureTime || '', endTime: svc.endTime || '',
        refId: svc.refId != null ? svc.refId : svc.tourId,
        quantity: svc.quantity != null ? svc.quantity : svc.tickets,
        image: svc.image, details: svc.details,
        contact: { name: cus.name, phone: cus.phone, email: cus.email },
        note: cus.note, payment: b.payment, passengers: b.passengers
      };
    }
    if (out.type === 'limousine') out.type = 'bus';
    return out;
  }

  /* Kiểm tra + làm sạch một đặt chỗ. Dùng ở cả trình duyệt lẫn server.js trước khi ghi.
   * Trả về { ok:true, value } hoặc { ok:false, error }. */
  function sanitize(b) {
    function fail(error) { return { ok: false, error: error }; }
    if (!b || typeof b !== 'object' || Array.isArray(b)) return fail('Đặt chỗ không hợp lệ');

    var id = str(b.id, 40);
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return fail('Mã đặt chỗ không hợp lệ');
    var type = str(b.type, 20);
    if (TYPES.indexOf(type) < 0) return fail('Loại dịch vụ không hợp lệ');
    var title = str(b.title, 200);
    if (!title) return fail('Thiếu tên dịch vụ');
    var userEmail = str(b.userEmail, 120).toLowerCase();
    if (!userEmail) return fail('Thiếu tài khoản đặt chỗ');

    var startDate = str(b.startDate, 10);
    if (!isISODate(startDate)) return fail('Ngày bắt đầu không hợp lệ');
    var endDate = str(b.endDate, 10);
    if (!isISODate(endDate) || endDate < startDate) endDate = startDate;

    var createdAt = isStamp(b.createdAt) ? new Date(b.createdAt).toISOString() : new Date().toISOString();
    var updatedAt = isStamp(b.updatedAt) ? new Date(b.updatedAt).toISOString() : createdAt;

    var c = b.contact || b.customer || {}, pay = b.payment || {};
    var details = (Array.isArray(b.details) ? b.details : []).slice(0, 30).map(function (d) {
      return { label: str(d && d.label, 80), value: str(d && d.value, 300) };
    }).filter(function (d) { return d.label; });
    var passengers = (Array.isArray(b.passengers) ? b.passengers : []).slice(0, 20).map(function (p) {
      p = p || {};
      var rawId = str(p.idMasked != null ? p.idMasked : p.id, 40).replace(new RegExp('[^A-Za-z0-9' + MASK + '*]', 'g'), '');
      return { name: str(p.name, 100), phone: str(p.phone, 20), email: str(p.email, 120), idMasked: maskId(rawId), seat: str(p.seat, 20) };
    });
    var lines = (Array.isArray(pay.lines) ? pay.lines : []).slice(0, 30).map(function (l) {
      return { label: str(l && l.label, 200), amount: int(l && l.amount, -1e10, 1e10, 0) };
    });

    return {
      ok: true,
      value: {
        id: id, type: type, title: title,
        subtitle: str(b.subtitle, 300), place: str(b.place, 120), from: str(b.from, 120), to: str(b.to, 120),
        startDate: startDate, endDate: endDate, startTime: str(b.startTime, 20), endTime: str(b.endTime, 20),
        refId: str(b.refId, 60), quantity: int(b.quantity, 1, 999, 1), image: cleanImage(b.image),
        contact: { name: str(c.name, 100), phone: str(c.phone, 20), email: str(c.email, 120) },
        details: details, passengers: passengers,
        payment: { method: str(pay.method, 80), total: int(toNumber(pay.total), 0, 1e10, 0), currency: 'VND', lines: lines },
        note: str(b.note, 1000, true),
        status: b.status === 'cancelled' ? 'cancelled' : 'confirmed',
        deleted: b.deleted === true,
        createdAt: createdAt, updatedAt: updatedAt, userEmail: userEmail
      }
    };
  }

  /* Trạng thái hiển thị: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' */
  function statusOf(rec, today) {
    if (!rec) return 'upcoming';
    if (rec.status === 'cancelled') return 'cancelled';
    var t = today || todayISO();
    if (rec.endDate < t) return 'completed';
    if (rec.startDate <= t) return 'ongoing';
    return 'upcoming';
  }
  function canCancel(rec, today) { return statusOf(rec, today) === 'upcoming'; }          // chỉ hủy được khi chưa khởi hành
  function canRemove(rec, today) { var s = statusOf(rec, today); return s === 'completed' || s === 'cancelled'; }

  /* ---------------------------------------------------------------
   * Kho trong trình duyệt (localStorage)
   * ------------------------------------------------------------- */
  function readAll() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  // Một mục đã lưu -> bản ghi hợp lệ (đọc được cả đơn lưu theo kiểu cũ). Mục hỏng trả về null, KHÔNG bị xóa khỏi kho.
  function toRecord(raw) {
    var n = normalize(raw, str(raw && raw.createdAt, 10));
    if (!n.userEmail && raw && raw.account) n.userEmail = userKey(raw.account);
    var r = sanitize(n);
    return r.ok ? r.value : null;
  }
  function mineLocal(key) {
    return readAll().map(toRecord).filter(function (r) { return r && r.userEmail === key; });
  }

  // Tài khoản đang đăng nhập. KHÔNG lấy mật khẩu.
  function currentAccount() {
    try {
      var u = JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'null');
      if (!u || !(u.email || u.phone)) return null;
      return { name: u.name || '', email: u.email || '', phone: u.phone || '' };
    } catch (e) { return null; }
  }

  /* ---------------------------------------------------------------
   * Đồng bộ với server.js (tuỳ chọn). Không có server -> chỉ dùng localStorage.
   * ------------------------------------------------------------- */
  var ROOT = '/';
  if (IS_BROWSER) {
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var m = (scripts[i].src || '').match(/^(.*\/)js\/bookings\.js(?:[?#].*)?$/);
        if (m) { ROOT = m[1]; break; }
      }
    } catch (e) { /* giữ mặc định */ }
  }
  var API = function () { return ROOT + 'api/bookings'; };
  var serverState = null;       // null: chưa biết, true: có server, false: không có
  var lastProbe = 0;

  function canFetch() { return IS_BROWSER && /^https?:$/.test(location.protocol) && typeof fetch === 'function'; }
  function apiFetch(url, opts) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
    opts = opts || {};
    opts.cache = 'no-store';
    if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok || (res.headers.get('content-type') || '').indexOf('json') < 0) throw new Error('HTTP ' + res.status);
      return res.json();
    }, function (err) { if (timer) clearTimeout(timer); throw err; });
  }
  // Lấy đặt chỗ của tài khoản từ server. Trả về mảng, hoặc null nếu không có server.
  function pullServer(key) {
    if (!canFetch()) return Promise.resolve(null);
    if (serverState === false && Date.now() - lastProbe < 30000) return Promise.resolve(null);
    lastProbe = Date.now();
    return apiFetch(API() + '?user=' + encodeURIComponent(key)).then(function (d) {
      if (!d || !Array.isArray(d.bookings)) throw new Error('Phản hồi không đúng định dạng');
      serverState = true;
      return d.bookings;
    }).catch(function () { serverState = false; return null; });
  }
  function pushServer(recs) {
    if (!recs.length || serverState !== true) return Promise.resolve(false);
    return apiFetch(API(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookings: recs })
    }).then(function () { return true; }, function () { serverState = false; return false; });
  }
  function syncRecord(rec) {
    var probe = serverState === null ? pullServer(rec.userEmail) : Promise.resolve();
    return probe.then(function () { return pushServer([rec]); });
  }
  // Gộp bản từ server vào localStorage (bản nào updatedAt mới hơn thì thắng), đẩy lên server những bản server còn thiếu / cũ hơn
  function mergeFromServer(key, remote) {
    var all = readAll(), changed = false, byId = {}, seen = {}, push = [];
    all.forEach(function (raw, i) {
      var v = toRecord(raw);
      if (v && v.userEmail === key) byId[v.id] = { i: i, v: v };
    });
    remote.forEach(function (x) {
      var s = sanitize(x);
      if (!s.ok || s.value.userEmail !== key) return;
      var rec = s.value, cur = byId[rec.id];
      seen[rec.id] = true;
      if (!cur) { all.push(rec); changed = true; }
      else if (rec.updatedAt > cur.v.updatedAt) { all[cur.i] = rec; changed = true; }
      else if (rec.updatedAt < cur.v.updatedAt) push.push(cur.v);
    });
    Object.keys(byId).forEach(function (id) { if (!seen[id]) push.push(byId[id].v); });
    if (changed) writeAll(all);
    if (push.length) pushServer(push.slice(0, 200));
  }

  /* ---------------------------------------------------------------
   * API chính
   * ------------------------------------------------------------- */
  function notDeleted(r) { return !r.deleted; }

  // Lưu đặt chỗ mới cho tài khoản đang đăng nhập. Trả về ngay { ok, id, error, ...bản ghi }.
  function save(b) {
    var me = currentAccount();
    if (!me) return { ok: false, error: 'Vui lòng đăng nhập để lưu đặt chỗ.' };
    var n = normalize(b, todayISO());
    var now = new Date().toISOString();
    n.userEmail = userKey(me);
    n.status = 'confirmed';
    n.deleted = false;
    n.createdAt = now;
    n.updatedAt = now;
    n.contact = Object.assign({}, n.contact);
    if (!n.contact.email) n.contact.email = me.email;
    if (!n.contact.name) n.contact.name = me.name;

    var all = readAll();
    var taken = function (id) { return all.some(function (r) { return r && r.id === id; }); };
    if (!n.id) n.id = newCode(n.type || 'VG');
    for (var tries = 0; taken(n.id) && tries < 5; tries++) n.id = newCode(String(n.id).split('-')[0]);

    var s = sanitize(n);
    if (!s.ok) return { ok: false, error: s.error };
    all.push(s.value);
    if (!writeAll(all)) return { ok: false, error: 'Không thể lưu đơn vào bộ nhớ trình duyệt.' };
    syncRecord(s.value);
    return Object.assign({ ok: true }, s.value);
  }

  // Đặt chỗ của tài khoản đang đăng nhập (Promise<mảng>)
  function list() {
    var me = currentAccount();
    if (!me) return Promise.resolve([]);
    var key = userKey(me);
    return pullServer(key).then(function (remote) {
      if (remote) mergeFromServer(key, remote);
      return mineLocal(key).filter(notDeleted);
    });
  }

  // Sửa một đặt chỗ của tài khoản hiện tại. fn(rec) trả về chuỗi lỗi nếu không được phép.
  function mutate(id, fn) {
    var me = currentAccount();
    if (!me) return Promise.resolve({ ok: false, error: 'Vui lòng đăng nhập.' });
    var key = userKey(me), all = readAll(), idx = -1, cur = null;
    for (var i = 0; i < all.length; i++) {
      var v = toRecord(all[i]);
      if (v && v.id === id && v.userEmail === key && !v.deleted) { idx = i; cur = v; break; }
    }
    if (!cur) return Promise.resolve({ ok: false, error: 'Không tìm thấy đặt chỗ.' });
    var problem = fn(cur);
    if (problem) return Promise.resolve({ ok: false, error: problem });
    cur.updatedAt = new Date().toISOString();
    all[idx] = cur;
    if (!writeAll(all)) return Promise.resolve({ ok: false, error: 'Không thể lưu thay đổi vào bộ nhớ trình duyệt.' });
    syncRecord(cur);
    return Promise.resolve({ ok: true, booking: cur });
  }
  function cancel(id, today) {
    return mutate(id, function (r) {
      if (!canCancel(r, today)) return 'Đặt chỗ này không thể hủy (đã khởi hành, đã hoàn thành hoặc đã hủy).';
      r.status = 'cancelled';
    });
  }
  function remove(id, today) {      // xóa mềm: giữ dấu "đã xóa" để không bị kéo lại từ server
    return mutate(id, function (r) {
      if (!canRemove(r, today)) return 'Chỉ xóa được đặt chỗ đã hoàn thành hoặc đã hủy.';
      r.deleted = true;
    });
  }

  // Chuỗi JSON các đặt chỗ của tài khoản đang đăng nhập (để tải về thành file)
  function exportJSON() {
    var me = currentAccount();
    var bookings = me ? mineLocal(userKey(me)).filter(notDeleted) : [];
    return JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), bookings: bookings }, null, 2);
  }
  // Nhập đặt chỗ từ nội dung file JSON. Đơn đã có hoặc sai định dạng sẽ bị bỏ qua.
  function importJSON(text) {
    var me = currentAccount();
    if (!me) return Promise.resolve({ ok: false, error: 'Vui lòng đăng nhập trước khi nhập đặt chỗ.' });
    var data;
    try { data = JSON.parse(text); } catch (e) { return Promise.resolve({ ok: false, error: 'Tệp không phải JSON hợp lệ.' }); }
    var items = Array.isArray(data) ? data : (data && Array.isArray(data.bookings) ? data.bookings : null);
    if (!items) return Promise.resolve({ ok: false, error: 'Không tìm thấy danh sách đặt chỗ trong tệp.' });
    if (items.length > 200) return Promise.resolve({ ok: false, error: 'Tệp có quá nhiều đặt chỗ (tối đa 200).' });

    var key = userKey(me), all = readAll(), have = {}, added = [], skipped = 0;
    all.forEach(function (r) { if (r && r.id) have[r.id] = true; });
    items.forEach(function (x) {
      var n = normalize(x, todayISO());
      n.userEmail = key;                         // đơn nhập vào thuộc về tài khoản đang đăng nhập
      var s = sanitize(n);
      if (!s.ok || s.value.deleted || have[s.value.id]) { skipped++; return; }
      have[s.value.id] = true;
      all.push(s.value);
      added.push(s.value);
    });
    if (added.length && !writeAll(all)) return Promise.resolve({ ok: false, error: 'Không thể lưu vào bộ nhớ trình duyệt.' });
    if (added.length) {
      (serverState === null ? pullServer(key) : Promise.resolve()).then(function () { return pushServer(added); });
    }
    return Promise.resolve({ ok: true, imported: added.length, skipped: skipped });
  }

  // Gọi hàm khi dữ liệu / tài khoản đổi ở tab hoặc khung (iframe) khác
  var listeners = [];
  function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
  if (IS_BROWSER) {
    window.addEventListener('storage', function (e) {
      if (e.key !== null && e.key !== KEY && e.key !== USER_KEY) return;
      listeners.slice().forEach(function (f) { try { f(); } catch (err) { console.error(err); } });
    });
  }

  function mode() { return serverState === true ? 'server' : 'local'; }

  /* ---------------------------------------------------------------
   * Giao diện: đăng nhập, điều hướng, thông báo
   * ------------------------------------------------------------- */
  function loginUrl() { return ROOT + 'pages/account/login.html?next=' + encodeURIComponent(location.href); }
  function registerUrl() { return ROOT + 'pages/account/register.html?next=' + encodeURIComponent(location.href); }

  // Kiểm tra đăng nhập trước khi cho phép đặt dịch vụ
  function requireLogin() {
    if (currentAccount()) return true;
    alert('Vui lòng đăng nhập để tiếp tục đặt dịch vụ.');
    location.href = loginUrl();        // sau khi đăng nhập sẽ quay lại đúng trang này
    return false;
  }

  function prefill(fields) {
    var user = currentAccount();
    if (!user || !fields) return;
    Object.keys(fields).forEach(function (key) {
      var input = document.getElementById(fields[key]);
      if (input && !input.value && user[key]) input.value = user[key];
    });
  }

  // Chuyển sang mục "Lịch của tôi" của trang chủ (index.html).
  // Trang dịch vụ chạy trong iframe nên phải đổi hash của cửa sổ cha, KHÔNG đổi địa chỉ của iframe
  // (nếu không index.html sẽ bị nhúng lồng bên trong chính nó).
  function goToCalendar() {
    try {
      if (window.top !== window) { window.top.location.hash = 'calendar'; return; }
    } catch (e) { /* khác origin: dùng cách dự phòng bên dưới */ }
    location.href = ROOT + 'index.html#calendar';
  }

  function showSaved(element, saved) {
    if (!element) return;
    element.hidden = false;
    element.textContent = saved && saved.ok === false
      ? (saved.error || 'Không lưu được vào "Lịch của tôi".')
      : 'Đã lưu đơn' + (saved && saved.id ? ' ' + saved.id : '') + ' vào "Lịch của tôi".';
  }
  function savedNoteHtml() {
    return '<p class="vgbk-saved" style="margin:10px 0;color:#047857;font-weight:600">Đơn của bạn đã được lưu vào "Lịch của tôi".</p>';
  }

  // Các hàm cũ, giữ lại cho tương thích
  function getAll() { return readAll().map(toRecord).filter(function (r) { return r && !r.deleted; }); }
  function getMine() { var me = currentAccount(); return me ? mineLocal(userKey(me)).filter(notDeleted) : []; }
  function clear() { localStorage.removeItem(KEY); }

  return {
    VERSION: VERSION, TYPES: TYPES,
    // dùng chung với server.js
    sanitize: sanitize, normalize: normalize, maskId: maskId, statusOf: statusOf, canCancel: canCancel, canRemove: canRemove,
    // tiện ích
    toNumber: toNumber, todayISO: todayISO, addDaysISO: addDaysISO, newCode: newCode,
    isPhone: isPhone, isEmail: isEmail, tourDayCount: tourDayCount,
    // tài khoản + giao diện
    currentUser: currentAccount, requireLogin: requireLogin, loginUrl: loginUrl, registerUrl: registerUrl,
    prefill: prefill, goToCalendar: goToCalendar, showSaved: showSaved, savedNoteHtml: savedNoteHtml,
    // dữ liệu
    save: save, list: list, cancel: cancel, remove: remove, exportJSON: exportJSON, importJSON: importJSON,
    onChange: onChange, mode: mode, getAll: getAll, getMine: getMine, clear: clear
  };
});
