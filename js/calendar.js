/* 全站共享日历：日期段确认后提交，单日期选中即提交并收起。 */
const DAY = 86400000;
const arrow = new URL('../assets/calendar/arrow.svg', import.meta.url).href;
let activePicker;
let nextId = 0;

function parse(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && iso(date) === value ? date : null;
}
function iso(date) { return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addDays(value, days) { const date = parse(value); date.setDate(date.getDate() + days); return iso(date); }
function monthStart(value) { const date = parse(value); date.setDate(1); return date; }
function addMonths(date, count) { const next = new Date(date); next.setDate(1); next.setMonth(next.getMonth() + count); return next; }
function daysBetween(start, end) { const a = parse(start), b = parse(end); return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY); }
function resolve(value) { return typeof value === 'function' ? value() : value; }
function writeInput(input, value) {
  if (input.value === value) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
function makeTrigger(input) {
  // 仍使用原来的表单元素和 ISO 值，避免破坏查询参数、校验及表单提交。
  if (input.matches('input[type=date]')) input.type = 'text';
  if (input.matches('input')) { input.readOnly = true; input.inputMode = 'none'; input.autocomplete = 'off'; }
}

class CalendarPicker {
  constructor(options) {
    this.options = options;
    this.range = Boolean(options.endInput);
    this.startInput = options.startInput;
    this.endInput = options.endInput;
    this.triggers = [...new Set(options.triggers || [this.startInput])];
    this.minNights = options.minNights ?? 0;
    this.id = `hotel-calendar-${++nextId}`;
    this.listeners = [];
    this.panel = document.createElement('div');
    this.panel.id = this.id;
    this.panel.className = 'hotel-calendar';
    this.panel.dataset.mode = this.range ? 'range' : 'single';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', options.label || (this.range ? '选择日期范围' : '选择日期'));
    this.panel.hidden = true;
    this.triggerAttributes = new Map();
    this.triggers.forEach(trigger => {
      this.triggerAttributes.set(trigger, ['aria-haspopup', 'aria-expanded', 'aria-controls'].map(name => [name, trigger.getAttribute(name)]));
      makeTrigger(trigger);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', this.id);
      this.listen(trigger, 'click', event => { event.preventDefault(); this.panel.hidden || this.openedBy !== trigger ? this.open(trigger) : this.close(); });
      this.listen(trigger, 'keydown', event => {
        if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); this.open(trigger); }
      });
    });
    this.listen(this.panel, 'click', event => {
      const day = event.target.closest('[data-date]');
      const nav = event.target.closest('[data-calendar-nav]');
      if (day && !day.disabled) this.choose(day.dataset.date);
      else if (nav) this.navigate(Number(nav.dataset.calendarNav));
      else if (event.target.closest('.calendar-confirm')) this.commit();
    });
    this.listen(this.panel, 'pointerover', event => {
      const day = event.target.closest('[data-date]');
      if (this.range && this.choosingEnd && day && !day.disabled && day.dataset.date >= this.draftStart && event.pointerType !== 'touch') {
        this.hovered = day.dataset.date; this.paintSelection();
      }
    });
    this.listen(this.panel, 'pointerleave', () => { this.hovered = ''; this.paintSelection(); });
    this.listen(this.panel, 'keydown', event => this.handleGridKey(event));
    this.listen(document, 'pointerdown', event => {
      if (!this.panel.hidden && !this.panel.contains(event.target) && !this.triggers.some(trigger => trigger.contains(event.target))) this.close({ restoreFocus: false });
    }, true);
    this.listen(document, 'keydown', event => {
      if (!this.panel.hidden && event.key === 'Escape') {
        // 原生 dialog 内先关闭日历，第二次 Escape 才关闭订单编辑框。
        event.preventDefault(); event.stopImmediatePropagation(); this.close();
      }
    }, true);
    this.listen(document, 'focusin', event => {
      if (!this.panel.hidden && !this.panel.contains(event.target) && !this.triggers.includes(event.target)) this.close({ restoreFocus: false });
    });
    this.listen(window, 'resize', () => {
      if (this.panel.hidden) return;
      const count = this.monthCount();
      if (count !== this.renderedCount) {
        const focused = this.panel.contains(document.activeElement) ? document.activeElement : null;
        const date = focused?.dataset.date, direction = focused?.dataset.calendarNav;
        const confirm = focused?.classList.contains('calendar-confirm');
        if (date) {
          this.focusedDate = date;
          if (date < iso(this.month) || date >= iso(addMonths(this.month, count))) this.month = monthStart(date);
        }
        this.render();
        if (date) this.focusDay();
        else if (direction) this.panel.querySelector(`[data-calendar-nav="${direction}"]`)?.focus();
        else if (confirm) this.panel.querySelector('.calendar-confirm')?.focus();
      }
      this.position();
    });
    this.listen(document, 'scroll', event => { if (!this.panel.hidden && !this.panel.contains(event.target)) this.position(); }, true);
    if (window.visualViewport) this.listen(window.visualViewport, 'resize', () => { if (!this.panel.hidden) this.position(); });
    this.dialog = this.triggers[0]?.closest('dialog');
    if (this.dialog) this.listen(this.dialog, 'close', () => this.close({ restoreFocus: false }));
  }
  listen(target, name, handler, options) { target.addEventListener(name, handler, options); this.listeners.push(() => target.removeEventListener(name, handler, options)); }
  monthCount() { return this.range && window.innerWidth > 680 ? 2 : 1; }
  limits() { return { min: resolve(this.options.min) || this.startInput.min, max: resolve(this.options.max) || this.startInput.max }; }
  allowed(value) {
    if (!parse(value)) return false;
    const { min, max } = this.limits();
    if (min && value < min || max && value > max) return false;
    if (this.range && this.choosingEnd && value > this.draftStart) {
      const endMin = resolve(this.options.min) || this.endInput.min;
      const endMax = resolve(this.options.max) || this.endInput.max;
      if (endMin && value < endMin || endMax && value > endMax) return false;
      const nights = daysBetween(this.draftStart, value);
      if (nights < this.minNights || this.options.maxNights && nights > this.options.maxNights) return false;
    }
    return true;
  }
  open(trigger = this.triggers[0]) {
    activePicker?.close({ restoreFocus: false });
    this.openedBy = trigger;
    this.draftStart = parse(this.startInput.value) ? this.startInput.value : '';
    this.draftEnd = this.range && parse(this.endInput.value) ? this.endInput.value : '';
    this.choosingEnd = this.range && trigger === this.endInput && Boolean(this.draftStart);
    this.hovered = '';
    const limits = this.limits();
    this.focusedDate = (trigger === this.endInput ? this.draftEnd : this.draftStart) || iso(new Date());
    if (limits.min && this.focusedDate < limits.min) this.focusedDate = limits.min;
    if (limits.max && this.focusedDate > limits.max) this.focusedDate = limits.max;
    this.month = monthStart(this.focusedDate);
    const container = trigger.closest('dialog') || document.body;
    container.append(this.panel);
    this.panel.hidden = false;
    this.triggers.forEach(item => item.setAttribute('aria-expanded', 'true'));
    activePicker = this;
    this.options.onOpen?.();
    this.render();
    this.position();
    this.focusDay();
  }
  close({ restoreFocus = true } = {}) {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.triggers.forEach(item => item.setAttribute('aria-expanded', 'false'));
    if (activePicker === this) activePicker = undefined;
    if (restoreFocus && this.openedBy?.isConnected) this.openedBy.focus({ preventScroll: true });
    this.options.onClose?.();
  }
  destroy() {
    this.close({ restoreFocus: false });
    this.listeners.forEach(remove => remove());
    this.triggerAttributes.forEach((attributes, trigger) => attributes.forEach(([name, value]) => value === null ? trigger.removeAttribute(name) : trigger.setAttribute(name, value)));
    this.panel.remove();
  }
  position() {
    if (this.panel.hidden) return;
    const viewport = window.visualViewport;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const offsetTop = viewport?.offsetTop || 0;
    const offsetLeft = viewport?.offsetLeft || 0;
    const anchor = this.options.anchor || this.openedBy;
    const rect = anchor.getBoundingClientRect();
    this.panel.style.maxHeight = `${Math.max(160, height - 32)}px`;
    const panelRect = this.panel.getBoundingClientRect();
    let left = Math.min(Math.max(rect.left, offsetLeft + 16), offsetLeft + width - panelRect.width - 16);
    let top = rect.bottom + 10;
    if (top + panelRect.height > offsetTop + height - 16 && rect.top - panelRect.height - 10 >= offsetTop + 16) top = rect.top - panelRect.height - 10;
    top = Math.max(offsetTop + 16, Math.min(top, offsetTop + height - panelRect.height - 16));
    this.panel.style.left = `${Math.max(offsetLeft + 16, left)}px`;
    this.panel.style.top = `${top}px`;
  }
  render() {
    this.renderedCount = this.monthCount();
    const months = Array.from({ length: this.renderedCount }, (_, i) => addMonths(this.month, i));
    const rows = Math.max(...months.map(month => Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)));
    const weekday = '日一二三四五六';
    const nav = (direction, show) => show ? `<button type="button" class="calendar-${direction < 0 ? 'prev' : 'next'}" data-calendar-nav="${direction}" aria-label="${direction < 0 ? '上' : '下'}个月"><img src="${arrow}" alt=""></button>` : '<span class="calendar-nav-spacer" aria-hidden="true"></span>';
    this.panel.innerHTML = `<div class="calendar-body">${months.map((month, index) => {
      const gridStart = addDays(iso(month), -month.getDay());
      return `<section class="calendar-month" aria-label="${month.getFullYear()}年${month.getMonth() + 1}月"><header class="calendar-header">${nav(-1, index === 0)}<h2>${month.getMonth() + 1}月 ${month.getFullYear()}</h2>${nav(1, index === months.length - 1)}</header><div class="calendar-weekdays" aria-hidden="true">${[...weekday].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid" role="grid" aria-label="${month.getFullYear()}年${month.getMonth() + 1}月">${Array.from({ length: rows * 7 }, (_, cell) => {
        const value = addDays(gridStart, cell), date = parse(value), outside = date.getMonth() !== month.getMonth();
        return `<div class="calendar-cell${outside ? ' is-outside' : ''}${cell % 7 === 6 ? ' week-end' : ''}" role="presentation"><button type="button" class="calendar-day" role="gridcell" data-date="${value}" aria-label="${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日，星期${weekday[date.getDay()]}" aria-selected="false"${value === iso(new Date()) ? ' aria-current="date"' : ''} tabindex="${!outside && value === this.focusedDate ? '0' : '-1'}"${this.allowed(value) ? '' : ' disabled'}><span class="calendar-day-number">${date.getDate()}</span></button></div>`;
      }).join('')}</div></section>`;
    }).join('')}</div>${this.range ? `<footer class="calendar-footer"><button type="button" class="calendar-confirm"><img src="${arrow}" alt=""><span>确认</span></button></footer>` : ''}<p class="calendar-status sr-only" role="status" aria-live="polite"></p>`;
    this.panel.querySelectorAll('.calendar-grid').forEach(grid => {
      if (!grid.querySelector('[data-date][tabindex="0"]:not(:disabled)')) {
        const first = grid.querySelector('.calendar-cell:not(.is-outside) [data-date]:not(:disabled)');
        if (first) first.tabIndex = 0;
      }
    });
    this.paintSelection();
    this.position();
  }
  paintSelection() {
    const end = this.range ? (this.choosingEnd && this.hovered >= this.draftStart ? this.hovered : this.draftEnd) : this.draftStart;
    this.panel.querySelectorAll('[data-date]').forEach(button => {
      const cell = button.parentElement, value = button.dataset.date;
      const currentMonth = !cell.classList.contains('is-outside');
      const selected = currentMonth && Boolean(this.draftStart) && (value === this.draftStart || end && value >= this.draftStart && value <= end);
      cell.classList.toggle('is-selected', Boolean(selected));
      cell.classList.toggle('is-start', selected && value === this.draftStart);
      cell.classList.toggle('is-end', selected && (value === end || !end));
      cell.classList.toggle('is-between', selected && value !== this.draftStart && value !== end);
      cell.classList.toggle('has-next-selected', Boolean(selected && end && value < end && !cell.classList.contains('week-end') && !cell.nextElementSibling?.classList.contains('is-outside')));
      button.setAttribute('aria-selected', String(Boolean(currentMonth && this.draftStart && (value === this.draftStart || this.draftEnd && value > this.draftStart && value <= this.draftEnd))));
    });
    const confirm = this.panel.querySelector('.calendar-confirm');
    if (confirm) confirm.disabled = !this.validRange();
    const status = this.panel.querySelector('.calendar-status');
    if (status) status.textContent = this.range ? (this.draftEnd ? `${this.draftStart}至${this.draftEnd}，请确认` : this.draftStart ? '请选择结束日期' : '请选择开始日期') : '选择日期后自动关闭';
  }
  validRange() {
    if (!parse(this.draftStart) || !parse(this.draftEnd) || this.draftEnd < this.draftStart) return false;
    const bounds = [
      [this.draftStart, resolve(this.options.min) || this.startInput.min, resolve(this.options.max) || this.startInput.max],
      [this.draftEnd, resolve(this.options.min) || this.endInput.min, resolve(this.options.max) || this.endInput.max]
    ];
    if (bounds.some(([value, min, max]) => min && value < min || max && value > max)) return false;
    const nights = daysBetween(this.draftStart, this.draftEnd);
    return nights >= this.minNights && (!this.options.maxNights || nights <= this.options.maxNights);
  }
  choose(value) {
    if (!this.allowed(value)) return;
    if (!this.range) { writeInput(this.startInput, value); this.options.onCommit?.({ value }); this.close(); return; }
    if (!this.choosingEnd || !this.draftStart || value < this.draftStart || value === this.draftStart && this.minNights > 0) {
      this.draftStart = value; this.draftEnd = ''; this.choosingEnd = true;
    } else { this.draftEnd = value; this.choosingEnd = false; }
    this.hovered = ''; this.focusedDate = value;
    if (value < iso(this.month) || value >= iso(addMonths(this.month, this.monthCount()))) this.month = monthStart(value);
    this.render(); this.focusDay();
  }
  commit() {
    if (!this.validRange()) return;
    // 两个值同时写好再派发事件，让监听方始终读到完整的日期段。
    const changed = [this.startInput.value !== this.draftStart, this.endInput.value !== this.draftEnd];
    this.startInput.value = this.draftStart; this.endInput.value = this.draftEnd;
    [this.startInput, this.endInput].forEach((input, index) => { if (changed[index]) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); } });
    this.options.onCommit?.({ start: this.draftStart, end: this.draftEnd });
    this.close();
  }
  navigate(direction) {
    const next = addMonths(this.month, direction);
    if (next.getFullYear() < 1 || next.getFullYear() > 9998) return;
    this.month = next; this.hovered = ''; this.render();
    this.panel.querySelector(`[data-calendar-nav="${direction}"]`)?.focus();
  }
  focusDay() {
    const candidates = [...this.panel.querySelectorAll('.calendar-cell:not(.is-outside) [data-date]:not(:disabled)')];
    const day = candidates.find(button => button.dataset.date === this.focusedDate) || candidates[0];
    day?.closest('.calendar-grid').querySelectorAll('[data-date]').forEach(button => button.tabIndex = button === day ? 0 : -1);
    day?.focus({ preventScroll: true });
  }
  handleGridKey(event) {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    const date = parse(button.dataset.date);
    let next;
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay() };
    if (Object.hasOwn(offsets, event.key)) next = addDays(button.dataset.date, offsets[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const month = addMonths(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
      month.setDate(Math.min(date.getDate(), new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate())); next = iso(month);
    } else return;
    event.preventDefault();
    if (!this.allowed(next)) return;
    this.focusedDate = next;
    if (next < iso(this.month) || next >= iso(addMonths(this.month, this.monthCount()))) this.month = monthStart(next);
    this.render(); this.focusDay();
  }
}

export function attachDatePicker(input, options = {}) {
  return new CalendarPicker({ ...options, startInput: input, triggers: [input], anchor: options.anchor || input.closest('label') || input });
}
export function attachDateRange(options) { return new CalendarPicker(options); }
