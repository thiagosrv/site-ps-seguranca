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

Pesquise informações para enriquecer o seguinte conteúdo que vou criar:
- Keyword: "${keyword}"
- Cidade: ${cidade}
- Serviço: ${servico}
- Tipo de conteúdo: ${tipo}

Faça buscas sobre:
1. O que está ranqueando no Google para "${keyword}"
2. Perguntas reais que empresas/síndicos fazem sobre ${servico} na região
3. Dados relevantes sobre ${cidade} (perfil econômico, condomínios, indústrias — o que for aplicável)
4. Como concorrentes posicionam esse serviço

Entregue um resumo estruturado com:
**Ângulo diferencial**: o que os concorrentes NÃO estão abordando bem
**FAQs reais**: 3-5 perguntas que o público genuinamente pesquisa
**Dados locais de ${cidade}**: qualquer dado específico útil (perfil industrial, número de condomínios, etc.)
**Termos semânticos (LSI)**: 5-8 termos relacionados para usar no texto
**Tom recomendado**: como escrever para esse público específico`
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
