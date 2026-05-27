const minutes = [
  {
    title: "홈페이지 리뉴얼 일정 요청 및 후속 진행",
    date: "2026-05-13",
    tags: ["homepage", "renewal", "schedule"],
    path: "content/meeting-minutes/2026-05-13-homepage-renewal-schedule-request.md",
  },
  {
    title: "홈페이지 기본 방향성 논의",
    date: "2026-05-12",
    tags: ["homepage", "renewal", "planning"],
    path: "content/meeting-minutes/2026-05-12-homepage-direction-meeting.md",
  },
  {
    title: "회의 제목",
    date: "2026-05-13",
    tags: ["homepage"],
    path: "content/meeting-minutes/2026-05-13-meeting-notes.md",
  },
  {
    title: "홈페이지 리뉴얼 구조 정리",
    date: "2026-05-13",
    tags: ["homepage", "renewal", "repository"],
    path: "content/meeting-minutes/2026-05-13-homepage-renewal-kickoff.md",
  },
];

const list = document.querySelector("[data-minutes-list]");

if (list) {
  list.innerHTML = minutes
    .map(
      (item) => `
        <li class="minutes-item">
          <a href="${item.path}">
            <span>${item.date}</span>
            <strong>${item.title}</strong>
            <small>${item.tags.join(" / ")}</small>
          </a>
        </li>
      `,
    )
    .join("");
}
