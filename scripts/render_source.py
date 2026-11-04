import bpy, math, os, json
from mathutils import Vector, Quaternion
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(root,'assets-source/characters/male')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(folder,'indian_man_in_dhoti.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
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
deps=bpy.context.evaluated_depsgraph_get()
points=[o.matrix_world @ Vector(c) for o in scene.objects if o.type=='MESH' for c in o.evaluated_get(deps).bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)/2;h=hi.z-lo.z
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.18,.18,1)
bpy.ops.object.camera_add(location=center+Vector((h*1.3,-h*2.4,h*.45)));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=h*1.35;scene.camera=cam
for offset,power in [((2,-3,4),900),((-3,-1,2),600)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset));light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=4;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()

scene.render.filepath=os.path.join(folder,'source-preview.png');bpy.ops.render.render(write_still=True)
