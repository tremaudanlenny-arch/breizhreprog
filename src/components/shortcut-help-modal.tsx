"use client";

import { useEffect } from "react";
import { HelpCircle, Keyboard, MousePointer2, Rotate3D, X } from "lucide-react";

interface ShortcutHelpModalProps {
  open: boolean;
  onClose: () => void;
  theme?: "default" | "light" | "oled";
  version?: string;
}

const shortcutGroups = [
  {
    title: "Navigation dans une map",
    rows: [
      ["↑ ↓ ← →", "Déplacer la cellule active"],
      ["Ctrl + flèche", "Étendre la sélection"],
      ["Ctrl + A", "Sélectionner toute la map + axes"],
      ["Double-clic", "Éditer directement une valeur"],
      ["Clic droit", "Ouvrir le menu contextuel"],
    ],
  },
  {
    title: "Édition",
    rows: [
      ["+", "Augmenter la sélection avec le pas courant"],
      ["−", "Diminuer la sélection avec le pas courant"],
      ["Ctrl + Z", "Annuler la dernière modification"],
      ["Ctrl + Y", "Rétablir la dernière modification"],
      ["Ctrl + C", "Copier les cellules / axes"],
      ["Ctrl + V", "Coller depuis le presse-papiers / Excel"],
      ["Entrée", "Valider une saisie"],
    ],
  },
  {
    title: "Vue 3D — mode mapping",
    rows: [
      ["Activer « Mapping 3D »", "Passer la surface 3D en mode édition"],
      ["Clic sur la surface", "Sélectionner directement la cellule correspondante"],
      ["Double-clic sur un point", "Saisie d'une valeur absolue pour le point"],
      ["↑ ↓ ← →", "Déplacer le point sélectionné"],
      ["+ / −", "Modifier le point sélectionné"],
      ["Shift + clic", "Sélectionner plusieurs cellules en 3D"],
      ["Smooth / Interpolate", "Outils de calibration sur la sélection"],
      ["Flatten / Pente X/Y", "Réglages de forme sur la sélection"],
      ["Miroir X/Y", "Inverser la sélection horizontalement / verticalement"],
      ["Molette / boutons − +", "Zoomer la caméra 3D"],
      ["Clic + glisser", "Tourner la vue 3D"],
    ],
  },
  {
    title: "Fenêtres et application",
    rows: [
      ["F1", "Ouvrir ce guide et les raccourcis"],
      ["Échap", "Fermer le menu / panneau actif"],
      ["− / + Zoom", "Changer le zoom général de l'application"],
    ],
  },
];

export function ShortcutHelpModal({
  open,
  onClose,
  theme = "default",
  version = "1.18.4",
}: ShortcutHelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const light = theme === "light";
  const oled = theme === "oled";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,.58)", backdropFilter: "blur(10px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: light ? "rgba(255,255,255,.97)" : oled ? "rgba(0,0,0,.98)" : "rgba(17,20,28,.97)",
          borderColor: light ? "rgba(0,0,0,.13)" : "rgba(255,255,255,.12)",
          color: light ? "#111827" : "#fff",
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 border-b"
          style={{ borderColor: light ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.1)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base truncate">Guide Breizh Reprog X Ninnin Projet Perf</div>
              <div className="text-xs opacity-60">Version {version} · commandes, édition et mapping 3D</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 upload-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border p-4" style={{ borderColor: light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)" }}>
              <Keyboard className="w-5 h-5 mb-2 text-violet-400" />
              <div className="font-semibold text-sm mb-1">Clavier</div>
              <div className="text-xs opacity-65">Sélection, déplacements, incréments, copier/coller et validation.</div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)" }}>
              <MousePointer2 className="w-5 h-5 mb-2 text-red-400" />
              <div className="font-semibold text-sm mb-1">Souris</div>
              <div className="text-xs opacity-65">Double-clic pour éditer, clic droit pour les outils et sélection directe en 3D.</div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)" }}>
              <Rotate3D className="w-5 h-5 mb-2 text-blue-400" />
              <div className="font-semibold text-sm mb-1">Mapping 3D</div>
              <div className="text-xs opacity-65">Clique une cellule sur la surface puis utilise les mêmes commandes d'édition que dans la vue texte.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcutGroups.map((group) => (
              <section key={group.title} className="rounded-xl border overflow-hidden" style={{ borderColor: light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)" }}>
                <div className="px-4 py-3 font-semibold text-sm bg-black/5 dark:bg-white/[.03]">{group.title}</div>
                <div className="divide-y" style={{ borderColor: light ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)" }}>
                  {group.rows.map(([key, description]) => (
                    <div key={key} className="px-4 py-2.5 flex items-center gap-4 text-xs">
                      <kbd className="min-w-[115px] px-2 py-1 rounded-md border font-mono text-center whitespace-nowrap" style={{ borderColor: light ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.12)", background: light ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)" }}>
                        {key}
                      </kbd>
                      <span className="opacity-75">{description}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="rounded-xl border p-4 text-xs leading-relaxed" style={{ borderColor: light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)" }}>
            <div className="font-semibold mb-1">Nouveautés 1.16</div>
            <div className="opacity-70">
              Le mode « Mapping 3D » sélectionne une cellule directement sur la surface 3D.
              La cellule sélectionnée reste liée à la grille de la map : les modifications faites avec +/−,
              les opérations de la barre d'outils et la saisie absolue sont répercutées sur la map et sauvegardées
              comme les éditions classiques. Le mode ATDC reste lecture seule.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
