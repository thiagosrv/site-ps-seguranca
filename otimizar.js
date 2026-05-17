const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const dir = __dirname;

const images = [
    { src: 'herosection2.png',  dest: 'herosection2.webp',  width: 1200 },
    { src: 'herosection.png',   dest: 'herosection.webp',   width: 1200 },
    { src: 'fachada.png',       dest: 'fachada.webp',       width: 800  },
    { src: 'fundador.png',      dest: 'fundador.webp',      width: 600  },
    { src: 'logoprotecao.png',  dest: 'logoprotecao.webp',  width: 300  },
];

(async () => {
    for (const img of images) {
        const srcPath = path.join(dir, img.src);
        const destPath = path.join(dir, img.dest);
        if (!fs.existsSync(srcPath)) { console.warn(`Skipping ${img.src} (not found)`); continue; }
        const before = fs.statSync(srcPath).size;
        await sharp(srcPath)
            .resize(img.width, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(destPath);
        const after = fs.statSync(destPath).size;
        console.log(`✅ ${img.src} → ${img.dest}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB (−${Math.round((1-after/before)*100)}%)`);
    }
    console.log('\n🎉 Otimização de imagens concluída!');
})();
