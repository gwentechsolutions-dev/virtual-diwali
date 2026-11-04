import bpy
from mathutils import Matrix, Vector

def repair(rig):
 bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get()
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
 for o in meshes:
  evaluated=o.evaluated_get(dg)
  mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=dg)
  mesh.transform(evaluated.matrix_world)
  o.modifiers.clear();o.parent=None;o.matrix_world=Matrix.Identity(4);o.data=mesh
  if o.name in ['Object_7','Object_8']:
   # Fit the existing cloth panels to the body's ankle-to-waist span.
   low=min(v.co.z for v in mesh.vertices);high=max(v.co.z for v in mesh.vertices)
   for v in mesh.vertices:
    t=(v.co.z-low)/(high-low)
    v.co.z=.12+t*.52
    v.co.x=(v.co.x-.007)*.29
    # Body shirt-waist half-width is .085m after proportional correction;
    # taper the upper edge to that size while keeping room at the ankles.
    v.co.y*=.70*(.72-.16*t)
   o.vertex_groups.clear()
   hip=o.vertex_groups.new(name='Hips_01')
   left=o.vertex_groups.new(name='LeftUpLeg_057');right=o.vertex_groups.new(name='RightUpLeg_062')
   for v in mesh.vertices:
    t=max(0,min(1,(.64-v.co.z)/.52));legweight=t*.45
    hip.add([v.index],1-legweight,'REPLACE')
    side=max(0,min(1,.5+v.co.y/.12))
    left.add([v.index],legweight*side,'REPLACE');right.add([v.index],legweight*(1-side),'REPLACE')
 bpy.context.view_layer.objects.active=rig
 bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
 # The imported deformed mesh is smaller than its armature in all axes.
 # Refit the rest skeleton in world space before creating new bind matrices.
 bpy.ops.object.mode_set(mode='EDIT')
 inv=rig.matrix_world.inverted()
 for b in rig.data.edit_bones:
  for attr in ['head','tail']:
   p=rig.matrix_world@getattr(b,attr)
   p.x*=.5;p.y*=.28;p.z*=.66
   setattr(b,attr,inv@p)
 bpy.ops.object.mode_set(mode='OBJECT')
 # Rebuild shirt influences: the imported shirt incorrectly follows lower-body bones.
 shirt=next((o for o in meshes if o.name=='Object_91'),None)
 if shirt:
  names=['Hips_01','Spine_02','Spine1_03','Spine2_04','LeftShoulder_010','LeftArm_011','LeftForeArm_012','RightShoulder_034','RightArm_035','RightForeArm_036']
  shirt.vertex_groups.clear()
  groups={name:shirt.vertex_groups.new(name=name) for name in names}
  segments={name:(rig.matrix_world@rig.data.bones[name].head_local,rig.matrix_world@rig.data.bones[name].tail_local) for name in names}
  for vertex in shirt.data.vertices:
   distances=[]
   for name,(a,b) in segments.items():
    if abs(vertex.co.y)<.038 and ('Arm' in name or 'Shoulder' in name):continue
    if abs(vertex.co.y)>.075 and not ('Arm' in name or 'Shoulder' in name):continue
    ab=b-a;t=max(0,min(1,(vertex.co-a).dot(ab)/max(ab.length_squared,1e-9)))
    distance=(vertex.co-(a+t*ab)).length
    distances.append((distance,name))
   nearest=sorted(distances)[:3];weights=[1/max(d,.015)**4 for d,n in nearest];total=sum(weights)
   for (distance,name),weight in zip(nearest,weights):groups[name].add([vertex.index],weight/total,'REPLACE')
 # The imported evaluated body is compressed across the shoulders (world Y).
 # Apply the same proportional correction to geometry and the rest skeleton,
 # so skinning stays aligned instead of stretching only the rendered root.
 correction=Matrix.Diagonal((1.15,1.7,1.0,1.0))
 for o in meshes:o.data.transform(correction)
 bpy.ops.object.mode_set(mode='EDIT')
 for b in rig.data.edit_bones:
  b.head=inv @ correction @ rig.matrix_world @ b.head
  b.tail=inv @ correction @ rig.matrix_world @ b.tail
 bpy.ops.object.mode_set(mode='OBJECT')
 for o in meshes:
  modifier=o.modifiers.new('Character skin','ARMATURE');modifier.object=rig
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
 bpy.context.view_layer.update()
