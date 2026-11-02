/**
 * Generates realistic SVG specimen illustrations for offline starter packages
 * across Parasitology, Microbiology, Pathology, and Pharmacology.
 */

// ==========================================
// 1. PARASITOLOGY SPECIMENS
// ==========================================

export function createSchistosomaEggSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <radialGradient id="microscopeField" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fffbeb"/>
        <stop offset="70%" stop-color="#fef3c7"/>
        <stop offset="95%" stop-color="#d97706" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </radialGradient>
      <linearGradient id="eggShell" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="40%" stop-color="#eab308"/>
        <stop offset="85%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#854d0e"/>
      </linearGradient>
      <radialGradient id="miracidium" cx="45%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#fef9c3"/>
        <stop offset="60%" stop-color="#fde047"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </radialGradient>
    </defs>
    
    <rect width="800" height="600" fill="#0f172a"/>
    <!-- Ocular microscope circular field -->
    <circle cx="400" cy="300" r="270" fill="url(#microscopeField)" stroke="#334155" stroke-width="12"/>
    
    <!-- Urine sediment background RBCs & crystals -->
    <g opacity="0.35">
      <circle cx="230" cy="210" r="14" fill="#f87171" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="270" cy="390" r="13" fill="#f87171" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="560" cy="220" r="15" fill="#f87171" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="530" cy="410" r="14" fill="#f87171" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="210" cy="330" r="12" fill="#f87171" stroke="#dc2626" stroke-width="1.5"/>
    </g>
    
    <!-- Schistosoma haematobium Egg: Elongated Oval with Sharp Terminal Spine -->
    <!-- Miracidium body inside -->
    <ellipse cx="400" cy="295" rx="75" ry="135" fill="url(#miracidium)" opacity="0.95"/>
    <circle cx="395" cy="250" r="18" fill="#a16207" opacity="0.4"/>
    <circle cx="405" cy="330" r="22" fill="#a16207" opacity="0.35"/>
    
    <!-- Outer chitinous shell with distinct terminal spine at bottom pole (x: 400, y: 465) -->
    <path d="M 330 290 C 330 180, 470 180, 470 290 C 470 380, 435 435, 400 475 C 365 435, 330 380, 330 290 Z" 
          fill="none" stroke="url(#eggShell)" stroke-width="14" stroke-linejoin="round"/>
          
    <!-- Sharp Terminal Spine at Posterior Pole -->
    <path d="M 390 445 L 400 482 L 410 445 Z" fill="#854d0e" stroke="#713f12" stroke-width="2"/>
    
    <!-- Specimen Header & Microscopic Details -->
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">PARASITOLOGY: URINE SEDIMENT (400x)</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Specimen: Urine sediment wet mount · 50 µm Scale</text>
  </svg>`;
}

export function createGiardiaTrophozoiteSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <radialGradient id="giardiaField" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fdf4ff"/>
        <stop offset="75%" stop-color="#fae8ff"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </radialGradient>
      <linearGradient id="pyriform" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d8b4fe"/>
        <stop offset="50%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#9333ea"/>
      </linearGradient>
    </defs>
    
    <rect width="800" height="600" fill="#0f172a"/>
    <circle cx="400" cy="300" r="260" fill="url(#giardiaField)" stroke="#334155" stroke-width="12"/>
    
    <!-- Giardia duodenalis Trophozoite: Pear/Kite shaped (bilaterally symmetrical) -->
    <!-- Trophozoite body -->
    <path d="M 400 160 C 490 160, 500 280, 440 370 C 415 410, 403 440, 400 460 C 397 440, 385 410, 360 370 C 300 280, 310 160, 400 160 Z" 
          fill="url(#pyriform)" stroke="#7e22ce" stroke-width="6"/>
          
    <!-- Ventral Sucking Disk (concave anterior depression) -->
    <path d="M 345 220 C 345 175, 455 175, 455 220 C 455 270, 345 270, 345 220 Z" 
          fill="#f3e8ff" stroke="#a855f7" stroke-width="3" opacity="0.9"/>
          
    <!-- Two Symmetrical Nuclei with Central Karyosomes (Old Man / Owl Appearance) -->
    <ellipse cx="372" cy="225" rx="18" ry="24" fill="#faf5ff" stroke="#6b21a8" stroke-width="3"/>
    <circle cx="372" cy="225" r="7" fill="#581c87"/>
    
    <ellipse cx="428" cy="225" rx="18" ry="24" fill="#faf5ff" stroke="#6b21a8" stroke-width="3"/>
    <circle cx="428" cy="225" r="7" fill="#581c87"/>
    
    <!-- Axostyle (central longitudinal rod) -->
    <line x1="400" y1="180" x2="400" y2="460" stroke="#581c87" stroke-width="4" stroke-linecap="round"/>
    
    <!-- Median Bodies (curved claw-like transverse bars) -->
    <path d="M 380 305 Q 400 320 420 305" stroke="#581c87" stroke-width="5" fill="none" stroke-linecap="round"/>
    
    <!-- Flagella pairs (4 pairs: anterior, posterior, ventral, caudal) -->
    <g stroke="#9333ea" stroke-width="2.5" fill="none" opacity="0.85">
      <path d="M 400 170 Q 320 150 290 190"/>
      <path d="M 400 170 Q 480 150 510 190"/>
      <path d="M 400 460 Q 380 500 370 530"/>
      <path d="M 400 460 Q 420 500 430 530"/>
      <path d="M 380 340 Q 300 360 280 400"/>
      <path d="M 420 340 Q 500 360 520 400"/>
    </g>
    
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">PARASITOLOGY: DIRECT WET MOUNT (1000x)</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Magnification: 1000x Oil Immersion · Saline Wet Mount</text>
  </svg>`;
}

// ==========================================
// 2. MICROBIOLOGY SPECIMENS
// ==========================================

export function createGramStainDiplococciSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <radialGradient id="gramField" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff1f2"/>
        <stop offset="70%" stop-color="#ffe4e6"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </radialGradient>
      <radialGradient id="pmnNucleus" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#581c87"/>
      </radialGradient>
    </defs>
    
    <rect width="800" height="600" fill="#0f172a"/>
    <circle cx="400" cy="300" r="260" fill="url(#gramField)" stroke="#334155" stroke-width="12"/>
    
    <!-- Neutrophil PMN (Polymorphonuclear Leukocyte) cytoplasm -->
    <path d="M 280 230 C 260 170, 480 150, 520 220 C 560 290, 540 420, 470 440 C 380 470, 270 420, 280 310 Z" 
          fill="#fce7f3" stroke="#f472b6" stroke-width="2" opacity="0.65"/>
          
    <!-- Segmented Lobed Nucleus of Neutrophil (3 lobes connected by chromatin strands) -->
    <ellipse cx="340" cy="260" rx="32" ry="24" fill="url(#pmnNucleus)"/>
    <ellipse cx="440" cy="240" rx="28" ry="22" fill="url(#pmnNucleus)"/>
    <ellipse cx="410" cy="340" rx="36" ry="26" fill="url(#pmnNucleus)"/>
    <path d="M 355 270 Q 380 310 400 330" stroke="#581c87" stroke-width="5" fill="none"/>
    <path d="M 425 255 Q 435 285 425 320" stroke="#581c87" stroke-width="5" fill="none"/>
    
    <!-- Intracellular Gram-Negative Kidney-Bean Shaped Diplococci (Pink/Red Neisseria) -->
    <!-- Cluster 1 inside PMN -->
    <g fill="#e11d48" stroke="#9f1239" stroke-width="1">
      <!-- Pair 1 -->
      <circle cx="370" cy="300" r="7"/>
      <circle cx="383" cy="300" r="7"/>
      <!-- Pair 2 -->
      <circle cx="450" cy="295" r="7"/>
      <circle cx="463" cy="295" r="7"/>
      <!-- Pair 3 -->
      <circle cx="415" cy="285" r="7"/>
      <circle cx="427" cy="287" r="7"/>
      <!-- Pair 4 -->
      <circle cx="360" cy="335" r="7"/>
      <circle cx="373" cy="336" r="7"/>
      <!-- Pair 5 Extracellular -->
      <circle cx="240" cy="290" r="7"/>
      <circle cx="253" cy="292" r="7"/>
      <circle cx="560" cy="340" r="7"/>
      <circle cx="572" cy="342" r="7"/>
    </g>
    
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">MICROBIOLOGY: CEREBROSPINAL FLUID (CSF) PREPARATION</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Magnification: 1000x Oil Immersion · Gram Stain Preparation</text>
  </svg>`;
}

export function createAcidFastBacilliSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <radialGradient id="znField" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#e0f2fe"/>
        <stop offset="70%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </radialGradient>
    </defs>
    
    <rect width="800" height="600" fill="#0f172a"/>
    <circle cx="400" cy="300" r="260" fill="url(#znField)" stroke="#334155" stroke-width="12"/>
    
    <!-- Methylene blue cellular counterstain background (alveolar macrophages & debris) -->
    <path d="M 260 210 Q 380 180 430 240 T 360 360 Q 240 330 260 210 Z" fill="#7dd3fc" opacity="0.45"/>
    <ellipse cx="320" cy="270" rx="30" ry="20" fill="#0369a1" opacity="0.6"/>
    
    <!-- Acid-Fast Bacilli (AFB): Slender, slightly curved beaded magenta/bright pink rods -->
    <g stroke="#f43f5e" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M 390 280 Q 405 285 425 282" stroke-dasharray="7,3"/>
      <path d="M 430 286 Q 445 292 460 288" stroke-dasharray="6,3"/>
      <path d="M 380 315 Q 400 310 420 320" stroke-dasharray="6,2"/>
      <path d="M 428 322 Q 450 330 465 325" stroke-dasharray="8,3"/>
      <!-- Clump/cord formation -->
      <path d="M 330 340 L 360 345" stroke-dasharray="5,2"/>
      <path d="M 350 350 L 375 352" stroke-dasharray="7,2"/>
      <path d="M 490 240 Q 510 245 525 240" stroke-dasharray="6,3"/>
    </g>

    <!-- Pointer B indicator -->
    <g stroke="#e11d48" stroke-width="2" fill="#e11d48">
      <line x1="480" y1="360" x2="435" y2="330"/>
      <polygon points="430,325 440,327 435,337"/>
      <text x="490" y="375" fill="#f43f5e" font-family="sans-serif" font-weight="bold" font-size="18" stroke="none">B</text>
    </g>
    
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">MICROBIOLOGY: ZIEHL-NEELSEN (ZN) STAIN</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Sputum Smear Examination · High-Power Field (1000x Oil Immersion)</text>
  </svg>`;
}

// ==========================================
// 3. PATHOLOGY SPECIMENS
// ==========================================

export function createPepticUlcerSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#4a0404"/>
        <stop offset="50%" stop-color="#2a0002"/>
        <stop offset="100%" stop-color="#120001"/>
      </radialGradient>
      <linearGradient id="mucosa" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c55353"/>
        <stop offset="40%" stop-color="#9e2a2b"/>
        <stop offset="70%" stop-color="#6e1a24"/>
        <stop offset="100%" stop-color="#49111c"/>
      </linearGradient>
      <radialGradient id="crater" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#e2e8f0"/>
        <stop offset="25%" stop-color="#cbd5e1"/>
        <stop offset="60%" stop-color="#7f1d1d"/>
        <stop offset="90%" stop-color="#450a0a"/>
      </radialGradient>
    </defs>
    
    <rect width="800" height="600" fill="url(#bg)"/>
    <path d="M50 120 Q 200 80 400 130 T 750 90 Q 780 300 740 500 T 400 520 Q 150 530 60 480 Z" fill="url(#mucosa)"/>
    
    <!-- Radiating mucosal folds (rugae converging toward clean ulcer crater) -->
    <g stroke="#ff9999" stroke-width="4" stroke-opacity="0.35" fill="none" stroke-linecap="round">
      <path d="M120 180 Q 250 240 340 280"/>
      <path d="M160 380 Q 260 340 330 320"/>
      <path d="M250 130 Q 320 200 370 260"/>
      <path d="M280 470 Q 340 400 370 340"/>
      <path d="M430 140 Q 420 210 420 260"/>
      <path d="M440 480 Q 430 400 420 340"/>
      <path d="M580 160 Q 500 220 460 270"/>
      <path d="M620 380 Q 520 340 470 320"/>
      <path d="M680 250 Q 580 280 480 300"/>
    </g>
    
    <!-- Punched-out Ulcer Crater -->
    <ellipse cx="410" cy="300" rx="95" ry="75" fill="url(#crater)" stroke="#3f0708" stroke-width="6"/>
    <ellipse cx="405" cy="295" rx="60" ry="45" fill="#f8fafc" opacity="0.85"/>
    <ellipse cx="400" cy="292" rx="40" ry="30" fill="#e2e8f0" opacity="0.9"/>
    
    <rect x="50" y="540" width="100" height="4" fill="#ffffff" opacity="0.8"/>
    <text x="50" y="560" fill="#ffffff" font-family="monospace" font-size="12" opacity="0.8">2.0 cm SCALE</text>
    <text x="50" y="50" fill="#fecdd3" font-family="sans-serif" font-weight="bold" font-size="16">PATHOLOGY: GASTRIC RESECTION SPECIMEN</text>
  </svg>`;
}

export function createReedSternbergSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="heBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf2f8"/>
        <stop offset="50%" stop-color="#fce7f3"/>
        <stop offset="100%" stop-color="#fbcfe8"/>
      </linearGradient>
      <radialGradient id="rsNucleus" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#831843"/>
        <stop offset="70%" stop-color="#500724"/>
        <stop offset="100%" stop-color="#300315"/>
      </radialGradient>
      <radialGradient id="inclusionNucleolus" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#ff4d4d"/>
        <stop offset="60%" stop-color="#cc0000"/>
        <stop offset="100%" stop-color="#800000"/>
      </radialGradient>
    </defs>
    
    <rect width="800" height="600" fill="url(#heBg)"/>
    
    <!-- Reed-Sternberg Giant Cell (Owl-Eye Mirror Image Nuclei) -->
    <path d="M 230 280 C 220 180, 360 140, 430 160 C 530 140, 610 200, 600 310 C 620 420, 480 470, 410 460 C 310 470, 220 380, 230 280 Z" 
          fill="#f472b6" fill-opacity="0.35" stroke="#be185d" stroke-width="3"/>
          
    <!-- Left Lobe Nucleus -->
    <ellipse cx="360" cy="290" rx="65" ry="80" fill="url(#rsNucleus)" stroke="#4c0519" stroke-width="3"/>
    <ellipse cx="360" cy="285" rx="30" ry="35" fill="#fbcfe8" opacity="0.35"/>
    <circle cx="360" cy="285" r="20" fill="url(#inclusionNucleolus)"/>
    
    <!-- Right Lobe Nucleus (Mirror image) -->
    <ellipse cx="475" cy="290" rx="65" ry="80" fill="url(#rsNucleus)" stroke="#4c0519" stroke-width="3"/>
    <ellipse cx="475" cy="285" rx="30" ry="35" fill="#fbcfe8" opacity="0.35"/>
    <circle cx="475" cy="285" r="20" fill="url(#inclusionNucleolus)"/>
    
    <text x="50" y="50" fill="#831843" font-family="sans-serif" font-weight="bold" font-size="16">HISTOPATHOLOGY: CERVICAL LYMPH NODE BIOPSY (H&amp;E)</text>
    <text x="50" y="560" fill="#9d174d" font-family="monospace" font-size="12">High-Power Field (400x Oil Immersion)</text>
  </svg>`;
}

// ==========================================
// 4. PHARMACOLOGY SPECIMENS
// ==========================================

export function createDoseResponseCurveSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#090d16"/>
    
    <!-- Graph Grid Lines -->
    <g stroke="#1e293b" stroke-width="1.5">
      <line x1="120" y1="120" x2="720" y2="120"/>
      <line x1="120" y1="200" x2="720" y2="200"/>
      <line x1="120" y1="280" x2="720" y2="280"/>
      <line x1="120" y1="360" x2="720" y2="360"/>
      <line x1="120" y1="440" x2="720" y2="440"/>
      <line x1="270" y1="120" x2="270" y2="440"/>
      <line x1="420" y1="120" x2="420" y2="440"/>
      <line x1="570" y1="120" x2="570" y2="440"/>
    </g>
    
    <!-- Axes -->
    <line x1="120" y1="440" x2="720" y2="440" stroke="#94a3b8" stroke-width="3"/>
    <line x1="120" y1="440" x2="120" y2="100" stroke="#94a3b8" stroke-width="3"/>
    
    <!-- Axis Labels -->
    <text x="120" y="80" fill="#38bdf8" font-family="sans-serif" font-weight="bold" font-size="14">% Maximal Biological Response (Emax)</text>
    <text x="420" y="480" fill="#94a3b8" font-family="sans-serif" font-weight="600" font-size="14" text-anchor="middle">Log [Drug Concentration] (Molar)</text>
    
    <!-- Tick Values -->
    <text x="100" y="445" fill="#64748b" font-family="monospace" font-size="12" text-anchor="end">0%</text>
    <text x="100" y="285" fill="#64748b" font-family="monospace" font-size="12" text-anchor="end">50% (EC50)</text>
    <text x="100" y="125" fill="#64748b" font-family="monospace" font-size="12" text-anchor="end">100%</text>
    
    <!-- Curve A: Agonist Alone (Control) - Blue -->
    <!-- Sigmoidal curve: starts at y:440, EC50 at x:280 y:280, reaches 100% at x:400 y:120 -->
    <path d="M 140 438 C 220 435, 240 370, 280 280 C 320 190, 340 125, 420 120 L 700 120" 
          fill="none" stroke="#38bdf8" stroke-width="4.5"/>
    <circle cx="280" cy="280" r="6" fill="#38bdf8"/>
    <text x="250" y="105" fill="#38bdf8" font-family="sans-serif" font-weight="bold" font-size="13">Curve A</text>
    
    <!-- Curve B: Agonist + Competitive Antagonist (Parallel Right Shift, unchanged Emax) - Emerald -->
    <path d="M 270 438 C 360 435, 390 370, 430 280 C 470 190, 500 125, 580 120 L 700 120" 
          fill="none" stroke="#34d399" stroke-width="4.5" stroke-dasharray="6,3"/>
    <circle cx="430" cy="280" r="6" fill="#34d399"/>
    <text x="440" y="150" fill="#34d399" font-family="sans-serif" font-weight="bold" font-size="13">Curve B</text>
    
    <!-- Curve C: Agonist + Non-Competitive Antagonist (Depressed Emax to 50%) - Amber -->
    <path d="M 140 438 C 220 436, 240 395, 280 360 C 320 300, 340 280, 420 280 L 700 280" 
          fill="none" stroke="#f59e0b" stroke-width="4.5"/>
    <circle cx="280" cy="360" r="6" fill="#f59e0b"/>
    <text x="440" y="270" fill="#f59e0b" font-family="sans-serif" font-weight="bold" font-size="13">Curve C</text>
    
    <!-- Header -->
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">PHARMACOLOGY: CONCENTRATION-RESPONSE RELATIONSHIPS</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Log Concentration-Effect Curves for Receptor Ligands</text>
  </svg>`;
}

export function createAutonomicEyeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#0a0f1d"/>
    
    <!-- Left Eye: Normal / Parasympathetic Stimulation (Miosis) -->
    <g transform="translate(180, 270)">
      <ellipse cx="0" cy="0" rx="140" ry="85" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
      <!-- Iris (Radial dilator + Circular sphincter) -->
      <circle cx="0" cy="0" r="60" fill="#0369a1" stroke="#075985" stroke-width="4"/>
      <!-- Constricted Pupil (Miosis, ~15px radius) -->
      <circle cx="0" cy="0" r="16" fill="#020617"/>
      <!-- Light reflection -->
      <circle cx="-6" cy="-6" r="4" fill="#ffffff" opacity="0.8"/>
      <text x="0" y="115" fill="#38bdf8" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle">Pupil A (Diameter: 2 mm)</text>
    </g>
    
    <!-- Right Eye: Sympathetic Stimulation / Anticholinergic Blockade (Mydriasis) -->
    <g transform="translate(600, 270)">
      <ellipse cx="0" cy="0" rx="140" ry="85" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
      <!-- Iris -->
      <circle cx="0" cy="0" r="60" fill="#713f12" stroke="#451a03" stroke-width="4"/>
      <!-- Dilated Pupil (Mydriasis, ~45px radius) -->
      <circle cx="0" cy="0" r="46" fill="#020617"/>
      <!-- Light reflection -->
      <circle cx="-16" cy="-16" r="8" fill="#ffffff" opacity="0.8"/>
      <text x="0" y="115" fill="#fbbf24" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle">Pupil B (Diameter: 8 mm)</text>
    </g>
    
    <text x="50" y="45" fill="#f8fafc" font-family="sans-serif" font-weight="bold" font-size="16">PHARMACOLOGY: PUPILLARY DIAMETER EVALUATION</text>
    <text x="50" y="565" fill="#94a3b8" font-family="monospace" font-size="12">Clinical Examination of Pupillary Diameter Following Pharmacological Instillation</text>
  </svg>`;
}

export function svgToBlob(svgString: string): Blob {
  return new Blob([svgString], { type: 'image/svg+xml' });
}
