/**
 * 카카오 로그인 독립형 모듈 - Android WebView 최적화
 */
class KakaoAuthStandalone {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.APP_KEY = 'dd74fd58abbb75eb58df11ecc92d6727'; // 웹용 JavaScript 키
        
        console.log('🔐 카카오 독립형 인증 모듈 시작');
        this.init();
    }

    /**
     * 카카오 SDK 초기화 (🚨 생명구조 최적화)
     */
    async init() {
        try {
            // 즉시 SDK 확인 및 초기화
            if (window.Kakao) {
                if (window.Kakao.isInitialized()) {
                    window.Kakao.cleanup();
                }
                window.Kakao.init(this.APP_KEY);
                this.isInitialized = true;
                console.log('✅ 카카오 독립형 SDK 초기화 완료');
                return;
            }
            
            // SDK가 없으면 짧게 대기 후 OAuth 사용
            await this.waitForKakaoSDK();
            
            if (window.Kakao) {
                if (window.Kakao.isInitialized()) {
                    window.Kakao.cleanup();
                }
                window.Kakao.init(this.APP_KEY);
                this.isInitialized = true;
                console.log('✅ 카카오 독립형 SDK 초기화 완료');
            }
            
        } catch (error) {
            console.warn('⚠️ 카카오 독립형 SDK 초기화 실패 - OAuth 대체 사용:', error.message);
        }
    }

    /**
     * 카카오 SDK 로드 대기 (🚨 생명구조 최적화: 최대 0.5초)
     */
    async waitForKakaoSDK() {
        // SDK가 이미 로드되어 있다면 즉시 리턴
        if (window.Kakao) {
            console.log('✅ 카카오 SDK 이미 준비됨');
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 5; // 생명구조 최적화: 최대 0.25초 (5 × 50ms)
        const checkInterval = 50; // 50ms
        
        while (!window.Kakao && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            attempts++;
        }
        
        if (!window.Kakao) {
            console.warn(`⚠️ 카카오 SDK 로드 실패 (${maxAttempts * checkInterval}ms) - OAuth 대체 방식 사용`);
            // 에러를 throw하지 않고 OAuth 방식으로 대체
        }
    }

    /**
     * 카카오 로그인 실행 - 웹 환경 우선, WebView는 fallback
     */
    async login() {
        try {
            console.log('🔐 카카오 독립형 로그인 시작...');
            
            // 🚨 생명구조 최적화: 즉시 로그인 시도
            // 1순위: 웹 환경 OAuth (KOE006 오류 회피)
            if (this.isLocalServerAvailable()) {
                console.log('🌐 로컬 서버 감지 - 웹 환경 OAuth 사용');
                return this.loginWithWebOAuth();
            }
            
            // 2순위: Android WebView 환경인 경우 OAuth 리다이렉트 방식 사용
            if (window.location.protocol === 'file:' || this.isAndroidWebView()) {
                console.log('📱 WebView 환경 감지 - OAuth 리다이렉트 방식 사용');
                return this.loginWithOAuthRedirect();
            }
            
            // 웹 환경에서만 SDK 방식 사용
            if (!this.isInitialized) {
                await this.init();
            }

            return new Promise((resolve, reject) => {
                // Kakao.Auth.login이 존재하는지 확인
                if (!window.Kakao || !window.Kakao.Auth || typeof window.Kakao.Auth.login !== 'function') {
                    console.error('❌ Kakao.Auth.login 메서드를 찾을 수 없습니다. OAuth 리다이렉트로 전환합니다.');
                    this.loginWithOAuthRedirect().then(resolve).catch(reject);
                    return;
                }
                
                window.Kakao.Auth.login({
                    success: async (authObj) => {
                        console.log('✅ 카카오 인증 성공:', authObj);
                        
                        try {
                            const userInfo = await this.getUserInfo();
                            resolve(userInfo);
                        } catch (error) {
                            console.error('❌ 사용자 정보 조회 실패:', error);
                            reject(error);
                        }
                    },
                    fail: (error) => {
                        console.error('❌ 카카오 로그인 실패:', error);
                        reject(new Error('카카오 로그인에 실패했습니다: ' + (error.error_description || error.message || '알 수 없는 오류')));
                    }
                });
            });

        } catch (error) {
            console.error('❌ 카카오 독립형 로그인 오류:', error);
            throw error;
        }
    }
    
    /**
     * Android WebView 환경 확인
     */
    isAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || 
               window.AndroidBridge || 
               window.webkit?.messageHandlers;
    }
    
    /**
     * 로컬 서버 사용 가능 여부 확인 (웹 환경 OAuth 활성화)
     */
    isLocalServerAvailable() {
        const hostname = window.location.hostname;
        const hasLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const canAccessLocalhost = window.location.protocol === 'file:' && window.AndroidBridge;
        
        console.log('✅ 웹 환경 OAuth 활성화 (JavaScript 키 사용 중)');
        return hasLocalhost || canAccessLocalhost;
    }
    
    /**
     * 웹 환경에서 OAuth 로그인 (KOE006 오류 회피)
     */
    loginWithWebOAuth() {
        console.log('🌐 웹 환경 OAuth 로그인 시작 (KOE006 회피)');
        
        const currentPort = window.location.port || '5650';
        const redirectUri = `http://127.0.0.1:${currentPort}/lonely-care/oauth.html`;
        
        const authUrl = 'https://kauth.kakao.com/oauth/authorize' + 
            '?client_id=' + this.APP_KEY + 
            '&redirect_uri=' + encodeURIComponent(redirectUri) + 
            '&response_type=code' + 
            '&scope=profile_nickname,profile_image,account_email';
        
        console.log('🔄 웹 환경 OAuth URL:', authUrl);
        console.log('📍 리다이렉트 URI:', redirectUri);
        
        // 웹 환경에서 직접 리다이렉트
        window.location.href = authUrl;
        
        return new Promise(() => {}); // oauth.html에서 처리됨
    }
    
    /**
     * OAuth 리다이렉트 방식 로그인
     */
    loginWithOAuthRedirect() {
        console.log('🌐 OAuth 리다이렉트 방식으로 로그인 시작');
        
        // 타임아웃 설정 - AndroidBridge 응답이 없으면 외부 브라우저로 전환
        window._kakaoNativeLoginTimeout = null;
        let hasFallbackExecuted = false;
        
        const executeExternalBrowserFallback = () => {
            if (hasFallbackExecuted) return;
            hasFallbackExecuted = true;
            
            console.log('🌐 AndroidBridge 타임아웃 또는 실패 - 외부 브라우저로 전환');
            
            if (window.AndroidBridge && typeof window.AndroidBridge.openExternalUrl === 'function') {
                // Android 환경에서는 네이티브 키 스킴 사용
                const redirectUri = `kakao${this.APP_KEY}://oauth`;
                
                const authUrl = 'https://kauth.kakao.com/oauth/authorize' + 
                    '?client_id=' + this.APP_KEY + 
                    '&redirect_uri=' + encodeURIComponent(redirectUri) + 
                    '&response_type=code' + 
                    '&scope=profile_nickname,profile_image,account_email';
                
                console.log('🔄 외부 브라우저로 OAuth URL 전달 (네이티브 키 스킴):', authUrl);
                console.log('📱 리다이렉트 URI:', redirectUri);
                window.AndroidBridge.openExternalUrl(authUrl);
                return;
            }
            
            // AndroidBridge가 없는 경우 (웹 환경), 직접 리다이렉트
            console.log('🌐 웹 환경에서 직접 리다이렉트');
            const currentPort = window.location.port || '5650';
            const redirectUri = `http://127.0.0.1:${currentPort}/lonely-care/oauth.html`;
            
            const authUrl = 'https://kauth.kakao.com/oauth/authorize' + 
                '?client_id=' + this.APP_KEY + 
                '&redirect_uri=' + encodeURIComponent(redirectUri) + 
                '&response_type=code' + 
                '&scope=profile_nickname,profile_image,account_email';
            
            console.log('🔄 카카오 OAuth 페이지로 리다이렉트:', authUrl);
            window.location.href = authUrl;
        };
        
        // 🚨 생명구조 시스템: AndroidBridge 안전성 강화
        if (window.AndroidBridge && typeof window.AndroidBridge.loginWithKakao === 'function') {
            console.log('📱 AndroidBridge를 통한 네이티브 카카오 로그인 실행 (생명구조 시스템 강화)');
            
            // 🚨 중요: 10초로 설정하여 네이티브 로그인에 충분한 시간 제공
            window._kakaoNativeLoginTimeout = setTimeout(() => {
                console.warn('⚠️ AndroidBridge 네이티브 로그인 타임아웃 (10초)');
                executeExternalBrowserFallback();
            }, 10000);
            
            // 🚨 생명구조 우선: JavaScript 파싱 오류 감지 시스템
            const originalOnError = window.onerror;
            window.onerror = function(message, source, lineno, colno, error) {
                if (message.includes('Unexpected end of input') || message.includes('Script error')) {
                    console.error('🚨 생명구조 시스템: AndroidBridge JavaScript 파싱 오류 감지');
                    console.error('🔄 즉시 안전한 웹 OAuth로 전환합니다');
                    
                    // 타임아웃 해제
                    if (window._kakaoNativeLoginTimeout) {
                        clearTimeout(window._kakaoNativeLoginTimeout);
                    }
                    
                    // 오류 핸들러 복원
                    window.onerror = originalOnError;
                    
                    // 즉시 웹 전환
                    executeExternalBrowserFallback();
                    return true; // 오류 처리됨
                }
                
                // 다른 오류는 원래 핸들러에 전달
                if (originalOnError) {
                    return originalOnError.apply(this, arguments);
                }
                return false;
            };
            
            try {
                // 🚨 생명구조 시스템: AndroidBridge 실행 전 안전성 검증
                if (!window.AndroidBridge.loginWithKakao) {
                    throw new Error('AndroidBridge.loginWithKakao 함수가 존재하지 않습니다');
                }
                
                // 🚨 생명구조: 타임아웃 및 오류 핸들러를 전역 변수로 저장
                window._kakaoNativeLoginTimeout = window._kakaoNativeLoginTimeout;
                window._kakaoOriginalOnError = originalOnError;
                
                // 기존 onKakaoLoginSuccess가 있다면 타임아웃 해제 로직 추가
                if (window.onKakaoLoginSuccess) {
                    const originalCallback = window.onKakaoLoginSuccess;
                    window.onKakaoLoginSuccess = function(userInfo) {
                        // 오류 핸들러 복원
                        if (window._kakaoOriginalOnError) {
                            window.onerror = window._kakaoOriginalOnError;
                        }
                        
                        // 타임아웃 해제
                        if (window._kakaoNativeLoginTimeout) {
                            clearTimeout(window._kakaoNativeLoginTimeout);
                            console.log('✅ 네이티브 로그인 타임아웃 해제');
                        }
                        
                        // 원래 콜백 실행
                        return originalCallback.call(this, userInfo);
                    };
                } else {
                    // 콜백이 없는 경우 기본 처리
                    window.onKakaoLoginSuccess = (userInfo) => {
                        // 오류 핸들러 복원
                        window.onerror = originalOnError;
                        
                        if (window._kakaoNativeLoginTimeout) {
                            clearTimeout(window._kakaoNativeLoginTimeout);
                            console.log('✅ 네이티브 로그인 타임아웃 해제');
                        }
                        
                        if (window.auth && typeof window.auth.processKakaoUser === 'function') {
                            window.auth.processKakaoUser(userInfo);
                        } else {
                            console.log('⚠️ auth.processKakaoUser 함수 없음 - localStorage에 저장');
                            localStorage.setItem('pendingKakaoUser', JSON.stringify(userInfo));
                            
                            // 페이지 새로고침으로 로그인 상태 적용
                            setTimeout(() => {
                                console.log('🔄 로그인 완료 - 페이지 새로고침');
                                window.location.reload();
                            }, 1000);
                        }
                    };
                }
                
                window.onKakaoLoginFailure = (error) => {
                    // 오류 핸들러 복원
                    window.onerror = originalOnError;
                    
                    if (window._kakaoNativeLoginTimeout) {
                        clearTimeout(window._kakaoNativeLoginTimeout);
                        console.log('❌ 네이티브 로그인 타임아웃 해제 (실패)');
                    }
                    console.error('❌ AndroidBridge 네이티브 로그인 실패:', error);
                    console.log('🔄 외부 브라우저 OAuth로 자동 전환...');
                    executeExternalBrowserFallback();
                };
                
                // 🚨 생명구조 시스템: 안전한 AndroidBridge 호출
                console.log('🔐 생명구조 시스템 - AndroidBridge 네이티브 로그인 시도');
                console.log('🔍 AndroidBridge 상태:', typeof window.AndroidBridge);
                console.log('🔍 loginWithKakao 함수:', typeof window.AndroidBridge.loginWithKakao);
                
                // 🚨 생명구조 시스템: AndroidBridge 상태 상세 검증
                if (!window.AndroidBridge) {
                    console.error('🚨 생명구조 시스템: AndroidBridge가 존재하지 않습니다');
                    window.onerror = originalOnError;
                    if (window._kakaoNativeLoginTimeout) clearTimeout(window._kakaoNativeLoginTimeout);
                    executeExternalBrowserFallback();
                    return;
                }
                
                if (typeof window.AndroidBridge.loginWithKakao !== 'function') {
                    console.error('🚨 생명구조 시스템: AndroidBridge.loginWithKakao가 함수가 아닙니다');
                    window.onerror = originalOnError;
                    if (window._kakaoNativeLoginTimeout) clearTimeout(window._kakaoNativeLoginTimeout);
                    executeExternalBrowserFallback();
                    return;
                }
                
                // 🚨 생명구조 시스템: 안전한 AndroidBridge 호출 - 다단계 보호
                setTimeout(() => {
                    try {
                        console.log('🚀 생명구조 시스템: AndroidBridge.loginWithKakao() 호출 시작');
                        
                        // 🛡️ 1단계: AndroidBridge 재검증
                        if (!window.AndroidBridge) {
                            throw new Error('AndroidBridge가 사라졌습니다');
                        }
                        
                        if (typeof window.AndroidBridge.loginWithKakao !== 'function') {
                            throw new Error('loginWithKakao 함수가 사라졌습니다');
                        }
                        
                        // 🛡️ 2단계: 안전한 함수 참조 저장
                        const loginFunction = window.AndroidBridge.loginWithKakao;
                        
                        // 🛡️ 3단계: 함수 호출 전 마지막 검증
                        if (typeof loginFunction !== 'function') {
                            throw new Error('loginWithKakao 함수 참조가 유효하지 않습니다');
                        }
                        
                        // 🛡️ 4단계: 안전한 함수 호출
                        console.log('🔐 AndroidBridge.loginWithKakao 안전 호출 시작');
                        loginFunction.call(window.AndroidBridge);
                        console.log('✅ 생명구조 시스템: AndroidBridge.loginWithKakao() 호출 완료');
                        
                        // 🛡️ 5단계: 호출 성공 검증 (2초 후)
                        setTimeout(() => {
                            // 만약 2초 후에도 콜백이 호출되지 않았다면 경고
                            if (window._kakaoNativeLoginTimeout) {
                                console.log('⏳ AndroidBridge 로그인 처리 중... (2초 경과)');
                            }
                        }, 2000);
                        
                    } catch (bridgeError) {
                        console.error('🚨 AndroidBridge 안전 호출 실패:', bridgeError);
                        console.error('🚨 오류 타입:', bridgeError.name);
                        console.error('🚨 오류 메시지:', bridgeError.message);
                        
                        // 스택 트레이스는 안전하게 출력
                        try {
                            console.error('🚨 스택 트레이스:', bridgeError.stack || '스택 정보 없음');
                        } catch (stackError) {
                            console.error('🚨 스택 트레이스 출력 실패:', stackError.message);
                        }
                        
                        // 오류 복구 처리
                        try {
                            window.onerror = originalOnError;
                            if (window._kakaoNativeLoginTimeout) {
                                clearTimeout(window._kakaoNativeLoginTimeout);
                                window._kakaoNativeLoginTimeout = null;
                            }
                        } catch (cleanupError) {
                            console.error('🚨 오류 복구 처리 실패:', cleanupError.message);
                        }
                        
                        // 안전한 fallback 실행
                        try {
                            executeExternalBrowserFallback();
                        } catch (fallbackError) {
                            console.error('🚨 Fallback 실행 실패:', fallbackError.message);
                            // 최후 수단: 페이지 새로고침
                            setTimeout(() => {
                                if (window.location && window.location.reload) {
                                    console.log('🔄 최후 수단: 페이지 새로고침으로 복구 시도');
                                    window.location.reload(false);
                                }
                            }, 2000);
                        }
                    }
                }, 100);
                
                return new Promise(() => {}); // 네이티브에서 처리
            } catch (error) {
                // 오류 핸들러 복원
                window.onerror = originalOnError;
                
                if (window._kakaoNativeLoginTimeout) {
                    clearTimeout(window._kakaoNativeLoginTimeout);
                }
                console.error('❌ AndroidBridge 로그인 호출 실패:', error);
                executeExternalBrowserFallback();
                return new Promise(() => {});
            }
        } else {
            // AndroidBridge가 없는 경우 즉시 fallback 실행
            console.log('⚠️ AndroidBridge 없음 - 즉시 대체 방식 사용');
            executeExternalBrowserFallback();
        }
        
        return new Promise(() => {});
    }

    /**
     * 사용자 정보 가져오기
     */
    getUserInfo() {
        return new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (response) => {
                    console.log('✅ 카카오 사용자 정보 조회 성공:', response);
                    
                    const userInfo = {
                        id: response.id.toString(),
                        nickname: response.kakao_account?.profile?.nickname || '사용자',
                        email: response.kakao_account?.email || '',
                        profile_image: response.kakao_account?.profile?.profile_image_url || '',
                        thumbnail_image: response.kakao_account?.profile?.thumbnail_image_url || ''
                    };
                    
                    this.currentUser = userInfo;
                    resolve(userInfo);
                },
                fail: (error) => {
                    console.error('❌ 사용자 정보 조회 실패:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * 로그아웃
     */
    logout() {
        return new Promise((resolve) => {
            if (this.isInitialized && window.Kakao.Auth.getAccessToken()) {
                window.Kakao.Auth.logout(() => {
                    console.log('✅ 카카오 로그아웃 완료');
                    this.currentUser = null;
                    resolve();
                });
            } else {
                this.currentUser = null;
                resolve();
            }
        });
    }

    /**
     * 현재 로그인 상태 확인
     */
    isLoggedIn() {
        if (!this.isInitialized) return false;
        return window.Kakao.Auth.getAccessToken() !== null;
    }
}

// OAuth 콜백 처리 함수 (MainActivity.java에서 호출)
async function handleOAuthCallback(authCode) {
    console.log('🔄 OAuth 콜백 처리 시작, 인증 코드:', authCode.substring(0, 10) + '...');
    
    try {
        // 토큰 교환 - 네이티브 스킴 사용
        const response = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: window.kakaoAuthStandalone.APP_KEY,
                redirect_uri: `kakao${window.kakaoAuthStandalone.APP_KEY}://oauth`,
                code: authCode
            })
        });
        
        if (!response.ok) {
            throw new Error('토큰 교환 실패: ' + response.status);
        }
        
        const tokenData = await response.json();
        console.log('✅ 토큰 교환 성공');
        
        // 사용자 정보 조회
        const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        if (!userResponse.ok) {
            throw new Error('사용자 정보 조회 실패: ' + userResponse.status);
        }
        
        const userInfo = await userResponse.json();
        console.log('✅ 사용자 정보 조회 성공:', userInfo);
        
        // 정규화된 사용자 정보 생성
        const normalizedUserInfo = {
            id: userInfo.id.toString(),
            kakao_id: userInfo.id.toString(),
            name: userInfo.properties?.nickname || '사용자',
            nickname: userInfo.properties?.nickname || '사용자',
            email: userInfo.kakao_account?.email || '',
            profile_image: userInfo.properties?.profile_image || '',
            provider: 'kakao',
            is_kakao_user: true,
            phone: '',
            emergency_contact1: '',
            emergency_name1: '',
            emergency_contact2: '',
            emergency_name2: '',
            created_at: new Date().toISOString()
        };
        
        // 토큰 저장
        localStorage.setItem('kakaoAccessToken', tokenData.access_token);
        if (tokenData.refresh_token) {
            localStorage.setItem('kakaoRefreshToken', tokenData.refresh_token);
        }
        
        // 성공 콜백 호출
        if (window.onKakaoLoginSuccess) {
            window.onKakaoLoginSuccess(normalizedUserInfo);
        }
        
        // 메인 auth 시스템에 사용자 정보 전달
        if (window.auth && typeof window.auth.processKakaoUser === 'function') {
            await window.auth.processKakaoUser(normalizedUserInfo);
        } else {
            console.log('⚠️ auth.processKakaoUser 함수 없음 - localStorage에 저장');
            localStorage.setItem('pendingKakaoUser', JSON.stringify(normalizedUserInfo));
        }
        
        console.log('✅ OAuth 콜백 처리 완료');
        
    } catch (error) {
        console.error('❌ OAuth 콜백 처리 실패:', error);
        
        // 실패 콜백 호출
        if (window.onKakaoLoginFailure) {
            window.onKakaoLoginFailure(error.message);
        }
    }
}

// 전역 함수로 등록
window.handleOAuthCallback = handleOAuthCallback;

// 전역 객체로 등록
console.log('📦 카카오 독립형 인증 모듈 로딩...');
window.kakaoAuthStandalone = new KakaoAuthStandalone();
console.log('✅ window.kakaoAuthStandalone 전역 등록 완료');