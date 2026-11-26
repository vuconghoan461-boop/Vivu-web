
/* ---------- HÀM DÙNG CHUNG: login.js và register.js giữ giống hệt phần này ---------- */
const $ = id => document.getElementById(id);
const EMAIL = /^\S+@\S+\.\S+$/, PHONE = /^0\d{9}$/;

// Tài khoản + phiên đăng nhập (demo front-end: lưu bằng localStorage / sessionStorage, chưa có backend)
function getUsers() {
    if (!localStorage.getItem('vg_users')) {                 // tài khoản demo có sẵn
        localStorage.setItem('vg_users', JSON.stringify([{ name: 'Phạm Anh Tú', email: 'demo@vivugo.vn', phone: '0123456789', pass: '12345678' }]));
    }
    return JSON.parse(localStorage.getItem('vg_users'));
}
const getUser = () => JSON.parse(localStorage.getItem('vg_user') || sessionStorage.getItem('vg_user') || 'null');

// Header ở index.html gửi kèm ?next=<địa chỉ trang chủ> để đăng nhập xong quay về đúng chỗ
const NEXT = new URLSearchParams(location.search).get('next') || '';
function safeNext() {                                        // chỉ cho quay về trang cùng website
    if (!NEXT) return '';
    try { const u = new URL(NEXT, location.href); return u.origin === location.origin ? u.href : ''; } catch (e) { return ''; }
}
const keepNext = url => NEXT ? url + '?next=' + encodeURIComponent(NEXT) : url;
$('toLogin').href = keepNext('login.html');                  // chuyển qua lại giữa 2 trang vẫn giữ ?next
$('toRegister').href = keepNext('register.html');
$('logo').href = safeNext() || '#';                          // bấm logo = về trang chủ

function loginOK(u, remember = true) {                       // lưu phiên rồi quay về trang chủ (header sẽ đổi thành avatar)
    (remember ? localStorage : sessionStorage).setItem('vg_user', JSON.stringify(u));
    toast('Đăng nhập thành công!');
    setTimeout(() => { location.href = safeNext() || 'profile.html'; }, 800);
}

// Báo lỗi ngay dưới ô nhập (không dùng alert)
function setError(id, msg) {
    const box = $(id).parentElement;
    box.classList.toggle('error', !!msg);
    box.querySelector('.err').textContent = msg;
}
// rules = { idÔ: v => 'câu báo lỗi' (hoặc '' nếu hợp lệ) }  ->  trả về { check(id), validate() }
function setupValidation(rules) {
    const check = id => { const msg = rules[id]($(id).value); setError(id, msg); return !msg; };
    Object.keys(rules).forEach(id => {
        $(id).addEventListener('blur', () => check(id));                  // rời ô -> kiểm tra
        $(id).addEventListener('input', () => {                           // đang có lỗi -> sửa tới đâu báo tới đó
            if ($(id).parentElement.classList.contains('error')) check(id);
        });
    });
    return { check, validate: () => Object.keys(rules).map(check).every(Boolean) };
}
// Biểu tượng con mắt: bấm để ẩn/hiện mật khẩu
function bindEyes() {
    document.querySelectorAll('.eye').forEach(icon => icon.onclick = () => {
        const input = icon.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.classList.toggle('on', show);                                // đổi giữa mắt mở / mắt gạch chéo
    });
}
// Thông báo nhỏ ở đáy màn hình
function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    void t.offsetWidth;                                                   // ép trình duyệt vẽ trước để chạy hiệu ứng
    t.classList.add('show');
    setTimeout(() => t.remove(), 2500);
}

// Bấm Google / Facebook / Apple: MÔ PHỎNG hộp "chọn tài khoản" rồi đăng nhập bằng tài khoản demo (chưa kết nối backend thật)
const SOCIAL = {
    google:   { name: 'Google',   email: 'anhtu.demo@gmail.com' },
    facebook: { name: 'Facebook', email: 'anhtu.demo@facebook.com' },
    apple:    { name: 'Apple',    email: 'anhtu.demo@icloud.com' }
};
function bindSocial() {
    document.querySelectorAll('.sso button').forEach(btn => btn.onclick = () => {
        const p = btn.dataset.provider, s = SOCIAL[p];
        const box = document.createElement('div');
        box.className = 'sso-dialog';
        box.innerHTML = '<div class="sso-card"><div class="sso-logo"></div><h3></h3>' +
            '<button class="sso-acc" type="button"><span class="sso-ava">T</span><span><b></b><small></small></span></button>' +
            '<p class="sso-note"></p><button class="sso-cancel" type="button">Hủy</button></div>';
        box.querySelector('.sso-logo').innerHTML = btn.querySelector('svg').outerHTML;   // dùng lại logo của nút vừa bấm
        box.querySelector('h3').textContent = 'Tiếp tục với ' + s.name;
        box.querySelector('b').textContent = 'Phạm Anh Tú';
        box.querySelector('small').textContent = s.email;
        box.querySelector('.sso-note').textContent = 'Giao diện mô phỏng, chưa kết nối thật.'; 
        box.onclick = e => { if (e.target === box) box.remove(); };                      // bấm ra ngoài để đóng
        box.querySelector('.sso-cancel').onclick = () => box.remove();
        box.querySelector('.sso-acc').onclick = () => { box.remove(); loginOK({ name: 'Phạm Anh Tú', email: s.email, phone: '', provider: p }); };
        document.body.appendChild(box);
    });
}

if (getUser()) location.replace(safeNext() || 'profile.html');           // đã đăng nhập rồi thì không cần form nữa

/* ---------- TRANG ĐĂNG NHẬP ---------- */
const { validate } = setupValidation({      // quy tắc từng ô: trả về '' nếu hợp lệ
    lEmail: v => (EMAIL.test(v) || PHONE.test(v)) ? '' : 'Vui lòng nhập email hoặc số điện thoại hợp lệ.',
    lPass:  v => v ? '' : 'Vui lòng nhập mật khẩu.'
});
bindEyes();
bindSocial();

$('login').onsubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    const id = $('lEmail').value.trim();
    const u = getUsers().find(x => (x.email === id || x.phone === id) && x.pass === $('lPass').value);
    if (!u) return setError('lPass', 'Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.');
    loginOK(u, $('remember').checked);
};
