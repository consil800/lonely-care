/**
 * Friend Status UI Manager
 * 친구 상태 UI 표시 및 관리 모듈
 */

class FriendStatusUI {
    constructor() {
        this.currentFilter = 'all';
        this.friends = [];
        this.isLoading = false;
    }
    
    /**
     * 친구 상태 페이지 초기화
     */
    init() {
        this.setupEventListeners();
        this.loadFriendsStatus();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 필터 버튼 이벤트
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // 새로고침 버튼 이벤트
        const refreshButton = document.getElementById('refresh-friends');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.loadFriendsStatus();
            });
        }
        
        // 시뮬레이션 버튼들 이벤트 (개발/테스트용)
        this.setupSimulationButtons();
    }
    
    /**
     * 필터 설정
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // 필터 버튼 활성화 상태 업데이트
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        // 친구 목록 필터링 및 표시
        this.displayFriends();
    }
    
    /**
     * 친구 상태 로드
     */
    async loadFriendsStatus() {
        if (this.isLoading) {
            console.log('⚠️ 이미 친구 상태를 로딩 중입니다');
            return;
        }
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            console.log('📋 친구 상태 로딩 시작');
            
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                throw new Error('로그인된 사용자가 없습니다');
            }
            
            // 알림 임계값 조회
            const thresholds = await window.notificationThresholdManager.getNotificationThresholds();
            
            // 친구 목록 조회
            this.friends = await window.friendStatusChecker.getFriendsWithStatus(currentUser.kakao_id);
            
            // 각 친구의 알림 레벨 계산
            for (const friend of this.friends) {
                friend.alertLevel = window.alertLevelManager.calculateAlertLevel(
                    friend.last_activity,
                    thresholds
                );
            }
            
            // 알림 레벨 순으로 정렬 (위험한 순서대로)
            this.friends.sort((a, b) => 
                window.alertLevelManager.compareAlertLevels(a.alertLevel, b.alertLevel)
            );
            
            console.log(`✅ 친구 ${this.friends.length}명 상태 로딩 완료`);
            
            // UI 업데이트
            this.displayFriends();
            this.updateStatusSummary();
            
        } catch (error) {
            console.error('❌ 친구 상태 로딩 실패:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 친구 목록 표시
     */
    displayFriends() {
        const friendsList = document.getElementById('friends-status');
        if (!friendsList) {
            console.error('❌ friends-status 엘리먼트를 찾을 수 없습니다');
            return;
        }
        
        // 필터 적용
        const filteredFriends = this.filterFriends(this.friends, this.currentFilter);
        
        if (filteredFriends.length === 0) {
            friendsList.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        // 친구 카드 생성
        const friendsHTML = filteredFriends.map(friend => this.createFriendCard(friend)).join('');
        friendsList.innerHTML = friendsHTML;
        
        // 카드 이벤트 리스너 설정
        this.setupFriendCardEvents();
    }
    
    /**
     * 친구 목록 필터링
     */
    filterFriends(friends, filter) {
        if (filter === 'all') {
            return friends;
        }
        return friends.filter(friend => friend.alertLevel === filter);
    }
    
    /**
     * 친구 카드 HTML 생성
     */
    createFriendCard(friend) {
        const levelInfo = window.alertLevelManager.getAlertLevelInfo(friend.alertLevel);
        
        // 실시간 시간 관리자 사용 (통합된 시간 계산)
        const timeDiff = window.realTimeStatusManager ? 
            window.realTimeStatusManager.formatTimeDifference(friend.last_activity) :
            window.alertLevelManager.formatTimeDifference(friend.last_activity);
            
        // 고유한 time element ID 생성
        const timeElementId = `friend-time-${friend.id}`;
        
        const cardHtml = `
            <div class="friend-card ${friend.alertLevel}" data-friend-id="${friend.id}">
                <div class="friend-info">
                    <div class="friend-name">${friend.name}</div>
                    <div class="friend-status">
                        <span class="status-indicator ${friend.alertLevel}">
                            ${levelInfo.icon} ${levelInfo.text}
                        </span>
                        <span id="${timeElementId}" class="last-activity">${timeDiff}</span>
                    </div>
                </div>
                
                <div class="friend-actions">
                    ${friend.alertLevel !== 'normal' ? `
                        <button class="action-btn call-btn" onclick="friendStatusUI.callFriend('${friend.id}')">
                            📞 전화
                        </button>
                        ${friend.alertLevel === 'emergency' ? `
                            <button class="action-btn emergency-btn" onclick="friendStatusUI.callEmergency('${friend.id}')">
                                🚨 신고
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
            </div>
        `;
        
        // 실시간 시간 관리자에 시간 요소 등록
        if (window.realTimeStatusManager) {
            // DOM 생성 후 등록을 위해 setTimeout 사용
            setTimeout(() => {
                window.realTimeStatusManager.registerTimeElement(timeElementId, friend.last_activity);
            }, 0);
        }
        
        return cardHtml;
    }
    
    /**
     * 친구 카드 이벤트 설정
     */
    setupFriendCardEvents() {
        const friendCards = document.querySelectorAll('.friend-card');
        friendCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // 버튼 클릭이 아닌 경우에만 상세 정보 표시
                if (!e.target.classList.contains('action-btn')) {
                    const friendId = card.dataset.friendId;
                    this.showFriendDetails(friendId);
                }
            });
        });
    }
    
    /**
     * 상태 요약 업데이트
     */
    updateStatusSummary() {
        const summary = {
            all: this.friends.length,  // 🚨 "total"을 "all"로 변경 (HTML 구조와 일치)
            normal: this.friends.filter(f => f.alertLevel === 'normal').length,
            warning: this.friends.filter(f => f.alertLevel === 'warning').length,
            danger: this.friends.filter(f => f.alertLevel === 'danger').length,
            emergency: this.friends.filter(f => f.alertLevel === 'emergency').length
        };
        
        // 상태 탭에 카운트 표시 (HTML 구조에 맞게 수정)
        Object.keys(summary).forEach(level => {
            // HTML의 data-status 속성과 count-{level} ID에 맞게 수정
            const countEl = document.getElementById(`count-${level}`);
            if (countEl) {
                countEl.textContent = summary[level];
                console.log(`📊 ${level} 카운트 업데이트: ${summary[level]}`);
            } else {
                console.warn(`⚠️ count-${level} 요소를 찾을 수 없습니다`);
            }
        });
        
        console.log('📊 친구 상태 요약 업데이트 완료:', summary);
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoadingState() {
        const friendsList = document.getElementById('friends-status');
        if (friendsList) {
            friendsList.innerHTML = `
                <div class="loading-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: #666;
                ">
                    <div class="spinner" style="
                        width: 32px;
                        height: 32px;
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #74c0fc;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 16px;
                    "></div>
                    <p style="margin: 0; font-size: 16px; font-weight: 500;">친구 상태 확인 중...</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #999;">잠시만 기다려주세요</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }
    
    /**
     * 에러 상태 표시
     */
    showErrorState(message) {
        const friendsList = document.getElementById('friends-status');
        if (friendsList) {
            friendsList.innerHTML = `
                <div class="error-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: #666;
                    text-align: center;
                ">
                    <div class="error-icon" style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p class="error-message" style="margin: 0 0 20px 0; font-size: 16px; font-weight: 500;">${message}</p>
                    <button class="retry-btn" onclick="friendStatusUI.loadFriendsStatus()" style="
                        padding: 12px 24px;
                        background: #74c0fc;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background 0.3s;
                    " onmouseover="this.style.background='#5a9bd8'" onmouseout="this.style.background='#74c0fc'">다시 시도</button>
                </div>
            `;
        }
    }
    
    /**
     * 빈 상태 HTML
     */
    getEmptyStateHTML() {
        const filterText = {
            all: '친구가',
            normal: '정상 상태인 친구가',
            warning: '주의 상태인 친구가',
            danger: '경고 상태인 친구가',
            emergency: '위험 상태인 친구가'
        };
        
        return `
            <div class="empty-state">
                <p style="text-align: center; color: #999; padding: 20px;">등록된 친구가 없습니다.</p>
            </div>
        `;
    }
    
    /**
     * 시뮬레이션 버튼 설정 (개발/테스트용)
     */
    setupSimulationButtons() {
        // 시뮬레이션 버튼들이 있다면 이벤트 리스너 설정
        const simButtons = document.querySelectorAll('[data-simulate]');
        simButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const level = e.target.dataset.simulate;
                this.simulateAlertLevel(level);
            });
        });
    }
    
    /**
     * 친구 전화 걸기
     */
    callFriend(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return;
        
        console.log(`📞 ${friend.name}에게 전화 걸기`);
        
        // 전화 기능 구현 (예: tel: URI 사용)
        if (friend.phone) {
            window.location.href = `tel:${friend.phone}`;
        } else {
            alert(`${friend.name}님의 전화번호가 등록되지 않았습니다.`);
        }
    }
    
    /**
     * 응급신고
     */
    callEmergency(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return;
        
        const confirmed = confirm(`${friend.name}님에 대해 응급신고를 하시겠습니까?\n\n119에 신고됩니다.`);
        
        if (confirmed) {
            console.log(`🚨 ${friend.name} 응급신고`);
            window.location.href = 'tel:119';
        }
    }
    
    /**
     * 친구 상세 정보 표시
     */
    showFriendDetails(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return;
        
        console.log(`📋 ${friend.name} 상세 정보 표시`);
        // 모달이나 페이지로 상세 정보 표시 구현
    }
    
    /**
     * 알림 레벨 시뮬레이션 (개발/테스트용)
     */
    simulateAlertLevel(level) {
        console.log(`🧪 ${level} 레벨 시뮬레이션`);
        
        if (this.friends.length > 0) {
            const friend = this.friends[0];
            friend.alertLevel = level;
            
            // 마지막 활동 시간 조작
            const now = new Date();
            const hoursAgo = {
                warning: 25,
                danger: 49,
                emergency: 73
            }[level] || 1;
            
            friend.last_activity = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
            
            this.displayFriends();
            this.updateStatusSummary();
        }
    }
}

// 전역 인스턴스 생성
window.friendStatusUI = new FriendStatusUI();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendStatusUI;
}