const fs = require('fs');
const path = require('path');

const domain = 'https://protecaoamericana.com.br';

const cidades = [
    "Americana","Artur Nogueira","Cosmópolis","Elias Fausto","Holambra",
    "Hortolândia","Indaiatuba","Itatiba","Jaguariúna","Limeira","Louveira",
    "Monte Mor","Morungaba","Nova Odessa","Paulínia","Pedreira",
    "Santa Bárbara d'Oeste","Sumaré","Valinhos","Vinhedo","Araras",
    "Rio Claro","Tupi","São Pedro","Águas de São Pedro","Pirassununga",
    "São Carlos","Bauru","Brotas","Itirapina","Jaú"
];

const servicos = [
    "Vigia","Porteiro","Portaria","Segurança Patrimonial","Rondas de Segurança",
    "Limpeza","Zelador","Copeira","Rondas para Condomínio",
    "Portaria para Empresas","Portaria para Condomínios"
];

function slugify(text) {
    return text.toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/['"]/g, '-')
        .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

const slugsDeIntencao = s => {
    const sl = slugify(s);
    return [
        sl,
        `servicos-de-${sl}`,
        `empresa-de-${sl}`,
        `terceirizacao-de-${sl}`,
        `contratar-${sl}`,
        `${sl}-terceirizada`,
        `melhor-empresa-de-${sl}`,
        `orcamento-de-${sl}`
    ];
};

const today = new Date().toISOString().split('T')[0];
const urls = [];

// Homepage raiz
urls.push({ loc: `${domain}/`, priority: '1.0', changefreq: 'monthly' });

// Página principal de cada cidade
cidades.forEach(cidade => {
    const cidadeSlug = slugify(cidade);
    urls.push({ loc: `${domain}/${cidadeSlug}/`, priority: '0.8', changefreq: 'monthly' });

    // Páginas de serviço por cidade
    servicos.forEach(servico => {
        slugsDeIntencao(servico).forEach(slugIntencao => {
            urls.push({
                loc: `${domain}/${cidadeSlug}/${slugIntencao}/`,
                priority: '0.6',
                changefreq: 'monthly'
            });
        });
    });
});

// Gerar XML
const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`),
    '</urlset>'
];

const output = xmlLines.join('\n');
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), output, 'utf8');

console.log(`✅ sitemap.xml gerado com ${urls.length} URLs`);
console.log(`   Homepage: 1`);
console.log(`   Páginas de cidade: ${cidades.length}`);
console.log(`   Páginas de serviço: ${cidades.length * servicos.length * 8}`);
