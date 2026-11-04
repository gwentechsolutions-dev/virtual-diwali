import {Effect, Mesh, ShaderMaterial, VertexBuffer, Constants, type Scene} from '@babylonjs/core';

type Source={birth:number;life:number;x:number;y:number;z:number;vx:number;vy:number;vz:number};
Effect.ShadersStore.festivalSmokeVertexShader=`precision highp float;
attribute vec3 position;attribute vec4 color;attribute float smokeSize;
uniform mat4 worldViewProjection;varying vec4 vColor;
void main(){gl_Position=worldViewProjection*vec4(position,1.);gl_PointSize=clamp(smokeSize*200./max(gl_Position.w,.1),2.,160.);vColor=color;}`;
Effect.ShadersStore.festivalSmokeFragmentShader=`precision highp float;varying vec4 vColor;
void main(){vec2 p=gl_PointCoord-vec2(.5);float r=length(p);
float cloud=.78+.12*sin(p.x*29.+sin(p.y*17.))+.1*cos(p.y*33.+p.x*11.);
float edge=1.-smoothstep(.18,.5,r);float a=vColor.a*edge*cloud;
if(a<.002)discard;gl_FragColor=vec4(vColor.rgb,a);}`;

/** Analytic puffs use the event's seeded spark sources, including on late join. */
export class FireworkSmoke {
  mesh:Mesh;
  material:ShaderMaterial;
  sources:Source[];
  positions:Float32Array;
  colors:Float32Array;
  sizes:Float32Array;
  constructor(scene:Scene,sources:Source[],x:number,z:number){
    // Keep smoke bounded by the existing spark budget at every quality level.
    this.sources=sources.filter((_,i)=>i%18===0);
    const n=this.sources.length;
    this.positions=new Float32Array(n*3);this.colors=new Float32Array(n*4);this.sizes=new Float32Array(n);
    this.mesh=new Mesh('firework-smoke',scene);this.mesh.position.set(x,0,z);
    this.mesh.setVerticesData(VertexBuffer.PositionKind,this.positions,true);
    this.mesh.setVerticesData(VertexBuffer.ColorKind,this.colors,true);
    this.mesh.setVerticesData('smokeSize',this.sizes,true,1);
    this.mesh.setIndices(Array.from({length:n},(_,i)=>i));
    this.material=new ShaderMaterial('smoke-material',scene,{vertex:'festivalSmoke',fragment:'festivalSmoke'},
      {attributes:['position','color','smokeSize'],uniforms:['worldViewProjection'],needAlphaBlending:true});
    this.material.fillMode=Constants.MATERIAL_PointFillMode;
    this.material.alphaMode=Constants.ALPHA_COMBINE;this.material.disableDepthWrite=true;
    this.mesh.material=this.material;this.mesh.alwaysSelectAsActiveMesh=true;
  }
  update(age:number,duration:number){
    this.sources.forEach((p,i)=>{
      const t=age-p.birth-.12;
      const life=3.5+p.life*.25;
      const j=i*3,k=i*4;
      this.positions[j]=p.x+p.vx*.10+Math.max(t,0)*.32;
      this.positions[j+1]=p.y+Math.max(0,p.vy)*.08+Math.max(t,0)*.25;
      this.positions[j+2]=p.z+p.vz*.10+Math.max(t,0)*.09;
      this.sizes[i]=.7+Math.max(t,0)*.75;
      this.colors[k]=.39;this.colors[k+1]=.40;this.colors[k+2]=.43;
      this.colors[k+3]=t>=0&&t<life ? .20*Math.min(1,t*2)*Math.pow(1-t/life,1.3)*Math.min(1,Math.max(0,duration+1-age)):0;
    });
    this.mesh.updateVerticesData(VertexBuffer.PositionKind,this.positions);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind,this.colors);
    this.mesh.updateVerticesData('smokeSize',this.sizes);
  }
  dispose(){this.mesh.dispose();this.material.dispose();}
}
