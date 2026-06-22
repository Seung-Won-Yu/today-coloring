# 오늘의 색칠

모바일에서 편하게 한 장씩 골라 색칠하는 정적 웹 컬러링 게임입니다.

**게임 실행 주소:** [https://seung-won-yu.github.io/today-coloring/](https://seung-won-yu.github.io/today-coloring/)

![오늘의 색칠 미리보기](assets/readme/preview.png)

## 구성

- 40장 컬러링 도안
- 36색 팔레트
- 모바일 전체화면 PWA 지원
- 색칠 기록 저장
- 완성 작품 보관 및 이미지 저장

## 실행

GitHub Pages에서 바로 실행할 수 있습니다.

로컬에서 확인할 때는 별도 빌드 없이 정적 서버만 켜면 됩니다.

```bash
python3 -m http.server 8002
```

브라우저에서 `http://localhost:8002`로 접속합니다.

반응형 검증 기준은 [docs/responsive-qa.md](docs/responsive-qa.md)에 정리되어 있습니다.

## 폴더 구조

```text
assets/              앱 아이콘, 도안, 썸네일, README 이미지
css/                 화면 스타일
docs/                반응형 QA와 운영 기준 문서
js/                  앱 로직, 데이터, 색칠 엔진
index.html           앱 시작 파일
manifest.webmanifest PWA 설정
sw.js                서비스워커 캐시
```

## 배포

`main` 브랜치에 푸시하면 GitHub Pages로 배포됩니다.
