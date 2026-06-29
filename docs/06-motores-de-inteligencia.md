# Motores de Inteligência

Versão: 1.0

---

## Objetivo

Definir os principais motores de inteligência do Gigai Platform.

Os motores de inteligência são serviços responsáveis por transformar eventos, dados e contexto em alertas, recomendações, decisões assistidas e aprendizado contínuo.

Eles não pertencem a um módulo específico.

Eles pertencem ao Core da plataforma e podem ser utilizados por todas as Centrais do sistema.

---

## Conceito Central

O Gigai não deve depender apenas de telas, relatórios e cadastros.

Ele deve possuir motores capazes de interpretar o que está acontecendo na empresa e ajudar o usuário a tomar melhores decisões.

Cada motor tem uma função específica, mas todos trabalham juntos.

---

## 1. Motor de Atenção

### Objetivo

Decidir o que realmente merece a atenção do usuário em cada momento.

A função do Motor de Atenção é evitar que o usuário precise procurar problemas dentro do sistema.

O sistema deve trazer os problemas, riscos e oportunidades até o usuário.

---

### Pergunta central

> O que precisa da atenção do usuário agora?

---

### Exemplos

* Compra aguardando aprovação.
* Fluxo de caixa com risco nos próximos dias.
* Material crítico abaixo do estoque ideal.
* XML com divergência em relação ao processo de compra.
* Pedido com alto potencial de fechamento que exigirá compra de material.
* Conta a pagar que compromete o caixa.
* Fornecedor com promoção relevante para uma necessidade real.

---

### Classificação

O Motor de Atenção classifica eventos em:

* Informação
* Atenção
* Risco
* Oportunidade
* Urgência

---

### Regra

O sistema não deve alertar tudo.

Alertas em excesso reduzem a confiança do usuário.

---

## 2. Motor de Contexto

### Objetivo

Reunir todas as informações necessárias antes de qualquer recomendação.

Nenhum evento deve ser analisado isoladamente.

---

### Pergunta central

> Quais informações são necessárias para entender corretamente este evento?

---

### Exemplos de contexto

Para analisar uma compra, o sistema pode consultar:

* estoque atual
* consumo médio
* histórico de compras
* preço histórico
* validade do material
* fluxo de caixa
* pedidos em aberto
* orçamentos com alta chance de fechamento
* fornecedor
* prazo de entrega
* histórico de atrasos
* qualidade do fornecedor
* cliente final relacionado
* prazo de pagamento do cliente
* risco de atraso do cliente

---

### Regra

Sem contexto suficiente, a Inteligência Operacional não deve fazer recomendação forte.

Ela pode apenas informar que faltam dados.

---

## 3. Motor de Proteção

### Objetivo

Questionar decisões potencialmente ruins antes que elas gerem prejuízo.

O Motor de Proteção age como um gerente experiente que desconfia de decisões aparentemente boas demais.

---

### Pergunta central

> O que pode dar errado nesta decisão?

---

### Exemplos

* Promoção de adesivo com validade curta.
* Compra grande que compromete o caixa.
* Fornecedor barato, mas com histórico de atraso.
* Material em promoção sem consumo previsto.
* Cliente final com histórico de atraso.
* Compra urgente que poderia ter sido planejada antes.
* Pedido com margem baixa e alto risco operacional.

---

### Regra

O Gigai não deve apenas obedecer.

O Gigai deve proteger a empresa.

---

## 4. Motor de Negociação

### Objetivo

Ajudar a empresa a negociar melhores condições comerciais com fornecedores, clientes e parceiros.

---

### Pergunta central

> Qual condição comercial torna este negócio mais saudável para a empresa?

---

### Exemplos de negociação

* Solicitar prazo maior ao fornecedor.
* Pedir desconto à vista.
* Dividir pagamento.
* Negociar entrega parcial.
* Solicitar frete incluso.
* Sugerir troca de fornecedor.
* Reorganizar compras para aumentar poder de negociação.
* Pedir condição especial com base no histórico da empresa.

---

### Exemplo prático

Se um cliente costuma pagar com atraso e o fornecedor oferece apenas 28 dias, o sistema pode recomendar:

> Para este pedido, solicite 40 dias de prazo ao fornecedor. O cliente final possui histórico médio de atraso de 12 dias, e aceitar 28 dias pode comprometer o fluxo de caixa.

---

### Regra

A IA pode sugerir e redigir mensagens de negociação, mas a aprovação final deve ser feita por um usuário autorizado.

---

## 5. Motor de Previsão

### Objetivo

Antecipar problemas e oportunidades antes que aconteçam.

---

### Pergunta central

> O que provavelmente vai acontecer se nada for feito?

---

### Exemplos

* Material acabará em 12 dias.
* Caixa ficará negativo em determinada semana.
* Fornecedor provavelmente atrasará entrega.
* Produção ficará sem insumo.
* Cliente provavelmente atrasará pagamento.
* Compra antecipada pode gerar economia.
* Orçamento com alta chance de fechamento exigirá compra futura.

---

### Regra

O sistema deve avisar antes do problema, não depois.

---

## 6. Motor de Oportunidades

### Objetivo

Encontrar oportunidades de economia, margem, produtividade ou melhor uso de recursos.

---

### Pergunta central

> Onde existe dinheiro, tempo ou eficiência escondidos?

---

### Exemplos

* Fornecedor com preço abaixo do histórico.
* Compra antecipada com vantagem real.
* Material parado que pode ser usado em outro pedido.
* Cliente com baixa margem recorrente.
* Produto vendido abaixo do custo real.
* Compra recorrente que poderia ser negociada em contrato.
* Estoque excessivo que está consumindo capital.

---

### Regra

Oportunidade só deve virar alerta quando fizer sentido dentro do contexto da empresa.

Promoção sem necessidade real não é oportunidade.

---

## 7. Motor de Aprendizado

### Objetivo

Fazer o Gigai evoluir com base nos resultados reais das decisões.

---

### Pergunta central

> O que aprendemos com esta decisão?

---

### Exemplos de aprendizado

* Fornecedor aceitou prazo maior.
* Fornecedor recusou desconto.
* Cliente atrasou novamente.
* Compra antecipada gerou economia.
* Promoção gerou estoque parado.
* Material venceu antes de ser consumido.
* Pedido teve margem menor que o esperado.
* Terceirizado atrasou entrega.
* Produção interna foi mais eficiente que terceirização.

---

### Regra

Toda decisão relevante deve gerar aprendizado.

O sistema deve ficar mais inteligente com o uso.

---

## 8. Motor de Explicação

### Objetivo

Explicar de forma clara por que o sistema fez determinada recomendação.

---

### Pergunta central

> Por que o Gigai está recomendando isso?

---

### Exemplo ruim

> Compre este material.

---

### Exemplo correto

> Recomendo comprar 2 rolos de lona agora porque o estoque cobre apenas 9 dias, há dois orçamentos com alta probabilidade de fechamento, o fornecedor está 8% abaixo do preço médio e o fluxo de caixa comporta a compra se o prazo for negociado para 40 dias.

---

### Regra

Toda recomendação importante deve ser explicável.

O usuário precisa confiar no raciocínio do sistema.

---

## 9. Motor de Execução Assistida

### Objetivo

Transformar recomendações aprovadas em ações práticas.

---

### Pergunta central

> O que o sistema pode fazer pelo usuário depois da aprovação?

---

### Exemplos

* Criar processo de compra.
* Gerar pedido ao fornecedor.
* Redigir mensagem de negociação.
* Criar contas a pagar.
* Atualizar estoque.
* Agendar alerta futuro.
* Solicitar aprovação.
* Registrar evento na timeline.
* Notificar responsável.

---

### Regra

O usuário aprova.

A Inteligência Operacional executa.

---

## Funcionamento Integrado

Os motores não trabalham isoladamente.

Exemplo:

Fornecedor envia promoção de adesivo.

1. Motor de Atenção identifica o evento.
2. Motor de Contexto consulta estoque, consumo, validade e fluxo de caixa.
3. Motor de Proteção avalia riscos.
4. Motor de Oportunidades calcula possível economia.
5. Motor de Previsão estima consumo futuro.
6. Motor de Explicação apresenta a recomendação.
7. Motor de Execução Assistida cria o processo de compra se aprovado.
8. Motor de Aprendizado registra o resultado.

---

## Princípio Final

Os motores de inteligência existem para reduzir a carga mental do usuário.

O empresário não deve precisar lembrar de tudo.

O comprador não deve precisar pesquisar tudo.

O financeiro não deve precisar conferir tudo manualmente.

O sistema deve perceber, analisar, recomendar, explicar e aprender.
