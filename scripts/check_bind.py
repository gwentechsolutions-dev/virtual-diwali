exec(open(__file__.replace('check_bind.py','animate_character.py')).read().split('clips=[]')[0])
for name in ['Hips','Spine2','Head','LeftArm','LeftForeArm','LeftHand','LeftUpLeg','LeftLeg','LeftFoot']:
 b=bones[name]; print(name,'rest',list(rig.matrix_world@b.bone.head_local),'posed',list(rig.matrix_world@b.head),'tail',list(rig.matrix_world@b.tail))
