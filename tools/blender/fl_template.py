"""Gabarit Blender du personnage de production (contrat d'asset, docs/characters/ASSET-CONTRACT.md).

Crée une scène prête à modéliser :
  - unités métriques (échelle 1), 30 images/s ;
  - armature « MasterAssault » : les 23 os requis du contrat, noms exacts (upperArm.L…), hiérarchie,
    os déformants, positions de repos en A-pose ;
  - points d'attache socket_* : objets vides parentés aux os (survivent à l'export « os de déformation ») ;
  - collection FL_Reference (jamais exportée) : hauteur 1,85 m, sphère de touche de la tête, cylindre de
    touche du corps ;
  - palette « FL_teamMask » : les 8 couleurs pures du masque d'équipe (peinture de sommets).

Usage :
  blender -b -P tools/blender/fl_template.py -- --out gabarit.blend [--props proportions.json]
  python tools/blender/fl_template.py --out gabarit.blend [--props proportions.json]

Les proportions par défaut sont celles du contrat ; un personnage peut fournir les siennes (--props),
dans les tolérances du contrat (voir art/master-assault/proportions.json).
"""
import argparse
import json
import math

import bpy
from mathutils import Matrix, Vector

from fl_common import collection, contract, g2b, save_blend, script_args

# Proportions par défaut (repère du jeu, mètres) : longueurs et angles de l'A-pose
DEFAULT_PROPS = {
    'arm_angle_deg': 45.0,   # bras / verticale (contrat : 30 à 60°), dans le plan de face
    'arm_forward_deg': 0.0,  # bras portés vers l'avant (A-pose détendue)
    'elbow_bend_deg': 0.0,   # avant-bras plié vers l'avant (contrat : 20° au plus)
    'upper_arm': 0.30,       # épaule -> coude
    'forearm': 0.30,         # coude -> poignet
    'hand': 0.10,            # longueur de l'os de la main (poignet -> milieu des doigts)
    'thigh': 0.42,           # hanche -> genou
    'shin': 0.39,            # genou -> cheville
    'leg_spread_deg': 4.0,   # écartement des jambes / verticale
    'toe': [0.0, -0.06, 0.13],  # cheville -> orteils (x, y, z)
    'positions': {},         # os -> position imposée (repère du jeu), dans les tolérances du contrat
    'sockets': {},           # point d'attache -> position imposée (repère du jeu)
}


def joint_positions(props):
    """Positions (repère du jeu) des têtes et queues d'os en A-pose."""
    C = contract()
    p = {**DEFAULT_PROPS, **(props or {})}
    head = {}
    for b in C['requiredBones']:
        if b.get('target'):
            head[b['name']] = Vector(p['positions'].get(b['name'], b['target']))
    a = math.radians(p['arm_angle_deg'])
    sp = math.radians(p['leg_spread_deg'])
    tail = {}
    fwd = math.radians(p['arm_forward_deg'])
    bend = math.radians(p['elbow_bend_deg'])
    ahead = Vector((0, 0, 1))
    for sd, s in (('L', 1), ('R', -1)):
        side = Vector((s * math.sin(a), -math.cos(a), 0))
        arm = (side * math.cos(fwd) + ahead * math.sin(fwd)).normalized()
        fore = (side * math.cos(fwd + bend) + ahead * math.sin(fwd + bend)).normalized()
        leg = Vector((s * math.sin(sp), -math.cos(sp), 0))
        head[f'lowerArm.{sd}'] = head[f'upperArm.{sd}'] + arm * p['upper_arm']
        head[f'hand.{sd}'] = head[f'lowerArm.{sd}'] + fore * p['forearm']
        tail[f'hand.{sd}'] = head[f'hand.{sd}'] + fore * p['hand']
        head[f'calf.{sd}'] = head[f'thigh.{sd}'] + leg * p['thigh']
        head[f'foot.{sd}'] = head[f'calf.{sd}'] + leg * p['shin']
        head[f'toe.{sd}'] = head[f'foot.{sd}'] + Vector(p['toe'])
        tail[f'toe.{sd}'] = head[f'toe.{sd}'] + Vector((0, 0, 0.07))
        tail[f'clavicle.{sd}'] = head[f'upperArm.{sd}']
        tail[f'upperArm.{sd}'] = head[f'lowerArm.{sd}']
        tail[f'lowerArm.{sd}'] = head[f'hand.{sd}']
        tail[f'thigh.{sd}'] = head[f'calf.{sd}']
        tail[f'calf.{sd}'] = head[f'foot.{sd}']
        tail[f'foot.{sd}'] = head[f'toe.{sd}']
    tail['root'] = Vector((0, 0, 0.2))  # couché vers l'avant
    tail['hips'] = head['spine']
    tail['spine'] = head['spine1']
    tail['spine1'] = head['chest']
    tail['chest'] = head['neck']
    tail['neck'] = head['head']
    tail['head'] = head['head'] + Vector((0, 0.2, 0))
    return head, tail, p


def socket_positions(head, p):
    def hand_socket(sd):
        d = (head[f'hand.{sd}'] - head[f'lowerArm.{sd}']).normalized()
        return head[f'hand.{sd}'] + d * 0.08
    pos = {
        'socket_hand.R': hand_socket('R'),
        'socket_hand.L': hand_socket('L'),
        'socket_back': Vector((0, head['chest'].y - 0.02, -0.17)),
        'socket_head': head['head'] + Vector((0, 0.19, 0)),
        'socket_face': head['head'] + Vector((0, 0.10, 0.11)),
        'socket_hip.L': Vector((0.17, head['hips'].y + 0.02, 0.03)),
        'socket_hip.R': Vector((-0.17, head['hips'].y + 0.02, 0.03)),
        'socket_grenade': Vector((0.11, head['hips'].y + 0.02, 0.14)),
        'socket_weapon': Vector((-0.19, 1.25, 0.21)),
    }
    for k, v in p['sockets'].items():
        pos[k] = Vector(v)
    return pos


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.name = 'FrontlineLegends'
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0
    sc.unit_settings.length_unit = 'METERS'
    sc.render.fps = 30
    sc.render.fps_base = 1.0
    return sc


def build_armature(props=None, name='MasterAssault'):
    """Armature du contrat. Retourne (objet armature, positions des têtes d'os, points d'attache)."""
    C = contract()
    head, tail, p = joint_positions(props)
    rig_col = collection('FL_Rig')
    data = bpy.data.armatures.new(f'{name}_rig')
    data.display_type = 'OCTAHEDRAL'
    arm = bpy.data.objects.new(name, data)
    arm.show_in_front = True
    rig_col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for b in C['requiredBones']:
        eb = data.edit_bones.new(b['name'])
        eb.head = g2b(head[b['name']])
        eb.tail = g2b(tail[b['name']])
        eb.use_deform = True  # root compris : l'export « os de déformation seulement » le garde
        eb.use_connect = False
    for b in C['requiredBones']:
        if b['parent']:
            data.edit_bones[b['name']].parent = data.edit_bones[b['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    # points d'attache : objets vides parentés aux os
    sockets = socket_positions(head, p)
    for s in C['sockets']:
        e = bpy.data.objects.new(s['name'], None)
        e.empty_display_type = 'ARROWS'
        e.empty_display_size = 0.06
        rig_col.objects.link(e)
        e.parent = arm
        e.parent_type = 'BONE'
        e.parent_bone = s['parent']
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(g2b(sockets[s['name']]))
    bpy.context.view_layer.update()
    return arm, head, sockets


def build_reference():
    """Repères jamais exportés : hauteur visée, zones de touche du gameplay (src/game/Soldier.js)."""
    C = contract()
    ref = collection('FL_Reference')
    h = C['asset']['heightM']
    me = bpy.data.meshes.new('REF_hauteur')
    me.from_pydata([(0.45, 0, 0), (0.45, 0, h), (0.35, 0, h), (0.55, 0, h)], [(0, 1), (2, 3)], [])
    ob = bpy.data.objects.new(f'REF_hauteur_{h:.2f}m', me)
    ref.objects.link(ob)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=g2b((0, 1.724, 0)), segments=24, ring_count=12)
    sphere = bpy.context.active_object
    sphere.name = 'REF_touche_tete'
    bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=1.35, location=g2b((0, 0.1 + 1.35 / 2, 0)), vertices=24)
    cyl = bpy.context.active_object
    cyl.name = 'REF_touche_corps'
    for o in (sphere, cyl):
        for c in list(o.users_collection):
            c.objects.unlink(o)
        ref.objects.link(o)
    for o in ref.objects:
        o.display_type = 'WIRE'
        o.hide_render = True
        o.hide_select = True
    return ref


def team_mask_palette():
    """Palette des 8 couleurs pures du masque d'équipe (contrat, § 8)."""
    C = contract()
    pal = bpy.data.palettes.get('FL_teamMask') or bpy.data.palettes.new('FL_teamMask')
    for c in list(pal.colors):
        pal.colors.remove(c)
    for code in C['teamMask']['codes']:
        col = pal.colors.new()
        col.color = code['rgb']
    return pal


def ensure_team_mask(obj, fill=(0.0, 0.0, 0.0)):
    """Attribut de couleur « teamMask » (coin de face, octets), actif et utilisé au rendu."""
    me = obj.data
    attr = me.color_attributes.get('teamMask')
    if attr is None:
        attr = me.color_attributes.new(name='teamMask', type='BYTE_COLOR', domain='CORNER')
        attr.data.foreach_set('color', [*fill, 1.0] * len(attr.data))
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find('teamMask')
    return attr


def ensure_emblem_uv(obj):
    """2ᵉ carte UV « emblem » (TEXCOORD_1) ; la première reste celle de l'atlas."""
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.get('emblem') or me.uv_layers.new(name='emblem')
    me.uv_layers.active_index = 0
    return uv


def build_template(props=None, reference=True):
    reset_scene()
    arm, head, sockets = build_armature(props)
    collection('FL_Body')
    if reference:
        build_reference()
    team_mask_palette()
    return arm


def main():
    ap = argparse.ArgumentParser(description='Gabarit Blender du contrat d’asset Frontline Legends')
    ap.add_argument('--out', required=True, help='fichier .blend à écrire')
    ap.add_argument('--props', help='proportions (JSON) du personnage, sinon celles du contrat')
    ap.add_argument('--no-reference', action='store_true', help='sans la collection de repères')
    a = ap.parse_args(script_args())
    props = json.loads(open(a.props, encoding='utf-8').read()) if a.props else None
    build_template(props, reference=not a.no_reference)
    print('gabarit écrit :', save_blend(a.out))


if __name__ == '__main__':
    main()
