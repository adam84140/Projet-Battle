"""Planches de revue d'un personnage à côté des références officielles (points de contrôle M4).

Rend les vues face, 3/4 droit, profil droit et dos en projection orthographique, à l'échelle exacte de
l'image 01 (docs/_attachments/ref-01-master-assault-turnaround.webp : 1,85 m = 480 px, sol à la ligne 613),
puis compose une planche : références / rendus / superposition des silhouettes (référence en jaune,
modèle en cyan). Les écarts de proportions se lisent directement.

Usage (depuis un script ou la console Blender) :
    from fl_review import render_views, compare_sheet
    renders = render_views(out_dir)          # scène courante
    compare_sheet(renders, out_dir / 'comparaison.png')
"""
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

from fl_common import REPO

REF01 = {
    'file': REPO / 'docs' / '_attachments' / 'ref-01-master-assault-turnaround.webp',
    'px_per_m': 480 / 1.85,   # barre d'échelle de l'image : 1,85 m de la ligne 133 à la ligne 613
    'ground': 613,            # ligne du sol (pixels depuis le haut)
    # axe de chaque vue sur l'image (x du buste, mesuré sur la silhouette)
    'axes': {'face': 203, '3-4': 467, 'profil': 659, 'dos': 886},
}
# azimut de la caméra (degrés) : 0 = face (le personnage regarde −Y) ; −90 = profil droit
VIEWS = {'face': 0, '3-4': -45, 'profil': -90, 'dos': 180}
W, H, GROUND_ROW = 360, 520, 500  # taille d'une vue ; ligne du sol dans la vue
BACKGROUND = (0.125, 0.176, 0.231)  # fond de l'image 01 (#202D3B)


def setup_render(samples=48):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    if sc.world is None:
        sc.world = bpy.data.worlds.new('FL_review')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.38, 0.42, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.6


def lights():
    """Éclairage de studio proche de l'image 01 : clé haute à gauche, contre-jour, débouchage."""
    for name, rot, energy in (('FL_cle', (math.radians(50), 0, math.radians(-35)), 3.2), ('FL_contre', (math.radians(60), 0, math.radians(160)), 2.2), ('FL_bouche', (math.radians(80), 0, math.radians(40)), 0.8)):
        if bpy.data.objects.get(name):
            continue
        l = bpy.data.lights.new(name, 'SUN')
        l.energy = energy
        o = bpy.data.objects.new(name, l)
        o.rotation_euler = rot
        bpy.context.scene.collection.objects.link(o)


def camera(view):
    cam = bpy.data.objects.get('FL_camera')
    if cam is None:
        cam = bpy.data.objects.new('FL_camera', bpy.data.cameras.new('FL_camera'))
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    ppm = REF01['px_per_m']
    cam.data.ortho_scale = max(W, H) / ppm
    zc = (GROUND_ROW - H / 2) / ppm  # hauteur du centre de l'image
    az = math.radians(VIEWS[view])
    d = 10.0
    cam.location = Vector((d * math.sin(az), -d * math.cos(az), zc))  # (0, −d) tourné de az autour de Z
    cam.rotation_euler = (math.radians(90), 0, az)
    bpy.context.scene.camera = cam
    return cam


def render_views(out_dir, views=tuple(VIEWS), samples=48):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    setup_render(samples)
    lights()
    paths = {}
    for v in views:
        camera(v)
        p = out_dir / f'{v}.png'
        bpy.context.scene.render.filepath = str(p)
        bpy.ops.render.render(write_still=True)
        paths[v] = p
    return paths


# ---------- composition (numpy) ----------
def load_rgba(path):
    img = bpy.data.images.load(str(path), check_existing=False)
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    a = a.reshape(img.size[1], img.size[0], 4)[::-1]  # de haut en bas
    bpy.data.images.remove(img)
    return a


def save_rgba(arr, path):
    h, w, _ = arr.shape
    img = bpy.data.images.new(Path(path).stem, w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(arr[::-1]).ravel())
    img.filepath_raw = str(path)
    img.file_format = 'WEBP' if str(path).endswith('.webp') else 'PNG'
    img.save()
    bpy.data.images.remove(img)
    return path


def fill_holes(mask):
    """Remplit les trous d'une silhouette (fond = composante connexe au bord)."""
    h, w = mask.shape
    bg = np.zeros_like(mask)
    stack = [(y, x) for y in range(h) for x in (0, w - 1) if not mask[y, x]] + [(y, x) for x in range(w) for y in (0, h - 1) if not mask[y, x]]
    while stack:
        y, x = stack.pop()
        if bg[y, x] or mask[y, x]:
            continue
        bg[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))
    return ~bg


def edges(mask):
    e = np.zeros_like(mask)
    e[1:-1, 1:-1] = mask[1:-1, 1:-1] & ~(mask[:-2, 1:-1] & mask[2:, 1:-1] & mask[1:-1, :-2] & mask[1:-1, 2:])
    return e


def reference_views():
    """Crops de l'image 01 aux mêmes cadrage et échelle que les rendus, et leurs silhouettes."""
    ref = load_rgba(REF01['file'])[..., :3]
    # fond : médiane par ligne des colonnes vides aux deux bords de l'image
    bg = np.median(np.concatenate([ref[:, 0:12], ref[:, -21:-6]], axis=1), axis=1)
    top = REF01['ground'] - GROUND_ROW
    out = {}
    for v, cx in REF01['axes'].items():
        crop = ref[top:top + H, cx - W // 2:cx - W // 2 + W]
        d = np.sqrt(((crop - bg[top:top + H, None, :]) ** 2).sum(-1)) * 255
        m = d > 30
        m[:5] = False
        m[GROUND_ROW + 4:] = False  # ombres portées au sol
        out[v] = (crop, fill_holes(m))
    return out


def compare_sheet(renders, out_path):
    """Planche 3 lignes : référence, rendu (sur le fond de l'image 01), silhouettes superposées."""
    refs = reference_views()
    views = [v for v in VIEWS if v in renders]
    sheet = np.zeros((3 * H, len(views) * W, 4), dtype=np.float32)
    sheet[..., 3] = 1
    stats = {}
    for i, v in enumerate(views):
        crop, rmask = refs[v]
        rgba = load_rgba(renders[v])
        alpha = rgba[..., 3:4]
        over = rgba[..., :3] * alpha + np.array(BACKGROUND) * (1 - alpha)
        mmask = alpha[..., 0] > 0.5
        x0 = i * W
        sheet[0:H, x0:x0 + W, :3] = crop
        sheet[H:2 * H, x0:x0 + W, :3] = over
        mix = over * 0.35 + crop * 0.35
        mix[edges(rmask)] = (1.0, 0.85, 0.1)
        mix[edges(mmask)] = (0.1, 0.9, 1.0)
        sheet[2 * H:3 * H, x0:x0 + W, :3] = mix
        # recouvrement des silhouettes (0 à 1)
        stats[v] = round(float((rmask & mmask).sum() / max(1, (rmask | mmask).sum())), 3)
    save_rgba(sheet, out_path)
    return stats
