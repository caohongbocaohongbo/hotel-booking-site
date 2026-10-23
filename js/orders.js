import { attachDateRange, attachDatePicker } from './calendar.js';

const storageKey = 'hotel-booking-orders';
const overridesKey = 'hotel-booking-order-overrides';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const money = value => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const icon = (name, className = '') => `<img class="${className}" src="assets/orders/${name}.svg" alt="">`;
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const readOrders = () => { const result = readJSON(storageKey, []); return Array.isArray(result) ? result.filter(item => item && typeof item === 'object' && item.id) : []; };
const toast = message => {
  if (window.HotelUI?.toast) window.HotelUI.toast(message);
  else {
    let status = document.querySelector('#orders-local-status');
    if (!status) { status = document.createElement('div'); status.id = 'orders-local-status'; status.setAttribute('role', 'status'); status.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:1000;padding:12px 20px;border-radius:8px;background:#313333;color:white;font-size:14px;max-width:90vw;'; document.body.append(status); }
    status.textContent = message; status.hidden = false; clearTimeout(status.dismissTimer); status.dismissTimer = setTimeout(() => { status.hidden = true; }, 3200);
  }
};
const datePart = value => String(value || '').slice(0, 10);
const nextDay = value => {
  const date = new Date(`${datePart(value)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const displayDate = value => datePart(value).replaceAll('-', '/');
const dayName = value => { const date = new Date(`${datePart(value)}T12:00:00`); return Number.isNaN(date.getTime()) ? '' : `周${'日一二三四五六'[date.getDay()]}`; };
const longDate = value => { const [year, month, day] = datePart(value).split('-'); return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : '待确定'; };
const nightsOf = order => order.nights || Math.max(1, Math.round((new Date(order.checkout) - new Date(order.checkin)) / 86400000));
const sampleBase = { displayId: 'H2026011132432423', hotel: '深圳喜马拉雅酒店', room: '静岚套房 - 无早', guest: '李雷、韩梅梅', checkin: '2026-10-21', checkout: '2026-10-22', rooms: 1, nights: 1, total: 1132, paid: 0, createdAt: '2026-10-22 14:23:22', booker: '国网测试01', contactName: 'cecilia', phone: '136 1282 6850', demo: true };
const samples = [{ ...sampleBase, id: 'H2026011132432423', status: '待确认' }, { ...sampleBase, id: 'H2026011132432423-confirmed', status: '已确认', charged: true }];
const allOrders = () => {
  const overrides = readJSON(overridesKey, {});
  return [...readOrders().slice().reverse(), ...samples].map(order => ({ ...order, ...(overrides?.[order.id] || {}) }));
};
function storeOrder(order) {
  if (order.demo) {
    const overrides = readJSON(overridesKey, {}); overrides[order.id] = order; localStorage.setItem(overridesKey, JSON.stringify(overrides));
  } else {
    const orders = readOrders(); const index = orders.findIndex(item => item.id === order.id);
    if (index >= 0) orders[index] = order; else orders.push(order);
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }
}
function downloadFile(name, body, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const dialog = document.querySelector('#orders-dialog');
let dialogDatePickers = [];
function destroyDialogDatePickers() {
  dialogDatePickers.forEach(picker => picker.destroy());
  dialogDatePickers = [];
}
function openDialog(title, html) {
  destroyDialogDatePickers();
  document.querySelector('#orders-dialog-title').textContent = title;
  document.querySelector('#orders-dialog-content').innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
dialog?.addEventListener('close', () => { if (!dialog.open) destroyDialogDatePickers(); });
dialog?.addEventListener('click', event => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
function orderDocument(order, title) {
  return `${title}\n\n订单号：${order.displayId || order.id}\n酒店：${order.hotel}\n房型：${order.room}\n客人：${order.guest}\n入住：${datePart(order.checkin)}\n离店：${datePart(order.checkout)}\n间数：${order.rooms || 1} 间\n晚数：${nightsOf(order)} 晚\n金额：CNY ${money(order.total)}\n状态：${order.status}\n\n本凭证为本地演示内容，不具有真实预订效力。`;
}
function showDocument(order, title) {
  openDialog(title, `<dl><div><dt>订单号</dt><dd>${escapeHTML(order.displayId || order.id)}</dd></div><div><dt>酒店</dt><dd>${escapeHTML(order.hotel)}</dd></div><div><dt>房型</dt><dd>${escapeHTML(order.room)}</dd></div><div><dt>客人</dt><dd>${escapeHTML(order.guest)}</dd></div><div><dt>入住至离店</dt><dd>${escapeHTML(displayDate(order.checkin))} — ${escapeHTML(displayDate(order.checkout))}</dd></div><div><dt>订单状态</dt><dd>${escapeHTML(order.status)}</dd></div><div><dt>订单金额</dt><dd>CNY ${money(order.total)}</dd></div></dl><div class="orders-dialog-actions"><button type="button" class="orders-button orders-primary" id="orders-download-document">下载${title}</button></div>`);
  document.querySelector('#orders-download-document').addEventListener('click', () => { downloadFile(`${title}-${order.displayId || order.id}.txt`, orderDocument(order, title)); toast(`${title}已生成`); });
}

document.querySelectorAll('[data-account-panel]').forEach(button => button.addEventListener('click', () => {
  const isBill = button.dataset.accountPanel === 'bill';
  openDialog(isBill ? '账单管理' : '财务管理', `<div class="orders-coming-soon"><svg viewBox="0 0 80 80" role="img" aria-label="咖啡杯"><path d="M22 31h34v17a17 17 0 0 1-17 17 17 17 0 0 1-17-17V31Z"/><path d="M56 36h5.5a9.5 9.5 0 0 1 0 19H55"/><path d="M29 24c-5-6 6-8 1-14M41 24c-5-6 6-8 1-14M53 24c-5-6 6-8 1-14"/><path d="M17 70h47"/></svg><p>敬请期待</p></div>`);
}));
function exportCSV(orders) {
  const cell = value => `"${String(value ?? '').replace(/^[=+@-]/, character => `'${character}`).replaceAll('"', '""')}"`;
  const rows = [['订单号', '酒店', '房型', '客人姓名', '入住日期', '离店日期', '间数', '订单金额', '状态'], ...orders.map(order => [order.displayId || order.id, order.hotel, order.room, order.guest, order.checkin, order.checkout, order.rooms || 1, order.total, order.status])];
  downloadFile('酒店订单列表.csv', '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  toast(`已导出 ${orders.length} 条订单`);
}

if (document.body.classList.contains('orders-page')) {
  const form = document.querySelector('#orders-search');
  const state = { status: 'all', type: 'created', page: 1, size: 4, order: '', guest: '', start: '', end: '' };
  const typeButton = document.querySelector('#orders-date-type');
  const typeOptions = document.querySelector('#orders-date-options');
  const dateButton = document.querySelector('#orders-date-range');
  let visibleOrders = [];
  function filterOrders() {
    return allOrders().filter(order => {
      const typeValue = state.type === 'created' ? order.createdAt : order[state.type];
      const date = datePart(typeValue);
      return (state.status === 'all' || order.status === state.status) && (!state.order || String(order.displayId || order.id).toLowerCase().includes(state.order.toLowerCase())) && (!state.guest || String(order.guest || '').toLowerCase().includes(state.guest.toLowerCase())) && (!state.start || date >= state.start) && (!state.end || date <= state.end);
    });
  }
  function cardHTML(order) {
    return `<article class="orders-card"><header class="orders-card-header"><div class="orders-number"><span>订单号</span><strong>${escapeHTML(order.displayId || order.id)}</strong></div><span class="orders-booking-badge">预</span><div class="orders-created"><span>下单时间</span><time>${escapeHTML(String(order.createdAt || '').replace('T', ' ').slice(0, 19))}</time></div><span class="orders-state${order.status === '已确认' ? ' is-confirmed' : ''}">${escapeHTML(order.status || '待确认')}</span></header><hr><div class="orders-card-body"><div class="orders-property"><img src="assets/orders/69c30.png" alt="${escapeHTML(order.hotel)}"><div class="orders-property-info"><p>${escapeHTML(order.hotel)}</p><h2>${escapeHTML(order.room)}</h2><div class="orders-guests"><span>客人姓名</span><span>${escapeHTML(order.guest)}</span></div></div></div><div class="orders-dates"><div><span>入住</span><strong>${escapeHTML(displayDate(order.checkin))}　${dayName(order.checkin)}</strong></div><div><span>离店</span><strong>${escapeHTML(displayDate(order.checkout))}　${dayName(order.checkout)}</strong></div><div>${icon('85b8d')}<span>${Number(order.rooms) || 1} 间 · ${nightsOf(order)} 晚</span></div></div><div class="orders-booker"><span>下单人</span><strong>${escapeHTML(order.booker || order.contactName || order.guest)}</strong></div><div class="orders-amount">${order.charged ? '<p class="orders-charged">已挂账</p>' : ''}<div><span>应付</span><strong>CNY ${money(order.total)}</strong></div><div><span>已付</span><span class="orders-paid">CNY ${money(order.paid)}</span></div></div></div><hr><footer class="orders-card-footer">${order.status === '待确认' ? `<button type="button" class="orders-button" data-confirmation="${escapeHTML(order.id)}">${icon('176af')}确认函</button>` : ''}<a href="order-detail.html?id=${encodeURIComponent(order.id)}" class="orders-button orders-detail-link">查看详情 →</a></footer></article>`;
  }
  function render() {
    visibleOrders = filterOrders();
    const pages = Math.max(1, Math.ceil(visibleOrders.length / state.size));
    state.page = Math.max(1, Math.min(pages, state.page));
    document.querySelector('#orders-cards').innerHTML = visibleOrders.slice((state.page - 1) * state.size, state.page * state.size).map(cardHTML).join('');
    document.querySelector('#orders-empty').hidden = visibleOrders.length !== 0;
    document.querySelector('#orders-pagination').hidden = pages <= 1;
    document.querySelector('#orders-page-info').textContent = `共 ${visibleOrders.length} 条订单`;
    document.querySelector('#orders-page-number').textContent = `${state.page} / ${pages}`;
    document.querySelector('#orders-prev').disabled = state.page <= 1;
    document.querySelector('#orders-next').disabled = state.page >= pages;
    document.querySelectorAll('[data-confirmation]').forEach(button => button.addEventListener('click', () => showDocument(allOrders().find(order => order.id === button.dataset.confirmation), '确认函')));
  }
  const setTypeOpen = open => { typeOptions.hidden = !open; typeButton.setAttribute('aria-expanded', String(open)); };
  const dateCalendar = attachDateRange({
    startInput: form.elements.start,
    endInput: form.elements.end,
    triggers: [dateButton],
    anchor: dateButton,
    label: '订单日期范围',
    minNights: 0,
    onOpen: () => setTypeOpen(false),
    onCommit: updateDateLabel
  });
  document.querySelectorAll('[data-order-tab]').forEach(button => button.addEventListener('click', () => {
    state.status = button.dataset.orderTab; state.page = 1;
    document.querySelectorAll('[data-order-tab]').forEach(tab => { const selected = tab === button; tab.classList.toggle('is-active', selected); tab.setAttribute('aria-selected', String(selected)); });
    render();
  }));
  typeButton.addEventListener('click', () => { dateCalendar.close(); setTypeOpen(typeOptions.hidden); });
  document.querySelectorAll('[data-date-type]').forEach(button => button.addEventListener('click', () => {
    state.type = button.dataset.dateType; typeButton.querySelector('span').textContent = button.textContent;
    document.querySelectorAll('[data-date-type]').forEach(option => option.setAttribute('aria-selected', String(option === button)));
    setTypeOpen(false); typeButton.focus();
  }));
  function updateDateLabel() {
    document.querySelector('#orders-range-start').textContent = form.elements.start.value || '开始日期';
    document.querySelector('#orders-range-end').textContent = form.elements.end.value || '结束日期';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    dateCalendar.close();
    if (form.elements.start.value && form.elements.end.value && form.elements.start.value > form.elements.end.value) { toast('结束日期不能早于开始日期'); return; }
    state.order = form.elements.order.value.trim(); state.guest = form.elements.guest.value.trim(); state.start = form.elements.start.value; state.end = form.elements.end.value; state.page = 1;
    updateDateLabel(); setTypeOpen(false); render();
  });
  form.addEventListener('reset', () => {
    Object.assign(state, { type: 'created', page: 1, order: '', guest: '', start: '', end: '' });
    typeButton.querySelector('span').textContent = '下单日期';
    document.querySelectorAll('[data-date-type]').forEach(option => option.setAttribute('aria-selected', String(option.dataset.dateType === 'created')));
    dateCalendar.close(); setTypeOpen(false);
    // hidden 字段的 value 同时改变默认值，重置时需主动清空。
    [form.elements.start, form.elements.end].forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    updateDateLabel(); render();
  });
  document.querySelector('#orders-clear-search').addEventListener('click', () => { document.querySelector('[data-order-tab="all"]').click(); form.reset(); });
  document.querySelector('#orders-export').addEventListener('click', () => exportCSV(visibleOrders));
  document.querySelector('#orders-prev').addEventListener('click', () => { state.page--; render(); });
  document.querySelector('#orders-next').addEventListener('click', () => { state.page++; render(); });
  document.addEventListener('click', event => { if (!event.target.closest('.orders-date-type')) setTypeOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setTypeOpen(false); });
  window.addEventListener('storage', render);
  if (window.matchMedia('(max-width: 767px)').matches) setTypeOpen(false);
  render();
}

if (document.body.classList.contains('detail-page')) {
  const queryId = new URLSearchParams(window.location.search).get('id');
  const defaultOrder = allOrders().find(item => item.id === samples[1].id);
  let order = queryId ? allOrders().find(item => item.id === queryId) : { ...defaultOrder, ...(!defaultOrder.changed ? { booker: '国网测试账号', total: 1476 } : {}) };
  const isDefault = !queryId;
  if (!order) order = { ...samples[1], booker: '国网测试账号', total: 1476 };
  if (queryId && !allOrders().some(item => item.id === queryId)) toast('未找到该本地订单，当前展示示例订单。');
  const setDetail = (key, value) => document.querySelectorAll(`[data-detail="${key}"]`).forEach(element => { element.textContent = value; });
  function renderDetail() {
    if (isDefault && !order.changed) return;
    setDetail('id', order.displayId || order.id); setDetail('hotel', order.hotel); setDetail('room', order.room); setDetail('guest', order.guest);
    setDetail('checkin', longDate(order.checkin)); setDetail('checkout', longDate(order.checkout)); setDetail('checkinWeek', dayName(order.checkin)); setDetail('checkoutWeek', dayName(order.checkout)); setDetail('nights', nightsOf(order));
    setDetail('booker', order.booker || order.contactName || order.guest); setDetail('contactName', order.contactName || order.guest); setDetail('phone', order.phone || '未填写'); setDetail('note', order.note || '未填写'); setDetail('payment', order.paid ? '已付款' : '—'); setDetail('total', `¥ ${money(order.total)}`);
    const status = document.querySelector('#detail-status'); status.textContent = `订单${order.status || '待确认'}`; status.style.color = order.status === '已确认' ? '#6a9f62' : order.status === '已取消' ? '#949999' : '#313333';
    if (!order.demo) {
      const timeline = document.querySelector('#detail-timeline');
      timeline.innerHTML = `<li><span>✓</span><p>${escapeHTML(String(order.createdAt || '').replace('T', ' ').slice(0, 19))} 订单已提交，预订人：${escapeHTML(order.contactName || order.guest)}</p></li><li><span>✓</span><p>本地演示订单已保存，可在订单列表中查看。</p></li>`;
      document.querySelector('.detail-cost-group').innerHTML = `<h3>房费</h3><div><span>${escapeHTML(order.room)}</span><span>${Number(order.rooms) || 1} 间 × ${nightsOf(order)} 晚</span></div><div><span>${escapeHTML(displayDate(order.checkin))} — ${escapeHTML(displayDate(order.checkout))}</span></div><div class="detail-subtotal"><span>小计</span><strong>¥ ${money(order.total)}</strong></div>`;
      document.querySelectorAll('.detail-cost-group')[1].innerHTML = '<h3>其它</h3><div><span>服务费</span><span>已包含</span></div><div class="detail-subtotal"><span>小计</span><strong>¥ 0.00</strong></div>';
      document.querySelector('#detail-transactions').innerHTML = `<tr><td colspan="6">${order.paid ? '已记录本地演示支付' : '暂无交易记录'}</td></tr>`;
    }
  }
  function saveChanges(next, successMessage) {
    try { order = { ...order, ...next, changed: true }; storeOrder(order); renderDetail(); dialog.close(); toast(successMessage); } catch { toast('本地存储不可用，未能保存修改。'); }
  }
  document.querySelectorAll('[data-detail-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.detailAction;
    if (action === 'confirmation') return showDocument(order, '确认单');
    if (action === 'itinerary') return showDocument(order, '行程单');
    if (action === 'print') return window.print();
    if (action === 'contact') return openDialog('联系酒店', `<p>${escapeHTML(order.hotel)}</p><p>酒店联系电话尚未在当前订单资料中提供。</p><p>订单联系人：${escapeHTML(order.contactName || order.guest)}<br>联系手机：${escapeHTML(order.phone || '未填写')}</p>`);
    if (action === 'location') return openDialog('导航到店', `<p>${escapeHTML(order.hotel)}</p><p>当前订单尚未提供精确地址，可在酒店位置页面查看酒店地图。</p><div class="orders-dialog-actions"><a class="orders-button orders-primary" href="location.html">查看酒店位置</a></div>`);
    if (action === 'modify') {
      if (order.status === '已取消') { toast('已取消的订单无法修改，请重新预订。'); return; }
      openDialog('申请修改订单', `<form id="detail-modify-form"><p>修改将保存到当前浏览器的演示订单。</p><label>客人姓名<input name="guest" required value="${escapeHTML(order.guest)}"></label><label>入住日期<input type="date" name="checkin" required value="${escapeHTML(datePart(order.checkin))}"></label><label>离店日期<input type="date" name="checkout" required value="${escapeHTML(datePart(order.checkout))}"></label><label>备注<textarea name="note" placeholder="请输入补充说明">${escapeHTML(order.note || '')}</textarea></label><p class="orders-dialog-feedback" id="detail-modify-feedback" role="status"></p><div class="orders-dialog-actions"><button class="orders-button orders-primary" type="submit">保存修改</button></div></form>`);
      const modifyForm = document.querySelector('#detail-modify-form');
      const checkinInput = modifyForm.elements.checkin;
      const checkoutInput = modifyForm.elements.checkout;
      dialogDatePickers = [
        attachDatePicker(checkinInput, { label: '入住日期' }),
        attachDatePicker(checkoutInput, { min: () => nextDay(checkinInput.value), label: '离店日期' })
      ];
      checkinInput.addEventListener('change', () => {
        if (checkinInput.value && checkoutInput.value <= checkinInput.value) {
          checkoutInput.value = nextDay(checkinInput.value);
          checkoutInput.dispatchEvent(new Event('input', { bubbles: true }));
          checkoutInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      modifyForm.addEventListener('submit', event => {
        event.preventDefault(); const form = event.currentTarget;
        if (!form.elements.guest.value.trim()) { document.querySelector('#detail-modify-feedback').textContent = '请填写客人姓名。'; return; }
        if (form.elements.checkout.value <= form.elements.checkin.value) { document.querySelector('#detail-modify-feedback').textContent = '离店日期必须晚于入住日期。'; return; }
        saveChanges({ guest: form.elements.guest.value.trim(), checkin: form.elements.checkin.value, checkout: form.elements.checkout.value, nights: Math.round((new Date(form.elements.checkout.value) - new Date(form.elements.checkin.value)) / 86400000), note: form.elements.note.value.trim(), status: '待确认' }, '修改已保存，订单等待确认');
      });
    }
    if (action === 'cancel') {
      if (order.status === '已取消') { toast('该订单已取消。'); return; }
      openDialog('申请取消订单', `<p>确认取消这条本地演示订单？取消后可重新预订。</p><dl><div><dt>订单号</dt><dd>${escapeHTML(order.displayId || order.id)}</dd></div><div><dt>客人</dt><dd>${escapeHTML(order.guest)}</dd></div></dl><div class="orders-dialog-actions"><button class="orders-button" id="detail-keep-order">保留订单</button><button class="orders-button orders-primary" id="detail-confirm-cancel">确认取消</button></div>`);
      document.querySelector('#detail-keep-order').addEventListener('click', () => dialog.close());
      document.querySelector('#detail-confirm-cancel').addEventListener('click', () => saveChanges({ status: '已取消' }, '本地演示订单已取消'));
    }
  }));
  let proofURL;
  document.querySelector('#detail-proof').addEventListener('change', event => {
    const file = event.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { toast('请选择图片或 PDF 凭证。'); event.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { toast('凭证大小不能超过 10 MB。'); event.target.value = ''; return; }
    if (proofURL) URL.revokeObjectURL(proofURL);
    document.querySelector('#detail-proof-name').textContent = `${file.name} · 仅本地预览`;
    const preview = document.querySelector('#detail-proof-preview'); preview.replaceChildren(); preview.hidden = false;
    if (file.type.startsWith('image/')) { const image = document.createElement('img'); proofURL = URL.createObjectURL(file); image.src = proofURL; image.alt = '支付凭证本地预览'; image.className = 'detail-proof-image'; preview.append(image); }
    else { const text = document.createElement('p'); text.textContent = 'PDF 凭证已选取，文件保留在本机。'; preview.append(text); }
    toast('凭证已选取，仅在当前页面预览');
  });
  renderDetail();
}
