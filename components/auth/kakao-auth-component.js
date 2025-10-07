/**
 * 카카오 인증 컴포넌트 v2.0
 * 완전히 독립적인 카카오 로그인 모듈 - 다른 시스템과 격리
 */
class KakaoAuthComponent {
    constructor(config = {}) {
        this.config = {
            appKey: config.appKey || 'dd74fd58abbb75eb58df11ecc92d6727',
            redirectUri: config.redirectUri || this.getDefaultRedirectUri(),
            scope: config.scope || 'profile_nickname,profile_image,account_email',
            ...config
        };
        
        this.isInitialized = false;
        this.user = null;
        this.listeners = new Map();
        this.environment = this.detectEnvironment();
        
        console.log(`🔧 카카오 인증 컴포넌트 초기화 (환경: ${this.environment})`);
        this.init();
    }

    /**
     * 환경 감지 (웹, WebView, Native)
     */
    detectEnvironment() {
        if (window.AndroidBridge && typeof window.AndroidBridge.kakaoLogin === 'function') {
            return 'android_native';
        }
        if (window.location.protocol === 'file:') {
            return 'webview';
        }
        return 'web';
    }

    /**
     * 기본 리다이렉트 URI 생성 - 포트별 대응
     */
    getDefaultRedirectUri() {
        const port = window.location.port;
        const hostname = window.location.hostname;
        
        // 카카오에 등록된 URI들과 매칭
        const registeredUris = {
            '5500': `http://127.0.0.1:5500/lonely-care/oauth.html`,
            '5650': `http://127.0.0.1:5650/lonely-care/oauth.html`,
            '8080': `http://127.0.0.1:8080/oauth.html`,
            '8000': `http://127.0.0.1:8000/oauth.html`
        };
        
        if (registeredUris[port]) {
            console.log(`✅ 등록된 포트 ${port} 사용`);
            return registeredUris[port];
        }
        
        // 기본값
        console.warn(`⚠️ 미등록 포트 ${port}, 기본값 사용`);
        return 'http://127.0.0.1:5500/lonely-care/oauth.html';
    }

    /**
     * 이벤트 리스너 관리
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`이벤트 ${event} 핸들러 오류:`, error);
                }
            });
        }
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🔄 카카오 SDK 초기화 시작...');
            
            if (this.environment === 'android_native') {
                // Android 네이티브는 별도 초기화 불필요
                this.isInitialized = true;
                console.log('✅ Android 네이티브 환경 준비 완료');
                this.emit('ready');
                return;
            }
            
            if (this.environment === 'webview') {
                // WebView에서는 네이티브 로그인만 지원
                this.isInitialized = true;
                console.log('✅ WebView 환경 준비 완료');
                this.emit('ready');
                return;
            }
            
            // 웹 환경에서만 Kakao SDK 초기화
            await this.initKakaoSDK();
            this.isInitialized = true;
            console.log('✅ 웹 환경 Kakao SDK 초기화 완료');
            this.emit('ready');
            
        } catch (error) {
            console.error('❌ 카카오 컴포넌트 초기화 실패:', error);
            this.emit('error', { type: 'init', error });
        }
    }

    /**
     * Kakao SDK 초기화 (웹 환경만)
     */
    async initKakaoSDK() {
        return new Promise((resolve, reject) => {
            const checkKakao = () => {
                if (window.Kakao) {
                    try {
                        if (window.Kakao.isInitialized()) {
                            window.Kakao.cleanup();
                        }
                        window.Kakao.init(this.config.appKey);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    setTimeout(checkKakao, 100);
                }
            };
            checkKakao();
            
            // 10초 타임아웃
            setTimeout(() => reject(new Error('Kakao SDK 로드 타임아웃')), 10000);
        });
    }

    /**
     * 로그인 실행 - 환경별 자동 분기
     */
    async login() {
        if (!this.isInitialized) {
            throw new Error('컴포넌트가 초기화되지 않았습니다.');
        }

        try {
            this.emit('login-start');
            
            switch (this.environment) {
                case 'android_native':
                    return await this.loginWithAndroidNative();
                case 'webview':
                    throw new Error('WebView에서는 네이티브 로그인이 필요합니다.');
                case 'web':
                default:
                    return await this.loginWithWebOAuth();
            }
        } catch (error) {
            console.error('카카오 로그인 실패:', error);
            this.emit('login-error', error);
            throw error;
        }
    }

    /**
     * Android 네이티브 로그인
     */
    async loginWithAndroidNative() {
        return new Promise((resolve, reject) => {
            console.log('📱 Android 네이티브 로그인 시작');
            
            // 전역 콜백 함수 등록
            window.kakaoLoginSuccess = (userDataString) => {
                try {
                    const userData = JSON.parse(userDataString);
                    this.user = {
                        id: userData.id,
                        email: userData.email || '',
                        nickname: userData.nickname || '',
                        profile_image: userData.profile_image || '',
                        source: 'android_native'
                    };
                    
                    console.log('✅ Android 네이티브 로그인 성공:', this.user);
                    this.emit('login-success', this.user);
                    resolve(this.user);
                } catch (error) {
                    console.error('네이티브 로그인 데이터 파싱 오류:', error);
                    reject(new Error('로그인 데이터 처리 실패'));
                } finally {
                    // 콜백 정리
                    delete window.kakaoLoginSuccess;
                    delete window.kakaoLoginError;
                }
            };
            
            window.kakaoLoginError = (error) => {
                console.error('❌ Android 네이티브 로그인 실패:', error);
                reject(new Error(error || '네이티브 로그인 실패'));
                
                // 콜백 정리
                delete window.kakaoLoginSuccess;
                delete window.kakaoLoginError;
            };
            
            // 타임아웃 설정
            setTimeout(() => {
                if (window.kakaoLoginSuccess) {
                    delete window.kakaoLoginSuccess;
                    delete window.kakaoLoginError;
                    reject(new Error('로그인 시간 초과'));
                }
            }, 30000);
            
            // Android Bridge 호출
            window.AndroidBridge.kakaoLogin();
        });
    }

    /**
     * 웹 OAuth 로그인
     */
    async loginWithWebOAuth() {
        return new Promise((resolve, reject) => {
            console.log('🌐 웹 OAuth 로그인 시작');
            
            const authUrl = `https://kauth.kakao.com/oauth/authorize?` +
                `client_id=${this.config.appKey}&` +
                `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
                `response_type=code&` +
                `scope=${this.config.scope}`;
                
            console.log('🎯 OAuth URL:', authUrl);
            console.log('🎯 Redirect URI:', this.config.redirectUri);
            
            const popup = window.open(authUrl, 'kakao_login', 'width=500,height=600');
            
            if (!popup) {
                reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'));
                return;
            }
            
            // 팝업 모니터링
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    
                    // localStorage에서 결과 확인
                    const result = localStorage.getItem('kakao_auth_result');
                    if (result) {
                        try {
                            const authResult = JSON.parse(result);
                            localStorage.removeItem('kakao_auth_result');
                            
                            if (authResult.success) {
                                this.user = {
                                    id: authResult.id,
                                    email: authResult.email || '',
                                    nickname: authResult.nickname || '',
                                    profile_image: authResult.profile_image || '',
                                    source: 'web_oauth'
                                };
                                
                                console.log('✅ 웹 OAuth 로그인 성공:', this.user);
                                this.emit('login-success', this.user);
                                resolve(this.user);
                            } else {
                                reject(new Error(authResult.error || '로그인 실패'));
                            }
                        } catch (error) {
                            reject(new Error('로그인 결과 처리 실패'));
                        }
                    } else {
                        reject(new Error('로그인이 취소되었습니다'));
                    }
                }
            }, 1000);
            
            // 3분 타임아웃
            setTimeout(() => {
                if (!popup.closed) {
                    popup.close();
                    clearInterval(checkClosed);
                    reject(new Error('로그인 시간이 초과되었습니다'));
                }
            }, 180000);
        });
    }

    /**
     * 로그아웃
     */
    async logout() {
        try {
            this.emit('logout-start');
            
            // 웹 환경에서 SDK 로그아웃
            if (this.environment === 'web' && window.Kakao?.Auth) {
                if (window.Kakao.Auth.getAccessToken()) {
                    await new Promise((resolve) => {
                        window.Kakao.Auth.logout(resolve);
                    });
                }
            }
            
            this.user = null;
            console.log('✅ 카카오 로그아웃 완료');
            this.emit('logout-success');
            
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            this.emit('logout-error', error);
            throw error;
        }
    }

    /**
     * 현재 로그인 상태 확인
     */
    isLoggedIn() {
        return this.user !== null;
    }

    /**
     * 현재 사용자 정보 반환
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * 로그인 상태 체크
     */
    async checkLoginStatus() {
        try {
            if (this.environment === 'web' && window.Kakao?.Auth) {
                const token = window.Kakao.Auth.getAccessToken();
                if (token) {
                    const userInfo = await this.getWebUserInfo();
                    this.user = userInfo;
                    return this.user;
                }
            }
            
            return null;
        } catch (error) {
            console.error('로그인 상태 체크 실패:', error);
            return null;
        }
    }

    /**
     * 웹에서 사용자 정보 가져오기
     */
    async getWebUserInfo() {
        return new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (response) => {
                    const userInfo = {
                        id: response.id,
                        email: response.kakao_account?.email || '',
                        nickname: response.properties?.nickname || '',
                        profile_image: response.properties?.profile_image || '',
                        source: 'web'
                    };
                    resolve(userInfo);
                },
                fail: (error) => {
                    reject(new Error('사용자 정보 조회 실패'));
                }
            });
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.listeners.clear();
        this.user = null;
        this.isInitialized = false;
        
        // 전역 콜백 정리
        if (window.kakaoLoginSuccess) delete window.kakaoLoginSuccess;
        if (window.kakaoLoginError) delete window.kakaoLoginError;
        
        console.log('🗑️ 카카오 인증 컴포넌트 정리 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KakaoAuthComponent;
} else {
    window.KakaoAuthComponent = KakaoAuthComponent;
}