class KakaoAuth {
    constructor() {
        this.isInitialized = false;
        this.initPromise = null;
        this.init();
    }

    // 카카오 SDK 초기화
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this._performInit();
        return this.initPromise;
    }
    
    async _performInit() {
        try {
            console.log('🔄 카카오 SDK 초기화 시작...');
            
            // Android WebView 환경에서도 SDK 초기화 필요
            if (this.isAndroidWebView()) {
                console.log('📱 Android WebView 환경 감지됨 - SDK 초기화 진행');
                // WebView에서도 JavaScript SDK 초기화가 필요함
            }
            
            // 카카오 SDK가 로드될 때까지 대기
            await this.waitForKakaoSDK();
            
            // 카카오 SDK 초기화
            if (window.Kakao) {
                // 강제로 재초기화
                if (window.Kakao.isInitialized()) {
                    window.Kakao.cleanup();
                }
                window.Kakao.init(CONFIG.KAKAO.JAVASCRIPT_KEY);
                
                // API 로드 확인
                if (window.Kakao.Auth && window.Kakao.API) {
                    this.isInitialized = true;
                    console.log('✅ 카카오 SDK 초기화 완료');
                } else {
                    console.error('❌ 카카오 Auth 또는 API가 로드되지 않았습니다.');
                    this.isInitialized = false;
                }
            }
        } catch (error) {
            console.error('❌ 카카오 SDK 초기화 실패:', error);
            this.isInitialized = false;
        }
    }
    
    // Android WebView 환경 확인 (개선된 감지 로직)
    isAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        
        // 명확한 Android WebView 감지
        const hasWebViewMarker = userAgent.indexOf('wv') > -1;
        const hasAndroidBridge = !!window.AndroidBridge;
        const hasWebkitHandler = !!window.webkit?.messageHandlers;
        
        // Android WebView가 아닌 경우를 명시적으로 제외
        const isDesktopBrowser = userAgent.indexOf('Windows') > -1 || 
                                 userAgent.indexOf('Macintosh') > -1 || 
                                 userAgent.indexOf('Linux') > -1;
        const isMobileBrowser = userAgent.indexOf('Mobile') > -1 && 
                               userAgent.indexOf('Chrome') > -1 && 
                               !hasWebViewMarker && 
                               !hasAndroidBridge;
        
        // 확실한 WebView 환경인 경우만 true 반환
        const isWebView = (hasWebViewMarker || hasAndroidBridge || hasWebkitHandler) && 
                         !isDesktopBrowser && 
                         !isMobileBrowser;
                         
        console.log(`🔍 환경 감지 결과:`, {
            userAgent: userAgent.substring(0, 50) + '...',
            hasWebViewMarker,
            hasAndroidBridge,
            hasWebkitHandler,
            isDesktopBrowser,
            isMobileBrowser,
            finalResult: isWebView ? 'WebView' : 'Browser'
        });
        
        return isWebView;
    }

    // 카카오 SDK 로드 대기 (최적화: 5초 → 2초)
    waitForKakaoSDK() {
        return new Promise((resolve, reject) => {
            if (window.Kakao) {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 40; // 50 → 40 (2초 최대 대기)
            const checkInterval = 50; // 100ms → 50ms (더 빠른 체크)
            
            const checkSDK = () => {
                attempts++;
                
                if (window.Kakao) {
                    console.log(`✅ 카카오 SDK 로드 완료 (${attempts * checkInterval}ms 소요)`);
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkSDK, checkInterval);
                } else {
                    console.error(`❌ 카카오 SDK 로드 실패 (${maxAttempts * checkInterval}ms 타임아웃)`);
                    reject(new Error('카카오 SDK 로드 실패'));
                }
            };
            
            checkSDK();
        });
    }

    // 카카오 로그인 (WebView 최적화)
    async login() {
        console.log('🚀 카카오 로그인 시작...');
        
        // Android WebView 환경에서는 네이티브 로그인만 사용
        if (this.isAndroidWebView()) {
            console.log('📱 Android WebView 환경 - 네이티브 로그인만 허용');
            
            if (window.AndroidBridge) {
                console.log('🔑 Android 네이티브 카카오 로그인 시작...');
                try {
                    window.AndroidBridge.loginWithKakao();
                    
                    // 네이티브 로그인 결과 대기 (Promise 형태로 반환)
                    return new Promise((resolve, reject) => {
                        // 성공 콜백 설정
                        window.kakaoNativeSuccess = (userData) => {
                            console.log('✅ 네이티브 로그인 성공:', userData);
                            delete window.kakaoNativeSuccess;
                            resolve({
                                success: true,
                                userInfo: userData,
                                source: 'native'
                            });
                        };
                        
                        // 에러 콜백 설정  
                        window.onKakaoLoginError = (error) => {
                            console.error('❌ 네이티브 로그인 실패:', error);
                            delete window.kakaoNativeSuccess;
                            delete window.onKakaoLoginError;
                            reject(new Error(error));
                        };
                        
                        // 타임아웃 설정 (5초) - 15초 → 5초로 단축
                        setTimeout(() => {
                            if (window.kakaoNativeSuccess) {
                                delete window.kakaoNativeSuccess;
                                delete window.onKakaoLoginError;
                                console.log('⏰ 네이티브 로그인 5초 타임아웃 → 웹 로그인으로 전환');
                                reject(new Error('네이티브 카카오 로그인 시간 초과. 웹 로그인으로 전환합니다.'));
                            }
                        }, 5000);
                    });
                    
                } catch (error) {
                    console.error('❌ Android 네이티브 로그인 호출 실패:', error);
                    throw new Error('네이티브 로그인을 시작할 수 없습니다: ' + error.message);
                }
            } else {
                console.error('❌ AndroidBridge를 찾을 수 없습니다');
                throw new Error('Android 환경이지만 네이티브 브리지가 없습니다. 앱을 다시 시작해주세요.');
            }
        }
        
        // 웹 브라우저 환경에서만 웹 OAuth 사용
        console.log('🌐 웹 브라우저 환경 - 웹 OAuth 로그인 시작');
        return this.loginWithWebOAuth();
    }
    
    // 웹 기반 OAuth 로그인 (원래 작동하던 방식)
    async loginWithWebOAuth() {
        return new Promise((resolve, reject) => {
            // WebView 환경 체크
            if (window.location.protocol === 'file:') {
                console.log('📱 WebView 환경 - 네이티브 로그인 우선');
                reject(new Error('WebView에서는 네이티브 로그인을 사용해주세요.'));
                return;
            }
            
            console.log('🌐 웹 브라우저 환경 - SDK 로그인');
            
            // 카카오 SDK 확인
            if (!window.Kakao || !window.Kakao.Auth) {
                reject(new Error('카카오 SDK가 로드되지 않았습니다.'));
                return;
            }
            
            // SDK 초기화 확인
            if (!window.Kakao.isInitialized()) {
                window.Kakao.init(CONFIG.KAKAO.JAVASCRIPT_KEY);
            }
            
            // OAuth 팝업으로 로그인
            try {
                // 🚨 생명구조 시스템: 카카오 OAuth 포트 확인 및 안내
                const currentPort = window.location.port;
                const requiredPort = '5650'; // CLAUDE.md에서 명시한 필수 포트
                const registeredPorts = ['5650', '5500']; // 카카오에 등록된 포트들 (5650 우선)
                
                let redirectUri;
                if (currentPort === requiredPort) {
                    // 올바른 포트 사용 중
                    redirectUri = `http://127.0.0.1:${currentPort}/lonely-care/oauth.html`;
                    console.log(`✅ [생명구조] 올바른 포트 ${currentPort} 사용 중`);
                } else if (registeredPorts.includes(currentPort)) {
                    // 등록된 다른 포트 사용 중
                    redirectUri = `http://127.0.0.1:${currentPort}/lonely-care/oauth.html`;
                    console.warn(`⚠️ [생명구조] 포트 ${currentPort} 사용 중 - 포트 ${requiredPort} 권장`);
                } else {
                    // 🚨 중요: 포트 불일치 - 사용자에게 명확한 안내
                    console.error(`❌ [생명구조] 포트 불일치 오류 감지!`);
                    console.error(`   현재 포트: ${currentPort}`);
                    console.error(`   필수 포트: ${requiredPort}`);
                    console.error(`   등록된 포트들: ${registeredPorts.join(', ')}`);
                    
                    // 🚨 생명구조 시스템: 사용자 친화적 포트 안내 및 자동 리다이렉트 옵션
                    const correctUrl = `http://127.0.0.1:${requiredPort}${window.location.pathname}`;
                    const errorMessage = `🚨 카카오 로그인을 위해서는 포트 ${requiredPort}을 사용해야 합니다.\n\n` +
                        `현재 포트: ${currentPort}\n` +
                        `필요한 포트: ${requiredPort}\n\n` +
                        `해결 방법:\n` +
                        `1. 서버를 중지하세요 (Ctrl+C)\n` +
                        `2. 다음 명령어로 다시 시작하세요:\n` +
                        `   python -m http.server ${requiredPort}\n` +
                        `3. 브라우저에서 다음 URL로 접속하세요:\n` +
                        `   ${correctUrl}\n\n` +
                        `이는 카카오 개발자 콘솔에 등록된 redirect URI와 일치시키기 위함입니다.\n\n` +
                        `확인을 누르면 올바른 포트로 이동을 시도합니다.`;
                    
                    // 콘솔에 상세 정보 출력
                    console.error(errorMessage);
                    console.error(`🔗 [생명구조] 올바른 URL: ${correctUrl}`);
                    
                    // 사용자에게 선택권 제공
                    const userChoice = confirm(errorMessage + '\n\n올바른 포트로 이동하시겠습니까?');
                    
                    if (userChoice) {
                        console.log(`🔄 [생명구조] 포트 ${requiredPort}으로 리다이렉트 시도`);
                        try {
                            window.location.href = correctUrl;
                        } catch (redirectError) {
                            console.error('❌ [생명구조] 자동 리다이렉트 실패:', redirectError);
                            alert(`자동 이동에 실패했습니다.\n수동으로 다음 URL로 이동해주세요:\n${correctUrl}`);
                        }
                    }
                    
                    // 오류와 함께 reject
                    reject(new Error(`포트 불일치: 현재 ${currentPort}, 필요 ${requiredPort}`));
                    return;
                }
                
                console.log('🎯 사용할 Redirect URI:', redirectUri);
                
                const authUrl = `https://kauth.kakao.com/oauth/authorize?` +
                    `client_id=${CONFIG.KAKAO.JAVASCRIPT_KEY}&` +
                    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `response_type=code&` +
                    `scope=profile_nickname,profile_image,account_email`;
                
                const popup = window.open(authUrl, 'kakao_login', 'width=500,height=600');
                
                if (!popup) {
                    reject(new Error('팝업이 차단되었습니다.'));
                    return;
                }
                
                // 팝업 완료 대기
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        
                        // localStorage에서 결과 확인
                        const result = localStorage.getItem('kakao_auth_result');
                        if (result) {
                            const authResult = JSON.parse(result);
                            localStorage.removeItem('kakao_auth_result');
                            
                            if (authResult.success) {
                                resolve(authResult);
                            } else {
                                reject(new Error(authResult.error || '로그인 실패'));
                            }
                        } else {
                            reject(new Error('로그인이 취소되었습니다.'));
                        }
                    }
                }, 1000);
                
            } catch (error) {
                reject(new Error('로그인 팝업을 열 수 없습니다.'));
            }
        });
    }

    // OAuth 콜백 처리
    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (!code) {
            throw new Error('인증 코드가 없습니다.');
        }
        
        console.log('🔑 인증 코드 획득:', code.substring(0, 10) + '...');
        
        // Access Token 요청
        const tokenResponse = await this.exchangeCodeForToken(code);
        
        if (!tokenResponse.access_token) {
            throw new Error('액세스 토큰 획득 실패');
        }
        
        console.log('✅ 액세스 토큰 획득 성공');
        
        // 사용자 정보 획득
        const userInfo = await this.getUserInfoWithToken(tokenResponse.access_token);
        
        return {
            success: true,
            userInfo: userInfo,
            accessToken: tokenResponse.access_token
        };
    }
    
    // 인증 코드를 액세스 토큰으로 교환
    async exchangeCodeForToken(code) {
        const tokenUrl = 'https://kauth.kakao.com/oauth/token';
        const redirectUri = `${window.location.origin}/oauth.html`;
        
        const params = {
            grant_type: 'authorization_code',
            client_id: CONFIG.KAKAO.REST_API_KEY,
            redirect_uri: redirectUri,
            code: code
        };
        
        const formData = new URLSearchParams(params);
        
        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`토큰 요청 실패: ${response.status}`);
            }
            
            const tokenData = await response.json();
            console.log('🎫 토큰 획득:', { access_token: tokenData.access_token ? '✓' : '✗' });
            
            return tokenData;
        } catch (error) {
            console.error('❌ 토큰 교환 실패:', error);
            throw new Error(`토큰 교환 실패: ${error.message}`);
        }
    }
    
    // 액세스 토큰으로 사용자 정보 가져오기
    async getUserInfoWithToken(accessToken) {
        const userInfoUrl = 'https://kapi.kakao.com/v2/user/me';
        
        try {
            const response = await fetch(userInfoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`사용자 정보 요청 실패: ${response.status}`);
            }
            
            const userData = await response.json();
            console.log('👤 사용자 정보:', userData);
            
            const userInfo = {
                id: userData.id,
                // UserIdUtils로 정규화된 ID 사용 (중복 방지)
                kakao_id: UserIdUtils.normalizeKakaoId(userData.id),
                username: `kakao_${UserIdUtils.normalizeKakaoId(userData.id)}`,
                name: userData.kakao_account?.profile?.nickname || '카카오 사용자',
                nickname: userData.kakao_account?.profile?.nickname || '카카오 사용자',
                email: userData.kakao_account?.email || '',
                profile_image: userData.kakao_account?.profile?.profile_image_url || null,
                provider: 'kakao'
            };
            
            return userInfo;
        } catch (error) {
            console.error('❌ 사용자 정보 조회 실패:', error);
            throw new Error(`사용자 정보 조회 실패: ${error.message}`);
        }
    }
    
    // 사용자 정보 가져오기 (기존 SDK 방식)
    getUserInfo() {
        return new Promise((resolve, reject) => {
            // API 존재 여부 확인
            if (!window.Kakao?.API?.request) {
                reject(new Error('카카오 API가 로드되지 않았습니다.'));
                return;
            }

            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (response) => {
                    console.log('사용자 정보:', response);
                    
                    const userInfo = {
                        id: response.id,
                        // UserIdUtils로 정규화된 ID 사용 (중복 방지)
                        kakao_id: UserIdUtils.normalizeKakaoId(response.id),
                        username: `kakao_${UserIdUtils.normalizeKakaoId(response.id)}`,
                        name: response.kakao_account?.profile?.nickname || '카카오 사용자',
                        nickname: response.kakao_account?.profile?.nickname || '카카오 사용자',
                        email: response.kakao_account?.email || '',
                        profile_image: response.kakao_account?.profile?.profile_image_url || null,
                        provider: 'kakao'
                    };
                    
                    resolve(userInfo);
                },
                fail: (error) => {
                    console.error('사용자 정보 조회 실패:', error);
                    reject(new Error('사용자 정보를 가져올 수 없습니다.'));
                }
            });
        });
    }

    // 카카오 로그아웃
    async logout() {
        if (!this.isInitialized) {
            return;
        }

        return new Promise((resolve) => {
            window.Kakao.Auth.logout(() => {
                console.log('카카오 로그아웃 완료');
                resolve();
            });
        });
    }

    // 카카오 연결 해제
    async unlink() {
        if (!this.isInitialized) {
            return;
        }

        return new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v1/user/unlink',
                success: (response) => {
                    console.log('카카오 연결 해제 완료:', response);
                    resolve(response);
                },
                fail: (error) => {
                    console.error('카카오 연결 해제 실패:', error);
                    reject(error);
                }
            });
        });
    }

    // 로그인 상태 확인
    isLoggedIn() {
        if (!this.isInitialized || !window.Kakao.Auth) {
            return false;
        }

        const token = window.Kakao.Auth.getAccessToken();
        return !!token;
    }

    // 액세스 토큰 가져오기
    getAccessToken() {
        if (!this.isInitialized || !window.Kakao.Auth) {
            return null;
        }

        return window.Kakao.Auth.getAccessToken();
    }

    // 토큰 갱신
    async refreshToken() {
        if (!this.isInitialized) {
            throw new Error('카카오 SDK가 초기화되지 않았습니다.');
        }

        return new Promise((resolve, reject) => {
            window.Kakao.Auth.refreshAccessToken({
                success: (response) => {
                    console.log('토큰 갱신 성공:', response);
                    resolve(response);
                },
                fail: (error) => {
                    console.error('토큰 갱신 실패:', error);
                    reject(error);
                }
            });
        });
    }
}

// WebView OAuth 완료 후 결과 처리용 함수 (전역)
window.handleKakaoOAuthResult = function(result) {
    console.log('🎯 OAuth 결과 수신:', result);
    localStorage.setItem('kakao_auth_result', JSON.stringify(result));
    
    // storage 이벤트 트리거
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'kakao_auth_result',
        newValue: JSON.stringify(result),
        storageArea: localStorage
    }));
};

// 전역 인스턴스
let kakaoAuth;