# Gráfica+ — Sistema de Gestão (ERP/CRM)

Sistema de gestão empresarial para gráfica comercial, construído com React + Express + PostgreSQL.

## Stack

- **Frontend**: React 18, Wouter (routing), TanStack Query v5, Shadcn/ui, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **AI**: OpenAI gpt-4o-mini (via AI_INTEGRATIONS_OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_BASE_URL)
- **CNPJ Lookup**: publica.cnpj.ws (primário, com IE) → BrasilAPI → ReceitaWS (fallbacks)
- **Auth**: Session-based com express-session (SESSION_SECRET)

## Arquitetura

```
client/src/
  pages/
    dashboard.tsx          — Dashboard com stats, aniversários, atividades recentes
    clients/
      index.tsx            — Lista de clientes com busca/filtro/paginação
      detail.tsx           — Detalhe do cliente (tabs: Geral, Contatos, CRM, Histórico)
      form.tsx             — Cadastro/edição; toggle PF/PJ; PJ=CNPJ auto-fill; prazo de pagamento
    sellers/
      index.tsx            — Lista de vendedores (cards)
      detail.tsx           — Detalhe do vendedor
      form.tsx             — Cadastro/edição; toggle PF/PJ; PJ=CNPJ auto-fill + nomeFantasia
    companies/
      index.tsx            — Listagem de empresas (logo, CNPJ, status, empresa padrão)
      form.tsx             — Cadastro/edição com 3 abas: Informações | Imagens | Nota Fiscal (em breve)
    payment-terms/
      index.tsx            — Gestão de prazos de pagamento (nome + dias em array)
    payment-methods/
      index.tsx            — Gestão de formas de pagamento (nome + ativo)
    raw-materials/
      index.tsx            — Lista de matérias-primas com busca/filtro
      form.tsx             — Cadastro/edição de matérias-primas
    products/
      index.tsx            — Lista de produtos com busca/filtro
      form.tsx             — Cadastro/edição com componentes (matérias-primas)
      ai-generator.tsx     — Gerador de produtos com IA (OpenAI)
    quotes/
      index.tsx            — Lista de orçamentos
      form.tsx             — Criação/edição com itens, AI assist, prazo/forma pagamento (select)
      detail.tsx           — Detalhe do orçamento; botão Imprimir → /quotes/:id/print
      print.tsx            — Layout A4 de impressão (sem sidebar)
    orders/
      index.tsx            — Lista de pedidos com status de produção
      detail.tsx           — Detalhe do pedido com status tracking; botão Imprimir → /orders/:id/print
      print.tsx            — Layout A4 de impressão do pedido (sem sidebar)
    crm.tsx                — CRM com kanban de tarefas
  components/
    app-sidebar.tsx        — Sidebar: Principal | Comercial | Cadastros | Configurações
    contacts-panel.tsx     — Gestão de contatos (add/edit/delete com permissões)
    timeline-feed.tsx      — Feed de atividades/histórico do cliente
    status-badge.tsx       — Badges coloridos por status/tipo
    theme-provider.tsx     — Tema dark/light
    theme-toggle.tsx       — Botão de alternância de tema

server/
  routes.ts               — Todas as rotas REST da API
  storage.ts              — Interface de banco (DatabaseStorage)
  ai.ts                   — Serviços de IA (sugestão de produtos, itens de orçamento)
  cnpj.ts                 — Serviço de busca CNPJ
  seed.ts                 — Dados de exemplo para desenvolvimento

shared/
  schema.ts               — Schema Drizzle + tipos TypeScript
```

## Banco de Dados (tabelas principais)

- `clients` — Clientes com dados fiscais, endereço, CRM, CNPJ lookup metadata
- `client_contacts` — Contatos por cliente com permissões granulares
- `sellers` — Vendedores com dados bancários e Pix
- `seller_bank_accounts` — Contas bancárias e Pix dos vendedores
- `client_seller_links` — Vínculo vendedor-cliente (N:N)
- `crm_interactions` — Interações CRM (ligação, email, reunião, etc.)
- `crm_tasks` — Tarefas com prioridade e status (pendente/em_andamento/concluida)
- `activity_timeline` — Timeline de eventos por cliente
- `company_lookup_logs` — Log de consultas de CNPJ
- `payment_terms` — Prazos de pagamento (nome + array de dias)
- `payment_methods` — Formas de pagamento (nome + ativo)
- `raw_materials` — Matérias-primas com preço/unidade
- `products` — Produtos com componentes (FK → raw_materials)
- `product_components` — Componentes de produto (matéria-prima + quantidade)
- `quotes` — Orçamentos com itens, totais, prazo/forma de pagamento
- `quote_items` — Itens do orçamento com medidas e cálculo de área
- `orders` — Pedidos gerados de orçamentos com status de produção
- `order_items` — Itens do pedido

## Rotas de API principais

- `GET/POST/PATCH/DELETE /api/clients` — CRUD de clientes
- `GET/POST/PATCH/DELETE /api/sellers` — CRUD de vendedores
- `GET/POST/PATCH/DELETE /api/payment-terms` — Prazos de pagamento
- `GET/POST/PATCH/DELETE /api/payment-methods` — Formas de pagamento
- `GET/POST/PATCH/DELETE /api/raw-materials` — Matérias-primas
- `GET/POST/PATCH/DELETE /api/products` — Produtos
- `GET/POST/PATCH/DELETE /api/quotes` — Orçamentos
- `GET/PUT /api/quotes/:id/items` — Itens do orçamento
- `GET/POST/PATCH /api/orders` — Pedidos
- `PATCH /api/orders/:id/status` — Atualizar status de produção
- `POST /api/ai/suggest-product` — IA sugere composição de produto
- `POST /api/ai/suggest-quote-item` — IA sugere item de orçamento com preço
- `GET /api/cnpj/:cnpj` — Consulta CNPJ

## Funcionalidades

- Cadastro completo de clientes/vendedores com auto-preenchimento via CNPJ
- CRM: interações, tarefas em kanban, timeline de atividades automática
- Prazos de pagamento: cadastro de condições (ex: "30/60/90 dias")
- Formas de pagamento: cadastro de métodos (PIX, Boleto, etc.) usados como select nos orçamentos
- Matérias-primas: cadastro com preço, unidade e fornecedor
- Produtos: composição com matérias-primas + cálculo de custo automático
- Gerador de produtos com IA (descreve produto, IA sugere composição técnica)
- Orçamentos: criação com itens, cálculo de área (m²), AI assist de preço, totais com desconto/impostos
- Pedidos: rastreamento de produção (aguardando → em produção → finalizado → entregue)
- Impressão profissional A4 para orçamentos e pedidos (sem sidebar, com botão imprimir)
- Tema dark/light com persistência

## Sidebar (grupos de navegação)

- **Principal**: Dashboard, Clientes, Vendedores, CRM
- **Comercial**: Orçamentos, Pedidos
- **Cadastros**: Matérias-primas, Produtos
- **Configurações**: Prazos de Pagamento, Formas de Pagamento

## Design

- Cor primária: azul profissional (`--primary: 217 91% 35%`)
- Fonte: Open Sans (importada via CSS)
- Sidebar colapsável com ícones
- Badges coloridos por status
- Todos elementos interativos têm `data-testid` para testes automatizados
- Print pages: sem sidebar, layout A4, detecção via `window.location.pathname.endsWith('/print')`

## Numeração automática

- Orçamentos: `ORC-YYYY-NNNN`
- Pedidos: `PED-YYYY-NNNN`
