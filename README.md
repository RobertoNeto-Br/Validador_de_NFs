# Comparar NF-e com CT-e

## Descrição

Esta aplicação web permite comparar Notas Fiscais Eletrônicas (NF-e) com um Conhecimento de Transporte Eletrônico (CT-e), identificando divergências entre os XMLs fornecidos.

Ela possibilita inserir múltiplas NF-e, armazená-las numa lista, e ao inserir o XML do CT-e, realiza uma validação detalhada comparando campos importantes de ambas as documentações fiscais.

---

## Como usar

1. **Abrir a aplicação**

   Abra o arquivo `index.html` em um navegador moderno com suporte a JavaScript.

2. **Inserir XML do CT-e**

   Cole o XML completo do CT-e no campo **XML do CT-e**.

3. **Inserir XML(s) da NF-e**

   Cole o XML completo da NF-e no campo **XML da NF-e** e clique no botão **Adicionar NF-e**. Repita para todas as NF-e que deseja comparar.

4. **Comparar**

   Clique no botão **Comparar NF-e com CT-e** para gerar o relatório de consistência.

5. **Visualizar resultado**

   As divergências, se houver, aparecerão na área de resultado. Se não houver divergências, uma mensagem indicará que todas as NF-e estão consistentes com o CT-e.

---

## Estrutura do Projeto

- `index.html`: arquivo HTML que estrutura a interface da aplicação, contendo campos para inserção dos XMLs, botões para adicionar NF-e e comparar, além de áreas para visualização da lista de NF-e adicionadas e do resultado da comparação.

- `app.js`: arquivo JavaScript responsável pela lógica de:
  - Validação e parsing dos XMLs inseridos.
  - Armazenamento das NF-e adicionadas.
  - Comparação dos XMLs da NF-e com o XML do CT-e, incluindo tratamentos de namespaces e normalização textual para comparação precisa.
  - Apresentação dos resultados e das divergências encontradas.

---

## Tecnologias utilizadas

- HTML5, CSS3 para a interface e estilos.
- JavaScript padrão (ES6+) para a lógica de parsing e comparação.
- DOMParser para análise de XML no lado cliente.
- Lógica específica para documentos NF-e e CT-e da Receita Federal do Brasil.

---

## Exemplo rápido de uso

1. Abrir `index.html` no navegador.

2. Colar o XML do CT-e no campo correspondente.

3. Colar o XML de uma NF-e na textarea abaixo e clicar em "Adicionar NF-e".

4. Repetir para cada NF-e desejada.

5. Clicar em "Comparar NF-e com CT-e" para visualizar as divergências (se houver).

---

## Observações

- Certifique-se de colar o XML completo, começando no elemento raiz `<nfeProc>` ou `<cteProc>`, sem incluir mensagens extras de renderização de navegador, para evitar erros de análise XML.

- A comparação é feita em campos principais de identificação do destinatário, remetente e transportadora, com normalização para ignorar diferenças de acentuação e formatação.

- Para um bom funcionamento, utilize navegadores modernos com suporte completo a JavaScript e DOMParser, como Chrome, Firefox, Edge ou Safari.

---

## Licença

Este projeto está aberto para uso e modificação conforme sua necessidade.  

---
