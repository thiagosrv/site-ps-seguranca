// ═══════════════════════════════════════════════════════════
// atualizar-posts.js — Atualiza o post publicado mais antigo
//
// Roda uma vez por semana (chamado pelo automatizar.js).
// Pega o post que não é atualizado há mais tempo, refaz a
// pesquisa com o agente Claude e regera o HTML com dados frescos.
// Atualiza o dateModified no posts.json.
// ═══════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { pesquisarContexto, agenteDisponivel } = require('./agente-pesquisa');
const { getLinkagensInternas, formatarParaPrompt } = require('./linkagem-interna');

const CONFIG = {
    openaiKey:  process.env.OPENAI_API_KEY || '',
    model:      'gpt-4o',
    domain:     'https://protecaoamericana.com.br',
    whatsapp:   'https://wa.me/5519978210246',
    postsFile:  path.join(__dirname, 'blog', 'posts.json'),
    blogDir:    path.join(__dirname, 'blog'),
    // Só atualiza posts com mais de X dias desde a última atualização
    minDiasDesdeAtualizacao: 30,
};

function slugify(text) {
    return text.toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"?!:,]/g, '')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function today() {
    return new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function todayISO() { return new Date().toISOString().split('T')[0]; }

function diasDesde(isoDate) {
    if (!isoDate) return 9999;
    return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
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

function buildUpdatePrompt(post, contextoAgente, linksInternos) {
    const blocoContexto = contextoAgente
        ? `\n\nCONTEXTO DE PESQUISA ATUALIZADO — USE OBRIGATORIAMENTE:\n${contextoAgente}\n\nREGRAS PARA O CONTEXTO:\n- Cite fontes autoritativas com links externos: <a href="URL" target="_blank" rel="noopener noreferrer">âncora</a>\n- Mencione dados e estatísticas com atribuição à fonte\n- Referencie legislação pelo nome correto\n- Use as FAQs reais coletadas\n- Incorpore termos LSI naturalmente\n`
        : '';

    const blocoLinks = linksInternos
        ? `\n\n${linksInternos}\n`
        : '';

    return `Você é um redator SEO especialista em segurança privada, portaria e facilities no Brasil.

TAREFA: Reescrever e ATUALIZAR um artigo de blog já publicado, incorporando dados mais recentes e novas referências.${blocoContexto}${blocoLinks}

ARTIGO ORIGINAL:
- Título atual: "${post.title}"
- Keyword primária: "${post.keyword || post.title}"
- Serviço: ${post.servico}
- Cidade: ${post.cidade}
- Tipo: ${post.tipo}
- Publicado em: ${post.dateISO}

INSTRUÇÕES:
- Mantenha o slug original: "${post.slug}"
- Artigo com 1.400 a 1.600 palavras
- Tom: especialista confiável, direto, sem exageros comerciais
- NUNCA mencione valores em R$ — redirecione para orçamento personalizado
- Cite fontes autoritativas com links externos quando disponível
- Mencione legislação aplicável pelo nome correto
- Use listas em pelo menos 2 seções, H3 dentro das seções quando fizer sentido
- FAQ com 3-4 perguntas genuínas do público
- Use os links internos listados acima como âncoras contextuais (3-5 deles)
- CTA para WhatsApp na conclusão: ${CONFIG.whatsapp}

RETORNE APENAS JSON válido (mesma estrutura do original):
{
  "title": "título H1 atualizado com keyword (até 65 chars)",
  "meta_description": "meta description com keyword (até 155 chars)",
  "slug": "${post.slug}",
  "tags": ["tag1","tag2","tag3","tag4"],
  "reading_time": "X min de leitura",
  "intro": "parágrafo introdutório 150-200 words",
  "sections": [
    { "h2": "Título", "content": "HTML puro", "has_list": true }
  ],
  "faq": [
    { "question": "Pergunta?", "answer": "Resposta 80-120 words" }
  ],
  "conclusion": "conclusão com CTA em HTML"
}`;
}

// Reutiliza o buildPostHTML do novo-post para consistência
function buildPostHTML(data, post, avaliacoes) {
    const { buildPostHTMLExport } = require('./novo-post-html');
    return buildPostHTMLExport(data, {
        servico: post.servico,
        cidade:  post.cidade,
        keyword: post.keyword || post.slug,
    }, post.slug, avaliacoes);
}

async function atualizarPostMaisAntigo() {
    console.log('\n🔄 Verificando posts para atualizar...');

    if (!fs.existsSync(CONFIG.postsFile)) {
        console.log('   ℹ️  Nenhum post publicado ainda.');
        return;
    }

    const posts = JSON.parse(fs.readFileSync(CONFIG.postsFile, 'utf8'));
    if (!posts.length) {
        console.log('   ℹ️  Nenhum post publicado ainda.');
        return;
    }

    // Escolhe o post mais antigo sem atualização recente
    const candidatos = posts
        .filter(p => diasDesde(p.dateUpdated || p.dateISO) >= CONFIG.minDiasDesdeAtualizacao)
        .sort((a, b) => {
            const dA = diasDesde(a.dateUpdated || a.dateISO);
            const dB = diasDesde(b.dateUpdated || b.dateISO);
            return dB - dA; // mais antigo primeiro
        });

    if (!candidatos.length) {
        console.log(`   ✅ Todos os posts foram atualizados nos últimos ${CONFIG.minDiasDesdeAtualizacao} dias.`);
        return;
    }

    const post = candidatos[0];
    const diasAntigo = diasDesde(post.dateUpdated || post.dateISO);
    console.log(`   📝 Atualizando: "${post.title}" (${diasAntigo} dias sem revisão)`);

    // Pesquisa com agente Claude
    let contextoAgente = '';
    if (agenteDisponivel()) {
        try {
            const resultado = await pesquisarContexto({
                keyword: post.keyword || post.title,
                cidade:  post.cidade,
                servico: post.servico,
                tipo:    post.tipo,
            });
            contextoAgente = resultado.contexto;
        } catch(e) {
            console.warn('   ⚠️  Pesquisa Claude falhou:', e.message);
        }
    }

    // Links internos
    const links = getLinkagensInternas({ cidade: post.cidade, servico: post.servico, slugAtual: post.slug });
    const linksTexto = formatarParaPrompt(links);

    // Re-gera o conteúdo
    console.log('   ⏳ Chamando GPT-4o para reescrever...');
    const data = await callGPT(buildUpdatePrompt(post, contextoAgente, linksTexto));

    // Lê avaliações
    const avaliacoesFile = path.join(__dirname, 'avaliacoes.json');
    const avaliacoes = fs.existsSync(avaliacoesFile)
        ? JSON.parse(fs.readFileSync(avaliacoesFile, 'utf8'))
        : null;

    // Reconstrói o HTML usando a função do novo-post.js
    const novoPostModule = require('./novo-post');
    const html = novoPostModule.buildPostHTMLExport(data, {
        servico: post.servico,
        cidade:  post.cidade,
    }, post.slug, avaliacoes);

    const postDir = path.join(CONFIG.blogDir, post.slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), html, 'utf8');

    // Atualiza posts.json
    const idx = posts.findIndex(p => p.slug === post.slug);
    posts[idx] = {
        ...posts[idx],
        title:            data.title,
        meta_description: data.meta_description,
        tags:             data.tags || posts[idx].tags,
        dateUpdated:      todayISO(),
    };
    fs.writeFileSync(CONFIG.postsFile, JSON.stringify(posts, null, 2), 'utf8');

    console.log(`   ✅ Post atualizado: blog/${post.slug}/index.html`);
    return post.slug;
}

module.exports = { atualizarPostMaisAntigo };

if (require.main === module) {
    atualizarPostMaisAntigo().catch(err => {
        console.error('\n❌ Erro:', err.message);
        process.exit(1);
    });
}
