/**
 * 친구 상태 모니터링 컴포넌트 v2.0
 * 독립적인 친구 상태 관리 모듈 - 다른 시스템과 완전 분리
 */
class FriendStatusComponent {
    constructor(config = {}) {
        this.config = {
            supabaseUrl: config.supabaseUrl || 'https://wjkzogehbuxbfckczhgr.supabase.co',
            supabaseKey: config.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa3pvZ2VoYnV4YmZja2N6aGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDEyMzk5NjIsImV4cCI6MjAxNjgxNTk2Mn0.WJTlBFPXF7VbLOO8lYkXmXNE3MNW9Vr1dYo4KqKEYMI',
            refreshInterval: config.refreshInterval || 30000, // 30초마다 업데이트
            ...config
        };
        
        this.supabase = null;
        this.currentUser = null;
        this.friends = [];
        this.listeners = new Map();
        this.isLoading = false;
        this.refreshTimer = null;
        
        console.log('🔧 친구 상태 컴포넌트 초기화');
        this.initSupabase();
    }

    /**
     * Supabase 클라이언트 초기화
     */
    initSupabase() {
        try {
            if (window.supabase && window.supabase.createClient) {
                this.supabase = window.supabase.createClient(
                    this.config.supabaseUrl,
                    this.config.supabaseKey
                );
                console.log('✅ Supabase 클라이언트 초기화 완료');
                this.emit('ready');
            } else {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다');
            }
        } catch (error) {
            console.error('❌ Supabase 초기화 실패:', error);
            this.emit('error', { type: 'supabase_init', error });
        }
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
                    console.error(`친구상태 이벤트 ${event} 핸들러 오류:`, error);
                }
            });
        }
    }

    /**
     * 사용자 설정 (로그인 후 호출)
     */
    setCurrentUser(user) {
        this.currentUser = user;
        console.log('👤 현재 사용자 설정:', user?.nickname || user?.id);
        this.emit('user-set', user);
        
        // 사용자 설정 후 친구 상태 로드 시작
        this.startMonitoring();
    }

    /**
     * 친구 상태 모니터링 시작
     */
    async startMonitoring() {
        if (!this.currentUser) {
            console.warn('현재 사용자가 설정되지 않았습니다');
            return;
        }

        console.log('🔄 친구 상태 모니터링 시작');
        
        // 초기 로드
        await this.loadFriendsStatus();
        
        // 주기적 업데이트 시작
        this.startRefreshTimer();
        
        this.emit('monitoring-started');
    }

    /**
     * 주기적 업데이트 타이머 시작
     */
    startRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.loadFriendsStatus(false); // silent 업데이트
        }, this.config.refreshInterval);
        
        console.log(`⏰ ${this.config.refreshInterval/1000}초마다 자동 업데이트 시작`);
    }

    /**
     * 친구 상태 목록 로드
     */
    async loadFriendsStatus(showLoading = true) {
        if (this.isLoading) {
            console.log('⚠️ 이미 로딩 중이므로 중복 호출 방지');
            return;
        }

        if (!this.currentUser || !this.supabase) {
            console.warn('사용자 또는 Supabase 클라이언트가 준비되지 않았습니다');
            return;
        }

        try {
            this.isLoading = true;
            
            if (showLoading) {
                this.emit('loading-start');
            }

            console.log('📊 친구 상태 데이터 로드 중...');
            
            // 친구 목록과 상태 정보 조인해서 가져오기
            const { data, error } = await this.supabase
                .from('friendships')
                .select(`
                    friend_id,
                    users!friendships_friend_id_fkey (
                        id,
                        email,
                        nickname,
                        profile_image_url
                    ),
                    user_status (
                        last_heartbeat,
                        is_active,
                        last_activity_type
                    )
                `)
                .eq('user_id', this.currentUser.id)
                .eq('status', 'accepted');

            if (error) {
                throw new Error(`친구 목록 조회 실패: ${error.message}`);
            }

            // 친구 상태 데이터 가공
            this.friends = (data || []).map(friendship => {
                const friend = friendship.users;
                const status = friendship.user_status?.[0];
                
                const friendData = {
                    id: friend.id,
                    email: friend.email,
                    nickname: friend.nickname,
                    profile_image_url: friend.profile_image_url,
                    last_heartbeat: status?.last_heartbeat || null,
                    is_active: status?.is_active || false,
                    last_activity_type: status?.last_activity_type || 'unknown',
                    alert_level: this.calculateAlertLevel(status?.last_heartbeat),
                    hours_since_heartbeat: this.calculateHoursSince(status?.last_heartbeat)
                };

                return friendData;
            });

            console.log(`✅ ${this.friends.length}명의 친구 상태 로드 완료`);
            
            if (showLoading) {
                this.emit('loading-end');
            }
            
            this.emit('friends-updated', {
                friends: this.friends,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ 친구 상태 로드 실패:', error);
            this.emit('error', { type: 'load_friends', error });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 경고 레벨 계산
     */
    calculateAlertLevel(lastHeartbeat) {
        if (!lastHeartbeat) {
            return 'unknown';
        }

        const now = new Date();
        const heartbeatTime = new Date(lastHeartbeat);
        const hoursDiff = (now - heartbeatTime) / (1000 * 60 * 60);

        if (hoursDiff <= 24) {
            return 'normal';
        } else if (hoursDiff <= 48) {
            return 'warning';
        } else if (hoursDiff <= 72) {
            return 'danger';
        } else {
            return 'critical';
        }
    }

    /**
     * 마지막 하트비트로부터 경과 시간 계산 (시간 단위)
     */
    calculateHoursSince(lastHeartbeat) {
        if (!lastHeartbeat) {
            return 0;
        }

        const now = new Date();
        const heartbeatTime = new Date(lastHeartbeat);
        const hoursDiff = Math.floor((now - heartbeatTime) / (1000 * 60 * 60));
        
        return Math.max(0, hoursDiff);
    }

    /**
     * 특정 친구의 상세 정보 조회
     */
    async getFriendDetails(friendId) {
        if (!this.supabase) {
            throw new Error('Supabase 클라이언트가 준비되지 않았습니다');
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select(`
                    id,
                    email,
                    nickname,
                    profile_image_url,
                    user_status (
                        last_heartbeat,
                        is_active,
                        last_activity_type,
                        battery_level,
                        location_info
                    )
                `)
                .eq('id', friendId)
                .single();

            if (error) {
                throw new Error(`친구 상세 정보 조회 실패: ${error.message}`);
            }

            const status = data.user_status?.[0];
            return {
                ...data,
                alert_level: this.calculateAlertLevel(status?.last_heartbeat),
                hours_since_heartbeat: this.calculateHoursSince(status?.last_heartbeat),
                last_heartbeat: status?.last_heartbeat,
                is_active: status?.is_active,
                last_activity_type: status?.last_activity_type,
                battery_level: status?.battery_level,
                location_info: status?.location_info
            };

        } catch (error) {
            console.error('친구 상세 정보 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 현재 친구 목록 반환
     */
    getFriends() {
        return this.friends;
    }

    /**
     * 특정 경고 레벨의 친구들 반환
     */
    getFriendsByAlertLevel(alertLevel) {
        return this.friends.filter(friend => friend.alert_level === alertLevel);
    }

    /**
     * 응답하지 않는 친구들 반환 (24시간 이상)
     */
    getUnresponsiveFriends() {
        return this.friends.filter(friend => 
            ['warning', 'danger', 'critical'].includes(friend.alert_level)
        );
    }

    /**
     * 친구 상태 수동 새로고침
     */
    async refresh() {
        console.log('🔄 친구 상태 수동 새로고침');
        await this.loadFriendsStatus(true);
    }

    /**
     * 모니터링 중지
     */
    stopMonitoring() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('⏹️ 친구 상태 모니터링 중지');
            this.emit('monitoring-stopped');
        }
    }

    /**
     * 친구 추가 (다른 컴포넌트에서 호출 가능)
     */
    async addFriend(friendId) {
        if (!this.currentUser || !this.supabase) {
            throw new Error('사용자 또는 Supabase 클라이언트가 준비되지 않았습니다');
        }

        try {
            const { data, error } = await this.supabase
                .from('friendships')
                .insert([
                    { user_id: this.currentUser.id, friend_id: friendId, status: 'pending' }
                ]);

            if (error) {
                throw new Error(`친구 추가 실패: ${error.message}`);
            }

            console.log('✅ 친구 추가 요청 완료');
            this.emit('friend-added', { friendId });
            
            // 친구 목록 새로고침
            setTimeout(() => this.refresh(), 1000);

        } catch (error) {
            console.error('❌ 친구 추가 실패:', error);
            throw error;
        }
    }

    /**
     * 통계 정보 반환
     */
    getStatistics() {
        const total = this.friends.length;
        const normal = this.friends.filter(f => f.alert_level === 'normal').length;
        const warning = this.friends.filter(f => f.alert_level === 'warning').length;
        const danger = this.friends.filter(f => f.alert_level === 'danger').length;
        const critical = this.friends.filter(f => f.alert_level === 'critical').length;
        const unknown = this.friends.filter(f => f.alert_level === 'unknown').length;

        return {
            total,
            normal,
            warning,
            danger,
            critical,
            unknown,
            unresponsive: warning + danger + critical
        };
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.stopMonitoring();
        this.listeners.clear();
        this.friends = [];
        this.currentUser = null;
        this.supabase = null;
        
        console.log('🗑️ 친구 상태 컴포넌트 정리 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendStatusComponent;
} else {
    window.FriendStatusComponent = FriendStatusComponent;
}