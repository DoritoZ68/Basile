/**
 * Génère les captures App Store (iPhone 6,9", 1290 × 2796) à partir de la version web de l'app.
 *
 *   npx expo export --platform web
 *   node store/generate-screenshots.cjs
 *
 * Nécessite Playwright (`npm install -g playwright && npx playwright install chromium`).
 * La barre d'état iOS est redessinée ; la barre d'onglets est celle de la version web, une
 * capsule de verre flottante comme celle d'iOS 26.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execSync } = require('node:child_process');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8765;
const W = 1290;
const H = 2796;
const SCREEN = { width: 430, height: 932 }; // points iOS de l'iPhone 6,9"
const STATUS_BAR = 54; // hauteur de la barre d'état, en points

const SHOTS = [
  {
    file: '01-tronc.png',
    title: 'Fais pousser<br>ton tronc.',
    subtitle: 'Chaque séance de révision ajoute un cerne.',
    tab: 0,
    scheme: 'light',
  },
  {
    file: '02-seance.png',
    title: 'Concentre-toi.',
    subtitle: 'Le cerne se dessine pendant que tu révises.',
    tab: 0,
    scheme: 'dark',
    timer: { kind: 'focus', subjectId: 'histoire', minutesAgo: 6.3, durationMin: 25 },
  },
  {
    file: '03-cerne.png',
    title: 'Un cerne de plus.',
    subtitle: 'Et une pause bien méritée entre deux séances.',
    tab: 0,
    scheme: 'light',
    timer: { kind: 'focus', subjectId: 'physique', minutesAgo: 26, durationMin: 25 },
  },
  {
    file: '04-semaine.png',
    title: 'Ta semaine en rondelles.',
    subtitle: 'Vois tes efforts prendre forme, jour après jour.',
    tab: 3,
    scheme: 'light',
  },
  {
    file: '05-examens.png',
    title: 'Jusqu’au jour J.',
    subtitle: 'Le compte à rebours de tous tes examens.',
    tab: 2,
    scheme: 'light',
  },
  {
    file: '06-matieres.png',
    title: 'Chaque matière compte.',
    subtitle: 'Un objectif par semaine, une couleur par matière.',
    tab: 1,
    scheme: 'light',
  },
];
const TABS = ['Focus', 'Matières', 'Examens', 'Stats'];

/** Capture brute de l'écran d'achat, demandée par Apple pour vérifier l'achat intégré. */
const IAP_REVIEW = { file: 'achat-integre-verification.png', scheme: 'light', tab: 0, pro: false };

/** Données de démonstration, générées dans le navigateur à partir de l'heure courante. */
function seed({ timer, pro }) {
  const day = 86400000;
  const now = Date.now();
  const midnight = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const at = (daysAgo, hour) => midnight - daysAgo * day + hour * 3600000;
  const subjects = [
    { id: 'maths', name: 'Maths', color: '#5B7FA6', weeklyGoalMin: 240 },
    { id: 'francais', name: 'Français', color: '#C07A4F', weeklyGoalMin: 180 },
    { id: 'anglais', name: 'Anglais', color: '#6E9A78', weeklyGoalMin: 120 },
    { id: 'histoire', name: 'Histoire-géo', color: '#9A7BB0', weeklyGoalMin: 150 },
    { id: 'physique', name: 'Physique-chimie', color: '#C9A24D', weeklyGoalMin: 180 },
  ];
  const plan = [
    // [jours en arrière, heure, matière, minutes]
    [0, 9, 'anglais', 25], [0, 10, 'maths', 45],
    [1, 9, 'francais', 45], [1, 14, 'histoire', 25], [1, 16, 'maths', 25], [1, 18, 'anglais', 15],
    [2, 17, 'maths', 45], [2, 18, 'physique', 25],
    [3, 17, 'francais', 25], [3, 18, 'anglais', 25], [3, 19, 'maths', 45],
    [4, 18, 'histoire', 45],
    [5, 10, 'physique', 25], [5, 14, 'maths', 60], [5, 16, 'francais', 25],
    [6, 15, 'anglais', 25], [6, 16, 'maths', 25],
    [7, 10, 'francais', 45], [8, 18, 'maths', 25], [9, 17, 'histoire', 25],
  ];
  const sessions = plan
    .filter(([d, h]) => at(d, h) < now)
    .map(([d, h, subjectId, durationMin], i) => ({
      id: `s${i}`, subjectId, startedAt: at(d, h), durationMin,
    }));
  const date = (days) => {
    const today = new Date(midnight);
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const data = {
    subjects,
    sessions,
    exams: [
      { id: 'e1', name: 'Bac de français', date: date(12) },
      { id: 'e2', name: 'Partiel de maths', date: date(30) },
      { id: 'e3', name: 'Oral d’anglais', date: date(41) },
    ],
    activeTimer: timer
      ? { kind: timer.kind, subjectId: timer.subjectId, startedAt: now - timer.minutesAgo * 60000, durationMin: timer.durationMin }
      : null,
    settings: { dailyGoalMin: 120, focusMin: 25 },
  };
  localStorage.setItem('bucheur:v1', JSON.stringify(data));
  localStorage.setItem('bucheur:pro', pro ? '1' : '0');
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' };
  return http
    .createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const candidates = [url, `${url}.html`, path.join(url, 'index.html')].map((p) => path.join(DIST, p));
      const file = candidates.find((p) => p.startsWith(DIST) && fs.existsSync(p) && fs.statSync(p).isFile());
      if (!file) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT);
}

async function captureScreen(browser, shot) {
  const ctx = await browser.newContext({
    viewport: { width: SCREEN.width, height: SCREEN.height - STATUS_BAR },
    deviceScaleFactor: 3,
    colorScheme: shot.scheme,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(seed, { timer: shot.timer ?? null, pro: shot.pro ?? true });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(1500);
  if (shot === IAP_REVIEW) {
    await page.getByText('90 · Pro').click();
    await page.waitForTimeout(900);
    // Le web n'a pas de boutique : on affiche l'état « disponible », tel qu'il apparaît sur iPhone.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('div')) {
        if (el.textContent === 'La boutique n’est pas disponible pour le moment.')
          el.textContent = 'Paiement unique avec ton identifiant Apple. Pas d’abonnement.';
      }
      const label = [...document.querySelectorAll('div')]
        .filter((el) => el.textContent.startsWith('Débloquer pour'))
        .at(-1);
      for (let el = label; el; el = el.parentElement) {
        if (getComputedStyle(el).opacity !== '1') {
          el.style.opacity = '1';
          break;
        }
      }
    });
    const png = await page.screenshot();
    await ctx.close();
    return png;
  }
  if (shot.tab > 0) {
    await page.getByText(TABS[shot.tab], { exact: true }).first().click();
    await page.waitForTimeout(800);
  }
  const png = await page.screenshot();
  await ctx.close();
  return png;
}

function frameHtml(shot, screenPng) {
  const dark = shot.scheme === 'dark';
  const c = dark
    ? { bg: '#111312', text: '#ECEBE7', sub: '#97958F', screenBg: '#111312', bar: 'rgba(36,40,39,0.86)', accent: '#8FBFA8', inactive: '#97958F', status: '#ECEBE7' }
    : { bg: '#EFEBE3', text: '#1F2328', sub: '#6E6A64', screenBg: '#F7F6F3', bar: 'rgba(255,255,255,0.88)', accent: '#3E6B5A', inactive: '#77736C', status: '#1F2328' };
  const font = (f) => `url("data:font/ttf;base64,${fs.readFileSync(path.join(ROOT, 'node_modules/@expo-google-fonts/fraunces', f)).toString('base64')}")`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Fraunces; font-weight: 600; src: ${font('600SemiBold/Fraunces_600SemiBold.ttf')}; }
    @font-face { font-family: Fraunces; font-style: italic; src: ${font('400Regular_Italic/Fraunces_400Regular_Italic.ttf')}; }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: ${c.bg}; overflow: hidden; font-family: Inter, 'SF Pro Text', system-ui, sans-serif; }
    .head { position: absolute; top: 170px; left: 0; right: 0; text-align: center; padding: 0 90px; }
    h1 { font-family: Fraunces; font-weight: 600; font-size: 112px; line-height: 1.08; color: ${c.text}; letter-spacing: -1px; }
    p { margin-top: 34px; font-size: 50px; line-height: 1.3; color: ${c.sub}; }
    .phone { position: absolute; left: 50%; top: 620px; width: 1010px; height: 2170px; transform: translateX(-50%);
      background: #1A1C1E; border-radius: 150px; padding: 22px; box-shadow: 0 60px 120px rgba(0,0,0,${dark ? 0.5 : 0.18}); }
    .screen { position: relative; width: 966px; height: 2094px; border-radius: 128px; overflow: hidden; background: ${c.screenBg}; }
    .screen img { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: calc(100% - ${STATUS_BAR * 2.247}px); }
    .status-bg { position: absolute; top: 0; left: 0; width: 100%; height: ${STATUS_BAR * 2.247 + 1}px; }
    .status { position: absolute; top: 0; left: 0; right: 0; height: 120px;
      display: flex; align-items: center; justify-content: space-between; padding: 22px 92px 0 112px; color: ${c.status}; font-weight: 600; font-size: 38px; }
    .island { position: absolute; top: 26px; left: 50%; transform: translateX(-50%); width: 280px; height: 82px; background: #000; border-radius: 41px; }
    .icons { display: flex; gap: 14px; align-items: center; }
    .home { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); width: 320px; height: 12px; border-radius: 6px; background: ${c.status}; opacity: 0.9; }
  </style></head><body>
    <div class="head"><h1>${shot.title}</h1><p>${shot.subtitle}</p></div>
    <div class="phone"><div class="screen">
      <img id="shot" src="data:image/png;base64,${screenPng.toString('base64')}">
      <canvas class="status-bg" id="status-bg" width="966" height="${Math.round(STATUS_BAR * 2.247) + 1}"></canvas>
      <div class="status"><span>9:41</span><div class="icons">
        <svg width="52" height="32" viewBox="0 0 52 32"><g fill="${c.status}"><rect x="0" y="20" width="9" height="12" rx="2"/><rect x="14" y="14" width="9" height="18" rx="2"/><rect x="28" y="7" width="9" height="25" rx="2"/><rect x="42" y="0" width="9" height="32" rx="2"/></g></svg>
        <svg width="46" height="34" viewBox="0 0 24 18"><path d="M12 17.5 15.2 13.6a4.8 4.8 0 0 0-6.4 0Zm-6-7.2 1.9 2.3a6.4 6.4 0 0 1 8.2 0l1.9-2.3a9.4 9.4 0 0 0-12 0ZM1.9 5.4l1.9 2.3a12.8 12.8 0 0 1 16.4 0l1.9-2.3a15.8 15.8 0 0 0-20.2 0Z" fill="${c.status}"/></svg>
        <svg width="74" height="34" viewBox="0 0 74 34"><rect x="1.5" y="1.5" width="62" height="31" rx="9" fill="none" stroke="${c.status}" stroke-opacity="0.4" stroke-width="3"/><rect x="7" y="7" width="45" height="20" rx="5" fill="${c.status}"/><rect x="67" y="11" width="5" height="12" rx="2.5" fill="${c.status}" fill-opacity="0.4"/></svg>
      </div></div>
      <div class="island"></div>
      <div class="home"></div>
    </div></div>
    <script>
      // Prolonge la première ligne de l'écran sous la barre d'état, pour un fond continu.
      const img = document.getElementById('shot');
      const draw = () => {
        const c = document.getElementById('status-bg');
        c.getContext('2d').drawImage(img, 0, 0, img.naturalWidth, 1, 0, 0, c.width, c.height);
      };
      img.complete ? draw() : img.addEventListener('load', draw);
    </script>
  </body></html>`;
}

(async () => {
  if (!fs.existsSync(DIST)) throw new Error('Lance d’abord : npx expo export --platform web');
  fs.mkdirSync(OUT, { recursive: true });
  const server = serve();
  const browser = await chromium.launch();
  try {
    for (const shot of SHOTS) {
      const screen = await captureScreen(browser, shot);
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      await page.setContent(frameHtml(shot, screen), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(OUT, shot.file) });
      await page.close();
      console.log(`✓ ${shot.file}`);
    }
    fs.writeFileSync(path.join(OUT, IAP_REVIEW.file), await captureScreen(browser, IAP_REVIEW));
    console.log(`✓ ${IAP_REVIEW.file}`);
  } finally {
    await browser.close();
    server.close();
  }
})();
