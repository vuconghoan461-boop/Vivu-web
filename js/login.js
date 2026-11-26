/* ===== Trang Đăng nhập (pages/account/login.html) – Độc lập, không cần auth.js ===== */
const $ = id => document.getElementById(id);
const KEY = 'vg_user', USERS = 'vg_users';
const EMAIL = /^\S+@\S+\.\S+$/, PHONE = /^0\d{9}$/;

/* --- 1. HÀM DÙNG CHUNG (Quản lý User, Toast, Bắt lỗi, Ẩn/hiện mật khẩu) --- */
function getUsers() {
    if (!localStorage.getItem(USERS)) {
        localStorage.setItem(USERS, JSON.stringify([
            { name: 'Phạm Anh Tú', email: 'demo@vivugo.vn', phone: '0900000000', pass: '12345678', dob: '2006-05-15', gender: 'Nam', address: '12 Chùa Bộc, Đống Đa, Hà Nội' }
        ]));
    }
    return JSON.parse(localStorage.getItem(USERS));
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'vg-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

function setError(id, msg) {
    const box = $(id).parentElement;
    box.classList.toggle('error', !!msg);
    box.querySelector('.err').textContent = msg;
}

function setupValidation(rules) {
    const check = id => { const msg = rules[id]($(id).value.trim()); setError(id, msg); return !msg; };
    Object.keys(rules).forEach(id => {
        $(id).addEventListener('blur', () => check(id));
        $(id).addEventListener('input', () => {
            if ($(id).parentElement.classList.contains('error')) check(id);
        });
    });
    return { check, validate: () => Object.keys(rules).map(check).every(Boolean) };
}

function bindEyes() {
    document.querySelectorAll('.eye').forEach(icon => icon.onclick = () => {
        const input = icon.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.className = 'eye fa-regular ' + (show ? 'fa-eye-slash' : 'fa-eye');
    });
}

function loginSuccess(u, remember = true) {
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u));
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'vivugo:auth', action: 'login', user: u }, '*');
    }
    showToast('Đăng nhập thành công! Đang vào Trang cá nhân...');
    setTimeout(() => { location.href = 'account.html'; }, 700);
}

/* --- 2. KHỞI TẠO KIỂM TRA FORM ĐĂNG NHẬP --- */
const { validate } = setupValidation({
    lEmail: v => (EMAIL.test(v) || PHONE.test(v)) ? '' : 'Vui lòng nhập email hoặc số điện thoại hợp lệ.',
    lPass: v => v ? '' : 'Vui lòng nhập mật khẩu.'
});

bindEyes();

$('login').onsubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    const id = $('lEmail').value.trim();
    const pass = $('lPass').value;
    const u = getUsers().find(x => (x.email === id || x.phone === id) && x.pass === pass);
    if (!u) return setError('lPass', 'Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.');
    loginSuccess(u, $('remember').checked);
};