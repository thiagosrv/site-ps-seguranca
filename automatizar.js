// ═══════════════════════════════════════════════════════════
// automatizar.js — Orquestrador diário: 1 blog + 2 SEO + git push
// Uso: node automatizar.js
// Agendado pelo Windows Task Scheduler para rodar às 8h todo dia
// ═══════════════════════════════════════════════════════════

process.env.NO_AUTO_PUSH = '1'; // impede que novo-post.js faça push próprio

const { execSync } = require('child_process');
const { main: gerarBlog }            = require('./novo-post');
const { gerarPaginasSEO }            = require('./gerar-seo-diario');
const { atualizarPostMaisAntigo }    = require('./atualizar-posts');
const { atualizarBanco }             = require('./agente-conhecimento');

function linha() { console.log('─'.repeat(50)); }

function gitPush() {
    const data = new Date().toISOString().split('T')[0];
    try {
        execSync(
            `git add -A && git commit -m "auto(${data}): blog + seo programático" && git push origin main`,
            { cwd: __dirname, stdio: 'inherit' }
        );
        console.log('\n✅ Deploy iniciado no Vercel!\n');
    } catch(e) {
        // commit pode falhar se não houver mudanças (exit code 1 no git commit)
        if (e.message && e.message.includes('nothing to commit')) {
            console.log('ℹ️  Nada novo para commitar.');
        } else {
            console.warn('\n⚠️  Git push falhou — execute manualmente:', e.message);
        }
    }
}

async function main() {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log('\n🤖 Automação Diária — PS Proteção');
    console.log(`   ${agora}`);
    linha();

    // ── Etapa 1: Blog Post ──────────────────────────────────
    console.log('\n📰 [1/3] Gerando blog post...\n');
    try {
        await gerarBlog();
    } catch(e) {
        console.error('❌ Blog falhou:', e.message);
    }

    linha();

    // ── Etapa 2: Páginas SEO ────────────────────────────────
    console.log('\n🔍 [2/3] Gerando páginas SEO...\n');
    try {
        await gerarPaginasSEO();
    } catch(e) {
        console.error('❌ SEO falhou:', e.message);
    }

    linha();

    // ── Etapa 3: Banco de conhecimento (todo domingo) ───────
    const diaSemana = new Date().getDay(); // 0=dom, 1=seg, 4=qui
    if (diaSemana === 0) {
        console.log('\n📚 [3/5] Atualizando banco de conhecimento...\n');
        try {
            await atualizarBanco();
        } catch(e) {
            console.error('❌ Banco de conhecimento falhou:', e.message);
        }
        linha();
    }

    // ── Etapa 4: Atualização de post antigo (toda segunda e quinta) ──
    if (diaSemana === 1 || diaSemana === 4) {
        console.log('\n🔄 [3/4] Atualizando post antigo...\n');
        try {
            await atualizarPostMaisAntigo();
        } catch(e) {
            console.error('❌ Atualização falhou:', e.message);
        }
        linha();
    }

    // ── Etapa 5: Git Push único ─────────────────────────────
    console.log('\n📤 [5/5] Publicando no GitHub/Vercel...\n');
    gitPush();

    linha();
    console.log('✅ Automação concluída.\n');
}

main().catch(err => {
    console.error('\n❌ Erro fatal:', err.message);
    process.exit(1);
});
