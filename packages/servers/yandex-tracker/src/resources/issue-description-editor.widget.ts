/**
 * HTML-бандл MCP Apps виджета пилота №1 (`ui://tracker/issue-description-editor`).
 *
 * Полностью самодостаточен: инлайн CSS/JS, ни одного внешнего origin
 * (шрифты/скрипты/CDN) — CSP-декларация ресурса объявляет пустые списки
 * доменов ровно потому, что здесь их не запрашивают
 * (`issue-description-editor-resource-provider.ts`). По той же причине виджет
 * НЕ инжектит `hostContext.styles.css.fonts`, хотя SEP-1865 это разрешает:
 * шрифты хоста живут на внешних origin, которые наш CSP не разрешает, и
 * инжект дал бы заблокированные запросы вместо шрифтов.
 *
 * Протокол — JSON-RPC 2.0 поверх `postMessage` (SEP-1865,
 * https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx):
 * `ui/initialize` → `ui/notifications/initialized` при старте, дальше хост
 * присылает `ui/notifications/tool-input` и `ui/notifications/tool-result`,
 * а применение правки идёт обычным `tools/call` через хост-прокси.
 *
 * Имя инструмента правки НЕ хардкодится в разметке: оно приходит параметром
 * {@link buildIssueDescriptionEditorHtml} из метаданных самого инструмента.
 * Хардкод здесь уже давал молчаливый отказ — на wire имя идёт с префиксом
 * сервера (`fr_yandex_tracker_update_issue`), а в бандле лежало короткое.
 *
 * Данные задачи недоверенные (description пишут пользователи Трекера) и
 * приходят в виджет БЕЗ серверной чистки — намеренно, см. заголовок
 * `analyze-issue-description.tool.ts`. Единственная и достаточная защита
 * рендера: значения ставятся только через `textContent`/`.value`, `innerHTML`
 * в этом файле не используется нигде.
 */

/**
 * Имена инструментов сервера, которые виджет вызывает через хост-прокси.
 * Имя отсутствует, когда инструмент отключён политикой доступа сервера — тогда
 * виджет показывает данные, но не предлагает применить правку.
 */
export interface IssueDescriptionEditorToolNames {
  readonly updateIssue?: string;
}

/**
 * Дефолты для всех переменных темы, которые виджет использует: хост вправе
 * прислать любое подмножество `styles.variables` или не прислать ничего
 * (SEP-1865, «Views should set default fallback values»).
 */
const WIDGET_STYLE = `
  :root {
    color-scheme: light dark;
    --color-background-primary: light-dark(#ffffff, #1e1e1e);
    --color-background-secondary: light-dark(#f4f4f5, #2a2a2a);
    --color-background-disabled: light-dark(#e5e5e5, #333333);
    --color-text-primary: light-dark(#171717, #ededed);
    --color-text-secondary: light-dark(#525252, #a3a3a3);
    --color-text-danger: light-dark(#b3261e, #f2b8b5);
    --color-text-success: light-dark(#1e7e34, #7ee2a8);
    --color-border-primary: light-dark(#d4d4d8, #3f3f46);
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-text-sm-size: 12px;
    --font-text-md-size: 13px;
    --font-heading-sm-size: 14px;
    --border-radius-sm: 6px;
    --border-width-regular: 1px;
  }
  body {
    margin: 0; padding: 12px;
    background: var(--color-background-primary);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-text-md-size);
  }
  h1 { font-size: var(--font-heading-sm-size); margin: 0 0 8px; }
  .cols { display: flex; gap: 12px; flex-wrap: wrap; }
  .col { flex: 1 1 240px; min-width: 0; }
  label { display: block; font-weight: 600; margin-bottom: 4px; }
  textarea {
    width: 100%; min-height: 220px; box-sizing: border-box;
    font: inherit; padding: 6px;
    color: var(--color-text-primary);
    background: var(--color-background-primary);
    border: var(--border-width-regular) solid var(--color-border-primary);
    border-radius: var(--border-radius-sm);
  }
  textarea[readonly] { background: var(--color-background-secondary); }
  ul.notes { margin: 8px 0; padding-left: 18px; }
  .actions { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
  button {
    padding: 6px 14px; cursor: pointer; font: inherit;
    color: var(--color-text-primary);
    background: var(--color-background-secondary);
    border: var(--border-width-regular) solid var(--color-border-primary);
    border-radius: var(--border-radius-sm);
  }
  button:disabled { cursor: default; background: var(--color-background-disabled); }
  .status { font-size: var(--font-text-sm-size); color: var(--color-text-secondary); }
  .status.error { color: var(--color-text-danger); }
  .status.ok { color: var(--color-text-success); }
`;

const WIDGET_MARKUP = `
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
    <button id="apply" disabled>Применить</button>
    <span id="status" class="status"></span>
  </div>
`;

/**
 * Хост не обязан отвечать на `ui/initialize` мгновенно, но и молчать вечно не
 * должен. По спеке хост НЕ шлёт виджету ничего до `ui/notifications/initialized`
 * — значит, «подожду данных вместо хендшейка» означает вечное ожидание.
 * Поэтому по истечении таймаута виджет всё равно завершает хендшейк.
 */
const INITIALIZE_TIMEOUT_MS = 3000;

/**
 * Потолок ожидания ответа на любой запрос к хосту (в том числе `tools/call`
 * правки). Больше похоже на «хост потерял сообщение», чем на долгий запрос:
 * `update_issue` — один PATCH.
 */
const REQUEST_TIMEOUT_MS = 30000;

const WIDGET_SCRIPT = `
(function () {
  "use strict";

  var CONFIG = JSON.parse(document.getElementById("mcp-app-config").textContent);
  var state = {
    issueId: null,
    version: undefined,
    host: null,
    handshakeAnswered: false,
    rendered: false,
    suggestedShown: ""
  };
  var nextId = 1;
  // Object.create(null): ключ "constructor"/"toString" в id ответа иначе
  // проходит проверку pending[id] и роняет обработчик сообщений.
  var pending = Object.create(null);
  var lastSize = "";
  // Хост не принимает сообщения до ui/notifications/initialized, поэтому всё,
  // что просится наружу раньше (например первый отчёт ResizeObserver), копится
  // здесь и уходит одним отчётом сразу после хендшейка.
  var handshakeComplete = false;

  function el(id) { return document.getElementById(id); }

  function post(msg) {
    try { window.parent.postMessage(msg, "*"); } catch (e) { /* виджет открыт вне iframe */ }
  }

  function request(method, params, timeoutMs) {
    var id = nextId++;
    return new Promise(function (resolve, reject) {
      // Без таймаута молчание хоста означает вечно висящий промис — а вместе с
      // ним заблокированную кнопку и «Сохраняем…» навсегда.
      var timer = setTimeout(function () {
        if (!pending[id]) { return; }
        delete pending[id];
        reject({ message: "хост не ответил" });
      }, timeoutMs || CONFIG.requestTimeoutMs);
      pending[id] = {
        resolve: function (value) { clearTimeout(timer); resolve(value); },
        reject: function (error) { clearTimeout(timer); reject(error); }
      };
      post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
    });
  }

  function respond(id, result) {
    post({ jsonrpc: "2.0", id: id, result: result });
  }

  function respondError(id, code, message) {
    post({ jsonrpc: "2.0", id: id, error: { code: code, message: message } });
  }

  function notify(method, params) {
    post({ jsonrpc: "2.0", method: method, params: params || {} });
  }

  function setStatus(text, kind) {
    var node = el("status");
    node.className = kind ? "status " + kind : "status";
    node.textContent = text;
  }

  function reportSize() {
    if (!handshakeComplete) { return; }
    var width = document.body.scrollWidth;
    var height = document.body.scrollHeight;
    var key = width + "x" + height;
    if (key === lastSize) { return; }
    lastSize = key;
    notify("ui/notifications/size-changed", { width: width, height: height });
  }

  function applyHostContext(context) {
    if (!context) { return; }
    if (context.theme === "light" || context.theme === "dark") {
      document.documentElement.style.setProperty("color-scheme", context.theme);
    }
    var variables = context.styles && context.styles.variables;
    if (variables) {
      Object.keys(variables).forEach(function (key) {
        var value = variables[key];
        // Пропускаем только кастомные свойства: имя без "--" — это обычное
        // свойство CSS, и хост через него правил бы вёрстку виджета, а не тему.
        if (key.indexOf("--") === 0 && typeof value === "string") {
          document.documentElement.style.setProperty(key, value);
        }
      });
    }
    // styles.css.fonts сознательно игнорируем — см. заголовок файла (CSP).
  }

  function canCallServerTools() {
    // Хост не ответил на хендшейк — капабилити неизвестны, даём попробовать:
    // отказ придёт понятной ошибкой JSON-RPC, а не мёртвой кнопкой.
    if (!state.handshakeAnswered) { return true; }
    return Boolean(state.host && state.host.serverTools);
  }

  function refreshApplyButton() {
    var button = el("apply");
    // Данные обязательны: с issueId из tool-input, но без результата анализа
    // клик отправил бы в задачу пустое описание — и стёр бы его безвозвратно.
    if (!state.issueId || !state.rendered) { button.disabled = true; return; }
    if (!CONFIG.updateIssueTool) {
      button.disabled = true;
      setStatus("Правка отключена настройками сервера — инструмент обновления задачи недоступен.");
      return;
    }
    if (!canCallServerTools()) {
      button.disabled = true;
      setStatus("Хост не умеет вызывать инструменты сервера из виджета — примените правку в диалоге.");
      return;
    }
    button.disabled = false;
  }

  function render(data) {
    var sameIssue = state.rendered && data.issueId === state.issueId;
    // Повторный tool-result по той же задаче не должен ни откатывать версию
    // (после сохранения она уже новее), ни стирать то, что человек напечатал.
    var keepEdits = sameIssue && el("suggested").value !== state.suggestedShown;
    state.rendered = true;
    state.issueId = data.issueId || state.issueId;
    if (!sameIssue || typeof state.version !== "number") { state.version = data.version; }
    el("issue").textContent = "Задача: " + (state.issueId || "?");
    el("current").value = data.currentDescription == null ? "" : String(data.currentDescription);
    if (!keepEdits) {
      el("suggested").value = data.suggestedDescription == null ? "" : String(data.suggestedDescription);
    }
    state.suggestedShown = el("suggested").value;
    var notes = el("notes");
    notes.textContent = "";
    (data.notes || []).forEach(function (note) {
      var item = document.createElement("li");
      item.textContent = String(note);
      notes.appendChild(item);
    });
    refreshApplyButton();
    reportSize();
  }

  /**
   * Хост шлёт tool-result и на вызов, породивший виджет, и на вызовы, которые
   * виджет делает сам (SEP-1865, Interactive phase). Отличить их можно только
   * по форме данных: рендерить результат собственного update_issue значило бы
   * затереть форму пустыми полями сразу после сохранения.
   */
  function onToolResult(result) {
    if (!result) { return; }
    if (result.isError) {
      if (!state.rendered) {
        el("issue").textContent = "Инструмент вернул ошибку — данных для правки нет.";
      }
      setStatus(state.rendered ? "Последний вызов завершился ошибкой" : "Анализ не выполнен", "error");
      refreshApplyButton();
      return;
    }
    var data = result.structuredContent && result.structuredContent.data;
    if (!data) {
      if (!state.rendered) {
        el("issue").textContent = "Ответ инструмента без structuredContent — нечего показать.";
      }
      return;
    }
    if (typeof data.currentDescription === "string") { render(data); return; }
    absorbVersion(data);
  }

  /**
   * Текст ошибки инструмента как есть: «инструмент вернул ошибку» скрывало бы
   * конфликт версий, а его чинит сам пользователь — перезапуском анализа.
   */
  function toolErrorText(result) {
    var block = result.content && result.content[0];
    var text = block && typeof block.text === "string" ? block.text : "";
    return text ? text.slice(0, 300) : "инструмент вернул ошибку";
  }

  /** Свежая версия задачи после правки — иначе повторное сохранение конфликтует. */
  function absorbVersion(data) {
    var version = data && data.issue && data.issue.version;
    if (typeof version === "number") { state.version = version; }
  }

  function handleRequest(msg) {
    if (msg.method === "ui/resource-teardown") {
      // Хост ждёт ответа перед сносом iframe — молчание стоит ему таймаута.
      respond(msg.id, {});
      return;
    }
    if (msg.method === "ping") { respond(msg.id, {}); return; }
    // JSON-RPC 2.0 не допускает запрос без ответа: на всё остальное (в том
    // числе tools/call к незаявленным app-инструментам) отвечаем отказом.
    respondError(msg.id, -32601, "Метод " + msg.method + " виджетом не поддерживается");
  }

  function handleNotification(msg) {
    if (msg.method === "ui/notifications/tool-result") { onToolResult(msg.params); return; }
    if (msg.method === "ui/notifications/tool-input") {
      var args = msg.params && msg.params.arguments;
      if (args && args.issueId) { state.issueId = args.issueId; }
      return;
    }
    if (msg.method === "ui/notifications/tool-cancelled") {
      el("issue").textContent = "Вызов отменён" + (msg.params && msg.params.reason ? ": " + msg.params.reason : "");
      return;
    }
    if (msg.method === "ui/notifications/host-context-changed") {
      applyHostContext(msg.params);
    }
  }

  window.addEventListener("message", function (event) {
    // Сообщения принимаем только от того окна, с которым и говорим (хост или
    // sandbox-proxy). Origin здесь проверить нельзя: у песочницы он opaque.
    if (event.source !== window.parent) { return; }
    var msg = event.data;
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") { return; }

    var isResponse = "result" in msg || "error" in msg;
    if (isResponse && msg.id != null && pending[msg.id]) {
      var slot = pending[msg.id];
      delete pending[msg.id];
      if ("error" in msg) { slot.reject(msg.error); } else { slot.resolve(msg.result); }
      return;
    }
    if (typeof msg.method !== "string") { return; }
    if (msg.id != null) { handleRequest(msg); return; }
    handleNotification(msg);
  });

  el("apply").addEventListener("click", function () {
    if (!state.issueId) { return; }
    var button = el("apply");
    button.disabled = true;
    setStatus("Сохраняем…");
    var args = {
      issueId: state.issueId,
      description: el("suggested").value,
      // version в fields — не украшение: из ответа берётся новая версия задачи,
      // без неё второе сохранение подряд упрётся в конфликт optimistic locking.
      fields: ["key", "version"]
    };
    if (typeof state.version === "number") { args.version = state.version; }
    request("tools/call", { name: CONFIG.updateIssueTool, arguments: args })
      .then(function (result) {
        if (result && result.isError) { throw new Error(toolErrorText(result)); }
        absorbVersion(result && result.structuredContent && result.structuredContent.data);
        state.suggestedShown = el("suggested").value;
        setStatus("Сохранено", "ok");
      })
      .catch(function (error) {
        setStatus("Ошибка: " + ((error && error.message) || "не удалось сохранить"), "error");
      })
      .finally(function () { refreshApplyButton(); });
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(reportSize).observe(document.body);
  }

  function finishHandshake() {
    notify("ui/notifications/initialized", {});
    handshakeComplete = true;
    reportSize();
  }

  var handshakeSettled = false;
  function settleHandshake(result) {
    // Ответ хоста применяем всегда, даже если он опоздал после таймаута:
    // в нём капабилити и тема, а повторный initialized не отправляется.
    if (result) {
      state.handshakeAnswered = true;
      state.host = result.hostCapabilities || {};
      applyHostContext(result.hostContext);
      refreshApplyButton();
    }
    if (handshakeSettled) { reportSize(); return; }
    handshakeSettled = true;
    if (!result) { refreshApplyButton(); }
    finishHandshake();
  }

  setTimeout(function () { settleHandshake(null); }, CONFIG.initializeTimeoutMs);

  request("ui/initialize", {
    appInfo: { name: "yandex-tracker-issue-description-editor", version: "1" },
    // Капабилити tools НЕ объявляем: она обязывает реализовать tools/list и
    // tools/call от хоста (SEP-1865, «Apps MUST implement oncalltool»), а
    // собственных инструментов у виджета нет.
    appCapabilities: { availableDisplayModes: ["inline"] }
  })
    .then(function (result) { settleHandshake(result || {}); })
    .catch(function () { settleHandshake(null); });
})();
`;

/** Экранирует JSON для вставки внутрь `<script>`: `</script` не должен закрыть тег. */
function toInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Значения, которые в проде не переопределяются — параметр нужен тестам. */
export interface IssueDescriptionEditorOptions {
  readonly initializeTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
}

/**
 * Собирает HTML-бандл виджета. Динамическая часть — только конфиг в
 * `<script type="application/json">`; сам скрипт статичен, поэтому имя
 * инструмента не может «просочиться» в код мимо экранирования.
 */
export function buildIssueDescriptionEditorHtml(
  tools: IssueDescriptionEditorToolNames,
  options: IssueDescriptionEditorOptions = {}
): string {
  const config = toInlineJson({
    updateIssueTool: tools.updateIssue ?? null,
    initializeTimeoutMs: options.initializeTimeoutMs ?? INITIALIZE_TIMEOUT_MS,
    requestTimeoutMs: options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS,
  });

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
<title>Описание задачи</title>
<style>${WIDGET_STYLE}</style>
</head>
<body>
${WIDGET_MARKUP}
<script type="application/json" id="mcp-app-config">${config}</script>
<script>${WIDGET_SCRIPT}</script>
</body>
</html>
`;
}
