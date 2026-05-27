# 회의록 업로드 가이드

## 작성 위치

회의록은 `content/meeting-minutes` 폴더에 Markdown 파일로 추가합니다.

## 파일명 규칙

```text
YYYY-MM-DD-topic.md
```

예시:

```text
2026-05-13-homepage-renewal-kickoff.md
```

## 작성 방법

1. `content/meeting-minutes/_template.md`를 복사합니다.
2. 파일명을 날짜와 주제에 맞게 변경합니다.
3. 상단 front matter의 `title`, `date`, `attendees`, `tags`를 채웁니다.
4. `Agenda`, `Notes`, `Decisions`, `Action Items`를 작성합니다.

## 운영 메모

현재는 정적 HTML 구조이므로 새 회의록을 홈페이지 화면에 자동 반영하려면 빌드 도구나 CMS 연동이 필요합니다.
초기 단계에서는 회의록 원본을 레포에 안정적으로 누적하는 것을 우선합니다.
