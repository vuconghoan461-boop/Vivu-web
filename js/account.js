/* ===== Trang cá nhân (pages/account/profile.html) – mở trong khung nội dung của index.html =====
   Tab "Lịch của tôi" nhúng nguyên trang mycalendar của Linh bằng iframe -> không phải sửa file nào của Linh. */
const $ = id => document.getElementById(id);
const user = JSON.parse(localStorage.getItem('vg_user') || sessionStorage.getItem('vg_user') || 'null');

function toLogin() {                                         // trang đăng nhập là trang riêng nên chuyển cả cửa sổ, không mở trong khung
    let next = '';
    try { next = '?next=' + encodeURIComponent(window.top.location.href); } catch (e) { /* khác origin thì bỏ qua */ }
    window.top.location.replace('login.html' + next);
}

if (!user) {
    toLogin();                                               // chưa đăng nhập
} else {
    const first = user.name.trim().split(/\s+/).pop();       // tên gọi = từ cuối của họ tên
    $('avatar').textContent = first[0].toUpperCase();
    ['pName', 'iName'].forEach(id => { $(id).textContent = user.name; });
    $('iEmail').textContent = user.email;
    $('iPhone').textContent = user.phone || 'Chưa cập nhật';
    $('profile').hidden = false;
}

// Chuyển tab; lịch chỉ được nạp ở lần đầu mở tab (đỡ tải data.json khi chưa cần)
const cal = $('calFrame');
function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $('panel-info').hidden = name !== 'info';
    $('panel-calendar').hidden = name !== 'calendar';
    if (name === 'calendar' && !cal.getAttribute('src')) cal.src = cal.dataset.src;
}
document.querySelectorAll('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));
const tabFromHash = () => showTab(location.hash === '#calendar' ? 'calendar' : 'info');
window.addEventListener('hashchange', tabFromHash);          // menu avatar trên header mở profile.html#calendar
if (location.hash === '#calendar') tabFromHash();

// Trang lịch của Linh nếu có header/footer riêng thì ẩn đi (đoán theo tên class phổ biến, không sửa file của Linh)
cal.addEventListener('load', () => {
    try {
        const st = cal.contentDocument.createElement('style');
        st.textContent = '.site-header, .navbar, .topbar, .main-header, header.header, .footer { display: none !important; }';
        cal.contentDocument.head.appendChild(st);
    } catch (e) { /* mở bằng file:// thì không truy cập được, bỏ qua */ }
});

$('logoutBtn').onclick = () => {
    localStorage.removeItem('vg_user'); sessionStorage.removeItem('vg_user');
    if (window.parent !== window) window.parent.postMessage({ type: 'vivugo:auth', action: 'logout' }, '*');   // header đổi lại thành Đăng nhập / Đăng ký
    else toLogin();
};
