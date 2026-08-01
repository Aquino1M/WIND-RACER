# WIND RACER

Jogo de corrida de barcos 3D para navegador, construído com Three.js.

## Recursos

- Corridas solo e multiplayer por código de sala
- Caravela Portuguesa, Drakkar Viking e Baleeira Amazônica
- Loja de barcos, skins de casco e velas
- Upgrades de velocidade, regeneração de turbo e moedas
- Checkpoints obrigatórios e escolha da quantidade de voltas
- Colisões entre barcos, boias e portais
- Sistema de vácuo ao navegar atrás de adversários
- Três cargas de turbo com regeneração visual
- Gráficos Leve, Médio e Alto
- Som procedural de motor
- Nickname e progresso salvos no navegador

## Jogar localmente

No Windows, abra `ABRIR_JOGO.bat`.

Também é possível iniciar manualmente:

```bash
python -m http.server 8765
```

Depois acesse `http://127.0.0.1:8765/`.

## Controles

- `W` ou seta para cima: acelerar
- `S` ou seta para baixo: frear e dar ré
- `A/D` ou setas laterais: virar
- `Espaço`: usar turbo
- `Esc`: pausar

## Publicação

O projeto contém `vercel.json` e pode ser publicado como site estático na Vercel.
