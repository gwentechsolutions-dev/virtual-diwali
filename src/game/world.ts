import { Engine, Scene, Color3, Color4, Vector3, ArcRotateCamera, HemisphericLight, DirectionalLight, PointLight, MeshBuilder, StandardMaterial, PBRMaterial, DynamicTexture, Texture, Mesh, TransformNode, GlowLayer, ShadowGenerator, SceneLoader, type AssetContainer, type InstantiatedEntries } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { FireworkVisual } from "./fireworks";
import { FestivalAudio } from "./audio";
import {shopkeepers} from '../../shared/shopkeepers';
import {ShopPresentation} from './shopPresentation';
import {
  outfits,
  zones,
  fireworks,
  type Snapshot,
  type PublicPlayer,
} from "../../shared/catalog";
type Actor = {
  root: TransformNode;
  model: InstantiatedEntries;
  current: string;
  outfit: string;
  materials: (StandardMaterial | PBRMaterial)[];
  label?: Mesh;
  gesture: string;
  animationWeights?: Map<string, number>;
  activeClip?: string;
};
export class FestivalWorld {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  audio = new FestivalAudio();
  snapshot?: Snapshot;
  selfId = "";
  offset = 0;
  keys = new Set<string>();
  stick = { x: 0, y: 0 };
  lookStick={x:0,y:0};
  touchRun=false;
  mobile=matchMedia('(pointer: coarse)').matches||innerWidth<=700;
  glow:GlowLayer;
  inputBlocked = false;
  reduced = false;
  quality = "high";
  volume = 0.35;
  onInteract = () => {};
  onShortcut = (key: string) => {};
  onInput = (dx: number, dz: number, run: boolean) => {};
  onStatus = (s: string) => {};
  onStats = (fps: number) => {};
  actors = new Map<string, Actor>();
  templates = new Map<string, AssetContainer>();
  templateLoads = new Map<string, Promise<AssetContainer>>();
  effects = new Map<string, FireworkVisual>();
  shopPresentations=new Map<string,ShopPresentation>();
  disposed = false;
  preview = false;
  previewOutfit = "";
  placement?: Mesh;
  placeItem = "";
  lastSend = 0;
  lastStats = 0;
  lastAmbient = -10000;
  start = performance.now();
  lampMaterials: StandardMaterial[] = [];
  shadows: ShadowGenerator;
  fireworkLights: PointLight[] = [];
  loading = new Set<string>();
  constructor(
    public canvas: HTMLCanvasElement,
    preview = false,
  ) {
    this.preview = preview;
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    // Skinned PBR materials can exceed the driver's uniform-block limit even
    // when ordinary uniform capacity is sufficient (12 blocks on test GPU).
    this.engine.disableUniformBuffers=true;
    if(this.mobile)this.engine.maxFPS=30;
    this.scene = new Scene(this.engine);
    // Keep Babylon's BRDF lookup in its original RGBD form. PBR shaders decode
    // it directly, avoiding the asynchronous GPU conversion surviving disposal
    // of the short-lived onboarding preview scene.
    const brdf=new Texture('/assets/lighting/environment-brdf.png',this.scene,true,false,Texture.BILINEAR_SAMPLINGMODE);
    brdf.isRGBD=true;
    brdf.wrapU=Texture.CLAMP_ADDRESSMODE;brdf.wrapV=Texture.CLAMP_ADDRESSMODE;
    this.scene.environmentBRDFTexture=brdf;
    this.scene.clearColor = new Color4(0.055, 0.075, 0.12, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = preview ? 0 : 0.011;
    this.scene.fogColor = new Color3(0.07, 0.09, 0.14);
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      1.12,
      preview ? 4.2 : 35,
      new Vector3(0, preview ? 1 : 3, preview ? 0 : 7),
      this.scene,
    );
    this.camera.lowerRadiusLimit = preview ? 2.2 : 3;
    this.camera.upperRadiusLimit = preview ? 6 : 24;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = preview ? 1.43 : 2.6;
    this.camera.wheelPrecision = 25;
    this.camera.panningSensibility = 0;
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    this.camera.minZ = 0.15;
    this.camera.checkCollisions = true;
    this.camera.collisionRadius = new Vector3(0.4, 0.4, 0.4);
    this.scene.onBeforeCameraRenderObservable.add(camera=>{
      if(camera===this.camera&&!this.preview){
        // Looking upward must raise the aim point rather than push the
        // orbiting camera underneath the road.
        const floor=.7-this.camera.radius*Math.cos(this.camera.beta);
        this.camera.target.y=Math.max(this.camera.target.y,floor);
      }
    });
    this.scene.collisionsEnabled = true;
    const hemi = new HemisphericLight("sky", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.65;
    hemi.diffuse = new Color3(0.65, 0.73, 1);
    hemi.groundColor = new Color3(0.23, 0.13, 0.09);
    const sun = new DirectionalLight(
      "moon",
      new Vector3(-0.4, -1, 0.3),
      this.scene,
    );
    sun.intensity = 0.7;
    sun.diffuse = new Color3(1, 0.78, 0.53);
    sun.position = new Vector3(12, 25, -10);
    this.shadows = new ShadowGenerator(this.mobile?512:1024, sun);
    this.shadows.useBlurExponentialShadowMap = true;
    this.shadows.blurKernel = 12;
    const glow = new GlowLayer("festival-glow", this.scene, {
      blurKernelSize: 32,
    });
    this.glow=glow;
    glow.intensity = 0.35;
    // Keep light topology stable: event creation/disposal must not continually
    // invalidate every world material's shader during asynchronous compilation.
    for(let i=0;i<2;i++) {
      const light=new PointLight('festival-flash-'+i,new Vector3(0,2,15),this.scene);
      light.intensity=0;light.range=24;light.renderPriority=10;
      this.fireworkLights.push(light);
    }
    if (!preview) this.buildNeighborhood();
    else {
      const ground = MeshBuilder.CreateDisc(
        "preview-stage",
        { radius: 2.5, tessellation: 64 },
        this.scene,
      );
      ground.rotation.x = Math.PI / 2;
      ground.material = this.mat("preview-floor", "#28323d");
    }
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    window.addEventListener("resize", this.resize);
    this.engine.runRenderLoop(() => this.frame());
  }
  mat(name: string, color: string, emissive = 0) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = new Color3(0.08, 0.08, 0.08);
    m.emissiveColor = m.diffuseColor.scale(emissive);
    return m;
  }
  box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: StandardMaterial | PBRMaterial,
    collision = false,
  ) {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      this.scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.checkCollisions = collision;
    mesh.receiveShadows = true;
    return mesh;
  }
  tube(name: string, points: Vector3[], radius: number, mat: StandardMaterial) {
    const mesh = MeshBuilder.CreateTube(
      name,
      { path: points, radius, tessellation: 6 },
      this.scene,
    );
    mesh.material = mat;
    return mesh;
  }
  sign(
    text: string,
    sub: string,
    x: number,
    y: number,
    z: number,
    w: number,
    color = "#382329",
  ) {
    const t = new DynamicTexture(
      "sign-" + text,
      { width: 1024, height: 256 },
      this.scene,
      false,
    );
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    c.fillStyle = color;
    c.fillRect(0, 0, 1024, 256);
    c.fillStyle = "#f7d796";
    c.textAlign = "center";
    let fontSize=72;
    do{c.font=`bold ${fontSize}px "Nirmala UI", serif`;fontSize-=1;}while(c.measureText(text).width>920&&fontSize>20);
    c.fillText(text, 512, 108);
    fontSize=32;
    do{c.font=`${fontSize}px "Segoe UI", sans-serif`;fontSize-=1;}while(c.measureText(sub).width>920&&fontSize>16);
    c.fillText(sub, 512, 183);
    t.update();
    const m = this.mat("sign", "#ffffff", 0.25);
    m.diffuseTexture = t;
    m.emissiveTexture = t;
    const p = MeshBuilder.CreatePlane(
      text,
      { width: w, height: w / 4 },
      this.scene,
    );
    p.position.set(x, y, z);
    p.material = m;
    return p;
  }
  buildNeighborhood() {
    const road = new PBRMaterial("asphalt", this.scene);
    road.albedoTexture = new Texture("/assets/asphalt-diffuse.jpg", this.scene);
    road.bumpTexture = new Texture("/assets/asphalt-normal.jpg", this.scene);
    road.metallicTexture = new Texture(
      "/assets/asphalt-roughness.jpg",
      this.scene,
    );
    road.useRoughnessFromMetallicTextureGreen = true;
    road.useRoughnessFromMetallicTextureAlpha = false;
    road.metallic = 0;
    road.roughness = 0.9;
    for (const t of [
      road.albedoTexture,
      road.bumpTexture,
      road.metallicTexture,
    ]) {
      (t as Texture).uScale = 12;
      (t as Texture).vScale = 18;
    }
    const curb = this.mat("stone", "#8e8170"),
      cream = this.mat("limewash", "#c1a88a"),
      terracotta = this.mat("terracotta", "#8c5044"),
      teal = this.mat("painted-teal", "#466b69"),
      wood = this.mat("teak", "#51362c"),
      dark = this.mat("iron", "#27303a"),
      gold = this.mat("brass", "#c49a50"),
      leaf = this.mat("banana-leaf", "#3b6441");
    for (const m of [cream, terracotta, teal]) {
      const texture = new Texture("/assets/plaster-diffuse.jpg", this.scene);
      texture.uScale = 3;
      texture.vScale = 2;
      m.diffuseTexture = texture;
    }
    this.box("street", 0, -0.16, 5, 47, 0.3, 70, road);
    this.box(
      "celebration-paving",
      0,
      -0.02,
      15,
      17,
      0.04,
      17,
      this.mat("paving", "#685b50"),
    );
    for (const x of [-7, 7]) this.box("curb", x, 0.08, 3, 0.25, 0.16, 47, curb);
    // Original architectural study: layered Chennai-inspired facades, not a sourced final environment.
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        if (i === 1) continue;
        const x = side * 12,
          z = -10 + i * 12,
          h = 6 + (i % 2) * 2,
          m = [cream, terracotta, teal][i % 3];
        this.box("residential-facade", x, h / 2, z, 9, h, 8, m, true);
        for (const level of [2, 5]) {
          if (level > h) continue;
          for (const dz of [-2, 1.5]) {
            this.box(
              "window-frame",
              x - side * 4.55,
              level,
              z + dz,
              0.12,
              1.7,
              1.5,
              wood,
            );
            this.box(
              "warm-window",
              x - side * 4.63,
              level,
              z + dz,
              0.03,
              1.4,
              1.2,
              this.mat("window-glow", "#ffcc7b", 0.5),
            );
            for (let bar = 0; bar < 4; bar++)
              this.box(
                "window-grille",
                x - side * 4.68,
                level,
                z + dz - 0.5 + bar * 0.33,
                0.05,
                1.4,
                0.04,
                dark,
              );
          }
          this.box(
            "balcony-slab",
            x - side * 4.7,
            level - 0.9,
            z,
            1.4,
            0.15,
            7.8,
            curb,
          );
          for (let k = 0; k < 15; k++)
            this.box(
              "balustrade",
              x - side * 5.3,
              level - 0.4,
              z - 3.6 + k * 0.5,
              0.05,
              1,
              0.05,
              dark,
            );
          this.box(
            "balcony-rail",
            x - side * 5.3,
            level + 0.1,
            z,
            0.08,
            0.08,
            7.8,
            dark,
          );
        }
        this.box("roof-cornice", x, h + 0.2, z, 9.5, 0.4, 8.5, curb);
        const tank = MeshBuilder.CreateCylinder(
          "rooftop-water-tank",
          { height: 1.5, diameter: 1.5, tessellation: 24 },
          this.scene,
        );
        tank.position.set(x + 1, h + 1, z);
        tank.material = dark;
        this.box("compound-wall", x - side * 4.7, 0.5, z + 3.8, 0.3, 1, 3, m);
        this.kolam(x - side * 5.8, z - 1);
      }
    // Open-front shops: physical counters, stocked shelves and space to enter.
    for (const side of [-1, 1]) {
      const x = side * 12;
      this.box(
        "shop-back",
        x,
        2.4,
        6.6,
        10,
        4.8,
        0.3,
        side < 0 ? cream : terracotta,
        true,
      );
      this.box("shop-roof", x, 4.8, 2, 10, 0.25, 9.5, curb);
      this.box("shop-floor", x, 0.02, 2, 10, 0.08, 9, curb);
      this.box("counter", x, 0.65, 3.5, 7, 1.3, 1.1, wood, true);
      this.box("counter-glass", x, 1.34, 3.5, 7, 0.08, 1.2, gold);
      for (let shelf = 0; shelf < 3; shelf++) {
        this.box("shelf", x, 1 + shelf * 0.9, 6.25, 8, 0.1, 0.65, wood);
        for (let n = 0; n < 9; n++) {
          const color = ["#a33856", "#c58d3e", "#327977", "#464c94", "#c75e32"][
            n % 5
          ];
          this.box(
            side < 0 ? "folded-fabric" : "festival-pack",
            x - 3.6 + n * 0.9,
            1.17 + shelf * 0.9,
            6.1,
            0.65,
            side < 0 ? 0.18 : 0.5,
            0.48,
            this.mat("stock", color),
          );
        }
      }
      this.sign(
        side < 0 ? "சென்னை பட்டுகள்" : "தீபாவளி பட்டாசுகள்",
        side < 0
          ? "CHENNAI SILKS · FESTIVAL TEXTILES"
          : "THE CRACKER CORNER · FESTIVAL SHOP",
        x,
        4.1,
        -2.65,
        9,
        side < 0 ? "#402b31" : "#29413a",
      );
      const l = new PointLight("shop-lamp", new Vector3(x, 3.5, 1), this.scene);
      l.diffuse = new Color3(1, 0.73, 0.38);
      l.intensity = 1.2;
      l.range = 12;
      for (const xx of [x - 4.5, x + 4.5]) {
        this.box("shop-pillar", xx, 2.4, -2.2, 0.25, 4.8, 0.25, cream);
        for (let j = 0; j < 7; j++) {
          const flower = MeshBuilder.CreateSphere(
            "marigold",
            { diameter: 0.22, segments: 6 },
            this.scene,
          );
          flower.position.set(xx, 2 + j * 0.3, -2.4);
          flower.material = gold;
        }
      }
    }
    const bulb = this.mat("warm-bulb", "#ffd397", 1);
    this.lampMaterials.push(bulb);
    for (let row = 0; row < 6; row++) {
      const z = -9 + row * 7,
        path = [];
      for (let n = 0; n <= 24; n++) {
        const x = -8 + (n * 2) / 3,
          y = 8.4 - Math.sin((n / 24) * Math.PI);
        path.push(new Vector3(x, y, z));
        if (n % 2 === 0) {
          const b = MeshBuilder.CreateSphere(
            "festoon-bulb",
            { diameter: 0.1, segments: 6 },
            this.scene,
          );
          b.position.set(x, y - 0.08, z);
          b.material = bulb;
        }
      }
      this.tube("string-light-wire", path, 0.017, dark);
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const x = side * 6.7,
          z = -8 + i * 10;
        this.box("lamp-post", x, 2.4, z, 0.09, 4.8, 0.09, dark);
        this.box("lantern", x, 4.8, z, 0.3, 0.5, 0.3, bulb);
        const l = new PointLight(
          "streetlight",
          new Vector3(x, 4.5, z),
          this.scene,
        );
        l.diffuse = new Color3(1, 0.66, 0.3);
        l.intensity = 0.6;
        l.range = 9;
      }
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18;
      const x = Math.cos(a) * 8,
        z = 15 + Math.sin(a) * 8;
      const diya = MeshBuilder.CreateSphere(
        "clay-diya",
        { diameter: 0.3, segments: 12, slice: 0.5 },
        this.scene,
      );
      diya.scaling.y = 0.4;
      diya.position.set(x, 0.08, z);
      diya.material = terracotta;
      const flame = MeshBuilder.CreateSphere(
        "diya-flame",
        { diameter: 0.08, segments: 6 },
        this.scene,
      );
      flame.scaling.y = 2.5;
      flame.position.set(x, 0.17, z);
      flame.material = bulb;
    }
    this.kolam(0, -5, 2.4);
    this.sign(
      "இனிய தீபாவளி நல்வாழ்த்துகள்",
      "HAPPY DEEPAVALI · CHENNAI 2026",
      0,
      4,
      27,
      12,
      "#303849",
    );
    for (const x of [-6, 6]) {
      this.box("banner-post", x, 2, 27, 0.15, 4, 0.15, wood);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        this.tube(
          "banana-leaf",
          [
            new Vector3(x, 0, 26),
            new Vector3(x, 2, 26),
            new Vector3(x + Math.cos(a) * 1.3, 3, 26 + Math.sin(a)),
          ],
          0.14,
          leaf,
        );
      }
    }
    // Utility wires and distant roofline.
    for (const x of [-18, 18]) {
      for (let i = 0; i < 5; i++)
        this.box("utility-pole", x, 5, -15 + i * 13, 0.16, 10, 0.16, curb);
      for (let j = 0; j < 3; j++)
        this.tube(
          "power-wire",
          Array.from(
            { length: 60 },
            (_, i) =>
              new Vector3(
                x + j * 0.25,
                9 - Math.sin((i / 15) * Math.PI) * 0.35,
                -15 + i,
              ),
          ),
          0.012,
          dark,
        );
    }
    for (let i = 0; i < 16; i++) {
      const h = 5 + ((i * 7) % 9);
      this.box(
        "distant-building",
        -45 + i * 6,
        h / 2,
        43,
        5,
        h,
        8,
        this.mat("skyline", "#303644"),
      );
    }
  }
  kolam(x: number, z: number, scale = 1) {
    const m = this.mat("rice-flour", "#ded7be", 0.08);
    for (let j = 0; j < 4; j++) {
      const path = [];
      for (let i = 0; i <= 80; i++) {
        const a = (i / 80) * Math.PI * 2,
          r = (0.55 + 0.23 * Math.cos(4 * a)) * scale;
        path.push(
          new Vector3(
            x + Math.cos(a + (j * Math.PI) / 8) * r,
            0.035,
            z + Math.sin(a + (j * Math.PI) / 8) * r,
          ),
        );
      }
      this.tube("kolam", path, 0.012, m);
    }
  }
  async template(type: string) {
    const cached=this.templates.get(type);
    if(cached)return cached;
    if (!this.templateLoads.has(type)) {
      const pending = SceneLoader.LoadAssetContainerAsync(
        '/assets/characters/',
        type === 'male' ? 'indian_man_animated.glb' : 'woman_saree_animated.glb',
        this.scene,
      ).then(asset=>{
      if (this.disposed) {
        asset.dispose();
        throw Error("disposed");
      }
      this.templates.set(type, asset);
      return asset;
      }).finally(()=>this.templateLoads.delete(type));
      this.templateLoads.set(type,pending);
    }
    return this.templateLoads.get(type)!;
  }
  async addActor(p: PublicPlayer) {
    if (this.loading.has(p.id) || this.actors.has(p.id)) return;
    this.loading.add(p.id);
    try {
      const container = await this.template(p.type);
      if (this.disposed) return;
      const model = container.instantiateModelsToScene(
        (n) => p.id + "-" + n,
        true,
      );
      const root = new TransformNode("player-" + p.id, this.scene);
      for (const n of model.rootNodes) n.parent = root;
      const meshes = root.getChildMeshes();
      const bounds = meshes.reduce(
        (acc, m) => {
          m.computeWorldMatrix(true);
          const b = m.getBoundingInfo().boundingBox;
          return {
            min: Vector3.Minimize(acc.min, b.minimumWorld),
            max: Vector3.Maximize(acc.max, b.maximumWorld),
          };
        },
        {
          min: new Vector3(Infinity, Infinity, Infinity),
          max: new Vector3(-Infinity, -Infinity, -Infinity),
        },
      );
      const height = bounds.max.y - bounds.min.y;
      const scale = 1.75 / height;
      for (const n of model.rootNodes) {
        (n as TransformNode).scaling.scaleInPlace(scale);
        (n as TransformNode).position.y -= bounds.min.y * scale;
        if(p.type==='male') {
          const node=n as TransformNode;
          if(node.rotationQuaternion){node.rotation=node.rotationQuaternion.toEulerAngles();node.rotationQuaternion=null;}
          node.rotation.y-=Math.PI/2;
        }
      }
      root.position.set(p.x, 0, p.z);
      for (const m of meshes) this.shadows.addShadowCaster(m);
      model.animationGroups.forEach((a) => a.stop());
      const garmentMaterials: (StandardMaterial | PBRMaterial)[] = [];
      for(const mesh of meshes) {
        if((mesh.name.includes('Object_91') || (p.type==='female' && /saree|PALU|BLOUSE/i.test(mesh.name))) && mesh.material instanceof PBRMaterial) {
          garmentMaterials.push(mesh.material);
        }
      }
      this.actors.set(p.id, {
        root,
        model,
        current: "",
        // Apply the saved wardrobe selection on the first rendered frame too.
        outfit: "",
        materials: garmentMaterials,
        gesture: "",
      });
      if (!this.preview) {
        const label = this.sign(p.name, "", 0, 2.2, 0, 1.7, "#28313e");
        label.parent = root;
        label.billboardMode = Mesh.BILLBOARDMODE_ALL;
        this.actors.get(p.id)!.label = label;
      }
    } catch (e) {
      if (!this.disposed)
        this.onStatus(
          "Character asset could not load. Reload after checking the connection.",
        );
    } finally {
      this.loading.delete(p.id);
    }
  }
  setSnapshot(s: Snapshot) {
    if (!this.snapshot && !this.preview) {
      for (const [id,e] of this.effects){e.dispose();this.audio.release(id);}
      this.effects.clear();
      this.camera.radius = 7;
      this.camera.beta = 1.23;
      this.camera.alpha = -Math.PI / 2;
      const self = s.players.find(p => p.id === this.selfId);
      if (self) this.camera.setTarget(new Vector3(self.x, 1.2, self.z), false, true, true);
    }
    this.snapshot = s;
    const residents=this.preview?s.players:[...s.players,...shopkeepers(s.players,this.now(),s.shopActions)];
    for (const p of residents) void this.addActor(p);
    for (const [id, a] of this.actors)
      if (!residents.some((p) => p.id === id)) {
        a.model.dispose();
        a.root.dispose();
        this.actors.delete(id);
      }
    for (const e of s.events)
      if (!this.effects.has(e.id) && e.start + e.duration > this.now())
        this.effects.set(
          e.id,
          new FireworkVisual(
            e,
            this.scene,
            this.quality === "low"
              ? 140
              : this.quality === "medium"
                ? 280
                : 500,
          ),
        );
    this.lampMaterials.forEach(
      (m) => (m.emissiveColor = m.diffuseColor.scale(s.lights ? 1 : 0.04)),
    );
  }
  now() {
    return Date.now() + this.offset;
  }
  setPlacement(item: string) {
    this.placeItem = item;
    if (!item) {
      this.placement?.dispose();
      this.placement = undefined;
      return;
    }
    this.placement ??= MeshBuilder.CreateTorus(
      "placement",
      { diameter: 1, thickness: 0.035, tessellation: 48 },
      this.scene,
    );
    this.placement.material = this.mat("placement", "#b1efc1", 0.6);
  }
  placementPosition() {
    const p = this.snapshot?.players.find((p) => p.id === this.selfId);
    return {
      x: (p?.x ?? 0) + Math.sin(p?.yaw ?? 0) * 2,
      z: (p?.z ?? 15) + Math.cos(p?.yaw ?? 0) * 2,
    };
  }
  frame() {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000),
      now = this.now();
    if (this.disposed) return;
    if (this.snapshot) {
      if(!this.inputBlocked&&!this.preview){
        this.camera.alpha-=this.lookStick.x*dt*1.8;
        this.camera.beta=Math.max(this.camera.lowerBetaLimit??.3,Math.min(this.camera.upperBetaLimit??2.6,this.camera.beta-this.lookStick.y*dt*1.5));
      }
      for(const action of this.snapshot.shopActions??[]) {
        if(action.start<=now&&action.start+action.duration>now&&!this.shopPresentations.has(action.id))
          this.shopPresentations.set(action.id,new ShopPresentation(action,this.scene));
      }
      for(const [id,presentation] of this.shopPresentations){
        if(presentation.action.start+presentation.action.duration<=now){presentation.dispose();this.shopPresentations.delete(id);}
        else presentation.update(now);
      }
      const residents=this.preview?this.snapshot.players:[...this.snapshot.players,...shopkeepers(this.snapshot.players,now,this.snapshot.shopActions)];
      for (const p of residents) {
        const a = this.actors.get(p.id);
        if (!a) continue;
        a.root.position = Vector3.Lerp(
          a.root.position,
          new Vector3(p.x, 0, p.z),
          Math.min(1, dt * 13),
        );
        const angle = Math.atan2(
          Math.sin(p.yaw - a.root.rotation.y),
          Math.cos(p.yaw - a.root.rotation.y),
        );
        a.root.rotation.y += angle * Math.min(1, dt * 12);
        const gesture = p.emoteUntil > now ? p.emote : "";
        if (a.gesture !== gesture && !this.preview) {
          a.label?.dispose(false, true);
          a.label = this.sign(
            p.name,
            gesture === "Light" ? "Lighting a firework" : gesture==='Shop'?'Showing your selection':gesture,
            0,
            2.2,
            0,
            1.7,
            "#28313e",
          );
          a.label.parent = a.root;
          a.label.billboardMode = Mesh.BILLBOARDMODE_ALL;
          a.gesture = gesture;
        }
        const names = a.model.animationGroups;
        const desired = p.moving
          ? (p.running ? "run" : "walk")
          : gesture ? gesture.toLowerCase() : "idle";
        if (a.current !== desired) {
          const clip =
            names.find((g) =>
              g.name
                .toLowerCase()
                .includes(
                  desired,
                ),
            ) ??
            names.find((g) =>
              g.name.toLowerCase().includes(p.moving ? "walk" : "idle"),
            ) ??
            names[0];
          if(clip) {
            a.animationWeights ??= new Map();
            if(!clip.isStarted){clip.start(true, 1);clip.setWeightForAllAnimatables(0);}
            a.activeClip=clip.name;
          }
          a.current = desired;
        }
        // Cross-fade existing skeletal poses over 180ms rather than snapping.
        for(const group of names) {
          if(!group.isStarted)continue;
          const target=group.name===a.activeClip?1:0;
          const previous=a.animationWeights?.get(group.name)??0;
          const weight=target>previous?Math.min(target,previous+dt/.18):Math.max(target,previous-dt/.18);
          group.setWeightForAllAnimatables(weight);
          a.animationWeights?.set(group.name,weight);
          if(weight===0&&target===0)group.stop();
        }
        if (gesture === "Dance") {
          a.root.rotation.y += Math.sin(now / 220) * 0.35;
          a.root.position.y = Math.abs(Math.sin(now / 180)) * 0.08;
        }
        if(p.id.startsWith('npc-')&&gesture==='Shop') {
          const action=(this.snapshot.shopActions??[]).find(a=>'npc-'+a.shop===p.id&&a.start<=now&&a.start+a.duration>now);
          const clip=names.find(g=>g.name===a.activeClip);
          if(action&&clip){
            const seconds=(now-action.start)/1000,duration=action.duration/1000;
            const phase=seconds<1?seconds*.5:seconds>duration-1?(1-(duration-seconds)*.5):.5;
            clip.pause();clip.goToFrame(clip.from+(clip.to-clip.from)*Math.max(0,Math.min(1,phase)));
          }
        }
        const outfit =
          p.id === this.selfId && this.previewOutfit
            ? this.previewOutfit
            : p.outfit;
        if (a.outfit !== outfit) {
          a.materials.forEach((m) => {
            const color=Color3.FromHexString(outfits.find(o=>o.id===outfit)?.color??'#eee0bc');
            if(m instanceof PBRMaterial)m.albedoColor=color;else m.diffuseColor=color;
          });
          a.outfit = outfit;
        }
      }
      const self = this.actors.get(this.selfId);
      if (self && !this.preview)
        this.camera.setTarget(
          Vector3.Lerp(
            this.camera.target,
            self.root.position.add(new Vector3(0, Math.max(1.2,.7-this.camera.radius*Math.cos(this.camera.beta)), 0)),
            Math.min(1, dt * 8),
          ),
          false, false, true,
        );
      if (!this.preview && performance.now() - this.lastSend > 50) {
        let dx = 0,
          dz = 0;
        if (!this.inputBlocked) {
          let forward =
            (this.keys.has("w") ? 1 : 0) -
            (this.keys.has("s") ? 1 : 0) -
            this.stick.y;
          let right =
            (this.keys.has("d") ? 1 : 0) -
            (this.keys.has("a") ? 1 : 0) +
            this.stick.x;
          const a = this.camera.alpha;
          dx = -Math.cos(a) * forward - Math.sin(a) * right;
          dz = -Math.sin(a) * forward + Math.cos(a) * right;
        }
        this.onInput(dx, dz, this.keys.has("shift")||this.touchRun);
        this.lastSend = performance.now();
      }
      if (this.placement) {
        const p = this.placementPosition();
        this.placement.position.set(p.x, 0.08, p.z);
      }
    } else if (!this.preview) {
      const t = (performance.now() - this.start) / 1000;
      this.camera.alpha = -Math.PI / 2 + 0.12 + Math.sin(t / 22) * 0.12;
      this.camera.radius = 30;
      this.camera.beta = 1.36;
      this.camera.target.set(0, 5, 9);
      if (performance.now() - this.lastAmbient > 5000) {
        const id = "ambient-" + Math.floor(performance.now() / 5000);
        this.effects.set(
          id,
          new FireworkVisual(
            {
              id,
              item: "aerial",
              player: "",
              x: 7,
              z: 32,
              seed: 42 + Math.floor(performance.now() / 5000),
              start: now - 1800,
              duration: 6500,
              outcome: "normal",
            },
            this.scene,
            280,
          ),
        );
        this.lastAmbient = performance.now();
      }
    }
    for (const [id, e] of this.effects) {
      if (now > e.event.start + e.event.duration + 1000) {
        e.dispose();
        this.effects.delete(id);
        this.audio.release(id);
        continue;
      }
      e.update(now, this.reduced);
      const p = this.snapshot?.players.find((p) => p.id === this.selfId) ?? {
        x: 0,
        z: 0,
      };
      this.audio.update(e.event,now,p,this.camera.alpha);
    }
    const brightest=[...this.effects.values()].filter(e=>e.illumination>0).sort((a,b)=>b.illumination-a.illumination).slice(0,2);
    this.fireworkLights.forEach((light,i)=>{
      const effect=brightest[i];light.intensity=effect?.illumination??0;
      if(effect){light.position.set(effect.event.x,3,effect.event.z);light.diffuse=Color3.FromHexString(fireworks.find(f=>f.id===effect.event.item)!.color);}
    });
    this.scene.render();
    if (performance.now() - this.lastStats > 1000) {
      this.onStats(Math.round(this.engine.getFps()));
      this.lastStats = performance.now();
    }
  }
  settings(quality: string, reduced: boolean, volume: number) {
    this.quality = quality;
    this.reduced = reduced;
    this.audio.volume = volume;
    this.engine.setHardwareScalingLevel(
      this.mobile?(quality==='low'?1.4:quality==='medium'?1.15:1):(quality === "low" ? 2 : quality === "medium" ? 1.5 : 1),
    );
    this.scene.shadowsEnabled=quality!=='low';
    this.glow.isEnabled=quality!=='low';
    this.scene.lights.forEach((l) => {
      if (l.name === "flash" && reduced) l.intensity = 0;
    });
  }
  keydown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest("input,textarea,select,button"))
      return;
    this.keys.add(e.key.toLowerCase());
    if ([" ", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    if (!e.repeat) {
      if (e.key.toLowerCase() === "e") this.onInteract();
      if (["i", "m", "g", "Escape", " "].includes(e.key))
        this.onShortcut(e.key);
    }
  };
  keyup = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  blur = () => {this.keys.clear();this.stick={x:0,y:0};this.lookStick={x:0,y:0};this.touchRun=false;};
  resize = () => this.engine.resize();
  screenshot() {
    const photo=document.createElement('canvas');
    photo.width=this.canvas.width;photo.height=this.canvas.height;
    const ctx=photo.getContext('2d');
    if(!ctx)return;
    // Capture an explicitly rendered frame with nameplates hidden.
    const labels=[...this.actors.values()].map(a=>a.label).filter((m):m is Mesh=>!!m);
    const visibility=labels.map(m=>m.isVisible);
    labels.forEach(m=>m.isVisible=false);
    try {this.scene.render();ctx.drawImage(this.canvas,0,0);}
    finally {labels.forEach((m,i)=>m.isVisible=visibility[i]);}
    const w=photo.width,h=photo.height,pad=Math.max(12,w*.018);
    ctx.strokeStyle='#d5ad65';ctx.lineWidth=Math.max(2,w/600);
    ctx.strokeRect(pad,pad,w-pad*2,h-pad*2);
    const band=Math.max(72,h*.12);
    const gradient=ctx.createLinearGradient(0,h-band*1.6,0,h);
    gradient.addColorStop(0,'#10192500');gradient.addColorStop(1,'#101925f5');
    ctx.fillStyle=gradient;ctx.fillRect(0,h-band*1.6,w,band*1.6);
    ctx.textAlign='center';ctx.fillStyle='#ffe2a5';
    ctx.font=`${Math.max(16,w*.023)}px sans-serif`;
    ctx.fillText('இனிய தீபாவளி நல்வாழ்த்துகள்!',w/2,h-band*.65);
    ctx.font=`${Math.max(11,w*.013)}px sans-serif`;
    ctx.fillText('CHENNAI · DEEPAVALI 2026 · TOGETHER',w/2,h-band*.30);
    const a = document.createElement("a");
    a.download = "Chennai-Deepavali-2026.png";
    a.href = photo.toDataURL("image/png");
    a.click();
  }
  lookAtSky(){
    this.camera.beta=2.45;
    this.camera.target.y=Math.max(1.2,.7-this.camera.radius*Math.cos(this.camera.beta));
  }
  dispose() {
    this.disposed = true;
    this.engine.stopRenderLoop();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    window.removeEventListener("resize", this.resize);
    this.audio.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
