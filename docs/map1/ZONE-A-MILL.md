# Zone A — Le Moulin

- **Drapeau :** (-68, -8), rayon de capture 10 m.
- **Repère :** moulin à vent blanc (tour Ø ~6 m, 10 m de haut, ailes animées tournées vers le village) centré en (-75, -3). Visible depuis B.
- **Accès :** route principale depuis B (par l'est), routes diagonales depuis chaque base (sud-est et nord-est), champs ouverts à l'ouest.

## Couverts (état au commit `05827b4`)
| Élément | Position | Rôle |
| --- | --- | --- |
| Muret de pierre | x = -61, z -3,5 → 2,5 | couvre la zone face au village (ajout phase 6) |
| Sacs de sable | (-73,5, -13) | nord-ouest du drapeau (ajout phase 6) |
| Sacs de sable | (-64,8, 2,4) | sud du drapeau (ajout phase 6) |
| Sacs de sable | (-66, -15) et (-72, 6) | d'origine |
| Petite maison | (-60, -20), 6×5 m | bloque la ligne de vue sud-est |
| Bottes de foin | (-62, 2), (-60,5, 3,2), (-80, -14) | couverts légers |
| Caisses | (-58, -8), (-57, -9,2) | couvert côté route |
| Murets | (-88,-22)→(-80,-22) ; (-56,8)→(-50,14) | flancs |

## Points d'attention
- La zone était presque nue avant la phase 6 ; le muret et les sacs de sable ajoutés sont validés par `test:bots` (pas de blocage persistant).
- Le moulin est un gros bloc de collision : les bots le contournent par le sud ou le nord.
- Lignes de vue longues depuis les champs de l'ouest (sniper).
