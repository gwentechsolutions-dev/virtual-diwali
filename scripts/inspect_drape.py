import bpy,bmesh,os,json
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'assets-source/characters/female/female-prepared.blend'))
o=bpy.data.objects['PALU'];bm=bmesh.new();bm.from_mesh(o.data)
boundary=[e for e in bm.edges if e.is_boundary]
print('DRAPE_TOPOLOGY',json.dumps({'vertices':len(bm.verts),'faces':len(bm.faces),'boundaryEdges':len(boundary),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'upperBoundaryPoints':[list(o.matrix_world@v.co) for e in boundary for v in e.verts if (o.matrix_world@v.co).z>1.3][:50]}))
bm.free()
