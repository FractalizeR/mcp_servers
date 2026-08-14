/**
 * HTML-бандл MCP Apps виджета пилота №1 (`ui://tracker/issue-description-editor`).
 *
 * Полностью самодостаточен: инлайн CSS/JS, ни одного внешнего origin
 * (шрифты/скрипты/CDN) — требование плана «без крайней необходимости внешние
 * origin не разрешаем» и CSP-декларация ресурса (`_meta.ui.csp`, см.
 * `issue-description-editor-resource-provider.ts`) объявляют пустые списки
 * доменов ровно потому, что здесь их не запрашивают.
 *
 * Протокол — JSON-RPC 2.0 поверх `postMessage`, методы с префиксом `ui/`
 * (SEP-1865, https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp):
 * `ui/initialize` при старте, `ui/notifications/tool-result` — данные вызова
 * `analyze_issue_description`, которые хост проталкивает в iframe, обычный
 * `tools/call` для применения правки через `update_issue`.
 *
 * Санитайз — оборонительный, в два слоя: (1) сервер уже отдаёт
 * `currentDescription`/`suggestedDescription`/`notes` пропущенными через
 * `sanitizeTrackerText()` (HTML-теги вырезаны на границе данных), (2) виджет
 * ДОПОЛНИТЕЛЬНО никогда не использует `innerHTML` для этих значений — только
 * `.textContent`/`.value`. Слой (2) не полагается на слой (1): даже если бы
 * пришёл неочищенный текст, `textContent`/`.value` не исполнят разметку.
 */
export const ISSUE_DESCRIPTION_EDITOR_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
<title>Описание задачи</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 12px; font-size: 13px; }
  h1 { font-size: 14px; margin: 0 0 8px; }
  .cols { display: flex; gap: 12px; flex-wrap: wrap; }
  .col { flex: 1 1 240px; min-width: 0; }
  label { display: block; font-weight: 600; margin-bottom: 4px; }
  textarea { width: 100%; min-height: 220px; box-sizing: border-box; font: inherit; padding: 6px; }
  textarea[readonly] { background: rgba(127,127,127,0.08); }
  ul.notes { margin: 8px 0; padding-left: 18px; }
  .actions { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
  button { padding: 6px 14px; cursor: pointer; }
  .status { font-size: 12px; opacity: 0.85; }
  .status.error { color: #c0392b; opacity: 1; }
  .status.ok { color: #1e7e34; opacity: 1; }
</style>
</head>
<body>
  <h1>Описание задачи — анализ и правка</h1>
  <div id="issue" class="status">Ожидание данных задачи…</div>
  <div class="cols">
    <div class="col">
      <label for="current">Текущее описание</label>
      <textarea id="current" readonly></textarea>
    </div>
    <div class="col">
      <label for="suggested">Предложенная правка (редактируется)</label>
      <textarea id="suggested"></textarea>
    </div>
  </div>
  <ul id="notes" class="notes"></ul>
  <div class="actions">
    <button id="apply" disabled>Применить (update_issue)</button>
    <span id="status" class="status"></span>
  </div>
<script>
(function () {
  "use strict";

  var state = { issueKey: null, version: undefined };
  var nextId = 1;
  var pending = {};

  function post(msg) {
    try { window.parent.postMessage(msg, "*"); } catch (e) { /* нет хоста — просмотр вне iframe */ }
  }

  function request(method, params) {
    var id = nextId++;
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
    });
  }

  function notify(method, params) {
    post({ jsonrpc: "2.0", method: method, params: params || {} });
  }

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || typeof msg !== "object") { return; }

    if (typeof msg.id !== "undefined" && (msg.result || msg.error) && pending[msg.id]) {
      var p = pending[msg.id];
      delete pending[msg.id];
      if (msg.error) { p.reject(msg.error); } else { p.resolve(msg.result); }
      return;
    }

    if (msg.method === "ui/notifications/tool-result") {
      var sc = msg.params && msg.params.structuredContent;
      var data = sc && sc.data;
      if (data) { render(data); }
      return;
    }
    if (msg.method === "ui/notifications/tool-input") {
      var args = msg.params && msg.params.arguments;
      if (args && args.issueKey) { state.issueKey = args.issueKey; }
    }
  });

  function setValue(el, text) {
    // Никогда innerHTML — content из Трекера недоверенный (см. заголовок файла).
    el.value = text === null || text === undefined ? "" : String(text);
  }

  function render(data) {
    state.issueKey = data.issueKey || state.issueKey;
    state.version = data.version;
    document.getElementById("issue").textContent = "Задача: " + (state.issueKey || "?");
    setValue(document.getElementById("current"), data.currentDescription);
    setValue(document.getElementById("suggested"), data.suggestedDescription);
    var notes = document.getElementById("notes");
    notes.textContent = "";
    (data.notes || []).forEach(function (note) {
      var li = document.createElement("li");
      li.textContent = String(note);
      notes.appendChild(li);
    });
    document.getElementById("apply").disabled = !state.issueKey;
    notify("ui/notifications/size-changed", {
      width: document.body.scrollWidth,
      height: document.body.scrollHeight
    });
  }

  document.getElementById("apply").addEventListener("click", function () {
    var statusEl = document.getElementById("status");
    var applyBtn = document.getElementById("apply");
    if (!state.issueKey) { return; }
    var description = document.getElementById("suggested").value;
    applyBtn.disabled = true;
    statusEl.className = "status";
    statusEl.textContent = "Сохраняем…";
    var args = { issueKey: state.issueKey, description: description, fields: ["key"] };
    if (typeof state.version === "number") { args.version = state.version; }
    request("tools/call", { name: "update_issue", arguments: args })
      .then(function () {
        statusEl.className = "status ok";
        statusEl.textContent = "Сохранено";
      })
      .catch(function (err) {
        statusEl.className = "status error";
        statusEl.textContent = "Ошибка: " + (err && err.message ? err.message : "не удалось сохранить");
      })
      .finally(function () { applyBtn.disabled = false; });
  });

  request("ui/initialize", {
    appCapabilities: { tools: { listChanged: false }, availableDisplayModes: ["inline"] }
  }).then(function () {
    notify("ui/notifications/initialized", {});
  }).catch(function () { /* хост мог не ответить синхронно — ждём tool-result ниже */ });
})();
</script>
</body>
</html>
`;
