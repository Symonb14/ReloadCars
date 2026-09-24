# ReloadCars — App mobile

Expo SDK 57 + Expo Router + Uniwind + Better Auth. Especificação em
[`../specs/03-mobile-base.md`](../specs/03-mobile-base.md).

## Como rodar no celular (Expo Go)

1. Suba a API (veja [`../server/README.md`](../server/README.md)).
2. Configure o endereço da API com o IP do computador na rede local:

   ```bash
   cp .env.example .env.local   # e ajuste EXPO_PUBLIC_API_URL (ipconfig mostra o IP)
   npm install
   ```

3. Entre na sua conta Expo no terminal. Desde o SDK 57, o Expo Go exige a **mesma conta**
   logada no terminal e no app:

   ```bash
   npx expo login
   ```

4. Rode `npm start` e leia o QR code com a câmera do iPhone (ou pelo Expo Go no Android).

Celular e computador precisam estar na mesma rede Wi-Fi. Se o app não conectar, libere o
Node.js no Firewall do Windows (redes privadas) para as portas 8081 (Metro) e 3333 (API).

## Scripts

| Script | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento do Expo |
| `npm run lint` / `npm run format` | Verifica / corrige com Biome |
| `npm run typecheck` | Checa os tipos |
| `npm run api` | Regenera os hooks da API em `src/api/generated` a partir de `../server/openapi.json` (rode `npm run openapi` no server antes) |
| `npm run doctor` | Diagnostica dependências e configuração do Expo |

Instale pacotes com `npx expo install <pacote>`, que escolhe versões compatíveis com o SDK.
