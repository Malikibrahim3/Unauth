import * as THREE from 'three';

const F: Record<string, [number, number]> = {
  ae: [24, 54], af: [33, 65], al: [41, 20], am: [40, 45], ao: [-12.5, 18.5], ar: [-34, -64],
  at: [47.3333, 13.3333], au: [-27, 133], az: [40.5, 47.5], ba: [44, 18], bd: [24, 90],
  be: [50.8333, 4], bg: [43, 25], bh: [26, 50.55], bi: [-3.5, 30], bj: [9.5, 2.25],
  bn: [4.5, 114.6667], bo: [-17, -65], br: [-10, -55], bt: [27.5, 90.5], bw: [-22, 24],
  ca: [54, -100], cd: [0, 25], cf: [7, 21], ch: [47, 8], cl: [-30, -71], cm: [6, 12],
  cn: [35, 105], co: [4, -72], cr: [10, -84], cy: [35, 33], cz: [49.75, 15.5], de: [51, 9],
  dk: [56, 10], do: [19, -70.6667], dz: [28, 3], ec: [-2, -77.5], ee: [59, 26], eg: [27, 30],
  er: [15, 39], es: [40, -4], et: [8, 38], fi: [64, 26], fr: [46, 2], ga: [-1, 11.75],
  gb: [54, -2], ge: [42, 43.5], gh: [8, -2], gr: [39, 22], gt: [15.5, -90.25], gy: [5, -59],
  hk: [22.25, 114.1667], hn: [15, -86.5], hr: [45.1667, 15.5], ht: [19, -72.4167],
  hu: [47, 20], id: [-5, 120], ie: [53, -8], il: [31.5, 34.75], in: [20, 77], is: [65, -18],
  it: [42.8333, 12.8333], jm: [18.25, -77.5], jo: [31, 36], jp: [36, 138], ke: [1, 38],
  kg: [41, 75], kh: [13, 105], kr: [37, 127.5], kw: [29.3375, 47.6581], kz: [48, 68],
  la: [18, 105], lb: [33.8333, 35.8333], lk: [7, 81], lt: [56, 24], lu: [49.75, 6.1667],
  lv: [57, 25], ly: [25, 17], ma: [32, -5], md: [47, 29], mg: [-20, 47], mk: [41.8333, 22],
  ml: [17, -4], mn: [46, 105], mr: [20, -12], mw: [-13.5, 34], mx: [23, -102], my: [2.5, 112.5],
  mz: [-18.25, 35], na: [-22, 17], ne: [16, 8], ng: [10, 8], ni: [13, -85], nl: [52.5, 5.75],
  no: [62, 10], np: [28, 84], nz: [-41, 174], om: [21, 57], pa: [9, -80], pe: [-10, -76],
  pg: [-6, 147], ph: [13, 122], pk: [30, 70], pl: [52, 20], ps: [32, 35.25], pt: [39.5, -8],
  py: [-23, -58], qa: [25.5, 51.25], ro: [46, 25], rs: [44, 21], ru: [60, 100], rw: [-2, 30],
  sa: [25, 45], se: [62, 15], sg: [1.3667, 103.8], si: [46, 15], sk: [48.6667, 19.5],
  sl: [8.5, -11.5], sn: [14, -14], so: [10, 49], sr: [4, -56], sv: [13.8333, -88.9167],
  td: [15, 19], tg: [8, 1.1667], th: [15, 100], tj: [39, 71], tn: [34, 9], tr: [39, 35],
  tt: [11, -61], tw: [23.5, 121], tz: [-6, 35], ua: [49, 32], ug: [1, 32], us: [38, -97],
  uy: [-33, -56], uz: [41, 64], ve: [8, -66], vn: [16, 106], ye: [15, 48], za: [-29, 24], zm: [-15, 30],
};

const Gt = 0.2;
const It = 8;
const Dt = 44;
const Et = 24;
const v = 0.35;
const k = 3000;
const Lt = k * 0.5;
const Ot = 160;
const zt = 500;
const T_grow = 0.01;
const wt = 0.01;
const kt = 2500;
const Xt = 70000;

const Z = Math.PI * 2;
const Nt = Math.PI * 0.1111;
const Ut = Math.PI;
const Wt = Math.PI * 0.1;
const J = 250;
const vt = 0.3;
const Vt = 20;
const jt = 10;
const qt = 0.94;
const Ht = 0.005;
const Ct = 0.02;
const Kt = 0.001;
const Mt = 1080;
const _t = Math.PI * -0.5;
const Rt = Math.PI * 0.25;
const St = 0.94;
const xt = -0.003;
const te = 512;
const ie = 1000;
const se = 4000;
const ee = 5;

const E_inc = 0.005;
const T_rot = 0.02;
const S_rot = 0.001;
const u_opacity = 0.8;
const i_dur = 5000;
const d_delay = 0.43;
const L_remain = 1 - d_delay;
const R_scaleStart = 0.3;
const C_scaleEnd = 0.65;
const G_camX = 0.8;
const v_camX = -0.65;
const B_camY = 80;
const y_camY = 0.35;
const I_dotZ = 100;
const N_dotZ = 0;
const a_lerp = 0.25;
const D_scrollX = 0.6;
const P_scrollY = 0.4;
const x_scrollRot = -Math.PI / 4;
const w_opacity = 0.3;

const ARC_TEXTURE_URLS = [
  'https://images.ctfassets.net/fzn2n1nzq965/6gX0HWCHvfGFIVKS3EEl7Y/8c35db092f4014141f04571a02d1114a/enterprise-line1.png',
  'https://images.ctfassets.net/fzn2n1nzq965/5lragxqPCgZCTAyj0cc9Jv/27fce966dad7a93dd6f0af8db1a0468a/enterprise-line2.png',
  'https://images.ctfassets.net/fzn2n1nzq965/2VDPmFltATfLfyd8Pmkvnw/08ef3e6006a1e236c3e255ecdc320d78/enterprise-line3.png',
  'https://images.ctfassets.net/fzn2n1nzq965/3YM4jNg1bfhf4VfAdYi42M/3e27ae615c637d352d5271814466e0a0/enterprise-line4.png',
];
const DISC_TEXTURE_URL =
  'https://images.ctfassets.net/fzn2n1nzq965/2wn0qc94lx6dbfTVt1vpuO/cf3e66080a3cddeb7275a8fefbca5134/disc_texture.png';
const MAP_TEXTURE_URL =
  'https://images.ctfassets.net/fzn2n1nzq965/11064gUb2CgTJXKVwAt5J9/297a98a65d04d4fbb979072ce60466ab/map_fill-a78643e8.png';
const BACKGROUND_GRADIENT_URLS = [
  'https://images.ctfassets.net/fzn2n1nzq965/3VtESM8wPIKF3CZXhz1tSc/03f35aa0452b6edc6a9f6c105ef97ca2/512_x_512__1_.png',
];

const ARC_COLORS_DEFAULT: [number, number][] = [
  [16335176, 16763735],
  [11232234, 9494783],
  [16335176, 11232234],
  [16763735, 9494783],
];
const ARC_COLORS_ENTERPRISE: [number, number][] = [
  [14290971, 15901449],
  [10439145, 2275570],
  [16269387, 9646831],
  [16687123, 4049407],
];

const eastCountryList = ['my', 'sg', 'au', 'nz', 'hk', 'jp', 'in'];
const westCountryList = ['ca', 'mx', 'us', 'br'];
const middleCountryList = [
  'be', 'gb', 'at', 'dk', 'ee', 'fi', 'fr', 'gr', 'de', 'ie',
  'it', 'lv', 'lt', 'lu', 'nl', 'no', 'pl', 'pt', 'es', 'sk', 'si', 'se', 'ch', 'cy', 'bg', 'ro', 'cz',
];
const liveCountryList = [...eastCountryList, ...westCountryList, ...middleCountryList];

const GLOBE_SIZE_SCALE = 1;
const GLOBE_LAYOUT_OFFSET_X = -0.02;
const GLOBE_LAYOUT_OFFSET_Y = 0.04;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function hsin(x: number) {
  const s = Math.sin(x / 2);
  return s * s;
}

function safeAsin(x: number) {
  if (x > 1) return Math.PI / 2;
  if (x < -1) return -Math.PI / 2;
  return Math.asin(x);
}

function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4;
}

function greatCircleInterp(from: [number, number], to: [number, number]) {
  const e = from[0] * DEG2RAD;
  const i = from[1] * DEG2RAD;
  const s = to[0] * DEG2RAD;
  const r = to[1] * DEG2RAD;
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosR = Math.cos(r);
  const sinR = Math.sin(r);
  const cx = cosI * Math.cos(e);
  const cy = cosI * Math.sin(e);
  const Rx = cosR * Math.cos(s);
  const Ry = cosR * Math.sin(s);
  const d = 2 * safeAsin(Math.sqrt(hsin(r - i) + cosI * cosR * hsin(s - e)));
  const sinD = Math.sin(d);
  const fn = (M: number): [number, number] => {
    if (!d) return [e * RAD2DEG, i * RAD2DEG];
    const weight = Math.sin(M * d) / sinD;
    const remainder = Math.sin(d - M * d) / sinD;
    const ux = remainder * cx + weight * Rx;
    const uy = remainder * cy + weight * Ry;
    const uz = remainder * sinI + weight * sinR;
    return [Math.atan2(uy, ux) * RAD2DEG, Math.atan2(uz, Math.sqrt(ux * ux + uy * uy)) * RAD2DEG];
  };
  return fn;
}

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = lng * DEG2RAD;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function vecToUV(position: THREE.Vector3) {
  const dir = position.clone().normalize();
  const u = 1 - (0.5 + Math.atan2(dir.z, dir.x) / (2 * Math.PI));
  const vv = 0.5 + Math.asin(dir.y) / Math.PI;
  return new THREE.Vector2(u, vv);
}

function sampleImageData(uv: THREE.Vector2, imgData: ImageData) {
  const x = Math.min(imgData.width - 1, Math.max(0, Math.floor(uv.x * imgData.width)));
  const y = Math.min(imgData.height - 1, Math.max(0, Math.floor(uv.y * imgData.height)));
  const idx = x * 4 + y * (4 * imgData.width);
  return imgData.data.slice(idx, idx + 4);
}

function isLandAtLatLng(lat: number, lng: number, imageData: ImageData) {
  // Use positive-x spherical coords to match initDots / vecToUV coordinate system.
  // latLngToVec3 negates x, which shifts the UV lookup by half the map width.
  const phi = (90 - lat) * DEG2RAD;
  const theta = lng * DEG2RAD;
  const pos = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );
  const uv = vecToUV(pos);
  return sampleImageData(uv, imageData)[3] > 0;
}

function snapToLand(lat: number, lng: number, imageData: ImageData): [number, number] | null {
  if (isLandAtLatLng(lat, lng, imageData)) return [lat, lng];
  // Search outward in 1-degree rings (full perimeter at each radius).
  // This correctly handles archipelagos where the country centre is in open water.
  for (let r = 1; r <= 20; r++) {
    for (let dLat = -r; dLat <= r; dLat++) {
      for (let dLng = -r; dLng <= r; dLng++) {
        if (Math.abs(dLat) !== r && Math.abs(dLng) !== r) continue;
        if (isLandAtLatLng(lat + dLat, lng + dLng, imageData)) return [lat + dLat, lng + dLng];
      }
    }
  }
  return null;
}

function cubicBezier4(x1: number, y1: number, x2: number, y2: number, t: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const x = 3 * mid * (1 - mid) * (1 - mid) * x1 + 3 * mid * mid * (1 - mid) * x2 + mid * mid * mid;
    if (x < t) lo = mid;
    else hi = mid;
  }
  const s = (lo + hi) / 2;
  return 3 * s * (1 - s) * (1 - s) * y1 + 3 * s * s * (1 - s) * y2 + s * s * s;
}

class Arc extends THREE.Object3D {
  colors: [THREE.Color, THREE.Color];
  texture: THREE.Texture | null;
  isStatic: boolean;
  startLat: number;
  startLng: number;
  active = false;
  animationFrame: number | null = null;
  startTime = 0;
  curve: THREE.CubicBezierCurve3;
  geometry: THREE.TubeGeometry;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
  circleMaterial1: THREE.MeshBasicMaterial;
  circleMaterial2: THREE.MeshBasicMaterial;
  circleGeometry: THREE.PlaneGeometry;
  circle1: THREE.Mesh;
  circle2: THREE.Mesh;

  constructor(
    startLatLng: [number, number],
    endLatLng: [number, number],
    colors: [THREE.Color, THREE.Color],
    texture: THREE.Texture | null,
    circleTexture: THREE.Texture | null,
    radius: number,
    radiusMultiplier: number,
    isStatic: boolean,
    opacity = 1,
  ) {
    super();
    this.colors = colors;
    this.texture = texture;
    this.isStatic = isStatic;
    this.startLat = startLatLng[0];
    this.startLng = startLatLng[1];

    const endLat = endLatLng[0];
    const endLng = endLatLng[1];
    const b = latLngToVec3(this.startLat, this.startLng, radius);
    const d = latLngToVec3(endLat, endLng, radius * 1.002);
    const C = THREE.MathUtils.clamp(b.distanceTo(d) * 0.5, Ot, zt);
    const h = greatCircleInterp([this.startLng, this.startLat], [endLng, endLat]);
    const M = h(0.25);
    const end75 = h(0.75);
    const g = latLngToVec3(M[1], M[0], radius + C);
    const u = latLngToVec3(end75[1], end75[0], radius + C);
    const S = new THREE.CubicBezierCurve3(b, g, u, d);
    this.curve = S;

    this.geometry = new THREE.TubeGeometry(S, Dt, Gt + (radius / 1200) * radiusMultiplier, It, false);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_alpha: { value: opacity },
        u_texture: { value: texture },
        speedEpsilon: { value: 4e-4 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_alpha;
        uniform sampler2D u_texture;
        varying vec2 vUv;
        uniform float speedEpsilon;

        void main() {
          float ramp = vUv.x * 0.5;
          float pct = fract(ramp - u_time * speedEpsilon);
          vec4 color = texture2D(u_texture, vec2(pct, 0.6));
          color.a = u_alpha;
          gl_FragColor = vec4(color);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);
    this.material.uniforms.u_texture.value = this.texture;

    this.circleMaterial1 = new THREE.MeshBasicMaterial({
      map: circleTexture,
      color: colors[0],
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
    this.circleMaterial2 = new THREE.MeshBasicMaterial({
      map: circleTexture,
      color: colors[1],
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });

    this.circleGeometry = new THREE.PlaneGeometry(radius * 0.1, radius * 0.1, 2);
    this.circle1 = new THREE.Mesh(this.circleGeometry, this.circleMaterial1);
    this.circle2 = new THREE.Mesh(this.circleGeometry, this.circleMaterial2);
    this.circle1.scale.set(0.01, 0.01, 0.01);
    this.circle2.scale.set(0.01, 0.01, 0.01);
    this.circle1.position.set(b.x, b.y, b.z);
    this.circle2.position.set(d.x, d.y, d.z);
    this.circle1.rotation.set(Math.PI, Math.PI, Math.PI);
    this.circle2.rotation.set(Math.PI, Math.PI, Math.PI);
    this.circle1.lookAt(new THREE.Vector3(0, 0, 0));
    this.circle2.lookAt(new THREE.Vector3(0, 0, 0));
    this.add(this.circle1);
    this.add(this.circle2);

    this.showLine();
  }

  drawAnimatedLine = () => {
    if (!this.active) return;
    let e = this.geometry.drawRange.count;
    const elapsed = performance.now() - this.startTime;
    this.material.uniforms.u_time.value = elapsed;

    const s = easeOutQuart(Math.min(1, elapsed / kt));
    e = Math.min(k, Math.ceil(s * k));

    if (this.active && e < k) {
      const r = this.circle1.scale.x;
      if (r < v) this.circle1.scale.set(r + T_grow, r + T_grow, r + T_grow);
      if (e > Lt) {
        const a = this.circle2.scale.x;
        if (a < v) this.circle2.scale.set(a + T_grow * 1.5, a + T_grow * 1.5, a + T_grow * 1.5);
      }
      this.geometry.setDrawRange(0, e);
    }
    this.animationFrame = requestAnimationFrame(this.drawAnimatedLine);
  };

  drawStaticLine = () => {
    this.geometry.setDrawRange(0, k);
    this.circle1.scale.set(v, v, v);
    this.circle2.scale.set(v, v, v);
  };

  eraseLine = () => {
    const e = this.geometry.drawRange.count;
    const i = this.geometry.drawRange.start;
    this.material.uniforms.u_time.value = performance.now() - this.startTime;
    if (i > e) return;

    const s = Et * 2;
    const r = this.circle1.scale.x;
    const aa = this.circle2.scale.x;
    if (r > 0.03) this.circle1.scale.set(r - wt, r - wt, r - wt);
    if (i > Lt && aa > 0.03) this.circle2.scale.set(aa - wt * 1.5, aa - wt * 1.5, aa - wt * 1.5);

    this.geometry.setDrawRange(i + s, e);
    this.animationFrame = requestAnimationFrame(this.eraseLine);
  };

  showLine() {
    this.active = true;
    this.geometry.setDrawRange(0, 1);
    if (this.isStatic) {
      this.drawStaticLine();
    } else {
      this.startTime = performance.now();
      this.drawAnimatedLine();
    }
  }

  hideLine() {
    this.active = false;
    this.eraseLine();
  }

  disposeLine() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.mesh.geometry.dispose();
    this.texture?.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.circle1.geometry.dispose();
    (this.circle1.material as THREE.Material).dispose();
    this.circle2.geometry.dispose();
    (this.circle2.material as THREE.Material).dispose();
    this.clear();
  }

  pause() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
  }

  play() {
    if (this.isStatic) {
      this.drawStaticLine();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.active ? this.drawAnimatedLine : this.eraseLine);
  }
}

type GlobeDotsOptions = {
  radius: number;
  dotColor: THREE.Color;
  dotDensity: number;
  dotSize: number;
  dotSideCount: number;
  isStatic: boolean;
  callback: () => void;
};

class GlobeDots extends THREE.Object3D {
  callback: () => void;
  isStatic: boolean;
  dotDensity: number;
  dotSize: number;
  dotSideCount: number;
  dotColor: THREE.Color;
  radius: number;
  isDragging = false;
  dragTime = 0;
  material: THREE.ShaderMaterial | null = null;
  startTime = 0;
  dragStartTime = 0;
  imageData: ImageData | null = null;

  constructor(opts: GlobeDotsOptions) {
    super();
    this.callback = opts.callback;
    this.isStatic = opts.isStatic;
    this.dotDensity = opts.dotDensity;
    this.dotSize = opts.dotSize;
    this.dotSideCount = opts.dotSideCount;
    this.dotColor = opts.dotColor;
    this.radius = opts.radius;
    this.rotation.x = -Math.PI;
    this.rotation.z = -Math.PI;
    this.loadImage();
  }

  loadImage() {
    new THREE.TextureLoader().load(MAP_TEXTURE_URL, (tex) => {
      const canvas = document.createElement('canvas');
      canvas.width = tex.image.width as number;
      canvas.height = tex.image.height as number;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(tex.image as CanvasImageSource, 0, 0);
      this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.initDots();
    });
  }

  initDots() {
    if (!this.imageData) return;
    const e = this.radius / 450;
    const i = (this.radius / 600) * this.dotDensity;
    const s = Math.floor(i * Xt);
    const r = this.radius;
    const a = new THREE.CircleGeometry(this.dotSize * e, this.dotSideCount);
    const l: number[] = [];
    const m: number[] = [];
    const c = new THREE.Vector3();

    for (let b = s; b >= 0; b -= 1) {
      const d = Math.acos(-1 + (2 * b) / s);
      const C = Math.sqrt(s * Math.PI) * d;
      c.setFromSphericalCoords(r, d, C);

      const tempGeo = a.clone();
      const dummy = new THREE.Object3D();
      dummy.position.copy(c);
      dummy.lookAt(new THREE.Vector3(0, 0, 0));
      dummy.updateMatrix();
      tempGeo.applyMatrix4(dummy.matrix);

      const h = tempGeo.attributes.position.array as Float32Array;
      tempGeo.computeBoundingSphere();
      const center = tempGeo.boundingSphere?.center ?? c;
      const uv = vecToUV(center);

      if (sampleImageData(uv, this.imageData)[3] > 0) {
        const g = Math.random();
        for (let u = 0; u < this.dotSideCount; u += 1) {
          l.push(
            h[0], h[1], h[2],
            h[3 + u * 3], h[4 + u * 3], h[5 + u * 3],
            h[6 + u * 3], h[7 + u * 3], h[8 + u * 3],
          );
          m.push(g, g, g);
        }
        l.push(
          h[0], h[1], h[2],
          h[3], h[4], h[5],
          h[3 + this.dotSideCount * 3], h[4 + this.dotSideCount * 3], h[5 + this.dotSideCount * 3],
        );
        m.push(g, g, g);
      }
    }

    const y = new THREE.BufferGeometry();
    y.setAttribute('position', new THREE.BufferAttribute(new Float32Array(l), 3));
    y.setAttribute('rndId', new THREE.BufferAttribute(new Float32Array(m), 1));

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        u_time: { value: 0 },
        u_drag_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_r: { value: this.dotColor.r },
        u_g: { value: this.dotColor.g },
        u_b: { value: this.dotColor.b },
        u_z_offset_factor: { value: 0 },
        u_opacity_factor: { value: 1 },
        u_dragging: { value: false },
      },
      vertexShader: `
        uniform float u_time;
        uniform float u_drag_time;
        uniform vec2 u_resolution;
        uniform float u_z_offset_factor;
        attribute float rndId;
        varying float vRndId;
        varying float pct;

        void main() {
          vRndId = rndId;
          vec2 st = position.xy / u_resolution;
          pct = min(1.0, u_time / (1000. / max(0.2, 0.2 * sin(fract(rndId)))));
          float vNormal = 1.0;
          if (u_drag_time > 0.) {
            vNormal -= ((sin(u_time / 400.0 * vRndId) + 1.0) * 0.02) * min(1., u_drag_time / 1200.0);
          }
          vNormal -= ((sin(u_time / 400.0 * vRndId) + 1.0) * 0.02) * u_z_offset_factor;
          vec4 modelViewPosition = modelViewMatrix * vec4(position, vNormal);
          gl_Position = projectionMatrix * modelViewPosition;
        }
      `,
      fragmentShader: `
        uniform bool u_dragging;
        uniform float u_time;
        uniform float u_drag_time;
        uniform float u_r;
        uniform float u_g;
        uniform float u_b;
        uniform float u_opacity_factor;
        varying float vRndId;
        varying float pct;

        void main() {
          float v = sin(u_time / 200.0 * vRndId);
          float alpha = (pct * 0.7 + v * 0.2) * u_opacity_factor;
          float dragDur = 1200.0;
          vec3 color = vec3(u_r, u_g, u_b);
          float rInc = min(1.0, u_drag_time / dragDur) * (sin(u_drag_time / (dragDur * 0.5) + 1.0) * 0.1);
          float gInc = min(1.0, u_drag_time / dragDur) * (sin(u_drag_time / (dragDur * 0.75) - 1.0) * 0.1);
          float bInc = min(1.0, u_drag_time / dragDur) * (sin(u_drag_time / dragDur) * 0.1);
          if (u_dragging) {
            color.r = u_r + rInc;
            color.g = u_g + gInc;
            color.b = u_b + bInc;
          }
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const R = new THREE.Mesh(y, this.material);
    if (this.children.length) this.remove(this.children[0]);
    this.add(R);
    this.material.uniforms.u_resolution.value.x = window.innerWidth;
    this.material.uniforms.u_resolution.value.y = window.innerHeight;
    this.startTime = performance.now();
    this.dragStartTime = 0;
    this.callback();
  }

  startDragging() {
    if (!this.material || this.isStatic) return;
    this.isDragging = true;
    this.dragStartTime = performance.now();
    this.material.uniforms.u_dragging.value = true;
    this.material.uniforms.u_time.value = performance.now() - this.dragStartTime;
  }

  stopDragging() {
    this.isDragging = false;
    if (this.material) this.material.uniforms.u_dragging.value = false;
  }

  updateDragTimer() {
    if (this.isDragging) {
      this.dragTime = performance.now() - this.dragStartTime;
    } else if (this.dragTime > 0.1) {
      this.dragTime = Math.max(0, this.dragTime * 0.9);
    }
  }

  animate() {
    this.updateDragTimer();
    if (!this.material) return;
    this.material.uniforms.u_drag_time.value = this.dragTime;
    const e = this.isStatic ? 3000 : performance.now() - this.startTime;
    this.material.uniforms.u_time.value = e;
  }
}

type GlobeInitOptions = {
  antialias?: boolean;
  pauseRotate?: boolean;
  linesOff?: boolean;
  customRevealAnimation?: (() => void) | null;
  opacity?: number;
  ambientIntensity?: number;
  backIntensity?: number;
  frontIntensity?: number;
  globeScale?: number;
  dotDensity?: number;
  dotSize?: number;
  dotSideCount?: number;
  globeAlignment?: 'top' | 'center';
  theme?: string;
  globeColor?: number | THREE.Color;
  dotColor?: number | THREE.Color;
  ambientLight?: number | THREE.Color;
  backLight?: number | THREE.Color;
  frontLight?: number | THREE.Color;
  cameraXBase?: number;
  cameraYBase?: number;
  arcTextures?: string | string[];
  arcColors?: [number, number][];
  arcThicknessMultiplier?: number;
  enableResponsiveSize?: boolean;
  backgroundGradient?: number | null;
  rustGlow?: boolean;
};

export class StripeGlobe {
  el: HTMLElement;
  eastCountryList = eastCountryList;
  westCountryList = westCountryList;
  middleCountryList = middleCountryList;
  liveCountryList = liveCountryList;
  countryList = Object.keys(F);

  origin = new THREE.Vector3(0, 0, 0);
  mouse = new THREE.Vector2();
  isDragging = false;
  isStatic = false;
  isDiscTextureLoaded = false;
  arcTexturesLoaded = 0;
  globeOff = false;
  opacityLoadPercent = 0;
  targetDotOpacityBase = 1;
  targetOpacityBase = 0;
  targetOpacityScrollAmount = 0;
  targetOpacity = 1;
  lineCount = 0;
  linesOff = false;
  scene: THREE.Scene;
  globeRadius: number;
  globeSegments: number;
  isLoaded = false;
  loaded: string[] = [];
  loading: string[] = [];
  isScrolling = false;
  isRevealed = false;
  frame = 0;
  oldRotationY = 0;
  oldRotationX = 0;
  globeRotationIncrement = Ct;
  globeRotationBase = 0;
  globeRotationScrollAmount = 0;
  targetScale = 1;
  scale = 1;
  oldMouseX = 0;
  oldMouseY = 0;
  moveX = 0;
  moveY = 0;
  tension = 1;
  sizeToParent = false;
  arcThicknessMultiplier = 1;
  cameraXBase: number;
  cameraXScrollAmount = 0;
  cameraYBase: number;
  cameraYScrollAmount = 0;
  initialized = false;
  currentLines: Arc[] = [];
  linesInitialized = false;
  backgroundGradientSize = 1;
  backgroundGradientUrl?: string;
  backgroundGradient?: THREE.Sprite;
  rustGlowEnabled = false;
  rustGlow?: THREE.Sprite;
  rustGlowSize = 1;
  initGlobeOptions: Required<
    Pick<
      GlobeInitOptions,
      | 'antialias'
      | 'pauseRotate'
      | 'linesOff'
      | 'customRevealAnimation'
      | 'opacity'
      | 'ambientIntensity'
      | 'backIntensity'
      | 'frontIntensity'
      | 'globeScale'
      | 'dotDensity'
      | 'dotSize'
      | 'dotSideCount'
      | 'globeAlignment'
    >
  >;
  customRevealAnimation: (() => void) | null;
  pauseRotate: boolean;
  globeAlignment: 'top' | 'center';
  globeColorRgb: THREE.Color;
  dotColorRgb: THREE.Color;
  ambientLightColor: THREE.Color;
  backLightColor: THREE.Color;
  frontLightColor: THREE.Color;
  arcTextureUrls: string[];
  arcColors: [THREE.Color, THREE.Color][];
  arcTextures: THREE.Texture[] = [];
  circleTexture: THREE.Texture | null = null;
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.OrthographicCamera;
  globeContainer!: THREE.Object3D;
  globeMap!: THREE.Object3D;
  globeDots!: GlobeDots;
  globeFill!: THREE.Mesh;
  globeFillMaterial!: THREE.MeshBasicMaterial;
  globeFillSphere!: THREE.SphereGeometry;
  linesContainer?: THREE.Object3D;
  ambientLight!: THREE.AmbientLight;
  backLight!: THREE.PointLight;
  frontLight!: THREE.PointLight;
  windowW = 0;
  windowH = 0;
  aspectRatio = 1;
  oldInnerWidth = 0;
  moveGlobeToTopAmount = 0;
  cameraLayoutOffsetX = 0;
  cameraLayoutOffsetY = 0;
  lineInterval?: ReturnType<typeof setInterval>;
  renderAnimationFrame?: number;
  throwAnimationFrame?: number;
  touchStartX = 0;
  touchStartY = 0;
  touchDistanceX = 0;
  touchDistanceY = 0;
  landCountryCoords = new Map<string, [number, number]>();
  landCountryList: string[] = [];
  landLiveCountryList: string[] = [];
  landEastCountryList: string[] = [];
  landWestCountryList: string[] = [];
  landMiddleCountryList: string[] = [];

  constructor(el: HTMLElement, options: GlobeInitOptions = {}) {
    this.el = el;
    this.scene = new THREE.Scene();

    this.initGlobeOptions = {
      antialias: false,
      pauseRotate: false,
      linesOff: false,
      customRevealAnimation: null,
      opacity: qt,
      ambientIntensity: 1,
      backIntensity: 0.2,
      frontIntensity: 0.8,
      globeScale: 1,
      dotDensity: 1,
      dotSize: 1.8,
      dotSideCount: 5,
      globeAlignment: 'center',
    };

    Object.entries(options).forEach(([n, l]) => {
      if (l !== undefined) {
        (this.initGlobeOptions as Record<string, unknown>)[n] = l;
      }
    });

    this.pauseRotate = Boolean(this.initGlobeOptions.pauseRotate);
    this.linesOff = Boolean(this.initGlobeOptions.linesOff);
    this.customRevealAnimation = (options.customRevealAnimation ?? null) as (() => void) | null;
    this.sizeToParent = this.el.hasAttribute('data-js-size-to-parent');

    if (options.enableResponsiveSize !== false) {
      const width = this.sizeToParent ? this.el.offsetWidth : document.documentElement.clientWidth;
      this.globeRadius = J + Math.min(width, Mt) * vt;
    } else {
      this.globeRadius = J + Mt * vt;
    }
    this.globeSegments = Math.floor((this.globeRadius / J) * jt) + Vt;

    const theme = (this.getInitVal('theme', 'White') as string) || 'White';
    this.globeAlignment = this.initGlobeOptions.globeAlignment === 'top' ? 'top' : 'center';

    const posMap: Record<string, { x: number; y: number }> = {
      BottomCenter: { x: -0.4, y: 0.5 },
      BottomRight: { x: -1.05, y: 0.2 },
      WhiteGlove: { x: -0.75, y: 0.55 },
      CryptoAnimation: { x: 0, y: 0.33 },
      Payments: { x: -0.75, y: 0.25 },
      PaymentsAuth: { x: -0.75, y: 0.5 },
      ManagedPayments: { x: -0.5, y: 0.1 },
      ManagedPaymentsMobile: { x: 0, y: 0.1 },
    };
    const globePosition = (options as { globePosition?: string }).globePosition ?? 'BottomRight';
    const pos = posMap[globePosition] ?? { x: 0, y: 0 };

    this.globeColorRgb = this.getInitVal(
      'globeColor',
      theme === 'White' ? new THREE.Color(0xf1f5f5) : new THREE.Color(0x102578),
    ) as THREE.Color;
    this.dotColorRgb = this.getInitVal(
      'dotColor',
      theme === 'White' ? new THREE.Color(0xb3bfff) : new THREE.Color(0x3173a6),
    ) as THREE.Color;
    this.cameraXBase = this.getInitVal('cameraXBase', this.globeRadius * pos.x) as number;
    this.cameraYBase = this.getInitVal('cameraYBase', this.globeRadius * pos.y) as number;

    this.ambientLightColor = this.getInitVal(
      'ambientLight',
      theme === 'White' ? new THREE.Color(0xddddef) : new THREE.Color(0x99bb7c),
    ) as THREE.Color;
    this.backLightColor = this.getInitVal(
      'backLight',
      theme === 'White' ? new THREE.Color(0x221b22) : new THREE.Color(0xc2b2fd),
    ) as THREE.Color;
    this.frontLightColor = this.getInitVal(
      'frontLight',
      theme === 'White' ? new THREE.Color(0x445dcf) : new THREE.Color(0xa1af7f),
    ) as THREE.Color;

    this.scale = this.initGlobeOptions.globeScale;

    if (options.backgroundGradient != null) {
      this.backgroundGradientUrl = BACKGROUND_GRADIENT_URLS[options.backgroundGradient];
    }

    this.rustGlowEnabled = options.rustGlow ?? false;

    if (options.arcTextures) {
      this.arcTextureUrls = Array.isArray(options.arcTextures) ? options.arcTextures : [options.arcTextures];
    } else {
      this.arcTextureUrls = ARC_TEXTURE_URLS;
    }

    this.arcColors = options.arcColors
      ? options.arcColors.map((pair) => [new THREE.Color(pair[0]), new THREE.Color(pair[1])] as [THREE.Color, THREE.Color])
      : ARC_COLORS_DEFAULT.map((pair) => [new THREE.Color(pair[0]), new THREE.Color(pair[1])] as [THREE.Color, THREE.Color]);

    if (options.arcThicknessMultiplier) this.arcThicknessMultiplier = options.arcThicknessMultiplier;
  }

  getInitVal<T>(key: string, fallback: T): T {
    if (Object.prototype.hasOwnProperty.call(this.initGlobeOptions, key)) {
      const val = (this.initGlobeOptions as Record<string, unknown>)[key];
      if (key.includes('Color') && (typeof val === 'number' || typeof val === 'string')) {
        return new THREE.Color(val) as T;
      }
      if (key.includes('camera') && typeof val === 'number') {
        return (this.globeRadius * val) as T;
      }
      return val as T;
    }
    return fallback;
  }

  load() {
    this.loading.push('scene');
    this.el.style.height = '100%';
    this.addRenderer(this.initGlobeOptions.antialias);
    this.addLighting();
    this.addGlobe();
    this.addListeners();
    this.setWindowSize();
    this.addCamera();
    this.objectLoaded('scene');
    return true;
  }

  play() {
    if (this.initialized && !this.isStatic) {
      this.currentLines.forEach((l) => l.play());
      this.drawLines();
    } else {
      this.addLines();
    }
    if (!this.initialized || !this.isStatic) this.render(this.frame);
    this.initialized = true;
  }

  disconnect() {
    clearInterval(this.lineInterval);
    if (this.renderAnimationFrame !== undefined) cancelAnimationFrame(this.renderAnimationFrame);
    if (this.throwAnimationFrame !== undefined) cancelAnimationFrame(this.throwAnimationFrame);
    window.removeEventListener('resize', this.handleResize);
    if (!this.isStatic) {
      window.removeEventListener('mouseup', this.handleMouseUp);
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.el.removeEventListener('touchstart', this.handleTouchStart);
      window.removeEventListener('touchmove', this.handleTouchMove);
      window.removeEventListener('touchend', this.handleMouseUp);
      this.el.removeEventListener('mousedown', this.handleMouseDown);
    }
    this.renderer?.dispose();
    this.el.innerHTML = '';
  }

  addCamera() {
    const t = this.windowH * 0.5;
    const e = -((this.aspectRatio * this.windowH) * 0.5);
    const i = this.globeRadius * 4;
    if (!this.camera) {
      this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 0);
    }
    this.camera.left = e;
    this.camera.right = -e;
    this.camera.top = t;
    this.camera.bottom = -t;
    this.camera.near = -i;
    this.camera.far = i;
    this.shiftCamera();
    this.camera.updateProjectionMatrix();
  }

  shiftCamera() {
    this.camera.position.x = this.cameraXBase + this.cameraXScrollAmount + this.cameraLayoutOffsetX;
    this.camera.position.y =
      this.cameraYBase + this.cameraYScrollAmount + this.cameraLayoutOffsetY;
    if (this.globeAlignment === 'top') {
      this.camera.position.y += this.moveGlobeToTopAmount || 0;
    }
  }

  setWindowSize = () => {
    this.windowW = this.sizeToParent ? this.el.offsetWidth : document.documentElement.clientWidth;
    this.windowH = this.el.offsetHeight || this.el.clientHeight;
    this.aspectRatio = this.windowW / Math.max(this.windowH, 1);
    this.renderer.setSize(this.windowW, this.windowH);
    this.oldInnerWidth = this.windowW;
    if (this.globeAlignment === 'top') {
      this.moveGlobeToTopAmount = -(this.windowH / 2) + this.globeRadius * 0.65;
    }
  };

  handleResize = () => {
    const t = document.documentElement.clientWidth;
    if (this.oldInnerWidth !== t || t > te) {
      this.setWindowSize();
      this.addCamera();
    }
  };

  addRenderer(antialias: boolean) {
    if (this.renderer) this.el.removeChild(this.renderer.domElement);
    this.renderer = new THREE.WebGLRenderer({ antialias, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0xdddde5, 0);
    this.renderer.sortObjects = false;
    this.el.appendChild(this.renderer.domElement);
  }

  addLighting() {
    this.ambientLight = new THREE.AmbientLight(this.ambientLightColor, this.initGlobeOptions.ambientIntensity);
    this.scene.add(this.ambientLight);
    this.backLight = new THREE.PointLight(this.backLightColor, this.initGlobeOptions.backIntensity, 0, 2);
    this.backLight.position.set(-1000, -1100, -3300);
    this.scene.add(this.backLight);
    this.frontLight = new THREE.PointLight(this.frontLightColor, this.initGlobeOptions.frontIntensity, 0, 20);
    this.frontLight.position.set(-3000, 3000, 3300);
    this.scene.add(this.frontLight);
  }

  addGlobe() {
    this.globeContainer = new THREE.Object3D();
    this.scene.add(this.globeContainer);
    this.addGlobeBackgroundGradient();
    this.addGlobeMap();
    this.addGlobeFill();
    this.addGlobeRustGlow();
    this.addGlobeDots();
    this.globeContainer.position.z = -this.globeRadius * 2;
    this.globeContainer.rotation.x = Nt;
    this.globeContainer.rotation.y = this.isStatic ? Wt : Ut;
    const t = this.initGlobeOptions.globeScale;
    this.globeContainer.scale.set(t, t, t);
  }

  addGlobeBackgroundGradient() {
    if (!this.backgroundGradientUrl) return;
    this.loading.push('backgroundGradient');
    const tex = new THREE.TextureLoader().load(this.backgroundGradientUrl, () => {
      this.objectLoaded('backgroundGradient');
    });
    this.backgroundGradientSize = this.globeRadius * 2.8;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      opacity: 0,
      transparent: true,
    });
    mat.depthTest = false;
    this.backgroundGradient = new THREE.Sprite(mat);
    this.backgroundGradient.scale.set(this.backgroundGradientSize, this.backgroundGradientSize, 1);
    this.backgroundGradient.renderOrder = 1;
    this.globeContainer.add(this.backgroundGradient);
  }

  addGlobeRustGlow() {
    if (!this.rustGlowEnabled) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ring halo aligned to globe edge: transparent centre, rust on the outline only.
    const cx = 256;
    const cy = 256;
    const globeEdge = 228;
    const gradient = ctx.createRadialGradient(cx, cy, globeEdge - 10, cx, cy, 256);
    gradient.addColorStop(0, 'rgba(168, 80, 64, 0)');
    gradient.addColorStop(0.45, 'rgba(168, 80, 64, 0.52)');
    gradient.addColorStop(0.75, 'rgba(168, 80, 64, 0.22)');
    gradient.addColorStop(1, 'rgba(123, 45, 38, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.rustGlowSize = this.globeRadius * 2.2;
    this.rustGlow = new THREE.Sprite(mat);
    this.rustGlow.scale.set(this.rustGlowSize, this.rustGlowSize, 1);
    this.rustGlow.renderOrder = 2;
    this.globeMap.add(this.rustGlow);
  }

  addGlobeMap() {
    this.globeMap = new THREE.Object3D();
    this.globeMap.rotation.x = Math.PI;
    this.globeContainer.add(this.globeMap);
  }

  addGlobeDots() {
    this.loading.push('globeDots');
    this.globeDots = new GlobeDots({
      radius: this.globeRadius,
      callback: () => {
        this.buildLandCountryCoords();
        this.objectLoaded('globeDots');
      },
      isStatic: this.isStatic,
      dotColor: this.dotColorRgb,
      dotDensity: this.initGlobeOptions.dotDensity,
      dotSize: this.initGlobeOptions.dotSize,
      dotSideCount: this.initGlobeOptions.dotSideCount,
    });
    this.globeMap.add(this.globeDots);
  }

  buildLandCountryCoords() {
    const imageData = this.globeDots?.imageData;
    if (!imageData) return;

    this.landCountryCoords.clear();
    for (const code of this.countryList) {
      const coords = F[code];
      if (!coords) continue;
      const snapped = snapToLand(coords[0], coords[1], imageData);
      if (snapped) this.landCountryCoords.set(code, snapped);
    }

    this.landCountryList = this.countryList.filter((code) => this.landCountryCoords.has(code));
    this.landLiveCountryList = this.liveCountryList.filter((code) => this.landCountryCoords.has(code));
    this.landEastCountryList = this.eastCountryList.filter((code) => this.landCountryCoords.has(code));
    this.landWestCountryList = this.westCountryList.filter((code) => this.landCountryCoords.has(code));
    this.landMiddleCountryList = this.middleCountryList.filter((code) => this.landCountryCoords.has(code));
  }

  addGlobeFill() {
    this.globeFillMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      color: 0xffffff,
    });
    this.globeFillSphere = new THREE.SphereGeometry(this.globeRadius - 0.1, this.globeSegments, this.globeSegments);
    this.globeFill = new THREE.Mesh(this.globeFillSphere, this.globeFillMaterial);
    this.globeFill.renderOrder = -1;
    this.globeMap.add(this.globeFill);
  }

  addLines() {
    if (this.linesOff) return;
    this.linesInitialized = true;
    this.circleTexture = new THREE.TextureLoader().load(DISC_TEXTURE_URL, () => {
      this.isDiscTextureLoaded = true;
    });
    this.arcTextures = this.arcTextureUrls.map((url) =>
      new THREE.TextureLoader().load(url, () => {
        this.arcTexturesLoaded += 1;
      }),
    );
    this.linesContainer = new THREE.Object3D();
    this.globeContainer.add(this.linesContainer);
    this.drawLines();
  }

  drawLines() {
    if (this.linesOff) return;
    if (!this.linesInitialized) {
      this.addLines();
      return;
    }
    if (!this.isStatic) {
      clearInterval(this.lineInterval);
      this.drawLine();
      this.lineInterval = setInterval(() => {
        if (!this.linesOff) this.drawLine();
      }, ie);
      return;
    }
    if (this.lineCount === 0) {
      for (let t = 0; t < ee; t += 1) this.drawLine();
    }
  }

  drawLine(attempts = 0) {
    if (attempts > 24) return;

    this.lineCount += 1;
    const t = this.resetRevolutions(this.globeContainer.rotation.y);
    const fromList = this.landCountryList.length ? this.landCountryList : this.countryList;
    const liveList = this.landLiveCountryList.length ? this.landLiveCountryList : this.liveCountryList;
    const eastList = this.landEastCountryList.length ? this.landEastCountryList : this.eastCountryList;
    const westList = this.landWestCountryList.length ? this.landWestCountryList : this.westCountryList;
    const middleList = this.landMiddleCountryList.length ? this.landMiddleCountryList : this.middleCountryList;

    let e = fromList[this.lineCount % fromList.length];
    let i = liveList[this.lineCount % liveList.length];

    if (liveList.length > 1) {
      if ((t < 5.7 && t > 4.4) || (t > -2 && t < -0.2)) {
        i = eastList[this.lineCount % eastList.length];
      } else if ((t < 4.2 && t > 2.2) || (t > -4 && t < -1.7)) {
        if ((t < -1.7 && t > -3) || (t > 3 && t < 4.2)) {
          e = eastList[this.lineCount % eastList.length];
        }
        i = westList[this.lineCount % westList.length];
      } else if ((t < 2.2 && t > 0.3) || (t > -6.28 && t < -4)) {
        i = middleList[this.lineCount % middleList.length];
      }
    }

    const s = this.landCountryCoords.get(e);
    const r = this.landCountryCoords.get(i);
    if (!s || !r || e === i) {
      this.drawLine(attempts + 1);
      return;
    }

    const a = this.lineCount % this.arcColors.length;
    const n = this.arcColors[a];

    const arc = new Arc(
      s,
      r,
      n,
      this.arcTextures ? this.arcTextures[a % this.arcTextures.length] : null,
      this.circleTexture,
      this.globeRadius * 1.001 + Math.random() * 0.01,
      this.arcThicknessMultiplier,
      this.isStatic,
      this.targetOpacity,
    );

    this.linesContainer?.add(arc);
    this.currentLines.push(arc);

    if (!this.isStatic) {
      setTimeout(() => {
        this.hideLine(arc);
        const c = this.currentLines.indexOf(arc);
        if (c > -1) this.currentLines.splice(c, 1);
      }, se);
    }
  }

  hideLine(arc: Arc) {
    arc.hideLine();
    setTimeout(() => {
      arc.disposeLine();
      this.linesContainer?.remove(arc);
    }, 1500);
  }

  objectLoaded(key = 'x') {
    this.loaded.push(key);
    if (this.loaded.length === this.loading.length) this.isLoaded = true;
  }

  resetRevolutions(val: number) {
    if (Math.abs(val / Z) === 0) return val;
    const e = Math.floor(Math.abs(val / Z)) * Math.sign(val);
    return val - e * Z;
  }

  addListeners() {
    window.addEventListener('resize', this.handleResize);
    if (!this.isStatic) {
      window.addEventListener('mouseup', this.handleMouseUp);
      window.addEventListener('mousemove', this.handleMouseMove);
      this.el.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      window.addEventListener('touchmove', this.handleTouchMove);
      window.addEventListener('touchend', this.handleMouseUp);
      this.el.addEventListener('mousedown', this.handleMouseDown);
    }
  }

  handleDragStart = () => {
    this.globeDots.startDragging();
    this.isDragging = true;
    this.oldRotationX = this.globeContainer.rotation.x;
    this.oldRotationY = this.globeRotationBase;
    this.targetScale = this.isStatic ? 1 : 0.98;
    document.documentElement.classList.add('is-globe-dragging');
    this.el.classList.add('is-dragging');
  };

  handleTouchStart = (ev: TouchEvent) => {
    const e = ev.touches[0] || ev.changedTouches[0];
    this.oldMouseX = this.mouse.x = this.touchStartX = e.pageX;
    this.oldMouseY = this.mouse.y = this.touchStartY = e.pageY;
    this.handleDragStart();
  };

  handleMouseMove = (ev: MouseEvent) => {
    this.mouse.x = ev.clientX;
    this.mouse.y = ev.clientY;
    this.handleDragging();
  };

  handleTouchMove = (ev: TouchEvent) => {
    const e = ev.touches[0] || ev.changedTouches[0];
    this.touchDistanceX = Math.abs(this.touchStartX - e.pageX);
    this.touchDistanceY = Math.abs(this.touchStartY - e.pageY);
    if (this.touchDistanceY > this.touchDistanceX) return;
    this.mouse.x = e.pageX;
    this.mouse.y = e.pageY;
    this.handleDragging();
  };

  handleMouseUp = () => {
    setTimeout(() => {
      document.documentElement.classList.remove('is-globe-dragging');
      this.el.classList.remove('is-dragging');
    }, 20);
    this.isDragging = false;
    if (this.moveX !== 0 || Math.abs(this.moveY) > 0) this.throwGlobe(this.moveX, this.moveY);
    this.oldMouseX = this.oldMouseY = this.moveX = this.moveY = 0;
    this.targetScale = 1;
    this.globeDots.stopDragging();
  };

  handleMouseDown = (ev: MouseEvent) => {
    document.documentElement.classList.add('is-globe-dragging');
    this.oldMouseX = ev.clientX;
    this.oldMouseY = ev.clientY;
    this.handleDragStart();
  };

  handleDragging = () => {
    if (!this.isDragging) return;
    this.tension = 1 + Math.abs(this.oldRotationX);
    this.moveX = (this.oldMouseX - this.mouse.x) * xt;
    this.moveY = (this.oldMouseY - this.mouse.y) * xt / this.tension;
    const newY = this.resetRevolutions(this.oldRotationY + this.moveX);
    const newX = Math.max(_t, Math.min(Rt, this.oldRotationX + this.moveY));
    this.globeContainer.rotation.y = newY;
    this.globeRotationBase = newY;
    this.globeContainer.rotation.x = newX;
    this.oldRotationY = newY;
    this.oldRotationX = newX;
    this.oldMouseX = this.mouse.x;
    this.oldMouseY = this.mouse.y;
  };

  throwGlobe(vx: number, vy: number) {
    const i = vx * St;
    const s = vy * St;
    const r = this.resetRevolutions(this.globeRotationBase + i);
    const a = Math.max(_t, Math.min(Rt, this.globeContainer.rotation.x + s));
    this.globeRotationBase = r;
    this.globeContainer.rotation.x = a;
    if ((Math.abs(i) > 0.001 || Math.abs(s) > 0.001) && !this.isDragging) {
      this.throwAnimationFrame = requestAnimationFrame(() => this.throwGlobe(i, s));
    }
  }

  revealAnimation() {
    const t = this.isStatic ? 1 : easeOutQuart(Math.min(1, this.opacityLoadPercent));
    this.opacityLoadPercent += Ht;
    this.targetOpacityBase = t * this.initGlobeOptions.opacity;
    this.globeRotationIncrement = (1 - t) * Ct + Kt;
    if (t > 0.999) this.isRevealed = true;
  }

  autoRotateGlobe() {
    if (this.isDragging || this.isScrolling || this.isStatic || this.pauseRotate) return;
    this.globeRotationBase -= this.globeRotationIncrement;
    this.globeContainer.rotation.y = this.globeRotationBase + this.globeRotationScrollAmount;
  }

  updateGlobeScale() {
    if (Math.abs(this.scale - this.targetScale) > 0.001) {
      this.scale -= 0.1 * (this.scale - this.targetScale);
      this.globeFill.scale.set(this.scale, this.scale, this.scale);
      if (this.backgroundGradientUrl && this.backgroundGradient) {
        const t = (1 + (1 - this.scale) * 2) * this.backgroundGradientSize;
        this.backgroundGradient.scale.set(t, t, 1);
      }
      if (this.rustGlow) {
        const t = (1 + (1 - this.scale) * 2) * this.rustGlowSize;
        this.rustGlow.scale.set(t, t, 1);
      }
    }
  }

  updateGlobeOpacity() {
    this.targetOpacity = Math.max(0, (this.targetOpacityBase || 0) + this.targetOpacityScrollAmount);
    const dotOpacity = Math.max(0, this.targetDotOpacityBase + this.targetOpacityScrollAmount);
    const fillReveal = u_opacity > 0 ? Math.min(1, (this.targetOpacityBase || 0) / u_opacity) : 1;
    this.globeFillMaterial.opacity = 0.2 * fillReveal;
    if (this.backgroundGradient) {
      (this.backgroundGradient.material as THREE.SpriteMaterial).opacity = this.targetOpacity;
    }
    if (this.rustGlow) {
      (this.rustGlow.material as THREE.SpriteMaterial).opacity = 0.1 * fillReveal;
    }
    if (this.globeDots.material) {
      this.globeDots.material.uniforms.u_opacity_factor.value = dotOpacity;
    }
    this.currentLines.forEach((line) => {
      line.material.uniforms.u_alpha.value = this.targetOpacity;
      line.circleMaterial1.opacity = this.targetOpacity;
      line.circleMaterial2.opacity = this.targetOpacity;
    });
  }

  render(t = 0) {
    this.frame = t;
    this.autoRotateGlobe();
    this.updateGlobeScale();
    this.updateGlobeOpacity();

    if (!this.globeOff && this.isLoaded) {
      this.globeDots.animate();
      if (!this.isRevealed) {
        if (this.customRevealAnimation) this.customRevealAnimation();
        else this.revealAnimation();
      }
      this.renderer.render(this.scene, this.camera);
    }

    this.renderAnimationFrame = requestAnimationFrame(() => {
      if (
        this.isRevealed &&
        this.isStatic &&
        this.arcTexturesLoaded === this.arcTextures.length &&
        this.isDiscTextureLoaded
      ) {
        this.renderer.render(this.scene, this.camera);
        return;
      }
      this.render(t + 1);
    });
  }
}

const BREAKPOINTS = [
  { breakpoint: 671, value: 230 },
  { breakpoint: 900, value: 70 },
  { breakpoint: Infinity, value: 0 },
];

export class EnterpriseGlobeController {
  el: HTMLElement;
  globe: StripeGlobe | null = null;
  opacityScrollAmount = 0;
  targetOpacityScrollAmount = 0;
  translateXAmount = 0;
  targetTranslateXAmount = 0;
  translateYAmount = 0;
  targetTranslateYAmount = 0;
  lastTick = 0;
  globeYPosModifier = 0;
  hasLoadingStarted = false;
  canAnimate = false;
  animatedScrollHeight = 0;
  observer?: IntersectionObserver;
  revealFrame?: number;
  scrollFrame?: number;

  constructor(mountEl: HTMLElement) {
    this.el = mountEl;
  }

  connect() {
    if (this.hasLoadingStarted) return;
    this.hasLoadingStarted = true;

    const globeOptions: GlobeInitOptions & { globePosition?: string } = {
      globePosition: 'BottomCenter',
      theme: 'White',
      dotColor: 0x635fff,
      dotDensity: 1,
      opacity: u_opacity,
      linesOff: true,
      customRevealAnimation: this.customRevealAnimation.bind(this),
      globeAlignment: 'top',
      ambientLight: 0xffffff,
      ambientIntensity: 1.3,
      backLight: 0x004925,
      backIntensity: 1,
      frontLight: 0x7a7fff,
      frontIntensity: 1,
      arcColors: ARC_COLORS_ENTERPRISE,
      arcTextures: ARC_TEXTURE_URLS,
      arcThicknessMultiplier: 1.3333,
      rustGlow: true,
    };

    this.globe = new StripeGlobe(this.el, globeOptions);
    this.globe.load();
    this.globe.play();

    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.globe?.isStatic) {
              this.canAnimate = true;
              this.animate();
            }
            window.addEventListener('scroll', this.handleScroll, { passive: true });
          } else {
            this.canAnimate = false;
            window.removeEventListener('scroll', this.handleScroll);
          }
        });
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this.el);
    this.runRevealSequence();
    this.handleScroll();
  }

  runRevealSequence() {
    const start = performance.now();
    const tick = () => {
      if (!this.globe) return;
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / i_dur);

      const scale = R_scaleStart * GLOBE_SIZE_SCALE + (C_scaleEnd * GLOBE_SIZE_SCALE - R_scaleStart * GLOBE_SIZE_SCALE) * t;
      this.globe.globeContainer.scale.set(scale, scale, scale);

      this.globe.cameraXBase = this.globe.globeRadius * (G_camX + (v_camX - G_camX) * t);
      this.globe.shiftCamera();

      this.updateCameraYBase(cubicBezier4(0.3, 0.5, 0.5, 1, t));

      if (elapsed > i_dur * d_delay) {
        const opT = Math.min(1, (elapsed - i_dur * d_delay) / (i_dur * L_remain));
        this.globe.targetOpacityBase = opT * u_opacity;
      }

      if (this.globe.globeDots.material) {
        this.globe.globeDots.material.uniforms.u_z_offset_factor.value = I_dotZ + (N_dotZ - I_dotZ) * t;
      }

      if (elapsed > 2000 && this.globe.linesOff) {
        this.globe.linesOff = false;
        this.globe.addLines();
      }

      if (t < 1) this.revealFrame = requestAnimationFrame(tick);
    };
    this.revealFrame = requestAnimationFrame(tick);
  }

  customRevealAnimation() {
    if (!this.globe) return;
    const t = this.globe.isStatic ? 1 : easeOutQuart(Math.min(1, this.globe.opacityLoadPercent));
    this.globe.opacityLoadPercent += E_inc;
    this.globe.targetDotOpacityBase = t * this.globe.initGlobeOptions.opacity;
    this.globe.globeRotationIncrement = (1 - t) * T_rot + S_rot;
    if (t > 0.999) this.globe.isRevealed = true;
  }

  handleResize = () => {
    this.animatedScrollHeight = this.el.clientHeight * 0.4;
    for (const bp of BREAKPOINTS) {
      if (window.innerWidth < bp.breakpoint) {
        this.globeYPosModifier = bp.value;
        break;
      }
    }
    this.updateGlobeLayoutOffset();
    if (this.globe?.isRevealed) this.updateCameraYBase(1);
    this.handleScroll();
    this.globe?.handleResize();
  };

  updateGlobeLayoutOffset() {
    if (!this.globe) return;
    this.globe.cameraLayoutOffsetX = this.el.clientWidth * GLOBE_LAYOUT_OFFSET_X;
    this.globe.cameraLayoutOffsetY = this.el.clientHeight * GLOBE_LAYOUT_OFFSET_Y;
    this.globe.shiftCamera();
  }

  updateCameraYBase(t: number) {
    if (!this.globe) return;
    this.globe.cameraYBase =
      B_camY +
      this.globeYPosModifier +
      this.globe.globeRadius * y_camY * (Math.sin(2 * Math.PI * (t - 0.25)) + 1) / 2;
    this.globe.shiftCamera();
  }

  handleScroll = () => {
    if (!this.globe) return;
    const rect = this.el.getBoundingClientRect();
    const scrolledInto = Math.max(0, -rect.top);
    let t = scrolledInto / this.animatedScrollHeight;
    t = Math.max(0, Math.min(1, t));

    this.targetTranslateXAmount = this.globe.globeRadius * D_scrollX * t;
    this.targetTranslateYAmount = this.globe.globeRadius * P_scrollY * t;
    this.globe.globeRotationScrollAmount = x_scrollRot * t;

    let t2 = (t - 0.5) * 2;
    if (t2 < 0) t2 = 0;
    this.targetOpacityScrollAmount = t2 * -(1 - w_opacity);
  };

  animate = () => {
    const now = Date.now();
    if (this.globe && now - this.lastTick > 15) {
      this.lastTick = now;
      this.translateXAmount += (this.targetTranslateXAmount - this.translateXAmount) * a_lerp;
      this.globe.cameraXScrollAmount = this.translateXAmount;
      this.translateYAmount += (this.targetTranslateYAmount - this.translateYAmount) * a_lerp;
      this.globe.cameraYScrollAmount = this.translateYAmount;
      this.globe.shiftCamera();
      this.opacityScrollAmount += (this.targetOpacityScrollAmount - this.opacityScrollAmount) * a_lerp;
      this.globe.targetOpacityScrollAmount = this.opacityScrollAmount;
    }
    if (this.canAnimate) this.scrollFrame = requestAnimationFrame(this.animate);
  };

  disconnect() {
    if (this.revealFrame !== undefined) cancelAnimationFrame(this.revealFrame);
    if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);
    this.observer?.disconnect();
    this.globe?.disconnect();
    this.globe = null;
  }
}
