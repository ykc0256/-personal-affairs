# -personal-affairs

개인 업무와 프로젝트 자료를 GitHub에 백업하기 위한 묶음 저장소입니다.

이 저장소는 실제 작업 공간이라기보다, 아래 두 원본 폴더를 GitHub에 함께 올리기 위한 업로드용 저장소로 사용합니다.

## 원본 작업 폴더

실제 업무와 개발은 기존에 사용하던 아래 폴더에서 계속 진행합니다.

| 원본 폴더 | 용도 |
| --- | --- |
| `C:\Users\USER\Desktop\project-command-center` | 일정, 프로젝트 진행 현황, 회의록, 참고자료 관리 |
| `C:\Users\USER\Desktop\vendor-item-db` | 협력사 및 품목 데이터베이스 웹 애플리케이션 개발 |

## GitHub 업로드용 저장소

GitHub에는 아래 저장소 구조로 올라갑니다.

```text
C:\Users\USER\Desktop\-personal-affairs
├── project-command-center
└── vendor-item-db
```

`-personal-affairs` 폴더 안의 두 프로젝트는 원본 작업 폴더를 복사한 것입니다. 따라서 평소 작업은 원본 폴더에서 하고, GitHub에 반영할 때만 이 저장소를 업데이트합니다.

## 업데이트 흐름

1. 원본 폴더에서 업무 또는 개발 작업을 합니다.
2. 변경 내용을 `-personal-affairs` 저장소로 복사합니다.
3. `-personal-affairs`에서 커밋하고 GitHub로 push합니다.

복사 명령:

```powershell
robocopy C:\Users\USER\Desktop\project-command-center C:\Users\USER\Desktop\-personal-affairs\project-command-center /E /XD .git .claude node_modules .next /XF .env .env.* *.log *.out.log *.err.log *.tsbuildinfo next-env.d.ts

robocopy C:\Users\USER\Desktop\vendor-item-db C:\Users\USER\Desktop\-personal-affairs\vendor-item-db /E /XD .git .claude node_modules .next /XF .env .env.* *.log *.out.log *.err.log *.tsbuildinfo next-env.d.ts
```

GitHub 반영 명령:

```powershell
cd C:\Users\USER\Desktop\-personal-affairs
git status
git add .
git commit -m "update"
git push
```

## 운영 규칙

- 원본 작업은 `Desktop\project-command-center`, `Desktop\vendor-item-db`에서 합니다.
- `Desktop\-personal-affairs`는 GitHub 업로드용 복사본으로 사용합니다.
- `-personal-affairs` 안에서 직접 수정하면 다음 복사 때 원본 폴더 내용으로 덮일 수 있습니다.
- `.git`, `node_modules`, `.next`, `.env`, 로그 파일 등 로컬 전용 파일은 업로드하지 않습니다.
- API 토큰, 비밀번호, 접속 정보 같은 민감 정보는 커밋하지 않습니다.

## 참고

- 50MB가 넘는 문서 파일은 GitHub에서 경고가 날 수 있습니다.
- 100MB를 넘는 파일은 일반 Git push가 막힐 수 있으므로 Git LFS 또는 별도 공유 방식을 사용합니다.
- 실행 환경 예시는 필요할 때 `.env.example` 파일로 따로 작성합니다.
