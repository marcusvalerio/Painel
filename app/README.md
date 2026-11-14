# Pauta — sistema para agências (multiempresa)

Next.js 15 + Neon (Postgres). Cada assinante é uma empresa (`tenants`); todo dado de negócio carrega `tenant_id` e toda consulta filtra pela empresa da sessão.

## Rodar local
1. Crie `.env.local` com `DATABASE_URL=...` (string do projeto Neon "painel").
2. `npm install`
3. `node --env-file=.env.local db/migrate.mjs` (aplica `db/schema.sql`)
4. `npm run dev`

## Rotas
- `/assinar` cria a agência e o usuário dono (planos em teste, sem cobrança ainda)
- `/entrar` login
- `/app` início · `/app/demandas` kanban · `/app/clientes`
- `/aprovar/[token]` link público para o cliente aprovar ou pedir ajuste

## Deploy (Vercel)
Root Directory: `app`. Variável de ambiente: `DATABASE_URL`.
