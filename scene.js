'use strict';
/* AFOC / The light journey. A continuous, locally rendered WebGL world. */
(()=>{
const canvas=document.getElementById('world');
const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
if(!gl){document.body.classList.add('no-webgl');return;}
const mobile=innerWidth<720,TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const vertex=`precision highp float;
attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;
uniform mat4 uViewProjection;uniform float uTime,uKind,uReveal,uProgress,uFormation,uOrbit;varying vec3 vNormal,vWorld,vColor;varying float vT,vPhase;
vec3 pathToCity(float t,float p){
 float merge=smoothstep(.47,.87,t);
 float x=8.+13.*sin(t*6.6)*pow(max(1.-t,0.),1.2)+pow(max(-t,0.),2.)*1100.;
 float y=3.+11.*exp(-pow((t-.24)*6.2,2.));
 float z=19.-158.*t;
 float radius=1.9+.65*sin(t*8.);
 float coil=p+t*11.;
 x+=cos(coil)*radius;
 y+=sin(coil)*radius;
 float lane=floor(p/6.283185*7.)-3.;
 x=mix(x,lane*8.+sin(p*17.)*.65,merge);
 y=mix(y,.10+mod(p*8.,1.)*.1,merge);
 return vec3(x,y,z);
}
vec3 route(float t,float p){
 float q=(t+.22)/1.22;
 float theta=q*6.283185;
 float spread=(1.-uFormation)*15.;
 vec3 sculpture=vec3(8.+12.5*cos(theta),7.+6.5*sin(theta*2.),-10.+7.8*sin(theta));
 sculpture+=vec3(cos(p+theta*2.),sin(p+theta*2.),sin(p*3.+theta))* (.6+spread);
 vec3 local=mix(sculpture,pathToCity(t,p),smoothstep(.105,.275,uProgress));
 float orbitAngle=(1.-q)*6.283185;
 float group=floor(p/6.283185*12.);
 float phi=group*3.141593/12.+mod(p,.523599)*.038+uTime*.037*(1.-cos(orbitAngle));
 float radius=223.+sin(orbitAngle)*sin(orbitAngle)*(35.+mod(group,4.)*12.);
 vec3 orbit=vec3(sin(orbitAngle)*cos(phi),cos(orbitAngle),sin(orbitAngle)*sin(phi))*radius+vec3(0.,-220.,-139.);
 return mix(local,orbit,uOrbit);
}
void main(){vec3 pos=aPosition;vec3 normal=aNormal;vT=0.;vPhase=0.;
 if(uKind<1.5){
 float t=aPosition.x,phase=aPosition.y,angle=aPosition.z;
 vec3 center=route(t,phase);vec3 tangent=normalize(route(t+.0005,phase)-route(t-.0005,phase));
 vec3 side=normalize(cross(tangent,vec3(0.,1.,0.)));vec3 up=normalize(cross(side,tangent));
 normal=side*cos(angle)+up*sin(angle);
 float radius=mix(.036+.012*sin(phase*7.),.28,uOrbit);
 pos=center+normal*radius;vT=t;vPhase=phase;
 }else if(uKind<6.5){
 float cityScale=mix(1.,.006,smoothstep(.68,.90,uProgress));
 pos.x*=cityScale;pos.z=(pos.z+139.)*cityScale-139.;pos.y*=cityScale*uReveal;
 float curve=-220.+sqrt(max(1.,220.*220.-pos.x*pos.x-(pos.z+139.)*(pos.z+139.)));
 pos.y+=curve*smoothstep(.53,.67,uProgress);
 vT=aPosition.y;
 }
 if(uKind>7.5)pos=(pos-vec3(0.,-220.,-139.))*1.035+vec3(0.,-220.,-139.);
 vWorld=pos;vNormal=normal;vColor=aColor;
 gl_Position=uViewProjection*vec4(pos,1.);
}`;
const fragment=`precision highp float;
uniform vec3 uEye;uniform float uKind,uTime,uPulse,uReveal,uProgress,uFormation,uOrbit;uniform sampler2D uEarth;varying vec3 vNormal,vWorld,vColor;varying float vT,vPhase;
void main(){vec3 n=normalize(vNormal),view=normalize(uEye-vWorld),light=normalize(vec3(-.5,1.,.6));
 if(uKind>7.5){float rim=pow(1.-abs(dot(n,view)),4.);gl_FragColor=vec4(.08,.32,.59,rim*.34);return;}
 float diffuse=max(dot(n,light),0.);float spec=pow(max(dot(reflect(-light,n),view),0.),45.);
 float fresnel=pow(1.-abs(dot(n,view)),3.);
 vec3 color=vColor*(.60+diffuse*1.25)+vec3(.57,.74,.88)*spec*.6;
 if(uKind<1.5){
 if(uFormation<.99&&uProgress<.105&&fract((vT+.22)/1.22+vPhase*.09)>uFormation)discard;
 float run=fract(vT*1.5-uTime*.17+vPhase*.095);
 float pulse=pow(max(0.,1.-abs(run-.5)*23.),3.);
 float wave=exp(-pow((vT-uPulse)*16.,2.))*step(0.,uPulse)*step(uPulse,1.3);
 color=vColor*(.32+diffuse*.70)+vec3(.63,.83,1.)*(spec*.85+fresnel*.23);
 color+=(vColor+.3)*(pulse*.8+wave*1.5);
 }else if(uKind>5.5&&uKind<6.5){
 float front=pow(max(0.,1.-abs(vT-uReveal*58.)*.16),3.);
 color=vColor*(.85+front*2.2);
 }else if(uKind>6.5){
 vec3 gn=normalize(vNormal);
 // Dubai is the north-facing point of the local globe coordinate system.
 vec3 east=vec3(.571,0.,-.821),up=vec3(.744,.425,.516),north=vec3(-.349,.905,-.243);
 vec3 geo=normalize(east*gn.x+up*gn.y-north*gn.z);
 vec2 uv=vec2(atan(geo.x,geo.z)/6.283185+.5,asin(clamp(geo.y,-1.,1.))/3.141593+.5);
 vec3 map=texture2D(uEarth,uv).rgb;map=mix(vec3(.028,.055,.085),map,smoothstep(.63,.78,uProgress));
 float sun=max(dot(gn,normalize(vec3(-.45,.6,.6))),0.);
 float rim=pow(1.-max(dot(gn,view),0.),3.5);
 color=map*(.40+sun*1.35)+vec3(.06,.25,.43)*rim*.9;
 float latLine=pow(max(0.,cos(asin(geo.y)*24.)),70.);
 float lonLine=pow(max(0.,cos(atan(geo.x,geo.z)*24.)),70.);
 color+=vec3(.035,.09,.14)*(latLine+lonLine)*.35;
 }else if(uKind>2.5&&uKind<3.5){
 float travel=pow(max(0.,sin(vWorld.z*.28+vWorld.x*.10+uTime*2.)),18.);
 color=vColor*(.95+travel*1.25)*uReveal;
 }else if(uKind>3.5&&uKind<4.5){color=vColor*(1.10+.18*sin(uTime*.3+vWorld.x))*uReveal;}
 float fog=1.-exp(-length(vWorld-uEye)*.008);
 vec3 fogColor=vec3(.020,.047,.080);
 color=mix(color,fogColor,fog*.8*(1.-uOrbit));
 gl_FragColor=vec4(color,1.);
}`;
const screenVertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const blurFragment=`precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uDirection;uniform float uThreshold;void main(){vec3 c=vec3(0.);for(int i=-4;i<=4;i++){vec3 s=texture2D(uTexture,vUv+uDirection*float(i)).rgb;if(uThreshold>.5)s=max(s-vec3(.46),vec3(0.));float f=float(i);c+=s*exp(-f*f/8.)*.20416;}gl_FragColor=vec4(c,1.);}`;
const postFragment=`precision mediump float;varying vec2 vUv;uniform sampler2D uScene,uBloom;uniform float uFade,uTime;uniform vec2 uResolution;void main(){vec2 px=1./uResolution;vec3 c=texture2D(uScene,vUv).rgb;vec3 a=texture2D(uScene,vUv+vec2(px.x,0.)).rgb;vec3 b1=texture2D(uScene,vUv-vec2(px.x,0.)).rgb;vec3 c1=texture2D(uScene,vUv+vec2(0.,px.y)).rgb;vec3 d=texture2D(uScene,vUv-vec2(0.,px.y)).rgb;float edge=clamp(length(a-b1)+length(c1-d),0.,1.);c=mix(c,(a+b1+c1+d+c*2.)/6.,edge*.7);vec3 b=texture2D(uBloom,vUv).rgb;c+=b*1.9;float vignette=1.-.28*pow(length((vUv-.5)*vec2(1.,.8))*1.5,2.);c*=vignette;float grain=fract(sin(dot(vUv,vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.009;c=mix(vec3(.020,.043,.072),c,uFade);gl_FragColor=vec4(c,1.);}`;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
let sceneP,blurP,postP;try{sceneP=program(vertex,fragment);blurP=program(screenVertex,blurFragment);postP=program(screenVertex,postFragment);}catch(e){console.error('Scene initialization:',e);document.body.classList.add('no-webgl');return;}
const loc=(p,n)=>gl.getUniformLocation(p,n),sceneU={};['ViewProjection','Time','Kind','Reveal','Eye','Pulse','Progress','Formation','Orbit'].forEach(k=>sceneU[k]=loc(sceneP,'u'+k));
function mesh(data){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer,count:data.length/9};}
function vert(out,p,n,c){out.push(...p,...n,...c);}
function quad(out,a,b,c,d,n,col){[a,b,c,a,c,d].forEach(p=>vert(out,p,n,col));}
const outlines=[];
function line(out,a,b,r,col){const v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v)||1,n=v.map(x=>x/len);let u=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];let side=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];let l=Math.hypot(...side);side=side.map(x=>x/l);let up=[side[1]*n[2]-side[2]*n[1],side[2]*n[0]-side[0]*n[2],side[0]*n[1]-side[1]*n[0]];
 for(let k=0;k<4;k++){const p=k/4*TAU,q=(k+1)/4*TAU;const off=t=>side.map((x,i)=>(x*Math.cos(t)+up[i]*Math.sin(t))*r);const o=off(p),o2=off(q);quad(out,a.map((x,i)=>x+o[i]),b.map((x,i)=>x+o[i]),b.map((x,i)=>x+o2[i]),a.map((x,i)=>x+o2[i]),side,col);}}
function box(out,x,y,z,w,h,d,col){const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,Y=y+h;
quad(out,[x0,y,z1],[x1,y,z1],[x1,Y,z1],[x0,Y,z1],[0,0,1],col);
quad(out,[x1,y,z0],[x0,y,z0],[x0,Y,z0],[x1,Y,z0],[0,0,-1],col);
quad(out,[x1,y,z1],[x1,y,z0],[x1,Y,z0],[x1,Y,z1],[1,0,0],col);
quad(out,[x0,y,z0],[x0,y,z1],[x0,Y,z1],[x0,Y,z0],[-1,0,0],col);
quad(out,[x0,Y,z1],[x1,Y,z1],[x1,Y,z0],[x0,Y,z0],[0,1,0],col);
if(w>.35&&h>1&&d>.35){const c=[.25,.62,.89];[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].forEach(([xx,zz])=>line(outlines,[xx,y,zz],[xx,Y,zz],.024,c));line(outlines,[x0,Y,z1],[x1,Y,z1],.026,c);line(outlines,[x1,Y,z1],[x1,Y,z0],.026,c);line(outlines,[x1,Y,z0],[x0,Y,z0],.026,c);line(outlines,[x0,Y,z0],[x0,Y,z1],.026,c);}
}
let seed=1729;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const fibers=[];const strands=mobile?60:92,steps=mobile?200:300,sides=5;
for(let i=0;i<strands;i++){const p=i/strands*TAU,col=i%13<2?[.82,.52,.27]:i%4===0?[.68,.86,1.]:[.24,.51,.78];for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){const a=[j/steps*1.22-.22,p,k/sides*TAU],b=[(j+1)/steps*1.22-.22,p,k/sides*TAU],c=[(j+1)/steps*1.22-.22,p,(k+1)/sides*TAU],d=[j/steps*1.22-.22,p,(k+1)/sides*TAU];quad(fibers,a,b,c,d,[0,1,0],col);}}
const fiberMesh=mesh(fibers),buildings=[],windows=[],roads=[],ground=[];
quad(ground,[-350,-.04,100],[350,-.04,100],[350,-.04,-700],[-350,-.04,-700],[0,1,0],[.055,.090,.125]);
function road(x,z,w,d,color=[.30,.65,.92]){quad(roads,[x-w/2,.05,z+d/2],[x+w/2,.05,z+d/2],[x+w/2,.05,z-d/2],[x-w/2,.05,z-d/2],[0,1,0],color);}
for(let k=-4;k<=4;k++){road(k*8,-148,.14,101);road(0,-100-(k+4)*9,77,.14);road(k*8+.18,-148,.025,101,[.56,.40,.20]);}
function tower(x,z,w,d,h,type){const col=[.13+rand()*.09,.21+rand()*.10,.29+rand()*.10];box(buildings,x,0,z,w,h,d,col);box(buildings,x,h,z,w+.10,.17,d+.10,[.29,.38,.44]);
if(type===1){box(buildings,x,h,z,w*.72,h*.20,d*.72,col);box(buildings,x,h*1.2,z,.09,h*.3,.09,[.48,.67,.75]);}
if(type===2){for(let s=0;s<3;s++)box(buildings,x,h+s*h*.16,z,w*(.85-s*.22),h*.16,d*(.85-s*.22),col);}
for(let y=.7;y<h-.3;y+=.62){for(let xx=-w/2+.25;xx<w/2-.12;xx+=.45){if(rand()<.28)continue;const wc=rand()>.28?[.25+rand()*.3,.48+rand()*.3,.63+rand()*.3]:[.68,.45,.21];quad(windows,[x+xx,y,z+d/2+.012],[x+xx+.13,y,z+d/2+.012],[x+xx+.13,y+.16,z+d/2+.012],[x+xx,y+.16,z+d/2+.012],[0,0,1],wc);}for(let zz=-d/2+.25;zz<d/2-.12;zz+=.48){if(rand()<.4)continue;quad(windows,[x+w/2+.012,y,z+zz],[x+w/2+.012,y,z+zz+.13],[x+w/2+.012,y+.16,z+zz+.13],[x+w/2+.012,y+.16,z+zz],[1,0,0],[.3,.52,.69]);}}
// Fine vertical mullions give the architecture a glass, engineered character.
for(let xx=-w/2+.12;xx<w/2;xx+=.6)box(buildings,x+xx,0,z+d/2+.016,.028,h,.028,[.17,.25,.33]);
}
for(let row=0;row<7;row++){for(let col=-4;col<4;col++){const x=col*8+4,z=-103-row*9-4.5;if(Math.abs(x)<9||row<2||(x<-18&&row<4)||(x>10&&row<4))continue;const center=1-Math.abs(x)/40,h=2.8+rand()*8*center+(row>2&&row<6?rand()*7:0);tower(x+(rand()-.5)*1.2,z,2.7+rand()*1.4,2.6+rand()*2,h,rand()>.72?2:0);}}
// Dubai-inspired architecture. Stylized geometry, not a geographic scale model.
const silver=[.29,.40,.49],ice=[.42,.76,.96],gold=[.74,.47,.18];
// Burj Khalifa: a stepped, three-wing tower tapering into a needle.
for(let level=0;level<13;level++){const yy=level*3.35,rr=3.3*(1-level/15),hh=3.5;
 for(let wing=0;wing<3;wing++){const ang=wing*TAU/3;box(buildings,Math.cos(ang)*rr*.43,yy,-139+Math.sin(ang)*rr*.43,rr*.78,hh,rr*.78,silver);}}
for(let level=0;level<13;level++)for(let band=0;band<4;band++){const yy=level*3.35+band*.79,rr=3.3*(1-level/15);for(let wing=0;wing<3;wing++){const ang=wing*TAU/3,xx=Math.cos(ang)*rr*.43,zz=-139+Math.sin(ang)*rr*.43;line(outlines,[xx-rr*.39,yy,zz+rr*.395],[xx+rr*.39,yy,zz+rr*.395],.021,ice);}}
line(buildings,[0,41,-139],[0,56,-139],.09,[.6,.73,.83]);line(outlines,[0,0,-139],[0,56,-139],.032,ice);
// Burj Al Arab: twin curved sail edges, a mast and a luminous sail.
for(let j=0;j<28;j++){let t=j/28,t2=(j+1)/28;const sail=t=>[-26+Math.sin(t*Math.PI)*5.0,t*20,-122];const a=sail(t),b=sail(t2);quad(buildings,[-27,t*20,-123],a,b,[-27,t2*20,-123],[0,0,1],[.30,.46,.57]);line(outlines,a,b,.07,ice);line(outlines,[-27,t*20,-123],[-27,t2*20,-123],.045,ice);if(j%4===0)line(outlines,[-27,t*20,-123],a,.025,ice);}
line(buildings,[-27,0,-123],[-27,24,-123],.12,silver);box(buildings,-23,13,-121,3.2,.25,2.3,silver);
// Dubai Frame: open golden rectangle.
box(buildings,20,0,-129,1,17,1.2,gold);box(buildings,28,0,-129,1,17,1.2,gold);box(buildings,24,16,-129,8,1.2,1.2,gold);line(outlines,[20,0,-128.35],[20,17,-128.35],.065,gold);line(outlines,[20,17,-128.35],[28,17,-128.35],.065,gold);line(outlines,[28,17,-128.35],[28,0,-128.35],.065,gold);
// Museum of the Future: elliptical torus, woven with light.
for(let i=0;i<72;i++)for(let k=0;k<12;k++){const point=(t,p)=>[12+(3.6+.85*Math.cos(p))*Math.cos(t),4.5+(2.7+.85*Math.cos(p))*Math.sin(t),-112+1.1*Math.sin(p)];const t=i/72*TAU,t2=(i+1)/72*TAU,p=k/12*TAU,p2=(k+1)/12*TAU;quad(buildings,point(t,p),point(t2,p),point(t2,p2),point(t,p2),[Math.cos(t),Math.sin(t),.5],[.36,.46,.53]);if(k%3===0)line(outlines,point(t,p),point(t2,p),.025,ice);}
// Palm-inspired waterfront traced as optical branches.
line(roads,[-38,.1,-119],[-38,.1,-147],.11,gold);
for(let k=0;k<8;k++){let z=-124-k*2.6,len=9-Math.abs(k-3)*.8;for(let side of [-1,1]){line(roads,[-38,.1,z],[-38+side*len,.1,z-3],.085,gold);line(roads,[-38+side*len,.1,z-3],[-38+side*(len+1),.1,z-6],.06,gold);}}
for(let i=0;i<80;i++){const a=i/80*Math.PI*1.65+.65,b=(i+1)/80*Math.PI*1.65+.65;line(roads,[-38+13*Math.cos(a),.1,-137+15*Math.sin(a)],[-38+13*Math.cos(b),.1,-137+15*Math.sin(b)],.09,gold);}
// A ring pavilion and public plaza at the point where the light arrives.
for(let i=0;i<72;i++){let t=i/72*TAU,t2=(i+1)/72*TAU;quad(roads,[Math.cos(t)*4.8,.12,-117+Math.sin(t)*4.8],[Math.cos(t)*5,.12,-117+Math.sin(t)*5],[Math.cos(t2)*5,.12,-117+Math.sin(t2)*5],[Math.cos(t2)*4.8,.12,-117+Math.sin(t2)*4.8],[0,1,0],[.68,.51,.3]);}
const outlineMesh=mesh(outlines);
const cityMesh=mesh(buildings),windowMesh=mesh(windows),roadMesh=mesh(roads),groundMesh=mesh(ground);
const earth=[];
for(let i=0;i<64;i++)for(let j=0;j<128;j++){const point=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];const a=i/64*Math.PI,a2=(i+1)/64*Math.PI,b=j/128*TAU,b2=(j+1)/128*TAU;const ns=[point(a,b),point(a2,b),point(a2,b2),point(a,b),point(a2,b2),point(a,b2)];ns.forEach(n=>vert(earth,[n[0]*220,n[1]*220-220,n[2]*220-139],n,[.1,.3,.5]));}
const earthMesh=mesh(earth),earthTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([12,37,60,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const earthImage=new Image();earthImage.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,earthImage);};earthImage.src='assets/earth-network.png';
const screen=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,screen);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
function target(w,h,depth){const f=gl.createFramebuffer(),t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);let d;if(depth){d=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,d);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,d);}if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Scene framebuffer incomplete');return {f,t,d,w,h};}
let mainTarget,bloomA,bloomB,width=0,height=0;
function destroy(t){if(!t)return;gl.deleteTexture(t.t);gl.deleteFramebuffer(t.f);if(t.d)gl.deleteRenderbuffer(t.d);}
function resize(){const ratio=Math.min(devicePixelRatio||1,mobile?1.25:1.5);width=Math.round(innerWidth*ratio);height=Math.round(innerHeight*ratio);canvas.width=width;canvas.height=height;[mainTarget,bloomA,bloomB].forEach(destroy);mainTarget=target(width,height,true);bloomA=target(Math.max(1,width>>2),Math.max(1,height>>2));bloomB=target(bloomA.w,bloomA.h);}
resize();addEventListener('resize',resize);
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function view(eye,at){const z=normalize(eye.map((x,i)=>x-at[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function perspective(aspect){const f=1/Math.tan((mobile?64:52)*Math.PI/360),near=.1,far=2200;return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function drawMesh(m,kind){gl.uniform1f(sceneU.Kind,kind);gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);['aPosition','aNormal','aColor'].forEach((name,i)=>{const a=gl.getAttribLocation(sceneP,name);if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12);}});gl.drawArrays(gl.TRIANGLES,0,m.count);}
function screenPass(p,out){gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,out?out.f:null);gl.viewport(0,0,out?out.w:width,out?out.h:height);gl.bindBuffer(gl.ARRAY_BUFFER,screen);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);const a=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);}
function texture(unit,t,p,name){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc(p,name),unit);}
let time=0,last=0,drawTime=0,scroll=0,mouse=[0,0],targetMouse=[0,0],alive=true;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;document.body.classList.add('no-webgl')});canvas.addEventListener('webglcontextrestored',()=>location.reload());addEventListener('pointermove',e=>{targetMouse=[e.clientX/innerWidth-.5,e.clientY/innerHeight-.5]},{passive:true});
// Camera positions are keyframed along the same physical fiber route, then rise above the city.
const keys=[{p:0,eye:[-2,10,32],at:[-3,6,-10]},{p:.12,eye:[1,9,22],at:[2,7,-12]},{p:.27,eye:[13,8,6],at:[15,7,-40]},{p:.40,eye:[10,6,-59],at:[0,12,-139]},{p:.56,eye:[43,43,-38],at:[-9,22,-136]},{p:.65,eye:[57,78,-26],at:[-12,5,-139]},{p:.78,eye:[230,125,200],at:[-45,-170,-139]},{p:.90,eye:[535,45,285],at:[-60,-180,-139]},{p:1,eye:[565,40,-410],at:[-60,-180,-139]}];
function camera(p){let a=keys[0],b=keys[1];for(let i=1;i<keys.length;i++){if(p<=keys[i].p){a=keys[i-1];b=keys[i];break;}if(i===keys.length-1){a=keys[i-1];b=keys[i];}}const t=smooth((p-a.p)/(b.p-a.p));return {eye:a.eye.map((v,i)=>lerp(v,b.eye[i],t)),at:a.at.map((v,i)=>lerp(v,b.at[i],t))};}
function render(now){requestAnimationFrame(render);if(!alive||document.hidden||now-drawTime<(mobile?33:20))return;const dt=Math.min(.05,(now-(last||now))/1000);last=now;drawTime=now;const s=window.afoc||{};if(!s.paused)time+=dt;scroll=lerp(scroll,s.scroll||0,s.paused?1:.12);const hero=s.hero||innerHeight,journeyLength=(s.journeyEnd||innerHeight*5)-hero-innerHeight;const progress=clamp((scroll-hero*.12)/(hero*.88+journeyLength));const cityReveal=smooth((progress-.36)/.19),orbit=smooth((progress-.69)/.17),formation=s.paused?1:Math.max(smooth((time-(s.replayTime||0))/3.8),smooth(progress/.10));const fade=1-smooth((scroll-(s.journeyEnd||innerHeight*5)+innerHeight*.05)/(innerHeight*.85));mouse=mouse.map((v,i)=>lerp(v,s.paused?0:targetMouse[i],.035));let {eye,at}=camera(progress);eye[0]+=mouse[0]*lerp(.8,5,progress);eye[1]+=mouse[1]*-.6;if(mobile&&progress<.14){eye=[8,13,46];at=[8,16,-10];}
if(mobile&&progress>.43){const pull=smooth((progress-.43)/.24);at[0]=lerp(at[0],0,pull);at[1]+=progress<.7?8*pull:0;eye=eye.map((v,i)=>at[i]+(v-at[i])*(1+pull*.45));}
if(progress>.86&&!s.paused){const turn=Math.sin(time*.065)*.11,x=eye[0],z=eye[2]+139;eye[0]=x*Math.cos(turn)-z*Math.sin(turn);eye[2]=x*Math.sin(turn)+z*Math.cos(turn)-139;}
if(!mobile&&progress>.75){const shift=smooth((progress-.75)/.14),center=[0,-220,-139],direction=normalize(eye.map((v,i)=>v-center[i])),right=normalize(cross([0,1,0],direction));const target=center.map((v,i)=>v-right[i]*145+(i===1?25:0));at=at.map((v,i)=>lerp(v,target[i],shift));}
gl.bindFramebuffer(gl.FRAMEBUFFER,mainTarget.f);gl.viewport(0,0,width,height);gl.clearColor(.020,.043,.072,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(sceneP);gl.uniformMatrix4fv(sceneU.ViewProjection,false,multiply(perspective(width/height),view(eye,at)));gl.uniform3fv(sceneU.Eye,eye);gl.uniform1f(sceneU.Time,time);gl.uniform1f(sceneU.Reveal,cityReveal);gl.uniform1f(sceneU.Progress,progress);gl.uniform1f(sceneU.Formation,formation);gl.uniform1f(sceneU.Orbit,orbit);texture(2,earthTexture,sceneP,'uEarth');gl.uniform1f(sceneU.Pulse,s.pulse&&now-s.pulse<4000?(now-s.pulse)/3200:-1);
if(progress>.56)drawMesh(earthMesh,7);
if(cityReveal>.005){if(progress<.565)drawMesh(groundMesh,5);if(cityReveal>.42)drawMesh(cityMesh,2);drawMesh(roadMesh,3);drawMesh(outlineMesh,6);if(cityReveal>.65)drawMesh(windowMesh,4);}drawMesh(fiberMesh,1);if(progress>.67){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawMesh(earthMesh,8);gl.disable(gl.BLEND);}
gl.disable(gl.DEPTH_TEST);screenPass(blurP,bloomA);texture(0,mainTarget.t,blurP,'uTexture');gl.uniform2f(loc(blurP,'uDirection'),1/bloomA.w,0);gl.uniform1f(loc(blurP,'uThreshold'),1);gl.drawArrays(gl.TRIANGLES,0,6);screenPass(blurP,bloomB);texture(0,bloomA.t,blurP,'uTexture');gl.uniform2f(loc(blurP,'uDirection'),0,1/bloomB.h);gl.uniform1f(loc(blurP,'uThreshold'),0);gl.drawArrays(gl.TRIANGLES,0,6);screenPass(postP,null);texture(0,mainTarget.t,postP,'uScene');texture(1,bloomB.t,postP,'uBloom');gl.uniform1f(loc(postP,'uFade'),fade);gl.uniform1f(loc(postP,'uTime'),time);gl.uniform2f(loc(postP,'uResolution'),width,height);gl.drawArrays(gl.TRIANGLES,0,6);
// Exposed read-only diagnostics for supported runtime QA.
window.afocSceneTime=time;window.afocSceneState={formation,orbit,progress:Math.round(progress*1000)/1000,cityReveal:Math.round(cityReveal*1000)/1000,vertices:fiberMesh.count+cityMesh.count+roadMesh.count+windowMesh.count,renderer:'WebGL',width,height};
}requestAnimationFrame(render);
})();
