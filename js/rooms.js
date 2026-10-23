import {loading, sleep, toast} from './common.js';

const dialog=document.querySelector('#room-filter');
document.querySelector('[data-open-filter]').addEventListener('click',()=>dialog.showModal());
document.querySelector('#filter-form').addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  let count=0;
  for(const card of document.querySelectorAll('.room-card')){
    const visible=(!data.has('view')||card.dataset.view===data.get('view'))&&
      (!data.has('price')||Number(card.dataset.price)<=Number(data.get('price')));
    card.hidden=!visible;
    if(visible)count++;
  }
  document.querySelector('.rooms-empty').hidden=count>0;
  dialog.close();
  toast(`已找到 ${count} 个符合条件的房型`);
});
document.querySelector('[data-reset-filter]').addEventListener('click',()=>{
  document.querySelector('#filter-form').reset();
  document.querySelectorAll('.room-card').forEach(card=>card.hidden=false);
  document.querySelector('.rooms-empty').hidden=true;
  dialog.close();
});

const searchParams=new URLSearchParams(location.search);
const photoSets={
  '1':['956d7.png','bf387.png','69c30.png'],
  '2':['bf387.png','956d7.png','69c30.png']
};
for(const card of document.querySelectorAll('.room-card')){
  const select=card.querySelector('.room-select');
  const room=select.dataset.room;
  const params=new URLSearchParams(searchParams);
  params.set('room',room);
  params.set('from','rooms');
  select.href=`products.html?${params}`;

  const link=card.querySelector('.room-photo');
  const image=link.querySelector('img');
  const photos=photoSets[room];
  let index=Math.max(0,photos.findIndex(name=>image.src.endsWith(name)));
  const frame=document.createElement('div');
  frame.className='room-photo-frame';
  link.replaceWith(frame);
  frame.append(link);

  const show=next=>{
    index=(next+photos.length)%photos.length;
    image.src=`assets/rooms/${photos[index]}`;
    image.alt=`${card.querySelector('h2').textContent}照片 ${index+1}`;
    const galleryParams=new URLSearchParams(searchParams);
    galleryParams.set('type','room');
    galleryParams.set('room',room);
    galleryParams.set('image',String(index));
    galleryParams.set('from','rooms');
    link.href=`gallery.html?${galleryParams}`;
  };
  for(const [direction,step,label] of [['prev',-1,'上一张'],['next',1,'下一张']]){
    const button=document.createElement('button');
    button.type='button';
    button.className=`room-photo-step room-photo-${direction}`;
    button.setAttribute('aria-label',`${card.querySelector('h2').textContent}${label}照片`);
    button.addEventListener('click',()=>show(index+step));
    frame.append(button);
  }
  show(index);
}

if(sessionStorage.getItem('rooms-search-loading')==='1'){
  sessionStorage.removeItem('rooms-search-loading');
  const button=document.querySelector('.search-submit');
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  loading(true);
  const photos=[...document.querySelectorAll('.room-photo img')];
  const imagesReady=Promise.all(photos.map(image=>image.complete?Promise.resolve():
    new Promise(resolve=>{
      image.addEventListener('load',resolve,{once:true});
      image.addEventListener('error',resolve,{once:true});
    })));
  Promise.all([sleep(900),Promise.race([imagesReady,sleep(3000)])]).finally(()=>{
    loading(false);
    button.disabled=false;
    button.removeAttribute('aria-busy');
  });
}
