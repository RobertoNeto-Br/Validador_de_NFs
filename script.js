
document.addEventListener("DOMContentLoaded", () => {
    const listaNFs = [];
    const ul = document.getElementById("listaNFs");

    document.getElementById("adicionarNF").addEventListener("click", () => {
        const nfText = document.getElementById("textareaNF").value.trim();
        if (nfText) {
            listaNFs.push(nfText);
            const li = document.createElement("li");
            li.textContent = "NF-e adicionada #" + listaNFs.length;
            ul.appendChild(li);
            document.getElementById("textareaNF").value = "";
        }
    });

    document.getElementById("compararBtn").addEventListener("click", () => {
        const resultadoDiv = document.getElementById("resultado");
        resultadoDiv.innerHTML = "";

        const cteText = document.getElementById("textareaCTE").value;
        if (!cteText) {
            resultadoDiv.textContent = "XML do CT-e está vazio.";
            return;
        }

        const parser = new DOMParser();
        const cteXml = parser.parseFromString(cteText, "text/xml");
        if (cteXml.getElementsByTagName("parsererror").length > 0) {
            resultadoDiv.textContent = "Erro ao analisar XML do CT-e.";
            return;
        }

        let temErro = false;
        let saida = "";

        listaNFs.forEach((nfText, index) => {
            const nfXml = parser.parseFromString(nfText, "text/xml");
            if (nfXml.getElementsByTagName("parsererror").length > 0) {
                saida += `NF-e #${index + 1} com erro de XML.\n`;
                temErro = true;
                return;
            }

            const divergencias = encontrarDivergencias(nfXml, cteXml);
            if (divergencias.length > 0) {
                temErro = true;
                saida += `NF-e #${index + 1} divergente:\n` + divergencias.map(d => " - " + d).join("\n") + "\n\n";
            }
        });

        if (!temErro) {
            resultadoDiv.innerHTML = "<strong>Todas as NF-e estão consistentes com o CT-e.</strong>";
        } else {
            resultadoDiv.textContent = saida.trim();
        }
    });
});

function obterChave(xml) {
    const infNFe = xml.getElementsByTagName("infNFe")[0];
    return infNFe?.getAttribute("Id")?.replace(/^NFe/, "") || "";
}

function encontrarDivergencias(nfeXml, cteXml) {
    const divergencias = [];

    const get = (xml, path) => {
        const parts = path.split('/');
        let el = xml;
        for (let p of parts) {
            el = el?.getElementsByTagName(p)[0];
            if (!el) return null;
        }
        return el.textContent.trim();
    };

    const compararCampo = (label, valorNFe, valorCTe) => {
        if (!valorNFe) {
            divergencias.push(`${label} ausente na NF-e.`);
            return;
        }
        if (!valorCTe) {
            divergencias.push(`${label} ausente no CT-e.`);
            return;
        }

        const normalizar = (str) =>
            str
                .toLowerCase()
                .normalize("NFD").replace(/[̀-ͯ]/g, "")
                .replace(/\b(rua|avenida|av|rodovia|estrada|travessa)\b/g, "")
                .replace(/[^\w\s]/g, "")
                .replace(/\s+/g, " ")
                .trim();

        if (normalizar(valorNFe) !== normalizar(valorCTe)) {
            divergencias.push(`${label} divergente: NF-e="\${valorNFe}", CT-e="\${valorCTe}"`);
        }
    };

    const chaveNF = obterChave(nfeXml);
    const chavesCTe = Array.from(cteXml.getElementsByTagName("infNFe"))
        .map(el => el.getElementsByTagName("chave")[0]?.textContent?.trim());

    if (!chavesCTe.includes(chaveNF)) {
        divergencias.push(`NF-e \${chaveNF} não pertence ao CT-e.`);
        return divergencias;
    }

    compararCampo("CNPJ do Destinatário", get(nfeXml, 'dest/CNPJ'), get(cteXml, 'dest/CNPJ'));
    compararCampo("Nome do Destinatário", get(nfeXml, 'dest/xNome'), get(cteXml, 'dest/xNome'));
    compararCampo("Endereço do Destinatário", get(nfeXml, 'dest/enderDest/xLgr'), get(cteXml, 'dest/enderDest/xLgr'));
    compararCampo("CEP do Destinatário", get(nfeXml, 'dest/enderDest/CEP'), get(cteXml, 'dest/enderDest/CEP'));
    compararCampo("Município do Destinatário", get(nfeXml, 'dest/enderDest/xMun'), get(cteXml, 'dest/enderDest/xMun'));

    compararCampo("CNPJ do Remetente", get(nfeXml, 'emit/CNPJ'), get(cteXml, 'rem/CNPJ'));
    compararCampo("Nome do Remetente", get(nfeXml, 'emit/xNome'), get(cteXml, 'rem/xNome'));
    compararCampo("Endereço do Remetente", get(nfeXml, 'emit/enderEmit/xLgr'), get(cteXml, 'rem/enderReme/xLgr'));
    compararCampo("CEP do Remetente", get(nfeXml, 'emit/enderEmit/CEP'), get(cteXml, 'rem/enderReme/CEP'));
    compararCampo("Município do Remetente", get(nfeXml, 'emit/enderEmit/xMun'), get(cteXml, 'rem/enderReme/xMun'));

    compararCampo("CNPJ da Transportadora", get(nfeXml, 'transporta/CNPJ'), get(cteXml, 'emit/CNPJ'));
    compararCampo("Endereço da Transportadora", get(nfeXml, 'transporta/xEnder'), get(cteXml, 'emit/enderEmit/xLgr'));
    compararCampo("CEP da Transportadora", get(nfeXml, 'transporta/CEP'), get(cteXml, 'emit/enderEmit/CEP'));

    return divergencias;
}
