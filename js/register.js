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
        box.querySelector('.sso-note').textContent = 'Giao diện mô phỏng, chưa kết nối thật.'
        box.onclick = e => { if (e.target === box) box.remove(); };                      // bấm ra ngoài để đóng
        box.querySelector('.sso-cancel').onclick = () => box.remove();
        box.querySelector('.sso-acc').onclick = () => { box.remove(); loginOK({ name: 'Phạm Anh Tú', email: s.email, phone: '', provider: p }); };
        document.body.appendChild(box);
    });
}

if (getUser()) location.replace(safeNext() || 'profile.html');           // đã đăng nhập rồi thì không cần form nữa

/* ---------- TRANG ĐĂNG KÝ ---------- */
const { check, validate } = setupValidation({      // quy tắc từng ô: trả về '' nếu hợp lệ
    rName:  v => v.trim().length >= 2 ? '' : 'Vui lòng nhập họ và tên.',
    rEmail: v => EMAIL.test(v) ? '' : 'Email không đúng định dạng.',
    rPhone: v => PHONE.test(v) ? '' : 'Số điện thoại gồm 10 số, bắt đầu bằng 0.',
    rPass:  v => v.length >= 8 ? '' : 'Mật khẩu cần tối thiểu 8 ký tự.',
    rPass2: v => v === $('rPass').value ? '' : 'Mật khẩu xác nhận chưa khớp.'
});
bindEyes();
bindSocial();

// Thanh độ mạnh mật khẩu: Yếu / Trung bình / Mạnh
$('rPass').addEventListener('input', e => {
    const v = e.target.value;
    const score = (v.length >= 8) + /[A-Z]/.test(v) + /\d/.test(v) + /[^A-Za-z0-9]/.test(v);
    const lv = !v ? 0 : score <= 1 ? 1 : score <= 3 ? 2 : 3;
    [...$('strength').children].forEach((el, i) => { if (i < 3) el.className = i < lv ? 'lv' + lv : ''; });
    $('strength').lastElementChild.textContent = ['', 'Yếu', 'Trung bình', 'Mạnh'][lv];
    if ($('rPass2').value) check('rPass2');                  // đổi mật khẩu -> kiểm tra lại ô xác nhận
});

$('register').onsubmit = e => {
    e.preventDefault();
    const ok = validate();
    $('agreeErr').textContent = $('agree').checked ? '' : 'Bạn cần đồng ý với điều khoản để tiếp tục.';
    if (!ok || !$('agree').checked) return;
    const email = $('rEmail').value.trim();
    if (getUsers().some(x => x.email === email)) return setError('rEmail', 'Email này đã được đăng ký.');
    const u = { name: $('rName').value.trim(), email, phone: $('rPhone').value.trim(), pass: $('rPass').value };
    localStorage.setItem('vg_users', JSON.stringify([...getUsers(), u]));   // lưu tài khoản mới
    loginOK(u);                                       // đăng ký xong tự đăng nhập luôn
};
