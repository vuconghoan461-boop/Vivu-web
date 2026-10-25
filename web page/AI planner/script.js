'use strict';
const $ = (id) => document.getElementById(id);
const MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite']; // thử lần lượt nếu model quá tải
const PREFS = ['Thiên nhiên', 'Ẩm thực', 'Check-in', 'Biển đảo', 'Săn mây', 'Văn hóa', 'Nghỉ dưỡng', 'Khám phá'];
const state = { prefs: ['Thiên nhiên', 'Ẩm thực'], dest: null, itin: null, inputs: null };
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getKey = () => localStorage.getItem('GEMINI_API_KEY') || '';

/* ---------- Gemini (gọi trực tiếp từ trình duyệt) ---------- */
async function askGemini(prompt) {
  const key = getKey();
  if (!key) return null;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      });
      if (!res.ok) { console.warn('Gemini', model, res.status); continue; }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
    } catch (e) { console.warn('Gemini lỗi', model, e); }
  }
  return null;
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
  const prompt = `Bạn là chuyên gia tư vấn du lịch của VivuGo. Người dùng: sở thích ${i.prefs.join(', ') || 'Thiên nhiên'}; ${i.duration}; ngân sách ${i.budget}/người; đi cùng ${i.companions}; phương tiện ${i.transport}; xuất phát ${i.departure}.${i.notes ? ' Yêu cầu đặc biệt: ' + i.notes : ''}
Gợi ý đúng 3 điểm đến tại Việt Nam. Trả về JSON array, mỗi phần tử: {"id","name","tagline","badge","matchScores":[{"label","percent"}x3],"estimatedCost":"~3.7 triệu / người","costNumber":3700000,"highlights":[4 chuỗi],"imageUrl":"https://images.unsplash.com/...","reasoning":"2-3 câu"}`;
  const ai = await askGemini(prompt);
  const ok = Array.isArray(ai) && ai.length;
  renderDest(ok ? ai : MOCK_DEST(i));
  setStatus(ok ? '' : (getKey() ? 'AI đang bận, đã dùng dữ liệu mẫu.' : 'Chưa có API key, đang dùng dữ liệu mẫu.'), !ok && !!getKey());
  btn.disabled = false;
}
async function pickDest(d) {
  const i = state.inputs || readInputs(); state.dest = d;
  setStatus(`AI đang thiết kế lịch trình ${d.name}...`);
  const prompt = `Bạn là chuyên gia thiết kế lịch trình của VivuGo. Tạo lịch trình chi tiết: điểm đến ${d.name}; ${i.duration}; ngân sách ${i.budget}/người; sở thích ${i.prefs.join(', ')}; đi cùng ${i.companions}; phương tiện ${i.transport}; xuất phát ${i.departure}.
Trả về JSON object: {"destinationName","duration","estimatedCostPerPerson":number,"overview":{"summary","bestTimeToVisit","suitableFor","packingTips":[4]},"costBreakdown":[{"category","amount":number,"details"}],"days":[{"dayNumber":number,"title","summary","activities":[{"id","time":"06:30","title","description","location","cost","tag"}]}]}`;
  const ai = await askGemini(prompt);
  const ok = ai && Array.isArray(ai.days);
  state.itin = ok ? ai : mockItinerary(d, i);
  renderTrip(state.itin); setStatus(ok ? '' : 'Đang dùng lịch trình mẫu.');
  $('stepTrip').scrollIntoView({ behavior: 'smooth' });
}
async function customize() {
  const btn = $('customBtn'), v = (id) => +$(id).value, up = $('userPrompt').value.trim();
  btn.disabled = true; setStatus('AI đang điều chỉnh lịch trình...');
  const prompt = `Bạn là AI Trip Designer của VivuGo. Điều chỉnh lịch trình "${state.itin.destinationName}".
Phong cách: ${v('sStyle') > 60 ? 'khám phá, vận động' : v('sStyle') < 40 ? 'chill thư giãn' : 'cân bằng'}. Chi tiêu: ${v('sSpend') > 60 ? 'thoải mái' : v('sSpend') < 40 ? 'tiết kiệm tối đa' : 'cân bằng'}. Mật độ: ${v('sPace') > 60 ? 'dày đặc' : v('sPace') < 40 ? 'thư thả' : 'vừa phải'}. Yêu cầu thêm: "${up || 'Tối ưu theo các thanh điều chỉnh'}".
Lịch trình hiện tại: ${JSON.stringify(state.itin)}
Trả về JSON: {"updatedItinerary":{cùng cấu trúc},"summaryBullets":[3 chuỗi],"aiMessage":"1 câu thân thiện"}`;
  const ai = await askGemini(prompt);
  let bullets, msg;
  if (ai && ai.updatedItinerary) { state.itin = ai.updatedItinerary; bullets = ai.summaryBullets; msg = ai.aiMessage; setStatus(''); }
  else {
    const t = state.itin;
    if (/tiết kiệm/i.test(up) || v('sSpend') < 40) t.estimatedCostPerPerson = Math.max(2500000, (t.estimatedCostPerPerson || 3700000) - 500000);
    bullets = ['Điều chỉnh nhịp độ chuyến đi', 'Cập nhật gợi ý ăn uống phù hợp', 'Tối ưu thời gian nghỉ ngơi']; msg = 'Đã áp dụng điều chỉnh cơ bản (chưa dùng được AI).';
    setStatus(getKey() ? 'AI đang bận, đã dùng điều chỉnh cơ bản.' : 'Chưa có API key, chỉ điều chỉnh cơ bản.');
  }
  renderTrip(state.itin);
  $('changes').innerHTML = `<p><b>${esc(msg)}</b></p><ul>${(bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
  btn.disabled = false;
}

/* ---------- Sự kiện ---------- */
$('prefs').addEventListener('click', (e) => {
  const p = e.target.dataset.p; if (!p) return;
  state.prefs = state.prefs.includes(p) ? state.prefs.filter((x) => x !== p) : [...state.prefs, p]; $('embedBtn').addEventListener('click', () => {
  $('embedCode').value = `<iframe src="${location.href.split('#')[0]}" width="100%" height="800" style="border:0;border-radius:16px" title="VivuGo"></iframe>`;
  $('embedDialog').showModal();
});
$('embedCopy').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText($('embedCode').value); e.target.textContent = 'Đã sao chép'; } catch { $('embedCode').select(); }
});
renderPrefs();
});
$('form').addEventListener('submit', suggest);
$('destList').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) pickDest(state.list[+b.dataset.i]); });
$('customBtn').addEventListener('click', customize);
$('keyBtn').addEventListener('click', () => { $('keyInput').value = getKey(); $('keyDialog').showModal(); });
$('keySave').addEventListener('click', () => { const k = $('keyInput').value.trim(); k ? localStorage.setItem('GEMINI_API_KEY', k) : localStorage.removeItem('GEMINI_API_KEY'); });
renderPrefs();
