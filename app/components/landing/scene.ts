import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type SceneInput = {
  progress: number;
  pointerX: number;
  pointerY: number;
  motion: boolean;
};
export type SceneController = {
  update: (input: SceneInput) => void;
  dispose: () => void;
};

/** Original procedural artwork. No external models, images, destinations, or contact data. */
export function createCarScene(
  host: HTMLElement,
  onUnavailable: () => void,
): SceneController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      window.innerWidth < 700 ? 1.25 : 1.6,
    ),
  );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "journey-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xfffbed, 0x729480, 3));
  const sun = new THREE.DirectionalLight(0xfff2d8, 5);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd7fff2, 2.2);
  fill.position.set(-5, 3, -2);
  scene.add(fill);

  const material = (color: number, roughness = 0.75) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
  const mint = material(0xa7ddb4),
    green = material(0x184b3b),
    glass = material(0x254d47, 0.25);
  const cream = material(0xf6ecd7),
    coral = material(0xdb7963),
    rubber = material(0x24342e);
  const white = material(0xfff9e8),
    lime = material(0xd5f275),
    soil = material(0xdbb795);
  const road = material(0xe8dfc8),
    foliage = material(0x527e4e),
    pale = material(0xd6dabc);
  const box = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    radius = 0.1,
  ) => {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3)),
      mat,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const put = <T extends THREE.Object3D>(
    parent: THREE.Object3D,
    mesh: T,
    x: number,
    y: number,
    z: number,
  ): T => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const sphere = (radius: number, mat: THREE.Material) =>
    new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12), mat);

  put(world, box(6.6, 0.38, 4.6, pale, 0.18), 0, -0.18, 0);
  put(world, box(6.3, 0.055, 2.65, road, 0.02), 0, 0.035, 0.4);
  put(world, box(6.25, 0.07, 0.28, white, 0.03), 0, 0.065, -1.06);
  for (let x = -2.65; x < 3; x += 1.05)
    put(world, box(0.48, 0.014, 0.06, white, 0.01), x, 0.075, 1.25);
  // A warm little building and gate establish the parking story without a giant background asset.
  put(world, box(2.05, 1.8, 0.65, cream, 0.12), -0.75, 0.9, -1.72);
  put(world, box(2.28, 0.2, 0.85, coral, 0.08), -0.75, 1.85, -1.72);
  put(world, box(0.62, 1.22, 0.07, green, 0.1), -1.05, 0.64, -1.36);
  put(world, box(0.55, 0.64, 0.07, mint, 0.04), -0.12, 1.05, -1.36);
  put(world, box(0.04, 0.64, 0.08, white, 0.01), -0.12, 1.05, -1.31);
  put(world, box(0.55, 0.04, 0.08, white, 0.01), -0.12, 1.05, -1.31);
  for (const x of [0.65, 2.2])
    put(world, box(0.16, 0.82, 0.18, cream, 0.03), x, 0.44, -1.63);
  for (let x = 0.8; x < 2.2; x += 0.21)
    put(world, box(0.055, 0.67, 0.06, green, 0.01), x, 0.43, -1.63);
  put(world, box(1.64, 0.07, 0.08, green, 0.015), 1.42, 0.77, -1.63);
  function tree(x: number, z: number, scale: number) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);
    put(
      group,
      new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 8), soil),
      0,
      0.35,
      0,
    );
    put(
      group,
      new THREE.Mesh(new THREE.IcosahedronGeometry(0.47, 1), foliage),
      0,
      0.95,
      0,
    );
    put(
      group,
      new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 1), mint),
      0.16,
      1.16,
      0.02,
    );
    put(world, group, x, 0.05, z);
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }
  tree(-2.55, -1.46, 1.1);
  tree(2.65, -1.4, 1.18);
  for (const [x, z] of [
    [-2.8, 1.65],
    [2.6, 1.65],
  ]) {
    put(
      world,
      new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.35, 18), coral),
      x,
      0.2,
      z,
    );
    for (let i = 0; i < 3; i++)
      put(
        world,
        sphere(0.16, foliage),
        x + (i - 1) * 0.12,
        0.48 + (i % 2) * 0.1,
        z,
      );
  }

  const car = new THREE.Group();
  world.add(car);
  put(car, box(3.45, 0.7, 1.53, mint, 0.2), 0, 0.8, 0);
  put(car, box(3.05, 0.12, 1.54, green, 0.04), 0, 0.49, 0);
  put(car, box(1.0, 0.18, 1.43, mint, 0.07), 1.1, 1.13, 0);
  const cabin = new THREE.Shape();
  cabin.moveTo(-1.16, 1.08);
  cabin.lineTo(-0.91, 1.95);
  cabin.quadraticCurveTo(-0.86, 2.02, -0.7, 2.02);
  cabin.lineTo(0.28, 2.02);
  cabin.quadraticCurveTo(0.43, 2.02, 0.5, 1.9);
  cabin.lineTo(0.98, 1.08);
  cabin.closePath();
  const cabinGeometry = new THREE.ExtrudeGeometry(cabin, {
    depth: 1.3,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  put(car, new THREE.Mesh(cabinGeometry, mint), 0, 0, -0.65);
  const windowShape = new THREE.Shape();
  windowShape.moveTo(-0.98, 1.22);
  windowShape.lineTo(-0.8, 1.86);
  windowShape.quadraticCurveTo(-0.78, 1.9, -0.69, 1.9);
  windowShape.lineTo(0.22, 1.9);
  windowShape.lineTo(0.65, 1.22);
  windowShape.closePath();
  const windowMaterial = glass.clone();
  windowMaterial.side = THREE.DoubleSide;
  for (const z of [-0.702, 0.702]) {
    put(
      car,
      new THREE.Mesh(new THREE.ShapeGeometry(windowShape), windowMaterial),
      0,
      0,
      z,
    );
    put(car, box(0.075, 0.65, 0.025, mint, 0.01), -0.22, 1.55, z * 1.015);
    put(car, box(0.24, 0.04, 0.04, cream, 0.012), -0.45, 1.08, z * 1.09);
    put(car, box(0.2, 0.13, 0.13, mint, 0.035), 0.64, 1.39, z * 1.22);
  }
  const windshield = put(car, box(0.045, 0.78, 1.16, glass, 0.01), 0.7, 1.6, 0);
  windshield.rotation.z = 0.49;
  put(car, box(0.95, 0.09, 1.25, mint, 0.035), -0.28, 2.05, 0);
  const wheels: THREE.Group[] = [];
  for (const x of [-1.05, 1.1])
    for (const z of [-0.77, 0.77]) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.25, 28),
        rubber,
      );
      tire.rotation.x = Math.PI / 2;
      wheel.add(tire);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.26, 20),
        cream,
      );
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);
      const center = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.27, 16),
        green,
      );
      center.rotation.x = Math.PI / 2;
      wheel.add(center);
      put(car, wheel, x, 0.43, z);
      wheels.push(wheel);
    }
  for (const z of [-0.49, 0.49]) {
    put(car, box(0.08, 0.22, 0.34, white, 0.05), 1.73, 0.91, z);
    put(car, box(0.06, 0.22, 0.21, coral, 0.03), -1.73, 0.91, z);
  }
  put(car, box(0.08, 0.15, 1.25, cream, 0.04), 1.77, 0.63, 0);
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.78, 0.84, -0.26),
    new THREE.Vector3(1.8, 0.77, 0),
    new THREE.Vector3(1.78, 0.84, 0.26),
  ]);
  car.add(
    new THREE.Mesh(new THREE.TubeGeometry(smile, 16, 0.018, 6, false), green),
  );

  const textures: THREE.Texture[] = [];
  function qrTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#fffbed";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#194d3d";
    // Deliberately illustrative pattern, never a real tag or contact URL.
    const finder = (x: number, y: number) => {
      ctx.fillRect(x, y, 64, 64);
      ctx.fillStyle = "#fffbed";
      ctx.fillRect(x + 10, y + 10, 44, 44);
      ctx.fillStyle = "#194d3d";
      ctx.fillRect(x + 20, y + 20, 24, 24);
    };
    finder(20, 20);
    finder(172, 20);
    finder(20, 172);
    for (let y = 20; y < 236; y += 12)
      for (let x = 20; x < 236; x += 12) {
        if ((x < 92 && y < 92) || (x > 160 && y < 92) || (x < 92 && y > 160))
          continue;
        if ((x * 13 + y * 7) % 31 > 14) ctx.fillRect(x, y, 10, 10);
      }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  }
  const qr = qrTexture();
  const sticker = put(
    car,
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.31, 0.31),
      new THREE.MeshBasicMaterial({ map: qr, side: THREE.DoubleSide }),
    ),
    0.9,
    1.45,
    0.35,
  );
  sticker.rotation.y = Math.PI / 2;
  sticker.rotation.x = -0.48;

  const phone = new THREE.Group();
  put(phone, box(0.78, 1.47, 0.13, green, 0.12), 0, 0, 0);
  put(phone, box(0.66, 1.27, 0.02, white, 0.08), 0, 0, 0.077);
  put(
    phone,
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ map: qr }),
    ),
    0,
    0.07,
    0.092,
  );
  put(phone, box(0.3, 0.07, 0.02, lime, 0.02), 0, -0.44, 0.1);
  put(phone, box(0.18, 0.025, 0.02, green, 0.01), 0, 0.56, 0.1);
  put(world, phone, 1.85, 1.9, 1.4);
  phone.rotation.y = -0.35;

  const visitor = new THREE.Group();
  put(visitor, sphere(0.16, soil), 0, 1.15, 0);
  put(visitor, box(0.33, 0.49, 0.24, coral, 0.1), 0, 0.73, 0);
  for (const x of [-0.1, 0.1])
    put(visitor, box(0.115, 0.4, 0.13, green, 0.04), x, 0.3, 0);
  const arm = put(
    visitor,
    box(0.12, 0.39, 0.13, soil, 0.045),
    0.25,
    0.83,
    0.03,
  );
  arm.rotation.z = -0.6;
  put(world, visitor, 2.0, 0.05, 0.95);

  // Soft ground contact stays visible even on devices with simpler shadow support.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.7, 64),
    new THREE.MeshBasicMaterial({
      color: 0x486545,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.65;
  shadow.position.y = -0.41;
  scene.add(shadow);
  world.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  let input: SceneInput = {
    progress: 0,
    pointerX: 0,
    pointerY: 0,
    motion: true,
  };
  let frame = 0,
    disposed = false,
    visible = true,
    current = 0,
    last = 0;
  const target = new THREE.Vector3();
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    schedule();
  });
  function schedule() {
    if (!frame && !disposed && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    current = input.motion
      ? THREE.MathUtils.damp(current, input.progress, 5, delta || 0.016)
      : input.progress;
    const t = input.motion ? now * 0.001 : 0;
    const chapter = Math.min(4, Math.max(0, Math.round(current)));
    const departure = THREE.MathUtils.smoothstep(current, 3.35, 4);
    const arrival = 1 - THREE.MathUtils.smoothstep(current, 0, 0.6);
    car.position.x = -arrival * 0.65 + departure * 3.9;
    car.position.y = input.motion ? Math.sin(t * 1.7) * 0.012 : 0;
    car.rotation.y = -0.08 + Math.sin(current * 1.4) * 0.04;
    for (const wheel of wheels) wheel.rotation.z = -car.position.x * 2.2;
    phone.visible = current > 0.55 && current < 3.65;
    phone.scale.setScalar(THREE.MathUtils.clamp((current - 0.55) * 2, 0, 1));
    phone.position.y = 1.95 + (input.motion ? Math.sin(t * 1.3) * 0.06 : 0);
    phone.rotation.y = -0.35 + (input.motion ? Math.sin(t * 0.6) * 0.06 : 0);
    visitor.visible = current > 0.65 && current < 3.55;
    visitor.position.x =
      2.15 - THREE.MathUtils.smoothstep(current, 0.65, 1.1) * 0.2;
    const angle =
      0.73 - Math.sin(current * 0.85) * 0.19 + input.pointerX * 0.085;
    const distance = camera.aspect < 0.8 ? 12.6 : 10.7;
    camera.position.set(
      Math.sin(angle) * distance,
      5.2 + input.pointerY * 0.2,
      Math.cos(angle) * distance,
    );
    target.set(chapter === 4 ? 0.35 : 0, 0.65, 0);
    camera.lookAt(target);
    world.rotation.z = input.pointerX * 0.007;
    renderer.render(scene, camera);
    if (input.motion || Math.abs(current - input.progress) > 0.002) schedule();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    },
    { rootMargin: "120px" },
  );
  observer.observe(host);
  resize.observe(host);
  const visibility = () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  document.addEventListener("visibilitychange", visibility);
  const lost = (event: Event) => {
    event.preventDefault();
    onUnavailable();
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  schedule();
  return {
    update(next) {
      input = next;
      schedule();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const mat of materials) mat.dispose();
      for (const texture of textures) texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
