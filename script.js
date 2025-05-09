document.addEventListener("DOMContentLoaded", () => {
    const listaNFs = [];
    const ul = document.getElementById("listaNFs");

    function extractXmlRoot(text) {
        const idx = text.indexOf("<");
        if (idx === -1) return null;
        return text.substring(idx).trim();
    }

    function parseXml(text) {
        const parser = new DOMParser();
        return parser.parseFromString(text, "application/xml");
    }

    function hasParseError(xmlDoc) {
        return xmlDoc.getElementsByTagName("parsererror").length > 0;
    }

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

    function obterChave(xml) {
        const infNFe = xml.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", "infNFe")[0];
        return infNFe?.getAttribute("Id")?.replace(/^NFe/, "") || "";
    }

    function getElementText(xml, pathParts) {
        let el = xml;
        for (const part of pathParts) {
            el = el?.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", part)[0] ||
                 el?.getElementsByTagNameNS("http://www.portalfiscal.inf.br/cte", part)[0];
            if (!el) return null;
        }
        return el?.textContent?.trim() || null;
    }

    function normalizar(str) {
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\b(rua|avenida|av|rodovia|estrada|travessa)\b/g, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function encontrarDivergencias(nfeXml, cteXml) {
        const divergencias = [];

        const chaveNF = obterChave(nfeXml);
        if (!chaveNF) {
            divergencias.push("Chave da NF-e não encontrada.");
            return divergencias;
        }

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
            return divergencias;
        }

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

        compararCampo("CNPJ do Destinatário", 'dest/CNPJ', 'dest/CNPJ');
        compararCampo("Nome do Destinatário", 'dest/xNome', 'dest/xNome');
        compararCampo("Endereço do Destinatário", 'dest/enderDest/xLgr', 'dest/enderDest/xLgr');
        compararCampo("CEP do Destinatário", 'dest/enderDest/CEP', 'dest/enderDest/CEP');
        compararCampo("Município do Destinatário", 'dest/enderDest/xMun', 'dest/enderDest/xMun');

        compararCampo("CNPJ do Remetente", 'emit/CNPJ', 'rem/CNPJ');
        compararCampo("Nome do Remetente", 'emit/xNome', 'rem/xNome');
        compararCampo("Endereço do Remetente", 'emit/enderEmit/xLgr', 'rem/enderReme/xLgr');
        compararCampo("CEP do Remetente", 'emit/enderEmit/CEP', 'rem/enderReme/CEP');
        compararCampo("Município do Remetente", 'emit/enderEmit/xMun', 'rem/enderReme/xMun');

        compararCampo("CNPJ da Transportadora", 'transp/transporta/CNPJ', 'emit/CNPJ');
        compararCampo("Endereço da Transportadora", 'transp/transporta/xEnder', 'emit/enderEmit/xLgr');
        compararCampo("CEP da Transportadora", 'transp/transporta/CEP', 'emit/enderEmit/CEP');

        return divergencias;
    }
});
