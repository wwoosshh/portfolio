import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import { view } from '../lib/status';
import Button from './Button.astro';
import Evidence from './Evidence.astro';
import SectionHeader from './SectionHeader.astro';
import Status from './Status.astro';
import Tag from './Tag.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('Status', () => {
  test('톤 클래스, 기호, 글자를 그린다', async () => {
    const html = await container.renderToString(Status, { props: { view: view('wait', '리뷰 중') } });
    expect(html).toContain('status--wait');
    expect(html).toContain('●');
    expect(html).toContain('리뷰 중');
  });
});

describe('Tag', () => {
  test('슬롯 내용을 한 가지 모양으로 감싼다', async () => {
    const html = await container.renderToString(Tag, { slots: { default: 'Python' } });
    expect(html).toMatch(/<span class="tag"[^>]*>Python<\/span>/);
  });
});

describe('Button', () => {
  test('외부 링크는 새 탭과 ↗ 표시', async () => {
    const html = await container.renderToString(Button, {
      props: { href: 'https://github.com/wwoosshh', label: 'GitHub', external: true },
    });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('↗');
  });
  test('내려받기 버튼은 파일 이름을 붙인다', async () => {
    const html = await container.renderToString(Button, {
      props: { href: '/portfolio.pdf', label: 'PDF', download: '우성현_포트폴리오.pdf' },
    });
    expect(html).toContain('download="우성현_포트폴리오.pdf"');
    expect(html).not.toContain('target="_blank"');
  });
});

describe('Evidence', () => {
  test('URL 근거는 짧은 이름의 링크로 그린다', async () => {
    const html = await container.renderToString(Evidence, {
      props: { evidence: 'https://github.com/vllm-project/vllm/issues/58675' },
    });
    expect(html).toContain('href="https://github.com/vllm-project/vllm/issues/58675"');
    expect(html).toContain('근거 → vllm#58675');
  });
  test('비공개 근거는 링크 없이 사유를 적는다', async () => {
    const html = await container.renderToString(Evidence, {
      props: { evidence: { private: true, note: '면접에서 화면 공유로 시연' } },
    });
    expect(html).toContain('비공개 저장소 · 면접에서 화면 공유로 시연');
    expect(html).not.toContain('<a');
  });
});

describe('SectionHeader', () => {
  test('섹션 id에 맞는 h2와 // 표식을 그린다', async () => {
    const html = await container.renderToString(SectionHeader, { props: { id: 'ml', title: '대표 프로젝트' } });
    expect(html).toMatch(/<h2[^>]*id="ml-title"/);
    expect(html).toMatch(/aria-hidden="true"[^>]*>\/\/ <\/span>/);
    expect(html).toContain('대표 프로젝트');
  });
});
