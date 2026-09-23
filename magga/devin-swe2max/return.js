(()=>{
const existing=document.querySelector('a[aria-label="Back to arcade"]');
if(existing){existing.setAttribute('aria-label','Return to the arcade');return;}
// Depth-aware: edition index → up to /magga/; games/<slug>/ → ../../; hardest/ → ../
const up=location.pathname.includes('/games/')?'../../':'../';
const link=document.createElement('a');link.href=up;link.textContent='← Arcade';link.setAttribute('aria-label','Return to the arcade');
Object.assign(link.style,{position:'fixed',bottom:'8px',right:'10px',zIndex:'100',font:'11px Georgia,serif',color:'#ffe9b8',background:'#171210e8',padding:'8px 12px',border:'1px solid #e8c57a55',borderRadius:'5px',textDecoration:'none',boxShadow:'0 2px 8px #0003'});
link.addEventListener('keydown',event=>event.stopPropagation());
document.body.append(link);
})();
