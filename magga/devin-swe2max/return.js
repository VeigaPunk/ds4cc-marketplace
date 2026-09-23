(()=>{
const existing=document.querySelector('a[aria-label="Back to arcade"]');
if(existing){existing.setAttribute('aria-label','Return to the arcade');return;}
// Depth-aware: edition index → up to /magga/; games/<slug>/ → ../../; hardest/ → ../
const up=location.pathname.includes('/games/')?'../../':'../';
const link=document.createElement('a');link.href=up;link.textContent='← Arcade';link.setAttribute('aria-label','Return to the arcade');
Object.assign(link.style,{position:'fixed',bottom:'8px',right:'10px',zIndex:'100',font:'11px/1.4 "JetBrainsMonoNL Nerd Font Mono","JetBrains Mono",ui-monospace,monospace',color:'#e8f0f2',background:'#0f191eE8',padding:'8px 12px',border:'1px solid color-mix(in oklab,#e8f0f2 22%,transparent)',borderRadius:'8px',textDecoration:'none',boxShadow:'0 2px 8px rgba(0,0,0,.35)',transition:'color .15s ease,border-color .15s ease'});
link.addEventListener('mouseenter',()=>{link.style.color='#6baa88';link.style.borderColor='color-mix(in oklab,#6baa88 55%,transparent)';});
link.addEventListener('mouseleave',()=>{link.style.color='#e8f0f2';link.style.borderColor='color-mix(in oklab,#e8f0f2 22%,transparent)';});
link.addEventListener('keydown',event=>event.stopPropagation());
document.body.append(link);
})();
