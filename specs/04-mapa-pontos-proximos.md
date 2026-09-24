# Etapa 3a — Mapa com pontos próximos, rota e "Como chegar"

Atende RF08, RF09, RF10 e RNF01. A busca por destino e os pontos ao longo do trajeto
(RF05, RF07) ficam para a etapa 3b.

## Tecnologias

| Necessidade | Escolha |
|---|---|
| Mapa | `react-native-maps` (Apple Maps no iOS, Google Maps no Android) |
| Posição do usuário | `expo-location`, permissão apenas durante o uso |
| Busca por proximidade | PostGIS: `geometry(Point, 4326)` + índice GiST + `ST_DWithin`/`ST_Distance` em `geography` (metros) |
| Rota | Mapbox Directions, chamado **pela API** (o token nunca vai para o app) |
| Detalhes do ponto | Rota do Expo Router com `presentation: 'formSheet'` |
| "Como chegar" | Links para Apple Maps, Google Maps e Waze |
| Tipos app ↔ API | Orval gera hooks do TanStack Query a partir do OpenAPI da API |
| Pontos públicos | Importação do Open Charge Map (CC BY 4.0) |

## Dados

- **partner**: `id`, `name`, `document`, `email`, `phone`, `active`, timestamps
- **charge_point**: `id`, `source` (`partner` | `ocm`), `partnerId` (obrigatório quando
  `source = 'partner'`), `externalId` (id no Open Charge Map, único), `name`, `description`,
  `address`, `location` (Point 4326, índice GiST), `powerKw`, `pricePerKwhCents`,
  `connectors` (lista), `openingHours`, `attribution`, `active`, timestamps
- Pontos de parceiros vêm do seed (`npm run db:seed`) até o painel admin (etapa 5).
- Pontos públicos vêm de `npm run import:ocm` (chave `OCM_API_KEY`), atualizados por
  `externalId` a cada execução.

## API (todas exigem sessão)

| Método | Rota | Resposta |
|---|---|---|
| GET | `/charge-points/nearby?lat&lng&radiusKm` | Pontos ativos no raio (padrão 10 km, máx. 50), do mais perto ao mais longe, com `distanceMeters`; até 200 |
| GET | `/charge-points/:id` | Detalhes do ponto (404 se não existe ou inativo) |
| GET | `/directions?fromLat&fromLng&toLat&toLng` | `{ distanceMeters, durationSeconds, coordinates: [{ latitude, longitude }] }` via Mapbox; 502 se o Mapbox falhar |

## App — aba Localização

1. Pede permissão de localização. Com permissão: centraliza na posição atual. Sem
   permissão: centraliza em Betim e explica como ativar.
2. Mostra os pontos próximos: **verde** para parceiros, **cinza** para pontos públicos.
3. Ao arrastar o mapa, aparece "Buscar nesta área".
4. Tocar num ponto abre o painel com nome, endereço, distância, potência, preço por kWh
   (parceiros), conectores e o crédito do Open Charge Map (pontos públicos).
5. "Ver rota" desenha a rota em verde e mostra distância e tempo, com o crédito
   "© Mapbox © OpenStreetMap" visível sobre o mapa.
6. "Como chegar" oferece Apple Maps (iOS), Google Maps e Waze.

## Critérios de aceite

- Testes da API para proximidade (ordem, raio, inativos fora), detalhes, rota (Mapbox
  simulado) e 401 sem sessão.
- No iPhone: ver os pontos, abrir detalhes, ver a rota e abrir o Waze/Apple Maps.
- Lint e typecheck sem erros nos dois projetos.
