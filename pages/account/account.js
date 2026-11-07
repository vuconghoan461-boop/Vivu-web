/* ===== Trang cá nhân tích hợp Lịch của tôi (pages/account/account.js) ===== */
const $ = id => document.getElementById(id);
const KEY = 'vg_user', USERS = 'vg_users';

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null');
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

/* 1. KIỂM TRA ĐĂNG NHẬP: Chưa đăng nhập -> đẩy về login.html */
const user = getCurrentUser();
if (!user) {
    location.replace('login.html');
} else {
    renderProfile(user);
}

function renderProfile(u) {
    const firstChar = u.name.trim().split(/\s+/).pop()[0].toUpperCase();
    $('avatarInitial').textContent = firstChar;
    $('profileFullName').textContent = u.name;
    $('profileMeta').textContent = `${u.email} · ${u.phone} · 0 Điểm thưởng`;

    $('pName').value = u.name || '';
    $('pEmail').value = u.email || '';
    $('pPhone').value = u.phone || '';
    $('pDob').value = u.dob || '2006-05-15';
    $('pGender').value = u.gender || 'Nam';
    $('pAddress').value = u.address || '12 Chùa Bộc, Đống Đa, Hà Nội';
}

/* 2. CHUYỂN TAB GIỮA "LỊCH CỦA TÔI" & "THÔNG TIN CÁ NHÂN" */
function switchTab(paneId) {
    document.querySelectorAll('.fb-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === paneId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.hidden = pane.id !== paneId;
    });
}

document.querySelectorAll('.fb-tab').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
});

document.querySelector('[data-tab-target="infoPane"]').onclick = () => switchTab('infoPane');

/* 3. TỰ ĐỘNG CO GIÃN CHIỀU CAO IFRAME "LỊCH CỦA TÔI" CHO MƯỢT */
const calFrame = $('linhCalendarFrame');
calFrame.addEventListener('load', () => {
    try {
        const updateHeight = () => {
            const h = calFrame.contentWindow.document.body.scrollHeight;
            if (h > 600) calFrame.style.height = (h + 40) + 'px';
        };
        updateHeight();
        calFrame.contentWindow.addEventListener('click', () => setTimeout(updateHeight, 150));
    } catch (e) { /* Bỏ qua nếu mở trực tiếp bằng file:// */ }
});

/* 4. LƯU THAY ĐỔI HỒ SƠ CÁ NHÂN */
$('profileForm').onsubmit = e => {
    e.preventDefault();
    const updated = {
        ...user,
        name: $('pName').value.trim(),
        phone: $('pPhone').value.trim(),
        email: $('pEmail').value.trim(),
        dob: $('pDob').value,
        gender: $('pGender').value,
        address: $('pAddress').value.trim()
    };
    if (localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(updated));
    else sessionStorage.setItem(KEY, JSON.stringify(updated));

    renderProfile(updated);
    showToast('Đã cập nhật thông tin cá nhân thành công!');
};

/* 5. ĐĂNG XUẤT */
$('btnLogout').onclick = () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'vivugo:auth', action: 'logout' }, '*');
    }
    showToast('Đã đăng xuất khỏi tài khoản.');
    setTimeout(() => { location.href = 'login.html'; }, 500);
};