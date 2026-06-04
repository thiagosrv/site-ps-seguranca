// ═══════════════════════════════════════════════════════════
// gerar-paginas-locais.js
// Gera 420 páginas HTML (60 cidades × 7 serviços)
// a partir dos arquivos .md em conteudo/servicos/
// Uso: node gerar-paginas-locais.js
// ═══════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const CIDADES_FILE  = path.join(__dirname, 'conteudo', 'cidades.json');
const SERVICOS_DIR  = path.join(__dirname, 'conteudo', 'servicos');
const OUTPUT_DIR    = path.join(__dirname, 'servicos');

const TELEFONE_WA   = '5519978210246';
const SITE_URL      = 'https://protecaoamericana.com.br';
const EMPRESA       = 'PS Proteção';

// ─── Parser de .md ───────────────────────────────────────────
function parseMd(raw) {
    // Extrai frontmatter entre --- e ---
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const fm = {};
    if (fmMatch) {
        fmMatch[1].split('\n').forEach(line => {
            const [k, ...v] = line.split(':');
            if (k) fm[k.trim()] = v.join(':').trim();
        });
    }

    // Extrai seções ## nome\nconteúdo
    const sections = {};
    const body = raw.replace(/^---[\s\S]*?---\n/, '');
    const secMatches = body.matchAll(/^## (\w+)\n([\s\S]*?)(?=\n## |\n?$)/gm);
    for (const m of secMatches) {
        sections[m[1]] = m[2].trim();
    }

    return { fm, sections };
}

// Converte lista markdown em <ul><li>
function mdList(text) {
    const items = text.split('\n')
        .filter(l => l.startsWith('- '))
        .map(l => `<li>${l.slice(2)}</li>`)
        .join('\n            ');
    return `<ul>\n            ${items}\n          </ul>`;
}

// Converte FAQ (** Pergunta **\nResposta) em HTML
function mdFaq(text) {
    const blocks = text.split('\n\n').filter(Boolean);
    return blocks.map(b => {
        const pergMatch = b.match(/^\*\*(.+?)\*\*/);
        if (!pergMatch) return '';
        const pergunta = pergMatch[1];
        const resposta = b.replace(/^\*\*(.+?)\*\*\n?/, '').trim();
        return `
          <div class="faq-item">
            <h3 class="faq-pergunta">${pergunta}</h3>
            <p class="faq-resposta">${resposta}</p>
          </div>`;
    }).join('\n');
}

// Substitui placeholders {cidade} e {servico}
function render(text, cidade, servico) {
    return text
        .replace(/\{cidade\}/g, cidade)
        .replace(/\{servico\}/g, servico);
}

// ─── Gerador de HTML ─────────────────────────────────────────
function gerarHtml({ cidade, cidadeSlug, servico, servicoSlug, fm, sections }) {
    const c = cidade;
    const s = servico;

    const titulo      = render(fm.servico || s, c, s);
    const metaDesc    = render(fm.meta_descricao || '', c, s);
    const intro       = render(sections.intro       || '', c, s);
    const comofunc    = render(sections.como_funciona || '', c, s);
    const difsText    = render(sections.diferenciais  || '', c, s);
    const benefText   = render(sections.beneficios    || '', c, s);
    const faqText     = render(sections.faq           || '', c, s);

    const canonUrl    = `${SITE_URL}/servicos/${servicoSlug}/${cidadeSlug}/`;

    // Intenções de busca para h1 e subtítulos
    const h1          = `Empresa de ${s} em ${c}`;
    const subtitulo   = `Cotação e Orçamento de ${s} em ${c}`;

    // Schema LocalBusiness
    const schema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": EMPRESA,
        "description": metaDesc,
        "url": canonUrl,
        "telephone": "+55-19-97821-0246",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Rua São Gabriel, 1623",
            "addressLocality": c,
            "addressRegion": "SP",
            "addressCountry": "BR"
        },
        "areaServed": c,
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": `${s} em ${c}`,
            "itemListElement": [{
                "@type": "Offer",
                "itemOffered": { "@type": "Service", "name": `${s} em ${c}` }
            }]
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "53"
        }
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${h1} | ${EMPRESA}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="${canonUrl}">
  <meta property="og:title"       content="${h1} | ${EMPRESA}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url"         content="${canonUrl}">
  <meta property="og:type"        content="website">
  <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Poppins:wght@600;700;800&display=swap" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="/css/style.css?v=5">
  <link rel="stylesheet" href="/css/pagina-local.css">
  <script type="application/ld+json">${schema}</script>
</head>
<body>

  <!-- Nav -->
  <nav class="top-nav">
    <div class="container nav-content">
      <div class="logo" style="display:flex;align-items:center;gap:16px;">
        <a href="/"><img src="/logoprotecao.webp" alt="${EMPRESA}" height="48" style="height:48px;width:auto;"></a>
        <span style="color:#fff;font-weight:600;font-size:14px;">PS PROTEÇÃO — Sua segurança. Nosso compromisso.</span>
      </div>
      <div class="nav-links">
        <a href="/#servicos" class="nav-link">Serviços</a>
        <a href="/quem-somos/" class="nav-link">Quem Somos</a>
        <a href="/#depoimentos" class="nav-link">Avaliações</a>
        <a href="/contato/" class="nav-link">Contato</a>
      </div>
      <div class="nav-actions">
        <a href="https://wa.me/${TELEFONE_WA}" target="_blank" rel="noopener" class="button-primary">Falar com Comercial</a>
      </div>
    </div>
  </nav>

  <main>

    <!-- Hero da página local -->
    <header class="local-hero">
      <div class="container">
        <span class="badge-pill" style="display:inline-flex;align-items:center;gap:8px;background:rgba(254,190,0,.15);color:#FEBE00;border:1px solid rgba(254,190,0,.3);padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:9999px;margin-bottom:24px;">
          📍 Atendemos ${c} e região
        </span>
        <h1 class="display-lg" style="color:#fff;margin-bottom:16px;">${h1}</h1>
        <p class="body-lg" style="color:rgba(255,255,255,.75);max-width:640px;margin-bottom:32px;">${subtitulo} — profissionais certificados, supervisão ativa e conformidade trabalhista. Receba uma proposta em até 24h.</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20um%20or%C3%A7amento%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}" target="_blank" rel="noopener" class="button-pill-cta" style="background:#FEBE00;color:#0D1B38;border-radius:9999px;padding:16px 32px;font-weight:700;text-decoration:none;font-size:15px;">
            Solicitar Orçamento Grátis
          </a>
          <a href="tel:+${TELEFONE_WA}" class="button-outline" style="border:2px solid rgba(255,255,255,.35);color:#fff;border-radius:9999px;padding:16px 32px;font-weight:600;text-decoration:none;font-size:15px;">
            (19) 97821-0246
          </a>
        </div>
        <!-- Trust bar -->
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:40px;padding-top:28px;border-top:1px solid rgba(255,255,255,.12);">
          <span style="color:rgba(255,255,255,.6);font-size:13px;">✅ 27 anos de experiência</span>
          <span style="color:rgba(255,255,255,.6);font-size:13px;">✅ Conformidade trabalhista total</span>
          <span style="color:rgba(255,255,255,.6);font-size:13px;">✅ ⭐ 4.9 no Google Maps</span>
        </div>
      </div>
    </header>

    <!-- Intenções de busca -->
    <section class="section-surface">
      <div class="container local-intencoes">
        <div class="intencao-card"><strong>Cotação de ${s} em ${c}</strong></div>
        <div class="intencao-card"><strong>Orçamento de ${s} em ${c}</strong></div>
        <div class="intencao-card"><strong>Serviços Terceirizados de ${s} em ${c}</strong></div>
        <div class="intencao-card"><strong>Contrate ${s} em ${c}</strong></div>
        <div class="intencao-card"><strong>Empresa de ${s} em ${c}</strong></div>
      </div>
    </section>

    <!-- Intro -->
    <section class="section">
      <div class="container local-2col">
        <div>
          <h2 class="display-md">Por que contratar <span class="text-primary">${s}</span> em ${c}?</h2>
          <p class="body-lg" style="color:var(--ink-muted);margin-top:16px;">${intro}</p>
        </div>
        <div class="local-cta-box">
          <h3 style="font-family:var(--font-heading);font-size:22px;font-weight:700;margin-bottom:12px;">Receba uma proposta em 24h</h3>
          <p style="color:var(--ink-muted);margin-bottom:24px;">Sem compromisso. Atendemos ${c} e toda a Região Metropolitana de Campinas.</p>
          <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}" target="_blank" rel="noopener" class="button-primary" style="display:block;text-align:center;padding:16px;">
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>

    <!-- Benefícios -->
    <section class="section-surface">
      <div class="container">
        <h2 class="display-md" style="margin-bottom:32px;">Benefícios de contratar <span class="text-primary">${s}</span> com a PS Proteção em ${c}</h2>
        <div class="local-beneficios">
          ${mdList(benefText)}
        </div>
      </div>
    </section>

    <!-- Como funciona -->
    <section class="section">
      <div class="container" style="max-width:760px;">
        <h2 class="display-md" style="margin-bottom:24px;">Como funciona o serviço de ${s} em ${c}</h2>
        <p class="body-lg" style="color:var(--ink-muted);">${comofunc}</p>
      </div>
    </section>

    <!-- Diferenciais -->
    <section class="section-inverse">
      <div class="container">
        <h2 class="display-md" style="margin-bottom:32px;color:#fff;">Nossos diferenciais em <span style="color:#FEBE00;">${c}</span></h2>
        <div class="local-diferenciais">
          ${mdList(difsText)}
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section">
      <div class="container" style="max-width:760px;">
        <h2 class="display-md" style="margin-bottom:32px;">Perguntas frequentes sobre ${s} em ${c}</h2>
        ${mdFaq(faqText)}
      </div>
    </section>

    <!-- CTA Final -->
    <section class="section-surface" style="text-align:center;">
      <div class="container">
        <h2 class="display-md" style="margin-bottom:16px;">Pronto para contratar <span class="text-primary">${s}</span> em ${c}?</h2>
        <p class="body-lg" style="color:var(--ink-muted);margin-bottom:32px;">Fale agora com nosso time comercial e receba uma proposta personalizada em até 24 horas.</p>
        <a href="https://wa.me/${TELEFONE_WA}?text=Ol%C3%A1!%20Preciso%20de%20${encodeURIComponent(s)}%20em%20${encodeURIComponent(c)}" target="_blank" rel="noopener" class="button-primary" style="font-size:16px;padding:18px 40px;">
          Solicitar Cotação de ${s} em ${c}
        </a>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer style="background:var(--inverse-canvas);color:rgba(255,255,255,.6);padding:40px 0;text-align:center;font-size:14px;">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${EMPRESA} — CNPJ: 00.000.000/0001-00 — Rua São Gabriel, 1623, ${c}, SP</p>
      <p style="margin-top:8px;"><a href="/" style="color:#FEBE00;">Início</a> · <a href="/quem-somos/" style="color:#FEBE00;">Quem Somos</a> · <a href="/contato/" style="color:#FEBE00;">Contato</a></p>
    </div>
  </footer>

  <script src="/js/main.js" defer></script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────
function main() {
    const cidades  = JSON.parse(fs.readFileSync(CIDADES_FILE, 'utf8'));
    const mdFiles  = fs.readdirSync(SERVICOS_DIR).filter(f => f.endsWith('.md'));

    let total = 0;

    for (const mdFile of mdFiles) {
        const raw    = fs.readFileSync(path.join(SERVICOS_DIR, mdFile), 'utf8');
        const { fm, sections } = parseMd(raw);
        const servicoSlug = fm.slug || mdFile.replace('.md', '');
        const servico     = fm.servico || servicoSlug;

        for (const cidade of cidades) {
            const dir = path.join(OUTPUT_DIR, servicoSlug, cidade.slug);
            fs.mkdirSync(dir, { recursive: true });

            const html = gerarHtml({
                cidade:      cidade.nome,
                cidadeSlug:  cidade.slug,
                servico,
                servicoSlug,
                fm,
                sections,
            });

            fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
            total++;
        }

        console.log(`✅ ${servico}: ${cidades.length} páginas geradas`);
    }

    console.log(`\n🎉 Total: ${total} páginas em /servicos/`);
}

main();
