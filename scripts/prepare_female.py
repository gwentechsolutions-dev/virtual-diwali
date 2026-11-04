import bpy, bmesh, os, json
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(root,'assets-source/characters/female')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(folder,'kangana ranaout.glb'))
report=[]
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 before=len(o.data.polygons)
 if o.name=='head base.001':
  # Weld export-duplicated vertices without collapsing strand surfaces.
  bm=bmesh.new();bm.from_mesh(o.data)
  bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
  bm.to_mesh(o.data);bm.free()
 # Preserve facial and garment meshes; reduce unusually dense decorative geometry.
 # The hair is many separate narrow strands. Decimation removes entire strand
 # faces, creating the spotted scalp/back seen in the browser review.
 if len(o.data.vertices)>40000 and o.name!='head base.001':
  bpy.context.view_layer.objects.active=o
  modifier=o.modifiers.new('Browser geometry reduction','DECIMATE')
  modifier.ratio=.18 if len(o.data.vertices)>150000 else .4
  bpy.ops.object.modifier_apply(modifier=modifier.name)
  bm=bmesh.new();bm.from_mesh(o.data)
  loose=[v for v in bm.verts if not v.link_faces]
  if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
  bm.to_mesh(o.data);bm.free()
 o.data.update()
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 report.append({'name':o.name,'vertices':len(o.data.vertices),'polygonsBefore':before,'polygonsAfter':len(o.data.polygons),'min':[min(v[i] for v in pts) for i in range(3)],'max':[max(v[i] for v in pts) for i in range(3)]})
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,'female-prepared.blend'))
with open(os.path.join(folder,'preparation-report.json'),'w') as f:json.dump(report,f,indent=2)
print(json.dumps(report))
