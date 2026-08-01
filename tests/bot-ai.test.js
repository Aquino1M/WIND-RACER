const test=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../bot-ai.js');
const track=[{x:0,y:100},{x:100,y:100},{x:100,y:0},{x:0,y:0}];
const racer={x:0,z:0,a:0,spd:35,cp:0,turbos:3,netId:'bot1',spec:{speed:50}};

test('dificuldade aumenta velocidade, antecipação e leitura da pista',()=>{
  assert.ok(ai.configs.hard.speed>ai.configs.medium.speed);
  assert.ok(ai.configs.medium.speed>ai.configs.easy.speed);
  assert.ok(ai.configs.hard.scan>ai.configs.easy.scan);
  assert.ok(ai.configs.hard.anticipation>ai.configs.easy.anticipation);
});

test('frota dos bots utiliza todos os barcos disponíveis na loja',()=>{
  const expected=['vento','coral','tempestade','espectro','caravela','viking','baleeira','bigdog','solar'];
  const used=new Set(Object.values(ai.fleets).flat());
  assert.deepEqual(expected.filter(id=>!used.has(id)),[]);
  assert.equal(Object.values(ai.fleets).every(fleet=>fleet.length===6),true);
});

test('bot desvia de obstáculo em vez de apontar diretamente para ele',()=>{
  const clear=ai.decide({racer,track,difficulty:'hard'});
  const blocked=ai.decide({racer,track,obstacles:[{x:0,z:20,r:4}],difficulty:'hard'});
  assert.notEqual(blocked.aim.x,clear.aim.x);
  assert.ok(Math.abs(blocked.steer)>Math.abs(clear.steer));
});

test('bot guarda turbo para reta alinhada e reduz em curva',()=>{
  const straight=ai.decide({racer,track:[{x:0,y:100},{x:0,y:200},{x:0,y:300}],difficulty:'hard'});
  const corner=ai.decide({racer:{...racer,cp:1,x:0,z:70},track,difficulty:'hard'});
  assert.equal(straight.turbo,true);
  assert.ok(corner.curve>straight.curve);
  assert.ok(corner.throttle<=straight.throttle);
});
