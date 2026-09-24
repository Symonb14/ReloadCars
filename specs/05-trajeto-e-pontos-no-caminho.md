# Etapa 3b — Busca de destino e pontos ao longo do trajeto

Atende RF05 (busca de trajeto informando destino e localização atual), RF07 (pontos
disponíveis no decorrer do trajeto) e RNF01 (resposta em até 10 s).

## Busca de destino: Mapbox Search Box (sugestões)

Comparação feita com locais de Betim e BH:

| Opção | "PUC Minas Betim" | Custo |
|---|---|---|
| Geocoding v6 (endereços) | Errou (fazenda em Esmeraldas) | 100 mil/mês grátis |
| Search Box `/forward` (1 chamada) | Acertou, mas texto incompleto traz resultados piores | 50 mil req./mês grátis, depois US$ 1/mil |
| **Search Box `/suggest` + `/retrieve`** | **Acertou; bom com texto incompleto** | 500 buscas/mês grátis, depois US$ 3/mil |

Escolha: `/suggest` + `/retrieve`. Uma "sessão" (todas as sugestões enquanto a pessoa
digita + a escolha final) conta como uma busca. O app gera um `sessionToken` (UUID v4)
por busca e a API repassa ao Mapbox. Os resultados não são guardados no banco (os termos
do Search Box só permitem uso temporário).

## API (todas exigem sessão)

| Método | Rota | Resposta |
|---|---|---|
| GET | `/places/suggestions?q&sessionToken&lat&lng` | Até 8 sugestões `{ id, name, address, type }`, priorizando perto de `lat/lng`; `q` com 3+ caracteres |
| GET | `/places/:id?sessionToken` | `{ id, name, address, latitude, longitude }` |
| GET | `/trips?fromLat&fromLng&toLat&toLng&corridorKm` | `{ route: { distanceMeters, durationSeconds, coordinates }, chargePoints: [...] }` |

`/trips`:
- Calcula a rota de carro pelo Mapbox (mesmo cliente da etapa 3a).
- No PostGIS, cruza a linha da rota com os pontos: `ST_DWithin(ponto, rota, corridorKm)`
  (padrão 2 km, máx. 10).
- Cada ponto volta com `distanceFromRouteMeters` (desvio da rota) e
  `distanceAlongRouteMeters` (em que km do trajeto ele fica, via `ST_LineLocatePoint`),
  ordenados pela posição no trajeto.
- Erros: 404 sem rota; 502 se o Mapbox falhar.

## App — aba Localização

1. Campo "Para onde você vai?" no topo do mapa abre a tela de busca.
2. Tela de busca: sugestões enquanto digita (a partir de 3 letras, com espera de 300 ms
   entre teclas), priorizando locais perto do usuário.
3. Ao escolher, o mapa entra no **modo viagem**:
   - rota da posição atual até o destino, marcador do destino;
   - somente os pontos de recarga do caminho, verdes (parceiros) e cinza (públicos);
   - cartão inferior: destino, distância e tempo, "N pontos no caminho" e uma lista
     horizontal com cada ponto ("no km 12 · 300 m da rota");
   - tocar num ponto abre o mesmo painel de detalhes da etapa 3a;
   - "Como chegar" abre a navegação até o destino; "×" sai do modo viagem.
4. Crédito "© Mapbox © OpenStreetMap" visível no modo viagem.

## Critérios de aceite

- Testes da API: sugestões e detalhe do local (Mapbox simulado, `sessionToken`
  repassado), trajeto com pontos dentro e fora do corredor, ordem pela posição no
  trajeto, validações e 401 sem sessão.
- No iPhone: buscar "PUC Minas Betim" ou um endereço, ver a rota e os pontos no caminho,
  abrir um ponto e abrir a navegação.
- Lint e typecheck sem erros nos dois projetos.

## Fora do escopo (futuro)

Adicionar o ponto de recarga como parada no meio do trajeto; filtrar por conector ou
potência; escolher o tamanho do corredor no app.
