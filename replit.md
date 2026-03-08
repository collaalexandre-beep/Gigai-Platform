# Gráfica+ — Sistema de Gestão (ERP/CRM)

Sistema de gestão empresarial para gráfica comercial, construído com React + Express + PostgreSQL.

## Stack

- **Frontend**: React 18, Wouter (routing), TanStack Query v5, Shadcn/ui, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **CNPJ Lookup**: BrasilAPI (primário) + ReceitaWS (fallback)
- **Auth**: Session-based com express-session (SESSION_SECRET)

## Arquitetura

```
client/src/
  pages/
    dashboard.tsx          — Dashboard com stats, aniversários, atividades recentes
    clients/
      index.tsx            — Lista de clientes com busca/filtro/paginação
      detail.tsx           — Detalhe do cliente (tabs: Geral, Contatos, CRM, Histórico)
      form.tsx             — Cadastro/edição com CNPJ auto-fill
    sellers/
      index.tsx            — Lista de vendedores (cards)
      detail.tsx           — Detalhe do vendedor
      form.tsx             — Cadastro/edição com dados bancários
    crm.tsx                — CRM com kanban de tarefas
  components/
    app-sidebar.tsx        — Navegação lateral (Dashboard, Clientes, Vendedores, CRM)
    contacts-panel.tsx     — Gestão de contatos (add/edit/delete com permissões)
    timeline-feed.tsx      — Feed de atividades/histórico do cliente
    status-badge.tsx       — Badges coloridos por status/tipo
    theme-provider.tsx     — Tema dark/light
    theme-toggle.tsx       — Botão de alternância de tema

server/
  routes.ts               — Todas as rotas REST da API
  storage.ts              — Interface de banco (DatabaseStorage)
  cnpj.ts                 — Serviço de busca CNPJ (BrasilAPI + ReceitaWS)
  seed.ts                 — Dados de exemplo para desenvolvimento

shared/
  schema.ts               — Schema Drizzle + tipos TypeScript
```

## Banco de Dados (tabelas principais)

- `clients` — Clientes com dados fiscais, endereço, CRM, CNPJ lookup metadata
- `client_contacts` — Contatos por cliente com permissões granulares
- `sellers` — Vendedores
- `seller_bank_accounts` — Contas bancárias e Pix dos vendedores
- `client_seller_links` — Vínculo vendedor-cliente (N:N)
- `crm_interactions` — Interações CRM (ligação, email, reunião, etc.)
- `crm_tasks` — Tarefas com prioridade e status (pendente/em_andamento/concluida)
- `activity_timeline` — Timeline de eventos por cliente
- `company_lookup_logs` — Log de todas as consultas de CNPJ

## Rotas de API

- `GET/POST/PATCH/DELETE /api/clients` — CRUD de clientes
- `GET/POST/PATCH/DELETE /api/clients/:id/contacts` — Contatos
- `GET/POST/DELETE /api/clients/:id/sellers` — Vínculos de vendedores
- `GET/POST/DELETE /api/clients/:id/interactions` — Interações CRM
- `GET /api/clients/:id/timeline` — Histórico de atividades
- `GET/POST/PATCH/DELETE /api/sellers` — CRUD de vendedores
- `POST/PATCH/DELETE /api/sellers/:id/bank-accounts` — Contas bancárias
- `GET/POST/PATCH /api/tasks` — Tarefas CRM
- `GET /api/cnpj/:cnpj` — Consulta CNPJ (BrasilAPI + ReceitaWS fallback)
- `GET /api/dashboard` — Estatísticas do dashboard

## Funcionalidades

- Cadastro completo de clientes com auto-preenchimento via CNPJ (BrasilAPI)
- Gestão de contatos com permissões detalhadas (aprovar compras, financeiro, produção)
- CRM: interações, tarefas em kanban, histórico completo
- Vendedores com dados bancários e chave Pix
- Timeline de atividades automática para todas as operações
- Tema dark/light com persistência
- Seed data realista (Globo, Magalu, Arte & Estilo, etc.)

## Design

- Cor primária: azul profissional (`--primary: 217 91% 35%`)
- Sidebar colapsável com ícones
- Badges coloridos por status: ativo (verde), prospect (azul), inativo (cinza)
- Prioridades de tarefas: baixa (cinza), média (amarelo), alta (laranja), urgente (vermelho)
- Todos elementos interativos têm `data-testid` para testes automatizados

## Dados de Exemplo (Seed)

5 clientes: Rede Globo, Magazine Luiza, Arte & Estilo, AF Construções, TechSol
2 vendedores: Rafael Mendonça, Juliana Costa
5 contatos, tarefas, interações, timeline events por cliente
