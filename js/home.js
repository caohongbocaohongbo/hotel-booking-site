const strip=document.querySelector('.home-room-strip');let offset=0;
for(const link of document.querySelectorAll('.home-card')){const url=new URL(link.href);url.searchParams.set('from','home');link.href=`${url.pathname.split('/').pop()}?${url.searchParams}`}
const buttons=[...document.querySelectorAll('[data-carousel]')];
function maximum(){return Math.max(0,strip.scrollWidth-strip.clientWidth)}
function refresh(){offset=0;strip.style.transform='translateX(0)';strip.scrollTo({left:0,behavior:'instant'});buttons.forEach(button=>button.disabled=maximum()===0)}
buttons.forEach(button=>button.addEventListener('click',()=>{const max=maximum(),direction=Number(button.dataset.carousel),step=innerWidth<768?276:300;const current=innerWidth<768?strip.scrollLeft:offset;offset=direction>0?(current>=max-1?0:Math.min(max,current+step)):(current<=1?max:Math.max(0,current-step));if(innerWidth<768)strip.scrollTo({left:offset,behavior:'smooth'});else strip.style.transform=`translateX(${-offset}px)`}));
window.addEventListener('resize',refresh);refresh();
