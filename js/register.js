/* ===== Trang Đăng ký (pages/account/register.html) – Độc lập, không cần auth.js ===== */
const $ = id => document.getElementById(id);
const KEY = 'vg_user', USERS = 'vg_users';
const EMAIL = /^\S+@\S+\.\S+$/, PHONE = /^0\d{9}$/;

/* --- 1. HÀM DÙNG CHUNG --- */
function getUsers() {
    if (!localStorage.getItem(USERS)) {
        localStorage.setItem(USERS, JSON.stringify([
            { name: 'Phạm Anh Tú', email: 'demo@vivugo.vn', phone: '0900000000', pass: '12345678', dob: '2006-05-15', gender: 'Nam', address: '12 Chùa Bộc, Đống Đa, Hà Nội' }
        ]));
    }
    return JSON.parse(localStorage.getItem(USERS));
}

function addUser(u) {
    localStorage.setItem(USERS, JSON.stringify([...getUsers(), u]));
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

function loginSuccess(u) {
    localStorage.setItem(KEY, JSON.stringify(u));
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'vivugo:auth', action: 'login', user: u }, '*');
    }
    showToast('Tạo tài khoản thành công! Đang vào Trang cá nhân...');
    setTimeout(() => { location.href = 'account.html'; }, 700);
}

/* --- 2. ĐO ĐỘ MẠNH MẬT KHẨU (WEAK / MEDIUM / STRONG) --- */
const strengthBox = $('strength');
const strengthLabel = strengthBox.querySelector('em');

$('rPass').addEventListener('input', function () {
    const v = this.value;
    let level = 0;
    if (v.length >= 8) {
        level = 1;
        if (/[A-Z]/.test(v) && /\d/.test(v)) level = 2;
        if (/[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v) || v.length >= 10) level = 3;
    } else if (v.length > 0) {
        level = 1;
    }
    strengthBox.dataset.level = v ? level : 0;
    const labels = ['', 'Yếu', 'Trung bình', 'Mạnh'];
    strengthLabel.textContent = v ? `Độ mạnh: ${labels[level]}` : '';
});

/* --- 3. KIỂM TRA FORM ĐĂNG KÝ --- */
const { validate } = setupValidation({
    rName:  v => v.length >= 2 ? '' : 'Vui lòng nhập họ và tên hợp lệ.',
    rEmail: v => !EMAIL.test(v) ? 'Email không đúng định dạng.' : (getUsers().some(u => u.email === v) ? 'Email này đã được sử dụng.' : ''),
    rPhone: v => !PHONE.test(v) ? 'Số điện thoại gồm 10 chữ số (bắt đầu bằng 0).' : (getUsers().some(u => u.phone === v) ? 'Số điện thoại này đã được đăng ký.' : ''),
    rPass:  v => v.length >= 8 ? '' : 'Mật khẩu phải có tối thiểu 8 ký tự.',
    rPass2: v => (v && v === $('rPass').value) ? '' : 'Mật khẩu xác nhận không khớp.'
});

bindEyes();

$('agree').addEventListener('change', function () {
    if (this.checked) $('agreeErr').textContent = '';
});

$('register').onsubmit = e => {
    e.preventDefault();
    const okFields = validate();
    if (!$('agree').checked) {
        $('agreeErr').textContent = 'Bạn cần đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.';
        return;
    }
    if (!okFields) return;

    const newUser = {
        name: $('rName').value.trim(),
        email: $('rEmail').value.trim(),
        phone: $('rPhone').value.trim(),
        pass: $('rPass').value,
        dob: '2006-01-01',
        gender: 'Nam',
        address: 'Hà Nội, Việt Nam'
    };
    addUser(newUser);
    loginSuccess(newUser);
};