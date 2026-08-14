/**
 * Fallback flat config для файлов, лежащих прямо в packages/servers/
 * (например, tsup.config.base.ts — общий конфиг сборки для трёх серверов).
 *
 * Такие файлы не попадают ни под один src/**|tests/** glob из
 * eslint.shared.config.js (эти паттерны разрешаются относительно
 * eslint.config.js каждого конкретного сервера), поэтому без этого файла
 * ESLint v9+ поднимается вверх по дереву каталогов, не находит ни одного
 * config-файла (ни здесь, ни в корне монорепо) и падает с
 * "ESLint couldn't find an eslint.config.js file" — это ломает lint-staged
 * (husky pre-commit) на любом коммите, трогающем такой файл.
 *
 * Пустой конфиг: файлы внутри packages/servers/{name}/ по-прежнему
 * используют СВОЙ ближайший eslint.config.js (serverConfig()) — этот файл
 * их не переопределяет и не применяет к ним никаких правил.
 */
export default [{}];
