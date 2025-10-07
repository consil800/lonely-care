/**
 * KakaoAuthComponent v1.0
 * 카카오 OAuth 2.0 로그인을 담당하는 독립 컴포넌트
 * 
 * 기존 js/kakao-auth.js 코드를 래핑하여 컴포넌트화
 * 기존 코드의 안정성을 유지하면서 새로운 인터페이스 제공
 */

class KakaoAuthComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            appKey: 'ba05c4a8e8fd1b40c83b9ecf5db9f8a9',
            redirectUri: options.redirectUri || window.location.origin + '/oauth.html',
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.isInitialized = false;
        this.isLoading = false;
        this.currentUser = null;
        
        // 기존 kakaoAuth 인스턴스 참조 (호환성)
        this.legacyKakaoAuth = null;
        
        console.log('🔐 KakaoAuthComponent 초기화', this.options);
        
        // 자동 초기화
        this.init();
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('🚀 KakaoAuth 초기화 시작');
            
            // 1. Kakao SDK 로드 확인
            if (!window.Kakao) {
                await this.waitForKakaoSDK();
            }

            // 2. Kakao API 초기화
            if (!window.Kakao.isInitialized()) {
                window.Kakao.init(this.options.appKey);
            }

            // 3. 기존 KakaoAuth 인스턴스 생성 (호환성)
            if (window.KakaoAuth && !this.legacyKakaoAuth) {
                this.legacyKakaoAuth = new window.KakaoAuth();
                if (this.legacyKakaoAuth.init) {
                    await this.legacyKakaoAuth.init();
                }
            }

            // 4. 저장된 로그인 상태 복원
            await this.restoreLoginState();

            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('auth:ready', {
                detail: { component: this, user: this.currentUser }
            }));

            console.log('✅ KakaoAuth 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ KakaoAuth 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('auth:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * Kakao SDK 로드 대기
     */
    async waitForKakaoSDK(maxAttempts = 50) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkSDK = () => {
                if (window.Kakao) {
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    reject(new Error('Kakao SDK 로드 시간 초과'));
                    return;
                }
                
                setTimeout(checkSDK, 100);
            };
            
            checkSDK();
        });
    }

    /**
     * 로그인 실행
     */
    async login() {
        try {
            if (!this.isInitialized) {
                throw new Error('KakaoAuth가 초기화되지 않았습니다.');
            }

            if (this.isLoading) {
                console.warn('⚠️ 이미 로그인 진행 중입니다.');
                return { success: false, error: '이미 로그인 진행 중' };
            }

            this.isLoading = true;
            this.dispatchEvent(new CustomEvent('auth:login-start'));

            console.log('🔑 카카오 로그인 시작');

            // 1. 기존 로그인 확인
            if (this.currentUser) {
                console.log('✅ 이미 로그인됨:', this.currentUser.nickname);
                this.isLoading = false;
                return { success: true, user: this.currentUser, fromCache: true };
            }

            // 2. 기존 KakaoAuth 사용 (호환성)
            let loginResult;
            if (this.legacyKakaoAuth && this.legacyKakaoAuth.login) {
                loginResult = await this.legacyKakaoAuth.login();
            } else {
                // 직접 Kakao API 호출
                loginResult = await this.performDirectLogin();
            }

            if (loginResult.success) {
                this.currentUser = loginResult.user;
                
                // 로그인 상태 저장
                await this.saveLoginState(loginResult.user);
                
                this.dispatchEvent(new CustomEvent('auth:login-success', {
                    detail: { user: loginResult.user }
                }));

                console.log('✅ 카카오 로그인 성공:', loginResult.user.nickname);
                
                this.isLoading = false;
                return loginResult;
            } else {
                this.dispatchEvent(new CustomEvent('auth:login-failed', {
                    detail: { error: loginResult.error }
                }));
                
                console.error('❌ 카카오 로그인 실패:', loginResult.error);
                this.isLoading = false;
                return loginResult;
            }

        } catch (error) {
            console.error('❌ 로그인 중 오류:', error);
            
            this.isLoading = false;
            this.dispatchEvent(new CustomEvent('auth:login-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };
        }
    }

    /**
     * 직접 카카오 로그인 수행
     */
    async performDirectLogin() {
        return new Promise((resolve) => {
            window.Kakao.Auth.login({
                success: async (authObj) => {
                    try {
                        // 사용자 정보 획득
                        const userInfo = await this.getUserInfo();
                        
                        // Supabase에 사용자 등록/업데이트
                        const supabaseResult = await this.registerToSupabase(userInfo);
                        
                        resolve({
                            success: true,
                            user: supabaseResult.user,
                            kakaoUser: userInfo,
                            authObj: authObj
                        });
                        
                    } catch (error) {
                        console.error('사용자 정보 처리 실패:', error);
                        resolve({ success: false, error: error.message });
                    }
                },
                fail: (err) => {
                    console.error('카카오 로그인 실패:', err);
                    resolve({ 
                        success: false, 
                        error: err.error_description || '카카오 로그인 실패' 
                    });
                }
            });
        });
    }

    /**
     * 카카오 사용자 정보 획득 - UserIdUtils 적용
     */
    async getUserInfo() {
        return new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (response) => {
                    // UserIdUtils로 사용자 데이터 정규화
                    const rawUserInfo = {
                        kakao_id: response.id.toString(),
                        name: response.kakao_account?.profile?.nickname || '사용자',
                        email: response.kakao_account?.email || '',
                        profile_image: response.kakao_account?.profile?.profile_image_url || '',
                        created_at: new Date().toISOString()
                    };
                    
                    // UserIdUtils로 정규화
                    const normalizedUserInfo = UserIdUtils.normalizeUserData(rawUserInfo);
                    console.log(`🔍 카카오 사용자 정보 정규화: ${UserIdUtils.getUserIdentifier(normalizedUserInfo.kakao_id, normalizedUserInfo.name)}`);
                    
                    resolve(normalizedUserInfo);
                },
                fail: (error) => {
                    reject(new Error('사용자 정보 조회 실패: ' + error.msg));
                }
            });
        });
    }

    /**
     * Supabase에 사용자 등록/업데이트
     */
    async registerToSupabase(kakaoUser) {
        try {
            // storage와 supabase 클라이언트가 준비될 때까지 대기
            await this.waitForSupabase();
            
            const supabaseClient = window.storage?.supabase?.client;
            if (!supabaseClient) {
                throw new Error('Supabase 클라이언트를 찾을 수 없습니다.');
            }

            // 기존 사용자 확인
            const { data: existingUser, error: selectError } = await supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('kakao_id', kakaoUser.kakao_id)
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                console.error('기존 사용자 조회 실패:', selectError);
            }

            let userData;
            if (existingUser) {
                // 기존 사용자 정보 업데이트
                const updateData = {
                    nickname: kakaoUser.nickname,
                    email: kakaoUser.email,
                    profile_image: kakaoUser.profile_image,
                    last_login: new Date().toISOString()
                };

                const { data: updatedUser, error: updateError } = await supabaseClient
                    .from('user_profiles')
                    .update(updateData)
                    .eq('kakao_id', kakaoUser.kakao_id)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error('사용자 정보 업데이트 실패: ' + updateError.message);
                }

                userData = updatedUser;
                console.log('✅ 기존 사용자 정보 업데이트:', userData.nickname);

            } else {
                // 새 사용자 등록
                const { data: newUser, error: insertError } = await supabaseClient
                    .from('user_profiles')
                    .insert([{
                        ...kakaoUser,
                        last_login: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (insertError) {
                    throw new Error('신규 사용자 등록 실패: ' + insertError.message);
                }

                userData = newUser;
                console.log('✅ 신규 사용자 등록:', userData.nickname);
            }

            return { success: true, user: userData };

        } catch (error) {
            console.error('❌ Supabase 사용자 등록/업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * Supabase 준비 대기
     */
    async waitForSupabase(maxAttempts = 50) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkSupabase = () => {
                if (window.storage?.supabase?.client) {
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    reject(new Error('Supabase 클라이언트 로드 시간 초과'));
                    return;
                }
                
                setTimeout(checkSupabase, 100);
            };
            
            checkSupabase();
        });
    }

    /**
     * 로그아웃
     */
    async logout() {
        try {
            console.log('🚪 로그아웃 시작');

            // 1. 카카오 로그아웃
            if (window.Kakao.Auth.getAccessToken()) {
                await new Promise((resolve) => {
                    window.Kakao.Auth.logout(() => {
                        console.log('✅ 카카오 로그아웃 완료');
                        resolve();
                    });
                });
            }

            // 2. 로컬 상태 초기화
            this.currentUser = null;
            
            // 3. 저장된 로그인 상태 삭제
            this.clearLoginState();

            // 4. 기존 코드 호환성
            if (this.legacyKakaoAuth && this.legacyKakaoAuth.logout) {
                await this.legacyKakaoAuth.logout();
            }

            this.dispatchEvent(new CustomEvent('auth:logout', {
                detail: { component: this }
            }));

            console.log('✅ 로그아웃 완료');
            return { success: true };

        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            this.dispatchEvent(new CustomEvent('auth:logout-error', {
                detail: { error: error.message }
            }));
            return { success: false, error: error.message };
        }
    }

    /**
     * 현재 사용자 정보 반환
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 로그인 상태 확인
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * 로그인 상태 저장
     */
    async saveLoginState(user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('loginTimestamp', Date.now().toString());
            
            console.log('💾 로그인 상태 저장:', user.nickname);
        } catch (error) {
            console.error('❌ 로그인 상태 저장 실패:', error);
        }
    }

    /**
     * 로그인 상태 복원
     */
    async restoreLoginState() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            const loginTimestamp = localStorage.getItem('loginTimestamp');
            
            if (!savedUser || !loginTimestamp) {
                return false;
            }

            // 24시간 후 자동 만료
            const maxAge = 24 * 60 * 60 * 1000; // 24시간
            if (Date.now() - parseInt(loginTimestamp) > maxAge) {
                console.log('⏰ 저장된 로그인 세션 만료');
                this.clearLoginState();
                return false;
            }

            const userData = JSON.parse(savedUser);
            
            // 카카오 토큰 유효성 확인
            if (window.Kakao.Auth.getAccessToken()) {
                this.currentUser = userData;
                
                console.log('🔄 로그인 상태 복원:', userData.nickname);
                
                this.dispatchEvent(new CustomEvent('auth:session-restored', {
                    detail: { user: userData }
                }));
                
                return true;
            } else {
                console.log('❌ 카카오 토큰 만료 - 재로그인 필요');
                this.clearLoginState();
                return false;
            }

        } catch (error) {
            console.error('❌ 로그인 상태 복원 실패:', error);
            this.clearLoginState();
            return false;
        }
    }

    /**
     * 로그인 상태 삭제
     */
    clearLoginState() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTimestamp');
        console.log('🗑️ 로그인 상태 삭제');
    }

    /**
     * 컴포넌트 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            isLoggedIn: this.isLoggedIn(),
            currentUser: this.currentUser,
            hasKakaoSDK: !!window.Kakao,
            hasSupabase: !!window.storage?.supabase?.client
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */
    
    // auth.js와 호환성
    updateLoginState(isLoggedIn) {
        if (!isLoggedIn) {
            this.currentUser = null;
            this.clearLoginState();
        }
        
        this.dispatchEvent(new CustomEvent('auth:state-updated', {
            detail: { isLoggedIn, user: this.currentUser }
        }));
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('auth:', ''), (e) => {
            callback(e.detail);
        });
    }

    // 기존 showNotification 메서드 호환
    showNotification(message, type = 'info') {
        console.log(`📢 [${type.toUpperCase()}] ${message}`);
        
        // 기존 UI 알림 시스템이 있다면 호출
        if (window.auth?.showNotification) {
            window.auth.showNotification(message, type);
        }
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.currentUser = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.legacyKakaoAuth = null;
        
        console.log('🗑️ KakaoAuthComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.KakaoAuthComponent = KakaoAuthComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.kakaoAuthComponent) {
        window.kakaoAuthComponent = new KakaoAuthComponent();
        
        // 기존 전역 변수와 호환성 유지
        window.kakaoAuth = window.kakaoAuthComponent;
        
        console.log('🌐 KakaoAuthComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KakaoAuthComponent;
}