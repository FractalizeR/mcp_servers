import { describe, expect, it } from 'vitest';
import {
  pinProjectsLinkHeader,
  isProjectsPath,
} from '#tracker_api/api_operations/project/pin-projects-link.util.js';

describe('pinProjectsLinkHeader', () => {
  it('берёт из чужой ссылки только номер страницы, query — из нашего запроса', () => {
    const headers = {
      link: '<https://api.tracker.yandex.net/v2/queues?expand=&page=2&perPage=3>; rel="next"',
    };

    const result = pinProjectsLinkHeader(headers, '/v3/projects?perPage=3&queueId=DVIZHDEV');

    expect(result['link']).toContain('/v3/projects?');
    expect(result['link']).toContain('page=2');
    // Ссылки генерирует хендлер очередей и `queueId` в них теряет —
    // единственная защита в том, чтобы не брать оттуда query вовсе.
    expect(result['link']).toContain('queueId=DVIZHDEV');
    expect(result['link']).not.toContain('/v2/queues');
  });

  it('сохраняет шаблон seek-ссылки, иначе теряется seek-gating', () => {
    const result = pinProjectsLinkHeader(
      { link: '<https://api.tracker.yandex.net/v2/queues?expand=&perPage=3{&page}>; rel="seek"' },
      '/v3/projects?perPage=3'
    );

    expect(result['link']).toContain('{&page}');
    expect(result['link']).toContain('/v3/projects');
  });

  it('не превращает пустую ссылку в курсор на первую страницу', () => {
    // `new URL('', base)` не бросает, а возвращает базу: без явного гарда
    // битый заголовок стал бы валидным `</v3/projects>` и зациклил fetchAll.
    const result = pinProjectsLinkHeader({ link: '<>; rel="next"' }, '/v3/projects?perPage=3');

    expect(result['link']).toBe('<>; rel="next"');
  });

  it('не трогает заголовки без Link', () => {
    const headers = { 'x-total-count': '43' };

    expect(pinProjectsLinkHeader(headers, '/v3/projects')).toBe(headers);
  });

  it('isProjectsPath отсекает путь на чужую коллекцию', () => {
    expect(isProjectsPath('/v3/projects?page=2')).toBe(true);
    expect(isProjectsPath('/v2/queues?page=2')).toBe(false);
  });
});
