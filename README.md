# 필사루틴 PWA — 1차 프로토타입

아이폰/안드로이드 홈 화면에 설치할 수 있는 신약 필사 계획 앱입니다.

## 포함 기능
- 2026-08-10 마가복음 8장부터 2026-12-31 요한계시록 22장까지 계획
- 일요일 제외 주 6일
- 오늘 분량, 완료 체크, 진도율, 연속 필사일
- 알림 요일/시간 설정 UI
- Service Worker / PWA 설치
- Web Push 구독 + Node 서버 예제

## 주의
날짜별 분량은 현재 **절 수 균등 배분**입니다. 개역개정 본문 텍스트는 저작권 때문에 앱에 포함하지 않았습니다.
정확한 '글자 수 균등 배분'을 하려면 합법적으로 사용할 수 있는 절별 글자 수 메타데이터를 별도로 준비해야 합니다.

## 로컬 실행
```bash
npm install
npm start
```
브라우저에서 http://localhost:3000

## 실제 푸시 알림
Web Push는 HTTPS 배포가 필요합니다.
1. VAPID 키 생성: `npx web-push generate-vapid-keys`
2. 환경 변수 설정
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
   - VAPID_SUBJECT=mailto:본인이메일
3. HTTPS 지원 호스팅(Render/Railway/Fly.io 등)에 배포
4. 실제 서비스에서는 in-memory 구독 저장소를 Supabase/Postgres 등으로 교체

### iPhone
iOS 16.4+에서 홈 화면에 추가한 웹앱은 Web Push를 지원합니다. 앱 안의 '알림 설정 저장' 버튼처럼 사용자의 직접 동작에서 알림 권한을 요청해야 합니다.

## 다음 버전 권장
- 로그인/기기간 동기화
- Supabase 영구 저장
- 오늘 분량을 푸시 본문에 직접 표시
- 못 쓴 날의 분량을 절 단위로 자동 재배분
- 월간 캘린더
- 메모/묵상 기록
