# Project Checkpoint — Gigai Platform

Versão: 2026-06-29

---

## Visão Geral

O Gigai Platform não é apenas um ERP.

Ele nasce como um ERP para comunicação visual, mas sua visão é maior: tornar-se a plataforma operacional do ecossistema de comunicação visual, conectando empresas, fornecedores, makers, instaladores, clientes e inteligência operacional.

O objetivo principal é facilitar muito a vida das empresas. Se o sistema realmente economizar tempo, reduzir erros, melhorar decisões e aumentar a inteligência operacional, o sucesso comercial será consequência.

---

## Filosofia do Produto

O Gigai não deve ser uma colcha de retalhos.

Ele deve ser construído com arquitetura, documentação e visão de longo prazo.

Princípios centrais:

* O sistema não deve apenas registrar dados.
* O sistema deve direcionar atenção.
* O usuário aprova; a Inteligência Operacional trabalha.
* O Gigai não procura o menor preço; procura o melhor negócio.
* Nenhuma informação deve ser digitada duas vezes.
* Toda funcionalidade deve gerar valor mensurável.
* O sistema deve ser crítico, desconfiado e preventivo.
* Toda decisão deve considerar contexto.
* Todo evento deve gerar aprendizado.
* A empresa deve ficar mais forte a cada decisão.

---

## Conceito Principal

O Gigai deve funcionar como um organismo vivo.

A empresa percebe sinais, analisa contexto, toma decisões, executa ações, mede resultados e aprende.

Ciclo conceitual:

```txt
Evento
↓
Contexto
↓
Hipóteses
↓
Análise crítica
↓
Recomendação
↓
Decisão
↓
Execução
↓
Resultado
↓
Aprendizado
↓
Evolução
```

---

## Inteligência Operacional

A Inteligência Operacional é a camada que transforma dados, eventos e histórico em alertas, recomendações e ações assistidas.

Ela não deve apenas responder perguntas.

Ela deve observar, desconfiar, analisar, proteger, sugerir e aprender.

Exemplo:

Uma promoção de fornecedor não deve ser tratada automaticamente como oportunidade.

O sistema deve avaliar:

* validade do produto;
* consumo médio;
* estoque atual;
* fluxo de caixa;
* preço histórico;
* risco de vencimento;
* prazo de entrega;
* confiabilidade do fornecedor;
* necessidade real da empresa.

---

## Motores de Inteligência

Foram definidos os principais motores de inteligência do Gigai:

1. Motor de Atenção
   Decide o que precisa da atenção do usuário agora.

2. Motor de Contexto
   Reúne informações antes de qualquer recomendação.

3. Motor de Proteção
   Questiona decisões potencialmente ruins.

4. Motor de Negociação
   Ajuda a buscar melhores condições comerciais.

5. Motor de Previsão
   Antecipar problemas e oportunidades.

6. Motor de Oportunidades
   Encontra economia, margem e eficiência escondidas.

7. Motor de Aprendizado
   Faz o sistema evoluir com base nos resultados reais.

8. Motor de Explicação
   Explica por que uma recomendação foi feita.

9. Motor de Execução Assistida
   Transforma recomendações aprovadas em ações práticas.

---

## Central de Atenção

O Gigai não deve ter apenas dashboards fixos.

A tela inicial operacional deve ser uma Central de Atenção.

Ela responde:

> O que precisa da minha atenção agora?

A Central deve priorizar:

* urgências;
* riscos;
* oportunidades;
* pendências;
* decisões que precisam de ação humana.

Ela não deve alertar tudo.

Alertas demais reduzem a confiança do usuário.

---

## Módulo Atual

Estamos trabalhando na Central de Suprimentos.

Objetivo:

Integrar materiais, estoque, compras, recebimento, XML, fornecedores e contas a pagar em um fluxo inteligente.

A Central de Suprimentos deve responder:

> O que a empresa precisa comprar, receber, conferir, negociar ou pagar para manter a operação saudável?

---

## Problema Operacional Atual

Na operação real da empresa:

* compras são feitas por WhatsApp;
* nem sempre há tempo para buscar o melhor preço;
* XMLs são importados nota por nota;
* notas fiscais e boletos são impressos;
* boletos são separados em pastas físicas por data de pagamento;
* pagamentos são conferidos manualmente;
* parcelas futuras voltam para outra pasta;
* não há visão clara de fluxo de caixa futuro;
* não há inteligência de preço, prazo, estoque e necessidade real.

O objetivo inicial do Gigai é reduzir esse trabalho manual.

---

## O que já foi implementado

### Documentação

Foi criada a estrutura inicial em `/docs`, incluindo:

* `00-manifesto-gigai.md`
* `01-visao-do-produto.md`
* `02-principios-de-arquitetura.md`
* `03-roadmap.md`
* `05-inteligencia-operacional.md`
* `06-motores-de-inteligencia.md`
* `docs/modulos/suprimentos.md`
* `decisions.md`

---

### Central de Suprimentos

Foi criada a tela:

```txt
/supplies/attention
```

Com o objetivo de mostrar o que precisa da atenção operacional.

A tela possui:

* cards de resumo;
* urgentes;
* riscos;
* atenções;
* oportunidades;
* lista ordenada por prioridade;
* cards de ação;
* botão para atualizar;
* integração com menu lateral.

---

### Estoque e Atenção

A Central já identifica materiais com estoque no limite mínimo.

Foi corrigida a lógica para evitar alarmes exagerados:

* estoque igual ao mínimo = atenção;
* estoque abaixo do mínimo = risco;
* estoque zerado = urgente.

Exemplo correto:

```txt
Estoque no limite mínimo
```

em vez de:

```txt
Estoque abaixo do mínimo
```

quando o saldo atual é igual ao mínimo.

---

### Criação de Solicitação de Compra

A partir de um alerta de estoque, o sistema já permite criar uma solicitação de compra.

Fluxo implementado:

```txt
Central de Suprimentos
↓
Alerta de estoque
↓
Criar solicitação de compra
↓
Formulário pré-preenchido
↓
Salvar solicitação
```

O formulário já vem com:

* material;
* quantidade sugerida;
* unidade;
* tipo de compra;
* urgência;
* observação automática.

---

### Prevenção de Duplicidade

Foi identificado e corrigido um problema:

Se a Central continuasse mostrando “Criar solicitação de compra” após uma solicitação já existir, duas pessoas poderiam criar solicitações duplicadas para o mesmo material.

Correção aplicada:

Quando já existe solicitação aberta para o material, a Central mostra:

```txt
Reposição em andamento
```

E o botão muda para:

```txt
Ver solicitação
```

---

### Agrupamento Inteligente

Foi corrigida a repetição de informações.

Antes apareciam dois cards separados:

1. estoque no limite;
2. solicitação aguardando aprovação.

Agora aparece um único card agrupado:

```txt
Reposição em andamento: [material]
```

Com informações de estoque e da solicitação aberta no mesmo card.

---

### Ciclo Inicial do Processo de Compra

Foi implementado o ciclo inicial de status da compra.

Fluxo atual:

```txt
Solicitação criada
↓
Aguardando aprovação
↓
Aprovado
↓
Registrar envio manual ao fornecedor
↓
Pedido enviado
↓
Registrar confirmação do fornecedor
↓
Aguardando entrega
```

---

## Correções Semânticas Importantes

Foi corrigida a interpretação do envio ao fornecedor.

O sistema não deve sugerir que enviou automaticamente um pedido ao fornecedor se ainda não há integração com WhatsApp, e-mail ou envio automático.

Nesta fase, o envio é apenas registro manual.

Texto conceitual correto:

```txt
Registrar envio manual ao fornecedor
```

E não:

```txt
Enviar pedido ao fornecedor
```

Depois de registrar envio manual, o status muda para:

```txt
Pedido enviado
```

Depois, o próximo passo é:

```txt
Registrar confirmação do fornecedor
```

E só então:

```txt
Aguardando entrega
```

---

## Decisões Importantes

### Decisão 1

O Gigai será desenvolvido como plataforma, não apenas como ERP.

---

### Decisão 2

O primeiro módulo operacional será Suprimentos, por resolver uma dor real da operação.

---

### Decisão 3

A Central de Atenção será dinâmica e priorizada, não um dashboard fixo.

---

### Decisão 4

O sistema deve agrupar assuntos relacionados, e não mostrar alertas repetidos.

---

### Decisão 5

O sistema deve evitar duplicidade operacional, principalmente em solicitações de compra.

---

### Decisão 6

Envio automático ao fornecedor não será simulado.

Enquanto não houver integração real, o sistema deve registrar apenas envio manual.

---

### Decisão 7

O Gigai não procura o menor preço.

Ele procura o melhor negócio.

---

## Status Atual do Desenvolvimento

A Central de Suprimentos está funcionando como primeiro MVP operacional.

Já temos:

```txt
Estoque no limite
↓
Central identifica
↓
Usuário cria solicitação
↓
Sistema evita duplicidade
↓
Usuário aprova
↓
Usuário registra envio manual
↓
Usuário registra confirmação do fornecedor
↓
Pedido fica aguardando entrega
```

---

## Próximo Passo

Implementar o Recebimento v1.

Fluxo desejado:

```txt
Pedido aguardando entrega
↓
Registrar recebimento
↓
Informar quantidade recebida
↓
Permitir recebimento total ou parcial
↓
Atualizar status do processo
↓
No futuro, conectar com XML/NF-e
```

Recebimento v1 ainda não deve fazer tudo automaticamente.

A primeira versão deve permitir:

* registrar recebimento manual;
* informar quantidade recebida;
* detectar recebimento parcial;
* atualizar status;
* manter rastreabilidade;
* preparar futura integração com XML.

---

## Próxima Etapa Técnica

Criar especificação/prompt para o Replit Agent implementar:

```txt
Recebimento v1 do Processo de Compra
```

Objetivos:

* pedido em `aguardando_entrega` pode ser recebido;
* usuário informa quantidade recebida;
* se quantidade recebida for menor que solicitada, status vira `recebido_parcial`;
* se quantidade recebida for igual ou maior, status vira `recebido`;
* a Central de Suprimentos atualiza o próximo passo;
* não criar integração XML ainda;
* não criar tabelas novas se não for necessário;
* preservar layout atual.

---

## Observação Final

Este checkpoint deve ser atualizado sempre que um marco importante for concluído.

Ele serve para permitir continuidade do projeto mesmo que a conversa fique muito grande ou seja iniciada uma nova conversa.
