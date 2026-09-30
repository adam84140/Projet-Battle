"""Master Assault — point de contrôle A : ébauche (blockout) dans Blender.

Volumes simples (ellipsoïdes, tubes, boîtes) posés sur le squelette du contrat, aux proportions mesurées
sur l'image 01 (proportions.json). C'est une ÉBAUCHE pour juger silhouette, proportions et volumes de
l'équipement ; ce n'est pas le modèle final (topologie, formes sculptées, textures viennent aux points B à D).

Chaque volume suit un os (pondération rigide), le tout forme un seul maillage body_LOD0 : l'ébauche passe
par la chaîne d'export verrouillée et le validateur (essai en jeu --fit) pour vérifier tôt la portée des
bras sur l'arme et la tête dans sa zone de touche.

Usage : python art/master-assault/blockout.py [--out art/build/master-assault/checkpoint-a] [--samples 48] [--no-export]
        blender -b -P art/master-assault/blockout.py -- [...]
"""
import argparse
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(REPO / 'tools' / 'blender'))

import bpy  # noqa: E402
import bmesh  # noqa: E402  (après bpy)
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import fl_export  # noqa: E402
import fl_review  # noqa: E402
from fl_common import collection, contract, g2b, rgb, save_blend, script_args  # noqa: E402
from fl_template import build_template, ensure_emblem_uv, ensure_team_mask, joint_positions  # noqa: E402

PROPS = json.loads((HERE / 'proportions.json').read_text(encoding='utf-8'))

# Couleurs de l'image 01 (sRGB), par matériau d'ébauche
COLORS = {
    'chemise': 0x3A5BA8, 'panneau': 0x1C2536, 'teeshirt': 0x1D1F22, 'gilet': 0x26282C, 'poche_noire': 0x1C1D20,
    'cuir': 0x6E4B2E, 'cuir_fonce': 0x4A3322, 'pantalon': 0x787752, 'botte': 0x5A3E2A, 'semelle': 0x2A211B,
    'peau': 0xF2B98C, 'cheveux': 0x3B2A1E, 'gant': 0x1E1F21, 'revers': 0xB8BCC4, 'metal': 0x8A8A86,
    'genouillere': 0x2B2D30, 'embleme_chemise': 0x3A5BA8, 'embleme_panneau': 0x1C2536,
}
# Zone du masque d'équipe (contrat, § 8) par matériau ; le reste est neutre
MASK = {
    'chemise': (1, 0, 0), 'panneau': (0, 1, 0), 'peau': (1, 1, 0), 'cheveux': (1, 1, 1),
    'embleme_chemise': (1, 0, 1), 'embleme_panneau': (0, 1, 1),
}
GREY = 0xCCCCCC  # gris de référence de l'atlas dans les zones teintées


class Builder:
    def __init__(self):
        self.parts = []
        self.col = collection('FL_Ebauche')

    def _add(self, name, bm, color, bone, smooth=True, emblem=None):
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = smooth
        me.uv_layers.new(name='UVMap')
        uv = me.uv_layers.new(name='emblem')
        if emblem:
            for loop in me.loops:
                uv.data[loop.index].uv = emblem(me.vertices[loop.vertex_index].co)
        ob = bpy.data.objects.new(name, me)
        self.col.objects.link(ob)
        ob.data.materials.append(material(color))
        vg = ob.vertex_groups.new(name=bone)
        vg.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        self.parts.append(ob)
        return ob

    # --- formes (positions dans le repère du jeu) ---
    def ellipsoid(self, name, c, r, color, bone, seg=24, rings=12):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
        m = Matrix.Translation(g2b(c)) @ Matrix.Diagonal((r[0], r[2], r[1], 1.0))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        return self._add(name, bm, color, bone)

    def tube(self, name, a, b, ra, rb, color, bone, seg=16, flat=1.0):
        a, b = g2b(a), g2b(b)
        d = b - a
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=ra, radius2=rb, depth=d.length)
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        m = Matrix.Translation((a + b) / 2) @ rot @ Matrix.Diagonal((1.0, flat, 1.0, 1.0))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        return self._add(name, bm, color, bone)

    def box(self, name, c, size, color, bone, rot=(0, 0, 0), bevel=0.012):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        if bevel:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel / max(min(size), 1e-3), segments=2, affect='EDGES', profile=0.5)
        # rot : angles (degrés) autour des axes du jeu x, y, z
        rx, ry, rz = (math.radians(v) for v in rot)
        R = Matrix.Rotation(rx, 4, 'X') @ Matrix.Rotation(-rz, 4, 'Y') @ Matrix.Rotation(ry, 4, 'Z')
        m = Matrix.Translation(g2b(c)) @ R @ Matrix.Diagonal((size[0], size[2], size[1], 1.0))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        return self._add(name, bm, color, bone, smooth=False)

    def patch(self, name, c, normal, up, size, color, bone):
        """Zone d'emblème carrée ; UV « emblem » couvrant [0, 1], haut de l'emblème en haut."""
        n = g2b(normal).normalized()
        u = g2b(up).normalized()
        right = u.cross(n).normalized()
        center = g2b(c)
        h = size / 2
        bm = bmesh.new()
        vs = [bm.verts.new(center + right * sx * h + u * sy * h) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        bm.faces.new(vs)

        def emblem_uv(co):
            d = co - center
            return ((d.dot(right) / h + 1) / 2, (d.dot(u) / h + 1) / 2)
        return self._add(name, bm, color, bone, smooth=False, emblem=emblem_uv)


_materials = {}


def emblem_image(kind='eagle', size=256):
    """Masque de l'emblème canonique (polygones du jeu), lignes de bas en haut comme Blender."""
    name = f'emblem_{kind}'
    img = bpy.data.images.get(name)
    if img:
        return img
    polys = contract()['emblems'][kind]
    ys, xs = np.mgrid[0:size, 0:size]
    px = (xs + 0.5) / size * 2 - 1
    py = (ys + 0.5) / size * 2 - 1
    inside = np.zeros((size, size), dtype=bool)
    for poly in polys:
        acc = np.zeros_like(inside)
        n = len(poly)
        for i in range(n):
            x1, y1 = poly[i]
            x2, y2 = poly[(i + 1) % n]
            cond = ((y1 > py) != (y2 > py)) & (px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1)
            acc ^= cond
        inside |= acc
    rgba = np.zeros((size, size, 4), dtype=np.float32)
    rgba[..., :3] = inside[..., None]
    rgba[..., 3] = 1
    img = bpy.data.images.new(name, size, size)
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


def material(key):
    if key in _materials:
        return _materials[key]
    m = bpy.data.materials.new(f'ebauche_{key}')
    m.use_nodes = True
    m.use_backface_culling = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = rgb(COLORS[key])
    bsdf.inputs['Roughness'].default_value = 0.5 if key == 'peau' else 0.75
    if key.startswith('embleme'):
        uvn = nt.nodes.new('ShaderNodeUVMap')
        uvn.uv_map = 'emblem'
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = emblem_image('eagle')
        tex.extension = 'CLIP'
        mix = nt.nodes.new('ShaderNodeMixRGB')
        mix.inputs['Color1'].default_value = rgb(COLORS[key])
        mix.inputs['Color2'].default_value = (1, 1, 1, 1)
        nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'], mix.inputs['Fac'])
        nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    _materials[key] = m
    return m


def build_blockout(arm):
    J, _, P = joint_positions(PROPS)
    B = Builder()
    v = lambda *a: Vector(a)  # noqa: E731
    # ---------- tête (image 01 : menton 1,62 m, sommet des cheveux 1,85 m, crâne de 0,17 × 0,20 m) ----------
    B.ellipsoid('crane', (0, 1.718, 0.012), (0.083, 0.100, 0.098), 'peau', 'head')
    B.ellipsoid('machoire', (0, 1.652, 0.045), (0.078, 0.052, 0.066), 'peau', 'head')
    B.ellipsoid('menton', (0, 1.625, 0.074), (0.036, 0.026, 0.030), 'peau', 'head', seg=16, rings=8)
    B.ellipsoid('nez', (0, 1.695, 0.108), (0.016, 0.028, 0.020), 'peau', 'head', seg=12, rings=6)
    for s in (1, -1):
        B.ellipsoid(f'oreille{s}', (0.080 * s, 1.705, 0.0), (0.013, 0.028, 0.020), 'peau', 'head', seg=12, rings=6)
        B.box(f'sourcil{s}', (0.033 * s, 1.744, 0.096), (0.052, 0.013, 0.020), 'cheveux', 'head', rot=(0, 0, -8 * s), bevel=0.004)
    B.ellipsoid('cheveux_calotte', (0, 1.768, -0.024), (0.092, 0.074, 0.101), 'cheveux', 'head')
    B.ellipsoid('cheveux_dessus', (0, 1.806, 0.022), (0.092, 0.048, 0.096), 'cheveux', 'head')
    B.ellipsoid('cheveux_meche', (0.012, 1.812, 0.080), (0.068, 0.038, 0.045), 'cheveux', 'head', seg=16, rings=8)
    B.tube('cou', (0, 1.52, -0.012), (0, 1.66, 0.0), 0.067, 0.062, 'peau', 'neck')
    # ---------- buste en V (épaules 0,61 m aux deltoïdes, taille 0,36 m) ----------
    B.ellipsoid('poitrine', (0, 1.36, 0.0), (0.200, 0.160, 0.152), 'chemise', 'chest')
    B.ellipsoid('trapezes', (0, 1.49, -0.020), (0.165, 0.070, 0.100), 'chemise', 'chest')
    B.ellipsoid('abdomen', (0, 1.22, 0.0), (0.172, 0.140, 0.125), 'chemise', 'spine1')
    B.ellipsoid('taille', (0, 1.12, 0.0), (0.165, 0.100, 0.120), 'chemise', 'spine')
    B.tube('col', (0, 1.530, 0.0), (0, 1.605, 0.012), 0.088, 0.080, 'chemise', 'chest')
    B.box('teeshirt', (0, 1.525, 0.070), (0.075, 0.065, 0.020), 'teeshirt', 'chest', rot=(-15, 0, 0), bevel=0.006)
    # gilet porte-chargeurs, panneau du dos (teinte sombre d'équipe), poches
    for s in (1, -1):
        B.box(f'gilet_avant{s}', (0.105 * s, 1.29, 0.118), (0.140, 0.300, 0.080), 'gilet', 'chest', rot=(-8, 0, 0))
        B.box(f'gilet_cote{s}', (0.185 * s, 1.25, 0.0), (0.050, 0.240, 0.200), 'gilet', 'spine1')
        for k, x in enumerate((0.065, 0.150)):
            B.box(f'poche_gilet{s}{k}', (x * s, 1.265, 0.170), (0.064, 0.110, 0.050), 'poche_noire', 'chest', rot=(-8, 0, 0))
    B.box('gilet_dos', (0, 1.30, -0.125), (0.340, 0.300, 0.075), 'gilet', 'chest')
    B.box('panneau_dos', (0, 1.35, -0.166), (0.220, 0.220, 0.020), 'panneau', 'chest', bevel=0.006)
    # harnais de cuir (bretelles devant, Y dans le dos)
    for s in (1, -1):
        B.tube(f'bretelle_avant{s}', (0.110 * s, 1.535, 0.020), (0.100 * s, 1.130, 0.160), 0.017, 0.017, 'cuir', 'chest', seg=8)
        B.tube(f'bretelle_dos{s}', (0.110 * s, 1.535, -0.040), (0.0, 1.300, -0.168), 0.017, 0.017, 'cuir', 'chest', seg=8)
    B.tube('bretelle_dos_bas', (0, 1.300, -0.168), (0, 1.110, -0.150), 0.017, 0.017, 'cuir', 'chest', seg=8)
    # ceinture et poches tout autour
    B.ellipsoid('ceinture', (0, 1.070, -0.005), (0.200, 0.045, 0.158), 'cuir_fonce', 'hips', seg=28, rings=8)
    B.box('boucle', (0, 1.070, 0.157), (0.060, 0.050, 0.020), 'metal', 'hips', bevel=0.005)
    for s in (1, -1):
        B.box(f'poche_ceinture_avant{s}', (0.100 * s, 1.075, 0.165), (0.085, 0.100, 0.050), 'cuir', 'hips')
        B.box(f'poche_ceinture_cote{s}', (0.190 * s, 1.070, 0.050), (0.050, 0.100, 0.090), 'cuir', 'hips')
        B.box(f'poche_ceinture_dos{s}', (0.100 * s, 1.070, -0.160), (0.085, 0.100, 0.050), 'cuir', 'hips')
    # bassin
    B.ellipsoid('bassin', (0, 0.965, -0.010), (0.185, 0.110, 0.140), 'pantalon', 'hips')
    B.ellipsoid('fessier', (0, 0.925, -0.065), (0.165, 0.095, 0.110), 'pantalon', 'hips')
    # ---------- bras (A-pose du gabarit) ----------
    for sd, s in (('L', 1), ('R', -1)):
        sh, el, wr = J[f'upperArm.{sd}'], J[f'lowerArm.{sd}'], J[f'hand.{sd}']
        d = (wr - el).normalized()
        lerp = lambda t: sh + (el - sh) * t  # noqa: E731
        B.ellipsoid(f'deltoide{sd}', sh + v(0.008 * s, 0.005, 0), (0.078, 0.085, 0.085), 'chemise', f'upperArm.{sd}')
        B.tube(f'manche{sd}', sh, lerp(0.66), 0.075, 0.070, 'chemise', f'upperArm.{sd}')
        B.tube(f'revers{sd}', lerp(0.62), lerp(0.80), 0.080, 0.078, 'revers', f'upperArm.{sd}')
        B.tube(f'biceps{sd}', lerp(0.78), el, 0.062, 0.057, 'peau', f'upperArm.{sd}')
        B.ellipsoid(f'coude{sd}', el, (0.056, 0.056, 0.056), 'peau', f'lowerArm.{sd}', seg=16, rings=8)
        B.tube(f'avant_bras{sd}', el, wr, 0.058, 0.044, 'peau', f'lowerArm.{sd}')
        B.tube(f'poignet{sd}', wr - d * 0.02, wr + d * 0.03, 0.048, 0.047, 'gant', f'hand.{sd}')
        B.tube(f'paume{sd}', wr + d * 0.02, wr + d * 0.105, 0.048, 0.046, 'gant', f'hand.{sd}', flat=0.7)
        B.tube(f'doigts{sd}', wr + d * 0.095, wr + d * 0.175, 0.040, 0.032, 'peau', f'hand.{sd}', flat=0.7)
        B.tube(f'pouce{sd}', wr + d * 0.03 + v(0, 0, 0.025), wr + d * 0.08 + v(0, 0, 0.05), 0.016, 0.014, 'gant', f'hand.{sd}', seg=8)
        # emblème de manche (côté extérieur du bras)
        along = (el - sh).normalized()
        n = (v(s, 0, 0) - along * along.dot(v(s, 0, 0))).normalized()  # côté extérieur du bras
        B.patch(f'embleme_manche{sd}', lerp(0.38) + n * 0.079, n, (sh - el).normalized(), 0.080, 'embleme_chemise', f'upperArm.{sd}')
    # ---------- jambes ----------
    for sd, s in (('L', 1), ('R', -1)):
        hip, kn, an = J[f'thigh.{sd}'], J[f'calf.{sd}'], J[f'foot.{sd}']
        up = (kn - an).normalized()
        B.tube(f'cuisse{sd}', hip + v(0, 0.04, 0), kn, 0.125, 0.090, 'pantalon', f'thigh.{sd}')
        B.ellipsoid(f'genou{sd}', kn, (0.085, 0.085, 0.085), 'pantalon', f'calf.{sd}', seg=16, rings=8)
        B.ellipsoid(f'genouillere{sd}', kn + v(0, 0.01, 0.075), (0.062, 0.075, 0.035), 'genouillere', f'calf.{sd}', seg=16, rings=8)
        B.tube(f'tibia{sd}', kn, kn + (an - kn) * 0.62, 0.090, 0.098, 'pantalon', f'calf.{sd}')
        B.ellipsoid(f'bouffant{sd}', kn + (an - kn) * 0.66, (0.102, 0.038, 0.102), 'pantalon', f'calf.{sd}', seg=16, rings=8)
        B.tube(f'tige_botte{sd}', an, an + up * 0.18, 0.074, 0.076, 'botte', f'calf.{sd}')
        B.box(f'botte{sd}', an + v(0, -0.050, 0.060), (0.125, 0.110, 0.300), 'botte', f'foot.{sd}', bevel=0.03)
        B.ellipsoid(f'bout_botte{sd}', an + v(0, -0.066, 0.170), (0.064, 0.050, 0.070), 'botte', f'toe.{sd}', seg=16, rings=8)
        B.box(f'semelle{sd}', an + v(0, -0.1025, 0.060), (0.135, 0.035, 0.325), 'semelle', f'foot.{sd}', bevel=0.01)
        for k, y in enumerate((0.79, 0.72)):
            t = (hip.y - y) / (hip.y - kn.y)
            p = hip + (kn - hip) * t
            B.tube(f'sangle_cuisse{sd}{k}', p + v(0, 0.013, 0), p - v(0, 0.013, 0), 0.113, 0.110, 'poche_noire', f'thigh.{sd}', seg=16)
    B.box('etui', (-0.215, 0.800, 0.020), (0.050, 0.210, 0.110), 'poche_noire', 'thigh.R')
    B.box('crosse_pistolet', (-0.205, 0.925, -0.010), (0.035, 0.070, 0.050), 'poche_noire', 'thigh.R', bevel=0.006)
    B.box('poche_cuisse', (0.215, 0.790, 0.020), (0.050, 0.130, 0.100), 'poche_noire', 'thigh.L')
    # ---------- emblèmes : poitrine (sur la chemise) et grand emblème du dos (sur le panneau) ----------
    B.patch('embleme_poitrine', (0, 1.400, 0.148), (0, 0, 1), (0, 1, 0), 0.070, 'embleme_chemise', 'chest')
    B.patch('embleme_dos', (0, 1.360, -0.178), (0, 0, -1), (0, 1, 0), 0.170, 'embleme_panneau', 'chest')
    # ---------- un seul maillage, lié à l'armature ----------
    bpy.ops.object.select_all(action='DESELECT')
    for ob in B.parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = B.parts[0]
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = body.data.name = 'body_LOD0'
    for c in list(body.users_collection):
        c.objects.unlink(body)
    collection('FL_Body').objects.link(body)
    body.parent = arm
    mod = body.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    return body


def to_contract_asset(body):
    """Convertit l'ébauche au contrat : un matériau M_body (atlas de couleurs), masque d'équipe, UV d'atlas."""
    me = body.data
    keys = [m.name.replace('ebauche_', '') for m in me.materials]
    # atlas 256² : une case de 8 px par couleur ; zones teintées au gris de référence
    atlas_hex = lambda k: GREY if k in MASK else COLORS[k]  # noqa: E731
    cells = {}
    for k in keys:
        cells.setdefault(atlas_hex(k), len(cells))
    size = 256
    rgba = np.zeros((size, size, 4), dtype=np.float32)
    rgba[..., 3] = 1
    for hexv, i in cells.items():
        x, y = (i % 32) * 8, (i // 32) * 8
        rgba[y:y + 8, x:x + 8, :3] = [((hexv >> sh) & 255) / 255 for sh in (16, 8, 0)]  # octets sRGB
    img = bpy.data.images.new('atlas', size, size)
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    attr = ensure_team_mask(body)
    ensure_emblem_uv(body)
    uv = me.uv_layers['UVMap']
    for poly in me.polygons:
        k = keys[poly.material_index]
        i = cells[atlas_hex(k)]
        u, w = ((i % 32) * 8 + 4) / size, ((i // 32) * 8 + 4) / size
        code = MASK.get(k, (0, 0, 0))
        for li in poly.loop_indices:
            uv.data[li].uv = (u, w)
            attr.data[li].color = (*code, 1.0)
    me.materials.clear()
    m = bpy.data.materials.new('M_body')
    m.use_backface_culling = True
    m.use_nodes = True
    tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Closest'
    m.node_tree.links.new(tex.outputs['Color'], m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    me.materials.append(m)
    return body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(REPO / 'art' / 'build' / 'master-assault' / 'checkpoint-a'))
    ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--no-export', action='store_true')
    ap.add_argument('--fit', action='store_true', help='essai en jeu après export')
    a = ap.parse_args(script_args())
    out = Path(a.out)
    arm = build_template(PROPS)
    body = build_blockout(arm)
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    print(f'ébauche : {tris} triangles, {len(body.data.vertices)} sommets')
    save_blend(out / 'master-assault-ebauche.blend')
    renders = fl_review.render_views(out / 'vues', samples=a.samples)
    stats = fl_review.compare_sheet(renders, out / 'comparaison.png')
    print('recouvrement des silhouettes (référence / ébauche) :', stats)
    (out / 'mesures.json').write_text(json.dumps({'triangles': tris, 'recouvrement': stats}, indent=1), encoding='utf-8')
    if a.no_export:
        return
    to_contract_asset(body)
    code = fl_export.export(out / 'ebauche.glb', 'prototype', a.fit)
    print('export de l’ébauche :', 'accepté' if code == 0 else 'refusé')


if __name__ == '__main__':
    main()
