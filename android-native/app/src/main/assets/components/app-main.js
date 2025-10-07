/**
 * Lonely Care 앱 메인 컨트롤러 v2.0
 * 모든 컴포넌트를 독립적으로 관리하는 통합 시스템
 */
class LonelyCareApp {
    constructor() {
        this.components = {
            kakaoAuth: null,
            friendStatus: null,
            notifications: null,
            inviteSystem: null,
            profile: null,
            ads: null
        };
        
        this.currentUser = null;
        this.isInitialized = false;
        
        console.log('🚀 Lonely Care 앱 초기화 시작');
        this.init();
    }

    /**
     * 앱 초기화 - 컴포넌트들을 독립적으로 생성
     */
    async init() {
        try {
            console.log('📦 컴포넌트들 초기화 중...');
            
            // 1. 카카오 인증 컴포넌트 초기화 (가장 먼저)
            await this.initKakaoAuthComponent();
            
            // 2. 친구 상태 컴포넌트 초기화 (로그인 후에 활성화)
            this.initFriendStatusComponent();
            
            // 3. 기타 컴포넌트들 초기화 (독립적으로)
            this.initOtherComponents();
            
            // 4. 이벤트 연결 설정
            this.setupComponentConnections();
            
            this.isInitialized = true;
            console.log('✅ Lonely Care 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            this.showInitError(error);
        }
    }

    /**
     * 카카오 인증 컴포넌트 초기화
     */
    async initKakaoAuthComponent() {
        if (typeof KakaoAuthComponent === 'undefined') {
            throw new Error('KakaoAuthComponent가 로드되지 않았습니다.');
        }

        this.components.kakaoAuth = new KakaoAuthComponent({
            appKey: 'dd74fd58abbb75eb58df11ecc92d6727'
        });

        // 카카오 인증 이벤트 핸들러
        this.components.kakaoAuth.on('ready', () => {
            console.log('✅ 카카오 인증 컴포넌트 준비 완료');
            this.showLoginButton();
        });

        this.components.kakaoAuth.on('login-success', (user) => {
            console.log('✅ 카카오 로그인 성공:', user);
            this.handleLoginSuccess(user);
        });

        this.components.kakaoAuth.on('login-error', (error) => {
            console.error('❌ 카카오 로그인 실패:', error);
            this.showLoginError(error);
        });

        this.components.kakaoAuth.on('logout-success', () => {
            console.log('✅ 카카오 로그아웃 성공');
            this.handleLogout();
        });
    }

    /**
     * 친구 상태 컴포넌트 초기화
     */
    initFriendStatusComponent() {
        if (typeof FriendStatusComponent === 'undefined') {
            console.warn('FriendStatusComponent가 로드되지 않았습니다.');
            return;
        }

        this.components.friendStatus = new FriendStatusComponent();

        // 친구 상태 이벤트 핸들러
        this.components.friendStatus.on('ready', () => {
            console.log('✅ 친구 상태 컴포넌트 준비 완료');
        });

        this.components.friendStatus.on('friends-updated', (data) => {
            console.log(`📊 친구 상태 업데이트: ${data.friends.length}명`);
            this.updateFriendStatusDisplay(data.friends);
        });

        this.components.friendStatus.on('loading-start', () => {
            this.showFriendStatusLoading();
        });

        this.components.friendStatus.on('loading-end', () => {
            this.hideFriendStatusLoading();
        });

        this.components.friendStatus.on('error', (error) => {
            console.error('❌ 친구 상태 오류:', error);
            this.showFriendStatusError(error);
        });
    }

    /**
     * 기타 컴포넌트들 초기화
     */
    initOtherComponents() {
        // 알림 컴포넌트 (미래 구현)
        // this.initNotificationComponent();
        
        // 초대 시스템 컴포넌트 (미래 구현)
        // this.initInviteSystemComponent();
        
        // 프로필 컴포넌트 (미래 구현)
        // this.initProfileComponent();
        
        // 광고 컴포넌트 (미래 구현)
        // this.initAdsComponent();

        console.log('📋 기타 컴포넌트들 초기화 완료');
    }

    /**
     * 컴포넌트간 연결 설정
     */
    setupComponentConnections() {
        // 현재는 카카오 인증 -> 친구 상태로만 데이터 전달
        // 각 컴포넌트는 독립적이므로 최소한의 연결만 유지
        console.log('🔗 컴포넌트 연결 설정 완료');
    }

    /**
     * 로그인 성공 처리
     */
    handleLoginSuccess(user) {
        this.currentUser = user;
        
        // 사용자 정보 저장 (컴포넌트들이 접근할 수 있도록)
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // 친구 상태 컴포넌트에 사용자 설정
        if (this.components.friendStatus) {
            this.components.friendStatus.setCurrentUser(user);
        }
        
        // UI 업데이트
        this.showMainApp();
        this.showUserInfo(user);
        
        console.log('🎉 로그인 완료 - 메인 앱 활성화');
    }

    /**
     * 로그아웃 처리
     */
    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        
        // 친구 상태 모니터링 중지
        if (this.components.friendStatus) {
            this.components.friendStatus.stopMonitoring();
        }
        
        // UI 업데이트
        this.showLoginScreen();
        
        console.log('👋 로그아웃 완료 - 로그인 화면으로');
    }

    /**
     * UI 업데이트 메서드들
     */
    showLoginButton() {
        const loginSection = document.getElementById('login-section');
        if (loginSection) {
            loginSection.style.display = 'block';
        }
    }

    showLoginError(error) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = `로그인 실패: ${error.message || error}`;
            errorDiv.style.display = 'block';
        }
    }

    showMainApp() {
        const loginSection = document.getElementById('login-section');
        const mainApp = document.getElementById('main-app');
        
        if (loginSection) loginSection.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
    }

    showLoginScreen() {
        const loginSection = document.getElementById('login-section');
        const mainApp = document.getElementById('main-app');
        
        if (loginSection) loginSection.style.display = 'block';
        if (mainApp) mainApp.style.display = 'none';
    }

    showUserInfo(user) {
        const userInfoDiv = document.getElementById('user-info');
        if (userInfoDiv) {
            userInfoDiv.innerHTML = `
                <div class="user-profile">
                    ${user.profile_image ? `<img src="${user.profile_image}" alt="프로필" class="profile-image">` : ''}
                    <div class="user-details">
                        <div class="user-nickname">${user.nickname || '사용자'}</div>
                        <div class="user-email">${user.email || ''}</div>
                    </div>
                </div>
            `;
        }
    }

    showFriendStatusLoading() {
        const friendsContainer = document.getElementById('friends-status');
        if (friendsContainer) {
            friendsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 24px; margin-bottom: 16px;">🔄</div>
                    <div>친구 상태를 불러오는 중...</div>
                </div>
            `;
        }
    }

    hideFriendStatusLoading() {
        // 로딩 상태는 friends-updated 이벤트에서 자동으로 처리됨
    }

    updateFriendStatusDisplay(friends) {
        const friendsContainer = document.getElementById('friends-status');
        if (!friendsContainer) return;

        if (friends.length === 0) {
            friendsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <p>등록된 친구가 없습니다.</p>
                </div>
            `;
            return;
        }

        const friendCards = friends.map(friend => this.createFriendCard(friend)).join('');
        friendsContainer.innerHTML = friendCards;
    }

    createFriendCard(friend) {
        const alertColors = {
            'normal': '#28a745',
            'warning': '#ffc107', 
            'danger': '#fd7e14',
            'critical': '#dc3545',
            'unknown': '#6c757d'
        };

        const alertTexts = {
            'normal': '정상',
            'warning': '주의',
            'danger': '위험', 
            'critical': '응급',
            'unknown': '알 수 없음'
        };

        const color = alertColors[friend.alert_level] || '#6c757d';
        const text = alertTexts[friend.alert_level] || '알 수 없음';
        const hoursText = friend.hours_since_heartbeat > 0 ? 
            `${friend.hours_since_heartbeat}시간 무응답` : '';

        return `
            <div class="friend-card" data-alert-level="${friend.alert_level}">
                <div class="friend-header">
                    <div class="friend-info">
                        <div class="friend-nickname">${friend.nickname || '친구'}</div>
                        <div class="friend-email">${friend.email || ''}</div>
                        ${hoursText ? `<div class="no-response-time">${hoursText}</div>` : ''}
                    </div>
                    <div class="alert-badge" style="background-color: ${color};">
                        <span>${text}</span>
                    </div>
                </div>
            </div>
        `;
    }

    showFriendStatusError(error) {
        const friendsContainer = document.getElementById('friends-status');
        if (friendsContainer) {
            friendsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 18px; margin-bottom: 8px;">친구 상태 로드 실패</div>
                    <div style="font-size: 14px;">${error.error?.message || error.type || '알 수 없는 오류'}</div>
                    <button onclick="lonelyCareApp.refreshFriendStatus()" 
                            style="margin-top: 16px; padding: 8px 16px;">
                        다시 시도
                    </button>
                </div>
            `;
        }
    }

    showInitError(error) {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <div style="font-size: 18px; margin-bottom: 8px;">앱 초기화 실패</div>
                <div style="font-size: 14px;">${error.message}</div>
                <button onclick="location.reload()" 
                        style="margin-top: 16px; padding: 8px 16px;">
                    새로고침
                </button>
            </div>
        `;
    }

    /**
     * 외부에서 호출 가능한 메서드들
     */
    async login() {
        if (this.components.kakaoAuth) {
            return await this.components.kakaoAuth.login();
        }
    }

    async logout() {
        if (this.components.kakaoAuth) {
            return await this.components.kakaoAuth.logout();
        }
    }

    refreshFriendStatus() {
        if (this.components.friendStatus) {
            return this.components.friendStatus.refresh();
        }
    }

    /**
     * 컴포넌트 상태 확인
     */
    getComponentStatus() {
        return {
            kakaoAuth: this.components.kakaoAuth?.isInitialized || false,
            friendStatus: this.components.friendStatus?.isLoading === false,
            currentUser: this.currentUser !== null,
            isInitialized: this.isInitialized
        };
    }

    /**
     * 앱 종료 시 정리
     */
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        this.components = {};
        this.currentUser = null;
        this.isInitialized = false;
        
        console.log('🗑️ Lonely Care 앱 정리 완료');
    }
}

// 전역 인스턴스 생성
let lonelyCareApp;

// DOM 로드 완료 후 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    lonelyCareApp = new LonelyCareApp();
    
    // 전역 접근을 위한 window 객체에 등록
    window.lonelyCareApp = lonelyCareApp;
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LonelyCareApp;
} else {
    window.LonelyCareApp = LonelyCareApp;
}