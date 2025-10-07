// 카카오 로그인 대체 구현
class KakaoAuthFallback {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.waitForKakaoSDK();
            
            if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init(CONFIG.KAKAO.JAVASCRIPT_KEY);
            }
            
            this.isInitialized = true;
            console.log('카카오 SDK 대체 초기화 완료');
        } catch (error) {
            console.error('카카오 SDK 초기화 실패:', error);
        }
    }

    waitForKakaoSDK() {
        return new Promise((resolve, reject) => {
            if (window.Kakao) {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 50;
            
            const checkSDK = () => {
                if (window.Kakao) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkSDK, 100);
                } else {
                    reject(new Error('카카오 SDK 로드 실패'));
                }
            };
            
            checkSDK();
        });
    }

    // 직접 카카오 로그인 팝업 열기
    async loginWithPopup() {
        const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
        // 현재 경로를 기반으로 올바른 oauth.html 경로 생성
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/lonely-care/') ? '/lonely-care' : '';
        
        const params = new URLSearchParams({
            client_id: CONFIG.KAKAO.REST_API_KEY,
            redirect_uri: `${window.location.origin}${basePath}/oauth.html`,
            response_type: 'code',
            scope: 'profile_nickname,profile_image,account_email'
        });

        const popupUrl = `${baseUrl}?${params.toString()}`;
        
        return new Promise((resolve, reject) => {
            const popup = window.open(
                popupUrl, 
                'kakao_login',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                reject(new Error('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.'));
                return;
            }

            // 팝업에서 메시지를 받기 위한 리스너
            const messageListener = (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === 'KAKAO_AUTH_SUCCESS') {
                    window.removeEventListener('message', messageListener);
                    popup.close();
                    resolve(event.data.code);
                } else if (event.data.type === 'KAKAO_AUTH_ERROR') {
                    window.removeEventListener('message', messageListener);
                    popup.close();
                    reject(new Error(event.data.error || '카카오 로그인에 실패했습니다.'));
                }
            };

            window.addEventListener('message', messageListener);

            // 팝업이 닫혔는지 확인
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageListener);
                    reject(new Error('사용자가 로그인을 취소했습니다.'));
                }
            }, 1000);
        });
    }

    // 인증 코드로 토큰 교환 및 사용자 정보 가져오기
    async exchangeCodeForUserInfo(code) {
        try {
            console.log('토큰 교환 시작, 코드:', code);
            
            // 현재 경로를 기반으로 올바른 oauth.html 경로 생성
            const currentPath = window.location.pathname;
            const basePath = currentPath.includes('/lonely-care/') ? '/lonely-care' : '';
            
            // 토큰 교환
            const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CONFIG.KAKAO.REST_API_KEY,
                    redirect_uri: `${window.location.origin}${basePath}/oauth.html`,
                    code: code
                })
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                console.error('토큰 교환 실패:', errorData);
                throw new Error('토큰 교환 실패');
            }

            const tokenData = await tokenResponse.json();
            console.log('토큰 교환 성공:', tokenData);
            const accessToken = tokenData.access_token;

            // 사용자 정보 가져오기
            const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.text();
                console.error('사용자 정보 조회 실패:', errorData);
                throw new Error('사용자 정보 조회 실패');
            }

            const userData = await userResponse.json();
            console.log('사용자 정보 조회 성공:', userData);
            
            return {
                id: userData.id,
                // UserIdUtils로 정규화된 ID 사용 (중복 방지)
                kakao_id: UserIdUtils.normalizeKakaoId(userData.id),
                username: `kakao_${UserIdUtils.normalizeKakaoId(userData.id)}`,
                name: userData.kakao_account?.profile?.nickname || '카카오 사용자',
                email: userData.kakao_account?.email || '',
                profileImage: userData.kakao_account?.profile?.profile_image_url || null,
                provider: 'kakao'
            };

        } catch (error) {
            console.error('사용자 정보 교환 실패:', error);
            throw new Error('사용자 정보를 가져올 수 없습니다.');
        }
    }

    // 통합 로그인 메서드
    async login() {
        try {
            // 1. SDK를 통한 로그인 시도
            if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.login) {
                console.log('SDK 로그인 시도');
                return await this.loginWithSDK();
            }
            
            // 2. 직접 OAuth 플로우 사용
            console.log('직접 OAuth 로그인 시도');
            const code = await this.loginWithPopup();
            const userInfo = await this.exchangeCodeForUserInfo(code);
            return userInfo;

        } catch (error) {
            console.error('카카오 로그인 실패:', error);
            throw error;
        }
    }

    // SDK를 통한 로그인 (원래 방식)
    loginWithSDK() {
        return new Promise((resolve, reject) => {
            window.Kakao.Auth.login({
                success: async (authObj) => {
                    try {
                        const userInfo = await this.getUserInfoFromSDK();
                        resolve(userInfo);
                    } catch (error) {
                        reject(error);
                    }
                },
                fail: (err) => {
                    reject(new Error('카카오 SDK 로그인에 실패했습니다.'));
                }
            });
        });
    }

    getUserInfoFromSDK() {
        return new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (response) => {
                    const userInfo = {
                        id: response.id,
                        // UserIdUtils로 정규화된 ID 사용 (중복 방지)
                        kakao_id: UserIdUtils.normalizeKakaoId(response.id),
                        username: `kakao_${UserIdUtils.normalizeKakaoId(response.id)}`,
                        name: response.kakao_account?.profile?.nickname || '카카오 사용자',
                        email: response.kakao_account?.email || '',
                        profileImage: response.kakao_account?.profile?.profile_image_url || null,
                        provider: 'kakao'
                    };
                    resolve(userInfo);
                },
                fail: (error) => {
                    reject(new Error('사용자 정보를 가져올 수 없습니다.'));
                }
            });
        });
    }
}

// 전역 인스턴스
let kakaoAuthFallback;