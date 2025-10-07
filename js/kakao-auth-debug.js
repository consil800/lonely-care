// 카카오 SDK 디버깅 함수들
window.debugKakao = {
    // SDK 상태 확인
    checkSDKStatus() {
        console.log('=== 카카오 SDK 상태 확인 ===');
        console.log('Kakao 객체 존재:', !!window.Kakao);
        
        if (window.Kakao) {
            console.log('초기화 상태:', window.Kakao.isInitialized());
            console.log('Auth 존재:', !!window.Kakao.Auth);
            console.log('API 존재:', !!window.Kakao.API);
            
            if (window.Kakao.Auth) {
                console.log('Auth.login 함수 존재:', typeof window.Kakao.Auth.login);
                console.log('Auth.authorize 함수 존재:', typeof window.Kakao.Auth.authorize);
                console.log('Auth 객체 전체:', Object.keys(window.Kakao.Auth));
            }
            
            if (window.Kakao.API) {
                console.log('API.request 함수 존재:', typeof window.Kakao.API.request);
            }
        }
        console.log('=========================');
    },

    // 간단한 로그인 테스트
    async testLogin() {
        console.log('=== 카카오 로그인 테스트 ===');
        
        if (!window.Kakao) {
            console.error('Kakao 객체가 없습니다');
            return;
        }

        if (!window.Kakao.isInitialized()) {
            console.log('SDK 초기화 시도...');
            window.Kakao.init(CONFIG.KAKAO.JAVASCRIPT_KEY);
        }

        if (!window.Kakao.Auth) {
            console.error('Kakao.Auth가 없습니다');
            return;
        }

        if (!window.Kakao.Auth.authorize && !window.Kakao.Auth.login) {
            console.error('Kakao.Auth.authorize 또는 login 함수가 없습니다');
            return;
        }

        try {
            console.log('로그인 시도...');
            
            if (window.Kakao.Auth.authorize) {
                console.log('authorize 함수 사용');
                window.Kakao.Auth.authorize({
                    redirectUri: `${window.location.origin}/oauth.html`
                });
            } else if (window.Kakao.Auth.login) {
                console.log('login 함수 사용');
                window.Kakao.Auth.login({
                    success: (authObj) => {
                        console.log('로그인 성공:', authObj);
                    },
                    fail: (err) => {
                        console.error('로그인 실패:', err);
                    }
                });
            }
        } catch (error) {
            console.error('로그인 호출 중 오류:', error);
        }
    },

    // 현재 토큰 확인
    checkToken() {
        if (window.Kakao && window.Kakao.Auth) {
            const token = window.Kakao.Auth.getAccessToken();
            console.log('현재 액세스 토큰:', token);
        } else {
            console.log('Kakao.Auth를 사용할 수 없습니다');
        }
    }
};

// 페이지 로드시 자동 실행
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.debugKakao.checkSDKStatus();
    }, 1000);
});