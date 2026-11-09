const sharp = require('sharp');
const path = require('path');

async function createBannerWithText() {
  const sourceImage = path.join(__dirname, 'avatar.png');
  const bannerWidth = 1200;
  const bannerHeight = 480;

  // تحجيم لوجو الـ E
  const logoSize = 360;
  const resizedLogo = await sharp(sourceImage)
    .resize(logoSize, logoSize, { fit: 'inside' })
    .toBuffer();

  // تصميم بانر احترافي بـ SVG يتضمن خلفية داكنة، شبكة تقنية، إضاءات نيون، وتكست EvoDino
  const bannerSvg = `
    <svg width="${bannerWidth}" height="${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- تدرج الخلفية الرئيسي -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#05080d"/>
          <stop offset="50%" stop-color="#090f17"/>
          <stop offset="100%" stop-color="#05080e"/>
        </linearGradient>

        <!-- توهج سيان خلف الشعار -->
        <radialGradient id="cyanFlare" cx="30%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00ffe0" stop-opacity="0.45"/>
          <stop offset="40%" stop-color="#00887a" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#05080d" stop-opacity="0"/>
        </radialGradient>

        <!-- توهج النص -->
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="#cffffb"/>
          <stop offset="70%" stop-color="#00ffe0"/>
          <stop offset="100%" stop-color="#00a896"/>
        </linearGradient>

        <!-- ظل وتوهج النص -->
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#00ffe0" flood-opacity="0.9"/>
          <feDropShadow dx="0" dy="3" stdDeviation="14" flood-color="#009988" flood-opacity="0.6"/>
        </filter>

        <linearGradient id="subGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00ffe0"/>
          <stop offset="100%" stop-color="#70e2d6"/>
        </linearGradient>
      </defs>

      <!-- الخلفية -->
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>

      <!-- لمسات إضاءة خلفية -->
      <circle cx="340" cy="240" r="320" fill="url(#cyanFlare)"/>
      <ellipse cx="800" cy="240" rx="300" ry="120" fill="#00ffe0" fill-opacity="0.06"/>

      <!-- خطوط وزخرفة تقنية عصرية -->
      <line x1="560" y1="140" x2="1100" y2="140" stroke="#00ffe0" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="12 6"/>
      <line x1="560" y1="340" x2="1100" y2="340" stroke="#00ffe0" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="12 6"/>
      <polygon points="560,135 570,140 560,145" fill="#00ffe0" fill-opacity="0.8"/>
      <polygon points="1100,335 1090,340 1100,345" fill="#00ffe0" fill-opacity="0.8"/>

      <!-- النص الرئيسي EvoDino -->
      <text x="560" y="260"
            font-family="Impact, 'Arial Black', Montserrat, sans-serif"
            font-size="108"
            font-weight="900"
            letter-spacing="5"
            fill="url(#textGrad)"
            filter="url(#neonGlow)">EVODINO</text>

      <!-- العنوان الفرعي التوضيحي -->
      <text x="570" y="305"
            font-family="'Segoe UI', Roboto, sans-serif"
            font-size="22"
            font-weight="700"
            letter-spacing="9"
            fill="url(#subGrad)">OFFICIAL DISCORD BOT</text>
    </svg>
  `;

  const bannerPath = path.join(__dirname, 'evodino_banner.png');
  await sharp(Buffer.from(bannerSvg))
    .composite([
      {
        input: resizedLogo,
        top: Math.round((bannerHeight - logoSize) / 2),
        left: 140,
      },
    ])
    .png()
    .toFile(bannerPath);

  console.log('✅ تم تصميم وحفظ بانر EvoDino الجديد بنجاح في:', bannerPath);

  // نسخ البانر أيضاً إلى مجلد artifacts ليتمكن المستخدم من معاينته
  const artifactDir = 'C:\\Users\\KHALEEL\\.gemini\\antigravity\\brain\\827ac009-9025-4bec-9dc4-61f19bba49e7';
  const artifactBannerPath = path.join(artifactDir, 'evodino_banner.png');
  await sharp(bannerPath).toFile(artifactBannerPath);
  console.log('✅ تم نسخ البانر لمجلد المحادثة للمعاينة:', artifactBannerPath);
}

createBannerWithText().catch(console.error);
