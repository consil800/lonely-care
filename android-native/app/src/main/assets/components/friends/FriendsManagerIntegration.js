/**
 * FriendsManagerIntegration.js
 * FriendsManagerComponent와 기존 friends.js 시스템을 통합하는 브릿지 역할
 */

// FriendsManagerComponent와 기존 friends 시스템 통합
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 FriendsManagerComponent 통합 시작');
    
    // FriendsManagerComponent가 로드되고 초기화될 때까지 대기
    const waitForFriendsComponent = () => {
        if (window.friendsManagerComponent && (window.friendsManager || window.storage)) {
            setupFriendsIntegration();
        } else {
            setTimeout(waitForFriendsComponent, 100);
        }
    };
    
    // 약간의 지연 후 시작 (다른 컴포넌트들이 로드될 시간 확보)
    setTimeout(waitForFriendsComponent, 600);
});

function setupFriendsIntegration() {
    console.log('👥 FriendsManagerComponent 통합 설정 중...');
    
    const friendsComponent = window.friendsManagerComponent;
    const legacyManager = window.friendsManager;
    
    // 1. 기존 friendsManager 메서드를 FriendsManagerComponent로 위임
    if (legacyManager) {
        
        // 원래 메서드들 백업
        const originalAddFriend = legacyManager.addFriend?.bind(legacyManager);
        const originalRemoveFriend = legacyManager.removeFriend?.bind(legacyManager);
        const originalLoadFriends = legacyManager.loadFriends?.bind(legacyManager);
        const originalSearchUsers = legacyManager.searchUsers?.bind(legacyManager);
        
        // 친구 추가 - 고급 기능으로 교체
        if (originalAddFriend) {
            legacyManager.addFriend = async function() {
                try {
                    return await friendsComponent.addFriend();
                } catch (error) {
                    console.warn('FriendsComponent 실패, 기존 방식 사용:', error.message);
                    return await originalAddFriend();
                }
            };
        }
        
        // 친구 삭제 - 향상된 UI와 검증 로직
        if (originalRemoveFriend) {
            legacyManager.removeFriend = async function(friendUsername) {
                try {
                    return await friendsComponent.removeFriend(friendUsername);
                } catch (error) {
                    console.warn('FriendsComponent 실패, 기존 방식 사용:', error.message);
                    return await originalRemoveFriend(friendUsername);
                }
            };
        }
        
        // 친구 목록 로드 - 캐싱 및 상태 정보 포함
        if (originalLoadFriends) {
            legacyManager.loadFriends = async function() {
                try {
                    return await friendsComponent.loadFriends();
                } catch (error) {
                    console.warn('FriendsComponent 실패, 기존 방식 사용:', error.message);
                    return await originalLoadFriends();
                }
            };
        }
        
        // 사용자 검색
        if (originalSearchUsers) {
            legacyManager.searchUsers = async function(query) {
                return await friendsComponent.searchUsers(query);
            };
        }
        
        // 새로운 메서드들 추가
        legacyManager.setSearchQuery = function(query) {
            return friendsComponent.setSearchQuery(query);
        };
        
        legacyManager.setFilter = function(filter) {
            return friendsComponent.setFilter(filter);
        };
        
        legacyManager.startAutoRefresh = function() {
            return friendsComponent.startAutoRefresh();
        };
        
        legacyManager.stopAutoRefresh = function() {
            return friendsComponent.stopAutoRefresh();
        };
        
        legacyManager.getStatus = function() {
            return friendsComponent.getStatus();
        };
    }
    
    // 2. 전역 friendsManager를 FriendsManagerComponent로 교체
    if (!legacyManager) {
        window.friendsManager = {
            addFriend: () => friendsComponent.addFriend(),
            removeFriend: (username) => friendsComponent.removeFriend(username),
            loadFriends: () => friendsComponent.loadFriends(),
            loadFriendsList: () => friendsComponent.loadFriends(), // 호환성
            searchUsers: (query) => friendsComponent.searchUsers(query),
            setSearchQuery: (query) => friendsComponent.setSearchQuery(query),
            setFilter: (filter) => friendsComponent.setFilter(filter),
            getStatus: () => friendsComponent.getStatus(),
            
            // 기존 메서드 호환성
            checkFriendshipExists: (user1, user2) => friendsComponent.checkFriendshipExists(user1, user2),
            getTimeAgo: (timestamp) => friendsComponent.getTimeAgo(timestamp)
        };
    }
    
    // 3. FriendsManagerComponent 이벤트 리스너 설정
    friendsComponent.addEventListener('friends:loaded', (e) => {
        console.log('👥 친구 목록 로드됨:', e.detail.count + '명');
        
        // 기존 UI 업데이트 로직이 있다면 트리거
        window.dispatchEvent(new CustomEvent('friends-loaded', {
            detail: e.detail
        }));
    });
    
    friendsComponent.addEventListener('friends:added', (e) => {
        console.log('👤 친구 추가됨:', e.detail.friend.displayName || e.detail.friend.name);
        
        // 전역 이벤트 발송
        window.dispatchEvent(new CustomEvent('friend-added', {
            detail: e.detail
        }));
        
        // 다른 컴포넌트에 알림 (예: 상태 모니터링)
        if (window.friendStatusComponent) {
            window.friendStatusComponent.onFriendAdded(e.detail.friend);
        }
    });
    
    friendsComponent.addEventListener('friends:removed', (e) => {
        console.log('👤 친구 삭제됨:', e.detail.friend.displayName || e.detail.friend.name);
        
        // 전역 이벤트 발송
        window.dispatchEvent(new CustomEvent('friend-removed', {
            detail: e.detail
        }));
        
        // 다른 컴포넌트에 알림
        if (window.friendStatusComponent) {
            window.friendStatusComponent.onFriendRemoved(e.detail.friend);
        }
    });
    
    friendsComponent.addEventListener('friends:search', (e) => {
        console.log('🔍 친구 검색:', e.detail.query, `${e.detail.resultCount}개 결과`);
    });
    
    friendsComponent.addEventListener('friends:filter', (e) => {
        console.log('📋 친구 필터:', e.detail.filter, `${e.detail.resultCount}개 표시`);
    });
    
    friendsComponent.addEventListener('friends:detail-view', (e) => {
        console.log('👁️ 친구 상세 보기:', e.detail.friend.displayName);
        
        // 상세 정보 표시 로직 (모달, 새 페이지 등)
        showFriendDetailModal(e.detail.friend);
    });
    
    // 4. 다른 컴포넌트와의 연동
    
    // StorageComponent와 연동
    if (window.storageComponent) {
        window.storageComponent.addEventListener('storage:friend-added', () => {
            setTimeout(() => {
                friendsComponent.loadFriends();
            }, 1000);
        });
        
        window.storageComponent.addEventListener('storage:sync-completed', () => {
            friendsComponent.loadFriends();
        });
    }
    
    // SupabaseComponent 실시간 구독 설정
    if (window.supabaseComponent) {
        // 친구 상태 변경 실시간 감지
        const statusSubscriptionId = window.supabaseComponent.subscribe('user_status', (payload) => {
            console.log('📡 친구 상태 변경 감지:', payload);
            
            // 친구 목록 업데이트
            setTimeout(() => {
                friendsComponent.loadFriends();
            }, 1000);
            
        }, { events: ['UPDATE', 'INSERT'] });
        
        // 정리 시 구독 해제
        window.cleanupFriendsIntegration = function() {
            if (statusSubscriptionId) {
                window.supabaseComponent.unsubscribe(statusSubscriptionId);
            }
            friendsComponent.destroy();
        };
    }
    
    // 5. UI 개선 사항 적용
    
    // 친구 검색 UI 동적 생성 (존재하지 않는 경우)
    createFriendsSearchUI();
    
    // 친구 필터 UI 동적 생성
    createFriendsFilterUI();
    
    // 친구 통계 UI 추가
    createFriendsStatsUI();
    
    console.log('✅ FriendsManagerComponent 통합 완료');
    
    // 통합 상태 확인
    const status = friendsComponent.getStatus();
    console.log('📊 친구 관리 상태:', {
        초기화됨: status.isInitialized,
        친구수: status.friendsCount,
        필터링됨: status.filteredCount,
        자동갱신: status.autoRefresh
    });
    
    // 초기 친구 목록 로드
    if (window.auth && window.auth.isLoggedIn()) {
        setTimeout(() => {
            friendsComponent.loadFriends();
        }, 1000);
    }
}

// 친구 검색 UI 생성
function createFriendsSearchUI() {
    const friendsContainer = document.querySelector('#friends-page, .friends-container');
    if (!friendsContainer) return;
    
    const searchInput = document.getElementById('friend-search');
    if (searchInput) return; // 이미 존재함
    
    // 검색 UI HTML
    const searchHTML = `
        <div class="friends-search-container">
            <div class="search-input-wrapper">
                <input type="text" id="friend-search" placeholder="친구 검색..." class="form-control">
                <span class="search-icon">🔍</span>
            </div>
        </div>
    `;
    
    // 친구 추가 섹션 다음에 삽입
    const addFriendSection = friendsContainer.querySelector('.add-friend-section, #add-friend-section');
    if (addFriendSection) {
        addFriendSection.insertAdjacentHTML('afterend', searchHTML);
    }
}

// 친구 필터 UI 생성
function createFriendsFilterUI() {
    const friendsContainer = document.querySelector('#friends-page, .friends-container');
    if (!friendsContainer) return;
    
    const existingFilter = friendsContainer.querySelector('.friends-filter');
    if (existingFilter) return; // 이미 존재함
    
    // 필터 UI HTML
    const filterHTML = `
        <div class="friends-filter">
            <button class="filter-btn active" data-friend-filter="all">전체</button>
            <button class="filter-btn" data-friend-filter="online">온라인</button>
            <button class="filter-btn" data-friend-filter="offline">오프라인</button>
        </div>
    `;
    
    // 검색 섹션 다음에 삽입
    const searchSection = friendsContainer.querySelector('.friends-search-container');
    if (searchSection) {
        searchSection.insertAdjacentHTML('afterend', filterHTML);
    }
}

// 친구 통계 UI 생성
function createFriendsStatsUI() {
    const friendsContainer = document.querySelector('#friends-page, .friends-container');
    if (!friendsContainer) return;
    
    const existingStats = friendsContainer.querySelector('.friends-stats');
    if (existingStats) return; // 이미 존재함
    
    // 통계 UI HTML
    const statsHTML = `
        <div class="friends-stats">
            <div class="stat-item">
                <span class="stat-label">총 친구:</span>
                <span class="friends-count">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">온라인:</span>
                <span class="online-friends-count">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">표시중:</span>
                <span class="filtered-friends-count">0</span>
            </div>
        </div>
    `;
    
    // 친구 목록 컨테이너 앞에 삽입
    const friendsList = friendsContainer.querySelector('#current-friends-list, .friends-list');
    if (friendsList) {
        friendsList.insertAdjacentHTML('beforebegin', statsHTML);
    }
}

// 친구 상세 정보 모달 표시
function showFriendDetailModal(friend) {
    // 간단한 모달 구현
    const modalHTML = `
        <div class="friend-detail-modal" id="friend-detail-modal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>친구 정보</h3>
                    <button class="modal-close" onclick="closeFriendDetailModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="friend-detail-info">
                        ${friend.profile_image ? 
                            `<img src="${friend.profile_image}" alt="${friend.displayName}" class="friend-detail-avatar">` :
                            `<div class="friend-detail-avatar placeholder">${friend.displayName.charAt(0)}</div>`
                        }
                        <h4>${friend.displayName}</h4>
                        <p><strong>사용자명:</strong> @${friend.username || friend.kakao_id}</p>
                        <p><strong>상태:</strong> ${friend.isOnline ? '온라인' : '오프라인'}</p>
                        ${friend.lastActive ? `<p><strong>마지막 활동:</strong> ${window.friendsManagerComponent.getTimeAgo(friend.lastActive)}</p>` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeFriendDetailModal()">닫기</button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('friend-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 친구 상세 모달 닫기
function closeFriendDetailModal() {
    const modal = document.getElementById('friend-detail-modal');
    if (modal) {
        modal.remove();
    }
}

// 전역 함수로 등록
window.showFriendDetailModal = showFriendDetailModal;
window.closeFriendDetailModal = closeFriendDetailModal;