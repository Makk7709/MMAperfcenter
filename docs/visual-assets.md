# Visuels de combat


## Sections principales

Quatre illustrations supplémentaires créées avec l’outil intégré image_gen. Fichiers enregistrés dans `src/assets/` :

- `section-nutrition-480.webp` et `section-nutrition-960.webp` : Nutrition de combat.
- `section-analysis-480.webp` et `section-analysis-960.webp` : Coach IA, analyse personnalisée et import de sparring.
- `section-training-480.webp` et `section-training-960.webp` : préparation physique, séance nouvelle ou en cours.
- `section-team-480.webp` et `section-team-960.webp` : carte Team.
- La section Technique MMA réutilise `sparring-training.webp` et sa version 480 px.

Les variantes 480 × 270 et 960 × 540 sont encodées en WebP qualité 76 et chargées à la demande. Le composant décoratif SectionArtwork ne prend aucune place dans la mise en page ; les illustrations du Coach et de l’analyse disparaissent lorsque les conversations ou résultats sont affichés.

### Prompt nutrition

Photorealistic premium editorial still life for the Nutrition section of a dark MMA performance dashboard. Wide landscape 16:9. A matte black bowl of grilled chicken, quinoa, avocado, spinach and roasted vegetables, a clear glass of water, on a charcoal worktop. Food clustered on the right two thirds, left third mostly quiet dark negative space for existing text. Authentic fresh food textures, restrained natural greens and warm brass highlights, blue-black charcoal shadows, soft directional light, no oversaturation. No text, labels, logos, supplements, interface, watermark. High-end sports nutrition photography, no health claims.

### Prompt analysis

Premium editorial photographic illustration for AI analysis and coaching in a dark MMA performance dashboard, landscape 16:9. On the right two thirds, close three-quarter view of a black tablet on a gym bench showing a small image of two adult fighters practicing sparring with fine muted gold pose-estimation lines connecting shoulders elbows hips and knees. A pair of black MMA gloves beside the tablet. No text, letters, numbers or logos anywhere on tablet or equipment. The left third is dark quiet negative space. Believable photography, refined blue-black and charcoal palette with subtle brass light, realistic materials and physically plausible screen. No neon, no robots, no sci-fi holograms, no watermark. Clearly illustrative concept of video analysis.

### Prompt training

Photorealistic premium sports editorial background, landscape 16:9, for physical preparation section in an MMA dashboard. Adult athlete in plain black training clothes on the right two thirds performing a controlled kettlebell deadlift, neutral spine, two hands correctly gripping one kettlebell, feet grounded, full torso and kettlebell visible. Dark professional strength gym with subtle racks in distance. Left third quiet charcoal negative space for existing headings. Restrained brass rim lighting, natural skin and fabric detail, blue-black shadows, serious calm training mood. No text, logos, watermark, injury, neon or UI.

### Prompt team

Photorealistic premium editorial photograph for the Team section of an MMA performance dashboard. Landscape 16:9. Three adult training partners, two women and one man, in unbranded black sportswear, relaxed group fist bump after practice in a dark professional MMA gym. Realistic hands and anatomy, friendly focused expressions. People mainly on right two thirds, quiet dark negative space on left. Warm muted brass rim light, charcoal blue-black background, natural skin tones, realistic fabric, subdued cinematic documentary aesthetic matching a premium combat sports brand. No writing, logos, badges, interface, watermarks or neon.


Images créées avec l’outil intégré image_gen. Scènes fictives générées par IA, utilisées comme illustrations, jamais comme captures de vidéos d’utilisateurs.

| Usage | Fichier | Dimensions |
|---|---|---|
| Accueil | src/assets/combat-hero.webp | 1672 × 941 |
| Accueil, version légère | src/assets/combat-hero-960.webp | 960 × 540 |
| Fond de l’aperçu sparring | src/assets/sparring-training.webp | 960 × 540 |
| Vignette générique, version légère | src/assets/sparring-training-480.webp | 480 × 270 |

Compression WebP : qualité 78 pour les versions principales, 76 pour les versions légères. Les images source existantes sont conservées. La palette, les formes des boutons et les dimensions des sections restent inchangées. Une vignette fournie par la vidéo reste prioritaire ; la couverture générique porte la mention « Illustration ».

## Prompt accueil

Use case: photorealistic-natural. Create a cinematic editorial sports photograph for the hero background of an existing MMA training website. Landscape 16:9, 1536x864. Two adult mixed martial arts athletes in black training gear and padded gloves practicing controlled striking in a dark professional cage gym. Authentic anatomy and technically plausible guard, no injury, no blood. Place the athletes predominantly in the right half; left half dark atmospheric negative space for existing white and muted gold website headings. Wide framing with full upper bodies, realistic sweat, subtle dust and warm muted brass rim lighting, charcoal blue-black shadows, restrained desaturated palette. Premium documentary photography, natural skin texture, not a game render. No text, no letters, no logos, no watermarks, no graphic overlays. This is a background asset, not a website mockup.

## Prompt sparring

Use case: photorealistic-natural. Asset type: wide sparring illustration for a premium MMA training website, also usable as a generic training video cover. Generate a landscape 16:9 documentary sports photograph. Two adult athletes practicing controlled MMA sparring in a professional dark cage gym, three-quarter side view, both fully visible from waist up in orthodox defensive guards at a realistic distance. One adult woman with tied back hair and one adult man, black unbranded training shirts, padded sparring gloves. A coach softly out of focus far behind the fence. Subjects centered in the middle 65% of the image to remain visible when cropped. Charcoal blue-black setting, restrained warm brass overhead rim light, realistic skin and fabric texture, high-end editorial photography. Calm concentration, no injury, no blood. No text, logos, watermarks, computer interfaces or graphics.
