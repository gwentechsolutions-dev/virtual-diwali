import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { FireworkSmoke } from './smoke';
import { Scene } from "@babylonjs/core/scene";
import { Constants } from "@babylonjs/core/Engines/constants";
import { fireworks, seeded, type FireworkEvent } from "../../shared/catalog";
interface Spark {
  birth: number;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  color: number[];
  size: number;
}
Effect.ShadersStore.festivalVertexShader = `precision highp float;attribute vec3 position;attribute vec4 color;uniform mat4 worldViewProjection;uniform float pointSize;varying vec4 vColor;void main(){gl_Position=worldViewProjection*vec4(position,1.);gl_PointSize=clamp(pointSize*90./gl_Position.w,1.5,12.);vColor=color;}`;
Effect.ShadersStore.festivalFragmentShader = `precision highp float;varying vec4 vColor;void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vColor.rgb,vColor.a*pow(1.-d*2.,1.6));}`;
export class FireworkVisual {
  mesh: Mesh;
  illumination = 0;
  sparks: Spark[] = [];
  positions: Float32Array;
  colors: Float32Array;
  material: ShaderMaterial;
  smoke: FireworkSmoke;
  constructor(
    public event: FireworkEvent,
    scene: Scene,
    budget: number,
  ) {
    const f = fireworks.find((f) => f.id === event.item)!;
    const rand = seeded(event.seed),
      base = Color3.FromHexString(f.color);
    const n = Math.floor(budget * (event.outcome === "weak" ? 0.3 : 1));
    const duration = event.duration / 1000;
    const push = (
      birth: number,
      life: number,
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      gravity: number,
    ) => {
      this.sparks.push({
        birth,
        life,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        gravity,
        color: [
          base.r + (1 - base.r) * rand() * 0.5,
          base.g + (1 - base.g) * rand() * 0.3,
          base.b,
        ],
        size: 1,
      });
    };
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2,
        u = rand(),
        v = rand();
      if (event.outcome === "no-burst") {
        push(
          u * 1.5,
          0.5,
          0,
          0.1,
          0,
          Math.cos(a) * 0.3,
          0.5,
          Math.sin(a) * 0.3,
          0.5,
        );
        continue;
      }
      switch (f.kind) {
        case 'single':
          push(.6,.2+v*.6,0,.15,0,Math.cos(a)*5,rand()*4,Math.sin(a)*5,7);break;
        case 'waterfall':
          push(u*(duration-2),1.5+v, (rand()-.5)*6,4.5,0,(rand()-.5)*.2,-.5,(rand()-.5)*.2,1.5);break;
        case 'peacock': {
          const angle=(i%5-2)*.3;
          push(u*(duration-2),1+v,0,.15,0,Math.sin(angle)*6,Math.cos(angle)*6,(rand()-.5)*.6,4);break;
        }
        case 'crackle':
          push(u*(duration-1),.15+v*.45,(rand()-.5)*2,rand()*3, (rand()-.5)*2,Math.cos(a)*3,rand()*3,Math.sin(a)*3,4);break;
        case 'colour-fountain':
        case "fountain":
          push(
            u * (duration - 1),
            0.7 + v * 1.3,
            0,
            0.15,
            0,
            Math.cos(a) * (0.3 + v),
            3 + rand() * 5,
            Math.sin(a) * (0.3 + v),
            4,
          );
          break;
        case "sparkler":
          push(
            u * (duration - 0.6),
            0.25 + v * 0.5,
            0,
            1.3,
            0,
            Math.cos(a) * 2,
            (rand() - 0.3) * 3,
            Math.sin(a) * 2,
            2,
          );
          break;
        case "chakra": {
          const birth = u * (duration - 0.6),
            angle = birth * 35;
          push(
            birth,
            0.3 + v * 0.5,
            Math.cos(angle) * 0.2,
            0.15,
            Math.sin(angle) * 0.2,
            Math.cos(angle) * (3 + rand() * 3),
            rand() * 0.6,
            Math.sin(angle) * (3 + rand() * 3),
            1,
          );
          break;
        }
        case "serial":
          push(
            Math.floor(u * 12) * 0.4,
            0.3 + v * 0.3,
            (Math.floor(u * 12) - 6) * 0.35,
            0.1,
            0,
            Math.cos(a) * 3,
            rand() * 3,
            Math.sin(a) * 3,
            5,
          );
          break;
        case "comet": {
          const birth = u * 3;
          push(
            birth,
            0.3 + v * 1.4,
            birth * 1.5,
            2 + birth * 5 - birth * birth * 0.4,
            0,
            (rand() - 0.5) * 0.8,
            -rand(),
            (rand() - 0.5) * 0.8,
            1,
          );
          break;
        }
        default: {
          const shot = f.kind === 'display-pack' ? Math.floor(u*6) : f.kind === "multishot" ? Math.floor(u * 3) : 0,
            burst = 2 + shot * 2.2;
          if (i < n * 0.25) {
            const birth = rand() * 2 + shot * 2.2;
            push(
              birth,
              0.45 + v * 0.4,
              shot * 2 - 2,
              (birth - shot * 2.2) * 8,
              0,
              (rand() - 0.5) * 0.3,
              -1,
              (rand() - 0.5) * 0.3,
              1,
            );
          } else {
            const polar = f.kind==='ring'?Math.PI/2: f.kind==='palm'?.65+rand()*.2:Math.acos(rand() * 2 - 1),
              speed = f.kind==='willow'?4+rand()*2:3 + rand() * 4;
            const angle=f.kind==='palm'?Math.floor(a/(Math.PI/4))*(Math.PI/4):a;
            push(
              burst,
              f.kind==='willow'?5+rand()*2:2 + rand() * 2,
              shot * 2 - 2,
              16 + shot,
              0,
              Math.sin(polar) * Math.cos(angle) * speed,
              Math.cos(polar) * speed,
              Math.sin(polar) * Math.sin(angle) * speed,
              f.kind==='willow'?.7:1.8,
            );
          }
          break;
        }
      }
    }
    this.mesh = new Mesh("firework-" + event.id, scene);
    this.mesh.position.set(event.x, 0, event.z);
    this.positions = new Float32Array(this.sparks.length * 5 * 3);
    this.colors = new Float32Array(this.sparks.length * 5 * 4);
    this.mesh.setVerticesData(VertexBuffer.PositionKind, this.positions, true);
    this.mesh.setVerticesData(VertexBuffer.ColorKind, this.colors, true);
    this.mesh.setIndices(
      Array.from({ length: this.sparks.length * 5 }, (_, i) => i),
    );
    this.material = new ShaderMaterial(
      "spark-material",
      scene,
      { vertex: "festival", fragment: "festival" },
      {
        attributes: ["position", "color"],
        uniforms: ["worldViewProjection", "pointSize"],
        needAlphaBlending: true,
      },
    );
    this.material.fillMode = Constants.MATERIAL_PointFillMode;
    this.material.alphaMode = Constants.ALPHA_ADD;
    this.material.disableDepthWrite = true;
    this.material.setFloat("pointSize", 1.7);
    this.mesh.material = this.material;
    this.mesh.alwaysSelectAsActiveMesh = true;
    this.smoke=new FireworkSmoke(scene,this.sparks,event.x,event.z);
  }
  update(now: number, reduced: boolean) {
    const age = (now - this.event.start) / 1000;
    this.smoke.update(age,this.event.duration/1000);
    const kind=fireworks.find(f=>f.id===this.event.item)!.kind;
    let alive = 0;
    this.sparks.forEach((p, i) => {
      const t = age - p.birth,
        ok = t >= 0 && t < p.life;
      for(let tail=0;tail<5;tail++) {
        const sample=Math.max(0,t-tail*(kind==='willow'?.065:.025));
        const j=(i*5+tail)*3,k=(i*5+tail)*4;
        const drag=(1-Math.exp(-sample*.22))/.22;
        this.positions[j]=p.x+p.vx*drag;
        this.positions[j+1]=p.y+p.vy*drag-.5*p.gravity*sample*sample;
        this.positions[j+2]=p.z+p.vz*drag;
        const changing=kind==='colour-peony'&&t>1;
        const phase=kind==='colour-fountain'?Math.floor(p.birth/2)%3:-1;
        this.colors[k]=changing?.2:phase===0?.2:p.color[0];
        this.colors[k+1]=changing?1:phase===1?.15:p.color[1];
        this.colors[k+2]=phase===2?1:p.color[2];
        this.colors[k+3]=ok&&t>tail*.025&&this.positions[j+1]>=.03 ? Math.pow(1-t/p.life,1.4)*(1-tail/6)*(reduced?.35:1):0;
      }
      if (ok) alive++;
    });
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.colors);
    this.illumination = reduced ? 0 : Math.min(1.5, alive / 120);
  }
  dispose() {
    this.smoke.dispose();
    this.mesh.dispose();
    this.material.dispose();
  }
}
