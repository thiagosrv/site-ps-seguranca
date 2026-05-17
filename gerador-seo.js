const fs = require('fs');
const path = require('path');

const cidades = [
    "Valinhos",
    "Vinhedo",
    "Paulínia",
    "Sumaré",
    "Hortolândia",
    "Nova Odessa",
    "Itatiba",
    "Americana",
    "Indaiatuba",
    "Monte Mor",
    "Jaguariúna",
    "Santa Bárbara d'Oeste",
    "Morungaba",
    "Pedreira",
    "Artur Nogueira",
    "Cosmópolis",
    "Elias Fausto",
    "Louveira",
    "Holambra",
    "Limeira"
];

const servicos = [
    "Vigia",
    "Porteiro",
    "Portaria",
    "Segurança Patrimonial",
    "Rondas de Segurança",
    "Limpeza",
    "Zelador",
    "Copeira",
    "Rondas para Condomínio",
    "Portaria para Empresas",
    "Portaria para Condomínios"
];

// Helper para transformar string em slug (ex: "Portaria para Empresas" -> "portaria-para-empresas")
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Substitui espaços por hífen
        .replace(/[^\w\-]+/g, '')       // Remove caracteres não-alfanuméricos
        .replace(/\-\-+/g, '-')         // Remove hifens múltiplos
        .replace(/^-+/, '')             // Trim no começo
        .replace(/-+$/, '');            // Trim no final
}

function gerarPaginas() {
    const templatePath = path.join(__dirname, 'template.html');
    
    if (!fs.existsSync(templatePath)) {
        console.error("Erro: template.html não encontrado na pasta.");
        return;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');

    cidades.forEach(cidade => {
        const cidadeSlug = slugify(cidade);
        const cidadePath = path.join(__dirname, cidadeSlug);

        // Criar pasta da cidade, se não existir
        if (!fs.existsSync(cidadePath)) {
            fs.mkdirSync(cidadePath, { recursive: true });
        }

        // 1. Gerar página principal da Cidade (Home da cidade)
        gerarHTML(templateContent, cidade, "Segurança e Portaria", cidadePath, "../");

        // 2. Gerar páginas para cada Serviço na Cidade
        servicos.forEach(servico => {
            const servicoSlug = slugify(servico);
            
            // Vamos testar 3 intenções de busca como pedido:
            // /americana/{servico}
            // /americana/servicos-de-{servico}
            // 2. Páginas de Serviços Diretos (Ex: /americana/portaria)
            const slugsDeIntencao = [
                servicoSlug,
                `servicos-de-${servicoSlug}`,
                `empresa-de-${servicoSlug}`,
                `terceirizacao-de-${servicoSlug}`,
                `contratar-${servicoSlug}`,
                `${servicoSlug}-terceirizada`,
                `melhor-empresa-de-${servicoSlug}`,
                `orcamento-de-${servicoSlug}`
            ];

            slugsDeIntencao.forEach(slugIntencao => {
                const pastaDestino = path.join(cidadePath, slugIntencao);
                if (!fs.existsSync(pastaDestino)) {
                    fs.mkdirSync(pastaDestino, { recursive: true });
                }

                gerarHTML(templateContent, cidade, servico, pastaDestino, "../../");
            });
        });
    });

    console.log(`✅ Sucesso! Estrutura de SEO Programático gerada para ${cidades.length} cidades e ${servicos.length} serviços.`);
}

function gerarHTML(template, cidade, servico, destino, basePath) {
    let html = template;

    // Substituir variáveis
    html = html.replace(/\{\{base_path\}\}/g, basePath);
    html = html.replace(/\{\{cidade_capitalized\}\}/g, cidade);
    html = html.replace(/\{\{servico_capitalized\}\}/g, servico);

    // Calcular URL relativa
    const relativePath = destino.replace(__dirname, '').replace(/\\/g, '/');
    const domainUrl = `https://protecaoamericana.com.br${relativePath}`;
    html = html.replace(/\{\{dominio_url\}\}/g, domainUrl);

    // Ajuste de artigo (se é 'Limpeza', 'A', se é 'Porteiro', 'O' - simplificando)
    // Para um MVP, as variáveis diretas já criam as páginas.
    
    const outputPath = path.join(destino, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
}

gerarPaginas();
