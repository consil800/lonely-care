# FirebaseManager 사용 가이드

## 개요
lonely-care 프로젝트의 Firebase 초기화 중복 문제를 해결하기 위한 중앙화된 관리 시스템입니다.

## 주요 기능
- ✅ 싱글톤 패턴으로 Firebase 중복 초기화 방지
- ✅ Promise 기반 비동기 초기화
- ✅ 자동 재시도 및 에러 처리
- ✅ 연결 상태 모니터링
- ✅ 생명구조 시스템 안정성 보장

## 기본 사용법

### 1. 기본 초기화
```javascript
// FirebaseManager 인스턴스 가져오기
const firebaseManager = window.getFirebaseManager();

// Firebase 초기화 (Promise 기반)
const { app, db, messaging, auth } = await firebaseManager.initialize();
```

### 2. 개별 서비스 가져오기
```javascript
// Firestore만 필요한 경우
const db = await firebaseManager.getFirestore();

// Messaging만 필요한 경우
const messaging = await firebaseManager.getMessaging();

// Auth만 필요한 경우
const auth = await firebaseManager.getAuth();
```

### 3. 초기화 상태 확인
```javascript
// 초기화 완료 여부 확인
if (firebaseManager.isReady()) {
    console.log('Firebase 준비 완료');
}

// 연결 상태 확인
const isConnected = await firebaseManager.checkConnection();
```

## 컴포넌트에서 사용하기

### 기존 코드 (문제가 있던 방식)
```javascript
// ❌ 중복 초기화 발생 가능
class MyComponent {
    constructor() {
        this.app = firebase.initializeApp(firebaseConfig); // 위험!
        this.db = firebase.firestore();
    }
}
```

### 개선된 코드 (FirebaseManager 사용)
```javascript
// ✅ 안전한 중앙화된 접근
class MyComponent {
    constructor() {
        this.firebaseManager = window.getFirebaseManager();
        this.db = null;
    }
    
    async init() {
        this.db = await this.firebaseManager.getFirestore();
        // 이제 안전하게 Firestore 사용 가능
    }
}
```

## HTML에서 사용하기

```html
<!-- 1. Firebase SDK 로드 -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"></script>

<!-- 2. 중앙화된 설정 로드 -->
<script src="../js/firebase-config.js"></script>

<!-- 3. FirebaseManager 로드 -->
<script src="../components/core/FirebaseManager.js"></script>

<!-- 4. 사용 -->
<script>
async function initApp() {
    const manager = window.getFirebaseManager();
    const { db } = await manager.initialize();
    
    // 이제 db 사용 가능
    console.log('Firestore 준비 완료:', db);
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', initApp);
</script>
```

## 에러 처리

```javascript
try {
    const firebaseManager = window.getFirebaseManager();
    const db = await firebaseManager.getFirestore();
    
    // Firestore 작업 수행
    
} catch (error) {
    console.error('Firebase 초기화 실패:', error);
    
    // 재시도가 필요한 경우
    if (error.message.includes('설정을 로드할 수 없습니다')) {
        // firebase-config.js 로드 확인
        console.error('firebase-config.js 파일 확인 필요');
    }
}
```

## 마이그레이션 가이드

### 단계 1: 기존 Firebase 초기화 코드 찾기
```bash
# 프로젝트에서 Firebase 초기화 코드 검색
grep -r "firebase.initializeApp" .
grep -r "firebase.firestore()" .
```

### 단계 2: FirebaseManager로 교체
```javascript
// Before (기존)
const app = firebase.initializeApp(config);
const db = firebase.firestore();

// After (FirebaseManager 사용)
const manager = window.getFirebaseManager();
const { app, db } = await manager.initialize();
```

### 단계 3: 중복 설정 제거
- 하드코딩된 Firebase 설정 제거
- 중복된 firebase-config.js 로드 제거
- 불필요한 초기화 코드 제거

## 문제 해결

### 문제: "Firebase 설정을 로드할 수 없습니다"
```javascript
// 해결: firebase-config.js가 먼저 로드되었는지 확인
console.log('Firebase config:', window.firebaseConfig);
```

### 문제: "Firebase SDK가 로드되지 않았습니다"
```html
<!-- 해결: Firebase SDK 스크립트 태그 확인 -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
```

### 문제: 초기화 중복 오류
```javascript
// 해결: 기존 firebase.initializeApp() 호출 제거
// FirebaseManager가 자동으로 중복을 방지합니다
```

## 성능 최적화

### 지연 로딩
```javascript
// 필요할 때만 초기화
class LazyComponent {
    async getData() {
        if (!this.db) {
            const manager = window.getFirebaseManager();
            this.db = await manager.getFirestore();
        }
        
        return this.db.collection('data').get();
    }
}
```

### 연결 상태 모니터링
```javascript
// 주기적 연결 확인
setInterval(async () => {
    const manager = window.getFirebaseManager();
    const isConnected = await manager.checkConnection();
    
    if (!isConnected) {
        console.warn('Firebase 연결 끊어짐 - 재시도 필요');
        // 재연결 로직 또는 사용자 알림
    }
}, 30000); // 30초마다 확인
```

## 보안 고려사항

1. **설정 중앙화**: firebase-config.js만 수정하면 모든 곳에 반영
2. **에러 로깅 제한**: 민감한 정보가 로그에 노출되지 않도록 주의
3. **환경별 설정**: 개발/프로덕션 환경에 따른 다른 설정 사용

## 라이프사이클

```mermaid
graph TD
    A[FirebaseManager.getInstance()] --> B{이미 초기화됨?}
    B -->|Yes| C[기존 인스턴스 반환]
    B -->|No| D[설정 로드 대기]
    D --> E[Firebase 앱 초기화]
    E --> F[서비스 초기화]
    F --> G[완료]
    F -->|실패| H[재시도]
    H --> D
    H -->|최대 재시도 초과| I[에러]
```

이 가이드를 참조하여 안전하고 효율적으로 Firebase를 사용하세요!