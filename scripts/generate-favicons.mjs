import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Source logo
const sourceLogo = path.join(projectRoot, 'assets/logo/logo-final.png');

// Output paths
const outputs = [
    { file: 'favicon.ico', size: 32, format: 'png' }, // ICO will be generated as PNG for simplicity
    { file: 'favicon-16x16.png', size: 16, format: 'png' },
    { file: 'favicon-32x32.png', size: 32, format: 'png' },
    { file: 'apple-touch-icon.png', size: 180, format: 'png' }
];

async function generateFavicons() {
    console.log('🎨 Generating favicons from logo...\n');

    // Check if source exists
    if (!fs.existsSync(sourceLogo)) {
        console.error(`❌ Source logo not found: ${sourceLogo}`);
        process.exit(1);
    }

    for (const output of outputs) {
        const outputPath = path.join(projectRoot, output.file);

        try {
            await sharp(sourceLogo)
                .resize(output.size, output.size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Created: ${output.file} (${output.size}x${output.size})`);
        } catch (error) {
            console.error(`❌ Failed to create ${output.file}:`, error.message);
        }
    }

    console.log('\n🎉 Favicon generation complete!');
}

generateFavicons();
