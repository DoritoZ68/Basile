# Dépendances embarquées dans la visionneuse 3D

La visionneuse `3d/LFBO-3D.html` s'ouvre sans connexion : `generate_lfbo.py` y intègre ces fichiers.

| Fichier | Contenu | Licence |
|---|---|---|
| `three-lfbo.min.js` | three.js r170 (`three`, `OrbitControls`, `GLTFLoader`, `CSS2DRenderer`) exposés sous `window.LFBO3D` | MIT, © 2010-2024 three.js authors |
| `fonts/barlow-semi-condensed-*.woff2` | Barlow Semi Condensed 500/600/700, sous-ensemble latin | SIL Open Font License 1.1 |
| `fonts/ibm-plex-mono-*.woff2` | IBM Plex Mono 400/500, sous-ensemble latin | SIL Open Font License 1.1 |

Reconstruire `three-lfbo.min.js` :

```bash
npm i three@0.170.0 esbuild@0.24
cat > entry.js <<'JS'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
window.LFBO3D = { THREE, OrbitControls, GLTFLoader, CSS2DRenderer, CSS2DObject };
JS
npx esbuild entry.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=three-lfbo.min.js
```
