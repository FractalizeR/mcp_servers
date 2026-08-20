/**
 * Иконка сервера — монограмма FR (пакет 3.1.D плана модернизации MCP
 * 2026-07-28). Одна и та же иконка для всех серверов (Трекер/Вики): это
 * identity издателя (FractalizeR), а не иконка домена задачи, поэтому
 * живёт в framework, а не дублируется в пакетах серверов.
 *
 * Кладётся в `Implementation.icons` в ответе `server/discover` (см.
 * discover-server-info.ts) — НЕ на уровне tool и НЕ в per-response
 * `_meta.serverInfo` обычных результатов (там остаются только name/version,
 * см. create-mcp-server-adapter.ts).
 *
 * Обе записи обязательны по плану: PNG — гарантия (клиенты, рисующие
 * иконки, MUST поддерживать image/png), SVG — SHOULD, масштабируется без
 * потерь там, где клиент его принимает. `src` — data: URI (base64):
 * внешний хост недоступен на stdio.
 *
 * Происхождение: контуры глифов F и R шрифта Marck Script (Denis Masharov &
 * Marck Fogel, 2011, v1.002; SIL Open Font License 1.1, OS/2 fsType = 0),
 * переведённые в кривые — от наличия шрифта на машине пользователя ничего
 * не зависит. Атрибуция сохранена добровольно (сами файлы шрифта здесь не
 * распространяются, OFL формально не требует её для производных контуров).
 * SVG использует `fill="currentColor"` — наследует цвет темы клиента, если
 * клиент это поддерживает; PNG растеризован с явным цветом.
 *
 * Исходные ассеты (для пересборки при ребрендинге) — рядом, в
 * packages/framework/core/assets/icon/. Сгенерированы
 * .agentic-planning/plan_mcp_2026_modernization/assets/icon/{extract_glyphs,build_monogram,export_assets}.py
 * (план и его ассеты удаляются по завершении; base64 ниже — единственная
 * копия, нужная в рантайме, зашита в исходник намеренно: сборка каждого
 * из трёх серверов идёт tsup-бандлом в отдельный npm-пакет, и рантайм-чтение
 * файла с диска добавило бы хрупкую резолюцию пути внутри установленного
 * пакета вместо константы, которая просто едет в бандле как часть кода).
 */

import type { Icon } from '@modelcontextprotocol/server';

const FR_METRIC_PNG_48_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAEPElEQVRoge3YWahVVRgH8J9lpjZoamGjeLMSS61Ms0GjuAhF44NGNFA2UtRTA5QNFFRGGZVRQTbQACUkBUUPGSUKPXQjTYIGSqHBSgxNrppeTw9rbfY6+56z7z1Db+cPm7P3Wv/1rf9a+/u+9Z1NBx100EEHHXTwv+MgHIv9ix1DWjC6bzQ6HRNxMEbiX/RhG/bgn+R3d7w/BbMxBRdhfQ37E7AQV8Z5xPHP4i5UmhU+Fc/h92ikletvrMZGXBHtj8US7CwZd10zwkdjmbCDrQrfjLeFt9AX287DJfgzPm/DSnxZY/w7jYo/Dt/Hwd9hsbBj8zADXZgc7+egGwvwQxzzYRQ3F+MTu5cmoj6Ov7/iDoxIeI8VFvBeI+JHRdG9uNbg4mYYPoqTrcHwOrynE1F78IwQsEXMUL2AJwatHg/HQdc3MGZxImpaCa9H7lLdJbxzVS/grAa0+CkOOnyQ/LPlfv1yCW+8PJ4eGsDmg3Lx6zSQPYcmYi6s0T8Nz+OopO3zZLJ6uz9JHlMVzCzRcCB+i7w+De4+eVbYgkWYLwTZ6tjei/Mj95xE1Ko69qYkNivYhH1K5n8l4T7eqHj6Z4D0+hazEu4HSV+tmJmIX7ALP0beqyVzL0rsvat8oXUxDI8KgVbBdnwSBe6X8MYJp3AWvIcW7ByAtdiLq4R0WRHeaBFDhUyTiu9XRjSDkSV9tyYTflqj/83Yd7/w1irCgkcVeNPl7rlXWEjdnR86SOEZepP7ScIBN044/m9M+kap9tcxQk3zleCSS2L7GmzFEUKqnI+LhSyzATcIp3FbMAa3CafqXxovH3bjVMHt/ohtO4V4SHnrovC2uAwhayzXv7jaINRGd2NF0r5a2M3ueK2M7UujvQXyOOlJxi3H0e0SDYcIOX53Msl2oRI9qcBdn3CuSdqPwQ7B1yfEtmxBK/BkMu6ldoqfIk9zWTC9Jvh7EbMS3jYh22TIBL4Rn0+MtirCW0oDf0W7xM8RAiszvAUXlPBfSLhLk/bhcWxau7wVn9fG57mqfb9ldKkO0J+FTFMP4wW3ylLihKRvXmzfIaTBk+W1z9WRM0IeW7tUnytNYZVqd5g6AP/FhL+s0JdVsTtwOr6Jz1+rzutrEhuntSI+fZ3ZgVOGE+QBvhVHFvqXFexlmeeMAi+tNO9tXn51RqioHbAZhsj/QVVwew3OU/ov4L4avC55YPc0qR28n0y0aQDuPQn3M+ELRREz5bVRHx4osZe67pmNiE6RVpK96gfUzfJg3IjDSmzOwE04foC5L0vmXqXJzz2PqH7diwuGxqgO2s3C9512ITvgKrizGQNd+tclPcKHpOXynJ6l18ktS67G1GT+PmFDRzdqZKH8L2Stay9eVx7greAWeUBnBWCjFbNufFEwtEVIi7PbpbQElwufcSrCodr0Zo0WTuGx7dHVQQcddNBBBx30w3+hN7EdqZlslgAAAABJRU5ErkJggg==';

const FR_METRIC_SVG_BASE64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMjYuMiAxMy45IDM4IDE0LjNRMzguOSAxNC4zIDQwLjMgMTMuOFE0MS42IDEzLjQgNDIuMSAxMy40UTQyLjUgMTMuNCA0Mi44IDEzLjdRNDMuMSAxNCA0My4xIDE0LjRRNDMuMSAxNS40IDQyLjEgMTYuMVE0MS4yIDE2LjkgMzkuNiAxNy4yUTM2LjcgMTcuOCAzNC41IDE3LjhRMzEuNSAxOS45IDI4LjYgMjkuOVEzMy41IDI5LjkgMzQuNyAzMEwzNC42IDMyLjRRMzMuOCAzMi40IDMyLjMgMzIuNEwyNy44IDMyLjNRMjUgNDAuOCAyMC4zIDQ1LjlRMTUuNSA1MC45IDEwLjIgNTAuOVE3IDUwLjkgNSA0OC45UTMgNDcgMyA0My44UTMgMzguNyA5LjEgMzQuNFExNS4zIDMwLjIgMjQuMyAzMFEyNy4zIDIwLjQgMzEuNCAxNy44TDIzLjQgMTcuNVExOC4zIDE3LjUgMTUuOSAxOC44UTEzLjQgMjAuMSAxMy40IDIyLjJRMTMuNCAyMy40IDE0LjMgMjQuMlExNS4zIDI0LjkgMTYuMiAyNC45UTE3LjIgMjQuOSAxNy42IDI0LjlRMTguMSAyNC44IDE4LjggMjQuNVExOS42IDI0LjIgMTkuOSAyNC4xUTIwLjkgMjMuOCAyMi40IDIzTDIzLjUgMjQuM1ExOS43IDI4LjEgMTUuMiAyOC4xUTEzLjIgMjguMSAxMS45IDI2LjlRMTAuNiAyNS42IDEwLjYgMjMuN1ExMC42IDE5LjYgMTQuOCAxNi44UTE5LjEgMTMuOSAyNi4yIDEzLjlaTTE5LjIgNDEuOFEyMS45IDM3LjYgMjMuNSAzMi40UTE3LjMgMzIuOSAxMi42IDM2LjRRNy44IDM5LjggNy44IDQzLjhRNy44IDQ1LjMgOC45IDQ2LjNRMTAgNDcuMyAxMS43IDQ3LjNRMTMuNSA0Ny4zIDE1LjUgNDUuOFExNy42IDQ0LjQgMTkuMiA0MS44Wk01My4zIDQ4LjEgNTMuNSA1MC41UTUyLjEgNTAuNyA1MS4xIDUwLjdRNDguNyA1MC43IDQ2LjYgNDcuNlE0NC40IDQ0LjUgNDMuMiA0MC4zUTQyIDM2LjEgNDEuNyAzMi4yUTM5LjIgMzguNyAzNyA0MS42UTM0LjcgNDQuNiAzMi40IDQ0LjZRMzEuMiA0NC42IDMwLjUgNDMuNlEyOS44IDQyLjYgMjkuOCA0MVEyOS44IDM3LjMgMzMuMiAzMS42UTM2LjYgMjUuOSA0MS4yIDIyLjNRNDEuMyAyMiA0Mi4xIDE4LjZRNDIuOSAxNS4zIDQzIDE1TDQ1LjkgMTQuN1E0NS45IDE1LjYgNDUuNSAxOC4yUTUyLjIgMTMuMSA1Ni42IDEzLjFRNTguNiAxMy4xIDU5LjggMTQuMlE2MSAxNS40IDYxIDE3LjNRNjEgMjIgNTYuMiAyNi44UTUxLjQgMzEuNiA0NiAzMi41UTQ2LjQgMzkuNyA0OC41IDQzLjhRNTAuNiA0Ny45IDUzLjMgNDguMVpNMzguNyAzMS41UTQwLjEgMjcuOSA0MC42IDI1LjdRMzcuOCAyOC4zIDM1LjUgMzIuNVEzMy4yIDM2LjggMzMuMiAzOC44UTMzLjIgMzkuOSAzNCAzOS45UTM1LjUgMzkuOSAzOC43IDMxLjVaTTQyLjEgMzAuOFE0Ny40IDMwLjggNTEuNiAyNy4xUTU1LjggMjMuNCA1NS44IDE5LjdRNTUuOCAxOC40IDU1LjEgMTcuNlE1NC41IDE2LjkgNTMgMTYuOVE1MS42IDE2LjkgNDguOCAxOC41UTQ2LjEgMjAuMSA0NC45IDIxLjJRNDMuMyAyNy4zIDQyLjEgMzAuOFoiLz48L3N2Zz4=';

export const SERVER_ICONS: Icon[] = [
  {
    src: `data:image/png;base64,${FR_METRIC_PNG_48_BASE64}`,
    mimeType: 'image/png',
    sizes: ['48x48'],
  },
  {
    src: `data:image/svg+xml;base64,${FR_METRIC_SVG_BASE64}`,
    mimeType: 'image/svg+xml',
    sizes: ['any'],
  },
];
