import bpy, os, math, json
from mathutils import Vector, Quaternion, Matrix
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(root,'assets-source/characters/female')
bpy.ops.wm.open_mainfile(filepath=os.path.join(folder,'female-prepared.blend'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
 if o.name=='PALU':
  # Give the shoulder drape clearance above the skin/blouse surface.
  # Taper the correction into the chest to preserve the lower pleats.
  for v in o.data.vertices:
   blend=max(0,min(1,(v.co.z-1.22)/.12))
   v.co.z+=.018*blend
   if v.co.y<0:v.co.y-=.006*blend
  o.data.update()
 # Replace the imported broken strand material with an opaque dark-hair material.
 if o.name=='head base.001':
  mat=bpy.data.materials.new('Natural dark hair');mat.use_nodes=True
  shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.018,.011,.008,1);shader.inputs['Roughness'].default_value=.6
  o.data.materials.clear();o.data.materials.append(mat)
  for face in o.data.polygons:face.material_index=0
 if o.name in ['saree','PALU','BezierCurve']:
  for mat in o.data.materials:
   if mat and mat.use_nodes:
    shader=mat.node_tree.nodes.get('Principled BSDF')
    if shader:shader.inputs['Roughness'].default_value=.38
arm=bpy.data.armatures.new('FestivalFemaleSkeleton');rig=bpy.data.objects.new('FestivalFemale',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[('Hips',(0,0,.86),(0,0,1.02),None),('Spine',(0,0,1.02),(0,0,1.18),'Hips'),('Chest',(0,0,1.18),(0,0,1.36),'Spine'),('Neck',(0,0,1.36),(0,0,1.46),'Chest'),('Head',(0,0,1.46),(0,0,1.64),'Neck')]
for side,s in [('Left',1),('Right',-1)]:
 spec += [(side+'Shoulder',(0,0,1.34),(s*.17,0,1.34),'Chest'),(side+'Arm',(s*.17,0,1.34),(s*.41,0,1.34),side+'Shoulder'),(side+'ForeArm',(s*.41,0,1.34),(s*.64,0,1.34),side+'Arm'),(side+'Hand',(s*.64,0,1.34),(s*.76,0,1.34),side+'ForeArm'),(side+'Thigh',(s*.085,0,.87),(s*.085,0,.48),'Hips'),(side+'Shin',(s*.085,0,.48),(s*.085,0,.10),side+'Thigh'),(side+'Foot',(s*.085,0,.10),(s*.085,-.13,.04),side+'Shin')]
for name,head,tail,parent in spec:
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
segments={name:(Vector(head),Vector(tail)) for name,head,tail,parent in spec}
for o in meshes:
 o.vertex_groups.clear();groups={name:o.vertex_groups.new(name=name) for name in segments}
 for v in o.data.vertices:
  p=v.co
  if o.name in ['high-poly','head base','kangana.001','head base.001']:
   groups['Head'].add([v.index],1,'REPLACE');continue
  if o.name in ['saree','BezierCurve'] or (o.name=='PALU' and p.z<1.0):
   influence=max(0,min(.3,(.9-p.z)*.4));side='Left' if p.x>0 else 'Right'
   groups['Hips'].add([v.index],1-influence,'REPLACE');groups[side+'Thigh'].add([v.index],influence,'REPLACE');continue
  if o.name=='PALU':
   # The drape rests on the torso/shoulder. Nearest-arm weighting pulled
   # its hanging edge sideways when lowering the arms from the source T pose.
   chest=max(0,min(1,(p.z-1.0)/.30))
   groups['Chest'].add([v.index],chest,'REPLACE')
   groups['Spine'].add([v.index],1-chest,'REPLACE');continue
  distances=[]
  for name,(a,b) in segments.items():
   if p.z>1.43 and name!='Head':continue
   if p.z<.85 and not any(k in name for k in ['Thigh','Shin','Foot','Hips']):continue
   if p.z>=.85 and any(k in name for k in ['Shin','Foot']):continue
   if abs(p.x)<.13 and any(k in name for k in ['Arm','Hand']):continue
   ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));distances.append(((p-a-t*ab).length,name))
  near=sorted(distances)[:3];weights=[1/max(d,.025)**4 for d,n in near];total=sum(weights)
  for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
 mod=o.modifiers.new('Festival skin','ARMATURE');mod.object=rig;o.parent=rig
def rot(name,axis,angle):
 b=rig.pose.bones[name];local=b.bone.matrix_local.to_3x3().inverted()@Vector(axis);b.rotation_quaternion=Quaternion(local.normalized(),math.radians(angle))
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
for name,length in [('Idle',90),('Walk',36),('Run',24),('Wave',90),('Namaste',90),('Clap',60),('Dance',90),('Sit',60),('Light',60),('Shop',60),('Celebrate',90)]:
 rig.animation_data.action=None;action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 for frame in range(1,length+2):
  t=(frame-1)/length;phase=t*math.tau
  for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=Quaternion();b.location=(0,0,0)
  for side,s in [('Left',1),('Right',-1)]:
   rot(side+'Arm',(0,1,0),s*72)
   if name in ['Walk','Run','Dance']:
    swing=math.sin(phase)*s;rot(side+'Thigh',(1,0,0),swing*(16 if name=='Walk' else 25));rot(side+'Shin',(1,0,0),max(0,-swing)*25)
    b=rig.pose.bones[side+'Arm'];b.rotation_quaternion @= Quaternion((1,0,0),math.radians(swing*10))
   if name=='Wave' and side=='Right':rot(side+'Arm',(0,1,0),25);rot(side+'ForeArm',(0,1,0),60);rot(side+'Hand',(0,0,1),math.sin(phase*3)*18)
   if name in ['Namaste','Clap','Shop']:rot(side+'Arm',(0,1,0),s*45);rot(side+'ForeArm',(0,0,1),-s*(75+(math.sin(phase*3)*10 if name=='Clap' else 0)))
   if name=='Celebrate':rot(side+'Arm',(0,1,0),-s*50);rot(side+'ForeArm',(0,1,0),-s*15)
   if name=='Sit':rot(side+'Thigh',(1,0,0),-65);rot(side+'Shin',(1,0,0),65)
  if name=='Light':rot('Spine',(1,0,0),25*math.sin(math.pi*t)**2)
  rot('Head',(0,0,1),math.sin(phase)*1.2)
  for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);strip.action_frame_end=length+1;track.mute=True
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_start=1;scene.frame_end=91
bpy.ops.export_scene.gltf(filepath=os.path.join(folder,'female-rigged-draft.glb'),export_format='GLB',export_animation_mode='NLA_TRACKS',export_force_sampling=True)
rig.animation_data.use_nla=False
for track in rig.animation_data.nla_tracks:track.mute=True
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.15,.15,1)
center=Vector((0,0,.85));bpy.ops.object.camera_add(location=(2,-5,2));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2;scene.camera=cam
for position,energy in [((2,-3,4),700),((-2,-1,3),400)]:
 bpy.ops.object.light_add(type='AREA',location=position);o=bpy.context.object;o.data.energy=energy;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
for name,frame in [('Idle',1),('Walk',10),('Wave',35),('Namaste',30)]:
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);scene.render.filepath=os.path.join(folder,name.lower()+'-preview.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,'female-rigged.blend'))
