import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js'

// --- Scene Setup ---
const scene = new THREE.Scene();
// Deep Cyberpunk Background (Darker Violet/Black)
scene.background = new THREE.Color(0x0a0015);
// Niebla más densa y oscura - AJUSTADO
scene.fog = new THREE.FogExp2(0x0a0015, 0.12); // Reducido para ver el sol

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    antialias: false, // Turn off AA for pixel art style
    preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Darker tone mapping for Cyberpunk feel
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85; // Aumentado ligeramente para balancear sombras
document.body.appendChild(renderer.domElement);

// --- Capture Logic ---
window.captureAvatar = () => {
    composer.render();
    const link = document.createElement('a');
    link.setAttribute('download', 'programmer-avatar.png');
    link.setAttribute('href', renderer.domElement.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    link.click();
};


// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Pyramid / "Pro Programmer" Avatar ---
const pyramidGroup = new THREE.Group();
scene.add(pyramidGroup);

// Geometry: 4-sided Cone = Pyramid
const geometry = new THREE.ConeGeometry(1.5, 2, 4);
const edges = new THREE.EdgesGeometry(geometry);

// --- Procedural Textures ---
function createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Background - Deep Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1024, 1024);

    // Brick Lines - Electric Cyan
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';

    // No blur in texture, let post-processing handle the subtle glow
    ctx.shadowBlur = 0;

    const rows = 16;
    const cols = 8;
    const brickHeight = 1024 / rows;
    const brickWidth = 1024 / cols;

    for (let y = 0; y < rows; y++) {
        const offset = (y % 2) * (brickWidth / 2);
        for (let x = -1; x < cols + 1; x++) {
            const xPos = x * brickWidth + offset;
            const yPos = y * brickHeight;
            ctx.strokeRect(xPos, yPos, brickWidth, brickHeight);
        }
    }

    // Strong boundary definition
    ctx.strokeRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // NeartestFilter keeps lines sharp if viewed close up, but Linear is better for rendering
    texture.minFilter = THREE.NearestFilter; // Sharp pixels
    texture.magFilter = THREE.NearestFilter;
    return texture;
}

const brickTexture = createBrickTexture();
const brickMaterial = new THREE.MeshBasicMaterial({
    map: brickTexture,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
});

// Edge Material (Wireframe highlight) - Cyan
const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 1
});

// Vertices - Neon Magenta
const vertexMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const vertexGeometry = new THREE.SphereGeometry(0.06, 16, 16);

function createPyramid(scale = 1, x = 0, z = 0, y = 0, rotY = 0) {
    const group = new THREE.Group();

    // Geometry
    const geometry = new THREE.ConeGeometry(1.5, 2, 4);
    geometry.rotateY(Math.PI / 4);

    // 1. Brick Body
    const mesh = new THREE.Mesh(geometry, brickMaterial);
    group.add(mesh);

    // 2. Edges (Wireframe)
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    group.add(wireframe);

    // 3. Glowing Vertices (Top only for main focus, or corners?)
    // Let's add them to the 5 key points for the "Pro" look
    const positions = [
        new THREE.Vector3(0, 1, 0), // Top
        // Base corners calculated manually for precision visual placement based on ConeGeometry(1.5, 2, 4) rotated 45deg
        // The base radius is 1.5. Y is -1.
        new THREE.Vector3(1.06, -1, 1.06),
        new THREE.Vector3(-1.06, -1, 1.06),
        new THREE.Vector3(1.06, -1, -1.06),
        new THREE.Vector3(-1.06, -1, -1.06)
    ];

    positions.forEach(pos => {
        const sphere = new THREE.Mesh(vertexGeometry, vertexMaterial);
        sphere.position.copy(pos);
        group.add(sphere);
    });

    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);
    group.rotation.y = rotY;

    return group;
}

// Scene Composition - Single Hero Pyramid
const mainPyramid = createPyramid(1.3, 0, 0, 0.5, 0); // Lifted up slightly to float above grid
pyramidGroup.add(mainPyramid);

// --- Environment: Infinite Grid Floor ---
function createGridTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = '#ff00ff'; // Magenta Grid
    ctx.lineWidth = 4; // Thicker for 8-bit feel

    // Grid lines
    const step = 128; // Adjusted for texture.repeat logic
    for (let i = 0; i <= 1024; i += step) {
        // Vertical
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1024);
        // Horizontal
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
    }
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.anisotropy = 1; // Turn off anisotropy for crisp pixel art floor
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
}

const gridTexture = createGridTexture();
const gridMaterial = new THREE.MeshBasicMaterial({
    map: gridTexture,
    transparent: true,
    side: THREE.DoubleSide
});
const gridGeometry = new THREE.PlaneGeometry(100, 100);
const grid = new THREE.Mesh(gridGeometry, gridMaterial);
grid.rotation.x = -Math.PI / 2;
grid.position.y = -1; // Floor level
scene.add(grid);


// --- Environment: Retro Silver Moon ---
// --- Sun Animation Logic ---
const sunCanvas = document.createElement('canvas');
sunCanvas.width = 512;
sunCanvas.height = 512;
const sunCtx = sunCanvas.getContext('2d');
const sunTexture = new THREE.CanvasTexture(sunCanvas);
sunTexture.minFilter = THREE.NearestFilter;
sunTexture.magFilter = THREE.NearestFilter;

function updateSun(time) {
    // 1. Draw Gradient Background - COLORES MÁS BRILLANTES
    const gradient = sunCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#ffff88');   // Amarillo más brillante
    gradient.addColorStop(0.5, '#ffaa00'); // Naranja más brillante
    gradient.addColorStop(1, '#ff3388');   // Rosa más brillante


    sunCtx.fillStyle = gradient;
    sunCtx.fillRect(0, 0, 512, 512);

    // 2. Animate Stripes
    sunCtx.globalCompositeOperation = 'destination-out';
    sunCtx.fillStyle = '#000000';

    // Cycle creates movement.
    // We want stripes to move DOWN (y increases) and loop back to top?
    // User said: "vallan hacia abajo haciendose mas pequeñas y que salgan de nuevo arriba"
    // Usually stripes are naturally "higher" in logical Y as they go up the sun.
    // In canvas Y=0 is top. So increasing Y moves them down.

    const speed = 50; // Pixels per second
    const offset = (time * speed) % 512;

    const numStripes = 8;
    for (let i = 0; i < numStripes; i++) {
        // Base position spread out
        // We want them to appear at top (Y=small) and move to bottom (Y=large)
        let y = (i * 60 + offset) % 650; // Loop range slightly larger than 512 to start off-screen

        // "haciendose mas pequeñas":
        // If they start big at top and get small?
        // Or user means visual perspective? In perspective, "up" (horizon) is usually smaller stripes.
        // If lines move DOWN, they originate from horizon (small) and get closer (bigger).
        // Let's assume standard perspective: Top (Horizon) = Small/Thin. Bottom = Big/Thick.
        // User said: "small at end"?
        // Let's try: Height depends on Y position.
        // Top (Y=0) -> Height = Small. Bottom (Y=512) -> Height = Large.

        // Wait, user said: "vallan hacia abajo haciendose mas pequeñas"
        // Move Down -> Get Smaller. That's inverted perspective (or maybe "top" of sun is close?).
        // I will follow instruction literally: Y increases (down), Height decreases.

        let height = 20 - (y / 512) * 18; // Start at 20px, shrink to 2px
        if (height < 1) height = 1;

        if (y > 200) { // Only start cutting below a certain point (horizon)
            sunCtx.fillRect(0, y, 512, height);
        }
    }

    // Reset composite
    sunCtx.globalCompositeOperation = 'source-over';
    sunTexture.needsUpdate = true;
}

const moonGeometry = new THREE.CircleGeometry(4, 32);
const moonMaterial = new THREE.MeshBasicMaterial({
    map: sunTexture,
    transparent: true,
    color: 0xffffff, // Blanco base para brillo
    opacity: 1.0     // Opacidad completa
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(0, 3, -8); // Más cerca y alto
scene.add(moon);

// --- Text Name Tag Logic ---
const textCanvas = document.createElement('canvas');
textCanvas.width = 2048;  // Aumentado para más espacio
textCanvas.height = 512;
const textCtx = textCanvas.getContext('2d');
const textTexture = new THREE.CanvasTexture(textCanvas);
textTexture.minFilter = THREE.LinearFilter;
textTexture.magFilter = THREE.LinearFilter;


function updateNameTag(time) {
    textCtx.clearRect(0, 0, 2048, 512);

    // Fuente Custom 'Pixel Game.otf'
    textCtx.font = 'bold 200px "PixelGame"';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';

    // Sin Glow
    textCtx.shadowBlur = 0;

    // Borde Negro Exterior (para legibilidad sobre el grid)
    textCtx.lineWidth = 14;
    textCtx.strokeStyle = '#000000';
    textCtx.strokeText('PyramidBuilder', 1024, 256);

    // Contorno Cyan (Hollow Effect)
    textCtx.lineWidth = 6;
    textCtx.strokeStyle = '#00ffff';
    textCtx.strokeText('PyramidBuilder', 1024, 256);

    // El interior se deja transparente (sin fillText) para el efecto hueco

    textTexture.needsUpdate = true;
}


const textMaterial = new THREE.SpriteMaterial({
    map: textTexture,
    transparent: true,
    opacity: 0.95
});
const textSprite = new THREE.Sprite(textMaterial);
textSprite.position.set(0, -0.5, 2.5);
textSprite.scale.set(6, 1.5, 1); // Escala aumentada
scene.add(textSprite);


// --- Post Processing ---


// 1. Pixelated Render
// Default pixelSize 3
const renderPixelatedPass = new RenderPixelatedPass(3, scene, camera);
renderPixelatedPass.normalEdgeStrength = 0;
renderPixelatedPass.depthEdgeStrength = 0;


// UI Control for Pixel Size
const pixelSelect = document.getElementById('pixelSelect');
if (pixelSelect) {
    pixelSelect.addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        renderPixelatedPass.setPixelSize(size);
    });
}



// 2. Bloom - REDUCIDO para que el texto sea visible
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,  // strength: reducido de 0.5 a 0.3
    0.2,  // radius: reducido de 0.3 a 0.2
    0.90  // threshold: aumentado de 0.80 a 0.90 para evitar "queme"
);


const composer = new EffectComposer(renderer);
composer.addPass(renderPixelatedPass);
composer.addPass(bloomPass);

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Floor movement (illusion of moving forward)
    // We move the texture offset significantly slower
    gridTexture.offset.y -= delta * 0.15;

    // Update Sun
    updateSun(clock.getElapsedTime());

    // Update Name Tag
    updateNameTag(clock.getElapsedTime());

    // Slow, deliberate rotation
    mainPyramid.rotation.y += 0.002;
    mainPyramid.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.05;

    controls.update();
    composer.render();
}

// Handle Window Resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

});

animate();
