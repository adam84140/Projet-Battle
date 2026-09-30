"""Export glTF verrouillé du personnage de production, puis contrôle automatique (npm run check:glb).

Réglages imposés par le contrat (docs/characters/ASSET-CONTRACT.md, § 12) : l'artiste n'a pas à les
retrouver dans la fenêtre d'export, et une erreur de réglage ne peut plus partir dans le fichier.

Usage :
  blender -b perso.blend -P tools/blender/fl_export.py -- --out assault.glb [--stade prototype|production] [--fit] [--no-check]
  python tools/blender/fl_export.py --blend perso.blend --out assault.glb [...]
  Dans Blender (Scripting > Run Script) : exporte la scène ouverte vers //assault.glb et affiche le rapport.

Code de sortie : 0 si l'export est accepté par le validateur, 1 sinon (ou si un contrôle préalable échoue).
"""
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

import bpy

from fl_common import REPO, contract, open_blend, script_args

BODY = re.compile(r'^body_LOD[0-2]$')

# Réglages de l'exportateur glTF de Blender 4.5 LTS (contrat, § 12)
LOCKED = dict(
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=True,               # modificateurs appliqués (sauf l'armature)
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
    export_vertex_color='ACTIVE',    # l'attribut teamMask, actif, devient COLOR_0
    export_all_vertex_colors=False,
    export_attributes=False,
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_skins=True,
    export_all_influences=False,
    export_influence_nb=4,
    export_def_bones=True,           # squelette de déformation seulement (points d'attache = objets vides)
    export_rest_position_armature=True,
    export_hierarchy_flatten_bones=False,
    export_leaf_bone=False,
    export_morph=True,
    export_try_sparse_sk=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_force_sampling=True,
    export_frame_step=1,
    export_optimize_animation_size=True,
    export_draco_mesh_compression_enable=False,
)


def identity(obj):
    return all(abs(v) < 1e-5 for v in obj.location) and all(abs(v) < 1e-5 for v in obj.rotation_euler) and all(abs(v - 1) < 1e-5 for v in obj.scale)


def preflight():
    """Contrôles dans Blender, avant l'export : retourne (erreurs, avertissements, objets à exporter)."""
    C = contract()
    errors, warnings = [], []
    sc = bpy.context.scene
    arms = [o for o in sc.objects if o.type == 'ARMATURE' and 'FL_Reference' not in [c.name for c in o.users_collection]]
    if len(arms) != 1:
        errors.append(f'{len(arms)} armature(s) dans la scène : une seule est attendue (gabarit tools/blender/fl_template.py).')
        return errors, warnings, []
    arm = arms[0]
    if not identity(arm):
        errors.append(f'Armature « {arm.name} » : position / rotation / échelle non appliquées (Ctrl+A > All Transforms).')
    if abs(sc.unit_settings.scale_length - 1) > 1e-6:
        errors.append(f'Échelle d’unité {sc.unit_settings.scale_length} (1,0 attendu).')
    if sc.render.fps != 30 or abs(sc.render.fps_base - 1) > 1e-6:
        warnings.append(f'Scène à {sc.render.fps / sc.render.fps_base:.2f} i/s (30 attendu pour les clips).')
    missing = [b['name'] for b in C['requiredBones'] if b['name'] not in arm.data.bones]
    if missing:
        errors.append(f'Os requis absents de l’armature : {", ".join(missing)}.')
    meshes = [o for o in sc.objects if o.type == 'MESH' and (BODY.match(o.name) or re.match(C['asset']['accessoryPattern'], o.name))]
    if not any(o.name == 'body_LOD0' for o in meshes):
        errors.append('Aucun objet « body_LOD0 ».')
    for o in meshes:
        if BODY.match(o.name):
            if o.parent is not arm or not any(m.type == 'ARMATURE' and m.object is arm for m in o.modifiers):
                errors.append(f'« {o.name} » : doit être enfant de l’armature avec un modificateur Armature (Ctrl+P > With Empty/Automatic Weights).')
            if not identity(o):
                errors.append(f'« {o.name} » : transformations non appliquées (Ctrl+A > All Transforms).')
        ca = o.data.color_attributes
        if not ca.get('teamMask'):
            warnings.append(f'« {o.name} » : attribut de couleur « teamMask » absent (zone neutre partout).')
        elif ca.active_color is None or ca.active_color.name != 'teamMask':
            errors.append(f'« {o.name} » : « teamMask » doit être l’attribut de couleur ACTIF (c’est lui qui est exporté).')
    sockets = [o for o in sc.objects if o.name.startswith('socket_') and o.parent is arm]
    names = {o.name for o in sockets}
    for s in C['sockets']:
        if s['required'] and s['name'] not in names:
            errors.append(f'Point d’attache « {s["name"]} » absent (objet vide parenté à l’os « {s["parent"]} »).')
    return errors, warnings, [arm, *meshes, *sockets]


def export(out, stage='prototype', fit=False, check=True, force=False):
    errors, warnings, objs = preflight()
    for w in warnings:
        print('  ⚠', w)
    for e in errors:
        print('  ✘', e)
    if errors and not force:
        print(f'Export annulé : {len(errors)} erreur(s) avant l’export.')
        return 1
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    out = Path(bpy.path.abspath(str(out))).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out), **LOCKED)
    print(f'exporté : {out} ({out.stat().st_size / 1048576:.2f} Mo)')
    if not check:
        return 0
    node = shutil.which('node')
    if not node:
        print('  ⚠ Node.js introuvable : contrôle non lancé (npm run check:glb -- fichier.glb).')
        return 0
    cmd = [node, str(REPO / 'tests' / 'check-glb.mjs'), str(out), '--stade', stage] + (['--fit'] if fit else [])
    return subprocess.run(cmd, cwd=str(REPO)).returncode


def main():
    ap = argparse.ArgumentParser(description='Export glTF verrouillé + contrôle du contrat')
    ap.add_argument('--blend', help='fichier .blend à ouvrir (sinon la scène courante)')
    ap.add_argument('--out', default='//assault.glb', help='fichier .glb (// = dossier du .blend)')
    ap.add_argument('--stade', default='prototype', choices=['prototype', 'production'])
    ap.add_argument('--fit', action='store_true', help='essai en jeu (navigateur local)')
    ap.add_argument('--no-check', action='store_true', help='sans le validateur')
    ap.add_argument('--force', action='store_true', help='exporter malgré les erreurs préalables')
    a = ap.parse_args(script_args())
    if a.blend:
        open_blend(a.blend)
    code = export(a.out, a.stade, a.fit, not a.no_check, a.force)
    if bpy.app.background:
        sys.exit(code)


if __name__ == '__main__':
    main()
