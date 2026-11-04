exec(open(__file__.replace('diagnose_garments.py','inspect_character.py')).read().split('report=[]')[0])
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get()
data=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 evaluated=o.evaluated_get(dg)
 pts=[evaluated.matrix_world@v.co for v in evaluated.data.vertices]
 data.append({'name':o.name,'bounds':[[min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]],'groups':[g.name for g in o.vertex_groups],'matrix':[list(r) for r in o.matrix_world]})
print('MESH_REPORT',json.dumps(data))
with open(os.path.join(root,'assets-source/characters/male/mesh-inspection.json'),'w') as f:json.dump(data,f,indent=2)
