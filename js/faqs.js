/* FAQs — search, filters, most-read cards, copy link, view counts.
   /api/faq-top and /api/faq-view. Without the KV binding the seeded cards stay. */
(function(){
'use strict';
var CANON='https://www.nicolesteinmetz.com/faqs/';
var PROCESS_SLUG='whats-the-process-start-to-finish';
var PROCESS_URL='/process/';
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
  /* "longe" should still find "long"; "site" should find "website" */
  if(w.length>=4&&alt.length===w.length+1&&alt.indexOf(w)===0)return true;
  if(alt.length>=4&&w.length>alt.length&&w.slice(-alt.length)===alt)return true;
  if(w.length>=4&&alt.length>w.length&&alt.slice(-w.length)===w)return true;
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
  ['support','maintenance','care'],
  ['spam','junk']
];
var PHRASES=['how much','how long'];
var STOP='how do does i a an the what whats is are my me you your can will to of for in on it we our and or who which when until just really actually please still'.split(' ');
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
var ALIASES=window.FAQ_ALIASES||{};
var index=items.map(function(el){
  var d=el.querySelector('details');
  var qt=norm(el.querySelector('.q-text').textContent),at=norm(el.querySelector('.faq-answer').textContent);
  var aliases=(ALIASES[d.id]||[]).map(function(s){
    var n=norm(s);
    return n?{n:n,words:n.split(' ').filter(Boolean),txt:' '+n+' '}:null;
  }).filter(Boolean);
  return {el:el,d:d,cat:el.getAttribute('data-cat'),parent:el.parentNode,qtxt:' '+qt+' ',qw:qt.split(' '),atxt:' '+at+' ',aw:at.split(' '),aliases:aliases};
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
function aliasHit(alias,g){
  return Math.max(groupWeight(g,alias.words).w,phraseHit(g,alias.txt));
}
function groupHits(it,g){
  if(Math.max(groupWeight(g,it.qw).w,phraseHit(g,it.qtxt))>0)return true;
  if(Math.max(groupWeight(g,it.aw).w,phraseHit(g,it.atxt))>0)return true;
  for(var i=0;i<it.aliases.length;i++){if(aliasHit(it.aliases[i],g)>0)return true;}
  return false;
}
function scoreItem(it,pq){
  var groups=pq.used||pq.groups;
  if(!groups.length)return 0;
  var total=0,allQ=true;
  for(var k=0;k<groups.length;k++){
    var g=groups[k];
    var q=Math.max(groupWeight(g,it.qw).w,phraseHit(g,it.qtxt));
    var ans=groupWeight(g,it.aw),ap=phraseHit(g,it.atxt);
    var aw=Math.max(ans.w,ap),ac=Math.max(ans.c,ap?1:0),al=0;
    for(var i=0;i<it.aliases.length;i++){var h=aliasHit(it.aliases[i],g);if(h>al)al=h;}
    var qw=Math.max(q,al);
    if(!qw&&!aw)return 0;
    if(!q)allQ=false;
    total+=5*qw+aw*Math.min(ac,3);
  }
  if(allQ)total+=10;
  var full=pq.stripped&&(pq.stripped.indexOf(' ')>-1||groups.length===1)?pq.stripped:'';
  if((full&&it.qtxt.indexOf(' '+full+' ')>-1)||(pq.qn.indexOf(' ')>-1&&it.qtxt.indexOf(' '+pq.qn+' ')>-1))total+=20;
  /* One alias covering the whole question outranks a looser answer hit. */
  var aliasBest=0;
  it.aliases.forEach(function(alias){
    var t=0;
    for(var k=0;k<groups.length;k++){
      var w=aliasHit(alias,groups[k]);
      if(!w){t=0;break;}
      t+=5*w;
    }
    if(!t){
      if(alias.words.length>=2&&(' '+pq.qn+' ').indexOf(alias.txt)>-1)t=30;
      else return;
    } else {
      t+=15;
      if(alias.n===pq.qn||alias.txt.indexOf(' '+pq.qn+' ')>-1)t+=80;
      else if(alias.words.length>=2&&(' '+pq.qn+' ').indexOf(alias.txt)>-1)t+=30;
    }
    if(t>aliasBest)aliasBest=t;
  });
  return total+aliasBest;
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
function closeOthers(current){
  index.forEach(function(it){if(it.d!==current)setOpen(it.d,false);});
}
function restoreOrder(){
  index.forEach(function(it){if(it.el.parentNode!==it.parent)it.parent.appendChild(it.el);});
  /* appending in document order keeps each section's original sequence */
  index.forEach(function(it){it.parent.appendChild(it.el);});
}
function apply(){
  var raw=input.value,pq=parseQuery(raw),visible=[];
  var live=pq.groups.filter(function(g){return index.some(function(it){return groupHits(it,g);});});
  /* A word that appears nowhere (until, wont) must not hide the question. */
  pq.used=live.length?live:pq.groups;
  var searching=pq.groups.length>0;
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
  if(searching&&visible.length&&(visible.length===1||visible[0].sc>=visible[1].sc*1.5)&&visible[0].it.d.id!==PROCESS_SLUG)shouldOpen=[visible[0].it.d];
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
function scrollToEl(el,behavior){
  if(!el)return;
  var b=behavior||(reduce?'auto':'smooth');
  requestAnimationFrame(function(){
    /* scrollIntoView skips the offset once the browser has already jumped to the hash.
       'auto' follows the page's smooth scroll and loses that race, so an instant
       correction has to turn smooth scrolling off for the one jump. */
    var margin=parseFloat(getComputedStyle(el).scrollMarginTop)||0;
    var top=Math.max(0,el.getBoundingClientRect().top+window.scrollY-margin);
    if(b==='smooth'){window.scrollTo({top:top,behavior:'smooth'});return;}
    try{window.scrollTo({top:top,behavior:'instant'});}
    catch(err){
      var root=document.documentElement,prev=root.style.scrollBehavior;
      root.style.scrollBehavior='auto';
      window.scrollTo(0,top);
      root.style.scrollBehavior=prev;
    }
  });
}
function openAndScroll(slug){
  var d=document.getElementById(slug);
  if(!d||!d.matches('details.faq-details'))return false;
  var wrap=d.closest('.faq-item');
  if(wrap.hidden||!wrap.closest('.faq-cat'))resetFilters();
  d.open=true;
  var summary=d.querySelector('summary');
  /* A smooth scroll started before load gets overwritten by the browser's hash jump. */
  scrollToEl(wrap||d,reduce||document.readyState!=='complete'?'auto':'smooth');
  if(summary){
    try{summary.focus({preventScroll:true});}
    catch(err){summary.focus();}
  }
  return true;
}
function handleHash(){
  var id='';
  try{id=decodeURIComponent(location.hash.slice(1));}catch(e){}
  if(id===PROCESS_SLUG){location.replace(PROCESS_URL);return;}
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
  var slug=b.getAttribute('data-slug'),url=slug===PROCESS_SLUG?('https://www.nicolesteinmetz.com'+PROCESS_URL):(CANON+'#'+slug);
  function done(){
    b.classList.add('copied');status.textContent='Link copied';
    setTimeout(function(){b.classList.remove('copied');status.textContent='';},1800);
    if(slug===PROCESS_SLUG)return;
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
    if(slug===PROCESS_SLUG)return;
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
  c.querySelector('.faq-most__link').setAttribute('href',slug===PROCESS_SLUG?PROCESS_URL:('#'+slug));
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
  closeOthers(d);
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

var processFaq=document.getElementById(PROCESS_SLUG);
if(processFaq){
  var processSummary=processFaq.querySelector('summary');
  if(processSummary){
    processSummary.addEventListener('click',function(e){
      e.preventDefault();
      location.assign(PROCESS_URL);
    });
  }
}
apply();
handleHash();
})();

