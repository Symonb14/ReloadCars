# Etapa 2 — Mobile base

Substitui o `mobile/` de 2023 (Expo 48, login pelo GitHub) por um app novo que já fala com
a API da etapa 1. Atende RF01–RF04 no app do motorista.

## Stack

- Expo SDK 57 + Expo Router (rotas por arquivo), TypeScript estrito
- Uniwind (Tailwind v4) para estilo
- Better Auth: `better-auth/react` + `@better-auth/expo/client`, sessão guardada no
  `expo-secure-store`
- TanStack Query para chamadas à API; react-hook-form + Zod para formulários
- Biome para lint e formatação

## Telas

Visual baseado no MVP do vídeo: fundo claro, logo do carro com folha, campos cinza
arredondados, botão principal verde em formato de pílula e botão secundário escuro.

| Rota | Tela | Requisito |
|---|---|---|
| `/sign-in` | Logo, "Seja bem-vindo!", e-mail, senha, "Começar sua recarga!" e "Criar conta" | RF01 |
| `/sign-up` | Nome, e-mail, senha, confirmar senha, "Salvar" e voltar | RF02 |
| `/(tabs)/reloads` | Aba **Recargas**: estado vazio (histórico chega na etapa 4) | — |
| `/(tabs)/map` | Aba **Localização**: aviso de que o mapa chega na etapa 3 | — |
| `/(tabs)/profile` | Aba **Perfil**: nome, e-mail, editar nome, trocar senha, sair | RF03, RF04 |

Em relação ao vídeo, a aba **Perfil** é nova: o TCC listava a gestão de perfil como trabalho
futuro, e o botão de sair do cabeçalho passa para ela.

## Regras

- Sem sessão, só `/sign-in` e `/sign-up` ficam acessíveis; com sessão, só as abas
  (`Stack.Protected`).
- Validação no app antes de enviar: e-mail válido, senha com no mínimo 8 caracteres,
  confirmação igual à senha. Erros da API aparecem em português.
- Contas `admin` usam o painel web; no app, qualquer perfil pode entrar, mas o conteúdo é
  o do motorista.
- Endereço da API em `EXPO_PUBLIC_API_URL` (IP da máquina na rede local durante o
  desenvolvimento, porque o celular não enxerga `localhost`).

## Critérios de aceite

- Criar conta, sair, entrar de novo e ver o perfil funcionando no iPhone pelo Expo Go.
- Alterar o nome e a senha pelo Perfil; o novo nome aparece após recarregar.
- `npm run lint` e `npx tsc` sem erros.
