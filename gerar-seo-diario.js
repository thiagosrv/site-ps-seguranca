// ═══════════════════════════════════════════════════════════
// gerar-seo-diario.js — Gerador de páginas SEO com novos ângulos
// Uso: node gerar-seo-diario.js
// Gera 2 novas landing pages por execução para as cidades foco
// ═══════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { pesquisarContexto, agenteDisponivel } = require('./agente-pesquisa');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
    openaiKey:   process.env.OPENAI_API_KEY || 'sk-SUA-CHAVE-AQUI',
    model:       'gpt-4o',
    domain:      'https://protecaoamericana.com.br',
    whatsapp:    'https://wa.me/5519978210246',
    geradosFile: path.join(__dirname, 'seo-gerados.json'),
    pagesPerDay: 2,
};

// ─── CIDADES PRIORITÁRIAS ───────────────────────────────────
const CIDADES_FOCO = [
    "Americana",
    "Santa Bárbara d'Oeste",
    "Limeira",
    "Piracicaba",
    "Nova Odessa",
    "Sumaré",
    "Campinas"
];

// ─── SERVIÇOS ───────────────────────────────────────────────
const SERVICOS = [
    "Vigia", "Porteiro", "Portaria", "Segurança Patrimonial",
    "Rondas de Segurança", "Limpeza", "Zelador", "Copeira",
    "Rondas para Condomínio", "Portaria para Empresas", "Portaria para Condomínios"
];

// ─── ÂNGULOS DE KEYWORD (novos — além dos 8 slugs base) ─────
// slug_prefix usa {servico} como placeholder
const ANGULOS = [
    {
        id:          'cotacao',
        slug_prefix: 'cotacao-de-{servico}',
        titulo:      'Cotação de {Servico} em {Cidade}',
        foco:        'orçamento personalizado, variáveis de custo, como solicitar proposta'
    },
    {
        id:          'supervisao-estrategica',
        slug_prefix: '{servico}-com-supervisao-estrategica',
        titulo:      '{Servico} com Supervisão Estratégica em {Cidade}',
        foco:        'supervisão ativa em campo, KPIs mensais, SLA, controle de qualidade por turno'
    },
    {
        id:          '24-horas',
        slug_prefix: '{servico}-24-horas',
        titulo:      '{Servico} 24 Horas em {Cidade}',
        foco:        'cobertura contínua, escala 12x36, plantão noturno, equipe de apoio'
    },
    {
        id:          'para-industria',
        slug_prefix: '{servico}-para-industria',
        titulo:      '{Servico} Industrial em {Cidade}',
        foco:        'galpões logísticos, indústrias, polo industrial, controle de acesso pesado'
    },
    {
        id:          'com-pop',
        slug_prefix: '{servico}-com-pop',
        titulo:      '{Servico} com POP e Método em {Cidade}',
        foco:        'Procedimento Operacional Padrão, implantação estruturada, padronização desde o 1º dia'
    },
    {
        id:          'para-condominio-residencial',
        slug_prefix: '{servico}-para-condominio-residencial',
        titulo:      '{Servico} para Condomínio Residencial em {Cidade}',
        foco:        'síndico, assembleia, moradores, rotina condominial, controle de acesso'
    },
    {
        id:          'para-centro-comercial',
        slug_prefix: '{servico}-para-centro-comercial',
        titulo:      '{Servico} para Centro Comercial em {Cidade}',
        foco:        'lojas, centros comerciais, fluxo intenso de visitantes, horário de pico'
    },
    {
        id:          'com-conformidade-trabalhista',
        slug_prefix: '{servico}-com-conformidade-trabalhista',
        titulo:      '{Servico} com Conformidade Trabalhista em {Cidade}',
        foco:        'encargos trabalhistas assumidos, LGPD, risco zero para o contratante, auditorias'
    },
    {
        id:          'implantacao-rapida',
        slug_prefix: '{servico}-implantacao-rapida',
        titulo:      '{Servico} com Implantação Rápida em {Cidade}',
        foco:        'início em dias, POP no 1º dia, treinamento ágil, sem interrupções'
    },
    {
        id:          'melhor-custo-beneficio',
        slug_prefix: '{servico}-melhor-custo-beneficio',
        titulo:      'Melhor Custo-Benefício em {Servico} em {Cidade}',
        foco:        '27 anos de mercado, estrutura eficiente, reserva técnica, sem surpresas no contrato'
    },
];

// ─── HELPERS ────────────────────────────────────────────────
function slugify(text) {
    return text.toString()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"]/g, '-')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function callGPT(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: CONFIG.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.75,
            response_format: { type: 'json_object' }
        });
        const options = {
            hostname: 'api.openai.com',
            path:     '/v1/chat/completions',
            method:   'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.openaiKey}`,
                'Content-Type':  'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data',  chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(json.error.message));
                    resolve(JSON.parse(json.choices[0].message.content));
                } catch(e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ─── PROMPT ─────────────────────────────────────────────────
function buildSEOPrompt(cidade, servico, angulo, contextoAgente = '') {
    const titulo     = angulo.titulo.replace('{Servico}', servico).replace('{Cidade}', cidade);
    const cidadeSlug = slugify(cidade);
    const servicoSlug = slugify(servico);
    const hubUrl     = `${CONFIG.domain}/${cidadeSlug}/`;
    const servicoUrl = `${CONFIG.domain}/${cidadeSlug}/${servicoSlug}/`;

    const blocoContexto = contextoAgente
        ? `\n\nCONTEXTO DE PESQUISA — USE OBRIGATORIAMENTE:
${contextoAgente}

REGRAS PARA USAR O CONTEXTO ACIMA:
- Cite as fontes autoritativas no texto com links externos naturais: <a href="URL" target="_blank" rel="noopener noreferrer">Texto âncora</a>
- Mencione dados e estatísticas concretos com atribuição à fonte (ex: "Segundo a ABESE...")
- Referencie a legislação pelo nome correto (ex: "conforme a Lei 7.102/83...")
- Use as FAQs reais coletadas para as 3 perguntas da seção de FAQ
- Incorpore os termos LSI naturalmente ao longo do texto
- Use os dados locais de ${cidade} para tornar o conteúdo hiperlocal\n`
        : '';

    return `Você é um especialista em SEO e copy B2B para empresas de segurança terceirizada no Brasil.${blocoContexto}

Gere o conteúdo de uma landing page de serviço para a PS Proteção — empresa com 27 anos atuando na Região Metropolitana de Campinas/SP.

PÁGINA ALVO: "${titulo}"
SERVIÇO: ${servico}
CIDADE: ${cidade}
ÂNGULO/FOCO ESPECÍFICO: ${angulo.foco}
DOMÍNIO: ${CONFIG.domain}

REGRAS OBRIGATÓRIAS:
- Tom: especialista confiável, direto ao ponto, sem exageros comerciais
- NUNCA mencione valores em R$ ou faixas de preço — redirecione para orçamento personalizado
- Cite fontes autoritativas com links externos quando disponível (ABESE, legislação, IBGE, entidades do setor)
- Mencione legislação aplicável pelo nome correto quando relevante (Lei 7.102/83, CLT, LGPD, NRs)
- H1 impactante (até 65 chars) com keyword da cidade e serviço
- Meta description com keyword (até 155 chars)
- Intro: 80-120 words com keyword nos primeiros 50 words
- 3 seções H2 ricas (use <p>, <ul><li>, <strong> — HTML puro, sem markdown)
- FAQ com 3 perguntas reais do público (use as FAQs do contexto de pesquisa se disponíveis; respostas 60-80 words; nunca mencione R$)
- Links internos naturais para: ${hubUrl} e ${servicoUrl}
- Conclusão com CTA para ${CONFIG.whatsapp}

RETORNE APENAS JSON válido (sem backticks, sem markdown):
{
  "h1": "Título H1 até 65 chars",
  "meta_description": "até 155 chars com keyword",
  "intro": "texto puro, 80-120 words",
  "sections": [
    { "h2": "Título", "content": "HTML com <p>, <ul><li>, <strong>" }
  ],
  "faq": [
    { "question": "Pergunta?", "answer": "Resposta 60-80 words" }
  ],
  "conclusion": "parágrafo final com CTA em HTML, link para ${CONFIG.whatsapp}"
}`;
}

// ─── BUILDER HTML ────────────────────────────────────────────
function buildLandingPage(data, cidade, servico, angulo, slug) {
    const cidadeSlug  = slugify(cidade);
    const servicoSlug = slugify(servico);
    const basePath    = '../../';
    const pageUrl     = `${CONFIG.domain}/${cidadeSlug}/${slug}/`;

    const sectionsHTML = data.sections.map(s => `
        <section class="lp-section" style="margin-bottom:48px">
            <h2 class="display-md" style="margin-bottom:24px">${s.h2}</h2>
            ${s.content}
        </section>`).join('\n');

    const faqHTML = data.faq.map((f, i) => `
        <div class="faq-item" ${i === data.faq.length - 1 ? 'style="border-bottom:none"' : ''}>
            <button class="faq-question">
                <span class="title-sm">${f.question}</span>
                <span style="font-size:24px;font-weight:300">+</span>
            </button>
            <div class="faq-answer">
                <p class="body-md">${f.answer}</p>
            </div>
        </div>`).join('\n');

    const breadcrumbSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Início",  "item": `${CONFIG.domain}/` },
            { "@type": "ListItem", "position": 2, "name": cidade,    "item": `${CONFIG.domain}/${cidadeSlug}/` },
            { "@type": "ListItem", "position": 3, "name": servico,   "item": `${CONFIG.domain}/${cidadeSlug}/${servicoSlug}/` },
            { "@type": "ListItem", "position": 4, "name": data.h1,   "item": pageUrl }
        ]
    }, null, 2);

    const faqSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": data.faq.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": { "@type": "Answer", "text": f.answer.replace(/"/g, "'") }
        }))
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.h1} | PS Proteção</title>
    <meta name="description" content="${data.meta_description}">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:type"        content="website">
    <meta property="og:title"       content="${data.h1} | PS Proteção">
    <meta property="og:description" content="${data.meta_description}">
    <meta property="og:url"         content="${pageUrl}">
    <link rel="icon" href="${basePath}favicon-32x32.png" sizes="32x32" type="image/png">
    <link rel="icon" href="${basePath}favicon-16x16.png" sizes="16x16" type="image/png">
    <link rel="apple-touch-icon" href="${basePath}apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Inter:wght@400;500;600;700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Inter:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Inter:wght@400;500;600;700&display=swap"></noscript>
    <link rel="stylesheet" href="${basePath}css/style.css?v=4">
    <script type="application/ld+json">
${breadcrumbSchema}
    </script>
    <script type="application/ld+json">
${faqSchema}
    </script>
</head>
<body>

    <nav class="top-nav">
        <div class="container nav-content">
            <div class="logo" style="display:flex;align-items:center;gap:16px">
                <a href="${basePath}">
                    <img src="${basePath}logoprotecao.webp" alt="PS Proteção" fetchpriority="high" width="144" height="48" style="height:48px;width:auto;display:block">
                </a>
                <span style="color:var(--inverse-canvas);font-weight:600;font-size:14px;letter-spacing:.5px">PS PROTEÇÃO — Sua segurança. Nosso compromisso.</span>
            </div>
            <div class="nav-links">
                <a href="${basePath}#servicos"    class="nav-link">Serviços</a>
                <a href="${basePath}quem-somos/"  class="nav-link">Quem Somos</a>
                <a href="${basePath}#depoimentos" class="nav-link">Avaliações</a>
                <a href="${basePath}contato/"     class="nav-link">Contato</a>
            </div>
            <div class="nav-actions">
                <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="button-primary">
                    <span class="text-default">Falar com Comercial</span>
                    <span class="text-hover"><span class="pulse-dot"></span> Estamos online</span>
                </a>
            </div>
        </div>
    </nav>

    <main>

        <!-- Hero -->
        <header class="hero-band-dark" style="padding:80px 0 64px">
            <div class="container">
                <nav class="page-breadcrumb" aria-label="breadcrumb" style="margin-bottom:24px">
                    <span><a href="${basePath}">Início</a></span>
                    <span class="bc-sep">›</span>
                    <span><a href="${basePath}${cidadeSlug}/">${cidade}</a></span>
                    <span class="bc-sep">›</span>
                    <span><a href="${basePath}${cidadeSlug}/${servicoSlug}/">${servico}</a></span>
                    <span class="bc-sep">›</span>
                    <span style="color:rgba(255,255,255,.5)">${data.h1}</span>
                </nav>
                <span class="badge-pill">Desde 1998</span>
                <h1 class="display-mega" style="margin-top:16px">${data.h1}</h1>
                <p class="body-lg hero-subtitle" style="max-width:640px;margin-top:16px">${data.intro}</p>
                <div class="hero-actions" style="margin-top:32px">
                    <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="button-pill-cta" data-tooltip="Cotação rápida sem enrolação">
                        <span class="text-default">Solicitar Proposta Personalizada</span>
                        <span class="text-hover"><span class="pulse-dot"></span> Estamos online</span>
                    </a>
                    <a href="${basePath}${cidadeSlug}/${servicoSlug}/" class="button-outline-on-dark">Ver ${servico} em ${cidade}</a>
                </div>
            </div>
        </header>

        <!-- Conteúdo -->
        <div style="max-width:800px;margin:0 auto;padding:64px 24px">
            ${sectionsHTML}
        </div>

        <!-- FAQ -->
        <section id="faq" class="section-surface">
            <div class="container">
                <div class="ibm-grid-2">
                    <div class="reveal">
                        <h2 class="display-md">Dúvidas frequentes</h2>
                        <p class="body-lg" style="color:var(--ink-muted);margin-top:16px">Transparência em cada etapa do processo.</p>
                    </div>
                    <div class="reveal delay-1">
                        ${faqHTML}
                    </div>
                </div>
            </div>
        </section>

        <!-- Conclusão + CTA -->
        <section class="section" style="max-width:800px;margin:0 auto;padding:64px 24px">
            <h2 class="display-md" style="margin-bottom:24px">Próximo passo</h2>
            ${data.conclusion}
        </section>

        <!-- CTA Banner -->
        <section class="cta-banner">
            <div class="container">
                <h2 class="display-lg reveal" style="margin-bottom:16px">${servico} em ${cidade} — fale agora.</h2>
                <p class="body-lg reveal delay-1" style="margin-bottom:32px;max-width:560px;margin-left:auto;margin-right:auto">
                    Diagnóstico gratuito. Proposta personalizada. Resposta em até 2 horas.
                </p>
                <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="button-primary reveal delay-2" style="background-color:var(--inverse-canvas);color:white">
                    <span class="text-default">Solicitar Orçamento no WhatsApp</span>
                    <span class="text-hover"><span class="pulse-dot"></span> Estamos online</span>
                </a>
            </div>
        </section>

    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="legal">
                <p>&copy; 2026 PS PROTEÇÃO — Todos os direitos reservados. CNPJ: 47.425.584/0001-00</p>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Flutuante -->
    <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="floating-whatsapp" aria-label="Fale conosco no WhatsApp">
        <svg viewBox="0 0 32 32" width="32" height="32" fill="white">
            <path d="M16 1.9C8.2 1.9 1.9 8.2 1.9 16c0 2.5.7 4.9 1.9 7L1.1 30.9l8.1-2.1c2.1 1.2 4.4 1.8 6.8 1.8 7.8 0 14.1-6.3 14.1-14.1S23.8 1.9 16 1.9zm0 24c-2.1 0-4.1-.5-5.9-1.5l-.4-.2-4.4 1.2 1.2-4.3-.3-.5c-1.1-1.8-1.7-3.9-1.7-6.1 0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12zm6.6-9c-.4-.2-2.1-1-2.5-1.1-.3-.1-.5-.2-.7.2s-.9 1.1-1.1 1.4c-.2.2-.4.3-.8.1-2-.9-3.4-2.5-4.4-4.5-.2-.3 0-.5.2-.7.2-.2.4-.4.6-.6.2-.2.3-.4.4-.7.1-.3 0-.5-.1-.7s-1-2.4-1.3-3.3c-.3-.9-.6-.8-.8-.8h-.7c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.1 3.2 1.3 3.4.2.3 2.3 3.5 5.6 4.9 2.5 1.1 3.4 1.1 4.5.9 1.1-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.7-.4z"/>
        </svg>
    </a>

    <script src="${basePath}js/main.js"></script>
</body>
</html>`;
}

// ─── MAIN ────────────────────────────────────────────────────
async function gerarPaginasSEO() {
    console.log('\n🔍 SEO Programático Diário — PS Proteção\n');

    const gerados = fs.existsSync(CONFIG.geradosFile)
        ? JSON.parse(fs.readFileSync(CONFIG.geradosFile, 'utf8'))
        : [];

    const geradosSet = new Set(gerados.map(g => g.id));

    // Monta fila completa de combinações pendentes
    const fila = [];
    for (const cidade of CIDADES_FOCO) {
        for (const servico of SERVICOS) {
            for (const angulo of ANGULOS) {
                const servicoSlug = slugify(servico);
                const slugAngulo  = angulo.slug_prefix.replace('{servico}', servicoSlug);
                const cidadeSlug  = slugify(cidade);
                const id          = `${cidadeSlug}/${slugAngulo}`;
                if (!geradosSet.has(id)) {
                    fila.push({ cidade, servico, angulo, id, slugAngulo, cidadeSlug });
                }
            }
        }
    }

    if (fila.length === 0) {
        console.log('✅ Todos os ângulos já foram gerados para as cidades foco!');
        return 0;
    }

    const lote = fila.slice(0, CONFIG.pagesPerDay);
    let geradosHoje = 0;

    for (const item of lote) {
        const { cidade, servico, angulo, id, slugAngulo, cidadeSlug } = item;
        const titulo = angulo.titulo.replace('{Servico}', servico).replace('{Cidade}', cidade);
        console.log(`📄 Gerando: "${titulo}"`);
        console.log(`   Cidade: ${cidade} | Serviço: ${servico} | Ângulo: ${angulo.id}\n`);

        try {
            // ── Pesquisa com agente Claude (opcional) ────────
            let contextoAgente = '';
            if (agenteDisponivel()) {
                try {
                    const slugAngulo2 = angulo.titulo.replace('{Servico}', servico).replace('{Cidade}', cidade);
                    contextoAgente = await pesquisarContexto({
                        keyword: `${servico.toLowerCase()} ${cidade.toLowerCase()}`,
                        cidade,
                        servico,
                        tipo: angulo.id,
                    });
                } catch(e) {
                    console.warn(`   ⚠️  Pesquisa Claude falhou:`, e.message);
                }
            }

            console.log('⏳ Chamando GPT-4o...');
            const data = await callGPT(buildSEOPrompt(cidade, servico, angulo, contextoAgente));
            const slug = slugAngulo; // slug fixo pelo template para consistência de URL

            const destDir = path.join(__dirname, cidadeSlug, slug);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

            const html = buildLandingPage(data, cidade, servico, angulo, slug);
            fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
            console.log(`   ✅ Criado: ${cidadeSlug}/${slug}/index.html`);

            gerados.push({
                id, cidade, servico,
                angulo: angulo.id, slug,
                data: new Date().toISOString().split('T')[0]
            });
            fs.writeFileSync(CONFIG.geradosFile, JSON.stringify(gerados, null, 2), 'utf8');
            geradosHoje++;

        } catch(e) {
            console.error(`   ❌ Erro ao gerar ${id}:`, e.message);
        }
    }

    const restantes = fila.length - geradosHoje;
    console.log(`\n✅ ${geradosHoje} página(s) SEO gerada(s) hoje.`);
    console.log(`📊 ${restantes} combinações restantes na fila (~${Math.ceil(restantes / CONFIG.pagesPerDay)} dias).\n`);
    return geradosHoje;
}

module.exports = { gerarPaginasSEO };

if (require.main === module) {
    gerarPaginasSEO().catch(err => {
        console.error('\n❌ Erro:', err.message);
        process.exit(1);
    });
}
