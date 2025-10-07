/**
 * SessionIntegration.js
 * SessionComponent와 기존 auth.js 시스템을 통합하는 브릿지 역할
 */

// SessionComponent와 기존 auth 시스템 통합
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 SessionComponent 통합 시작');
    
    // SessionComponent가 로드되고 초기화될 때까지 대기
    const waitForSessionComponent = () => {
        if (window.sessionComponent && window.auth) {
            setupSessionIntegration();
        } else {
            setTimeout(waitForSessionComponent, 100);
        }
    };
    
    // 약간의 지연 후 시작 (다른 컴포넌트들이 로드될 시간 확보)
    setTimeout(waitForSessionComponent, 500);
});

function setupSessionIntegration() {
    console.log('🎫 SessionComponent 통합 설정 중...');
    
    const sessionComponent = window.sessionComponent;
    const auth = window.auth;
    
    // 기존 auth.js의 세션 관련 메서드를 SessionComponent로 위임
    
    // 1. 세션 생성 시 SessionComponent 업데이트
    const originalSetCurrentUser = auth.storage.setCurrentUser.bind(auth.storage);
    auth.storage.setCurrentUser = function(user) {
        // 기존 로직 실행
        originalSetCurrentUser(user);
        
        // SessionComponent 업데이트
        if (user) {
            sessionComponent.createSession(user);
        } else {
            sessionComponent.destroySession();
        }
    };
    
    // 2. SessionComponent의 Keep Alive를 기존 auth의 세션 유지와 연결
    const originalStartSessionKeepAlive = auth.startSessionKeepAlive.bind(auth);
    auth.startSessionKeepAlive = function() {
        // SessionComponent의 Keep Alive 사용
        sessionComponent.startKeepAlive();
        
        // 기존 로직도 유지 (호환성)
        if (originalStartSessionKeepAlive) {
            originalStartSessionKeepAlive();
        }
    };
    
    const originalStopSessionKeepAlive = auth.stopSessionKeepAlive.bind(auth);
    auth.stopSessionKeepAlive = function() {
        // SessionComponent의 Keep Alive 중단
        sessionComponent.stopKeepAlive();
        
        // 기존 로직도 유지 (호환성)
        if (originalStopSessionKeepAlive) {
            originalStopSessionKeepAlive();
        }
    };
    
    // 3. SessionComponent 이벤트 리스너 설정
    sessionComponent.addEventListener('session:created', (e) => {
        console.log('🎫 세션 생성됨:', e.detail.user.name);
        
        // 기존 auth 시스템에 알림
        if (auth.updateLoginState) {
            auth.updateLoginState(true);
        }
    });
    
    sessionComponent.addEventListener('session:restored', (e) => {
        console.log('🔄 세션 복원됨:', e.detail.user.name);
        
        // 기존 auth의 currentUser 동기화
        auth.currentUser = e.detail.user;
        
        // UI 업데이트
        if (auth.updateLoginState) {
            auth.updateLoginState(true);
        }
    });
    
    sessionComponent.addEventListener('session:destroyed', (e) => {
        console.log('🚪 세션 종료됨');
        
        // 기존 auth 상태 동기화
        auth.currentUser = null;
        
        // UI 업데이트
        if (auth.updateLoginState) {
            auth.updateLoginState(false);
        }
    });
    
    sessionComponent.addEventListener('session:refreshed', (e) => {
        if (window.debug) {
            console.log('🔄 세션 갱신됨:', new Date().toLocaleTimeString());
        }
        
        // 기존 auth의 currentUser와 동기화
        if (e.detail.user) {
            auth.currentUser = e.detail.user;
        }
    });
    
    // 4. 기존 코드에서 getCurrentUser() 호출 시 SessionComponent 사용
    const originalGetCurrentUser = auth.getCurrentUser.bind(auth);
    auth.getCurrentUser = function() {
        // SessionComponent에서 가져오기 시도
        const sessionUser = sessionComponent.getCurrentUser();
        if (sessionUser) {
            return sessionUser;
        }
        
        // 없으면 기존 방식 사용
        return originalGetCurrentUser();
    };
    
    // 5. isLoggedIn() 메서드도 SessionComponent와 연결
    const originalIsLoggedIn = auth.isLoggedIn.bind(auth);
    auth.isLoggedIn = function() {
        // SessionComponent 상태 우선 확인
        if (sessionComponent.isSessionActive()) {
            return true;
        }
        
        // 없으면 기존 방식 사용
        return originalIsLoggedIn();
    };
    
    // 6. 기존 auth에 SessionComponent 정보 접근 메서드 추가
    auth.getSessionInfo = function() {
        return sessionComponent.getSessionInfo();
    };
    
    auth.getSessionExpiryTime = function() {
        return sessionComponent.getSessionExpiryTime();
    };
    
    auth.getTimeUntilExpiry = function() {
        return sessionComponent.getTimeUntilExpiry();
    };
    
    console.log('✅ SessionComponent 통합 완료');
    
    // 통합 상태 확인
    const sessionInfo = sessionComponent.getSessionInfo();
    if (sessionInfo.isActive) {
        console.log('📊 활성 세션:', {
            user: sessionInfo.currentUser?.name,
            expiresIn: Math.round((sessionInfo.timeUntilExpiry || 0) / (1000 * 60)) + '분'
        });
    }
}