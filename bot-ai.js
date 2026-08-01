(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WindBotAI=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const configs={
    easy:{speed:.78,accel:.8,turn:.78,anticipation:.16,scan:30,braking:.34,turboAngle:.08},
    medium:{speed:.94,accel:.94,turn:.95,anticipation:.28,scan:43,braking:.27,turboAngle:.16},
    hard:{speed:1.08,accel:1.06,turn:1.12,anticipation:.4,scan:58,braking:.2,turboAngle:.24},
  };
  const fleets=Object.freeze({
    easy:['vento','coral','baleeira','caravela','viking','solar'],
    medium:['coral','tempestade','espectro','caravela','viking','baleeira'],
    hard:['espectro','bigdog','tempestade','solar','viking','caravela'],
  });
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const angleDiff=(a,b)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d};
  const point=(p)=>({x:Number(p?.x)||0,z:Number(p?.z??p?.y)||0});
  function steeringSeed(id){let n=0;for(const c of String(id||'BOT'))n=(n*31+c.charCodeAt(0))|0;return n%2?-1:1}
  function decide({racer,track,obstacles=[],racers=[],difficulty='medium'}){
    const cfg=configs[difficulty]||configs.medium,cp=Math.max(0,Math.min(track.length-1,racer.cp|0));
    const here={x:Number(racer.x)||0,z:Number(racer.z)||0},target=point(track[cp]),next=point(track[(cp+1)%track.length]),after=point(track[(cp+2)%track.length]);
    const distance=Math.hypot(target.x-here.x,target.z-here.z),blend=cfg.anticipation*clamp(1-distance/145,0,1);
    let aimX=target.x+(next.x-target.x)*blend,aimZ=target.z+(next.z-target.z)*blend;
    const fx=Math.sin(racer.a),fz=Math.cos(racer.a),rx=fz,rz=-fx,seed=steeringSeed(racer.netId||racer.name);
    const avoid=(object,radius=3)=>{const dx=object.x-here.x,dz=object.z-here.z,forward=dx*fx+dz*fz,side=dx*rx+dz*rz,range=cfg.scan+(Number(racer.spd)||0)*.24,corridor=radius+4.5;if(forward<=1||forward>range||Math.abs(side)>corridor)return;const strength=(1-forward/range)*(corridor-Math.abs(side)+2)*3.2,direction=Math.abs(side)<.5?seed:-Math.sign(side);aimX+=rx*direction*strength;aimZ+=rz*direction*strength};
    obstacles.forEach(o=>avoid(o,Number(o.r)||2));
    racers.forEach(other=>{if(other!==racer&&!other.done)avoid(other,5.5)});
    const desired=Math.atan2(aimX-here.x,aimZ-here.z),steer=angleDiff(racer.a,desired),h1=Math.atan2(next.x-target.x,next.z-target.z),h2=Math.atan2(after.x-next.x,after.z-next.z),curve=Math.abs(angleDiff(h1,h2));
    const ratio=clamp(1-curve/Math.PI*cfg.braking,.7,1),maximum=Math.max(1,Number(racer.spec?.speed)||40),throttle=(Number(racer.spd)||0)<maximum*ratio?cfg.accel:-.72;
    const turbo=distance>48&&curve<.42&&Math.abs(steer)<cfg.turboAngle&&(Number(racer.spd)||0)>maximum*.58&&(racer.turbos||0)>0&&(racer.aiTurboCooldown||0)<=0;
    return{steer,throttle,turbo,curve,aim:{x:aimX,z:aimZ},config:cfg};
  }
  return Object.freeze({configs,fleets,decide,angleDiff});
});
