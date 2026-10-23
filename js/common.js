import { attachDateRange } from './calendar.js';
/* 页面共用导航、反馈和可访问交互。 */
let toastTimer;
export function toast(message){let el=document.querySelector('.ui-toast');if(!el){el=document.createElement('div');el.className='ui-toast';el.setAttribute('role','status');document.body.append(el)}el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),3200)}
export function loading(active=true){let bar=document.querySelector('[data-global-loading]');if(!bar){bar=document.createElement('div');bar.className='global-loading';bar.dataset.globalLoading='';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','正在查询客房');document.body.append(bar)}bar.hidden=!active;document.body.setAttribute('aria-busy',String(active))}
export function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
export function formatDate(value){const [y,m,d]=value.split('-');return `${y}年${Number(m)}月${Number(d)}日`}
export function searchParameters(form){const data=new FormData(form);return new URLSearchParams(data)}
window.HotelUI={toast,loading,sleep,formatDate};
for(const sidebar of document.querySelectorAll('[data-sidebar]')){const current=sidebar.dataset.sidebar;sidebar.innerHTML=`<nav aria-label="主导航"><a class="site-nav-link" href="index.html" ${current==='hotel'?'aria-current="page"':''}>酒店</a><a class="site-nav-link" href="rooms.html" ${current==='rooms'?'aria-current="page"':''}>客房</a><a class="site-nav-link" href="location.html" ${current==='location'?'aria-current="page"':''}>位置</a></nav><div class="site-sidebar-footer"><button class="site-language" type="button" aria-label="当前语言：中文">CN</button><button class="site-account" type="button" aria-label="账户与订单" aria-expanded="false"><img src="assets/home/543d1.svg" alt=""></button></div><div class="site-account-menu" hidden><a href="orders.html">我的订单</a><a href="login.html">登录账号</a></div>`;const account=sidebar.querySelector('.site-account'),menu=sidebar.querySelector('.site-account-menu');account.addEventListener('click',()=>{menu.hidden=!menu.hidden;account.setAttribute('aria-expanded',String(!menu.hidden))});sidebar.querySelector('.site-language').addEventListener('click',()=>toast('当前提供简体中文服务'));document.addEventListener('click',event=>{if(!sidebar.contains(event.target)){menu.hidden=true;account.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){const restore=menu.contains(document.activeElement);menu.hidden=true;account.setAttribute('aria-expanded','false');if(restore)account.focus()}})}
export function setupSearch(form){
  const query=new URLSearchParams(location.search);
  for(const name of ['checkin','checkout','rooms']){
    const input=form.elements[name];
    if(!input)continue;
    if(query.has(name))input.value=query.get(name);
    const update=()=>{input.closest('.search-field').querySelector('.search-value').textContent=name==='rooms'?`${input.value}间`:formatDate(input.value)};
    input.addEventListener('change',update);
    update();
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(form.elements.checkout.value<=form.elements.checkin.value){
      toast('离店日期需要晚于入住日期');
      form.elements.checkout.focus();
      return;
    }
    const params=searchParameters(form);
    if(document.body.classList.contains('rooms-page')){
      const button=form.querySelector('[type="submit"]');
      button.disabled=true;
      button.setAttribute('aria-busy','true');
      loading(true);
      sessionStorage.setItem('rooms-search-loading','1');
      const target=new URL('rooms.html',location.href);
      target.search=params.toString();
      requestAnimationFrame(()=>location.assign(target.href));
      return;
    }
    location.href=`products.html?${params}`;
  });
}
for(const form of document.querySelectorAll('[data-search-form]')){setupSearch(form);attachDateRange({startInput:form.elements.checkin,endInput:form.elements.checkout,triggers:[form.elements.checkin,form.elements.checkout],anchor:form,label:'选择入住和离店日期',minNights:1,maxNights:30});}
document.querySelectorAll('[data-dialog-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}}));
