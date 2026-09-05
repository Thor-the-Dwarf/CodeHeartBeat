const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentsDirectory = path.join(root, "architecture", "components");
const requiredFields = ["id", "type", "path", "what", "why", "depends_on"];
const allowedFields = new Set([...requiredFields, "symbol"]);
const allowedTypes = new Set(["component", "data-source", "deployment", "generated-data", "generator", "stylesheet", "subsystem"]);

function parseScalar(rawValue, fileName, lineNumber) {
  const value = rawValue.trim();
  if (value === "[]") return [];
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  if (!value) return null;
  if (/[:#{}[\],&*!|>@`]/.test(value)) {
    throw new Error(`${fileName}:${lineNumber}: Textwerte mit Sonderzeichen müssen in Anführungszeichen stehen.`);
  }
  return value;
}

function parseComponent(filePath) {
  const fileName = path.relative(root, filePath);
  const result = {};
  let activeList = null;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch) {
      if (!activeList) throw new Error(`${fileName}:${lineNumber}: Listeneintrag ohne zugehöriges Feld.`);
      result[activeList].push(parseScalar(listMatch[1], fileName, lineNumber));
      return;
    }

    const fieldMatch = line.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (!fieldMatch) throw new Error(`${fileName}:${lineNumber}: Nicht unterstützte YAML-Zeile.`);
    const [, key, rawValue = ""] = fieldMatch;
    if (!allowedFields.has(key)) throw new Error(`${fileName}:${lineNumber}: Unbekanntes Feld „${key}“.`);
    if (Object.hasOwn(result, key)) throw new Error(`${fileName}:${lineNumber}: Feld „${key}“ ist doppelt vorhanden.`);

    const value = parseScalar(rawValue, fileName, lineNumber);
    if (key === "depends_on") {
      result[key] = Array.isArray(value) ? value : [];
      activeList = value === null ? key : null;
      if (typeof value === "string") throw new Error(`${fileName}:${lineNumber}: „depends_on“ muss eine YAML-Liste sein.`);
    } else {
      if (value === null || Array.isArray(value)) throw new Error(`${fileName}:${lineNumber}: Feld „${key}“ benötigt einen Textwert.`);
      result[key] = value;
      activeList = null;
    }
  });

  requiredFields.forEach((field) => {
    if (!Object.hasOwn(result, field)) throw new Error(`${fileName}: Pflichtfeld „${field}“ fehlt.`);
  });
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(result.id)) throw new Error(`${fileName}: Ungültige ID „${result.id}“.`);
  if (!allowedTypes.has(result.type)) throw new Error(`${fileName}: Unbekannter Typ „${result.type}“.`);
  if (result.what.length < 20 || result.why.length < 20) throw new Error(`${fileName}: „what“ und „why“ müssen aussagekräftig sein.`);

  const resolvedPath = path.resolve(root, result.path);
  if (!resolvedPath.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolvedPath)) {
    throw new Error(`${fileName}: Projektpfad „${result.path}“ wurde nicht gefunden.`);
  }
  if (result.symbol) {
    if (!fs.statSync(resolvedPath).isFile()) throw new Error(`${fileName}: Ein Symbol kann nur auf eine Datei verweisen.`);
    if (!fs.readFileSync(resolvedPath, "utf8").includes(result.symbol)) {
      throw new Error(`${fileName}: Symbol „${result.symbol}“ wurde in „${result.path}“ nicht gefunden.`);
    }
  }

  return { ...result, fileName };
}

const componentFiles = fs.readdirSync(componentsDirectory)
  .filter((fileName) => fileName.endsWith(".yml"))
  .sort()
  .map((fileName) => path.join(componentsDirectory, fileName));

if (componentFiles.length === 0) throw new Error("Der Architekturkatalog enthält keine Komponenten.");

const components = componentFiles.map(parseComponent);
const ids = new Map();
components.forEach((component) => {
  if (ids.has(component.id)) throw new Error(`${component.fileName}: ID „${component.id}“ wird bereits in ${ids.get(component.id)} verwendet.`);
  ids.set(component.id, component.fileName);
});
components.forEach((component) => {
  component.depends_on.forEach((dependencyId) => {
    if (!ids.has(dependencyId)) throw new Error(`${component.fileName}: Unbekannte Abhängigkeit „${dependencyId}“.`);
  });
});

console.log(`Architekturkatalog geprüft: ${components.length} eindeutige Komponenten.`);
