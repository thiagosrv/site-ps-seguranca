// ═══════════════════════════════════════════════════════════
// agente-pesquisa.js — Agente Claude com web search + cache
//
// Pesquisa referências SEO autoritativas e salva em cache
// compartilhado (pesquisa-cache/) — outros projetos (ex: LinkedIn)
// podem ler o mesmo cache sem chamar a API novamente.
//
// Cache TTL: 7 dias por padrão (configurável via CACHE_TTL_DIAS)
// Cache path: ./pesquisa-cache/ (ou CACHE_DIR no ambiente)
//
// Requer: ANTHROPIC_API_KEY no ambiente
// ═══════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');
const fs   = require('fs');
const path = require('path');

// ─── Cache config ────────────────────────────────────────
const CACHE_DIR  = process.env.CACHE_DIR
    || path.join(__dirname, 'pesquisa-cache');
const CACHE_TTL  = parseInt(process.env.CACHE_TTL_DIAS || '7') * 24 * 60 * 60 * 1000;

function slugCache(keyword, cidade, servico) {
    return [keyword, cidade, servico]
        .join('-')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^\w]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function lerCache(chave) {
    const arquivo = path.join(CACHE_DIR, `${chave}.json`);
    if (!fs.existsSync(arquivo)) return null;
    try {
        const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
        const idade = Date.now() - new Date(dados.cachedAt).getTime();
        if (idade > CACHE_TTL) return null; // expirado
        return dados;
    } catch { return null; }
}

function salvarCache(chave, contexto, meta) {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const arquivo = path.join(CACHE_DIR, `${chave}.json`);
    fs.writeFileSync(arquivo, JSON.stringify({
        ...meta,
        contexto,
        cachedAt: new Date().toISOString(),
        ttlDias: CACHE_TTL / (24 * 60 * 60 * 1000),
    }, null, 2), 'utf8');
}

// ─── Cliente Anthropic ────────────────────────────────────
let _client = null;
function getClient() {
    if (!_client) {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('ANTHROPIC_API_KEY não definida.');
        _client = new Anthropic({ apiKey: key });
    }
    return _client;
}

// ─── Agente de pesquisa (com cache) ─────────────────────
// Recebe: { keyword, cidade, servico, tipo }
// Retorna: { contexto: string, fromCache: bool, cachedAt?, cacheFile? }
async function pesquisarContexto({ keyword, cidade, servico, tipo }) {
    const chave = slugCache(keyword, cidade, servico);
    const meta  = { keyword, cidade, servico, tipo };

    // ── Tenta cache primeiro ──────────────────────────────
    const cached = lerCache(chave);
    if (cached) {
        const diasAtras = Math.floor(
            (Date.now() - new Date(cached.cachedAt).getTime()) / 86400000
        );
        console.log(`   📦 Cache hit: "${keyword}" (${diasAtras}d atrás) — sem custo de API`);
        return { contexto: cached.contexto, fromCache: true, cachedAt: cached.cachedAt, cacheFile: chave };
    }

    // ── Chama a API ───────────────────────────────────────
    console.log(`   🔍 Agente pesquisando: "${keyword}" em ${cidade}...`);
    const client = getClient();

    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 3000,
        thinking: { type: 'adaptive' },
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
            role: 'user',
            content: `Você é um pesquisador de SEO especializado em serviços de segurança e facilities no interior de São Paulo, Brasil.

Pesquise referências autoritativas para enriquecer um conteúdo sobre:
- Keyword: "${keyword}"
- Cidade: ${cidade}
- Serviço: ${servico}
- Tipo de conteúdo: ${tipo}

Faça buscas para encontrar:
1. Artigos da ABESE ou entidades do setor de segurança/facilities
2. Legislação relevante: CLT, Lei 7.102/83 (segurança privada), NRs aplicáveis, LGPD
3. Dados do IBGE ou prefeitura sobre ${cidade} (perfil econômico, industrial, habitacional)
4. Notícias recentes (últimos 2 anos) sobre segurança privada ou facilities no Brasil
5. Artigos do Wikipedia ou portais especializados sobre ${servico}
6. Perguntas reais que síndicos/gestores fazem sobre ${servico}

Entregue um resumo estruturado com:

**Fontes autoritativas para citar** (inclua URL real se encontrar):
- Nome da fonte | URL | Por que é relevante

**Dados e estatísticas concretas** (com fonte)

**Legislação aplicável**

**FAQs reais do público** (3-4 perguntas genuínas)

**Dados locais de ${cidade}**

**Termos semânticos (LSI)** — 6-8 termos relacionados`
        }],
    });

    let contexto = '';
    for (const block of response.content) {
        if (block.type === 'text') contexto += block.text;
    }

    // ── Salva no cache ────────────────────────────────────
    salvarCache(chave, contexto, meta);
    console.log(`   ✅ Pesquisa concluída e salva em cache (${contexto.length} chars)`);

    return { contexto, fromCache: false, cacheFile: chave };
}

// ─── Verifica se o agente está disponível ───────────────
function agenteDisponivel() {
    return !!process.env.ANTHROPIC_API_KEY;
}

// ─── Lista todos os caches disponíveis ──────────────────
// Útil para o projeto LinkedIn descobrir o que já foi pesquisado
function listarCaches() {
    if (!fs.existsSync(CACHE_DIR)) return [];
    return fs.readdirSync(CACHE_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            try {
                const dados = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
                const expirado = (Date.now() - new Date(dados.cachedAt).getTime()) > CACHE_TTL;
                return { ...dados, cacheFile: f.replace('.json',''), expirado };
            } catch { return null; }
        })
        .filter(Boolean);
}

// ─── Lê um cache específico por chave ───────────────────
// O projeto LinkedIn pode chamar isso diretamente
function lerCachePor(keyword, cidade, servico) {
    const chave = slugCache(keyword, cidade, servico);
    return lerCache(chave);
}

module.exports = {
    pesquisarContexto,
    agenteDisponivel,
    listarCaches,
    lerCachePor,
    CACHE_DIR,
};

// Teste: node agente-pesquisa.js
if (require.main === module) {
    (async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('❌ ANTHROPIC_API_KEY não definida.');
            console.log('   Defina com: [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY","sk-ant-...","User")');
            process.exit(1);
        }
        const { contexto, fromCache } = await pesquisarContexto({
            keyword: 'portaria terceirizada americana sp',
            cidade:  'Americana',
            servico: 'Portaria',
            tipo:    'guia'
        });
        console.log(`\n══════ CONTEXTO (${fromCache ? 'DO CACHE' : 'API'}) ══════\n`);
        console.log(contexto);

        console.log('\n══════ CACHES DISPONÍVEIS ══════\n');
        listarCaches().forEach(c => {
            console.log(`  📄 ${c.cacheFile} — ${c.servico} em ${c.cidade} (${c.expirado ? 'EXPIRADO' : 'válido'})`);
        });
    })().catch(err => {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    });
}
