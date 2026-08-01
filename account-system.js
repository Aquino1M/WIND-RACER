(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WindAccount=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const ACCOUNT_DOMAIN='players.wind-racer.invalid';
  function normalizeNickname(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_]/g,'').toLowerCase().slice(0,16)}
  function nicknameError(value){const raw=String(value||''),clean=normalizeNickname(raw);if(clean.length<3)return'O nickname da conta precisa ter pelo menos 3 caracteres.';if(raw.length>16)return'O nickname pode ter no máximo 16 caracteres.';if(!/^[a-zA-Z0-9_]+$/.test(raw))return'Use somente letras, números e _.';return''}
  function passwordError(value){const password=String(value||'');if(password.length<8)return'A senha precisa ter pelo menos 8 caracteres.';if(password.length>72)return'A senha pode ter no máximo 72 caracteres.';return''}
  function accountEmail(value){return`${normalizeNickname(value)}@${ACCOUNT_DOMAIN}`}
  function level(value){return Math.max(1,Math.min(999,Math.floor(Number(value)||1)))}
  function tag(name,value){return`${String(name||'MARUJO').slice(0,16)}  ·  NV.${level(value)}`}
  return{normalizeNickname,nicknameError,passwordError,accountEmail,level,tag};
});
