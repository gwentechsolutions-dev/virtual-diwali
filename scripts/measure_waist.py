exec(open(__file__.replace('measure_waist.py','animate_character.py')).read().split('clips=[]')[0])
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 waist=[p for p in pts if .52<p.z<.65]
 if waist:print('WAIST',o.name,'count',len(waist),'x',min(p.x for p in waist),max(p.x for p in waist),'y',min(p.y for p in waist),max(p.y for p in waist))
