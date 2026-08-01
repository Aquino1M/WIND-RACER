# WIND RACER

Regata arcade 3D para navegadores, com modos solo e multiplayer.

## Recursos

- Nove barcos com modelos, skins e atributos próprios.
- Oficina com nove upgrades de cinco níveis e evolução visual.
- Corridas com voltas, checkpoints, colisões, vácuo, turbo, obstáculos e recompensas.
- Lobby público ou por código, lista de membros e confirmação de preparo.
- Interface responsiva e gráficos Leve, Médio ou Alto.

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

Three.js renderiza o jogo; Supabase fornece lobby e Realtime. Progresso, compras e configurações ficam no `localStorage` do navegador. As dependências em `package.json` só são necessárias para reconstruir os arquivos de `vendor/`.
