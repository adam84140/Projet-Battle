"""Auto-test de la chaîne Blender -> glTF -> validateur (sans art) : gabarit, mannequin pondéré
automatiquement, masque d'équipe, atlas, matériau M_body, export verrouillé, npm run check:glb.
Prouve que les réglages de fl_export.py et le contrat s'accordent avec le vrai exportateur de Blender.

Usage : python tools/blender/fl_selftest.py [--out dossier] [--fit]
        blender -b -P tools/blender/fl_selftest.py -- [--out dossier] [--fit]
Code de sortie : 0 si le validateur accepte le fichier au stade prototype.
"""
import argparse
import sys
from pathlib import Path

import bpy
import bmesh  # après bpy (module Python bpy)

from fl_common import REPO, g2b, save_blend, script_args
from fl_template import build_template, ensure_emblem_uv, ensure_team_mask, joint_positions
import fl_export


def mannequin(arm):
    """Mannequin continu (modificateur Skin sur les articulations), lié par poids automatiques."""
    head, tail, _ = joint_positions(None)
    radius = {'hips': 0.16, 'spine': 0.15, 'spine1': 0.16, 'chest': 0.17, 'neck': 0.06, 'head': 0.1}
    names = [n for n in head if n != 'root']  # la racine au sol ne porte pas de volume
    verts = [g2b(head[n]) for n in names]
    idx = {n: i for i, n in enumerate(names)}
    edges = []
    for n in names:
        b = arm.data.bones[n]
        if b.parent and b.parent.name in idx:
            edges.append((idx[b.parent.name], idx[n]))
    # sommet du crâne
    verts.append(g2b(tail['head']))
    edges.append((idx['head'], len(verts) - 1))
    me = bpy.data.meshes.new('body_LOD0')
    me.from_pydata(verts, edges, [])
    ob = bpy.data.objects.new('body_LOD0', me)
    bpy.data.collections['FL_Body'].objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    skin = ob.modifiers.new('skin', 'SKIN')
    for i, v in enumerate(ob.data.skin_vertices[0].data):
        n = names[i] if i < len(names) else 'head'
        base = n.split('.')[0]
        r = radius.get(base, {'foot': 0.045, 'toe': 0.03, 'hand': 0.045, 'lowerArm': 0.05}.get(base, 0.07))
        v.radius = (r, r)
    ob.data.skin_vertices[0].data[idx['hips']].use_root = True
    ob.modifiers.new('sub', 'SUBSURF').levels = 3
    dec = ob.modifiers.new('dec', 'DECIMATE')  # ramené dans le budget du LOD0 (12 000 à 18 000)
    dec.ratio = 0.62
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    # le mannequin est calé sur la hauteur du contrat (pieds au sol, 1,85 m) : ce n'est pas de l'art
    zs = [v.co.z for v in ob.data.vertices]
    lo, hi = min(zs), max(zs)
    for v in ob.data.vertices:
        v.co.z = (v.co.z - lo) * 1.85 / (hi - lo)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return ob


def paint_mask(ob):
    """Chemise (rouge) sur le buste, peau (jaune) sur la tête et les avant-bras, cheveux (blanc) en haut."""
    attr = ensure_team_mask(ob)
    ensure_emblem_uv(ob)
    me = ob.data
    for poly in me.polygons:
        z = poly.center.z
        code = (0, 0, 0)
        if 1.05 < z < 1.55 and abs(poly.center.x) < 0.33:
            code = (1, 0, 0)
        if z >= 1.55:
            code = (1, 1, 1) if z > 1.72 else (1, 1, 0)
        for li in poly.loop_indices:
            attr.data[li].color = (*code, 1.0)


def material(ob):
    img = bpy.data.images.new('atlas', 1024, 1024)
    img.generated_color = (0.6, 0.6, 0.6, 1.0)  # ≈ gris de référence #CCCCCC en sRGB
    img.pack()
    mat = bpy.data.materials.new('M_body')
    mat.use_backface_culling = True  # faces simples (glTF doubleSided = false)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    ob.data.materials.append(mat)
    # UV d'atlas : projection simple (le mannequin n'est pas de l'art)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(ob.data)
    uv = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (0.5 + l.vert.co.x * 0.5, l.vert.co.z / 1.9)
    bmesh.update_edit_mesh(ob.data)
    bpy.ops.object.mode_set(mode='OBJECT')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(REPO / 'art' / 'build' / 'selftest'))
    ap.add_argument('--fit', action='store_true')
    a = ap.parse_args(script_args())
    out = Path(a.out)
    arm = build_template()
    ob = mannequin(arm)
    paint_mask(ob)
    material(ob)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    print(f'mannequin : {tris} triangles')
    save_blend(out / 'selftest.blend')
    code = fl_export.export(out / 'selftest.glb', 'prototype', a.fit)
    print('AUTO-TEST', 'RÉUSSI' if code == 0 else 'ÉCHOUÉ')
    sys.exit(code)


if __name__ == '__main__':
    main()
