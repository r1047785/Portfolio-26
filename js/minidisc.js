import * as THREE from "three";
import { paintCase, outline, ART, CENTER } from "./case-art.js";

import { CASES, DISCS } from "./discs.js";

const PX = 1 / 324;                                   // 324 art pixels = half the case
const PLANE = ART * PX;
const DX = (CENTER.x - ART / 2) * PX, DY = (ART / 2 - CENTER.y) * PX;

const layerVert = /* glsl */`varying vec2 vUv; varying vec2 vP; void main(){ vUv=vec2(uv.x,1.-uv.y); vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const layerFrag = /* glsl */`
  precision highp float; varying vec2 vUv; varying vec2 vP;
  uniform sampler2D uMap; uniform float uFade,uLight,uGain,uBody,uShadow; uniform vec2 uTilt; uniform vec3 uDeep,uMid,uHi,uPanel;
  float h(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5); }
  float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  float box(vec2 p,vec2 b,float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
  void main(){
    vec3 t=texture2D(uMap,vUv).rgb;
    float move=n(vP*vec2(2.2,2.2)+uTilt*3.2)*.7+n(vP*vec2(6.,6.)-uTilt*5.)*.3;      // glints travel when the case tilts
    float l=t.r*mix(.60,1.34,move)*uGain;
    vec3 glow=uMid*(.35*smoothstep(0.,.22,l)+.65*smoothstep(.06,.60,l)); glow=mix(glow,mix(uMid,uHi,.62),smoothstep(.26,.58,l)); glow=mix(glow,uHi,smoothstep(.50,.92,l)); glow*=.18+.82*smoothstep(0.,.42,l);
    vec3 dark=glow+uDeep*t.b*uBody; float da=clamp(max(glow.r,max(glow.g,glow.b))*.86+t.b*uBody*.34+t.g*.22*uBody,0.,1.);
    float ga=clamp(l*1.05,0.,1.), sa=clamp(t.g*.62*min(1.,uGain),0.,.75), pa=t.b*uBody*.46;
    vec4 c=vec4(uPanel,1.)*pa; vec3 sh=uPanel*.30;
    c=vec4(sh,1.)*sa+c*(1.-sa); c=vec4(mix(uMid,uHi,smoothstep(.05,.55,l)),1.)*ga+c*(1.-ga);
    if(uShadow>.5){ float d=box(vP-vec2(.012,-.03),vec2(1.,.99),.1); float s=.34*smoothstep(.115,-.04,d); c=c+vec4(vec3(.16,.18,.22),1.)*s*(1.-c.a)*step(0.,box(vP,vec2(.985),.09)+.02)+c*0.; }
    gl_FragColor=mix(vec4(dark,da),c,uLight)*uFade;
  }`;
/* the thickness of the case, visible as soon as it tilts */
const wallVert = /* glsl */`varying vec3 vP; varying float vF; void main(){ vP=position; vec3 nn=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vF=abs(dot(nn,normalize(-mv.xyz))); gl_Position=projectionMatrix*mv; }`;
const wallFrag = /* glsl */`
  precision highp float; varying vec3 vP; varying float vF; uniform float uFade,uLight; uniform vec3 uDeep,uMid,uHi,uPanel;
  float h(float x){ return fract(sin(x*91.7)*4375.5); } float n(float x){ float i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
  void main(){
    float z=(vP.z+.09)/.18, along=vP.x+vP.y*1.3;
    float l=.10+.75*smoothstep(.07,0.,abs(z-.94))+.75*smoothstep(.06,0.,abs(z-.06))+.5*smoothstep(.05,0.,abs(z-.62))+.35*smoothstep(.08,0.,abs(z-.34));
    l*=.45+.75*n(along*7.)*n(along*23.+4.); l*=smoothstep(.0,.16,vF);
    vec3 g=mix(uMid*smoothstep(0.,.6,l),uHi,smoothstep(.4,.95,l));
    float a=clamp(l,0.,1.);
    gl_FragColor=mix(vec4(g+uDeep*.35,max(a*.7,.15)),vec4(mix(uPanel*.55,uHi,smoothstep(.2,.6,l))*(a*.7+.16),a*.7+.16),uLight)*uFade;
  }`;
function wallGeometry() {
  const pts = outline(), pos = [], nor = [], idx = [], z0 = -0.09, z1 = 0.09;
  pts.forEach(([x, y], k) => {
    const [x2, y2] = pts[(k + 1) % pts.length], X = (v) => (v - ART / 2) * PX, Y = (v) => (ART / 2 - v) * PX, n = pos.length / 3;
    const l = Math.hypot(x2 - x, y2 - y) || 1, nx = (y2 - y) / l, ny = (x2 - x) / l;
    pos.push(X(x), Y(y), z0, X(x2), Y(y2), z0, X(x2), Y(y2), z1, X(x), Y(y), z1);
    for (let q = 0; q < 4; q++) nor.push(nx, ny, 0);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/* ---------- the disc ---------- */
const discVert = /* glsl */`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const discFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime,uSeed,uSpin,uFade; uniform vec2 uTilt; uniform vec3 uTint; uniform sampler2D uPrint;

  vec2 g2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
  float gn(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
    return mix(mix(dot(g2(i),f),dot(g2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(g2(i+vec2(0,1)),f-vec2(0,1)),dot(g2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
  float fb(vec2 p){ return gn(p)*.62 + gn(p*2.03+4.7)*.27 + gn(p*4.1+9.2)*.11; }
  float h(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5453); }
  mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

  // white band with a warm edge on one side and a blue edge on the other: cheap dispersion
  vec3 disperse(float ph,float k,float spread){
    vec3 q = vec3(ph+spread, ph, ph-spread*1.25);
    vec3 b = .5+.5*cos(6.28318*q);
    return pow(b, vec3(k));
  }

  vec3 oil(vec2 p,float t,float tilt){
    vec2 q = p*vec2(1.5,.72)+uSeed;
    vec2 w = vec2(fb(q*1.1+vec2(0.,t*.03)), fb(q*1.1+vec2(5.2,1.3)-t*.025));
    vec2 w2 = vec2(fb(q+1.7*w+vec2(1.7,9.2)), fb(q+1.7*w+vec2(8.3,2.8)));
    float f = gn(q*1.15+2.1*w2);
    float ph = f*2.1 + w.x*.8 + tilt*.35;
    vec3 c = disperse(ph,4.2,.045)*.92;
    c += disperse(ph*1.9+.35,9.0,.09)*.38*smoothstep(-.1,.35,w2.x);
    float shade = smoothstep(-.42,.38,w2.y+f*.5);
    c *= .12+.95*shade;
    c += vec3(.035,.055,.10)*(.4+.6*shade);
    float film = smoothstep(.12,.42,abs(gn(q*1.9+w*3.)));                    // thin oil film colours in places
    vec3 rb = .5+.5*cos(6.28318*(f*5.+vec3(0.,.33,.67)+w.y*2.));
    c = mix(c, c+rb*.13, film*smoothstep(.0,.3,w.y+.1));
    float L=dot(c,vec3(.3,.55,.15)); c=mix(vec3(L)*vec3(.94,.99,1.07),c,.62);
    return c*.95;
  }
  vec3 ramp(float x){
    x = abs(fract(x*.5)*2.-1.);
    vec3 c = vec3(.010,.008,.02);
    c = mix(c, vec3(.06,.05,.62), smoothstep(.10,.26,x));
    c = mix(c, vec3(.13,.09,.80), smoothstep(.24,.38,x));
    c = mix(c, vec3(.36,.14,.62), smoothstep(.40,.50,x));
    c = mix(c, vec3(1.,.34,.92),  smoothstep(.52,.59,x));
    c = mix(c, vec3(1.,.86,.55),  smoothstep(.59,.68,x));
    c = mix(c, vec3(.42,.22,.12), smoothstep(.76,.86,x));
    c = mix(c, vec3(.03,.02,.02), smoothstep(.86,.98,x));
    return c;
  }
  vec3 ultra(vec2 p,float t,float tilt){
    vec2 q = rot(.75)*p*vec2(.34,.92)+uSeed;
    vec2 w = vec2(fb(q+vec2(0.,t*.02)), fb(q+vec2(3.1,7.7)-t*.02));
    vec2 w2 = vec2(gn(q+2.0*w), gn(q+2.0*w+4.4));
    float f = gn(q*.95+1.5*w2);
    float x = .34 + f*1.45 + w.y*.7 + dot(p,vec2(.10,.16)) + tilt*.22;
    vec3 c = ramp(x);
    float cy = smoothstep(.06,0.,abs(f-.06+w.x*.15));                         // cyan glint along one fold
    c += vec3(.05,.65,.95)*cy*.55;
    c *= .55+.6*smoothstep(-.35,.35,w2.y);
    c += (h(p*311.)-.5)*.045;
    return c;
  }
  vec4 voro(vec2 x){ vec2 n=floor(x),f=fract(x); float m1=9.,m2=9.; vec2 id=vec2(0.);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=.5+.42*(vec2(h(n+g+uSeed),h(n+g+uSeed+17.3))*2.-1.);
      vec2 r=g+o-f; float d=dot(r,r); if(d<m1){m2=m1;m1=d;id=n+g;}else if(d<m2)m2=d; }
    return vec4(sqrt(m1),sqrt(m2),id); }
  vec3 cellLayer(vec2 x,float tilt,out float wall){
    vec4 v=voro(x); float d=v.y-v.x; float rr=.40+.16*h(v.zw+1.7); float rd=smoothstep(rr-.05,rr+.03,v.x+gn(x*3.)*.06); wall=max(smoothstep(.10,.03,d),rd);
    float k=h(v.zw+3.3), k2=h(v.zw+8.8);
    float core=smoothstep(.55,.05,v.x);
    vec3 vio=mix(vec3(.07,.01,.22),vec3(.34,.03,.66),core); vio=mix(vio,vec3(.95,.42,.95),smoothstep(.28,.0,v.x)*k2*.85);
    vec3 tea=mix(vec3(.0,.13,.24),vec3(.02,.46,.58),core);  tea=mix(tea,vec3(.35,.18,.78),smoothstep(.35,.0,v.x)*k2);
    vec3 c=mix(vio,tea,step(.60,k));
    c+=vec3(.05,.70,.82)*smoothstep(rr-.22,rr-.04,v.x)*(1.-wall)*.60;                 // teal rim light inside each cell
    c*=.8+.45*sin(k*30.+tilt*3.)*.5+.2;
    return c;
  }
  vec3 cells(vec2 p,float t,float tilt){
    vec2 q=p+.28*vec2(fb(p*1.7+uSeed+t*.015),fb(p*1.7+uSeed+9.1-t*.015));
    q+=.06*vec2(gn(p*6.),gn(p*6.+5.));
    float wa,wb,wc; vec3 a=cellLayer(q*3.1+1.3,tilt,wa), b=cellLayer(q*6.4+4.,tilt,wb), c3=cellLayer(q*15.+2.,tilt,wc);
    float m=smoothstep(-.06,.10,fb(q*1.5+uSeed*2.)), m2=smoothstep(.10,.24,fb(q*2.1+uSeed*3.+3.));
    vec3 c=mix(a,b,m); float w=mix(wa,wb,m); c=mix(c,c3,m2); w=mix(w,wc,m2);
    float lace=.45+.75*fb(q*9.)+.25*gn(q*40.);
    lace=lace*.75+.45*smoothstep(.2,.5,abs(gn(q*13.+w*2.)));
    vec3 web=mix(vec3(.03,.03,.05),vec3(.86,.86,.90),smoothstep(.15,.95,lace));
    c=mix(c,web,w*.95);
    float dark=smoothstep(.16,.34,fb(q*1.15+uSeed+20.)); c=mix(c,vec3(.015,.014,.02)+c*.12,dark);
    return c;
  }
  float relief(vec2 p){
    float r=length(p), a=atan(p.y,p.x);
    float petals=sin(a*16.+sin(r*30.)*2.2), scroll=sin(r*62.+3.6*sin(a*8.)+1.4*sin(a*16.+r*12.)), leaf=sin(a*32.-r*34.), leaf2=sin(a*32.+r*34.);
    float band=smoothstep(.5,.53,r)*smoothstep(.76,.73,r);
    float x=petals*.55*(1.-band)+scroll*.5*(1.-band)+max(leaf,leaf2)*1.1*band;
    x+=.8*smoothstep(.02,0.,abs(r-.52))+.8*smoothstep(.02,0.,abs(r-.75));
    return smoothstep(-.35,.55,x);
  }
  vec3 engraved(vec2 p,float t,float tilt,vec2 pv){
    float e=.003; float hh=relief(p); vec2 n=vec2(relief(p+vec2(e,0.))-hh,relief(p+vec2(0.,e))-hh)/e*.026;
    float l=dot(normalize(vec3(-n,1.)),normalize(vec3(.45+uTilt.x,.6-uTilt.y,.75)));
    float spec=pow(max(l,0.),14.);
    vec3 base=mix(vec3(.13,.125,.11),vec3(.66,.64,.60),hh);
    base*=.75+.35*fb(p*3.+uSeed)+.12*gn(p*70.);
    float sweep=.55+.6*pow(abs(cos(atan(pv.y,pv.x)-.6+uTilt.x)),2.);
    vec3 c=base*(.30+.85*max(l,0.))*sweep+vec3(.97,.95,.91)*spec*.8;
    return c;
  }
  vec3 saw(vec2 p,float tilt,vec2 pv,out float mask){
    float r=length(p), a=atan(p.y,p.x); float n=36.; float s=fract(a/6.28318*n);
    float edge=.875+.085*smoothstep(.0,.62,s)*(1.-smoothstep(.62,.68,s));
    float gullet=.905-.05*smoothstep(.30,0.,abs(s-.80));
    float R=s<.68?edge:min(edge,gullet);
    mask=smoothstep(.006,-.006,r-R);
    float br=gn(vec2(r*115.,a*2.2))*.5+gn(vec2(r*310.,a*3.5))*.4;             // brushed along the rotation
    float av=atan(pv.y,pv.x)+uTilt.x*.8-uTilt.y*.5;
    float con=pow(abs(cos(av-1.25)),4.)*.75+pow(abs(cos(av-.15)),16.)*.35;
    float m=.40+con*.62+br*(.14+.16*con);
    vec3 c=vec3(.93,.96,1.)*m;
    c*=1.-.55*smoothstep(.004,0.,abs(r-.80))*.5;
    return c;
  }

  // silver disc under a few lamps: every lamp draws a rainbow wedge that stays put while the disc turns
  vec3 prism(vec2 p,vec2 pr,float t){
    float r=length(p), a=atan(p.y,p.x)+uTilt.x*.9-uTilt.y*.6;
    vec3 c=mix(vec3(.50,.45,.49),vec3(.62,.53,.60),smoothstep(-.8,.8,sin(a*1.0+.6)))*(.82+.22*r);
    float A[6]; A[0]=2.45; A[1]=1.72; A[2]=-.62; A[3]=-1.42; A[4]=.02; A[5]=-2.75;
    float W[6]; W[0]=.42; W[1]=.17; W[2]=.36; W[3]=.30; W[4]=.13; W[5]=.30;
    float O[6]; O[0]=.30; O[1]=.46; O[2]=.62; O[3]=.78; O[4]=.02; O[5]=.92;
    float S[6]; S[0]=.78; S[1]=.70; S[2]=.80; S[3]=.62; S[4]=.85; S[5]=.30;
    for(int i=0;i<6;i++){ float d=abs(mod(a-A[i]+3.14159,6.28318)-3.14159); float k=smoothstep(W[i],W[i]*.25,d);
      float hue=O[i]+(r-.6)*.55+(mod(a-A[i]+3.14159,6.28318)-3.14159)*.55;
      vec3 rb=.56+.44*cos(6.28318*(vec3(0.,.33,.67)-hue)); c=mix(c,rb,k*S[i]); }
    for(int i=0;i<3;i++){ float ang=i==0?2.62:(i==1?-.60:-1.63); float d=abs(mod(a-ang+3.14159,6.28318)-3.14159)/(i==2?.8:1.); c=mix(c,vec3(.23,.19,.22),smoothstep(.060,.024,d)*.72); c+=vec3(.9,.85,.9)*smoothstep(.030,0.,abs(d-.072))*.16; }
    float ray=gn(vec2(a*26.,2.))*.6+gn(vec2(a*60.,5.))*.4; c+=ray*.07*smoothstep(.3,.9,r);
    c+=(h(floor(p*420.))-.5)*.038;
    return c;
  }

  void main(){
    vec2 p=(vUv*2.-1.)*1.02; float r=length(p); if(r>1.01)discard;
    float a=atan(p.y,p.x), tilt=dot(uTilt,p); vec2 pr=rot(uSpin)*p; float t=uTime;
    vec3 c; float mask=1.; float metal=0.;
    #if MODE==0
      c=oil(pr,t,tilt*2.);
    #elif MODE==1
      c=ultra(pr,t,tilt*2.);
    #elif MODE==2
      c=cells(pr,t,tilt*2.);
    #elif MODE==3
      c=engraved(pr,t,tilt,p); metal=.6;
    #elif MODE==4
      c=saw(pr,tilt,p,mask); metal=1.;
    #else
      c=prism(p,pr,t); metal=.6;
    #endif

    // grooves + print rotate with the disc
    float gr=gn(vec2(r*190.,1.))*.5+gn(vec2(r*520.,7.))*.5;
    c*=1.+gr*.10;
    vec4 pt=texture2D(uPrint,pr*.5+.5);
    c=mix(c, metal>.5?vec3(.05):vec3(1.), pt.a*(metal>.5?.85:.62));
    c*=mask;

    // light streaks do NOT rotate: they are reflections of the room
    float ta=a-uTilt.x*.9+uTilt.y*.6;
    float fan=pow(max(cos(ta+.05),0.),70.)*.75+pow(max(cos(ta+.30),0.),140.)*.35+pow(max(cos(ta-2.62),0.),60.)*.45+pow(max(cos(ta+2.55),0.),110.)*.25;
    float scr=smoothstep(-.1,.5,gn(vec2(r*70.,ta*1.5))+.6*gn(vec2(r*210.,ta*2.5)));
    float zone=smoothstep(.42,.55,r)*smoothstep(1.,.86,r);
    c+=uTint*fan*scr*zone*(.40-.2*metal)*mix(.35,1.,mask);
    // broken arcs in the clear layer
    for(int i=0;i<4;i++){ float fi=float(i); float rr=.455+fi*.034+.01*sin(fi*7.); float seg=smoothstep(.15,.35,gn(vec2(a*1.3+fi*4.,fi*3.)));
      c+=vec3(.85,.9,1.)*smoothstep(.0035,0.,abs(r-rr))*seg*.14; }
    // rim of the disc
    c+=vec3(.85,.92,1.)*(smoothstep(.005,0.,abs(r-.988))*.34+smoothstep(.004,0.,abs(r-.962))*.12+smoothstep(.975,1.,r)*.04);

    // hub plate
    float hub=smoothstep(.326,.321,r); vec3 hc=vec3(.012,.013,.018)+.012*smoothstep(.8,-.4,p.y+p.x*.4);
    hc+=vec3(.8,.88,1.)*(smoothstep(.0035,0.,abs(r-.319))*.35+smoothstep(.0028,0.,abs(r-.272))*.14+smoothstep(.0030,0.,abs(r-.148))*.75+smoothstep(.0028,0.,abs(r-.160))*.22);
    for(int i=0;i<4;i++){ float aa=float(i)*1.5708+.7854; vec2 q=pr-vec2(cos(aa),sin(aa))*.211; float d=length(q); hc=mix(hc,vec3(.002),smoothstep(.040,.036,d)); hc+=vec3(.75,.85,1.)*smoothstep(.0035,0.,abs(d-.040))*.35; }
    hc=mix(hc,vec3(0.),smoothstep(.146,.142,r));
    c=mix(c,hc,hub);
    float al=max(mask,clamp(max(c.r,max(c.g,c.b)),0.,1.));
    al*=smoothstep(.142,.146,r);                                              // the centre hole is a real hole
    al*=smoothstep(.999,.990,r);
    gl_FragColor=vec4(min(c,vec3(1.))*al*uFade,al*uFade);
  }`;

/* small type around the rim, drawn once per disc */
function makePrint(i, name) {
  const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const x = cv.getContext("2d"); x.translate(S / 2, S / 2); x.fillStyle = "#fff"; x.strokeStyle = "#fff";
  const arc = (txt, rad, start, size, step) => {
    x.font = `600 ${size}px "DM Sans", Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    [...txt].forEach((ch, k) => { x.save(); x.rotate(start + k * step); x.translate(0, -rad); x.fillText(ch, 0, 0); x.restore(); });
  };
  arc(`YENTE VANHOUDT — ${name.toUpperCase()} — 0${i + 1}`, S * 0.472, 2.35, 11, 0.0245);
  arc("DIGITAL EXPERIENCE DESIGN  2026", S * 0.472, -0.95, 11, 0.0245);
  if (name === "Side A") {
    x.font = '600 34px "DM Sans", Arial, sans-serif'; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 3;
    x.beginPath(); x.roundRect(-74, -318, 148, 52, 22); x.stroke(); x.fillText("SIDE A", 0, -291);
    x.font = '600 18px "DM Sans", Arial, sans-serif'; x.strokeRect(-335, -36, 52, 72); x.fillText("YV", -309, 0); x.strokeRect(262, -36, 90, 72); x.fillText("36T", 307, -9); x.fillText("2026", 307, 15);
  }
  if (name === "Prism") {
    x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 3; x.lineJoin = "round";
    x.save(); x.transform(1, 0, -0.2, 1, 0, 0); x.scale(1.45, 1); x.font = '900 118px "Bodoni Moda", Didot, serif'; x.strokeText("YENTE", -34, -282); x.restore();
    for (const [x0, y0, x1, y1] of [[-210, -392, -178, -330], [238, -384, 188, -330], [-262, -262, -214, -270], [280, -312, 216, -292], [-40, -228, -60, -196], [90, -228, 120, -190]]) { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }
    x.save(); x.translate(-318, 18); x.lineWidth = 2; for (let k = 0; k < 14; k++) { x.rotate((Math.PI * 2) / 14); x.beginPath(); x.moveTo(0, 7); x.lineTo(0, k % 2 ? 46 : 62); x.stroke(); } x.restore();
    x.font = '700 18px Archivo, "DM Sans", Arial, sans-serif'; x.fillText("SELF MADE", -318, -62);
    x.save(); x.scale(1.3, 1); x.font = '900 32px "Bodoni Moda", Didot, serif'; x.fillText("Portfolio 2026", 0, 246); x.restore();
    x.font = '600 15px "DM Sans", Arial, sans-serif'; ["WEB DESIGN  3D DESIGN  UI/UX DESIGN", "DESIGNED AND BUILT BY YENTE VANHOUDT", "FOR WHOEVER IS LISTENING"].forEach((l, k) => x.fillText(l, 0, 306 + k * 23));
    for (const sx of [-158, 166]) { x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx - 40, 206); x.lineTo(sx + 40, 206); x.moveTo(sx, 166); x.lineTo(sx, 246); x.stroke(); }
    for (let k = 0; k < 26; k++) x.fillRect(250 + k * 7, -38 + ((k * 37) % 9), (k * 13) % 4 + 1.5, 62 - ((k * 23) % 22));
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.needsUpdate = true; return t;
}

const OVER = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
const N = DISCS.length;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Where a case floats, as a fraction of the hero. 0 = centre, 1 = next (top right), -1 = previous (bottom left). */
const WIDE = [
  { o: -2, x: -0.40, y: 1.50, s: 1.10, rx: -0.55, ry: -0.90, rz: 0.60 },
  { o: -1, x: 0.035, y: 0.95, s: 0.86, rx: -0.42, ry: -0.52, rz: 0.34 },
  { o: 0, x: 0.50, y: 0.50, s: 1.00, rx: 0.30, ry: -0.40, rz: 0.15 },
  { o: 1, x: 0.955, y: 0.21, s: 1.0, rx: 0.46, ry: -0.50, rz: 0.30 },
  { o: 2, x: 1.42, y: -0.32, s: 1.40, rx: 0.60, ry: -0.85, rz: 0.60 },
];
const TALL = [
  { o: -2, x: -1.10, y: 1.10, s: 1.00, rx: -0.50, ry: -0.90, rz: 0.60 },
  { o: -1, x: -0.10, y: 0.85, s: 0.82, rx: -0.40, ry: -0.50, rz: 0.34 },
  { o: 0, x: 0.50, y: 0.545, s: 1.00, rx: 0.28, ry: -0.36, rz: 0.14 },
  { o: 1, x: 1.17, y: 0.455, s: 0.92, rx: 0.44, ry: -0.48, rz: 0.30 },
  { o: 2, x: 2.00, y: 0.00, s: 1.10, rx: 0.60, ry: -0.85, rz: 0.60 },
];
function slot(o, tall) {
  const list = tall ? TALL : WIDE, c = clamp(o, -2, 2), k = Math.min(3, Math.floor(c + 2)), t = c + 2 - k, a = list[k], b = list[k + 1], r = {};
  for (const key of ["x", "y", "s", "rx", "ry", "rz"]) r[key] = lerp(a[key], b[key], t);
  return r;
}

/* paint the plastic in a worker, so the page keeps running */
function paintMaps(size) {
  const here = () => paintCase(size);
  if (!("OffscreenCanvas" in window) || !("Worker" in window)) return Promise.resolve(here());
  return new Promise((done) => {
    let worker, over = false;
    const finish = (maps) => { if (over) return; over = true; clearTimeout(timer); worker?.terminate(); done(maps); };
    const timer = setTimeout(() => finish(here()), 6000);
    try {
      worker = new Worker(new URL("./case-worker.js", import.meta.url), { type: "module" });
      worker.onmessage = (e) => finish(e.data);
      worker.onerror = () => finish(here());
      worker.postMessage(size);
    } catch { finish(here()); }
  });
}
const idle = () => new Promise((ok) => ("requestIdleCallback" in window ? requestIdleCallback(ok, { timeout: 400 }) : setTimeout(ok, 60)));

/* getView() -> { heroH, scroll, t, dest: { x, y, size } }  (page pixels) */
export async function createDiscStage(container, { getView, onChange = () => {}, onReady = null } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const ratio = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  renderer.debug.checkShaderErrors = false;               // asking for the log makes the browser wait for the compiler
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // colours above are picked in display space
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  camera.position.z = 9;
  const worldH = 2 * 9 * Math.tan((12 * Math.PI) / 180);

  const need = Math.min(innerHeight * 0.52, innerWidth * 0.62) * 1.136 * ratio, maps = {};
  const painted = paintMaps(need > 900 ? 1536 : 1024);
  for (const k of ["front", "mid"]) {
    maps[k] = new THREE.Texture();
    maps[k].flipY = false;
    maps[k].anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    maps[k].generateMipmaps = true; maps[k].minFilter = THREE.LinearMipmapLinearFilter;
  }
  const plane = new THREE.PlaneGeometry(PLANE, PLANE), discGeo = new THREE.PlaneGeometry(1.644, 1.644), wallGeo = wallGeometry();
  const light = { value: 0 }, flat = { transparent: true, depthWrite: false, depthTest: false, ...OVER };

  const units = DISCS.map(() => null);
  function build(i) {
    const d = DISCS[i], k = CASES[d.shell], root = new THREE.Group(), parts = [];
    const fadeU = { value: 1 }, tiltU = { value: new THREE.Vector2() }, v = (a) => ({ value: new THREE.Vector3(...a) });
    const tint = { uDeep: v(k.deep), uMid: v(k.mid), uHi: v(k.hi), uPanel: v(k.panel) };
    const u = { uTime: { value: 0 }, uSeed: { value: d.seed }, uSpin: { value: 0 }, uFade: fadeU, uTilt: tiltU, uTint: v(k.hi), uPrint: { value: makePrint(i, d.name) } };
    const add = (mesh, order) => { mesh.userData.order = order; parts.push(mesh); root.add(mesh); };
    const layer = (map, z, order, gain, body, shadow = 0) => {
      const mesh = new THREE.Mesh(plane, new THREE.ShaderMaterial({ vertexShader: layerVert, fragmentShader: layerFrag, side: THREE.DoubleSide, ...flat,
        uniforms: { uMap: { value: map }, uFade: fadeU, uLight: light, uTilt: tiltU, uGain: { value: gain }, uBody: { value: body }, uShadow: { value: shadow }, ...tint } }));
      mesh.position.z = z; add(mesh, order);
    };
    layer(maps.front, -0.09, 0, 0.3, 0.75, 1);            // the back half of the case, seen through the plastic
    const disc = new THREE.Mesh(discGeo, new THREE.ShaderMaterial({ vertexShader: discVert, fragmentShader: discFrag, defines: { MODE: d.mode }, ...flat, uniforms: u }));
    disc.position.set(DX, DY, 0); add(disc, 1);
    layer(maps.mid, 0.035, 2, 1.12, 0.35);
    add(new THREE.Mesh(wallGeo, new THREE.ShaderMaterial({ vertexShader: wallVert, fragmentShader: wallFrag, side: THREE.DoubleSide, ...flat, uniforms: { uFade: fadeU, uLight: light, ...tint } })), 3);
    layer(maps.front, 0.09, 4, 1.16, 0.2);
    root.visible = false;
    return { root, parts, u, tiltU, fadeU, born: 0, spin: d.mode >= 4 ? -0.1 : i * 0.7, px: null };
  }
  async function prepare(i, first) {
    const un = build(i);
    await Promise.all([renderer.compileAsync(un.root, camera, scene), first ? painted.then((art) => { for (const k of ["front", "mid"]) { maps[k].image = art[k]; maps[k].needsUpdate = true; } }) : null]);
    un.born = first ? -9 : performance.now() / 1000;
    scene.add(un.root); units[i] = un;
    return un;
  }

  /* ---------- state ---------- */
  let pos = 0, vel = 0, target = 0, drag = null, playing = false, speed = 0.1, t0 = 0, alive = false;
  const mod = (a) => ((a % N) + N) % N;
  const current = () => mod(Math.round(target));
  function aim(t) { const before = current(); target = t; if (current() !== before) onChange(current()); wake(); }
  const go = (dir) => aim(Math.round(target) + dir);
  function goTo(i) { let d = mod(i - current()); if (d > N / 2) d -= N; if (d) aim(Math.round(target) + d); }
  const dragBy = (dx) => { if (!drag) drag = { from: pos }; pos = drag.from - dx / (W * 0.42); vel = 0; wake(); };
  const dragEnd = (v) => { if (!drag) return; drag = null; aim(Math.round(pos - v)); };

  let tx = 0, ty = 0, rx = 0, ry = 0, W = 1, H = 1;
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; } }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { tx = ty = 0; });
  function resize() {
    W = container.clientWidth; H = container.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); wake();
  }
  new ResizeObserver(resize).observe(container);
  document.addEventListener("visibilitychange", () => wake());
  let raf = 0, last = 0;
  function wake() { if (alive && !raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  function tick(now) {
    raf = 0; if (document.hidden) return;
    const real = Math.min(Math.max(0, now - last) / 1000, 0.5), dt = Math.min(real, 0.05), time = now / 1000; last = now;
    if (!t0) t0 = time;
    const calmStart = reduce ? 0 : clamp((time - t0) / 1.6);  // start exactly like the still image, then begin to float
    const k = 1 - Math.exp(-4.5 * dt); ry += (tx - ry) * k; rx += (ty - rx) * k;
    if (!drag) {                                              // critically damped spring
      if (reduce) pos = target;
      else for (let left = real; left > 0; left -= 1 / 120) {  // same speed on a slow phone as on a fast screen
        const h = Math.min(left, 1 / 120), w = 7.2, x = pos - target; vel += (-w * w * x - 2 * w * vel) * h; pos += vel * h;
      }
    }
    speed += ((reduce ? 0 : playing ? 1.5 : 0.12) - speed) * (1 - Math.exp(-2.2 * dt));
    const { heroH, scroll, t, dest } = getView(), tall = W / heroH < 1, px = worldH / H;
    const D = tall ? Math.min(W * 0.62, heroH * 0.37) : Math.min(heroH * 0.52, W * 0.30);
    let any = false;
    units.forEach((un, i) => {
      if (!un) return;
      const o = mod(i - pos + N / 2) - N / 2;
      const p = slot(o, tall), near = clamp(1 - Math.abs(o)), keep = near * t;            // only the middle case travels on to the about section
      const age = reduce ? 1 : clamp((time - un.born) / 0.9), appear = 1 - Math.pow(1 - age, 3);
      let x = p.x * W, y = p.y * heroH, size = p.s * D;
      const out = (1 - near) * clamp(scroll / (heroH * 0.38));                             // the others drift away while you scroll
      x += Math.sign(o || 1) * (out * 0.3 + (1 - appear) * (1 - near) * 0.06) * W;
      x = lerp(x, dest.x, keep); y = lerp(y, dest.y, keep) - scroll; size = lerp(size, dest.size, keep);
      const fade = clamp(2 - Math.abs(o)) * (1 - out) * appear, r = size * 0.8;
      const seen = fade > 0.005 && x > -r && x < W + r && y > -r && y < H + r;
      un.root.visible = seen; un.px = seen && near + (1 - out) > 0.5 ? { x, y, size } : null;
      if (!seen) return;
      any = true;
      const sway = calmStart, calm = 1 - 0.55 * keep, ph = i * 1.7;
      un.root.position.set((x - W / 2) * px, (H / 2 - y) * px + sway * Math.sin(time * 0.7 + ph) * 0.018, 0);
      un.root.scale.setScalar((size * px) / 2);
      const ax = p.rx * calm + sway * (rx * 0.22 + Math.sin(time * 0.5 + ph) * 0.035), ay = p.ry * calm + sway * (ry * 0.34 + Math.cos(time * 0.42 + ph) * 0.045);
      un.root.rotation.set(ax, ay, p.rz * calm + sway * Math.sin(time * 0.33 + ph) * 0.02);
      un.tiltU.value.set(ay * 1.3, ax * 1.3); un.fadeU.value = fade;
      un.spin += (near > 0.5 ? speed : 0.06) * sway * dt; un.u.uSpin.value = un.spin; un.u.uTime.value = 14 + (reduce ? 0 : time - t0);
      const base = Math.round((3 - Math.abs(o)) * 10) * 10;
      for (const m of un.parts) m.renderOrder = base + m.userData.order;
    });
    renderer.render(scene, camera);
    container.style.visibility = any ? "visible" : "hidden";
    if (onReady) { const ready = onReady; onReady = null; ready(); }
    if (any) raf = requestAnimationFrame(tick);              // nothing on screen: stop until you scroll back
  }
  resize();
  await prepare(0, true);                                    // only the case in the middle holds up the first frame
  renderer.initTexture(maps.front); renderer.initTexture(maps.mid);
  alive = true; wake();
  (async () => {
    for (const i of [1, N - 1, 2, N - 2, 3]) { await idle(); await prepare(i); wake(); }
    await Promise.all([document.fonts?.load('900 40px "Bodoni Moda"'), document.fonts?.load("700 18px Archivo")]).catch(() => {});
    const i = DISCS.findIndex((d) => d.name === "Prism"), un = units[i];
    if (un) { un.u.uPrint.value.dispose(); un.u.uPrint.value = makePrint(i, "Prism"); wake(); }
  })();
  return {
    go, goTo, dragBy, dragEnd, wake,
    setPlaying(v) { playing = v; wake(); },
    setTheme(dark) { light.value = dark ? 0 : 1; wake(); },
    hit(x, y) { let best = -1, d = 1; units.forEach((un, i) => { if (!un?.px) return; const q = Math.max(Math.abs(x - un.px.x), Math.abs(y - un.px.y)) / (un.px.size * 0.52); if (q < d) { d = q; best = i; } }); return best; },
    get index() { return current(); }, get playing() { return playing; },
  };
}
