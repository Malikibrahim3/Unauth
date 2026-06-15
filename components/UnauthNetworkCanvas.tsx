'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_X     = 4.6;
const GLOBE_R     = 3.1;
const GLOBE_SCALE = 1.15;
const DOT_SCALE   = 1.3;
const N_DOTS    = 420;
const LAT_LINES = 7;
const LON_LINES = 10;
const ROT_SPEED = 0.0028;
const REVEAL_MS = 2500;
const HOVER_RADIUS = 0.7;
const CONNECT_DIST = 0.85;
const MAX_NEIGHBORS_PER_DOT = 3;

type Dot = { bx: number; by: number; bz: number; strength: number };

function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }

export function UnauthNetworkCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ clientX: 0, clientY: 0, active: false });

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;
    const el: HTMLDivElement = mountNode;

    let raf = 0;
    let W = el.clientWidth;
    let H = el.clientHeight;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lowPowerDevice =
      prefersReducedMotion.matches ||
      window.innerWidth < 768 ||
      navigator.hardwareConcurrency <= 4;
    const dotCount = lowPowerDevice ? 220 : N_DOTS;
    const maxPixelRatio = lowPowerDevice ? 1.25 : 1.75;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── Globe group ─────────────────────────────────────────────────────── */
    const globe = new THREE.Group();
    globe.position.set(GLOBE_X, 0, 0);
    globe.scale.set(0.35 * GLOBE_SCALE, 0.35 * GLOBE_SCALE, 0.35 * GLOBE_SCALE); // starts small; reveal expands it
    scene.add(globe);

    /* ── Wire lines (store materials for opacity animation) ──────────────── */
    const wireMats: { mat: THREE.LineBasicMaterial; base: number }[] = [];
    const SEGS = 96;
    const wireColor = new THREE.Color('#6e7e76');

    function addLine(pts: THREE.Vector3[], baseOp: number) {
      const mat = new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0 });
      wireMats.push({ mat, base: baseOp });
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }

    for (let i = 0; i < LAT_LINES; i++) {
      const phi = ((i + 1) / (LAT_LINES + 1)) * Math.PI;
      const y = GLOBE_R * Math.cos(phi), r = GLOBE_R * Math.sin(phi);
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= SEGS; s++) {
        const a = (s / SEGS) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
      }
      addLine(pts, i === Math.floor(LAT_LINES / 2) ? 0.16 : 0.08);
    }

    for (let i = 0; i < LON_LINES; i++) {
      const az = (i / LON_LINES) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= SEGS; s++) {
        const ph = (s / SEGS) * Math.PI;
        pts.push(new THREE.Vector3(
          GLOBE_R * Math.sin(ph) * Math.cos(az),
          GLOBE_R * Math.cos(ph),
          GLOBE_R * Math.sin(ph) * Math.sin(az),
        ));
      }
      addLine(pts, 0.07);
    }

    /* ── Dots — risk-tier palette ───────────────────────────────────────────
     * Tiers mirror the app's confidence grades, distributed by real-world
     * frequency: most customers are clean, a small fraction are definite risk.
     *   weak     ~55%  sage-grey    — baseline, no flag
     *   possible ~25%  slate-blue   — one signal present
     *   probable ~14%  warm amber   — multiple signals
     *   definite  ~6%  terracotta   — confirmed pattern (matches landing accent)
     * Higher-risk dots are rendered slightly larger so they draw the eye.
     */
    const RISK_TIERS = [
      { color: '#3D5248', sizeBase: 2.8, sizeRange: 3.2, weight: 0.55 }, // weak     — dark sage
      { color: '#2E5068', sizeBase: 3.4, sizeRange: 3.6, weight: 0.25 }, // possible — steel blue
      { color: '#A05818', sizeBase: 4.2, sizeRange: 4.2, weight: 0.14 }, // probable — burnt amber
      { color: '#B02E20', sizeBase: 5.2, sizeRange: 4.8, weight: 0.06 }, // definite — deep terracotta
    ];
    // Build cumulative weights for tier selection
    const tierCumulative = RISK_TIERS.reduce<number[]>((acc, t) => {
      acc.push((acc[acc.length - 1] ?? 0) + t.weight);
      return acc;
    }, []);

    const dots: Dot[] = [];
    const pos = new Float32Array(dotCount * 3);
    const col = new Float32Array(dotCount * 3);
    const sz  = new Float32Array(dotCount);
    const PHI_G = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < dotCount; i++) {
      const phi   = Math.acos(1 - 2 * (i / dotCount));
      const theta = PHI_G * i;
      const r     = GLOBE_R + (Math.random() - 0.5) * 0.08;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      dots.push({ bx: x, by: y, bz: z, strength: 0.5 + Math.random() * 0.8 });
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;

      // Pick tier by cumulative weight
      const rnd = Math.random();
      const tierIdx = tierCumulative.findIndex(c => rnd < c);
      const tier = RISK_TIERS[tierIdx >= 0 ? tierIdx : RISK_TIERS.length - 1];
      // Slight color variation within each tier to avoid a flat uniform look
      const base = new THREE.Color(tier.color);
      base.offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06);
      col[i * 3] = base.r; col[i * 3 + 1] = base.g; col[i * 3 + 2] = base.b;
      sz[i] = (tier.sizeBase + Math.random() * tier.sizeRange) * DOT_SCALE;
    }

    const neighbors: number[][] = Array.from({ length: dotCount }, () => []);
    for (let i = 0; i < dotCount; i++) {
      const near: { j: number; d: number }[] = [];
      for (let j = 0; j < dotCount; j++) {
        if (i === j) continue;
        const dx = dots[i].bx - dots[j].bx;
        const dy = dots[i].by - dots[j].by;
        const dz = dots[i].bz - dots[j].bz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= CONNECT_DIST) near.push({ j, d });
      }
      near.sort((a, b) => a.d - b.d);
      neighbors[i] = near.slice(0, MAX_NEIGHBORS_PER_DOT).map((n) => n.j);
    }

    const maxSegments = dotCount * MAX_NEIGHBORS_PER_DOT;
    const connPositions = new Float32Array(maxSegments * 6);
    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute('position', new THREE.BufferAttribute(connPositions, 3));
    const connMat = new THREE.LineBasicMaterial({
      color: wireColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const connLines = new THREE.LineSegments(connGeo, connMat);
    globe.add(connLines);

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dotGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    dotGeo.setAttribute('size',     new THREE.BufferAttribute(sz,  1));

    const dotMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: {
        uPR:      { value: Math.min(window.devicePixelRatio, maxPixelRatio) },
        uOpacity: { value: 0 }, // animated by reveal
      },
      vertexShader: `
        attribute float size; varying vec3 vColor; uniform float uPR;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPR * (10.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; uniform float uOpacity;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(vColor, a * uOpacity);
        }`,
    });
    globe.add(new THREE.Points(dotGeo, dotMat));

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hoverLocal = new THREE.Vector3();
    const invGlobe = new THREE.Matrix4();
    const rayOrigin = new THREE.Vector3();
    const rayDir = new THREE.Vector3();
    const localRay = new THREE.Ray();
    const hitSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_R);
    /* ── Animation state ─────────────────────────────────────────────────── */
    let revealTriggered = false;
    let revealStartTime = 0;
    let scrollT = 0;
    let targetScrollT = 0;
    let connectOp = 0;
    let hoverValid = false;
    let isVisible = false;
    let isInViewport = false;
    let renderQueued = false;
    const section = el.closest('section') as HTMLElement | null;
    const hoverTarget = section ?? el;
    const scheduleRender = () => {
      if (renderQueued) return;
      renderQueued = true;
      raf = requestAnimationFrame(tick);
    };

    /* ── IntersectionObserver — fire reveal on entry ─────────────────────── */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          isInViewport = e.isIntersecting;
          if (e.isIntersecting && !revealTriggered) {
            revealTriggered = true;
            revealStartTime = performance.now();
          }
          if (e.isIntersecting) scheduleRender();
        });
      },
      { threshold: 0.08 },
    );
    io.observe(section ?? el);

    /* ── Scroll handler — exit drift + fade ──────────────────────────────── */
    function onScroll() {
      if (!section) return;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const scrolled = window.scrollY - sectionTop;
      const animH = section.clientHeight * 0.5;
      targetScrollT = Math.max(0, Math.min(1, scrolled / animH));
      scheduleRender();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initialise immediately

    /* ── Mouse ───────────────────────────────────────────────────────────── */
    function onMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        mouseRef.current.active = false;
        scheduleRender();
        return;
      }
      mouseRef.current = { clientX: e.clientX, clientY: e.clientY, active: true };
      scheduleRender();
    }
    function onLeave() {
      mouseRef.current.active = false;
      scheduleRender();
    }
    function onVisibilityChange() {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) scheduleRender();
    }
    isVisible = document.visibilityState === 'visible';
    hoverTarget.addEventListener('pointermove', onMove);
    hoverTarget.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    function onResize() {
      W = el.clientWidth; H = el.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
      renderer.setSize(W, H);
      dotMat.uniforms.uPR.value = Math.min(window.devicePixelRatio, maxPixelRatio);
      scheduleRender();
    }
    window.addEventListener('resize', onResize);

    /* ── Render loop ─────────────────────────────────────────────────────── */
    const clock = new THREE.Clock();

    function tick() {
      renderQueued = false;
      if (!isVisible || !isInViewport) return;

      const animateContinuously =
        !prefersReducedMotion.matches && (revealProgIncomplete() || scrollActive() || mouseRef.current.active);
      if (animateContinuously) {
        raf = requestAnimationFrame(tick);
        renderQueued = true;
      }
      const t = clock.getElapsedTime();
      const posAttr = dotGeo.getAttribute('position') as THREE.BufferAttribute;
      const mouse   = mouseRef.current;

      /* Reveal progress (0 until triggered, then 0→1 over REVEAL_MS) */
      const revealElapsed = revealTriggered ? performance.now() - revealStartTime : 0;
      const revealProg = prefersReducedMotion.matches && revealTriggered
        ? 1
        : Math.min(1, revealElapsed / REVEAL_MS);
      const revealEased   = easeOutQuart(revealProg);

      /* Scale: 0.35 → 1.0, then GLOBE_SCALE */
      const sc = (0.35 + 0.65 * revealEased) * GLOBE_SCALE;
      globe.scale.set(sc, sc, sc);

      /* Opacity: delayed 40% of reveal, then eases to full */
      const opProg   = easeOutQuart(Math.max(0, Math.min(1, (revealProg - 0.4) / 0.6)));

      /* Scroll exit (lerped for smooth feel) */
      scrollT += (targetScrollT - scrollT) * 0.08;

      /* Globe drifts left + pitches down as user scrolls past */
      globe.position.x = GLOBE_X - GLOBE_R * 0.65 * scrollT;
      globe.position.y = -GLOBE_R * 0.25 * scrollT;
      if (!prefersReducedMotion.matches) {
        globe.rotation.y += ROT_SPEED + scrollT * 0.006; // spins faster while exiting
      }
      globe.rotation.x  = -Math.PI * 0.14 * scrollT;  // tips forward

      /* Fade out in second half of scroll exit */
      const fadeT       = Math.max(0, (scrollT - 0.5) * 2);
      const scrollFade  = 1 - fadeT * 0.72;
      const finalOp     = opProg * scrollFade;

      dotMat.uniforms.uOpacity.value = finalOp * 0.90;
      wireMats.forEach(({ mat, base }) => { mat.opacity = finalOp * base; });

      globe.updateMatrixWorld(true);
      hoverValid = false;
      if (mouse.active) {
        const r = el.getBoundingClientRect();
        ndc.x = ((mouse.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((mouse.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        invGlobe.copy(globe.matrixWorld).invert();
        rayOrigin.copy(raycaster.ray.origin).applyMatrix4(invGlobe);
        rayDir.copy(raycaster.ray.direction).transformDirection(invGlobe);
        localRay.set(rayOrigin, rayDir);
        const hit = localRay.intersectSphere(hitSphere, hoverLocal);
        hoverValid = hit !== null;
      }

      /* Dots — shimmer + mouse repulsion (globe-local 3D) */
      for (let i = 0; i < dotCount; i++) {
        const d = dots[i];
        let x = d.bx + Math.sin(t * 0.22 + i * 0.29) * 0.014 * d.strength;
        let y = d.by + Math.cos(t * 0.18 + i * 0.17) * 0.011 * d.strength;
        let z = d.bz + Math.sin(t * 0.15 + i * 0.07) * 0.014 * d.strength;
        if (hoverValid) {
          const dx = x - hoverLocal.x;
          const dy = y - hoverLocal.y;
          const dz = z - hoverLocal.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const inf  = Math.max(0, 1 - dist / 1.35);
          if (inf > 0) {
            const l = dist + 0.001;
            x += (dx / l) * inf * 0.3;
            y += (dy / l) * inf * 0.3;
            z += (dz / l) * inf * 0.3;
          }
        }
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;

      connectOp += ((hoverValid ? 1 : 0) - connectOp) * 0.14;

      let segCount = 0;
      const drawn = new Set<string>();
      if (connectOp > 0.02 && hoverValid) {
        const nearDots: number[] = [];
        for (let i = 0; i < dotCount; i++) {
          const dx = posAttr.getX(i) - hoverLocal.x;
          const dy = posAttr.getY(i) - hoverLocal.y;
          const dz = posAttr.getZ(i) - hoverLocal.z;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= HOVER_RADIUS) nearDots.push(i);
        }

        if (nearDots.length === 0) {
          let best = -1;
          let bestD = Infinity;
          for (let i = 0; i < dotCount; i++) {
            const dx = posAttr.getX(i) - hoverLocal.x;
            const dy = posAttr.getY(i) - hoverLocal.y;
            const dz = posAttr.getZ(i) - hoverLocal.z;
            const d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) { bestD = d; best = i; }
          }
          if (best >= 0) nearDots.push(best);
        } else if (nearDots.length > 5) {
          nearDots.sort((a, b) => {
            const da =
              (posAttr.getX(a) - hoverLocal.x) ** 2 +
              (posAttr.getY(a) - hoverLocal.y) ** 2 +
              (posAttr.getZ(a) - hoverLocal.z) ** 2;
            const db =
              (posAttr.getX(b) - hoverLocal.x) ** 2 +
              (posAttr.getY(b) - hoverLocal.y) ** 2 +
              (posAttr.getZ(b) - hoverLocal.z) ** 2;
            return da - db;
          });
          nearDots.length = 5;
        }

        for (const i of nearDots) {
          for (const j of neighbors[i]) {
            const key = i < j ? `${i}:${j}` : `${j}:${i}`;
            if (drawn.has(key)) continue;
            drawn.add(key);

            const idx = segCount * 6;
            connPositions[idx]     = posAttr.getX(i);
            connPositions[idx + 1] = posAttr.getY(i);
            connPositions[idx + 2] = posAttr.getZ(i);
            connPositions[idx + 3] = posAttr.getX(j);
            connPositions[idx + 4] = posAttr.getY(j);
            connPositions[idx + 5] = posAttr.getZ(j);
            segCount += 1;
          }
        }
      }

      connGeo.setDrawRange(0, segCount * 2);
      connGeo.attributes.position.needsUpdate = true;
      connMat.opacity = connectOp * finalOp * 0.34;

      renderer.render(scene, camera);

      if (!animateContinuously) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function revealProgIncomplete() {
      return revealTriggered && performance.now() - revealStartTime < REVEAL_MS;
    }
    function scrollActive() {
      return Math.abs(targetScrollT - scrollT) > 0.002 || targetScrollT > 0.001;
    }

    scheduleRender();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      hoverTarget.removeEventListener('pointermove', onMove);
      hoverTarget.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      dotGeo.dispose(); dotMat.dispose(); connGeo.dispose(); connMat.dispose(); renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
      aria-hidden="true"
    />
  );
}
