# Etapa 6a — Importação nacional do Open Charge Map

Resolve a pendência da etapa 3b: a importação cobria só 60 km de Betim, então viagens
longas (ex.: Betim → São Paulo) não mostravam pontos no caminho.

## Levantamento (24/09/2026)

| Dado | Valor |
|---|---|
| Pontos do Open Charge Map no Brasil | 1.748 (1.579 operacionais, 163 fora de operação) |
| Uma requisição com o país inteiro | ~2 s, ~1,5 MB (compacto) — não precisa paginar |
| Modificados nos últimos 30 dias | 740 — vale reimportar com frequência |
| Estado preenchido | ~50% dos pontos vêm sem estado (não usar para filtrar) |

## Importador (`npm run import:ocm`)

- **Padrão: Brasil inteiro.** `--lat --lng --radius-km` continuam disponíveis para
  importar só uma região.
- Grava em **lotes** (upsert por `externalId`), em vez de um insert por ponto.
- **Pontos que saíram do Open Charge Map** (existem no banco, mas não vieram na
  importação nacional) são **desativados**, não apagados: o histórico de recargas
  continua apontando para eles. Na importação regional nada é desativado, porque ela
  não enxerga o país todo.
- Ao final, mostra: importados/atualizados, ignorados (sem coordenadas), desativados e o
  total de pontos públicos ativos.

## Efeitos no resto do sistema

| Onde | Problema com ~1.770 pontos | Ajuste |
|---|---|---|
| Painel — lista de pontos | Limite fixo de 1.000: pontos públicos seriam cortados sem aviso | Paginação (50 por página) com total, na API e no painel |
| App — viagem (`/trips`) | Limite de 200 pontos no corredor pode cortar o fim de rotas longas | Medir com dados reais; ajustar o limite se necessário |
| App — mapa (`/charge-points/nearby`) | Raio de até 50 km, limite 200 | Sem mudança (o raio limita a quantidade) |

## Critérios de aceite

- Importação nacional roda em poucos segundos e é idempotente (rodar duas vezes não
  duplica nada).
- Testes: desativação dos pontos que sumiram (só na importação nacional), paginação do
  painel.
- No app: a viagem Betim → São Paulo mostra pontos ao longo de todo o trajeto.
- No painel: a lista de pontos pagina e mostra o total.

## Fora do escopo

Agendar a reimportação automática (entra junto com o deploy) e importação incremental
com `modifiedsince` (a completa já leva poucos segundos).
