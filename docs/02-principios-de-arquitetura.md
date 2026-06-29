# Princípios de Arquitetura

Versão: 1.0

---

# Objetivo

Definir os princípios fundamentais que norteiam toda a arquitetura do Gigai Platform.

Este documento possui prioridade sobre decisões de implementação.

Sempre que houver dúvida entre duas soluções técnicas, deverá ser escolhida aquela que respeitar melhor estes princípios.

---

# 1. Arquitetura orientada a processos

O Gigai não é organizado por telas.

O Gigai é organizado por processos de negócio.

Exemplo:

Cliente
↓
Orçamento
↓
Aprovação
↓
Produção
↓
Compra
↓
Recebimento
↓
Financeiro
↓
Entrega

As telas existem apenas para facilitar esses processos.

---

# 2. Arquitetura orientada a eventos

O sistema registra eventos.

Não apenas alterações.

Exemplos de eventos:

• Material recebido
• Pedido aprovado
• Estoque movimentado
• Pagamento realizado
• Cliente cadastrado
• XML importado
• Ordem de produção iniciada

Todo evento pode alimentar:

- Timeline
- Auditoria
- IA
- Dashboard
- Notificações

---

# 3. Informação única

Uma informação possui apenas uma fonte oficial.

Exemplos:

O CNPJ pertence ao cadastro do cliente.

Nunca será armazenado novamente em pedidos.

O nome do fornecedor pertence ao cadastro do fornecedor.

Nunca será duplicado.

---

# 4. Não duplicar lógica

Toda lógica reutilizável deverá existir apenas uma vez.

Exemplos:

✔ Timeline

✔ Anexos

✔ Comentários

✔ Auditoria

✔ Permissões

✔ Aprovação

Todos os módulos utilizarão os mesmos componentes.

---

# 5. Componentização

Todo elemento visual deverá ser reutilizável.

Exemplos:

Tabela

Formulário

Filtro

Upload

Timeline

Dashboard

Cards

Modais

Nenhum módulo deverá criar sua própria versão desses componentes.

---

# 6. Arquitetura desacoplada

Os módulos não devem depender diretamente uns dos outros.

Eles devem conversar através de serviços e eventos.

Exemplo:

Recebimento de XML

↓

Evento

↓

Atualizar estoque

↓

Criar contas a pagar

↓

Atualizar fornecedor

↓

Atualizar fluxo de caixa

---

# 7. Inteligência Artificial como serviço

A IA não pertence a um módulo.

Ela pertence ao Core.

Todos os módulos podem utilizá-la.

Exemplos:

Compras

Financeiro

PCP

CRM

Produção

RH

---

# 8. Segurança desde o início

Toda ação deve possuir:

• usuário

• data

• hora

• origem

• histórico

Nenhuma alteração importante poderá ocorrer sem rastreabilidade.

---

# 9. Escalabilidade

Toda decisão deve considerar crescimento.

O sistema deverá suportar:

- múltiplas empresas
- múltiplas filiais
- múltiplos países
- múltiplos idiomas
- múltiplas moedas

Mesmo que essas funcionalidades ainda não estejam implementadas.

---

# 10. API First

Toda funcionalidade deverá poder ser acessada por API.

A interface gráfica será apenas um consumidor dessas APIs.

Isso permitirá:

- Aplicativos móveis

- Marketplace

- Integrações

- IA

- Clientes externos

---

# 11. Offline quando possível

Sempre que fizer sentido, o sistema deverá continuar funcionando mesmo com conexão limitada.

Exemplo:

Inventário.

Conferência.

Separação.

Instalação.

---

# 12. Mobile First para operações externas

Tudo que acontece fora do escritório deverá funcionar perfeitamente no celular.

Exemplos:

Instalações

Vistorias

Entregas

Produção externa

Coletas

---

# 13. Performance

O sistema deve parecer instantâneo.

Sempre que possível:

- carregamento assíncrono

- cache

- paginação

- atualização incremental

---

# 14. Simplicidade

A regra é simples.

A complexidade pertence ao sistema.

Nunca ao usuário.

---

# 15. Filosofia do Gigai

O Gigai não registra informações.

O Gigai produz conhecimento.

O Gigai não executa tarefas.

O Gigai automatiza processos.

O Gigai não organiza empresas.

O Gigai ajuda empresas a crescer.
