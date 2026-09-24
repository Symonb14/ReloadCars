# Etapa 3b — Busca de destino e pontos ao longo do trajeto

Atende RF05 e RF07. Spec detalhada será escrita ao iniciar a etapa.

## Escopo previsto

- Campo "Para onde você vai?" com sugestões enquanto digita (Mapbox Geocoding, pela API).
- Rota da posição atual até o destino, desenhada no mapa.
- Pontos de recarga a até X km do trajeto destacados, calculados no PostGIS
  (`ST_DWithin` entre cada ponto e a linha da rota).

## Ponto de atenção

A busca do Mapbox é boa para ruas e números, mas fraca para nomes de estabelecimentos
(ex.: "PUC Minas Betim" retornou uma fazenda em Esmeraldas). Avaliar na etapa: busca por
proximidade da posição atual, Search Box API do Mapbox (POIs, cota grátis menor) ou
outro provedor.
