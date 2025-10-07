/**
 * FriendStatusComponent v1.0
 * 친구 상태 실시간 모니터링을 담당하는 독립 컴포넌트
 * 
 * 기존 friend-status-monitor.js 기능을 래핑하여 컴포넌트화
 * 실시간 상태 감지, 알림 발송, 위험 레벨 관리 등의 고급 기능 제공
 */

class FriendStatusComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoRefresh: true,
            refreshInterval: 60 * 1000, // 1분마다 갱신
            notificationInterval: 5 * 60 * 1000, // 5분마다 알림 체크
            enableRealtime: true,
            maxRetries: 3,
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.friends = [];
        this.filteredFriends = [];
        this.currentFilter = 'all'; // all, normal, warning, danger, emergency
        this.isInitialized = false;
        this.isLoading = false;
        this.isCheckingNotifications = false;
        
        // 타이머들
        this.refreshTimer = null;
        this.notificationTimer = null;
        this.realtimeSubscription = null;
        
        // 알림 설정
        this.notificationThresholds = {
            warning: 1440,   // 24시간 (분)
            danger: 2880,    // 48시간 (분)  
            emergency: 4320  // 72시간 (분)
        };
        
        // 알림 레벨 정의
        this.alertLevels = {
            'normal': { text: '정상', color: '#28a745', icon: '🟢', priority: 0 },
            'warning': { text: '주의', color: '#ffc107', icon: '🟡', priority: 1 },
            'danger': { text: '경고', color: '#fd7e14', icon: '🟠', priority: 2 },
            'emergency': { text: '위험', color: '#dc3545', icon: '🔴', priority: 3 }
        };
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.friendsManager = null;
        
        // 기존 FriendStatusMonitor 참조 (호환성)
        this.legacyMonitor = null;
        
        console.log('👀 FriendStatusComponent 초기화', this.options);
        
        // 자동 초기화 비활성화 (UI 간섭 방지)
        // this.init();
        console.log('⚠️ FriendStatusComponent 자동 초기화 비활성화됨 (UI 보호)');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 FriendStatus 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.friendsManager = window.friendsManagerComponent;
            
            if (!this.storage || !this.auth) {
                throw new Error('필수 의존성 (Storage, Auth)이 준비되지 않았습니다.');
            }
            
            // 기존 FriendStatusMonitor 참조 (호환성)
            if (window.friendStatusMonitor) {
                this.legacyMonitor = window.friendStatusMonitor;
            }
            
            // 알림 설정 로드
            await this.loadNotificationThresholds();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 친구 상태 로드
            await this.loadFriendsStatus();
            
            // 자동 갱신 및 알림 체크 시작
            if (this.options.autoRefresh) {
                this.startAutoRefresh();
                this.startNotificationCheck();
            }
            
            // 실시간 구독 시작
            if (this.options.enableRealtime) {
                this.setupRealtimeSubscription();
            }
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('status:ready', {
                detail: { component: this, friendsCount: this.friends.length }
            }));

            console.log('✅ FriendStatus 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ FriendStatus 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('status:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 상태별 필터 탭
        document.querySelectorAll('.status-tab, [data-status-filter]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-status') || 
                              e.target.getAttribute('data-status-filter');
                this.setStatusFilter(status);
            });
        });

        // 새로고침 버튼
        const refreshBtn = document.getElementById('refresh-status-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadFriendsStatus();
            });
        }

        // 친구 추가시 상태 모니터링 추가
        if (this.friendsManager) {
            this.friendsManager.addEventListener('friends:added', (e) => {
                setTimeout(() => this.loadFriendsStatus(), 2000);
            });
            
            this.friendsManager.addEventListener('friends:removed', (e) => {
                this.onFriendRemoved(e.detail.friend);
            });
        }

        console.log('👂 FriendStatus 이벤트 리스너 설정 완료');
    }

    /**
     * 알림 설정 로드
     */
    async loadNotificationThresholds() {
        try {
            console.log('🔍 알림 임계값 설정 로드 중...');

            // 1순위: Supabase에서 실시간 설정 조회
            if (this.supabase && this.supabase.client) {
                const settingsResult = await this.supabase.query('notification_settings_admin', {
                    order: { updated_at: 'desc' },
                    limit: 1,
                    single: true
                });
                
                if (settingsResult.data && !settingsResult.error) {
                    this.notificationThresholds = {
                        warning: settingsResult.data.warning_minutes || 1440,
                        danger: settingsResult.data.danger_minutes || 2880,
                        emergency: settingsResult.data.emergency_minutes || 4320
                    };
                    console.log('✅ Supabase 알림 설정 로드:', this.notificationThresholds);
                    return this.notificationThresholds;
                }
            }

            // 2순위: 로컬 저장소에서 설정 조회
            const localSettings = localStorage.getItem('admin-notification-settings');
            if (localSettings) {
                const parsed = JSON.parse(localSettings);
                if (parsed.warning_minutes) {
                    this.notificationThresholds = {
                        warning: parsed.warning_minutes,
                        danger: parsed.danger_minutes,
                        emergency: parsed.emergency_minutes
                    };
                    console.log('📱 로컬 알림 설정 사용:', this.notificationThresholds);
                    return this.notificationThresholds;
                }
            }

            console.log('⚠️ 기본 알림 설정 사용:', this.notificationThresholds);

        } catch (error) {
            console.error('❌ 알림 설정 로드 실패:', error);
        }

        this.dispatchEvent(new CustomEvent('status:thresholds-loaded', {
            detail: { thresholds: this.notificationThresholds }
        }));

        return this.notificationThresholds;
    }

    /**
     * 친구 상태 로드
     */
    async loadFriendsStatus() {
        // 중복 호출 방지
        if (this.isLoading) {
            console.log('⚠️ 이미 로딩 중 - 중복 호출 방지');
            return { success: false, error: 'Already loading' };
        }

        try {
            this.isLoading = true;
            console.log('🔍 친구 상태 로드 시작');

            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                console.log('❌ 로그인된 사용자 없음');
                return { success: false, error: 'Not logged in' };
            }

            // 로딩 상태 표시
            this.showLoadingState();

            // 기존 데이터 초기화
            this.friends = [];

            // 친구 목록과 상태 정보 로드
            const friendsWithStatus = await this.loadFriendsWithStatus(currentUser);
            
            // 상태 레벨 계산 및 설정
            this.friends = friendsWithStatus.map(friend => this.calculateFriendStatus(friend));

            // 필터 적용
            this.applyStatusFilter();

            // UI 업데이트
            await this.updateStatusDisplay();
            this.updateStatusCounts();
            this.updateLastUpdateTime();

            this.dispatchEvent(new CustomEvent('status:loaded', {
                detail: { friends: this.friends, count: this.friends.length }
            }));

            console.log(`✅ 친구 상태 ${this.friends.length}명 로드 완료`);
            return { success: true, friends: this.friends };

        } catch (error) {
            console.error('❌ 친구 상태 로드 실패:', error);
            this.showError('친구 상태를 불러오는데 실패했습니다.');
            
            this.dispatchEvent(new CustomEvent('status:load-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };

        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * 친구 목록과 상태 정보 로드
     */
    async loadFriendsWithStatus(currentUser) {
        try {
            // 친구 목록 가져오기 (FriendsManagerComponent 또는 Storage 사용)
            let friendsList = [];
            
            if (this.friendsManager) {
                const friendsResult = await this.friendsManager.loadFriends();
                if (friendsResult.success) {
                    friendsList = friendsResult.friends || [];
                }
            } else if (currentUser.kakao_id) {
                friendsList = await this.storage.getFriends(currentUser.kakao_id);
            }

            if (!friendsList || friendsList.length === 0) {
                console.log('📭 등록된 친구가 없습니다');
                return [];
            }

            // 각 친구의 상태 정보 조회
            const friendsWithStatus = await Promise.all(
                friendsList.map(async (friend) => {
                    try {
                        // 친구의 상태 정보 조회
                        let statusInfo = null;
                        if (this.supabase && friend.id) {
                            const statusResult = await this.supabase.query('user_status', {
                                eq: { user_id: friend.id },
                                single: true
                            });
                            statusInfo = statusResult.data;
                        }

                        // 활동 기록 조회 (최근 활동)
                        let activityInfo = null;
                        if (this.supabase && friend.id) {
                            const activityResult = await this.supabase.query('user_activities', {
                                eq: { user_id: friend.id },
                                order: { activity_time: 'desc' },
                                limit: 1,
                                single: true
                            });
                            activityInfo = activityResult.data;
                        }

                        return {
                            ...friend,
                            status: statusInfo?.status || 'unknown',
                            last_active: statusInfo?.last_active || activityInfo?.activity_time || friend.updated_at,
                            last_heartbeat: statusInfo?.last_heartbeat || statusInfo?.updated_at || friend.updated_at,
                            device_online: statusInfo?.device_online || false,
                            motion_count: statusInfo?.motion_count || 0,
                            raw_status: statusInfo,
                            raw_activity: activityInfo
                        };

                    } catch (error) {
                        console.warn('친구 상태 조회 실패:', friend.name, error.message);
                        return {
                            ...friend,
                            status: 'unknown',
                            last_active: friend.updated_at || friend.created_at,
                            last_heartbeat: friend.updated_at || friend.created_at,
                            device_online: false,
                            motion_count: 0
                        };
                    }
                })
            );

            return friendsWithStatus;

        } catch (error) {
            console.error('친구 상태 정보 로드 실패:', error);
            return [];
        }
    }

    /**
     * 친구 상태 레벨 계산
     */
    calculateFriendStatus(friend) {
        const now = new Date();
        const lastActiveTime = friend.last_active ? new Date(friend.last_active) : now;
        const timeDiffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));

        // 상태 레벨 결정
        let alertLevel = 'normal';
        if (timeDiffMinutes >= this.notificationThresholds.emergency) {
            alertLevel = 'emergency';
        } else if (timeDiffMinutes >= this.notificationThresholds.danger) {
            alertLevel = 'danger';
        } else if (timeDiffMinutes >= this.notificationThresholds.warning) {
            alertLevel = 'warning';
        }

        // 온라인 상태 판단 (5분 이내 활동시 온라인)
        const isOnline = timeDiffMinutes < 5;

        return {
            ...friend,
            alert_level: alertLevel,
            is_online: isOnline,
            minutes_since_active: timeDiffMinutes,
            hours_since_active: Math.floor(timeDiffMinutes / 60),
            time_ago_text: this.getTimeAgoText(timeDiffMinutes),
            alert_config: this.alertLevels[alertLevel]
        };
    }

    /**
     * 상태별 필터 설정
     */
    setStatusFilter(filter) {
        this.currentFilter = filter;
        this.applyStatusFilter();
        this.updateStatusDisplay();

        // 필터 버튼 활성화 상태 업데이트
        document.querySelectorAll('.status-tab, [data-status-filter]').forEach(tab => {
            const tabFilter = tab.getAttribute('data-status') || tab.getAttribute('data-status-filter');
            tab.classList.toggle('active', tabFilter === filter);
        });

        this.dispatchEvent(new CustomEvent('status:filter-changed', {
            detail: { filter: this.currentFilter, resultCount: this.filteredFriends.length }
        }));
    }

    /**
     * 필터 적용
     */
    applyStatusFilter() {
        if (this.currentFilter === 'all') {
            this.filteredFriends = [...this.friends];
        } else {
            this.filteredFriends = this.friends.filter(friend => 
                friend.alert_level === this.currentFilter
            );
        }

        // 우선순위 순으로 정렬 (위험한 친구 먼저)
        this.filteredFriends.sort((a, b) => {
            if (a.alert_config.priority !== b.alert_config.priority) {
                return b.alert_config.priority - a.alert_config.priority; // 위험도 높은 순
            }
            return a.displayName?.localeCompare(b.displayName || '') || 0; // 이름순
        });
    }

    /**
     * 상태 표시 업데이트
     */
    async updateStatusDisplay() {
        const container = document.getElementById('friends-status-container');
        if (!container) {
            console.warn('친구 상태 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // 빈 목록 처리
        if (this.filteredFriends.length === 0) {
            const emptyMessage = this.currentFilter === 'all' ? 
                '등록된 친구가 없습니다.' :
                `${this.alertLevels[this.currentFilter]?.text} 상태의 친구가 없습니다.`;

            container.innerHTML = `
                <div class="empty-status">
                    <div class="empty-icon">👥</div>
                    <p>${emptyMessage}</p>
                    ${this.currentFilter === 'all' ? 
                        '<p>친구를 추가하여 상태를 모니터링해보세요.</p>' : 
                        ''}
                </div>
            `;
            return;
        }

        // 친구 상태 카드 생성
        const statusCards = this.filteredFriends.map(friend => this.createStatusCard(friend)).join('');
        container.innerHTML = statusCards;
    }

    /**
     * 친구 상태 카드 생성
     */
    createStatusCard(friend) {
        const alertConfig = friend.alert_config;
        const displayName = friend.displayName || friend.name || friend.nickname || 'Unknown';
        
        return `
            <div class="friend-status-card ${friend.alert_level}" data-friend-id="${friend.id}">
                <div class="status-indicator" style="background-color: ${alertConfig.color}">
                    <span class="status-icon">${alertConfig.icon}</span>
                </div>
                <div class="friend-info">
                    <div class="friend-header">
                        <h4 class="friend-name">${displayName}</h4>
                        <span class="status-badge" style="background-color: ${alertConfig.color}">
                            ${alertConfig.text}
                        </span>
                    </div>
                    <div class="friend-details">
                        <p class="last-active">
                            <span class="label">마지막 활동:</span>
                            <span class="time">${friend.time_ago_text}</span>
                            ${friend.is_online ? '<span class="online-indicator">🟢 온라인</span>' : ''}
                        </p>
                        ${friend.minutes_since_active >= this.notificationThresholds.warning ? `
                            <p class="inactive-duration warning">
                                ⚠️ ${friend.hours_since_active}시간 ${friend.minutes_since_active % 60}분 무응답
                            </p>
                        ` : ''}
                        ${friend.motion_count > 0 ? `
                            <p class="motion-info">
                                <span class="label">동작 감지:</span>
                                <span class="count">${friend.motion_count}회</span>
                            </p>
                        ` : ''}
                    </div>
                </div>
                <div class="status-actions">
                    <button class="btn-sm btn-secondary" onclick="friendStatusComponent.viewFriendDetail('${friend.id}')">
                        상세
                    </button>
                    ${friend.alert_level !== 'normal' ? `
                        <button class="btn-sm btn-primary" onclick="friendStatusComponent.sendManualCheck('${friend.id}')">
                            확인
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 상태별 개수 업데이트
     */
    updateStatusCounts() {
        const counts = {
            all: this.friends.length,
            normal: this.friends.filter(f => f.alert_level === 'normal').length,
            warning: this.friends.filter(f => f.alert_level === 'warning').length,
            danger: this.friends.filter(f => f.alert_level === 'danger').length,
            emergency: this.friends.filter(f => f.alert_level === 'emergency').length
        };

        // 각 탭의 개수 표시 업데이트
        Object.entries(counts).forEach(([status, count]) => {
            const countElements = document.querySelectorAll(`[data-status="${status}"] .count, .${status}-count`);
            countElements.forEach(element => {
                element.textContent = count;
            });
        });

        this.dispatchEvent(new CustomEvent('status:counts-updated', {
            detail: { counts }
        }));
    }

    /**
     * 마지막 업데이트 시간 표시
     */
    updateLastUpdateTime() {
        const updateTimeElement = document.getElementById('last-update-time');
        if (updateTimeElement) {
            updateTimeElement.textContent = new Date().toLocaleTimeString('ko-KR');
        }
    }

    /**
     * 자동 갱신 시작
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        console.log('🔄 친구 상태 자동 갱신 시작');

        this.refreshTimer = setInterval(async () => {
            if (this.auth.isLoggedIn() && !this.isLoading) {
                await this.loadFriendsStatus();
            }
        }, this.options.refreshInterval);
    }

    /**
     * 알림 체크 시작
     */
    startNotificationCheck() {
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
        }

        console.log('🔔 친구 상태 알림 체크 시작');

        this.notificationTimer = setInterval(async () => {
            if (this.auth.isLoggedIn() && !this.isCheckingNotifications) {
                await this.checkAndSendNotifications();
            }
        }, this.options.notificationInterval);
    }

    /**
     * 실시간 구독 설정
     */
    setupRealtimeSubscription() {
        if (!this.supabase || !this.options.enableRealtime) return;

        try {
            // 사용자 상태 변경 실시간 감지
            this.realtimeSubscription = this.supabase.subscribe('user_status', (payload) => {
                console.log('📡 친구 상태 실시간 변경:', payload);
                
                // 친구 목록에서 해당 친구 찾기
                const updatedFriend = this.friends.find(f => f.id === payload.new?.user_id);
                if (updatedFriend) {
                    // 상태 업데이트
                    updatedFriend.status = payload.new?.status;
                    updatedFriend.last_active = payload.new?.last_active;
                    updatedFriend.last_heartbeat = payload.new?.last_heartbeat;
                    
                    // 상태 레벨 재계산
                    const recalculated = this.calculateFriendStatus(updatedFriend);
                    Object.assign(updatedFriend, recalculated);
                    
                    // UI 업데이트
                    this.applyStatusFilter();
                    this.updateStatusDisplay();
                    this.updateStatusCounts();
                }
            }, { events: ['UPDATE', 'INSERT'] });

            console.log('📡 실시간 상태 구독 설정 완료');

        } catch (error) {
            console.error('❌ 실시간 구독 설정 실패:', error);
        }
    }

    /**
     * 알림 체크 및 발송
     */
    async checkAndSendNotifications() {
        if (this.isCheckingNotifications) return;

        try {
            this.isCheckingNotifications = true;
            console.log('🔔 친구 상태 알림 체크 중...');

            const alertFriends = this.friends.filter(friend => 
                friend.alert_level !== 'normal'
            );

            if (alertFriends.length === 0) {
                console.log('✅ 알림이 필요한 친구 없음');
                return;
            }

            for (const friend of alertFriends) {
                await this.sendFriendAlert(friend);
            }

        } catch (error) {
            console.error('❌ 알림 체크 실패:', error);
        } finally {
            this.isCheckingNotifications = false;
        }
    }

    /**
     * 친구 알림 발송
     */
    async sendFriendAlert(friend) {
        try {
            const alertData = {
                friendId: friend.id,
                friendName: friend.displayName || friend.name,
                alertLevel: friend.alert_level,
                hoursInactive: friend.hours_since_active,
                minutesInactive: friend.minutes_since_active
            };

            console.log('📢 친구 알림 발송:', alertData);

            // NotificationManagerComponent 사용 (있는 경우)
            if (window.notificationManagerComponent) {
                await window.notificationManagerComponent.sendFriendAlert(alertData);
            } else {
                // 기본 브라우저 알림
                this.showBrowserNotification(alertData);
            }

            this.dispatchEvent(new CustomEvent('status:alert-sent', {
                detail: { friend, alertData }
            }));

        } catch (error) {
            console.error('❌ 친구 알림 발송 실패:', friend.name, error);
        }
    }

    /**
     * 브라우저 알림 표시
     */
    showBrowserNotification(alertData) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const alertConfig = this.alertLevels[alertData.alertLevel];
        const title = `${alertConfig.icon} ${alertData.friendName} - ${alertConfig.text}`;
        const body = `${alertData.hoursInactive}시간 동안 무응답 상태입니다.`;

        const notification = new Notification(title, {
            body: body,
            icon: '/lonely-care/icon.png',
            tag: `friend-alert-${alertData.friendId}`,
            requireInteraction: alertData.alertLevel === 'emergency'
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            this.viewFriendDetail(alertData.friendId);
        };
    }

    /**
     * 유틸리티 메서드들
     */

    // 시간 전 텍스트 생성 (통합된 함수 사용)
    // @deprecated 이 함수는 RealTimeStatusManager.formatTimeFromMinutes()로 통합되었습니다.
    getTimeAgoText(minutes) {
        // 실시간 시간 관리자의 분 기반 함수 사용 (최적화됨)
        if (window.realTimeStatusManager && window.realTimeStatusManager.formatTimeFromMinutes) {
            return window.realTimeStatusManager.formatTimeFromMinutes(minutes);
        }
        
        // 백업: timestamp 방식으로 변환
        if (window.realTimeStatusManager) {
            const now = new Date();
            const timestamp = new Date(now.getTime() - (minutes * 60 * 1000));
            return window.realTimeStatusManager.formatTimeDifference(timestamp.toISOString());
        }
        
        // alert-level-manager의 통합된 함수 사용 (2차 백업)
        if (window.alertLevelManager) {
            const now = new Date();
            const timestamp = new Date(now.getTime() - (minutes * 60 * 1000));
            return window.alertLevelManager.formatTimeDifference(timestamp.toISOString());
        }
        
        // 최종 백업: 기존 로직 유지 (호환성)
        console.warn('⚠️ 통합된 시간 관리자를 찾을 수 없음 (FriendStatusComponent), 백업 시간 계산 사용');
        
        try {
            if (typeof minutes !== 'number' || minutes < 0) return '방금 전';
            if (minutes < 1) return '방금 전';
            if (minutes < 60) return `${Math.floor(minutes)}분 전`;
            
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}시간 전`;
            
            const days = Math.floor(hours / 24);
            if (days < 7) return `${days}일 전`;
            
            const weeks = Math.floor(days / 7);
            return `${weeks}주 전`;
        } catch (error) {
            console.error('❌ 시간 계산 오류 (FriendStatusComponent):', error);
            return '알 수 없음';
        }
    }

    // 새로운 헬퍼: timestamp 기반 시간 계산
    getTimeAgoFromTimestamp(timestamp) {
        // 실시간 시간 관리자가 있으면 그것을 우선 사용
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(timestamp);
        }
        
        // alert-level-manager의 통합된 함수 사용 (2차 백업)
        if (window.alertLevelManager) {
            return window.alertLevelManager.formatTimeDifference(timestamp);
        }
        
        // minutes 기반 함수로 변환
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        return this.getTimeAgoText(diffMins);
    }

    // 친구 상세 정보 보기
    viewFriendDetail(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (friend) {
            this.dispatchEvent(new CustomEvent('status:detail-view', {
                detail: { friend }
            }));
            
            // 친구 상세 모달 표시
            this.showFriendDetailModal(friend);
        }
    }

    // 수동 확인 요청
    async sendManualCheck(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return;

        try {
            console.log('📞 수동 확인 요청:', friend.name);

            // TODO: 실제 확인 요청 API 호출
            // 여기서는 알림만 표시
            this.showNotification(`${friend.displayName || friend.name}님에게 확인 요청을 보냈습니다.`, 'success');

            this.dispatchEvent(new CustomEvent('status:manual-check', {
                detail: { friend }
            }));

        } catch (error) {
            console.error('❌ 수동 확인 요청 실패:', error);
            this.showNotification('확인 요청 발송에 실패했습니다.', 'error');
        }
    }

    // 친구 상세 모달 표시
    showFriendDetailModal(friend) {
        const alertConfig = friend.alert_config;
        const displayName = friend.displayName || friend.name || friend.nickname;
        
        const modalHTML = `
            <div class="friend-status-modal" id="friend-status-modal">
                <div class="modal-overlay" onclick="closeFriendStatusModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${displayName} 상태 정보</h3>
                        <button class="modal-close" onclick="closeFriendStatusModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="friend-status-detail">
                            <div class="status-summary">
                                <div class="status-indicator large" style="background-color: ${alertConfig.color}">
                                    ${alertConfig.icon}
                                </div>
                                <div class="status-info">
                                    <h4 style="color: ${alertConfig.color}">${alertConfig.text}</h4>
                                    <p>마지막 활동: ${friend.time_ago_text}</p>
                                </div>
                            </div>
                            <div class="status-details">
                                <div class="detail-item">
                                    <strong>온라인 상태:</strong> 
                                    <span class="${friend.is_online ? 'online' : 'offline'}">
                                        ${friend.is_online ? '🟢 온라인' : '🔴 오프라인'}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <strong>무응답 시간:</strong> 
                                    ${friend.hours_since_active}시간 ${friend.minutes_since_active % 60}분
                                </div>
                                ${friend.motion_count > 0 ? `
                                    <div class="detail-item">
                                        <strong>동작 감지:</strong> ${friend.motion_count}회
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${friend.alert_level !== 'normal' ? `
                            <button class="btn-primary" onclick="friendStatusComponent.sendManualCheck('${friend.id}'); closeFriendStatusModal();">
                                확인 요청
                            </button>
                        ` : ''}
                        <button class="btn-secondary" onclick="closeFriendStatusModal()">닫기</button>
                    </div>
                </div>
            </div>
        `;

        // 기존 모달 제거
        const existingModal = document.getElementById('friend-status-modal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 로딩 상태 표시
    showLoadingState() {
        const container = document.getElementById('friends-status-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-status">
                    <div class="loading-spinner"></div>
                    <p>친구 상태를 불러오는 중...</p>
                </div>
            `;
        }
    }

    // 로딩 상태 숨김
    hideLoadingState() {
        const container = document.getElementById('friends-status-container');
        if (container) {
            container.style.opacity = '1';
        }
    }

    // 오류 표시
    showError(message) {
        const container = document.getElementById('friends-status-container');
        if (container) {
            container.innerHTML = `
                <div class="error-status">
                    <div class="error-icon">❌</div>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="friendStatusComponent.loadFriendsStatus()">
                        다시 시도
                    </button>
                </div>
            `;
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

    // 친구 추가 이벤트 처리
    onFriendAdded(friend) {
        console.log('👤 새 친구 추가됨 - 상태 모니터링 추가:', friend.displayName || friend.name);
        setTimeout(() => this.loadFriendsStatus(), 2000);
    }

    // 친구 삭제 이벤트 처리
    onFriendRemoved(friend) {
        console.log('👤 친구 삭제됨 - 상태 모니터링 제거:', friend.displayName || friend.name);
        this.friends = this.friends.filter(f => f.id !== friend.id);
        this.applyStatusFilter();
        this.updateStatusDisplay();
        this.updateStatusCounts();
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            friendsCount: this.friends.length,
            filteredCount: this.filteredFriends.length,
            currentFilter: this.currentFilter,
            notificationThresholds: this.notificationThresholds,
            autoRefresh: !!this.refreshTimer,
            realtimeEnabled: !!this.realtimeSubscription
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // friend-status-monitor.js와 완전 호환
    async init() {
        // 이미 초기화되었으면 중복 실행 방지
        if (this.isInitialized) {
            console.log('👀 FriendStatusComponent 이미 초기화됨');
            return true;
        }
        
        // 실제 초기화 로직
        return await this.initialize();
    }

    filterByStatus(status) {
        this.setStatusFilter(status);
    }

    async getNotificationThresholds() {
        return this.notificationThresholds;
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('status:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        // 타이머들 정리
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
            this.notificationTimer = null;
        }

        // 실시간 구독 해제
        if (this.realtimeSubscription && this.supabase) {
            this.supabase.unsubscribe(this.realtimeSubscription);
            this.realtimeSubscription = null;
        }

        // 상태 초기화
        this.friends = [];
        this.filteredFriends = [];
        this.isInitialized = false;
        this.isLoading = false;
        
        console.log('🗑️ FriendStatusComponent 정리 완료');
    }
}

// 친구 상태 모달 닫기 전역 함수
function closeFriendStatusModal() {
    const modal = document.getElementById('friend-status-modal');
    if (modal) {
        modal.remove();
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FriendStatusComponent = FriendStatusComponent;
    window.closeFriendStatusModal = closeFriendStatusModal;
    
    // 즉시 인스턴스 생성 비활성화 (UI 간섭 방지)
    // if (!window.friendStatusComponent) {
    //     window.friendStatusComponent = new FriendStatusComponent();
    //     
    //     console.log('🌐 FriendStatusComponent 전역 등록 완료');
    // }
    console.log('⚠️ FriendStatusComponent 자동 인스턴스 생성 비활성화됨 (UI 보호)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendStatusComponent;
}