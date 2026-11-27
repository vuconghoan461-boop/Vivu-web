/* ===== Trang cá nhân & Bài viết của tôi (js/account.js) – dùng js/userLogic.js ===== */
const $ = id => document.getElementById(id);

function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

function formatDateVN(iso) {
    if (!iso || !iso.includes('-')) return 'Chưa cập nhật';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function toLogin() {
    const loginUrl = new URL('login.html', location.href).href;
    let next = '';
    try { next = '?next=' + encodeURIComponent(window.top.location.origin + window.top.location.pathname + '?page=account'); } catch {}
    window.top.location.replace(loginUrl + next);
}

function getAvatarHtml(u) {
    const first = (u.name || 'U').trim().split(/\s+/).pop();
    return u.avatar
        ? `<img src="${u.avatar}" alt="${escapeHtml(u.name)}">`
        : escapeHtml(first[0].toUpperCase());
}

/* 1. KIỂM TRA ĐĂNG NHẬP */
let user = VivuUser.getCurrentUser();
if (!user) {
    toLogin();
} else {
    renderAll();
    $('profile').hidden = false;
}

/* 2. RENDER TOÀN BỘ GIAO DIỆN (TỰ PHÂN BIỆT NICK DEMO VÀ NICK MỚI) */
function renderAll() {
    const first = (user.name || 'U').trim().split(/\s+/).pop();
    const trips = user.trips || [];
    const styles = user.styles || [];
    const posts = user.posts || [];

    // Avatar & Ảnh bìa
    if (user.avatar) {
        $('avatarImg').src = user.avatar;
        $('avatarImg').hidden = false;
        $('avatarLetter').hidden = true;
    } else {
        $('avatarLetter').textContent = first[0].toUpperCase();
        $('avatarLetter').hidden = false;
        $('avatarImg').hidden = true;
    }

    $('coverBox').style.backgroundImage = user.cover
        ? `linear-gradient(135deg, rgba(11,61,99,.25), rgba(1,125,229,.18)), url("${user.cover}")`
        : '';

    const miniHtml = getAvatarHtml(user);
    $('composerAva').innerHTML = miniHtml;
    $('modalPostAva').innerHTML = miniHtml;
    $('modalPostAuthor').textContent = user.name;

    // Phần đầu trang
    $('pName').textContent = user.name;
    $('pSubMeta').textContent = user.city ? `${user.email} · ${user.city}` : user.email;
    $('pBio').textContent = user.bio || 'Thành viên mới của cộng đồng du lịch VivuGo.';

    // Cột Giới thiệu nhanh (Tab Bài viết)
    $('tabPostCount').textContent = posts.length;
    $('sideBio').textContent = user.bio || 'Chưa có lời giới thiệu. Bấm "Sửa" để thêm mô tả ngắn về bạn.';
    $('sideCity').textContent = user.city || 'Chưa cập nhật';
    $('sideTrips').textContent = `${trips.length} chuyến đi`;
    $('sideStyles').textContent = styles.length ? `${styles.length} sở thích` : 'Chưa chọn';
    $('sideJoined').textContent = user.joined || 'Mới tham gia';

    // Thẻ thống kê (Tab Thông tin)
    $('statTrips').textContent = `${trips.length} chuyến đi`;
    $('statStylesCount').textContent = `${styles.length} sở thích`;
    $('statCity').textContent = user.city || 'Chưa cập nhật';

    // Chuyến đi gần nhất: CHỈ hiện khi tài khoản có trips (nick mới sẽ ẩn hoàn toàn)
    if (trips.length > 0) {
        const recent = trips[0];
        const datesText = `${formatDateVN(recent.startDate)} – ${formatDateVN(recent.endDate)}`;
        $('recentTripCard').hidden = false;
        $('recentName').textContent = recent.name;
        $('recentPlace').textContent = recent.place;
        $('recentDates').textContent = datesText;
        $('recentStatus').textContent = recent.status || 'Sắp khởi hành';

        $('sideRecentBox').hidden = false;
        $('sideRecentName').textContent = recent.name;
        $('sideRecentMeta').textContent = `${datesText} · ${recent.place}`;
    } else {
        $('recentTripCard').hidden = true;
        $('sideRecentBox').hidden = true;
    }

    // Hồ sơ chi tiết
    $('iName').textContent = user.name;
    $('iEmail').textContent = user.email;
    $('iPhone').textContent = user.phone || 'Chưa cập nhật';
    $('iDob').textContent = formatDateVN(user.dob);
    $('iGender').textContent = user.gender || 'Chưa cập nhật';
    $('iCity').textContent = user.city || 'Chưa cập nhật';
    $('iIdCard').textContent = user.idCard || 'Chưa cập nhật';
    $('iJoined').textContent = user.joined || 'Mới tham gia';

    // Đổ dữ liệu vào form sửa hồ sơ
    $('eName').value = user.name || '';
    $('eEmail').value = user.email || '';
    $('ePhone').value = user.phone || '';
    $('eDob').value = user.dob || '';
    $('eGender').value = user.gender || '';
    $('eCity').value = user.city || '';
    $('eIdCard').value = user.idCard || '';
    $('eBio').value = user.bio || '';

    // Sở thích du lịch
    document.querySelectorAll('#styleChips .chip').forEach(btn => {
        btn.classList.toggle('active', styles.includes(btn.dataset.style));
    });
    $('prefBudget').value = user.budget || '';
    $('prefStay').value = user.stay || '';
    $('prefTransport').value = user.transport || '';

    renderPosts();
}

/* 3. HIỂN THỊ DANH SÁCH BÀI VIẾT CỦA TÔI */
function renderPosts() {
    const listEl = $('postsList');
    const posts = user.posts || [];

    if (!posts.length) {
        listEl.innerHTML = `
            <div class="panel empty-posts">
                <i class="fa-regular fa-images"></i>
                <h4>Chưa có bài viết nào</h4>
                <p>Hãy chia sẻ chuyến đi, món ăn ngon hoặc khoảnh khắc đáng nhớ đầu tiên của bạn!</p>
                <button type="button" class="btn-edit" id="emptyCreatePostBtn">
                    <i class="fa-solid fa-plus"></i> Thêm bài viết đầu tiên
                </button>
            </div>
        `;
        $('emptyCreatePostBtn').onclick = () => openPostModal();
        return;
    }

    const avaHtml = getAvatarHtml(user);
    listEl.innerHTML = posts.map(p => `
        <article class="panel post-card" data-post-id="${escapeHtml(p.id)}">
            <div class="post-head">
                <div class="mini-ava">${avaHtml}</div>
                <div class="post-author">
                    <b>${escapeHtml(user.name)}</b>
                    <small>${escapeHtml(p.createdAt)} · <i class="fa-solid fa-earth-asia"></i></small>
                </div>
                <button type="button" class="btn-del-post" data-action="delete" title="Xóa bài viết">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
            <h4 class="post-title">${escapeHtml(p.title)}</h4>
            <p class="post-content">${escapeHtml(p.content)}</p>
            ${p.image ? `<img class="post-img" src="${p.image}" alt="${escapeHtml(p.title)}">` : ''}
            <div class="post-footer">
                <button type="button" class="btn-like ${p.liked ? 'liked' : ''}" data-action="like">
                    <i class="${p.liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    <span>${p.liked ? 'Đã thích' : 'Thích'} (${p.likes || 0})</span>
                </button>
            </div>
        </article>
    `).join('');

    listEl.querySelectorAll('.post-card').forEach(card => {
        const id = card.dataset.postId;
        card.querySelector('[data-action="like"]').onclick = () => {
            const res = VivuUser.toggleLikePost(user, id);
            if (res.ok) { user = res.user; renderPosts(); }
        };
        card.querySelector('[data-action="delete"]').onclick = () => {
            if (!confirm('Bạn có chắc muốn xóa bài viết này không?')) return;
            const res = VivuUser.deletePost(user, id);
            if (res.ok) {
                user = res.user;
                renderAll();
                toast('Đã xóa bài viết.');
            }
        };
    });
}

/* 4. MODAL THÊM BÀI VIẾT KIỂU FACEBOOK (TIÊU ĐỀ + NỘI DUNG + HÌNH ẢNH) */
const postModal = $('postModal');
let draftPostImage = '';

function openPostModal(pickPhotoRightAway = false) {
    $('postForm').reset();
    $('postErr').textContent = '';
    draftPostImage = '';
    $('postImgPreviewWrap').hidden = true;
    $('postImgPreview').src = '';
    postModal.hidden = false;
    $('postTitle').focus();
    if (pickPhotoRightAway) $('postImageInput').click();
}

function closePostModal() {
    postModal.hidden = true;
}

$('openPostModalTop').onclick = () => openPostModal();
$('composerTrigger').onclick = () => openPostModal();
$('composerAddBtn').onclick = () => openPostModal();
$('composerPhotoBtn').onclick = () => openPostModal(true);
$('closePostModal').onclick = closePostModal;
$('cancelPostModal').onclick = closePostModal;
postModal.onclick = e => { if (e.target === postModal) closePostModal(); };

$('pickPostImgBtn').onclick = () => $('postImageInput').click();
$('removePostImgBtn').onclick = () => {
    draftPostImage = '';
    $('postImageInput').value = '';
    $('postImgPreviewWrap').hidden = true;
    $('postImgPreview').src = '';
};

$('postImageInput').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return toast('Vui lòng chọn đúng định dạng tệp ảnh.');
    try {
        draftPostImage = await VivuUser.compressImage(file, 960, 720, 0.78);
        $('postImgPreview').src = draftPostImage;
        $('postImgPreviewWrap').hidden = false;
    } catch {
        toast('Không thể đọc ảnh này, vui lòng thử ảnh khác.');
    }
};

$('postForm').onsubmit = e => {
    e.preventDefault();
    const title = $('postTitle').value.trim();
    const content = $('postContent').value.trim();
    if (!title) return ($('postErr').textContent = 'Vui lòng nhập tiêu đề bài viết.');
    if (!content) return ($('postErr').textContent = 'Vui lòng nhập nội dung bài viết.');

    const res = VivuUser.addPost(user, { title, content, image: draftPostImage });
    if (!res.ok) return ($('postErr').textContent = res.error);

    user = res.user;
    closePostModal();
    showTab('posts');
    renderAll();
    toast('Đã đăng bài viết mới thành công!');
};

/* 5. TẢI ẢNH ĐẠI DIỆN & ẢNH BÌA */
$('uploadAvatarBtn').onclick = () => $('avatarInput').click();
$('avatarInput').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return toast('Vui lòng chọn đúng định dạng tệp ảnh.');
    try {
        const dataUrl = await VivuUser.compressImage(file, 320, 320, 0.84);
        const updated = { ...user, avatar: dataUrl };
        const res = VivuUser.updateCurrentUser(updated);
        if (!res.ok) return toast(res.error);
        user = updated;
        renderAll();
        toast('Đã cập nhật ảnh đại diện!');
    } catch { toast('Không thể đọc ảnh này.'); }
};

$('uploadCoverBtn').onclick = () => $('coverInput').click();
$('coverInput').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return toast('Vui lòng chọn đúng định dạng tệp ảnh.');
    try {
        const dataUrl = await VivuUser.compressImage(file, 1280, 420, 0.8);
        const updated = { ...user, cover: dataUrl };
        const res = VivuUser.updateCurrentUser(updated);
        if (!res.ok) return toast(res.error);
        user = updated;
        renderAll();
        toast('Đã cập nhật ảnh bìa!');
    } catch { toast('Không thể đọc ảnh này.'); }
};

/* 6. CHUYỂN TAB */
const cal = $('calFrame');
function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $('panel-posts').hidden = name !== 'posts';
    $('panel-info').hidden = name !== 'info';
    $('panel-calendar').hidden = name !== 'calendar';
    if (name === 'calendar' && !cal.getAttribute('src')) cal.src = cal.dataset.src;
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));
$('goCalendarBtn').onclick = () => showTab('calendar');
$('sideGoCalBtn').onclick = () => showTab('calendar');
if (location.hash === '#calendar') showTab('calendar');
window.addEventListener('hashchange', () => {
    if (location.hash === '#calendar') showTab('calendar');
});

cal.addEventListener('load', () => {
    try {
        const st = cal.contentDocument.createElement('style');
        st.textContent = '.site-header, .navbar, .topbar, .main-header, header.header, .footer { display: none !important; }';
        cal.contentDocument.head.appendChild(st);
    } catch {}
});

/* 7. CHỈNH SỬA HỒ SƠ & SỞ THÍCH */
function toggleEdit(open) {
    if (open) showTab('info');
    $('infoView').hidden = open;
    $('infoForm').hidden = !open;
    $('inlineEditBtn').hidden = open;
    if (open) $('eName').focus();
}
$('editProfileBtn').onclick = () => toggleEdit(true);
$('sideEditBtn').onclick = () => toggleEdit(true);
$('inlineEditBtn').onclick = () => toggleEdit(true);
$('cancelEditBtn').onclick = () => { renderAll(); toggleEdit(false); };

$('infoForm').onsubmit = e => {
    e.preventDefault();
    const oldEmail = user.email;
    const newName = $('eName').value.trim();
    const newEmail = $('eEmail').value.trim();
    if (newName.length < 2) return toast('Họ và tên phải có ít nhất 2 ký tự.');
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) return toast('Email không đúng định dạng.');

    const updated = {
        ...user,
        name: newName,
        email: newEmail,
        phone: $('ePhone').value.trim(),
        dob: $('eDob').value,
        gender: $('eGender').value,
        city: $('eCity').value.trim(),
        idCard: $('eIdCard').value.trim(),
        bio: $('eBio').value.trim()
    };
    const res = VivuUser.updateCurrentUser(updated, oldEmail);
    if (!res.ok) return toast(res.error);
    user = updated;
    renderAll();
    toggleEdit(false);
    toast('Đã lưu thông tin cá nhân!');
};

document.querySelectorAll('#styleChips .chip').forEach(btn => {
    btn.onclick = () => {
        const val = btn.dataset.style;
        const set = new Set(user.styles || []);
        if (set.has(val)) set.delete(val); else set.add(val);
        const updated = { ...user, styles: [...set] };
        const res = VivuUser.updateCurrentUser(updated);
        if (res.ok) { user = updated; renderAll(); toast('Đã cập nhật sở thích!'); }
    };
});

['prefBudget', 'prefStay', 'prefTransport'].forEach(id => {
    $(id).onchange = () => {
        const updated = {
            ...user,
            budget: $('prefBudget').value,
            stay: $('prefStay').value,
            transport: $('prefTransport').value
        };
        const res = VivuUser.updateCurrentUser(updated);
        if (res.ok) { user = updated; toast('Đã lưu tùy chọn cá nhân hóa!'); }
    };
});

/* 8. ĐỔI MẬT KHẨU & ĐĂNG XUẤT */
const passModal = $('passModal');
$('changePassBtn').onclick = () => { $('passForm').reset(); $('passErr').textContent = ''; passModal.hidden = false; };
$('closePassModal').onclick = () => { passModal.hidden = true; };
$('cancelPassModal').onclick = () => { passModal.hidden = true; };
passModal.onclick = e => { if (e.target === passModal) passModal.hidden = true; };

$('passForm').onsubmit = e => {
    e.preventDefault();
    const oldP = $('oldPass').value;
    const newP = $('newPass').value;
    const newP2 = $('newPass2').value;
    if (user.pass && oldP !== user.pass) return ($('passErr').textContent = 'Mật khẩu hiện tại chưa chính xác.');
    if (newP.length < 8) return ($('passErr').textContent = 'Mật khẩu mới phải có tối thiểu 8 ký tự.');
    if (newP !== newP2) return ($('passErr').textContent = 'Xác nhận mật khẩu mới không khớp.');

    const updated = { ...user, pass: newP };
    const res = VivuUser.updateCurrentUser(updated);
    if (res.ok) { user = updated; passModal.hidden = true; toast('Đổi mật khẩu thành công!'); }
};

$('logoutBtn').onclick = () => {
    VivuUser.logout();
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'vivugo:auth', action: 'logout' }, '*');
    } else {
        toLogin();
    }
};