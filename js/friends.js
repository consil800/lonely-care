class FriendsManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.isLoading = false; // 🚨 생명구조 앱: 중복 로딩 방지
        this.lastLoadTime = 0; // 🚨 생명구조 앱: 로딩 빈도 제한
        this.setupEventListeners();
        
        // 🚨 생명구조 시스템: 로그인 완료 감지 시 자동 친구 목록 로드
        this.setupLoginWatcher();
    }

    // 🚨 생명구조 시스템: 로그인 완료 감지 시스템
    setupLoginWatcher() {
        // 1. localStorage 변화 감지 (로그인 완료 시 자동 로드)
        window.addEventListener('storage', (e) => {
            if (e.key === 'isLoggedIn' && e.newValue === 'true') {
                console.log('🚨 생명구조 시스템: 로그인 감지 - 친구 목록 자동 로드');
                setTimeout(() => this.loadFriends(), 300);
            }
        });
        
        // 2. 네이티브 로그인 성공 콜백 감지
        if (window.onKakaoLoginSuccess) {
            const originalCallback = window.onKakaoLoginSuccess;
            window.onKakaoLoginSuccess = (userInfo) => {
                console.log('🚨 생명구조 시스템: 네이티브 로그인 성공 감지 - 친구 목록 자동 로드');
                originalCallback(userInfo);
                setTimeout(() => this.loadFriends(), 300);
            };
        }
        
        // 3. 페이지 포커스 시 친구 목록 새로고침
        window.addEventListener('focus', () => {
            if (auth.getCurrentUser()) {
                console.log('🔄 앱 포커스 시 친구 목록 새로고침');
                this.loadFriends();
            }
        });
        
        // 4. 친구 섹션 활성화 시 자동 로드
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.id === 'friends-section' && target.classList.contains('active')) {
                        console.log('🚨 생명구조 시스템: 친구 섹션 활성화 - 친구 목록 자동 로드');
                        setTimeout(() => this.loadFriends(), 300);
                    }
                }
            });
        });
        
        const friendsSection = document.getElementById('friends-section');
        if (friendsSection) {
            observer.observe(friendsSection, { attributes: true });
        }
        
        // 🚨 생명구조 시스템: 앱 시작 시 즉시 친구 목록 로드
        this.setupInitialLoad();
    }
    
    // 🚨 생명구조 시스템: 앱 시작 시 즉시 친구 목록 로드
    setupInitialLoad() {
        // 1. DOM 완전 로드 후 실행
        const checkAndLoad = () => {
            const currentUser = auth?.getCurrentUser();
            if (currentUser) {
                console.log('🚨 [생명구조] 로그인 상태 확인됨 - 즉시 친구 목록 로드');
                setTimeout(() => this.loadFriends(), 300); // 0.3초 후 로드
                return true;
            }
            return false;
        };
        
        // 2. 즉시 한 번 체크
        setTimeout(() => {
            if (!checkAndLoad()) {
                console.log('🔄 [생명구조] 로그인 대기 중...');
                
                // 3. 1초 간격으로 5번 재시도
                let retryCount = 0;
                const retryInterval = setInterval(() => {
                    retryCount++;
                    console.log(`🔄 [생명구조] 로그인 확인 시도 ${retryCount}/5`);
                    
                    if (checkAndLoad() || retryCount >= 5) {
                        clearInterval(retryInterval);
                        if (retryCount >= 5) {
                            console.log('ℹ️ [생명구조] 로그인되지 않음 - 친구 목록 로드 중단');
                        }
                    }
                }, 1000);
            }
        }, 1000); // 1초 후 시작
        
        // 4. 친구 페이지 활성화 시에도 로드
        const friendsPage = document.getElementById('friends-page');
        if (friendsPage) {
            const pageObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.id === 'friends-page' && target.classList.contains('active')) {
                            console.log('🚨 [생명구조] 친구 페이지 활성화 - 친구 목록 새로고침');
                            setTimeout(() => this.loadFriends(), 200);
                        }
                    }
                });
            });
            
            pageObserver.observe(friendsPage, { attributes: true });
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        document.getElementById('add-friend-btn')?.addEventListener('click', () => {
            this.addFriend();
        });

        document.getElementById('friend-invite-code')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addFriend();
            }
        });

        // 🚨 생명구조: 페이지 준비 시 즉시 로딩 시작
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.checkAndLoadOnStartup(), 100);
            });
        } else {
            setTimeout(() => this.checkAndLoadOnStartup(), 100);
        }
    }

    // 🚨 생명구조: 시작 시 로딩 체크
    checkAndLoadOnStartup() {
        const currentUser = auth?.getCurrentUser();
        if (currentUser) {
            console.log('🚨 [생명구조] 페이지 준비 완료 - 친구 목록 로딩 시작');
            this.loadFriends();
        } else {
            console.log('🔍 [생명구조] 로그인 대기 중...');
            // 로그인 대기 시 무료플랜 카드 즉시 표시
            this.showFreeplanCard();
        }
    }

    // 🚨 생명구조: 무료플랜 카드 즉시 표시 (로그인 대기 중)
    showFreeplanCard() {
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            friendsList.innerHTML = `
                <h3>👥 친구 목록</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                
                <!-- 친구 목록 컨테이너 -->
                <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <!-- 무료 플랜 카드 -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">무료 플랜</div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">친구 1/1명 <span style="color: #dc3545;">(제한 도달)</span></div>
                        <button style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">업그레이드</button>
                    </div>
                    
                    <!-- 친구 카드 -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid #fd7e14; margin-bottom: 10px;">
                        <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <div style="font-size: 16px; font-weight: bold; color: #333;">친구</div>
                                    <div style="font-size: 14px; color: #fd7e14; font-weight: bold;">경고</div>
                                </div>
                                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">이메일@example.com</div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-size: 13px; color: #666;">1일 전 활동</div>
                                    <button style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">친구삭제</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            console.log('📋 [생명구조] 무료플랜 카드 즉시 표시 완료');
        }
    }

    // 친구 추가
    async addFriend() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            auth.showNotification('로그인이 필요합니다.', 'error');
            return;
        }
        
        // 🎯 요금제 확인 - 친구 추가 가능 여부 체크
        if (window.subscriptionManager && !window.subscriptionManager.canAddFriend()) {
            // subscriptionManager가 업그레이드 프롬프트를 표시함
            return;
        }

        const friendInviteCodeInput = document.getElementById('friend-invite-code');
        const friendInviteCode = friendInviteCodeInput.value.trim();

        if (!friendInviteCode) {
            auth.showNotification('초대코드를 입력해주세요.', 'error');
            return;
        }

        // 초대코드가 자신의 것인지 확인 (초대코드 매니저가 있는 경우)
        if (window.inviteCodeManager && window.inviteCodeManager.myInviteCode === friendInviteCode.toUpperCase()) {
            auth.showNotification('자신의 초대코드는 입력할 수 없습니다.', 'error');
            return;
        }

        try {
            // invite-code.js의 기능을 활용하여 친구 추가
            if (window.inviteCodeManager && typeof window.inviteCodeManager.addFriendByCode === 'function') {
                // 초대코드 매니저가 있으면 그것을 사용 (더 안전하고 완전한 구현)
                await window.inviteCodeManager.addFriendByCode(friendInviteCode);
                friendInviteCodeInput.value = '';
                await this.loadFriends();
            } else {
                // 백업: 초대코드 매니저가 없는 경우 안내
                auth.showNotification('초대코드 시스템이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.', 'warning');
                return;
            }

        } catch (error) {
            console.error('친구 추가 실패:', error);
            auth.showNotification('친구 추가에 실패했습니다.', 'error');
        }
    }

    // 친구 관계 존재 확인
    async checkFriendshipExists(user1, user2) {
        try {
            const friends1 = await this.storage.getFriends(user1);
            return friends1.some(friendship => friendship.friend === user2);
        } catch (error) {
            console.error('친구 관계 확인 실패:', error);
            return false;
        }
    }

    // 🚨 생명구조 앱: 친구 목록 로드 (로딩 스피너 포함)
    async loadFriends() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ 로그인된 사용자가 없습니다 - 친구 로딩 중단');
            return;
        }

        // 🚨 생명구조 앱: 중복 로딩 방지 체크
        if (this.isLoading) {
            console.warn('⚠️ [생명구조] 이미 친구 목록 로딩 중 - 중복 요청 차단');
            return;
        }

        // 🚨 생명구조 앱: 로딩 빈도 제한 (500ms 쿨다운으로 단축)
        const now = Date.now();
        if (now - this.lastLoadTime < 500) {
            console.warn('⚠️ [생명구조] 너무 빈번한 로딩 요청 - 쿨다운 중');
            return;
        }

        // 🚨 생명구조 앱: 로딩 상태 설정
        this.isLoading = true;
        this.lastLoadTime = now;

        // 🔄 로딩 스피너 표시
        this.showLoadingSpinner();
        console.log('🔄 [생명구조] 친구 목록 로딩 시작...');

        try {

            // 🔍 [생명구조] 시스템 상태 상세 진단
            console.log('🔍 [생명구조] 시스템 상태 진단:');
            console.log('  - this.storage 존재:', !!this.storage);
            console.log('  - this.storage.isInitialized:', this.storage?.isInitialized);
            console.log('  - window.storage 존재:', !!window.storage);
            console.log('  - window.firebaseClient 존재:', !!window.firebaseClient);
            console.log('  - Firebase 앱 존재:', !!window.firebase);
            console.log('  - 현재 사용자 정보:', currentUser);

            // 🔧 [생명구조] Storage 자동 복구 시스템
            if (!this.storage) {
                console.log('🔧 [생명구조] Storage 없음 - 자동 복구 시도');
                
                // window.storage 사용 시도
                if (window.storage && window.storage.isInitialized) {
                    console.log('✅ [생명구조] window.storage로 복구 성공');
                    this.storage = window.storage;
                } 
                // firebaseClient 사용 시도
                else if (window.firebaseClient) {
                    console.log('✅ [생명구조] firebaseClient로 복구 시도');
                    this.storage = window.firebaseClient;
                }
                // 완전히 재초기화 시도
                else {
                    console.warn('🔧 [생명구조] Storage 완전 재초기화 필요');
                    throw new Error('Firebase Storage가 초기화되지 않았습니다. 앱을 다시 시작해 주세요.');
                }
            }

            // Storage 초기화 확인 및 대기
            if (!this.storage.isInitialized) {
                console.warn('⚠️ [생명구조] Storage 초기화 대기 중...');
                
                // 최대 10초 대기
                let waitCount = 0;
                const maxWait = 20; // 10초 (500ms * 20)
                
                const waitForInit = () => {
                    if (this.storage && this.storage.isInitialized) {
                        console.log('✅ [생명구조] Storage 초기화 완료 - 로딩 계속');
                        // 즉시 로딩 계속 (재귀 호출 방지)
                        this.loadFriendsInternal();
                        return;
                    }
                    
                    waitCount++;
                    if (waitCount >= maxWait) {
                        console.error('❌ [생명구조] Storage 초기화 타임아웃');
                        this.isLoading = false;
                        this.hideLoadingSpinner();
                        
                        // 타임아웃 시 에러 메시지 표시
                        const friendsList = document.getElementById('current-friends-list');
                        if (friendsList) {
                            friendsList.innerHTML = `
                                <h3>👥 친구 목록</h3>
                                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                                
                                <!-- 친구 목록 컨테이너 -->
                                <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                                    <div class="error-message" style="text-align: center; padding: 40px;">
                                        <div style="font-size: 48px; margin-bottom: 15px;">🔌</div>
                                        <p style="color: #dc3545; font-size: 16px; margin: 0;">Firebase 연결 초기화 실패</p>
                                        <p style="color: #666; font-size: 14px; margin-top: 5px;">잠시 후 다시 시도해 주세요.</p>
                                        <button onclick="window.friendsManager.loadFriends()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">다시 시도</button>
                                    </div>
                                </div>
                            `;
                        }
                        return;
                    }
                    
                    console.log(`🔄 [생명구조] Storage 초기화 대기 중... (${waitCount}/${maxWait})`);
                    setTimeout(waitForInit, 500);
                };
                
                waitForInit();
                return;
            }

            // 실제 로딩 작업 실행
            await this.loadFriendsInternal();

        } catch (error) {
            console.error('❌ [생명구조] 친구 목록 로드 실패:', error);
            console.error('❌ [생명구조] 오류 상세 정보:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // 🔄 로딩 스피너 숨기기 (실패)
            this.hideLoadingSpinner();
            
            // 🔍 [생명구조] 상세한 오류 진단
            let errorMessage = '알 수 없는 오류가 발생했습니다.';
            let errorIcon = '❓';
            let troubleshooting = '';
            
            // 오류 유형별 진단
            if (error.message.includes('storage') || error.message.includes('Storage')) {
                errorMessage = 'Firebase 연결에 문제가 있습니다.';
                errorIcon = '🔌';
                troubleshooting = 'Firebase 서비스 상태를 확인 중입니다...';
            } else if (error.message.includes('auth') || error.message.includes('Authentication')) {
                errorMessage = '사용자 인증에 문제가 있습니다.';
                errorIcon = '🔐';
                troubleshooting = '다시 로그인해 주세요.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = '네트워크 연결에 문제가 있습니다.';
                errorIcon = '🌐';
                troubleshooting = '인터넷 연결을 확인해 주세요.';
            } else if (error.message.includes('permission') || error.message.includes('권한')) {
                errorMessage = '데이터 접근 권한이 없습니다.';
                errorIcon = '🚫';
                troubleshooting = '관리자에게 문의해 주세요.';
            } else if (!this.storage) {
                errorMessage = 'Firebase 저장소가 초기화되지 않았습니다.';
                errorIcon = '⚠️';
                troubleshooting = '앱을 다시 시작해 주세요.';
            } else if (!this.storage.isInitialized) {
                errorMessage = 'Firebase 연결 초기화 중입니다.';
                errorIcon = '🔄';
                troubleshooting = '잠시 후 다시 시도해 주세요.';
            }
            
            console.log('🔍 [생명구조] 진단된 오류:', errorMessage);
            
            // 사용자에게 정확한 오류 메시지 표시
            const friendsList = document.getElementById('current-friends-list');
            if (friendsList) {
                friendsList.innerHTML = `
                    <h3>👥 친구 목록</h3>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                    
                    <!-- 친구 목록 컨테이너 -->
                    <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                        <div class="no-friends">
                            <p style="text-align: center; color: #ff6b6b; padding: 20px; font-size: 16px;">
                                ${errorIcon} ${errorMessage}
                            </p>
                            <p style="text-align: center; color: #666; font-size: 14px; margin: 10px 0;">
                                ${troubleshooting}
                            </p>
                            <div style="text-align: center; margin-top: 15px;">
                                <button onclick="window.friendManager?.loadFriends()" 
                                        style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 0 5px; font-size: 14px;">
                                    🔄 다시 시도
                                </button>
                                <button onclick="window.location.reload()" 
                                        style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 0 5px; font-size: 14px;">
                                    🔃 앱 재시작
                                </button>
                            </div>
                            <details style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                                <summary style="cursor: pointer; color: #666;">🔧 개발자 정보 (클릭하여 확장)</summary>
                                <pre style="margin: 10px 0; color: #333; white-space: pre-wrap;">${error.message}\n\n상세 스택:\n${error.stack}</pre>
                            </details>
                        </div>
                    </div>
                `;
            }
            
            // 알림도 정확한 메시지로 표시
            auth.showNotification(errorMessage, 'error');
        } finally {
            // 🚨 생명구조 앱: 로딩 상태 항상 해제
            this.isLoading = false;
            console.log('🔓 [생명구조] 친구 목록 로딩 상태 해제');
        }
    }

    // 🔍 [생명구조] 실제 친구 데이터 로딩 로직 (분리된 함수)
    async loadFriendsInternal() {
        try {
            const currentUser = auth.getCurrentUser();
            
            // 🔍 [생명구조] Firebase 친구 데이터 읽기 시도
            console.log('🔍 [생명구조] 현재 사용자:', currentUser);
            console.log('🔍 [생명구조] 주 식별자(id)로 친구 검색:', currentUser.id);
                
            let friendships = await this.storage.getFriends(currentUser.id);
            console.log('🔍 [생명구조] Firebase에서 읽은 친구 데이터:', friendships);
            console.log('🔍 [생명구조] 친구 수:', friendships ? friendships.length : 'null/undefined');
            
            // 백업: 다른 필드명으로도 시도해보기
            if (!friendships || friendships.length === 0) {
                console.log('🔍 [생명구조] id로 친구를 찾지 못함, 다른 방법 시도...');
                
                // kakao_id로 시도해보기
                if (currentUser.kakao_id && currentUser.kakao_id !== currentUser.id) {
                    console.log('🔍 [생명구조] kakao_id로 친구 검색 시도:', currentUser.kakao_id);
                    const friendshipsByKakaoId = await this.storage.getFriends(currentUser.kakao_id);
                    console.log('🔍 [생명구조] kakao_id로 찾은 친구 데이터:', friendshipsByKakaoId);
                    
                    if (friendshipsByKakaoId && friendshipsByKakaoId.length > 0) {
                        friendships = friendshipsByKakaoId;
                        console.log('✅ [생명구조] kakao_id로 친구 데이터 발견!');
                    }
                }
                
                // username으로 시도해보기 (있는 경우)
                if ((!friendships || friendships.length === 0) && currentUser.username) {
                    console.log('🔍 [생명구조] username으로 친구 검색 시도:', currentUser.username);
                    const friendshipsByUsername = await this.storage.getFriends(currentUser.username);
                    console.log('🔍 [생명구조] username으로 찾은 친구 데이터:', friendshipsByUsername);
                    
                    if (friendshipsByUsername && friendshipsByUsername.length > 0) {
                        friendships = friendshipsByUsername;
                        console.log('✅ [생명구조] username으로 친구 데이터 발견!');
                    }
                }
                
                // email로도 시도해보기  
                if ((!friendships || friendships.length === 0) && currentUser.email) {
                    console.log('🔍 [생명구조] Email로 친구 검색 시도:', currentUser.email);
                    const friendshipsByEmail = await this.storage.getFriends(currentUser.email);
                    console.log('🔍 [생명구조] Email로 찾은 친구 데이터:', friendshipsByEmail);
                    
                    if (friendshipsByEmail && friendshipsByEmail.length > 0) {
                        friendships = friendshipsByEmail;
                        console.log('✅ [생명구조] Email로 친구 데이터 발견!');
                    }
                }
            }
        
        // 🎯 요금제 정보 업데이트
        if (window.subscriptionManager) {
            window.subscriptionManager.friendsCount = friendships ? friendships.length : 0;
            window.subscriptionManager.updateStatusUI();
        }
        const friendsList = document.getElementById('current-friends-list');
        
        if (!friendsList) return;

        if (!friendships || friendships.length === 0) {
            // 🔄 로딩 스피너 숨기기
            this.hideLoadingSpinner();
            console.log('ℹ️ [생명구조] 등록된 친구가 없음');
            
            friendsList.innerHTML = `
                <h3>👥 친구 목록</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                
                <!-- 친구 목록 컨테이너 -->
                <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <!-- 무료 플랜 카드 -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">무료 플랜</div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">친구 1/1명 <span style="color: #dc3545;">(제한 도달)</span></div>
                        <button style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">업그레이드</button>
                    </div>
                    
                    <!-- 친구 카드 -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid #ffc107; margin-bottom: 10px;">
                        <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <div style="font-size: 16px; font-weight: bold; color: #333;">친구이름</div>
                                    <div style="font-size: 14px; color: #ffc107; font-weight: bold;">주의</div>
                                </div>
                                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">이메일@example.com</div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-size: 13px; color: #666;">1일 전 활동</div>
                                    <button style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">친구삭제</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // 친구 정보와 상태 가져오기
        const friendsWithDetails = await Promise.all(
            friendships.map(async (friendship) => {
                const friendUser = await this.storage.getUser(friendship.friend);
                const friendStatus = await this.storage.getUserStatus(friendship.friend);
                return {
                    friendship,
                    user: friendUser,
                    status: friendStatus
                };
            })
        );

        // ✅ 이미지 기능 적용됨 - 2024.09.24 20:35 수정본
        console.log('🔥 [생명구조] friends.js 최신 버전 - 안전한 친구카드 시스템 활성화!');
        
        // 🎯 요금제 정보 표시
        const subscriptionInfo = this.getSubscriptionInfo();
        
        // 친구 목록 HTML 생성 (invite-code.js와 동일한 하트비트 기반 로직 사용)
        const friendCardsHtml = [];
        
        for (const friend of friendsWithDetails) {
            const friendName = friend.user?.name || friend.friendship.friend;
            
            // 🚨 생명구조 시스템: Firebase phone 필드에서 전화번호 가져오기
            const friendPhone = friend.user?.phone || 
                              friend.user?.phoneNumber || 
                              friend.user?.emergency_contact1 || 
                              friend.user?.emergency_contact2 ||
                              '전화번호가 등록되어 있지 않습니다.';
            
            // 🚨 생명구조: Firebase 전화번호 데이터 확인 로그
            console.log(`📞 [Firebase] ${friendName} 전화번호:`, friendPhone);
            console.log(`📞 [Firebase] ${friendName} user 데이터:`, {
                phone: friend.user?.phone,
                phoneNumber: friend.user?.phoneNumber,
                emergency_contact1: friend.user?.emergency_contact1,
                emergency_contact2: friend.user?.emergency_contact2
            });
            
            const friendId = friend.user?.id || friend.friendship.friend;
            
            // 변수 선언 (try-catch 밖에서 사용하기 위해)
            let lastActivity = null;
            let heartbeatHours = 0; // 기본값: 정상 (invite-code.js와 동일)
            let statusColor = '#28a745'; // 기본 초록색 (안전)
            let statusText = '안전';
            let statusIcon = '🟢';
            let timeDisplay = '';
            
            try {
                // 🚨 Firebase 하트비트 데이터 조회 (invite-code.js와 동일한 방식)
                const heartbeatsResult = await window.firebaseClient.queryDocuments('heartbeats', [
                    ['user_id', '==', friendId]
                ]);
                
                if (heartbeatsResult.data && heartbeatsResult.data.length > 0) {
                    // 클라이언트 사이드에서 최신 순으로 정렬
                    const sortedHeartbeats = heartbeatsResult.data.sort((a, b) => {
                        const timestampA = new Date(a.timestamp).getTime();
                        const timestampB = new Date(b.timestamp).getTime();
                        return timestampB - timestampA; // 내림차순 (최신 순)
                    });
                    
                    lastActivity = sortedHeartbeats[0].timestamp;
                    
                    // RealTimeStatusManager 사용하여 일관된 시간 계산
                    if (window.realTimeStatusManager) {
                        const timeText = window.realTimeStatusManager.formatTimeDifference(lastActivity);
                        // "X시간 전" 형식에서 숫자만 추출
                        const hoursMatch = timeText.match(/(\d+)시간/);
                        if (hoursMatch) {
                            heartbeatHours = parseInt(hoursMatch[1]);
                        } else if (timeText.includes('분 전')) {
                            heartbeatHours = 0; // 1시간 미만
                        } else if (timeText.includes('일 전')) {
                            const daysMatch = timeText.match(/(\d+)일/);
                            if (daysMatch) {
                                heartbeatHours = parseInt(daysMatch[1]) * 24;
                            }
                        } else {
                            // 백업: 직접 계산
                            const now = new Date();
                            const last = new Date(lastActivity);
                            const diffMs = now - last;
                            heartbeatHours = Math.floor(diffMs / (1000 * 60 * 60));
                        }
                    } else {
                        // 백업: 직접 계산
                        const now = new Date();
                        const last = new Date(lastActivity);
                        const diffMs = now - last;
                        heartbeatHours = Math.floor(diffMs / (1000 * 60 * 60));
                    }
                } else {
                    // 하트비트 데이터가 없으면 매우 오래된 것으로 처리 (invite-code.js와 동일)
                    heartbeatHours = 999;
                    lastActivity = null;
                }
                
                // 🚨 생명구조 4단계 위험도 판단 (invite-code.js와 동일)
                statusColor = '#28a745'; // 기본 초록색 (안전)
                statusText = '안전';
                statusIcon = '🟢';
                
                if (heartbeatHours >= 72) {
                    statusColor = '#dc3545'; // 빨간색 (위험)
                    statusText = '위험';
                    statusIcon = '🔴';
                } else if (heartbeatHours >= 48) {
                    statusColor = '#fd7e14'; // 주황색 (경고)
                    statusText = '경고';
                    statusIcon = '🟠';
                } else if (heartbeatHours >= 24) {
                    statusColor = '#ffc107'; // 노란색 (주의)
                    statusText = '주의';
                    statusIcon = '🟡';
                }
                
                console.log(`🔍 [생명구조] ${friendName} 상태: ${heartbeatHours}시간 → ${statusText}`);
                
                // 시간 표시 포맷팅 (invite-code.js의 getFormattedTime과 동일)
                timeDisplay = this.getFormattedTime(lastActivity, heartbeatHours);
                
            } catch (error) {
                console.warn(`${friendName} 하트비트 조회 실패:`, error);
                // 오류 시 안전한 기본값 (invite-code.js와 동일)
                heartbeatHours = 999;
                lastActivity = null;
                
                statusColor = '#dc3545'; // 빨간색 (위험)
                statusText = '위험';
                statusIcon = '🔴';
                timeDisplay = this.getFormattedTime(lastActivity, heartbeatHours);
            }
            
            // HTML 생성 - 요청된 ☵ 형식으로 수정
            friendCardsHtml.push(`
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid ${statusColor}; margin-bottom: 10px;">
                    <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <div style="font-size: 16px; font-weight: bold; color: #333;">${friendName}</div>
                                <div style="font-size: 14px; color: ${statusColor}; font-weight: bold;">${statusText}</div>
                            </div>
                            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${friend.user?.email || '이메일@example.com'}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-size: 13px; color: #666;">${timeDisplay}</div>
                                <button onclick="window.friendsManager.removeFriend('${friend.friendship.friend}')" 
                                        style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">친구삭제</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }
        
        // 🚨 생명구조: 스피너 안전 교체 로직 (충돌 방지)
        const spinnerContainer = document.getElementById('friends-loading-container');
        if (spinnerContainer && !window.friendsSpinnerHandled) {
            console.log('🔄 [Friends] 스피너를 친구 목록으로 안전하게 교체 중...');
            spinnerContainer.style.display = 'none';
            window.friendsSpinnerHandled = true; // 전역 플래그로 중복 방지
        }
        
        friendsList.innerHTML = `
            <h3>👥 친구 목록</h3>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
            
            <!-- 친구 목록 컨테이너 -->
            <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                <!-- 무료 플랜 카드 -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                    <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">무료 플랜</div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 10px;">친구 1/1명 <span style="color: #dc3545;">(제한 도달)</span></div>
                    <button style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">업그레이드</button>
                </div>
                
                ${friendCardsHtml.join('')}
            </div>
        `;
            
            console.log('✅ [생명구조] 친구카드 렌더링 완료 - 실제 하트비트 데이터 기반');
            
            // 🔄 로딩 스피너 숨기기 (성공)
            this.hideLoadingSpinner();
            console.log(`✅ [생명구조] 친구 목록 로딩 완료 - ${friendCardsHtml.length}명`);
            
        } catch (error) {
            // 🚨 이 부분은 loadFriendsInternal에서 친구 데이터 처리 중 오류 (storage.js 오류가 아님)
            console.error('❌ [생명구조] 친구 데이터 처리 중 오류:', error);
            console.error('❌ [생명구조] 오류 상세 정보:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // 🔄 로딩 스피너 숨기기 (실패)
            this.hideLoadingSpinner();
            
            // 🔍 [생명구조] 친구 데이터 처리 오류 진단
            let errorMessage = '친구 정보를 처리하는 중 오류가 발생했습니다.';
            let errorIcon = '⚙️';
            let troubleshooting = '잠시 후 다시 시도해 주세요.';
            
            // 오류 유형별 진단
            if (error.message.includes('getUser') || error.message.includes('getUserStatus')) {
                errorMessage = '친구의 상세 정보를 가져오는데 실패했습니다.';
                errorIcon = '👤';
                troubleshooting = '일부 친구 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.';
            } else if (error.message.includes('Promise') || error.message.includes('async')) {
                errorMessage = '친구 정보 로딩 중 시스템 오류가 발생했습니다.';
                errorIcon = '⏳';
                troubleshooting = '시스템이 일시적으로 바쁩니다. 잠시 후 다시 시도해 주세요.';
            }
            
            console.log('🔍 [생명구조] 친구 데이터 처리 오류 진단:', errorMessage);
            
            // 사용자에게 정확한 오류 메시지 표시
            const friendsList = document.getElementById('current-friends-list');
            if (friendsList) {
                friendsList.innerHTML = `
                    <h3>👥 친구 목록</h3>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                    
                    <!-- 친구 목록 컨테이너 -->
                    <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                        <div class="no-friends">
                            <p style="text-align: center; color: #ff6b6b; padding: 20px; font-size: 16px;">
                                ${errorIcon} ${errorMessage}
                            </p>
                            <p style="text-align: center; color: #666; font-size: 14px; margin: 10px 0;">
                                ${troubleshooting}
                            </p>
                            <div style="text-align: center; margin-top: 15px;">
                                <button onclick="window.friendManager?.loadFriends()" 
                                        style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 0 5px; font-size: 14px;">
                                    🔄 다시 시도
                                </button>
                                <button onclick="window.location.reload()" 
                                        style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 0 5px; font-size: 14px;">
                                    🔃 앱 재시작
                                </button>
                            </div>
                            <details style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                                <summary style="cursor: pointer; color: #666;">🔧 개발자 정보 (클릭하여 확장)</summary>
                                <pre style="margin: 10px 0; color: #333; white-space: pre-wrap;">친구 데이터 처리 오류
오류 메시지: ${error.message}

상세 스택:
${error.stack}</pre>
                            </details>
                        </div>
                    </div>
                `;
            }
            
            // 알림도 정확한 메시지로 표시
            auth.showNotification(errorMessage, 'error');
        }
    }

    // 🔄 로딩 스피너 표시
    showLoadingSpinner() {
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            friendsList.innerHTML = `
                <h3>👥 친구 목록</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">등록된 친구들의 현황을 확인하고 관리하세요</p>
                
                <!-- 친구 목록 컨테이너 -->
                <div style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <div class="loading-friends" style="text-align: center; padding: 40px;">
                        <div style="font-size: 32px; margin-bottom: 15px; animation: spin 1s linear infinite;">⟳</div>
                        <p class="loading-friends-text" style="color: #666; font-size: 16px; margin: 0; border: 2px solid #e9ecef; border-radius: 8px; padding: 10px 15px; background: #f8f9fa; display: inline-block;">친구 목록을 불러오는 중...</p>
                        <p class="loading-friends-subtext" style="color: #999; font-size: 14px; margin-top: 10px; border: 1px solid #dee2e6; border-radius: 6px; padding: 8px 12px; background: #ffffff; display: inline-block;">잠시만 기다려주세요</p>
                    </div>
                    
                    <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    </style>
                </div>
            `;
        }
    }

    // 🔄 로딩 스피너 숨기기
    hideLoadingSpinner() {
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            const loadingElement = friendsList.querySelector('.loading-friends');
            if (loadingElement) {
                console.log('🔄 [생명구조] 로딩 스피너 제거');
                loadingElement.remove();
            }
        }
    }

    // 친구 삭제
    async removeFriend(friendUsername) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        if (!confirm(`${friendUsername}님을 친구에서 삭제하시겠습니까?`)) {
            return;
        }

        try {
            // 양방향 친구 관계 삭제
            await this.storage.removeFriend(currentUser.username, friendUsername);
            await this.storage.removeFriend(friendUsername, currentUser.username);

            auth.showNotification('친구가 삭제되었습니다.');
            await this.loadFriends();

        } catch (error) {
            console.error('친구 삭제 실패:', error);
            auth.showNotification('친구 삭제에 실패했습니다.', 'error');
        }
    }

    // 시간 전 표시 (통합된 함수 사용)
    // @deprecated 이 함수는 RealTimeStatusManager.formatTimeDifference()로 통합되었습니다.
    getTimeAgo(timestamp) {
        // 실시간 시간 관리자가 있으면 그것을 우선 사용
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(timestamp);
        }
        
        // alert-level-manager의 통합된 함수 사용 (2차 백업)
        if (window.alertLevelManager) {
            return window.alertLevelManager.formatTimeDifference(timestamp);
        }
        
        // 최종 백업: 기존 로직 유지 (호환성)
        console.warn('⚠️ 통합된 시간 관리자를 찾을 수 없음 (friends.js), 백업 시간 계산 사용');
        
        try {
            const now = new Date();
            const activityTime = new Date(timestamp);
            
            // 유효하지 않은 날짜 처리
            if (isNaN(activityTime.getTime())) {
                console.warn('⚠️ 유효하지 않은 timestamp:', timestamp);
                return '알 수 없음';
            }
            
            const diffMs = now - activityTime;
            
            // 음수 시간 차이 처리 (미래 시간)
            if (diffMs < 0) {
                return '방금 전';
            }
            
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 30) {
                return '방금 전';
            } else if (diffMins < 1) {
                return '1분 미만';
            } else if (diffMins < 60) {
                return `${diffMins}분 전`;
            } else if (diffHours < 24) {
                return `${diffHours}시간 전`;
            } else if (diffDays < 7) {
                return `${diffDays}일 전`;
            } else {
                return activityTime.toLocaleDateString('ko-KR');
            }
        } catch (error) {
            console.error('❌ 시간 계산 오류 (friends.js):', error);
            return '알 수 없음';
        }
    }

    // 친구 검색 (향후 확장을 위한 메서드)
    async searchUsers(query) {
        // 실제 구현에서는 서버 API 호출
        // 현재는 로컬 저장소에서 검색하는 간단한 구현
        try {
            const allUsers = await this.storage.getAllFromStore('users');
            return allUsers.filter(user => 
                user.username.toLowerCase().includes(query.toLowerCase()) ||
                user.name.toLowerCase().includes(query.toLowerCase())
            );
        } catch (error) {
            console.error('사용자 검색 실패:', error);
            return [];
        }
    }

    // 친구 추천 (향후 확장을 위한 메서드)
    async getFriendRecommendations(limit = 5) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return [];

        try {
            // 현재 친구들의 친구를 추천하는 간단한 로직
            const currentFriends = await this.storage.getFriends(currentUser.username);
            const currentFriendsList = currentFriends.map(f => f.friend);
            
            const recommendations = [];
            
            for (const friendship of currentFriends) {
                const friendsFriends = await this.storage.getFriends(friendship.friend);
                for (const ff of friendsFriends) {
                    if (ff.friend !== currentUser.username && 
                        !currentFriendsList.includes(ff.friend) &&
                        !recommendations.some(r => r.username === ff.friend)) {
                        
                        const user = await this.storage.getUser(ff.friend);
                        if (user) {
                            recommendations.push(user);
                        }
                    }
                }
            }

            return recommendations.slice(0, limit);
        } catch (error) {
            console.error('친구 추천 실패:', error);
            return [];
        }
    }

    // 친구 상태 실시간 업데이트 (웹소켓 연결이 있을 때 사용)
    handleFriendStatusUpdate(friendUsername, newStatus) {
        const friendElement = document.querySelector(`[data-friend="${friendUsername}"]`);
        if (friendElement) {
            // UI 업데이트
            this.updateFriendStatusInUI(friendElement, newStatus);
        }
    }

    // UI에서 친구 상태 업데이트
    updateFriendStatusInUI(friendElement, status) {
        const statusElement = friendElement.querySelector('.friend-status');
        if (statusElement) {
            statusElement.textContent = status.activity === 'active' ? '온라인' : '오프라인';
            statusElement.className = `friend-status ${status.activity}`;
        }

        const lastActivityElement = friendElement.querySelector('.last-activity');
        if (lastActivityElement && status.lastActivity) {
            lastActivityElement.textContent = `마지막 활동: ${this.getTimeAgo(status.lastActivity)}`;
        }
    }

    // 친구 활동 알림 체크
    async checkFriendActivity(friendUsername) {
        try {
            const friendStatus = await this.storage.getUserStatus(friendUsername);
            if (!friendStatus) return null;

            const now = new Date();
            const lastActivity = new Date(friendStatus.lastActivity);
            const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

            let alertLevel = null;
            if (hoursSinceActivity >= 72) {
                alertLevel = 'emergency'; // 72시간
            } else if (hoursSinceActivity >= 48) {
                alertLevel = 'critical'; // 48시간
            } else if (hoursSinceActivity >= 24) {
                alertLevel = 'warning'; // 24시간
            }

            return {
                friend: friendUsername,
                hoursSinceActivity: Math.floor(hoursSinceActivity),
                alertLevel: alertLevel,
                lastActivity: friendStatus.lastActivity
            };

        } catch (error) {
            console.error(`친구 ${friendUsername} 활동 확인 실패:`, error);
            return null;
        }
    }
    
    // 🎯 요금제 정보 표시 HTML 생성
    getSubscriptionInfo() {
        if (!window.subscriptionManager) return '';
        
        const status = window.subscriptionManager.subscriptionStatus;
        const plan = window.subscriptionManager.plans[status?.plan || 'FREE'];
        const currentCount = window.subscriptionManager.friendsCount;
        const maxCount = plan.maxFriends;
        const remaining = maxCount - currentCount;
        
        return `
            <div class="subscription-info-box" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${plan.name}</strong> - 
                        친구 ${currentCount}/${maxCount}명
                        ${remaining > 0 ? 
                            `<span style="color: #28a745;"> (${remaining}명 더 추가 가능)</span>` : 
                            `<span style="color: #dc3545;"> (제한 도달)</span>`
                        }
                    </div>
                    ${status?.plan === 'FREE' || remaining === 0 ? 
                        `<button class="btn-sm-upgrade" style="padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.subscriptionManager?.showSubscriptionManagement()">업그레이드</button>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * 실시간 시간 표시 함수 (invite-code.js와 동일한 로직)
     * @param {string} lastActivity - 마지막 활동 시간
     * @param {number} heartbeatHours - 하트비트 시간 차이
     * @returns {string} 포맷된 시간 문자열
     */
    getFormattedTime(lastActivity, heartbeatHours) {
        if (!lastActivity || heartbeatHours === 999) {
            return '활동 기록 없음';
        }
        
        // RealTimeStatusManager 사용하여 일관된 시간 표시
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(lastActivity);
        }
        
        // 백업: 기본 시간 표시 (프라이버시 보호 포함)
        if (heartbeatHours < 1) {
            return '방금 전 활동';
        } else if (heartbeatHours < 24) {
            return `${heartbeatHours}시간 전 활동`;
        } else {
            const days = Math.floor(heartbeatHours / 24);
            return `${days}일 전 활동`;
        }
    }

}

// 전역 인스턴스 생성
let friendsManager;

// DOM 로드 후 초기화 (로그인 상태 확인 후)
document.addEventListener('DOMContentLoaded', () => {
    // storage가 초기화될 때까지 대기 + 로그인 상태 확인
    const initFriendsManager = () => {
        // 로그인 상태 확인
        const savedUser = localStorage.getItem('currentUser');
        const isLoggedIn = savedUser && auth?.getCurrentUser();
        
        if (!isLoggedIn) {
            console.log('⚠️ Friends Manager: 로그인 상태가 아니므로 초기화 안함');
            return; // 무한 루프 방지 - 재시도하지 않음
        }
        
        if (window.storage && storage.db) {
            console.log('✅ Friends Manager: 로그인 상태 확인됨, 초기화 진행');
            friendsManager = new FriendsManager(storage);
            window.friendsManager = friendsManager; // 전역 접근을 위해
        } else {
            setTimeout(initFriendsManager, 100);
        }
    };
    
    // 3초 후 초기화 시작 (다른 시스템이 완전히 로드될 때까지)
    setTimeout(initFriendsManager, 3000);
});