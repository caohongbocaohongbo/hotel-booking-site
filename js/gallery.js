const params=new URLSearchParams(location.search),hotel=params.get('type')==='hotel';
document.body.classList.toggle('is-hotel-gallery',hotel);
const roomImages=[
  {src:'assets/room-gallery/956d7.png',alt:'静岚套房客厅'},
  {src:'assets/room-gallery/bf387.png',alt:'客房建筑与露台'},
  {src:'assets/room-gallery/69c30.png',alt:'庭院与客房外观'}
];
const roomKey=params.get('room')==='2'?'2':'1';
const selectedRoomImages=roomKey==='2'?
  [roomImages[1],{...roomImages[0],alt:'客房起居区'},roomImages[2]]:roomImages;
let images=hotel?roomImages:selectedRoomImages;
let index=Math.min(images.length-1,Math.max(0,Number(params.get('image'))||0));
if(hotel){
  document.querySelector('.gallery-room-label').hidden=true;
  document.querySelector('.gallery-tabs').hidden=false;
  document.querySelector('.gallery-count').textContent='共 33 张照片';
  document.querySelector('.gallery-back').href='index.html';
}else{
  document.querySelector('.gallery-room-label').textContent=roomKey==='2'?'36 平方米':'静岚套房';
  document.querySelector('.gallery-count').textContent=`共 ${images.length} 张照片`;
  const returnParams=new URLSearchParams();
  for(const name of ['checkin','checkout','rooms']){
    if(params.has(name))returnParams.set(name,params.get(name));
  }
  const fromProducts=params.get('from')==='products';
  if(fromProducts){
    returnParams.set('room',roomKey);
    const source=params.get('source');
    returnParams.set('from',['home','rooms','location'].includes(source)?source:'rooms');
  }
  document.querySelector('.gallery-back').href=`${fromProducts?'products.html':'rooms.html'}?${returnParams}`;
}
function show(i){index=(i+images.length)%images.length;const main=document.querySelector('#gallery-main-image');main.src=images[index].src;main.alt=images[index].alt;document.querySelectorAll('.gallery-thumbnail').forEach((button,n)=>{button.setAttribute('aria-selected',String(n===index));button.tabIndex=n===index?0:-1});document.querySelector('.gallery-status').textContent=`${index+1} / ${images.length}`}
function render(){const thumbs=document.querySelector('.gallery-thumbnails');thumbs.replaceChildren();images.forEach((item,i)=>{const button=document.createElement('button');button.type='button';button.className='gallery-thumbnail';button.setAttribute('role','tab');button.setAttribute('aria-label',item.alt);const img=document.createElement('img');img.src=item.src;img.alt=item.alt;button.append(img);button.addEventListener('click',()=>show(i));thumbs.append(button)});show(index)}
document.querySelector('.gallery-prev').addEventListener('click',()=>show(index-1));document.querySelector('.gallery-next').addEventListener('click',()=>show(index+1));document.addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[data-category]')];if(tabs.includes(document.activeElement)){let target=tabs.indexOf(document.activeElement);if(event.key==='ArrowLeft')target=(target+tabs.length-1)%tabs.length;else if(event.key==='ArrowRight')target=(target+1)%tabs.length;else if(event.key==='Home')target=0;else if(event.key==='End')target=tabs.length-1;else return;event.preventDefault();tabs[target].focus();tabs[target].click();return}const thumbFocused=!!document.activeElement.closest('.gallery-thumbnails');if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);if(thumbFocused)document.querySelectorAll('.gallery-thumbnail')[index].focus()}if(event.key==='ArrowRight'){event.preventDefault();show(index+1);if(thumbFocused)document.querySelectorAll('.gallery-thumbnail')[index].focus()}});
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-selected',String(item===button)));document.querySelectorAll('[data-category]').forEach(item=>item.tabIndex=item===button?0:-1);images=button.dataset.category==='other'?[{src:'assets/home/7f767.png',alt:'酒店户外泳池'}]:button.dataset.category==='rooms'?roomImages:roomImages;index=0;document.querySelector('.gallery-count').textContent=button.dataset.category==='exterior'?'共 33 张照片':`共 ${images.length} 张精选照片`;render()}));render();

document.querySelectorAll('[data-category]').forEach((button,i)=>button.tabIndex=i===0?0:-1);
