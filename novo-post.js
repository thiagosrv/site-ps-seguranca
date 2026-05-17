// ═══════════════════════════════════════════════════
// novo-post.js — Blog Factory com GPT-4o
// Uso: node novo-post.js
// ═══════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── CONFIG ───────────────────────────────────────
const CONFIG = {
    openaiKey: process.env.OPENAI_API_KEY || 'sk-SUA-CHAVE-AQUI',
    model: 'gpt-4o',
    domain: 'https://protecaoamericana.com.br',
    // Outros domínios seus — serão linkados contextualmente nos artigos
    outrosDominios: [
        // { url: 'https://seuoutrositenoticias.com.br', descricao: 'Portal de Notícias do setor de segurança' },
        // { url: 'https://seuoutrositeconsultoria.com.br', descricao: 'Consultoria em Facilities' },
    ],
    whatsapp: 'https://wa.me/5519978210246',
    topicsFile: path.join(__dirname, 'topics.json'),
    postsFile:  path.join(__dirname, 'blog', 'posts.json'),
    blogDir:    path.join(__dirname, 'blog'),
    autoPush: true,
};

// ─── HELPERS ──────────────────────────────────────
function slugify(text) {
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"?!:,]/g, '')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function today() {
    return new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

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
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.openaiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
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

function buildPrompt(topico) {
    const dominiosExtra = CONFIG.outrosDominios.length > 0
        ? `\nLinks para outros domínios do autor (incluir 1-2 naturalmente no texto, como referências úteis):\n${CONFIG.outrosDominios.map(d => `- ${d.url} (${d.descricao})`).join('\n')}`
        : '';

    return `Você é um redator SEO especialista em segurança privada, portaria e facilities no Brasil. Escreva um artigo completo em português brasileiro para o blog de uma empresa de terceirização de segurança e portaria da Região Metropolitana de Campinas - SP.

TÓPICO: "${topico.topico}"
SERVIÇO PRINCIPAL: ${topico.servico}
CIDADE FOCO: ${topico.cidade}
KEYWORD PRIMÁRIA: "${topico.keyword}"
TIPO DE CONTEÚDO: ${topico.tipo}

INSTRUÇÕES OBRIGATÓRIAS:
- Artigo com EXATAMENTE 1.400 a 1.600 palavras (conte e respeite isso)
- Tom: especialista confiável, direto, sem exageros comerciais
- A keyword primária DEVE aparecer nos primeiros 100 words da introdução
- REGRA DE OURO SOBRE PREÇOS: NUNCA mencione valores específicos ou faixas de preço em Reais (R$). Explique de forma detalhada e profissional que os custos são altamente variáveis de acordo com a escala de trabalho (ex: 12x36 ou 44h semanais), o nível de especialização exigido para o posto, a complexidade da implantação, e as necessidades particulares de cada condomínio ou empresa. Destaque que a melhor forma de obter um valor justo é realizando um diagnóstico e orçamento personalizado.
- Use dados reais do mercado brasileiro de facilities/segurança quando possível
- Inclua 4-6 seções H2 com parágrafos ricos e densos
- Adicione H3 dentro das seções quando fizer sentido
- Use listas (bullet ou numerada) em pelo menos 2 seções
- O FAQ deve ter 3-4 perguntas que as pessoas realmente pesquisam (se a pergunta do FAQ envolver custos, responda explicando as variáveis operacionais e trabalhistas envolvidas, sem nunca citar valores em R$)
- Links internos: inclua 2-3 links naturais para páginas do site \${CONFIG.domain}/\${slugify(topico.cidade)}/\${slugify(topico.servico)}/ e \${CONFIG.domain}/\${slugify(topico.cidade)}/
- Na conclusão: CTA para WhatsApp comercial \${CONFIG.whatsapp}\${dominiosExtra}

RETORNE APENAS JSON válido com esta estrutura (sem markdown, sem \`\`\`):
{
  "title": "título H1 com keyword (até 65 chars)",
  "meta_description": "meta description com keyword (até 155 chars)",
  "slug": "slug-seo-friendly-sem-acentos",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "reading_time": "X min de leitura",
  "intro": "parágrafo de introdução com keyword nos primeiros 100 words (150-200 words)",
  "sections": [
    {
      "h2": "Título da Seção",
      "content": "parágrafo(s) da seção em HTML puro (use <p>, <ul><li>, <ol><li>, <strong>, <h3>)",
      "has_list": true
    }
  ],
  "faq": [
    { "question": "Pergunta?", "answer": "Resposta completa (80-120 words)" }
  ],
  "conclusion": "parágrafo de conclusão com CTA em HTML (inclua <a href='${CONFIG.whatsapp}' ...>)"
}`;
}

function buildPostHTML(data, topico, slug) {
    const sectionsHTML = data.sections.map(s => `
        <section class="post-section">
            <h2>${s.h2}</h2>
            ${s.content}
        </section>`).join('\n');

    const faqHTML = data.faq.map((f, i) => `
        <div class="faq-item" id="faq-${i+1}">
            <button class="faq-question" aria-expanded="false">
                <span>${f.question}</span>
                <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="faq-answer"><p>${f.answer}</p></div>
        </div>`).join('\n');

    const tagsHTML = (data.tags || []).map(t =>
        `<a href="../?tag=${slugify(t)}" class="post-tag">${t}</a>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title} | Blog PS Proteção</title>
    <meta name="description" content="${data.meta_description}">
    <link rel="canonical" href="${CONFIG.domain}/blog/${slug}/">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${data.title}">
    <meta property="og:description" content="${data.meta_description}">
    <meta property="og:url" content="${CONFIG.domain}/blog/${slug}/">
    <link rel="icon" href="../../logoprotecao.png" type="image/png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Inter:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="../../css/style.css?v=4">
    <link rel="stylesheet" href="../blog.css">
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${data.title}",
        "description": "${data.meta_description}",
        "datePublished": "${todayISO()}",
        "dateModified": "${todayISO()}",
        "author": { "@type": "Organization", "name": "PS Proteção", "url": "${CONFIG.domain}" },
        "publisher": { "@type": "Organization", "name": "PS Proteção", "logo": { "@type": "ImageObject", "url": "${CONFIG.domain}/logoprotecao.webp" } },
        "mainEntityOfPage": { "@type": "WebPage", "@id": "${CONFIG.domain}/blog/${slug}/" },
        "keywords": "${(data.tags || []).join(', ')}"
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Início", "item": "${CONFIG.domain}/" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "${CONFIG.domain}/blog/" },
            { "@type": "ListItem", "position": 3, "name": "${data.title}", "item": "${CONFIG.domain}/blog/${slug}/" }
        ]
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [${data.faq.map(f => `{"@type":"Question","name":"${f.question}","acceptedAnswer":{"@type":"Answer","text":"${f.answer.replace(/"/g,"'")}"}}`).join(',')}]
    }
    </script>
</head>
<body>
    <nav class="top-nav">
        <div class="container nav-content">
            <div class="logo" style="display:flex;align-items:center;gap:16px">
                <a href="../../"><img src="../../logoprotecao.webp" alt="PS Proteção" fetchpriority="high" width="144" height="48" style="height:48px;width:auto"></a>
            </div>
            <div class="nav-links">
                <a href="../../#servicos" class="nav-link">Serviços</a>
                <a href="../../quem-somos/" class="nav-link">Quem Somos</a>
                <a href="../" class="nav-link" style="color:var(--primary)">Blog</a>
                <a href="../../contato/" class="nav-link">Contato</a>
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
        <article class="post-container">
            <header class="post-header">
                <nav class="page-breadcrumb" style="margin-bottom:24px">
                    <span><a href="../../" style="color:rgba(255,255,255,.7)">Início</a></span>
                    <span class="bc-sep">›</span>
                    <span><a href="../" style="color:rgba(255,255,255,.7)">Blog</a></span>
                    <span class="bc-sep">›</span>
                    <span style="color:rgba(255,255,255,.5)">${topico.servico}</span>
                </nav>
                <div class="post-meta">
                    <span class="post-category">${topico.servico}</span>
                    <span class="post-date">📅 ${today()}</span>
                    <span class="post-read">⏱ ${data.reading_time}</span>
                </div>
                <h1>${data.title}</h1>
                <p class="post-lead">${data.meta_description}</p>
                <div class="post-tags">${tagsHTML}</div>
            </header>

            <div class="post-body">
                <p class="post-intro">${data.intro}</p>

                ${sectionsHTML}

                <section class="post-faq">
                    <h2>Perguntas Frequentes</h2>
                    <div class="faq-list">
                        ${faqHTML}
                    </div>
                </section>

                <section class="post-conclusion">
                    <h2>Conclusão</h2>
                    ${data.conclusion}
                </section>
            </div>

            <aside class="post-cta-box">
                <h3>Precisa de ${topico.servico} em ${topico.cidade}?</h3>
                <p>Fale com o time comercial da PS Proteção agora. Resposta em até 2 horas.</p>
                <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="button-primary" style="background:#25D366">
                    <span class="text-default">💬 Falar no WhatsApp</span>
                    <span class="text-hover"><span class="pulse-dot"></span> Estamos online</span>
                </a>
                <a href="../../${slugify(topico.cidade)}/${slugify(topico.servico)}/" class="post-internal-link">
                    Ver serviço de ${topico.servico} em ${topico.cidade} →
                </a>
            </aside>
        </article>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="legal" style="border-top:none;padding-top:0">
                <p>&copy; 2026 PS PROTEÇÃO — <a href="../" style="color:var(--ink-muted)">Blog</a></p>
            </div>
        </div>
    </footer>

    <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="floating-whatsapp" aria-label="WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
    </a>
    <script src="../../js/main.js"></script>
</body>
</html>`;
}

function buildBlogIndex(posts) {
    const cardsHTML = posts.slice().reverse().map(p => `
        <article class="blog-card reveal">
            <div class="blog-card-header">
                <span class="post-category">${p.servico}</span>
                <span class="post-date">${p.date}</span>
            </div>
            <h2 class="blog-card-title"><a href="${p.slug}/">${p.title}</a></h2>
            <p class="blog-card-desc">${p.meta_description}</p>
            <div class="blog-card-footer">
                <div class="post-tags">${(p.tags || []).slice(0,3).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
                <a href="${p.slug}/" class="blog-read-more">Ler artigo →</a>
            </div>
        </article>`).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog | PS Proteção - Segurança e Facilities na RMC</title>
    <meta name="description" content="Artigos sobre segurança patrimonial, portaria terceirizada e facilities para empresas e condomínios na Região Metropolitana de Campinas.">
    <link rel="canonical" href="${CONFIG.domain}/blog/">
    <link rel="icon" href="../logoprotecao.png" type="image/png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Inter:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="../css/style.css?v=4">
    <link rel="stylesheet" href="blog.css">
</head>
<body>
    <nav class="top-nav">
        <div class="container nav-content">
            <div class="logo" style="display:flex;align-items:center;gap:16px">
                <a href="../"><img src="../logoprotecao.webp" alt="PS Proteção" fetchpriority="high" width="144" height="48" style="height:48px;width:auto"></a>
            </div>
            <div class="nav-links">
                <a href="../#servicos" class="nav-link">Serviços</a>
                <a href="../quem-somos/" class="nav-link">Quem Somos</a>
                <a href="./" class="nav-link" style="color:var(--primary)">Blog</a>
                <a href="../contato/" class="nav-link">Contato</a>
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
        <section style="background:var(--inverse-canvas);color:white;padding:80px 0 56px">
            <div class="container">
                <span class="caption-strong" style="color:var(--primary)">BLOG PS PROTEÇÃO</span>
                <h1 style="font-size:clamp(32px,4vw,48px);font-weight:300;margin-top:8px;font-family:'Inter',sans-serif">
                    Segurança, Portaria e Facilities:<br><strong>conteúdo que gera resultado.</strong>
                </h1>
                <p style="font-size:17px;color:rgba(255,255,255,.7);margin-top:16px;max-width:560px">
                    ${posts.length} artigo${posts.length !== 1 ? 's' : ''} sobre terceirização de serviços no interior de São Paulo.
                </p>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="blog-grid">
                    ${cardsHTML}
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="legal" style="border-top:none;padding-top:0">
                <p>&copy; 2026 PS PROTEÇÃO — Todos os direitos reservados.</p>
            </div>
        </div>
    </footer>

    <a href="${CONFIG.whatsapp}" target="_blank" rel="noopener noreferrer" class="floating-whatsapp" aria-label="WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
    </a>
    <script src="../js/main.js"></script>
</body>
</html>`;
}

// ─── MAIN ─────────────────────────────────────────
async function main() {
    console.log('\n🚀 Blog Factory — PS Proteção\n');

    // Garante pasta /blog
    if (!fs.existsSync(CONFIG.blogDir)) fs.mkdirSync(CONFIG.blogDir, { recursive: true });

    // Carrega fila de tópicos
    const topics = JSON.parse(fs.readFileSync(CONFIG.topicsFile, 'utf8'));
    const posts  = fs.existsSync(CONFIG.postsFile)
        ? JSON.parse(fs.readFileSync(CONFIG.postsFile, 'utf8'))
        : [];

    // Descobre tópicos já publicados
    const publishedSlugs = new Set(posts.map(p => p.slug));
    const pending = topics.filter(t => !publishedSlugs.has(slugify(t.topico)));

    if (pending.length === 0) {
        console.log('✅ Todos os tópicos já foram publicados! Adicione mais em topics.json.');
        return;
    }

    const topico = pending[0];
    console.log(`📝 Gerando: "${topico.topico}"`);
    console.log(`   Cidade: ${topico.cidade} | Serviço: ${topico.servico}\n`);

    // Chama GPT
    console.log('⏳ Chamando GPT-4o...');
    const data = await callGPT(buildPrompt(topico));
    const slug = data.slug || slugify(topico.topico);

    // Cria pasta e HTML do post
    const postDir = path.join(CONFIG.blogDir, slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), buildPostHTML(data, topico, slug), 'utf8');
    console.log(`✅ Post criado: blog/${slug}/index.html`);

    // Atualiza posts.json
    posts.push({
        slug, title: data.title, meta_description: data.meta_description,
        tags: data.tags || [], date: today(), dateISO: todayISO(),
        servico: topico.servico, cidade: topico.cidade, tipo: topico.tipo
    });
    fs.writeFileSync(CONFIG.postsFile, JSON.stringify(posts, null, 2), 'utf8');

    // Regenera blog/index.html
    fs.writeFileSync(path.join(CONFIG.blogDir, 'index.html'), buildBlogIndex(posts), 'utf8');
    console.log(`📋 Blog index atualizado (${posts.length} post${posts.length > 1 ? 's' : ''})`);

    // Git push automático
    if (CONFIG.autoPush) {
        console.log('\n📤 Fazendo push para GitHub...');
        const { execSync } = require('child_process');
        try {
            execSync(`git add -A && git commit -m "blog: ${data.title.substring(0,60)}" && git push origin main`, {
                cwd: __dirname, stdio: 'inherit'
            });
            console.log('✅ Deploy iniciado no Vercel!\n');
        } catch(e) {
            console.warn('⚠️  Git push falhou — faça manualmente:', e.message);
        }
    }

    console.log(`\n📊 Status: ${posts.length} publicados | ${pending.length - 1} restantes na fila`);
    console.log(`🔗 URL: ${CONFIG.domain}/blog/${slug}/\n`);
}

main().catch(err => {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
});
