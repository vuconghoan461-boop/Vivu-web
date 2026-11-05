
const pages = {
  explore: {
    title: 'Khám phá điểm đến',
    kicker: 'CẨM NANG DU LỊCH',
    src: 'pages/explore.html'
  },

  services: {
    title: 'Dịch vụ du lịch',
    kicker: 'TOUR · KHÁCH SẠN · THUÊ XE',
    src: 'pages/service/servicepage.html'
  },

  ai: {
    title: 'Trợ lý AI',
    kicker: 'AI TRIP DESIGNER',
    src: 'pages/AI planner/AI.html'
  },

  calendar: {
    title: 'Lịch của tôi',
    kicker: 'QUẢN LÝ HÀNH TRÌNH',
    src: 'pages/account/mycalendar/mycalendar.html'
  },

  account: {
    title: 'Tài khoản',
    kicker: 'HỒ SƠ · ĐẶT CHỖ · HỖ TRỢ',
    src: 'pages/account/login.html'
  }
};

const frame = document.querySelector('#module');
const nav = document.querySelector('#nav');
const menu = document.querySelector('#menu');
const buttons = [...document.querySelectorAll('[data-page]')];

if (!frame) {
  throw new Error('Không tìm thấy iframe #module');
}

// Cập nhật tiêu đề nếu HTML có khai báo hai ID này
function updateModuleInfo(page) {
  const title = document.querySelector('#module-title');
  const kicker = document.querySelector('#module-kicker');

  if (title) title.textContent = page.title;
  if (kicker) kicker.textContent = page.kicker;
}

// Đánh dấu menu đang hoạt động
function updateActiveMenu(name) {
  buttons.forEach(button => {
    const isActive =
      button.dataset.page === name &&
      button.classList.contains('nav-link');

    button.classList.toggle('active', isActive);
  });
}

// Đóng menu mobile
function closeMobileMenu() {
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
}

// Để trang ngoài là nơi cuộn duy nhất, iframe tự cao theo nội dung module.
function autoResizeIframe() {
  let resizeObserver;

  const updateVisibleModalArea = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc?.documentElement) return;

      const rect = frame.getBoundingClientRect();
      const visibleTop = Math.max(0, -rect.top);
      const visibleBottom = Math.min(rect.height, window.innerHeight - rect.top);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      doc.documentElement.style.setProperty('--outer-visible-top', `${visibleTop}px`);
      doc.documentElement.style.setProperty('--outer-visible-height', `${visibleHeight}px`);
    } catch (error) {
      console.warn('Không thể cập nhật vị trí hộp thoại:', error);
    }
  };

  const update = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc?.body || !doc.documentElement) return;

      const body = doc.body;
      const root = doc.documentElement;
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        root.scrollHeight,
        root.offsetHeight
      );

      frame.style.height = `${height}px`;
      updateVisibleModalArea();
    } catch (error) {
      console.warn('Không thể tự động điều chỉnh iframe:', error);
    }
  };

  const handleLoad = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc?.documentElement || !doc.body) return;

      // Bỏ chiều cao của module trước để trang ngắn (như AI) đo lại được.
      frame.style.height = '1px';
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(doc.documentElement);
      resizeObserver.observe(doc.body);

      if (!doc.querySelector('#outer-modal-viewport-style')) {
        const style = doc.createElement('style');
        style.id = 'outer-modal-viewport-style';
        style.textContent = `
          .modal-overlay {
            position: absolute !important;
            top: var(--outer-visible-top, 0px) !important;
            right: 0 !important;
            bottom: auto !important;
            left: 0 !important;
            height: var(--outer-visible-height, 100vh) !important;
            min-height: var(--outer-visible-height, 100vh) !important;
          }
          .booking-modal,
          .success-modal {
            max-height: calc(var(--outer-visible-height, 100vh) - 40px) !important;
          }
        `;
        doc.head.append(style);
      }

      doc.querySelectorAll('img').forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', update, { once: true });
          img.addEventListener('error', update, { once: true });
}
      });

      doc.fonts?.ready.then(update).catch(() => {});
      update();
    } catch (error) {
      console.warn('Không thể tự động điều chỉnh iframe:', error);
    }
  };

  frame.addEventListener('load', handleLoad);
  window.addEventListener('resize', update);
  window.addEventListener('scroll', updateVisibleModalArea, { passive: true });

  if (frame.contentDocument?.readyState === 'complete') handleLoad();
}

autoResizeIframe();

// Điều hướng module chính
function openPage(name, auth = '', saveHistory = true) {
  const page = pages[name];

  if (!page) {
    console.warn('Không tìm thấy module:', name);
    return;
  }

  frame.src = page.src + (auth ? '#' + auth : '');

  updateModuleInfo(page);
  updateActiveMenu(name);
  closeMobileMenu();

  if (saveHistory) {
    history.pushState(
      { page: name, auth },
      '',
      '#' + name + (auth ? '-' + auth : '')
    );
  }
}

// Điều hướng dịch vụ con
function openService(filename) {
  const page = pages.services;

  if (!page) return;

  const serviceFiles = [
    'hotel.html',
    'tour.html',
    'CarRent.html',
    'transportation.html'
  ];

  if (!serviceFiles.includes(filename)) {
    console.warn('Tên dịch vụ không hợp lệ:', filename);
    return;
  }

  frame.src = page.src.replace('servicepage.html', filename);

  updateModuleInfo(page);
  updateActiveMenu('services');
  closeMobileMenu();

  history.pushState(
    { page: 'services', service: filename },
    '',
    '#services'
  );
}

// Click menu chính
buttons.forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();

    const name = button.dataset.page;
    const auth = button.dataset.auth || '';

    openPage(name, auth);
  });
});

// Click dropdown dịch vụ
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    openService(button.dataset.service);
  });
});

// Menu mobile
menu?.addEventListener('click', () => {
  const opened = nav.classList.toggle('open');

  menu.setAttribute('aria-expanded', String(opened));
});

// Khôi phục trang khi bấm Back / Forward
window.addEventListener('popstate', event => {
  const state = event.state;

  if (state?.service) {
    openServiceFromHistory(state.service);
    return;
  }

  if (state?.page && pages[state.page]) {
    openPage(state.page, state.auth || '', false);
    return;
  }

  const name = location.hash.slice(1).split('-')[0];

  if (pages[name]) {
    const auth = location.hash.includes('-login')
      ? 'login'
      : location.hash.includes('-register')
        ? 'register'
        : '';

    openPage(name, auth, false);
  }
});

// Khôi phục trang dịch vụ từ lịch sử
function openServiceFromHistory(filename) {
  const page = pages.services;

  frame.src = page.src.replace('servicepage.html', filename);

  updateModuleInfo(page);
  updateActiveMenu('services');
  closeMobileMenu();
}

// Khởi tạo module ban đầu
function initializeApp() {
  const hash = location.hash.slice(1);
  const name = hash.split('-')[0];

  const auth = hash.includes('-login')
    ? 'login'
    : hash.includes('-register')
      ? 'register'
      : '';

  if (pages[name]) {
    openPage(name, auth, false);
  } else {
    updateModuleInfo(pages.explore);
    updateActiveMenu('explore');
  }
}

initializeApp();
