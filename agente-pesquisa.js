// ═══════════════════════════════════════════════════════════
// agente-pesquisa.js — Agente Claude com web search
//
// Antes de escrever qualquer conteúdo, pesquisa na web:
//   - O que os concorrentes publicam sobre aquele tema
//   - Referências do setor de segurança/facilities
//   - Perguntas frequentes reais do público
//   - Dados locais sobre a cidade alvo
//
// Como funciona: usa a ferramenta web_search da Anthropic
// (server-side — a Anthropic executa as buscas e devolve
// a resposta completa em uma única chamada de API).
//
// Requer: ANTHROPIC_API_KEY no ambiente
// ═══════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');

let _client = null;
function getClient() {
    if (!_client) {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('ANTHROPIC_API_KEY não definida. Adicione nas variáveis de ambiente.');
        _client = new Anthropic({ apiKey: key });
    }
    return _client;
}

// ─── Agente de pesquisa ─────────────────────────────────
// Recebe: { keyword, cidade, servico, tipo }
// Retorna: string com o contexto de pesquisa estruturado
async function pesquisarContexto({ keyword, cidade, servico, tipo }) {
    console.log(`   🔍 Agente pesquisando: "${keyword}" em ${cidade}...`);

    const client = getClient();

    // Para ferramentas server-side (web_search_20250305),
    // a Anthropic executa as buscas internamente e devolve
    // a resposta final em uma única chamada — sem loop manual.
    const response = await client.messages.create({
        model: 'claude-opus-4-7',
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
1. Artigos da ABESE (Associação Brasileira das Empresas de Segurança Eletrônica) ou entidades do setor
2. Legislação relevante: CLT, Lei 7.102/83 (segurança privada), NRs aplicáveis, LGPD
3. Dados do IBGE ou prefeitura sobre ${cidade} (perfil econômico, industrial, habitacional)
4. Notícias recentes (últimos 2 anos) sobre segurança privada ou facilities no Brasil
5. Artigos do Wikipedia ou portais especializados sobre ${servico}
6. Perguntas reais que síndicos/gestores fazem sobre ${servico} (Reclame Aqui, fóruns, Reddit)

Entregue um resumo estruturado com:

**Fontes autoritativas para citar** (inclua URL real se encontrar):
- Nome da fonte | URL | Por que é relevante para o texto

**Dados e estatísticas concretas** (com fonte):
- Ex: "Segundo a ABESE, o setor de segurança privada emprega X pessoas no Brasil"

**Legislação aplicável**:
- Leis, normas ou resoluções que o redator deve mencionar com precisão

**FAQs reais do público** (3-4 perguntas genuínas):
- Perguntas que síndicos, gestores de RH ou administradores realmente fazem sobre ${servico}

**Dados locais de ${cidade}**:
- Perfil econômico, industrial ou habitacional útil para contextualizar o texto

**Termos semânticos (LSI)** — 6-8 termos relacionados para usar no texto sem forçar`
        }],
    });

    // Extrai o texto da resposta
    let contexto = '';
    for (const block of response.content) {
        if (block.type === 'text') contexto += block.text;
    }

    console.log(`   ✅ Contexto pronto (${contexto.length} chars)`);
    return contexto;
}

// ─── Verifica se o agente está disponível ───────────────
function agenteDisponivel() {
    return !!process.env.ANTHROPIC_API_KEY;
}

module.exports = { pesquisarContexto, agenteDisponivel };

// Teste: node agente-pesquisa.js
if (require.main === module) {
    (async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('❌ ANTHROPIC_API_KEY não definida.');
            console.log('   Defina com: [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY","sk-ant-...","User")');
            process.exit(1);
        }
        const resultado = await pesquisarContexto({
            keyword: 'portaria terceirizada americana sp',
            cidade: 'Americana',
            servico: 'Portaria',
            tipo: 'guia'
        });
        console.log('\n══════ CONTEXTO COLETADO ══════\n');
        console.log(resultado);
    })().catch(err => {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    });
}
