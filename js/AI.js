'use strict';
const $ = (id) => document.getElementById(id);
const MODEL = 'gemini-3.5-flash-lite';
const PREFS = ['Thiên nhiên', 'Ẩm thực', 'Check-in', 'Biển đảo', 'Săn mây', 'Văn hóa', 'Nghỉ dưỡng', 'Khám phá'];
const state = { prefs: ['Thiên nhiên', 'Ẩm thực'], dest: null, itin: null, inputs: null };
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* ---------- Gọi Gemini trực tiếp cho bản demo ---------- */
function getKey() {
  let key = localStorage.getItem('') || '';
  if (!key) {
    key = window.prompt('Nhập Gemini API key để dùng AI trong bản demo:') || '';
    key = key.trim();
    if (key) localStorage.setItem('', key);
  }
  return key;
}

async function askGemini(promptText) {
  const key = getKey();
  if (!key) throw new Error('Chưa nhập Gemini API key.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || `Gemini trả về lỗi HTTP ${response.status}.`);
  const text = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  if (!text) throw new Error('Gemini không trả về nội dung.');
  try { return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '')); }
  catch { throw new Error('Gemini trả về dữ liệu không đúng định dạng JSON.'); }
}

/* ---------- Dữ liệu mẫu (fallback khi không có key / AI lỗi) ---------- */
const MOCK_DEST = (i) => [
  { id: 'moc-chau', name: 'Mộc Châu', tagline: 'Thảo nguyên xanh mướt, đồi chè trái tim & hoa quả theo mùa', badge: 'Phù hợp nhất', costNumber: 3800000, estimatedCost: '~3.8 triệu / người', matchScores: [{ label: 'Thiên nhiên', percent: 95 }, { label: 'Ẩm thực', percent: 85 }, { label: 'Check-in', percent: 80 }], highlights: ['Đồi chè Trái Tim', 'Rừng thông Bản Áng', 'Thác Dải Yếm', 'Bê chao Mộc Châu'], imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', reasoning: `Bạn ưu tiên ${i.prefs.slice(0, 2).join(', ')}, đi ${i.duration} với ngân sách ${i.budget}. Mộc Châu có không khí trong lành, cảnh đẹp và di chuyển thuận tiện.` },
  { id: 'quy-nhon', name: 'Quy Nhơn', tagline: 'Eo Gió lộng gió, biển Kỳ Co xanh ngọc & hải sản tươi', badge: 'Biển đảo hấp dẫn', costNumber: 4200000, estimatedCost: '~4.2 triệu / người', matchScores: [{ label: 'Biển xanh', percent: 94 }, { label: 'Ẩm thực', percent: 88 }, { label: 'Nghỉ dưỡng', percent: 85 }], highlights: ['Kỳ Co', 'Eo Gió', 'Tháp Đôi', 'Bánh xèo tôm nhảy'], imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', reasoning: 'Kết hợp biển xanh hoang sơ với hải sản tươi ngon trong tầm ngân sách của bạn.' },
  { id: 'ta-xua', name: 'Tà Xùa', tagline: 'Sống lưng khủng long kỳ vĩ & đại dương mây bồng bềnh', badge: 'Săn mây cực chill', costNumber: 3200000, estimatedCost: '~3.2 triệu / người', matchScores: [{ label: 'Khám phá', percent: 96 }, { label: 'Thiên nhiên', percent: 92 }, { label: 'Check-in', percent: 90 }], highlights: ['Sống lưng khủng long', 'Mỏm cá heo', 'Cây cô đơn', 'Lẩu gà đen'], imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', reasoning: 'Dành cho người mê núi rừng Tây Bắc, săn mây buổi sớm với chi phí tiết kiệm.' },
];
function mockItinerary(d, i) {
  const total = d.costNumber || 3700000;
  const acts = [
    ['06:30', 'Khởi hành', `Xuất phát từ ${i.departure}`, i.departure, 'Di chuyển'],
    ['12:00', 'Ăn trưa đặc sản', 'Thưởng thức món địa phương', d.name, 'Ẩm thực'],
    ['15:00', 'Tham quan điểm nổi bật', d.highlights?.[0] || 'Điểm check-in', d.name, 'Tham quan'],
    ['19:00', 'Ăn tối & dạo phố', 'Thư giãn buổi tối', d.name, 'Ẩm thực'],
  ];
  const n = Math.max(2, parseInt(i.duration) || 3);
  return {
    destinationName: d.name, duration: i.duration, estimatedCostPerPerson: total,
    overview: { summary: d.tagline, bestTimeToVisit: 'Quanh năm, đẹp nhất vào mùa khô', suitableFor: i.companions, packingTips: ['Giày thoải mái', 'Áo khoác mỏng', 'Kem chống nắng', 'Sạc dự phòng'] },
    costBreakdown: [['Di chuyển', .16], ['Lưu trú', .30], ['Ăn uống', .32], ['Vé & Hoạt động', .15], ['Dự phòng', .07]].map(([category, r]) => ({ category, amount: Math.round(total * r / 1000) * 1000, details: '' })),
    days: Array.from({ length: n }, (_, k) => ({
      dayNumber: k + 1, title: k === 0 ? `${i.departure} → ${d.name}` : k === n - 1 ? 'Mua quà & về' : `Khám phá ${d.name}`,
      summary: '', activities: acts.map(([time, title, description, location, tag], j) => ({ id: `a${k}${j}`, time, title: k ? (d.highlights?.[(k + j) % 4] || title) : title, description, location, cost: '', tag })),
    })),
  };
}

/* ---------- UI ---------- */
function setStatus(msg, err = false) { const s = $('status'); s.hidden = !msg; s.textContent = msg || ''; s.className = 'status' + (err ? ' err' : ''); }
function readInputs() {
  return { prefs: state.prefs, duration: $('duration').value, budget: $('budget').value, companions: $('companions').value, transport: $('transport').value, departure: $('departure').value.trim() || 'Hà Nội', notes: $('notes').value.trim() };
}
function renderPrefs() {
  $('prefs').innerHTML = PREFS.map((p) => `<button type="button" class="chip" aria-pressed="${state.prefs.includes(p)}" data-p="${esc(p)}">${esc(p)}</button>`).join('');
}
function renderDest(list) {
  $('destList').innerHTML = list.map((d, idx) => `
    <article class="card"><img src="${esc(d.imageUrl)}" alt="${esc(d.name)}" loading="lazy">
      <div class="body"><span class="badge">${esc(d.badge)}</span><h3>${esc(d.name)}</h3><p class="muted" style="margin:0">${esc(d.tagline)}</p>
      <div class="score">${(d.matchScores || []).map((m) => `<span>${esc(m.label)} · ${+m.percent}%</span><div class="bar"><i style="width:${+m.percent}%"></i></div>`).join('')}</div>
      <p style="margin:0;font-size:.88rem">${esc(d.reasoning)}</p><div class="cost">${esc(d.estimatedCost)}</div>
      <button class="primary" data-i="${idx}">Xem lịch trình</button></div></article>`).join('');
  $('stepDest').hidden = false; $('stepDest').scrollIntoView({ behavior: 'smooth' });
  state.list = list;
}
function renderTrip(t) {
  const o = t.overview || {};
  $('trip').innerHTML = `
    <h2>${esc(t.destinationName)} · ${esc(t.duration)}</h2>
    <p class="muted">${esc(o.summary)}</p>
    <p><b>Chi phí ước tính:</b> ${money(t.estimatedCostPerPerson)} / người<br><b>Thời điểm đẹp:</b> ${esc(o.bestTimeToVisit)}<br><b>Phù hợp:</b> ${esc(o.suitableFor)}</p>
    <div class="tags">${(o.packingTips || []).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
    <h3 style="margin-top:16px">Chi phí chi tiết</h3>
    <table>${(t.costBreakdown || []).map((c) => `<tr><td>${esc(c.category)}${c.details ? `<br><small class="muted">${esc(c.details)}</small>` : ''}</td><td>${money(c.amount)}</td></tr>`).join('')}</table>
    ${(t.days || []).map((d) => `<div class="day"><h3>Ngày ${+d.dayNumber}: ${esc(d.title)}</h3>${d.summary ? `<p class="muted">${esc(d.summary)}</p>` : ''}
      ${(d.activities || []).map((a) => `<div class="act"><time>${esc(a.time)}</time><div><b>${esc(a.title)}</b> ${a.tag ? `<span class="badge">${esc(a.tag)}</span>` : ''}<br>${esc(a.description)}<br><small>${esc(a.location)}${a.cost ? ' · ' + esc(a.cost) : ''}</small></div></div>`).join('')}</div>`).join('')}`;
  $('stepTrip').hidden = false; $('changes').innerHTML = '';
}

/* ---------- Luồng chính ---------- */
async function suggest(e) {
  e.preventDefault();
  const i = state.inputs = readInputs(), btn = e.submitter; btn.disabled = true;
  setStatus('AI đang chọn điểm đến phù hợp...');
  $('stepTrip').hidden = true;
  try {
    const prompt = `Bạn là chuyên gia tư vấn du lịch của VivuGo. Dựa trên tiêu chí sau, gợi ý đúng 3 điểm đến thực tế tại Việt Nam. Ước tính chi phí, không khẳng định giá theo thời gian thực. Chỉ trả về JSON array.\nTiêu chí: ${JSON.stringify(i)}\nMỗi phần tử gồm: {"id":"slug","name":"tên","tagline":"mô tả ngắn","badge":"nhãn","matchScores":[{"label":"tiêu chí","percent":90}],"estimatedCost":"~3.7 triệu / người","costNumber":3700000,"highlights":["4 điểm nổi bật"],"imageUrl":"URL ảnh https://images.unsplash.com/...","reasoning":"lý do phù hợp"}.`;
    const ai = await askGemini(prompt);
    if (!Array.isArray(ai) || ai.length < 1) throw new Error('Gemini chưa trả về danh sách điểm đến.');
    renderDest(ai);
    setStatus('');
  } catch (error) {
    console.error(error);
    renderDest(MOCK_DEST(i));
    setStatus(`${error.message} Đang hiển thị dữ liệu mẫu.`, true);
  } finally { btn.disabled = false; }
}
async function pickDest(d) {
  const i = state.inputs || readInputs(); state.dest = d;
  setStatus(`AI đang thiết kế lịch trình ${d.name}...`);
  try {
    const prompt = `Bạn là chuyên gia thiết kế lịch trình du lịch Việt Nam. Tạo lịch trình phù hợp với dữ liệu sau, không khẳng định giá/lịch mở cửa theo thời gian thực. Chỉ trả về JSON object.\nTiêu chí chuyến đi: ${JSON.stringify(i)}\nĐiểm đến đã chọn: ${JSON.stringify(d)}\nCấu trúc: {"destinationName":"","duration":"","estimatedCostPerPerson":0,"overview":{"summary":"","bestTimeToVisit":"","suitableFor":"","packingTips":["4 gợi ý"]},"costBreakdown":[{"category":"","amount":0,"details":""}],"days":[{"dayNumber":1,"title":"","summary":"","activities":[{"id":"","time":"06:30","title":"","description":"","location":"","cost":"","tag":""}]}]}.`;
    state.itin = await askGemini(prompt);
    if (!Array.isArray(state.itin.days)) throw new Error('Gemini chưa trả về lịch trình hợp lệ.');
    renderTrip(state.itin); setStatus('');
  } catch (error) {
    console.error(error);
    state.itin = mockItinerary(d, i);
    renderTrip(state.itin); setStatus(`${error.message} Đang hiển thị lịch trình mẫu.`, true);
  }
  $('stepTrip').scrollIntoView({ behavior: 'smooth' });
}
async function customize() {
  const btn = $('customBtn'), v = (id) => +$(id).value, up = $('userPrompt').value.trim();
  btn.disabled = true; setStatus('AI đang điều chỉnh lịch trình...');
  let bullets, msg;
  try {
    const prompt = `Bạn là AI Trip Designer của VivuGo. Điều chỉnh lịch trình theo các thanh và yêu cầu, giữ cấu trúc JSON. Phong cách=${v('sStyle')}, chi tiêu=${v('sSpend')}, nhịp độ=${v('sPace')}, yêu cầu thêm=${JSON.stringify(up)}.\nLịch trình hiện tại: ${JSON.stringify(state.itin)}\nTrả về JSON object: {"updatedItinerary":{"destinationName":"","duration":"","estimatedCostPerPerson":0,"overview":{"summary":"","bestTimeToVisit":"","suitableFor":"","packingTips":[]},"costBreakdown":[{"category":"","amount":0,"details":""}],"days":[{"dayNumber":1,"title":"","summary":"","activities":[{"id":"","time":"","title":"","description":"","location":"","cost":"","tag":""}]}]},"summaryBullets":["3 thay đổi"],"aiMessage":"một câu thân thiện"}.`;
    const ai = await askGemini(prompt);
    if (!ai.updatedItinerary) throw new Error('Gemini chưa trả về lịch trình đã điều chỉnh.');
    state.itin = ai.updatedItinerary; bullets = ai.summaryBullets; msg = ai.aiMessage; setStatus('');
  } catch (error) {
    console.error(error);
    const t = state.itin;
    if (/tiết kiệm/i.test(up) || v('sSpend') < 40) t.estimatedCostPerPerson = Math.max(2500000, (t.estimatedCostPerPerson || 3700000) - 500000);
    bullets = ['Điều chỉnh nhịp độ chuyến đi', 'Cập nhật gợi ý ăn uống phù hợp', 'Tối ưu thời gian nghỉ ngơi']; msg = 'Đã áp dụng điều chỉnh cơ bản (chưa dùng được AI).';
    setStatus(`${error.message} Đã áp dụng điều chỉnh cơ bản.`, true);
  }
  renderTrip(state.itin);
  $('changes').innerHTML = `<p><b>${esc(msg)}</b></p><ul>${(bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
  btn.disabled = false;
}

/* ---------- Sự kiện ---------- */
$('prefs').addEventListener('click', (e) => {
  const p = e.target.dataset.p; if (!p) return;
  state.prefs = state.prefs.includes(p) ? state.prefs.filter((x) => x !== p) : [...state.prefs, p];
  renderPrefs();
});
$('form').addEventListener('submit', suggest);
$('destList').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) pickDest(state.list[+b.dataset.i]); });
$('customBtn').addEventListener('click', customize);

renderPrefs();
