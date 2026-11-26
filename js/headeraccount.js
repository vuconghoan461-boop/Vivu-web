/* ===== Nút tài khoản trên header (pages/account/header-account.js) =====
   Gắn vào index.html bằng 1 dòng, đặt cuối <body>:   <script src="../pages/account/header-account.js"></script>
   1) Bấm "Đăng nhập" / "Đăng ký": mở trang riêng (không header/footer) và nhớ đường quay lại trang chủ.
   2) Đã đăng nhập: ẩn 2 nút Đăng nhập/Đăng ký, thay bằng avatar + menu (Trang cá nhân, Lịch của tôi, Đăng xuất).
   Chỉ là front-end demo: đọc khóa "vg_user" do login.js / register.js lưu ở localStorage/sessionStorage. */
(function () {
    const guest = document.querySelector('.account-actions');        // 2 nút Đăng nhập / Đăng ký của Linh
    if (!guest) return;                                              // không phải index.html thì bỏ qua
    const frame = document.getElementById('module');                 // iframe nội dung
    const PROFILE = '../pages/account/profile.html';                 // đường dẫn tính từ index.html (giống các nút data-page)
    const getUser = () => JSON.parse(localStorage.getItem('vg_user') || sessionStorage.getItem('vg_user') || 'null');

    /* CSS cho avatar + menu (tự nhúng, khỏi phải thêm file .css) */
    const style = document.createElement('style');
    style.textContent = `
.vg-account { position: relative; display: flex; align-items: center; margin-left: 8px; font-family: 'Inter', sans-serif; }
.vg-user { display: flex; align-items: center; gap: 8px; padding: 0; border: 0; background: none; font: 600 14px 'Be Vietnam Pro', sans-serif; color: #1F2937; cursor: pointer; }
.vg-avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: #017DE5; color: #fff; font-weight: 700; }
.vg-menu { display: none; position: absolute; right: 0; top: 48px; z-index: 500; width: 250px; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.18); overflow: hidden; }
.vg-menu.show { display: block; }
.vg-head { padding: 16px 20px; color: #fff; background: linear-gradient(135deg, #D4AF37, #AA8000); }
.vg-head b { display: block; margin-bottom: 4px; font-size: 16px; }
.vg-menu a { display: block; padding: 11px 20px; color: #1F2937; font-size: 14px; text-decoration: none; }
.vg-menu a:hover { background: #F0F4F8; }
.vg-menu .vg-logout { color: #E53935; border-top: 1px solid #E5E7EB; }
@media (max-width: 820px) { .vg-name { display: none; } }`;
    document.head.appendChild(style);

    /* 1) Bấm Đăng nhập / Đăng ký: chạy ở pha "capture" để chặn cách mở cũ
          (nạp trong iframe nên dính header/footer, và nút Đăng ký không mở được) */
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-auth]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        location.href = b.dataset.page + '?next=' + encodeURIComponent(location.href);   // data-page của Linh: ../pages/account/login.html | register.html
    }, true);

    /* 2) Avatar + menu thay cho 2 nút khi đã đăng nhập */
    const slot = document.createElement('div');
    slot.className = 'vg-account';
    guest.after(slot);
    const closeMenu = () => { const m = slot.querySelector('.vg-menu'); if (m) m.classList.remove('show'); };
    document.addEventListener('click', closeMenu);
    window.addEventListener('blur', closeMenu);                      // bấm vào khung nội dung cũng đóng menu
    const openProfile = hash => { if (frame) frame.src = PROFILE + hash; };
    const goHome = () => { const b = document.querySelector('[data-page="explore"]'); if (b) b.click(); };

    function logout() {
        localStorage.removeItem('vg_user'); sessionStorage.removeItem('vg_user');
        render();
        goHome();
    }
    function render() {
        const u = getUser();
        guest.style.display = u ? 'none' : '';                       // đã đăng nhập thì ẩn 2 nút
        slot.replaceChildren();
        if (!u) return;
        const first = u.name.trim().split(/\s+/).pop();             // tên gọi = từ cuối của họ tên
        slot.innerHTML = '<button class="vg-user" type="button"><span class="vg-avatar"></span><span class="vg-name"></span></button>' +
            '<div class="vg-menu"><div class="vg-head"><b></b><small>🥉 Bronze Priority · 0 điểm</small></div>' +
            '<a href="#" data-go="profile">Trang cá nhân</a><a href="#" data-go="calendar">Lịch của tôi</a>' +
            '<a href="#" data-go="out" class="vg-logout">Đăng xuất</a></div>';
        slot.querySelector('.vg-avatar').textContent = first[0].toUpperCase();
        slot.querySelector('.vg-name').textContent = first;
        slot.querySelector('.vg-head b').textContent = u.name;
        const menu = slot.querySelector('.vg-menu');
        slot.querySelector('.vg-user').onclick = e => { e.stopPropagation(); menu.classList.toggle('show'); };
        slot.querySelectorAll('.vg-menu a').forEach(a => a.onclick = e => {
            e.preventDefault();
            closeMenu();
            if (a.dataset.go === 'profile') openProfile('');
            if (a.dataset.go === 'calendar') openProfile('#calendar');
            if (a.dataset.go === 'out') logout();
        });
    }

    window.addEventListener('message', e => {                        // trang cá nhân báo đã đăng xuất
        const m = e.data || {};
        if (m.type === 'vivugo:auth' && m.action === 'logout' && frame && e.source === frame.contentWindow) { render(); goHome(); }
    });
    render();
})();
