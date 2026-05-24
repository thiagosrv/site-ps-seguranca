// ═══════════════════════════════════════════════════════════
// agente-conhecimento.js — Banco de conhecimento por serviço
//
// Roda uma vez por semana (domingo) via automatizar.js.
// Pesquisa profundamente UM serviço por execução e salva
// um JSON estruturado em banco-conhecimento/{servico}.json.
//
// O projeto LinkedIn (e outros) lê esses arquivos diretamente
// sem gastar API — conhecimento atualizado, custo único.
//
// Estrutura do banco:
//   banco-conhecimento/
//     portaria.json
//     seguranca-patrimonial.json
//     limpeza.json
//     ...
// ═══════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');
const fs   = require('fs');
const path = require('path');

const BANCO_DIR  = path.join(__dirname, 'banco-conhecimento');
const TTL_DIAS   = 7; // atualiza a cada 7 dias por serviço

// Serviços em ordem de rotação semanal
const SERVICOS_ROTACAO = [
    'Portaria',
    'Segurança Patrimonial',
    'Portaria para Condomínios',
    'Rondas de Segurança',
    'Limpeza',
    'Vigia',
    'Zelador',
    'Copeira',
    'Portaria para Empresas',
    'Porteiro',
    'Rondas para Condomínio',
];

function slugify(text) {
    return text.toString()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function arquivoBanco(servico) {
    return path.join(BANCO_DIR, `${slugify(servico)}.json`);
}

function precisaAtualizar(servico) {
    const arquivo = arquivoBanco(servico);
    if (!fs.existsSync(arquivo)) return true;
    try {
        const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
        const idade = (Date.now() - new Date(dados.updatedAt).getTime()) / 86400000;
        return idade >= TTL_DIAS;
    } catch { return true; }
}

// Escolhe qual serviço pesquisar essa semana (rotação circular)
function escolherServico() {
    if (!fs.existsSync(BANCO_DIR)) return SERVICOS_ROTACAO[0];

    // Pega o serviço com atualização mais antiga (ou nunca atualizado)
    const comIdade = SERVICOS_ROTACAO.map(s => {
        const arquivo = arquivoBanco(s);
        if (!fs.existsSync(arquivo)) return { servico: s, idade: 9999 };
        try {
            const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
            const idade = (Date.now() - new Date(dados.updatedAt).getTime()) / 86400000;
            return { servico: s, idade };
        } catch { return { servico: s, idade: 9999 }; }
    });

    comIdade.sort((a, b) => b.idade - a.idade);
    return comIdade[0].servico;
}

async function pesquisarConhecimento(servico) {
    console.log(`\n📚 Pesquisando banco de conhecimento: "${servico}"...`);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY não definida.');
    const client = new Anthropic({ apiKey: key });

    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
            role: 'user',
            content: `Você é um analista sênior do setor de segurança privada, portaria e facilities no Brasil.

Pesquise profundamente sobre "${servico}" no contexto brasileiro, com foco em:
1. Tendências de mercado dos últimos 12 meses
2. Dados e estatísticas do setor (ABESE, Fenavist, IBGE, sindicatos)
3. Mudanças regulatórias recentes (legislação, NRs, convenções coletivas)
4. Casos de uso e transformações no setor (tecnologia, portaria remota, automação)
5. Dores reais dos contratantes (síndicos, gestores, RH) — encontre em fóruns, Reclame Aqui, grupos
6. Tendências para os próximos 12 meses — o que especialistas estão dizendo
7. Diferenciais que empresas sérias oferecem vs. empresas amadoras

Após pesquisar, entregue um JSON estruturado (APENAS JSON válido, sem markdown).
IMPORTANTE: seja conciso em cada campo — máximo 2 frases por descrição.

{
  "servico": "${servico}",
  "resumo_executivo": "2 frases sobre o momento atual do setor",
  "tendencias": [
    { "titulo": "nome curto", "descricao": "max 2 frases", "fonte": "nome", "url": "url" }
  ],
  "dados_mercado": [
    { "dado": "estatística concreta", "fonte": "nome", "url": "url", "ano": "2024 ou 2025" }
  ],
  "regulatorio": [
    { "norma": "nome da lei/NR", "resumo": "max 2 frases", "url": "link" }
  ],
  "dores_contratantes": [
    { "dor": "problema real em 1 frase", "contexto": "quem sente", "frequencia": "muito comum / comum" }
  ],
  "diferenciais_setor": [
    { "diferencial": "1 frase", "descricao": "1 frase" }
  ],
  "angulos_linkedin": [
    { "titulo": "título do post", "angulo": "opinião / dado / tendência / provocação", "gancho": "primeira frase impactante" }
  ],
  "angulos_blog_autoridade": [
    { "titulo": "título do artigo", "tipo": "guia / análise / previsão", "diferencial": "1 frase" }
  ],
  "termos_especializados": ["termo1", "termo2", "termo3", "termo4", "termo5"],
  "updatedAt": "${new Date().toISOString()}"
}

Limite: máximo 5 itens por array. Priorize qualidade sobre quantidade.`
        }],
    });

    // Extrai o JSON da resposta
    let textoResposta = '';
    for (const block of response.content) {
        if (block.type === 'text') textoResposta += block.text;
    }

    // Tenta parsear o JSON retornado
    let dados;
    try {
        const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
        const jsonStr   = jsonMatch ? jsonMatch[0] : textoResposta;
        dados = JSON.parse(jsonStr);
    } catch(e) {
        // Fallback: tenta recuperar JSON truncado fechando colchetes/chaves pendentes
        try {
            const jsonMatch = textoResposta.match(/\{[\s\S]*/);
            if (!jsonMatch) throw new Error('Sem JSON na resposta');
            let jsonStr = jsonMatch[0];
            // Fecha arrays e objetos abertos
            const abre = (jsonStr.match(/\[/g) || []).length;
            const fecha = (jsonStr.match(/\]/g) || []).length;
            const abreObj = (jsonStr.match(/\{/g) || []).length;
            const fechaObj = (jsonStr.match(/\}/g) || []).length;
            // Remove trailing vírgulas e fecha estrutura
            jsonStr = jsonStr.replace(/,\s*$/, '');
            jsonStr += ']'.repeat(Math.max(0, abre - fecha));
            jsonStr += '}'.repeat(Math.max(0, abreObj - fechaObj));
            dados = JSON.parse(jsonStr);
            console.log('   ⚠️  JSON recuperado após truncamento');
        } catch(e2) {
            throw new Error(`Claude não retornou JSON válido: ${e.message}`);
        }
    }

    // Garante o campo updatedAt
    dados.updatedAt = new Date().toISOString();
    dados.servico   = servico;

    // Salva no banco
    if (!fs.existsSync(BANCO_DIR)) fs.mkdirSync(BANCO_DIR, { recursive: true });
    fs.writeFileSync(arquivoBanco(servico), JSON.stringify(dados, null, 2), 'utf8');

    console.log(`   ✅ Banco atualizado: banco-conhecimento/${slugify(servico)}.json`);
    console.log(`   📊 ${dados.tendencias?.length || 0} tendências | ${dados.dados_mercado?.length || 0} dados | ${dados.angulos_linkedin?.length || 0} ângulos LinkedIn`);

    return dados;
}

// ─── API pública ─────────────────────────────────────────

// Roda a atualização semanal (chama do automatizar.js)
async function atualizarBanco() {
    const servico = escolherServico();

    if (!precisaAtualizar(servico)) {
        console.log(`\n📚 Banco de conhecimento: "${servico}" ainda válido — próxima atualização em breve.`);
        return null;
    }

    return await pesquisarConhecimento(servico);
}

// Lê o banco de um serviço (para o projeto LinkedIn e outros)
function lerConhecimento(servico) {
    const arquivo = arquivoBanco(servico);
    if (!fs.existsSync(arquivo)) return null;
    try {
        return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    } catch { return null; }
}

// Lista todos os serviços com status de atualização
function statusBanco() {
    return SERVICOS_ROTACAO.map(s => {
        const arquivo = arquivoBanco(s);
        if (!fs.existsSync(arquivo)) {
            return { servico: s, status: 'nunca pesquisado', diasAtras: null };
        }
        try {
            const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
            const diasAtras = Math.floor(
                (Date.now() - new Date(dados.updatedAt).getTime()) / 86400000
            );
            return {
                servico: s,
                status: diasAtras >= TTL_DIAS ? 'expirado' : 'válido',
                diasAtras,
                tendencias: dados.tendencias?.length || 0,
                angulosLinkedIn: dados.angulos_linkedin?.length || 0,
            };
        } catch {
            return { servico: s, status: 'corrompido', diasAtras: null };
        }
    });
}

module.exports = { atualizarBanco, lerConhecimento, statusBanco, BANCO_DIR };

// Teste: node agente-conhecimento.js [servico opcional]
if (require.main === module) {
    (async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('❌ ANTHROPIC_API_KEY não definida.');
            process.exit(1);
        }

        // Permite passar serviço específico: node agente-conhecimento.js "Portaria"
        const servicoForced = process.argv[2];

        if (servicoForced) {
            await pesquisarConhecimento(servicoForced);
        } else {
            await atualizarBanco();
        }

        console.log('\n══════ STATUS DO BANCO ══════');
        statusBanco().forEach(s => {
            const icone = s.status === 'válido' ? '✅' : s.status === 'expirado' ? '⚠️ ' : '❌';
            const info  = s.diasAtras !== null
                ? `${s.diasAtras}d atrás — ${s.tendencias} tendências, ${s.angulosLinkedIn} ângulos LinkedIn`
                : 'sem dados';
            console.log(`  ${icone} ${s.servico.padEnd(30)} ${info}`);
        });
    })().catch(err => {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    });
}
