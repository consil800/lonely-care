class AuthManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.kakaoAuth = null;
        this.userCreationLock = new Set(); // 중복 생성 방지용 락
        this.userCreationPromises = new Map(); // 진행 중인 생성 작업 추적
        
        // OAuth 콜백 처리 확인
        this.checkPendingOAuthUser();
    }
    
    // OAuth 콜백에서 전달된 사용자 정보 처리 (중복 방지)
    async checkPendingOAuthUser() {
        try {
            const pendingUser = localStorage.getItem('pendingKakaoUser');
            if (pendingUser) {
                console.log('🔄 OAuth 콜백 사용자 정보 처리 시작');
                
                const userInfo = JSON.parse(pendingUser);
                const accessToken = localStorage.getItem('kakaoAccessToken');
                const refreshToken = localStorage.getItem('kakaoRefreshToken');
                
                // 메인 auth 시스템으로 처리
                await this.processKakaoUserInfo({
                    ...userInfo,
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                
                // 임시 데이터 정리
                localStorage.removeItem('pendingKakaoUser');
                localStorage.removeItem('kakaoAccessToken');
                localStorage.removeItem('kakaoRefreshToken');
                
                console.log('✅ OAuth 콜백 사용자 처리 완료');
            }
        } catch (error) {
            console.error('❌ OAuth 콜백 사용자 처리 실패:', error);
            // 실패 시 임시 데이터 정리
            localStorage.removeItem('pendingKakaoUser');
            localStorage.removeItem('kakaoAccessToken');
            localStorage.removeItem('kakaoRefreshToken');
        }
    }

    // 회원가입
    async register(formData) {
        try {
            // 폼 데이터 유효성 검사
            const validation = this.validateRegistrationData(formData);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            // 사용자 존재 여부 확인
            const existingUser = await this.storage.getUser(formData.username);
            if (existingUser) {
                throw new Error('이미 존재하는 사용자명입니다.');
            }

            // 사진 처리 (Base64로 변환)
            let photoData = null;
            if (formData.photo && formData.photo.files[0]) {
                photoData = await this.convertFileToBase64(formData.photo.files[0]);
            }

            // 사용자 생성
            const userData = {
                username: formData.username,
                email: formData.email,
                password: formData.password, // 실제로는 해시화 필요
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                addressDetail: formData.addressDetail,
                photo: photoData
            };

            const user = await this.storage.createUser(userData);
            
            // 사용자 상태 초기화
            if (user.kakao_id) {
                await this.storage.updateUserStatus(user.kakao_id, 'active');
            }
            
            return { success: true, user: user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // 로그인
    async login(username, password) {
        try {
            const user = await this.storage.getUser(username);
            
            if (!user) {
                throw new Error('존재하지 않는 사용자입니다.');
            }

            if (user.password !== password) { // 실제로는 해시 비교 필요
                throw new Error('비밀번호가 올바르지 않습니다.');
            }

            if (!user.isActive) {
                throw new Error('비활성화된 계정입니다.');
            }

            // 로그인 성공 처리
            this.storage.setCurrentUser(user);
            if (user.kakao_id) {
                await this.storage.updateUserStatus(user.kakao_id, 'active');
            }

            return { success: true, user: user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // 로그아웃
    async logout() {
        try {
            console.log('🚪 로그아웃 시작...');
            
            // 세션 유지 시스템 중단
            this.stopSessionKeepAlive();
            
            const currentUser = this.storage.getCurrentUser();
            if (currentUser) {
                // 활동 기록에 로그아웃 기록
                await this.recordUserActivity(currentUser.id, 'logout');
            }
            
            // 카카오 로그아웃 처리
            if (window.Kakao && window.Kakao.isInitialized()) {
                try {
                    await window.Kakao.Auth.logout();
                    console.log('✅ 카카오 로그아웃 완료');
                } catch (error) {
                    console.log('⚠️ 카카오 로그아웃 실패:', error);
                }
            }
            
            // Supabase 로그아웃
            if (this.storage.supabase && this.storage.supabase.client) {
                await this.storage.supabase.client.auth.signOut();
                console.log('✅ Supabase 로그아웃 완료');
            }
            
            // 로컬 데이터 완전 정리
            this.storage.setCurrentUser(null);
            sessionStorage.clear();
            
            // StorageHelper를 사용한 정리
            if (window.StorageHelper) {
                StorageHelper.removeUser();
                StorageHelper.remove('lonely-care-auth-token');
                StorageHelper.cleanup(['lonely-care-', 'kakao']);
            } else {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('lonely-care-auth-token');
            }
            
            console.log('🗑️ 로컬 데이터 정리 완료');
            
            // UI 초기화
            this.showAuthContainer();
            
            // 페이지 새로고침으로 완전 초기화
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            // 오류가 있어도 강제 로그아웃
            this.stopSessionKeepAlive();
            this.storage.setCurrentUser(null);
            sessionStorage.clear();
            localStorage.clear(); // 더 확실한 정리
            this.showAuthContainer();
            window.location.reload();
        }
    }

    // 현재 사용자 확인
    getCurrentUser() {
        return this.storage.getCurrentUser();
    }

    // 로그인 상태 확인
    isLoggedIn() {
        return this.storage.getCurrentUser() !== null;
    }

    // 회원가입 데이터 유효성 검사
    validateRegistrationData(formData) {
        if (!formData.username || formData.username.length < 3) {
            return { isValid: false, message: '사용자명은 3자 이상이어야 합니다.' };
        }

        if (!formData.email || !this.isValidEmail(formData.email)) {
            return { isValid: false, message: '올바른 이메일 주소를 입력하세요.' };
        }

        if (!formData.password || formData.password.length < 6) {
            return { isValid: false, message: '비밀번호는 6자 이상이어야 합니다.' };
        }

        if (formData.password !== formData.confirmPassword) {
            return { isValid: false, message: '비밀번호가 일치하지 않습니다.' };
        }

        if (!formData.name) {
            return { isValid: false, message: '이름을 입력하세요.' };
        }

        if (!formData.phone) {
            return { isValid: false, message: '전화번호를 입력하세요.' };
        }

        if (!formData.address) {
            return { isValid: false, message: '주소를 입력하세요.' };
        }

        return { isValid: true };
    }

    // 이메일 유효성 검사
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 파일을 Base64로 변환
    convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // UI 제어 메서드들
    showAuthContainer() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        // 하단 네비게이션 숨김
        document.getElementById('bottom-nav')?.classList.remove('show');
    }

    showMainApp() {
        console.log('🚀 메인 앱으로 전환 시작');
        
        const authContainer = document.getElementById('auth-container');
        const mainApp = document.getElementById('main-app');
        const bottomNav = document.getElementById('bottom-nav');
        
        if (authContainer) {
            authContainer.classList.add('hidden');
            authContainer.style.display = 'none';
        }
        
        if (mainApp) {
            mainApp.classList.remove('hidden');
            mainApp.classList.add('show');
            mainApp.style.display = 'block';
        }
        
        if (bottomNav) {
            bottomNav.classList.add('show');
            bottomNav.style.display = 'flex';
        }
        
        // localStorage 상태도 업데이트
        localStorage.setItem('isLoggedIn', 'true');
        
        // FCM 토큰 활성화 (로그인 후)
        if (window.activateFCMAfterLogin) {
            setTimeout(() => {
                window.activateFCMAfterLogin();
            }, 1000); // 1초 후 FCM 활성화
        }
        
        console.log('✅ 메인 앱 전환 완료');
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }

    // Android 네이티브 카카오 로그인 성공 처리
    async handleKakaoLoginSuccess(userData) {
        try {
            console.log('네이티브 카카오 로그인 성공 처리 시작:', userData);
            
            // UserIdUtils로 사용자 데이터 정규화
            const rawUserData = {
                id: userData.id,
                kakao_id: userData.id,
                name: userData.nickname || userData.name || '카카오 사용자',
                nickname: userData.nickname || userData.name || '카카오 사용자',
                email: userData.email || '',
                profile_image: userData.profile_image || ''
            };
            
            const normalizedUserData = UserIdUtils.normalizeUserData(rawUserData);
            console.log(`🔄 사용자 데이터 정규화: ${UserIdUtils.getUserIdentifier(normalizedUserData.kakao_id, normalizedUserData.name)}`);
            
            // UserIdUtils로 중복 사용자 검색 - 가능한 모든 ID 형태로 검색
            const normalizedId = UserIdUtils.normalizeKakaoId(normalizedUserData.kakao_id);
            const searchIds = UserIdUtils.generateSearchIds(normalizedId);
            let existingUser = null;
            
            for (const searchId of searchIds) {
                existingUser = await this.storage.getUserByKakaoId(searchId);
                if (existingUser) {
                    console.log(`✅ 기존 사용자 발견: ${UserIdUtils.getUserIdentifier(searchId, existingUser.name)} (검색 ID: ${searchId})`);
                    break;
                }
            }
            
            if (existingUser) {
                // 기존 사용자 로그인
                console.log('기존 사용자 로그인:', existingUser);
                this.currentUser = existingUser;
                localStorage.setItem('currentUser', JSON.stringify(existingUser));
                
                // 세션 유지 시스템 시작
                this.startSessionKeepAlive();
                
                await this.updateLoginState(true);
                // this.showNotification(`환영합니다, ${existingUser.name || existingUser.nickname}님!`);
            } else {
                // 새 사용자 생성 - processKakaoUserInfo 메서드로 위임 (중복 방지)
                console.log('새 사용자 생성을 processKakaoUserInfo로 위임');
                
                // UserIdUtils로 정규화된 사용자 정보 전달
                const processedUser = await this.processKakaoUserInfo({
                    id: normalizedUserData.kakao_id,
                    name: normalizedUserData.name || normalizedUserData.nickname,
                    nickname: normalizedUserData.nickname,
                    profile_image: normalizedUserData.profile_image,
                    email: normalizedUserData.email || ''
                });
                
                console.log('processKakaoUserInfo를 통한 사용자 처리 완료:', processedUser);
                this.currentUser = processedUser;
                localStorage.setItem('currentUser', JSON.stringify(processedUser));
                
                // 세션 유지 시스템 시작
                this.startSessionKeepAlive();
                
                await this.updateLoginState(true);
                // this.showNotification(`회원가입이 완료되었습니다! 환영합니다, ${processedUser.name}님!`);
            }
            
        } catch (error) {
            console.error('네이티브 카카오 로그인 처리 오류:', error);
            this.showNotification('로그인 처리 중 오류가 발생했습니다: ' + error.message, 'error');
            
            // 사용자 생성 락 정리 (오류 시)
            if (normalizedUserData?.kakao_id) {
                const normalizedId = UserIdUtils.normalizeKakaoId(normalizedUserData.kakao_id);
                this.userCreationLock.delete(normalizedId);
                this.userCreationPromises.delete(normalizedId);
            }
            
            throw error;
        }
    }

    // 알림 표시 (비활성화)
    showNotification(message, type = 'success') {
        console.log('알림 표시 (비활성화):', message, type);
        
        // 모든 알림 제거
        // alert(message); // 팝업 알림 제거
        // 토스트 메시지도 제거
    }
    
    // 커스텀 확인 대화상자 (file:// 텍스트 없이)
    showCustomConfirm(message) {
        return new Promise((resolve) => {
            // 기존 확인 대화상자 제거
            const existingDialog = document.getElementById('custom-confirm-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }
            
            // 커스텀 확인 대화상자 생성
            const dialog = document.createElement('div');
            dialog.id = 'custom-confirm-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            `;
            
            dialog.innerHTML = `
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    max-width: 320px;
                    text-align: center;
                ">
                    <div style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        ${message}
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button id="confirm-no" style="
                            padding: 12px 24px;
                            border: 2px solid #ddd;
                            background: white;
                            color: #666;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                        ">취소</button>
                        <button id="confirm-yes" style="
                            padding: 12px 24px;
                            border: none;
                            background: #ff4757;
                            color: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                        ">확인</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            // 버튼 이벤트
            const yesBtn = dialog.querySelector('#confirm-yes');
            const noBtn = dialog.querySelector('#confirm-no');
            
            yesBtn.onclick = () => {
                dialog.remove();
                resolve(true);
            };
            
            noBtn.onclick = () => {
                dialog.remove();
                resolve(false);
            };
            
            // 배경 클릭시 취소
            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    dialog.remove();
                    resolve(false);
                }
            };
        });
    }

    // 초기화
    async init() {
        // 카카오 인증 초기화
        await this.initKakaoAuth();

        // 로그인 상태 확인 및 복원
        if (this.isLoggedIn()) {
            const user = this.getCurrentUser();
            console.log('🔐 기존 로그인 상태 복원:', user.name);
            this.showMainApp();
            this.updateUserInfo(user);
            
            // 상태 업데이트
            if (user.id) {
                try {
                    const updateResult = await this.storage.updateUserStatus(user.id, true);
                    if (updateResult && !updateResult.success) {
                        console.log('📝 초기 상태 업데이트 결과:', updateResult.reason || updateResult.error || '알 수 없음');
                    }
                } catch (error) {
                    console.log('초기 상태 업데이트 실패 (무시):', error.message);
                }
            }
            
            // 지속적 로그인 상태 유지 시작
            this.startSessionKeepAlive();
        } else {
            this.showAuthContainer();
        }

        // 이벤트 리스너 등록
        this.setupEventListeners();
    }

    // 로그인 세션 유지 시스템
    startSessionKeepAlive() {
        console.log('🔄 세션 유지 시스템 시작');
        
        // 5분마다 localStorage의 로그인 상태 확인 및 갱신
        this.sessionKeepAliveInterval = setInterval(() => {
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                // 현재 시간을 마지막 활동 시간으로 업데이트
                currentUser.lastActivity = new Date().toISOString();
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                console.log('💾 로그인 세션 갱신됨:', new Date().toLocaleTimeString());
                
                // 사용자 상태도 주기적으로 업데이트
                if (currentUser.kakao_id && this.storage) {
                    this.storage.updateUserStatus(currentUser.kakao_id, 'active')
                        .catch(error => console.log('상태 업데이트 실패 (무시):', error.message));
                }
            } else {
                // 로그인 상태가 없으면 세션 유지 중단
                console.log('⚠️ 로그인 상태 없음 - 세션 유지 중단');
                this.stopSessionKeepAlive();
            }
        }, 5 * 60 * 1000); // 5분마다
    }

    // 세션 유지 시스템 중단
    stopSessionKeepAlive() {
        if (this.sessionKeepAliveInterval) {
            clearInterval(this.sessionKeepAliveInterval);
            this.sessionKeepAliveInterval = null;
            console.log('🛑 세션 유지 시스템 중단');
        }
    }

    // 카카오 인증 초기화
    async initKakaoAuth() {
        try {
            // 독립형 카카오 모듈 사용 (자동 초기화됨)
            this.kakaoAuth = window.kakaoAuthStandalone;
            console.log('✅ 독립형 카카오 인증 모듈 연결됨');
        } catch (error) {
            console.error('카카오 인증 초기화 실패:', error);
        }
    }

    // 카카오 로그인 처리 (WebView 최적화)
    async loginWithKakao() {
        console.log('🚀 카카오 로그인 시작...');
        
        try {
            // 1. 진행 중 표시를 위한 메시지 (제거됨)
            // this.showNotification('카카오 로그인을 시작합니다...');
            
            // 2. OAuth 결과가 이미 localStorage에 있는지 확인 (페이지 새로고침 후)
            const existingResult = localStorage.getItem('kakao_auth_result');
            if (existingResult) {
                try {
                    const result = JSON.parse(existingResult);
                    localStorage.removeItem('kakao_auth_result');
                    
                    if (result.success && result.userInfo) {
                        console.log('📦 기존 OAuth 결과 사용:', result.userInfo);
                        return await this.processKakaoUserInfo(result.userInfo);
                    }
                } catch (e) {
                    console.log('기존 결과 처리 실패, 새로 시도:', e.message);
                    localStorage.removeItem('kakao_auth_result');
                }
            }
            
            // 3. 새로운 OAuth 로그인 시작
            const kakaoUserInfo = await this.startKakaoOAuth();
            
            if (!kakaoUserInfo || !kakaoUserInfo.id) {
                throw new Error('카카오 사용자 정보를 가져오지 못했습니다.');
            }
            
            return await this.processKakaoUserInfo(kakaoUserInfo);
            
        } catch (error) {
            console.error('❌ 카카오 로그인 실패:', error);
            this.showNotification('카카오 로그인에 실패했습니다: ' + error.message, 'error');
            return { success: false, message: error.message };
        }
    }
    
    // OAuth 프로세스 시작 (완전히 새로운 방식)
    async startKakaoOAuth() {
        return new Promise((resolve, reject) => {
            console.log('🔐 WebView 최적화 OAuth 시작...');
            
            // Android WebView 환경 확인 - 네이티브 우선 시도
            if (this.isAndroidWebView() && window.AndroidBridge) {
                console.log('📱 Android 네이티브 로그인 먼저 시도...');
                try {
                    // 네이티브 성공 시 콜백 대기
                    window.kakaoNativeSuccess = (userData) => {
                        console.log('✅ 네이티브 로그인 성공:', userData);
                        delete window.kakaoNativeSuccess;
                        resolve(userData);
                    };
                    
                    window.AndroidBridge.loginWithKakao();
                    
                    // 5초 대기 후 웹 방식으로 대체
                    setTimeout(() => {
                        if (window.kakaoNativeSuccess) {
                            console.log('⏰ 네이티브 타임아웃, 웹 SDK로 전환...');
                            delete window.kakaoNativeSuccess;
                            this.useWebKakaoSDK(resolve, reject);
                        }
                    }, 5000);
                    return;
                    
                } catch (error) {
                    console.log('❌ 네이티브 실패, 즉시 웹 SDK 사용:', error.message);
                }
            }
            
            // 웹 SDK 직접 사용
            this.useWebKakaoSDK(resolve, reject);
        });
    }
    
    // 독립형 카카오 모듈 사용
    async useWebKakaoSDK(resolve, reject) {
        try {
            if (!this.kakaoAuth) {
                await this.initKakaoAuth();
            }
            
            // 카카오 인증 객체가 여전히 없으면 추가 대기
            if (!this.kakaoAuth) {
                console.log('⏳ 카카오 인증 모듈 로딩 대기 중...');
                // window.kakaoAuthStandalone 로딩 대기 (최대 5초)
                let attempts = 0;
                while (!window.kakaoAuthStandalone && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (window.kakaoAuthStandalone) {
                    this.kakaoAuth = window.kakaoAuthStandalone;
                    console.log('✅ 카카오 인증 모듈 로딩 완료');
                } else {
                    throw new Error('카카오 인증 모듈을 로드할 수 없습니다');
                }
            }
            
            // 카카오 인증 객체의 login 메서드 확인
            if (!this.kakaoAuth || typeof this.kakaoAuth.login !== 'function') {
                throw new Error('카카오 로그인 메서드를 사용할 수 없습니다');
            }
            
            const result = await this.kakaoAuth.login();
            resolve(result);
        } catch (error) {
            console.error('❌ 카카오 로그인 오류:', error);
            reject(error);
        }
    }
    
    // 인증 코드를 토큰으로 교환 후 사용자 정보 조회
    async exchangeCodeForUserInfo(code, resolve, reject) {
        try {
            console.log('🎫 인증 코드로 토큰 교환 시작...');
            
            // 토큰 교환 요청
            const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CONFIG.KAKAO.JAVASCRIPT_KEY,
                    redirect_uri: window.location.origin + window.location.pathname,
                    code: code
                })
            });
            
            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error('❌ 토큰 교환 실패:', errorText);
                throw new Error(`토큰 교환 실패: ${tokenResponse.status}`);
            }
            
            const tokenData = await tokenResponse.json();
            console.log('✅ 액세스 토큰 획득:', tokenData.access_token ? '성공' : '실패');
            
            // 사용자 정보 조회
            const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
                }
            });
            
            if (!userResponse.ok) {
                const errorText = await userResponse.text();
                console.error('❌ 사용자 정보 조회 실패:', errorText);
                throw new Error(`사용자 정보 조회 실패: ${userResponse.status}`);
            }
            
            const userData = await userResponse.json();
            console.log('✅ 사용자 정보 조회 성공:', userData);
            
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
            
            resolve(userInfo);
            
        } catch (error) {
            console.error('❌ 코드 교환 오류:', error);
            reject(new Error(`로그인 처리 오류: ${error.message}`));
        }
    }
    
    // 카카오 인증 성공 후 사용자 정보 조회
    async handleKakaoAuthSuccess(authObj, resolve, reject) {
        try {
            console.log('👤 사용자 정보 조회 시작...');
            
            // 카카오 API로 사용자 정보 조회
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: (userData) => {
                    console.log('✅ 사용자 정보 조회 성공:', userData);
                    
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
                    
                    resolve(userInfo);
                },
                fail: (error) => {
                    console.error('❌ 사용자 정보 조회 실패:', error);
                    reject(new Error(`사용자 정보 조회 실패: ${error.msg || error.error_description}`));
                }
            });
            
        } catch (error) {
            console.error('❌ 사용자 정보 처리 오류:', error);
            reject(new Error(`사용자 정보 처리 오류: ${error.message}`));
        }
    }
    
    // 카카오 사용자 정보 처리 (중복 생성 방지 강화)
    // 긴급 로그인 사용자 처리 (생명 구조 우선)
    async processEmergencyUser(emergencyUserInfo) {
        console.log('🚨 긴급 로그인 사용자 처리:', emergencyUserInfo);
        
        try {
            const emergencyId = emergencyUserInfo.id;
            
            // 기존 긴급 사용자 확인
            let user = await this.storage.getUserByEmergencyId(emergencyId);
            
            if (!user) {
                console.log('🚨 새 긴급 사용자 생성:', emergencyUserInfo.name);
                
                // 긴급 사용자 데이터 구조화
                const emergencyUserData = {
                    id: emergencyId,
                    emergency_id: emergencyId,
                    kakao_id: null,
                    name: emergencyUserInfo.name,
                    nickname: emergencyUserInfo.name,
                    email: emergencyUserInfo.email || `${emergencyId}@emergency.lonely-care.com`,
                    profile_image: '',
                    phone: emergencyUserInfo.phone || '',
                    address: '',
                    birth_date: null,
                    gender: '',
                    emergency_contact1: emergencyUserInfo.phone || '',
                    emergency_name1: emergencyUserInfo.name,
                    emergency_contact2: '',
                    emergency_name2: '',
                    medical_info: {},
                    provider: 'emergency',
                    is_emergency_user: true,
                    is_kakao_user: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    is_active: true
                };
                
                console.log('🚨 긴급 사용자 생성 데이터:', emergencyUserData);
                user = await this.storage.createUser(emergencyUserData);
                console.log('✅ 긴급 사용자 생성 완료:', user);
            } else {
                console.log('✅ 기존 긴급 사용자 로그인:', user.name);
            }
            
            // 긴급 사용자 로그인 처리
            this.currentUser = user;
            this.storage.setCurrentUser(user);
            
            // 세션 유지 시스템 시작
            this.startSessionKeepAlive();
            
            // 로그인 상태 업데이트
            await this.updateLoginState(true);
            
            console.log('🚨 긴급 로그인 완료:', user.name);
            return user;
            
        } catch (error) {
            console.error('❌ 긴급 로그인 처리 실패:', error);
            throw new Error('긴급 로그인 처리 중 오류가 발생했습니다: ' + error.message);
        }
    }

    async processKakaoUserInfo(kakaoUserInfo) {
        console.log('👤 카카오 사용자 정보 처리:', kakaoUserInfo);
        
        // 긴급 로그인 사용자인지 확인
        if (kakaoUserInfo.provider === 'emergency' || kakaoUserInfo.is_emergency_user) {
            return await this.processEmergencyUser(kakaoUserInfo);
        }
        
        const kakaoId = kakaoUserInfo.id.toString();
        
        // UserIdUtils로 카카오 ID 정규화
        const normalizedKakaoId = UserIdUtils.normalizeKakaoId(kakaoId);
        console.log(`🔄 카카오 ID 정규화: ${kakaoId} → ${normalizedKakaoId}`);
        
        // 중복 생성 방지: 이미 생성 중인 사용자인지 확인 (정규화된 ID 사용)
        if (this.userCreationLock.has(normalizedKakaoId)) {
            console.log(`⚠️ 사용자 생성 중복 방지: 기존 생성 작업 대기 중... ${UserIdUtils.getUserIdentifier(normalizedKakaoId)}`);
            // 기존 생성 작업이 완료될 때까지 대기
            if (this.userCreationPromises.has(normalizedKakaoId)) {
                return await this.userCreationPromises.get(normalizedKakaoId);
            }
        }
        
        // 중복 사용자 검색 - 가능한 모든 ID 형태로 검색
        const searchIds = UserIdUtils.generateSearchIds(normalizedKakaoId);
        let user = null;
        
        for (const searchId of searchIds) {
            user = await this.storage.getUserByKakaoId(searchId);
            if (user) {
                console.log(`✅ 기존 사용자 발견: ${UserIdUtils.getUserIdentifier(searchId, user.name)} (검색 ID: ${searchId})`);
                break;
            }
        }
        
        if (!user) {
            // 락 설정 (중복 생성 방지) - 정규화된 ID 사용
            this.userCreationLock.add(normalizedKakaoId);
            
            console.log(`🔒 사용자 생성 락 설정: ${UserIdUtils.getUserIdentifier(normalizedKakaoId)}`);
            
            try {
                // 다시 한 번 사용자 존재 확인 (Race condition 방지) - 모든 ID 형태 검색
                for (const searchId of searchIds) {
                    user = await this.storage.getUserByKakaoId(searchId);
                    if (user) {
                        console.log(`✅ 락 설정 후 기존 사용자 발견: ${UserIdUtils.getUserIdentifier(searchId, user.name)}`);
                        return user;
                    }
                }
                
                // UserIdUtils로 사용자 데이터 정규화
                const rawUserData = {
                    kakao_id: normalizedKakaoId, // 정규화된 ID 사용
                    name: kakaoUserInfo.name || kakaoUserInfo.nickname,
                    email: kakaoUserInfo.email || '',
                    profile_image: kakaoUserInfo.profile_image || '',
                    phone: '',
                    address: '',
                    birth_date: null,
                    gender: '',
                    emergency_contact1: '',
                    emergency_contact2: '',
                    medical_info: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    is_active: true
                };
                
                // UserIdUtils로 데이터 정규화
                const userData = UserIdUtils.normalizeUserData(rawUserData);
                console.log(`📝 정규화된 사용자 생성 데이터: ${UserIdUtils.getUserIdentifier(userData.kakao_id, userData.name)}`);
                
                console.log('📝 새 사용자 생성 데이터:', userData);
                
                // 사용자 생성 프로미스 저장 (정규화된 ID 사용)
                const createUserPromise = this.storage.createUser(userData);
                this.userCreationPromises.set(normalizedKakaoId, createUserPromise);
                
                user = await createUserPromise;
                console.log('✅ 사용자 생성 완료:', user);
                
            } finally {
                // 락 해제 (정규화된 ID 사용)
                this.userCreationLock.delete(normalizedKakaoId);
                this.userCreationPromises.delete(normalizedKakaoId);
                console.log(`🔓 사용자 생성 락 해제: ${UserIdUtils.getUserIdentifier(normalizedKakaoId)}`);
            }
        } else {
            console.log('👋 기존 사용자 로그인:', user.name);
        }

        // 로그인 성공 처리 - ID를 kakao_id로 통일
        const unifiedUser = {
            ...user,
            id: user.kakao_id || user.id, // ID를 kakao_id로 통일
            kakao_id: user.kakao_id || user.id
        };
        this.storage.setCurrentUser(unifiedUser);
        
        // 사용자 ID 일관성 확인 및 수정
        const userIdForUpdates = unifiedUser.kakao_id;
        await this.recordUserActivity(userIdForUpdates, 'login');

        // 세션 유지 시스템 시작
        this.startSessionKeepAlive();

        this.showMainApp();
        this.updateUserInfo(user);

        return { success: true, user: user };
    }
    
    // Android WebView 환경 확인
    isAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || 
               window.AndroidBridge || 
               window.webkit?.messageHandlers;
    }

    // 로그인 상태 업데이트
    async updateLoginState(isLoggedIn) {
        if (isLoggedIn) {
            this.showMainApp();
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                this.updateUserInfo(currentUser);
                // 사용자 상태를 active로 설정
                const userIdForStatus = currentUser.kakao_id || currentUser.id;
                if (userIdForStatus) {
                    try {
                        await this.storage.updateUserStatus(userIdForStatus, true);
                    } catch (error) {
                        console.log('상태 업데이트 실패 (무시):', error.message);
                    }
                }
            }
        } else {
            this.showAuthContainer();
        }
    }

    // 사용자 정보 업데이트
    updateUserInfo(user) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.name;
        }
    }

    // 사용자 활동 기록
    async recordUserActivity(userId, activityType, details = {}) {
        try {
            // Firebase 클라이언트 확인
            if (!this.storage || !this.storage.db) {
                console.warn('⚠️ Firebase 저장소가 초기화되지 않았습니다');
                return;
            }
            
            // Firebase Firestore에 활동 기록 저장
            await this.storage.db.collection('user_activities').add({
                user_id: userId,
                activity_type: activityType,
                activity_time: new Date().toISOString(),
                details: details
            });
        } catch (error) {
            console.error('활동 기록 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 카카오 로그인 버튼
        document.getElementById('kakao-login-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const button = e.target.closest('button');
                const originalContent = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '로그인 중...';
                
                try {
                    await this.loginWithKakao();
                } finally {
                    button.disabled = false;
                    button.innerHTML = originalContent;
                }
            } catch (error) {
                console.error('카카오 로그인 버튼 오류:', error);
            } finally {
                const button = document.getElementById('kakao-login-btn');
                if (button) {
                    button.disabled = false;
                    button.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDNDNy4wMzEwMyAzIDMgNi4zNDQgMyAxMC41QzMgMTMuNTEgNS4yMTA5NCAxNi4wOTQgOC40NTMxMyAxNi44MTNMMTEuMzI4MSAxOS44OTA2TDEyIDIwLjVMMTIuNjcxOSAxOS44OTA2TDE1LjU0NjkgMTYuODEzQzE4Ljc4OTEgMTYuMDk0IDIxIDEzLjUxIDIxIDEwLjVDMjEgNi4zNDQgMTYuOTY5IDMgMTIgM1oiIGZpbGw9IiMzQzFFMkEiLz4KPC9zdmc+Cg==" alt="카카오톡"> 카카오톡으로 시작하기';
                }
            }
        });

        // 폼 전환 버튼 (회원가입 폼에서만 사용)
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });


        // 프로필 설정의 로그아웃 버튼
        document.getElementById('logout-profile-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // 커스텀 확인 대화상자 사용
            if (await this.showCustomConfirm('정말 로그아웃하시겠습니까?')) {
                try {
                    const button = e.target;
                    button.disabled = true;
                    button.textContent = '로그아웃 중...';
                    
                    await this.logout();
                    // this.showNotification('로그아웃되었습니다.');
                } catch (error) {
                    console.error('로그아웃 실패:', error);
                    // this.showNotification('로그아웃 중 오류가 발생했습니다.', 'error');
                }
            }
        });
    }
}

// 인증 매니저 인스턴스 생성 (main.js에서 초기화됨)
let auth;