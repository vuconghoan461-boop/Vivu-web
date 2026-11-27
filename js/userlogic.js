/* ===== VivuGo – Dữ liệu & Logic Người dùng (js/userLogic.js) ===== */
(function (global) {
    const KEY_SESSION = 'vg_user';
    const KEY_USERS = 'vg_users';
    const KEY_VER = 'vg_users_ver';

    /* Mẹo quan trọng: Sau này mỗi lần bạn sửa nội dung 2 tài khoản bên dưới,
       hãy đổi số phiên bản này (ví dụ 'v1' -> 'v2') để trình duyệt tự cập nhật dữ liệu mới */
    const DATA_VERSION = 'v1';

    /* =====================================================================
       KHU VỰC DỮ LIỆU 2 TÀI KHOẢN MẶC ĐỊNH (BẠN SỬA NỘI DUNG TẠI ĐÂY)
       ===================================================================== */
    const USERS_DATA = [
        // 1. TÀI KHOẢN DEMO MẪU (Có đầy đủ thông tin, chuyến đi, sở thích, bài viết)
        {
            id: 'u_demo_01',
            isDemo: true,
            name: 'Phạm Anh Tú',
            email: 'demo@vivugo.vn',
            phone: '0900000000',
            pass: '12345678',
            dob: '2006-05-15',
            gender: 'Nam',
            city: 'Hà Nội',
            idCard: '001206******',
            bio: 'Yêu thích du lịch tự túc, săn cảnh đẹp và khám phá ẩm thực địa phương.',
            avatar: '',
            cover: '',
            joined: '10/2026',
            styles: ['Biển đảo', 'Nghỉ dưỡng', 'Ẩm thực', 'Khám phá thiên nhiên', 'Du lịch tự túc'],
            budget: 'Trung bình (3 – 8 triệu)',
            stay: 'Khách sạn 3–4 sao',
            transport: 'Máy bay',
            trips: [
                { name: 'Đà Nẵng – Hội An', place: 'Đà Nẵng, Hội An', startDate: '2026-10-20', endDate: '2026-10-24', status: 'Đã hoàn thành' },
                { name: 'Sapa săn mây cuối tuần', place: 'Lào Cai', startDate: '2026-11-12', endDate: '2026-11-15', status: 'Đã hoàn thành' },
                { name: 'Phú Quốc nghỉ dưỡng', place: 'Kiên Giang', startDate: '2026-12-18', endDate: '2026-12-21', status: 'Sắp khởi hành' },
                { name: 'Đà Lạt đón năm mới', place: 'Lâm Đồng', startDate: '2027-01-01', endDate: '2027-01-04', status: 'Sắp khởi hành' }
            ],
            posts: [
                {
                    id: 'p_demo_01',
                    title: 'Kinh nghiệm đi Đà Nẵng – Hội An 4 ngày 3 đêm cực chill',
                    content: 'Chuyến đi đáng nhớ nhất năm! Buổi sáng dạo biển Mỹ Khê, chiều chạy xe vào phố cổ Hội An ngắm đèn lồng và ăn cao lầu.',
                    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=900&q=75',
                    createdAt: '20/10/2026 · 19:30',
                    likes: 12,
                    liked: false
                }
            ]
        },

        // 2. TÀI KHOẢN MỚI TRẮNG TINH (Không chuyến đi, không sở thích, không bài viết)
        {
            id: 'u_new_02',
            isDemo: false,
            name: 'Người dùng mới',
            email: 'new@vivugo.vn',
            phone: '',
            pass: '12345678',
            dob: '',
            gender: '',
            city: '',
            idCard: '',
            bio: '',
            avatar: '',
            cover: '',
            joined: '11/2026',
            styles: [],
            budget: '',
            stay: '',
            transport: '',
            trips: [],
            posts: []
        }
    ];

    /* =====================================================================
       PHẦN LOGIC XỬ LÝ (KHÔNG CẦN SỬA KHI THAY ĐỔI NỘI DUNG TÀI KHOẢN)
       ===================================================================== */
    const clone = obj => JSON.parse(JSON.stringify(obj));

    function createEmptyUser({ name, email, phone = '', pass = '', provider = '' }) {
        const now = new Date();
        const joined = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        return {
            id: 'u_' + Date.now(),
            isDemo: false,
            provider,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            pass,
            dob: '',
            gender: '',
            city: '',
            idCard: '',
            bio: '',
            avatar: '',
            cover: '',
            joined,
            styles: [],
            budget: '',
            stay: '',
            transport: '',
            trips: [],
            posts: []
        };
    }

    function readJson(storage, key, fallback) {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    /* Nạp danh sách tài khoản từ localStorage (tự đồng bộ nếu đổi DATA_VERSION) */
    function getUsers() {
        let list = readJson(localStorage, KEY_USERS, null);
        const savedVer = localStorage.getItem(KEY_VER);

        if (!Array.isArray(list) || !list.length) {
            list = clone(USERS_DATA);
            localStorage.setItem(KEY_USERS, JSON.stringify(list));
            localStorage.setItem(KEY_VER, DATA_VERSION);
            return list;
        }

        if (savedVer !== DATA_VERSION) {
            // Cập nhật lại 2 tài khoản gốc theo USERS_DATA mới sửa, vẫn giữ các nick người dùng tự đăng ký thêm
            const seedEmails = new Set(USERS_DATA.map(u => u.email));
            const extraUsers = list.filter(u => !seedEmails.has(u.email));
            list = [...clone(USERS_DATA), ...extraUsers];
            localStorage.setItem(KEY_USERS, JSON.stringify(list));
            localStorage.setItem(KEY_VER, DATA_VERSION);
        }

        return list;
    }

    function getCurrentUser() {
        const session = readJson(localStorage, KEY_SESSION, null) || readJson(sessionStorage, KEY_SESSION, null);
        if (!session) return null;

        const found = getUsers().find(u => u.email === session.email);
        if (found) {
            return { styles: [], trips: [], posts: [], ...found };
        }
        return { isDemo: false, styles: [], trips: [], posts: [], ...session };
    }

    function setSession(user, remember = true) {
        if (remember) {
            localStorage.setItem(KEY_SESSION, JSON.stringify(user));
            sessionStorage.removeItem(KEY_SESSION);
        } else {
            sessionStorage.setItem(KEY_SESSION, JSON.stringify(user));
            localStorage.removeItem(KEY_SESSION);
        }
    }

    function registerUser({ name, email, phone, pass }) {
        const users = getUsers();
        const newUser = createEmptyUser({ name, email, phone, pass });
        users.push(newUser);
        localStorage.setItem(KEY_USERS, JSON.stringify(users));
        setSession(newUser, true);
        return newUser;
    }

    function loginUser(identifier, pass, remember = true) {
        const id = identifier.trim();
        const user = getUsers().find(u => (u.email === id || (u.phone && u.phone === id)) && u.pass === pass);
        if (!user) return null;
        setSession(user, remember);
        return user;
    }

    function loginSocial({ name, email, provider }) {
        const users = getUsers();
        let user = users.find(u => u.email === email);
        if (!user) {
            user = createEmptyUser({ name, email, provider });
            users.push(user);
            localStorage.setItem(KEY_USERS, JSON.stringify(users));
        }
        setSession(user, true);
        return user;
    }

    function updateCurrentUser(updated, oldEmail) {
        try {
            const remember = !!localStorage.getItem(KEY_SESSION);
            setSession(updated, remember);

            const users = getUsers();
            const targetEmail = oldEmail || updated.email;
            const idx = users.findIndex(u => u.email === targetEmail);
            if (idx !== -1) users[idx] = { ...users[idx], ...updated };
            else users.push(updated);

            localStorage.setItem(KEY_USERS, JSON.stringify(users));

            if (global.parent !== global) {
                global.parent.postMessage({ type: 'vivugo:auth', action: 'update', user: updated }, '*');
            }
            return { ok: true };
        } catch {
            return { ok: false, error: 'Dung lượng bộ nhớ trình duyệt đã đầy, hãy chọn ảnh nhẹ hơn.' };
        }
    }

    function addPost(user, { title, content, image = '' }) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const createdAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const newPost = {
            id: 'p_' + Date.now(),
            title: title.trim(),
            content: content.trim(),
            image,
            createdAt,
            likes: 0,
            liked: false
        };

        const updated = { ...user, posts: [newPost, ...(user.posts || [])] };
        const res = updateCurrentUser(updated);
        return { ...res, user: updated, post: newPost };
    }

    function deletePost(user, postId) {
        const updated = { ...user, posts: (user.posts || []).filter(p => p.id !== postId) };
        const res = updateCurrentUser(updated);
        return { ...res, user: updated };
    }

    function toggleLikePost(user, postId) {
        const posts = (user.posts || []).map(p => {
            if (p.id !== postId) return p;
            const liked = !p.liked;
            return { ...p, liked, likes: Math.max(0, (p.likes || 0) + (liked ? 1 : -1)) };
        });
        const updated = { ...user, posts };
        const res = updateCurrentUser(updated);
        return { ...res, user: updated };
    }

    function logout() {
        localStorage.removeItem(KEY_SESSION);
        sessionStorage.removeItem(KEY_SESSION);
    }

    function compressImage(file, maxW = 900, maxH = 900, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * ratio);
                    canvas.height = Math.round(img.height * ratio);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = ev.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    global.VivuUser = {
        getUsers,
        getCurrentUser,
        registerUser,
        loginUser,
        loginSocial,
        updateCurrentUser,
        addPost,
        deletePost,
        toggleLikePost,
        logout,
        compressImage
    };
})(window);