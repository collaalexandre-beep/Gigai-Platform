# Central de Suprimentos

Versão: 1.0

---

## Objetivo

A Central de Suprimentos é responsável por integrar materiais, estoque, compras, recebimento, XML, fornecedores e contas a pagar em um único fluxo inteligente.

Ela não deve ser apenas um módulo de compras.

Ela deve responder a uma pergunta central:

> O que a empresa precisa comprar, receber, conferir, negociar ou pagar para manter a operação saudável?

---

## Problema Atual

Hoje, o processo de compras e estoque ocorre de forma manual e fragmentada:

1. A necessidade de compra surge por percepção humana.
2. O material é solicitado por WhatsApp ao fornecedor.
3. Nem sempre há tempo para pesquisar o melhor preço.
4. O XML é importado nota por nota.
5. O estoque é atualizado.
6. A nota fiscal e os boletos são impressos.
7. Os boletos são separados em pastas físicas por data de pagamento.
8. No dia do vencimento, as pastas são conferidas manualmente.
9. O pagamento é realizado.
10. Parcelas futuras voltam para outra pasta.

Esse processo consome tempo, gera risco de erro, dificulta negociação, impede previsão de caixa e reduz a inteligência da empresa.

---

## Visão da Solução

A Central de Suprimentos deve transformar o usuário de operador em aprovador.

O sistema deve:

* identificar necessidades de compra;
* sugerir compras com base em consumo, estoque e pedidos futuros;
* comparar fornecedores;
* avaliar promoções de forma crítica;
* negociar melhores condições;
* importar XML;
* conferir divergências;
* atualizar estoque automaticamente;
* criar contas a pagar automaticamente;
* prever impacto no fluxo de caixa;
* registrar tudo em timeline;
* aprender com cada decisão.

---

## Princípio Central

A Central de Suprimentos não procura apenas o menor preço.

Ela procura o melhor negócio.

O melhor negócio considera:

* preço;
* prazo de pagamento;
* prazo de entrega;
* qualidade;
* validade;
* estoque atual;
* consumo médio;
* previsão de vendas;
* fluxo de caixa;
* histórico do fornecedor;
* histórico do cliente final;
* risco de atraso;
* risco de ruptura;
* capital parado.

---

## Escopo da Versão 1.0

A primeira versão deve focar em resolver a dor operacional real da empresa.

### Incluído na v1.0

* Cadastro de materiais.
* Cadastro de fornecedores.
* Histórico de preços por fornecedor.
* Estoque atual, mínimo e ideal.
* Movimentações de estoque.
* Processo de compra.
* Recebimento por XML.
* Conferência de divergências.
* Criação automática de contas a pagar.
* Dashboard de atenção da Central de Suprimentos.
* Alertas de estoque crítico.
* Alertas de compras aguardando aprovação.
* Alertas de XML com divergência.
* Alertas de impacto no fluxo de caixa.
* Registro de timeline.

### Fora da v1.0

* Marketplace de fornecedores.
* Negociação automática entre sistemas.
* Integração bancária automática.
* Aplicativo mobile dedicado.
* Benchmark global.
* IA autônoma sem aprovação humana.

Esses itens ficam previstos para fases futuras.

---

## Fluxo Ideal

```text
Necessidade detectada
↓
Sistema coleta contexto
↓
Sistema sugere compra
↓
Usuário analisa e aprova
↓
Processo de compra é criado
↓
Pedido é enviado ao fornecedor
↓
Fornecedor entrega
↓
XML é importado
↓
Sistema confere pedido x XML
↓
Se estiver correto, entrada automática
↓
Estoque atualizado
↓
Contas a pagar criado
↓
Fluxo de caixa atualizado
↓
Timeline registrada
↓
Sistema aprende
```

---

## Processo de Compra

O sistema não deve tratar compra apenas como um documento.

Compra é um processo.

Estados possíveis:

1. Necessidade identificada
2. Em cotação
3. Aguardando aprovação
4. Aprovado
5. Pedido enviado
6. Aguardando entrega
7. Recebido parcialmente
8. Recebido totalmente
9. XML conferido
10. Financeiro gerado
11. Concluído
12. Cancelado

Cada mudança de estado deve gerar evento na timeline.

---

## Central de Atenção de Suprimentos

A tela inicial de Suprimentos não deve ser fixa.

Ela deve mostrar o que precisa de atenção agora.

Exemplos:

* Compra aguardando aprovação.
* Material crítico abaixo do estoque ideal.
* XML com divergência.
* Processo de compra atrasado.
* Fornecedor entregou quantidade diferente.
* Preço do XML diverge do pedido.
* Compra pode comprometer fluxo de caixa.
* Promoção relevante para material com necessidade real.
* Material em risco de vencer.
* Pedido comercial provável exigirá compra futura.

---

## Semáforo de Atenção

A Central de Suprimentos pode usar indicadores visuais por prioridade:

### Verde

Sem ação necessária.

### Amarelo

Atenção recomendada.

### Vermelho

Ação necessária.

### Crítico

Interromper o usuário responsável.

O sistema não deve gerar alerta vermelho apenas porque algo existe.

O vermelho deve ser reservado para riscos reais.

---

## Promoções de Fornecedores

Promoção não é automaticamente oportunidade.

Antes de recomendar uma compra promocional, o sistema deve verificar:

* validade do produto;
* consumo médio;
* estoque atual;
* preço histórico;
* quantidade mínima;
* fluxo de caixa;
* pedidos futuros;
* risco de capital parado;
* risco de vencimento;
* confiabilidade do fornecedor.

Exemplo:

Se um adesivo está 30% mais barato, mas vencerá antes do consumo provável, a recomendação deve ser não comprar.

---

## Condições Comerciais

A Central de Suprimentos deve considerar condições comerciais, não apenas preço.

Exemplo:

Um fornecedor mais caro pode ser melhor se oferecer:

* prazo maior;
* entrega mais rápida;
* menor risco;
* melhor qualidade;
* parcelamento;
* frete incluso.

O sistema pode recomendar:

> Para esta compra, solicite 40 dias de prazo ao fornecedor, pois o cliente final possui histórico de atraso e o prazo padrão de 28 dias pode pressionar o caixa.

---

## XML e Recebimento

O XML deve ser tratado como evento de recebimento.

Ao importar um XML, o sistema deve:

1. Identificar fornecedor.
2. Identificar itens.
3. Comparar com processo de compra.
4. Conferir quantidade.
5. Conferir preço.
6. Conferir unidade.
7. Conferir impostos quando necessário.
8. Atualizar estoque.
9. Atualizar último preço.
10. Atualizar histórico do fornecedor.
11. Criar contas a pagar.
12. Atualizar fluxo de caixa.
13. Registrar timeline.

Se não houver divergência, o processo deve ser automático.

Se houver divergência, deve gerar alerta.

---

## Contas a Pagar

A conta a pagar deve nascer automaticamente sempre que possível.

Principal origem:

* XML de compra;
* processo de compra;
* despesa recorrente;
* lançamento financeiro manual excepcional.

Dados mínimos:

* fornecedor;
* documento;
* número da nota;
* data de emissão;
* data de vencimento;
* valor;
* parcelas;
* forma de pagamento;
* categoria;
* centro de custo;
* vínculo com processo de compra;
* vínculo com XML;
* status.

---

## Estoque

O estoque nunca deve ser alterado diretamente.

Toda alteração deve gerar movimentação.

Tipos de movimentação:

* entrada por XML;
* entrada manual autorizada;
* saída por produção;
* saída por ajuste;
* perda;
* inventário;
* devolução;
* transferência.

Cada movimentação deve registrar:

* material;
* quantidade;
* unidade;
* origem;
* responsável;
* data;
* motivo;
* vínculo com processo.

---

## Materiais

O cadastro de materiais deve suportar diferentes comportamentos:

* bobina;
* chapa;
* peça;
* tinta;
* insumo;
* equipamento;
* serviço terceirizado.

Campos principais:

* código automático;
* descrição;
* grupo;
* NCM;
* unidade de compra;
* unidade de estoque;
* unidade de consumo;
* tipo de comportamento;
* estoque mínimo;
* estoque ideal;
* estoque atual;
* percentual de desperdício;
* último preço;
* preço médio;
* fornecedor principal;
* status ativo/inativo.

---

## Fornecedores

O fornecedor deve possuir histórico vivo.

O sistema deve armazenar:

* materiais fornecidos;
* último preço;
* menor preço;
* maior preço;
* prazo médio de entrega;
* prazo médio de pagamento;
* qualidade percebida;
* atrasos;
* divergências de XML;
* negociações aceitas;
* negociações recusadas.

Com o tempo, o sistema deve saber com quais fornecedores vale a pena negociar cada tipo de condição.

---

## Métricas da Central de Suprimentos

A Central deve medir:

* economia obtida em compras;
* compras feitas com urgência;
* compras antecipadas;
* rupturas evitadas;
* divergências em XML;
* fornecedores com maior atraso;
* fornecedores mais competitivos;
* materiais com maior giro;
* materiais parados;
* capital parado em estoque;
* impacto das compras no fluxo de caixa.

---

## Critérios de Sucesso da v1.0

A primeira versão será considerada bem-sucedida se:

* reduzir lançamentos manuais;
* reduzir impressão de notas e boletos;
* automatizar criação de contas a pagar;
* permitir visão clara do estoque crítico;
* permitir histórico de preços por fornecedor;
* reduzir compras urgentes;
* reduzir esquecimentos de pagamento;
* dar visibilidade do impacto das compras no caixa;
* ser usada na operação real da empresa.

---

## Filosofia Final

A Central de Suprimentos deve funcionar como um comprador experiente, desconfiado e estratégico.

Ela deve perguntar:

* Precisamos realmente comprar?
* Este é o melhor momento?
* Este é o melhor fornecedor?
* Esta promoção faz sentido?
* O caixa comporta?
* O cliente final paga em dia?
* Existe risco de vencimento?
* Existe risco de ruptura?
* É possível negociar melhor?

A Central de Suprimentos existe para transformar compras, estoque e contas a pagar em inteligência empresarial.

