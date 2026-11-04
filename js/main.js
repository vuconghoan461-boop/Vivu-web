// ======================================
// 0. CẤU HÌNH TRANG
// Đường dẫn tính từ file index.html (không phải từ file JS)
// ======================================

const pages = {
    explore: {
        title: 'Khám phá điểm đến',
        kicker: 'CẨM NANG DU LỊCH',
        src: './pages/explore.html'
    },
    services: {
        title: 'Dịch vụ du lịch',
        kicker: 'TOUR · KHÁCH SẠN · THUÊ XE',
        src: './pages/service/servicepage.html'
    },
    ai: {
        title: 'Trợ lý AI',
        kicker: 'AI TRIP DESIGNER',
        src: './pages/AI planner/AI.html'
    },
    calendar: {
        title: 'Lịch của tôi',
        kicker: 'QUẢN LÝ HÀNH TRÌNH',
        src: './pages/account/mycalendar/mycalendar.html'
    },
    account: {
        title: 'Tài khoản',
        kicker: 'HỒ SƠ · ĐẶT CHỖ · HỖ TRỢ',
        src: './pages/account/account.html'
    }
};

// Các trang con trong dropdown "Dịch vụ"
const servicePages = {
    hotel: './pages/service/hotel.html',
    tour: './pages/service/tour.html',
    carrent: './pages/service/CarRent.html',
    transportation: './pages/service/transportation.html'
};

const buttons = [...document.querySelectorAll('[data-page]')];
const frame = document.querySelector('#module');
const nav = document.querySelector('#nav');
const menu = document.querySelector('#menu');


// ======================================
// 1. TỰ ĐỘNG ĐIỀU CHỈNH CHIỀU CAO IFRAME

function fitModuleHeight() {
    try {
        const doc = frame.contentDocument;

        if (!doc || !doc.body) return;

        const update = () => {
            requestAnimationFrame(() => {
                const height = Math.max(
                    doc.documentElement.scrollHeight,
                    doc.body.scrollHeight,
                    doc.documentElement.offsetHeight,
                    doc.body.offsetHeight
                );

                frame.style.height = height + 'px';
            });
        };

        if (frame._fitObserver) frame._fitObserver.disconnect();
        if (frame._fitMutations) frame._fitMutations.disconnect();

        frame._fitObserver = new ResizeObserver(update);
        frame._fitObserver.observe(doc.documentElement);
        frame._fitObserver.observe(doc.body);

        frame._fitMutations = new MutationObserver(update);
        frame._fitMutations.observe(doc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });

        doc.querySelectorAll('img').forEach(img => {
            img.addEventListener('load', update, { once: true });
        });

        update();

    } catch (error) {
        console.error('Không thể điều chỉnh chiều cao iframe:', error);
    }
}

frame.addEventListener('load', fitModuleHeight);


// ======================================
// 2. HÀM DÙNG CHUNG
// ======================================

function updateHeader(page) {
    const title = document.querySelector('#module-title');
    const kicker = document.querySelector('#module-kicker');

    if (title) title.textContent = page.title;
    if (kicker) kicker.textContent = page.kicker;
}

function setActive(name) {
    buttons.forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.page === name &&
            button.classList.contains('nav-link')
        );
    });
}

function closeMenu() {
    if (nav) nav.classList.remove('open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
}


// ======================================
// 3. HÀM ĐIỀU HƯỚNG TRANG
// ======================================

function openPage(name, auth = '') {
    const page = pages[name];

    if (!page) {
        console.error('Không tìm thấy trang:', name);
        return;
    }

    frame.src = page.src + (auth ? '#' + auth : '');

    updateHeader(page);
    setActive(name);
    closeMenu();

    history.replaceState(null, '', '#' + name + (auth ? '-' + auth : ''));
}


// ======================================
// 4. XỬ LÝ CÁC NÚT DATA-PAGE
// ======================================

buttons.forEach(button => {
    button.addEventListener('click', function (event) {
        event.preventDefault();

        const name = this.dataset.page;
        const auth = this.dataset.auth || '';

        openPage(name, auth);
    });
});


// ======================================
// 5. XỬ LÝ MENU DROPDOWN DỊCH VỤ
// ======================================

document.querySelectorAll('[data-service]').forEach(button => {
    button.addEventListener('click', function () {
        const target = servicePages[this.dataset.service];

        if (!target) {
            console.error('Không tìm thấy trang dịch vụ:', this.dataset.service);
            return;
        }

        frame.src = target;

        updateHeader(pages.services);
        setActive('services');
        closeMenu();

        history.replaceState(null, '', '#services-' + this.dataset.service);
    });
});


// ======================================
// 6. MENU MOBILE
// ======================================

if (menu && nav) {
    menu.addEventListener('click', () => {
        const opened = nav.classList.toggle('open');
        menu.setAttribute('aria-expanded', String(opened));
    });
}


// 7. KHÔI PHỤC TRANG THEO URL HASH

const [initial, sub = ''] = location.hash.slice(1).split('-');

if (initial === 'services' && servicePages[sub]) {
    frame.src = servicePages[sub];
    updateHeader(pages.services);
    setActive('services');
} else if (pages[initial]) {
    const auth = (sub === 'login' || sub === 'register') ? sub : '';
    openPage(initial, auth);
} else {
    openPage('explore');
}