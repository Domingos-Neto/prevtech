# PrevTech 1.0 - Sistema de Gestão Previdenciária

Este é o repositório do PrevTech 1.0, um sistema de gestão e simulação para Regimes Próprios de Previdência Social (RPPS), desenvolvido para funcionar inteiramente no navegador do cliente (client-side).

## ✨ Funcionalidades

* **Autenticação de Usuários:** Sistema de login com gerenciamento de usuários (Admin/Comum) e persistência via IndexedDB.
* **Painel de Controle:** Dashboard com atalhos para as principais funcionalidades e listagem de simulações e CTCs salvas.
* **Calculadora de Benefícios:**
    * Simulação de Aposentadoria Voluntária, por Incapacidade e Pensão por Morte.
    * Cálculo de média salarial a partir de contribuições.
    * Projeção de elegibilidade e verificação de abono de permanência.
    * Cálculo de valor líquido estimado (descontos de RPPS e IRRF).
* **Gerador de Documentos:**
    * Geração de Ato de Aposentadoria e Ato de Pensão em formato HTML para impressão/PDF.
    * Geração de Certidão de Tempo de Contribuição (CTC).
* **Gestão de Dados:**
    * Importação de salários via planilhas Excel (.xlsx).
    * Exportação de dados da simulação em Excel e ZIP (contendo JSON, CSV e relatório HTML).
    * Histórico de simulações e CTCs salvas no `localStorage`.
* **Módulos de Gestão (Visuais):**
    * Gestão Cadastral.
    * Acompanhamento de Processos (quadro Kanban).
    * Módulo Financeiro e Relatórios/BI.
* **Outras Features:**
    * Tema claro e escuro.
    * Design responsivo.

## 🚀 Como Executar

Este projeto não necessita de um servidor web. Por ser uma aplicação puramente client-side, basta abrir o arquivo `index.html` em um navegador moderno (como Chrome, Firefox ou Edge).

1.  Clone o repositório: `git clone https://github.com/seu-usuario/prevtech-sistema.git`
2.  Navegue até a pasta do projeto: `cd prevtech-sistema`
3.  Abra o arquivo `index.html` diretamente no seu navegador.

O primeiro usuário `admin` com a senha `senha123` é criado automaticamente no primeiro acesso.

## 🛠️ Tecnologias Utilizadas

* **HTML5**
* **CSS3** (com Variáveis CSS para temas)
* **JavaScript (ES6+)** (Vanilla JS, sem frameworks)
* **Bibliotecas Externas (via CDN):**
    * Chart.js (para gráficos)
    * SheetJS (xlsx) (para manipulação de planilhas)
    * html2pdf.js (para geração de PDFs)
    * JSZip (para criar arquivos .zip)
    * Toastify (para notificações)
* **Armazenamento no Navegador:**
    * `IndexedDB` para dados de usuários.
    * `localStorage` para histórico de simulações e CTCs.

## 👤 Autor

* **Domingos Barroso Neto**

---
*Este sistema foi desenvolvido como uma ferramenta de apoio e suas simulações são estimativas. Sempre valide os cálculos com a legislação vigente e os dados oficiais do RPPS.*