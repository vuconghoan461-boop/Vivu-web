/* ===== VivuGo – Kho lưu đơn đặt dịch vụ (dùng chung cho mọi trang dịch vụ) =====
 * Mỗi lần khách đặt dịch vụ thành công, gọi:  VGBookings.save({...})
 * Dữ liệu lưu trong localStorage, khóa "vg_bookings" (cùng kiểu với vg_user / vg_users),
 * nên các trang chạy trong iframe và trang chủ đều đọc được.
 * Xuất ra file bookings.json:  VGBookings.exportJSON()
 */
(function (global) {
  'use strict';
  var KEY = 'vg_bookings';      // danh sách đơn
  var USER_KEY = 'vg_user';     // tài khoản đang đăng nhập (do login.js lưu)

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  // Lấy tài khoản đang đăng nhập. KHÔNG lấy mật khẩu.
  function currentAccount() {
    try {
      var u = JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'null');
      return u ? { name: u.name || '', email: u.email || '', phone: u.phone || '' } : null;
    } catch (e) { return null; }
  }

  // "1.500.000đ" -> 1500000
  function toNumber(v) {
    if (typeof v === 'number') return v;
    return parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0;
  }

  /* b = {
   *   id:      mã đơn (VD "TOUR-123456")
   *   type:    'tour' | 'hotel' | 'car' | 'flight' | 'train' | 'limousine'
   *   customer:{ name, phone, email, note }
   *   service: { name, ...chi tiết riêng từng loại }
   *   payment: { method, total }
   * } */
  function save(b) {
    var record = {
      id: b.id || ('VG-' + Math.floor(100000 + Math.random() * 900000)),
      type: b.type || 'other',
      createdAt: new Date().toISOString(),
      status: 'pending',
      account: currentAccount(),                 // null nếu khách chưa đăng nhập
      customer: b.customer || {},
      service: b.service || {},
      payment: {
        method: (b.payment && b.payment.method) || '',
        total: toNumber(b.payment && b.payment.total),
        currency: 'VND'
      }
    };
    var list = readAll();
    list.push(record);
    writeAll(list);
    return record;
  }

  function getAll() { return readAll(); }

  // Đơn của tài khoản đang đăng nhập (khớp email hoặc SĐT)
  function getMine() {
    var me = currentAccount();
    if (!me) return [];
    return readAll().filter(function (r) {
      return (r.account && (r.account.email === me.email || r.account.phone === me.phone)) ||
             (r.customer && (r.customer.email === me.email || r.customer.phone === me.phone));
    });
  }

  function clear() { localStorage.removeItem(KEY); }

  // Tải về file bookings.json
  function exportJSON() {
    var data = { exportedAt: new Date().toISOString(), bookings: readAll() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bookings.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // Chuyển sang mục "Lịch của tôi" của trang chủ (index.html).
  // Trang dịch vụ chạy trong iframe nên phải đổi hash của cửa sổ cha, KHÔNG đổi địa chỉ của iframe
  // (nếu không index.html sẽ bị nhúng lồng bên trong chính nó).
  function goToCalendar() {
    try {
      if (window.top !== window) { window.top.location.hash = 'calendar'; return; }
    } catch (e) { /* khác origin: dùng cách dự phòng bên dưới */ }
    location.href = '../../index.html#calendar';
  }

  global.VGBookings = { goToCalendar: goToCalendar, save: save, getAll: getAll, getMine: getMine, clear: clear, exportJSON: exportJSON, toNumber: toNumber };
})(window);