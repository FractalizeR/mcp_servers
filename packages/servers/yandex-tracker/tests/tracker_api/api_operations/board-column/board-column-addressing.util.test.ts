import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import { ensureColumnAddressable } from '#tracker_api/api_operations/board-column/board-column-addressing.util.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';

// Матчинг-предикат (`findColumnsSharingId`) живёт в `entities/board.entity.ts` и покрыт
// отдельно — `tests/tracker_api/entities/board-column-addressing.test.ts`. Здесь только
// то, что добавляет сама `ensureColumnAddressable`: чтение колонок и отказ до мутации.
describe('ensureColumnAddressable', () => {
  function httpClientReturning(columns: unknown[]): IHttpClient {
    return { get: vi.fn().mockResolvedValue(columns) } as unknown as IHttpClient;
  }

  it('читает колонки доски и не бросает, если columnId встречается ровно один раз', async () => {
    const httpClient = httpClientReturning([
      createBoardColumnFixture({ id: 1, name: 'Open' }),
      createBoardColumnFixture({ id: 2, name: 'Doing' }),
    ]);

    await expect(ensureColumnAddressable(httpClient, '42', '2')).resolves.toBeUndefined();
    expect(httpClient.get).toHaveBeenCalledWith('/v3/boards/42/columns');
  });

  it('отказывает, если колонки с columnId нет на доске', async () => {
    const httpClient = httpClientReturning([createBoardColumnFixture({ id: 2, name: 'Doing' })]);

    await expect(ensureColumnAddressable(httpClient, '42', '1')).rejects.toThrow(
      'Колонка 1 доски 42 не найдена'
    );
  });

  it('отказывает и перечисляет имена колонок-претендентов, если columnId неоднозначен', async () => {
    const httpClient = httpClientReturning([
      createBoardColumnFixture({ id: 1, name: 'Открыт' }),
      createBoardColumnFixture({ id: 1, name: 'Новая колонка' }),
      createBoardColumnFixture({ id: 3, name: 'Готово' }),
    ]);

    await expect(ensureColumnAddressable(httpClient, '42', '1')).rejects.toThrow(
      /адресована неоднозначно.*"Открыт", "Новая колонка"/s
    );
  });

  it('совет в тексте отказа не обещает недоступную адресацию по названию', async () => {
    const httpClient = httpClientReturning([
      createBoardColumnFixture({ id: 1, name: 'Открыт' }),
      createBoardColumnFixture({ id: 1, name: 'Новая колонка' }),
    ]);

    await expect(ensureColumnAddressable(httpClient, '42', '1')).rejects.toThrow(
      /веб-интерфейс Трекера/
    );
  });
});
