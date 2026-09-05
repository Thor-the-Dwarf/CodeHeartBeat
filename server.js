const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 4173;
const ROOT_DIRECTORY = __dirname;
const PUBLIC_DIRECTORY = path.join(ROOT_DIRECTORY, "public");
const TREE_DIRECTORY = path.join(ROOT_DIRECTORY, "FolderTree");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(response, statusCode, content, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(content);
}

function sendJson(response, statusCode, data) {
  send(response, statusCode, JSON.stringify(data), CONTENT_TYPES[".json"]);
}

function resolveInside(baseDirectory, relativePath) {
  const resolvedPath = path.resolve(baseDirectory, relativePath);
  const relative = path.relative(baseDirectory, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Pfad liegt außerhalb des erlaubten Ordners.");
  }

  return resolvedPath;
}

async function readDirectoryTree(directory, relativePath = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "de");
  });

  return Promise.all(entries.map(async (entry) => {
    const entryRelativePath = path.join(relativePath, entry.name);
    const node = {
      name: entry.name,
      path: entryRelativePath.split(path.sep).join("/"),
      type: entry.isDirectory() ? "directory" : "file"
    };

    if (entry.isDirectory()) {
      node.children = await readDirectoryTree(
        path.join(directory, entry.name),
        entryRelativePath
      );
    }

    return node;
  }));
}

async function serveApi(requestUrl, response) {
  if (requestUrl.pathname === "/api/tree") {
    const children = await readDirectoryTree(TREE_DIRECTORY);
    sendJson(response, 200, {
      name: "FolderTree",
      path: "",
      type: "directory",
      children
    });
    return true;
  }

  if (requestUrl.pathname === "/api/file") {
    const relativePath = requestUrl.searchParams.get("path") || "";
    const filePath = resolveInside(TREE_DIRECTORY, relativePath);
    const fileStat = await fs.stat(filePath);

    if (!fileStat.isFile()) {
      sendJson(response, 400, { error: "Der gewählte Pfad ist keine Datei." });
      return true;
    }

    const content = await fs.readFile(filePath, "utf8");
    sendJson(response, 200, { path: relativePath, content });
    return true;
  }

  return false;
}

async function serveStatic(requestUrl, response) {
  const requestedPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const filePath = resolveInside(PUBLIC_DIRECTORY, requestedPath);
  const content = await fs.readFile(filePath);
  const contentType = CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream";
  send(response, 200, content, contentType);
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || HOST}`);
    const handledByApi = await serveApi(requestUrl, response);

    if (!handledByApi) {
      await serveStatic(requestUrl, response);
    }
  } catch (error) {
    const statusCode = error.code === "ENOENT" ? 404 : 500;
    sendJson(response, statusCode, {
      error: statusCode === 404 ? "Nicht gefunden." : error.message
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`CodeHeartBeat läuft auf http://${HOST}:${PORT}`);
});
