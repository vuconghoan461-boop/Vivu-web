/* ===== Trang Đăng ký (js/register.js) – dùng js/userLogic.js ===== */
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

function redirectAfterAuth(msg = 'Tạo tài khoản thành công!') {
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
            <h3>Đăng ký bằng ${s.name}</h3>
            <button class="sso-acc" type="button">
                <span class="sso-ava">V</span>
                <span><b>Thành viên VivuGo</b><small>${s.email}</small></span>
            </button>
            <p class="sso-note">Chọn tài khoản để tạo hồ sơ VivuGo mới.</p>
            <button class="sso-cancel" type="button">Hủy</button>
        </div>`;
        box.onclick = e => { if (e.target === box) box.remove(); };
        box.querySelector('.sso-cancel').onclick = () => box.remove();
        box.querySelector('.sso-acc').onclick = () => {
            box.remove();
            VivuUser.loginSocial({ name: 'Thành viên VivuGo', email: s.email, provider: p });
            redirectAfterAuth(`Đăng ký bằng ${s.name} thành công!`);
        };
        document.body.appendChild(box);
    });
}

if (VivuUser.getCurrentUser()) location.replace(safeNext());

/* Đo độ mạnh mật khẩu */
const strengthBox = $('strength');
if (strengthBox) {
    const strengthLabel = strengthBox.querySelector('em');
    $('rPass').addEventListener('input', function () {
        const v = this.value;
        let level = 0;
        if (v.length >= 8) {
            level = 1;
            if (/[A-Z]/.test(v) && /\d/.test(v)) level = 2;
            if ((/[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v)) || v.length >= 10) level = 3;
        } else if (v.length > 0) level = 1;
        strengthBox.dataset.level = v ? level : 0;
        strengthLabel.textContent = v ? `Độ mạnh: ${['', 'Yếu', 'Trung bình', 'Mạnh'][level]}` : '';
    });
}

const { validate } = setupValidation({
    rName:  v => v.length >= 2 ? '' : 'Vui lòng nhập họ và tên hợp lệ.',
    rEmail: v => !EMAIL.test(v) ? 'Email không đúng định dạng.' : (VivuUser.getUsers().some(u => u.email === v) ? 'Email này đã được đăng ký.' : ''),
    rPhone: v => !PHONE.test(v) ? 'Số điện thoại gồm 10 chữ số (bắt đầu bằng 0).' : (VivuUser.getUsers().some(u => u.phone === v) ? 'Số điện thoại này đã được đăng ký.' : ''),
    rPass:  v => v.length >= 8 ? '' : 'Mật khẩu phải có tối thiểu 8 ký tự.',
    rPass2: v => (v && v === $('rPass').value) ? '' : 'Mật khẩu xác nhận không khớp.'
});

bindEyes();
bindSocial();

$('agree').addEventListener('change', function () {
    if (this.checked) $('agreeErr').textContent = '';
});

$('register').onsubmit = e => {
    e.preventDefault();
    const ok = validate();
    if (!$('agree').checked) {
        $('agreeErr').textContent = 'Bạn cần đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.';
        return;
    }
    if (!ok) return;

    VivuUser.registerUser({
        name: $('rName').value,
        email: $('rEmail').value,
        phone: $('rPhone').value,
        pass: $('rPass').value
    });
    redirectAfterAuth();
};

function openPolicy(title, content) {
    const box = document.createElement('div');
    box.className = 'sso-dialog';
    box.innerHTML = `<div class="sso-card">
        <h3>${title}</h3>
        <div class="dialog-text">${content}</div>
        <button type="button" class="btn-full" id="acceptPolicy">Đã hiểu &amp; Đồng ý</button>
    </div>`;
    box.onclick = e => { if (e.target === box) box.remove(); };
    box.querySelector('#acceptPolicy').onclick = () => {
        $('agree').checked = true;
        $('agreeErr').textContent = '';
        box.remove();
    };
    document.body.appendChild(box);
}

if ($('termsLink')) {
    $('termsLink').onclick = () => openPolicy(
        'Điều khoản dịch vụ VivuGo',
        'Khi tạo tài khoản VivuGo, bạn đồng ý cung cấp thông tin cá nhân chính xác phục vụ việc lưu lịch trình, chia sẻ bài viết và quản lý chuyến đi trên nền tảng VivuGo.'
    );
}
if ($('privacyLink')) {
    $('privacyLink').onclick = () => openPolicy(
        'Chính sách bảo mật',
        'VivuGo cam kết bảo vệ thông tin cá nhân của thành viên. Bạn có toàn quyền chỉnh sửa thông tin, ảnh đại diện và xóa bài viết bất cứ lúc nào trong Trang cá nhân.'
    );
}