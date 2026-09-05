const diagramContainer = document.querySelector("#architecture-diagram");
const diagramSummary = document.querySelector("#diagram-summary");
const structureSummary = document.querySelector("#structure-summary");
const globalViewSelect = document.querySelector("#global-view-select");
const folderTreeToggle = document.querySelector("#folder-tree-toggle");
const folderTreePanel = document.querySelector("#folder-tree-panel");
const folderTreeContainer = document.querySelector("#folder-tree");
const folderTreeResizer = document.querySelector("#folder-tree-resizer");
const runtimeTerminal = document.querySelector("#runtime-terminal");
const terminalFileName = document.querySelector("#terminal-file-name");
const terminalOutput = document.querySelector("#terminal-output");
const terminalClose = document.querySelector("#terminal-close");
let maximizedFileState = null;
let isApplyingGlobalView = false;
let activeRuntimeRun = null;
let activeCompileRun = null;
let activeZTypeSession = null;
let activeDiagramBuilderSession = null;
const folderCollapsedState = new Map();
let selectedFilePath = null;
const FOLDER_TREE_WIDTH_STORAGE_KEY = "codeheartbeat-folder-tree-width";
const FOLDER_TREE_MIN_WIDTH = 180;
const FOLDER_TREE_DEFAULT_WIDTH = 250;

function getFolderTreeMaxWidth() {
  return Math.max(FOLDER_TREE_MIN_WIDTH, Math.min(640, window.innerWidth - 240));
}

function setFolderTreeWidth(width, persist = true) {
  const nextWidth = Math.round(Math.min(getFolderTreeMaxWidth(), Math.max(FOLDER_TREE_MIN_WIDTH, width)));
  document.documentElement.style.setProperty("--folder-tree-width", `${nextWidth}px`);
  folderTreeResizer.setAttribute("aria-valuenow", String(nextWidth));
  folderTreeResizer.setAttribute("aria-valuemax", String(getFolderTreeMaxWidth()));
  if (persist) {
    try {
      window.localStorage.setItem(FOLDER_TREE_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch {
      // Die Breite funktioniert auch dann, wenn lokaler Speicher gesperrt ist.
    }
  }
  window.requestAnimationFrame(drawAllDeclarationLanes);
}

function restoreFolderTreeWidth() {
  let savedWidth = FOLDER_TREE_DEFAULT_WIDTH;
  try {
    const storedValue = Number.parseInt(window.localStorage.getItem(FOLDER_TREE_WIDTH_STORAGE_KEY), 10);
    if (Number.isFinite(storedValue)) savedWidth = storedValue;
  } catch {
    // Der Standardwert bleibt aktiv.
  }
  setFolderTreeWidth(savedWidth, false);
}

const UML_VIEWS = {
  class: "Klassendiagramm",
  state: "Zustandsdiagramm",
  usecase: "Use-Case-Diagramm",
  activity: "Aktivitätsdiagramm",
  sequence: "Sequenzdiagramm",
  nassi: "Nassi-Shneiderman-Diagramm",
  pap: "Programmablaufplan (PAP)",
  pseudocode: "Pseudocode"
};

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "break", "case", "catch", "class", "const", "continue",
  "default", "do", "else", "enum", "extends", "final", "finally", "for", "goto",
  "if", "implements", "import", "instanceof", "interface", "native", "new", "package",
  "private", "protected", "public", "record", "return", "sealed", "static", "strictfp",
  "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try",
  "var", "volatile", "while", "yield"
]);

const JAVA_PRIMITIVES = new Set([
  "boolean", "byte", "char", "double", "float", "int", "long", "short", "void"
]);

const JAVA_LITERALS = new Set(["true", "false", "null"]);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function syntaxToken(type, value) {
  return `<span class="syntax-${type}">${escapeHtml(value)}</span>`;
}

function highlightJavaLine(line, state) {
  let result = "";
  let index = 0;

  while (index < line.length) {
    if (state.inBlockComment) {
      const commentEnd = line.indexOf("*/", index);
      if (commentEnd < 0) {
        result += syntaxToken("comment", line.slice(index));
        return result || " ";
      }
      result += syntaxToken("comment", line.slice(index, commentEnd + 2));
      state.inBlockComment = false;
      index = commentEnd + 2;
      continue;
    }

    if (line.startsWith("//", index)) {
      result += syntaxToken("comment", line.slice(index));
      break;
    }

    if (line.startsWith("/*", index)) {
      const commentEnd = line.indexOf("*/", index + 2);
      if (commentEnd < 0) {
        result += syntaxToken("comment", line.slice(index));
        state.inBlockComment = true;
        break;
      }
      result += syntaxToken("comment", line.slice(index, commentEnd + 2));
      index = commentEnd + 2;
      continue;
    }

    const character = line[index];

    if (character === '"' || character === "'") {
      const quote = character;
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === "\\") {
          end += 2;
          continue;
        }
        end++;
        if (line[end - 1] === quote) break;
      }
      result += syntaxToken(quote === '"' ? "string" : "character", line.slice(index, end));
      index = end;
      continue;
    }

    const rest = line.slice(index);
    const annotation = rest.match(/^@[A-Za-z_$][\w$]*/);
    if (annotation) {
      result += syntaxToken("annotation", annotation[0]);
      index += annotation[0].length;
      continue;
    }

    const number = rest.match(/^(?:0[xX][\dA-Fa-f_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)[fFdDlL]?/);
    if (number) {
      result += syntaxToken("number", number[0]);
      index += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[A-Za-z_$][\w$]*/);
    if (identifier) {
      const word = identifier[0];
      const afterWord = line.slice(index + word.length);
      let type = "identifier";

      if (JAVA_KEYWORDS.has(word)) type = "keyword";
      else if (JAVA_PRIMITIVES.has(word)) type = "primitive";
      else if (JAVA_LITERALS.has(word)) type = "literal";
      else if (/^[A-Z]/.test(word)) type = "type";
      else if (/^\s*\(/.test(afterWord)) type = "method";

      result += type === "identifier" ? escapeHtml(word) : syntaxToken(type, word);
      index += word.length;
      continue;
    }

    if (/[+\-*/%=!<>&|?:~^]/.test(character)) {
      result += syntaxToken("operator", character);
    } else {
      result += escapeHtml(character);
    }
    index++;
  }

  return result || " ";
}

function countNodes(node, type) {
  const ownCount = node.type === type ? 1 : 0;
  return ownCount + (node.children || []).reduce(
    (total, child) => total + countNodes(child, type),
    0
  );
}

function countClasses(node) {
  const ownCount = node.type === "file" ? extractClasses(node.content).length : 0;
  return ownCount + (node.children || []).reduce((total, child) => total + countClasses(child), 0);
}

function extractClasses(source = "") {
  const classes = [];
  const classPattern = /\b(?:public\s+)?(?:(?:abstract|final|sealed|non-sealed)\s+)*(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g;
  let match;

  while ((match = classPattern.exec(source)) !== null) {
    classes.push({ kind: match[1], name: match[2] });
  }

  return classes;
}

function neutralizeJavaLines(lines) {
  const state = { inBlockComment: false };

  return lines.map((line) => {
    let result = "";
    let index = 0;

    while (index < line.length) {
      if (state.inBlockComment) {
        const commentEnd = line.indexOf("*/", index);
        if (commentEnd < 0) return result.padEnd(line.length, " ");
        result += " ".repeat(commentEnd + 2 - index);
        state.inBlockComment = false;
        index = commentEnd + 2;
        continue;
      }

      if (line.startsWith("//", index)) {
        return result.padEnd(line.length, " ");
      }

      if (line.startsWith("/*", index)) {
        const commentEnd = line.indexOf("*/", index + 2);
        if (commentEnd < 0) {
          state.inBlockComment = true;
          return result.padEnd(line.length, " ");
        }
        result += " ".repeat(commentEnd + 2 - index);
        index = commentEnd + 2;
        continue;
      }

      if (line[index] === '"' || line[index] === "'") {
        const quote = line[index];
        let end = index + 1;
        while (end < line.length) {
          if (line[end] === "\\") {
            end += 2;
            continue;
          }
          end++;
          if (line[end - 1] === quote) break;
        }
        result += " ".repeat(end - index);
        index = end;
        continue;
      }

      result += line[index];
      index++;
    }

    return result;
  });
}

function analyzeDeclarations(lines) {
  const codeLines = neutralizeJavaLines(lines);
  const declarations = [];
  let declarationId = 0;

  codeLines.forEach((line, lineIndex) => {
    const classMatch = line.match(/\b(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/);
    if (classMatch) {
      declarations.push({
        id: `declaration-${declarationId++}`,
        kind: "class",
        name: classMatch[2],
        lineIndex,
        usages: []
      });
    }

    const methodMatch = line.match(/^\s*(?:(?:public|protected|private|static|final|abstract|synchronized|native)\s+)*(?:[A-Za-z_$][\w$<>,?.\[\]]*|void)\s+([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*(?:throws\s+[^\{]+)?\s*\{/);
    if (methodMatch) {
      declarations.push({
        id: `declaration-${declarationId++}`,
        kind: "method",
        name: methodMatch[1],
        lineIndex,
        usages: []
      });
    }

    const variablePattern = /\b(?:boolean|byte|char|double|float|int|long|short|String|[A-Z][\w$]*(?:<[^>]+>)?)\s+([A-Za-z_$][\w$]*)\s*(?==|;|:|,)/g;
    let variableMatch;
    while ((variableMatch = variablePattern.exec(line)) !== null) {
      declarations.push({
        id: `declaration-${declarationId++}`,
        kind: "variable",
        name: variableMatch[1],
        lineIndex,
        usages: []
      });
    }
  });

  declarations.forEach((declaration) => {
    const escapedName = declaration.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const usagePattern = declaration.kind === "method"
      ? new RegExp(`\\b${escapedName}\\s*\\(`)
      : new RegExp(`\\b${escapedName}\\b`);

    codeLines.forEach((line, lineIndex) => {
      if (lineIndex !== declaration.lineIndex && usagePattern.test(line)) {
        declaration.usages.push(lineIndex);
      }
    });
  });

  return declarations;
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, value));
  return element;
}

function drawDeclarationLanes(sourceRegion) {
  const canvas = sourceRegion.querySelector(".source-code-canvas");
  const overlay = sourceRegion.querySelector(".declaration-lanes");
  const sourceLines = [...sourceRegion.querySelectorAll(".source-code li")];
  const declarations = sourceRegion.laneDeclarations || [];
  const runtimeArtifacts = [...overlay.querySelectorAll(".runtime-code-trail, .runtime-trace-point, .compile-trace-point")];

  overlay.replaceChildren();
  if (!canvas || !canvas.offsetParent) return;

  const canvasRect = canvas.getBoundingClientRect();
  const zoomLevel = Number(sourceRegion.closest(".file-code-pane")?.dataset.zoom || 1);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  overlay.setAttribute("width", String(width));
  overlay.setAttribute("height", String(height));

  declarations.forEach((declaration, declarationIndex) => {
    if (!declaration.usages.length) return;
    const declarationLine = sourceLines[declaration.lineIndex];
    if (!declarationLine) return;

    const declarationContent = declarationLine.querySelector(".code-line-content");
    if (!declarationContent) return;
    const declarationRect = declarationContent.getBoundingClientRect();
    const startY = (declarationRect.top - canvasRect.top + declarationRect.height / 2) / zoomLevel;
    const startX = (declarationRect.right - canvasRect.left) / zoomLevel + 5;
    const laneX = width - 24 - (declarationIndex % 5) * 10;

    declaration.usages.forEach((usageLineIndex) => {
      const usageLine = sourceLines[usageLineIndex];
      if (!usageLine) return;
      const usageContent = usageLine.querySelector(".code-line-content");
      if (!usageContent) return;
      const usageRect = usageContent.getBoundingClientRect();
      const endX = (usageRect.right - canvasRect.left) / zoomLevel + 5;
      const endY = (usageRect.top - canvasRect.top + usageRect.height / 2) / zoomLevel;
      const laneClass = `lane-${declaration.kind}`;
      const path = createSvgElement("path", {
        class: `declaration-lane ${laneClass}`,
        d: `M ${startX} ${startY} C ${laneX} ${startY}, ${laneX} ${endY}, ${endX} ${endY}`,
        "data-declaration-id": declaration.id,
        "data-usage-line-index": usageLineIndex
      });
      const startPoint = createSvgElement("circle", {
        class: `lane-point ${laneClass}`,
        cx: startX,
        cy: startY,
        r: 3
      });
      const endPoint = createSvgElement("circle", {
        class: `lane-point lane-caller ${laneClass}`,
        cx: endX,
        cy: endY,
        r: 3
      });
      const callerLabel = createSvgElement("text", {
        class: `lane-label ${laneClass}`,
        x: endX + 7,
        y: endY + 3
      });
      callerLabel.textContent = "Caller";
      overlay.append(path, startPoint, endPoint, callerLabel);
    });
  });
  runtimeArtifacts.forEach((artifact) => overlay.append(artifact));
}

function drawAllDeclarationLanes() {
  document.querySelectorAll(".file-source").forEach(drawDeclarationLanes);
}

function createClassNode(classInfo) {
  const classNode = document.createElement("div");
  const classKind = document.createElement("span");
  const className = document.createElement("strong");

  classNode.className = "class-node";
  classKind.className = "class-kind";
  classKind.textContent = classInfo.kind;
  className.textContent = classInfo.name;
  classNode.append(classKind, className);
  return classNode;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function compactCodeLabel(value, maxLength = 44) {
  const label = value.replace(/\s+/g, " ").trim();
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function analyzeUmlModel(file) {
  const lines = file.content.replace(/\r/g, "").split("\n");
  const codeLines = neutralizeJavaLines(lines);
  const classes = extractClasses(file.content);
  const methods = [];
  const attributes = [];
  const variables = [];
  const controls = [];
  const outputs = [];
  const className = classes[0]?.name || file.name.replace(/\.java$/i, "");
  const classLineIndex = Math.max(0, codeLines.findIndex((line) => /\b(?:class|interface|enum|record)\s+[A-Za-z_$][\w$]*/.test(line)));
  const braceDepths = [];
  let braceDepth = 0;

  codeLines.forEach((line) => {
    braceDepths.push(braceDepth);
    for (const character of line) {
      if (character === "{") braceDepth++;
      if (character === "}") braceDepth--;
    }
  });

  let classBodyDepth = null;
  for (let lineIndex = classLineIndex; lineIndex < codeLines.length; lineIndex++) {
    if (codeLines[lineIndex].includes("{")) {
      classBodyDepth = braceDepths[lineIndex] + 1;
      break;
    }
  }
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const constructorPattern = new RegExp(`^\\s*(?:(?:public|protected|private)\\s+)?${escapedClassName}\\s*\\(`);

  codeLines.forEach((line, lineIndex) => {
    const methodMatch = line.match(/^\s*(?:(public|protected|private)\s+)?(?:(?:static|final|abstract|synchronized|native)\s+)*(?:([A-Za-z_$][\w$<>,?.\[\]]*)|void)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
    if (methodMatch) {
      methods.push({
        visibility: methodMatch[1] === "private" ? "−" : methodMatch[1] === "protected" ? "#" : "+",
        name: methodMatch[3],
        parameters: compactCodeLabel(methodMatch[4], 26),
        returnType: methodMatch[2] || "void",
        lineIndex
      });
    }

    const isCallableDeclaration = Boolean(methodMatch) || constructorPattern.test(line);
    if (!isCallableDeclaration) {
      const variablePattern = /\b(boolean|byte|char|double|float|int|long|short|String|[A-Z][\w$]*(?:<[^>]+>)?)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*([^;]+))?[;,:]/g;
      let variableMatch;
      while ((variableMatch = variablePattern.exec(line)) !== null) {
        const variable = {
          type: variableMatch[1],
          name: variableMatch[2],
          initial: variableMatch[3] ? compactCodeLabel(variableMatch[3], 20) : "",
          lineIndex
        };
        if (!variables.some((item) => item.name === variable.name && item.lineIndex === lineIndex)) variables.push(variable);
        if (braceDepths[lineIndex] === classBodyDepth && !attributes.some((item) => item.name === variable.name)) {
          attributes.push(variable);
        }
      }
    }

    const trimmed = line.trim();
    const controlCandidate = trimmed.replace(/^}\s*/, "");
    if (/^(?:if|else\s+if|else\b|switch|case\b|default\b|for|while|do\b)/.test(controlCandidate)) {
      let blockEndLine = lineIndex;
      const openingBraceIndex = line.indexOf("{");
      if (openingBraceIndex >= 0) {
        let depth = 0;
        let foundOpeningBrace = false;
        for (let candidateIndex = lineIndex; candidateIndex < codeLines.length; candidateIndex++) {
          const candidate = candidateIndex === lineIndex ? codeLines[candidateIndex].slice(openingBraceIndex) : codeLines[candidateIndex];
          for (const character of candidate) {
            if (character === "{") {
              depth++;
              foundOpeningBrace = true;
            } else if (character === "}") {
              depth--;
            }
          }
          if (foundOpeningBrace && depth === 0) {
            blockEndLine = candidateIndex;
            break;
          }
        }
      }
      controls.push({ label: compactCodeLabel(controlCandidate.replace(/\{$/, "")), lineIndex, blockEndLine });
    }

    const outputMatch = lines[lineIndex].match(/System\.out\.(?:print|println)\s*\((.+)\)\s*;/);
    if (outputMatch) outputs.push({
      label: compactCodeLabel(outputMatch[1].replace(/^"|"$/g, "")),
      expression: compactCodeLabel(outputMatch[1], 34),
      lineIndex
    });
  });

  return {
    className,
    classKind: classes[0]?.kind || "class",
    classLineIndex,
    mainLineIndex: methods.find((method) => method.name === "main")?.lineIndex,
    methods,
    attributes,
    variables,
    controls,
    outputs
  };
}

function markUmlSource(element, lineIndex) {
  if (Number.isInteger(lineIndex)) element.dataset.sourceLine = String(lineIndex);
  return element;
}

function markUmlSources(element, lineIndices = []) {
  const sources = [...new Set(lineIndices.filter(Number.isInteger))];
  if (sources.length) element.dataset.sourceLines = sources.join(" ");
  return element;
}

function createFlowArrow(label = "Effekt") {
  const transition = createElement("span", "uml-flow-arrow");
  transition.append(
    createElement("small", "uml-transition-label", label),
    createElement("span", "uml-transition-line")
  );
  return transition;
}

function createClassDiagram(model) {
  const diagram = createElement("div", "uml-class-diagram");
  const box = createElement("div", "uml-class-box");
  const title = markUmlSource(createElement("div", "uml-class-title"), model.classLineIndex);
  if (model.classKind !== "class") title.append(createElement("small", "uml-stereotype", `«${model.classKind}»`));
  title.append(createElement("strong", "", model.className));

  const attributes = createElement("div", "uml-class-compartment");
  (model.attributes.length ? model.attributes : [{ name: "keine Attribute", type: "" }]).forEach((attribute) => {
    attributes.append(markUmlSource(createElement(
      "span",
      attribute.type ? "" : "uml-muted",
      attribute.type ? `− ${attribute.name}: ${attribute.type}${attribute.initial ? ` = ${attribute.initial}` : ""}` : attribute.name
    ), attribute.lineIndex));
  });

  const methods = createElement("div", "uml-class-compartment");
  (model.methods.length ? model.methods : [{ name: "keine Methoden", returnType: "", parameters: "", visibility: "" }]).forEach((method) => {
    methods.append(markUmlSource(createElement(
      "span",
      method.returnType ? "" : "uml-muted",
      method.returnType ? `${method.visibility} ${method.name}(${method.parameters}): ${method.returnType}` : method.name
    ), method.lineIndex));
  });

  box.append(title, attributes, methods);
  diagram.append(box);
  return diagram;
}

function createStateDiagram(model) {
  const diagram = createElement("div", "uml-state-diagram");
  const placeholder = markUmlSource(createElement("section", "uml-state-placeholder"), model.classLineIndex);
  if (Number.isInteger(model.mainLineIndex)) placeholder.dataset.sourceAlias = String(model.mainLineIndex);
  const symbol = createElement("div", "uml-state-placeholder-symbol");
  symbol.append(createElement("span", "uml-state-placeholder-dot"), createElement("span", "uml-state-placeholder-line"));
  const content = createElement("div", "uml-state-placeholder-content");
  content.append(
    createElement("strong", "", "Keine Objektzustände erkannt"),
    createElement("p", "", `${model.className} beschreibt Verhalten, aber noch keinen zustandsbehafteten Objektlebenszyklus.`)
  );
  const hint = createElement("div", "uml-state-placeholder-hint");
  hint.append(
    createElement("span", "", "Methoden"),
    createElement("b", "", "→"),
    createElement("span", "", "später Auslöser oder Verhalten von Übergängen")
  );
  const requirement = createElement("small", "uml-state-placeholder-requirement", "Ein echtes Zustandsdiagramm wird aus einem dauerhaften Statusmerkmal und erkennbaren Zustandswechseln abgeleitet, zum Beispiel enum Status und status = …");
  content.append(hint, requirement);
  placeholder.append(symbol, content);
  diagram.append(placeholder);
  return diagram;
}

function createUseCaseDiagram(model) {
  const diagram = createElement("div", "uml-usecase-diagram");
  const actor = createElement("div", "uml-actor");
  markUmlSource(actor, model.classLineIndex);
  actor.append(
    createElement("span", "uml-actor-head"),
    createElement("span", "uml-actor-body"),
    createElement("span", "uml-actor-legs"),
    createElement("strong", "", "Benutzer")
  );
  const boundary = createElement("div", "uml-system-boundary");
  boundary.append(createElement("span", "uml-boundary-title", `«system» ${model.className}`));
  const decisionControls = model.controls.filter((control) => /^(?:if|else\s+if)\b/.test(control.label));
  const selectionControls = model.controls.filter((control) => /^(?:switch|case|default)\b/.test(control.label));
  const loopControls = model.controls.filter((control) => /^(?:for|while|do)\b/.test(control.label));
  const elseControls = model.controls.filter((control) => /^else\b/.test(control.label) && !/^else\s+if\b/.test(control.label));
  const useCases = [{
    label: "Programm starten",
    lineIndex: model.methods.find((method) => method.name === "main")?.lineIndex,
    sourceLines: [model.classLineIndex]
  }];
  if (decisionControls.length) useCases.push({
    label: "Bedingung auswerten",
    lineIndex: decisionControls[0].lineIndex,
    sourceLines: decisionControls.map((control) => control.lineIndex)
  });
  if (selectionControls.length) useCases.push({
    label: "Auswahl auswerten",
    lineIndex: selectionControls[0].lineIndex,
    sourceLines: selectionControls.map((control) => control.lineIndex)
  });
  if (loopControls.length) useCases.push({
    label: "Schleife ausführen",
    lineIndex: loopControls[0].lineIndex,
    sourceLines: loopControls.map((control) => control.lineIndex)
  });
  if (model.outputs.length || elseControls.length) useCases.push({
    label: "Ergebnis ausgeben",
    lineIndex: model.outputs[0]?.lineIndex ?? elseControls[0]?.lineIndex,
    sourceLines: [...model.outputs.map((output) => output.lineIndex), ...elseControls.map((control) => control.lineIndex)]
  });

  useCases.forEach((item, index) => {
    if (index > 0) {
      const include = createElement("div", "uml-include-connector");
      include.append(createElement("span", "uml-include-label", "«include»"));
      boundary.append(include);
    }
    const useCase = markUmlSources(markUmlSource(createElement("div", `uml-usecase${index === 0 ? " primary" : ""}`, item.label), item.lineIndex), item.sourceLines);
    boundary.append(useCase);
  });
  diagram.append(actor, createElement("span", "uml-association uml-primary-association"), boundary);
  return diagram;
}

function createActivityDiagram(model) {
  const diagram = createElement("div", "uml-activity-diagram");
  const steps = [
    { label: "", kind: "start", lineIndex: model.classLineIndex, sourceAlias: model.mainLineIndex },
    ...model.variables.map((variable) => ({ label: `${variable.name}${variable.initial ? ` = ${variable.initial}` : " setzen"}`, kind: "action", lineIndex: variable.lineIndex })),
    ...model.controls.map((control) => ({
      label: compactCodeLabel(control.label, 34),
      kind: /^(?:for|while|do)\b/.test(control.label) ? "decision loop" : "decision",
      lineIndex: control.lineIndex
    })),
    ...model.outputs.map((output) => ({ label: `Ausgabe: ${compactCodeLabel(output.label, 28)}`, kind: "action", lineIndex: output.lineIndex })),
    { label: "", kind: "end" }
  ];

  steps.forEach((step, index) => {
    const activityNode = markUmlSource(createElement("div", `uml-activity-node ${step.kind}`), step.lineIndex);
    if (step.label) activityNode.append(createElement("span", "uml-activity-label", step.label));
    if (Number.isInteger(step.sourceAlias)) activityNode.dataset.sourceAlias = String(step.sourceAlias);
    diagram.append(activityNode);
    if (index < steps.length - 1) {
      const flow = createElement("span", "uml-activity-arrow");
      if (step.kind.includes("decision")) flow.append(createElement("small", "uml-guard-label", step.kind.includes("loop") ? "[weitere Iteration]" : "[Bedingung erfüllt]"));
      diagram.append(flow);
    }
  });
  return diagram;
}

function createSequenceDiagram(model) {
  const diagram = createElement("div", "uml-sequence-diagram");
  const lifelines = createElement("div", "uml-lifelines");
  ["Benutzer", `:${model.className}`, ":System.out"].forEach((name, index) => {
    const lifeline = createElement("div", `uml-lifeline${index === 0 ? " actor-lifeline" : ""}`);
    const participant = index === 0 ? createElement("div", "uml-sequence-actor") : createElement("strong", "uml-object-head", name);
    if (index === 0) {
      participant.append(
        createElement("span", "uml-actor-head"),
        createElement("span", "uml-actor-body"),
        createElement("span", "uml-actor-legs"),
        createElement("strong", "", name)
      );
      markUmlSource(participant, model.classLineIndex);
    }
    const line = createElement("span", "uml-lifeline-line");
    line.append(createElement("span", "uml-activation-bar"));
    lifeline.append(participant, line);
    lifelines.append(lifeline);
  });

  const messages = createElement("div", "uml-sequence-messages");
  const mainMessage = markUmlSource(createElement("div", "uml-message to-middle", "main(args)"), model.methods.find((method) => method.name === "main")?.lineIndex);
  messages.append(mainMessage);

  const consumedOutputs = new Set();
  const renderableControls = model.controls.filter((control) => !/^switch\b/.test(control.label));
  const sequenceBlocks = renderableControls.map((control, controlIndex) => {
    const nextControlLine = renderableControls[controlIndex + 1]?.lineIndex ?? Number.POSITIVE_INFINITY;
    const isCase = /^(?:case|default)\b/.test(control.label);
    const rangeEnd = isCase
      ? nextControlLine
      : Math.min(nextControlLine, Number.isInteger(control.blockEndLine) ? control.blockEndLine + 1 : nextControlLine);
    const outputs = model.outputs.filter((output) => {
      const belongsToControl = output.lineIndex >= control.lineIndex && output.lineIndex < rangeEnd;
      if (!belongsToControl || consumedOutputs.has(output)) return false;
      consumedOutputs.add(output);
      return true;
    });
    return { kind: "control", lineIndex: control.lineIndex, control, outputs };
  });
  model.outputs.forEach((output) => {
    if (!consumedOutputs.has(output)) sequenceBlocks.push({ kind: "output", lineIndex: output.lineIndex, output });
  });
  sequenceBlocks.sort((left, right) => left.lineIndex - right.lineIndex);

  sequenceBlocks.forEach((block) => {
    if (block.kind === "output") {
      const outputMessage = markUmlSource(createElement("div", "uml-message to-right", `println(${compactCodeLabel(block.output.label, 20)})`), block.output.lineIndex);
      messages.append(outputMessage);
      return;
    }

    const label = compactCodeLabel(block.control.label, 32);
    const fragmentType = /^(?:for|while|do)\b/.test(label) ? "loop" : /^(?:else|case|default)\b/.test(label) ? "alt" : "if";
    const fragment = markUmlSource(createElement("div", "uml-message uml-fragment"), block.control.lineIndex);
    fragment.append(
      createElement("span", "uml-fragment-tag", fragmentType),
      createElement("span", "uml-fragment-label", label)
    );
    const fragmentBody = createElement("div", "uml-fragment-body");
    block.outputs.forEach((output) => {
      fragmentBody.append(markUmlSource(
        createElement("div", "uml-message to-right uml-fragment-request", `println(${compactCodeLabel(output.label, 20)})`),
        output.lineIndex
      ));
    });
    fragment.append(fragmentBody);
    messages.append(fragment);
  });
  diagram.append(lifelines, messages);
  return diagram;
}

function createNassiShneidermanDiagram(model) {
  const diagram = createElement("div", "uml-nsd-diagram");
  const frame = createElement("div", "nsd-frame");
  const title = markUmlSource(createElement("div", "nsd-title"), model.classLineIndex);
  title.textContent = `${model.className}.main(String[] args)`;
  if (Number.isInteger(model.mainLineIndex)) title.dataset.sourceAlias = String(model.mainLineIndex);
  frame.append(title);

  const blocks = [
    ...model.variables.map((attribute) => ({
      kind: "statement",
      label: `${attribute.type} ${attribute.name}${attribute.initial ? ` = ${attribute.initial}` : ""}`,
      lineIndex: attribute.lineIndex
    })),
    ...model.controls.map((control) => ({
      kind: /^(?:for|while|do)\b/.test(control.label) ? "loop" : "decision",
      label: compactCodeLabel(control.label, 42),
      lineIndex: control.lineIndex
    })),
    ...model.outputs.map((output) => ({
      kind: "statement",
      label: `Ausgabe: ${compactCodeLabel(output.label, 34)}`,
      lineIndex: output.lineIndex
    }))
  ].sort((left, right) => left.lineIndex - right.lineIndex);

  blocks.forEach((block) => {
    if (block.kind === "decision") {
      const decision = markUmlSource(createElement("div", "nsd-decision"), block.lineIndex);
      const head = createElement("div", "nsd-decision-head");
      head.append(
        createElement("strong", "nsd-condition", block.label),
        createElement("span", "nsd-branch-label nsd-branch-yes", "wahr"),
        createElement("span", "nsd-branch-label nsd-branch-no", "falsch")
      );
      const branches = createElement("div", "nsd-decision-branches");
      branches.append(createElement("span", "nsd-branch-cell"), createElement("span", "nsd-branch-cell"));
      decision.append(head, branches);
      frame.append(decision);
      return;
    }

    if (block.kind === "loop") {
      const loop = markUmlSource(createElement("div", "nsd-loop"), block.lineIndex);
      loop.append(
        createElement("div", "nsd-loop-head", `solange ${block.label}`),
        createElement("div", "nsd-loop-body", "Schleifenrumpf")
      );
      frame.append(loop);
      return;
    }

    frame.append(markUmlSource(createElement("div", "nsd-statement", block.label), block.lineIndex));
  });

  if (!blocks.length) frame.append(createElement("div", "nsd-statement uml-muted", "Keine ausführbaren Anweisungen"));
  diagram.append(frame);
  return diagram;
}

function cleanPapCondition(label) {
  return compactCodeLabel(label
    .replace(/^}\s*/, "")
    .replace(/\s*\{$/, "")
    .replace(/^else\s+if\s*\((.*)\)$/, "$1")
    .replace(/^if\s*\((.*)\)$/, "$1")
    .replace(/^switch\s*\((.*)\)$/, "$1")
    .replace(/^case\s+(.+?)\s*->.*$/, "$1")
    .replace(/^else$/, "Sonst-Fall")
    .replace(/^default.*$/, "Sonst-Fall"), 34);
}

function buildPapDecisionGroups(model) {
  const controls = [...model.controls].sort((left, right) => left.lineIndex - right.lineIndex);
  const groups = [];

  for (let index = 0; index < controls.length; index += 1) {
    const control = controls[index];
    if (/^(?:for|while|do)\b/.test(control.label)) continue;

    if (/^if\b/.test(control.label)) {
      const branches = [control];
      while (index + 1 < controls.length && /^else(?:\s+if)?\b/.test(controls[index + 1].label)) {
        branches.push(controls[index + 1]);
        index += 1;
      }
      groups.push({ kind: "if", title: "Verzweigung", branches, lineIndex: control.lineIndex });
      continue;
    }

    if (/^switch\b/.test(control.label)) {
      const branches = [];
      while (index + 1 < controls.length && /^(?:case|default)\b/.test(controls[index + 1].label)) {
        branches.push(controls[index + 1]);
        index += 1;
      }
      groups.push({ kind: "switch", title: cleanPapCondition(control.label), branches: branches.length ? branches : [control], lineIndex: control.lineIndex });
      continue;
    }

    if (/^(?:case|default|else)\b/.test(control.label)) {
      groups.push({ kind: "single", title: "Verzweigung", branches: [control], lineIndex: control.lineIndex });
    }
  }

  groups.forEach((group) => {
    group.branches.forEach((branch, branchIndex) => {
      const nextBranchLine = group.branches[branchIndex + 1]?.lineIndex ?? Number.POSITIVE_INFINITY;
      branch.action = model.outputs.find((output) => output.lineIndex >= branch.lineIndex && output.lineIndex < nextBranchLine) || null;
    });
  });
  return groups;
}

function createPapDecisionTable(group) {
  const table = createElement("table", "pap-decision-table");
  table.dataset.sourceLine = String(group.lineIndex);
  const columns = document.createElement("colgroup");
  const head = document.createElement("thead");
  const titleRow = document.createElement("tr");
  const ruleRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const isFallbackBranch = (branch) => /^else\s*$/.test(branch.label.trim()) || /^default\b/.test(branch.label.trim());
  const hasFallback = group.branches.some(isFallbackBranch);
  const conditionBranches = group.branches.filter((branch) => !isFallbackBranch(branch));
  const actionBranches = [...group.branches];
  if (!hasFallback) actionBranches.push({ label: "Fortfahren", action: null, lineIndex: null });
  const ruleCount = Math.max(1, actionBranches.length);
  columns.append(createElement("col", "pap-band-column"), createElement("col", "pap-label-column"));
  for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex += 1) columns.append(createElement("col", "pap-rule-column"));
  const tableTitle = document.createElement("th");
  const rulesTitle = document.createElement("th");
  tableTitle.className = "pap-table-title";
  tableTitle.colSpan = 2;
  tableTitle.rowSpan = 2;
  tableTitle.textContent = "Entscheidungstabelle";
  rulesTitle.className = "pap-rules-title";
  rulesTitle.colSpan = ruleCount;
  rulesTitle.textContent = "Regeln";
  titleRow.append(tableTitle, rulesTitle);

  for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex += 1) {
    const rule = document.createElement("th");
    rule.className = "pap-rule-head";
    rule.textContent = `R${ruleIndex + 1}`;
    ruleRow.append(rule);
  }
  head.append(titleRow, ruleRow);

  const conditions = conditionBranches.length ? conditionBranches : [{ label: group.title, lineIndex: group.lineIndex }];
  conditions.forEach((condition, conditionIndex) => {
    const row = markUmlSource(document.createElement("tr"), condition.lineIndex);
    if (conditionIndex === 0) {
      const band = document.createElement("th");
      band.className = "pap-group-band pap-condition-band";
      band.rowSpan = conditions.length;
      band.textContent = "Bedingungen";
      row.append(band);
    }
    const label = document.createElement("th");
    label.className = "pap-row-label";
    label.textContent = cleanPapCondition(condition.label);
    row.append(label);
    for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex += 1) {
      const cell = document.createElement("td");
      cell.textContent = ruleIndex < conditionIndex ? "-" : ruleIndex === conditionIndex ? "j" : "n";
      row.append(cell);
    }
    body.append(row);
  });

  const separator = document.createElement("tr");
  separator.className = "pap-table-separator";
  const separatorCell = document.createElement("td");
  separatorCell.colSpan = ruleCount + 2;
  separator.append(separatorCell);
  body.append(separator);

  actionBranches.forEach((branch, actionIndex) => {
    const action = branch.action;
    const row = markUmlSource(document.createElement("tr"), action?.lineIndex);
    if (actionIndex === 0) {
      const band = document.createElement("th");
      band.className = "pap-group-band pap-action-band";
      band.rowSpan = actionBranches.length;
      band.textContent = "Aktionen";
      row.append(band);
    }
    const label = document.createElement("th");
    label.className = "pap-row-label";
    label.textContent = action ? `Ausgabe: ${compactCodeLabel(action.label, 28)}` : cleanPapCondition(branch.label);
    row.append(label);
    for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex += 1) {
      const cell = document.createElement("td");
      cell.textContent = ruleIndex === actionIndex ? "x" : "-";
      row.append(cell);
    }
    body.append(row);
  });

  table.append(columns, head, body);
  return table;
}

function createPapDiagram(model) {
  const diagram = createElement("div", "uml-pap-diagram");
  const decisionGroups = buildPapDecisionGroups(model);
  const tableActionLines = new Set(decisionGroups.flatMap((group) =>
    group.branches
      .map((branch) => branch.action?.lineIndex)
      .filter(Number.isInteger)
  ));
  const steps = [
    { kind: "start", label: "Start", lineIndex: model.classLineIndex, sourceAlias: model.mainLineIndex },
    ...model.variables.map((variable) => ({ kind: "process", label: `${variable.type} ${variable.name}${variable.initial ? ` = ${variable.initial}` : ""}`, lineIndex: variable.lineIndex })),
    ...model.controls
      .filter((control) => /^(?:for|while|do)\b/.test(control.label))
      .map((control) => ({ kind: "loop", label: compactCodeLabel(control.label, 34), lineIndex: control.lineIndex })),
    ...decisionGroups.map((group) => ({ kind: "table", group, lineIndex: group.lineIndex })),
    ...model.outputs
      .filter((output) => !tableActionLines.has(output.lineIndex))
      .map((output) => ({ kind: "output", label: `Ausgabe: ${compactCodeLabel(output.label, 30)}`, lineIndex: output.lineIndex })),
    { kind: "end", label: "Ende", lineIndex: Number.POSITIVE_INFINITY }
  ].sort((left, right) => left.lineIndex - right.lineIndex);

  steps.forEach((step, index) => {
    let node;
    if (step.kind === "table") {
      node = createElement("div", "pap-table-wrap");
      node.append(createPapDecisionTable(step.group));
    } else {
      node = markUmlSource(createElement("div", `pap-node pap-${step.kind}`), Number.isFinite(step.lineIndex) ? step.lineIndex : null);
      node.append(createElement("span", "pap-node-label", step.label));
      if (Number.isInteger(step.sourceAlias)) node.dataset.sourceAlias = String(step.sourceAlias);
    }
    diagram.append(node);
    if (index < steps.length - 1) diagram.append(createElement("span", "pap-flow-arrow"));
  });
  return diagram;
}

function formatPseudocodeExpression(value) {
  return value
    .trim()
    .replace(/;$/, "")
    .replace(/\bnew\s+/g, "ERZEUGE ")
    .replace(/\btrue\b/g, "WAHR")
    .replace(/\bfalse\b/g, "FALSCH")
    .replace(/\bnull\b/g, "NICHTS");
}

function formatPseudocodeCondition(value) {
  return formatPseudocodeExpression(value)
    .replace(/&&/g, " UND ")
    .replace(/\|\|/g, " ODER ")
    .replace(/!(?!=)/g, "NICHT ")
    .replace(/==/g, "=")
    .replace(/\s+/g, " ");
}

function pseudocodeStatement(rawStatement, codeStatement, className) {
  const raw = rawStatement.trim().replace(/\{\s*$/, "").replace(/;\s*$/, "");
  const code = codeStatement.trim().replace(/\{\s*$/, "").replace(/;\s*$/, "");
  if (!raw || !code) return null;
  if (/^(?:import|package)\b/.test(code)) return null;
  if (raw.startsWith("//")) return { keyword: "KOMMENTAR", text: raw.slice(2).trim() };

  const classMatch = code.match(/\b(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/);
  if (classMatch) return { keyword: "PROGRAMM", text: classMatch[2], blockLabel: "PROGRAMM" };

  const constructorMatch = code.match(new RegExp(`^\\s*(?:(?:public|protected|private)\\s+)?${className}\\s*\\(([^)]*)\\)`));
  if (constructorMatch) return { keyword: "PROZEDUR", text: `${className}(${constructorMatch[1]})`, blockLabel: "PROZEDUR" };

  const methodMatch = code.match(/^\s*(?:(?:public|protected|private|static|final|abstract|synchronized|native)\s+)*([A-Za-z_$][\w$<>,?.\[\]]*|void)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
  if (methodMatch) {
    const isProcedure = methodMatch[1] === "void";
    return {
      keyword: isProcedure ? "PROZEDUR" : "FUNKTION",
      text: `${methodMatch[2]}(${methodMatch[3]})${isProcedure ? "" : `: ${methodMatch[1]}`}`,
      blockLabel: isProcedure ? "PROZEDUR" : "FUNKTION"
    };
  }

  const parenthesized = raw.match(/\((.*)\)/)?.[1] || "";
  if (/^else\s+if\b/.test(code)) return { keyword: "SONST WENN", text: `${formatPseudocodeCondition(parenthesized)} DANN`, blockLabel: "WENN" };
  if (/^if\b/.test(code)) return { keyword: "WENN", text: `${formatPseudocodeCondition(parenthesized)} DANN`, blockLabel: "WENN" };
  if (/^else\b/.test(code)) return { keyword: "SONST", text: "", blockLabel: "WENN" };

  if (/^for\b/.test(code)) {
    const enhancedFor = parenthesized.match(/(?:final\s+)?[A-Za-z_$][\w$<>,?.\[\]]*\s+([A-Za-z_$][\w$]*)\s*:\s*(.+)/);
    return enhancedFor
      ? { keyword: "FÜR JEDES", text: `${enhancedFor[1]} AUS ${enhancedFor[2]} WIEDERHOLE`, blockLabel: "SCHLEIFE" }
      : { keyword: "FÜR", text: `${formatPseudocodeCondition(parenthesized)} WIEDERHOLE`, blockLabel: "SCHLEIFE" };
  }
  if (/^while\b/.test(code)) return { keyword: "SOLANGE", text: `${formatPseudocodeCondition(parenthesized)} WIEDERHOLE`, blockLabel: "SCHLEIFE" };
  if (/^do\b/.test(code)) return { keyword: "WIEDERHOLE", text: "", blockLabel: "SCHLEIFE" };
  if (/^switch\b/.test(code)) return { keyword: "WÄHLE", text: parenthesized, blockLabel: "AUSWAHL" };
  if (/^case\b/.test(code)) return { keyword: "FALL", text: raw.replace(/^case\s+/, "").replace(/:$/, "") };
  if (/^default\b/.test(code)) return { keyword: "SONST", text: "" };
  if (/^try\b/.test(code)) return { keyword: "VERSUCHE", text: parenthesized ? `MIT ${parenthesized}` : "", blockLabel: "VERSUCH" };
  if (/^catch\b/.test(code)) return { keyword: "FANGE", text: `${parenthesized} AB`, blockLabel: "VERSUCH" };
  if (/^finally\b/.test(code)) return { keyword: "ABSCHLIESSEND", text: "", blockLabel: "VERSUCH" };

  const outputMatch = raw.match(/System\.out\.(?:print|println)\s*\((.*)\)/);
  if (outputMatch) return { keyword: "GIB", text: `${formatPseudocodeExpression(outputMatch[1])} AUS` };
  const returnMatch = raw.match(/^return(?:\s+(.+))?$/);
  if (returnMatch) return { keyword: "GIB", text: returnMatch[1] ? `${formatPseudocodeExpression(returnMatch[1])} ZURÜCK` : "ZURÜCK" };
  const throwMatch = raw.match(/^throw\s+(.+)$/);
  if (throwMatch) return { keyword: "WIRF", text: formatPseudocodeExpression(throwMatch[1]) };
  if (/^break\b/.test(code)) return { keyword: "VERLASSE", text: "AUSWAHL ODER SCHLEIFE" };
  if (/^continue\b/.test(code)) return { keyword: "NÄCHSTE", text: "WIEDERHOLUNG" };

  const variableMatch = raw.match(/^(?:(?:public|protected|private|static|final|volatile|transient)\s+)*([A-Za-z_$][\w$?.]*(?:\s*<[^;=]+>)?(?:\[\])?)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*(.+))?$/);
  if (variableMatch) {
    return variableMatch[3]
      ? { keyword: "SETZE", text: `${variableMatch[2]}: ${variableMatch[1]} AUF ${formatPseudocodeExpression(variableMatch[3])}` }
      : { keyword: "DEKLARIERE", text: `${variableMatch[2]}: ${variableMatch[1]}` };
  }

  const incrementMatch = raw.match(/^(.+?)(\+\+|--)$/);
  if (incrementMatch) return { keyword: incrementMatch[2] === "++" ? "ERHÖHE" : "VERRINGERE", text: `${incrementMatch[1]} UM 1` };
  const assignmentMatch = raw.match(/^(.+?)\s*(\+=|-=|\*=|\/=|%=|=(?!=))\s*(.+)$/);
  if (assignmentMatch) {
    const operation = { "+=": "PLUS", "-=": "MINUS", "*=": "MAL", "/=": "GETEILT DURCH", "%=": "MODULO" }[assignmentMatch[2]];
    const value = operation
      ? `${assignmentMatch[1].trim()} ${operation} ${formatPseudocodeExpression(assignmentMatch[3])}`
      : formatPseudocodeExpression(assignmentMatch[3]);
    return { keyword: "SETZE", text: `${assignmentMatch[1].trim()} AUF ${value}` };
  }

  if (/^[A-Za-z_$][\w$.[\]]*\s*\(.*\)$/.test(raw)) return { keyword: "RUFE", text: `${raw} AUF` };
  return { keyword: "FÜHRE AUS", text: formatPseudocodeExpression(raw) };
}

function createPseudocodeDiagram(file, model) {
  const diagram = createElement("div", "uml-pseudocode-diagram");
  const heading = createElement("div", "pseudocode-heading");
  heading.append(createElement("span", "pseudocode-symbol", "P"), createElement("strong", "", `${model.className} – Pseudocode`));
  const body = createElement("div", "pseudocode-body");
  const rawLines = file.content.replace(/\r/g, "").split("\n");
  const codeLines = neutralizeJavaLines(rawLines);
  const blockStack = [];

  codeLines.forEach((codeLine, lineIndex) => {
    const codeTrimmed = codeLine.trim();
    const rawTrimmed = rawLines[lineIndex].trim();
    const leadingClosings = codeTrimmed.match(/^}+/)?.[0].length || 0;
    let closedLabel = "";
    for (let index = 0; index < leadingClosings; index++) closedLabel = blockStack.pop() || closedLabel || "BLOCK";

    const codeStatement = codeTrimmed.replace(/^}+\s*/, "");
    const rawStatement = rawTrimmed.replace(/^}+\s*/, "");
    const statement = pseudocodeStatement(rawStatement, codeStatement, model.className)
      || (leadingClosings ? { keyword: "ENDE", text: closedLabel } : null);
    if (statement) {
      const row = markUmlSource(createElement("div", "pseudocode-line"), lineIndex);
      row.style.setProperty("--pseudocode-indent", String(blockStack.length));
      row.append(
        createElement("span", "pseudocode-source-line", String(lineIndex + 1)),
        createElement("strong", "pseudocode-keyword", statement.keyword),
        createElement("span", "pseudocode-text", statement.text ? ` ${statement.text}` : "")
      );
      body.append(row);
    }

    const openingCount = (codeStatement.match(/{/g) || []).length;
    for (let index = 0; index < openingCount; index++) blockStack.push(statement?.blockLabel || "BLOCK");
    const trailingClosings = Math.max(0, (codeStatement.match(/}/g) || []).length);
    for (let index = 0; index < trailingClosings; index++) blockStack.pop();
  });

  diagram.append(heading, body);
  return diagram;
}

function renderUmlView(container, file, viewType) {
  const model = analyzeUmlModel(file);
  const factories = {
    class: createClassDiagram,
    state: createStateDiagram,
    usecase: createUseCaseDiagram,
    activity: createActivityDiagram,
    sequence: createSequenceDiagram,
    nassi: createNassiShneidermanDiagram,
    pap: createPapDiagram,
    pseudocode: () => createPseudocodeDiagram(file, model)
  };
  const diagram = factories[viewType](model);
  diagram.setAttribute("role", "img");
  diagram.setAttribute("aria-label", `${UML_VIEWS[viewType]} für ${file.name}`);
  container.replaceChildren(diagram);
  container.dataset.view = viewType;
}

function synchronizeGlobalViewSelect() {
  const localSelects = [...document.querySelectorAll(".file-view-select")];
  const selectedViews = new Set(localSelects.map((select) => select.value));
  let mixedOption = globalViewSelect.querySelector('option[value="mixed"]');

  if (selectedViews.size === 1) {
    globalViewSelect.value = localSelects[0]?.value || "class";
    if (mixedOption) mixedOption.remove();
    return;
  }

  if (!mixedOption) {
    mixedOption = new Option("Gemischte Ansichten", "mixed", true, true);
    mixedOption.disabled = true;
    globalViewSelect.prepend(mixedOption);
  }
  globalViewSelect.value = "mixed";
}

function hasMainMethod(source = "") {
  return /\b(?:public\s+)?static\s+void\s+main\s*\(\s*String(?:\s*\[\s*\]|\s*\.\.\.)\s+[A-Za-z_$][\w$]*\s*\)/.test(source);
}

function extractMainBody(source) {
  const sourceLines = source.replace(/\r/g, "").split("\n");
  const neutralSource = neutralizeJavaLines(sourceLines).join("\n");
  const mainMatch = /\b(?:public\s+)?static\s+void\s+main\s*\(\s*String(?:\s*\[\s*\]|\s*\.\.\.)\s+[A-Za-z_$][\w$]*\s*\)/.exec(neutralSource);
  if (!mainMatch) return null;

  const openingBrace = neutralSource.indexOf("{", mainMatch.index + mainMatch[0].length);
  if (openingBrace < 0) throw new SyntaxError("Öffnende Klammer der main-Methode fehlt.");

  let depth = 0;
  for (let index = openingBrace; index < neutralSource.length; index++) {
    if (neutralSource[index] === "{") depth++;
    if (neutralSource[index] === "}") depth--;
    if (depth === 0) {
      return {
        body: source.slice(openingBrace + 1, index),
        openingLineIndex: source.slice(0, openingBrace).split("\n").length - 1
      };
    }
  }
  throw new SyntaxError("Schließende Klammer der main-Methode fehlt.");
}

function extractOuterClassBody(source) {
  const lines = source.replace(/\r/g, "").split("\n");
  const neutralSource = neutralizeJavaLines(lines).join("\n");
  const classMatch = /\b(?:public\s+)?(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*/.exec(neutralSource);
  if (!classMatch) throw new SyntaxError("Keine Java-Klasse gefunden.");

  const openingBrace = neutralSource.indexOf("{", classMatch.index + classMatch[0].length);
  if (openingBrace < 0) throw new SyntaxError("Öffnende Klammer der Klasse fehlt.");

  let depth = 0;
  for (let index = openingBrace; index < neutralSource.length; index++) {
    if (neutralSource[index] === "{") depth++;
    if (neutralSource[index] === "}") depth--;
    if (depth === 0) {
      return {
        body: source.slice(openingBrace + 1, index),
        openingLineIndex: source.slice(0, openingBrace).split("\n").length - 1
      };
    }
  }
  throw new SyntaxError("Schließende Klammer der Klasse fehlt.");
}

function javaParameterNames(parameters) {
  if (!parameters.trim()) return "";
  return parameters.split(",").map((parameter) => {
    const match = parameter.trim().match(/([A-Za-z_$][\w$]*)\s*$/);
    return match?.[1] || parameter.trim();
  }).join(", ");
}

function transpileJavaProgramLine(originalLine, sourceLineIndex) {
  const indentation = originalLine.match(/^\s*/)?.[0] || "";
  const originalTrimmed = originalLine.trim();
  if (!originalTrimmed || originalTrimmed.startsWith("//") || originalTrimmed.startsWith("/*")) return originalLine;
  if (/^@(?:Override|Deprecated|SuppressWarnings)\b/.test(originalTrimmed)) return "";

  const modifiers = "(?:(?:public|protected|private|static|final|abstract|synchronized)\\s+)*";
  const enumMatch = originalTrimmed.match(new RegExp(`^${modifiers}enum\\s+([A-Za-z_$][\\w$]*)\\s*\\{\\s*([^}]+)\\s*\\}$`));
  if (enumMatch) {
    const values = enumMatch[2].split(",").map((value) => value.trim()).filter(Boolean);
    const entries = values.map((value) => `${value}: "${value}"`).join(", ");
    const aliases = values.map((value) => `const ${value} = ${enumMatch[1]}.${value};`).join(" ");
    return `${indentation}const ${enumMatch[1]} = Object.freeze({ ${entries} }); ${aliases}`;
  }

  const recordMatch = originalTrimmed.match(new RegExp(`^${modifiers}record\\s+([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)\\s*\\{\\s*\\}$`));
  if (recordMatch) {
    const parameters = recordMatch[2].split(",").map((parameter) => parameter.trim().match(/([A-Za-z_$][\w$]*)$/)?.[1]).filter(Boolean);
    const assignments = parameters.map((parameter) => `this.${parameter}Value = ${parameter};`).join(" ");
    const accessors = parameters.map((parameter) => `${parameter}() { return this.${parameter}Value; }`).join(" ");
    return `${indentation}class ${recordMatch[1]} { constructor(${parameters.join(", ")}) { ${assignments} } ${accessors} }`;
  }

  const interfaceMatch = originalTrimmed.match(new RegExp(`^${modifiers}interface\\s+([A-Za-z_$][\\w$]*)\\s*\\{$`));
  if (interfaceMatch) return `${indentation}class ${interfaceMatch[1]} {`;

  const classMatch = originalTrimmed.match(new RegExp(`^${modifiers}class\\s+([A-Za-z_$][\\w$]*)(?:\\s*<[^>]+>)?(?:\\s+(?:extends|implements)\\s+([A-Za-z_$][\\w$]*))?\\s*\\{$`));
  if (classMatch) return `${indentation}class ${classMatch[1]}${classMatch[2] ? ` extends ${classMatch[2]}` : ""} {`;

  const strippedModifiers = originalTrimmed.replace(new RegExp(`^${modifiers}`), "");
  const constructorMatch = strippedModifiers.match(/^([A-ZÄÖÜ][\w$ÄÖÜäöüß]*)\s*\(([^)]*)\)\s*\{$/u);
  if (constructorMatch) return `${indentation}constructor(${javaParameterNames(constructorMatch[2])}) {`;

  const methodMatch = strippedModifiers.match(/^(?:[A-Za-z_$][\w$]*(?:\s*<[^>]+>)?(?:\s*\[\s*\])*)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)(?:\s+throws\s+[A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)?\s*([;{])$/);
  if (methodMatch) {
    const parameters = javaParameterNames(methodMatch[2]);
    if (methodMatch[3] === ";") return `${indentation}${methodMatch[1]}(${parameters}) {}`;
    const isStatic = /\bstatic\b/.test(originalTrimmed);
    return `${indentation}${isStatic ? "function " : ""}${methodMatch[1]}(${parameters}) {`;
  }

  const fieldInitializerMatch = strippedModifiers.match(/^(?:byte|short|int|long|float|double|boolean|char|String|[A-ZÄÖÜ][\w$ÄÖÜäöüß]*)(?:\s*<[^>]+>)?(?:\s*\[\s*\])*\s+([A-Za-z_$][\w$]*)\s*=\s*(.+);$/u);
  if (fieldInitializerMatch && /^(?:public|protected|private|static)\b/.test(originalTrimmed)) {
    const expression = fieldInitializerMatch[2].replace(/\bnew\s+([A-Za-z_$][\w$]*)\s*<[^>]*>\s*\(/g, "new $1(");
    return `${indentation}${/\bstatic\b/.test(originalTrimmed) ? "static " : ""}${fieldInitializerMatch[1]} = ${expression};`;
  }

  const fieldMatch = strippedModifiers.match(/^((?:byte|short|int|long|float|double|boolean|char|String|[A-ZÄÖÜ][\w$ÄÖÜäöüß]*))(?:\s*<[^>]+>)?(?:\s*\[\s*\])*\s+([A-Za-z_$][\w$]*)\s*;$/u);
  if (fieldMatch) {
    const defaultValue = fieldMatch[1] === "boolean" ? "false"
      : /^(?:byte|short|int|long|float|double)$/.test(fieldMatch[1]) ? "0"
        : fieldMatch[1] === "char" ? '"\\0"' : "null";
    return `${indentation}${fieldMatch[2]} = ${defaultValue};`;
  }

  let sourceLine = originalLine;
  if (/^\s*(?:byte|short|int|long|float|double|boolean|char|String)(?:\s*\[\s*\])+\s+[A-Za-z_$][\w$]*\s*=\s*\{.*\}\s*;\s*$/.test(originalLine)) {
    const assignmentIndex = originalLine.indexOf("=");
    sourceLine = originalLine.slice(0, assignmentIndex + 1)
      + originalLine.slice(assignmentIndex + 1).replaceAll("{", "[").replaceAll("}", "]");
  }

  let line = sourceLine
    .replace(/System\.out\.println\s*\((.*)\)\s*;/g, "print($1);")
    .replace(/System\.out\.print\s*\((.*)\)\s*;/g, "printInline($1);")
    .replace(/\.length\s*\(\s*\)/g, ".length")
    .replace(/\.size\s*\(\s*\)/g, ".size")
    .replace(/\.contains\s*\(/g, ".includes(")
    .replace(/\.getMessage\s*\(\s*\)/g, ".message")
    .replace(/\.split\(\s*"\\\\n"\s*\)/g, '.split("\\n")')
    .replace(/([A-Za-z_$][\w$]*)\.apply\s*\(/g, "$1(")
    .replace(/\bnew\s+([A-Za-z_$][\w$]*)\s*<[^>]*>\s*\(/g, "new $1(")
    .replace(/\(int\)\s*([A-Za-z_$][\w$]*)/g, "Math.trunc($1)")
    .replace(/\((?:byte|short|long|float|double|boolean|char|String|[A-ZÄÖÜ][\w$ÄÖÜäöüß]*)\)\s*/gu, "")
    .replace(/\(([A-Za-z_$][\w$]*)\s*\/\s*([A-Za-z_$][\w$]*)\)/g, "Math.trunc($1 / $2)")
    .replace(/\bthrow\s+new\s+(?:RuntimeException|IllegalArgumentException|IllegalStateException)\s*\(/g, "throw new Error(");

  const javaTypePattern = "(?:byte|short|int|long|float|double|boolean|char|String|[A-ZÄÖÜ][\\w$ÄÖÜäöüß]*)(?:\\s*<[^>]+>)?(?:\\s*\\[\\s*\\])*";
  const declarationMatch = line.match(new RegExp(`^(\\s*)(?:final\\s+)?${javaTypePattern}\\s+([A-Za-z_$][\\w$]*)(\\s*(?:=.*|;))$`, "u"));
  if (declarationMatch) line = `${declarationMatch[1]}let ${declarationMatch[2]}${declarationMatch[3]}`;
  if (!/^\s*(?:case|default)\b/.test(line)) {
    line = line
      .replace(/\(([^)]*)\)\s*->/g, "($1) =>")
      .replace(/\b([A-Za-z_$][\w$]*)\s*->/g, "$1 =>");
  }
  line = line.replace(
    new RegExp(`for\\s*\\(\\s*(?:final\\s+)?${javaTypePattern}\\s+([A-Za-z_$][\\w$]*)`, "u"),
    "for (let $1"
  );

  line = line.replace(/(=\s*)\{([^{}]*)\}(\s*;)/, "$1[$2]$3");
  const enhancedFor = line.match(/^(\s*)for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*:\s*(.+)\)\s*\{$/);
  if (enhancedFor) return `${enhancedFor[1]}for (let ${enhancedFor[2]} of ${enhancedFor[3].trim()}) { trace(${sourceLineIndex});`;

  const transformedIndentation = line.match(/^\s*/)?.[0] || "";
  const trimmed = line.trim();
  if (!trimmed || /^[{}]+;?$/.test(trimmed)) return line;

  const arrowCase = trimmed.match(/^case\s+(.+?)\s*->\s*(.+);$/);
  if (arrowCase) return `${transformedIndentation}case ${arrowCase[1]}: trace(${sourceLineIndex}); ${arrowCase[2]}; break;`;
  const arrowDefault = trimmed.match(/^default\s*->\s*(.+);$/);
  if (arrowDefault) return `${transformedIndentation}default: trace(${sourceLineIndex}); ${arrowDefault[1]}; break;`;

  if (/^}\s*else\s+if\s*\(/.test(trimmed)) return line.replace(/else\s+if\s*\(/, `else if (trace(${sourceLineIndex}), `);
  if (/^else\s+if\s*\(/.test(trimmed)) return line.replace(/else\s+if\s*\(/, `else if (trace(${sourceLineIndex}), `);
  if (/^if\s*\(/.test(trimmed)) return line.replace(/if\s*\(/, `if (trace(${sourceLineIndex}), `);
  if (/^while\s*\(/.test(trimmed)) return line.replace(/while\s*\(/, `while (trace(${sourceLineIndex}), `);
  if (/^for\s*\(/.test(trimmed)) return line.replace(/for\s*\(([^;]*);\s*([^;]*);/, `for ($1; trace(${sourceLineIndex}) && ($2);`);
  if (/^}\s*else\s*{/.test(trimmed)) return line.replace(/else\s*{/, `else { trace(${sourceLineIndex});`);
  if (/^else\s*{/.test(trimmed)) return line.replace(/else\s*{/, `else { trace(${sourceLineIndex});`);
  if (/^}\s*catch\s*\(/.test(trimmed)) {
    return line.replace(/catch\s*\(\s*[A-Za-z_$][\w$]*(?:\s*\|\s*[A-Za-z_$][\w$]*)*\s+([A-Za-z_$][\w$]*)\s*\)\s*\{/, `catch ($1) { trace(${sourceLineIndex});`);
  }
  if (/^}\s*finally\s*\{/.test(trimmed)) return line.replace(/finally\s*\{/, `finally { trace(${sourceLineIndex});`);
  if (/^(?:switch|do)\b/.test(trimmed)) return `${transformedIndentation}trace(${sourceLineIndex}); ${trimmed}`;
  return `${transformedIndentation}trace(${sourceLineIndex}); ${trimmed}`;
}

function transpileJavaMain(source) {
  if (!hasMainMethod(source)) throw new SyntaxError("Keine ausführbare main-Methode gefunden.");
  const classBody = extractOuterClassBody(source);
  const program = classBody.body.split("\n").map((line, bodyLineIndex) =>
    transpileJavaProgramLine(line, classBody.openingLineIndex + bodyLineIndex)
  ).join("\n");

  return `
    class Random {
      constructor(seed = Date.now()) {
        this.seed = (BigInt(Math.trunc(seed)) ^ 0x5DEECE66Dn) & ((1n << 48n) - 1n);
      }
      next(bits) {
        this.seed = (this.seed * 0x5DEECE66Dn + 0xBn) & ((1n << 48n) - 1n);
        return Number(this.seed >> (48n - BigInt(bits)));
      }
      nextInt(bound) {
        if (bound <= 0) throw new Error("bound must be positive");
        if ((bound & -bound) === bound) return Math.floor((bound * this.next(31)) / 2147483648);
        let bits;
        let value;
        do {
          bits = this.next(31);
          value = bits % bound;
        } while (bits - value + (bound - 1) >= 2147483648);
        return value;
      }
    }
    class ArrayList extends Array {
      add(value) { this.push(value); return true; }
      get(index) { return this[index]; }
      get size() { return this.length; }
      stream() { return this; }
      toList() { return this; }
      iterator() {
        let index = 0;
        return { hasNext: () => index < this.length, next: () => this[index++] };
      }
    }
    class LinkedList extends ArrayList {
      addFirst(value) { this.unshift(value); }
      addLast(value) { this.push(value); }
      getFirst() { return this[0]; }
      getLast() { return this[this.length - 1]; }
    }
    class ArrayDeque extends LinkedList {
      offerFirst(value) { this.unshift(value); return true; }
      offerLast(value) { this.push(value); return true; }
      pollFirst() { return this.shift(); }
      peekFirst() { return this[0]; }
    }
    class HashSet extends Set {}
    class HashMap extends Map {
      put(key, value) { const previous = this.get(key); this.set(key, value); return previous; }
      keySet() { return this.keys(); }
    }
    class Exception extends Error {}
    class IOException extends Exception {}
    class RuntimeException extends Exception {}
    class NumberFormatException extends Exception {}
    class NullPointerException extends Exception {}
    const Integer = {
      parseInt(value) {
        if (!/^[+-]?\\d+$/.test(String(value).trim())) throw new NumberFormatException("For input string: " + value);
        return Number.parseInt(value, 10);
      },
      valueOf(value) { return this.parseInt(value); }
    };
    class Scanner {
      constructor(input = "") { this.tokens = String(input).split(/\\s+/); this.lineIndex = 0; }
      nextLine() { return this.tokens[this.lineIndex++] ?? ""; }
      nextInt() { return Integer.parseInt(this.tokens[this.lineIndex++] ?? ""); }
      close() {}
    }
    class StringBuilder {
      constructor(value = "") { this.value = String(value); }
      append(value) { this.value += String(value); return this; }
      toString() { return this.value; }
    }
    const Collections = { sort(values) { values.sort((left, right) => left - right); } };
    const List = { of(...values) { const list = new ArrayList(); list.push(...values); return list; } };
    const Optional = {
      of(value) { return { orElse: (fallback) => value == null ? fallback : value }; },
      empty() { return { orElse: (fallback) => fallback }; }
    };
    const Objects = { hash(...values) { return values.join("|").length; } };
    class LocalDate {
      constructor(year, month, day) { this.date = new Date(Date.UTC(year, month - 1, day)); }
      static of(year, month, day) { return new LocalDate(year, month, day); }
      plusDays(days) { const result = new LocalDate(1970, 1, 1); result.date = new Date(this.date.getTime() + days * 86400000); return result; }
      format() { return String(this.date.getUTCDate()).padStart(2, "0") + "." + String(this.date.getUTCMonth() + 1).padStart(2, "0") + "." + this.date.getUTCFullYear(); }
    }
    const DateTimeFormatter = { ofPattern(pattern) { return pattern; } };
    const virtualFiles = new Map();
    class Path { constructor(value) { this.value = value; } toString() { return this.value; } }
    const Files = {
      createTempFile(prefix, suffix) { const path = new Path(prefix + "temp" + suffix); virtualFiles.set(path.value, ""); return path; },
      writeString(path, content) { virtualFiles.set(path.value, String(content)); return path; },
      readString(path) { return virtualFiles.get(path.value) ?? ""; },
      deleteIfExists(path) { return virtualFiles.delete(path.value); }
    };
    class Thread {
      constructor(task) { this.task = task; }
      start() { this.task(); }
      join() {}
    }
    const Executors = {
      newFixedThreadPool() { return { submit(task) { task(); }, shutdown() {} }; }
    };
    ${program}
    main([]);
  `;
}

function appendTerminalLine(text, type = "output") {
  String(text).split("\n").forEach((line) => {
    terminalOutput.append(createElement("div", `terminal-line terminal-${type}`, line || " "));
  });
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function openTerminal(file) {
  terminalOutput.replaceChildren();
  terminalFileName.textContent = file.name;
  runtimeTerminal.hidden = false;
  document.body.classList.add("terminal-open");
}

function executeTranspiledJava(code) {
  const workerSource = `
    self.onmessage = ({ data }) => {
      const output = [];
      const executionTrace = [];
      let inline = "";
      const print = (value = "") => {
        output.push(inline + String(value));
        inline = "";
      };
      const printInline = (value = "") => { inline += String(value); };
      const trace = (lineIndex) => { executionTrace.push(lineIndex); return true; };
      try {
        new Function("print", "printInline", "trace", data)(print, printInline, trace);
        if (inline) output.push(inline);
        self.postMessage({ output, executionTrace });
      } catch (error) {
        self.postMessage({ output, executionTrace, error: { name: error.name, message: error.message } });
      }
    };
  `;
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const worker = new Worker(workerUrl);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({ output: [], executionTrace: [], error: { name: "RuntimeException", message: "Ausführung nach 3 Sekunden abgebrochen." } });
    }, 3000);

    worker.addEventListener("message", (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve(event.data);
    }, { once: true });
    worker.postMessage(code);
  });
}

function waitForRuntime(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setRuntimeButtons(filePath, running) {
  document.querySelectorAll(".runtime-play-button").forEach((button) => {
    button.classList.toggle("running", running && button.dataset.runPath === filePath);
  });
}

function clearRuntimeTrace(run = activeRuntimeRun) {
  run?.point?.remove();
  run?.umlPoint?.remove();
  document.querySelectorAll(".runtime-current-line, .runtime-visited-line").forEach((line) => {
    line.classList.remove("runtime-current-line", "runtime-visited-line");
  });
  document.querySelectorAll(".declaration-lane.runtime-lane-active").forEach((lane) => lane.classList.remove("runtime-lane-active"));
  document.querySelectorAll(".uml-runtime-active").forEach((node) => node.classList.remove("uml-runtime-active"));
  document.querySelectorAll(".uml-runtime-overlay").forEach((overlay) => overlay.remove());
  if (run?.filePath) setRuntimeButtons(run.filePath, false);
}

function cancelActiveRuntimeRun() {
  if (!activeRuntimeRun) return;
  activeRuntimeRun.cancelled = true;
  clearRuntimeTrace(activeRuntimeRun);
  activeRuntimeRun = null;
}

function setCompileButtons(filePath, running) {
  document.querySelectorAll(".compile-play-button").forEach((button) => {
    button.classList.toggle("running", running && button.dataset.compilePath === filePath);
  });
}

function clearCompileTrace(run = activeCompileRun) {
  run?.point?.remove();
  run?.classBuildView?.remove();
  document.querySelectorAll(".compile-current-line, .compile-visited-line").forEach((line) => {
    line.classList.remove("compile-current-line", "compile-visited-line");
  });
  document.querySelectorAll(".architecture-file.compile-running").forEach((fileNode) => fileNode.classList.remove("compile-running"));
  if (run?.filePath) setCompileButtons(run.filePath, false);
}

function cancelActiveCompileRun() {
  if (!activeCompileRun) return;
  activeCompileRun.cancelled = true;
  clearCompileTrace(activeCompileRun);
  activeCompileRun = null;
}

function animateTracePoint(point, from, to, duration, run, positionKey = "position") {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const animate = (now) => {
      if (run.cancelled || !point.isConnected) {
        resolve(false);
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;
      point.setAttribute("cx", String(x));
      point.setAttribute("cy", String(y));
      run[positionKey] = { x, y };
      if (progress < 1) window.requestAnimationFrame(animate);
      else resolve(true);
    };
    window.requestAnimationFrame(animate);
  });
}

function buildRuntimeLaneSegment(path, fromDistance, toDistance, offsetX = 0) {
  const steps = 32;
  const commands = [];
  for (let step = 0; step <= steps; step += 1) {
    const distance = fromDistance + (toDistance - fromDistance) * (step / steps);
    const position = path.getPointAtLength(distance);
    commands.push(`${step ? "L" : "M"} ${position.x + offsetX} ${position.y}`);
  }
  return commands.join(" ");
}

async function animatePointAlongLane(path, point, reverse, run, trail, offsetX = 0) {
  if (!path || run.cancelled) return;
  const length = path.getTotalLength();
  const rawStart = path.getPointAtLength(reverse ? length : 0);
  const start = { x: rawStart.x + offsetX, y: rawStart.y };
  if (run.position) await animateTracePoint(point, run.position, start, 100, run);
  const startedAt = performance.now();

  await new Promise((resolve) => {
    const animate = (now) => {
      if (run.cancelled || !point.isConnected) {
        resolve();
        return;
      }
      const progress = Math.min(1, (now - startedAt) / 380);
      const distance = reverse ? length * (1 - progress) : length * progress;
      const rawPosition = path.getPointAtLength(distance);
      const position = { x: rawPosition.x + offsetX, y: rawPosition.y };
      point.setAttribute("cx", String(position.x));
      point.setAttribute("cy", String(position.y));
      run.position = { x: position.x, y: position.y };
      if (reverse && trail) {
        trail.setAttribute("d", buildRuntimeLaneSegment(path, length, distance, offsetX));
      }
      if (progress < 1) window.requestAnimationFrame(animate);
      else resolve();
    };
    window.requestAnimationFrame(animate);
  });
  if (reverse && trail) trail.setAttribute("d", buildRuntimeLaneSegment(path, length, 0, offsetX));
}

async function traceCallerRoutes(sourceRegion, lineIndex, point, run, activeDeclarations = new Set()) {
  const declarations = sourceRegion.laneDeclarations || [];
  const callers = declarations.filter((declaration) => declaration.usages.includes(lineIndex));

  for (const declaration of callers) {
    if (run.cancelled || activeDeclarations.has(declaration.id)) continue;
    const path = sourceRegion.querySelector(`.declaration-lane[data-declaration-id="${declaration.id}"][data-usage-line-index="${lineIndex}"]`);
    if (!path) continue;

    const laneKey = `${declaration.id}:${lineIndex}`;
    const visit = run.codeLaneVisits.get(laneKey) || 0;
    run.codeLaneVisits.set(laneKey, visit + 1);
    const offsetX = Math.min(10, visit * 0.35);
    const trail = createSvgElement("path", {
      class: `runtime-code-trail lane-${declaration.kind}`,
      "data-lane-key": laneKey,
      "data-iteration": visit + 1
    });
    path.parentElement.insertBefore(trail, point);

    activeDeclarations.add(declaration.id);
    await animatePointAlongLane(path, point, true, run, trail, offsetX);
    if (!run.cancelled) {
      const declarationLine = sourceRegion.querySelectorAll(".source-code li")[declaration.lineIndex];
      declarationLine?.querySelector(".code-line-content")?.classList.add("runtime-frame-revealed");
      declarationLine?.classList.add("runtime-current-line");
      await traceCallerRoutes(sourceRegion, declaration.lineIndex, point, run, activeDeclarations);
      declarationLine?.classList.remove("runtime-current-line");
    }
    await animatePointAlongLane(path, point, false, run, trail, offsetX);
    activeDeclarations.delete(declaration.id);
  }
}

async function traceSourceLine(sourceRegion, sourceLine, lineIndex, point, run) {
  if (run.cancelled) return;
  const canvas = sourceRegion.querySelector(".source-code-canvas");
  const content = sourceLine.querySelector(".code-line-content");
  if (!canvas || !content) return;

  content.classList.add("runtime-frame-revealed");

  sourceRegion.querySelectorAll(".runtime-current-line").forEach((line) => line.classList.remove("runtime-current-line"));
  sourceLine.classList.add("runtime-current-line");
  sourceLine.scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForRuntime(35);

  const canvasRect = canvas.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const zoomLevel = Number(sourceRegion.closest(".file-code-pane")?.dataset.zoom || 1);
  const start = {
    x: (contentRect.left - canvasRect.left) / zoomLevel,
    y: (contentRect.top - canvasRect.top + contentRect.height / 2) / zoomLevel
  };
  const end = {
    x: Math.max(start.x + 7, (contentRect.right - canvasRect.left) / zoomLevel),
    y: start.y
  };

  if (run.position) await animateTracePoint(point, run.position, start, 90, run);
  else {
    point.setAttribute("cx", String(start.x));
    point.setAttribute("cy", String(start.y));
    run.position = start;
  }
  await animateTracePoint(point, start, end, Math.max(170, Math.min(430, (end.x - start.x) * 3.2)), run);
  await traceCallerRoutes(sourceRegion, lineIndex, point, run);
  sourceLine.classList.remove("runtime-current-line");
  sourceLine.classList.add("runtime-visited-line");
}

function analyzeCompilation(file) {
  const lines = file.content.replace(/\r/g, "").split("\n");
  const neutralLines = neutralizeJavaLines(lines);
  const errors = [];
  const stack = [];
  const openingSymbols = { "{": "}", "(": ")", "[": "]" };
  const closingSymbols = new Set(Object.values(openingSymbols));

  neutralLines.forEach((line, lineIndex) => {
    [...line].forEach((character, columnIndex) => {
      if (openingSymbols[character]) {
        stack.push({ character, lineIndex, columnIndex });
      } else if (closingSymbols.has(character)) {
        const opening = stack.pop();
        if (!opening || openingSymbols[opening.character] !== character) {
          errors.push({ lineIndex, message: `Unerwartetes Zeichen '${character}' in Spalte ${columnIndex + 1}.` });
        }
      }
    });
  });
  stack.forEach((opening) => {
    errors.push({ lineIndex: opening.lineIndex, message: `Schließendes Zeichen '${openingSymbols[opening.character]}' fehlt.` });
  });

  const publicType = file.content.match(/\bpublic\s+(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/);
  const expectedTypeName = file.name.replace(/\.java$/i, "");
  if (publicType && publicType[1] !== expectedTypeName) {
    errors.push({
      lineIndex: file.content.slice(0, publicType.index).split("\n").length - 1,
      message: `Der öffentliche Typ '${publicType[1]}' muss in '${publicType[1]}.java' gespeichert werden.`
    });
  }
  if (!extractClasses(file.content).length) errors.push({ lineIndex: 0, message: "Keine Java-Klasse gefunden." });
  return errors;
}

function createCompileClassBuildView(file) {
  const model = analyzeUmlModel(file);
  const view = createElement("section", "compile-class-build-view");
  view.setAttribute("aria-label", `Entstehendes Klassenmodell für ${file.name}`);
  view.setAttribute("aria-live", "polite");

  const header = createElement("header", "compile-class-build-header");
  const heading = createElement("div", "compile-class-build-heading");
  heading.append(
    createElement("strong", "", "Klassenmodell entsteht"),
    createElement("small", "", "Deklarationen werden übernommen")
  );
  const progress = createElement("span", "compile-class-build-progress");
  header.append(createElement("span", "compile-class-build-indicator"), heading, progress);

  const box = createElement("div", "compile-class-build-box");
  const title = createElement("div", "compile-class-build-title compile-class-part pending");
  title.dataset.lineIndex = String(model.classLineIndex);
  title.dataset.partKind = "class";
  if (model.classKind !== "class") title.append(createElement("small", "uml-stereotype", `«${model.classKind}»`));
  title.append(createElement("strong", "", model.className));

  const attributes = createElement("div", "compile-class-build-compartment attributes");
  attributes.append(createElement("small", "compile-class-build-label", "Attribute"));
  model.attributes.forEach((attribute) => {
    const part = createElement("span", "compile-class-part pending", `− ${attribute.name}: ${attribute.type}${attribute.initial ? ` = ${attribute.initial}` : ""}`);
    part.dataset.lineIndex = String(attribute.lineIndex);
    part.dataset.partKind = "attribute";
    attributes.append(part);
  });

  const methods = createElement("div", "compile-class-build-compartment methods");
  methods.append(createElement("small", "compile-class-build-label", "Methoden"));
  model.methods.forEach((method) => {
    const part = createElement("span", "compile-class-part pending", `${method.visibility} ${method.name}(${method.parameters}): ${method.returnType}`);
    part.dataset.lineIndex = String(method.lineIndex);
    part.dataset.partKind = "method";
    methods.append(part);
  });

  box.append(title, attributes, methods);
  const parts = [title, ...attributes.querySelectorAll(".compile-class-part"), ...methods.querySelectorAll(".compile-class-part")];
  view.dataset.totalParts = String(parts.length);
  progress.textContent = `0 / ${parts.length}`;
  view.append(header, box);
  return view;
}

function settleCompileClassParts(run) {
  run.classBuildView?.querySelectorAll(".compile-class-part.active").forEach((part) => {
    part.classList.remove("active");
    part.classList.add("revealed");
  });
}

async function activateCompileClassParts(run, lineIndex) {
  settleCompileClassParts(run);
  const parts = [...(run.classBuildView?.querySelectorAll(`.compile-class-part[data-line-index="${lineIndex}"]`) || [])];
  if (!parts.length) return;
  parts.forEach((part) => {
    part.classList.remove("pending");
    part.classList.add("active");
    if (part.dataset.partKind === "class") run.classBuildView.classList.add("model-started");
  });
  const revealedCount = run.classBuildView.querySelectorAll(".compile-class-part.active, .compile-class-part.revealed").length;
  const totalParts = Number(run.classBuildView.dataset.totalParts || 0);
  run.classBuildView.querySelector(".compile-class-build-progress").textContent = `${revealedCount} / ${totalParts}`;
  parts[0].scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForRuntime(260);
}

async function traceCompileLine(sourceRegion, sourceLine, point, run) {
  if (run.cancelled) return;
  const canvas = sourceRegion.querySelector(".source-code-canvas");
  const content = sourceLine.querySelector(".code-line-content");
  if (!canvas || !content) return;

  sourceRegion.querySelectorAll(".compile-current-line").forEach((line) => line.classList.remove("compile-current-line"));
  sourceLine.classList.add("compile-current-line");
  sourceLine.scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForRuntime(30);

  const canvasRect = canvas.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const zoomLevel = Number(sourceRegion.closest(".file-code-pane")?.dataset.zoom || 1);
  const start = {
    x: (contentRect.left - canvasRect.left) / zoomLevel,
    y: (contentRect.top - canvasRect.top + contentRect.height / 2) / zoomLevel
  };
  const end = {
    x: Math.max(start.x + 7, (contentRect.right - canvasRect.left) / zoomLevel),
    y: start.y
  };

  if (run.position) await animateTracePoint(point, run.position, start, 75, run);
  else {
    point.setAttribute("cx", String(start.x));
    point.setAttribute("cy", String(start.y));
    run.position = start;
  }

  const visibleCode = content.textContent || "";
  const assignmentIndex = visibleCode.indexOf("=");
  if (assignmentIndex > 0) {
    const assignmentX = start.x + (end.x - start.x) * (assignmentIndex / Math.max(1, visibleCode.length));
    const assignmentPoint = { x: assignmentX, y: start.y };
    await animateTracePoint(point, start, assignmentPoint, 150, run);
    await waitForRuntime(110);
    await animateTracePoint(point, assignmentPoint, end, 180, run);
  } else {
    await animateTracePoint(point, start, end, Math.max(150, Math.min(360, (end.x - start.x) * 2.7)), run);
  }
  await activateCompileClassParts(run, Number(sourceLine.dataset.lineIndex));
  sourceLine.classList.remove("compile-current-line");
  sourceLine.classList.add("compile-visited-line");
}

async function simulateCompilation(file, run) {
  revealArchitectureFile(file.path);
  await waitForRuntime(150);
  if (run.cancelled) return;
  const fileNode = diagramContainer.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`);
  const sourceRegion = fileNode?.querySelector(".file-source");
  const umlContainer = fileNode?.querySelector(".file-uml-view");
  if (!fileNode || !sourceRegion || !umlContainer) return;
  fileNode.classList.add("compile-running");
  const classBuildView = createCompileClassBuildView(file);
  umlContainer.append(classBuildView);
  run.classBuildView = classBuildView;
  drawDeclarationLanes(sourceRegion);
  const overlay = sourceRegion.querySelector(".declaration-lanes");
  const point = createSvgElement("circle", { class: "compile-trace-point", r: 5 });
  overlay.append(point);
  run.point = point;

  const lines = [...sourceRegion.querySelectorAll(".source-code li")];
  for (const sourceLine of lines) {
    if (run.cancelled) break;
    if (!sourceLine.textContent.trim()) continue;
    await traceCompileLine(sourceRegion, sourceLine, point, run);
  }
  settleCompileClassParts(run);
  if (!run.cancelled) await waitForRuntime(420);
}

async function runJavaCompilation(file) {
  cancelActiveRuntimeRun();
  cancelActiveCompileRun();
  const fileNode = diagramContainer.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`);
  if (fileNode?.classList.contains("micro")) setFileDisplayMode(fileNode, "normal");
  const run = { cancelled: false, filePath: file.path, point: null, position: null };
  activeCompileRun = run;
  setCompileButtons(file.path, true);
  openTerminal(file);
  appendTerminalLine(`javac FolderTree/${file.path}`, "command");
  const errors = analyzeCompilation(file);
  await simulateCompilation(file, run);
  if (run.cancelled) return;

  errors.forEach((error) => {
    appendTerminalLine(`FolderTree/${file.path}:${error.lineIndex + 1}: error: ${error.message}`, "error");
  });
  appendTerminalLine(`Process finished with exit code ${errors.length ? 1 : 0}`, errors.length ? "exit-error" : "exit");
  clearCompileTrace(run);
  if (activeCompileRun === run) activeCompileRun = null;
}

function prepareUmlRuntimeTrace(umlContainer, run) {
  const diagram = umlContainer.querySelector('[role="img"]');
  if (!diagram) return null;
  const overlay = createSvgElement("svg", { class: "uml-runtime-overlay", "aria-hidden": "true" });
  const width = Math.max(diagram.clientWidth, diagram.scrollWidth);
  const height = Math.max(diagram.clientHeight, diagram.scrollHeight);
  overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  overlay.setAttribute("width", String(width));
  overlay.setAttribute("height", String(height));
  const point = createSvgElement("circle", { class: "uml-runtime-point", r: 5, visibility: "hidden" });
  overlay.append(point);
  diagram.append(overlay);
  run.umlPoint = point;
  run.umlPosition = null;
  return { diagram, overlay, point, visits: new Map() };
}

async function animateUmlTrail(path, point, run, codeLineCompletion) {
  const length = path.getTotalLength();
  const startedAt = performance.now();
  let codeLineFinished = false;
  codeLineCompletion.finally(() => {
    codeLineFinished = true;
  });
  await new Promise((resolve) => {
    const animate = (now) => {
      if (run.cancelled || !point.isConnected) {
        resolve();
        return;
      }
      const elapsed = now - startedAt;
      const progress = codeLineFinished ? 1 : Math.min(0.94, 1 - Math.exp(-elapsed / 230));
      const position = path.getPointAtLength(length * progress);
      point.setAttribute("cx", String(position.x));
      point.setAttribute("cy", String(position.y));
      run.umlPosition = { x: position.x, y: position.y };
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length * (1 - progress));
      if (!codeLineFinished) window.requestAnimationFrame(animate);
      else resolve();
    };
    window.requestAnimationFrame(animate);
  });
}

async function traceUmlLine(umlTrace, lineIndex, run, codeLineCompletion) {
  if (!umlTrace || run.cancelled) return;
  const matchingNodes = [...umlTrace.diagram.querySelectorAll(`[data-source-line="${lineIndex}"], [data-source-alias="${lineIndex}"], [data-source-lines~="${lineIndex}"]`)];
  const node = umlTrace.diagram.classList.contains("uml-activity-diagram")
    ? matchingNodes.at(-1)
    : matchingNodes[0];
  if (!node) return;
  umlTrace.point.removeAttribute("visibility");

  umlTrace.diagram.querySelectorAll(".uml-runtime-active").forEach((item) => item.classList.remove("uml-runtime-active"));
  node.classList.add("uml-runtime-active");
  node.scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForRuntime(30);

  const pane = umlTrace.diagram.closest(".file-uml-pane");
  const zoomLevel = Number(pane?.dataset.zoom || 1);
  const diagramRect = umlTrace.diagram.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const visits = umlTrace.visits.get(lineIndex) || 0;
  umlTrace.visits.set(lineIndex, visits + 1);
  const isActivityDiagram = umlTrace.diagram.classList.contains("uml-activity-diagram");
  const iterationOffset = visits * (isActivityDiagram ? 10 : 5);
  const target = {
    x: (nodeRect.left - diagramRect.left + nodeRect.width / 2) / zoomLevel + iterationOffset,
    y: (nodeRect.top - diagramRect.top + nodeRect.height / 2) / zoomLevel
  };

  if (!run.umlPosition) {
    umlTrace.point.setAttribute("cx", String(target.x));
    umlTrace.point.setAttribute("cy", String(target.y));
    run.umlPosition = target;
    await codeLineCompletion;
    return;
  }

  const from = run.umlPosition;
  const bend = Math.max(18, Math.abs(target.y - from.y) * 0.32);
  const activityLaneX = Math.max(from.x, target.x) + 48 + visits * 10;
  const trailPath = isActivityDiagram
    ? `M ${from.x} ${from.y} C ${activityLaneX} ${from.y}, ${activityLaneX} ${target.y}, ${target.x} ${target.y}`
    : `M ${from.x} ${from.y} C ${from.x + bend + iterationOffset} ${from.y}, ${target.x - bend} ${target.y}, ${target.x} ${target.y}`;
  const trail = createSvgElement("path", {
    class: "uml-runtime-trail",
    d: trailPath,
    "data-source-line": lineIndex,
    "data-iteration": visits + 1
  });
  umlTrace.overlay.insertBefore(trail, umlTrace.point);
  await animateUmlTrail(trail, umlTrace.point, run, codeLineCompletion);
}

async function simulateRuntime(file, run, executionTrace = []) {
  revealArchitectureFile(file.path);
  await waitForRuntime(160);
  if (run.cancelled) return;

  const fileNode = diagramContainer.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`);
  const sourceRegion = fileNode?.querySelector(".file-source");
  const umlContainer = fileNode?.querySelector(".file-uml-view");
  if (!sourceRegion) return;
  drawDeclarationLanes(sourceRegion);

  const overlay = sourceRegion.querySelector(".declaration-lanes");
  const point = createSvgElement("circle", { class: "runtime-trace-point", r: 5 });
  overlay.append(point);
  run.point = point;
  const umlTrace = prepareUmlRuntimeTrace(umlContainer, run);

  const lines = [...sourceRegion.querySelectorAll(".source-code li")];
  const declarations = sourceRegion.laneDeclarations || [];
  const classLineIndex = declarations.find((declaration) => declaration.kind === "class")?.lineIndex || 0;
  const mainLineIndex = declarations.find((declaration) => declaration.kind === "method" && declaration.name === "main")?.lineIndex;
  const visitedLineIndices = [classLineIndex, mainLineIndex, ...executionTrace]
    .filter((lineIndex) => Number.isInteger(lineIndex) && lines[lineIndex]);

  for (const lineIndex of visitedLineIndices) {
    if (run.cancelled) break;
    const codeLineCompletion = traceSourceLine(sourceRegion, lines[lineIndex], lineIndex, point, run);
    await Promise.all([
      codeLineCompletion,
      traceUmlLine(umlTrace, lineIndex, run, codeLineCompletion)
    ]);
  }
}

async function runJavaFile(file) {
  cancelActiveCompileRun();
  cancelActiveRuntimeRun();
  const fileNode = diagramContainer.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`);
  if (fileNode?.classList.contains("micro")) setFileDisplayMode(fileNode, "normal");
  fileNode?.querySelectorAll(".runtime-frame-revealed").forEach((frame) => frame.classList.remove("runtime-frame-revealed"));
  fileNode?.querySelectorAll(".runtime-code-trail").forEach((trail) => trail.remove());
  const run = {
    cancelled: false,
    filePath: file.path,
    point: null,
    position: null,
    umlPoint: null,
    umlPosition: null,
    codeLaneVisits: new Map()
  };
  activeRuntimeRun = run;
  setRuntimeButtons(file.path, true);
  openTerminal(file);
  const className = file.name.replace(/\.java$/i, "");
  const classPath = `FolderTree/${file.path.split("/").slice(0, -1).join("/") || "."}`;
  appendTerminalLine(`java -cp ${classPath} ${className}`, "command");

  let executionPromise;
  try {
    executionPromise = executeTranspiledJava(transpileJavaMain(file.content));
  } catch (error) {
    executionPromise = Promise.resolve({ output: [], error: { name: error.name, message: error.message } });
  }

  const result = await executionPromise;
  if (run.cancelled) return;
  await simulateRuntime(file, run, result.executionTrace || []);
  if (run.cancelled) return;

  result.output.forEach((line) => appendTerminalLine(line));
  if (result.error) {
    const prefix = result.error.name === "SyntaxError"
      ? "Fehler: Java-Code konnte nicht kompiliert werden."
      : "Exception in thread \"main\" java.lang.RuntimeException";
    appendTerminalLine(`${prefix}\n${result.error.message}`, "error");
    appendTerminalLine("Process finished with exit code 1", "exit-error");
  } else {
    appendTerminalLine("Process finished with exit code 0", "exit");
  }
  clearRuntimeTrace(run);
  if (activeRuntimeRun === run) activeRuntimeRun = null;
}

function createRuntimePlayButton(file, compact = false) {
  const playButton = createElement("button", `runtime-play-button${compact ? " tree-runtime-play" : ""}`);
  playButton.type = "button";
  playButton.setAttribute("aria-label", `${file.name} ausführen`);
  playButton.title = `${file.name} ausführen`;
  playButton.dataset.runPath = file.path;
  playButton.append(createElement("span", "play-icon"));
  playButton.addEventListener("click", (event) => {
    event.stopPropagation();
    runJavaFile(file);
  });
  return playButton;
}

function createCompilePlayButton(file, compact = false) {
  const compileButton = createElement("button", `compile-play-button${compact ? " tree-compile-play" : ""}`);
  compileButton.type = "button";
  compileButton.setAttribute("aria-label", `${file.name} kompilieren`);
  compileButton.title = `${file.name} kompilieren`;
  compileButton.dataset.compilePath = file.path;
  compileButton.append(createElement("span", "play-icon"));
  compileButton.addEventListener("click", (event) => {
    event.stopPropagation();
    runJavaCompilation(file);
  });
  return compileButton;
}

function setFolderCollapsed(folderPath, collapsed) {
  folderCollapsedState.set(folderPath, collapsed);
  const escapedPath = CSS.escape(folderPath);

  document.querySelectorAll(`.tree-folder[data-folder-path="${escapedPath}"]`).forEach((folderNode) => {
    const children = folderNode.querySelector(":scope > .tree-children");
    const button = folderNode.querySelector(":scope > .tree-folder-button");
    folderNode.classList.toggle("collapsed", collapsed);
    if (children) children.hidden = collapsed;
    if (button) {
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", `${folderNode.dataset.folderName} ${collapsed ? "aufklappen" : "zuklappen"}`);
    }
  });

  document.querySelectorAll(`.architecture-folder[data-folder-path="${escapedPath}"]`).forEach((folderNode) => {
    const body = folderNode.querySelector(":scope > .architecture-folder-body");
    const tab = folderNode.querySelector(":scope > .architecture-folder-tab");
    folderNode.classList.toggle("collapsed", collapsed);
    if (body) body.hidden = collapsed;
    if (tab) {
      tab.setAttribute("aria-expanded", String(!collapsed));
      tab.setAttribute("aria-label", `${folderNode.dataset.folderName} ${collapsed ? "aufklappen" : "zuklappen"}`);
    }
  });

  window.requestAnimationFrame(drawAllDeclarationLanes);
}

function expandFoldersForFile(filePath) {
  const pathParts = filePath.split("/").slice(0, -1);
  setFolderCollapsed("", false);
  pathParts.forEach((part, index) => setFolderCollapsed(pathParts.slice(0, index + 1).join("/"), false));
}

function selectFileInBothTrees(filePath, { scrollArchitecture = false, scrollTree = false } = {}) {
  selectedFilePath = filePath;
  expandFoldersForFile(filePath);

  document.querySelectorAll(".tree-file-button.selected").forEach((button) => button.classList.remove("selected"));
  document.querySelectorAll(".architecture-file.tree-selected").forEach((node) => node.classList.remove("tree-selected"));

  const escapedPath = CSS.escape(filePath);
  const treeButton = folderTreeContainer.querySelector(`.tree-file-button[data-file-path="${escapedPath}"]`);
  const fileNode = diagramContainer.querySelector(`.architecture-file[data-file-path="${escapedPath}"]`);
  treeButton?.classList.add("selected");
  fileNode?.classList.add("tree-selected");

  if (scrollTree) treeButton?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (scrollArchitecture) fileNode?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  window.requestAnimationFrame(drawAllDeclarationLanes);
}

function revealArchitectureFile(filePath) {
  selectFileInBothTrees(filePath, { scrollArchitecture: true, scrollTree: true });
}

function createFolderTreeItem(node, isRoot = false) {
  const item = createElement("li", node.type === "directory" ? "tree-folder" : "tree-file");

  if (node.type === "file") {
    const fileButton = createElement("button", "tree-file-button");
    fileButton.type = "button";
    fileButton.dataset.filePath = node.path;
    fileButton.setAttribute("aria-label", `${node.name} im Diagramm anzeigen`);
    fileButton.classList.toggle("selected", selectedFilePath === node.path);
    fileButton.append(
      createElement("span", "tree-java-icon", "J"),
      createElement("span", "tree-item-name", node.name)
    );
    fileButton.addEventListener("click", () => {
      revealArchitectureFile(node.path);
    });
    item.append(fileButton, createCompilePlayButton(node, true));
    if (hasMainMethod(node.content)) item.append(createRuntimePlayButton(node, true));
    return item;
  }

  const folderButton = createElement("button", "tree-folder-button");
  const children = createElement("ul", "tree-children");
  const collapsed = folderCollapsedState.get(node.path) ?? true;
  item.dataset.folderName = node.name;
  item.dataset.folderPath = node.path;
  item.classList.toggle("collapsed", collapsed);
  folderButton.type = "button";
  folderButton.setAttribute("aria-expanded", String(!collapsed));
  folderButton.setAttribute("aria-label", `${node.name} ${collapsed ? "aufklappen" : "zuklappen"}`);
  folderButton.append(
    createElement("span", "tree-chevron", "▼"),
    createElement("span", "tree-folder-icon"),
    createElement("span", "tree-item-name", node.name)
  );
  (node.children || []).forEach((child) => children.append(createFolderTreeItem(child)));
  children.hidden = collapsed;
  folderButton.addEventListener("click", () => {
    setFolderCollapsed(node.path, !item.classList.contains("collapsed"));
  });
  if (isRoot) item.classList.add("tree-root");
  item.append(folderButton, children);
  return item;
}

function renderFolderTree(root) {
  const treeList = createElement("ul", "tree-list");
  treeList.append(createFolderTreeItem(root, true));
  folderTreeContainer.replaceChildren(treeList);
}

function createSourceCode(file) {
  const sourceRegion = document.createElement("div");
  const sourceLabel = document.createElement("span");
  const sourceCanvas = document.createElement("div");
  const sourceCode = document.createElement("ol");
  const laneOverlay = createSvgElement("svg", {
    class: "declaration-lanes",
    "aria-hidden": "true"
  });
  const lines = file.content.replace(/\r/g, "").split("\n");
  const declarations = analyzeDeclarations(lines);
  const declarationsByLine = new Map(declarations.map((declaration) => [declaration.lineIndex, declaration]));

  sourceRegion.className = "file-source";
  sourceRegion.laneDeclarations = declarations;
  sourceLabel.className = "file-source-label";
  sourceLabel.textContent = "Quellcode";
  sourceCanvas.className = "source-code-canvas";
  sourceCode.className = "source-code";
  sourceCode.setAttribute("aria-label", `Quellcode von ${file.name}`);

  const syntaxState = { inBlockComment: false };

  lines.forEach((line, lineIndex) => {
    const sourceLine = document.createElement("li");
    const lineContent = document.createElement("span");
    const indentation = line.match(/^\s*/)?.[0] || "";
    const highlightedLine = highlightJavaLine(line, syntaxState);
    lineContent.className = "code-line-content";
    sourceLine.dataset.lineIndex = String(lineIndex);
    lineContent.innerHTML = highlightedLine.slice(indentation.length) || " ";

    const declaration = declarationsByLine.get(lineIndex);
    if (declaration) {
      sourceLine.classList.add("declaration-line");
      lineContent.classList.add("declaration-frame", `declaration-${declaration.kind}`);
      sourceLine.dataset.declaration = declaration.name;
    }

    const callerKinds = declarations
      .filter((item) => item.usages.includes(lineIndex))
      .map((item) => item.kind);
    if (callerKinds.length) {
      sourceLine.classList.add("caller-line");
      lineContent.classList.add("caller-frame", `caller-${callerKinds[0]}`);
      sourceLine.dataset.callerKinds = [...new Set(callerKinds)].join(" ");
    }

    sourceLine.append(document.createTextNode(indentation), lineContent);
    sourceCode.append(sourceLine);
  });

  sourceCanvas.append(sourceCode, laneOverlay);
  sourceRegion.append(sourceLabel, sourceCanvas);
  return sourceRegion;
}

function restoreMaximizedFile() {
  if (!maximizedFileState) return;

  const { fileNode } = maximizedFileState;
  fileNode.classList.remove("maximized");
  document.body.classList.remove("file-is-maximized");
  fileNode.dataset.sizeMode = "normal";
  fileNode.querySelectorAll(".file-size-button").forEach((button) => {
    const active = button.dataset.sizeMode === "normal";
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  maximizedFileState = null;
  window.requestAnimationFrame(drawAllDeclarationLanes);
}

function setFileDisplayMode(fileNode, mode) {
  if (maximizedFileState?.fileNode && maximizedFileState.fileNode !== fileNode) restoreMaximizedFile();
  if (maximizedFileState?.fileNode === fileNode && mode !== "maximized") {
    fileNode.classList.remove("maximized");
    document.body.classList.remove("file-is-maximized");
    maximizedFileState = null;
  }

  fileNode.classList.toggle("maximized", mode === "maximized");
  fileNode.classList.toggle("micro", mode === "micro");
  fileNode.dataset.sizeMode = mode;
  if (mode === "maximized") {
    document.body.classList.add("file-is-maximized");
    maximizedFileState = { fileNode };
    fileNode.scrollTo({ top: 0, left: 0 });
  }
  fileNode.querySelectorAll(".file-size-button").forEach((button) => {
    const active = button.dataset.sizeMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  window.requestAnimationFrame(drawAllDeclarationLanes);
}

function createFileSizeButton(fileNode, fileName, mode, icon, label) {
  const button = createElement("button", "file-size-button");
  button.type = "button";
  button.dataset.sizeMode = mode;
  button.setAttribute("aria-label", `${fileName} ${label}`);
  button.setAttribute("aria-pressed", String(mode === "normal"));
  button.title = label.charAt(0).toUpperCase() + label.slice(1);
  button.classList.toggle("active", mode === "normal");
  button.append(createElement("span", "file-size-icon", icon));
  button.addEventListener("click", () => setFileDisplayMode(fileNode, mode));
  return button;
}

function closeZTypeMode() {
  if (!activeZTypeSession) return;
  activeZTypeSession.cancelled = true;
  activeZTypeSession.fallAnimation?.cancel();
  window.clearTimeout(activeZTypeSession.nextLineTimer);
  document.removeEventListener("keydown", activeZTypeSession.handleKeyDown, true);
  activeZTypeSession.overlay.remove();
  document.body.classList.remove("ztype-open");
  activeZTypeSession = null;
}

function revealZTypeCodeCharacter(session, lineIndex, characterIndex) {
  session.codeCharacters[lineIndex]?.[characterIndex]?.classList.add("revealed");
}

function createZTypeHighlightedCharacters(line, syntaxState) {
  if (!line.length) {
    highlightJavaLine(line, syntaxState);
    return [];
  }

  const highlightedLine = document.createElement("span");
  highlightedLine.innerHTML = highlightJavaLine(line, syntaxState);
  const characters = [];

  const appendCharacters = (node, syntaxClass = "") => {
    if (node.nodeType === Node.TEXT_NODE) {
      [...node.textContent].forEach((character) => {
        const characterNode = createElement(
          "span",
          `ztype-code-character${syntaxClass ? ` ${syntaxClass}` : ""}`,
          character
        );
        characters.push(characterNode);
      });
      return;
    }

    const nodeSyntaxClass = [...node.classList].find((className) => className.startsWith("syntax-"));
    node.childNodes.forEach((child) => appendCharacters(child, nodeSyntaxClass || syntaxClass));
  };

  highlightedLine.childNodes.forEach((node) => appendCharacters(node));
  return characters;
}

function fireZTypeLaser(session) {
  session.laser.classList.remove("fire");
  void session.laser.offsetWidth;
  session.laser.classList.add("fire");
}

function updateZTypeHud(session) {
  session.lineCounter.textContent = `Zeile ${Math.min(session.lineIndex + 1, session.lines.length)} / ${session.lines.length}`;
  session.hitCounter.textContent = `Treffer ${session.hits}`;
  session.mistakeCounter.textContent = `Fehler ${session.mistakes}`;
}

function startNextZTypeLine(session) {
  if (session.cancelled) return;
  session.fallAnimation?.cancel();
  session.targetLayer.replaceChildren();
  session.codeLines.forEach((line) => line.classList.remove("active"));

  while (session.lineIndex < session.lines.length && !session.lines[session.lineIndex].trim()) {
    session.codeCharacters[session.lineIndex].forEach((character) => character.classList.add("revealed"));
    session.codeLines[session.lineIndex].classList.add("completed");
    session.lineIndex++;
  }

  if (session.lineIndex >= session.lines.length) {
    updateZTypeHud(session);
    session.status.textContent = "Datei vollständig erfasst";
    session.field.classList.add("complete");
    const completion = createElement("div", "ztype-completion");
    completion.append(
      createElement("strong", "", "CODE COMPLETE"),
      createElement("span", "", `${session.hits} richtige Zeichen · ${session.mistakes} Fehler`)
    );
    session.targetLayer.append(completion);
    return;
  }

  const rawLine = session.lines[session.lineIndex];
  const targetText = rawLine.trim();
  const sourceOffset = rawLine.indexOf(targetText);
  const target = createElement("div", "ztype-target-line");
  const targetCharacters = [...targetText].map((character) => createElement("span", "ztype-target-character", character));
  target.append(...targetCharacters);
  session.targetLayer.append(target);
  session.codeLines[session.lineIndex].classList.add("active");
  session.codeLines[session.lineIndex].scrollIntoView({ block: "nearest" });
  session.currentTarget = target;
  session.targetCharacters = targetCharacters;
  session.targetText = targetText;
  session.sourceOffset = sourceOffset;
  session.characterIndex = 0;
  session.status.textContent = `Tippe Zeile ${session.lineIndex + 1}`;
  updateZTypeHud(session);

  window.requestAnimationFrame(() => {
    if (session.cancelled || !target.isConnected) return;
    const destination = Math.max(160, session.field.clientHeight - 150);
    const duration = Math.max(22000, Math.min(42000, 18000 + targetText.length * 360));
    session.fallAnimation = target.animate([
      { transform: "translate(-50%, 0)" },
      { transform: `translate(-50%, ${destination}px)` }
    ], { duration, easing: "linear", fill: "forwards" });
    session.fallAnimation.onfinish = () => {
      if (session.cancelled || session.characterIndex >= session.targetText.length) return;
      session.field.classList.add("hit");
      session.status.textContent = "Treffer – Zeile startet erneut";
      window.setTimeout(() => session.field.classList.remove("hit"), 320);
      session.nextLineTimer = window.setTimeout(() => startNextZTypeLine(session), 650);
    };
  });
}

function openZTypeMode(file) {
  closeDiagramBuilderMode();
  closeZTypeMode();
  cancelActiveRuntimeRun();
  cancelActiveCompileRun();

  const overlay = createElement("section", "ztype-overlay");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `ZType-Training für ${file.name}`);
  overlay.tabIndex = -1;
  const header = createElement("header", "ztype-header");
  const backButton = createElement("button", "ztype-back-button", "← Zurück");
  backButton.type = "button";
  backButton.setAttribute("aria-label", "ZType-Training schließen");
  const title = createElement("div", "ztype-title");
  title.append(createElement("small", "", "CODEHEARTBEAT"), createElement("strong", "", "ZTYPE"), createElement("span", "", file.name));
  const hud = createElement("div", "ztype-hud");
  const lineCounter = createElement("span", "", "Zeile 1");
  const hitCounter = createElement("span", "", "Treffer 0");
  const mistakeCounter = createElement("span", "", "Fehler 0");
  hud.append(lineCounter, hitCounter, mistakeCounter);
  header.append(backButton, title, hud);

  const main = createElement("div", "ztype-main");
  const codePane = createElement("section", "ztype-code-pane");
  codePane.append(createElement("div", "ztype-pane-label", "CODE · wird beim Tippen sichtbar"));
  const codeList = createElement("ol", "ztype-code-list");
  const lines = file.content.replace(/\r/g, "").split("\n");
  const codeCharacters = [];
  const codeLines = [];
  const syntaxState = { inBlockComment: false };
  lines.forEach((line) => {
    const lineNode = createElement("li", "ztype-code-line");
    const text = createElement("code", "ztype-code-text");
    const characters = createZTypeHighlightedCharacters(line, syntaxState);
    if (!characters.length) text.append(" ");
    else text.append(...characters);
    lineNode.append(text);
    codeList.append(lineNode);
    codeCharacters.push(characters);
    codeLines.push(lineNode);
  });
  codePane.append(codeList);

  const field = createElement("section", "ztype-field");
  field.setAttribute("aria-label", "ZType-Spielfeld");
  field.append(createElement("div", "ztype-pane-label", "TYPE TO DEFEND"));
  const targetLayer = createElement("div", "ztype-target-layer");
  const laser = createElement("span", "ztype-laser");
  const ship = createElement("div", "ztype-ship");
  ship.setAttribute("aria-label", "Raumschiff");
  ship.append(
    createElement("span", "ztype-ship-wing left"),
    createElement("span", "ztype-ship-body"),
    createElement("span", "ztype-ship-cockpit"),
    createElement("span", "ztype-ship-wing right"),
    createElement("span", "ztype-ship-thruster")
  );
  const status = createElement("div", "ztype-status", "Tippe den fallenden Java-Code");
  status.setAttribute("aria-live", "polite");
  field.append(targetLayer, laser, ship, status);
  main.append(codePane, field);
  overlay.append(header, main);
  document.body.append(overlay);
  document.body.classList.add("ztype-open");

  const session = {
    cancelled: false,
    overlay,
    field,
    targetLayer,
    laser,
    status,
    lineCounter,
    hitCounter,
    mistakeCounter,
    lines,
    codeLines,
    codeCharacters,
    lineIndex: 0,
    characterIndex: 0,
    hits: 0,
    mistakes: 0,
    fallAnimation: null,
    nextLineTimer: null,
    handleKeyDown: null
  };

  session.handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeZTypeMode();
      return;
    }
    const hasCommandShortcut = event.metaKey || (event.ctrlKey && !event.altKey);
    if (session.cancelled || !session.currentTarget || hasCommandShortcut || event.key.length !== 1) return;
    event.preventDefault();
    const expected = session.targetText[session.characterIndex];
    if (event.key !== expected) {
      session.mistakes++;
      session.field.classList.remove("wrong");
      void session.field.offsetWidth;
      session.field.classList.add("wrong");
      updateZTypeHud(session);
      return;
    }

    session.hits++;
    const targetCharacter = session.targetCharacters[session.characterIndex];
    targetCharacter.classList.add("hit");
    revealZTypeCodeCharacter(session, session.lineIndex, session.sourceOffset + session.characterIndex);
    session.characterIndex++;
    fireZTypeLaser(session);
    updateZTypeHud(session);

    if (session.characterIndex >= session.targetText.length) {
      session.fallAnimation?.cancel();
      session.currentTarget.classList.add("destroyed");
      session.codeLines[session.lineIndex].classList.remove("active");
      session.codeLines[session.lineIndex].classList.add("completed");
      session.status.textContent = `Zeile ${session.lineIndex + 1} abgewehrt`;
      session.lineIndex++;
      session.nextLineTimer = window.setTimeout(() => startNextZTypeLine(session), 420);
    }
  };

  activeZTypeSession = session;
  backButton.addEventListener("click", closeZTypeMode);
  document.addEventListener("keydown", session.handleKeyDown, true);
  overlay.focus({ preventScroll: true });
  startNextZTypeLine(session);
}

function diagramBuilderPiece(kind, paletteLabel) {
  return { kind, label: "", paletteLabel, lineIndex: null };
}

function diagramBuilderIsDiamond(piece) {
  return ["activity-decision", "state-choice", "pap-decision"].includes(piece?.kind);
}

function diagramBuilderIsSequenceParticipant(piece) {
  return ["sequence-actor", "sequence-object"].includes(piece?.kind);
}

function diagramBuilderIsClassifier(piece) {
  return ["class-box", "class-abstract", "class-interface", "class-enum"].includes(piece?.kind);
}

function createDiagramBuilderPieces(file, viewType = "activity") {
  const piecesByView = {
    class: [
      diagramBuilderPiece("class-box", "Klasse"),
      diagramBuilderPiece("class-abstract", "Abstrakte Klasse"),
      diagramBuilderPiece("class-interface", "Interface"),
      diagramBuilderPiece("class-enum", "Enumeration"),
      diagramBuilderPiece("class-package", "Paket")
    ],
    state: [
      diagramBuilderPiece("state-start", "Startzustand"),
      diagramBuilderPiece("state", "Zustand"),
      diagramBuilderPiece("state-choice", "Verzweigung"),
      diagramBuilderPiece("state-end", "Endzustand")
    ],
    usecase: [
      diagramBuilderPiece("actor", "Aktor"),
      diagramBuilderPiece("usecase", "Anwendungsfall"),
      diagramBuilderPiece("boundary", "Systemgrenze")
    ],
    activity: [
      diagramBuilderPiece("activity-start", "Start"),
      diagramBuilderPiece("activity-action", "Aktion"),
      diagramBuilderPiece("activity-decision", "Entscheidung"),
      diagramBuilderPiece("activity-end", "Ende"),
      diagramBuilderPiece("activity-swimlane", "Swimlane")
    ],
    sequence: [
      diagramBuilderPiece("sequence-actor", "Aktor"),
      diagramBuilderPiece("sequence-object", "Objekt"),
      diagramBuilderPiece("sequence-activation", "Aktivitätsbalken"),
      diagramBuilderPiece("sequence-fragment", "Kombiniertes Fragment")
    ],
    pap: [
      diagramBuilderPiece("pap-start", "Start"),
      diagramBuilderPiece("pap-process", "Verarbeitung"),
      diagramBuilderPiece("pap-decision", "Entscheidungsraute"),
      diagramBuilderPiece("pap-decision-table", "Entscheidungstabelle"),
      diagramBuilderPiece("pap-output", "Ein-/Ausgabe"),
      diagramBuilderPiece("pap-end", "Ende")
    ]
  };
  return piecesByView[viewType] || piecesByView.activity;
}

function highlightDiagramBuilderCodeLine(session, lineIndex) {
  session.codeLines.forEach((line) => line.classList.toggle("builder-code-active", Number(line.dataset.lineIndex) === lineIndex));
  if (Number.isInteger(lineIndex)) session.codeLines[lineIndex]?.scrollIntoView({ block: "nearest" });
}

const DIAGRAM_BUILDER_DEFAULT_CELL_WIDTH = 140;
const DIAGRAM_BUILDER_DEFAULT_CELL_HEIGHT = 100;
const DIAGRAM_BUILDER_CLASS_CELL_WIDTH = 270;
const DIAGRAM_BUILDER_CLASS_CELL_HEIGHT = 170;
const DIAGRAM_BUILDER_DECISION_RULE_COUNT = 4;

function diagramBuilderDecisionTableRows(piece, key, fallbackValue) {
  const rows = Array.isArray(piece?.[key]) ? piece[key] : [];
  const normalized = rows.map((row) => ({
    label: String(row?.label || ""),
    values: Array.from(
      { length: DIAGRAM_BUILDER_DECISION_RULE_COUNT },
      (_, index) => String(row?.values?.[index] || fallbackValue)
    )
  }));
  return normalized.length ? normalized : [{
    label: "",
    values: Array(DIAGRAM_BUILDER_DECISION_RULE_COUNT).fill(fallbackValue)
  }];
}

function diagramBuilderDecisionActionPortFraction(piece, metrics = diagramBuilderPieceMetrics(piece)) {
  const conditionCount = diagramBuilderDecisionTableRows(piece, "conditions", "J").length;
  const actionCount = diagramBuilderDecisionTableRows(piece, "actions", "-").length;
  const headerHeight = 59;
  const separatorHeight = 12;
  const rowHeight = 34;
  const tableHeight = headerHeight + (conditionCount + actionCount) * rowHeight + separatorHeight;
  const topInset = Math.max(0, (metrics.elementHeight - tableHeight) / 2);
  const actionCenter = topInset + headerHeight + conditionCount * rowHeight + separatorHeight + actionCount * rowHeight / 2;
  return Math.max(0.1, Math.min(0.9, actionCenter / metrics.elementHeight));
}

function diagramBuilderPieceMetrics(piece) {
  const text = String(piece.label || "");
  const logicalLines = text.split("\n");
  if (["activity-start", "activity-end", "state-start", "state-end"].includes(piece.kind)) {
    const charactersPerLine = 36;
    const lineCount = Math.max(1, logicalLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    const labelCharacters = Math.min(charactersPerLine, Math.max(1, ...logicalLines.map((line) => line.length)));
    const labelWidth = text ? Math.max(70, labelCharacters * 6 + 18) : 28;
    return { elementWidth: 28, elementHeight: 28, labelWidth, visualWidth: labelWidth, visualHeight: text ? 38 + lineCount * 14 : 28 };
  }
  if (["activity-decision", "state-choice", "pap-decision"].includes(piece.kind)) {
    const charactersPerLine = 22;
    const lineCount = Math.max(1, logicalLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    const labelCharacters = Math.min(charactersPerLine, Math.max(1, ...logicalLines.map((line) => line.length)));
    const labelWidth = Math.max(58, labelCharacters * 6 + 10);
    const labelHeight = lineCount * 14;
    const diamondSize = Math.max(88, labelWidth + labelHeight + 32);
    return { elementWidth: diamondSize, elementHeight: diamondSize, labelWidth, visualWidth: diamondSize, visualHeight: diamondSize };
  }
  if (piece.kind === "state") {
    const behaviors = piece.behaviors || {};
    const behaviorTexts = [behaviors.entry, behaviors.do, behaviors.exit].filter(Boolean).map(String);
    const longestText = Math.max(0, text.length, ...behaviorTexts.map((value) => value.length + 8));
    const elementWidth = Math.min(360, Math.max(190, longestText * 6 + 42));
    const elementHeight = Math.max(96, 48 + behaviorTexts.length * 23);
    return { elementWidth, elementHeight, labelWidth: elementWidth - 28, visualWidth: elementWidth, visualHeight: elementHeight };
  }
  if (diagramBuilderIsClassifier(piece)) {
    const attributes = Array.isArray(piece.attributes) ? piece.attributes : [];
    const methods = Array.isArray(piece.methods) ? piece.methods : [];
    const literals = Array.isArray(piece.literals) ? piece.literals : [];
    const rows = piece.kind === "class-enum" ? literals : [...attributes, ...methods];
    const longestText = Math.max(0, text.length, ...rows.map((value) => String(value).length));
    const elementWidth = Math.min(380, Math.max(180, longestText * 6 + 46));
    const headerHeight = piece.kind === "class-box" ? 38 : 50;
    const sectionHeight = (values) => Math.max(28, values.length * 20 + 12);
    const elementHeight = piece.kind === "class-enum"
      ? headerHeight + sectionHeight(literals)
      : headerHeight + sectionHeight(attributes) + sectionHeight(methods);
    return { elementWidth, elementHeight, labelWidth: elementWidth - 28, visualWidth: elementWidth, visualHeight: elementHeight };
  }
  if (piece.kind === "pap-decision-table") {
    const conditions = diagramBuilderDecisionTableRows(piece, "conditions", "J");
    const actions = diagramBuilderDecisionTableRows(piece, "actions", "-");
    const longestLabel = Math.max(
      0,
      text.length,
      ...conditions.map((row) => row.label.length),
      ...actions.map((row) => row.label.length)
    );
    const descriptionWidth = Math.min(280, Math.max(180, longestLabel * 6 + 72));
    const elementWidth = 32 + descriptionWidth + DIAGRAM_BUILDER_DECISION_RULE_COUNT * 48;
    const conditionHeight = Math.max(120, conditions.length * 34);
    const actionHeight = Math.max(120, actions.length * 34);
    const elementHeight = 59 + conditionHeight + actionHeight + 12;
    return { elementWidth, elementHeight, labelWidth: descriptionWidth, visualWidth: elementWidth, visualHeight: elementHeight };
  }
  const fixedMetrics = {
    "class-package": [170, 90],
    actor: [80, 90],
    usecase: [180, 76],
    boundary: [330, 240],
    "sequence-actor": [80, 90],
    "sequence-object": [170, 58],
    "sequence-activation": [14, 72],
    "sequence-fragment": [240, 120]
  }[piece.kind];
  if (fixedMetrics) {
    const [elementWidth, elementHeight] = fixedMetrics;
    return { elementWidth, elementHeight, labelWidth: Math.max(54, elementWidth - 28), visualWidth: elementWidth, visualHeight: elementHeight };
  }
  const charactersPerLine = 42;
  const lineCount = Math.max(1, logicalLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
  const labelCharacters = Math.min(charactersPerLine, Math.max(1, ...logicalLines.map((line) => line.length)));
  const elementWidth = Math.min(320, Math.max(112, labelCharacters * 6 + 34));
  const elementHeight = Math.max(52, lineCount * 14 + 24);
  return { elementWidth, elementHeight, labelWidth: elementWidth - 28, visualWidth: elementWidth, visualHeight: elementHeight };
}

function applyDiagramBuilderPieceMetrics(node, piece) {
  const metrics = diagramBuilderPieceMetrics(piece);
  node.style.setProperty("--builder-piece-width", `${metrics.elementWidth}px`);
  node.style.setProperty("--builder-piece-height", `${metrics.elementHeight}px`);
  node.style.setProperty("--builder-label-width", `${metrics.labelWidth}px`);
  return metrics;
}

function diagramBuilderPlacementSpan(session, piece) {
  if (session.viewType !== "class" || !diagramBuilderIsClassifier(piece)) return { columns: 1, rows: 1 };
  const metrics = diagramBuilderPieceMetrics(piece);
  return {
    columns: Math.max(1, Math.ceil(metrics.visualWidth / session.cellWidth)),
    rows: Math.max(1, Math.ceil(metrics.visualHeight / session.cellHeight))
  };
}

function applyDiagramBuilderPlacementSpan(session, piece, cell) {
  const span = diagramBuilderPlacementSpan(session, piece);
  cell.style.width = `${span.columns * session.cellWidth}px`;
  cell.style.height = `${span.rows * session.cellHeight}px`;
  return span;
}

function updateDiagramBuilderGridMetrics(session) {
  if (session.viewType === "class") {
    session.cellWidth = DIAGRAM_BUILDER_CLASS_CELL_WIDTH;
    session.cellHeight = DIAGRAM_BUILDER_CLASS_CELL_HEIGHT;
  } else {
    const metrics = session.placements
      .filter((placement) => placement.piece.kind !== "sequence-activation")
      .map((placement) => diagramBuilderPieceMetrics(placement.piece));
    const largestWidth = metrics.length ? Math.max(...metrics.map((item) => item.visualWidth)) : 0;
    const largestHeight = metrics.length ? Math.max(...metrics.map((item) => item.visualHeight)) : 0;
    session.cellWidth = Math.max(DIAGRAM_BUILDER_DEFAULT_CELL_WIDTH, Math.ceil((largestWidth + 28) / 10) * 10);
    session.cellHeight = Math.max(DIAGRAM_BUILDER_DEFAULT_CELL_HEIGHT, Math.ceil((largestHeight + 28) / 10) * 10);
  }
  const maximumColumn = Math.max(
    0,
    ...session.placements.map((placement) => placement.column + diagramBuilderPlacementSpan(session, placement.piece).columns - 1),
    ...session.swimlanes.map((swimlane) => swimlane.rightColumn - 1),
    ...session.systemBoundaries.map((boundary) => boundary.rightColumn - 1),
    ...session.sequenceFragments.map((fragment) => fragment.rightColumn - 1)
  );
  const maximumRow = Math.max(
    0,
    ...session.placements.map((placement) => placement.row + (
      placement.piece.kind === "sequence-activation"
        ? Math.max(1, Number(placement.piece.activationRows) || 1)
        : diagramBuilderPlacementSpan(session, placement.piece).rows
    ) - 1),
    ...session.systemBoundaries.map((boundary) => boundary.bottomRow - 1),
    ...session.sequenceFragments.map((fragment) => fragment.bottomRow - 1),
    ...session.placements
      .filter((placement) => diagramBuilderIsSequenceParticipant(placement.piece))
      .map((placement) => placement.row + Math.max(1, Number(placement.piece.lifelineRows) || 1))
  );
  session.surface.style.setProperty("--builder-cell-width", `${session.cellWidth}px`);
  session.surface.style.setProperty("--builder-cell-height", `${session.cellHeight}px`);
  session.surface.style.minWidth = `${Math.max(640, (maximumColumn + 1) * session.cellWidth)}px`;
  session.surface.style.minHeight = `${Math.max(600, (maximumRow + 1) * session.cellHeight)}px`;
}

function diagramBuilderCellFromPoint(session, clientX, clientY) {
  const rect = session.surface.getBoundingClientRect();
  const zoom = session.gridZoom || 1;
  const columns = Math.max(1, Math.floor(session.surface.clientWidth / session.cellWidth));
  const rows = Math.max(1, Math.floor(session.surface.clientHeight / session.cellHeight));
  return {
    column: Math.min(columns - 1, Math.max(0, Math.floor((clientX - rect.left) / (session.cellWidth * zoom)))),
    row: Math.min(rows - 1, Math.max(0, Math.floor((clientY - rect.top) / (session.cellHeight * zoom))))
  };
}

function diagramBuilderPlacementAt(session, row, column, ignoredId = null) {
  return session.placements.find((placement) => {
    if (placement.id === ignoredId) return false;
    const span = diagramBuilderPlacementSpan(session, placement.piece);
    const occupiedRows = placement.piece.kind === "sequence-activation"
      ? Math.max(1, Number(placement.piece.activationRows) || 1)
      : span.rows;
    return column >= placement.column
      && column < placement.column + span.columns
      && row >= placement.row
      && row < placement.row + occupiedRows;
  });
}

function diagramBuilderPlacementOverlaps(session, piece, row, column, ignoredId = null) {
  const candidateSpan = diagramBuilderPlacementSpan(session, piece);
  return session.placements.some((placement) => {
    if (placement.id === ignoredId) return false;
    const placedSpan = diagramBuilderPlacementSpan(session, placement.piece);
    const candidateRows = piece.kind === "sequence-activation"
      ? Math.max(1, Number(piece.activationRows) || 1)
      : candidateSpan.rows;
    const placedRows = placement.piece.kind === "sequence-activation"
      ? Math.max(1, Number(placement.piece.activationRows) || 1)
      : placedSpan.rows;
    return column < placement.column + placedSpan.columns
      && column + candidateSpan.columns > placement.column
      && row < placement.row + placedRows
      && row + candidateRows > placement.row;
  });
}

function diagramBuilderLifelineCoversCell(participant, row, column) {
  if (!participant || !diagramBuilderIsSequenceParticipant(participant.piece)) return false;
  const length = Math.max(1, Number(participant.piece.lifelineRows) || 1);
  return participant.column === column && row > participant.row && row <= participant.row + length;
}

function diagramBuilderActivationHasLifeline(session, row, column, participantOverride = null, activationRows = 1) {
  const lastRow = row + Math.max(1, Number(activationRows) || 1) - 1;
  return session.placements.some((placement) => {
    const participant = participantOverride?.id === placement.id ? participantOverride : placement;
    return diagramBuilderLifelineCoversCell(participant, row, column)
      && diagramBuilderLifelineCoversCell(participant, lastRow, column);
  });
}

function diagramBuilderCanResizeActivation(session, placement, row, activationRows) {
  const rows = Math.max(1, Number(activationRows) || 1);
  if (!diagramBuilderActivationHasLifeline(session, row, placement.column, null, rows)) return false;
  for (let currentRow = row; currentRow < row + rows; currentRow += 1) {
    if (diagramBuilderPlacementAt(session, currentRow, placement.column, placement.id)) return false;
  }
  return true;
}

function diagramBuilderCanPlacePiece(session, piece, row, column, ignoredId = null) {
  if (["boundary", "sequence-fragment"].includes(piece.kind)) return true;
  if (diagramBuilderPlacementOverlaps(session, piece, row, column, ignoredId)) return false;
  if (piece.kind === "sequence-activation") {
    const rows = Math.max(1, Number(piece.activationRows) || 1);
    if (!diagramBuilderActivationHasLifeline(session, row, column, null, rows)) return false;
    for (let currentRow = row; currentRow < row + rows; currentRow += 1) {
      if (diagramBuilderPlacementAt(session, currentRow, column, ignoredId)) return false;
    }
    return true;
  }
  if (!diagramBuilderIsSequenceParticipant(piece) || !ignoredId) return true;
  const override = { id: ignoredId, piece, row, column };
  return session.placements
    .filter((placement) => placement.piece.kind === "sequence-activation")
    .every((activation) => diagramBuilderActivationHasLifeline(
      session,
      activation.row,
      activation.column,
      override,
      activation.piece.activationRows
    ));
}

function setDiagramBuilderStatus(session, message, state = "") {
  session.status.textContent = message;
  session.status.dataset.state = state;
}

function clearDiagramBuilderConnectionMode(session) {
  session.pendingConnection = null;
  session.contextPlacementId = null;
  session.surface.classList.remove("connecting");
  session.surface.querySelectorAll(".connection-source").forEach((node) => node.classList.remove("connection-source"));
}

function clearDiagramBuilderPlacementMode(session, message = "") {
  session.armedPieceIndex = null;
  session.previewCell = null;
  session.overlay.classList.remove("placing-piece");
  session.surface.classList.remove("placing-piece");
  session.surface.querySelector(".diagram-builder-cursor-piece")?.remove();
  session.overlay.querySelector(".diagram-builder-floating-cursor")?.remove();
  session.palette.querySelectorAll(".placement-active").forEach((button) => {
    button.classList.remove("placement-active");
    button.setAttribute("aria-pressed", "false");
  });
  if (message) setDiagramBuilderStatus(session, message);
}

function createDiagramBuilderCursorVisual(piece, className) {
  const preview = createElement("div", className);
  const node = createElement("div", `diagram-builder-piece ${piece.kind}`);
  applyDiagramBuilderPieceMetrics(node, piece);
  appendDiagramBuilderPieceContent(node, piece, piece.label);
  preview.append(node);
  return preview;
}

function updateDiagramBuilderFloatingCursor(session, clientX, clientY) {
  if (!Number.isInteger(session.armedPieceIndex)) return;
  const piece = session.pieces[session.armedPieceIndex];
  if (!piece) return;
  let preview = session.overlay.querySelector(".diagram-builder-floating-cursor");
  if (!preview) {
    preview = createDiagramBuilderCursorVisual(piece, "diagram-builder-floating-cursor");
    session.overlay.append(preview);
  }
  preview.style.width = `${session.cellWidth}px`;
  preview.style.height = `${session.cellHeight}px`;
  preview.hidden = false;
  preview.style.left = `${clientX}px`;
  preview.style.top = `${clientY}px`;
}

function updateDiagramBuilderCursorPiece(session, clientX, clientY) {
  if (!Number.isInteger(session.armedPieceIndex)) return;
  const piece = session.pieces[session.armedPieceIndex];
  if (!piece) return;
  const cell = diagramBuilderCellFromPoint(session, clientX, clientY);
  session.previewCell = cell;
  let preview = session.surface.querySelector(".diagram-builder-cursor-piece");
  if (!preview) {
    preview = createDiagramBuilderCursorVisual(piece, "diagram-builder-cell-item diagram-builder-cursor-piece");
    session.surface.append(preview);
  }
  const floatingPreview = session.overlay.querySelector(".diagram-builder-floating-cursor");
  if (floatingPreview) floatingPreview.hidden = true;
  preview.style.left = `${cell.column * session.cellWidth}px`;
  preview.style.top = `${cell.row * session.cellHeight}px`;
  applyDiagramBuilderPlacementSpan(session, piece, preview);
  preview.classList.toggle("invalid", !diagramBuilderCanPlacePiece(session, piece, cell.row, cell.column));
}

function clearDiagramBuilderRepositionPreview(session) {
  session.repositionPreviewCell = null;
  session.surface.classList.remove("repositioning-piece");
  session.surface.querySelector(".diagram-builder-reposition-piece")?.remove();
}

function updateDiagramBuilderRepositionPreview(session, clientX, clientY) {
  if (!session.draggingPlacementId) return;
  const placement = session.placements.find((item) => item.id === session.draggingPlacementId);
  if (!placement) return;
  const cell = diagramBuilderCellFromPoint(session, clientX, clientY);
  session.repositionPreviewCell = cell;
  let preview = session.surface.querySelector(".diagram-builder-reposition-piece");
  if (!preview) {
    preview = createDiagramBuilderCursorVisual(
      placement.piece,
      "diagram-builder-cell-item diagram-builder-cursor-piece diagram-builder-reposition-piece"
    );
    session.surface.append(preview);
  }
  session.surface.classList.add("repositioning-piece");
  preview.style.left = `${cell.column * session.cellWidth}px`;
  preview.style.top = `${cell.row * session.cellHeight}px`;
  applyDiagramBuilderPlacementSpan(session, placement.piece, preview);
  preview.classList.toggle("invalid", !diagramBuilderCanPlacePiece(session, placement.piece, cell.row, cell.column, placement.id));
}

function beginDiagramBuilderPaletteDrag(session, pieceIndex, button, event) {
  if (event.button !== 0) return;
  const drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    active: false
  };
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY) < 6) return;
    moveEvent.preventDefault();
    if (!drag.active) {
      drag.active = true;
      session.paletteDragging = true;
      clearDiagramBuilderConnectionMode(session);
      clearDiagramBuilderPlacementMode(session);
      session.armedPieceIndex = pieceIndex;
      session.overlay.classList.add("placing-piece");
      session.surface.classList.add("placing-piece");
      button.classList.add("placement-active");
      button.setAttribute("aria-pressed", "true");
      setDiagramBuilderStatus(session, `„${session.pieces[pieceIndex].paletteLabel}“ aufgenommen – im Raster loslassen.`, "placing");
    }
    const surfaceRect = session.surface.getBoundingClientRect();
    const overSurface = moveEvent.clientX >= surfaceRect.left && moveEvent.clientX <= surfaceRect.right
      && moveEvent.clientY >= surfaceRect.top && moveEvent.clientY <= surfaceRect.bottom;
    if (overSurface) updateDiagramBuilderCursorPiece(session, moveEvent.clientX, moveEvent.clientY);
    else {
      session.surface.querySelector(".diagram-builder-cursor-piece")?.remove();
      updateDiagramBuilderFloatingCursor(session, moveEvent.clientX, moveEvent.clientY);
    }
  };
  const finish = (finishEvent, cancelled = false) => {
    if (finishEvent.pointerId !== drag.pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", cancel);
    session.paletteDragging = false;
    if (!drag.active) return;
    finishEvent.preventDefault();
    finishEvent.stopPropagation();
    const piece = session.pieces[pieceIndex];
    const surfaceRect = session.surface.getBoundingClientRect();
    const overSurface = !cancelled && finishEvent.clientX >= surfaceRect.left && finishEvent.clientX <= surfaceRect.right
      && finishEvent.clientY >= surfaceRect.top && finishEvent.clientY <= surfaceRect.bottom;
    const targetCell = overSurface ? diagramBuilderCellFromPoint(session, finishEvent.clientX, finishEvent.clientY) : null;
    clearDiagramBuilderPlacementMode(session);
    if (!piece || !targetCell) {
      setDiagramBuilderStatus(session, "Baustein wurde nicht platziert und ist in die Leiste zurückgekehrt.");
      return;
    }
    addDiagramBuilderPlacement(session, piece, targetCell.row, targetCell.column);
  };
  const cancel = (cancelEvent) => finish(cancelEvent, true);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", cancel);
}

function beginDiagramBuilderLabelEdit(session, placement) {
  session.finishEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  clearDiagramBuilderConnectionMode(session);
  const node = session.surface.querySelector(`[data-placement-id="${placement.id}"] .diagram-builder-piece`);
  if (diagramBuilderIsSequenceParticipant(placement.piece)) {
    beginDiagramBuilderSequenceParticipantEdit(session, placement, node);
    return;
  }
  if (placement.piece.kind === "sequence-activation") {
    beginDiagramBuilderSequenceActivationEdit(session, placement, node);
    return;
  }
  if (placement.piece.kind === "state") {
    beginDiagramBuilderStateEdit(session, placement, node);
    return;
  }
  if (diagramBuilderIsClassifier(placement.piece)) {
    beginDiagramBuilderClassifierEdit(session, placement, node);
    return;
  }
  if (placement.piece.kind === "pap-decision-table") {
    beginDiagramBuilderDecisionTableEdit(session, placement, node);
    return;
  }
  const label = node?.querySelector(".diagram-builder-piece-label");
  if (!node || !label) return;

  const originalLabel = placement.piece.label;
  const editor = createElement("input", "diagram-builder-label-editor");
  editor.type = "text";
  editor.value = originalLabel;
  editor.placeholder = "Text eingeben";
  editor.setAttribute("aria-label", `Beschriftung für ${placement.piece.paletteLabel} bearbeiten`);
  label.replaceWith(editor);
  node.classList.add("editing");
  session.editingPlacementId = placement.id;
  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    finished = true;
    placement.piece.label = save ? editor.value.trim() : originalLabel;
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Beschriftung übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("contextmenu", (event) => event.stopPropagation());
  editor.addEventListener("blur", () => session.finishEditing?.(true));
  editor.focus();
  editor.select();
}

function createDiagramBuilderDecisionSelect(value, options, label) {
  const select = createElement("select", "diagram-builder-decision-value-select");
  select.setAttribute("aria-label", label);
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    option.selected = optionValue === value;
    select.append(option);
  });
  return select;
}

function beginDiagramBuilderDecisionTableEdit(session, placement, node) {
  if (!node) return;
  const piece = placement.piece;
  const original = {
    label: piece.label || "",
    conditions: diagramBuilderDecisionTableRows(piece, "conditions", "J").map((row) => ({ ...row, values: [...row.values] })),
    actions: diagramBuilderDecisionTableRows(piece, "actions", "-").map((row) => ({ ...row, values: [...row.values] }))
  };
  const editor = createElement("div", "diagram-builder-decision-editor");
  const table = createElement("table", "diagram-builder-decision-table editing-table");
  const head = document.createElement("thead");
  const titleRow = document.createElement("tr");
  const titleCell = document.createElement("th");
  titleCell.className = "diagram-builder-decision-title";
  titleCell.colSpan = 2;
  titleCell.rowSpan = 2;
  const titleInput = createElement("input", "diagram-builder-decision-title-input");
  titleInput.type = "text";
  titleInput.value = original.label;
  titleInput.placeholder = "Entscheidung";
  titleInput.setAttribute("aria-label", "Titel der Entscheidungstabelle");
  titleCell.append(titleInput);
  const rulesTitle = document.createElement("th");
  rulesTitle.className = "diagram-builder-decision-rules-title";
  rulesTitle.colSpan = DIAGRAM_BUILDER_DECISION_RULE_COUNT;
  rulesTitle.textContent = "Regeln";
  titleRow.append(titleCell, rulesTitle);
  const ruleRow = document.createElement("tr");
  for (let ruleIndex = 0; ruleIndex < DIAGRAM_BUILDER_DECISION_RULE_COUNT; ruleIndex += 1) {
    const rule = document.createElement("th");
    rule.className = "diagram-builder-decision-rule-head";
    rule.textContent = `R${ruleIndex + 1}`;
    ruleRow.append(rule);
  }
  head.append(titleRow, ruleRow);
  table.append(head);

  const createGroup = (key, title, rowsData, options, fallbackValue) => {
    const body = createElement("tbody", `diagram-builder-decision-group ${key}`);
    const singular = title === "Bedingungen" ? "Bedingung" : "Aktion";
    const addButton = createElement("button", "diagram-builder-decision-add", "+");
    addButton.type = "button";
    addButton.title = `${singular} hinzufügen`;
    addButton.setAttribute("aria-label", addButton.title);
    const updateBand = () => {
      body.querySelector(".diagram-builder-decision-group-band")?.remove();
      const firstRow = body.querySelector(".diagram-builder-decision-editor-row");
      if (!firstRow) return;
      const band = document.createElement("th");
      band.className = "diagram-builder-decision-group-band";
      band.rowSpan = body.querySelectorAll(".diagram-builder-decision-editor-row").length;
      band.append(createElement("span", "diagram-builder-decision-group-label", title), addButton);
      firstRow.prepend(band);
    };
    const appendRow = (rowData = { label: "", values: Array(DIAGRAM_BUILDER_DECISION_RULE_COUNT).fill(fallbackValue) }) => {
      const row = createElement("tr", "diagram-builder-decision-editor-row");
      const labelCell = document.createElement("th");
      labelCell.className = "diagram-builder-decision-label-cell";
      const labelEditor = createElement("div", "diagram-builder-decision-label-editor");
      const dragHandle = createElement("button", "diagram-builder-decision-drag-handle");
      dragHandle.type = "button";
      dragHandle.title = "Halten und ziehen, um die Reihenfolge zu ändern";
      dragHandle.setAttribute("aria-label", `${singular} verschieben`);
      dragHandle.append(createElement("span", "diagram-builder-classifier-drag-icon", "⠿"));
      const input = createElement("input", "diagram-builder-decision-label-input");
      input.type = "text";
      input.value = rowData.label;
      input.placeholder = singular;
      input.setAttribute("aria-label", `${singular} beschriften`);
      const removeButton = createElement("button", "diagram-builder-decision-remove", "×");
      removeButton.type = "button";
      removeButton.title = `${singular} löschen`;
      removeButton.setAttribute("aria-label", removeButton.title);
      labelEditor.append(dragHandle, input, removeButton);
      labelCell.append(labelEditor);
      row.append(labelCell);
      for (let ruleIndex = 0; ruleIndex < DIAGRAM_BUILDER_DECISION_RULE_COUNT; ruleIndex += 1) {
        const valueCell = document.createElement("td");
        valueCell.append(createDiagramBuilderDecisionSelect(
          rowData.values[ruleIndex] || fallbackValue,
          options,
          `${singular}, Regel ${ruleIndex + 1}`
        ));
        row.append(valueCell);
      }
      body.append(row);

      removeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const rows = body.querySelectorAll(".diagram-builder-decision-editor-row");
        if (rows.length === 1) {
          input.value = "";
          row.querySelectorAll("select").forEach((select) => { select.value = fallbackValue; });
          input.focus({ preventScroll: true });
          return;
        }
        row.remove();
        updateBand();
        body.querySelector("input")?.focus({ preventScroll: true });
      });

      dragHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const pointerId = event.pointerId;
        editor.dataset.reordering = "true";
        row.classList.add("reordering");
        const move = (moveEvent) => {
          if (moveEvent.pointerId !== pointerId) return;
          moveEvent.preventDefault();
          const siblings = Array.from(body.querySelectorAll(".diagram-builder-decision-editor-row")).filter((candidate) => candidate !== row);
          const nextRow = siblings.find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return moveEvent.clientY < rect.top + rect.height / 2;
          });
          if (nextRow) body.insertBefore(row, nextRow);
          else body.append(row);
          updateBand();
        };
        const finish = (finishEvent) => {
          if (finishEvent.pointerId !== pointerId) return;
          row.classList.remove("reordering");
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", finish);
          window.removeEventListener("pointercancel", finish);
          updateBand();
          dragHandle.focus({ preventScroll: true });
          window.setTimeout(() => { delete editor.dataset.reordering; }, 0);
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
      });
      updateBand();
      return input;
    };
    rowsData.forEach((rowData) => appendRow(rowData));
    addButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      appendRow().focus({ preventScroll: true });
    });
    return {
      body,
      values: () => Array.from(body.querySelectorAll(".diagram-builder-decision-editor-row"), (row) => ({
        label: row.querySelector(".diagram-builder-decision-label-input")?.value.trim() || "",
        values: Array.from(row.querySelectorAll("select"), (select) => select.value)
      }))
    };
  };

  const conditions = createGroup("conditions", "Bedingungen", original.conditions, ["J", "N"], "J");
  const separator = createElement("tbody", "diagram-builder-decision-separator");
  const separatorRow = document.createElement("tr");
  const separatorCell = document.createElement("td");
  separatorCell.colSpan = DIAGRAM_BUILDER_DECISION_RULE_COUNT + 2;
  separatorRow.append(separatorCell);
  separator.append(separatorRow);
  const actions = createGroup("actions", "Aktionen", original.actions, ["-", "X"], "-");
  table.append(conditions.body, separator, actions.body);
  editor.append(table);
  node.replaceChildren(editor);
  node.classList.add("editing", "decision-table-editing");
  session.editingPlacementId = placement.id;
  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    finished = true;
    if (save) {
      piece.label = titleInput.value.trim();
      piece.conditions = conditions.values();
      piece.actions = actions.values();
    } else Object.assign(piece, original);
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Entscheidungstabelle übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("dblclick", (event) => event.stopPropagation());
  editor.addEventListener("contextmenu", (event) => event.stopPropagation());
  editor.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (editor.dataset.reordering === "true") return;
      if (!editor.contains(document.activeElement)) session.finishEditing?.(true);
    }, 0);
  });
  titleInput.focus();
  titleInput.select();
}

function createDiagramBuilderClassifierSectionEditor(title, values, inputLabel, sortable = false) {
  const section = createElement("section", "diagram-builder-classifier-editor-section");
  const header = createElement("div", "diagram-builder-classifier-editor-section-header");
  header.append(createElement("strong", "", title));
  const addButton = createElement("button", "diagram-builder-classifier-add", "+");
  addButton.type = "button";
  addButton.setAttribute("aria-label", `${inputLabel} hinzufügen`);
  addButton.title = `${inputLabel} hinzufügen`;
  header.append(addButton);
  const rows = createElement("div", "diagram-builder-classifier-editor-rows");
  const appendRow = (value = "") => {
    const row = createElement("div", `diagram-builder-classifier-editor-row${sortable ? " sortable" : ""}`);
    const input = createElement("input", "diagram-builder-classifier-row-input");
    input.type = "text";
    input.value = value;
    input.placeholder = inputLabel;
    input.setAttribute("aria-label", inputLabel);
    const deleteButton = createElement("button", "diagram-builder-classifier-remove", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `${inputLabel} löschen`);
    deleteButton.title = `${inputLabel} löschen`;
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      row.remove();
      rows.querySelector("input")?.focus({ preventScroll: true });
    });
    if (sortable) {
      const dragHandle = createElement("button", "diagram-builder-classifier-drag-handle");
      dragHandle.type = "button";
      dragHandle.setAttribute("aria-label", `${inputLabel} verschieben`);
      dragHandle.title = "Halten und ziehen, um die Reihenfolge zu ändern";
      dragHandle.append(createElement("span", "diagram-builder-classifier-drag-icon", "⠿"));
      dragHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const pointerId = event.pointerId;
        const classifierEditor = section.closest(".diagram-builder-classifier-editor");
        if (classifierEditor) classifierEditor.dataset.reordering = "true";
        row.classList.add("reordering");
        const move = (moveEvent) => {
          if (moveEvent.pointerId !== pointerId) return;
          moveEvent.preventDefault();
          const siblings = Array.from(rows.children).filter((candidate) => candidate !== row);
          const nextRow = siblings.find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return moveEvent.clientY < rect.top + rect.height / 2;
          });
          if (nextRow) rows.insertBefore(row, nextRow);
          else rows.append(row);
        };
        const finish = (finishEvent) => {
          if (finishEvent.pointerId !== pointerId) return;
          row.classList.remove("reordering");
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", finish);
          window.removeEventListener("pointercancel", finish);
          dragHandle.focus({ preventScroll: true });
          window.setTimeout(() => {
            if (classifierEditor) delete classifierEditor.dataset.reordering;
          }, 0);
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
      });
      row.append(dragHandle);
    }
    row.append(input, deleteButton);
    rows.append(row);
    input.focus({ preventScroll: true });
  };
  (values.length ? values : [""]).forEach((value) => appendRow(value));
  addButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    appendRow();
  });
  section.append(header, rows);
  return {
    section,
    values: () => Array.from(rows.querySelectorAll("input"), (input) => input.value.trim()).filter(Boolean)
  };
}

function beginDiagramBuilderClassifierEdit(session, placement, node) {
  if (!node) return;
  const piece = placement.piece;
  const original = {
    label: piece.label || "",
    attributes: [...(piece.attributes || [])],
    methods: [...(piece.methods || [])],
    literals: [...(piece.literals || [])]
  };
  const editor = createElement("div", "diagram-builder-classifier-editor");
  const nameInput = createElement("input", "diagram-builder-classifier-name-input");
  nameInput.type = "text";
  nameInput.value = original.label;
  nameInput.placeholder = piece.kind === "class-interface"
    ? "Interfacename"
    : piece.kind === "class-enum"
      ? "Enumerationsname"
      : piece.kind === "class-abstract"
        ? "Name der abstrakten Klasse"
        : "Klassenname";
  nameInput.setAttribute("aria-label", nameInput.placeholder);
  editor.append(nameInput);

  const sections = {};
  if (piece.kind === "class-enum") {
    sections.literals = createDiagramBuilderClassifierSectionEditor("Konstanten", original.literals, "Konstante");
    editor.append(sections.literals.section);
  } else {
    sections.attributes = createDiagramBuilderClassifierSectionEditor("Attribute", original.attributes, "Attribut", true);
    sections.methods = createDiagramBuilderClassifierSectionEditor("Methoden", original.methods, "Methode", true);
    editor.append(sections.attributes.section, sections.methods.section);
  }

  node.replaceChildren(editor);
  node.classList.add("editing", "classifier-editing");
  session.editingPlacementId = placement.id;
  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    if (save) {
      const editedPiece = {
        ...piece,
        label: nameInput.value.trim(),
        attributes: piece.kind === "class-enum" ? original.attributes : sections.attributes.values(),
        methods: piece.kind === "class-enum" ? original.methods : sections.methods.values(),
        literals: piece.kind === "class-enum" ? sections.literals.values() : original.literals
      };
      if (!diagramBuilderCanPlacePiece(session, editedPiece, placement.row, placement.column, placement.id)) {
        setDiagramBuilderStatus(session, "Die vergrößerte Klasse benötigt freie Rasterplätze. Verschiebe zuerst das benachbarte Element.", "error");
        return;
      }
      Object.assign(piece, editedPiece);
    } else Object.assign(piece, original);
    finished = true;
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Klassifizierer übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("dblclick", (event) => event.stopPropagation());
  editor.addEventListener("contextmenu", (event) => event.stopPropagation());
  editor.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (editor.dataset.reordering === "true") return;
      if (!editor.contains(document.activeElement)) session.finishEditing?.(true);
    }, 0);
  });
  nameInput.focus();
  nameInput.select();
}

function diagramBuilderMinimumLifelineRows(session, placement) {
  return Math.max(1, ...session.placements
    .filter((item) => item.piece.kind === "sequence-activation"
      && item.column === placement.column
      && item.row > placement.row
      && diagramBuilderLifelineCoversCell(placement, item.row, item.column)
      && !session.placements.some((candidate) => candidate.id !== placement.id && diagramBuilderLifelineCoversCell(candidate, item.row, item.column)))
    .map((item) => item.row - placement.row + Math.max(1, Number(item.piece.activationRows) || 1) - 1));
}

function beginDiagramBuilderSequenceParticipantEdit(session, placement, node) {
  const label = node?.querySelector(".diagram-builder-piece-label");
  if (!node || !label) return;
  const originalLabel = placement.piece.label || "";
  const originalRows = Math.max(1, Number(placement.piece.lifelineRows) || 1);
  const originalEndX = Boolean(placement.piece.lifelineEndX);
  const minimumRows = diagramBuilderMinimumLifelineRows(session, placement);
  const editor = createElement("div", "diagram-builder-sequence-participant-editor");
  const nameInput = createElement("input", "diagram-builder-sequence-participant-name");
  nameInput.type = "text";
  nameInput.value = originalLabel;
  nameInput.placeholder = "Name";
  nameInput.setAttribute("aria-label", "Name des Teilnehmers bearbeiten");
  editor.append(nameInput, createElement("span", "diagram-builder-sequence-editor-hint", "Unteren Griff ziehen · anklicken für Abschluss"));
  label.replaceWith(editor);
  node.classList.add("editing", "sequence-participant-editing");
  session.editingPlacementId = placement.id;
  placement.piece.lifelineRows = Math.max(minimumRows, originalRows);
  renderDiagramBuilderLifelineEditControl(session, placement, minimumRows);
  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    finished = true;
    placement.piece.label = save ? nameInput.value.trim() : originalLabel;
    if (!save) {
      placement.piece.lifelineRows = originalRows;
      placement.piece.lifelineEndX = originalEndX;
    }
    session.overlay.querySelector(".diagram-builder-lifeline-end-menu")?.remove();
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Lebenslinie übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("dblclick", (event) => event.stopPropagation());
  editor.addEventListener("contextmenu", (event) => event.stopPropagation());
  editor.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (document.activeElement?.closest?.(".diagram-builder-lifeline-end-control, .diagram-builder-lifeline-end-menu")) return;
      if (!editor.contains(document.activeElement)) session.finishEditing?.(true);
    }, 0);
  });
  nameInput.focus();
  nameInput.select();
}

function openDiagramBuilderLifelineEndMenu(session, placement, control) {
  session.overlay.querySelector(".diagram-builder-lifeline-end-menu")?.remove();
  const menu = createElement("div", "diagram-builder-endpoint-menu diagram-builder-lifeline-end-menu");
  menu.setAttribute("aria-label", "Abschluss der Lebenslinie wählen");
  const rect = control.getBoundingClientRect();
  menu.style.left = `${Math.max(118, Math.min(window.innerWidth - 118, rect.left + rect.width / 2))}px`;
  menu.style.top = `${Math.max(8, Math.min(window.innerHeight - 132, rect.bottom))}px`;
  [[false, "Ohne Abschluss", "lifeline-open"], [true, "Zerstörung", "lifeline-destruction"]].forEach(([hasX, label, preview]) => {
    const button = createElement("button", placement.piece.lifelineEndX === hasX ? "selected" : "");
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.append(
      createElement("span", `diagram-builder-marker-preview ${preview}`),
      createElement("span", "diagram-builder-marker-label", label)
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      placement.piece.lifelineEndX = hasX;
      menu.remove();
      renderDiagramBuilderLifelineEditControl(session, placement, diagramBuilderMinimumLifelineRows(session, placement));
      session.surface.querySelector(`[data-placement-id="${placement.id}"] .diagram-builder-sequence-participant-name`)?.focus({ preventScroll: true });
    });
    menu.append(button);
  });
  session.overlay.append(menu);
  menu.querySelector("button.selected, button")?.focus({ preventScroll: true });
}

function renderDiagramBuilderLifelineEditControl(session, placement, minimumRows = 1) {
  const lifeline = session.surface.querySelector(`[data-participant-id="${placement.id}"]`);
  if (!lifeline) return;
  lifeline.classList.add("editing");
  lifeline.querySelector(".diagram-builder-lifeline-end-control")?.remove();
  const control = createElement("button", `diagram-builder-lifeline-end-control${placement.piece.lifelineEndX ? " has-destruction" : ""}`);
  control.type = "button";
  control.title = "Ziehen, um die Länge zu ändern · anklicken, um den Abschluss zu wählen";
  control.setAttribute("aria-label", control.title);
  let drag = null;
  let suppressClick = false;
  const move = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.abs(event.clientY - drag.startY) < 6) return;
    event.preventDefault();
    drag.active = true;
    suppressClick = true;
    control.classList.add("dragging");
    const surfaceRect = session.surface.getBoundingClientRect();
    const targetY = (event.clientY - surfaceRect.top) / (session.gridZoom || 1);
    const metrics = diagramBuilderPieceMetrics(placement.piece);
    const startY = (placement.row + 0.5) * session.cellHeight + metrics.elementHeight / 2;
    const requestedRows = Math.round((targetY - startY) / session.cellHeight);
    placement.piece.lifelineRows = Math.min(40, Math.max(minimumRows, requestedRows));
    applyDiagramBuilderLifelineGeometry(session, placement, lifeline);
    setDiagramBuilderStatus(session, `Lebenslinie: ${placement.piece.lifelineRows} Rasterfeld${placement.piece.lifelineRows === 1 ? "" : "er"}.`, "success");
  };
  const finish = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const wasActive = drag.active;
    drag = null;
    control.classList.remove("dragging");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
    if (wasActive) window.setTimeout(() => { suppressClick = false; }, 0);
  };
  control.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { pointerId: event.pointerId, startY: event.clientY, active: false };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  });
  control.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (suppressClick) return;
    openDiagramBuilderLifelineEndMenu(session, placement, control);
  });
  lifeline.append(control);
}

function diagramBuilderActivationHeight(session, piece) {
  return Math.max(24, Math.max(1, Number(piece.activationRows) || 1) * session.cellHeight - 28);
}

function applyDiagramBuilderActivationGeometry(session, placement, cell, node) {
  cell.style.top = `${placement.row * session.cellHeight}px`;
  node.style.setProperty("--builder-activation-height", `${diagramBuilderActivationHeight(session, placement.piece)}px`);
}

function beginDiagramBuilderSequenceActivationEdit(session, placement, node) {
  if (!node) return;
  const cell = node.closest(".diagram-builder-cell-item");
  if (!cell) return;
  const original = {
    row: placement.row,
    activationRows: Math.max(1, Number(placement.piece.activationRows) || 1)
  };
  placement.piece.activationRows = original.activationRows;
  node.replaceChildren();
  node.classList.add("editing", "sequence-activation-editing");
  cell.querySelector(".diagram-builder-connection-handles")?.remove();
  session.editingPlacementId = placement.id;

  const topHandle = createElement("button", "diagram-builder-activation-resize-handle top");
  const bottomHandle = createElement("button", "diagram-builder-activation-resize-handle bottom");
  topHandle.type = "button";
  bottomHandle.type = "button";
  topHandle.title = "Oberen Rand ziehen";
  bottomHandle.title = "Unteren Rand ziehen";
  topHandle.setAttribute("aria-label", "Beginn des Aktivitätsbalkens ziehen");
  bottomHandle.setAttribute("aria-label", "Ende des Aktivitätsbalkens ziehen");

  const attachResize = (handle, edge) => {
    let pointerId = null;
    const move = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const surfaceRect = session.surface.getBoundingClientRect();
      const targetY = (event.clientY - surfaceRect.top) / (session.gridZoom || 1);
      const currentEnd = placement.row + Math.max(1, Number(placement.piece.activationRows) || 1);
      let nextRow = placement.row;
      let nextRows = placement.piece.activationRows;
      if (edge === "top") {
        nextRow = Math.max(0, Math.min(currentEnd - 1, Math.round((targetY - 14) / session.cellHeight)));
        nextRows = currentEnd - nextRow;
      } else {
        const requestedEnd = Math.max(placement.row + 1, Math.round((targetY + 14) / session.cellHeight));
        nextRows = Math.min(40, requestedEnd - placement.row);
      }
      if (!diagramBuilderCanResizeActivation(session, placement, nextRow, nextRows)) {
        setDiagramBuilderStatus(session, "Der Aktivitätsbalken muss vollständig auf einer freien Lebenslinie bleiben.", "error");
        return;
      }
      placement.row = nextRow;
      placement.piece.activationRows = nextRows;
      handle.classList.add("dragging");
      applyDiagramBuilderActivationGeometry(session, placement, cell, node);
      updateDiagramBuilderGridMetrics(session);
      drawDiagramBuilderConnections(session);
      setDiagramBuilderStatus(session, `Aktivitätsbalken: ${nextRows} Rasterfeld${nextRows === 1 ? "" : "er"}.`, "success");
    };
    const finish = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      handle.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      pointerId = event.pointerId;
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    });
  };
  attachResize(topHandle, "top");
  attachResize(bottomHandle, "bottom");
  node.append(topHandle, bottomHandle);
  applyDiagramBuilderActivationGeometry(session, placement, cell, node);

  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    finished = true;
    if (!save) {
      placement.row = original.row;
      placement.piece.activationRows = original.activationRows;
    }
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Aktivitätsbalken übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  node.focus({ preventScroll: true });
}

function beginDiagramBuilderStateEdit(session, placement, node) {
  if (!node) return;
  const originalLabel = placement.piece.label || "";
  const originalBehaviors = { entry: "", do: "", exit: "", ...(placement.piece.behaviors || {}) };
  const editor = createElement("div", "diagram-builder-state-editor");
  const nameInput = createElement("input", "diagram-builder-label-editor diagram-builder-state-name-editor");
  nameInput.type = "text";
  nameInput.value = originalLabel;
  nameInput.placeholder = "Zustandsname";
  nameInput.setAttribute("aria-label", "Zustandsname bearbeiten");
  editor.append(nameInput);
  const behaviorInputs = {};
  [["entry", "entry /"], ["do", "do /"], ["exit", "exit /"]].forEach(([key, prefix]) => {
    const row = createElement("label", "diagram-builder-state-editor-row");
    row.append(createElement("span", "diagram-builder-state-behavior-prefix", prefix));
    const input = createElement("input", "diagram-builder-state-behavior-input");
    input.type = "text";
    input.value = originalBehaviors[key];
    input.setAttribute("aria-label", `${prefix} Verhalten bearbeiten`);
    behaviorInputs[key] = input;
    row.append(input);
    editor.append(row);
  });
  node.replaceChildren(editor);
  node.classList.add("editing", "state-editing");
  session.editingPlacementId = placement.id;
  let finished = false;
  session.finishEditing = (save) => {
    if (finished) return;
    finished = true;
    placement.piece.label = save ? nameInput.value.trim() : originalLabel;
    placement.piece.behaviors = save
      ? Object.fromEntries(Object.entries(behaviorInputs).map(([key, input]) => [key, input.value.trim()]))
      : originalBehaviors;
    session.editingPlacementId = null;
    session.finishEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Zustandsverhalten übernommen." : "Bearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("dblclick", (event) => event.stopPropagation());
  editor.addEventListener("contextmenu", (event) => event.stopPropagation());
  editor.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!editor.contains(document.activeElement)) session.finishEditing?.(true);
    }, 0);
  });
  nameInput.focus();
  nameInput.select();
}

function appendDiagramBuilderStateContent(node, piece) {
  const content = createElement("div", "diagram-builder-state-content");
  content.append(createElement("span", "diagram-builder-piece-label diagram-builder-state-name", piece.label || ""));
  const behaviors = piece.behaviors || {};
  const visibleBehaviors = [["entry", "entry /"], ["do", "do /"], ["exit", "exit /"]]
    .filter(([key]) => String(behaviors[key] || "").trim());
  if (visibleBehaviors.length) {
    const behaviorList = createElement("div", "diagram-builder-state-behaviors");
    visibleBehaviors.forEach(([key, prefix]) => {
      const row = createElement("div", "diagram-builder-state-behavior");
      row.append(
        createElement("span", "diagram-builder-state-behavior-prefix", prefix),
        createElement("span", "diagram-builder-state-behavior-text", behaviors[key])
      );
      behaviorList.append(row);
    });
    content.append(behaviorList);
  }
  node.append(content);
}

function appendDiagramBuilderActorContent(node, labelText) {
  const figure = createElement("span", "diagram-builder-actor-glyph");
  figure.setAttribute("aria-hidden", "true");
  figure.append(
    createElement("span", "diagram-builder-actor-head"),
    createElement("span", "diagram-builder-actor-body"),
    createElement("span", "diagram-builder-actor-arms"),
    createElement("span", "diagram-builder-actor-leg left"),
    createElement("span", "diagram-builder-actor-leg right")
  );
  node.append(figure, createElement("span", "diagram-builder-piece-label", labelText || ""));
}

function appendDiagramBuilderClassifierContent(node, piece, labelText) {
  const content = createElement("div", "diagram-builder-classifier-content");
  content.append(createElement("div", "diagram-builder-classifier-name", labelText || ""));
  const appendSection = (values, className) => {
    const section = createElement("div", `diagram-builder-classifier-section ${className}`);
    (values || []).forEach((value) => section.append(createElement("div", "diagram-builder-classifier-row", value)));
    content.append(section);
  };
  if (piece.kind === "class-enum") appendSection(piece.literals, "literals");
  else {
    appendSection(piece.attributes, "attributes");
    appendSection(piece.methods, "methods");
  }
  node.append(content);
}

function appendDiagramBuilderDecisionTableContent(node, piece, labelText) {
  if (node.classList.contains("diagram-builder-palette-item")) {
    const preview = createElement("div", "diagram-builder-decision-preview");
    preview.append(createElement("strong", "diagram-builder-decision-preview-title", labelText || "Entscheidungstabelle"));
    for (let index = 0; index < 8; index += 1) preview.append(createElement("span", "diagram-builder-decision-preview-cell"));
    node.append(preview);
    return;
  }
  const conditions = diagramBuilderDecisionTableRows(piece, "conditions", "J");
  const actions = diagramBuilderDecisionTableRows(piece, "actions", "-");
  const table = createElement("table", "diagram-builder-decision-table");
  const head = document.createElement("thead");
  const titleRow = document.createElement("tr");
  const title = document.createElement("th");
  title.className = "diagram-builder-decision-title";
  title.colSpan = 2;
  title.rowSpan = 2;
  title.textContent = labelText || "Entscheidungstabelle";
  const rulesTitle = document.createElement("th");
  rulesTitle.className = "diagram-builder-decision-rules-title";
  rulesTitle.colSpan = DIAGRAM_BUILDER_DECISION_RULE_COUNT;
  rulesTitle.textContent = "Regeln";
  titleRow.append(title, rulesTitle);
  const ruleRow = document.createElement("tr");
  for (let ruleIndex = 0; ruleIndex < DIAGRAM_BUILDER_DECISION_RULE_COUNT; ruleIndex += 1) {
    const rule = document.createElement("th");
    rule.className = "diagram-builder-decision-rule-head";
    rule.textContent = `R${ruleIndex + 1}`;
    ruleRow.append(rule);
  }
  head.append(titleRow, ruleRow);
  table.append(head);
  const appendGroup = (titleText, rows) => {
    const body = createElement("tbody", "diagram-builder-decision-group");
    rows.forEach((rowData, rowIndex) => {
      const row = document.createElement("tr");
      if (rowIndex === 0) {
        const band = document.createElement("th");
        band.className = "diagram-builder-decision-group-band";
        band.rowSpan = rows.length;
        band.append(createElement("span", "diagram-builder-decision-group-label", titleText));
        row.append(band);
      }
      const label = document.createElement("th");
      label.className = "diagram-builder-decision-row-label";
      label.textContent = rowData.label;
      row.append(label);
      rowData.values.forEach((value) => row.append(createElement("td", "diagram-builder-decision-value", value)));
      body.append(row);
    });
    table.append(body);
  };
  appendGroup("Bedingungen", conditions);
  const separator = createElement("tbody", "diagram-builder-decision-separator");
  const separatorRow = document.createElement("tr");
  const separatorCell = document.createElement("td");
  separatorCell.colSpan = DIAGRAM_BUILDER_DECISION_RULE_COUNT + 2;
  separatorRow.append(separatorCell);
  separator.append(separatorRow);
  table.append(separator);
  appendGroup("Aktionen", actions);
  node.append(table);
}

function appendDiagramBuilderPieceContent(node, piece, labelText) {
  if (piece.kind === "sequence-activation") return;
  if (["actor", "sequence-actor"].includes(piece.kind)) {
    appendDiagramBuilderActorContent(node, labelText);
    return;
  }
  if (piece.kind === "state") {
    appendDiagramBuilderStateContent(node, piece);
    return;
  }
  if (diagramBuilderIsClassifier(piece)) {
    appendDiagramBuilderClassifierContent(node, piece, labelText);
    return;
  }
  if (piece.kind === "pap-decision-table") {
    appendDiagramBuilderDecisionTableContent(node, piece, labelText);
    return;
  }
  node.append(createElement("span", "diagram-builder-piece-label", labelText || ""));
}

function renderDiagramBuilderPalette(session) {
  session.paletteWrap.classList.remove("trash-active");
  session.palette.classList.remove("trash-mode");
  session.paletteLabel.textContent = "Baustein halten, ins Raster ziehen und dort loslassen.";
  session.palette.replaceChildren();
  session.pieces.forEach((piece, index) => {
    const button = createElement("button", `diagram-builder-palette-item ${piece.kind}`);
    button.type = "button";
    if (!["activity-swimlane", "actor", "sequence-actor", "sequence-activation", "pap-decision-table"].includes(piece.kind)) {
      applyDiagramBuilderPieceMetrics(button, { ...piece, label: piece.paletteLabel });
    }
    appendDiagramBuilderPieceContent(button, piece, piece.paletteLabel);
    button.title = `${piece.paletteLabel} halten und ins Raster ziehen`;
    button.setAttribute("aria-label", piece.paletteLabel);
    button.setAttribute("aria-pressed", String(session.armedPieceIndex === index));
    if (session.armedPieceIndex === index) button.classList.add("placement-active");
    button.addEventListener("pointerdown", (event) => beginDiagramBuilderPaletteDrag(session, index, button, event));
    session.palette.append(button);
  });
}

function requestDiagramBuilderDeletion(session, placement, clientX, clientY) {
  clearDiagramBuilderRepositionPreview(session);
  const sourceCell = session.surface.querySelector(`[data-placement-id="${placement.id}"]`);
  const sourceRect = sourceCell?.getBoundingClientRect();
  if (sourceCell && sourceRect) {
    sourceCell.classList.remove("dragging");
    sourceCell.classList.add("awaiting-delete-confirmation");
    sourceCell.style.setProperty("--return-x", `${clientX - (sourceRect.left + sourceRect.width / 2)}px`);
    sourceCell.style.setProperty("--return-y", `${clientY - (sourceRect.top + sourceRect.height / 2)}px`);
  }
  session.pendingDeletionId = placement.id;
  session.toastMessage.textContent = `„${placement.piece.label || placement.piece.paletteLabel}“ wirklich löschen?`;
  session.toast.hidden = false;
  session.toastDeleteButton.focus({ preventScroll: true });
}

function showDiagramBuilderTrashTarget(session, placement) {
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  session.draggingPlacementId = placement.id;
  session.paletteWrap.classList.add("trash-active");
  session.palette.classList.add("trash-mode");
  session.paletteLabel.textContent = "ELEMENT ENTFERNEN";
  const trash = createElement("div", "diagram-builder-trash-target");
  trash.setAttribute("role", "button");
  trash.setAttribute("aria-label", "Element hier ablegen, um es zu löschen");
  trash.append(createElement("span", "diagram-builder-trash-icon", "🗑"), createElement("strong", "", "Zum Löschen hier ablegen"));
  trash.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    trash.classList.add("drag-over");
  });
  trash.addEventListener("dragleave", () => trash.classList.remove("drag-over"));
  trash.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    trash.classList.remove("drag-over");
    const payload = event.dataTransfer.getData("text/plain");
    if (payload !== `placement:${placement.id}`) return;
    requestDiagramBuilderDeletion(session, placement, event.clientX, event.clientY);
  });
  session.palette.replaceChildren(trash);
}

function cancelDiagramBuilderDeletion(session) {
  const placementId = session.pendingDeletionId;
  session.pendingDeletionId = null;
  session.toast.hidden = true;
  const cell = session.surface.querySelector(`[data-placement-id="${placementId}"]`);
  if (cell) {
    cell.classList.remove("awaiting-delete-confirmation");
    cell.classList.add("returning-to-grid");
    cell.addEventListener("animationend", () => {
      cell.classList.remove("returning-to-grid");
      cell.style.removeProperty("--return-x");
      cell.style.removeProperty("--return-y");
    }, { once: true });
  }
  setDiagramBuilderStatus(session, "Löschen abgebrochen – Element ist an seine Ausgangsposition zurückgekehrt.");
}

function confirmDiagramBuilderDeletion(session) {
  const placementId = session.pendingDeletionId;
  session.pendingDeletionId = null;
  session.toast.hidden = true;
  session.placements = session.placements.filter((placement) => placement.id !== placementId);
  session.connections = session.connections.filter((connection) => connection.sourceId !== placementId && connection.targetId !== placementId);
  if (session.selectedPlacementId === placementId) session.selectedPlacementId = null;
  renderDiagramBuilderWorkspace(session);
  setDiagramBuilderStatus(session, "Element und seine Verbindungen wurden gelöscht.", "success");
}

function diagramBuilderCompactOrthogonalPath(points) {
  const compactPoints = [];
  points.forEach((point) => {
    const previous = compactPoints[compactPoints.length - 1];
    if (previous && point.x === previous.x && point.y === previous.y) return;
    compactPoints.push(point);
    while (compactPoints.length >= 3) {
      const beforeTurn = compactPoints[compactPoints.length - 3];
      const turn = compactPoints[compactPoints.length - 2];
      const afterTurn = compactPoints[compactPoints.length - 1];
      const sameHorizontalLine = beforeTurn.y === turn.y && turn.y === afterTurn.y;
      const sameVerticalLine = beforeTurn.x === turn.x && turn.x === afterTurn.x;
      if (!sameHorizontalLine && !sameVerticalLine) break;
      compactPoints.splice(compactPoints.length - 2, 1);
    }
  });
  return compactPoints;
}

function diagramBuilderPathSegments(points) {
  const compactPoints = diagramBuilderCompactOrthogonalPath(points);
  return compactPoints.slice(1).map((point, index) => ({ from: compactPoints[index], to: point }));
}

function diagramBuilderSegmentsIntersect(left, right) {
  const leftVertical = left.from.x === left.to.x;
  const rightVertical = right.from.x === right.to.x;
  const leftX = [Math.min(left.from.x, left.to.x), Math.max(left.from.x, left.to.x)];
  const leftY = [Math.min(left.from.y, left.to.y), Math.max(left.from.y, left.to.y)];
  const rightX = [Math.min(right.from.x, right.to.x), Math.max(right.from.x, right.to.x)];
  const rightY = [Math.min(right.from.y, right.to.y), Math.max(right.from.y, right.to.y)];
  if (leftVertical && rightVertical) return left.from.x === right.from.x && Math.min(leftY[1], rightY[1]) > Math.max(leftY[0], rightY[0]);
  if (!leftVertical && !rightVertical) return left.from.y === right.from.y && Math.min(leftX[1], rightX[1]) > Math.max(leftX[0], rightX[0]);
  const vertical = leftVertical ? left : right;
  const horizontal = leftVertical ? right : left;
  const verticalY = [Math.min(vertical.from.y, vertical.to.y), Math.max(vertical.from.y, vertical.to.y)];
  const horizontalX = [Math.min(horizontal.from.x, horizontal.to.x), Math.max(horizontal.from.x, horizontal.to.x)];
  return vertical.from.x > horizontalX[0] && vertical.from.x < horizontalX[1]
    && horizontal.from.y > verticalY[0] && horizontal.from.y < verticalY[1];
}

function diagramBuilderSegmentsOverlap(left, right) {
  const leftVertical = left.from.x === left.to.x;
  const rightVertical = right.from.x === right.to.x;
  if (leftVertical !== rightVertical) return false;
  if (leftVertical) {
    if (left.from.x !== right.from.x) return false;
    const leftRange = [Math.min(left.from.y, left.to.y), Math.max(left.from.y, left.to.y)];
    const rightRange = [Math.min(right.from.y, right.to.y), Math.max(right.from.y, right.to.y)];
    return Math.min(leftRange[1], rightRange[1]) > Math.max(leftRange[0], rightRange[0]);
  }
  if (left.from.y !== right.from.y) return false;
  const leftRange = [Math.min(left.from.x, left.to.x), Math.max(left.from.x, left.to.x)];
  const rightRange = [Math.min(right.from.x, right.to.x), Math.max(right.from.x, right.to.x)];
  return Math.min(leftRange[1], rightRange[1]) > Math.max(leftRange[0], rightRange[0]);
}

function diagramBuilderSegmentHitsRect(segment, rect) {
  const vertical = segment.from.x === segment.to.x;
  const xRange = [Math.min(segment.from.x, segment.to.x), Math.max(segment.from.x, segment.to.x)];
  const yRange = [Math.min(segment.from.y, segment.to.y), Math.max(segment.from.y, segment.to.y)];
  if (vertical) return segment.from.x > rect.left && segment.from.x < rect.right && yRange[1] > rect.top && yRange[0] < rect.bottom;
  return segment.from.y > rect.top && segment.from.y < rect.bottom && xRange[1] > rect.left && xRange[0] < rect.right;
}

function diagramBuilderPortOnBox(box, side, fraction, isDiamond = false) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const centerX = box.left + width / 2;
  const centerY = box.top + height / 2;
  if (side === "left" || side === "right") {
    const y = box.top + height * fraction;
    const horizontalExtent = isDiamond ? width * (0.5 - Math.abs(fraction - 0.5)) : width / 2;
    return { x: centerX + horizontalExtent * (side === "right" ? 1 : -1), y };
  }
  const x = box.left + width * fraction;
  const verticalExtent = isDiamond ? height * (0.5 - Math.abs(fraction - 0.5)) : height / 2;
  return { x, y: centerY + verticalExtent * (side === "bottom" ? 1 : -1) };
}

function diagramBuilderAutomaticSourceSides(session) {
  const sides = new Map();
  session.connections.forEach((connection) => {
    const source = session.placements.find((placement) => placement.id === connection.sourceId);
    const target = session.placements.find((placement) => placement.id === connection.targetId);
    if (!source || !target) return;
    const sourceSpan = diagramBuilderPlacementSpan(session, source.piece);
    const targetSpan = diagramBuilderPlacementSpan(session, target.piece);
    const horizontalDistance = (target.column + targetSpan.columns / 2 - source.column - sourceSpan.columns / 2) * session.cellWidth;
    const verticalDistance = (target.row + targetSpan.rows / 2 - source.row - sourceSpan.rows / 2) * session.cellHeight;
    if (source.piece.kind === "pap-decision-table") {
      sides.set(connection.id, horizontalDistance < 0 ? "left" : "right");
      return;
    }
    if (session.viewType === "sequence") {
      sides.set(connection.id, horizontalDistance < 0 ? "left" : "right");
      return;
    }
    if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) {
      sides.set(connection.id, horizontalDistance < 0 ? "left" : "right");
    } else {
      sides.set(connection.id, verticalDistance < 0 ? "top" : "bottom");
    }
  });
  return sides;
}

function diagramBuilderSourcePortAssignments(session, sourceSides) {
  const assignments = new Map();
  const groups = new Map();
  session.connections.forEach((connection) => {
    const side = sourceSides.get(connection.id) || "right";
    const key = `${connection.sourceId}:${side}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(connection);
  });
  groups.forEach((connections, key) => {
    if (connections.length === 1) {
      assignments.set(connections[0].id, 0.5);
      return;
    }
    const side = key.slice(key.lastIndexOf(":") + 1);
    connections.sort((left, right) => {
      const leftTarget = session.placements.find((placement) => placement.id === left.targetId);
      const rightTarget = session.placements.find((placement) => placement.id === right.targetId);
      const primaryDifference = side === "left" || side === "right"
        ? (leftTarget?.row || 0) - (rightTarget?.row || 0)
        : (leftTarget?.column || 0) - (rightTarget?.column || 0);
      const secondaryDifference = side === "left" || side === "right"
        ? (leftTarget?.column || 0) - (rightTarget?.column || 0)
        : (leftTarget?.row || 0) - (rightTarget?.row || 0);
      return primaryDifference || secondaryDifference || left.id - right.id;
    });
    const source = session.placements.find((placement) => placement.id === connections[0].sourceId);
    const metrics = source ? diagramBuilderPieceMetrics(source.piece) : { visualWidth: 112, visualHeight: 52 };
    const sideLength = side === "left" || side === "right" ? metrics.visualHeight : metrics.visualWidth;
    const step = Math.min(12 / sideLength, 0.76 / Math.max(1, connections.length - 1));
    const centerIndex = (connections.length - 1) / 2;
    connections.forEach((connection, index) => assignments.set(connection.id, 0.5 + (index - centerIndex) * step));
  });
  return assignments;
}

function diagramBuilderTargetPortAssignments(session, sourceSides) {
  const assignments = new Map();
  const groups = new Map();
  session.connections.forEach((connection) => {
    const sourceSide = sourceSides.get(connection.id) || "right";
    const targetSide = sourceSide === "left" ? "right" : sourceSide === "right" ? "left" : sourceSide === "top" ? "bottom" : "top";
    const key = `${connection.targetId}:${targetSide}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(connection);
  });
  groups.forEach((connections, key) => {
    if (connections.length === 1) {
      assignments.set(connections[0].id, 0.5);
      return;
    }
    const side = key.slice(key.lastIndexOf(":") + 1);
    connections.sort((left, right) => {
      const leftSource = session.placements.find((placement) => placement.id === left.sourceId);
      const rightSource = session.placements.find((placement) => placement.id === right.sourceId);
      const primaryDifference = side === "left" || side === "right"
        ? (leftSource?.row || 0) - (rightSource?.row || 0)
        : (leftSource?.column || 0) - (rightSource?.column || 0);
      const secondaryDifference = side === "left" || side === "right"
        ? (leftSource?.column || 0) - (rightSource?.column || 0)
        : (leftSource?.row || 0) - (rightSource?.row || 0);
      return primaryDifference || secondaryDifference || left.id - right.id;
    });
    const target = session.placements.find((placement) => placement.id === connections[0].targetId);
    const metrics = target ? diagramBuilderPieceMetrics(target.piece) : { visualWidth: 112, visualHeight: 52 };
    const sideLength = side === "left" || side === "right" ? metrics.visualHeight : metrics.visualWidth;
    const step = Math.min(12 / sideLength, 0.76 / Math.max(1, connections.length - 1));
    const centerIndex = (connections.length - 1) / 2;
    connections.forEach((connection, index) => assignments.set(connection.id, 0.5 + (index - centerIndex) * step));
  });
  return assignments;
}

function diagramBuilderIsUseCaseDependency(session, connection) {
  if (session.viewType !== "usecase") return false;
  const source = session.placements.find((placement) => placement.id === connection.sourceId);
  const target = session.placements.find((placement) => placement.id === connection.targetId);
  return source?.piece.kind === "usecase" && target?.piece.kind === "usecase";
}

function beginDiagramBuilderUseCaseDependencyEdit(session, connection, clientX, clientY) {
  session.finishConnectionEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  const original = {
    relation: connection.useCaseRelation || "include",
    label: connection.label || "",
    sourceId: connection.sourceId,
    targetId: connection.targetId
  };
  const editor = createElement("div", "diagram-builder-usecase-relation-editor");
  editor.setAttribute("role", "dialog");
  editor.setAttribute("aria-label", "Beziehung zwischen Anwendungsfällen bearbeiten");
  editor.style.left = `${Math.max(120, Math.min(window.innerWidth - 120, clientX))}px`;
  editor.style.top = `${Math.max(62, Math.min(window.innerHeight - 62, clientY))}px`;
  const relation = createElement("select", "diagram-builder-usecase-relation-select");
  relation.setAttribute("aria-label", "Art der Anwendungsfallbeziehung");
  relation.append(
    new Option("Includes («include»)", "include", false, original.relation === "include"),
    new Option("Extends («extend»)", "extend", false, original.relation === "extend")
  );
  const label = createElement("input", "diagram-builder-usecase-relation-input");
  label.type = "text";
  label.value = original.label;
  label.placeholder = "Zusatzbeschriftung (optional)";
  label.setAttribute("aria-label", "Zusatzbeschriftung der Anwendungsfallbeziehung");
  editor.append(relation, label);
  session.overlay.append(editor);
  session.editingConnectionId = connection.id;
  let finished = false;
  session.finishConnectionEditing = (save) => {
    if (finished) return;
    finished = true;
    if (save) {
      connection.useCaseRelation = relation.value;
      connection.label = label.value.trim();
    } else {
      connection.useCaseRelation = original.relation;
      connection.label = original.label;
      connection.sourceId = original.sourceId;
      connection.targetId = original.targetId;
    }
    editor.remove();
    session.overlay.querySelectorAll(".diagram-builder-endpoint-control, .diagram-builder-endpoint-menu").forEach((item) => item.remove());
    session.editingConnectionId = null;
    session.finishConnectionEditing = null;
    drawDiagramBuilderConnections(session);
    setDiagramBuilderStatus(session, save ? "Anwendungsfallbeziehung übernommen." : "Pfeilbearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!editor.isConnected) return;
      const focused = document.activeElement;
      if (focused?.closest?.(".diagram-builder-endpoint-control")) return;
      if (!editor.contains(focused)) session.finishConnectionEditing?.(true);
    }, 0);
  });
  relation.focus({ preventScroll: true });
  drawDiagramBuilderConnections(session);
}

function beginDiagramBuilderConnectionLabelEdit(session, connection, clientX, clientY) {
  session.finishConnectionEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  const original = {
    label: connection.label || "",
    startMarker: connection.startMarker || "none",
    endMarker: connection.endMarker || "control",
    sourceId: connection.sourceId,
    targetId: connection.targetId
  };
  const editor = createElement("input", "diagram-builder-connection-label-editor");
  editor.type = "text";
  editor.value = connection.label || "";
  editor.placeholder = "Pfeiltext eingeben";
  editor.setAttribute("aria-label", "Beschriftung des Pfeils bearbeiten");
  editor.style.left = `${Math.max(90, Math.min(window.innerWidth - 90, clientX))}px`;
  editor.style.top = `${Math.max(28, Math.min(window.innerHeight - 28, clientY))}px`;
  session.overlay.append(editor);
  session.editingConnectionId = connection.id;
  let finished = false;
  session.finishConnectionEditing = (save) => {
    if (finished) return;
    finished = true;
    if (save) connection.label = editor.value.trim();
    else {
      connection.label = original.label;
      connection.startMarker = original.startMarker;
      connection.endMarker = original.endMarker;
      connection.sourceId = original.sourceId;
      connection.targetId = original.targetId;
    }
    editor.remove();
    session.overlay.querySelectorAll(".diagram-builder-endpoint-control, .diagram-builder-endpoint-menu").forEach((item) => item.remove());
    session.editingConnectionId = null;
    session.finishConnectionEditing = null;
    drawDiagramBuilderConnections(session);
    setDiagramBuilderStatus(session, save ? "Pfeilbeschriftung übernommen." : "Pfeilbearbeitung abgebrochen.", save ? "success" : "");
  };
  editor.addEventListener("blur", () => {
    window.setTimeout(() => {
      const focused = document.activeElement;
      if (focused?.closest?.(".diagram-builder-endpoint-control, .diagram-builder-endpoint-menu")) return;
      session.finishConnectionEditing?.(true);
    }, 0);
  });
  editor.focus();
  editor.select();
  drawDiagramBuilderConnections(session);
}

function openDiagramBuilderEndpointMenu(session, connection, endpoint, clientX, clientY) {
  session.overlay.querySelector(".diagram-builder-endpoint-menu")?.remove();
  const menu = createElement("div", "diagram-builder-endpoint-menu");
  menu.setAttribute("aria-label", `Pfeilspitze am ${endpoint === "start" ? "Anfang" : "Ende"} wählen`);
  const property = endpoint === "start" ? "startMarker" : "endMarker";
  const markerOptions = [
    ["none", "Keine"],
    ["control", "Kontrollflussspitze"]
  ];
  if (session.viewType === "class") markerOptions.push(
    ["inheritance", "Vererbung"],
    ["aggregation", "Aggregation"],
    ["composition", "Komposition"]
  );
  const menuHalfWidth = 110;
  const menuHeight = markerOptions.length * 42 + Math.max(0, markerOptions.length - 1) * 6 + 20;
  menu.style.left = `${Math.max(menuHalfWidth + 8, Math.min(window.innerWidth - menuHalfWidth - 8, clientX))}px`;
  menu.style.top = `${Math.max(8, Math.min(window.innerHeight - menuHeight - 20, clientY))}px`;
  markerOptions.forEach(([value, label]) => {
    const button = createElement("button", connection[property] === value ? "selected" : "");
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    const previewType = value === "control" && ["activity", "state"].includes(session.viewType) ? "activity-open" : value;
    button.append(
      createElement("span", `diagram-builder-marker-preview ${previewType}`),
      createElement("span", "diagram-builder-marker-label", label)
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      connection[property] = value;
      drawDiagramBuilderConnections(session);
      session.overlay.querySelector(".diagram-builder-connection-label-editor")?.focus({ preventScroll: true });
    });
    menu.append(button);
  });
  session.overlay.append(menu);
  menu.querySelector("button.selected, button")?.focus({ preventScroll: true });
}

function renderDiagramBuilderEndpointControls(session, connection, route, surfaceRect) {
  if (session.editingConnectionId !== connection.id) return;
  const fixedUseCaseDependency = diagramBuilderIsUseCaseDependency(session, connection);
  const endpoints = [
    ["start", route.points[0]],
    ["end", route.points[route.points.length - 1]]
  ];
  endpoints.forEach(([endpoint, point]) => {
    const zoom = session.gridZoom || 1;
    const property = endpoint === "start" ? "startMarker" : "endMarker";
    const control = createElement("button", `diagram-builder-endpoint-control ${endpoint}${(connection[property] || (endpoint === "end" ? "control" : "none")) !== "none" ? " has-arrow" : ""}`);
    control.type = "button";
    control.style.left = `${surfaceRect.left + point.x * zoom}px`;
    control.style.top = `${surfaceRect.top + point.y * zoom}px`;
    control.title = fixedUseCaseDependency
      ? `${endpoint === "start" ? "Pfeilanfang" : "Pfeilende"} verschieben`
      : `${endpoint === "start" ? "Pfeilanfang" : "Pfeilende"} verschieben oder Pfeilspitze wählen`;
    control.setAttribute("aria-label", control.title);
    let endpointDrag = null;
    let suppressClick = false;
    const clearDropTarget = () => {
      session.surface.querySelectorAll(".endpoint-drop-target").forEach((node) => node.classList.remove("endpoint-drop-target"));
    };
    const placementAtPointer = (clientX, clientY) => {
      return session.placements.find((placement) => {
        const node = session.surface.querySelector(`[data-placement-id="${placement.id}"] .diagram-builder-piece`);
        const rect = node?.getBoundingClientRect();
        return Boolean(rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
      }) || null;
    };
    const moveEndpoint = (event) => {
      if (!endpointDrag || endpointDrag.pointerId !== event.pointerId) return;
      if (!endpointDrag.active && Math.hypot(event.clientX - endpointDrag.startX, event.clientY - endpointDrag.startY) < 6) return;
      event.preventDefault();
      endpointDrag.active = true;
      suppressClick = true;
      control.classList.add("dragging");
      control.style.left = `${event.clientX}px`;
      control.style.top = `${event.clientY}px`;
      clearDropTarget();
      const target = placementAtPointer(event.clientX, event.clientY);
      if (target) {
        session.surface.querySelector(`[data-placement-id="${target.id}"] .diagram-builder-piece`)?.classList.add("endpoint-drop-target");
      }
    };
    const finishEndpoint = (event, cancelled = false) => {
      if (!endpointDrag || endpointDrag.pointerId !== event.pointerId) return;
      const wasActive = endpointDrag.active;
      endpointDrag = null;
      window.removeEventListener("pointermove", moveEndpoint);
      window.removeEventListener("pointerup", finishEndpoint);
      window.removeEventListener("pointercancel", cancelEndpoint);
      if (!wasActive) return;
      event.preventDefault();
      event.stopPropagation();
      const target = cancelled ? null : placementAtPointer(event.clientX, event.clientY);
      clearDropTarget();
      if (target) {
        connection[endpoint === "start" ? "sourceId" : "targetId"] = target.id;
        setDiagramBuilderStatus(session, `${endpoint === "start" ? "Pfeilanfang" : "Pfeilende"} wurde neu verbunden.`, "success");
      }
      drawDiagramBuilderConnections(session);
      session.overlay.querySelector(".diagram-builder-connection-label-editor, .diagram-builder-usecase-relation-input")?.focus({ preventScroll: true });
      window.setTimeout(() => { suppressClick = false; }, 0);
    };
    const cancelEndpoint = (event) => finishEndpoint(event, true);
    control.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      endpointDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false
      };
      window.addEventListener("pointermove", moveEndpoint, { passive: false });
      window.addEventListener("pointerup", finishEndpoint);
      window.addEventListener("pointercancel", cancelEndpoint);
    });
    control.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suppressClick) return;
      if (fixedUseCaseDependency) return;
      openDiagramBuilderEndpointMenu(session, connection, endpoint, event.clientX, event.clientY);
    });
    session.overlay.append(control);
  });
}

function startDiagramBuilderConnectionFromHandle(session, placement) {
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  session.pendingConnection = {
    sourceId: placement.id,
    type: "editable",
    label: "",
    startMarker: "none",
    endMarker: "control"
  };
  session.surface.classList.add("connecting");
  session.surface.querySelector(`[data-placement-id="${placement.id}"] .diagram-builder-piece`)?.classList.add("connection-source");
  setDiagramBuilderStatus(session, "Jetzt auf das Zielelement klicken.", "connecting");
}

function drawDiagramBuilderConnections(session) {
  const layer = session.connectorLayer;
  if (!layer) return;
  session.overlay.querySelectorAll(".diagram-builder-endpoint-control, .diagram-builder-endpoint-menu").forEach((item) => item.remove());
  layer.replaceChildren();
  const width = session.surface.clientWidth;
  const height = session.surface.clientHeight;
  layer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  layer.setAttribute("width", String(width));
  layer.setAttribute("height", String(height));

  const definitions = createSvgElement("defs");
  const marker = createSvgElement("marker", {
    id: "diagram-builder-arrowhead",
    markerWidth: 8,
    markerHeight: 8,
    refX: 7,
    refY: 4,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth"
  });
  marker.append(createSvgElement("path", { d: "M 0 0 L 8 4 L 0 8 z", fill: "context-stroke" }));
  definitions.append(marker);
  const activityMarker = createSvgElement("marker", {
    id: "diagram-builder-activity-arrowhead",
    markerWidth: 8,
    markerHeight: 8,
    refX: 7,
    refY: 4,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth"
  });
  activityMarker.append(createSvgElement("path", {
    d: "M 1 1 L 7 4 L 1 7",
    fill: "none",
    stroke: "context-stroke",
    "stroke-width": 1.5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));
  definitions.append(activityMarker);
  const inheritanceMarker = createSvgElement("marker", {
    id: "diagram-builder-inheritance",
    markerWidth: 12,
    markerHeight: 12,
    refX: 10,
    refY: 6,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth"
  });
  inheritanceMarker.append(createSvgElement("path", { d: "M 1 1 L 11 6 L 1 11 z", fill: "#0a0810", stroke: "context-stroke", "stroke-width": 1.4 }));
  const aggregationMarker = createSvgElement("marker", {
    id: "diagram-builder-aggregation",
    markerWidth: 14,
    markerHeight: 10,
    refX: 13,
    refY: 5,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth"
  });
  aggregationMarker.append(createSvgElement("path", { d: "M 1 5 L 7 1 L 13 5 L 7 9 z", fill: "#0a0810", stroke: "context-stroke", "stroke-width": 1.2 }));
  const compositionMarker = createSvgElement("marker", {
    id: "diagram-builder-composition",
    markerWidth: 14,
    markerHeight: 10,
    refX: 13,
    refY: 5,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth"
  });
  compositionMarker.append(createSvgElement("path", { d: "M 1 5 L 7 1 L 13 5 L 7 9 z", fill: "context-stroke" }));
  definitions.append(inheritanceMarker, aggregationMarker, compositionMarker);
  layer.append(definitions);

  const surfaceRect = session.surface.getBoundingClientRect();
  const zoom = session.gridZoom || 1;
  const routedSegments = [];
  const automaticSourceSides = diagramBuilderAutomaticSourceSides(session);
  const sourcePortAssignments = diagramBuilderSourcePortAssignments(session, automaticSourceSides);
  const targetPortAssignments = diagramBuilderTargetPortAssignments(session, automaticSourceSides);
  const nodeRects = session.placements.map((placement) => {
    const node = session.surface.querySelector(`[data-placement-id="${placement.id}"] .diagram-builder-piece`);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      id: placement.id,
      left: (rect.left - surfaceRect.left) / zoom - 4,
      right: (rect.right - surfaceRect.left) / zoom + 4,
      top: (rect.top - surfaceRect.top) / zoom - 4,
      bottom: (rect.bottom - surfaceRect.top) / zoom + 4
    };
  }).filter(Boolean);
  session.connections.forEach((connection) => {
    const source = session.placements.find((placement) => placement.id === connection.sourceId);
    const target = session.placements.find((placement) => placement.id === connection.targetId);
    const sourceNode = session.surface.querySelector(`[data-placement-id="${connection.sourceId}"] .diagram-builder-piece`);
    const targetNode = session.surface.querySelector(`[data-placement-id="${connection.targetId}"] .diagram-builder-piece`);
    if (!source || !target || !sourceNode || !targetNode) return;
    const isUseCaseDependency = diagramBuilderIsUseCaseDependency(session, connection);
    if (isUseCaseDependency && !["include", "extend"].includes(connection.useCaseRelation)) connection.useCaseRelation = "include";
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const isSelfConnection = source.id === target.id;
    const selfConnections = isSelfConnection
      ? session.connections.filter((item) => item.sourceId === source.id && item.targetId === source.id)
      : [];
    const selfConnectionIndex = isSelfConnection
      ? Math.max(0, selfConnections.findIndex((item) => item.id === connection.id))
      : 0;
    const selfConnectionCenter = (selfConnections.length - 1) / 2;
    const selfConnectionSpread = (selfConnectionIndex - selfConnectionCenter) * 0.045;
    const sourceBox = {
      left: (sourceRect.left - surfaceRect.left) / zoom,
      right: (sourceRect.right - surfaceRect.left) / zoom,
      top: (sourceRect.top - surfaceRect.top) / zoom,
      bottom: (sourceRect.bottom - surfaceRect.top) / zoom
    };
    const targetBox = {
      left: (targetRect.left - surfaceRect.left) / zoom,
      right: (targetRect.right - surfaceRect.left) / zoom,
      top: (targetRect.top - surfaceRect.top) / zoom,
      bottom: (targetRect.bottom - surfaceRect.top) / zoom
    };
    let sourceSide = automaticSourceSides.get(connection.id) || "right";
    if (isSelfConnection) {
      const availableSpace = {
        right: width - sourceBox.right,
        left: sourceBox.left,
        bottom: height - sourceBox.bottom,
        top: sourceBox.top
      };
      const possibleSides = session.viewType === "sequence" || source.piece.kind === "pap-decision-table"
        ? ["right", "left"]
        : ["right", "left", "bottom", "top"];
      sourceSide = possibleSides.sort((left, right) => availableSpace[right] - availableSpace[left])[0];
    }
    const assignedSourceFraction = sourcePortAssignments.get(connection.id) || 0.5;
    const decisionActionFraction = source.piece.kind === "pap-decision-table"
      ? diagramBuilderDecisionActionPortFraction(source.piece)
      : null;
    const fraction = decisionActionFraction !== null
      ? Math.max(0.1, Math.min(0.9, decisionActionFraction + (isSelfConnection ? -0.06 + selfConnectionSpread : assignedSourceFraction - 0.5)))
      : isSelfConnection
        ? Math.max(0.18, Math.min(0.46, 0.34 + selfConnectionSpread))
        : assignedSourceFraction;
    const sourcePort = diagramBuilderPortOnBox(sourceBox, sourceSide, fraction, diagramBuilderIsDiamond(source.piece));
    const sourceSpan = diagramBuilderPlacementSpan(session, source.piece);
    const sourceBoundary = sourceSide === "left" || sourceSide === "right"
      ? { x: (source.column + (sourceSide === "right" ? sourceSpan.columns : 0)) * session.cellWidth, y: sourcePort.y }
      : { x: sourcePort.x, y: (source.row + (sourceSide === "bottom" ? sourceSpan.rows : 0)) * session.cellHeight };
    const selfLoopOffset = 26 + selfConnectionIndex * 10;
    if (isSelfConnection) {
      if (sourceSide === "right") sourceBoundary.x = sourceBox.right + selfLoopOffset;
      if (sourceSide === "left") sourceBoundary.x = sourceBox.left - selfLoopOffset;
      if (sourceSide === "bottom") sourceBoundary.y = sourceBox.bottom + selfLoopOffset;
      if (sourceSide === "top") sourceBoundary.y = sourceBox.top - selfLoopOffset;
    }
    const preferredTargetSide = isSelfConnection
      ? sourceSide
      : sourceSide === "left"
      ? "right"
      : sourceSide === "right"
        ? "left"
        : sourceSide === "top"
          ? "bottom"
          : "top";
    const targetSides = [preferredTargetSide];
    const routeCandidates = [];
    const laneOffsets = [0];
    for (let lane = 1; lane <= Math.max(8, session.connections.length); lane += 1) laneOffsets.push(-lane * 5, lane * 5);
    targetSides.forEach((targetSide, targetSideIndex) => {
      const targetFraction = isSelfConnection && target.piece.kind === "pap-decision-table"
        ? Math.max(0.1, Math.min(0.9, diagramBuilderDecisionActionPortFraction(target.piece) + 0.06 - selfConnectionSpread))
        : isSelfConnection
          ? Math.max(0.54, Math.min(0.82, 0.66 - selfConnectionSpread))
          : targetPortAssignments.get(connection.id) || 0.5;
      const targetPort = diagramBuilderPortOnBox(targetBox, targetSide, targetFraction, diagramBuilderIsDiamond(target.piece));
      const targetSpan = diagramBuilderPlacementSpan(session, target.piece);
      const targetBoundary = targetSide === "left" || targetSide === "right"
        ? { x: (target.column + (targetSide === "right" ? targetSpan.columns : 0)) * session.cellWidth, y: targetPort.y }
        : { x: targetPort.x, y: (target.row + (targetSide === "bottom" ? targetSpan.rows : 0)) * session.cellHeight };
      if (isSelfConnection) {
        if (targetSide === "right") targetBoundary.x = targetBox.right + selfLoopOffset;
        if (targetSide === "left") targetBoundary.x = targetBox.left - selfLoopOffset;
        if (targetSide === "bottom") targetBoundary.y = targetBox.bottom + selfLoopOffset;
        if (targetSide === "top") targetBoundary.y = targetBox.top - selfLoopOffset;
      }
      const addRouteCandidate = (points, routeIndex, laneOffset, detour = false) => {
        const compactPoints = diagramBuilderCompactOrthogonalPath(points);
        const segments = compactPoints.slice(1).map((point, index) => ({ from: compactPoints[index], to: point }));
        const nodeHits = segments.reduce((count, segment) => count + nodeRects.filter((rect) => (
          rect.id !== source.id && rect.id !== target.id && diagramBuilderSegmentHitsRect(segment, rect)
        )).length, 0);
        const sourceReentries = segments.slice(1).filter((segment) => diagramBuilderSegmentHitsRect(segment, sourceBox)).length;
        const targetEarlyEntries = segments.slice(0, -1).filter((segment) => diagramBuilderSegmentHitsRect(segment, targetBox)).length;
        const overlaps = segments.reduce((count, segment) => count + routedSegments.filter((routed) => diagramBuilderSegmentsOverlap(segment, routed)).length, 0);
        const crossings = segments.reduce((count, segment) => count + routedSegments.filter((routed) => (
          !diagramBuilderSegmentsOverlap(segment, routed) && diagramBuilderSegmentsIntersect(segment, routed)
        )).length, 0);
        const length = segments.reduce((sum, segment) => sum + Math.abs(segment.to.x - segment.from.x) + Math.abs(segment.to.y - segment.from.y), 0);
        routeCandidates.push({
          points: compactPoints,
          segments,
          invalid: sourceReentries > 0 || targetEarlyEntries > 0 || overlaps > 0,
          score: overlaps * 5000
            + nodeHits * 1000
            + crossings * 180
            + targetSideIndex * 4
            + routeIndex * 0.5
            + (detour ? 1 : 0)
            + Math.abs(laneOffset) * 0.5
            + length * 0.01
        });
      };

      ["horizontal", "vertical"].forEach((orientation, routeIndex) => {
        laneOffsets.forEach((laneOffset) => {
          const laneStart = orientation === "horizontal"
            ? { x: sourceBoundary.x, y: sourceBoundary.y + laneOffset }
            : { x: sourceBoundary.x + laneOffset, y: sourceBoundary.y };
          const laneTurn = orientation === "horizontal"
            ? { x: targetBoundary.x, y: sourceBoundary.y + laneOffset }
            : { x: sourceBoundary.x + laneOffset, y: targetBoundary.y };
          addRouteCandidate([
            sourcePort,
            sourceBoundary,
            laneStart,
            laneTurn,
            targetBoundary,
            targetPort
          ], routeIndex, laneOffset);
        });
      });

      const sourceIsHorizontal = sourceSide === "left" || sourceSide === "right";
      const detourGridLines = sourceIsHorizontal
        ? [source.row * session.cellHeight, (source.row + sourceSpan.rows) * session.cellHeight]
        : [source.column * session.cellWidth, (source.column + sourceSpan.columns) * session.cellWidth];
      detourGridLines.forEach((gridLine, detourIndex) => {
        laneOffsets.forEach((laneOffset) => {
          const detourLine = gridLine + laneOffset;
          const detourStart = sourceIsHorizontal
            ? { x: sourceBoundary.x, y: detourLine }
            : { x: detourLine, y: sourceBoundary.y };
          const detourTurn = sourceIsHorizontal
            ? { x: targetBoundary.x, y: detourLine }
            : { x: detourLine, y: targetBoundary.y };
          addRouteCandidate([
            sourcePort,
            sourceBoundary,
            detourStart,
            detourTurn,
            targetBoundary,
            targetPort
          ], 2 + detourIndex, laneOffset, true);
          });
        });
    });
    routeCandidates.sort((left, right) => Number(left.invalid) - Number(right.invalid) || left.score - right.score);
    const route = routeCandidates[0];
    routedSegments.push(...route.segments);
    const pathData = route.points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    const pathAttributes = {
      class: `diagram-builder-connector editable${isUseCaseDependency ? " usecase-dependency" : ""}`,
      d: pathData
    };
    const markerUrl = (markerType) => ({
      control: ["activity", "state"].includes(session.viewType)
        ? "url(#diagram-builder-activity-arrowhead)"
        : "url(#diagram-builder-arrowhead)",
      inheritance: "url(#diagram-builder-inheritance)",
      aggregation: "url(#diagram-builder-aggregation)",
      composition: "url(#diagram-builder-composition)"
    })[markerType];
    const startMarkerUrl = isUseCaseDependency ? null : markerUrl(connection.startMarker || "none");
    const endMarkerUrl = isUseCaseDependency
      ? "url(#diagram-builder-activity-arrowhead)"
      : markerUrl(connection.endMarker || "control");
    if (startMarkerUrl) pathAttributes["marker-start"] = startMarkerUrl;
    if (endMarkerUrl) pathAttributes["marker-end"] = endMarkerUrl;
    const connectionGroup = createSvgElement("g", {
      class: "diagram-builder-connection-group",
      "data-connection-id": connection.id
    });
    const hitPath = createSvgElement("path", {
      class: "diagram-builder-connector-hit",
      d: pathData
    });
    const path = createSvgElement("path", pathAttributes);
    connectionGroup.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isUseCaseDependency) beginDiagramBuilderUseCaseDependencyEdit(session, connection, event.clientX, event.clientY);
      else beginDiagramBuilderConnectionLabelEdit(session, connection, event.clientX, event.clientY);
    });
    connectionGroup.append(hitPath, path);
    layer.append(connectionGroup);
    const visibleConnectionLabel = isUseCaseDependency
      ? `«${connection.useCaseRelation}»${connection.label ? ` ${connection.label}` : ""}`
      : connection.label;
    if (visibleConnectionLabel) {
      const labelSegment = [...route.segments].sort((left, right) => {
        const leftLength = Math.abs(left.to.x - left.from.x) + Math.abs(left.to.y - left.from.y);
        const rightLength = Math.abs(right.to.x - right.from.x) + Math.abs(right.to.y - right.from.y);
        return rightLength - leftLength;
      })[0];
      const verticalLabel = labelSegment?.from.x === labelSegment?.to.x;
      const label = createSvgElement("text", {
        class: "diagram-builder-connector-label editable",
        x: verticalLabel ? labelSegment.from.x + 12 : (labelSegment.from.x + labelSegment.to.x) / 2,
        y: verticalLabel ? (labelSegment.from.y + labelSegment.to.y) / 2 : labelSegment.from.y - 6,
        "text-anchor": "middle"
      });
      label.textContent = visibleConnectionLabel;
      connectionGroup.append(label);
    }
    renderDiagramBuilderEndpointControls(session, connection, route, surfaceRect);
  });
}

function createDiagramBuilderPlacedNode(session, placement) {
  const cell = createElement("div", "diagram-builder-cell-item");
  cell.dataset.placementId = String(placement.id);
  cell.style.left = `${placement.column * session.cellWidth}px`;
  cell.style.top = `${placement.row * session.cellHeight}px`;
  const placementSpan = applyDiagramBuilderPlacementSpan(session, placement.piece, cell);
  cell.draggable = false;
  const node = createElement("div", `diagram-builder-piece ${placement.piece.kind}`);
  node.draggable = false;
  const pieceMetrics = applyDiagramBuilderPieceMetrics(node, placement.piece);
  if (placement.piece.kind === "sequence-activation") {
    pieceMetrics.elementHeight = diagramBuilderActivationHeight(session, placement.piece);
    pieceMetrics.visualHeight = pieceMetrics.elementHeight;
    applyDiagramBuilderActivationGeometry(session, placement, cell, node);
  }
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", `${placement.piece.label || placement.piece.paletteLabel}; Doppelklick zum Bearbeiten`);
  appendDiagramBuilderPieceContent(node, placement.piece, placement.piece.label);
  cell.append(node);

  const selectNode = (event) => {
    if (session.pendingConnection) {
      const source = session.placements.find((item) => item.id === session.pendingConnection.sourceId);
      const isUseCaseDependency = session.viewType === "usecase"
        && source?.piece.kind === "usecase"
        && placement.piece.kind === "usecase";
      session.connections.push({
        id: ++session.nextConnectionId,
        sourceId: session.pendingConnection.sourceId,
        targetId: placement.id,
        type: session.pendingConnection.type,
        label: session.pendingConnection.label,
        startMarker: session.pendingConnection.startMarker,
        endMarker: session.pendingConnection.endMarker,
        ...(isUseCaseDependency ? { useCaseRelation: "include" } : {})
      });
      clearDiagramBuilderConnectionMode(session);
      setDiagramBuilderStatus(session, "Verbindung erstellt. Beim Hover erscheinen neue Anschlüsse.", "success");
      drawDiagramBuilderConnections(session);
      event?.stopPropagation();
      return;
    }
    session.selectedPlacementId = placement.id;
    session.selectedSwimlaneId = null;
    session.selectedSystemBoundaryId = null;
    session.selectedSequenceFragmentId = null;
    session.surface.querySelectorAll(".diagram-builder-piece.selected").forEach((item) => item.classList.remove("selected"));
    session.surface.querySelectorAll(".diagram-builder-swimlane.selected, .diagram-builder-system-boundary.selected, .diagram-builder-sequence-fragment-frame.selected").forEach((item) => item.classList.remove("selected"));
    node.classList.add("selected");
  };
  node.addEventListener("click", selectNode);
  node.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (Number.isInteger(session.armedPieceIndex)) return;
    selectNode();
    beginDiagramBuilderLabelEdit(session, placement);
  });
  cell.addEventListener("contextmenu", (event) => event.preventDefault());
  const handles = createElement("div", "diagram-builder-connection-handles");
  const centerX = placementSpan.columns * session.cellWidth / 2;
  const centerY = placement.piece.kind === "sequence-activation"
    ? 14 + pieceMetrics.elementHeight / 2
    : placementSpan.rows * session.cellHeight / 2;
  const handleBox = {
    left: centerX - pieceMetrics.elementWidth / 2,
    right: centerX + pieceMetrics.elementWidth / 2,
    top: centerY - pieceMetrics.elementHeight / 2,
    bottom: centerY + pieceMetrics.elementHeight / 2
  };
  const isDiamond = diagramBuilderIsDiamond(placement.piece);
  const connectionHandleSides = placement.piece.kind === "pap-decision-table"
    ? [["right", "→"], ["left", "←"]]
    : session.viewType === "sequence"
    ? (placement.piece.kind === "sequence-activation" ? [["right", "→"], ["left", "←"]] : [])
    : [
    ["top", "↑"],
    ["right", "→"],
    ["bottom", "↓"],
    ["left", "←"]
  ];
  connectionHandleSides.forEach(([side, icon]) => {
    const fraction = placement.piece.kind === "pap-decision-table"
      ? diagramBuilderDecisionActionPortFraction(placement.piece, pieceMetrics)
      : 0.5;
    const port = diagramBuilderPortOnBox(handleBox, side, fraction, isDiamond);
    const left = port.x + (side === "left" ? -8 : side === "right" ? 8 : 0);
    const top = port.y + (side === "top" ? -8 : side === "bottom" ? 8 : 0);
    const handle = createElement("button", `diagram-builder-connection-handle ${side}`, icon);
    handle.type = "button";
    handle.draggable = false;
    handle.style.left = `${left}px`;
    handle.style.top = `${top}px`;
    handle.setAttribute("aria-label", "Verbindung beginnen; Anschlussseite wird nach Wahl des Ziels automatisch bestimmt");
    handle.title = handle.getAttribute("aria-label");
    handle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    handle.addEventListener("dragstart", (event) => event.preventDefault());
    handle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startDiagramBuilderConnectionFromHandle(session, placement);
    });
    handles.append(handle);
  });
  cell.append(handles);
  let pointerDrag = null;
  let suppressPointerClick = false;
  const movePointerDrag = (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    if (!pointerDrag.active && Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) < 8) return;
    event.preventDefault();
    if (!pointerDrag.active) {
      pointerDrag.active = true;
      suppressPointerClick = true;
      cell.classList.add("dragging");
      showDiagramBuilderTrashTarget(session, placement);
    }
    const trash = session.palette.querySelector(".diagram-builder-trash-target");
    const trashRect = trash?.getBoundingClientRect();
    const overTrash = Boolean(trashRect
      && event.clientX >= trashRect.left && event.clientX <= trashRect.right
      && event.clientY >= trashRect.top && event.clientY <= trashRect.bottom);
    trash?.classList.toggle("drag-over", overTrash);
    const surfaceRect = session.surface.getBoundingClientRect();
    const overSurface = event.clientX >= surfaceRect.left && event.clientX <= surfaceRect.right
      && event.clientY >= surfaceRect.top && event.clientY <= surfaceRect.bottom;
    if (overSurface && !overTrash) updateDiagramBuilderRepositionPreview(session, event.clientX, event.clientY);
    else clearDiagramBuilderRepositionPreview(session);
  };
  let cancelPointerDrag = null;
  const finishPointerDrag = (event, cancelled = false) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    const wasActive = pointerDrag.active;
    pointerDrag = null;
    window.removeEventListener("pointermove", movePointerDrag);
    window.removeEventListener("pointerup", finishPointerDrag);
    window.removeEventListener("pointercancel", cancelPointerDrag);
    if (!wasActive) return;
    window.setTimeout(() => { suppressPointerClick = false; }, 0);
    event.preventDefault();
    event.stopPropagation();
    const trash = session.palette.querySelector(".diagram-builder-trash-target");
    const trashRect = trash?.getBoundingClientRect();
    const overTrash = !cancelled && Boolean(trashRect
      && event.clientX >= trashRect.left && event.clientX <= trashRect.right
      && event.clientY >= trashRect.top && event.clientY <= trashRect.bottom);
    const surfaceRect = session.surface.getBoundingClientRect();
    const overSurface = !cancelled && event.clientX >= surfaceRect.left && event.clientX <= surfaceRect.right
      && event.clientY >= surfaceRect.top && event.clientY <= surfaceRect.bottom;
    const targetCell = overSurface ? diagramBuilderCellFromPoint(session, event.clientX, event.clientY) : null;
    clearDiagramBuilderRepositionPreview(session);
    cell.classList.remove("dragging");
    session.draggingPlacementId = null;
    trash?.classList.remove("drag-over");
    if (overTrash) {
      requestDiagramBuilderDeletion(session, placement, event.clientX, event.clientY);
      return;
    }
    renderDiagramBuilderPalette(session);
    if (!targetCell) {
      setDiagramBuilderStatus(session, "Element ist an seiner Ausgangsposition geblieben.");
      return;
    }
    if (!diagramBuilderCanPlacePiece(session, placement.piece, targetCell.row, targetCell.column, placement.id)) {
      const message = placement.piece.kind === "sequence-activation"
        ? "Ein Aktivitätsbalken muss auf einer Lebenslinie liegen."
        : "Dieses Rasterfeld ist belegt oder die Lebenslinie würde einen Aktivitätsbalken verlieren.";
      setDiagramBuilderStatus(session, message, "error");
      return;
    }
    placement.row = targetCell.row;
    placement.column = targetCell.column;
    session.selectedPlacementId = placement.id;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, "Element ist in das neue Rasterfeld eingerastet.", "success");
  };
  cancelPointerDrag = (event) => finishPointerDrag(event, true);
  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || session.pendingConnection || session.editingPlacementId) return;
    pointerDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false
    };
    window.addEventListener("pointermove", movePointerDrag, { passive: false });
    window.addEventListener("pointerup", finishPointerDrag);
    window.addEventListener("pointercancel", cancelPointerDrag);
  });
  node.addEventListener("click", (event) => {
    if (!suppressPointerClick) return;
    suppressPointerClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  node.addEventListener("mouseenter", () => highlightDiagramBuilderCodeLine(session, placement.piece.lineIndex));
  node.addEventListener("mouseleave", () => highlightDiagramBuilderCodeLine(session, null));
  node.addEventListener("focus", () => highlightDiagramBuilderCodeLine(session, placement.piece.lineIndex));
  node.addEventListener("blur", () => highlightDiagramBuilderCodeLine(session, null));
  return cell;
}

function applyDiagramBuilderSystemBoundaryGeometry(session, boundary, node) {
  node.style.left = `${boundary.leftColumn * session.cellWidth}px`;
  node.style.top = `${boundary.topRow * session.cellHeight}px`;
  node.style.width = `${(boundary.rightColumn - boundary.leftColumn) * session.cellWidth}px`;
  node.style.height = `${(boundary.bottomRow - boundary.topRow) * session.cellHeight}px`;
}

function diagramBuilderGridLineFromPoint(session, clientX, clientY) {
  const surfaceRect = session.surface.getBoundingClientRect();
  const zoom = session.gridZoom || 1;
  return {
    column: Math.max(0, Math.round((clientX - surfaceRect.left) / (session.cellWidth * zoom))),
    row: Math.max(0, Math.round((clientY - surfaceRect.top) / (session.cellHeight * zoom)))
  };
}

function beginDiagramBuilderSystemBoundaryResize(session, boundary, node, horizontalSide, verticalSide, event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSequenceFragmentId = null;
  session.selectedSystemBoundaryId = boundary.id;
  node.classList.add("selected", "resizing");
  const pointerId = event.pointerId;
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    moveEvent.preventDefault();
    const line = diagramBuilderGridLineFromPoint(session, moveEvent.clientX, moveEvent.clientY);
    if (horizontalSide === "left") boundary.leftColumn = Math.min(boundary.rightColumn - 1, line.column);
    if (horizontalSide === "right") boundary.rightColumn = Math.max(boundary.leftColumn + 1, line.column);
    if (verticalSide === "top") boundary.topRow = Math.min(boundary.bottomRow - 1, line.row);
    if (verticalSide === "bottom") boundary.bottomRow = Math.max(boundary.topRow + 1, line.row);
    updateDiagramBuilderGridMetrics(session);
    applyDiagramBuilderSystemBoundaryGeometry(session, boundary, node);
    setDiagramBuilderStatus(session, "Systemgrenze ist auf den Gridlinien eingerastet.", "success");
  };
  const finish = (finishEvent) => {
    if (finishEvent.pointerId !== pointerId) return;
    node.classList.remove("resizing");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
  };
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
}

function createDiagramBuilderSystemBoundaryHandle(session, boundary, node, className, horizontalSide = null, verticalSide = null) {
  const handle = createElement("button", `diagram-builder-system-boundary-handle ${className}`);
  handle.type = "button";
  const description = horizontalSide && verticalSide
    ? `${horizontalSide === "left" ? "linken" : "rechten"} ${verticalSide === "top" ? "oberen" : "unteren"} Ecke`
    : `${horizontalSide === "left" ? "linken" : horizontalSide === "right" ? "rechten" : verticalSide === "top" ? "oberen" : "unteren"} Kante`;
  handle.setAttribute("aria-label", `Systemgrenze an der ${description} verändern`);
  handle.title = `${description[0].toUpperCase()}${description.slice(1)} ziehen · rastet auf Gridlinien ein`;
  handle.addEventListener("pointerdown", (event) => beginDiagramBuilderSystemBoundaryResize(
    session,
    boundary,
    node,
    horizontalSide,
    verticalSide,
    event
  ));
  return handle;
}

function beginDiagramBuilderSystemBoundaryEdit(session, boundary) {
  session.finishEditing?.(true);
  session.finishConnectionEditing?.(true);
  session.finishSwimlaneEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  const original = {
    label: boundary.label || "",
    leftColumn: boundary.leftColumn,
    rightColumn: boundary.rightColumn,
    topRow: boundary.topRow,
    bottomRow: boundary.bottomRow
  };
  session.editingSystemBoundaryId = boundary.id;
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSequenceFragmentId = null;
  session.selectedSystemBoundaryId = boundary.id;
  let finished = false;
  session.finishSystemBoundaryEditing = (save) => {
    if (finished) return;
    finished = true;
    const editor = session.surface.querySelector(
      `[data-system-boundary-id="${boundary.id}"] .diagram-builder-system-boundary-label-editor`
    );
    if (save) boundary.label = editor?.value.trim() || "";
    else Object.assign(boundary, original);
    session.editingSystemBoundaryId = null;
    session.finishSystemBoundaryEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(
      session,
      save ? "Systemgrenze übernommen." : "Bearbeitung der Systemgrenze abgebrochen.",
      save ? "success" : ""
    );
  };
  renderDiagramBuilderWorkspace(session);
  const editor = session.surface.querySelector(
    `[data-system-boundary-id="${boundary.id}"] .diagram-builder-system-boundary-label-editor`
  );
  editor?.focus({ preventScroll: true });
  editor?.select();
}

function createDiagramBuilderSystemBoundaryNode(session, boundary) {
  const isEditing = session.editingSystemBoundaryId === boundary.id;
  const node = createElement(
    "section",
    `diagram-builder-system-boundary${isEditing ? " editing" : ""}${session.selectedSystemBoundaryId === boundary.id ? " selected" : ""}`
  );
  node.dataset.systemBoundaryId = String(boundary.id);
  node.setAttribute(
    "aria-label",
    `${boundary.label ? `Systemgrenze ${boundary.label}` : "Unbenannte Systemgrenze"}; doppelklicken zum Bearbeiten`
  );
  node.title = "Doppelklick auf die Bezeichnung zum Bearbeiten";
  applyDiagramBuilderSystemBoundaryGeometry(session, boundary, node);
  if (isEditing) {
    const editor = createElement("input", "diagram-builder-system-boundary-label-editor");
    editor.type = "text";
    editor.value = boundary.label || "";
    editor.placeholder = "Systembezeichnung";
    editor.setAttribute("aria-label", "Bezeichnung der Systemgrenze bearbeiten");
    editor.addEventListener("click", (event) => event.stopPropagation());
    editor.addEventListener("dblclick", (event) => event.stopPropagation());
    editor.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (document.activeElement?.closest?.(".diagram-builder-system-boundary-handle")) return;
        session.finishSystemBoundaryEditing?.(true);
      }, 0);
    });
    node.append(editor);
  } else {
    const label = createElement(
      "button",
      `diagram-builder-system-boundary-label${boundary.label ? "" : " is-empty"}`,
      boundary.label || ""
    );
    label.type = "button";
    label.title = "Doppelklick zum Benennen";
    label.setAttribute(
      "aria-label",
      `${boundary.label || "Unbenannte Systemgrenze"}; doppelklicken zum Bearbeiten`
    );
    label.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginDiagramBuilderSystemBoundaryEdit(session, boundary);
    });
    node.append(label);
  }
  node.append(
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "edge top", null, "top"),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "edge right", "right", null),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "edge bottom", null, "bottom"),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "edge left", "left", null),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "corner top-left", "left", "top"),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "corner top-right", "right", "top"),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "corner bottom-right", "right", "bottom"),
    createDiagramBuilderSystemBoundaryHandle(session, boundary, node, "corner bottom-left", "left", "bottom")
  );
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    session.selectedPlacementId = null;
    session.selectedSwimlaneId = null;
    session.selectedSequenceFragmentId = null;
    session.selectedSystemBoundaryId = boundary.id;
    session.surface.querySelectorAll(".diagram-builder-piece.selected, .diagram-builder-swimlane.selected, .diagram-builder-system-boundary.selected")
      .forEach((item) => item.classList.remove("selected"));
    node.classList.add("selected");
  });
  node.addEventListener("dblclick", (event) => {
    if (isEditing || event.target.closest(".diagram-builder-system-boundary-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    beginDiagramBuilderSystemBoundaryEdit(session, boundary);
  });
  return node;
}

function addDiagramBuilderSystemBoundary(session, row, column) {
  const boundary = {
    id: ++session.nextSystemBoundaryId,
    label: "",
    leftColumn: Math.max(0, column),
    rightColumn: Math.max(0, column) + 3,
    topRow: Math.max(0, row),
    bottomRow: Math.max(0, row) + 3
  };
  session.systemBoundaries.push(boundary);
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSequenceFragmentId = null;
  session.selectedSystemBoundaryId = boundary.id;
  renderDiagramBuilderWorkspace(session);
  setDiagramBuilderStatus(session, "Systemgrenze platziert. Bezeichnung doppelklicken oder Kanten und Ecken ziehen.", "success");
  return true;
}

function applyDiagramBuilderSequenceFragmentGeometry(session, fragment, node) {
  node.style.left = `${fragment.leftColumn * session.cellWidth}px`;
  node.style.top = `${fragment.topRow * session.cellHeight}px`;
  node.style.width = `${(fragment.rightColumn - fragment.leftColumn) * session.cellWidth}px`;
  node.style.height = `${(fragment.bottomRow - fragment.topRow) * session.cellHeight}px`;
}

function beginDiagramBuilderSequenceFragmentResize(session, fragment, node, horizontalSide, verticalSide, event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = fragment.id;
  node.classList.add("selected", "resizing");
  const pointerId = event.pointerId;
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    moveEvent.preventDefault();
    const line = diagramBuilderGridLineFromPoint(session, moveEvent.clientX, moveEvent.clientY);
    if (horizontalSide === "left") fragment.leftColumn = Math.min(fragment.rightColumn - 1, line.column);
    if (horizontalSide === "right") fragment.rightColumn = Math.max(fragment.leftColumn + 1, line.column);
    if (verticalSide === "top") fragment.topRow = Math.min(fragment.bottomRow - 1, line.row);
    if (verticalSide === "bottom") fragment.bottomRow = Math.max(fragment.topRow + 1, line.row);
    updateDiagramBuilderGridMetrics(session);
    applyDiagramBuilderSequenceFragmentGeometry(session, fragment, node);
    setDiagramBuilderStatus(session, "Kombiniertes Fragment ist auf den Gridlinien eingerastet.", "success");
  };
  const finish = (finishEvent) => {
    if (finishEvent.pointerId !== pointerId) return;
    node.classList.remove("resizing");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
  };
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
}

function createDiagramBuilderSequenceFragmentHandle(session, fragment, node, className, horizontalSide = null, verticalSide = null) {
  const handle = createElement("button", `diagram-builder-sequence-fragment-handle ${className}`);
  handle.type = "button";
  const description = horizontalSide && verticalSide
    ? `${horizontalSide === "left" ? "linken" : "rechten"} ${verticalSide === "top" ? "oberen" : "unteren"} Ecke`
    : `${horizontalSide === "left" ? "linken" : horizontalSide === "right" ? "rechten" : verticalSide === "top" ? "oberen" : "unteren"} Kante`;
  handle.setAttribute("aria-label", `Kombiniertes Fragment an der ${description} verändern`);
  handle.title = `${description} ziehen · rastet auf Gridlinien ein`;
  handle.addEventListener("pointerdown", (event) => beginDiagramBuilderSequenceFragmentResize(
    session,
    fragment,
    node,
    horizontalSide,
    verticalSide,
    event
  ));
  return handle;
}

function syncDiagramBuilderSequenceFragmentEditor(session, fragment) {
  const node = session.surface.querySelector(`[data-sequence-fragment-id="${fragment.id}"]`);
  const operator = node?.querySelector(".diagram-builder-sequence-fragment-operator-select");
  const inputs = node?.querySelectorAll(".diagram-builder-sequence-fragment-operand-input");
  if (operator) fragment.operator = operator.value;
  if (inputs?.length) fragment.operands = Array.from(inputs, (input) => input.value.trim());
}

function beginDiagramBuilderSequenceFragmentEdit(session, fragment) {
  session.finishEditing?.(true);
  session.finishConnectionEditing?.(true);
  session.finishSwimlaneEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  const original = {
    operator: fragment.operator,
    operands: [...fragment.operands],
    leftColumn: fragment.leftColumn,
    rightColumn: fragment.rightColumn,
    topRow: fragment.topRow,
    bottomRow: fragment.bottomRow
  };
  session.editingSequenceFragmentId = fragment.id;
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = fragment.id;
  let finished = false;
  session.finishSequenceFragmentEditing = (save) => {
    if (finished) return;
    finished = true;
    if (save) syncDiagramBuilderSequenceFragmentEditor(session, fragment);
    else Object.assign(fragment, original, { operands: [...original.operands] });
    session.editingSequenceFragmentId = null;
    session.finishSequenceFragmentEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(
      session,
      save ? "Kombiniertes Fragment übernommen." : "Bearbeitung des kombinierten Fragments abgebrochen.",
      save ? "success" : ""
    );
  };
  renderDiagramBuilderWorkspace(session);
  session.surface.querySelector(`[data-sequence-fragment-id="${fragment.id}"] select`)?.focus({ preventScroll: true });
}

function createDiagramBuilderSequenceFragmentNode(session, fragment) {
  const isEditing = session.editingSequenceFragmentId === fragment.id;
  const node = createElement(
    "section",
    `diagram-builder-sequence-fragment-frame${isEditing ? " editing" : ""}${session.selectedSequenceFragmentId === fragment.id ? " selected" : ""}`
  );
  node.dataset.sequenceFragmentId = String(fragment.id);
  node.setAttribute("aria-label", `Kombiniertes Fragment ${fragment.operator}; doppelklicken zum Bearbeiten`);
  applyDiagramBuilderSequenceFragmentGeometry(session, fragment, node);

  const header = createElement("div", "diagram-builder-sequence-fragment-header");
  if (isEditing) {
    const select = createElement("select", "diagram-builder-sequence-fragment-operator-select");
    select.setAttribute("aria-label", "Typ des kombinierten Fragments");
    ["alt", "if", "else if", "else"].forEach((operator) => select.append(new Option(operator, operator, false, fragment.operator === operator)));
    header.append(select);
    const addOperand = createElement("button", "diagram-builder-sequence-fragment-add", "+ Bereich");
    addOperand.type = "button";
    addOperand.setAttribute("aria-label", "Bereich zum kombinierten Fragment hinzufügen");
    addOperand.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      syncDiagramBuilderSequenceFragmentEditor(session, fragment);
      fragment.operands.push("");
      renderDiagramBuilderWorkspace(session);
      const inputs = session.surface.querySelectorAll(`[data-sequence-fragment-id="${fragment.id}"] .diagram-builder-sequence-fragment-operand-input`);
      inputs[inputs.length - 1]?.focus({ preventScroll: true });
    });
    header.append(addOperand);
  } else {
    const operator = createElement("button", "diagram-builder-sequence-fragment-operator", fragment.operator);
    operator.type = "button";
    operator.setAttribute("aria-label", `${fragment.operator}; doppelklicken zum Bearbeiten des kombinierten Fragments`);
    operator.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginDiagramBuilderSequenceFragmentEdit(session, fragment);
    });
    header.append(operator);
  }
  node.append(header);

  const operands = createElement("div", "diagram-builder-sequence-fragment-operands");
  fragment.operands.forEach((label, index) => {
    const operand = createElement("div", "diagram-builder-sequence-fragment-operand");
    if (isEditing) {
      const input = createElement("input", "diagram-builder-sequence-fragment-operand-input");
      input.type = "text";
      input.value = label;
      input.placeholder = index === 0 ? "Bedingung oder Beschreibung" : "Weiterer Bereich";
      input.setAttribute("aria-label", `Beschriftung für Bereich ${index + 1}`);
      operand.append(input);
      if (fragment.operands.length > 1) {
        const remove = createElement("button", "diagram-builder-sequence-fragment-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `Bereich ${index + 1} löschen`);
        remove.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          syncDiagramBuilderSequenceFragmentEditor(session, fragment);
          fragment.operands.splice(index, 1);
          renderDiagramBuilderWorkspace(session);
          session.surface.querySelector(`[data-sequence-fragment-id="${fragment.id}"] .diagram-builder-sequence-fragment-operand-input`)?.focus({ preventScroll: true });
        });
        operand.append(remove);
      }
    } else if (label) {
      const visibleLabel = label.startsWith("[") && label.endsWith("]") ? label : `[${label}]`;
      operand.append(createElement("span", "diagram-builder-sequence-fragment-operand-label", visibleLabel));
    }
    operands.append(operand);
  });
  node.append(operands);
  node.append(
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "edge top", null, "top"),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "edge right", "right", null),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "edge bottom", null, "bottom"),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "edge left", "left", null),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "corner top-left", "left", "top"),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "corner top-right", "right", "top"),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "corner bottom-right", "right", "bottom"),
    createDiagramBuilderSequenceFragmentHandle(session, fragment, node, "corner bottom-left", "left", "bottom")
  );
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    session.selectedPlacementId = null;
    session.selectedSwimlaneId = null;
    session.selectedSystemBoundaryId = null;
    session.selectedSequenceFragmentId = fragment.id;
    session.surface.querySelectorAll(".diagram-builder-piece.selected, .diagram-builder-swimlane.selected, .diagram-builder-system-boundary.selected, .diagram-builder-sequence-fragment-frame.selected")
      .forEach((item) => item.classList.remove("selected"));
    node.classList.add("selected");
  });
  node.addEventListener("dblclick", (event) => {
    if (isEditing || event.target.closest(".diagram-builder-sequence-fragment-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    beginDiagramBuilderSequenceFragmentEdit(session, fragment);
  });
  if (isEditing) {
    node.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!node.isConnected) return;
        if (!node.contains(document.activeElement)) session.finishSequenceFragmentEditing?.(true);
      }, 0);
    });
  }
  return node;
}

function addDiagramBuilderSequenceFragment(session, row, column) {
  const fragment = {
    id: ++session.nextSequenceFragmentId,
    operator: "alt",
    operands: ["", ""],
    leftColumn: Math.max(0, column),
    rightColumn: Math.max(0, column) + 4,
    topRow: Math.max(0, row),
    bottomRow: Math.max(0, row) + 4
  };
  session.sequenceFragments.push(fragment);
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = fragment.id;
  renderDiagramBuilderWorkspace(session);
  setDiagramBuilderStatus(session, "Kombiniertes Fragment platziert. Doppelklick auf den Fragmenttyp öffnet den Bearbeitungsmodus.", "success");
  return true;
}

function applyDiagramBuilderSwimlaneGeometry(session, swimlane, node) {
  node.style.left = `${swimlane.leftColumn * session.cellWidth}px`;
  node.style.width = `${(swimlane.rightColumn - swimlane.leftColumn) * session.cellWidth}px`;
}

function beginDiagramBuilderSwimlaneEdit(session, swimlane) {
  session.finishEditing?.(true);
  session.finishConnectionEditing?.(true);
  session.finishSwimlaneEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  const original = {
    label: swimlane.label,
    leftColumn: swimlane.leftColumn,
    rightColumn: swimlane.rightColumn
  };
  session.editingSwimlaneId = swimlane.id;
  session.selectedSwimlaneId = swimlane.id;
  let finished = false;
  session.finishSwimlaneEditing = (save) => {
    if (finished) return;
    finished = true;
    const editor = session.surface.querySelector(`[data-swimlane-id="${swimlane.id}"] .diagram-builder-swimlane-label-editor`);
    if (save) swimlane.label = editor?.value.trim() || swimlane.label;
    else Object.assign(swimlane, original);
    session.editingSwimlaneId = null;
    session.finishSwimlaneEditing = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, save ? "Swimlane übernommen." : "Swimlane-Bearbeitung abgebrochen.", save ? "success" : "");
  };
  renderDiagramBuilderWorkspace(session);
  const editor = session.surface.querySelector(`[data-swimlane-id="${swimlane.id}"] .diagram-builder-swimlane-label-editor`);
  editor?.focus({ preventScroll: true });
  editor?.select();
}

function createDiagramBuilderSwimlaneBoundary(session, swimlane, side, laneNode) {
  const boundary = createElement("button", `diagram-builder-swimlane-boundary ${side}`);
  boundary.type = "button";
  boundary.setAttribute("aria-label", `${side === "left" ? "Linke" : "Rechte"} Swimlane-Grenze verschieben`);
  boundary.title = "Horizontal verschieben · rastet auf Gridlinien ein";
  let pointerId = null;
  const move = (event) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    const surfaceRect = session.surface.getBoundingClientRect();
    const maximumColumn = Math.max(1, Math.round(session.surface.clientWidth / session.cellWidth));
    const requestedColumn = Math.round((event.clientX - surfaceRect.left) / (session.cellWidth * (session.gridZoom || 1)));
    if (side === "left") swimlane.leftColumn = Math.max(0, Math.min(swimlane.rightColumn - 1, requestedColumn));
    else swimlane.rightColumn = Math.min(maximumColumn, Math.max(swimlane.leftColumn + 1, requestedColumn));
    applyDiagramBuilderSwimlaneGeometry(session, swimlane, laneNode);
    setDiagramBuilderStatus(session, "Swimlane-Grenze ist auf einer Gridlinie eingerastet.", "success");
  };
  const finish = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    boundary.classList.remove("dragging");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
    laneNode.querySelector(".diagram-builder-swimlane-label-editor")?.focus({ preventScroll: true });
  };
  boundary.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    boundary.classList.add("dragging");
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  });
  return boundary;
}

function createDiagramBuilderSwimlaneNode(session, swimlane) {
  const lane = createElement(
    "section",
    `diagram-builder-swimlane${session.editingSwimlaneId === swimlane.id ? " editing" : ""}${session.selectedSwimlaneId === swimlane.id ? " selected" : ""}`
  );
  lane.dataset.swimlaneId = String(swimlane.id);
  lane.setAttribute("aria-label", swimlane.label ? `Swimlane ${swimlane.label}` : "Unbenannte Swimlane");
  lane.title = "Doppelklick zum Bearbeiten der Swimlane";
  applyDiagramBuilderSwimlaneGeometry(session, swimlane, lane);
  lane.addEventListener("click", () => {
    session.selectedPlacementId = null;
    session.selectedSwimlaneId = swimlane.id;
    session.selectedSystemBoundaryId = null;
    session.selectedSequenceFragmentId = null;
    session.surface.querySelectorAll(".diagram-builder-piece.selected, .diagram-builder-system-boundary.selected").forEach((item) => item.classList.remove("selected"));
    session.surface.querySelectorAll(".diagram-builder-swimlane.selected").forEach((item) => item.classList.remove("selected"));
    lane.classList.add("selected");
  });
  lane.addEventListener("dblclick", (event) => {
    if (session.editingSwimlaneId === swimlane.id) return;
    event.preventDefault();
    event.stopPropagation();
    beginDiagramBuilderSwimlaneEdit(session, swimlane);
  });
  if (session.editingSwimlaneId === swimlane.id) {
    const editor = createElement("input", "diagram-builder-swimlane-label-editor");
    editor.type = "text";
    editor.value = swimlane.label;
    editor.placeholder = "Bezeichnung (optional)";
    editor.setAttribute("aria-label", "Bezeichnung der Swimlane bearbeiten");
    editor.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (document.activeElement?.closest?.(".diagram-builder-swimlane-boundary")) return;
        session.finishSwimlaneEditing?.(true);
      }, 0);
    });
    lane.append(editor);
    lane.append(
      createDiagramBuilderSwimlaneBoundary(session, swimlane, "left", lane),
      createDiagramBuilderSwimlaneBoundary(session, swimlane, "right", lane)
    );
  } else {
    const label = createElement("button", "diagram-builder-swimlane-label", swimlane.label);
    label.type = "button";
    label.title = "Doppelklick zum Bearbeiten";
    label.setAttribute("aria-label", `${swimlane.label || "Unbenannte Swimlane"}; doppelklicken zum Bearbeiten`);
    label.addEventListener("click", () => { session.selectedSwimlaneId = swimlane.id; });
    label.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginDiagramBuilderSwimlaneEdit(session, swimlane);
    });
    lane.append(label);
  }
  return lane;
}

function addDiagramBuilderSwimlane(session, piece, column) {
  const columns = Math.max(1, Math.floor(session.surface.clientWidth / session.cellWidth));
  const leftColumn = Math.min(columns - 1, Math.max(0, column));
  const swimlane = {
    id: ++session.nextSwimlaneId,
    label: "",
    leftColumn,
    rightColumn: Math.min(columns, leftColumn + 1)
  };
  session.swimlanes.push(swimlane);
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = swimlane.id;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = null;
  renderDiagramBuilderWorkspace(session);
  setDiagramBuilderStatus(session, "Swimlane platziert. Doppelklick auf den Klassennamen öffnet den Bearbeitungsmodus.", "success");
  return true;
}

function addDiagramBuilderPlacement(session, piece, row, column) {
  if (piece.kind === "activity-swimlane") return addDiagramBuilderSwimlane(session, piece, column);
  if (piece.kind === "boundary") return addDiagramBuilderSystemBoundary(session, row, column);
  if (piece.kind === "sequence-fragment") return addDiagramBuilderSequenceFragment(session, row, column);
  if (!diagramBuilderCanPlacePiece(session, piece, row, column)) {
    setDiagramBuilderStatus(
      session,
      piece.kind === "sequence-activation" ? "Ein Aktivitätsbalken muss auf einer Lebenslinie liegen." : "Dieses Rasterfeld ist bereits belegt.",
      "error"
    );
    return false;
  }
  const placedPiece = { ...piece };
  if (placedPiece.kind === "pap-decision-table") {
    placedPiece.conditions = diagramBuilderDecisionTableRows(placedPiece, "conditions", "J");
    placedPiece.actions = diagramBuilderDecisionTableRows(placedPiece, "actions", "-");
  }
  if (diagramBuilderIsSequenceParticipant(placedPiece)) {
    placedPiece.lifelineRows = Math.max(1, Number(placedPiece.lifelineRows) || 1);
    placedPiece.lifelineEndX = Boolean(placedPiece.lifelineEndX);
  }
  if (placedPiece.kind === "sequence-activation") placedPiece.activationRows = 1;
  const placement = { id: ++session.nextPlacementId, piece: placedPiece, row, column };
  session.placements.push(placement);
  session.selectedPlacementId = placement.id;
  session.selectedSwimlaneId = null;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = null;
  renderDiagramBuilderWorkspace(session);
  setDiagramBuilderStatus(session, "Element eingerastet. Beim Hover erscheinen die Verbindungsanschlüsse.", "success");
  return true;
}

function findFreeDiagramBuilderCell(session) {
  const columns = Math.max(1, Math.floor(session.surface.clientWidth / session.cellWidth));
  const rows = Math.max(1, Math.floor(session.surface.clientHeight / session.cellHeight));
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!diagramBuilderPlacementAt(session, row, column)) return { row, column };
    }
  }
  return null;
}

function renderDiagramBuilderWorkspace(session) {
  session.pieces = createDiagramBuilderPieces(session.file, session.viewType);
  updateDiagramBuilderGridMetrics(session);
  session.connectorLayer = createSvgElement("svg", { class: "diagram-builder-connectors", "aria-hidden": "true" });
  session.surface.replaceChildren(session.connectorLayer, session.emptyHint);
  session.emptyHint.hidden = session.placements.length > 0
    || session.swimlanes.length > 0
    || session.systemBoundaries.length > 0
    || session.sequenceFragments.length > 0;

  renderDiagramBuilderPalette(session);
  session.systemBoundaries.forEach((boundary) => session.surface.append(createDiagramBuilderSystemBoundaryNode(session, boundary)));
  session.sequenceFragments.forEach((fragment) => session.surface.append(createDiagramBuilderSequenceFragmentNode(session, fragment)));
  session.swimlanes.forEach((swimlane) => session.surface.append(createDiagramBuilderSwimlaneNode(session, swimlane)));
  session.placements
    .filter((placement) => diagramBuilderIsSequenceParticipant(placement.piece))
    .forEach((placement) => session.surface.append(createDiagramBuilderLifelineNode(session, placement)));
  session.placements.forEach((placement) => {
    const cell = createDiagramBuilderPlacedNode(session, placement);
    session.surface.append(cell);
    if (placement.id === session.selectedPlacementId) cell.querySelector(".diagram-builder-piece").classList.add("selected");
  });
  window.requestAnimationFrame(() => drawDiagramBuilderConnections(session));
}

function applyDiagramBuilderLifelineGeometry(session, placement, lifeline) {
  const metrics = diagramBuilderPieceMetrics(placement.piece);
  const length = Math.max(1, Number(placement.piece.lifelineRows) || 1);
  const startY = (placement.row + 0.5) * session.cellHeight + metrics.elementHeight / 2;
  const endY = startY + length * session.cellHeight;
  lifeline.style.left = `${(placement.column + 0.5) * session.cellWidth}px`;
  lifeline.style.top = `${startY}px`;
  lifeline.style.height = `${Math.max(18, endY - startY)}px`;
}

function createDiagramBuilderLifelineNode(session, placement) {
  const lifeline = createElement("div", `diagram-builder-sequence-lifeline${placement.piece.lifelineEndX ? " has-destruction" : ""}`);
  lifeline.dataset.participantId = String(placement.id);
  applyDiagramBuilderLifelineGeometry(session, placement, lifeline);
  if (placement.piece.lifelineEndX) lifeline.append(createElement("span", "diagram-builder-sequence-destruction"));
  return lifeline;
}

function switchDiagramBuilderView(session, nextViewType) {
  if (nextViewType === session.viewType) return;
  session.finishEditing?.(true);
  session.finishConnectionEditing?.(true);
  session.finishSwimlaneEditing?.(true);
  session.finishSystemBoundaryEditing?.(true);
  session.finishSequenceFragmentEditing?.(true);
  clearDiagramBuilderPlacementMode(session);
  clearDiagramBuilderConnectionMode(session);
  session.diagramStates.set(session.viewType, {
    placements: session.placements,
    swimlanes: session.swimlanes,
    systemBoundaries: session.systemBoundaries,
    sequenceFragments: session.sequenceFragments,
    connections: session.connections,
    nextPlacementId: session.nextPlacementId,
    nextSwimlaneId: session.nextSwimlaneId,
    nextSystemBoundaryId: session.nextSystemBoundaryId,
    nextSequenceFragmentId: session.nextSequenceFragmentId,
    nextConnectionId: session.nextConnectionId
  });
  const stored = session.diagramStates.get(nextViewType);
  session.viewType = nextViewType;
  session.placements = stored?.placements || [];
  session.swimlanes = stored?.swimlanes || [];
  session.systemBoundaries = stored?.systemBoundaries || [];
  session.sequenceFragments = stored?.sequenceFragments || [];
  session.connections = stored?.connections || [];
  session.nextPlacementId = stored?.nextPlacementId || 0;
  session.nextSwimlaneId = stored?.nextSwimlaneId || 0;
  session.nextSystemBoundaryId = stored?.nextSystemBoundaryId || 0;
  session.nextSequenceFragmentId = stored?.nextSequenceFragmentId || 0;
  session.nextConnectionId = stored?.nextConnectionId || 0;
  session.selectedPlacementId = null;
  session.selectedSwimlaneId = null;
  session.selectedSystemBoundaryId = null;
  session.selectedSequenceFragmentId = null;
  session.editingConnectionId = null;
  renderDiagramBuilderWorkspace(session);
  session.palette.scrollLeft = 0;
  setDiagramBuilderStatus(session, `${UML_VIEWS[nextViewType]} ausgewählt. Baustein halten und ins Raster ziehen.`, "success");
}

function enableDiagramBuilderPaneZoom(session, viewport, content, zoomProperty, afterZoom = null) {
  const minimumZoom = 0.45;
  const maximumZoom = 2.5;
  viewport.addEventListener("wheel", (event) => {
    if ((!event.ctrlKey && !event.metaKey) || event.deltaY === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const previousZoom = session[zoomProperty] || 1;
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = Math.min(maximumZoom, Math.max(minimumZoom, Number((previousZoom + direction * 0.1).toFixed(2))));
    if (nextZoom === previousZoom) return;
    const viewportRect = viewport.getBoundingClientRect();
    const localX = event.clientX - viewportRect.left;
    const localY = event.clientY - viewportRect.top;
    const contentX = (viewport.scrollLeft + localX) / previousZoom;
    const contentY = (viewport.scrollTop + localY) / previousZoom;
    session[zoomProperty] = nextZoom;
    content.style.zoom = String(nextZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = contentX * nextZoom - localX;
      viewport.scrollTop = contentY * nextZoom - localY;
      afterZoom?.();
    });
  }, { passive: false });
}

function createDiagramBuilderCodePane(file) {
  const pane = createElement("section", "diagram-builder-code-pane");
  pane.append(createElement("div", "diagram-builder-pane-label", `JAVA-CODE · ${file.name}`));
  const viewport = createElement("div", "diagram-builder-code-viewport");
  const codeList = createElement("ol", "diagram-builder-code-list");
  const syntaxState = { inBlockComment: false };
  file.content.replace(/\r/g, "").split("\n").forEach((line, lineIndex) => {
    const lineNode = createElement("li", "diagram-builder-code-line");
    lineNode.dataset.lineIndex = String(lineIndex);
    const code = createElement("code", "diagram-builder-code-text");
    code.innerHTML = highlightJavaLine(line, syntaxState);
    lineNode.append(code);
    codeList.append(lineNode);
  });
  viewport.append(codeList);
  pane.append(viewport);
  return { pane, viewport, codeList, codeLines: [...codeList.children] };
}

function closeDiagramBuilderMode() {
  if (!activeDiagramBuilderSession) return;
  activeDiagramBuilderSession.finishSystemBoundaryEditing?.(true);
  activeDiagramBuilderSession.finishSequenceFragmentEditing?.(true);
  document.removeEventListener("keydown", activeDiagramBuilderSession.handleKeyDown, true);
  activeDiagramBuilderSession.resizeObserver?.disconnect();
  activeDiagramBuilderSession.overlay.remove();
  document.body.classList.remove("diagram-builder-open");
  activeDiagramBuilderSession.returnFocus?.focus({ preventScroll: true });
  activeDiagramBuilderSession = null;
}

function openDiagramBuilderMode(file) {
  const returnFocus = document.activeElement;
  closeZTypeMode();
  closeDiagramBuilderMode();
  cancelActiveRuntimeRun();
  cancelActiveCompileRun();

  const overlay = createElement("section", "diagram-builder-overlay");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Diagramm zeichnen für ${file.name}`);
  overlay.tabIndex = -1;
  const header = createElement("header", "diagram-builder-header");
  const backButton = createElement("button", "diagram-builder-back-button", "← Zurück");
  backButton.type = "button";
  const title = createElement("div", "diagram-builder-title");
  title.append(createElement("small", "", "CODEHEARTBEAT"), createElement("strong", "", "DIAGRAMM ZEICHNEN"), createElement("span", "", file.name));
  const selectorLabel = createElement("label", "diagram-builder-selector");
  selectorLabel.append(createElement("span", "", "Diagrammart"));
  const selector = document.createElement("select");
  ["class", "state", "usecase", "activity", "sequence", "pap"].forEach((viewType) => {
    selector.append(new Option(UML_VIEWS[viewType], viewType, false, viewType === "activity"));
  });
  selectorLabel.append(selector);
  header.append(backButton, title, selectorLabel);

  const main = createElement("div", "diagram-builder-main");
  const left = createElement("section", "diagram-builder-left");
  const paletteWrap = createElement("div", "diagram-builder-palette-wrap");
  const status = createElement("div", "diagram-builder-status", "Baustein halten, ins Raster ziehen und dort loslassen.");
  status.setAttribute("aria-live", "polite");
  paletteWrap.append(status);
  const palette = createElement("div", "diagram-builder-palette");
  paletteWrap.append(palette);
  const canvasViewport = createElement("div", "diagram-builder-canvas-viewport");
  const surface = createElement("div", "diagram-builder-surface");
  surface.setAttribute("aria-label", "Zeichenfläche für das UML-Diagramm");
  const emptyHint = createElement("div", "diagram-builder-empty");
  emptyHint.append(createElement("strong", "", "Baustein aufnehmen"), createElement("span", "", "Halte oben ein Element und ziehe es in dieses Raster."));
  surface.append(emptyHint);
  canvasViewport.append(surface);
  left.append(paletteWrap, canvasViewport);
  const { pane: codePane, viewport: codeViewport, codeList, codeLines } = createDiagramBuilderCodePane(file);
  main.append(codePane, left);
  const toast = createElement("div", "diagram-builder-confirm-toast");
  toast.hidden = true;
  toast.setAttribute("role", "alertdialog");
  toast.setAttribute("aria-modal", "true");
  const toastMessage = createElement("strong", "diagram-builder-confirm-message");
  const toastActions = createElement("div", "diagram-builder-confirm-actions");
  const toastCancelButton = createElement("button", "cancel", "Zurück");
  const toastDeleteButton = createElement("button", "delete", "Löschen");
  toastCancelButton.type = "button";
  toastDeleteButton.type = "button";
  toastActions.append(toastCancelButton, toastDeleteButton);
  toast.append(toastMessage, toastActions);
  overlay.append(header, main, toast);
  document.body.append(overlay);
  document.body.classList.add("diagram-builder-open");

  const session = {
    overlay,
    file,
    selector,
    palette,
    paletteWrap,
    paletteLabel: status,
    canvasViewport,
    surface,
    emptyHint,
    status,
    codeViewport,
    codeList,
    codeLines,
    viewType: "activity",
    diagramStates: new Map(),
    pieces: [],
    placements: [],
    swimlanes: [],
    systemBoundaries: [],
    sequenceFragments: [],
    connections: [],
    nextPlacementId: 0,
    nextSwimlaneId: 0,
    nextSystemBoundaryId: 0,
    nextSequenceFragmentId: 0,
    nextConnectionId: 0,
    cellWidth: DIAGRAM_BUILDER_DEFAULT_CELL_WIDTH,
    cellHeight: DIAGRAM_BUILDER_DEFAULT_CELL_HEIGHT,
    gridZoom: 1,
    codeZoom: 1,
    selectedPlacementId: null,
    selectedSwimlaneId: null,
    selectedSystemBoundaryId: null,
    selectedSequenceFragmentId: null,
    armedPieceIndex: null,
    paletteDragging: false,
    previewCell: null,
    contextPlacementId: null,
    pendingConnection: null,
    draggingPlacementId: null,
    repositionPreviewCell: null,
    pendingDeletionId: null,
    editingPlacementId: null,
    finishEditing: null,
    editingConnectionId: null,
    finishConnectionEditing: null,
    editingSwimlaneId: null,
    finishSwimlaneEditing: null,
    editingSystemBoundaryId: null,
    finishSystemBoundaryEditing: null,
    editingSequenceFragmentId: null,
    finishSequenceFragmentEditing: null,
    toast,
    toastMessage,
    toastCancelButton,
    toastDeleteButton,
    connectorLayer: null,
    resizeObserver: null,
    returnFocus,
    handleKeyDown: null
  };
  activeDiagramBuilderSession = session;
  session.resizeObserver = new ResizeObserver(() => drawDiagramBuilderConnections(session));
  session.resizeObserver.observe(surface);
  enableDiagramBuilderPaneZoom(session, canvasViewport, surface, "gridZoom", () => drawDiagramBuilderConnections(session));
  enableDiagramBuilderPaneZoom(session, codeViewport, codeList, "codeZoom");
  canvasViewport.addEventListener("scroll", () => {
    if (session.editingConnectionId) window.requestAnimationFrame(() => drawDiagramBuilderConnections(session));
  }, { passive: true });

  overlay.addEventListener("pointermove", (event) => {
    if (!Number.isInteger(session.armedPieceIndex) || surface.contains(event.target) || codePane.contains(event.target)) return;
    session.surface.querySelector(".diagram-builder-cursor-piece")?.remove();
    updateDiagramBuilderFloatingCursor(session, event.clientX, event.clientY);
  });
  codePane.addEventListener("pointerenter", () => {
    if (!session.paletteDragging && Number.isInteger(session.armedPieceIndex)) clearDiagramBuilderPlacementMode(session, "Platzierung beim Wechsel zum Code beendet.");
  });

  surface.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = session.draggingPlacementId ? "move" : "copy";
    surface.classList.add("drop-target");
    if (session.draggingPlacementId) updateDiagramBuilderRepositionPreview(session, event.clientX, event.clientY);
  });
  surface.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && surface.contains(event.relatedTarget)) return;
    surface.classList.remove("drop-target");
    if (session.draggingPlacementId) clearDiagramBuilderRepositionPreview(session);
  });
  surface.addEventListener("drop", (event) => {
    event.preventDefault();
    surface.classList.remove("drop-target");
    const payload = event.dataTransfer.getData("text/plain");
    const targetCell = diagramBuilderCellFromPoint(session, event.clientX, event.clientY);
    if (payload.startsWith("piece:")) {
      const piece = session.pieces[Number(payload.slice(6))];
      if (piece) addDiagramBuilderPlacement(session, piece, targetCell.row, targetCell.column);
      return;
    }
    if (!payload.startsWith("placement:")) return;
    const placementId = Number(payload.slice(10));
    const placement = session.placements.find((item) => item.id === placementId);
    if (!placement) return;
    clearDiagramBuilderRepositionPreview(session);
    if (!diagramBuilderCanPlacePiece(session, placement.piece, targetCell.row, targetCell.column, placement.id)) {
      const message = placement.piece.kind === "sequence-activation"
        ? "Ein Aktivitätsbalken muss auf einer Lebenslinie liegen."
        : "Dieses Rasterfeld ist belegt oder die Lebenslinie würde einen Aktivitätsbalken verlieren.";
      setDiagramBuilderStatus(session, message, "error");
      return;
    }
    placement.row = targetCell.row;
    placement.column = targetCell.column;
    session.selectedPlacementId = placement.id;
    session.draggingPlacementId = null;
    renderDiagramBuilderWorkspace(session);
    setDiagramBuilderStatus(session, "Element ist in das neue Rasterfeld eingerastet.", "success");
  });
  surface.addEventListener("pointermove", (event) => updateDiagramBuilderCursorPiece(session, event.clientX, event.clientY));
  surface.addEventListener("pointerleave", (event) => {
    session.previewCell = null;
    session.surface.querySelector(".diagram-builder-cursor-piece")?.remove();
    if (Number.isInteger(session.armedPieceIndex) && !codePane.contains(event.relatedTarget)) {
      updateDiagramBuilderFloatingCursor(session, event.clientX, event.clientY);
    }
  });
  surface.addEventListener("click", (event) => {
    if (!Number.isInteger(session.armedPieceIndex) || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const targetCell = diagramBuilderCellFromPoint(session, event.clientX, event.clientY);
    if (!diagramBuilderCanPlacePiece(session, session.pieces[session.armedPieceIndex], targetCell.row, targetCell.column)) {
      const message = session.pieces[session.armedPieceIndex]?.kind === "sequence-activation"
        ? "Ein Aktivitätsbalken muss auf einer Lebenslinie liegen."
        : "Dieses Rasterfeld ist bereits belegt.";
      setDiagramBuilderStatus(session, message, "error");
      updateDiagramBuilderCursorPiece(session, event.clientX, event.clientY);
      return;
    }
    const piece = session.pieces[session.armedPieceIndex];
    clearDiagramBuilderPlacementMode(session);
    addDiagramBuilderPlacement(session, piece, targetCell.row, targetCell.column);
  }, true);
  surface.addEventListener("click", (event) => {
    if (event.target !== surface) return;
  });
  toastCancelButton.addEventListener("click", () => cancelDiagramBuilderDeletion(session));
  toastDeleteButton.addEventListener("click", () => confirmDiagramBuilderDeletion(session));
  selector.addEventListener("change", () => switchDiagramBuilderView(session, selector.value));
  backButton.addEventListener("click", closeDiagramBuilderMode);
  session.handleKeyDown = (event) => {
    if (!session.toast.hidden) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelDiagramBuilderDeletion(session);
      return;
    }
    if (session.editingPlacementId) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.finishEditing?.(event.key === "Enter");
      return;
    }
    if (session.editingConnectionId) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.finishConnectionEditing?.(event.key === "Enter");
      return;
    }
    if (session.editingSwimlaneId) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.finishSwimlaneEditing?.(event.key === "Enter");
      return;
    }
    if (session.editingSystemBoundaryId) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.finishSystemBoundaryEditing?.(event.key === "Enter");
      return;
    }
    if (session.editingSequenceFragmentId) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.finishSequenceFragmentEditing?.(event.key === "Enter");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (Number.isInteger(session.armedPieceIndex)) {
        clearDiagramBuilderPlacementMode(session, "Platzierung abgebrochen.");
        return;
      }
      if (session.pendingConnection) {
        clearDiagramBuilderConnectionMode(session);
        setDiagramBuilderStatus(session, "Verbindung abgebrochen.");
        return;
      }
      closeDiagramBuilderMode();
      return;
    }
    if (event.key !== "Delete") return;
    if (session.selectedSystemBoundaryId) {
      session.systemBoundaries = session.systemBoundaries.filter((boundary) => boundary.id !== session.selectedSystemBoundaryId);
      session.selectedSystemBoundaryId = null;
      renderDiagramBuilderWorkspace(session);
      return;
    }
    if (session.selectedSequenceFragmentId) {
      session.sequenceFragments = session.sequenceFragments.filter((fragment) => fragment.id !== session.selectedSequenceFragmentId);
      session.selectedSequenceFragmentId = null;
      renderDiagramBuilderWorkspace(session);
      return;
    }
    if (!session.selectedPlacementId) return;
    const placements = session.placements;
    const placementIndex = placements.findIndex((placement) => placement.id === session.selectedPlacementId);
    if (placementIndex < 0) return;
    placements.splice(placementIndex, 1);
    session.connections = session.connections.filter((connection) => connection.sourceId !== session.selectedPlacementId && connection.targetId !== session.selectedPlacementId);
    session.selectedPlacementId = null;
    renderDiagramBuilderWorkspace(session);
  };
  document.addEventListener("keydown", session.handleKeyDown, true);
  renderDiagramBuilderWorkspace(session);
  overlay.focus({ preventScroll: true });
}

function createFilePlaceholderActionButton(fileName, action, icon, label, onClick = null) {
  const button = createElement("button", `file-placeholder-action-button ${action}`);
  button.type = "button";
  button.dataset.placeholderAction = action;
  button.setAttribute("aria-label", `${label} für ${fileName}${onClick ? "" : " – Platzhalter"}`);
  if (onClick) {
    button.title = label;
    button.addEventListener("click", onClick);
  } else {
    button.setAttribute("aria-disabled", "true");
    button.title = `${label} – folgt später`;
  }
  button.append(createElement("span", "file-placeholder-action-icon", icon));
  return button;
}

function enablePaneZoom(fileNode, pane, zoomContent, redrawLanes = false) {
  pane.dataset.zoom = "1";
  pane.addEventListener("wheel", (event) => {
    if (!fileNode.classList.contains("maximized") || (!event.ctrlKey && !event.metaKey) || event.deltaY === 0) return;

    event.preventDefault();
    event.stopPropagation();
    const currentZoom = Number(pane.dataset.zoom || 1);
    const zoomDirection = event.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.min(2, Math.max(0.5, Math.round((currentZoom + zoomDirection) * 10) / 10));
    pane.dataset.zoom = String(nextZoom);
    zoomContent.style.setProperty("--pane-zoom", String(nextZoom));
    if (redrawLanes) window.requestAnimationFrame(drawAllDeclarationLanes);
  }, { passive: false });
}

function createFileNode(file) {
  const fileNode = document.createElement("article");
  const header = document.createElement("header");
  const icon = document.createElement("span");
  const name = document.createElement("strong");
  const headerActions = document.createElement("div");
  const viewLabel = document.createElement("label");
  const viewSelect = document.createElement("select");
  const compileButton = createCompilePlayButton(file);
  const playButton = hasMainMethod(file.content) ? createRuntimePlayButton(file) : null;
  const linkControls = createElement("div", "file-link-controls");
  const sizeControls = createElement("div", "file-size-controls");
  const umlContainer = document.createElement("div");
  const splitContent = document.createElement("div");
  const codePane = document.createElement("section");
  const umlPane = document.createElement("section");
  const codeZoomContent = document.createElement("div");
  const umlZoomContent = document.createElement("div");
  const sourceCode = createSourceCode(file);
  const hasDiagramBuilderPrototype = file.path === "DateienUndDaten/CsvVerarbeiten.java";

  fileNode.className = "architecture-file";
  fileNode.dataset.filePath = file.path;
  fileNode.dataset.umlView = "class";
  fileNode.dataset.sizeMode = "normal";
  fileNode.classList.toggle("tree-selected", selectedFilePath === file.path);
  header.className = "architecture-file-header";
  icon.className = "architecture-file-icon";
  icon.textContent = "J";
  name.textContent = file.name;
  headerActions.className = "file-header-actions";
  viewLabel.className = "view-selector file-view-selector";
  viewLabel.append(createElement("span", "sr-only", `Diagrammart für ${file.name}`));
  viewSelect.className = "file-view-select";
  viewSelect.setAttribute("aria-label", `Diagrammart für ${file.name}`);
  Object.entries(UML_VIEWS).forEach(([value, label]) => viewSelect.append(new Option(label, value)));
  umlContainer.className = "file-uml-view";
  viewSelect.addEventListener("change", () => {
    fileNode.dataset.umlView = viewSelect.value;
    renderUmlView(umlContainer, file, viewSelect.value);
    if (!isApplyingGlobalView) synchronizeGlobalViewSelect();
    window.requestAnimationFrame(drawAllDeclarationLanes);
  });
  linkControls.setAttribute("aria-label", `Weiterführende Übungen für ${file.name}`);
  linkControls.append(
    createFilePlaceholderActionButton(
      file.name,
      "coding-task",
      "</>",
      "Diagramm zeichnen",
      hasDiagramBuilderPrototype ? () => openDiagramBuilderMode(file) : null
    ),
    createFilePlaceholderActionButton(file.name, "ztype", "⌨", "ZType-Seite öffnen", () => openZTypeMode(file))
  );
  sizeControls.setAttribute("aria-label", `Darstellungsgröße für ${file.name}`);
  sizeControls.append(
    createFileSizeButton(fileNode, file.name, "maximized", "⛶", "maximieren"),
    createFileSizeButton(fileNode, file.name, "normal", "▣", "minimieren"),
    createFileSizeButton(fileNode, file.name, "micro", "━", "micromieren")
  );
  splitContent.className = "file-content-split";
  codePane.className = "file-pane file-code-pane";
  codePane.setAttribute("aria-label", `Code von ${file.name}`);
  umlPane.className = "file-pane file-uml-pane";
  umlPane.setAttribute("aria-label", `UML von ${file.name}`);
  codeZoomContent.className = "pane-zoom-content";
  umlZoomContent.className = "pane-zoom-content";
  enablePaneZoom(fileNode, codePane, codeZoomContent, true);
  enablePaneZoom(fileNode, umlPane, umlZoomContent);

  viewLabel.append(viewSelect);
  headerActions.append(compileButton);
  if (playButton) headerActions.append(playButton);
  headerActions.append(viewLabel, linkControls, sizeControls);
  header.append(icon, name, headerActions);
  fileNode.append(header);
  renderUmlView(umlContainer, file, "class");
  codeZoomContent.append(sourceCode);
  umlZoomContent.append(umlContainer);
  codePane.append(codeZoomContent);
  umlPane.append(umlZoomContent);
  splitContent.append(codePane, umlPane);
  fileNode.append(splitContent);
  fileNode.addEventListener("click", (event) => {
    if (event.target.closest("button, select, option, label")) return;
    selectFileInBothTrees(file.path, { scrollTree: true });
  });
  return fileNode;
}

function createFolderNode(folder, isRoot = false) {
  const folderNode = document.createElement("section");
  const folderTab = document.createElement("button");
  const folderChevron = document.createElement("span");
  const folderIcon = document.createElement("span");
  const folderName = document.createElement("strong");
  const folderCount = document.createElement("span");
  const folderBody = document.createElement("div");
  const directories = (folder.children || []).filter((child) => child.type === "directory");
  const files = (folder.children || []).filter((child) => child.type === "file");
  const collapsed = folderCollapsedState.get(folder.path) ?? true;

  folderNode.className = `architecture-folder${isRoot ? " root-folder" : ""}`;
  folderNode.classList.toggle("collapsed", collapsed);
  folderNode.dataset.folderName = folder.name;
  folderNode.dataset.folderPath = folder.path;
  folderTab.className = "architecture-folder-tab";
  folderTab.type = "button";
  folderTab.setAttribute("aria-expanded", String(!collapsed));
  folderTab.setAttribute("aria-label", `${folder.name} ${collapsed ? "aufklappen" : "zuklappen"}`);
  folderChevron.className = "folder-chevron";
  folderChevron.textContent = "▼";
  folderIcon.className = "architecture-folder-icon";
  folderIcon.textContent = "▰";
  folderName.textContent = folder.name;
  folderCount.className = "architecture-folder-count";
  folderCount.textContent = [
    directories.length ? `${directories.length} Ordner` : "",
    files.length ? `${files.length} ${files.length === 1 ? "Datei" : "Dateien"}` : ""
  ].filter(Boolean).join(" · ") || "Leer";
  folderBody.className = "architecture-folder-body";
  folderBody.hidden = collapsed;

  folderTab.append(folderChevron, folderIcon, folderName, folderCount);
  folderNode.append(folderTab, folderBody);

  if (directories.length) {
    const nestedFolders = document.createElement("div");
    nestedFolders.className = "nested-folders";
    directories.forEach((directory) => nestedFolders.append(createFolderNode(directory)));
    folderBody.append(nestedFolders);
  }

  if (files.length) {
    const fileGrid = document.createElement("div");
    fileGrid.className = "architecture-file-grid";
    files.forEach((file) => fileGrid.append(createFileNode(file)));
    folderBody.append(fileGrid);
  }

  folderTab.addEventListener("click", () => {
    setFolderCollapsed(folder.path, !folderNode.classList.contains("collapsed"));
  });

  return folderNode;
}

function renderApplication() {
  const root = window.CODE_HEARTBEAT_TREE;

  if (!root) {
    diagramContainer.innerHTML = '<p class="tree-error">Das Architektur-Diagramm konnte nicht aufgebaut werden.</p>';
    return;
  }

  diagramContainer.replaceChildren(createFolderNode(root, true));
  renderFolderTree(root);

  const fileCount = countNodes(root, "file");
  const folderCount = countNodes(root, "directory");
  const classCount = countClasses(root);
  const summary = `${folderCount} Ordner · ${fileCount} Dateien · ${classCount} Klassen`;
  diagramSummary.textContent = summary;
  structureSummary.textContent = summary;
  window.requestAnimationFrame(drawAllDeclarationLanes);
}

restoreFolderTreeWidth();
renderApplication();

folderTreeResizer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  folderTreeResizer.setPointerCapture(event.pointerId);
  folderTreeResizer.classList.add("dragging");
  document.body.classList.add("folder-tree-resizing");
});

folderTreeResizer.addEventListener("pointermove", (event) => {
  if (!folderTreeResizer.hasPointerCapture(event.pointerId)) return;
  const workspaceLeft = document.querySelector(".workspace").getBoundingClientRect().left;
  setFolderTreeWidth(event.clientX - workspaceLeft);
});

function finishFolderTreeResize(event) {
  if (folderTreeResizer.hasPointerCapture(event.pointerId)) {
    folderTreeResizer.releasePointerCapture(event.pointerId);
  }
  folderTreeResizer.classList.remove("dragging");
  document.body.classList.remove("folder-tree-resizing");
}

folderTreeResizer.addEventListener("pointerup", finishFolderTreeResize);
folderTreeResizer.addEventListener("pointercancel", finishFolderTreeResize);
folderTreeResizer.addEventListener("dblclick", () => setFolderTreeWidth(FOLDER_TREE_DEFAULT_WIDTH));
folderTreeResizer.addEventListener("keydown", (event) => {
  const currentWidth = Number.parseInt(folderTreeResizer.getAttribute("aria-valuenow"), 10) || FOLDER_TREE_DEFAULT_WIDTH;
  const step = event.shiftKey ? 40 : 10;
  let nextWidth = null;
  if (event.key === "ArrowLeft") nextWidth = currentWidth - step;
  if (event.key === "ArrowRight") nextWidth = currentWidth + step;
  if (event.key === "Home") nextWidth = FOLDER_TREE_MIN_WIDTH;
  if (event.key === "End") nextWidth = getFolderTreeMaxWidth();
  if (nextWidth === null) return;
  event.preventDefault();
  setFolderTreeWidth(nextWidth);
});

window.addEventListener("resize", () => {
  const currentWidth = Number.parseInt(folderTreeResizer.getAttribute("aria-valuenow"), 10) || FOLDER_TREE_DEFAULT_WIDTH;
  setFolderTreeWidth(currentWidth, false);
});

folderTreeToggle.addEventListener("click", () => {
  const collapsed = document.body.classList.toggle("folder-tree-hidden");
  folderTreePanel.hidden = collapsed;
  folderTreeToggle.setAttribute("aria-expanded", String(!collapsed));
  folderTreeToggle.setAttribute("aria-label", `FolderTree ${collapsed ? "aufklappen" : "zuklappen"}`);
  window.requestAnimationFrame(drawAllDeclarationLanes);
});

terminalClose.addEventListener("click", () => {
  cancelActiveRuntimeRun();
  cancelActiveCompileRun();
  runtimeTerminal.hidden = true;
  document.body.classList.remove("terminal-open");
  window.requestAnimationFrame(drawAllDeclarationLanes);
});

globalViewSelect.addEventListener("change", () => {
  const targetView = globalViewSelect.value;
  if (!UML_VIEWS[targetView]) return;
  isApplyingGlobalView = true;
  document.querySelectorAll(".architecture-file").forEach((fileNode) => {
    const viewSelect = fileNode.querySelector(".file-view-select");
    if (viewSelect.value === targetView) return;
    viewSelect.value = targetView;
    viewSelect.dispatchEvent(new Event("change"));
  });
  isApplyingGlobalView = false;
  synchronizeGlobalViewSelect();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") restoreMaximizedFile();
});

const diagramResizeObserver = new ResizeObserver(() => {
  window.requestAnimationFrame(drawAllDeclarationLanes);
});
diagramResizeObserver.observe(diagramContainer);
