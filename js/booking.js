import { attachDateRange } from './calendar.js';

const qs = new URLSearchParams(location.search);
const sourcePage = Object.hasOwn({ home: 1, rooms: 1, location: 1 }, qs.get('from')) ? qs.get('from') : 'rooms';
const sourceRoutes = { home: 'index.html', rooms: 'rooms.html', location: 'location.html' };
const defaults = { checkin: '2026-10-21', checkout: '2026-10-22' };
const plans = {
  standard: { room: '静岚套房', name: '大床房 · 无早', breakfast: '无早', price: 2280 },
  breakfast: { room: '静岚套房', name: '大床房 · 含早', breakfast: '双早', price: 3180 },
  triple: { room: '静岚套房', name: '大床房 · 三早', breakfast: '三早', price: 3280 },
  business: { room: '商务套房', name: '商务套房 · 无早', breakfast: '无早', price: 3680 }
};
// 只使用页面与设计稿中已有的房型信息，不推测未知规格。
const roomTypes = {
  '1': { name: '静岚套房', photos: ['956d7.png', 'bf387.png', '69c30.png'] },
  '2': { name: '36 平方米', area: '36㎡', bed: '双床', photos: ['bf387.png', '956d7.png', '69c30.png'] },
  stone: { name: '石庭套房', photos: ['69c30.png', '956d7.png', 'bf387.png'] }
};
const roomKey = Object.hasOwn(roomTypes, qs.get('room')) ? qs.get('room') : null;
const selectedRoom = roomKey ? roomTypes[roomKey] : null;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T12:00:00`));
const checkin = validDate(qs.get('checkin')) ? qs.get('checkin') : defaults.checkin;
const checkout = validDate(qs.get('checkout')) && qs.get('checkout') > checkin ? qs.get('checkout') : defaults.checkout > checkin ? defaults.checkout : dateAfter(checkin, 1);
const money = (value, decimal = false) => `¥ ${value.toLocaleString('en-US', { minimumFractionDigits: decimal ? 2 : 0, maximumFractionDigits: decimal ? 2 : 0 })}`;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function dateAfter(date, days) { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + days); return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`; }
function dayLabel(date) { return `${date}（周${'日一二三四五六'[new Date(`${date}T12:00:00`).getDay()]}）`; }
function currentDates(form) { return { checkin: form.elements.checkin.value, checkout: form.elements.checkout.value }; }

if (document.body.dataset.page === 'products') {
  const sourceQuery = new URLSearchParams();
  for (const name of ['checkin', 'checkout', 'rooms']) if (qs.has(name)) sourceQuery.set(name, qs.get(name));
  const sourceQueryString = sourceQuery.toString();
  const sourceURL = `${sourceRoutes[sourcePage]}${sourceQueryString ? `?${sourceQueryString}` : ''}`;
  document.querySelector('.bp-underlay').src = sourceURL;
  document.querySelectorAll('.bp-header-back,.bp-close').forEach(link => { link.href = sourceURL; });
  const galleryQuery = new URLSearchParams(sourceQuery);
  galleryQuery.set('type', 'room');
  galleryQuery.set('room', roomKey || '1');
  galleryQuery.set('from', 'products');
  galleryQuery.set('source', sourcePage);
  document.querySelector('.bp-all-photos').href = `gallery.html?${galleryQuery}`;
  const form = document.getElementById('product-search');
  const status = document.getElementById('product-status');
  const results = document.getElementById('rate-results');
  const breakfastFilter = document.getElementById('breakfast-filter');
  const instantFilter = document.getElementById('instant-filter');
  if (selectedRoom && roomKey !== '1') {
    document.getElementById('room-title').textContent = selectedRoom.name;
    const specs = document.querySelectorAll('.bp-room-spec span');
    if (selectedRoom.area) specs[0].textContent = selectedRoom.area;
    if (selectedRoom.bed) specs[1].textContent = selectedRoom.bed;
    document.querySelectorAll('.bp-room-gallery img').forEach((image, index) => {
      image.src = `assets/booking/${selectedRoom.photos[index]}`;
      image.alt = index === 0 ? `${selectedRoom.name}客房照片` : '酒店客房补充照片';
    });
  }
  form.elements.checkin.value = checkin;
  form.elements.checkout.value = checkout;
  form.elements.checkout.min = dateAfter(checkin, 1);
  let dates = currentDates(form);
  let hasRetried = false;
  let requestController;
  let querySequence = 0;
  let availablePlans = new Set(Object.keys(plans));
  const client = window.HotelBookingAPI.createClient({
    mode: 'demo', demoDelayMs: 450,
    demoData: { products: Object.entries(plans).map(([id, plan]) => ({ productId: id, roomId: roomKey || '1', productName: plan.name, price: plan.price })) },
    onActivity: ({ loading }) => window.HotelUI?.loading(loading)
  });
  const showDates = () => ['checkin', 'checkout'].forEach(name => { const input = form.elements[name]; const [year, month, day] = input.value.split('-'); input.previousElementSibling.textContent = input.value ? `${year}年${Number(month)}月${Number(day)}日` : '请选择日期'; });
  const showStatus = (message, error = false, retry = false) => {
    status.replaceChildren(document.createTextNode(message));
    status.hidden = !message;
    status.classList.toggle('is-error', error);
    if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = '重新查询'; button.addEventListener('click', () => { hasRetried = true; form.requestSubmit(); }); status.append(button); }
  };
  const updateLinks = () => {
    document.querySelectorAll('[data-plan]').forEach(link => { const query = new URLSearchParams({ ...dates, plan: link.dataset.plan, from: sourcePage }); if (/^[1-5]$/.test(qs.get('rooms') || '')) query.set('rooms', qs.get('rooms')); if (roomKey) query.set('room', roomKey); link.href = `booking.html?${query}`; });
  };
  const filterRates = () => {
    let visible = 0;
    const filtered = breakfastFilter.checked || instantFilter.checked;
    document.querySelectorAll('.bp-rate-card').forEach(card => {
      card.hidden = !availablePlans.has(card.querySelector('[data-plan]').dataset.plan) || (breakfastFilter.checked && Number(card.dataset.breakfast) === 0) || (instantFilter.checked && card.dataset.instant !== 'true');
      if (!card.hidden) visible++;
    });
    document.querySelectorAll('.bp-rate-group').forEach(group => { group.hidden = ![...group.querySelectorAll('.bp-rate-card')].some(card => !card.hidden); group.classList.toggle('is-filtered', filtered); });
    document.querySelectorAll('.bp-rate-empty').forEach(item => item.hidden = filtered);
    showStatus(visible ? '' : '暂无符合筛选条件的产品，请调整筛选后重试。');
    return visible;
  };
  breakfastFilter.addEventListener('change', filterRates);
  instantFilter.addEventListener('change', filterRates);
  form.elements.checkin.addEventListener('change', () => {
    if (validDate(form.elements.checkin.value)) {
      const earliestCheckout = dateAfter(form.elements.checkin.value, 1);
      const latestCheckout = dateAfter(form.elements.checkin.value, 30);
      form.elements.checkout.min = earliestCheckout;
      // 入住日期改变后，保持离店日期在可查询范围内，不自动展开另一个日历。
      if (!validDate(form.elements.checkout.value) || form.elements.checkout.value < earliestCheckout || form.elements.checkout.value > latestCheckout) {
        form.elements.checkout.value = earliestCheckout;
        form.elements.checkout.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    showDates();
  });
  form.elements.checkout.addEventListener('change', showDates);
  attachDateRange({
    startInput: form.elements.checkin,
    endInput: form.elements.checkout,
    triggers: [form.elements.checkin, form.elements.checkout],
    anchor: form,
    label: '选择入住和离店日期',
    minNights: 1,
    maxNights: 30
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const next = currentDates(form);
    if (!validDate(next.checkin) || !validDate(next.checkout) || next.checkout <= next.checkin) { showStatus('离店日期须晚于入住日期，请重新选择。', true); form.elements.checkout.focus(); return; }
    const nights = Math.round((Date.parse(next.checkout) - Date.parse(next.checkin)) / 86400000);
    if (nights > 30) { showStatus('单次查询最多支持入住 30 晚，请调整日期。', true); form.elements.checkout.focus(); return; }
    const button = form.querySelector('button[type=submit]');
    requestController?.abort(); requestController = new AbortController();
    const sequence = ++querySequence;
    button.textContent = '查询中…'; results.setAttribute('aria-busy', 'true'); showStatus('正在查询可用客房…');
    try {
      const data = await client.getProducts({ roomId: roomKey || '1', currentPage: 1, pageSize: 20, startDate: next.checkin, endDate: next.checkout }, { signal: requestController.signal });
      if (sequence !== querySequence) return;
      if (!navigator.onLine || (qs.get('state') === 'error' && !hasRetried)) throw new window.HotelBookingAPI.ApiError('查询暂时失败，请检查网络后重新查询。', { retryable: true });
      availablePlans = new Set(qs.get('state') === 'empty' ? [] : data.list.map(product => product.productId));
      dates = next; updateLinks(); const visible = filterRates();
      if (!availablePlans.size) { showStatus('所选日期暂无可订客房，请选择其他日期。'); }
      else if (visible) { showStatus(`已更新 ${dates.checkin} 至 ${dates.checkout} 的可订产品。`); }
    } catch (error) {
      if (error.name !== 'AbortError' && sequence === querySequence) showStatus(error.message || '查询暂时失败，请重新查询。', true, true);
    } finally {
      if (sequence === querySequence) { button.textContent = '查询'; results.removeAttribute('aria-busy'); }
    }
  });
  updateLinks(); showDates();
}

if (document.body.dataset.page === 'booking') {
  const form = document.getElementById('booking-form');
  const roomSelect = document.getElementById('room-count');
  const guestRooms = document.getElementById('guest-rooms');
  const validation = document.getElementById('booking-validation');
  const selectedPlan = Object.hasOwn(plans, qs.get('plan')) ? qs.get('plan') : 'standard';
  const plan = plans[selectedPlan];
  const roomName = selectedRoom ? selectedRoom.name : plan.room;
  const nights = Math.max(1, Math.min(30, Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000)));
  let referencePricing = !qs.has('plan') && !qs.has('checkin') && !qs.has('checkout') && !qs.has('rooms');
  let total = 1476;
  let submissionRetried = false;
  const initialRoom = guestRooms.firstElementChild.cloneNode(true);
  document.getElementById('selected-room').textContent = `${roomName} - ${plan.breakfast}`;
  if (selectedRoom && roomKey !== '1') {
    const image = document.querySelector('.bp-selection-summary img');
    image.src = `assets/booking/${selectedRoom.photos[0]}`;
    image.alt = `${roomName}客房照片`;
  }
  document.getElementById('stay-dates').textContent = `${dayLabel(checkin)}至 ${dayLabel(checkout)}`;
  document.getElementById('stay-nights').textContent = `共 ${nights} 晚`;
  const returnQuery = new URLSearchParams({ checkin, checkout });
  returnQuery.set('from', sourcePage);
  if (roomKey) returnQuery.set('room', roomKey);
  if (/^[1-5]$/.test(qs.get('rooms') || '')) returnQuery.set('rooms', qs.get('rooms'));
  document.querySelectorAll('a[href="products.html"]').forEach(link => link.href = `products.html?${returnQuery}`);
  function renderFees() {
    const count = Number(roomSelect.value);
    const feeLines = document.getElementById('nightly-fees');
    feeLines.replaceChildren();
    if (referencePricing) {
      [['2026-10-28 · 双早', '¥ 319 × 1'], ['2026-10-29 · 双早', '¥ 319 × 1']].forEach(([left, right]) => appendFee(left, right));
      document.getElementById('room-subtotal').textContent = '¥ 738.00';
      const otherFees = document.querySelectorAll('.bp-fee-section')[1];
      otherFees.querySelectorAll('.bp-fee-lines p strong').forEach(price => price.textContent = '¥ 319');
      otherFees.querySelectorAll('.bp-fee-lines p span')[1].textContent = '服务费 1';
      otherFees.querySelector('.bp-fee-subtotal strong').textContent = '¥ 738.00';
      total = 1476;
    } else {
      for (let i = 0; i < nights; i++) appendFee(`${dateAfter(checkin, i)} · ${plan.breakfast}`, `${money(plan.price)} × ${count}`);
      total = plan.price * nights * count;
      document.getElementById('room-subtotal').textContent = money(total, true);
      const otherFees = document.querySelectorAll('.bp-fee-section')[1];
      otherFees.querySelectorAll('.bp-fee-lines p strong').forEach(price => price.textContent = '¥ 0');
      otherFees.querySelectorAll('.bp-fee-lines p span')[1].textContent = '附加项费用';
      otherFees.querySelector('.bp-fee-subtotal strong').textContent = '¥ 0.00';
    }
    document.getElementById('booking-total').textContent = money(total);
    function appendFee(left, right) { const row = document.createElement('p'); const label = document.createElement('span'); const price = document.createElement('strong'); label.textContent = left; price.textContent = right; row.append(label, price); feeLines.append(row); }
  }
  roomSelect.addEventListener('change', () => {
    const count = Number(roomSelect.value);
    while (guestRooms.children.length > count) guestRooms.lastElementChild.remove();
    while (guestRooms.children.length < count) {
      const number = guestRooms.children.length + 1;
      const room = initialRoom.cloneNode(true); room.dataset.room = String(number);
      room.querySelector('strong').textContent = `房间 ${number}`;
      room.querySelectorAll('input').forEach(input => { input.name = `room${number}_${input.name}`; input.value = ''; input.setAttribute('aria-label', input.getAttribute('aria-label').replace('房间1', `房间${number}`)); input.removeAttribute('aria-invalid'); });
      guestRooms.append(room);
    }
    referencePricing = false; renderFees();
  });
  guestRooms.addEventListener('click', event => {
    const button = event.target.closest('.bp-add-guest'); if (!button) return;
    const room = button.closest('.bp-guest-room');
    const count = room.querySelectorAll('.bp-guest-row').length;
    if (count >= 4) { button.textContent = '每间最多填写 4 位入住人'; button.disabled = true; return; }
    const number = count + 1;
    const row = document.createElement('div'); row.className = 'bp-guest-row';
    const space = document.createElement('span'); row.append(space);
    ['guest', 'identity'].forEach(type => { const input = document.createElement('input'); input.type = 'text'; input.name = `room${room.dataset.room}_${type}${number}`; input.maxLength = type === 'guest' ? 60 : 30; input.placeholder = `客人姓名${number}${type === 'identity' ? '身份证' : ''}（选填）`; input.setAttribute('aria-label', `房间${room.dataset.room}客人${number}${type === 'identity' ? '身份证' : '姓名'}`); row.append(input); });
    button.before(row); row.querySelector('input').focus();
  });
  const specialSwitch = document.getElementById('special-needs');
  specialSwitch.addEventListener('click', () => { const enabled = specialSwitch.getAttribute('aria-checked') !== 'true'; specialSwitch.setAttribute('aria-checked', String(enabled)); document.getElementById('special-options').hidden = !enabled; });
  const remarks = document.getElementById('remarks');
  remarks.addEventListener('input', () => document.getElementById('remarks-count').textContent = `${100 - remarks.value.length} / 100`);
  form.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); validation.hidden = true; });
  const reportError = (message, control) => { validation.textContent = message; validation.hidden = false; if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); control.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    const requiredName = [...guestRooms.querySelectorAll('input[required]')].find(input => !input.value.trim());
    if (requiredName) { reportError('请填写每间客房第一位入住人的姓名。', requiredName); return; }
    const name = form.elements.contactName;
    if (!name.value.trim()) { reportError('请填写联系人姓名。', name); return; }
    const phone = form.elements.phone;
    if (!/^\+?[\d\s()-]{7,24}$/.test(phone.value.trim()) || phone.value.replace(/\D/g, '').length < 7 || phone.value.replace(/\D/g, '').length > 15) { reportError('请填写有效的联系人手机号码。', phone); return; }
    const email = form.elements.email;
    if (email.value && !email.validity.valid) { reportError('请填写有效的邮箱地址。', email); return; }
    const agreement = form.elements.agreement;
    if (!agreement.checked) { reportError('请先阅读并同意预订须知。', agreement); return; }
    validation.hidden = true;
    const submit = document.getElementById('booking-submit'); submit.disabled = true; submit.textContent = '正在提交…'; window.HotelUI?.loading(true);
    await wait(550);
    window.HotelUI?.loading(false);
    if (!navigator.onLine || (qs.get('state') === 'error' && !submissionRetried)) { submissionRetried = true; reportError('提交暂时失败，已保留填写内容。请稍后重试。'); submit.disabled = false; submit.textContent = '重新提交'; return; }
    const id = `ST${Date.now()}`;
    const order = { id, hotel: '深圳喜马拉雅酒店', room: roomName, plan: plan.name, checkin, checkout, rooms: Number(roomSelect.value), nights, total, status: '待确认', guest: guestRooms.querySelector('input[required]').value.trim(), contactName: name.value.trim(), phone: phone.value.trim(), createdAt: new Date().toISOString() };
    try {
      const stored = JSON.parse(localStorage.getItem('hotel-booking-orders') || '[]');
      const orders = Array.isArray(stored) ? stored : [];
      localStorage.setItem('hotel-booking-orders', JSON.stringify([order, ...orders]));
    } catch { reportError('当前浏览器无法保存订单，请检查浏览器存储设置后重试。'); submit.disabled = false; submit.textContent = '重新提交'; return; }
    submit.textContent = '已提交';
    document.querySelectorAll('.bp-steps .is-current').forEach(step => { step.classList.remove('is-current'); step.removeAttribute('aria-current'); });
    const finalStep = document.querySelector('.bp-steps>span:last-child'); finalStep.classList.add('is-current'); finalStep.setAttribute('aria-current', 'step');
    document.getElementById('confirmation-number').textContent = `订单号：${id}`;
    document.querySelector('#booking-confirmation a').href = `order-detail.html?id=${encodeURIComponent(id)}`;
    document.getElementById('booking-confirmation').showModal();
  });
  document.getElementById('confirmation-close').addEventListener('click', () => location.href = 'index.html');
  if (/^[1-5]$/.test(qs.get('rooms') || '')) { roomSelect.value = qs.get('rooms'); roomSelect.dispatchEvent(new Event('change')); }
  renderFees();
}
