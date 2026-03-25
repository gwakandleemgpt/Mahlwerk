# Mahlwerk QR 전시 설명 사이트

박물관 전시물 하단 QR 코드로 접속하는 모바일 설명 사이트입니다.

## 구성
- `index.html`: 전시 설명 본문 페이지
- `qr.html`: 관리자용 전체 QR 코드 인쇄 페이지(번호 라벨 포함)
- `description.txt`: 전시 설명 원문(섹션/페이지 자동 파싱)
- `description.en.txt`: 전시 설명 영문 번역본
- `images/`: 전시 이미지
- `audio/`: 오디오 해설 파일

## 페이지 규칙
- URL 형식: `...?id=섹션-페이지` (예: `?id=3-1`)
- 언어 전환: `?lang=en` 쿼리로 영문 페이지 직접 진입 가능
- 섹션 번호
  - `1`: 전시물 소개
  - `2`: 커피그라인더의 형태적 분류
  - `3`: 개별 그라인더

## 파일 네이밍 규칙
- 이미지
  - 섹션 1: `images/image01.png`, `images/image02.png` ...
  - 섹션 2+: `images/image2-1.png`, `images/image3-1.png` ...
- 오디오
  - `audio/섹션-페이지.wav` (예: `audio/1-4.wav`)
  - `.mp3`, `.m4a`, `.ogg`도 자동 탐색
  - 현재 오디오는 한국어 기준이므로 영문 모드에서는 숨김 처리

## GitHub Pages 배포
1. GitHub 저장소에 파일을 푸시합니다.
1. 저장소 설정의 `Settings > Pages`로 이동합니다.
1. `Build and deployment`에서 `Deploy from a branch` 선택
1. Branch를 `main` / `/ (root)`로 저장
1. 배포 완료 후 접속
   - 프로젝트 저장소 기준: `https://gwakandleemgpt.github.io/Mahlwerk/`

## QR 출력 방법
1. `https://gwakandleemgpt.github.io/Mahlwerk/qr.html` 접속
1. 상단 `인쇄` 버튼 클릭
1. 출력물의 QR 상단 라벨(`3-1` 등)을 전시물 라벨과 맞춰 부착

## 로컬 테스트
정적 서버로 열어야 `description.txt`/오디오/이미지 로딩이 정상 동작합니다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속
