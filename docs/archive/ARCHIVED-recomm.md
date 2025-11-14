# Итоговые рекомендации и разъяснения по настройке TypeScript-конфигурации
### для MCP stdio сервера на Node.js 22 (ESM, TypeScript 5.9, Inversify, Jest 30)

Этот документ объединяет **все рекомендации и разъяснения**, которые были сформированы в ходе анализа конфигурации проекта.  
Он предназначен как финальное, удобное и самодостаточное руководство по настройке TypeScript, тестов и окружения.

---

# 1. Основной `tsconfig.json` — оптимизированная конфигурация

Ниже представлена итоговая версия `tsconfig.json`, актуальная для:

- **Node.js v22.20.0**
- **ESM (package.json → `"type": "module"`)**
- **TypeScript 5.9+**
- **DI: Inversify + reflect-metadata**
- **MCP stdio сервер**

```jsonc
{
  "compilerOptions": {
    /* Language and Environment */
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "moduleDetection": "force",

    /* Decorators: необходимы для Inversify */
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    /* Emit */
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "downlevelIteration": false,

    /* Если хотите уменьшить размер сборки:
    "importHelpers": true,
    "noEmitHelpers": true,
    */

    /* Строгий режим */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    /* Повышение скорости сборки */
    "skipLibCheck": true,

    /* Interop */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": false,
    "resolveJsonModule": true,

    /* Node environment */
    "types": ["node"]
  },

  "include": ["src"],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}

2. Подробные объяснения ключевых решений

2.1. Почему target/lib = ES2022

Node 22 имеет полную поддержку большинства возможностей ES2022.
Это обеспечивает:
	•	быстрый рантайм,
	•	современный синтаксис без транспиляции,
	•	отсутствие полифиллов.

Можно поднять до ES2023/ESNext, но это уже вопрос вкуса и риска появления угловых кейсов.

⸻

2.2. Почему module/moduleResolution = NodeNext

NodeNext — единственный режим TypeScript, который:
	•	строго соответствует реальному поведению Node ESM,
	•	корректно обрабатывает .js в импортах (import x from "./mod.js"),
	•	обеспечивает правильное поведение смешанных зависимостей (ESM/CJS),
	•	максимально надёжен в долгосрочной перспективе.

Этот режим обязательно использовать при "type": "module" в package.json.

⸻

2.3. Почему включены legacy-декораторы

Inversify по-прежнему основан на:
	•	experimentalDecorators,
	•	emitDecoratorMetadata,
	•	reflect-metadata.

Стандартные декораторы TC39 (поддерживаемые TS 5+) несовместимы с текущей версией Inversify.

Поэтому:
	•	оставляем legacy-декораторы,
	•	включаем генерацию метаданных.

⸻

2.4. Почему downlevelIteration: false

Этот флаг нужен только при таргетах до ES2015.

С Node 22:
	•	он бесполезен,
	•	замедляет runtime,
	•	добавляет helper-функции.

Отключение полностью безопасно.

⸻

2.5. Почему удалены дубли строгих флагов

strict: true уже включает:
	•	noImplicitAny
	•	strictNullChecks
	•	strictFunctionTypes
	•	strictBindCallApply
	•	strictPropertyInitialization
	•	noImplicitThis
	•	alwaysStrict

Их дублирование усложняет конфиг и не несёт пользы.

Мы оставили только дополнительные флаги, которые не включаются автоматически, но сильно усиливают типобезопасность:
	•	noUncheckedIndexedAccess
	•	noImplicitOverride
	•	noPropertyAccessFromIndexSignature

⸻

2.6. Почему isolatedModules: false

Истинно нужно, только если:
	•	используется Babel,
	•	или SWC,
	•	или другие per-file транспиляторы.

Ваш проект использует tsc и ts-jest → ограничение isolatedModules создавать только сложности.
Отключение расширяет совместимость и убирает скрытые проблемы с декларациями.

⸻

2.7. Почему "types": ["node"]

Вы пишете чистый Node-сервис.
Без DOM / браузера.

Это предотвращает:
	•	попадание лишних типов,
	•	конфликты типов,
	•	случайный импорт глобалей DOM.

⸻

3. Финальный tsconfig.tests.json для Jest 30 + ts-jest

Тестовый конфиг должен быть минимальным, наследуемым и точным.

Особенно важно указать jest-типы.

{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node", "jest"],
    "rootDir": "."
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}

4. Объяснение тестового конфига

4.1. Почему types: ["node", "jest"] обязательно

Без этого:
	•	describe, it, expect будут «не найдены» TS-ом,
	•	автодополнение будет работать некорректно,
	•	Jest типы не появятся в глобальной области.

Ваш проект использует @types/jest, поэтому это абсолютно безопасно.

⸻

4.2. Почему наследуем module: "NodeNext" из основного tsconfig

Jest 30 + ts-jest корректно работают с ESM, при условии что:
	•	Jest запускается через Node ESM (node --experimental-vm-modules — у вас так и есть),
	•	ts-jest настроен корректно.

Это обеспечивает единообразный резолвинг модулей между тестами и приложением.

⸻

5. Рекомендации по package.json

Если проект действительно рассчитан на Node 22, поддержите это в engines:

"engines": {
  "node": ">=22"
}


5.1. Если планируется публикация пакета

Лучше добавить:

"types": "dist/index.d.ts",
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}

Это обеспечит:
	•	корректную работу ESM,
	•	корректное потребление типов,
	•	защиту от нестандартного импорта.

6. Дополнительные рекомендации (необязательные, но полезные)

✔ Подключение tslib для уменьшения итогового JS

В tsconfig.json:

"importHelpers": true,
"noEmitHelpers": true

Это:
	•	удаляет дублирующийся boilerplate хелперов TypeScript,
	•	немного уменьшает размеры JS-файлов.

Если увидите странное поведение классов под Inversify, попробуйте:

"useDefineForClassFields": false

Это возвращает более предсказуемую (старую) семантику инициализации полей.