# Blender speed test on this server (CPU only). Usage: blender -b -P tools/blender_bench.py -- <outDir> CYCLES|BLENDER_EEVEE_NEXT
# Nov 3 2026, 4 cores: Cycles 32 spp + denoise, 1080x1920 = 73 s/frame (simple scene); EEVEE Next via Xvfb+llvmpipe = 137 s for the first frame (needs libegl1).
import bpy, sys, time
eng = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.mesh.primitive_monkey_add(location=(0,0,1)); m = bpy.context.object; m.modifiers.new('s','SUBSURF').levels=2; bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new('skin'); mat.use_nodes=True; b=mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(0.8,0.5,0.4,1); b.inputs['Subsurface Weight'].default_value=0.3; m.data.materials.append(mat)
bpy.ops.mesh.primitive_plane_add(size=20)
bpy.ops.object.light_add(type='SUN', location=(3,-3,5)); bpy.context.object.data.energy=4
bpy.ops.object.camera_add(location=(0,-4,1.3), rotation=(1.5708,0,0)); sc.camera=bpy.context.object
w = bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.5,0.6,0.8,1)
sc.render.resolution_x=1080; sc.render.resolution_y=1920
sc.render.engine = eng
if eng=='CYCLES': sc.cycles.samples=32; sc.cycles.use_denoising=True; sc.cycles.device='CPU'
sc.render.filepath=f'{sys.argv[-2]}/t_{eng}.png'
t=time.time(); bpy.ops.render.render(write_still=True); print('TIME', eng, round(time.time()-t,1))
