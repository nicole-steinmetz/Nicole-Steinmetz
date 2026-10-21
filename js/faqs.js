/* FAQs — search, filters, most-read cards, copy link, view counts.
   /api/faq-top and /api/faq-view. Without the KV binding the seeded cards stay. */
(function(){
'use strict';
var CANON='https://www.nicolesteinmetz.com/faqs/';
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var items=[].slice.call(document.querySelectorAll('.faq-item'));
var cats=[].slice.call(document.querySelectorAll('.faq-cat'));
var input=document.getElementById('faq-search');
var form=document.getElementById('faq-form');
var countEl=document.getElementById('faq-count');
var emptyEl=document.getElementById('faq-empty');
var clearBtn=document.getElementById('faq-clear');
var mostRead=document.getElementById('most-read');
var results=document.getElementById('results');
var chips=[].slice.call(document.querySelectorAll('.faq-chip'));
var activeCat='';
var suppress=[];      /* details toggled by search, not by the reader */
var autoOpened=[];

/* ---------- normalisation + matching ---------- */
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['’‘`]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function within1(a,b){
  var la=a.length,lb=b.length;
  if(Math.abs(la-lb)>1)return false;
  var i=0,j=0,edits=0;
  while(i<la&&j<lb){
    if(a.charAt(i)===b.charAt(j)){i++;j++;continue;}
    if(++edits>1)return false;
    if(la>lb)i++;else if(lb>la)j++;else{i++;j++;}
  }
  return edits+(la-i)+(lb-j)<=1;
}
function wordHit(w,alt){
  if(w===alt)return true;
  if(alt.length>=3&&w.length>alt.length&&w.indexOf(alt)===0)return true;
  if(alt.length>=5&&w.length>=5&&within1(w,alt))return true;
  return false;
}
var SYN=[
  ['cost','price','pricing','how much','budget','quote'],
  ['time','timeline','how long','weeks','months'],
  ['domain','dns','email'],
  ['seo','google'],
  ['edit','update','changes','revisions'],
  ['own','ownership'],
  ['support','maintenance','care']
];
var PHRASES=['how much','how long'];
var STOP='how do does i a an the what whats is are my me you your can will to of for in on it we our and or who which when'.split(' ');
function groupFor(tok){
  var t2=tok.replace(/s$/,''),found=null;
  for(var i=0;i<SYN.length&&!found;i++){
    if(SYN[i].indexOf(tok)>-1||SYN[i].indexOf(t2)>-1)found=SYN[i];
  }
  var out=[tok];
  if(found)found.forEach(function(x){if(x!==tok)out.push(x);});
  return out;
}
function parseQuery(raw){
  var qn=norm(raw),n=' '+qn+' ',groups=[];
  PHRASES.forEach(function(p){
    if(n.indexOf(' '+p+' ')>-1){n=n.replace(' '+p+' ',' ');groups.push(groupFor(p));}
  });
  var toks=n.split(' ').filter(Boolean),kept=toks.filter(function(t){return STOP.indexOf(t)<0;});
  if(!kept.length&&!groups.length)kept=toks;
  kept.forEach(function(t){groups.push(groupFor(t));});
  var stripped=qn.split(' ').filter(function(t){return STOP.indexOf(t)<0;}).join(' ');
  return {groups:groups,qn:qn,stripped:stripped};
}
var index=items.map(function(el){
  var d=el.querySelector('details');
  var qt=norm(el.querySelector('.q-text').textContent),at=norm(el.querySelector('.faq-answer').textContent);
  return {el:el,d:d,cat:el.getAttribute('data-cat'),parent:el.parentNode,qtxt:' '+qt+' ',qw:qt.split(' '),aw:at.split(' ')};
});
/* weight of a group in a word list: 1 literal, .6 synonym, 0 none; also count of hitting words */
function groupWeight(g,words){
  var best=0,count=0;
  for(var j=0;j<words.length;j++){
    var w=words[j],h=0;
    for(var i=0;i<g.length;i++){
      var alt=g[i];
      if(alt.indexOf(' ')>-1)continue;
      if(wordHit(w,alt)){h=Math.max(h,i===0?1:.6);}
    }
    if(h){count++;if(h>best)best=h;}
  }
  return {w:best,c:count};
}
function phraseHit(g,txt){
  for(var i=0;i<g.length;i++){if(g[i].indexOf(' ')>-1&&txt.indexOf(' '+g[i]+' ')>-1)return i===0?1:.6;}
  return 0;
}
function scoreItem(it,pq){
  var total=0,allQ=true;
  for(var k=0;k<pq.groups.length;k++){
    var g=pq.groups[k],q=groupWeight(g,it.qw),a=groupWeight(g,it.aw);
    var qp=phraseHit(g,it.qtxt),ap=phraseHit(g,' '+it.aw.join(' ')+' ');
    var qw=Math.max(q.w,qp),aw=Math.max(a.w,ap),ac=Math.max(a.c,ap?1:0);
    if(!qw&&!aw)return 0;
    if(!qw)allQ=false;
    total+=5*qw+aw*Math.min(ac,3);
  }
  if(!pq.groups.length)return 0;
  if(allQ)total+=10;
  var full=pq.stripped&&(pq.stripped.indexOf(' ')>-1||pq.groups.length===1)?pq.stripped:'';
  if((full&&it.qtxt.indexOf(' '+full+' ')>-1)||(pq.qn.indexOf(' ')>-1&&it.qtxt.indexOf(' '+pq.qn+' ')>-1))total+=20;
  return total;
}

/* ---------- highlighting ---------- */
var marked=[];
function clearMarks(){
  marked.forEach(function(root){
    [].slice.call(root.querySelectorAll('mark.hl')).forEach(function(m){m.replaceWith(document.createTextNode(m.textContent));});
    root.normalize();
  });
  marked=[];
}
function highlight(root,alts){
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  var nodes=[],n;
  while((n=walker.nextNode()))nodes.push(n);
  var did=false;
  nodes.forEach(function(node){
    var text=node.nodeValue,re=/[A-Za-z0-9À-ɏ'’]+/g,m,last=0,frag=null;
    while((m=re.exec(text))){
      var w=norm(m[0]);
      if(!w)continue;
      var hit=false;
      for(var i=0;i<alts.length;i++){if(wordHit(w,alts[i])){hit=true;break;}}
      if(!hit)continue;
      if(!frag)frag=document.createDocumentFragment();
      if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));
      var mk=document.createElement('mark');mk.className='hl';mk.textContent=m[0];
      frag.appendChild(mk);last=m.index+m[0].length;
    }
    if(frag){
      if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag,node);did=true;
    }
  });
  if(did)marked.push(root);
}

/* ---------- filtering + ranking ---------- */
var rankedBox=document.getElementById('ranked'),rankedList=document.getElementById('ranked-list');
function setOpen(d,val){
  if(d.open===val)return;
  suppress.push(d);
  d.open=val;
}
function restoreOrder(){
  index.forEach(function(it){if(it.el.parentNode!==it.parent)it.parent.appendChild(it.el);});
  /* appending in document order keeps each section's original sequence */
  index.forEach(function(it){it.parent.appendChild(it.el);});
}
function apply(){
  var raw=input.value,pq=parseQuery(raw),searching=pq.groups.length>0,visible=[];
  clearMarks();
  restoreOrder();
  index.forEach(function(it){it.el.hidden=false;});
  if(searching){
    var scored=[];
    index.forEach(function(it){
      if(activeCat&&it.cat!==activeCat){it.el.hidden=true;return;}
      var sc=scoreItem(it,pq);
      if(sc>0)scored.push({it:it,sc:sc});else it.el.hidden=true;
    });
    scored.sort(function(a,b){return b.sc-a.sc;});
    var top=scored.length?scored[0].sc:0;
    scored.forEach(function(r,i){
      if(i>=8||r.sc<top*0.3){r.it.el.hidden=true;return;}
      visible.push(r);
    });
    visible.forEach(function(r){r.it.el.classList.add('is-in');rankedList.appendChild(r.it.el);});
  }else{
    index.forEach(function(it){
      var ok=!activeCat||it.cat===activeCat;
      it.el.hidden=!ok;
      if(ok)visible.push({it:it,sc:0});
    });
  }
  rankedBox.hidden=!(searching&&visible.length);
  cats.forEach(function(c){c.hidden=!c.querySelector('.faq-item:not([hidden])');});
  var n=visible.length;
  countEl.textContent=n+(n===1?' answer':' answers');
  emptyEl.hidden=n!==0;
  var active=!!(searching||activeCat);
  clearBtn.hidden=!active;
  if(mostRead)mostRead.hidden=active;
  if(searching){
    var alts=[];
    pq.groups.forEach(function(g){g.forEach(function(x){if(x.indexOf(' ')<0&&alts.indexOf(x)<0)alts.push(x);});});
    visible.forEach(function(r){highlight(r.it.el.querySelector('.q-text'),alts);highlight(r.it.el.querySelector('.faq-answer'),alts);});
  }
  var shouldOpen=[];
  if(searching&&visible.length&&(visible.length===1||visible[0].sc>=visible[1].sc*1.5))shouldOpen=[visible[0].it.d];
  autoOpened.forEach(function(d){if(shouldOpen.indexOf(d)<0)setOpen(d,false);});
  autoOpened=[];
  shouldOpen.forEach(function(d){if(!d.open)setOpen(d,true);autoOpened.push(d);});
}
var timer;
input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(apply,120);});
input.addEventListener('keydown',function(e){
  if(e.key==='Escape'){input.value='';clearTimeout(timer);apply();}
});
form.addEventListener('submit',function(e){
  e.preventDefault();clearTimeout(timer);apply();scrollToEl(results);
});
chips.forEach(function(c){
  c.addEventListener('click',function(){
    var v=c.getAttribute('data-cat');
    activeCat=(activeCat===v)?'':v;
    chips.forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-cat')===activeCat?'true':'false');});
    apply();
  });
});
clearBtn.addEventListener('click',function(){
  input.value='';activeCat='';
  chips.forEach(function(x){x.setAttribute('aria-pressed','false');});
  apply();input.focus();
});
function resetFilters(){
  input.value='';activeCat='';
  chips.forEach(function(x){x.setAttribute('aria-pressed','false');});
  apply();
}

/* ---------- deep links + scrolling ---------- */
function scrollToEl(el){
  if(!el)return;
  requestAnimationFrame(function(){el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
}
function openAndScroll(slug){
  var d=document.getElementById(slug);
  if(!d||!d.matches('details.faq-details'))return false;
  var wrap=d.closest('.faq-item');
  if(wrap.hidden||!wrap.closest('.faq-cat'))resetFilters();
  d.open=true;
  scrollToEl(wrap);
  return true;
}
function handleHash(){
  var id='';
  try{id=decodeURIComponent(location.hash.slice(1));}catch(e){}
  if(!id)return;
  var el=document.getElementById(id);
  if(!el)return;
  if(el.matches('details.faq-details')){openAndScroll(id);}
  else if(el.classList.contains('faq-cat')){
    if(el.hidden)resetFilters();
    scrollToEl(el);
  }
}
window.addEventListener('hashchange',handleHash);

/* ---------- copy link ---------- */
var status=document.getElementById('copy-status');
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.faq-copy');
  if(!b)return;
  var slug=b.getAttribute('data-slug'),url=CANON+'#'+slug;
  function done(){
    b.classList.add('copied');status.textContent='Link copied';
    setTimeout(function(){b.classList.remove('copied');status.textContent='';},1800);
    try{history.replaceState(null,'','#'+slug);}catch(err){}
  }
  function fallback(){
    try{
      var ta=document.createElement('textarea');ta.value=url;ta.setAttribute('readonly','');
      ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
      document.execCommand('copy');document.body.removeChild(ta);done();
    }catch(err){}
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done,fallback);}
  else fallback();
});

/* ---------- most read cards ---------- */
var cards=[].slice.call(document.querySelectorAll('.faq-most__card'));
cards.forEach(function(c){
  c.querySelector('.faq-most__link').addEventListener('click',function(e){
    var slug=c.getAttribute('data-slug');
    if(openAndScroll(slug)){
      e.preventDefault();
      try{history.replaceState(null,'','#'+slug);}catch(err){}
    }
  });
});
function fillCard(c,slug){
  var d=document.getElementById(slug);
  c.setAttribute('data-slug',slug);
  c.querySelector('.faq-most__q').textContent=d.querySelector('.q-text').textContent;
  c.querySelector('.faq-most__a').textContent=d.getAttribute('data-teaser')||'';
  c.querySelector('.faq-most__link').setAttribute('href','#'+slug);
}
if(/^https?:$/.test(location.protocol)&&window.fetch){
  fetch('/api/faq-top',{headers:{'Accept':'application/json'}})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(j){
      if(!j||!Array.isArray(j.top)||j.top.length<3)return;
      var top=j.top.slice(0,3),ok=top.every(function(s,i){
        return typeof s==='string'&&top.indexOf(s)===i&&document.getElementById(s)&&document.getElementById(s).matches('details.faq-details');
      });
      if(!ok)return;
      top.forEach(function(s,i){if(cards[i])fillCard(cards[i],s);});
    })
    .catch(function(){});
}

/* ---------- view counting: opens only, once per question per session ---------- */
document.addEventListener('toggle',function(e){
  var d=e.target;
  if(!d||!d.matches||!d.matches('details.faq-details'))return;
  var si=suppress.indexOf(d);
  if(si>-1){suppress.splice(si,1);return;}
  var ai=autoOpened.indexOf(d);
  if(ai>-1)autoOpened.splice(ai,1);
  if(!d.open)return;
  var key='faqv:'+d.id;
  try{if(sessionStorage.getItem(key))return;}catch(err){}
  try{
    if(navigator.sendBeacon){
      navigator.sendBeacon('/api/faq-view',JSON.stringify({id:d.id}));
      try{sessionStorage.setItem(key,'1');}catch(err){}
    }
  }catch(err){}
},true);

/* ---------- entrance reveal ---------- */
var rev=[].slice.call(document.querySelectorAll('.faq-reveal'));
function showAll(){rev.forEach(function(el){el.classList.add('is-in');});}
if(reduce||!('IntersectionObserver' in window)){showAll();}
else{
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){en.target.classList.add('is-in');io.unobserve(en.target);}
    });
  },{threshold:.08,rootMargin:'0px 0px -4% 0px'});
  rev.forEach(function(el){io.observe(el);});
}

apply();
handleHash();
})();

