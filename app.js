const menuData = [
  {
    label: "Karasek-Siegrist",
    submenu: [
      "Questionnaire",
      "Importer un fichier",
      "Importer plusieurs fichiers (individus)",
      "Importer plusieurs fichiers (groupe)",
      "Référentiel",
    ],
  },
  {
    label: "COPSOQ",
    submenu: [
      "Questionnaire",
      "Importer un fichier / Import a file",
      "Importer plusieurs fichiers (individus) / Import multiple files (individuals)",
      "Importer plusieurs fichiers (groupe) / Import multiple files (group)",
      "Référentiel",
    ],
  },
  {
    label: "Rapprochement RPS",
    submenu: [
      "Rapprochement RPS individuel",
      "Rapprochement RPS de plusieurs individus",
      "Rapprochement RPS de groupes",
      "Référentiel",
    ],
  },
  {
    label: "A propos",
    submenu: [],
  },
  {
    label: "Aide",
    submenu: [],
  },
  {
    label: "GitHub",
    submenu: [],
  },
  {
    label: "CC BY-NC-ND 4.0",
    submenu: [],
  },
];
const externalMenuLinks = {
  github: "https://github.com/leithleith/RPS",
  "cc-by-nc-nd-4-0": "https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.fr",
  aide: "aide.html",
};
const menuRoot = document.getElementById("menu");
const contentRoot = document.getElementById("content");
const installBtn = document.getElementById("installBtn");
const menuHamburgerBtn = document.getElementById("menuHamburger");
let deferredInstallPrompt = null;
let karasekImportedIndividuals = [];
let karasekImportedGroupBatches = [];
let karasekImportSingleInput = null;
let karasekImportIndividualsInput = null;
let karasekImportGroupInput = null;
let copsoqImportedIndividuals = [];
let copsoqImportedGroupBatches = [];
let copsoqImportSingleInput = null;
let copsoqImportIndividualsInput = null;
let copsoqImportGroupInput = null;
let rpsMultiKarasekFiles = [];
let rpsMultiCopsoqFiles = [];
let rpsMultiKarasekBatches = []; // { type: 'karasek', label, fileNames, color } - single entry, grown as files are added
let rpsMultiCopsoqBatches = []; // { type: 'copsoq', label, fileNames, color }
let rpsGroupEntries = []; // { type: 'karasek' | 'copsoq', label, fileNames, stats, color }
const plotLineColors = ["#0072B2", "#CC79A7", "#56B4E9", "#882255", "#332288"];
// Paul Tol muted qualitative palette: https://sronpersonalpages.nl/~pault/#sec:colour_blindness
const paulTolMutedColors = ["#332288", "#88CCEE", "#44AA99", "#117733", "#999933", "#DDCC77", "#CC6677", "#882255", "#AA4499"];
const plotImageExportIcon = {
  width: 24,
  height: 24,
  path: "M7 4l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3zm5 4a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z",
};
function clonePlotExportValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function getPlotExportTextLines(context, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) {
      lines.push(line);
    }
    if (context.measureText(word).width <= maxWidth) {
      line = word;
      return;
    }
    let fragment = "";
    [...word].forEach((character) => {
      const nextFragment = fragment + character;
      if (context.measureText(nextFragment).width > maxWidth && fragment) {
        lines.push(fragment);
        fragment = character;
      } else {
        fragment = nextFragment;
      }
    });
    line = fragment;
  });
  if (line) {
    lines.push(line);
  }
  return lines.length ? lines : [""];
}
function loadPlotExportImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de préparer l'image du graphique."));
    image.src = dataUrl;
  });
}
async function createPlotExportDataUrl(container, options) {
  if (!container || typeof Plotly === "undefined") {
    throw new Error("Le graphique n'est pas disponible.");
  }
  const width = options.width || 1600;
  const plotHeight = options.height || 1600;
  const horizontalPadding = 48;
  const title = options.title || "Visualisation";
  const legendItems = (options.legendItems || []).filter((item) => item && item.label && item.color);
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = "700 34px sans-serif";
  const titleLines = getPlotExportTextLines(measureContext, title, width - horizontalPadding * 2);
  const titleHeight = titleLines.length * 44 + 36;
  measureContext.font = "24px sans-serif";
  const legendTextWidth = width - horizontalPadding * 2 - 48;
  const legendLines = legendItems.map((item) => getPlotExportTextLines(measureContext, item.label, legendTextWidth));
  const legendHeight = legendItems.length
    ? 58 + legendLines.reduce((height, lines) => height + Math.max(34, lines.length * 30) + 8, 0)
    : 0;
  const exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.width = `${width}px`;
  exportContainer.style.height = `${plotHeight}px`;
  document.body.append(exportContainer);
  let plotDataUrl;
  try {
    const exportLayout = clonePlotExportValue(container.layout || {});
    exportLayout.autosize = false;
    exportLayout.width = width;
    exportLayout.height = plotHeight;
    exportLayout.title = { ...(exportLayout.title || {}), text: "" };
    await Plotly.newPlot(
      exportContainer,
      clonePlotExportValue(container.data || []),
      exportLayout,
      { staticPlot: true, responsive: false, displayModeBar: false },
    );
    plotDataUrl = await Plotly.toImage(exportContainer, {
      format: "png",
      width,
      height: plotHeight,
      scale: 1,
    });
  } finally {
    Plotly.purge(exportContainer);
    exportContainer.remove();
  }
  const plotImage = await loadPlotExportImage(plotDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = titleHeight + plotHeight + legendHeight;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1f2937";
  context.font = "700 34px sans-serif";
  context.textAlign = "center";
  titleLines.forEach((line, index) => {
    context.fillText(line, width / 2, 42 + index * 44);
  });
  context.drawImage(plotImage, 0, titleHeight, width, plotHeight);
  if (legendItems.length) {
    let legendY = titleHeight + plotHeight + 42;
    context.textAlign = "left";
    context.fillStyle = "#1f2937";
    context.font = "700 28px sans-serif";
    context.fillText(options.legendTitle || "Légende", horizontalPadding, legendY);
    legendY += 34;
    context.font = "24px sans-serif";
    legendItems.forEach((item, index) => {
      const lines = legendLines[index];
      const rowHeight = Math.max(34, lines.length * 30);
      const markerY = legendY + 10;
      context.fillStyle = item.color;
      if (item.type === "line") {
        context.fillRect(horizontalPadding, markerY + 7, 30, 5);
      } else {
        context.fillRect(horizontalPadding + 5, markerY, 20, 20);
        context.strokeStyle = "#d1d5db";
        context.strokeRect(horizontalPadding + 5, markerY, 20, 20);
      }
      context.fillStyle = "#1f2937";
      lines.forEach((textLine, lineIndex) => {
        context.fillText(textLine, horizontalPadding + 44, legendY + 26 + lineIndex * 30);
      });
      legendY += rowHeight + 8;
    });
  }
  return canvas.toDataURL("image/png");
}
async function downloadPlotImageWithTitleAndLegend(container, options) {
  const dataUrl = await createPlotExportDataUrl(container, options);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${options.filename || `plot-${Date.now()}`}.png`;
  document.body.append(link);
  link.click();
  link.remove();
}
function getPlotImageExportButton(container, options) {
  return {
    name: "downloadImageWithTitleAndLegend",
    title: "Sauvegarder l'image en PNG",
    icon: plotImageExportIcon,
    click: () => {
      downloadPlotImageWithTitleAndLegend(container, options).catch((error) => {
        console.error("Plot image export failed.", error);
        alert("Impossible d'enregistrer l'image du graphique.");
      });
    },
  };
}
function closeHamburgerMenu() {
  if (!menuRoot || !menuHamburgerBtn) {
    return;
  }
  menuRoot.classList.add("menu-collapsed");
  menuHamburgerBtn.setAttribute("aria-expanded", "false");
}
function openHamburgerMenu() {
  if (!menuRoot || !menuHamburgerBtn) {
    return;
  }
  menuRoot.classList.remove("menu-collapsed");
  menuHamburgerBtn.setAttribute("aria-expanded", "true");
}
function toggleHamburgerMenu() {
  if (!menuRoot || !menuHamburgerBtn) {
    return;
  }
  const shouldOpen = menuRoot.classList.contains("menu-collapsed");
  if (shouldOpen) {
    openHamburgerMenu();
  } else {
    closeHamburgerMenu();
  }
}
const karasekOptions = ["Pas d'accord", "Plutôt pas d'accord", "Plutôt d'accord", "D'accord"];
const karasekQuestionnaireItems = [
  { category: "Niveau des Exigences", item: "Avez-vous le sentiment que depuis l'année dernière votre charge de travail a augmenté ?", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Avez-vous le sentiment que depuis l'année dernière votre temps de travail hebdomadaire a augmenté (en incluant le temps de travail dans les transports, au domicile, etc.)", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "J'ai des objectifs atteignables", values: [3, 2, 1, 0] },
  { category: "Niveau des Exigences", item: "J'effectue des tâches répétitives dans mon travail", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je dispose de suffisamment de moyens et de temps pour bien faire mon travail", values: [3, 2, 1, 0] },
  { category: "Niveau des Exigences", item: "Je suis constamment pressé-e par le temps à cause d'une forte charge de travail", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je suis fréquemment interrompu-e et dérangé-e dans mon travail", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je suis soumis à des aléas, je reçois des sollicitations et des demandes de plusieurs personnes", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je suis souvent contraint-e à faire des heures supplémentaires", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je suis souvent sollicité-e en dehors de mes heures normales de travail", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je traite souvent ma messagerie après le travail, le soir ou le week end", values: [0, 1, 2, 3] },
  { category: "Niveau des Exigences", item: "Je trouve le volume des sollicitations raisonnable (nombre de courriels, demandes clients externes ou internes, collègues ou hiérarchiques, etc.)", values: [3, 2, 1, 0] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "J'ai la possibilité de décider l'organisation de mon temps de travail", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "J'ai la possibilité de discuter, de proposer des alternatives à ce que l'on me demande sans me mettre en difficulté", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "J'utilise ma messagerie et les autres outils numériques pour des raisons professionnelles sur mon temps personnel", values: [3, 2, 1, 0] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je dispose de marge de manœuvre pour réaliser mon travail", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je maîtrise les moments et les lieux où je juge nécessaire de me déconnecter ou me connecter afin de préserver mon équilibre vie privée / vie professionnelle", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je me forme sur des sujets professionnels sur mon temps personnel", values: [3, 2, 1, 0] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je passe peu de temps sur le reporting", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je peux facilement suivre les formations utiles à mon travail", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Je reçois rarement une demande nécessitant une réponse immédiate", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Le SI (Système d'Information) et les applications professionnelles sont fiables et opérationnelles pour mon travail", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Les outils numériques facilitent mon travail", values: [0, 1, 2, 3] },
  { category: "Degré d'Autonomie et équilibre vie privée / vie professionnelle", item: "Les procédures sont complexes", values: [3, 2, 1, 0] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Des espaces et du temps dédiés aux échanges professionnels existent", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "En cas de difficultés, je peux compter sur le soutien de mes collègues", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "J'ai confiance dans la stratégie de l'entreprise", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "J'ai le sentiment d'être intégré au collectif", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Je sais identifier le bon interlocuteur hiérarchique en cas de difficulté", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Je suis en accord avec ce que mon manager me demande de faire", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "L'organisation du travail et la répartition des responsabilités sont claires", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "L'organisation du travail prend en compte les contraintes personnelles", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Les collègues avec qui je travaille sont des gens professionnellement compétents", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Mes avis et mes propositions sont pris en compte", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Mon évaluation professionnelle est transparente et fondée sur les bons critères", values: [0, 1, 2, 3] },
  { category: "Niveau de Soutien (collègues et manager)", item: "Mon manager de proximité est accessible, disponible, et prête attention à ce que je dis", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "J'ai des informations claires sur l'évolution de mon emploi actuel, et mes besoins en formation", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Je suis inquiet par rapport à l'évolution de mon métier", values: [3, 2, 1, 0] },
  { category: "Reconnaissance au travail", item: "La qualité de mon travail est reconnue par mes collègues", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Les organisations de travail favorisent la construction et les échanges de savoir faire", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Ma position professionnelle correspond à ma qualification et à mes compétences", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Ma rémunération est cohérente avec mon expérience professionnelle et mes efforts d'adaptation", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mes souhaits d'évolution professionnelle sont pris en compte", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mon activité professionnelle est en accord avec mon éthique", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mon environnement de travail est satisfaisant (bruit, espace, ergonomie, etc.) sur mes différents lieux de travail", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mon manager connaît bien mon travail et je peux échanger avec lui pour construire des solutions", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mon travail a du sens", values: [0, 1, 2, 3] },
  { category: "Reconnaissance au travail", item: "Mon travail est apprécié à sa juste valeur par des tiers (clients, etc.)", values: [0, 1, 2, 3] },
];
const karasekCategoryOrder = [
  "Niveau des Exigences",
  "Degré d'Autonomie et équilibre vie privée / vie professionnelle",
  "Niveau de Soutien (collègues et manager)",
  "Reconnaissance au travail",
];
const karasekCategoryScoreRanges = [
  { label: "0-9", min: 0, max: 9 },
  { label: "10-18", min: 10, max: 18 },
  { label: "19-27", min: 19, max: 27 },
  { label: "28-36", min: 28, max: 36 },
];
const karasekZoneColors = {
  "Travail protecteur pour la santé": "#009E73",
  "Zone d'attention": "#F0E442",
  "Zone d'alerte": "#E69F00",
  "Travail dangereux pour la santé": "#D55E00",
};
const karasekZoneRules = {
  "Travail protecteur pour la santé": [
    "19-27;0-9;19-27",
    "19-27;0-9;28-36",
    "19-27;10-18;28-36",
    "28-36;0-9;10-18",
    "28-36;0-9;19-27",
    "28-36;0-9;28-36",
    "28-36;10-18;19-27",
    "28-36;10-18;28-36",
    "28-36;19-27;28-36",
  ],
  "Zone d'attention": [
    "10-18;0-9;28-36",
    "10-18;0-9;19-27",
    "10-18;10-18;28-36",
    "19-27;0-9;10-18",
    "19-27;10-18;19-27",
    "19-27;19-27;28-36",
    "28-36;0-9;0-9",
    "28-36;10-18;10-18",
    "28-36;10-18;0-9",
    "28-36;19-27;19-27",
    "28-36;19-27;10-18",
    "28-36;28-36;28-36",
    "28-36;28-36;19-27",
  ],
  "Zone d'alerte": [
    "0-9;0-9;10-18",
    "0-9;0-9;19-27",
    "0-9;0-9;28-36",
    "0-9;10-18;19-27",
    "0-9;10-18;28-36",
    "0-9;19-27;28-36",
    "10-18;0-9;0-9",
    "10-18;0-9;10-18",
    "10-18;10-18;0-9",
    "10-18;10-18;10-18",
    "10-18;10-18;19-27",
    "10-18;19-27;10-18",
    "10-18;19-27;19-27",
    "10-18;19-27;28-36",
    "10-18;28-36;19-27",
    "10-18;28-36;28-36",
    "19-27;0-9;0-9",
    "19-27;10-18;0-9",
    "19-27;10-18;10-18",
    "19-27;19-27;0-9",
    "19-27;19-27;10-18",
    "19-27;19-27;19-27",
    "19-27;28-36;0-9",
    "19-27;28-36;10-18",
    "19-27;28-36;19-27",
    "19-27;28-36;28-36",
    "28-36;19-27;0-9",
    "28-36;28-36;0-9",
    "28-36;28-36;10-18",
  ],
  "Travail dangereux pour la santé": [
    "0-9;0-9;0-9",
    "0-9;10-18;0-9",
    "0-9;10-18;10-18",
    "0-9;19-27;0-9",
    "0-9;19-27;19-27",
    "0-9;19-27;10-18",
    "0-9;28-36;0-9",
    "0-9;28-36;19-27",
    "0-9;28-36;10-18",
    "10-18;19-27;0-9",
    "10-18;28-36;0-9",
    "10-18;28-36;19-27",
  ],
};
const karasekZoneLookup = (() => {
  const lookup = new Map();
  Object.entries(karasekZoneRules).forEach(([zone, combos]) => {
    combos.forEach((combo) => {
      const parts = combo.split(";").map((part) => part.trim());
      if (parts.length === 3) {
        lookup.set(parts.join("|"), zone);
      }
    });
  });
  return lookup;
})();
const contentData = {
  "karasek-siegrist-referentiel": {
    title: "Karasek-Siegrist",
    subtitle: "Référentiel",
    cards: [
      "<a href='https://travail-emploi.gouv.fr/mesurer-les-facteurs-psychosociaux-de-risque-au-travail-pour-les-maitriser' target='_blank' rel='noopener noreferrer'>Rapport \"Gollac\" : Mesurer les facteurs psychosociaux de risque au travail</a>",
      "<a href='https://www.inrs.fr/risques/carrefour-psychosociaux.html' target='_blank' rel='noopener noreferrer'>INRS : risques psychosociaux</a>",
      "<a href='https://www.inrs.fr/risques/psychosociaux/facteurs-risques.html' target='_blank' rel='noopener noreferrer'>INRS : facteurs de risques psychosociaux</a>",
      "<a href='https://www.inrs.fr/media.html?refINRS=FRPS%202' target='_blank' rel='noopener noreferrer'>INRS : questionnaire dit de Karasek</a>",
      "<a href='https://www.inrs.fr/media.html?refINRS=FRPS%203' target='_blank' rel='noopener noreferrer'>INRS : questionnaire dit de Siegrist</a>",
      "<a href='https://www.anact.fr/qualite-de-vie-au-travail-et-numerique-le-fact-finance-24-projets' target='_blank' rel='noopener noreferrer'>ANACT : appel à projets \"Qualité de vie au travail et numérique\"</a>",
      "<a href='https://www.anact.fr/comment-concilier-transformation-numerique-et-qualite-de-vie-au-travail-retours-dexperiences' target='_blank' rel='noopener noreferrer'>ANACT : comment concilier transformation numérique et qualité de vie au travail - retours d'expériences</a>",
    ],
  },
  "copsoq-referentiel": {
    title: "COPSOQ",
    subtitle: "Référentiel",
    cards: [
      "<a href='https://travail-emploi.gouv.fr/mesurer-les-facteurs-psychosociaux-de-risque-au-travail-pour-les-maitriser' target='_blank' rel='noopener noreferrer'>Rapport \"Gollac\" : Mesurer les facteurs psychosociaux de risque au travail</a>",
      "<a href='https://www.inrs.fr/risques/carrefour-psychosociaux.html' target='_blank' rel='noopener noreferrer'>INRS : risques psychosociaux</a>",
      "<a href='https://www.inrs.fr/risques/psychosociaux/facteurs-risques.html' target='_blank' rel='noopener noreferrer'>INRS : facteurs de risques psychosociaux</a>",
      "<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>COPSOQ Network</a> (<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>Content under Creative Commons CC BY-NC-ND 4.0 licence</a>)",
      "<a href='https://www.copsoq-network.org/assets/pdf/COPSOQ-Sante-Publique.pdf' target='_blank' rel='noopener noreferrer'>COPSOQ en versions Française</a> (<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>Contenu sous licence Creative Commons CC BY-NC-ND 4.0</a>)",
      "<a href='https://www.un.org/sites/un2.un.org/files/copsoq-network-guidelines-an-questionnaire.pdf' target='_blank' rel='noopener noreferrer'>International COPSOQ</a> (<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>Content under Creative Commons CC BY-NC-ND 4.0 licence</a>)",
      "<a href='https://www.inrs.fr/media.html?refINRS=FRPS%2036' target='_blank' rel='noopener noreferrer'>INRS : questionnaire COPSOQ</a>",
    ],
  },
  "a-propos": {
    title: "A propos",
    subtitle: "",
    cards: [
      "Application Web Progressive d'aide à la collecte et l'analyse de questionnaires RPS | Progressive Web App for PSR questionnaires providing and analysis",
      "Karasek-Siegrist version française | french only Karasek-Siegrist<br><a href='https://www.anact.fr/qualite-de-vie-au-travail-et-numerique-le-fact-finance-24-projets' target='_blank' rel='noopener noreferrer'>ANACT : appel à projets \"Qualité de vie au travail et numérique\"</a><br><a href='https://www.anact.fr/comment-concilier-transformation-numerique-et-qualite-de-vie-au-travail-retours-dexperiences' target='_blank' rel='noopener noreferrer'>ANACT : comment concilier transformation numérique et qualité de vie au travail - retours d'expériences</a>",
      "<a href='https://www.copsoq-network.org/assets/pdf/COPSOQ-Sante-Publique.pdf' target='_blank' rel='noopener noreferrer'>COPSOQ en versions Française</a> (<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>Contenu sous licence Creative Commons CC BY-NC-ND 4.0</a>)<br><a href='https://www.un.org/sites/un2.un.org/files/copsoq-network-guidelines-an-questionnaire.pdf' target='_blank' rel='noopener noreferrer'>International COPSOQ</a> (<a href='https://www.copsoq-network.org/' target='_blank' rel='noopener noreferrer'>Content under Creative Commons CC BY-NC-ND 4.0 licence</a>)",
      "Bibliothèque graphique | Plotly.js graphing library: <a href='https://plotly.com/javascript/' target='_blank' rel='noopener noreferrer'>Plotly.js</a>",
      "Palettes de couleurs accessibles | colour-blind friendly color palettes: <a href='https://jfly.uni-koeln.de/color/#pallet' target='_blank' rel='noopener noreferrer'>Okabe-Ito</a> + <a href='https://sronpersonalpages.nl/~pault/#sec:colour_blindness' target='_blank' rel='noopener noreferrer'>Paul Tol muted</a>",
      "<a href='https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.fr' target='_blank' rel='noopener noreferrer'>Contenu sous licence CC BY-NC-ND 4.0</a> | <a href='https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.en' target='_blank' rel='noopener noreferrer'>Content under CC BY-NC-ND 4.0 licence</a>",
      "<a href='https://opensource.org/licenses/MIT' target='_blank' rel='noopener noreferrer'>Code sous licence MIT | Code under MIT licence</a>: <a href='https://github.com/mattru_microsoft/RPS' target='_blank' rel='noopener noreferrer'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'><path d='M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.263.82-.583 0-.288-.01-1.05-.015-2.06-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.335-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.403c1.02.005 2.045.138 3.003.403 2.29-1.552 3.296-1.23 3.296-1.23.653 1.653.242 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.922.43.37.815 1.096.815 2.21 0 1.595-.015 2.88-.015 3.27 0 .322.216.698.825.58C20.565 21.795 24 17.297 24 12c0-6.63-5.37-12-12-12z'/></svg></a>",
    ],
  },
};
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function shuffleItems(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}
function downloadJsonFile(payload, fileNameBase) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNameBase}${Date.now()}.json`;
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function validateKarasekSavedPayload(parsed, fileName) {
  if (!parsed || parsed.type !== "karasek-siegrist" || !Array.isArray(parsed.answers)) {
    throw new Error(`Le fichier ${fileName} ne contient pas une sauvegarde Karasek-Siegrist valide.`);
  }
  if (parsed.answers.length !== karasekQuestionnaireItems.length) {
    throw new Error(
      `Le fichier ${fileName} contient ${parsed.answers.length} réponses alors que ${karasekQuestionnaireItems.length} sont attendues.`,
    );
  }
  const expectedQuestions = new Set(karasekQuestionnaireItems.map((item) => item.item));
  const seenQuestions = new Set();
  const answerByQuestion = new Map();
  parsed.answers.forEach((answer) => {
    if (
      !answer ||
      typeof answer.questionText !== "string" ||
      !Number.isInteger(answer.answerIndex) ||
      answer.answerIndex < 0 ||
      answer.answerIndex >= karasekOptions.length
    ) {
      throw new Error(`Le fichier ${fileName} contient une ou plusieurs réponses invalides.`);
    }
    if (!expectedQuestions.has(answer.questionText)) {
      throw new Error(`Le fichier ${fileName} contient des questions qui ne correspondent pas au questionnaire.`);
    }
    if (seenQuestions.has(answer.questionText)) {
      throw new Error(`Le fichier ${fileName} contient des réponses dupliquées.`);
    }
    seenQuestions.add(answer.questionText);
    answerByQuestion.set(answer.questionText, answer.answerIndex);
  });
  if (seenQuestions.size !== expectedQuestions.size) {
    throw new Error(`Le fichier ${fileName} ne contient pas toutes les réponses attendues.`);
  }
  return answerByQuestion;
}
async function readKarasekSavedFile(file) {
  const content = await file.text();
  const parsed = JSON.parse(content);
  const answerByQuestion = validateKarasekSavedPayload(parsed, file.name);
  const ordered = computeKarasekOrderedFromAnswerMap(answerByQuestion);
  const scores = computeKarasekCategoryScores(ordered);
  const exigences = scores["Niveau des Exigences"] || 0;
  const autonomie = scores["Degré d'Autonomie et équilibre vie privée / vie professionnelle"] || 0;
  const soutien = scores["Niveau de Soutien (collègues et manager)"] || 0;
  const reconnaissance = scores["Reconnaissance au travail"] || 0;
  return {
    fileName: file.name,
    ordered,
    scores,
    zones: {
      soutien: classifyKarasekZone(soutien, exigences, autonomie),
      reconnaissance: classifyKarasekZone(reconnaissance, exigences, autonomie),
    },
  };
}

async function loadKarasekFiles(files) {
  const loaded = [];
  const errors = [];

  for (const file of files) {
    try {
      loaded.push(await readKarasekSavedFile(file));
    } catch (error) {
      const message = error instanceof Error ? error.message : `Impossible de lire ${file.name}.`;
      errors.push(message);
    }
  }

  return { loaded, errors };
}

function ensureKarasekImportInputs() {
  if (karasekImportSingleInput && karasekImportIndividualsInput && karasekImportGroupInput) {
    return;
  }

  karasekImportSingleInput = document.createElement("input");
  karasekImportSingleInput.type = "file";
  karasekImportSingleInput.accept = ".json,application/json";
  karasekImportSingleInput.style.display = "none";
  karasekImportSingleInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const individual = await readKarasekSavedFile(file);
      renderKarasekSingleResultView(
        individual.ordered,
        "questionnaire et trace associés.",
        false,
        individual.fileName,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger la sauvegarde.";
      alert(message);
    } finally {
      event.target.value = "";
    }
  });

  karasekImportIndividualsInput = document.createElement("input");
  karasekImportIndividualsInput.type = "file";
  karasekImportIndividualsInput.accept = ".json,application/json";
  karasekImportIndividualsInput.multiple = true;
  karasekImportIndividualsInput.style.display = "none";
  karasekImportIndividualsInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const { loaded, errors } = await loadKarasekFiles(files);
    if (!loaded.length) {
      alert("Aucune sauvegarde valide n'a pu être importée.");
      event.target.value = "";
      return;
    }

    if (errors.length) {
      alert(`Certaines sauvegardes n'ont pas été chargées:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }

    karasekImportedIndividuals = [...karasekImportedIndividuals, ...loaded];
    renderKarasekIndividualsView(karasekImportedIndividuals);
    event.target.value = "";
  });

  karasekImportGroupInput = document.createElement("input");
  karasekImportGroupInput.type = "file";
  karasekImportGroupInput.accept = ".json,application/json";
  karasekImportGroupInput.multiple = true;
  karasekImportGroupInput.style.display = "none";
  karasekImportGroupInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const { loaded, errors } = await loadKarasekFiles(files);
    if (!loaded.length) {
      alert("Aucune sauvegarde valide n'a pu être importée.");
      event.target.value = "";
      return;
    }

    if (errors.length) {
      alert(`Certaines sauvegardes n'ont pas été chargées:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }

    const batchIndex = karasekImportedGroupBatches.length + 1;
    karasekImportedGroupBatches = [
      ...karasekImportedGroupBatches,
      { label: `Lot ${batchIndex}`, individuals: loaded },
    ];
    renderKarasekGroupView(karasekImportedGroupBatches);
    event.target.value = "";
  });

  document.body.append(karasekImportSingleInput, karasekImportIndividualsInput, karasekImportGroupInput);
}

function triggerKarasekSingleImport() {
  ensureKarasekImportInputs();
  karasekImportSingleInput.click();
}

function triggerKarasekIndividualsImport() {
  ensureKarasekImportInputs();
  karasekImportIndividualsInput.click();
}

function triggerKarasekGroupImport() {
  ensureKarasekImportInputs();
  karasekImportGroupInput.click();
}

function ensureCopsoqMounted(preferredLang) {
  if (!contentRoot) {
    return;
  }

  if (!document.getElementById("copsocForm") && typeof mountCopsoq === "function") {
    mountCopsoq(contentRoot, preferredLang || currentLang || "fr");
  }
}

function ensureCopsoqImportInputs() {
  if (copsoqImportSingleInput && copsoqImportIndividualsInput && copsoqImportGroupInput) {
    return;
  }

  copsoqImportSingleInput = document.createElement("input");
  copsoqImportSingleInput.id = "copsoq-import-single-input";
  copsoqImportSingleInput.type = "file";
  copsoqImportSingleInput.accept = ".json,application/json";
  copsoqImportSingleInput.style.display = "none";
  copsoqImportSingleInput.addEventListener("change", (event) => {
    loadSingleFormFile(event);
  });

  copsoqImportIndividualsInput = document.createElement("input");
  copsoqImportIndividualsInput.id = "copsoq-import-individuals-input";
  copsoqImportIndividualsInput.type = "file";
  copsoqImportIndividualsInput.accept = ".json,application/json";
  copsoqImportIndividualsInput.multiple = true;
  copsoqImportIndividualsInput.style.display = "none";
  copsoqImportIndividualsInput.addEventListener("change", (event) => {
    loadMultipleFormFiles(event, "individuals");
  });

  copsoqImportGroupInput = document.createElement("input");
  copsoqImportGroupInput.id = "copsoq-import-group-input";
  copsoqImportGroupInput.type = "file";
  copsoqImportGroupInput.accept = ".json,application/json";
  copsoqImportGroupInput.multiple = true;
  copsoqImportGroupInput.style.display = "none";
  copsoqImportGroupInput.addEventListener("change", (event) => {
    loadMultipleFormFiles(event, "group");
  });

  document.body.append(copsoqImportSingleInput, copsoqImportIndividualsInput, copsoqImportGroupInput);
}

function triggerCopsoqSingleImport(preferredLang) {
  ensureCopsoqMounted(preferredLang);
  ensureCopsoqImportInputs();
  copsoqImportSingleInput.click();
}

function triggerCopsoqIndividualsImport(preferredLang) {
  ensureCopsoqMounted(preferredLang);
  ensureCopsoqImportInputs();
  copsoqImportIndividualsInput.click();
}

function triggerCopsoqGroupImport(preferredLang) {
  ensureCopsoqMounted(preferredLang);
  ensureCopsoqImportInputs();
  copsoqImportGroupInput.click();
}
function randomizeRadiosInForm(form) {
  const groups = new Map();
  const radios = form.querySelectorAll('input[type="radio"]');
  radios.forEach((radio) => {
    const group = groups.get(radio.name) || [];
    group.push(radio);
    groups.set(radio.name, group);
  });
  groups.forEach((group) => {
    const randomIndex = Math.floor(Math.random() * group.length);
    group.forEach((radio, index) => {
      radio.checked = index === randomIndex;
    });
  });
}

function getKarasekBand(score) {
  const found = karasekCategoryScoreRanges.find((range) => score >= range.min && score <= range.max);
  return found ? found.label : "0-9";
}
function getKarasekCategoryScaleColor(category, score) {
  const band = getKarasekBand(score);
  if (category === "Niveau des Exigences") {
    if (band === "0-9") return "#009E73";
    if (band === "10-18") return "#F0E442";
    if (band === "19-27") return "#E69F00";
    return "#D55E00";
  }
  if (band === "0-9") return "#D55E00";
  if (band === "10-18") return "#E69F00";
  if (band === "19-27") return "#F0E442";
  return "#009E73";
}
function classifyKarasekZone(thirdScore, exigencesScore, autonomieScore) {
  const key = `${getKarasekBand(thirdScore)}|${getKarasekBand(exigencesScore)}|${getKarasekBand(autonomieScore)}`;
  if (karasekZoneLookup.has(key)) {
    return karasekZoneLookup.get(key);
  }
  return "Zone d'alerte";
}
function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function computeKarasekOrderedFromAnswerMap(answerByQuestion) {
  return karasekQuestionnaireItems.map((entry) => {
    const choiceIndex = answerByQuestion.get(entry.item);
    const safeChoiceIndex = typeof choiceIndex === "number" ? choiceIndex : -1;
    return {
      ...entry,
      selectedChoiceIndex: safeChoiceIndex,
      selectedValue: safeChoiceIndex >= 0 ? entry.values[safeChoiceIndex] : 0,
    };
  });
}
function buildKarasekSavedPayload(ordered) {
  return {
    version: 1,
    type: "karasek-siegrist",
    savedAt: new Date().toISOString(),
    answers: ordered.map((entry) => ({
      category: entry.category,
      questionText: entry.item,
      answerIndex: entry.selectedChoiceIndex,
      answerLabel: karasekOptions[entry.selectedChoiceIndex] || "",
      scoreValue: entry.selectedValue,
    })),
  };
}
function computeKarasekCategoryScores(ordered) {
  return karasekCategoryOrder.reduce((acc, category) => {
    acc[category] = ordered
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + row.selectedValue, 0);
    return acc;
  }, {});
}
function buildKarasekQuestionnaireTable(ordered, categoryScores) {
  const tableWrap = document.createElement("div");
  tableWrap.className = "results-table-wrap";
  const table = document.createElement("table");
  table.className = "results-table";
  table.innerHTML = "<tbody></tbody>";
  const tbody = table.querySelector("tbody");
  let previousCategory = "";
  ordered.forEach((rowData) => {
    if (rowData.category !== previousCategory) {
      const categoryRow = document.createElement("tr");
      const categoryCell = document.createElement("td");
      const categoryScore = categoryScores ? categoryScores[rowData.category] || 0 : 0;
      categoryCell.colSpan = 2;
      categoryCell.textContent = rowData.category;
      categoryCell.style.backgroundColor = getKarasekCategoryScaleColor(rowData.category, categoryScore);
      categoryCell.style.color = getContrastTextColor(categoryCell.style.backgroundColor);
      categoryCell.style.fontWeight = "700";
      categoryCell.style.padding = "10px 12px";
      categoryCell.style.border = "1px solid #ffffff";
      categoryRow.append(categoryCell);
      tbody.append(categoryRow);
      previousCategory = rowData.category;
    }
    const row = document.createElement("tr");
    const itemCell = document.createElement("td");
    const responseCell = document.createElement("td");
    itemCell.textContent = rowData.item;
    responseCell.className = "check-cell";
    const selectedLabel =
      rowData.selectedChoiceIndex >= 0 && rowData.selectedChoiceIndex < karasekOptions.length
        ? karasekOptions[rowData.selectedChoiceIndex]
        : "Aucune réponse";
    responseCell.textContent = selectedLabel;
    row.append(itemCell, responseCell);
    tbody.append(row);
  });
  tableWrap.append(table);
  return tableWrap;
}
function buildKarasekZoneLegend() {
  const legend = document.createElement("div");
  legend.className = "zone-legend";
  Object.entries(karasekZoneColors).forEach(([label, color]) => {
    const legendItem = document.createElement("div");
    const chip = document.createElement("span");
    const text = document.createElement("span");
    legendItem.className = "zone-legend-item";
    chip.className = "zone-legend-color";
    chip.style.backgroundColor = color;
    text.textContent = label;
    legendItem.append(chip, text);
    legend.append(legendItem);
  });
  return legend;
}
function getKarasekExportLegendItems(lineItems = []) {
  return [
    ...lineItems,
    ...Object.entries(karasekZoneColors).map(([label, color]) => ({ label, color })),
  ];
}
function getKarasekScaleColorForCategoryScore(category, score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "#ffffff";
  }

  const isExigences = category === "Niveau des Exigences";
  if (isExigences) {
    if (numericScore <= 9) {
      return karasekZoneColors["Travail protecteur pour la santé"];
    }
    if (numericScore <= 18) {
      return karasekZoneColors["Zone d'attention"];
    }
    if (numericScore <= 27) {
      return karasekZoneColors["Zone d'alerte"];
    }
    return karasekZoneColors["Travail dangereux pour la santé"];
  }

  if (numericScore <= 9) {
    return karasekZoneColors["Travail dangereux pour la santé"];
  }
  if (numericScore <= 18) {
    return karasekZoneColors["Zone d'alerte"];
  }
  if (numericScore <= 27) {
    return karasekZoneColors["Zone d'attention"];
  }
  return karasekZoneColors["Travail protecteur pour la santé"];
}
function formatStat(values, stat) {
  const result = getStatisticValue(values, stat);
  return Number.isInteger(result) ? String(result) : result.toFixed(1);
}
function getStatisticValue(values, stat) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sortedValues = [...values].sort((a, b) => a - b);
  let result = 0;
  if (stat === "mean") {
    result = values.reduce((sum, value) => sum + value, 0) / values.length;
  } else if (stat === "median") {
    const middle = Math.floor(sortedValues.length / 2);
    result =
      sortedValues.length % 2 === 0
        ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
        : sortedValues[middle];
  } else if (stat === "min") {
    result = sortedValues[0];
  } else if (stat === "max") {
    result = sortedValues[sortedValues.length - 1];
  }
  return result;
}
function renderKarasekSingleResultView(ordered, subtitleText, showSaveButton = false, importedFileName = "") {
  if (!contentRoot) {
    return;
  }
  contentRoot.hidden = false;
  const categoryScores = computeKarasekCategoryScores(ordered);
  contentRoot.innerHTML = "";
  const resultsTitle = document.createElement("h2");
  resultsTitle.className = "content-title";
  resultsTitle.textContent = "Résultats du questionnaire Karasek-Siegrist";
  const resultsSubtitle = document.createElement("p");
  resultsSubtitle.className = "content-subtitle";
  if (importedFileName) {
    resultsSubtitle.classList.add("karasek-import-subtitle");
    const prefix = document.createElement("span");
    prefix.textContent = "Import individuel:";
    const fileName = document.createElement("span");
    fileName.textContent = importedFileName;
    const suffix = document.createElement("span");
    suffix.textContent = `- ${subtitleText}`;
    resultsSubtitle.append(prefix, buildKarasekIndividualLineSwatch(0), fileName, suffix);
  } else {
    resultsSubtitle.textContent = subtitleText;
  }
  const resultsLayout = document.createElement("div");
  resultsLayout.className = "results-layout";
  resultsLayout.style.gridTemplateColumns = "minmax(320px, 0.9fr) minmax(0, 1.1fr)";
  const tableWrap = buildKarasekQuestionnaireTable(ordered, categoryScores);
  const plotPanel = document.createElement("section");
  plotPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "karasek-3d-plot";
  plotArea.className = "plot-area";
  applyKarasekPlotContainerSize(plotArea);
  plotPanel.append(plotArea, buildKarasekZoneLegend());
  resultsLayout.append(tableWrap, plotPanel);
  contentRoot.append(resultsTitle, resultsSubtitle);
  if (showSaveButton) {
    const resultActions = document.createElement("div");
    resultActions.className = "questionnaire-actions result-actions";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "secondary-btn";
    saveBtn.textContent = "Sauvegarder dans un fichier";
    saveBtn.addEventListener("click", () => {
      downloadJsonFile(
        buildKarasekSavedPayload(ordered),
        "questionnaire-karasek-siegrist-",
      );
    });
    resultActions.append(saveBtn);
    contentRoot.append(resultActions);
  }
  contentRoot.append(resultsLayout);
  renderKarasek3dPlot("karasek-3d-plot", categoryScores);
  scrollToPageTop();
}
function getKarasekDefaultCamera() {
  return {
    eye: { x: 1.8, y: 1.8, z: 1.4 },
    center: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  };
}
function getKarasekIndividualLineColor(index) {
  return plotLineColors[index % plotLineColors.length];
}
function buildKarasekIndividualLineSwatch(index) {
  const swatch = document.createElement("span");
  swatch.className = "karasek-individual-line-swatch";
  swatch.style.backgroundColor = getKarasekIndividualLineColor(index);
  swatch.setAttribute("aria-hidden", "true");
  return swatch;
}
function getKarasekGroupLineColor(index) {
  return plotLineColors[index % plotLineColors.length];
}
function buildKarasekGroupLineSwatch(index) {
  const swatch = document.createElement("span");
  swatch.className = "karasek-group-line-swatch";
  swatch.style.backgroundColor = getKarasekGroupLineColor(index);
  swatch.setAttribute("aria-hidden", "true");
  return swatch;
}
function buildKarasekZoneCountBullet(zoneName, count) {
  const bullet = document.createElement("span");
  bullet.className = "karasek-zone-count-bullet";
  const bulletColor = count > 0 ? karasekZoneColors[zoneName] : "#d9e4ea";
  bullet.style.backgroundColor = bulletColor;
  bullet.style.color = getContrastTextColor(bulletColor);
  bullet.textContent = count;
  bullet.setAttribute("aria-label", `${count} individu${count === 1 ? "" : "s"}`);
  return bullet;
}
function styleKarasekZoneCell(cell, zoneName) {
  const zoneColor = karasekZoneColors[zoneName];
  cell.style.backgroundColor = zoneColor;
  cell.style.color = getContrastTextColor(zoneColor);
}
function renderKarasekIndividualsView(individuals) {
  if (!contentRoot || !individuals.length || typeof Plotly === "undefined") {
    return;
  }
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";
  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Résultats Karasek-Siegrist multi-individuels";
  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent =
    "Un tracé par individu avec statistiques de groupe et répartition des zones.";
  const layout = document.createElement("div");
  layout.className = "results-layout";
  layout.style.gridTemplateColumns = "minmax(320px, 0.9fr) minmax(0, 1.1fr)";
  const leftPanel = document.createElement("div");
  leftPanel.className = "results-table-wrap";
  const resetIndividualsBtn = document.createElement("button");
  resetIndividualsBtn.type = "button";
  resetIndividualsBtn.className = "secondary-btn";
  resetIndividualsBtn.textContent = "Réinitialiser les imports";
  resetIndividualsBtn.style.marginTop = "0";
  resetIndividualsBtn.style.marginBottom = "10px";
  resetIndividualsBtn.style.padding = "7px 12px";
  resetIndividualsBtn.style.fontSize = "0.86rem";
  resetIndividualsBtn.addEventListener("click", () => {
    karasekImportedIndividuals = [];
    triggerKarasekIndividualsImport();
  });
  const statsTable = document.createElement("table");
  statsTable.className = "results-table";
  statsTable.innerHTML = "<thead><tr><th>Dimension</th><th>Moyenne</th><th>Médiane</th><th>Min</th><th>Max</th></tr></thead><tbody></tbody>";
  const tbody = statsTable.querySelector("tbody");
  karasekCategoryOrder.forEach((category) => {
    const values = individuals.map((individual) => individual.scores[category] || 0);
    const row = document.createElement("tr");
    row.innerHTML = `<td>${category}</td><td>${formatStat(values, "mean")}</td><td>${formatStat(values, "median")}</td><td>${formatStat(values, "min")}</td><td>${formatStat(values, "max")}</td>`;
    const cells = row.querySelectorAll("td");
    cells[0].style.fontWeight = "600";
    for (let index = 1; index < cells.length; index += 1) {
      const cell = cells[index];
      const bgColor = getKarasekScaleColorForCategoryScore(category, cell.textContent);
      const bullet = document.createElement("span");
      bullet.className = "karasek-stat-bullet";
      bullet.style.backgroundColor = bgColor;
      bullet.setAttribute("aria-hidden", "true");
      cell.classList.add("karasek-stat-bullet-cell");
      cell.textContent = "";
      cell.append(bullet);
    }
    tbody.append(row);
  });
  const zonesTable = document.createElement("table");
  zonesTable.className = "results-table";
  zonesTable.style.marginTop = "12px";
  zonesTable.innerHTML = "<thead><tr><th>Zone</th><th>Soutien</th><th>Reconnaissance</th></tr></thead><tbody></tbody>";
  const zoneBody = zonesTable.querySelector("tbody");
  const zoneNames = Object.keys(karasekZoneColors);
  zoneNames.forEach((zoneName) => {
    const soutienCount = individuals.filter((individual) => individual.zones.soutien === zoneName).length;
    const reconnaissanceCount = individuals.filter(
      (individual) => individual.zones.reconnaissance === zoneName,
    ).length;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${zoneName}</td><td></td><td></td>`;
    const cells = row.querySelectorAll("td");
    cells[0].style.fontWeight = "600";
    styleKarasekZoneCell(cells[0], zoneName);
    cells[1].className = "karasek-stat-bullet-cell";
    cells[1].append(buildKarasekZoneCountBullet(zoneName, soutienCount));
    cells[2].className = "karasek-stat-bullet-cell";
    cells[2].append(buildKarasekZoneCountBullet(zoneName, reconnaissanceCount));
    zoneBody.append(row);
  });
  const countText = document.createElement("p");
  countText.className = "content-subtitle";
  countText.textContent = `Nombre d'individus: ${individuals.length}`;
  const fileLegend = document.createElement("ul");
  fileLegend.className = "karasek-individual-file-legend";
  fileLegend.setAttribute("aria-label", "Fichiers importés et couleurs des lignes");
  individuals.forEach((individual, index) => {
    const item = document.createElement("li");
    const fileName = document.createElement("span");
    fileName.textContent = individual.fileName;
    item.append(buildKarasekIndividualLineSwatch(index), fileName);
    fileLegend.append(item);
  });

  const selectedSummaryWrap = document.createElement("div");
  selectedSummaryWrap.style.marginTop = "12px";
  selectedSummaryWrap.style.display = "none";

  const selectedSummaryTitle = document.createElement("p");
  selectedSummaryTitle.className = "content-subtitle";

  const selectedSummaryContent = document.createElement("div");
  selectedSummaryContent.style.maxHeight = "320px";
  selectedSummaryContent.style.overflowY = "auto";
  selectedSummaryContent.style.padding = "8px";
  selectedSummaryContent.style.border = "1px solid #d9d9d9";
  selectedSummaryContent.style.borderRadius = "8px";
  selectedSummaryContent.style.background = "#ffffff";

  selectedSummaryWrap.append(selectedSummaryTitle, selectedSummaryContent);
  leftPanel.append(resetIndividualsBtn, countText, fileLegend, statsTable, zonesTable, selectedSummaryWrap);
  const rightPanel = document.createElement("section");
  rightPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "karasek-multi-individuals-plot";
  plotArea.className = "plot-area";
  applyKarasekPlotContainerSize(plotArea);
  rightPanel.append(plotArea, buildKarasekZoneLegend());
  layout.append(leftPanel, rightPanel);
  contentRoot.append(title, subtitle, layout);
  const soutienTrace = {
    type: "scatter3d",
    mode: "markers",
    name: "Point Soutien",
    x: [],
    y: [],
    z: [],
    text: [],
    customdata: [],
    marker: {
      size: 7,
      color: [],
      symbol: "circle",
      line: { color: "#ffffff", width: 1 },
    },
    hovertemplate: "%{text}<br>Exigences: %{x}<br>Autonomie: %{y}<br>Soutien: %{z}<extra></extra>",
  };
  const reconnaissanceTrace = {
    type: "scatter3d",
    mode: "markers",
    name: "Point Reconnaissance",
    x: [],
    y: [],
    z: [],
    text: [],
    customdata: [],
    marker: {
      size: 7,
      color: [],
      symbol: "diamond",
      line: { color: "#ffffff", width: 1 },
    },
    hovertemplate: "%{text}<br>Exigences: %{x}<br>Autonomie: %{y}<br>Reconnaissance: %{z}<extra></extra>",
  };
  const linkTraces = [];
  individuals.forEach((individual, index) => {
    const exigences = individual.scores["Niveau des Exigences"] || 0;
    const autonomie = individual.scores["Degré d'Autonomie et équilibre vie privée / vie professionnelle"] || 0;
    const soutien = individual.scores["Niveau de Soutien (collègues et manager)"] || 0;
    const reconnaissance = individual.scores["Reconnaissance au travail"] || 0;
    soutienTrace.x.push(exigences);
    soutienTrace.y.push(autonomie);
    soutienTrace.z.push(soutien);
    soutienTrace.text.push(individual.fileName);
    soutienTrace.customdata.push(index);
    soutienTrace.marker.color.push(karasekZoneColors[individual.zones.soutien]);
    reconnaissanceTrace.x.push(exigences);
    reconnaissanceTrace.y.push(autonomie);
    reconnaissanceTrace.z.push(reconnaissance);
    reconnaissanceTrace.text.push(individual.fileName);
    reconnaissanceTrace.customdata.push(index);
    reconnaissanceTrace.marker.color.push(karasekZoneColors[individual.zones.reconnaissance]);
    linkTraces.push({
      type: "scatter3d",
      mode: "lines",
      showlegend: false,
      hoverinfo: "skip",
      x: [exigences, exigences],
      y: [autonomie, autonomie],
      z: [soutien, reconnaissance],
      line: {
        color: getKarasekIndividualLineColor(index),
        width: 4,
      },
    });
  });
  const traces = [...linkTraces, soutienTrace, reconnaissanceTrace];
  const plotLayout = {
    autosize: true,
    height: Math.max(650, Math.round(window.innerHeight * 0.72)),
    paper_bgcolor: "rgba(255,255,255,1)",
    plot_bgcolor: "rgba(255,255,255,1)",
    margin: { t: 10, r: 15, b: 10, l: 10 },
    showlegend: false,
    scene: {
      xaxis: { title: { text: "Exigences" }, range: [0, 36], dtick: 9 },
      yaxis: { title: { text: "Autonomie" }, range: [0, 36], dtick: 9 },
      zaxis: { title: { text: "Soutien / Reconnaissance" }, range: [0, 36], dtick: 9 },
      aspectmode: "cube",
      camera: getKarasekDefaultCamera(),
    },
  };
  Plotly.newPlot(
    plotArea,
    traces,
    plotLayout,
    getKarasekPlotConfig(plotArea, "karasek-individuels", {
      title: "Karasek-Siegrist : analyse d'un groupe d'individus",
      lineItems: individuals.map((individual, index) => ({
        label: individual.fileName,
        color: getKarasekIndividualLineColor(index),
        type: "line",
      })),
    }),
  );
  requestAnimationFrame(() => {
    Plotly.Plots.resize(plotArea);
  });
  plotArea.on("plotly_click", (event) => {
    const point = event && event.points && event.points[0];
    if (!point) {
      return;
    }
    const index = Number(point.customdata);
    if (!Number.isInteger(index) || index < 0 || index >= individuals.length) {
      return;
    }
    const individual = individuals[index];
    const titlePrefix = document.createElement("span");
    titlePrefix.textContent = "Questionnaire associé:";
    const fileName = document.createElement("span");
    fileName.textContent = individual.fileName;
    selectedSummaryTitle.classList.add("karasek-selected-summary-title");
    selectedSummaryTitle.replaceChildren(
      titlePrefix,
      buildKarasekIndividualLineSwatch(index),
      fileName,
    );
    selectedSummaryContent.innerHTML = "";
    selectedSummaryContent.append(buildKarasekQuestionnaireTable(individual.ordered, individual.scores));
    selectedSummaryWrap.style.display = "block";
  });
  scrollToPageTop();
}
function renderKarasekGroupView(individuals) {
  if (!contentRoot || !individuals.length || typeof Plotly === "undefined") {
    return;
  }
  contentRoot.hidden = false;
  const groupBatches = Array.isArray(individuals[0] && individuals[0].individuals)
    ? individuals
    : [{ label: "Lot 1", individuals }];
  contentRoot.innerHTML = "";
  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Résultats Karasek-Siegrist de groupes";
  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Tous les individus dans une même trace avec statistiques de groupe et répartition des zones.";
  const layout = document.createElement("div");
  layout.className = "results-layout";
  layout.style.gridTemplateColumns = "minmax(320px, 0.9fr) minmax(0, 1.1fr)";
  const leftPanel = document.createElement("div");
  leftPanel.className = "results-table-wrap";
  const resetGroupBtn = document.createElement("button");
  resetGroupBtn.type = "button";
  resetGroupBtn.className = "secondary-btn";
  resetGroupBtn.textContent = "Réinitialiser les imports";
  resetGroupBtn.style.marginTop = "0";
  resetGroupBtn.style.marginBottom = "10px";
  resetGroupBtn.style.padding = "7px 12px";
  resetGroupBtn.style.fontSize = "0.86rem";
  resetGroupBtn.addEventListener("click", () => {
    karasekImportedGroupBatches = [];
    triggerKarasekGroupImport();
  });
  leftPanel.append(resetGroupBtn);

  const batchList = document.createElement("div");
  batchList.className = "karasek-group-set-list";
  groupBatches.forEach((batch, batchIndex) => {
    const batchIndividuals = batch.individuals || [];
    const batchItem = document.createElement("section");
    batchItem.className = "karasek-group-set-item";
    const batchHeading = document.createElement("div");
    batchHeading.className = "karasek-group-set-heading";
    const batchName = document.createElement("strong");
    batchName.textContent = batch.label;
    const count = document.createElement("span");
    count.textContent = `Nombre d'individus: ${batchIndividuals.length}`;
    batchHeading.append(buildKarasekGroupLineSwatch(batchIndex), batchName, count);
    const fileList = document.createElement("ul");
    fileList.className = "karasek-group-file-list";
    fileList.setAttribute("aria-label", `Fichiers importés — ${batch.label}`);
    batchIndividuals.forEach((individual) => {
      const fileItem = document.createElement("li");
      fileItem.textContent = individual.fileName;
      fileList.append(fileItem);
    });
    batchItem.append(batchHeading, fileList);
    batchList.append(batchItem);
  });
  leftPanel.append(batchList);

  const statsTable = document.createElement("table");
  statsTable.className = "results-table karasek-group-statistics-table";
  statsTable.innerHTML = "<thead><tr><th>Dimension</th><th>Lot</th><th>Moyenne</th><th>Médiane</th><th>Min</th><th>Max</th></tr></thead><tbody></tbody>";
  const statsBody = statsTable.querySelector("tbody");
  karasekCategoryOrder.forEach((category) => {
    groupBatches.forEach((batch, batchIndex) => {
      const batchIndividuals = batch.individuals || [];
      const values = batchIndividuals.map((individual) => individual.scores[category] || 0);
      const row = document.createElement("tr");
      if (batchIndex === 0) {
        const categoryCell = document.createElement("td");
        categoryCell.rowSpan = groupBatches.length;
        categoryCell.className = "karasek-group-label-cell";
        categoryCell.textContent = category;
        row.append(categoryCell);
      }
      const batchCell = document.createElement("td");
      batchCell.className = "karasek-group-batch-cell";
      const batchName = document.createElement("span");
      batchName.textContent = batch.label;
      batchCell.append(buildKarasekGroupLineSwatch(batchIndex), batchName);
      row.append(batchCell);
      ["mean", "median", "min", "max"].forEach((statisticName) => {
        const statistic = formatStat(values, statisticName);
        const statCell = document.createElement("td");
        statCell.className = "karasek-stat-bullet-cell";
        statCell.setAttribute("aria-label", statistic);
        statCell.title = statistic;
        const bullet = document.createElement("span");
        bullet.className = "karasek-stat-bullet";
        bullet.style.backgroundColor = getKarasekScaleColorForCategoryScore(category, statistic);
        bullet.setAttribute("aria-hidden", "true");
        statCell.append(bullet);
        row.append(statCell);
      });
      statsBody.append(row);
    });
  });
  leftPanel.append(statsTable);

  const zonesTable = document.createElement("table");
  zonesTable.className = "results-table karasek-group-statistics-table";
  zonesTable.style.marginTop = "12px";
  zonesTable.innerHTML = "<thead><tr><th>Zone</th><th>Lot</th><th>Soutien</th><th>Reconnaissance</th></tr></thead><tbody></tbody>";
  const zoneBody = zonesTable.querySelector("tbody");
  Object.keys(karasekZoneColors).forEach((zoneName) => {
    groupBatches.forEach((batch, batchIndex) => {
      const batchIndividuals = batch.individuals || [];
      const soutienCount = batchIndividuals.filter((individual) => individual.zones.soutien === zoneName).length;
      const reconnaissanceCount = batchIndividuals.filter(
        (individual) => individual.zones.reconnaissance === zoneName,
      ).length;
      const row = document.createElement("tr");
      if (batchIndex === 0) {
        const zoneCell = document.createElement("td");
        zoneCell.rowSpan = groupBatches.length;
        zoneCell.className = "karasek-group-label-cell";
        zoneCell.textContent = zoneName;
        styleKarasekZoneCell(zoneCell, zoneName);
        row.append(zoneCell);
      }
      const batchCell = document.createElement("td");
      batchCell.className = "karasek-group-batch-cell";
      const batchName = document.createElement("span");
      batchName.textContent = batch.label;
      batchCell.append(buildKarasekGroupLineSwatch(batchIndex), batchName);
      row.append(batchCell);
      [soutienCount, reconnaissanceCount].forEach((count) => {
        const statCell = document.createElement("td");
        statCell.className = "karasek-stat-bullet-cell";
        statCell.append(buildKarasekZoneCountBullet(zoneName, count));
        row.append(statCell);
      });
      zoneBody.append(row);
    });
  });
  leftPanel.append(zonesTable);
  const rightPanel = document.createElement("section");
  rightPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "karasek-group-plot";
  plotArea.className = "plot-area";
  applyKarasekPlotContainerSize(plotArea);
  rightPanel.append(plotArea, buildKarasekZoneLegend());
  layout.append(leftPanel, rightPanel);
  contentRoot.append(title, subtitle, layout);
  const traces = [];

  groupBatches.forEach((batch, batchIndex) => {
    const batchIndividuals = batch.individuals || [];
    const groupPointColor = getKarasekGroupLineColor(batchIndex);

    const soutienTrace = {
      type: "scatter3d",
      mode: "markers",
      name: `Soutien (${batch.label})`,
      x: [],
      y: [],
      z: [],
      text: [],
      customdata: [],
      marker: {
        size: 6,
        color: [],
        symbol: "circle",
        line: { color: "#ffffff", width: 1 },
      },
      hovertemplate:
        "%{text}<br>Lot: %{customdata[0]}<br>Zone: %{customdata[1]}<br>Exigences: %{x}<br>Autonomie: %{y}<br>Soutien: %{z}<extra></extra>",
    };

    const reconnaissanceTrace = {
      type: "scatter3d",
      mode: "markers",
      name: `Reconnaissance (${batch.label})`,
      x: [],
      y: [],
      z: [],
      text: [],
      customdata: [],
      marker: {
        size: 6,
        color: [],
        symbol: "diamond",
        line: { color: "#ffffff", width: 1 },
      },
      hovertemplate:
        "%{text}<br>Lot: %{customdata[0]}<br>Zone: %{customdata[1]}<br>Exigences: %{x}<br>Autonomie: %{y}<br>Reconnaissance: %{z}<extra></extra>",
    };

    const linkTrace = {
      type: "scatter3d",
      mode: "lines",
      showlegend: false,
      hoverinfo: "skip",
      x: [],
      y: [],
      z: [],
      line: {
        color: groupPointColor,
        width: 4,
      },
    };

    batchIndividuals.forEach((individual) => {
      const exigences = individual.scores["Niveau des Exigences"] || 0;
      const autonomie = individual.scores["Degré d'Autonomie et équilibre vie privée / vie professionnelle"] || 0;
      const soutien = individual.scores["Niveau de Soutien (collègues et manager)"] || 0;
      const reconnaissance = individual.scores["Reconnaissance au travail"] || 0;
      const zoneSoutien = individual.zones.soutien;
      const zoneReconnaissance = individual.zones.reconnaissance;

      soutienTrace.x.push(exigences);
      soutienTrace.y.push(autonomie);
      soutienTrace.z.push(soutien);
      soutienTrace.text.push(individual.fileName);
      soutienTrace.customdata.push([batch.label, zoneSoutien]);
      soutienTrace.marker.color.push(karasekZoneColors[zoneSoutien]);

      reconnaissanceTrace.x.push(exigences);
      reconnaissanceTrace.y.push(autonomie);
      reconnaissanceTrace.z.push(reconnaissance);
      reconnaissanceTrace.text.push(individual.fileName);
      reconnaissanceTrace.customdata.push([batch.label, zoneReconnaissance]);
      reconnaissanceTrace.marker.color.push(karasekZoneColors[zoneReconnaissance]);

      linkTrace.x.push(exigences, exigences, null);
      linkTrace.y.push(autonomie, autonomie, null);
      linkTrace.z.push(soutien, reconnaissance, null);
    });

    traces.push(linkTrace, soutienTrace, reconnaissanceTrace);
  });
  const plotLayout = {
    autosize: true,
    height: Math.max(650, Math.round(window.innerHeight * 0.72)),
    paper_bgcolor: "rgba(255,255,255,1)",
    plot_bgcolor: "rgba(255,255,255,1)",
    margin: { t: 10, r: 15, b: 10, l: 10 },
    showlegend: false,
    scene: {
      xaxis: { title: { text: "Exigences" }, range: [0, 36], dtick: 9 },
      yaxis: { title: { text: "Autonomie" }, range: [0, 36], dtick: 9 },
      zaxis: { title: { text: "Soutien / Reconnaissance" }, range: [0, 36], dtick: 9 },
      aspectmode: "cube",
      camera: getKarasekDefaultCamera(),
    },
  };
  Plotly.newPlot(
    plotArea,
    traces,
    plotLayout,
    getKarasekPlotConfig(plotArea, "karasek-groupe", {
      title: "Karasek-Siegrist : analyse comparée de groupes",
      lineItems: groupBatches.map((batch, batchIndex) => ({
        label: batch.label,
        color: getKarasekGroupLineColor(batchIndex),
        type: "line",
      })),
    }),
  );
  requestAnimationFrame(() => {
    Plotly.Plots.resize(plotArea);
  });
  scrollToPageTop();
}
function renderKarasek3dPlot(plotId, scores) {
  const plotContainer = document.getElementById(plotId);
  if (!plotContainer || typeof Plotly === "undefined") {
    return;
  }
  applyKarasekPlotContainerSize(plotContainer);
  const exigences = scores["Niveau des Exigences"] || 0;
  const autonomie = scores["Degré d'Autonomie et équilibre vie privée / vie professionnelle"] || 0;
  const soutien = scores["Niveau de Soutien (collègues et manager)"] || 0;
  const reconnaissance = scores["Reconnaissance au travail"] || 0;
  const zoneSoutien = classifyKarasekZone(soutien, exigences, autonomie);
  const zoneReconnaissance = classifyKarasekZone(reconnaissance, exigences, autonomie);
  const linkTrace = {
    type: "scatter3d",
    mode: "lines",
    showlegend: false,
    hoverinfo: "skip",
    x: [exigences, exigences],
    y: [autonomie, autonomie],
    z: [soutien, reconnaissance],
    line: {
      color: getKarasekIndividualLineColor(0),
      width: 4,
    },
  };
  const traceSoutien = {
    type: "scatter3d",
    mode: "markers",
    name: "Point Soutien",
    x: [exigences],
    y: [autonomie],
    z: [soutien],
    marker: {
      size: 8,
      color: karasekZoneColors[zoneSoutien],
      line: { color: "#ffffff", width: 1 },
    },
    hovertemplate:
      "Exigences: %{x}<br>Autonomie: %{y}<br>Soutien: %{z}<br>Zone: " + zoneSoutien + "<extra></extra>",
  };
  const traceReconnaissance = {
    type: "scatter3d",
    mode: "markers",
    name: "Point Reconnaissance",
    x: [exigences],
    y: [autonomie],
    z: [reconnaissance],
    marker: {
      size: 8,
      color: karasekZoneColors[zoneReconnaissance],
      line: { color: "#ffffff", width: 1 },
      symbol: "diamond",
    },
    hovertemplate:
      "Exigences: %{x}<br>Autonomie: %{y}<br>Reconnaissance: %{z}<br>Zone: " + zoneReconnaissance + "<extra></extra>",
  };
  const layout = {
    autosize: true,
    height: Math.max(650, Math.round(window.innerHeight * 0.72)),
    paper_bgcolor: "rgba(255,255,255,1)",
    plot_bgcolor: "rgba(255,255,255,1)",
    margin: { t: 10, r: 15, b: 10, l: 10 },
    showlegend: false,
    scene: {
      xaxis: { title: { text: "Exigences" }, range: [0, 36], dtick: 9 },
      yaxis: {
        title: { text: "Autonomie" },
        range: [0, 36],
        dtick: 9,
      },
      zaxis: {
        title: { text: "Soutien/Reconnaissance" },
        range: [0, 36],
        dtick: 9,
      },
      aspectmode: "cube",
      camera: getKarasekDefaultCamera(),
    },
  };
  Plotly.purge(plotContainer);
  Plotly.newPlot(
    plotContainer,
    [linkTrace, traceSoutien, traceReconnaissance],
    layout,
    getKarasekPlotConfig(plotContainer, "karasek-resultat"),
  );
  requestAnimationFrame(() => {
    Plotly.Plots.resize(plotContainer);
  });
  return { zoneSoutien, zoneReconnaissance };
}
function applyKarasekPlotContainerSize(container) {
  if (!container) {
    return;
  }
  container.style.width = "100%";
  container.style.minHeight = "720px";
  container.style.height = "min(78vh, 840px)";
}
function getKarasekPlotConfig(container, filenamePrefix, exportOptions = {}) {
  ensureKarasekFullscreenBehavior(container);
  return {
    responsive: true,
    sendDataToCloud: false,
    displaylogo: false,
    displayModeBar: true,
    modeBarButtonsToRemove: ["resetCameraLastSave3d", "toImage"],
    toImageButtonOptions: {
      format: "png",
      filename: `${filenamePrefix}-${Date.now()}`,
      scale: 1,
    },
    modeBarButtonsToAdd: [
      getPlotImageExportButton(container, {
        title: exportOptions.title || "Karasek-Siegrist",
        legendItems: getKarasekExportLegendItems(exportOptions.lineItems),
        filename: `${filenamePrefix}-${Date.now()}`,
        width: 1600,
        height: 1600,
      }),
      {
        name: "fullscreen",
        title: "Visualiser en plein écran",
        icon: {
          width: 500,
          height: 500,
          path: "M0,0 L150,0 L150,50 L50,50 L50,150 L0,150 Z M350,0 L500,0 L500,150 L450,150 L450,50 L350,50 Z M0,350 L50,350 L50,450 L150,450 L150,500 L0,500 Z M450,350 L500,350 L500,500 L350,500 L350,450 L450,450 Z",
        },
        click: function () {
          if (!container) {
            return;
          }
          if (!document.fullscreenElement) {
            container.dataset.karasekPrevBackground = container.style.backgroundColor || "";
            container.style.backgroundColor = "#ffffff";
            container.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          setTimeout(() => Plotly.Plots.resize(container), 150);
        },
      },
    ],
  };
}
function ensureKarasekFullscreenBehavior(container) {
  if (!container || container.dataset.karasekFullscreenBound === "true") {
    return;
  }
  container.dataset.karasekFullscreenBound = "true";
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === container) {
      container.style.backgroundColor = "#ffffff";
      if (typeof Plotly !== "undefined" && typeof Plotly.relayout === "function") {
        Plotly.relayout(container, {
          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#ffffff",
        });
      }
    } else {
      container.style.backgroundColor = container.dataset.karasekPrevBackground || "";
      if (typeof Plotly !== "undefined" && typeof Plotly.relayout === "function") {
        Plotly.relayout(container, {
          paper_bgcolor: "rgba(255,255,255,1)",
          plot_bgcolor: "rgba(255,255,255,1)",
        });
      }
    }
    if (typeof Plotly !== "undefined" && Plotly.Plots && typeof Plotly.Plots.resize === "function") {
      setTimeout(() => Plotly.Plots.resize(container), 100);
    }
  });
}
function renderKarasekQuestionnaire() {
  if (!contentRoot) {
    return;
  }
  const shuffled = shuffleItems(karasekQuestionnaireItems).map((entry, index) => ({
    ...entry,
    id: `karasek-item-${index + 1}`,
  }));
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";
  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Questionnaire Karasek-Siegrist";
  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Sélectionner pour chaque item la réponse la plus appropriée.";
  const form = document.createElement("form");
  form.className = "questionnaire-form";
  shuffled.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "questionnaire-item questionnaire-item-radio";
    const itemText = document.createElement("p");
    itemText.className = "question-item-text";
    itemText.textContent = entry.item;
    const group = document.createElement("div");
    group.className = "radio-group";
    karasekOptions.forEach((option, optionIndex) => {
      const optionLabel = document.createElement("label");
      const radio = document.createElement("input");
      optionLabel.className = "radio-option";
      radio.type = "radio";
      radio.name = entry.id;
      radio.value = String(entry.values[optionIndex]);
      radio.dataset.choiceIndex = String(optionIndex);
      radio.required = optionIndex === 0;
      optionLabel.append(radio, document.createTextNode(option));
      group.append(optionLabel);
    });
    row.append(itemText, group);
    form.append(row);
  });
  const actions = document.createElement("div");
  actions.className = "questionnaire-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "secondary-btn";
  saveBtn.textContent = "Sauvegarder";
  saveBtn.addEventListener("click", () => {
    if (!form.checkValidity()) {
      alert("Veuillez répondre à toutes les questions avant de sauvegarder le formulaire.");
      return;
    }

    const ordered = shuffled.map((entry) => {
      const selected = form.querySelector(`input[name="${entry.id}"]:checked`);
      return {
        ...entry,
        selectedChoiceIndex: selected ? Number(selected.dataset.choiceIndex) : -1,
        selectedValue: selected ? Number(selected.value) : 0,
      };
    });
    downloadJsonFile(buildKarasekSavedPayload(ordered), "questionnaire-karasek-siegrist-");
  });

  const randomFillBtn = document.createElement("button");
  randomFillBtn.type = "button";
  randomFillBtn.className = "secondary-btn";
  randomFillBtn.textContent = "Remplissage aléatoire";
  randomFillBtn.addEventListener("click", () => {
    randomizeRadiosInForm(form);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "submit-btn";
  submitBtn.textContent = "Voir les résultats";

  actions.append(
    randomFillBtn,
    saveBtn,
    submitBtn,
  );
  form.append(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedByItem = new Map();
    shuffled.forEach((entry) => {
      const selected = form.querySelector(`input[name="${entry.id}"]:checked`);
      if (selected) {
        selectedByItem.set(entry.item, {
          value: Number(selected.value),
          choiceIndex: Number(selected.dataset.choiceIndex),
        });
      }
    });

    const ordered = karasekQuestionnaireItems.map((entry) => {
      const selected = selectedByItem.get(entry.item) || { value: 0, choiceIndex: -1 };
      return {
        ...entry,
        selectedValue: selected.value,
        selectedChoiceIndex: selected.choiceIndex,
      };
    });

    renderKarasekSingleResultView(
      ordered,
      "Lecture ordonnée par catégorie et visualisation 3D des scores par zones.",
      true,
    );
  });

  contentRoot.append(title, subtitle, form);
}
function setActiveMenuLink(activeLink) {
  document.querySelectorAll(".submenu-link.active, .menu-link.active").forEach((element) => {
    element.classList.remove("active");
  });
  if (activeLink) {
    activeLink.classList.add("active");
  }
}
function openContent(contentId, activeLink) {
  if (externalMenuLinks[contentId]) {
    window.open(externalMenuLinks[contentId], "_blank", "noopener,noreferrer");
    setActiveMenuLink(activeLink);
    return;
  }

  if (contentId === "copsoq-questionnaire") {
    if (typeof mountCopsoq === "function") {
      mountCopsoq(contentRoot, "fr");
    }
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  if (contentId === "copsoq-importer-un-fichier-import-a-file") {
    triggerCopsoqSingleImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "copsoq-importer-plusieurs-fichiers-individus-import-multiple-files-individuals") {
    triggerCopsoqIndividualsImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "copsoq-importer-plusieurs-fichiers-groupe-import-multiple-files-group") {
    triggerCopsoqGroupImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "karasek-siegrist-questionnaire") {
    renderKarasekQuestionnaire();
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  if (contentId === "karasek-siegrist-importer-un-fichier") {
    triggerKarasekSingleImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "karasek-siegrist-importer-plusieurs-fichiers-individus") {
    triggerKarasekIndividualsImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "karasek-siegrist-importer-plusieurs-fichiers-groupe") {
    triggerKarasekGroupImport();
    setActiveMenuLink(activeLink);
    contentRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (contentId === "rapprochement-rps-rapprochement-rps-individuel") {
    renderRpsGollacIndividualView();
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  if (contentId === "rapprochement-rps-rapprochement-rps-de-plusieurs-individus") {
    renderRpsGollacMultiIndividualsView();
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  if (contentId === "rapprochement-rps-rapprochement-rps-de-groupes") {
    renderRpsGollacGroupsView();
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  if (contentId === "rapprochement-rps-referentiel") {
    renderRpsGollacReferentielView();
    setActiveMenuLink(activeLink);
    scrollToPageTop();
    return;
  }

  const data = contentData[contentId];
  if (!data || !contentRoot) {
    return;
  }

  contentRoot.innerHTML = "";
  const title = document.createElement("h2");
  const subtitle = document.createElement("p");
  const grid = document.createElement("div");

  title.className = "content-title";
  title.textContent = data.title;

  subtitle.className = "content-subtitle";
  subtitle.textContent = data.subtitle;

  grid.className = "content-grid";

  data.cards.forEach((text) => {
    const card = document.createElement("article");
    const body = document.createElement("p");
    card.className = "content-card";
    body.innerHTML = text;

    if (data.subtitle !== "Référentiel" && data.title !== "A propos") {
      const heading = document.createElement("h3");
      heading.textContent = data.title;
      card.append(heading);
    }
    card.append(body);
    grid.append(card);
  });

  contentRoot.append(title, subtitle, grid);
  contentRoot.hidden = false;
  setActiveMenuLink(activeLink);
  scrollToPageTop();
}

function createSubmenuItem(parentLabel, itemLabel) {
  const li = document.createElement("li");
  const link = document.createElement("a");
  const contentId = `${slugify(parentLabel)}-${slugify(itemLabel)}`;

  link.className = "submenu-link";
  link.href = `#${contentId}`;
  link.textContent = itemLabel;
  link.setAttribute("aria-label", `${parentLabel} - ${itemLabel}`);
  link.dataset.contentId = contentId;

  link.addEventListener("click", (event) => {
    event.preventDefault();
    openContent(contentId, link);
    closeHamburgerMenu();
  });

  li.append(link);
  return li;
}

function createMenuItem(entry) {
  const item = document.createElement("section");
  item.className = "menu-item";

  if (!entry.submenu.length) {
    const link = document.createElement("a");
    const contentId = slugify(entry.label);

    link.className = "menu-link";
    link.href = `#${contentId}`;
    if (contentId === "github") {
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.setAttribute("width", "14");
      icon.setAttribute("height", "14");
      icon.setAttribute("aria-hidden", "true");
      icon.style.marginRight = "8px";
      icon.style.verticalAlign = "text-bottom";

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M8 0C3.58 0 0 3.58 0 8a8.001 8.001 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.49c-2.23.49-2.69-1.08-2.69-1.08-.36-.92-.88-1.16-.88-1.16-.72-.49.06-.48.06-.48.8.06 1.22.82 1.22.82.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82a7.64 7.64 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.2c0 .21.14.46.55.38A8.001 8.001 0 0 0 16 8c0-4.42-3.58-8-8-8Z",
      );
      path.setAttribute("fill", "currentColor");
      icon.append(path);

      const text = document.createElement("span");
      text.textContent = entry.label;
      link.append(icon, text);
    } else if (contentId === "cc-by-nc-nd-4-0") {
      const iconsWrap = document.createElement("span");
      iconsWrap.style.display = "inline-flex";
      iconsWrap.style.alignItems = "center";
      iconsWrap.style.gap = "4px";
      iconsWrap.style.marginRight = "8px";

      const ccIcons = ["cc", "by", "nc", "nd"];
      ccIcons.forEach((iconName) => {
        const icon = document.createElement("img");
        icon.src = `https://mirrors.creativecommons.org/presskit/icons/${iconName}.svg`;
        icon.width = 16;
        icon.height = 16;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        icon.style.verticalAlign = "text-bottom";
        iconsWrap.append(icon);
      });

      const text = document.createElement("span");
      text.textContent = entry.label;
      link.append(iconsWrap, text);
    } else {
      link.textContent = entry.label;
    }
    link.setAttribute("aria-label", entry.label);
    link.dataset.contentId = contentId;

    link.addEventListener("click", (event) => {
      event.preventDefault();
      openContent(contentId, link);
      closeHamburgerMenu();
    });

    item.append(link);
    return item;
  }

  const button = document.createElement("button");
  const submenuId = `submenu-${slugify(entry.label)}`;
  button.className = "menu-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", submenuId);
  button.innerHTML = `${entry.label}<span class="chevron" aria-hidden="true">▾</span>`;

  const submenu = document.createElement("ul");
  submenu.className = "submenu";
  submenu.id = submenuId;

  entry.submenu.forEach((child) => {
    submenu.append(createSubmenuItem(entry.label, child));
  });

  button.addEventListener("click", () => {
    const isOpen = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  item.append(button, submenu);
  return item;
}

// --- Rapprochement RPS (Gollac / INRS) : Karasek-Siegrist / COPSOQ ---

const rpsGollacAxes = [
  "Intensité du travail et temps de travail",
  "Exigences émotionnelles",
  "Manque d'autonomie",
  "Rapports sociaux au travail dégradés",
  "Conflits de valeurs",
  "Insécurité de la situation de travail",
];

// Axe Gollac/INRS attribué par défaut à chaque catégorie du questionnaire Karasek-Siegrist.
const karasekAxisByCategory = {
  "Niveau des Exigences": "Intensité du travail et temps de travail",
  "Degré d'Autonomie et équilibre vie privée / vie professionnelle": "Manque d'autonomie",
  "Niveau de Soutien (collègues et manager)": "Rapports sociaux au travail dégradés",
  "Reconnaissance au travail": "Rapports sociaux au travail dégradés",
};

// Sens de lecture du score brut de chaque catégorie : "risk" = un score élevé signale un risque
// plus élevé (ex. charge de travail), "protective" = un score élevé signale une situation favorable.
const karasekCategoryDirection = {
  "Niveau des Exigences": "risk",
  "Degré d'Autonomie et équilibre vie privée / vie professionnelle": "protective",
  "Niveau de Soutien (collègues et manager)": "protective",
  "Reconnaissance au travail": "protective",
};

// Quelques items isolés relèvent d'un axe différent de celui de leur catégorie d'appartenance.
const karasekAxisItemOverrides = {
  "Mon activité professionnelle est en accord avec mon éthique": "Conflits de valeurs",
  "Je suis inquiet par rapport à l'évolution de mon métier": "Insécurité de la situation de travail",
  // Même construit que l'échelle COPSOQ "Sens du travail", mappée sur ce même axe.
  "Mon travail a du sens": "Conflits de valeurs",
  // Ces items de la catégorie "Degré d'Autonomie et équilibre vie privée / vie professionnelle"
  // relèvent en réalité de l'articulation vie pro/vie perso et du temps de travail (cf. l'échelle
  // COPSOQ "Conflit famille/travail", elle aussi rattachée à cet axe), pas de l'autonomie.
  "J'utilise ma messagerie et les autres outils numériques pour des raisons professionnelles sur mon temps personnel":
    "Intensité du travail et temps de travail",
  "Je maîtrise les moments et les lieux où je juge nécessaire de me déconnecter ou me connecter afin de préserver mon équilibre vie privée / vie professionnelle":
    "Intensité du travail et temps de travail",
  "Je me forme sur des sujets professionnels sur mon temps personnel": "Intensité du travail et temps de travail",
  "Je reçois rarement une demande nécessitant une réponse immédiate": "Intensité du travail et temps de travail",
};

function getKarasekItemAxis(entry) {
  return karasekAxisItemOverrides[entry.item] || karasekAxisByCategory[entry.category] || null;
}

// Libellés affichés pour les 4 dimensions Karasek-Siegrist dans le Sankey (les items isolés
// ci-dessus ne créent plus leurs propres nœuds : ils restent comptés dans la dimension à
// laquelle ils appartiennent, seul leur axe Gollac/INRS diffère pour le calcul par axe).
const karasekDimensionDisplayNames = {
  "Niveau des Exigences": "Exigences psychologiques",
  "Degré d'Autonomie et équilibre vie privée / vie professionnelle": "Autonomie/latitude décisionnelle",
  "Niveau de Soutien (collègues et manager)": "Soutien social au travail",
  "Reconnaissance au travail": "Reconnaissance au travail",
};

// Axe Gollac/INRS attribué à chaque échelle du questionnaire COPSOQ (version française du dépôt).
// Une valeur "null" indique un indicateur de santé/attitude, non retenu comme facteur d'exposition RPS.
const copsoqAxisByEchelleFr = {
  "Charge de travail": "Intensité du travail et temps de travail",
  "Rythme de travail": "Intensité du travail et temps de travail",
  "Exigences cognitives": "Intensité du travail et temps de travail",
  "Prévisibilité": "Intensité du travail et temps de travail",
  "Clarté des rôles": "Intensité du travail et temps de travail",
  "Conflit famille/travail": "Intensité du travail et temps de travail",
  "Exigences émotionnelles": "Exigences émotionnelles",
  "Marge de manœuvre": "Manque d'autonomie",
  "Possibilités d'épanouissement": "Manque d'autonomie",
  "Reconnaissance": "Rapports sociaux au travail dégradés",
  "Équité": "Rapports sociaux au travail dégradés",
  "Qualité de leadership du supérieur hiérarchique": "Rapports sociaux au travail dégradés",
  "Soutien social de la part du supérieur hiérarchique": "Rapports sociaux au travail dégradés",
  "Confiance entre les salariés et le management": "Rapports sociaux au travail dégradés",
  "Confiance entre les collègues": "Rapports sociaux au travail dégradés",
  "Soutien social de la part des collègues": "Rapports sociaux au travail dégradés",
  "Conflit de rôles": "Conflits de valeurs",
  "Sens du travail": "Conflits de valeurs",
  "Insécurité professionnelle": "Insécurité de la situation de travail",
  "Santé auto-évaluée": null,
  "Stress": null,
  "Épuisement": null,
  "Engagement dans l'entreprise": null,
  "Satisfaction au travail": null,
};

// Domaine COPSOQ (FR) de chaque échelle : dérivé directement du questionnaire (questionsFR)
// pour rester garanti cohérent avec la structure réelle Domaines/Échelles.
let copsoqDomainByEchelleFrCache = null;
function getCopsoqDomainByEchelle() {
  if (!copsoqDomainByEchelleFrCache) {
    copsoqDomainByEchelleFrCache = {};
    questionsFR.forEach((question) => {
      copsoqDomainByEchelleFrCache[question.echelle] = question.domaine;
    });
  }
  return copsoqDomainByEchelleFrCache;
}

// Ordre d'affichage : domaine par domaine, puis échelles dans l'ordre de chaque domaine,
// pour que les échelles d'un même domaine restent regroupées au même niveau dans le Sankey.
const copsoqDomainDisplayOrder = [
  "Contraintes quantitatives",
  "Organisation et leadership",
  "Relations horizontales",
  "Autonomie",
  "Vécu professionnel",
  "Santé et Bien-être",
];
const copsoqEchelleDisplayOrderByDomain = {
  "Contraintes quantitatives": ["Charge de travail", "Rythme de travail", "Exigences cognitives"],
  "Organisation et leadership": [
    "Prévisibilité",
    "Reconnaissance",
    "Équité",
    "Clarté des rôles",
    "Conflit de rôles",
    "Qualité de leadership du supérieur hiérarchique",
    "Soutien social de la part du supérieur hiérarchique",
    "Confiance entre les salariés et le management",
  ],
  "Relations horizontales": ["Confiance entre les collègues", "Soutien social de la part des collègues"],
  "Autonomie": ["Marge de manœuvre", "Possibilités d'épanouissement"],
  "Santé et Bien-être": [
    "Santé auto-évaluée",
    "Stress",
    "Épuisement",
    "Exigences émotionnelles",
    "Conflit famille/travail",
    "Insécurité professionnelle",
  ],
  "Vécu professionnel": ["Sens du travail", "Engagement dans l'entreprise", "Satisfaction au travail"],
};

// Ordre d'affichage explicite des dimensions Karasek-Siegrist dans le Sankey.
const karasekDimDisplayOrder = [
  "Exigences psychologiques",
  "Autonomie/latitude décisionnelle",
  "Soutien social au travail",
  "Reconnaissance au travail",
];

// Rassemble les correspondances brutes (échelles COPSOQ + dimensions Karasek-Siegrist)
// utilisées par les visualisations Sankey du référentiel et de la correspondance.
function getRpsGollacCorrespondenceEntries() {
  const domainByEchelle = getCopsoqDomainByEchelle();
  const copsoqEchelles = Object.entries(copsoqAxisByEchelleFr).sort(([echelleA], [echelleB]) => {
    const domainA = domainByEchelle[echelleA];
    const domainB = domainByEchelle[echelleB];
    const domainDiff = copsoqDomainDisplayOrder.indexOf(domainA) - copsoqDomainDisplayOrder.indexOf(domainB);
    if (domainDiff !== 0) {
      return domainDiff;
    }
    const echelleOrder = copsoqEchelleDisplayOrderByDomain[domainA] || [];
    return echelleOrder.indexOf(echelleA) - echelleOrder.indexOf(echelleB);
  });
  const karasekDims = Object.entries(karasekAxisByCategory).map(([category, axis]) => ({
    label: karasekDimensionDisplayNames[category],
    axis,
  }));
  const copsoqDomains = [...new Set(copsoqEchelles.map(([echelle]) => getCopsoqDomainByEchelle()[echelle]))];
  const sortedKarasekDims = [...karasekDims].sort(
    (a, b) => karasekDimDisplayOrder.indexOf(a.label) - karasekDimDisplayOrder.indexOf(b.label),
  );
  return { copsoqEchelles, karasekDims, copsoqDomains, sortedKarasekDims };
}

function hexToRgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Ramène chaque réponse Karasek-Siegrist à un score 0-100 où 100 = situation favorable,
// pour rester comparable aux scores COPSOQ (qui suivent déjà cette convention).
function getKarasekItemProtectivePercent(entry) {
  const percent = (entry.selectedValue / 3) * 100;
  const direction = karasekCategoryDirection[entry.category] || "protective";
  return direction === "risk" ? 100 - percent : percent;
}

function computeKarasekAxisScores(ordered) {
  const totals = {};
  rpsGollacAxes.forEach((axis) => {
    totals[axis] = { sum: 0, count: 0 };
  });
  ordered.forEach((entry) => {
    if (entry.selectedChoiceIndex < 0) {
      return;
    }
    const axis = getKarasekItemAxis(entry);
    if (!axis || !totals[axis]) {
      return;
    }
    totals[axis].sum += getKarasekItemProtectivePercent(entry);
    totals[axis].count += 1;
  });
  const scores = {};
  rpsGollacAxes.forEach((axis) => {
    const { sum, count } = totals[axis];
    scores[axis] = count > 0 ? Math.round(sum / count) : null;
  });
  return scores;
}

function computeCopsoqAxisScores(answers) {
  const totals = {};
  rpsGollacAxes.forEach((axis) => {
    totals[axis] = { sum: 0, count: 0 };
  });
  answers.forEach((answer) => {
    const axis = copsoqAxisByEchelleFr[answer.echelle];
    if (!axis || !totals[axis]) {
      return;
    }
    totals[axis].sum += getScoreForAnswer(answer, answer.answerIndex);
    totals[axis].count += 1;
  });
  const scores = {};
  rpsGollacAxes.forEach((axis) => {
    const { sum, count } = totals[axis];
    scores[axis] = count > 0 ? Math.round(sum / count) : null;
  });
  return scores;
}

// Positionne les nœuds d'une colonne en reprenant le même pas vertical que la colonne la plus
// longue (les échelles), et centre les colonnes plus courtes : chaque colonne occupe ainsi la
// même hauteur par nœud que les échelles au lieu d'être étirée sur toute la hauteur du graphique.
// pitchMultiplier permet d'espacer légèrement plus certaines colonnes (ex. dimensions Karasek-Siegrist).
function getRpsGollacSankeyNodeY(index, count, referenceCount, top = 0.06, bottom = 0.94, pitchMultiplier = 1) {
  if (referenceCount <= 1 || count <= 1) {
    return (top + bottom) / 2;
  }
  const pitch = ((bottom - top) / (referenceCount - 1)) * pitchMultiplier;
  const columnSpan = pitch * (count - 1);
  const columnTop = top + (bottom - top - columnSpan) / 2;
  return columnTop + pitch * index;
}

// Marge verticale et espacement inter-nœuds utilisés à la fois pour le calcul de la mise en
// page (layout.margin) et pour le calage pixel-perfect des colonnes Domaines / Axes ci-dessous.
const RPS_GOLLAC_SANKEY_MARGIN = 30;
const RPS_GOLLAC_SANKEY_NODE_PAD = 10;

// Plotly dimensionne chaque nœud Sankey proportionnellement à sa valeur totale de flux (ici,
// le nombre d'échelles qui le traversent), avec la colonne des échelles comme référence
// d'échelle : elle remplit exactement la hauteur disponible (valeur 1 par échelle + pad entre
// chaque nœud). Pour les colonnes Domaines / Axes Gollac-INRS, dont les nœuds ont des poids très
// différents (2 à 8 échelles), un simple espacement régulier par index chevauche les nœuds les
// plus "lourds". On calcule donc ici, en pixels, la position empilée de chaque nœud à partir de
// son poids réel, avec un espace fixe garanti entre deux nœuds, puis on centre la colonne.
function stackRpsGollacSankeyColumnByWeight(weights, referenceCount, plotHeight, gapPx = 22, top = 0.06, bottom = 0.94) {
  const plotAreaPx = plotHeight - RPS_GOLLAC_SANKEY_MARGIN * 2;
  const unitPx = (plotAreaPx - RPS_GOLLAC_SANKEY_NODE_PAD * (referenceCount - 1)) / referenceCount;
  const heightsPx = weights.map((weight) => Math.max(weight, 0.0001) * unitPx);
  const totalHeightPx = heightsPx.reduce((sum, h) => sum + h, 0) + gapPx * (weights.length - 1);
  const availablePx = (bottom - top) * plotAreaPx;
  let cursor = (availablePx - totalHeightPx) / 2;
  return heightsPx.map((h) => {
    const centerPx = cursor + h / 2;
    cursor += h + gapPx;
    return top + centerPx / plotAreaPx;
  });
}

function buildRpsGollacSankeyFigure() {
  const { copsoqEchelles, copsoqDomains, sortedKarasekDims } = getRpsGollacCorrespondenceEntries();
  const referenceCount = Math.max(
    copsoqEchelles.length,
    copsoqDomains.length,
    rpsGollacAxes.length,
    sortedKarasekDims.length,
  );
  const height = getRpsGollacSankeyHeight();
  const domainWeights = copsoqDomains.map(
    (domain) => copsoqEchelles.filter(([echelle]) => getCopsoqDomainByEchelle()[echelle] === domain).length,
  );
  const axisWeights = rpsGollacAxes.map((axis) => copsoqEchelles.filter(([, echelleAxis]) => echelleAxis === axis).length);
  const domainY = stackRpsGollacSankeyColumnByWeight(domainWeights, copsoqEchelles.length, height);
  const axisY = stackRpsGollacSankeyColumnByWeight(axisWeights, copsoqEchelles.length, height);

  const nodeLabels = [];
  const nodeX = [];
  const nodeY = [];
  const nodeColor = [];
  const nodeIndexByKey = new Map();
  const spreadY = (index, count) => getRpsGollacSankeyNodeY(index, count, referenceCount);
  // Un peu plus d'espace entre les dimensions Karasek-Siegrist.
  const spreadYKarasek = (index, count) => getRpsGollacSankeyNodeY(index, count, referenceCount, 0.06, 0.94, 1.4);
  const addNode = (key, label, x, y, color) => {
    nodeIndexByKey.set(key, nodeLabels.length);
    nodeLabels.push(label);
    nodeX.push(x);
    nodeY.push(y);
    nodeColor.push(color);
  };

  copsoqEchelles.forEach(([echelle], index) => {
    addNode(`echelle:${echelle}`, echelle, 0.01, spreadY(index, copsoqEchelles.length), paulTolMutedColors[6]);
  });
  copsoqDomains.forEach((domain, index) => {
    addNode(`domain:${domain}`, domain, 0.28, domainY[index], paulTolMutedColors[7]);
  });
  rpsGollacAxes.forEach((axis, index) => {
    addNode(`axis:${axis}`, axis, 0.56, axisY[index], paulTolMutedColors[0]);
  });
  sortedKarasekDims.forEach((dim, index) => {
    addNode(`karasek:${dim.label}`, dim.label, 0.99, spreadYKarasek(index, sortedKarasekDims.length), paulTolMutedColors[8]);
  });

  const linkSource = [];
  const linkTarget = [];
  const linkValue = [];
  const linkColor = [];
  const addLink = (sourceKey, targetKey, color, value = 1) => {
    if (!nodeIndexByKey.has(sourceKey) || !nodeIndexByKey.has(targetKey)) {
      return;
    }
    linkSource.push(nodeIndexByKey.get(sourceKey));
    linkTarget.push(nodeIndexByKey.get(targetKey));
    linkValue.push(value);
    linkColor.push(color);
  };

  copsoqEchelles.forEach(([echelle]) => {
    addLink(`echelle:${echelle}`, `domain:${getCopsoqDomainByEchelle()[echelle]}`, hexToRgba(paulTolMutedColors[1], 0.35));
  });
  const domainAxisCounts = new Map();
  copsoqEchelles.forEach(([echelle, axis]) => {
    const key = `${getCopsoqDomainByEchelle()[echelle]}|${axis}`;
    domainAxisCounts.set(key, (domainAxisCounts.get(key) || 0) + 1);
  });
  domainAxisCounts.forEach((count, key) => {
    const [domain, axis] = key.split("|");
    addLink(`domain:${domain}`, `axis:${axis}`, hexToRgba(paulTolMutedColors[1], 0.35), count);
  });
  sortedKarasekDims.forEach((dim) => {
    addLink(`axis:${dim.axis}`, `karasek:${dim.label}`, hexToRgba(paulTolMutedColors[1], 0.35));
  });

  return {
    data: [
      {
        type: "sankey",
        orientation: "h",
        arrangement: "fixed",
        node: {
          label: nodeLabels,
          x: nodeX,
          y: nodeY,
          color: nodeColor,
          pad: RPS_GOLLAC_SANKEY_NODE_PAD,
          thickness: 14,
          line: { color: "#ffffff", width: 0.5 },
          hoverinfo: "skip",
        },
        link: {
          source: linkSource,
          target: linkTarget,
          value: linkValue,
          color: linkColor,
          hoverinfo: "skip",
        },
      },
    ],
  };
}

// Config Plotly commune aux visualisations Sankey : ne garder que
// l'enregistrement en image et le plein écran dans la modebar.
function getRpsGollacSimplePlotConfig(container) {
  return {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      "zoom2d",
      "pan2d",
      "select2d",
      "lasso2d",
      "zoomIn2d",
      "zoomOut2d",
      "autoScale2d",
      "resetScale2d",
      "toggleHover",
      "toggleSpikelines",
      "hoverClosestCartesian",
      "hoverCompareCartesian",
      "resetSankeyGroup",
      "hoverClosestSankey",
    ],
    modeBarButtonsToAdd: [
      {
        name: "fullscreen",
        title: "Visualiser en plein écran",
        icon: {
          width: 500,
          height: 500,
          path: "M0,0 L150,0 L150,50 L50,50 L50,150 L0,150 Z M350,0 L500,0 L500,150 L450,150 L450,50 L350,50 Z M0,350 L50,350 L50,450 L150,450 L150,500 L0,500 Z M450,350 L500,350 L500,500 L350,500 L350,450 L450,450 Z",
        },
        click: () => toggleCopsoqFullscreen(container),
      },
    ],
  };
}

// Hauteur du diagramme Sankey calée sur la colonne la plus longue (les échelles COPSOQ),
// pour que chaque étiquette de nœud reste lisible et pleinement visible, tout en restant
// responsive (recalculée à chaque rendu à partir de la fenêtre courante).
function getRpsGollacSankeyHeight() {
  const { copsoqEchelles, copsoqDomains, sortedKarasekDims } = getRpsGollacCorrespondenceEntries();
  const rowCount = Math.max(copsoqEchelles.length, copsoqDomains.length, rpsGollacAxes.length, sortedKarasekDims.length, 1);
  return Math.max(680, Math.round(window.innerHeight * 0.78), rowCount * 32 + 100);
}

function renderRpsGollacSankey(plotId) {
  const container = document.getElementById(plotId);
  if (!container || typeof Plotly === "undefined") {
    return;
  }
  const figure = buildRpsGollacSankeyFigure();
  const height = getRpsGollacSankeyHeight();
  const layout = {
    autosize: true,
    height,
    font: { size: 12 },
    margin: { l: 10, r: 10, t: RPS_GOLLAC_SANKEY_MARGIN, b: RPS_GOLLAC_SANKEY_MARGIN },
  };
  // Fixe la hauteur réelle du conteneur : sans cela, "responsive" la ramène au
  // min-height CSS (bien plus petit) au moindre redimensionnement, masquant les nœuds.
  container.style.height = `${height}px`;
  ensureCopsoqFullscreenBehavior(container);
  Plotly.newPlot(container, figure.data, layout, getRpsGollacSimplePlotConfig(container)).then(() =>
    ensureRpsGollacSankeyHoverHighlight(container),
  );
}

// Survol d'un lien : le met en évidence avec tous les liens qu'il alimente en aval (colonnes
// suivantes), en atténuant les autres — hoverinfo étant à "skip", Plotly ne fait rien de tel
// nativement, ce comportement est donc entièrement géré ici via les éléments <path> du SVG.
// Le survol d'une étiquette de nœud applique le même surlignage que celui de n'importe lequel
// de ses liens (tous ses liens entrants/sortants, puis tout le chemin complet qui en découle).
function ensureRpsGollacSankeyHoverHighlight(container) {
  const linksGroup = container.querySelector("svg g.sankey-links");
  if (!linksGroup) {
    return;
  }
  const linkPaths = Array.from(linksGroup.querySelectorAll("path"));
  const outgoingByNode = new Map();
  const incomingByNode = new Map();
  const pathByLink = new Map();
  const addToMap = (map, key, path) => {
    const list = map.get(key) || [];
    list.push(path);
    map.set(key, list);
  };
  linkPaths.forEach((path) => {
    const link = path.__data__ && path.__data__.link;
    if (!link) {
      return;
    }
    addToMap(outgoingByNode, link.source, path);
    addToMap(incomingByNode, link.target, path);
    pathByLink.set(link, path);
  });

  // Remonte ET descend depuis chaque lien de départ, pour surligner tout le chemin complet
  // (Échelles -> Domaines -> Axes Gollac/INRS -> Dimensions Karasek-Siegrist) quelle que soit
  // la colonne (ou le nœud) survolé, pas seulement ce qui se trouve en aval.
  const getConnectedLinks = (seedLinks) => {
    const highlighted = new Set();
    const walk = (startNode, byNode, getNextNode) => {
      const visited = new Set();
      let frontier = [startNode];
      while (frontier.length) {
        const next = [];
        frontier.forEach((nodeIndex) => {
          if (visited.has(nodeIndex)) {
            return;
          }
          visited.add(nodeIndex);
          (byNode.get(nodeIndex) || []).forEach((path) => {
            highlighted.add(path);
            next.push(getNextNode(path.__data__.link));
          });
        });
        frontier = next;
      }
    };
    seedLinks.forEach((link) => {
      const seedPath = pathByLink.get(link);
      if (seedPath) {
        highlighted.add(seedPath);
      }
      walk(link.target, outgoingByNode, (l) => l.target);
      walk(link.source, incomingByNode, (l) => l.source);
    });
    return highlighted;
  };

  const applyHighlight = (highlighted) => {
    linkPaths.forEach((otherPath) => {
      otherPath.style.opacity = highlighted.has(otherPath) ? "1" : "0.12";
    });
  };
  const resetHighlight = () => {
    linkPaths.forEach((otherPath) => {
      otherPath.style.opacity = "";
    });
  };

  linkPaths.forEach((path) => {
    path.addEventListener("mouseover", () => applyHighlight(getConnectedLinks([path.__data__.link])));
    path.addEventListener("mouseout", resetHighlight);
  });

  const nodeGroups = Array.from(container.querySelectorAll("svg g.sankey-node"));
  nodeGroups.forEach((nodeGroup) => {
    const node = nodeGroup.__data__ && nodeGroup.__data__.node;
    if (!node) {
      return;
    }
    const seedLinks = [...(node.sourceLinks || []), ...(node.targetLinks || [])];
    nodeGroup.addEventListener("mouseover", () => applyHighlight(getConnectedLinks(seedLinks)));
    nodeGroup.addEventListener("mouseout", resetHighlight);
  });
}

const RPS_GOLLAC_NO_SCORE_COLOR = "#9aa5b1";

function getRpsGollacItemColor(score) {
  return Number.isFinite(score) ? getScoreColor(score) : RPS_GOLLAC_NO_SCORE_COLOR;
}

// Les scores de dimension Karasek-Siegrist sont classés par quart strict (25 points chacun),
// comme les quartiles 0-9/10-18/19-27/28-36 des résultats bruts du questionnaire — contrairement
// à getScoreColor (bandes Okabe-Ito 0-20/21-50/51-79/80-100, plus étroites aux extrémités), qui
// pouvait faire glisser un score du quart le plus défavorable vers un quart moins défavorable.
function getKarasekDimensionItemColor(score) {
  if (!Number.isFinite(score)) {
    return RPS_GOLLAC_NO_SCORE_COLOR;
  }
  if (score <= 25) return "#D55E00";
  if (score <= 50) return "#E69F00";
  if (score < 75) return "#F0E442";
  return "#009E73";
}

// Score 0-100 par dimension Karasek-Siegrist (même échelle "protective" que computeKarasekAxisScores).
// Les items isolés (cf. karasekAxisItemOverrides) restent comptés dans la dimension de leur
// catégorie d'origine : seul leur axe Gollac/INRS diffère (computeKarasekAxisScores).
function computeKarasekDimensionScores(ordered) {
  const scores = {};
  Object.keys(karasekAxisByCategory).forEach((category) => {
    const items = ordered.filter((row) => row.category === category && row.selectedChoiceIndex >= 0);
    const label = karasekDimensionDisplayNames[category];
    scores[label] = items.length
      ? Math.round(items.reduce((sum, row) => sum + getKarasekItemProtectivePercent(row), 0) / items.length)
      : null;
  });
  return scores;
}


// Score 0-100 par échelle COPSOQ, réutilise le regroupement déjà utilisé par les résultats COPSOQ.
function computeCopsoqEchelleScores(answers) {
  const { scaleStatsByDomain } = buildDomainSummary(answers);
  const scores = {};
  Object.values(scaleStatsByDomain).forEach((scalesForDomain) => {
    Object.entries(scalesForDomain).forEach(([echelle, score]) => {
      scores[echelle] = score;
    });
  });
  return scores;
}

// Calcule les scores (échelle / domaine / axe / dimension) utilisés pour colorer les Sankey
// de correspondance ; karasekFiles / copsoqFiles sont des tableaux (moyenne sur plusieurs
// fichiers si besoin, un seul élément pour le rapprochement RPS individuel).
function computeRpsGollacCorrespondanceScores(karasekFiles, copsoqFiles) {
  const { copsoqEchelles, karasekDims } = getRpsGollacCorrespondenceEntries();

  const averageScores = (perFileScores, keys) => {
    const result = {};
    keys.forEach((key) => {
      const values = perFileScores.map((scores) => scores[key]).filter((value) => Number.isFinite(value));
      result[key] = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    });
    return result;
  };

  const echelleKeys = copsoqEchelles.map(([echelle]) => echelle);
  const karasekDimKeys = karasekDims.map((dim) => dim.label);

  const echelleScores = copsoqFiles.length
    ? averageScores(copsoqFiles.map((file) => computeCopsoqEchelleScores(file.answers)), echelleKeys)
    : {};
  const karasekDimScores = karasekFiles.length
    ? averageScores(karasekFiles.map((file) => computeKarasekDimensionScores(file.ordered)), karasekDimKeys)
    : {};
  const karasekAxisScores = karasekFiles.length
    ? averageScores(karasekFiles.map((file) => computeKarasekAxisScores(file.ordered)), rpsGollacAxes)
    : {};
  const copsoqAxisScores = copsoqFiles.length
    ? averageScores(copsoqFiles.map((file) => computeCopsoqAxisScores(file.answers)), rpsGollacAxes)
    : {};

  const domainTotals = new Map();
  copsoqEchelles.forEach(([echelle]) => {
    const score = echelleScores[echelle];
    if (!Number.isFinite(score)) {
      return;
    }
    const domain = getCopsoqDomainByEchelle()[echelle];
    if (!domainTotals.has(domain)) {
      domainTotals.set(domain, []);
    }
    domainTotals.get(domain).push(score);
  });
  const domainScores = {};
  domainTotals.forEach((values, domain) => {
    domainScores[domain] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  });

  const axisScores = {};
  rpsGollacAxes.forEach((axis) => {
    const values = [karasekAxisScores[axis], copsoqAxisScores[axis]].filter((value) => Number.isFinite(value));
    axisScores[axis] = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  });

  return { echelleScores, domainScores, axisScores, karasekDimScores };
}

function buildRpsGollacCorrespondanceSankeyFigure(scores, linkColorOverride = null) {
  const { copsoqEchelles, copsoqDomains, sortedKarasekDims } = getRpsGollacCorrespondenceEntries();
  const { echelleScores, domainScores, axisScores, karasekDimScores } = scores;
  const referenceCount = Math.max(
    copsoqEchelles.length,
    copsoqDomains.length,
    rpsGollacAxes.length,
    sortedKarasekDims.length,
  );
  const height = getRpsGollacSankeyHeight();
  const domainWeights = copsoqDomains.map(
    (domain) => copsoqEchelles.filter(([echelle]) => getCopsoqDomainByEchelle()[echelle] === domain).length,
  );
  const axisWeights = rpsGollacAxes.map((axis) => copsoqEchelles.filter(([, echelleAxis]) => echelleAxis === axis).length);
  const domainY = stackRpsGollacSankeyColumnByWeight(domainWeights, copsoqEchelles.length, height);
  const axisY = stackRpsGollacSankeyColumnByWeight(axisWeights, copsoqEchelles.length, height);

  const nodeLabels = [];
  const nodeX = [];
  const nodeY = [];
  const nodeColor = [];
  const nodeIndexByKey = new Map();
  const spreadY = (index, count) => getRpsGollacSankeyNodeY(index, count, referenceCount);
  // Un peu plus d'espace entre les dimensions Karasek-Siegrist.
  const spreadYKarasek = (index, count) => getRpsGollacSankeyNodeY(index, count, referenceCount, 0.06, 0.94, 1.4);
  const addNode = (key, label, x, y, color) => {
    nodeIndexByKey.set(key, nodeLabels.length);
    nodeLabels.push(label);
    nodeX.push(x);
    nodeY.push(y);
    nodeColor.push(color);
  };

  copsoqEchelles.forEach(([echelle], index) => {
    addNode(
      `echelle:${echelle}`,
      echelle,
      0.01,
      spreadY(index, copsoqEchelles.length),
      getRpsGollacItemColor(echelleScores[echelle]),
    );
  });
  copsoqDomains.forEach((domain, index) => {
    addNode(`domain:${domain}`, domain, 0.28, domainY[index], getRpsGollacItemColor(domainScores[domain]));
  });
  rpsGollacAxes.forEach((axis, index) => {
    addNode(`axis:${axis}`, axis, 0.56, axisY[index], getRpsGollacItemColor(axisScores[axis]));
  });
  sortedKarasekDims.forEach((dim, index) => {
    addNode(
      `karasek:${dim.label}`,
      dim.label,
      0.99,
      spreadYKarasek(index, sortedKarasekDims.length),
      getKarasekDimensionItemColor(karasekDimScores[dim.label]),
    );
  });

  const linkSource = [];
  const linkTarget = [];
  const linkValue = [];
  const linkColor = [];
  const addLink = (sourceKey, targetKey, color, value = 1) => {
    if (!nodeIndexByKey.has(sourceKey) || !nodeIndexByKey.has(targetKey)) {
      return;
    }
    linkSource.push(nodeIndexByKey.get(sourceKey));
    linkTarget.push(nodeIndexByKey.get(targetKey));
    linkValue.push(value);
    linkColor.push(color);
  };

  copsoqEchelles.forEach(([echelle]) => {
    const score = echelleScores[echelle];
    if (linkColorOverride && !Number.isFinite(score)) {
      return;
    }
    addLink(
      `echelle:${echelle}`,
      `domain:${getCopsoqDomainByEchelle()[echelle]}`,
      linkColorOverride || hexToRgba(getRpsGollacItemColor(score), 0.35),
    );
  });
  const domainAxisCounts = new Map();
  copsoqEchelles.forEach(([echelle, axis]) => {
    const key = `${getCopsoqDomainByEchelle()[echelle]}|${axis}`;
    domainAxisCounts.set(key, (domainAxisCounts.get(key) || 0) + 1);
  });
  domainAxisCounts.forEach((count, key) => {
    const [domain, axis] = key.split("|");
    const score = domainScores[domain];
    if (linkColorOverride && !Number.isFinite(score)) {
      return;
    }
    addLink(`domain:${domain}`, `axis:${axis}`, linkColorOverride || hexToRgba(getRpsGollacItemColor(score), 0.35), count);
  });
  sortedKarasekDims.forEach((dim) => {
    const score = karasekDimScores[dim.label];
    if (linkColorOverride && !Number.isFinite(score)) {
      return;
    }
    addLink(
      `axis:${dim.axis}`,
      `karasek:${dim.label}`,
      linkColorOverride || hexToRgba(getKarasekDimensionItemColor(score), 0.35),
    );
  });

  return {
    data: [
      {
        type: "sankey",
        orientation: "h",
        arrangement: "fixed",
        node: {
          label: nodeLabels,
          x: nodeX,
          y: nodeY,
          color: nodeColor,
          pad: RPS_GOLLAC_SANKEY_NODE_PAD,
          thickness: 14,
          line: { color: "#ffffff", width: 0.5 },
          hoverinfo: "skip",
        },
        link: {
          source: linkSource,
          target: linkTarget,
          value: linkValue,
          color: linkColor,
          hoverinfo: "skip",
        },
      },
    ],
  };
}

function renderRpsGollacCorrespondanceSankey(plotId, scores) {
  const container = document.getElementById(plotId);
  if (!container || typeof Plotly === "undefined") {
    return;
  }
  const figure = buildRpsGollacCorrespondanceSankeyFigure(scores);
  const height = getRpsGollacSankeyHeight();
  const layout = {
    autosize: true,
    height,
    font: { size: 12 },
    margin: { l: 10, r: 10, t: RPS_GOLLAC_SANKEY_MARGIN, b: RPS_GOLLAC_SANKEY_MARGIN },
  };
  container.style.height = `${height}px`;
  ensureCopsoqFullscreenBehavior(container);
  Plotly.newPlot(container, figure.data, layout, getRpsGollacSimplePlotConfig(container)).then(() =>
    ensureRpsGollacSankeyHoverHighlight(container),
  );
}

function computeRpsGollacAxisStatistics(scoreMaps) {
  const stats = {};
  rpsGollacAxes.forEach((axis) => {
    const values = scoreMaps.map((scores) => scores[axis]).filter((value) => Number.isFinite(value));
    stats[axis] = {
      mean: values.length ? Math.round(getStatisticValue(values, "mean")) : null,
      median: values.length ? Math.round(getStatisticValue(values, "median")) : null,
      min: values.length ? Math.round(getStatisticValue(values, "min")) : null,
      max: values.length ? Math.round(getStatisticValue(values, "max")) : null,
    };
  });
  return stats;
}

function createRpsGollacScorePastille(score) {
  const wrap = document.createElement("span");
  wrap.className = "rps-score-pastille-wrap";
  if (!Number.isFinite(score)) {
    wrap.textContent = "—";
    return wrap;
  }
  const dot = document.createElement("span");
  dot.className = "rps-score-pastille";
  dot.style.backgroundColor = getScoreColor(score);
  const text = document.createElement("span");
  text.textContent = String(score);
  wrap.append(dot, text);
  return wrap;
}

function buildRpsGollacComparisonTable(karasekScores, copsoqScores) {
  const wrap = document.createElement("div");
  wrap.className = "results-table-wrap";
  const table = document.createElement("table");
  table.className = "results-table";
  table.style.width = "auto";
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Facteurs Gollac / INRS</th><th style='white-space: nowrap;'>Karasek-Siegrist</th><th style='white-space: nowrap;'>COPSOQ (FR)</th><th>Écart</th></tr>";
  const tbody = document.createElement("tbody");
  rpsGollacAxes.forEach((axis) => {
    const karasekScore = karasekScores ? karasekScores[axis] : null;
    const copsoqScore = copsoqScores ? copsoqScores[axis] : null;
    const row = document.createElement("tr");
    const axisCell = document.createElement("td");
    axisCell.textContent = axis;
    const karasekCell = document.createElement("td");
    karasekCell.className = "check-cell";
    karasekCell.append(createRpsGollacScorePastille(karasekScore));
    const copsoqCell = document.createElement("td");
    copsoqCell.className = "check-cell";
    copsoqCell.append(createRpsGollacScorePastille(copsoqScore));
    const gapCell = document.createElement("td");
    gapCell.className = "check-cell";
    gapCell.textContent =
      Number.isFinite(karasekScore) && Number.isFinite(copsoqScore)
        ? String(Math.abs(karasekScore - copsoqScore))
        : "—";
    row.append(axisCell, karasekCell, copsoqCell, gapCell);
    tbody.append(row);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderRpsGollacIndividualView() {
  if (!contentRoot) {
    return;
  }
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Rapprochement RPS";

  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Rapprochement RPS individuel";

  const intro = document.createElement("article");
  intro.className = "content-card";
  intro.innerHTML =
    "<p>Chargez un résultat sauvegardé (fichier .json exporté depuis les pages « Questionnaire ») de Karasek-Siegrist et/ou de COPSOQ pour comparer les scores obtenus sur les 6 axes du " +
    "<a href='https://travail-emploi.gouv.fr/mesurer-les-facteurs-psychosociaux-de-risque-au-travail-pour-les-maitriser' target='_blank' rel='noopener noreferrer'>rapport « Gollac »</a> repris par " +
    "<a href='https://www.inrs.fr/risques/psychosociaux/facteurs-risques.html' target='_blank' rel='noopener noreferrer'>l'INRS</a>. " +
    "Les scores sont ramenés sur une échelle de 0 (situation à risque) à 100 (situation favorable) afin d'être comparables entre les deux questionnaires. " +
    "Cette correspondance est une proposition indicative, à valider si besoin par un préventeur ou un expert RPS. Voir le sous-menu « Référentiel » pour le détail de la correspondance.</p>";

  const actions = document.createElement("div");
  actions.className = "questionnaire-actions";

  const karasekInput = document.createElement("input");
  karasekInput.type = "file";
  karasekInput.accept = ".json,application/json";
  karasekInput.style.display = "none";

  const copsoqInput = document.createElement("input");
  copsoqInput.type = "file";
  copsoqInput.accept = ".json,application/json";
  copsoqInput.style.display = "none";

  const karasekBtn = document.createElement("button");
  karasekBtn.type = "button";
  karasekBtn.className = "secondary-btn";
  karasekBtn.textContent = "Charger un résultat Karasek-Siegrist (.json)";

  const copsoqBtn = document.createElement("button");
  copsoqBtn.type = "button";
  copsoqBtn.className = "secondary-btn";
  copsoqBtn.textContent = "Charger un résultat COPSOQ Français (.json)";

  const karasekStatus = document.createElement("span");
  karasekStatus.textContent = "Aucun fichier Karasek-Siegrist chargé.";

  const copsoqStatus = document.createElement("span");
  copsoqStatus.textContent = "Aucun fichier COPSOQ chargé.";

  actions.append(karasekBtn, karasekStatus, copsoqBtn, copsoqStatus);

  const resultsHeading = document.createElement("h3");
  resultsHeading.textContent = "Comparaison des scores";

  const comparisonHost = document.createElement("div");

  const plotPanel = document.createElement("section");
  plotPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "rps-gollac-individual-sankey";
  plotArea.className = "plot-area";
  plotPanel.append(plotArea);

  let karasekResult = null;
  let copsoqResult = null;

  function refreshComparison() {
    const karasekScores = karasekResult ? computeKarasekAxisScores(karasekResult.ordered) : null;
    const copsoqScores = copsoqResult ? computeCopsoqAxisScores(copsoqResult.answers) : null;
    comparisonHost.innerHTML = "";
    comparisonHost.append(buildRpsGollacComparisonTable(karasekScores, copsoqScores));
    const correspondanceScores = computeRpsGollacCorrespondanceScores(
      karasekResult ? [karasekResult] : [],
      copsoqResult ? [copsoqResult] : [],
    );
    renderRpsGollacCorrespondanceSankey("rps-gollac-individual-sankey", correspondanceScores);
  }

  karasekBtn.addEventListener("click", () => karasekInput.click());
  copsoqBtn.addEventListener("click", () => copsoqInput.click());

  karasekInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    try {
      karasekResult = await readKarasekSavedFile(file);
      karasekStatus.textContent = `Karasek-Siegrist : ${karasekResult.fileName}`;
      refreshComparison();
    } catch (error) {
      alert(error.message || "Impossible de charger le fichier Karasek-Siegrist.");
    } finally {
      event.target.value = "";
    }
  });

  copsoqInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const data = await readSavedFile(file);
      if (resolveLang(data.lang) !== "fr") {
        throw new Error("Cette vue nécessite un résultat COPSOQ en version française.");
      }
      copsoqResult = data;
      copsoqStatus.textContent = `COPSOQ : ${copsoqResult.fileName}`;
      refreshComparison();
    } catch (error) {
      alert(error.message || "Impossible de charger le fichier COPSOQ.");
    } finally {
      event.target.value = "";
    }
  });

  contentRoot.append(
    title,
    subtitle,
    intro,
    actions,
    plotPanel,
    resultsHeading,
    comparisonHost,
    karasekInput,
    copsoqInput,
  );
  refreshComparison();
  scrollToPageTop();
}

function renderRpsGollacReferentielView() {
  if (!contentRoot) {
    return;
  }
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Rapprochement RPS";

  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Référentiel";

  const sankeyCard = document.createElement("article");
  sankeyCard.className = "content-card";
  const sankeyHeading = document.createElement("h3");
  sankeyHeading.textContent = "Correspondance (diagramme de flux Sankey)";
  const sankeyPanel = document.createElement("section");
  sankeyPanel.className = "plot-panel";
  const sankeyArea = document.createElement("div");
  sankeyArea.id = "rps-gollac-referentiel-sankey";
  sankeyArea.className = "plot-area";
  sankeyPanel.append(sankeyArea);
  sankeyCard.append(sankeyHeading, sankeyPanel);

  contentRoot.append(title, subtitle, sankeyCard);
  renderRpsGollacSankey("rps-gollac-referentiel-sankey");
  scrollToPageTop();
}

function computeAggregatedRpsGollacStats(files, computeScoresFn) {
  return computeRpsGollacAxisStatistics(files.map(computeScoresFn));
}

const rpsStatKeys = ["mean", "median", "min", "max"];
const rpsStatLabels = { mean: "Moyenne", median: "Médiane", min: "Minimum", max: "Maximum" };

function buildRpsGollacMultiStatsTable(karasekStats, copsoqStats) {
  const wrap = document.createElement("div");
  wrap.className = "results-table-wrap";
  const table = document.createElement("table");
  table.className = "results-table";
  table.style.width = "auto";
  const thead = document.createElement("thead");
  const headRow1 = document.createElement("tr");
  const axisHeader = document.createElement("th");
  axisHeader.textContent = "Axe Gollac / INRS";
  axisHeader.rowSpan = 2;
  headRow1.append(axisHeader);
  rpsStatKeys.forEach((statKey) => {
    const th = document.createElement("th");
    th.colSpan = 3;
    th.textContent = rpsStatLabels[statKey];
    th.style.textAlign = "center";
    headRow1.append(th);
  });
  const headRow2 = document.createElement("tr");
  rpsStatKeys.forEach(() => {
    ["Karasek-Siegrist", "COPSOQ (FR)", "Écart"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.whiteSpace = "nowrap";
      headRow2.append(th);
    });
  });
  thead.append(headRow1, headRow2);
  const tbody = document.createElement("tbody");
  rpsGollacAxes.forEach((axis) => {
    const row = document.createElement("tr");
    const axisCell = document.createElement("td");
    axisCell.textContent = axis;
    row.append(axisCell);
    rpsStatKeys.forEach((statKey) => {
      const karasekValue = karasekStats ? karasekStats[axis][statKey] : null;
      const copsoqValue = copsoqStats ? copsoqStats[axis][statKey] : null;
      const karasekCell = document.createElement("td");
      karasekCell.className = "check-cell";
      karasekCell.append(createRpsGollacScorePastille(karasekValue));
      const copsoqCell = document.createElement("td");
      copsoqCell.className = "check-cell";
      copsoqCell.append(createRpsGollacScorePastille(copsoqValue));
      const gapCell = document.createElement("td");
      gapCell.className = "check-cell";
      gapCell.textContent =
        Number.isFinite(karasekValue) && Number.isFinite(copsoqValue)
          ? String(Math.abs(karasekValue - copsoqValue))
          : "—";
      row.append(karasekCell, copsoqCell, gapCell);
    });
    tbody.append(row);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderRpsGollacMultiIndividualsView() {
  if (!contentRoot) {
    return;
  }
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Rapprochement RPS";

  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Rapprochement RPS de plusieurs individus";

  const intro = document.createElement("article");
  intro.className = "content-card";
  intro.innerHTML =
    "<p>Ajoutez un ou plusieurs fichiers .json Karasek-Siegrist et/ou COPSOQ Français. Vous pouvez ajouter des fichiers à plusieurs reprises : les statistiques (moyenne, médiane, minimum, maximum) sont recalculées sur l'ensemble des fichiers chargés.</p>";

  const actions = document.createElement("div");
  actions.className = "questionnaire-actions";

  const karasekInput = document.createElement("input");
  karasekInput.type = "file";
  karasekInput.accept = ".json,application/json";
  karasekInput.multiple = true;
  karasekInput.style.display = "none";

  const copsoqInput = document.createElement("input");
  copsoqInput.type = "file";
  copsoqInput.accept = ".json,application/json";
  copsoqInput.multiple = true;
  copsoqInput.style.display = "none";

  const karasekBtn = document.createElement("button");
  karasekBtn.type = "button";
  karasekBtn.className = "secondary-btn";
  karasekBtn.textContent = "Ajouter des fichiers Karasek-Siegrist (.json)";

  const copsoqBtn = document.createElement("button");
  copsoqBtn.type = "button";
  copsoqBtn.className = "secondary-btn";
  copsoqBtn.textContent = "Ajouter des fichiers COPSOQ Français (.json)";

  const karasekStatus = document.createElement("span");
  const copsoqStatus = document.createElement("span");

  actions.append(karasekBtn, karasekStatus, copsoqBtn, copsoqStatus);

  const resultsHeading = document.createElement("h3");
  resultsHeading.textContent = "Comparaison des statistiques";

  const comparisonHost = document.createElement("div");

  const plotPanel = document.createElement("section");
  plotPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "rps-gollac-multi-individus-sankey";
  plotArea.className = "plot-area";
  plotPanel.append(plotArea);

  const detailsHeading = document.createElement("h3");
  detailsHeading.textContent = "Détail des fichiers chargés";
  const detailsHost = document.createElement("div");

  function updateStatusLabels() {
    karasekStatus.textContent = rpsMultiKarasekFiles.length
      ? `${rpsMultiKarasekFiles.length} fichier(s) Karasek-Siegrist chargé(s).`
      : "Aucun fichier Karasek-Siegrist chargé.";
    copsoqStatus.textContent = rpsMultiCopsoqFiles.length
      ? `${rpsMultiCopsoqFiles.length} fichier(s) COPSOQ chargé(s).`
      : "Aucun fichier COPSOQ chargé.";
  }

  function refresh() {
    updateStatusLabels();
    const karasekStats = rpsMultiKarasekFiles.length
      ? computeAggregatedRpsGollacStats(rpsMultiKarasekFiles, (file) => computeKarasekAxisScores(file.ordered))
      : null;
    const copsoqStats = rpsMultiCopsoqFiles.length
      ? computeAggregatedRpsGollacStats(rpsMultiCopsoqFiles, (file) => computeCopsoqAxisScores(file.answers))
      : null;
    comparisonHost.innerHTML = "";
    comparisonHost.append(buildRpsGollacMultiStatsTable(karasekStats, copsoqStats));
    const correspondanceScores = computeRpsGollacCorrespondanceScores(rpsMultiKarasekFiles, rpsMultiCopsoqFiles);
    renderRpsGollacCorrespondanceSankey("rps-gollac-multi-individus-sankey", correspondanceScores);
    detailsHost.innerHTML = "";
    detailsHost.append(
      buildRpsGollacGroupsFileDetails([...rpsMultiKarasekBatches, ...rpsMultiCopsoqBatches], { showSwatch: false }),
    );
  }

  karasekBtn.addEventListener("click", () => karasekInput.click());
  copsoqBtn.addEventListener("click", () => copsoqInput.click());

  karasekInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const { loaded, errors } = await loadKarasekFiles(files);
    rpsMultiKarasekFiles = [...rpsMultiKarasekFiles, ...loaded];
    if (loaded.length) {
      // Files are always merged into the single Karasek-Siegrist batch, never split into new lots.
      const existing = rpsMultiKarasekBatches[0];
      const fileNames = [...(existing ? existing.fileNames : []), ...loaded.map((file) => file.fileName)];
      rpsMultiKarasekBatches = [
        { type: "karasek", label: "Fichiers", fileNames, color: paulTolMutedColors[0] },
      ];
    }
    if (errors.length) {
      alert(`Certains fichiers n'ont pas pu être chargés:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }
    refresh();
    event.target.value = "";
  });

  copsoqInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const loaded = [];
    const errors = [];
    for (const file of files) {
      try {
        const data = await readSavedFile(file);
        if (resolveLang(data.lang) !== "fr") {
          throw new Error(`${file.name} : cette vue nécessite un résultat COPSOQ en version française.`);
        }
        loaded.push(data);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Impossible de lire ${file.name}.`);
      }
    }
    rpsMultiCopsoqFiles = [...rpsMultiCopsoqFiles, ...loaded];
    if (loaded.length) {
      // Files are always merged into the single COPSOQ batch, never split into new lots.
      const existing = rpsMultiCopsoqBatches[0];
      const fileNames = [...(existing ? existing.fileNames : []), ...loaded.map((file) => file.fileName)];
      rpsMultiCopsoqBatches = [
        { type: "copsoq", label: "Fichiers", fileNames, color: paulTolMutedColors[1 % paulTolMutedColors.length] },
      ];
    }
    if (errors.length) {
      alert(`Certains fichiers n'ont pas pu être chargés:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }
    refresh();
    event.target.value = "";
  });

  contentRoot.append(
    title,
    subtitle,
    intro,
    actions,
    plotPanel,
    resultsHeading,
    comparisonHost,
    detailsHeading,
    detailsHost,
    karasekInput,
    copsoqInput,
  );
  refresh();
  scrollToPageTop();
}

function buildRpsGollacGroupsTable(entries, onSelectLot) {
  const wrap = document.createElement("div");
  wrap.className = "results-table-wrap";
  const table = document.createElement("table");
  table.className = "results-table";
  table.style.width = "auto";

  const lotsByType = { karasek: new Map(), copsoq: new Map() };
  entries.forEach((entry) => {
    const match = /Lot (\d+)/.exec(entry.label);
    if (!match) {
      return;
    }
    lotsByType[entry.type].set(Number(match[1]), entry);
  });
  const sortedLots = [...new Set([...lotsByType.karasek.keys(), ...lotsByType.copsoq.keys()])].sort((a, b) => a - b);
  const columnCount = 1 + rpsStatKeys.length * 3;

  const thead = document.createElement("thead");
  const headRow1 = document.createElement("tr");
  const groupHeader = document.createElement("th");
  groupHeader.textContent = "Groupe";
  groupHeader.rowSpan = 2;
  headRow1.append(groupHeader);
  rpsStatKeys.forEach((statKey) => {
    const th = document.createElement("th");
    th.colSpan = 3;
    th.textContent = rpsStatLabels[statKey];
    th.style.textAlign = "center";
    headRow1.append(th);
  });
  const headRow2 = document.createElement("tr");
  rpsStatKeys.forEach(() => {
    ["Karasek-Siegrist", "COPSOQ (FR)", "Écart"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.whiteSpace = "nowrap";
      headRow2.append(th);
    });
  });
  thead.append(headRow1, headRow2);

  const tbody = document.createElement("tbody");
  rpsGollacAxes.forEach((axis) => {
    const axisRow = document.createElement("tr");
    const axisCell = document.createElement("td");
    axisCell.colSpan = columnCount;
    axisCell.textContent = axis;
    axisCell.style.fontWeight = "700";
    axisCell.style.backgroundColor = "#eef5fa";
    axisRow.append(axisCell);
    tbody.append(axisRow);
    if (!sortedLots.length) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = columnCount;
      emptyCell.textContent = "Aucun groupe chargé.";
      emptyRow.append(emptyCell);
      tbody.append(emptyRow);
      return;
    }
    sortedLots.forEach((lotNumber) => {
      const karasekEntry = lotsByType.karasek.get(lotNumber);
      const copsoqEntry = lotsByType.copsoq.get(lotNumber);
      const row = document.createElement("tr");
      const groupCell = document.createElement("td");
      const lotColor = (karasekEntry || copsoqEntry).color;
      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "10px";
      swatch.style.height = "10px";
      swatch.style.borderRadius = "50%";
      swatch.style.marginRight = "4px";
      swatch.style.backgroundColor = lotColor;
      if (onSelectLot) {
        swatch.style.cursor = "pointer";
        swatch.title = `Afficher le diagramme Sankey du Lot ${lotNumber}`;
        swatch.addEventListener("click", () => onSelectLot(lotNumber, karasekEntry, copsoqEntry));
      }
      groupCell.append(swatch, document.createTextNode(`Lot ${lotNumber}`));
      row.append(groupCell);
      rpsStatKeys.forEach((statKey) => {
        const karasekValue = karasekEntry ? karasekEntry.stats[axis][statKey] : null;
        const copsoqValue = copsoqEntry ? copsoqEntry.stats[axis][statKey] : null;
        const karasekCell = document.createElement("td");
        karasekCell.className = "check-cell";
        karasekCell.append(createRpsGollacScorePastille(karasekValue));
        const copsoqCell = document.createElement("td");
        copsoqCell.className = "check-cell";
        copsoqCell.append(createRpsGollacScorePastille(copsoqValue));
        const gapCell = document.createElement("td");
        gapCell.className = "check-cell";
        gapCell.textContent =
          Number.isFinite(karasekValue) && Number.isFinite(copsoqValue)
            ? String(Math.abs(karasekValue - copsoqValue))
            : "—";
        row.append(karasekCell, copsoqCell, gapCell);
      });
      tbody.append(row);
    });
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

// Sankey d'un seul lot de "Rapprochement RPS de groupes" : mêmes nœuds/couleurs de score que le
// Sankey de correspondance, mais les liens reprennent la couleur du repère du lot (au lieu
// d'être colorés par score) pour rester identifiables comme appartenant à ce lot précis.
function renderRpsGollacGroupSankey(plotId, karasekEntry, copsoqEntry, lotColor) {
  const container = document.getElementById(plotId);
  if (!container || typeof Plotly === "undefined") {
    return;
  }
  const scores = computeRpsGollacCorrespondanceScores(
    karasekEntry ? karasekEntry.files : [],
    copsoqEntry ? copsoqEntry.files : [],
  );
  const figure = buildRpsGollacCorrespondanceSankeyFigure(scores, hexToRgba(lotColor, 0.55));
  const height = getRpsGollacSankeyHeight();
  const layout = {
    autosize: true,
    height,
    font: { size: 12 },
    margin: { l: 10, r: 10, t: RPS_GOLLAC_SANKEY_MARGIN, b: RPS_GOLLAC_SANKEY_MARGIN },
  };
  container.style.height = `${height}px`;
  ensureCopsoqFullscreenBehavior(container);
  Plotly.newPlot(container, figure.data, layout, getRpsGollacSimplePlotConfig(container)).then(() =>
    ensureRpsGollacSankeyHoverHighlight(container),
  );
}

function buildRpsGollacGroupsListColumn(entries, type, formatEntry, { showSwatch = true } = {}) {
  const column = document.createElement("div");
  const heading = document.createElement("h4");
  heading.textContent = type === "karasek" ? "Karasek-Siegrist" : "COPSOQ (FR)";
  const list = document.createElement("ul");
  list.className = "rps-groups-list";
  const filtered = entries.filter((entry) => entry.type === type);
  if (!filtered.length) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Aucun lot chargé.";
    list.append(emptyItem);
  } else {
    filtered.forEach((entry) => {
      const item = document.createElement("li");
      if (showSwatch) {
        const swatch = document.createElement("span");
        swatch.style.display = "inline-block";
        swatch.style.width = "10px";
        swatch.style.height = "10px";
        swatch.style.borderRadius = "50%";
        swatch.style.marginRight = "6px";
        swatch.style.backgroundColor = entry.color;
        item.append(swatch);
      }
      item.append(document.createTextNode(formatEntry(entry)));
      list.append(item);
    });
  }
  column.append(heading, list);
  return column;
}

function formatRpsGollacFileCount(count) {
  return `${count} fichier${count > 1 ? "s" : ""}`;
}

function buildRpsGollacGroupsSummary(entries) {
  const wrap = document.createElement("div");
  wrap.className = "results-layout";
  wrap.style.gridTemplateColumns = "1fr 1fr";
  const formatEntry = (entry) => `${entry.label} : ${formatRpsGollacFileCount(entry.fileNames.length)}`;
  wrap.append(
    buildRpsGollacGroupsListColumn(entries, "karasek", formatEntry),
    buildRpsGollacGroupsListColumn(entries, "copsoq", formatEntry),
  );
  return wrap;
}

function buildRpsGollacGroupsFileDetails(entries, { showSwatch = true } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "results-layout";
  wrap.style.gridTemplateColumns = "1fr 1fr";
  const formatEntry = (entry) => `${entry.label} : ${entry.fileNames.join(", ")}`;
  wrap.append(
    buildRpsGollacGroupsListColumn(entries, "karasek", formatEntry, { showSwatch }),
    buildRpsGollacGroupsListColumn(entries, "copsoq", formatEntry, { showSwatch }),
  );
  return wrap;
}

function renderRpsGollacGroupsView() {
  if (!contentRoot) {
    return;
  }
  contentRoot.hidden = false;
  contentRoot.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "content-title";
  title.textContent = "Rapprochement RPS";

  const subtitle = document.createElement("p");
  subtitle.className = "content-subtitle";
  subtitle.textContent = "Rapprochement RPS de groupes";

  const intro = document.createElement("article");
  intro.className = "content-card";
  intro.innerHTML =
    "<p>Chaque ajout de fichiers Karasek-Siegrist ou COPSOQ Français crée un nouveau groupe (un « lot »), avec ses propres statistiques (moyenne, médiane, minimum, maximum). Cliquez sur le repère coloré d'un lot dans le tableau « Comparaison des groupes » pour afficher son diagramme Sankey (liens colorés selon le lot, étiquettes colorées selon le score).</p>";

  const actions = document.createElement("div");
  actions.className = "questionnaire-actions";

  const karasekInput = document.createElement("input");
  karasekInput.type = "file";
  karasekInput.accept = ".json,application/json";
  karasekInput.multiple = true;
  karasekInput.style.display = "none";

  const copsoqInput = document.createElement("input");
  copsoqInput.type = "file";
  copsoqInput.accept = ".json,application/json";
  copsoqInput.multiple = true;
  copsoqInput.style.display = "none";

  const karasekBtn = document.createElement("button");
  karasekBtn.type = "button";
  karasekBtn.className = "secondary-btn";
  karasekBtn.textContent = "Ajouter un groupe Karasek-Siegrist (plusieurs fichiers)";

  const copsoqBtn = document.createElement("button");
  copsoqBtn.type = "button";
  copsoqBtn.className = "secondary-btn";
  copsoqBtn.textContent = "Ajouter un groupe COPSOQ Français (plusieurs fichiers)";

  actions.append(karasekBtn, copsoqBtn);

  const summaryHeading = document.createElement("h3");
  summaryHeading.textContent = "Fichiers chargés par lot";
  const summaryHost = document.createElement("div");

  const resultsHeading = document.createElement("h3");
  resultsHeading.textContent = "Comparaison des groupes";

  const comparisonHost = document.createElement("div");

  const plotPanel = document.createElement("section");
  plotPanel.className = "plot-panel";
  const plotArea = document.createElement("div");
  plotArea.id = "rps-gollac-groups-sankey";
  plotArea.className = "plot-area";
  const plotPlaceholder = document.createElement("p");
  plotPlaceholder.textContent =
    "Cliquez sur le repère coloré d'un lot dans le tableau « Comparaison des groupes » ci-dessous pour afficher son diagramme Sankey.";
  plotArea.append(plotPlaceholder);
  plotPanel.append(plotArea);

  const detailsHeading = document.createElement("h3");
  detailsHeading.textContent = "Détail des fichiers par lot";
  const detailsHost = document.createElement("div");

  function showLotSankey(lotNumber, karasekEntry, copsoqEntry) {
    const lotColor = (karasekEntry || copsoqEntry).color;
    renderRpsGollacGroupSankey("rps-gollac-groups-sankey", karasekEntry, copsoqEntry, lotColor);
  }

  function refresh() {
    summaryHost.innerHTML = "";
    summaryHost.append(buildRpsGollacGroupsSummary(rpsGroupEntries));
    comparisonHost.innerHTML = "";
    comparisonHost.append(buildRpsGollacGroupsTable(rpsGroupEntries, showLotSankey));
    detailsHost.innerHTML = "";
    detailsHost.append(buildRpsGollacGroupsFileDetails(rpsGroupEntries));
  }

  karasekBtn.addEventListener("click", () => karasekInput.click());
  copsoqBtn.addEventListener("click", () => copsoqInput.click());

  karasekInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const { loaded, errors } = await loadKarasekFiles(files);
    if (loaded.length) {
      const lotNumber = rpsGroupEntries.filter((entry) => entry.type === "karasek").length + 1;
      const label = `Lot ${lotNumber}`;
      const stats = computeAggregatedRpsGollacStats(loaded, (file) => computeKarasekAxisScores(file.ordered));
      const color = paulTolMutedColors[(lotNumber - 1) % paulTolMutedColors.length];
      const fileNames = loaded.map((file) => file.fileName);
      rpsGroupEntries = [...rpsGroupEntries, { type: "karasek", label, fileNames, files: loaded, stats, color }];
    }
    if (errors.length) {
      alert(`Certains fichiers n'ont pas pu être chargés:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }
    refresh();
    event.target.value = "";
  });

  copsoqInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const loaded = [];
    const errors = [];
    for (const file of files) {
      try {
        const data = await readSavedFile(file);
        if (resolveLang(data.lang) !== "fr") {
          throw new Error(`${file.name} : cette vue nécessite un résultat COPSOQ en version française.`);
        }
        loaded.push(data);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Impossible de lire ${file.name}.`);
      }
    }
    if (loaded.length) {
      const lotNumber = rpsGroupEntries.filter((entry) => entry.type === "copsoq").length + 1;
      const label = `Lot ${lotNumber}`;
      const stats = computeAggregatedRpsGollacStats(loaded, (file) => computeCopsoqAxisScores(file.answers));
      const color = paulTolMutedColors[(lotNumber - 1) % paulTolMutedColors.length];
      const fileNames = loaded.map((file) => file.fileName);
      rpsGroupEntries = [...rpsGroupEntries, { type: "copsoq", label, fileNames, files: loaded, stats, color }];
    }
    if (errors.length) {
      alert(`Certains fichiers n'ont pas pu être chargés:\n- ${errors.slice(0, 5).join("\n- ")}`);
    }
    refresh();
    event.target.value = "";
  });

  contentRoot.append(
    title,
    subtitle,
    intro,
    actions,
    summaryHeading,
    summaryHost,
    plotPanel,
    resultsHeading,
    comparisonHost,
    detailsHeading,
    detailsHost,
    karasekInput,
    copsoqInput,
  );
  refresh();
  scrollToPageTop();
}

menuData.forEach((entry) => {
  menuRoot.append(createMenuItem(entry));
});

// Keep navigation in hamburger mode by default on all screen sizes.
closeHamburgerMenu();

if (menuHamburgerBtn) {
  menuHamburgerBtn.addEventListener("click", () => {
    toggleHamburgerMenu();
  });
}

document.addEventListener("click", (event) => {
  if (!menuRoot || !menuHamburgerBtn) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  const clickInsideMenu = menuRoot.contains(target);
  const clickOnHamburger = menuHamburgerBtn.contains(target);

  if (!clickInsideMenu && !clickOnHamburger) {
    closeHamburgerMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHamburgerMenu();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (installBtn) {
    installBtn.hidden = false;
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installBtn) {
    installBtn.hidden = true;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.error("Échec de l'enregistrement du service worker:", error);
    });
  });
}

const questionsFR = [
  { text: "Prenez-vous du retard dans votre travail ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Contraintes quantitatives", echelle: "Charge de travail" },
  { text: "Disposez-vous d'un temps suffisant pour accomplir vos tâches professionnelles ?", options: ["Presque jamais/Jamais", "Rarement", "Parfois", "Souvent", "Toujours"], domaine: "Contraintes quantitatives", echelle: "Charge de travail" },
  { text: "Travaillez-vous à une cadence élevée tout au long de la journée ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Contraintes quantitatives", echelle: "Rythme de travail" },
  { text: "Est-il nécessaire de maintenir un rythme soutenu au travail ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Contraintes quantitatives", echelle: "Rythme de travail" },
  { text: "Durant votre travail, devez-vous avoir l'œil sur beaucoup de choses ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Contraintes quantitatives", echelle: "Exigences cognitives" },
  { text: "Votre travail exige-t-il que vous vous souveniez de beaucoup de choses ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Contraintes quantitatives", echelle: "Exigences cognitives" },
  { text: "Au travail, êtes-vous informé(e) suffisamment à l'avance au sujet par exemple de décisions importantes, de changements ou de projets futurs ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Prévisibilité" },
  { text: "Recevez-vous toutes les informations dont vous avez besoin pour bien faire votre travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Prévisibilité" },
  { text: "Votre travail est-il reconnu et apprécié par le management ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Reconnaissance" },
  { text: "Êtes-vous traité(e) équitablement au travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Reconnaissance" },
  { text: "Les conflits sont-ils résolus de manière équitable ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Équité" },
  { text: "Le travail est-il réparti équitablement ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Équité" },
  { text: "Votre travail a-t-il des objectifs clairs ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Clarté des rôles" },
  { text: "Savez-vous exactement ce que l'on attend de vous au travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Clarté des rôles" },
  { text: "Au travail, êtes-vous soumis(e) à des demandes contradictoires ?", options: ["Dans une très grande mesure", "Dans une grande mesure", "Plus ou moins", "Dans une faible mesure", "Dans une très faible mesure"], domaine: "Organisation et leadership", echelle: "Conflit de rôles" },
  { text: "Devez-vous parfois faire des choses qui auraient dû être faites autrement ?", options: ["Dans une très grande mesure", "Dans une grande mesure", "Plus ou moins", "Dans une faible mesure", "Dans une très faible mesure"], domaine: "Organisation et leadership", echelle: "Conflit de rôles" },
  { text: "Dans quelle mesure diriez-vous que votre supérieur(e) hiérarchique accorde une grande priorité à la satisfaction au travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Qualité de leadership du supérieur hiérarchique" },
  { text: "Dans quelle mesure diriez-vous que votre supérieur(e) hiérarchique est compétent(e) dans la planification du travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Qualité de leadership du supérieur hiérarchique" },
  { text: "À quelle fréquence votre supérieur(e) hiérarchique est-il(elle) disposé(e) à vous écouter au sujet de vos problèmes au travail ?", options: ["Presque jamais/Jamais", "Rarement", "Parfois", "Souvent", "Toujours"], domaine: "Organisation et leadership", echelle: "Soutien social de la part du supérieur hiérarchique" },
  { text: "À quelle fréquence recevez-vous de l'aide et du soutien de votre supérieur(e) hiérarchique ?", options: ["Presque jamais/Jamais", "Rarement", "Parfois", "Souvent", "Toujours"], domaine: "Organisation et leadership", echelle: "Soutien social de la part du supérieur hiérarchique" },
  { text: "Le management fait-il confiance aux salariés quant à leur capacité à bien faire leur travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Confiance entre les salariés et le management" },
  { text: "Pouvez-vous faire confiance aux informations venant du management ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Organisation et leadership", echelle: "Confiance entre les salariés et le management" },
  { text: "Y a-t-il une bonne coopération entre les collègues au travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Relations horizontales", echelle: "Confiance entre les collègues" },
  { text: "Dans l'ensemble, les salariés se font-ils confiance entre eux ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Relations horizontales", echelle: "Confiance entre les collègues" },
  { text: "À quelle fréquence recevez-vous de l'aide et du soutien de vos collègues ?", options: ["Presque jamais/Jamais", "Rarement", "Parfois", "Souvent", "Toujours"], domaine: "Relations horizontales", echelle: "Soutien social de la part des collègues" },
  { text: "À quelle fréquence vos collègues se montrent-ils à l'écoute de vos problèmes au travail ?", options: ["Presque jamais/Jamais", "Rarement", "Parfois", "Souvent", "Toujours"], domaine: "Relations horizontales", echelle: "Soutien social de la part des collègues" },
  { text: "Avez-vous une grande marge de manœuvre dans votre travail ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Autonomie", echelle: "Marge de manœuvre" },
  { text: "Pouvez-vous intervenir sur la quantité de travail qui vous est attribuée ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Autonomie", echelle: "Marge de manœuvre" },
  { text: "Votre travail nécessite-t-il que vous preniez des initiatives ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Autonomie", echelle: "Possibilités d'épanouissement" },
  { text: "Votre travail vous donne-il la possibilité d'apprendre des choses nouvelles ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Autonomie", echelle: "Possibilités d'épanouissement" },
  { text: "En général, diriez-vous que votre santé est :", options: ["Mauvaise", "Plutôt mauvaise", "Assez bonne", "Bonne", "Excellente/Très bonne"], domaine: "Santé et Bien-être", echelle: "Santé auto-évaluée" },
  { text: "À quelle fréquence avez-vous été irritable ?", options: ["Tout le temps", "Très souvent", "Parfois", "Très peu souvent", "Jamais"], domaine: "Santé et Bien-être", echelle: "Stress" },
  { text: "À quelle fréquence avez-vous été stressé(e) ?", options: ["Tout le temps", "Très souvent", "Parfois", "Très peu souvent", "Jamais"], domaine: "Santé et Bien-être", echelle: "Stress" },
  { text: "À quelle fréquence vous êtes-vous senti(e) à bout de force ?", options: ["Tout le temps", "Très souvent", "Parfois", "Très peu souvent", "Jamais"], domaine: "Santé et Bien-être", echelle: "Épuisement" },
  { text: "À quelle fréquence avez-vous été émotionnellement épuisé(e) ?", options: ["Tout le temps", "Très souvent", "Parfois", "Très peu souvent", "Jamais"], domaine: "Santé et Bien-être", echelle: "Épuisement" },
  { text: "Votre travail vous place-t-il dans des situations déstabilisantes sur le plan émotionnel ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Santé et Bien-être", echelle: "Exigences émotionnelles" },
  { text: "Votre travail est-il éprouvant sur le plan émotionnel ?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Presque jamais/Jamais"], domaine: "Santé et Bien-être", echelle: "Exigences émotionnelles" },
  { text: "Sentez-vous que votre travail vous prend tellement d'énergie que cela a un impact négatif sur votre vie privée ?", options: ["Oui, certainement", "Oui, jusqu'à un certain point", "Oui, mais juste un peu", "Non, pas du tout"], domaine: "Santé et Bien-être", echelle: "Conflit famille/travail" },
  { text: "Sentez-vous que votre travail vous prend tellement de temps que cela a un impact négatif sur votre vie privée ?", options: ["Oui, certainement", "Oui, jusqu'à un certain point", "Oui, mais juste un peu", "Non, pas du tout"], domaine: "Santé et Bien-être", echelle: "Conflit famille/travail" },
  { text: "Êtes-vous inquiet(ète) à l'idée de perdre votre emploi ?", options: ["Dans une très grande mesure", "Dans une grande mesure", "Plus ou moins", "Dans une faible mesure", "Dans une très faible mesure"], domaine: "Santé et Bien-être", echelle: "Insécurité professionnelle" },
  { text: "Craignez-vous d'être muté(e) à un autre poste de travail contre votre volonté ?", options: ["Dans une très grande mesure", "Dans une grande mesure", "Plus ou moins", "Dans une faible mesure", "Dans une très faible mesure"], domaine: "Santé et Bien-être", echelle: "Insécurité professionnelle" },
  { text: "Votre travail a-t-il du sens pour vous ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Vécu professionnel", echelle: "Sens du travail" },
  { text: "Avez-vous le sentiment que le travail que vous faites est important ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Vécu professionnel", echelle: "Sens du travail" },
  { text: "Recommanderiez-vous à un ami proche de postuler sur un emploi dans votre entreprise ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Vécu professionnel", echelle: "Engagement dans l'entreprise" },
  { text: "Pensez-vous que votre entreprise est d'une grande importance pour vous ?", options: ["Dans une très faible mesure", "Dans une faible mesure", "Plus ou moins", "Dans une grande mesure", "Dans une très grande mesure"], domaine: "Vécu professionnel", echelle: "Engagement dans l'entreprise" },
  { text: "À quel point êtes-vous satisfait(e) de votre travail dans son ensemble, en prenant en considération tous les aspects ?", options: ["Très insatisfait(e)", "Insatisfait(e)", "Satisfait(e)", "Très satisfait(e)"], domaine: "Vécu professionnel", echelle: "Satisfaction au travail" }
];
const questionsEN = [
  { text: "Is your workload unevenly distributed so it piles up?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Quantitative Demands"},
  { text: "How often do you not have time to complete all your work tasks?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Quantitative Demands"},
  { text: "Do you get behind with your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Quantitative Demands"},
  { text: "Do you have enough time for your work tasks?", options: ["Always","Often","Sometimes","Seldom","Never/hardly ever"], domaine:"Demands at work", echelle:"Quantitative Demands"},
  { text: "Do you have to work very fast?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Work Pace"},
  { text: "Do you work at a high pace throughout the day?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Demands at work", echelle:"Work Pace"},
  { text: "Is it necessary to keep working at a high pace?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Demands at work", echelle:"Work Pace"},
  { text: "Do you have to keep your eyes on lots of things while you work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Cognitive Demands"},
  { text: "Does your work require that you remember a lot of things?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Cognitive Demands"},
  { text: "Does your work demand that you are good at coming up with new ideas?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Cognitive Demands"},
  { text: "Does your work require you to make difficult decisions?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Cognitive Demands"},
  { text: "Does your work put you in emotionally disturbing situations?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Emotional Demands"},
  { text: "Do you have to deal with other people's personal problems as part of your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Emotional Demands"},
  { text: "Is your work emotionally demanding?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Demands at work", echelle:"Emotional Demands"},
  { text: "Are you required to treat everyone equally, even if you do not feel like it?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Demands for Hiding Emotions"},
  { text: "Does your work require that you hide your feelings?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Demands at work", echelle:"Demands for Hiding Emotions"},
  { text: "Are you required to be kind and open towards everyone – regardless of how they behave towards you?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Demands at work", echelle:"Demands for Hiding Emotions"},
  { text: "Does your work require that you do not state your opinion?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Demands at work", echelle:"Demands for Hiding Emotions"},
  { text: "Do you have a large degree of influence on the decisions concerning your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Do you have a say in choosing who you work with?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Can you influence the amount of work assigned to you?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Do you have any influence on what you do at work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Can you influence how quickly you work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Do you have any influence on HOW you do your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Influence at Work"},
  { text: "Do you have the possibility of learning new things through your work?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work Organization and Job Contents", echelle:"Possibilities for Development (Skill discretion)"},
  { text: "Can you use your skills or expertise in your work?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work Organization and Job Contents", echelle:"Possibilities for Development (Skill discretion)"},
  { text: "Does your work give you the opportunity to develop your skills?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work Organization and Job Contents", echelle:"Possibilities for Development (Skill discretion)"},
  { text: "Is your work varied?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Variation of Work"},
  { text: "Do you have to do the same thing over and over again?", options: ["Always","Often","Sometimes","Seldom","Never/hardly ever"], domaine:"Work Organization and Job Contents", echelle:"Variation of Work"},
  { text: "Can you decide when to take a break?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Control over Working Time"},
  { text: "Can you take holidays more or less when you wish?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Control over Working Time"},
  { text: "Can you leave your work to have a chat with a colleague?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Control over Working Time"},
  { text: "If you have some private business is it possible for you to leave your place of work for half an hour without special permission?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work Organization and Job Contents", echelle:"Control over Working Time"},
  { text: "Do you have to do overtime?", options: ["Always","Often","Sometimes","Seldom","Never/hardly ever"], domaine:"Work Organization and Job Contents", echelle:"Control over Working Time"},
  { text: "Is your work meaningful?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work Organization and Job Contents", echelle:"Meaning of Work"},
  { text: "Do you feel that the work you do is important?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work Organization and Job Contents", echelle:"Meaning of Work"},
  { text: "At your place of work. are you informed well in advance concerning, for example important decisions. changes or plans for the future?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Predictability"},
  { text: "Do you receive all the information you need to do your work well?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Predictability"},
  { text: "Does your work have clear objectives?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Role Clarity"},
  { text: "Do you know exactly which areas are your responsibility?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Role Clarity"},
  { text: "Do you know exactly what is expected of you at work?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Role Clarity"},
  { text: "Are contradictory demands placed on you at work?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Role Conflicts"},
  { text: "Do you sometimes have to do things which ought to have been done in a different way?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Role Conflicts"},
  { text: "Do you sometimes have to do things which seem to be unnecessary?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Illegitimate Tasks"},
  { text: "To what extent would you say that your immediate superior makes sure that the members of staff have good development opportunities?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Quality of Leadership"},
  { text: "To what extent would you say that your immediate superior gives high priority to job satisfaction?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Quality of Leadership"},
  { text: "To what extent would you say that your immediate superior is good at work planning?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Quality of Leadership"},
  { text: "To what extent would you say that your immediate superior is good at solving conflicts?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Interpersonal Relations and Leadership", echelle:"Quality of Leadership"},
  { text: "How often is your immediate superior willing to listen to your problems at work. if needed?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Supervisor"},
  { text: "How often do you get help and support from your immediate superior. if needed?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Supervisor"},
  { text: "How often does your immediate superior talk with you about how well you carry out your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Supervisor"},
  { text: "How often do you get help and support from your colleagues. if needed?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Colleagues"},
  { text: "How often are your colleagues willing to listen to your problems at work. if needed?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Colleagues"},
  { text: "How often do your colleagues talk with you about how well you carry out your work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Social Support from Colleagues"},
  { text: "Is there a good atmosphere between you and your colleagues?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Sense of Community at Work"},
  { text: "Do you feel part of a community at your place of work?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Interpersonal Relations and Leadership", echelle:"Sense of Community at Work"},
  { text: "Would you recommend other people to apply for a position at your workplace?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Commitment to the Workplace"},
  { text: "How often do you consider looking for work elsewhere?", options: ["Always","Often","Sometimes","Seldom","Never/hardly ever"], domaine:"Work–Individual Interface", echelle:"Commitment to the Workplace"},
  { text: "Do you enjoy telling others about your place of work?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Commitment to the Workplace"},
  { text: "Do you feel that your place of work is of great importance to you?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Commitment to the Workplace"},
  { text: "At my work. I feel bursting with energy", options: ["Never","Seldom","Sometimes","Often","Always"], domaine:"Work–Individual Interface", echelle:"Work Engagement"},
  { text: "I am enthusiastic about my job", options: ["Never","Seldom","Sometimes","Often","Always"], domaine:"Work–Individual Interface", echelle:"Work Engagement"},
  { text: "I am immersed in my work", options: ["Never","Seldom","Sometimes","Often","Always"], domaine:"Work–Individual Interface", echelle:"Work Engagement"},
  { text: "Are you worried about becoming unemployed?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Job Insecurity"},
  { text: "Are you worried about it being difficult for you to find another job if you became unemployed?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Job Insecurity"},
  { text: "Are you worried about new technology making you redundant?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Job Insecurity"},
  { text: "Are you worried about being transferred to another job against your will?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Insecurity over Working Conditions"},
  { text: "Are you worried about the timetable being changed (shift. weekdays. time to enter and leave …) against your will?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Insecurity over Working Conditions"},
  { text: "Are you worried about a decrease in your salary (reduction. variable pay being introduced …)?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Insecurity over Working Conditions"},
  { text: "Are you worried about your working tasks being changed against your will?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Insecurity over Working Conditions"},
  { text: "Are there good prospects in your job?", options: ["To a very large extent","To a large extent","Somewhat","To a small extent","To a very small extent"], domaine:"Work–Individual Interface", echelle:"Insecurity over Working Conditions"},
  { text: "Regarding your work in general. How pleased are you with your work prospects?", options: ["Very unsatisfied","Unsatisfied","Neither/nor","Satisfied","Very satisfied"], domaine:"Work–Individual Interface", echelle:"Job Satisfaction"},
  { text: "Regarding your work in general. How pleased are you with your job as a whole. everything taken into consideration?", options: ["Very unsatisfied","Unsatisfied","Neither/nor","Satisfied","Very satisfied"], domaine:"Work–Individual Interface", echelle:"Job Satisfaction"},
  { text: "Regarding your work in general. How pleased are you with your salary?", options: ["Very unsatisfied","Unsatisfied","Neither/nor","Satisfied","Very satisfied"], domaine:"Work–Individual Interface", echelle:"Job Satisfaction"},
  { text: "Regarding your work in general. How pleased are you with the way your abilities are used?", options: ["Very unsatisfied","Unsatisfied","Neither/nor","Satisfied","Very satisfied"], domaine:"Work–Individual Interface", echelle:"Job Satisfaction"},
  { text: "Regarding your work in general. How pleased are you with the physical working conditions?", options: ["Very unsatisfied","Unsatisfied","Neither/nor","Satisfied","Very satisfied"], domaine:"Work–Individual Interface", echelle:"Job Satisfaction"},
  { text: "Do you feel that your work drains so much of your energy that it has a negative effect on your private life?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Work Life Conflict"},
  { text: "Do you feel that your work takes so much of your time that it has a negative effect on your private life?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Work Life Conflict"},
  { text: "Are there times when you need to be at work and at home at the same time?", options: ["Never/hardly ever","Seldom","Sometimes","Often","Always"], domaine:"Work–Individual Interface", echelle:"Work Life Conflict"},
  { text: "The demands of my work interfere with my private and family life?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Work Life Conflict"},
  { text: "Due to work-related duties, I have to make changes to my plans for private and family activities.", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Work–Individual Interface", echelle:"Work Life Conflict"},
  { text: "Do the employees withhold information from each other?", options: ["To a very large extent","To a large extent","Somewhat","To a small extent","To a very small extent"], domaine:"Social Capital", echelle:"Horizontal Trust"},
  { text: "Do the employees withhold information from the management?", options: ["To a very large extent","To a large extent","Somewhat","To a small extent","To a very small extent"], domaine:"Social Capital", echelle:"Horizontal Trust"},
  { text: "Do the employees in general trust each other?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Horizontal Trust"},
  { text: "Does the management trust the employees to do their work well?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Vertical Trust"},
  { text: "Can the employees trust the information that comes from the management?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Vertical Trust"},
  { text: "Are the employees able to express their views and feelings?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Vertical Trust"},
  { text: "Does the management withhold important information from the employees?", options: ["To a very large extent","To a large extent","Somewhat","To a small extent","To a very small extent"], domaine:"Social Capital", echelle:"Vertical Trust"},
  { text: "Are conflicts resolved in a fair way?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Organizational Justice"},
  { text: "Is the work distributed fairly?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Organizational Justice"},
  { text: "Are employees appreciated when they have done a good job?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Organizational Justice"},
  { text: "Are all suggestions from employees treated seriously by the management?", options: ["To a very small extent","To a small extent","Somewhat","To a large extent","To a very large extent"], domaine:"Social Capital", echelle:"Organizational Justice"},
];
const i18n = {
  fr: {
    title: "Questionnaire COPSOQ",
    intro1: "Répondre à chaque question en sélectionnant la réponse qui correspond le mieux à votre situation.",
    intro2: "Il n'y a pas de bonnes ou de mauvaises réponses : répondre de manière honnête et spontanée.",
    resultsTitle: "Résultats du Questionnaire COPSOQ",
    resultsDesc: "Voici un aperçu graphique de votre profil ainsi que les réponses détaillées par domaine et échelle :",
    saveBtn: "Sauvegarder",
    resetBtn: "Réinitialiser le questionnaire",
    randomBtn: "Remplissage aléatoire",
    submitBtn: "Soumettre le questionnaire",
    saveResultsBtn: "Sauvegarder dans un fichier",
    answerPrefix: "Réponse :",
    alertCompleteBeforeSave: "Répondre à toutes les questions avant de sauvegarder le formulaire.",
    alertFormIncomplete: "Le formulaire est incomplet.",
    fileNameBase: "questionnaire-copsoq-sauvegarde",
    errInvalidFileData: (fileName) => `Le fichier ${fileName} ne contient pas de données de formulaire valides.`,
    errWrongAnswerCount: (fileName, got, expected) => `Le fichier ${fileName} contient ${got} réponses alors que le questionnaire en attend ${expected}.`,
    errDuplicateAnswers: (fileName) => `Le fichier ${fileName} contient des réponses dupliquées pour une même question.`,
    errMissingAnswers: (fileName) => `Le fichier ${fileName} ne contient pas toutes les réponses attendues pour ce questionnaire.`,
    errInvalidAnswers: (fileName) => `Le fichier ${fileName} contient une ou plusieurs réponses invalides.`,
    errReadFile: (fileName) => `Impossible de lire le fichier ${fileName}.`,
    errMixedLanguages: "Impossible de mélanger des sauvegardes françaises et anglaises lors d'un chargement multiple. (Cannot mix French and English save files in a multiple-file load.)",
    alertLoadSingleFail: "Impossible de charger la sauvegarde.",
    alertLoadSingleSuccessCompact: (langCode) => `Sauvegarde chargée avec succès (langue détectée : ${langCode}).`,
    alertLoadMultipleSuccessCompact: (loadedCount, langCode) => `Chargement réussi de ${loadedCount} sauvegarde(s) (langue détectée : ${langCode}).`,
    errNoValidSaves: "Aucune sauvegarde valide n'a pu être chargée.",
    fileFallback: (n) => `Sauvegarde ${n}`,
    alertLoadMultipleFail: "Impossible de charger les sauvegardes.",
    individualsResultsTitle: "Résultats multi-individuels",
    individualsResultsDesc: "Statistiques de l'ensemble et une trace polaire par fichier.",
    groupsResultsTitle: "Résultats groupes",
    groupsResultsDesc: "Une trace par lot et un tableau comparatif pour tous les lots importés.",
    allIndividualsTitle: "Tous les individus",
    groupStatisticsTitle: "Statistiques comparées par lot",
    filesLabel: "Fichiers",
    loadedFileLabel: "Fichier chargé",
    fileCount: (count) => `Nombre de fichiers : ${count}`,
    batchLabel: (index) => `Lot ${index}`,
    resetImports: "Réinitialiser les imports",
    fileHoverLabel: "Fichier",
    batchHoverLabel: "Lot",
    thScale: "Échelle",
    thBatch: "Lot",
    thMean: "Moyenne",
    thMedian: "Médiane",
    thMin: "Minimum",
    thMax: "Maximum",
    alertCompleteBeforeSubmit: "Répondre à toutes les questions avant de soumettre."
  },
  en: {
    title: "COPSOQ Questionnaire",
    intro1: "Please answer each question by selecting the response that best fits your situation.",
    intro2: "There are no right or wrong answers. Please answer honestly and spontaneously.",
    resultsTitle: "COPSOQ Questionnaire Results",
    resultsDesc: "Here is a graphical overview of your profile along with detailed answers by domain and scale:",
    saveBtn: "Save",
    resetBtn: "Reset the questionnaire",
    randomBtn: "Random Fill",
    submitBtn: "Submit the questionnaire",
    saveResultsBtn: "Save to file",
    answerPrefix: "Answer:",
    alertCompleteBeforeSave: "Please answer all questions before saving the form.",
    alertFormIncomplete: "The form is incomplete.",
    fileNameBase: "copsoq-questionnaire-save",
    errInvalidFileData: (fileName) => `File ${fileName} does not contain valid questionnaire data.`,
    errWrongAnswerCount: (fileName, got, expected) => `File ${fileName} contains ${got} answers while ${expected} are expected.`,
    errDuplicateAnswers: (fileName) => `File ${fileName} contains duplicate answers for the same question.`,
    errMissingAnswers: (fileName) => `File ${fileName} is missing expected answers for this questionnaire.`,
    errInvalidAnswers: (fileName) => `File ${fileName} contains one or more invalid answers.`,
    errReadFile: (fileName) => `Unable to read file ${fileName}.`,
    errMixedLanguages: "Cannot mix French and English save files in a multiple-file load.(Impossible de mélanger des sauvegardes françaises et anglaises lors d'un chargement multiple.)",
    alertLoadSingleFail: "Unable to load the save file.",
    alertLoadSingleSuccessCompact: (langCode) => `Save loaded successfully (detected language: ${langCode}).`,
    alertLoadMultipleSuccessCompact: (loadedCount, langCode) => `Successfully loaded ${loadedCount} save file(s) (detected language: ${langCode}).`,
    errNoValidSaves: "No valid save file could be loaded.",
    fileFallback: (n) => `Save ${n}`,
    alertLoadMultipleFail: "Unable to load save files.",
    individualsResultsTitle: "Multiple individual results",
    individualsResultsDesc: "Overall statistics and one polar trace per file.",
    groupsResultsTitle: "Group results",
    groupsResultsDesc: "One trace per file set and one comparative table for all imported sets.",
    allIndividualsTitle: "All individuals",
    groupStatisticsTitle: "Statistics by file set",
    filesLabel: "Files",
    loadedFileLabel: "Loaded file",
    fileCount: (count) => `Number of files: ${count}`,
    batchLabel: (index) => `Batch ${index}`,
    resetImports: "Reset imports",
    fileHoverLabel: "File",
    batchHoverLabel: "Batch",
    thScale: "Scale",
    thBatch: "Batch",
    thMean: "Mean",
    thMedian: "Median",
    thMin: "Minimum",
    thMax: "Maximum",
    alertCompleteBeforeSubmit: "Please answer all questions before submitting."
  }
};
let currentQuestions = questionsFR;
let currentLang = 'fr';
let displayedQuestions = [];

function mountCopsoq(hostElement, lang) {
    if (!hostElement) return;
    hostElement.hidden = false;
    hostElement.innerHTML = `
      <div class="copsoq-root">
        <div class="copsoq-layout">
          <section class="copsoq-content-area">
            <div id="languageSelector" class="copsoq-language-switch" role="group" aria-label="Langue du questionnaire / Questionnaire language">
              <button type="button" class="copsoq-language-option" data-lang="fr" aria-pressed="true">
                <svg class="copsoq-language-icon copsoq-french-flag" viewBox="0 0 3 2" aria-hidden="true" focusable="false">
                  <rect width="1" height="2" x="0" fill="#0055a4"></rect>
                  <rect width="1" height="2" x="1" fill="#ffffff"></rect>
                  <rect width="1" height="2" x="2" fill="#ef4135"></rect>
                </svg>
                <span>Français</span>
              </button>
              <button type="button" class="copsoq-language-option" data-lang="en" aria-pressed="false">
                <span class="copsoq-language-icon" aria-hidden="true">🌐</span>
                <span>International</span>
              </button>
            </div>
            <h2 id="mainTitle" class="content-title">Questionnaire COPSOQ</h2>
            <div id="copsoqIntro" class="content-subtitle">
              <p id="introP1">Répondre à chaque question en sélectionnant la réponse qui correspond le mieux à votre situation.</p>
              <p id="introP2">Il n'y a pas de bonnes ou de mauvaises réponses. Répondre de manière honnête et spontanée.</p>
            </div>
            <form id="copsocForm" class="questionnaire-form"></form>
            <div id="resultsSection" class="copsoq-results-section">
              <h3 id="resultsTitle">Résultats du Questionnaire COPSOQ</h3>
              <p id="resultsDesc">Voici un aperçu graphique de votre profil ainsi que les réponses détaillées par domaine et échelle :</p>
              <button type="button" id="resultsSaveButton" class="secondary-btn copsoq-results-save" hidden>Sauvegarder dans un fichier</button>
              <div class="results-layout copsoq-results-layout">
                <div id="resultsContent" class="results-table-wrap copsoq-results-details"></div>
                <section class="plot-panel copsoq-plots-panel">
                  <div id="myDiv" class="copsoq-chart-card" style="display:none"></div>
                  <div id="overallChartContainer" class="copsoq-chart-card" style="display:none"></div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    currentLang = resolveLang(lang || 'fr');
    currentQuestions = getQuestionSetForLang(currentLang);
    hostElement.querySelectorAll('.copsoq-language-option').forEach(button => {
      button.addEventListener('click', () => selectLanguage(button.dataset.lang));
    });
    hostElement.querySelector('#resultsSaveButton').addEventListener('click', saveFormToFile);
    selectLanguage(currentLang);
}
function tr() {
  return i18n[currentLang] || i18n.fr;
}
function getQuestionSetForLang(lang) {
  return lang === 'en' ? questionsEN : questionsFR;
}
function resolveLang(lang) {
  return lang === 'en' ? 'en' : 'fr';
}
function syncCopsoqActionButtonLabels() {
  const t = tr();
  const labels = [
    { id: 'saveButton', text: t.saveBtn },
    { id: 'resetButton', text: t.resetBtn },
    { id: 'randomButton', text: t.randomBtn },
    { id: 'submitButton', text: t.submitBtn },
    { id: 'resultsSaveButton', text: t.saveResultsBtn },
  ];

  labels.forEach(({ id, text }) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  });
}
function selectLanguage(lang) {
  currentLang = resolveLang(lang);
  currentQuestions = getQuestionSetForLang(currentLang);
  const t = tr();
  const form = document.getElementById('copsocForm');
  const intro = document.getElementById('copsoqIntro');
  if (intro) intro.hidden = false;
  document.getElementById('mainTitle').textContent = t.title;
  document.getElementById('introP1').textContent = t.intro1;
  document.getElementById('introP2').textContent = t.intro2;
  document.getElementById('resultsTitle').textContent = t.resultsTitle;
  document.getElementById('resultsDesc').textContent = t.resultsDesc;
  syncCopsoqActionButtonLabels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (form) {
    form.style.display = '';
    form.innerHTML = '';
    generateForm();
  }
  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) resultsSection.style.display = 'none';
  const resultsSaveButton = document.getElementById('resultsSaveButton');
  if (resultsSaveButton) resultsSaveButton.hidden = true;
  ['myDiv', 'overallChartContainer'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    if (window.Plotly && typeof Plotly.purge === 'function') Plotly.purge(container);
    container.innerHTML = '';
    container.style.display = 'none';
  });
  const resultsContent = document.getElementById('resultsContent');
  if (resultsContent) resultsContent.innerHTML = '';
  const selector = document.getElementById('languageSelector');
  if (selector) {
    selector.hidden = false;
    selector.querySelectorAll('.copsoq-language-option').forEach(button => {
      const isActive = button.dataset.lang === currentLang;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function updateActionButtons() {
  const resultsSection = document.getElementById('resultsSection');
  const resultsVisible = resultsSection && getComputedStyle(resultsSection).display !== 'none';
  const form = getCopsoqForm();
  const saveButton = document.getElementById('saveButton');
  if (saveButton) saveButton.disabled = !isFormComplete();
  const resetButton = document.getElementById('resetButton');
  if (resetButton) resetButton.disabled = resultsVisible || !form || !form.querySelector('input:checked');
  const randButton = document.getElementById('randomButton');
  if (randButton) randButton.disabled = resultsVisible || !!(form && form.querySelector('input:checked'));
  const submitButton = document.getElementById('submitButton');
  if (submitButton) submitButton.disabled = !isFormComplete();
}
function isFormComplete() {
  const form = getCopsoqForm();
  if (!form) return false;
  return form.checkValidity();
}

function getCopsoqForm() {
  return document.getElementById('copsocForm');
}

function generateForm() {
  const form = getCopsoqForm();
  if (!form) {
    return;
  }
  form.innerHTML = '';
  displayedQuestions = shuffle([...currentQuestions]);
  displayedQuestions.forEach((q, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    const label = document.createElement('label');
    label.className = 'question-label';
    label.textContent = `${index + 1}. ${q.text}`;
    questionDiv.appendChild(label);
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';
    q.options.forEach((option, i) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `q${index}`;
      radio.value = i;
      radio.required = true;
      const optionLabel = document.createElement('label');
      optionLabel.textContent = option;
      optionDiv.appendChild(radio);
      optionDiv.appendChild(optionLabel);
      optionsDiv.appendChild(optionDiv);
    });
    questionDiv.appendChild(optionsDiv);
    form.appendChild(questionDiv);
  });
  const submitButton = document.createElement('button');
  submitButton.type = 'button';
  submitButton.id = 'submitButton';
  submitButton.className = 'submit-btn';
  submitButton.onclick = submitForm;

  const randomButton = document.createElement('button');
  randomButton.type = 'button';
  randomButton.id = 'randomButton';
  randomButton.className = 'secondary-btn';
  randomButton.onclick = randomlyFillForm;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.id = 'resetButton';
  resetButton.className = 'secondary-btn';
  resetButton.onclick = resetForm;

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.id = 'saveButton';
  saveButton.className = 'secondary-btn';
  saveButton.onclick = saveFormToFile;

  const actions = document.createElement('div');
  actions.className = 'questionnaire-actions';
  actions.append(randomButton, resetButton, saveButton, submitButton);
  form.appendChild(actions);
  syncCopsoqActionButtonLabels();

  form.addEventListener('change', updateActionButtons);
  updateActionButtons();
}
function collectCurrentAnswers() {
  const form = getCopsoqForm();
  if (!form) return null;
  const formData = new FormData(form);
  const answers = [];
  for (let i = 0; i < displayedQuestions.length; i++) {
    const answerIndex = formData.get(`q${i}`);
    if (answerIndex === null) return null;
    const q = displayedQuestions[i];
    const numericIndex = parseInt(answerIndex, 10);
    if (Number.isNaN(numericIndex) || numericIndex < 0 || numericIndex >= q.options.length) return null;
    answers.push({ questionText: q.text, answerIndex: numericIndex });
  }
  return answers;
}
function saveFormToFile() {
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; save action ignored.');
    return;
  }
  if (!isFormComplete()) {
    alert(tr().alertCompleteBeforeSave);
    return;
  }
  const answers = collectCurrentAnswers();
  if (!answers) {
    alert(tr().alertFormIncomplete);
    return;
  }
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    lang: currentLang,
    answers
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tr().fileNameBase}${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function normalizeSavedAnswers(savedAnswers, questionSet) {
  return savedAnswers.map(item => {
    const matchingQuestion = questionSet.find(q => q.text === item.questionText);
    if (!matchingQuestion) return null;
    const answerIndex = parseInt(item.answerIndex, 10);
    if (Number.isNaN(answerIndex) || answerIndex < 0 || answerIndex >= matchingQuestion.options.length) return null;
    return {
      answerIndex,
      domaine: matchingQuestion.domaine,
      echelle: matchingQuestion.echelle,
      options: matchingQuestion.options,
      question: matchingQuestion.text,
      answer: matchingQuestion.options[answerIndex]
    };
  }).filter(Boolean);
}
function countQuestionTextMatches(savedAnswers, questionSet) {
  if (!Array.isArray(savedAnswers)) return 0;
  const questionTexts = new Set(questionSet.map(q => q.text));
  return savedAnswers.reduce((count, item) => {
    if (item && typeof item.questionText === 'string' && questionTexts.has(item.questionText)) {
      return count + 1;
    }
    return count;
  }, 0);
}
function formatLangCode(lang) {
  return resolveLang(lang) === 'en' ? 'EN' : 'FR';
}
function inferSavedPayloadLang(parsed) {
  const hasDeclaredLang = parsed && typeof parsed.lang === 'string' && parsed.lang.trim().length > 0;
  const declaredLang = hasDeclaredLang ? resolveLang(parsed.lang) : null;
  const savedAnswers = parsed && Array.isArray(parsed.answers) ? parsed.answers : [];

  const frQuestionSet = getQuestionSetForLang('fr');
  const enQuestionSet = getQuestionSetForLang('en');
  const frMatches = countQuestionTextMatches(savedAnswers, frQuestionSet);
  const enMatches = countQuestionTextMatches(savedAnswers, enQuestionSet);

  if (frMatches > enMatches) {
    return { lang: 'fr', autoDetected: !declaredLang };
  }
  if (enMatches > frMatches) {
    return { lang: 'en', autoDetected: !declaredLang };
  }
  if (declaredLang) {
    return { lang: declaredLang, autoDetected: false };
  }
  return { lang: resolveLang(currentLang), autoDetected: true };
}
function validateSavedPayload(parsed, fileName) {
  const t = tr();
  if (!parsed || !Array.isArray(parsed.answers)) {
    throw new Error(t.errInvalidFileData(fileName));
  }
  const inferred = inferSavedPayloadLang(parsed);
  const payloadLang = inferred.lang;
  const questionSet = getQuestionSetForLang(payloadLang);
  const expectedQuestionTexts = questionSet.map(q => q.text);
  const loadedQuestionTexts = parsed.answers.map(item => item.questionText);
  if (parsed.answers.length !== questionSet.length) {
    throw new Error(t.errWrongAnswerCount(fileName, parsed.answers.length, questionSet.length));
  }
  const duplicates = loadedQuestionTexts.filter((text, index) => loadedQuestionTexts.indexOf(text) !== index);
  if (duplicates.length > 0) throw new Error(t.errDuplicateAnswers(fileName));
  const missingQuestions = expectedQuestionTexts.filter(text => !loadedQuestionTexts.includes(text));
  if (missingQuestions.length > 0) throw new Error(t.errMissingAnswers(fileName));
  const invalidEntries = parsed.answers.filter(item => {
    if (typeof item.questionText !== 'string' || !Number.isInteger(item.answerIndex)) return true;
    const matchingQuestion = questionSet.find(q => q.text === item.questionText);
    if (!matchingQuestion) return true;
    return item.answerIndex < 0 || item.answerIndex >= matchingQuestion.options.length;
  });
  if (invalidEntries.length > 0) throw new Error(t.errInvalidAnswers(fileName));
  return {
    lang: payloadLang,
    langAutoDetected: inferred.autoDetected,
    answers: normalizeSavedAnswers(parsed.answers, questionSet)
  };
}
function readSavedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(reader.result);
        const validated = validateSavedPayload(parsed, file.name);
        resolve({
          fileName: file.name,
          lang: validated.lang,
          langAutoDetected: validated.langAutoDetected,
          answers: validated.answers
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = function () {
      reject(new Error(tr().errReadFile(file.name)));
    };
    reader.readAsText(file);
  });
}
function ensureResultsVisible(titleText, descriptionText, showSaveButton = false) {
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; results view cannot be shown.');
    return;
  }
  document.getElementById('resultsTitle').textContent = titleText || tr().resultsTitle;
  document.getElementById('resultsDesc').textContent = descriptionText || tr().resultsDesc;
  const selector = document.getElementById('languageSelector');
  if (selector) selector.hidden = true;
  const intro = document.getElementById('copsoqIntro');
  if (intro) intro.hidden = true;
  const resultsSaveButton = document.getElementById('resultsSaveButton');
  if (resultsSaveButton) resultsSaveButton.hidden = !showSaveButton;
  form.style.display = 'none';
  const submitBtn = document.getElementById('submitButton');
  if (submitBtn) submitBtn.style.display = 'none';
  const resultsSection = document.getElementById('resultsSection');
  resultsSection.style.display = 'block';
  updateActionButtons();
  scrollToPageTop();
}
async function loadSingleFormFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const data = await readSavedFile(file);
    if (data.lang !== currentLang) {
      currentLang = data.lang;
      currentQuestions = getQuestionSetForLang(currentLang);
      selectLanguage(currentLang);
    }
    displayLoadedSingleFileResults(data.answers, data.fileName);
    ensureResultsVisible();
    sunburstChart(data.answers);
    alert(tr().alertLoadSingleSuccessCompact(formatLangCode(data.lang || currentLang)));
  } catch (error) {
    alert(error.message || tr().alertLoadSingleFail);
  } finally {
    event.target.value = '';
  }
}
async function loadMultipleFormFiles(event, mode = 'individuals') {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;
  try {
    const loadedFiles = [];
    for (const file of files) loadedFiles.push(await readSavedFile(file));
    if (loadedFiles.length === 0) throw new Error(tr().errNoValidSaves);
    const langs = new Set(loadedFiles.map(f => resolveLang(f.lang)));
    if (langs.size > 1) {
      throw new Error(tr().errMixedLanguages);
    }
    const batchLang = resolveLang(loadedFiles[0].lang);
    const existingFiles = mode === 'group'
      ? copsoqImportedGroupBatches.flatMap(batch => batch.individuals)
      : copsoqImportedIndividuals;
    if (
      existingFiles.length > 0 &&
      resolveLang(existingFiles[0].lang) !== batchLang
    ) {
      throw new Error(tr().errMixedLanguages);
    }
    if (batchLang && batchLang !== currentLang) {
      currentLang = resolveLang(batchLang);
      currentQuestions = getQuestionSetForLang(currentLang);
      selectLanguage(currentLang);
    }
    if (mode === 'group') {
      const batchIndex = copsoqImportedGroupBatches.length + 1;
      copsoqImportedGroupBatches = [
        ...copsoqImportedGroupBatches,
        {
          label: tr().batchLabel(batchIndex),
          lang: batchLang,
          individuals: loadedFiles,
        },
      ];
      renderCopsoqGroupView(copsoqImportedGroupBatches);
    } else {
      copsoqImportedIndividuals = [...copsoqImportedIndividuals, ...loadedFiles];
      renderCopsoqIndividualsView(copsoqImportedIndividuals);
    }
    alert(tr().alertLoadMultipleSuccessCompact(
      loadedFiles.length,
      formatLangCode(batchLang || currentLang),
    ));
  } catch (error) {
    alert(error.message || tr().alertLoadMultipleFail);
  } finally {
    event.target.value = '';
  }
}
function getScoreForAnswer(item, answerIndex) {
  const totalOptions = item.options.length;
  if (totalOptions <= 1) return 0;
  return Math.round(((answerIndex + 1) / totalOptions) * 100);
}
function getScoreColor(score) {
  if (score <= 20) return '#D55E00';
  if (score <= 50) return '#E69F00';
  if (score < 80) return '#F0E442';
  return '#009E73';
}
function getCopsoqScoreExportLegendItems() {
  const labels = currentLang === 'en'
    ? ['Score from 0 to 20', 'Score from 21 to 50', 'Score from 51 to 79', 'Score from 80 to 100']
    : ['Score de 0 à 20', 'Score de 21 à 50', 'Score de 51 à 79', 'Score de 80 à 100'];
  return labels.map((label, index) => ({
    label,
    color: ['#D55E00', '#E69F00', '#F0E442', '#009E73'][index],
  }));
}
function getCopsoqSunburstExportTitle() {
  return currentLang === 'en' ? 'COPSOQ score distribution' : 'Répartition des scores COPSOQ';
}
function calculateMean(values) { return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0; }
function calculateMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : Math.round(sorted[middle]);
}
function calculateMin(values) { return values.length ? Math.min(...values) : 0; }
function calculateMax(values) { return values.length ? Math.max(...values) : 0; }
function appendStatisticsRow(tbody, label, values, className) {
  const row = document.createElement('tr');
  row.className = className;
  const labelCell = document.createElement('td');
  labelCell.textContent = label;
  row.appendChild(labelCell);
  [calculateMean(values), calculateMedian(values), calculateMin(values), calculateMax(values)].forEach(value => {
    const statCell = document.createElement('td');
    statCell.className = 'copsoq-stat-bullet-cell';
    const bullet = document.createElement('span');
    bullet.className = 'copsoq-score-bullet';
    bullet.style.backgroundColor = getScoreColor(value);
    bullet.setAttribute('aria-hidden', 'true');
    statCell.appendChild(bullet);
    row.appendChild(statCell);
  });
  tbody.appendChild(row);
}
function getContrastTextColor(backgroundColor) {
  if (!backgroundColor || typeof backgroundColor !== 'string') return '#ffffff';
  const normalizedColor = backgroundColor.replace('#', '');
  const safeColor = normalizedColor.length === 3
    ? normalizedColor.split('').map(char => char + char).join('')
    : normalizedColor;
  if (safeColor.length !== 6) return '#ffffff';
  const red = parseInt(safeColor.slice(0, 2), 16);
  const green = parseInt(safeColor.slice(2, 4), 16);
  const blue = parseInt(safeColor.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.65 ? '#1f2937' : '#ffffff';
}
function buildDomainSummary(answers) {
  const groupedByDomaine = {};
  answers.forEach(answer => {
    if (!groupedByDomaine[answer.domaine]) groupedByDomaine[answer.domaine] = {};
    if (!groupedByDomaine[answer.domaine][answer.echelle]) groupedByDomaine[answer.domaine][answer.echelle] = [];
    groupedByDomaine[answer.domaine][answer.echelle].push(answer);
  });
  const domainScores = {};
  const scaleStatsByDomain = {};
  for (const domaine in groupedByDomaine) {
    const scaleStats = {};
    const scaleScores = Object.keys(groupedByDomaine[domaine]).map(echelle => {
      const items = groupedByDomaine[domaine][echelle];
      const total = items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0);
      const average = Math.round(total / items.length);
      scaleStats[echelle] = average;
      return average;
    });
    domainScores[domaine] = {
      total: scaleScores.reduce((sum, value) => sum + value, 0),
      count: scaleScores.length
    };
    scaleStatsByDomain[domaine] = scaleStats;
  }
  return { groupedByDomaine, domainScores, scaleStatsByDomain };
}
function renderScaleIndicator(titleElement, echelle, score) {
  const bullet = document.createElement('span');
  bullet.className = 'scale-bullet';
  bullet.style.backgroundColor = getScoreColor(score);
  const label = document.createElement('span');
  label.textContent = `${echelle}`;
  titleElement.textContent = '';
  titleElement.appendChild(bullet);
  titleElement.appendChild(label);
}
function appendCopsoqLoadedFileHeading(container, fileName) {
  if (!fileName) return;
  const heading = document.createElement('p');
  heading.className = 'copsoq-loaded-file-heading';
  const label = document.createElement('strong');
  label.textContent = `${tr().loadedFileLabel} : `;
  const name = document.createElement('span');
  name.textContent = fileName;
  heading.append(label, name);
  container.appendChild(heading);
}
function displayLoadedSingleFileResults(data, fileName) {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = '';
  appendCopsoqLoadedFileHeading(resultsContent, fileName);
  const groupedByDomaine = {};
  data.forEach(item => {
    if (!groupedByDomaine[item.domaine]) groupedByDomaine[item.domaine] = {};
    if (!groupedByDomaine[item.domaine][item.echelle]) groupedByDomaine[item.domaine][item.echelle] = [];
    groupedByDomaine[item.domaine][item.echelle].push(item);
  });
  const domainScores = {};
  for (const domaine in groupedByDomaine) {
    const domaineDiv = document.createElement('div');
    domaineDiv.className = 'domaine';
    const domaineTitle = document.createElement('div');
    domaineTitle.className = 'domaine-title';
    domaineTitle.textContent = domaine;
    domaineDiv.appendChild(domaineTitle);
    for (const echelle in groupedByDomaine[domaine]) {
      const echelleDiv = document.createElement('div');
      echelleDiv.className = 'echelle';
      const echelleTitle = document.createElement('div');
      echelleTitle.className = 'echelle-title';
      echelleTitle.textContent = echelle;
      echelleDiv.appendChild(echelleTitle);
      const items = groupedByDomaine[domaine][echelle];
      const total = items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0);
      const score = Math.round(total / items.length);
      renderScaleIndicator(echelleTitle, echelle, score);
      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        const questionSpan = document.createElement('div');
        questionSpan.className = 'result-question';
        questionSpan.textContent = item.question;
        const answerSpan = document.createElement('div');
        answerSpan.className = 'result-answer';
        answerSpan.textContent = `${tr().answerPrefix} ${item.answer}`;
        itemDiv.appendChild(questionSpan);
        itemDiv.appendChild(answerSpan);
        echelleDiv.appendChild(itemDiv);
      });
      domaineDiv.appendChild(echelleDiv);
    }
    resultsContent.appendChild(domaineDiv);
    const scaleScores = Object.keys(groupedByDomaine[domaine]).map(echelle => {
      const items = groupedByDomaine[domaine][echelle];
      const total = items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0);
      return Math.round(total / items.length);
    });
    domainScores[domaine] = {
      total: scaleScores.reduce((sum, value) => sum + value, 0),
      count: scaleScores.length
    };
  }
  renderOverallChart(domainScores);
}
function buildCopsoqAggregateStatistics(loadedFiles) {
  const scaleValuesByDomain = {};
  const questionValuesByDomain = {};
  loadedFiles.forEach(loadedFile => {
    const fileAnswers = loadedFile.answers || loadedFile;
    const summary = buildDomainSummary(fileAnswers);
    for (const domaine in summary.domainScores) {
      if (!scaleValuesByDomain[domaine]) scaleValuesByDomain[domaine] = {};
      if (!questionValuesByDomain[domaine]) questionValuesByDomain[domaine] = {};
      for (const echelle in summary.scaleStatsByDomain[domaine]) {
        if (!scaleValuesByDomain[domaine][echelle]) scaleValuesByDomain[domaine][echelle] = [];
        scaleValuesByDomain[domaine][echelle].push(summary.scaleStatsByDomain[domaine][echelle]);
        if (!questionValuesByDomain[domaine][echelle]) questionValuesByDomain[domaine][echelle] = {};
        summary.groupedByDomaine[domaine][echelle].forEach(item => {
          if (!questionValuesByDomain[domaine][echelle][item.question]) {
            questionValuesByDomain[domaine][echelle][item.question] = [];
          }
          questionValuesByDomain[domaine][echelle][item.question].push(getScoreForAnswer(item, item.answerIndex));
        });
      }
    }
  });
  return { scaleValuesByDomain, questionValuesByDomain };
}
function getCopsoqDomainLabels(loadedFiles) {
  const labels = [];
  const seen = new Set();
  loadedFiles.forEach(loadedFile => {
    const summary = buildDomainSummary(loadedFile.answers || loadedFile);
    Object.keys(summary.domainScores).forEach(label => {
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    });
  });
  return labels;
}
function buildCopsoqFileDataset(loadedFile, fileIndex, labels) {
  const summary = buildDomainSummary(loadedFile.answers || loadedFile);
  const data = labels.map(label => {
    const score = summary.domainScores[label];
    return score ? Math.round(score.total / score.count) : 0;
  });
  const pointColors = data.map(score => getScoreColor(score));
  return {
    label: loadedFile.fileName || tr().fileFallback(fileIndex + 1),
    data,
    pointBackgroundColor: pointColors,
    lineColor: getCopsoqFileColor(fileIndex)
  };
}
function getCopsoqFileColor(fileIndex) {
  return plotLineColors[fileIndex % plotLineColors.length];
}
function getCopsoqBatchColor(batchIndex) {
  return plotLineColors[batchIndex % plotLineColors.length];
}
function buildCopsoqGroupLineSwatch(color) {
  const lineSwatch = document.createElement('span');
  lineSwatch.className = 'copsoq-group-line-swatch';
  lineSwatch.style.backgroundColor = color;
  lineSwatch.setAttribute('aria-hidden', 'true');
  return lineSwatch;
}
function appendCopsoqStatisticsSection(container, loadedFiles, titleText) {
  const section = document.createElement('section');
  section.className = 'polar-statistics-section copsoq-statistics-section';
  const title = document.createElement('h3');
  title.textContent = titleText;
  const count = document.createElement('p');
  count.className = 'content-subtitle';
  count.textContent = tr().fileCount(loadedFiles.length);
  section.append(title, count);
  const fileLegend = document.createElement('ul');
  fileLegend.className = 'copsoq-individual-file-legend';
  fileLegend.setAttribute('aria-label', tr().filesLabel);
  loadedFiles.forEach((loadedFile, fileIndex) => {
    const item = document.createElement('li');
    const lineSwatch = document.createElement('span');
    lineSwatch.className = 'copsoq-individual-line-swatch';
    lineSwatch.style.backgroundColor = getCopsoqFileColor(fileIndex);
    lineSwatch.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = loadedFile.fileName || tr().fileFallback(fileIndex + 1);
    item.append(lineSwatch, name);
    fileLegend.appendChild(item);
  });
  section.appendChild(fileLegend);
  const { scaleValuesByDomain, questionValuesByDomain } = buildCopsoqAggregateStatistics(loadedFiles);
  for (const domaine in scaleValuesByDomain) {
    const domainCard = document.createElement('div');
    domainCard.className = 'domaine';
    const domainTitle = document.createElement('div');
    domainTitle.className = 'domaine-title';
    domainTitle.textContent = domaine;
    domainCard.appendChild(domainTitle);
    const table = document.createElement('table');
    table.className = 'summary-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    [tr().thScale, tr().thMean, tr().thMedian, tr().thMin, tr().thMax].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const echelle in scaleValuesByDomain[domaine]) {
      appendStatisticsRow(tbody, echelle, scaleValuesByDomain[domaine][echelle], 'summary-scale-row');
      for (const question in questionValuesByDomain[domaine][echelle]) {
        appendStatisticsRow(
          tbody,
          question,
          questionValuesByDomain[domaine][echelle][question],
          'summary-question-row'
        );
      }
    }
    table.appendChild(tbody);
    domainCard.appendChild(table);
    section.appendChild(domainCard);
  }
  container.appendChild(section);
}
function appendCopsoqGroupStatisticsRow(tbody, label, batchValues, className) {
  batchValues.forEach((batch, batchIndex) => {
    const row = document.createElement('tr');
    row.className = className;
    if (batchIndex === 0) {
      const labelCell = document.createElement('td');
      labelCell.rowSpan = batchValues.length;
      labelCell.textContent = label;
      row.appendChild(labelCell);
    }
    const batchCell = document.createElement('td');
    batchCell.className = 'copsoq-group-batch-cell';
    const batchLabel = document.createElement('span');
    batchLabel.textContent = batch.label;
    batchCell.append(buildCopsoqGroupLineSwatch(batch.color), batchLabel);
    row.appendChild(batchCell);
    [calculateMean, calculateMedian, calculateMin, calculateMax].forEach(calculateStatistic => {
      const statistic = batch.values.length ? calculateStatistic(batch.values) : null;
      const statCell = document.createElement('td');
      statCell.className = 'copsoq-group-stat-cell';
      const bullet = document.createElement('span');
      bullet.className = 'copsoq-score-bullet';
      bullet.style.backgroundColor = statistic === null ? '#d9e4ea' : getScoreColor(statistic);
      bullet.setAttribute('aria-hidden', 'true');
      statCell.appendChild(bullet);
      row.appendChild(statCell);
    });
    tbody.appendChild(row);
  });
}
function appendCopsoqGroupStatisticsSection(container, groupBatches) {
  const section = document.createElement('section');
  section.className = 'polar-statistics-section copsoq-statistics-section copsoq-group-statistics-section';
  const title = document.createElement('h3');
  title.textContent = tr().groupStatisticsTitle;
  section.appendChild(title);

  const batchSummaries = groupBatches.map((batch, batchIndex) => ({
    label: batch.label,
    color: getCopsoqBatchColor(batchIndex),
    individuals: batch.individuals,
    statistics: buildCopsoqAggregateStatistics(batch.individuals),
  }));
  const batchList = document.createElement('div');
  batchList.className = 'copsoq-group-set-list';
  batchSummaries.forEach(batch => {
    const batchItem = document.createElement('section');
    batchItem.className = 'copsoq-group-set-item';
    const batchHeading = document.createElement('div');
    batchHeading.className = 'copsoq-group-set-heading';
    const batchName = document.createElement('strong');
    batchName.textContent = batch.label;
    const fileCount = document.createElement('span');
    fileCount.textContent = tr().fileCount(batch.individuals.length);
    batchHeading.append(buildCopsoqGroupLineSwatch(batch.color), batchName, fileCount);
    const fileList = document.createElement('ul');
    fileList.className = 'copsoq-group-file-list';
    fileList.setAttribute('aria-label', `${tr().filesLabel} — ${batch.label}`);
    batch.individuals.forEach((file, fileIndex) => {
      const fileItem = document.createElement('li');
      fileItem.textContent = file.fileName || tr().fileFallback(fileIndex + 1);
      fileList.appendChild(fileItem);
    });
    batchItem.append(batchHeading, fileList);
    batchList.appendChild(batchItem);
  });
  section.appendChild(batchList);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'copsoq-group-summary-table-wrap';
  const table = document.createElement('table');
  table.className = 'summary-table copsoq-group-summary-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  [tr().thScale, tr().thBatch, tr().thMean, tr().thMedian, tr().thMin, tr().thMax].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const domainNames = [];
  batchSummaries.forEach(batch => {
    Object.keys(batch.statistics.scaleValuesByDomain).forEach(domain => {
      if (!domainNames.includes(domain)) domainNames.push(domain);
    });
  });
  domainNames.forEach(domain => {
    const domainRow = document.createElement('tr');
    domainRow.className = 'copsoq-group-domain-row';
    const domainCell = document.createElement('th');
    domainCell.colSpan = 6;
    domainCell.scope = 'rowgroup';
    domainCell.textContent = domain;
    domainRow.appendChild(domainCell);
    tbody.appendChild(domainRow);
    const scaleNames = [];
    batchSummaries.forEach(batch => {
      Object.keys(batch.statistics.scaleValuesByDomain[domain] || {}).forEach(scale => {
        if (!scaleNames.includes(scale)) scaleNames.push(scale);
      });
    });
    scaleNames.forEach(scale => {
      appendCopsoqGroupStatisticsRow(
        tbody,
        scale,
        batchSummaries.map(batch => ({
          label: batch.label,
          color: batch.color,
          values: batch.statistics.scaleValuesByDomain[domain]?.[scale] || [],
        })),
        'summary-scale-row',
      );
      const questionNames = [];
      batchSummaries.forEach(batch => {
        Object.keys(batch.statistics.questionValuesByDomain[domain]?.[scale] || {}).forEach(question => {
          if (!questionNames.includes(question)) questionNames.push(question);
        });
      });
      questionNames.forEach(question => {
        appendCopsoqGroupStatisticsRow(
          tbody,
          question,
          batchSummaries.map(batch => ({
            label: batch.label,
            color: batch.color,
            values: batch.statistics.questionValuesByDomain[domain]?.[scale]?.[question] || [],
          })),
          'summary-question-row',
        );
      });
    });
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  section.appendChild(tableWrap);
  container.appendChild(section);
}
function createCopsoqResetImportsButton(mode) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-btn compact-action-btn';
  button.textContent = tr().resetImports;
  button.addEventListener('click', () => {
    if (mode === 'group') {
      copsoqImportedGroupBatches = [];
      triggerCopsoqGroupImport(currentLang);
    } else {
      copsoqImportedIndividuals = [];
      triggerCopsoqIndividualsImport(currentLang);
    }
  });
  return button;
}
function renderCopsoqIndividualsView(loadedFiles) {
  if (!loadedFiles.length) return;
  const resultsContent = document.getElementById('resultsContent');
  if (!resultsContent) return;
  resultsContent.innerHTML = '';
  resultsContent.appendChild(createCopsoqResetImportsButton('individuals'));
  appendCopsoqStatisticsSection(resultsContent, loadedFiles, tr().allIndividualsTitle);
  const labels = getCopsoqDomainLabels(loadedFiles);
  const datasets = loadedFiles.map((loadedFile, fileIndex) =>
    buildCopsoqFileDataset(loadedFile, fileIndex, labels),
  );
  clearSunburstChart();
  ensureResultsVisible(tr().individualsResultsTitle, tr().individualsResultsDesc);
  renderOverallChart(labels, datasets);
}
function renderCopsoqGroupView(groupBatches) {
  if (!groupBatches.length) return;
  const resultsContent = document.getElementById('resultsContent');
  if (!resultsContent) return;
  resultsContent.innerHTML = '';
  resultsContent.appendChild(createCopsoqResetImportsButton('group'));
  appendCopsoqGroupStatisticsSection(resultsContent, groupBatches);
  const allFiles = groupBatches.flatMap(batch => batch.individuals);
  const labels = getCopsoqDomainLabels(allFiles);
  const datasets = groupBatches.map((batch, batchIndex) => ({
    label: batch.label,
    lineColor: getCopsoqBatchColor(batchIndex),
    isGroup: true,
    series: batch.individuals.map((loadedFile, fileIndex) => {
      const dataset = buildCopsoqFileDataset(loadedFile, fileIndex, labels);
      return {
        fileName: dataset.label,
        data: dataset.data,
        pointBackgroundColor: dataset.pointBackgroundColor,
      };
    }),
  }));
  clearSunburstChart();
  ensureResultsVisible(tr().groupsResultsTitle, tr().groupsResultsDesc);
  renderOverallChart(labels, datasets);
}
function ensureCopsoqFullscreenBehavior(container) {
  if (!container || container.dataset.copsoqFullscreenBound === 'true') return;
  container.dataset.copsoqFullscreenBound = 'true';
  const resizePlot = layoutUpdate => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!container.isConnected || typeof Plotly === 'undefined') return;
      const finishResize = () => {
        if (Plotly.Plots && typeof Plotly.Plots.resize === 'function') {
          Plotly.Plots.resize(container);
        }
      };
      if (layoutUpdate && typeof Plotly.relayout === 'function') {
        Plotly.relayout(container, layoutUpdate).then(finishResize);
      } else finishResize();
    }));
  };
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === container) {
      resizePlot({ width: null, height: null });
      return;
    }
    if (!container.dataset.copsoqRestorePending) return;
    const width = Number(container.dataset.copsoqOriginalWidth);
    const height = Number(container.dataset.copsoqOriginalHeight);
    delete container.dataset.copsoqRestorePending;
    resizePlot(width > 0 && height > 0 ? { width, height } : null);
  });
}
function toggleCopsoqFullscreen(container) {
  if (!container) return;
  ensureCopsoqFullscreenBehavior(container);
  if (!document.fullscreenElement) {
    const plotLayout = container._fullLayout;
    const plotBounds = container.querySelector('.plot-container')?.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    container.dataset.copsoqOriginalWidth = String(plotBounds?.width || plotLayout?.width || bounds.width);
    container.dataset.copsoqOriginalHeight = String(plotBounds?.height || plotLayout?.height || bounds.height);
    container.dataset.copsoqRestorePending = 'true';
    container.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}
function renderOverallChart(labelsOrDomainScores, datasets) {
  const overallChartContainer = document.getElementById('overallChartContainer');
  ensureCopsoqFullscreenBehavior(overallChartContainer);
  overallChartContainer.style.display = 'block';
  overallChartContainer.style.minHeight = '720px';
  overallChartContainer.style.height = 'min(78vh, 840px)';
  let labels;
  let traces;
  if (Array.isArray(labelsOrDomainScores) && Array.isArray(datasets)) {
    labels = labelsOrDomainScores;
    traces = datasets.map(ds => {
      const series = Array.isArray(ds.series)
        ? ds.series
        : [{
            fileName: ds.label,
            data: ds.data,
            pointBackgroundColor: ds.pointBackgroundColor,
          }];
      const radialValues = [];
      const angularValues = [];
      const markerColors = [];
      const customdata = [];
      series.forEach((entry, seriesIndex) => {
        const closedData = [...entry.data, entry.data[0]];
        const closedLabels = [...labels, labels[0]];
        const colors = entry.pointBackgroundColor || entry.data.map(score => getScoreColor(score));
        radialValues.push(...closedData);
        angularValues.push(...closedLabels);
        markerColors.push(...colors, colors[0]);
        customdata.push(...closedLabels.map(() => [ds.label, entry.fileName || ds.label]));
        if (seriesIndex < series.length - 1) {
          radialValues.push(null);
          angularValues.push(null);
          markerColors.push('rgba(0,0,0,0)');
          customdata.push([ds.label, entry.fileName || ds.label]);
        }
      });
      return {
        type: 'scatterpolar',
        r: radialValues,
        theta: angularValues,
        fill: 'none',
        mode: 'lines+markers',
        name: ds.label,
        customdata,
        marker: { color: markerColors, size: 14, line: { color: '#fff', width: 1 } },
        line: { color: ds.lineColor || plotLineColors[0] },
        hovertemplate: ds.isGroup
          ? `<b>%{theta}</b><br>${tr().batchHoverLabel}: %{customdata[0]}<br>${tr().fileHoverLabel}: %{customdata[1]}<extra></extra>`
          : `<b>%{theta}</b><br>${tr().fileHoverLabel}: %{customdata[1]}<extra></extra>`
      };
    });
  } else {
    const domainScores = labelsOrDomainScores;
    labels = Object.keys(domainScores);
    const data = labels.map(label => Math.round(domainScores[label].total / domainScores[label].count));
    const pointColors = data.map(score => getScoreColor(score));
    const markerColors = [...pointColors, pointColors[0]];
    traces = [{
      type: 'scatterpolar',
      r: [...data, data[0]],
      theta: [...labels, labels[0]],
      fill: 'none',
      mode: 'lines+markers',
      name: '',
      marker: { color: markerColors, size: 14, line: { color: '#fff', width: 1 } },
      line: { color: plotLineColors[0] },
      hovertemplate: '<b>%{theta}</b><extra></extra>'
    }];
  }
  const layout = {
    autosize: true,
    height: Math.max(650, Math.round(window.innerHeight * 0.72)),
    polar: {
      domain: { x: [0.02, 0.98], y: [0.02, 0.98] },
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickmode: 'linear',
        dtick: 20,
        showgrid: true,
        showline: false,
        showticklabels: false,
        ticks: '',
        fixedrange: true
      },
      angularaxis: { visible: true, tickfont: { size: 16 }, fixedrange: true }
    },
    showlegend: false,
    dragmode: false,
    margin: { l: 20, r: 20, t: 24, b: 20 },
    font: { size: 16 }
  };
  const config = {
    responsive: true,
    sendDataToCloud: false,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `copsoq_radar-${Date.now()}`,
      height: 1600,
      width: 1600,
      scale: 1
    },
    modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'resetScale2d', 'toggleHover', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toImage'],
    modeBarButtonsToAdd: [
      getPlotImageExportButton(overallChartContainer, {
        title: tr().resultsTitle,
        legendTitle: currentLang === 'en' ? 'Legend' : 'Légende',
        legendItems: [
          ...traces
            .filter(trace => trace.name && trace.line && trace.line.color)
            .map(trace => ({ label: trace.name, color: trace.line.color, type: 'line' })),
          ...getCopsoqScoreExportLegendItems(),
        ],
        filename: `copsoq_radar-${Date.now()}`,
        width: 1600,
        height: 1600,
      }),
      {
      name: 'fullscreen',
      title: currentLang === 'en' ? 'Full screen' : 'Visualiser en plein écran',
      icon: {
        width: 500,
        height: 500,
        path: 'M0,0 L150,0 L150,50 L50,50 L50,150 L0,150 Z M350,0 L500,0 L500,150 L450,150 L450,50 L350,50 Z M0,350 L50,350 L50,450 L150,450 L150,500 L0,500 Z M450,350 L500,350 L500,500 L350,500 L350,450 L450,450 Z'
      },
      click: function() {
        const container = document.getElementById('overallChartContainer');
        toggleCopsoqFullscreen(container);
      }
      },
    ],
    scrollZoom: false,
    displayModeBar: true
  };
  Plotly.purge(overallChartContainer);
  Plotly.newPlot(overallChartContainer, traces, layout, config).then(() => {
    requestAnimationFrame(() => Plotly.Plots.resize(overallChartContainer));
  });
}
function displayResults() {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = '';
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; displayResults aborted.');
    return;
  }
  const formData = new FormData(form);
  const answers = [];
  for (let i = 0; i < displayedQuestions.length; i++) {
    const answerIndex = formData.get(`q${i}`);
    if (answerIndex !== null) {
      const q = displayedQuestions[i];
      const numericIndex = parseInt(answerIndex, 10);
      answers.push({
        question: q.text,
        answer: q.options[numericIndex],
        answerIndex: numericIndex,
        domaine: q.domaine,
        echelle: q.echelle,
        options: q.options
      });
    }
  }
  const groupedByDomaine = {};
  answers.forEach(a => {
    if (!groupedByDomaine[a.domaine]) groupedByDomaine[a.domaine] = {};
    if (!groupedByDomaine[a.domaine][a.echelle]) groupedByDomaine[a.domaine][a.echelle] = [];
    groupedByDomaine[a.domaine][a.echelle].push(a);
  });
  const domainScores = {};
  for (const domaine in groupedByDomaine) {
    const domaineDiv = document.createElement('div');
    domaineDiv.className = 'domaine';
    const domaineTitle = document.createElement('div');
    domaineTitle.className = 'domaine-title';
    domaineTitle.textContent = domaine;
    domaineDiv.appendChild(domaineTitle);
    for (const echelle in groupedByDomaine[domaine]) {
      const echelleDiv = document.createElement('div');
      echelleDiv.className = 'echelle';
      const echelleTitle = document.createElement('div');
      echelleTitle.className = 'echelle-title';
      echelleTitle.textContent = echelle;
      echelleDiv.appendChild(echelleTitle);
      const items = groupedByDomaine[domaine][echelle];
      const total = items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0);
      const score = Math.round(total / items.length);
      renderScaleIndicator(echelleTitle, echelle, score);
      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        const questionSpan = document.createElement('div');
        questionSpan.className = 'result-question';
        questionSpan.textContent = item.question;
        const answerSpan = document.createElement('div');
        answerSpan.className = 'result-answer';
        answerSpan.textContent = `${tr().answerPrefix} ${item.answer}`;
        itemDiv.appendChild(questionSpan);
        itemDiv.appendChild(answerSpan);
        echelleDiv.appendChild(itemDiv);
      });
      domaineDiv.appendChild(echelleDiv);
    }
    resultsContent.appendChild(domaineDiv);
    const scaleScores = Object.keys(groupedByDomaine[domaine]).map(echelle => {
      const items = groupedByDomaine[domaine][echelle];
      const total = items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0);
      return Math.round(total / items.length);
    });
    domainScores[domaine] = {
      total: scaleScores.reduce((sum, value) => sum + value, 0),
      count: scaleScores.length
    };
  }
  renderOverallChart(domainScores);
  ensureResultsVisible(undefined, undefined, true);
  sunburstChart();
}
function submitForm() {
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; submit ignored.');
    return;
  }
  if (form.checkValidity()) {
    displayResults();
  } else {
    alert(tr().alertCompleteBeforeSubmit);
  }
}
function randomlyFillForm() {
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; random fill ignored.');
    return;
  }
  const questions = document.querySelectorAll('.question');
  questions.forEach(question => {
    const options = question.querySelectorAll('input[type="radio"]');
    if (options.length > 0) {
      const randomIndex = Math.floor(Math.random() * options.length);
      options[randomIndex].checked = true;
    }
  });
  updateActionButtons();
  const submitButton = document.getElementById('submitButton');
  if (submitButton) {
    submitButton.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
function resetForm() {
  const form = getCopsoqForm();
  if (!form) {
    console.warn('COPSOQ form container is missing; reset ignored.');
    return;
  }
  form.reset();
  updateActionButtons();
}
function clearSunburstChart() {
  const sunburstContainer = document.getElementById('myDiv');
  if (!sunburstContainer) return;
  if (window.Plotly && typeof Plotly.purge === 'function') {
    Plotly.purge(sunburstContainer);
  }
  sunburstContainer.innerHTML = '';
  sunburstContainer.style.display = 'none';
}
function sunburstChart(sourceAnswers) {
  const sunburstContainer = document.getElementById('myDiv');
  if (!sunburstContainer) return;
  ensureCopsoqFullscreenBehavior(sunburstContainer);
  sunburstContainer.style.width = '100%';
  sunburstContainer.style.minHeight = '720px';
  sunburstContainer.style.height = 'min(78vh, 840px)';
  let answers = [];
  if (Array.isArray(sourceAnswers) && sourceAnswers.length > 0) {
    answers = sourceAnswers
      .filter(item => item && Array.isArray(item.options))
      .map(item => ({
        answerIndex: item.answerIndex,
        domaine: item.domaine,
        echelle: item.echelle,
        options: item.options
      }));
  } else {
    const form = getCopsoqForm();
    if (!form) {
      console.warn('COPSOQ form container is missing; sunburst chart cannot be built.');
      return;
    }
    const formData = new FormData(form);
    for (let i = 0; i < displayedQuestions.length; i++) {
      const answerIndex = formData.get(`q${i}`);
      if (answerIndex === null) continue;
      const q = displayedQuestions[i];
      const numericIndex = parseInt(answerIndex, 10);
      answers.push({
        answerIndex: numericIndex,
        domaine: q.domaine,
        echelle: q.echelle,
        options: q.options
      });
    }
  }
  const grouped = {};
  answers.forEach(item => {
    if (!grouped[item.domaine]) grouped[item.domaine] = {};
    if (!grouped[item.domaine][item.echelle]) grouped[item.domaine][item.echelle] = [];
    grouped[item.domaine][item.echelle].push(item);
  });
  const labels = [];
  const parents = [];
  const values = [];
  const colors = [];
  const domainScores = {};
  Object.keys(grouped).forEach(domain => {
    const domainLabel = domain;
    const domainIndex = labels.length;
    labels.push(domainLabel);
    parents.push("");
    values.push(0);
    colors.push("#2f5874");
    const scaleEntries = grouped[domain];
    const scaleScores = [];
    Object.keys(scaleEntries).forEach(scale => {
      const items = scaleEntries[scale];
      const score = Math.round(items.reduce((sum, item) => sum + getScoreForAnswer(item, item.answerIndex), 0) / items.length);
      labels.push(scale);
      parents.push(domainLabel);
      values.push(score);
      colors.push(getScoreColor(score));
      scaleScores.push(score);
    });
    const domainScore = scaleScores.length
      ? Math.round(scaleScores.reduce((sum, value) => sum + value, 0) / scaleScores.length)
      : 0;
    domainScores[domain] = {
      total: scaleScores.reduce((sum, value) => sum + value, 0),
      count: scaleScores.length
    };
    colors[domainIndex] = getScoreColor(domainScore);
  });
  const trace = {
    type: 'sunburst',
    labels,
    parents,
    values,
    branchvalues: 'remainder',
    marker: { colors },
    leaf: { opacity: 1 },
    textinfo: 'label',
    sort: false,
    hovertemplate: '%{label}<extra></extra>'
  };
  sunburstContainer.style.display = 'block';
  Plotly.purge(sunburstContainer);
  Plotly.newPlot(sunburstContainer, [trace], {
    autosize: true,
    height: Math.max(650, Math.round(window.innerHeight * 0.72)),
    margin: { l: 0, r: 0, t: 0, b: 0 },
    paper_bgcolor: 'rgba(255,255,255,1)',
    plot_bgcolor: 'rgba(255,255,255,1)',
    font: { size: 16 }
  }, {
    responsive: true,
    sendDataToCloud: false,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `copsoq_sunburst-${Date.now()}`,
      scale: 1
    },
    modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'resetScale2d', 'toggleHover', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toImage'],
    modeBarButtonsToAdd: [
      getPlotImageExportButton(sunburstContainer, {
        title: getCopsoqSunburstExportTitle(),
        legendTitle: currentLang === 'en' ? 'Legend' : 'Légende',
        legendItems: getCopsoqScoreExportLegendItems(),
        filename: `copsoq_sunburst-${Date.now()}`,
        width: 1600,
        height: 1600,
      }),
      {
      name: 'fullscreen',
      title: currentLang === 'en' ? 'Full screen' : 'Visualiser en plein écran',
      icon: {
        width: 500,
        height: 500,
        path: 'M0,0 L150,0 L150,50 L50,50 L50,150 L0,150 Z M350,0 L500,0 L500,150 L450,150 L450,50 L350,50 Z M0,350 L50,350 L50,450 L150,450 L150,500 L0,500 Z M450,350 L500,350 L500,500 L350,500 L350,450 L450,450 Z'
      },
      click: function() {
        const container = document.getElementById('myDiv');
        toggleCopsoqFullscreen(container);
      }
      },
    ],
    scrollZoom: false,
    displayModeBar: true
  }).then(() => {
    requestAnimationFrame(() => Plotly.Plots.resize(sunburstContainer));
  });
}
