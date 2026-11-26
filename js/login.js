/* ===== Trang Đăng nhập (js/login.js) – dùng js/userLogic.js ===== */
const $ = id => document.getElementById(id);
const EMAIL = /^\S+@\S+\.\S+$/, PHONE = /^0\d{9}$/;

const NEXT = new URLSearchParams(location.search).get('next') || '';
function safeNext() {
    if (!NEXT) return '../../index.html?page=account';
    try {
        const u = new URL(NEXT, location.href);
        return u.origin === location.origin ? u.href : '../../index.html?page=account';
    } catch { return '../../index.html?page=account'; }
}
const keepNext = url => NEXT ? url + '?next=' + encodeURIComponent(NEXT) : url;
if ($('toLogin')) $('toLogin').href = keepNext('login.html');
if ($('toRegister')) $('toRegister').href = keepNext('register.html');
if ($('logo')) $('logo').href = '../../index.html';

function redirectAfterAuth(msg = 'Đăng nhập thành công!') {
    toast(msg);
    setTimeout(() => { location.href = safeNext(); }, 700);
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
        icon.classList.toggle('on', show);
    });
}

function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

const SOCIAL = {
    google:   { name: 'Google',   email: 'nguoidung.google@gmail.com' },
    facebook: { name: 'Facebook', email: 'nguoidung.fb@facebook.com' },
    apple:    { name: 'Apple',    email: 'nguoidung.apple@icloud.com' }
};
function bindSocial() {
    document.querySelectorAll('.sso button').forEach(btn => btn.onclick = () => {
        const p = btn.dataset.provider, s = SOCIAL[p];
        if (!s) return;
        const box = document.createElement('div');
        box.className = 'sso-dialog';
        box.innerHTML = `<div class="sso-card">
            <div class="sso-logo">${btn.querySelector('svg') ? btn.querySelector('svg').outerHTML : ''}</div>
            <h3>Tiếp tục với ${s.name}</h3>
            <button class="sso-acc" type="button">
                <span class="sso-ava">V</span>
                <span><b>Thành viên VivuGo</b><small>${s.email}</small></span>
            </button>
            <p class="sso-note">Chọn tài khoản để đăng nhập nhanh vào VivuGo.</p>
            <button class="sso-cancel" type="button">Hủy</button>
        </div>`;
        box.onclick = e => { if (e.target === box) box.remove(); };
        box.querySelector('.sso-cancel').onclick = () => box.remove();
        box.querySelector('.sso-acc').onclick = () => {
            box.remove();
            VivuUser.loginSocial({ name: 'Thành viên VivuGo', email: s.email, provider: p });
            redirectAfterAuth(`Đăng nhập nhanh bằng ${s.name} thành công!`);
        };
        document.body.appendChild(box);
    });
}

if (VivuUser.getCurrentUser()) location.replace(safeNext());

const { validate } = setupValidation({
    lEmail: v => (EMAIL.test(v) || PHONE.test(v)) ? '' : 'Vui lòng nhập email hoặc số điện thoại hợp lệ.',
    lPass:  v => v ? '' : 'Vui lòng nhập mật khẩu.'
});
bindEyes();
bindSocial();

$('login').onsubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    const u = VivuUser.loginUser($('lEmail').value, $('lPass').value, $('remember').checked);
    if (!u) return setError('lPass', 'Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.');
    redirectAfterAuth();
};

if ($('forgotBtn')) {
    $('forgotBtn').onclick = () => {
        const box = document.createElement('div');
        box.className = 'sso-dialog';
        box.innerHTML = `<div class="sso-card">
            <h3>Khôi phục mật khẩu</h3>
            <p class="sso-note" style="margin-bottom:14px;">Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.</p>
            <input type="email" class="dialog-input" id="resetEmail" placeholder="example@vivugo.vn">
            <button type="button" class="btn-full" id="sendReset">Gửi yêu cầu</button>
            <button type="button" class="sso-cancel">Đóng</button>
        </div>`;
        box.onclick = e => { if (e.target === box) box.remove(); };
        box.querySelector('.sso-cancel').onclick = () => box.remove();
        box.querySelector('#sendReset').onclick = () => {
            const em = box.querySelector('#resetEmail').value.trim();
            if (!EMAIL.test(em)) return toast('Vui lòng nhập đúng định dạng email.');
            box.remove();
            toast(`Đã gửi liên kết đặt lại mật khẩu tới ${em}!`);
        };
        document.body.appendChild(box);
    };
}