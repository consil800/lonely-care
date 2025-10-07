/**
 * FriendsManagerComponent v1.0
 * 친구 관리 기능을 담당하는 독립 컴포넌트
 * 
 * 기존 friends.js 기능을 래핑하여 컴포넌트화
 * 친구 추가/삭제/검색, 상태 관리, 실시간 업데이트 등의 고급 기능 제공
 */

class FriendsManagerComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoRefresh: true,
            refreshInterval: 30 * 1000, // 30초마다 갱신
            enableSearch: true,
            enableFiltering: true,
            maxFriends: 100,
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.friends = [];
        this.filteredFriends = [];
        this.isInitialized = false;
        this.refreshTimer = null;
        this.searchQuery = '';
        this.currentFilter = 'all'; // all, online, offline
        
        // 의존성 컴포넌트
        this.storage = null;
        this.auth = null;
        
        // 기존 FriendsManager 참조 (호환성)
        this.legacyManager = null;
        
        console.log('👥 FriendsManagerComponent 초기화', this.options);
        
        // 자동 초기화 비활성화 (UI 간섭 방지)
        // this.init();
        console.log('⚠️ FriendsManagerComponent 자동 초기화 비활성화됨 (UI 보호)');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 FriendsManager 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.auth = window.auth;
            
            if (!this.storage || !this.auth) {
                throw new Error('필수 의존성 (Storage, Auth)이 준비되지 않았습니다.');
            }
            
            // 기존 FriendsManager 참조 (호환성)
            if (window.friendsManager) {
                this.legacyManager = window.friendsManager;
            }
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 친구 목록 로드
            await this.loadFriends();
            
            // 자동 갱신 시작
            if (this.options.autoRefresh) {
                this.startAutoRefresh();
            }
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('friends:ready', {
                detail: { component: this, friendsCount: this.friends.length }
            }));

            console.log('✅ FriendsManager 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ FriendsManager 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('friends:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 친구 추가 버튼
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                this.addFriend();
            });
        }

        // 친구 사용자명 입력 (엔터키 지원)
        const friendUsernameInput = document.getElementById('friend-username');
        if (friendUsernameInput) {
            friendUsernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addFriend();
                }
            });
        }

        // 친구 검색 입력
        const friendSearchInput = document.getElementById('friend-search');
        if (friendSearchInput && this.options.enableSearch) {
            friendSearchInput.addEventListener('input', (e) => {
                this.setSearchQuery(e.target.value);
            });
        }

        // 친구 필터 버튼들
        const filterBtns = document.querySelectorAll('[data-friend-filter]');
        if (filterBtns.length > 0 && this.options.enableFiltering) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.friendFilter;
                    this.setFilter(filter);
                });
            });
        }

        // Storage 이벤트 연결
        if (this.storage.addEventListener) {
            this.storage.addEventListener('storage:friend-added', () => {
                setTimeout(() => this.loadFriends(), 1000);
            });
            
            this.storage.addEventListener('storage:sync-completed', () => {
                this.loadFriends();
            });
        }

        console.log('👂 FriendsManager 이벤트 리스너 설정 완료');
    }

    /**
     * 친구 추가
     */
    async addFriend() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.showNotification('로그인이 필요합니다.', 'error');
                return { success: false, error: 'Not logged in' };
            }

            const friendUsernameInput = document.getElementById('friend-username');
            if (!friendUsernameInput) {
                throw new Error('친구 사용자명 입력 필드를 찾을 수 없습니다.');
            }

            const friendUsername = friendUsernameInput.value.trim();

            // 입력 값 검증
            const validation = this.validateFriendInput(friendUsername, currentUser);
            if (!validation.isValid) {
                this.showNotification(validation.message, 'error');
                return { success: false, error: validation.message };
            }

            // 로딩 상태 표시
            this.setAddFriendLoading(true);

            // 친구 사용자 존재 확인
            const friendUser = await this.findUserByUsername(friendUsername);
            if (!friendUser) {
                this.showNotification('존재하지 않는 사용자입니다.', 'error');
                return { success: false, error: 'User not found' };
            }

            // 이미 친구인지 확인
            if (this.isFriendAlready(friendUser)) {
                this.showNotification('이미 친구로 등록된 사용자입니다.', 'warning');
                return { success: false, error: 'Already friends' };
            }

            // 친구 수 제한 확인
            if (this.friends.length >= this.options.maxFriends) {
                this.showNotification(`최대 ${this.options.maxFriends}명까지만 친구로 추가할 수 있습니다.`, 'error');
                return { success: false, error: 'Max friends reached' };
            }

            // 친구 관계 추가 (기존 storage 메서드 사용)
            await this.storage.addFriend(currentUser.username, friendUsername);
            
            // 양방향 관계 설정 (기존 방식 유지)
            if (this.legacyManager && this.legacyManager.storage.addFriend) {
                await this.legacyManager.storage.addFriend(friendUsername, currentUser.username);
            }

            // 입력 필드 초기화
            friendUsernameInput.value = '';

            // 친구 목록 갱신
            await this.loadFriends();

            // 성공 알림
            this.showNotification(`${friendUser.name || friendUsername}님이 친구로 추가되었습니다.`, 'success');

            this.dispatchEvent(new CustomEvent('friends:added', {
                detail: { friend: friendUser, friendsCount: this.friends.length }
            }));

            return { success: true, friend: friendUser };

        } catch (error) {
            console.error('❌ 친구 추가 실패:', error);
            this.showNotification('친구 추가에 실패했습니다.', 'error');
            
            this.dispatchEvent(new CustomEvent('friends:add-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };

        } finally {
            this.setAddFriendLoading(false);
        }
    }

    /**
     * 친구 삭제
     */
    async removeFriend(friendUsername) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) return { success: false, error: 'Not logged in' };

            // 확인 대화상자
            if (!this.showConfirmDialog(`${friendUsername}님을 친구에서 삭제하시겠습니까?`)) {
                return { success: false, error: 'Cancelled by user' };
            }

            // 친구 정보 찾기
            const friend = this.friends.find(f => f.username === friendUsername || f.kakao_id === friendUsername);
            if (!friend) {
                this.showNotification('친구 정보를 찾을 수 없습니다.', 'error');
                return { success: false, error: 'Friend not found' };
            }

            // 친구 관계 삭제 (기존 storage 메서드 사용)
            await this.storage.removeFriend(currentUser.username, friendUsername);
            
            // 양방향 관계 삭제 (기존 방식 유지)  
            if (this.legacyManager && this.legacyManager.storage.removeFriend) {
                await this.legacyManager.storage.removeFriend(friendUsername, currentUser.username);
            }

            // 친구 목록에서 제거
            this.friends = this.friends.filter(f => f.username !== friendUsername && f.kakao_id !== friendUsername);
            this.applyFilters();

            // UI 업데이트
            await this.renderFriendsList();

            // 성공 알림
            this.showNotification('친구가 삭제되었습니다.', 'success');

            this.dispatchEvent(new CustomEvent('friends:removed', {
                detail: { friend, friendsCount: this.friends.length }
            }));

            return { success: true };

        } catch (error) {
            console.error('❌ 친구 삭제 실패:', error);
            this.showNotification('친구 삭제에 실패했습니다.', 'error');
            
            this.dispatchEvent(new CustomEvent('friends:remove-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };
        }
    }

    /**
     * 친구 목록 로드
     */
    async loadFriends() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.friends = [];
                this.applyFilters();
                await this.renderFriendsList();
                return { success: false, error: 'Not logged in' };
            }

            console.log('📥 친구 목록 로드 중...');

            // 친구 목록 조회 (StorageComponent 사용)
            let friendsList = [];
            
            if (currentUser.kakao_id) {
                friendsList = await this.storage.getFriends(currentUser.kakao_id);
            } else if (currentUser.username) {
                // 기존 방식 fallback
                if (this.legacyManager && this.legacyManager.storage.getFriends) {
                    friendsList = await this.legacyManager.storage.getFriends(currentUser.username);
                }
            }

            // 친구 상태 정보와 결합
            const friendsWithStatus = await this.enrichFriendsWithStatus(friendsList);

            this.friends = friendsWithStatus;
            this.applyFilters();
            await this.renderFriendsList();

            this.dispatchEvent(new CustomEvent('friends:loaded', {
                detail: { friends: this.friends, count: this.friends.length }
            }));

            console.log(`✅ 친구 ${this.friends.length}명 로드 완료`);
            return { success: true, friends: this.friends };

        } catch (error) {
            console.error('❌ 친구 목록 로드 실패:', error);
            
            this.dispatchEvent(new CustomEvent('friends:load-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };
        }
    }

    /**
     * 친구 정보에 상태 정보 추가
     */
    async enrichFriendsWithStatus(friendsList) {
        if (!Array.isArray(friendsList) || friendsList.length === 0) {
            return [];
        }

        const enrichedFriends = await Promise.all(
            friendsList.map(async (friend) => {
                try {
                    // 친구의 상태 정보 조회
                    let status = null;
                    if (friend.kakao_id) {
                        // Supabase에서 상태 조회
                        const statusResult = await this.storage.query?.('user_status', {
                            eq: { user_id: friend.id },
                            single: true
                        });
                        status = statusResult?.data;
                    }

                    // 마지막 활동 시간 계산
                    const lastActiveTime = status?.last_active || friend.updated_at || friend.created_at;
                    const timeSinceActive = lastActiveTime ? Date.now() - new Date(lastActiveTime).getTime() : null;

                    return {
                        ...friend,
                        status: status?.status || 'unknown',
                        lastActive: lastActiveTime,
                        timeSinceActive: timeSinceActive,
                        isOnline: this.calculateOnlineStatus(status, timeSinceActive),
                        displayName: friend.name || friend.nickname || friend.username || 'Unknown'
                    };

                } catch (error) {
                    console.warn('친구 상태 조회 실패:', friend.id, error.message);
                    return {
                        ...friend,
                        status: 'unknown',
                        lastActive: null,
                        timeSinceActive: null,
                        isOnline: false,
                        displayName: friend.name || friend.nickname || friend.username || 'Unknown'
                    };
                }
            })
        );

        return enrichedFriends;
    }

    /**
     * 온라인 상태 계산
     */
    calculateOnlineStatus(status, timeSinceActive) {
        if (!status || !timeSinceActive) return false;
        
        // 5분 이내 활동시 온라인으로 간주
        const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5분
        
        return status.status !== 'unknown' && timeSinceActive < ONLINE_THRESHOLD;
    }

    /**
     * 친구 목록 렌더링
     */
    async renderFriendsList() {
        const friendsList = document.getElementById('current-friends-list');
        if (!friendsList) {
            console.warn('친구 목록 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // 빈 목록 처리
        if (this.filteredFriends.length === 0) {
            const emptyMessage = this.searchQuery ? 
                `"${this.searchQuery}"에 해당하는 친구가 없습니다.` :
                (this.currentFilter === 'online' ? '온라인 친구가 없습니다.' :
                 this.currentFilter === 'offline' ? '오프라인 친구가 없습니다.' :
                 '등록된 친구가 없습니다.');

            friendsList.innerHTML = `
                <div class="no-friends">
                    <p>${emptyMessage}</p>
                    ${!this.searchQuery && this.currentFilter === 'all' ? 
                        '<p>위의 입력창에서 친구의 사용자명을 입력하여 친구를 추가해보세요.</p>' : 
                        ''}
                </div>
            `;
            return;
        }

        // 친구 목록 HTML 생성
        const friendsHtml = this.filteredFriends.map(friend => this.renderFriendItem(friend)).join('');
        friendsList.innerHTML = friendsHtml;

        // 친구 개수 표시 업데이트
        this.updateFriendsCount();
    }

    /**
     * 개별 친구 항목 렌더링
     */
    renderFriendItem(friend) {
        const statusClass = friend.isOnline ? 'online' : 'offline';
        const statusText = friend.isOnline ? '온라인' : '오프라인';
        const lastActiveText = this.getTimeAgo(friend.lastActive);
        
        return `
            <div class="friend-item ${statusClass}">
                <div class="friend-info">
                    <div class="friend-avatar">
                        ${friend.profile_image ? 
                            `<img src="${friend.profile_image}" alt="${friend.displayName}">` :
                            `<div class="avatar-placeholder">${friend.displayName.charAt(0)}</div>`
                        }
                        <span class="status-indicator ${statusClass}"></span>
                    </div>
                    <div class="friend-details">
                        <h4>${friend.displayName}</h4>
                        <p class="friend-username">@${friend.username || friend.kakao_id}</p>
                        <p class="friend-status">
                            <span class="status-text">${statusText}</span>
                            ${lastActiveText ? `<span class="last-active">${lastActiveText}</span>` : ''}
                        </p>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn-secondary btn-sm" onclick="friendsManagerComponent.viewFriendDetail('${friend.kakao_id || friend.username}')">
                        정보
                    </button>
                    <button class="btn-danger btn-sm" onclick="friendsManagerComponent.removeFriend('${friend.kakao_id || friend.username}')">
                        삭제
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 친구 수 표시 업데이트
     */
    updateFriendsCount() {
        const countElements = document.querySelectorAll('.friends-count');
        countElements.forEach(element => {
            element.textContent = this.friends.length;
        });

        const filteredCountElements = document.querySelectorAll('.filtered-friends-count');
        filteredCountElements.forEach(element => {
            element.textContent = this.filteredFriends.length;
        });
    }

    /**
     * 검색 쿼리 설정
     */
    setSearchQuery(query) {
        this.searchQuery = query.trim().toLowerCase();
        this.applyFilters();
        this.renderFriendsList();

        this.dispatchEvent(new CustomEvent('friends:search', {
            detail: { query: this.searchQuery, resultCount: this.filteredFriends.length }
        }));
    }

    /**
     * 필터 설정
     */
    setFilter(filter) {
        this.currentFilter = filter;
        this.applyFilters();
        this.renderFriendsList();

        // 필터 버튼 활성화 상태 업데이트
        const filterBtns = document.querySelectorAll('[data-friend-filter]');
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.friendFilter === filter);
        });

        this.dispatchEvent(new CustomEvent('friends:filter', {
            detail: { filter: this.currentFilter, resultCount: this.filteredFriends.length }
        }));
    }

    /**
     * 필터 적용
     */
    applyFilters() {
        let filtered = [...this.friends];

        // 검색 필터
        if (this.searchQuery) {
            filtered = filtered.filter(friend => 
                friend.displayName.toLowerCase().includes(this.searchQuery) ||
                (friend.username && friend.username.toLowerCase().includes(this.searchQuery)) ||
                (friend.kakao_id && friend.kakao_id.toString().includes(this.searchQuery))
            );
        }

        // 상태 필터
        if (this.currentFilter === 'online') {
            filtered = filtered.filter(friend => friend.isOnline);
        } else if (this.currentFilter === 'offline') {
            filtered = filtered.filter(friend => !friend.isOnline);
        }

        // 정렬 (온라인 친구 먼저, 그 다음 이름순)
        filtered.sort((a, b) => {
            if (a.isOnline !== b.isOnline) {
                return b.isOnline - a.isOnline; // 온라인 친구 먼저
            }
            return a.displayName.localeCompare(b.displayName); // 이름순
        });

        this.filteredFriends = filtered;
    }

    /**
     * 자동 갱신 시작
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        console.log('🔄 친구 목록 자동 갱신 시작');

        this.refreshTimer = setInterval(async () => {
            if (this.auth.isLoggedIn()) {
                await this.loadFriends();
            }
        }, this.options.refreshInterval);
    }

    /**
     * 자동 갱신 중단
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('🛑 친구 목록 자동 갱신 중단');
        }
    }

    /**
     * 유틸리티 메서드들
     */

    // 친구 입력 검증
    validateFriendInput(friendUsername, currentUser) {
        if (!friendUsername) {
            return { isValid: false, message: '친구의 사용자명을 입력해주세요.' };
        }

        if (friendUsername === currentUser.username || friendUsername === currentUser.kakao_id) {
            return { isValid: false, message: '자신을 친구로 추가할 수 없습니다.' };
        }

        if (friendUsername.length < 2) {
            return { isValid: false, message: '사용자명은 최소 2자 이상이어야 합니다.' };
        }

        return { isValid: true };
    }

    // 사용자명으로 사용자 찾기
    async findUserByUsername(username) {
        try {
            // 먼저 kakao_id로 검색
            let user = await this.storage.getUserByKakaoId(username);
            
            // 없으면 기존 username으로 검색 (기존 방식 호환)
            if (!user && this.legacyManager && this.legacyManager.storage.getUser) {
                user = await this.legacyManager.storage.getUser(username);
            }

            return user;

        } catch (error) {
            console.error('사용자 검색 실패:', error);
            return null;
        }
    }

    // 이미 친구인지 확인
    isFriendAlready(friendUser) {
        return this.friends.some(friend => 
            friend.kakao_id === friendUser.kakao_id || 
            friend.id === friendUser.id ||
            (friend.username && friendUser.username && friend.username === friendUser.username)
        );
    }

    // 시간 전 표시 (통합된 함수 사용)
    // @deprecated 이 함수는 RealTimeStatusManager.formatTimeDifference()로 통합되었습니다.
    getTimeAgo(timestamp) {
        if (!timestamp) return null;

        // 실시간 시간 관리자가 있으면 그것을 우선 사용
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(timestamp);
        }
        
        // alert-level-manager의 통합된 함수 사용 (2차 백업)
        if (window.alertLevelManager) {
            return window.alertLevelManager.formatTimeDifference(timestamp);
        }
        
        // 최종 백업: 기존 로직 유지 (호환성)
        console.warn('⚠️ 통합된 시간 관리자를 찾을 수 없음 (FriendsManagerComponent), 백업 시간 계산 사용');

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
            console.error('❌ 시간 계산 오류 (FriendsManagerComponent):', error);
            return '알 수 없음';
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        if (this.auth && this.auth.showNotification) {
            this.auth.showNotification(message, type);
        } else {
            console.log(`📢 [${type.toUpperCase()}] ${message}`);
        }
    }

    // 확인 대화상자
    showConfirmDialog(message) {
        if (this.auth && this.auth.showCustomConfirm) {
            return this.auth.showCustomConfirm(message);
        }
        return confirm(message);
    }

    // 친구 추가 로딩 상태
    setAddFriendLoading(loading) {
        const addBtn = document.getElementById('add-friend-btn');
        if (addBtn) {
            addBtn.disabled = loading;
            addBtn.textContent = loading ? '추가 중...' : '친구 추가';
        }
    }

    // 친구 상세 정보 보기
    viewFriendDetail(friendId) {
        const friend = this.friends.find(f => f.kakao_id === friendId || f.username === friendId);
        if (friend) {
            this.dispatchEvent(new CustomEvent('friends:detail-view', {
                detail: { friend }
            }));
            
            // 여기에 상세 정보 모달이나 페이지 표시 로직 추가
            console.log('친구 상세 정보:', friend);
        }
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            friendsCount: this.friends.length,
            filteredCount: this.filteredFriends.length,
            searchQuery: this.searchQuery,
            currentFilter: this.currentFilter,
            autoRefresh: !!this.refreshTimer
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // friends.js와 완전 호환
    async loadFriendsList() {
        return await this.loadFriends();
    }

    async checkFriendshipExists(user1, user2) {
        return this.isFriendAlready({ username: user2, kakao_id: user2 });
    }

    async searchUsers(query) {
        // TODO: 사용자 검색 API 구현
        return [];
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('friends:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.stopAutoRefresh();
        this.friends = [];
        this.filteredFriends = [];
        this.isInitialized = false;
        
        console.log('🗑️ FriendsManagerComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FriendsManagerComponent = FriendsManagerComponent;
    
    // 즉시 인스턴스 생성 비활성화 (UI 간섭 방지)
    // if (!window.friendsManagerComponent) {
    //     window.friendsManagerComponent = new FriendsManagerComponent();
    //     
    //     // 기존 전역 변수와 호환성 유지
    //     // 기존 friendsManager 초기화 후 대체
    //     
    //     console.log('🌐 FriendsManagerComponent 전역 등록 완료');
    // }
    console.log('⚠️ FriendsManagerComponent 자동 인스턴스 생성 비활성화됨 (UI 보호)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendsManagerComponent;
}