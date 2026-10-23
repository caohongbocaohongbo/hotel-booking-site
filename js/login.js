const loginForm = document.querySelector('#login-form');
const feedback = document.querySelector('#login-feedback');
const username = document.querySelector('#login-user');
const password = document.querySelector('#login-password');
const captcha = document.querySelector('#login-captcha');
const loginPanel = document.querySelector('#login-panel');
const registerPanel = document.querySelector('#register-panel');
const registerForm = document.querySelector('#login-register-form');
const registerFeedback = document.querySelector('#login-register-feedback');
const authStage = document.querySelector('#auth-stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let employeeMode = false;
let switching = false;
let switchTimer = 0;

const wait = duration => new Promise(resolve => {
  switchTimer = window.setTimeout(resolve, reduceMotion.matches ? 0 : duration);
});

function setPanelState(panel, visible) {
  panel.hidden = !visible;
  panel.inert = !visible;
  panel.setAttribute('aria-hidden', String(!visible));
}

function showFeedback(message, field) {
  feedback.textContent = message;
  feedback.classList.remove('is-success');
  loginForm.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

function showRegisterFeedback(message, field, success = false) {
  registerFeedback.textContent = message;
  registerFeedback.classList.toggle('is-success', success);
  registerForm.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

async function openRegister() {
  if (switching || !registerPanel.hidden) return;
  switching = true;
  clearTimeout(switchTimer);
  loginPanel.classList.add('is-leaving');
  await wait(50);
  setPanelState(loginPanel, false);
  loginPanel.classList.remove('is-leaving');
  setPanelState(registerPanel, true);
  registerPanel.classList.add('is-entering');
  authStage.dataset.view = 'register';
  document.body.classList.add('is-register-view');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  registerPanel.classList.add('is-active');
  await wait(200);
  registerPanel.classList.remove('is-entering', 'is-active');
  switching = false;
  document.querySelector('#register-company').focus();
}

async function openLogin({ registered = false } = {}) {
  if (switching || !loginPanel.hidden) return;
  switching = true;
  clearTimeout(switchTimer);
  registerPanel.classList.add('is-returning');
  await wait(150);
  setPanelState(registerPanel, false);
  registerPanel.classList.remove('is-returning');
  setPanelState(loginPanel, true);
  loginPanel.classList.add('is-return-enter');
  authStage.dataset.view = 'login';
  document.body.classList.remove('is-register-view');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  loginPanel.classList.add('is-active');
  await wait(180);
  loginPanel.classList.remove('is-return-enter', 'is-active');
  switching = false;
  if (registered) {
    showFeedback('注册信息已保存到本页，请输入密码和验证码登录。');
    feedback.classList.add('is-success');
    password.focus();
  } else {
    username.focus();
  }
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!username.value.trim()) return showFeedback('请输入用户名。', username);
  if (password.value.length < 6) return showFeedback('请输入至少 6 位演示密码。', password);
  if (captcha.value.trim() !== '4827') return showFeedback('验证码不正确，请输入图片中的 4 位数字。', captcha);
  try { sessionStorage.setItem('hotel-booking-session', JSON.stringify({ name: username.value.trim(), role: employeeMode ? 'employee' : 'guest' })); } catch {}
  password.value = '';
  showFeedback('演示登录成功，正在进入订单管理。');
  feedback.classList.add('is-success');
  loginForm.querySelector('[type="submit"]').disabled = true;
  setTimeout(() => { window.location.href = 'orders.html'; }, 450);
});

document.querySelector('#login-employee').addEventListener('click', event => {
  employeeMode = !employeeMode;
  document.querySelector('#login-title').textContent = employeeMode ? '员工登陆' : '用户登陆';
  event.currentTarget.textContent = employeeMode ? '用户登陆' : '员工登陆';
  password.value = '';
  showFeedback('');
  username.focus();
});

document.querySelector('#login-register').addEventListener('click', openRegister);
document.querySelector('#register-login').addEventListener('click', () => openLogin());

document.querySelector('#register-get-code').addEventListener('click', event => {
  const phone = registerForm.elements.phone;
  if (!/^1\d{10}$/.test(phone.value.trim())) return showRegisterFeedback('请先输入有效的 11 位手机号码。', phone);
  event.currentTarget.textContent = '重新获取';
  showRegisterFeedback('验证码已发送（演示验证码：4827）。', null, true);
  registerForm.elements.code.focus();
});

document.querySelector('#register-agreement-link').addEventListener('click', event => {
  event.preventDefault();
  showRegisterFeedback('演示页面暂不提供在线协议正文。');
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const company = form.elements.company;
  const contact = form.elements.contact;
  const phone = form.elements.phone;
  const code = form.elements.code;
  const newPassword = form.elements.newPassword;
  const confirmPassword = form.elements.confirmPassword;
  const agreement = form.elements.agreement;
  if (!company.value.trim()) return showRegisterFeedback('请输入公司名称。', company);
  if (!contact.value.trim()) return showRegisterFeedback('请填写真实姓名。', contact);
  if (!/^1\d{10}$/.test(phone.value.trim())) return showRegisterFeedback('请输入有效的 11 位手机号码。', phone);
  if (code.value.trim() !== '4827') return showRegisterFeedback('验证码不正确，请输入 4827。', code);
  if (newPassword.value.length < 6 || newPassword.value.length > 16) return showRegisterFeedback('请设置 6-16 位登录密码。', newPassword);
  if (confirmPassword.value !== newPassword.value) return showRegisterFeedback('两次输入的密码不一致。', confirmPassword);
  if (!agreement.checked) return showRegisterFeedback('请先阅读并同意《合作协议》。', agreement);
  username.value = phone.value.trim();
  password.value = '';
  showRegisterFeedback('注册信息已保存。', null, true);
  await openLogin({ registered: true });
  form.reset();
  document.querySelector('#register-get-code').textContent = '获取验证码';
});

window.addEventListener('pagehide', () => clearTimeout(switchTimer));
