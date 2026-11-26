/* ===== Điều khiển Tài khoản trên Header (js/headeraccount.js) ===== */
(function () {
    const KEY = 'vg_user';
    const guest = document.querySelector('.account-actions');
    if (!guest) return;

    const frame = document.getElementById('module');
    const PATHS = {
        login: './pages/account/login.html',
        register: './pages/account/register.html',
        account: './pages/account/account.html',
        explore: './pages/explore.html'
    };

    const getUser = () => {
        try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null'); }
        catch { return null; }
    };

    /* 1. Ẩn mục "Tài khoản" trên thanh menu ngang */
    document.querySelectorAll('.main-nav [data-page="account"]').forEach(el => {
        el.style.display = 'none';
    });

    /* 2. Ép iframe bung toàn màn hình + CSS cho nút Avatar hình tròn & Đăng xuất */
    const style = document.createElement('style');
    style.textContent = `
        main.workspace { width: 100% !important; max-width: none !important; display: block !important; }
        #module, main.workspace > iframe {
            width: 100% !important;
            min-height: calc(100vh - 76px);
            border: 0;
            display: block;
        }
        .vg-fb-auth { display: inline-flex; align-items: center; gap: 10px; margin-left: 6px; font-family: 'Be Vietnam Pro', sans-serif; }
        .vg-fb-circle {
            position: relative; width: 42px; height: 42px; border-radius: 50%;
            border: 2px solid #017DE5; padding: 0; cursor: pointer;
            background: linear-gradient(135deg, #017DE5, #38BDF8);
            color: #fff; font-size: 17px; font-weight: 700;
            display: grid; place-items: center;
            box-shadow: 0 3px 10px rgba(1,125,229,.22);
            transition: transform .18s ease, box-shadow .18s ease;
        }
        .vg-fb-circle img {
            width: 100%; height: 100%; border-radius: 50%;
            object-fit: cover; display: block;
        }
        .vg-fb-circle:hover { transform: scale(1.07); box-shadow: 0 5px 14px rgba(1,125,229,.35); }
        .vg-fb-circle::after {
            content: ''; position: absolute; right: 0; bottom: 0;
            width: 11px; height: 11px; border-radius: 50%;
            background: #22C55E; border: 2px solid #fff;
        }
        .vg-fb-logout {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 13px; border-radius: 999px;
            border: 1px solid #FECACA; background: #FEF2F2;
            color: #DC2626; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: .2s;
        }
        .vg-fb-logout:hover { background: #DC2626; color: #fff; border-color: #DC2626; }
        .vg-toast-bar {
            position: fixed; left: 50%; bottom: 26px; z-index: 3000;
            padding: 11px 22px; border-radius: 8px; background: #1F2937; color: #fff;
            font: 14px 'Inter', sans-serif; opacity: 0; pointer-events: none;
            transform: translate(-50%, 16px); transition: .28s;
        }
        .vg-toast-bar.show { opacity: 1; transform: translate(-50%, 0); }
        @media (max-width: 640px) { .vg-fb-logout span { display: none; } .vg-fb-logout { padding: 8px 10px; } }
    `;
    document.head.appendChild(style);

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'vg-toast-bar';
        t.textContent = msg;
        document.body.appendChild(t);
        void t.offsetWidth;
        t.classList.add('show');
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
    }

    function openInFrame(url, activePage) {
        if (frame) frame.src = url;
        document.querySelectorAll('.main-nav .nav-link').forEach(btn => {
            btn.classList.toggle('active', !!activePage && btn.dataset.page === activePage);
        });
    }

    /* 3. Bấm Đăng nhập / Đăng ký -> mở đúng trang riêng */
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-auth]');
        if (!btn) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        const type = btn.dataset.auth === 'register' ? 'register' : 'login';
        const returnUrl = location.origin + location.pathname + '?page=account';
        location.href = PATHS[type] + '?next=' + encodeURIComponent(returnUrl);
    }, true);

    /* 4. Vùng nút hình tròn Avatar + Đăng xuất */
    const slot = document.createElement('div');
    slot.className = 'vg-fb-auth';
    guest.after(slot);

    function doLogout() {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
        render();
        showToast('Bạn đã đăng xuất khỏi VivuGo.');
        openInFrame(PATHS.explore, 'explore');
        const homeBtn = document.querySelector('.main-nav [data-page="explore"]');
        if (homeBtn) homeBtn.click();
    }

    function render() {
        const u = getUser();
        if (!u) {
            guest.style.display = '';
            slot.style.display = 'none';
            slot.replaceChildren();
            return;
        }

        guest.style.display = 'none';
        slot.style.display = 'inline-flex';
        const firstName = (u.name || 'U').trim().split(/\s+/).pop();
        const initial = firstName[0].toUpperCase();
        const avatarContent = u.avatar
            ? `<img src="${u.avatar}" alt="${u.name}">`
            : initial;

        slot.innerHTML = `
            <button type="button" class="vg-fb-circle" id="vgAvatarBtn" title="Trang cá nhân: ${u.name}">
                ${avatarContent}
            </button>
            <button type="button" class="vg-fb-logout" id="vgHeaderLogout" title="Đăng xuất tài khoản">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Đăng xuất</span>
            </button>
        `;

        slot.querySelector('#vgAvatarBtn').onclick = () => openInFrame(PATHS.account, null);
        slot.querySelector('#vgHeaderLogout').onclick = doLogout;
    }

    window.addEventListener('message', e => {
        const m = e.data || {};
        if (m.type !== 'vivugo:auth') return;
        if (m.action === 'logout') doLogout();
        if (m.action === 'update') render();
    });

    render();

    const params = new URLSearchParams(location.search);
    if (params.get('page') === 'account' && getUser()) {
        const openProfile = () => openInFrame(PATHS.account, null);
        openProfile();
        window.addEventListener('load', () => setTimeout(openProfile, 60));
        history.replaceState({}, '', location.pathname);
    }
})();