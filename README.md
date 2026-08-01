# WIND RACER

Regata arcade 3D para navegadores, com modos solo e multiplayer.

## Recursos

- Nove barcos com modelos, skins e atributos próprios.
- Oficina com nove upgrades de cinco níveis e evolução visual.
- Corridas com voltas, checkpoints, colisões, vácuo, turbo, obstáculos e recompensas.
- Lobby público ou por código, lista de membros e confirmação de preparo.
- Conta anônima, carteira protegida, canais privados e resultados validados pelo Supabase.
- Tutorial, contrarrelógio com fantasma, campeonato, estatísticas, temporada e desafios diários.
- Interface responsiva e gráficos Auto, Leve, Médio ou Alto.

## Executar

No Windows, abra `ABRIR_JOGO.bat`. Alternativamente:

```bash
python -m http.server 8765
```

Acesse `http://127.0.0.1:8765/`. O deploy usa `vercel.json`.

## Controles

- PC: `WASD` ou setas; `Espaço` usa turbo; `Esc` pausa.
- Mobile: aceleração automática, botões de direção, turbo e pausa.

## Tecnologia e dados

Three.js renderiza o jogo; Supabase fornece Auth, banco, lobby, carteira e Realtime privado. O `localStorage` mantém apenas cache, configurações e o fantasma local. Rode `npm test` para validar regras de corrida, segurança e física.

O backend reproduzível está em `supabase/migrations/` e a Edge Function do lobby em `supabase/functions/public-rooms/`.
