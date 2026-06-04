// ═══════════════════════════════════════════════════════════
// gerar-paginas-locais.js — SEO Programático Completo
// 60 cidades × 7 serviços = 420 páginas
//
// Inclui:
//  • FAQPage schema (Google rich results)
//  • LocalBusiness + BreadcrumbList + WebPage schema
//  • FAQs de marketing local ("melhor empresa em {cidade}")
//  • Breadcrumb HTML + navegação
//  • Links internos (outros serviços na cidade)
//  • Performance: preconnect, lazy loading, dimensões
//  • Meta tags completas (OG, Twitter, canonical)
//
// Uso: node gerar-paginas-locais.js
// ═══════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────
const SITE_URL     = 'https://protecaoamericana.com.br';
const EMPRESA      = 'PS Proteção';
const TELEFONE     = '(19) 97821-0246';
const TELEFONE_WA  = '5519978210246';
const CNPJ         = '08.393.828/0001-74';
const ENDERECO     = 'Rua São Gabriel, 1623 — Americana, SP';
const RATING       = '4.9';
const REVIEW_COUNT = '53';
const OG_IMAGE     = `${SITE_URL}/herosection.png`;

// ─── Paths ───────────────────────────────────────────────────
const CIDADES_FILE = path.join(__dirname, 'conteudo', 'cidades.json');
const SERVICOS_DIR = path.join(__dirname, 'conteudo', 'servicos');
const OUTPUT_DIR   = path.join(__dirname, 'servicos');

// ─── Parser de .md ───────────────────────────────────────────
function parseMd(raw) {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const fm = {};
    if (fmMatch) {
        fmMatch[1].split('\n').forEach(line => {
            const [k, ...v] = line.split(':');
            if (k && v.length) fm[k.trim()] = v.join(':').trim();
        });
    }
    const sections = {};
    const body = raw.replace(/^---[\s\S]*?---\n/, '');
    const secMatches = [...body.matchAll(/^## (\w+)\n([\s\S]*?)(?=\n## |\n?$)/gm)];
    for (const m of secMatches) sections[m[1]] = m[2].trim();
    return { fm, sections };
}

function render(text, cidade, servico) {
    return (text || '')
        .replace(/\{cidade\}/g, cidade)
        .replace(/\{servico\}/g, servico);
}

function mdList(text) {
    return (text || '').split('\n')
        .filter(l => l.startsWith('- '))
        .map(l => `<li>${l.slice(2)}</li>`)
        .join('\n              ');
}

function faqToSchema(items) {
    return items.map(({ q, a }) => ({
        '@type': 'Question',
        'name': q,
        'acceptedAnswer': { '@type': 'Answer', 'text': a }
    }));
}

// ─── FAQs de marketing local (fixas por combinação) ──────────
function faqsLocais(servico, cidade, servicoNome) {
    return [
        {
            q: `Qual a melhor empresa de ${servicoNome} em ${cidade}?`,
            a: `A PS Proteção é referência em ${servicoNome} em ${cidade} e em toda a Região Metropolitana de Campinas. Com 27 anos de experiência, atendemos condomínios, empresas e indústrias com profissionais certificados, supervisão ativa 24 horas e conformidade trabalhista total. Somos avaliados com nota 4.9 no Google Maps por mais de 53 clientes. Solicite uma cotação gratuita e sem compromisso.`
        },
        {
            q: `A PS Proteção atende ${cidade}?`,
            a: `Sim. A PS Proteção atende ${cidade} e todos os municípios da Região Metropolitana de Campinas. Nossa equipe está preparada para iniciar a operação em até 5 dias úteis após a assinatura do contrato, com todos os profissionais já treinados, uniformizados e segurados.`
        },
        {
            q: `Como solicitar cotação de ${servicoNome} em ${cidade}?`,
            a: `Para solicitar uma cotação de ${servicoNome} em ${cidade}, entre em contato pelo WhatsApp (19) 97821-0246, pelo formulário do site ou ligue diretamente. Nossa equipe comercial agenda uma visita técnica gratuita e apresenta uma proposta personalizada em até 24 horas.`
        },
        {
            q: `Quais empresas de ${servicoNome} atendem em ${cidade}?`,
            a: `A PS Proteção é uma das principais empresas de ${servicoNome} em ${cidade}, com 27 anos de atuação na região. Diferenciamos pelo rigor na seleção e treinamento dos profissionais, supervisão ativa de campo e gestão completa da folha de pagamento — sem passivo trabalhista para o cliente.`
        }
    ];
}

// ─── Gerador de página HTML ───────────────────────────────────
function gerarHtml({ cidade, cidadeSlug, servico, servicoSlug, fm, sections, todosServicos }) {
    const s         = servico;
    const c         = cidade;
    const metaBase  = render(fm.meta_descricao || `Empresa de ${s} em ${c} — ${EMPRESA}. Profissionais certificados, supervisão ativa. Solicite cotação grátis.`, c, s);
    const intro     = render(sections.intro         || '', c, s);
    const comofunc  = render(sections.como_funciona || '', c, s);
    const difsText  = render(sections.diferenciais  || '', c, s);
    const benefText = render(sections.beneficios    || '', c, s);
    const faqMdText = render(sections.faq           || '', c, s);

    const h1        = `Empresa de ${s} em ${c}`;
    const titleTag  = `${h1} | Cotação e Orçamento | ${EMPRESA}`;
    const canonUrl  = `${SITE_URL}/servicos/${servicoSlug}/${cidadeSlug}/`;

    // FAQs: marketing local + específicas do .md
    const faqsLoc = faqsLocais(servicoSlug, c, s);

    // Parse FAQs do .md
    const faqsMd = [];
    const blocos = faqMdText.split('\n\n').filter(Boolean);
    for (const b of blocos) {
        const pMatch = b.match(/^\*\*(.+?)\*\*/);
        if (!pMatch) continue;
        faqsMd.push({ q: pMatch[1], a: b.replace(/^\*\*(.+?)\*\*\n?/, '').trim() });
    }

    const todasFaqs = [...faqsLoc, ...faqsMd];

    // ── Schemas ──────────────────────────────────────────────
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            // 1. LocalBusiness
            {
                '@type': 'LocalBusiness',
                '@id': `${SITE_URL}/#organization`,
                'name': EMPRESA,
                'url': SITE_URL,
                'logo': `${SITE_URL}/logoprotecao.webp`,
                'image': OG_IMAGE,
                'description': metaBase,
                'telephone': '+55-19-97821-0246',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': 'Rua São Gabriel, 1623',
                    'addressLocality': 'Americana',
                    'addressRegion': 'SP',
                    'postalCode': '13467-380',
                    'addressCountry': 'BR'
                },
                'geo': {
                    '@type': 'GeoCoordinates',
                    'latitude': -22.7301816,
                    'longitude': -47.30249
                },
                'areaServed': {
                    '@type': 'City',
                    'name': c
                },
                'hasOfferCatalog': {
                    '@type': 'OfferCatalog',
                    'name': `${s} em ${c}`,
                    'itemListElement': [{
                        '@type': 'Offer',
                        'itemOffered': { '@type': 'Service', 'name': `${s} em ${c}` }
                    }]
                },
                'aggregateRating': {
                    '@type': 'AggregateRating',
                    'ratingValue': RATING,
                    'reviewCount': REVIEW_COUNT,
                    'bestRating': '5',
                    'worstRating': '1'
                },
                'sameAs': [
                    'https://maps.app.goo.gl/y8RtmURSeczWepXu7',
                    `${SITE_URL}`
                ]
            },
            // 2. WebPage
            {
                '@type': 'WebPage',
                '@id': canonUrl,
                'url': canonUrl,
                'name': titleTag,
                'description': metaBase,
                'isPartOf': { '@id': `${SITE_URL}/#website` },
                'about': { '@id': `${SITE_URL}/#organization` },
                'inLanguage': 'pt-BR',
                'dateModified': new Date().toISOString().split('T')[0]
            },
            // 3. BreadcrumbList
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    { '@type': 'ListItem', 'position': 1, 'name': 'Início',   'item': SITE_URL + '/' },
                    { '@type': 'ListItem', 'position': 2, 'name': 'Serviços', 'item': `${SITE_URL}/servicos/` },
                    { '@type': 'ListItem', 'position': 3, 'name': s,          'item': `${SITE_URL}/servicos/${servicoSlug}/` },
                    { '@type': 'ListItem', 'position': 4, 'name': c,          'item': canonUrl }
                ]
            },
            // 4. FAQPage (rich results Google)
            {
                '@type': 'FAQPage',
                'mainEntity': faqToSchema(todasFaqs)
            }
        ]
    };

    // ── Links internos: outros serviços na mesma cidade ───────
    const outrosServicos = todosServicos
        .filter(ts => ts.slug !== servicoSlug)
        .map(ts => `<a href="/servicos/${ts.slug}/${cidadeSlug}/" class="intlink-card">${ts.nome} em ${c}</a>`)
        .join('\n        ');

    // ── FAQs HTML ─────────────────────────────────────────────
    const faqsHtml = todasFaqs.map(({ q, a }) => `
          <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 class="faq-pergunta" itemprop="name">${q}</h3>
            <div class="faq-resposta" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
              <p itemprop="text">${a}</p>
            </div>
          </div>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO Primário -->
  <title>${titleTag}</title>
  <meta name="description" content="${metaBase}">
  <link rel="canonical" href="${canonUrl}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">

  <!-- Open Graph -->
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="${canonUrl}">
  <meta property="og:title"       content="${h1} | ${EMPRESA}">
  <meta property="og:description" content="${metaBase}">
  <meta property="og:image"       content="${OG_IMAGE}">
  <meta property="og:locale"      content="pt_BR">
  <meta property="og:site_name"   content="${EMPRESA}">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${h1} | ${EMPRESA}">
  <meta name="twitter:description" content="${metaBase}">
  <meta name="twitter:image"       content="${OG_IMAGE}">

  <!-- Performance -->
  <meta name="theme-color" content="#0D1B38">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://wa.me">

  <!-- Favicon -->
  <link rel="icon"             href="/favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="icon"             href="/favicon-16x16.png" sizes="16x16" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Fonts (non-blocking) -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Poppins:wght@600;700;800&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Poppins:wght@600;700;800&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Poppins:wght@600;700;800&display=swap"></noscript>

  <!-- CSS -->
  <link rel="stylesheet" href="/css/style.css?v=5">
  <link rel="stylesheet" href="/css/pagina-local.css?v=2">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
</head>
<body>

  <!-- ══ NAV ══════════════════════════════════════════════ -->
  <nav class="top-nav" role="navigation" aria-label="Menu principal">
    <div class="container nav-content">
      <div class="logo" style="display:flex;align-items:center;gap:16px;">
        <a href="/" aria-label="PS Proteção — página inicial">
          <img src="/logoprotecao.webp" alt="Logo PS Proteção" width="144" height="48" style="height:48px;width:auto;" fetchpriority="high">
        </a>
        <span style="color:var(--inverse-canvas);font-weight:600;font-size:14px;letter-spacing:.5px;">PS PROTEÇÃO — Sua segurança. Nosso compromisso.</span>
      </div>
      <div class="nav-links">
        <a href="/#servicos"   class="nav-link">Serviços</a>
        <a href="/quem-somos/" class="nav-link">Quem Somos</a>
        <a href="/#depoimentos" class="nav-link">Avaliações</a>
        <a href="/contato/"    class="nav-link">Contato</a>
      </div>
      <div class="nav-actions">
        <a href="https://wa.me/${TELEFONE_WA}" target="_blank" rel="noopener noreferrer" class="button-primary">Falar com Comercial</a>
      </div>
    </div>
  </nav>

  <!-- ══ BREADCRUMB ════════════════════════════════════════ -->
  <nav class="breadcrumb-nav" aria-label="Navegação estrutural">
    <div class="container">
      <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/" itemprop="item"><span itemprop="name">Início</span></a>
          <meta itemprop="position" content="1">
        </li>
        <li aria-hidden="true">›</li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/servicos/" itemprop="item"><span itemprop="name">Serviços</span></a>
          <meta itemprop="position" content="2">
        </li>
        <li aria-hidden="true">›</li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/servicos/${servicoSlug}/" itemprop="item"><span itemprop="name">${s}</span></a>
          <meta itemprop="position" content="3">
        </li>
        <li aria-hidden="true">›</li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">${c}</span>
          <meta itemprop="position" content="4">
        </li>
      </ol>
    </div>
  </nav>

  <main id="conteudo-principal">

    <!-- ══ HERO LOCAL ════════════════════════════════════════ -->
    <header class="local-hero" role="banner">
      <div class="container">
        <p class="local-badge">📍 Atendemos ${c} e região</p>
        <h1 class="display-lg local-h1">${h1}</h1>
        <p class="body-lg local-subtitulo">
          Solicite <strong>cotação de ${s} em ${c}</strong> com a PS Proteção —
          27 anos de experiência, profissionais certificados e supervisão ativa 24h.
          Proposta em até 24 horas, sem compromisso.
        </p>

        <!-- CTAs -->
        <div class="local-ctas">
          <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20or%C3%A7amento%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}"
             target="_blank" rel="noopener noreferrer"
             class="btn-wa" aria-label="Solicitar orçamento via WhatsApp">
            Solicitar Orçamento Grátis
          </a>
          <a href="tel:+${TELEFONE_WA}" class="btn-tel" aria-label="Ligar para PS Proteção">
            ${TELEFONE}
          </a>
        </div>

        <!-- Trust signals -->
        <ul class="local-trust" aria-label="Credenciais da empresa">
          <li>✅ 27 anos de experiência</li>
          <li>✅ Conformidade trabalhista total</li>
          <li>✅ Cobertura 24h garantida</li>
          <li>⭐ 4.9 no Google Maps (53 avaliações)</li>
        </ul>
      </div>
    </header>

    <!-- ══ INTENÇÕES DE BUSCA (chips visíveis) ════════════════ -->
    <section class="section-surface local-chips-section" aria-label="Palavras-chave relacionadas">
      <div class="container">
        <ul class="local-chips" role="list">
          <li>Cotação de ${s} em ${c}</li>
          <li>Orçamento de ${s} em ${c}</li>
          <li>Empresa de ${s} em ${c}</li>
          <li>Serviços Terceirizados de ${s} em ${c}</li>
          <li>Contrate ${s} em ${c}</li>
        </ul>
      </div>
    </section>

    <!-- ══ INTRO + CTA BOX ════════════════════════════════════ -->
    <section class="section" aria-labelledby="intro-titulo">
      <div class="container local-2col">
        <div>
          <h2 id="intro-titulo" class="display-md">
            Por que contratar <span class="text-primary">${s}</span> em ${c}?
          </h2>
          <p class="body-lg" style="color:var(--ink-muted);margin-top:16px;line-height:1.8;">${intro}</p>
        </div>
        <aside class="local-cta-box" aria-label="Solicite uma proposta">
          <h3>Receba uma proposta em 24h</h3>
          <p>Atendemos ${c} e toda a Região Metropolitana de Campinas. Sem compromisso.</p>
          <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}"
             target="_blank" rel="noopener noreferrer" class="button-primary local-cta-btn">
            Falar no WhatsApp
          </a>
          <div class="local-cta-rating">
            <span>⭐⭐⭐⭐⭐</span>
            <span>${RATING}/5 · ${REVIEW_COUNT} avaliações no Google</span>
          </div>
        </aside>
      </div>
    </section>

    <!-- ══ BENEFÍCIOS ═════════════════════════════════════════ -->
    <section class="section-surface" aria-labelledby="beneficios-titulo">
      <div class="container">
        <h2 id="beneficios-titulo" class="display-md" style="margin-bottom:32px;">
          Benefícios de contratar <span class="text-primary">${s}</span> com a PS Proteção em ${c}
        </h2>
        <ul class="local-beneficios-grid">
          ${mdList(benefText)}
        </ul>
      </div>
    </section>

    <!-- ══ COMO FUNCIONA ══════════════════════════════════════ -->
    <section class="section" aria-labelledby="como-funciona-titulo">
      <div class="container" style="max-width:800px;">
        <h2 id="como-funciona-titulo" class="display-md" style="margin-bottom:24px;">
          Como funciona o serviço de ${s} em ${c}
        </h2>
        <p class="body-lg" style="color:var(--ink-muted);line-height:1.8;">${comofunc}</p>
      </div>
    </section>

    <!-- ══ DIFERENCIAIS ═══════════════════════════════════════ -->
    <section class="section-inverse" aria-labelledby="diferenciais-titulo">
      <div class="container">
        <h2 id="diferenciais-titulo" class="display-md" style="margin-bottom:32px;color:#fff;">
          Nossos diferenciais em <span style="color:#FEBE00;">${c}</span>
        </h2>
        <ul class="local-diferenciais-grid">
          ${mdList(difsText)}
        </ul>
      </div>
    </section>

    <!-- ══ FAQ — MARKETING LOCAL ══════════════════════════════ -->
    <section class="section" aria-labelledby="faq-titulo" itemscope itemtype="https://schema.org/FAQPage">
      <div class="container" style="max-width:800px;">
        <h2 id="faq-titulo" class="display-md" style="margin-bottom:8px;">
          Perguntas frequentes sobre ${s} em ${c}
        </h2>
        <p class="body-lg" style="color:var(--ink-muted);margin-bottom:40px;">
          Tudo o que você precisa saber antes de contratar ${s} em ${c}.
        </p>
        <div class="faq-lista">
          ${faqsHtml}
        </div>
      </div>
    </section>

    <!-- ══ OUTROS SERVIÇOS NA CIDADE ══════════════════════════ -->
    <section class="section-surface" aria-labelledby="outros-servicos-titulo">
      <div class="container">
        <h2 id="outros-servicos-titulo" class="display-md" style="margin-bottom:24px;">
          Outros serviços da PS Proteção em <span class="text-primary">${c}</span>
        </h2>
        <p class="body-lg" style="color:var(--ink-muted);margin-bottom:32px;">
          Além de ${s}, a PS Proteção oferece uma solução completa de facilities e segurança para ${c}.
        </p>
        <div class="intlink-grid">
          ${outrosServicos}
        </div>
      </div>
    </section>

    <!-- ══ CTA FINAL ══════════════════════════════════════════ -->
    <section class="section cta-final-section" style="text-align:center;" aria-label="Chamada para ação">
      <div class="container">
        <h2 class="display-md" style="margin-bottom:16px;">
          Pronto para contratar <span class="text-primary">${s}</span> em ${c}?
        </h2>
        <p class="body-lg" style="color:var(--ink-muted);margin-bottom:36px;max-width:560px;margin-left:auto;margin-right:auto;">
          Fale agora com nosso time comercial. Proposta personalizada em até 24h, sem compromisso.
        </p>
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
          <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}"
             target="_blank" rel="noopener noreferrer" class="button-primary" style="font-size:16px;padding:18px 40px;">
            Solicitar Cotação de ${s} em ${c}
          </a>
          <a href="tel:+${TELEFONE_WA}" class="button-outline-on-dark" style="font-size:16px;padding:18px 40px;">
            ${TELEFONE}
          </a>
        </div>
      </div>
    </section>

  </main>

  <!-- ══ FOOTER ════════════════════════════════════════════ -->
  <footer role="contentinfo" style="background:var(--inverse-canvas);color:rgba(255,255,255,.55);padding:48px 0;font-size:14px;">
    <div class="container" style="display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between;">
      <div>
        <img src="/logoprotecao.webp" alt="Logo PS Proteção" width="120" height="40" loading="lazy" style="height:40px;width:auto;margin-bottom:16px;opacity:.85;">
        <p>${EMPRESA}</p>
        <p>CNPJ: ${CNPJ}</p>
        <p>${ENDERECO}</p>
        <p>Tel: ${TELEFONE}</p>
      </div>
      <nav aria-label="Links do rodapé">
        <p style="color:rgba(255,255,255,.8);font-weight:600;margin-bottom:12px;">Navegação</p>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;">
          <li><a href="/"            style="color:rgba(255,255,255,.6);">Início</a></li>
          <li><a href="/quem-somos/" style="color:rgba(255,255,255,.6);">Quem Somos</a></li>
          <li><a href="/contato/"    style="color:rgba(255,255,255,.6);">Contato</a></li>
          <li><a href="/blog/"       style="color:rgba(255,255,255,.6);">Blog</a></li>
        </ul>
      </nav>
      <div>
        <p style="color:rgba(255,255,255,.8);font-weight:600;margin-bottom:12px;">Atendemos em ${c}</p>
        <p style="max-width:240px;">Portaria · Segurança · Limpeza · Jardinagem · Zeladoria · Vigia · Rondas</p>
        <p style="margin-top:12px;">
          <a href="https://wa.me/${TELEFONE_WA}" target="_blank" rel="noopener noreferrer" style="color:#FEBE00;">WhatsApp</a> ·
          <a href="https://maps.app.goo.gl/y8RtmURSeczWepXu7" target="_blank" rel="noopener noreferrer" style="color:#FEBE00;">Google Maps</a>
        </p>
      </div>
    </div>
    <div class="container" style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);text-align:center;">
      <p>© ${new Date().getFullYear()} ${EMPRESA}. Todos os direitos reservados.</p>
    </div>
  </footer>

  <!-- WhatsApp flutuante -->
  <a href="https://wa.me/${TELEFONE_WA}" target="_blank" rel="noopener noreferrer"
     class="whatsapp-float" aria-label="Falar no WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </a>

  <script src="/js/main.js" defer></script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────
function main() {
    const cidades  = JSON.parse(fs.readFileSync(CIDADES_FILE, 'utf8'));
    const mdFiles  = fs.readdirSync(SERVICOS_DIR).filter(f => f.endsWith('.md'));

    // Mapa de todos os serviços (para links internos)
    const todosServicos = mdFiles.map(f => {
        const raw     = fs.readFileSync(path.join(SERVICOS_DIR, f), 'utf8');
        const { fm }  = parseMd(raw);
        return { slug: fm.slug || f.replace('.md', ''), nome: fm.servico || f.replace('.md', '') };
    });

    let total = 0;

    for (const mdFile of mdFiles) {
        const raw              = fs.readFileSync(path.join(SERVICOS_DIR, mdFile), 'utf8');
        const { fm, sections } = parseMd(raw);
        const servicoSlug      = fm.slug     || mdFile.replace('.md', '');
        const servico          = fm.servico  || servicoSlug;

        for (const cidade of cidades) {
            const dir = path.join(OUTPUT_DIR, servicoSlug, cidade.slug);
            fs.mkdirSync(dir, { recursive: true });

            const html = gerarHtml({
                cidade:       cidade.nome,
                cidadeSlug:   cidade.slug,
                servico,
                servicoSlug,
                fm,
                sections,
                todosServicos,
            });

            fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
            total++;
        }

        console.log(`✅ ${servico}: ${cidades.length} páginas`);
    }

    console.log(`\n🎉 Total gerado: ${total} páginas em /servicos/`);
}

main();
