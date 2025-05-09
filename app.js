/**
 * Script para gerenciar o carregamento, armazenamento e comparação
 * dos XMLs das Notas Fiscais Eletrônicas (NF-e) com o Conhecimento de Transporte Eletrônico (CT-e).
 */
document.addEventListener("DOMContentLoaded", () => {

    // Lista que armazena os XMLs das NF-e adicionadas
    const listaNFs = [];
    // Referência à lista no DOM onde as NF-e adicionadas são exibidas
    const ul = document.getElementById("listaNFs");

    /**
     * Extrai o conteúdo XML a partir do texto colado,
     * removendo qualquer texto antes do primeiro caractere '<'.
     * @param {string} text - Texto com possível conteúdo XML e outros textos
     * @returns {string|null} String com o XML limpo ou null se não encontrar '<'
     */
    function extractXmlRoot(text) {
        const idx = text.indexOf("<");
        if (idx === -1) return null;
        return text.substring(idx).trim();
    }

    /**
     * Converte uma string XML em um objeto XML DOM.
     * @param {string} text - String XML a ser convertida
     * @returns {Document} Documento XML
     */
    function parseXml(text) {
        const parser = new DOMParser();
        return parser.parseFromString(text, "application/xml");
    }

    /**
     * Verifica se o documento XML contém erros de parsing.
     * @param {Document} xmlDoc - Documento XML para verificar
     * @returns {boolean} true se houver erros, false caso contrário
     */
    function hasParseError(xmlDoc) {
        return xmlDoc.getElementsByTagName("parsererror").length > 0;
    }

    // Evento para adicionar a NF-e inserida na textarea à lista de NF-e
    document.getElementById("adicionarNF").addEventListener("click", () => {
        let nfTextRaw = document.getElementById("textareaNF").value.trim();
        if (!nfTextRaw) {
            alert("Por favor, cole o XML da NF-e antes de adicionar.");
            return;
        }
        const nfText = extractXmlRoot(nfTextRaw);
        if (!nfText) {
            alert("Não foi possível encontrar o conteúdo XML na NF-e.");
            return;
        }
        const nfXml = parseXml(nfText);
        if (hasParseError(nfXml)) {
            alert("Erro ao analisar XML da NF-e. Verifique o conteúdo.");
            console.error("Erro de análise NF-e:", nfXml.getElementsByTagName("parsererror")[0].textContent);
            return;
        }

        listaNFs.push(nfText);
        const li = document.createElement("li");
        li.textContent = "NF-e adicionada #" + listaNFs.length;
        ul.appendChild(li);
        document.getElementById("textareaNF").value = "";
        document.getElementById("textareaNF").focus();
    });

    // Evento para realizar a comparação das NF-e adicionadas com o XML do CT-e
    document.getElementById("compararBtn").addEventListener("click", () => {
        let cteTextRaw = document.getElementById("textareaCTE").value.trim();
        if (!cteTextRaw) {
            document.getElementById("resultado").textContent = "XML do CT-e está vazio.";
            return;
        }
        const cteText = extractXmlRoot(cteTextRaw);
        if (!cteText) {
            document.getElementById("resultado").textContent = "Não foi possível encontrar o conteúdo XML no CT-e.";
            return;
        }

        const cteXml = parseXml(cteText);
        if (hasParseError(cteXml)) {
            document.getElementById("resultado").textContent = "Erro ao analisar XML do CT-e.";
            console.error("Erro de análise CT-e:", cteXml.getElementsByTagName("parsererror")[0].textContent);
            return;
        }

        if (listaNFs.length === 0) {
            document.getElementById("resultado").textContent = "Nenhuma NF-e adicionada para comparar.";
            return;
        }

        const resultadoDiv = document.getElementById("resultado");
        resultadoDiv.textContent = "";

        let temErro = false;
        let saida = "";

        // Percorre cada NF-e adicionada para comparar com o CT-e
        listaNFs.forEach((nfText, idx) => {
            const nfXml = parseXml(nfText);
            if (hasParseError(nfXml)) {
                const errorMsg = nfXml.getElementsByTagName("parsererror")[0].textContent;
                saida += `NF-e #${idx + 1} com erro de XML: ${errorMsg}\n`;
                temErro = true;
                return;
            }

            const divergencias = encontrarDivergencias(nfXml, cteXml);
            if (divergencias.length > 0) {
                temErro = true;
                saida += `NF-e #${idx + 1} divergente:\n` + divergencias.map(d => " - " + d).join("\n") + "\n\n";
            }
        });

        resultadoDiv.textContent = temErro ? saida.trim() : "Todas as NF-e estão consistentes com o CT-e.";
    });

    /**
     * Obtém a chave da NF-e a partir do documento XML.
     * @param {Document} xml - Documento XML da NF-e
     * @returns {string} Chave da NF-e (campo Id sem prefixo "NFe"), ou string vazia se não encontrada
     */
    function obterChave(xml) {
        const infNFe = xml.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", "infNFe")[0];
        return infNFe?.getAttribute("Id")?.replace(/^NFe/, "") || "";
    }

    /**
     * Recupera o texto de um elemento XML de acordo com um caminho hierárquico,
     * tentando namespaces NF-e e CT-e.
     * @param {Document} xml - Documento XML onde buscar
     * @param {Array<string>} pathParts - Array com os nomes dos elementos aninhados para acessar
     * @returns {string|null} Conteúdo do texto do elemento ou null se não encontrado
     */
    function getElementText(xml, pathParts) {
        let el = xml;
        for (const part of pathParts) {
            el = el?.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", part)[0] ||
                 el?.getElementsByTagNameNS("http://www.portalfiscal.inf.br/cte", part)[0];
            if (!el) return null;
        }
        return el?.textContent?.trim() || null;
    }

    /**
     * Normaliza strings removendo acentuação, pontuação,
     * normalizando abreviações comuns e espaços extras para facilitar comparação.
     * @param {string} str - String a ser normalizada
     * @returns {string} String normalizada
     */
    function normalizar(str) {
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // Remove acentuação
            .replace(/\b(rua|avenida|av|rodovia|estrada|travessa)\b/g, "") // Remove palavras comuns de endereço
            .replace(/[^\w\s]/g, "") // Remove pontuações
            .replace(/\s+/g, " ")    // Remove múltiplos espaços
            .trim();
    }

    /**
     * Compara os campos importantes entre a NF-e e o CT-e,
     * retornando uma lista de divergências encontradas.
     * @param {Document} nfeXml - Documento XML da NF-e
     * @param {Document} cteXml - Documento XML do CT-e
     * @returns {string[]} Lista de mensagens descrevendo divergências
     */
    function encontrarDivergencias(nfeXml, cteXml) {
        const divergencias = [];

        const chaveNF = obterChave(nfeXml);
        if (!chaveNF) {
            divergencias.push("Chave da NF-e não encontrada.");
            return divergencias;
        }

        // Extrai as chaves das NF-e presentes no infDoc do CT-e para validar se pertence ao CT-e
        const infDocs = cteXml.getElementsByTagNameNS("http://www.portalfiscal.inf.br/cte", "infDoc");
        let chavesCTe = [];
        if (infDocs.length > 0) {
            const infDoc = infDocs[0];
            const infNFeNodes = infDoc.getElementsByTagNameNS("http://www.portalfiscal.inf.br/cte", "infNFe");
            chavesCTe = Array.from(infNFeNodes).map(node => {
                const chaveNode = node.getElementsByTagNameNS("http://www.portalfiscal.inf.br/cte", "chave")[0];
                return chaveNode?.textContent?.trim() || null;
            });
        }

        if (!chavesCTe.includes(chaveNF)) {
            divergencias.push(`NF-e ${chaveNF} não pertence ao CT-e.`);
            // Não retorna aqui para mostrar outras divergências caso queira
            return divergencias;
        }

        // Função auxiliar para comparar campos entre NF-e e CT-e
        function compararCampo(label, pathNF, pathCT) {
            const valorNFe = getElementText(nfeXml, pathNF.split('/'));
            const valorCTe = getElementText(cteXml, pathCT.split('/'));
            if (!valorNFe) {
                divergencias.push(`${label} ausente na NF-e.`);
                return;
            }
            if (!valorCTe) {
                divergencias.push(`${label} ausente no CT-e.`);
                return;
            }
            if (normalizar(valorNFe) !== normalizar(valorCTe)) {
                divergencias.push(`${label} divergente: NF-e="${valorNFe}", CT-e="${valorCTe}"`);
            }
        }

        // Campos principais do destinatário
        compararCampo("CNPJ do Destinatário", 'dest/CNPJ', 'dest/CNPJ');
        compararCampo("Nome do Destinatário", 'dest/xNome', 'dest/xNome');
        compararCampo("Endereço do Destinatário", 'dest/enderDest/xLgr', 'dest/enderDest/xLgr');
        compararCampo("CEP do Destinatário", 'dest/enderDest/CEP', 'dest/enderDest/CEP');
        compararCampo("Município do Destinatário", 'dest/enderDest/xMun', 'dest/enderDest/xMun');

        // Campos principais do remetente
        compararCampo("CNPJ do Remetente", 'emit/CNPJ', 'rem/CNPJ');
        compararCampo("Nome do Remetente", 'emit/xNome', 'rem/xNome');
        compararCampo("Endereço do Remetente", 'emit/enderEmit/xLgr', 'rem/enderReme/xLgr');
        compararCampo("CEP do Remetente", 'emit/enderEmit/CEP', 'rem/enderReme/CEP');
        compararCampo("Município do Remetente", 'emit/enderEmit/xMun', 'rem/enderReme/xMun');

        // Campos principais da transportadora
        compararCampo("CNPJ da Transportadora", 'transp/transporta/CNPJ', 'emit/CNPJ');
        compararCampo("Endereço da Transportadora", 'transp/transporta/xEnder', 'emit/enderEmit/xLgr');
        compararCampo("CEP da Transportadora", 'transp/transporta/CEP', 'emit/enderEmit/CEP');

        return divergencias;
    }
});
