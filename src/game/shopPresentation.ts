import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,TransformNode,Vector3,type Scene} from '@babylonjs/core';
import {outfits,fireworks,type ShopAction} from '../../shared/catalog';

/** Original counter props, reconstructed from server start time for late arrivals. */
export class ShopPresentation {
  root:TransformNode;
  cloth?:Mesh;
  parcel:Mesh;
  material:StandardMaterial;
  fabricMaterial?:StandardMaterial;
  fabricTexture?:DynamicTexture;
  constructor(public action:ShopAction,scene:Scene){
    this.root=new TransformNode('shop-presentation-'+action.id,scene);
    this.root.position.set(action.shop==='textiles'?-12:12,1.43,3.5);
    this.material=new StandardMaterial('purchase-material-'+action.id,scene);
    this.material.diffuseColor=Color3.FromHexString(outfits.find(o=>o.id===action.item)?.color??fireworks.find(f=>f.id===action.item)?.color??'#c9a86a');
    this.material.specularColor=new Color3(.25,.2,.12);
    this.parcel=MeshBuilder.CreateBox('purchase-parcel',{width:.6,height:.18,depth:.4},scene);
    this.parcel.parent=this.root;this.parcel.material=this.material;
    if(action.shop==='textiles'){
      const paths=Array.from({length:12},(_,row)=>Array.from({length:25},(_,col)=>{
        const x=(col/24-.5)*2.2,z=(row/11-.5)*.9;
        return new Vector3(x,.035+Math.sin(col/24*Math.PI*16)*.012,z);
      }));
      this.cloth=MeshBuilder.CreateRibbon('unfolded-fabric',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);
      this.fabricTexture=new DynamicTexture('woven-fabric-'+action.id,{width:1024,height:512},scene,false);
      const ctx=this.fabricTexture.getContext();
      ctx.fillStyle=this.material.diffuseColor.toHexString();ctx.fillRect(0,0,1024,512);
      ctx.fillStyle='#c9a24e';ctx.fillRect(0,0,1024,36);ctx.fillRect(0,476,1024,36);ctx.fillRect(0,0,70,512);
      ctx.strokeStyle='#8d6d2e';ctx.lineWidth=2;
      for(let x=5;x<1024;x+=9){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
      ctx.fillStyle=this.material.diffuseColor.toHexString();ctx.globalAlpha=.7;ctx.fillRect(72,40,952,432);ctx.globalAlpha=1;
      ctx.strokeStyle='#e7c579';ctx.lineWidth=2;
      for(let x=140;x<1024;x+=110)for(let y=100;y<450;y+=95){
        ctx.beginPath();ctx.moveTo(x,y-11);ctx.lineTo(x+7,y);ctx.lineTo(x,y+11);ctx.lineTo(x-7,y);ctx.closePath();ctx.stroke();
      }
      this.fabricTexture.update();
      this.fabricMaterial=this.material.clone('silk-display-'+action.id);
      this.fabricMaterial.diffuseColor=Color3.White();this.fabricMaterial.diffuseTexture=this.fabricTexture;
      this.fabricMaterial.specularPower=60;
      this.cloth.parent=this.root;this.cloth.material=this.fabricMaterial;
    }
  }
  update(now:number){
    const t=Math.max(0,(now-this.action.start)/1000);
    const show=t>1&&t<6.5;
    if(this.cloth){
      this.cloth.isVisible=show;
      const open=Math.min(1,Math.max(0,(t-1)/1.5),Math.max(0,(6.5-t)/1.2));
      this.cloth.scaling.set(.18+.82*open,1,.3+.7*open);
    }
    this.parcel.isVisible=!this.cloth||!show;
    const handover=this.action.shop==='textiles'?7:1;
    const phase=Math.min(1,Math.max(0,(t-handover)/1.2));
    this.parcel.position.z=.4-phase*.8;
    this.parcel.position.y=Math.sin(phase*Math.PI)*.15;
    this.root.setEnabled(t<this.action.duration/1000);
  }
  dispose(){this.root.dispose();this.material.dispose();this.fabricMaterial?.dispose();this.fabricTexture?.dispose();}
}
