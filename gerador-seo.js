const fs = require('fs');
const path = require('path');

const cidades = [
    "Americana","Artur Nogueira","Cosmópolis","Elias Fausto","Holambra",
    "Hortolândia","Indaiatuba","Itatiba","Jaguariúna","Limeira","Louveira",
    "Monte Mor","Morungaba","Nova Odessa","Paulínia","Pedreira",
    "Santa Bárbara d'Oeste","Sumaré","Valinhos","Vinhedo","Araras",
    "Rio Claro","Tupi","São Pedro","Águas de São Pedro","Pirassununga",
    "São Carlos","Bauru","Brotas","Itirapina","Jaú"
];

const servicos = [
    "Vigia","Porteiro","Portaria","Segurança Patrimonial","Rondas de Segurança",
    "Limpeza","Zelador","Copeira","Rondas para Condomínio",
    "Portaria para Empresas","Portaria para Condomínios"
];

// Ícones por serviço (para os cards de links internos)
const servicoIcones = {
    "Vigia": "👁️",
    "Porteiro": "🚪",
    "Portaria": "🏢",
    "Segurança Patrimonial": "🛡️",
    "Rondas de Segurança": "🔦",
    "Limpeza": "✨",
    "Zelador": "🔧",
    "Copeira": "☕",
    "Rondas para Condomínio": "🏘️",
    "Portaria para Empresas": "🏭",
    "Portaria para Condomínios": "🏠"
};

// Anchor texts variados por serviço (evitar keyword stuffing)
const anchorTexts = {
    "Vigia": ["Serviço de Vigia", "Vigilante", "Vigia Terceirizado"],
    "Porteiro": ["Porteiro Profissional", "Serviço de Porteiro", "Porteiro Terceirizado"],
    "Portaria": ["Portaria Terceirizada", "Controle de Portaria", "Serviço de Portaria"],
    "Segurança Patrimonial": ["Segurança Patrimonial", "Proteção Patrimonial", "Vigilância Patrimonial"],
    "Rondas de Segurança": ["Rondas de Segurança", "Ronda Preventiva", "Serviço de Ronda"],
    "Limpeza": ["Limpeza Corporativa", "Serviço de Limpeza", "Limpeza Terceirizada"],
    "Zelador": ["Zelador Profissional", "Serviço de Zeladoria", "Zelador Terceirizado"],
    "Copeira": ["Copeira Corporativa", "Serviço de Copa", "Copeira Terceirizada"],
    "Rondas para Condomínio": ["Rondas para Condomínio", "Segurança de Condomínio", "Ronda Condominial"],
    "Portaria para Empresas": ["Portaria para Empresas", "Portaria Empresarial", "Recepção Empresarial"],
    "Portaria para Condomínios": ["Portaria para Condomínios", "Portaria Condominial", "Controle de Acesso"]
};

function slugify(text) {
    return text.toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"]/g, '-')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

// Seleciona N cidades vizinhas (exclui a cidade atual)
function cidadesVizinhas(cidadeAtual, n = 8) {
    const outras = cidades.filter(c => c !== cidadeAtual);
    // Pega as primeiras N — no futuro pode usar coordenadas reais
    // Por ora, rotaciona baseado no índice para variar entre páginas
    const idx = cidades.indexOf(cidadeAtual);
    const start = idx % Math.max(1, outras.length - n);
    return [...outras.slice(start, start + n), ...outras.slice(0, Math.max(0, n - (outras.length - start)))].slice(0, n);
}

// Gera HTML da seção "Outros serviços em [Cidade]"
function gerarOutrosServicosHTML(servicoAtual, cidade, cidadeSlug, basePath) {
    const outrosServicos = servicos.filter(s => s !== servicoAtual);
    const cards = outrosServicos.map((s, i) => {
        const sSlug = slugify(s);
        const anchor = anchorTexts[s][i % anchorTexts[s].length];
        const icone = servicoIcones[s] || '🔒';
        return `
        <a href="${basePath}${cidadeSlug}/${sSlug}/" class="internal-link-card" title="${s} em ${cidade}">
            <span class="ilc-icon">${icone}</span>
            <span class="ilc-text">${anchor}</span>
            <span class="ilc-city">em ${cidade}</span>
        </a>`;
    }).join('');
    return `
    <section class="section-surface internal-links-section">
        <div class="container">
            <div class="reveal" style="margin-bottom: 32px;">
                <span class="caption-strong" style="color: var(--primary);">OUTROS SERVIÇOS</span>
                <h2 class="display-md" style="margin-top: 8px;">Mais soluções da PS Proteção<br>em <strong>${cidade}</strong></h2>
                <p class="body-md" style="color: var(--ink-muted); margin-top: 12px;">Além de ${servicoAtual}, oferecemos uma gama completa de serviços terceirizados para sua empresa ou condomínio.</p>
            </div>
            <div class="internal-links-grid reveal delay-1">
                ${cards}
            </div>
        </div>
    </section>`;
}

// Gera HTML da seção "Mesmo serviço em outras cidades"
function gerarOutrasCidadesHTML(servico, servicoSlug, cidadeAtual, basePath) {
    const vizinhas = cidadesVizinhas(cidadeAtual, 8);
    const links = vizinhas.map(c => {
        const cSlug = slugify(c);
        return `<a href="${basePath}${cSlug}/${servicoSlug}/" class="city-link-pill" title="${servico} em ${c}">${c}</a>`;
    }).join('');
    return `
    <section class="section city-links-section">
        <div class="container">
            <div class="reveal">
                <span class="caption-strong" style="color: var(--primary);">ATENDIMENTO REGIONAL</span>
                <h2 class="display-md" style="margin-top: 8px; margin-bottom: 24px;">${servico} em outras<br>cidades da região</h2>
                <p class="body-md" style="color: var(--ink-muted); margin-bottom: 32px;">A PS Proteção atende toda a Região Metropolitana de Campinas e o interior paulista. Veja onde mais prestamos este serviço:</p>
                <div class="city-links-pills reveal delay-1">
                    ${links}
                </div>
            </div>
        </div>
    </section>`;
}

// Gera JSON-LD de Breadcrumb
function gerarBreadcrumbSchema(cidade, servico, domainUrl, cidadeSlug) {
    const isHub = servico === "Segurança e Portaria";
    const items = [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://protecaoamericana.com.br/" },
        { "@type": "ListItem", "position": 2, "name": cidade, "item": `https://protecaoamericana.com.br/${cidadeSlug}/` }
    ];
    if (!isHub) {
        items.push({ "@type": "ListItem", "position": 3, "name": servico, "item": domainUrl });
    }
    return `<script type="application/ld+json">
    ${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items }, null, 2)}
    </script>`;
}

// Gera breadcrumb visual HTML
function gerarBreadcrumbHTML(cidade, servico, cidadeSlug, basePath, isHub) {
    if (isHub) {
        return `<nav class="page-breadcrumb" aria-label="breadcrumb">
            <span><a href="${basePath}">Início</a></span>
            <span class="bc-sep">›</span>
            <span>${cidade}</span>
        </nav>`;
    }
    return `<nav class="page-breadcrumb" aria-label="breadcrumb">
        <span><a href="${basePath}">Início</a></span>
        <span class="bc-sep">›</span>
        <span><a href="${basePath}${cidadeSlug}/">${cidade}</a></span>
        <span class="bc-sep">›</span>
        <span>${servico}</span>
    </nav>`;
}

function gerarPaginas() {
    const templatePath = path.join(__dirname, 'template.html');
    if (!fs.existsSync(templatePath)) { console.error("Erro: template.html não encontrado."); return; }
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    let total = 0;

    cidades.forEach(cidade => {
        const cidadeSlug = slugify(cidade);
        const cidadePath = path.join(__dirname, cidadeSlug);
        if (!fs.existsSync(cidadePath)) fs.mkdirSync(cidadePath, { recursive: true });

        // Hub da cidade
        gerarHTML(templateContent, cidade, "Segurança e Portaria", cidadePath, "../", cidadeSlug, true);
        total++;

        servicos.forEach(servico => {
            const servicoSlug = slugify(servico);
            const slugsDeIntencao = [
                servicoSlug,
                `servicos-de-${servicoSlug}`,
                `empresa-de-${servicoSlug}`,
                `terceirizacao-de-${servicoSlug}`,
                `contratar-${servicoSlug}`,
                `${servicoSlug}-terceirizada`,
                `melhor-empresa-de-${servicoSlug}`,
                `orcamento-de-${servicoSlug}`
            ];

            slugsDeIntencao.forEach(slugIntencao => {
                const pastaDestino = path.join(cidadePath, slugIntencao);
                if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });
                gerarHTML(templateContent, cidade, servico, pastaDestino, "../../", cidadeSlug, false, servicoSlug);
                total++;
            });
        });
    });

    console.log(`✅ Sucesso! ${total} páginas geradas para ${cidades.length} cidades e ${servicos.length} serviços.`);
    console.log(`   🔗 Links internos ativos em todas as páginas de serviço.`);
}

function gerarHTML(template, cidade, servico, destino, basePath, cidadeSlug, isHub = false, servicoSlug = '') {
    let html = template;

    const relativePath = destino.replace(__dirname, '').replace(/\\/g, '/');
    const domainUrl = `https://protecaoamericana.com.br${relativePath}/`;

    // Variáveis básicas
    html = html.replace(/\{\{base_path\}\}/g, basePath);
    html = html.replace(/\{\{cidade_capitalized\}\}/g, cidade);
    html = html.replace(/\{\{servico_capitalized\}\}/g, servico);
    html = html.replace(/\{\{dominio_url\}\}/g, domainUrl);

    // Breadcrumb schema
    const breadcrumbSchema = gerarBreadcrumbSchema(cidade, servico, domainUrl, cidadeSlug);
    html = html.replace(/\{\{breadcrumb_schema\}\}/g, breadcrumbSchema);

    // Breadcrumb visual
    const breadcrumbHTML = gerarBreadcrumbHTML(cidade, servico, cidadeSlug, basePath, isHub);
    html = html.replace(/\{\{breadcrumb_html\}\}/g, breadcrumbHTML);

    // Links internos — só em páginas de serviço (não no hub)
    if (!isHub && servicoSlug) {
        const outrosServicosHTML = gerarOutrosServicosHTML(servico, cidade, cidadeSlug, basePath);
        const outrasCidadesHTML = gerarOutrasCidadesHTML(servico, servicoSlug, cidade, basePath);
        html = html.replace(/\{\{outros_servicos_html\}\}/g, outrosServicosHTML);
        html = html.replace(/\{\{outras_cidades_html\}\}/g, outrasCidadesHTML);
    } else {
        html = html.replace(/\{\{outros_servicos_html\}\}/g, '');
        html = html.replace(/\{\{outras_cidades_html\}\}/g, '');
    }

    const outputPath = path.join(destino, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
}

gerarPaginas();
