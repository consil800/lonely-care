/**
 * 카카오 로그인 간단 버전 - 2025-08-27 작동 버전 기반
 * 복잡한 기능 제거하고 기본 로그인만 구현
 */
class KakaoAuthSimple {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.APP_KEY = 'dd74fd58abbb75eb58df11ecc92d6727';
        
        console.log('🔐 카카오 간단 인증 모듈 시작');
        this.init();
    }

    /**
     * 카카오 SDK 초기화
     */
    async init() {
        try {
            await this.waitForKakaoSDK();
            
            if (window.Kakao.isInitialized()) {
                window.Kakao.cleanup();
            }
            
            window.Kakao.init(this.APP_KEY);
            this.isInitialized = true;
            
            console.log('✅ 카카오 SDK 초기화 완료');
            
            // 기존 로그인 상태 확인
            this.checkExistingLogin();
            
        } catch (error) {
            console.error('❌ 카카오 SDK 초기화 실패:', error);
        }
    }

    /**
     * 카카오 SDK 로드 대기
     */
    async waitForKakaoSDK() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.Kakao && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.Kakao) {
            throw new Error('카카오 SDK 로드 실패');
        }
    }

    /**
     * 기존 로그인 상태 확인
     */
    checkExistingLogin() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('✅ 기존 로그인 상태 복원:', this.currentUser.nickname);
                return true;
            } catch (error) {
                console.log('기존 로그인 상태 복원 실패:', error.message);
                localStorage.removeItem('currentUser');
            }
        }
        return false;
    }

    /**
     * 카카오 로그인 - JavaScript SDK 방식
     */
    async login() {
        if (!this.isInitialized) {
            throw new Error('카카오 SDK가 초기화되지 않았습니다');
        }

        console.log('🚀 카카오 로그인 시작...');
        console.log('사용 가능한 Kakao 메서드:', Object.keys(window.Kakao));
        if (window.Kakao.Auth) {
            console.log('사용 가능한 Auth 메서드:', Object.keys(window.Kakao.Auth));
        }

        // SDK 2.1.0에서는 OAuth 팝업 방식 사용
        return new Promise((resolve, reject) => {
            try {
                console.log('🚀 SDK 2.1.0 OAuth 팝업 방식으로 로그인 시도...');
                this.tryPopupLogin(resolve, reject);
            } catch (error) {
                console.error('❌ 로그인 시도 중 예외:', error);
                reject(new Error('카카오 로그인 초기화 실패: ' + error.message));
            }
        });
    }

    /**
     * 대안 로그인 방법
     */
    tryAlternativeLogin(resolve, reject) {
        try {
            // SDK 2.1.0에서는 authorize가 redirect만 지원하므로 바로 팝업 방식으로
            console.log('🔄 SDK 2.1.0 감지 - 팝업 방식으로 직접 이동...');
            this.tryPopupLogin(resolve, reject);
        } catch (error) {
            console.error('❌ 대안 로그인 실패:', error);
            reject(new Error('모든 로그인 방식 실패'));
        }
    }

    /**
     * 팝업 로그인 방법
     */
    tryPopupLogin(resolve, reject) {
        try {
            console.log('🔄 팝업 방식 시도...');
            const redirectUri = 'http://localhost:5650/oauth.html';
            const popup = window.open(
                `https://kauth.kakao.com/oauth/authorize?client_id=${this.APP_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`,
                'kakao-login',
                'width=400,height=500,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'));
                return;
            }

            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    reject(new Error('로그인이 취소되었습니다.'));
                }
            }, 1000);

            // 메시지 리스너 설정
            const messageHandler = (event) => {
                if (event.origin !== window.location.origin) return;
                
                clearInterval(checkClosed);
                popup.close();
                window.removeEventListener('message', messageHandler);

                if (event.data.success) {
                    console.log('✅ 팝업 로그인 성공');
                    this.handleAuthCode(event.data.code, resolve, reject);
                } else {
                    reject(new Error(event.data.error || '로그인 실패'));
                }
            };

            window.addEventListener('message', messageHandler);

        } catch (error) {
            console.error('❌ 팝업 로그인 실패:', error);
            reject(new Error('팝업 로그인 실패: ' + error.message));
        }
    }

    /**
     * 인증 코드 처리
     */
    async handleAuthCode(code, resolve, reject) {
        try {
            // 토큰 교환
            const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: this.APP_KEY,
                    redirect_uri: 'http://localhost:5650/oauth.html',
                    code: code
                })
            });

            const tokenData = await tokenResponse.json();
            
            if (tokenData.error) {
                throw new Error(tokenData.error_description);
            }

            console.log('✅ 토큰 획득 성공:', tokenData);

            // 사용자 정보 요청
            const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                }
            });

            const userData = await userResponse.json();
            console.log('✅ 사용자 정보 획득:', userData);

            const user = {
                id: userData.id,
                kakao_id: userData.id,
                nickname: userData.kakao_account?.profile?.nickname || '카카오 사용자',
                email: userData.kakao_account?.email || '',
                profile_image: userData.kakao_account?.profile?.profile_image_url || '',
                source: 'kakao_simple',
                access_token: tokenData.access_token
            };

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));

            console.log('✅ 로그인 완료:', user);
            resolve(user);

        } catch (error) {
            console.error('❌ 인증 코드 처리 실패:', error);
            reject(new Error('인증 처리 실패: ' + error.message));
        }
    }

    /**
     * 사용자 정보 가져오기
     */
    getUserInfo(resolve, reject) {
        window.Kakao.API.request({
            url: '/v2/user/me',
            success: (response) => {
                console.log('✅ 사용자 정보 획득:', response);
                
                const user = {
                    id: response.id,
                    kakao_id: response.id,
                    nickname: response.kakao_account?.profile?.nickname || '카카오 사용자',
                    email: response.kakao_account?.email || '',
                    profile_image: response.kakao_account?.profile?.profile_image_url || '',
                    source: 'kakao_simple'
                };
                
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                console.log('✅ 로그인 완료:', user);
                resolve(user);
            },
            fail: (error) => {
                console.error('❌ 사용자 정보 획득 실패:', error);
                reject(new Error('사용자 정보를 가져올 수 없습니다'));
            }
        });
    }

    /**
     * 로그아웃
     */
    async logout() {
        try {
            if (window.Kakao && window.Kakao.Auth) {
                return new Promise((resolve) => {
                    window.Kakao.Auth.logout(() => {
                        console.log('✅ 카카오 로그아웃 완료');
                        resolve();
                    });
                });
            }
            
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            
            console.log('✅ 로그아웃 완료');
            
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
        }
    }

    /**
     * 현재 사용자 반환
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 로그인 상태 확인
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// 전역으로 내보내기
window.KakaoAuthSimple = KakaoAuthSimple;