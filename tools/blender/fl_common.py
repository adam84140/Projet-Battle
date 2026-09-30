"""Outils communs des scripts Blender de Frontline Legends (Blender 4.5 LTS).

Fonctionne de deux façons :
  - Blender installé :   blender -b [fichier.blend] -P tools/blender/<script>.py -- <options>
  - module Python bpy :  python tools/blender/<script>.py <options>   (pip install bpy==4.5.14, Python 3.11)

Repères : le jeu (glTF) a Y en haut et le personnage regarde +Z ; Blender a Z en haut et le personnage
regarde −Y. Gauche du personnage = +X dans les deux. Conversion : Blender (X, Y, Z) = jeu (x, −z, y).
"""
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

TOOLS = Path(__file__).resolve().parent
REPO = TOOLS.parent.parent

if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))


def script_args():
    """Arguments du script : après « -- » (Blender) ou après le nom du script (python)."""
    argv = sys.argv
    if '--' in argv:
        return argv[argv.index('--') + 1:]
    return argv[1:]


def contract():
    """Contrat d'asset (copie JSON de src/character/rigContract.js, voir export-contract.mjs)."""
    return json.loads((TOOLS / 'rig_contract.json').read_text(encoding='utf-8'))


def g2b(v):
    """Point du jeu (x, y, z) -> point Blender."""
    x, y, z = v
    return Vector((x, -z, y))


def b2g(v):
    """Point Blender -> point du jeu."""
    return (v.x, v.z, -v.y)


def open_blend(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))


def save_blend(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)
    return path


def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def rgb(hex_value):
    """Couleur hexadécimale sRGB -> (r, g, b, 1) linéaire (couleurs de matériau Blender)."""
    def lin(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin((hex_value >> 16) & 255), lin((hex_value >> 8) & 255), lin(hex_value & 255), 1.0)
