---
title: "홈페이지 리뉴얼 구조 정리"
date: "2026-05-13"
attendees:
  - 홈페이지 리뉴얼 작업자
tags:
  - homepage
  - renewal
  - repository
---

## Agenda

- 기존 리뉴얼 시나리오와 화면 이미지를 보존한다.
- 홈페이지 초안, 원본 자료, 회의록 업로드 위치를 분리한다.
- 향후 회의록을 Markdown으로 누적 관리할 수 있게 한다.

## Decisions

- 리뉴얼 시나리오는 `docs/reference/homepage-renewal-scenario.md`에 보관한다.
- 화면 레퍼런스 이미지는 `docs/reference/screens`에 보관한다.
- 홈페이지에서 직접 사용하는 이미지는 `public/assets/reference`에 둔다.
- 회의록은 `content/meeting-minutes`에 Markdown 파일로 추가한다.

## Action Items

- [ ] 실제 디자인 확정 후 `index.html`의 섹션 문구를 조정한다.
- [ ] 회의록이 늘어나면 정적 사이트 생성기 또는 CMS 연동 방식을 검토한다.
