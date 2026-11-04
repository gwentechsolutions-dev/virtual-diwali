import bpy, json, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'assets-source/characters/male/indian_man_in_dhoti.glb'))
report=[]
for o in bpy.context.scene.objects:
 if o.type=='ARMATURE':
  report.append({'name':o.name,'matrix':[list(r) for r in o.matrix_world],'bones':[{'name':b.name,'head':list(b.head_local),'tail':list(b.tail_local),'parent':b.parent.name if b.parent else None,'matrix':[list(r) for r in b.matrix_local]} for b in o.data.bones]})
print('RIG_REPORT',json.dumps(report))
with open(os.path.join(root,'assets-source/characters/male/rig-inspection.json'),'w') as f:json.dump(report,f,indent=2)
