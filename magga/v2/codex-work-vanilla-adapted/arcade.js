const games=[
 ['boxhead','Deadlock Rooms','SURVIVAL / 1–2 PLAYERS','Hold the line against the horde. Bring a friend, or make them your rival.','Solo · Local co-op & versus · LAN','#4d4535'],
 ['impossible','Pulsebound','PRECISION / ONE BUTTON','Five rhythm courses. One fixed jump. Find your pulse, learn the route, and make it through.','Space / click / tap · Practice mode','#c8b48c'],
 ['burger-tycoon','Burger Tycoon','MANAGEMENT / CORPORATE SATIRE','Four operations. One fragile empire. Growth comes at a cost.','Mouse / touch · 1–4 operations','#697656'],
 ['chicken-invaders','Starfall Flock','ARCADE / SPACE SHOOTER','Eleven worlds. One hundred and ten encounters. Power up and push back the flock.','WASD / arrows + Space · Drag to fly','#24355b'],
 ['swords-and-sandals','Crown & Sand','TURN-BASED / GLADIATOR RPG','Eighty rivals. Twenty tournaments. Train, equip, cast, and earn your crown.','Mouse / touch · Turn-based battles','#9b674b'],
 ['chicken-invaders-original','Cluck Horizon','ARCADE / ORIGINAL CAMPAIGN','An interstellar courier. Two hostile sectors. One extremely bad delivery route.','WASD / arrows + Space · Drag to fly','#405372'],
 ['hardest','Vector Vault','PRECISION / 114 LEVELS','Enter 114 vaults of moving geometry. Collect every seal, open the gates, and escape.','WASD / arrows · Touch joystick','#827fa2'],
];
const grid=document.getElementById('grid');
for(const [i,[slug,title,genre,copy,controls,color]] of games.entries()){
 const a=document.createElement('a');a.className='card';a.href=`./${slug}/index.html`;a.style.setProperty('--color',color);
 const cover=document.createElement('div');cover.className='cover';const img=document.createElement('img');img.src=`./covers/${slug}.png`;img.alt=`${title} gameplay`;img.loading=i>2?'lazy':'eager';img.width=640;img.height=400;
 const number=document.createElement('span');number.className='number';number.textContent=String(i+1).padStart(2,'0');const play=document.createElement('span');play.className='play';play.textContent='PLAY ↗';cover.append(img,number,play);
 const body=document.createElement('div');body.className='card-body';const meta=document.createElement('div');meta.className='meta';meta.textContent=genre;const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=copy;const input=document.createElement('div');input.className='controls';input.textContent=controls;body.append(meta,h,p,input);a.append(cover,body);grid.append(a);
}
