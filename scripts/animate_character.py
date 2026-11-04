import bpy, math, os, json
from mathutils import Vector, Quaternion, Matrix
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(root,'assets-source/characters/male')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(folder,'indian_man_in_dhoti.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
import sys
sys.path.insert(0,os.path.dirname(__file__))
from repair_male import repair
repair(rig)
bones={b.name.split('_')[0]:b for b in rig.pose.bones}
base={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
def rotate(name,axis,degrees):
 b=bones.get(name)
 if not b:return
 world_rest=rig.matrix_world.to_3x3() @ b.bone.matrix_local.to_3x3()
 local=world_rest.inverted() @ Vector(axis)
 b.rotation_quaternion=base[b.name].to_quaternion() @ Quaternion(local.normalized(),math.radians(degrees))
scene=bpy.context.scene;scene.render.fps=30
rig.animation_data_create()
def reach(side,target):
 # Solve the two-bone arm in world space, then bake ordinary FK rotations.
 bpy.context.view_layer.update()
 upper=bones[side+'Arm'];lower=bones[side+'ForeArm']
 shoulder=rig.matrix_world@upper.head;elbow=rig.matrix_world@lower.head;wrist=rig.matrix_world@lower.tail
 l1=(elbow-shoulder).length;l2=(wrist-elbow).length
 delta=target-shoulder;distance=max(.001,min(delta.length,l1+l2-.002));direction=delta.normalized()
 along=(l1*l1-l2*l2+distance*distance)/(2*distance)
 pole=Vector((0,0,-1));perp=(pole-direction*pole.dot(direction)).normalized()
 joint=shoulder+direction*along+perp*math.sqrt(max(0,l1*l1-along*along))
 inv=rig.matrix_world.inverted()
 for bone,end in [(upper,joint),(lower,target)]:
  bpy.context.view_layer.update()
  head=bone.head.copy();current=bone.tail-head;desired=inv@end-head
  q=current.rotation_difference(desired)
  bone.matrix=Matrix.Translation(head)@q.to_matrix().to_4x4()@Matrix.Translation(-head)@bone.matrix
  bpy.context.view_layer.update()
clips=[]
for name,frames in [('Idle',90),('Walk',30),('Run',22),('Wave',75),('Shop',90)]:
 rig.animation_data.action=None
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 for frame in range(1,frames+2):
  phase=(frame-1)/frames*math.tau
  for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.matrix_basis=base[b.name].copy()
  # Small additive world-space motions preserve the supplied neutral pose.
  rotate('Spine2',(0,1,0),math.sin(phase)*1.0)
  rotate('Head',(0,0,1),math.sin(phase)*1.5)
  if name in ['Walk','Run']:
   amp=22 if name=='Walk' else 34
   for side,sign in [('Left',1),('Right',-1)]:
    swing=math.sin(phase)*sign
    rotate(side+'UpLeg',(0,1,0),swing*amp)
    rotate(side+'Leg',(0,1,0),-max(0,-swing)*(30 if name=='Walk' else 65))
    rotate(side+'Foot',(0,1,0),max(0,-swing)*12)
    rotate(side+'Arm',(0,1,0),-swing*(15 if name=='Walk' else 25))
    rotate(side+'ForeArm',(0,1,0),-12 if name=='Walk' else -45)
   rotate('Spine',(0,0,1),0)
  if name=='Wave':
   envelope=min(1,(frame-1)/12,(frames+1-frame)/12)
   rotate('RightArm',(1,0,0),-75*envelope)
   rotate('RightForeArm',(1,0,0),-75*envelope)
   rotate('RightHand',(0,1,0),math.sin(phase*3)*18*envelope)
  if name=='Shop':
   envelope=math.sin((frame-1)/frames*math.pi)**2
   for side in ['Left','Right']:
    bpy.context.view_layer.update()
    neutral=rig.matrix_world@bones[side+'ForeArm'].tail
    target=Vector((-.21,-.13 if side=='Left' else .13,.96))
    reach(side,neutral.lerp(target,envelope))
    hand=bones[side+'Hand'];head=hand.head.copy()
    direction=rig.matrix_world.to_3x3().inverted()@Vector((-1,0,0))
    turn=(hand.tail-head).rotation_difference(direction)
    turn=Quaternion().slerp(turn,envelope)
    hand.matrix=Matrix.Translation(head)@turn.to_matrix().to_4x4()@Matrix.Translation(-head)@hand.matrix
  for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
 track=rig.animation_data.nla_tracks.new();track.name=name
 strip=track.strips.new(name,1,action);strip.action_frame_start=1;strip.action_frame_end=frames+1
 track.mute=True
 clips.append({'name':name,'frames':frames+1,'fps':30})
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_start=1;scene.frame_end=91
os.makedirs(os.path.join(root,'public/assets/characters'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,'indian_man_animated.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(folder,'indian_man_animated-draft.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
# Render a neutral and three action poses using the actual deformed model.
rig.animation_data.use_nla=False
for track in rig.animation_data.nla_tracks:track.mute=True
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1)
deps=bpy.context.evaluated_depsgraph_get()
points=[o.evaluated_get(deps).matrix_world @ Vector(c) for o in scene.objects if o.type=='MESH' for c in o.evaluated_get(deps).bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)/2;h=hi.z-lo.z
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.18,.18,1)
bpy.ops.object.camera_add(location=center+Vector((-h*2.4,-h*1.1,h*.15)));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=h*1.35;scene.camera=cam
for offset,power in [((2,-3,4),900),((-3,-1,2),600)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset));light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=4;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
for name,frame in [('Idle',1),('Walk',9),('Run',6),('Wave',32),('Shop',45)]:
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);scene.render.filepath=os.path.join(folder,name.lower()+'-preview.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,'indian_man_animated.blend'))
with open(os.path.join(folder,'animation-report.json'),'w') as f:json.dump({'clips':clips,'method':'Authored additive skeletal keyframes; first-pass animation requiring deformation review'},f,indent=2)
