// ═══════════════════════════════════════════════════════════
// linkagem-interna.js — Sugere links internos relevantes
//
// Escaneia blog/posts.json e seo-gerados.json para encontrar
// páginas já publicadas relacionadas ao conteúdo sendo gerado.
// O prompt do GPT-4o recebe essas URLs para linkar naturalmente.
// ═══════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const DOMAIN       = 'https://protecaoamericana.com.br';
const POSTS_FILE   = path.join(__dirname, 'blog', 'posts.json');
const GERADOS_FILE = path.join(__dirname, 'seo-gerados.json');

function slugify(text) {
    return text.toString()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"]/g, '-')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

// Retorna até `max` links internos relevantes para {cidade, servico}
// Prioriza: mesma cidade + mesmo serviço > mesma cidade > mesmo serviço
function getLinkagensInternas({ cidade, servico, slugAtual = '' }, max = 6) {
    const links = [];

    // ── 1. Páginas SEO já geradas ──────────────────────────
    if (fs.existsSync(GERADOS_FILE)) {
        const gerados = JSON.parse(fs.readFileSync(GERADOS_FILE, 'utf8'));

        const score = g => {
            let s = 0;
            if (g.cidade  === cidade)  s += 2;
            if (g.servico === servico) s += 2;
            return s;
        };

        gerados
            .filter(g => g.id !== slugAtual && score(g) > 0)
            .sort((a, b) => score(b) - score(a))
            .slice(0, 4)
            .forEach(g => {
                const titulo = `${g.servico} — ${g.angulo.replace(/-/g,' ')} em ${g.cidade}`;
                links.push({ url: `${DOMAIN}/${g.id}/`, titulo, tipo: 'seo' });
            });
    }

    // ── 2. Posts do blog já publicados ────────────────────
    if (fs.existsSync(POSTS_FILE)) {
        const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));

        const score = p => {
            let s = 0;
            if (p.cidade  === cidade)  s += 2;
            if (p.servico === servico) s += 2;
            return s;
        };

        posts
            .filter(p => score(p) > 0 && `${DOMAIN}/blog/${p.slug}/` !== slugAtual)
            .sort((a, b) => score(b) - score(a))
            .slice(0, 3)
            .forEach(p => {
                links.push({ url: `${DOMAIN}/blog/${p.slug}/`, titulo: p.title, tipo: 'blog' });
            });
    }

    // ── 3. Hubs de cidade e serviço sempre presentes ──────
    const cidadeSlug  = slugify(cidade);
    const servicoSlug = slugify(servico);

    links.push({ url: `${DOMAIN}/${cidadeSlug}/`,               titulo: `${servico} e serviços em ${cidade}`,  tipo: 'hub' });
    links.push({ url: `${DOMAIN}/${cidadeSlug}/${servicoSlug}/`, titulo: `${servico} em ${cidade} — PS Proteção`, tipo: 'hub' });

    // Remove duplicatas e limita
    const vistos = new Set();
    return links.filter(l => {
        if (vistos.has(l.url)) return false;
        vistos.add(l.url);
        return true;
    }).slice(0, max);
}

// Formata como bloco de texto para o prompt
function formatarParaPrompt(links) {
    if (!links.length) return '';
    const linhas = links.map(l => `- ${l.url} → "${l.titulo}" [${l.tipo}]`).join('\n');
    return `PÁGINAS INTERNAS DO SITE PARA LINKAR NATURALMENTE NO TEXTO (use 3-5 delas como links âncora contextuais, nunca como lista solta):\n${linhas}`;
}

module.exports = { getLinkagensInternas, formatarParaPrompt };
