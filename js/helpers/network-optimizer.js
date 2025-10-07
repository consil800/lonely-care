/**
 * 네트워크 요청 최적화 헬퍼
 * 배치 요청, 요청 통합, 캐싱 등을 통해 네트워크 효율성 개선
 */
class NetworkOptimizer {
    constructor() {
        this.requestQueue = new Map(); // 대기 중인 요청들
        this.batchTimer = null;
        this.batchDelay = 100; // 100ms 내 요청들을 배치로 처리
        this.requestCache = new Map(); // 요청 결과 캐시
        this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시 유지
        this.pendingRequests = new Map(); // 진행 중인 요청들 (중복 방지)
        
        this.setupNetworkListeners();
    }
    
    /**
     * 친구 관련 데이터를 한 번에 가져오는 통합 요청
     * @param {string} userId - 사용자 ID
     * @returns {Promise<Object>} 통합된 친구 데이터
     */
    async fetchFriendsData(userId) {
        const cacheKey = `friends_data_${userId}`;
        
        // 캐시 확인
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('🚀 친구 데이터 캐시에서 로드');
            return cached;
        }
        
        // 진행 중인 요청이 있으면 대기
        if (this.pendingRequests.has(cacheKey)) {
            console.log('⏳ 진행 중인 친구 데이터 요청 대기');
            return await this.pendingRequests.get(cacheKey);
        }
        
        // 통합 쿼리 실행
        const requestPromise = this.executeFriendsDataQuery(userId);
        this.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // 캐시에 저장
            this.setCache(cacheKey, result);
            
            console.log('📊 친구 데이터 통합 조회 완료:', {
                friendsCount: result.friends?.length || 0,
                statusCount: result.friendStatuses?.length || 0,
                userStatus: result.userStatus ? '있음' : '없음'
            });
            
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * 실제 친구 데이터 통합 쿼리 실행
     * @param {string} userId - 사용자 ID
     * @returns {Promise<Object>} 통합 데이터
     */
    async executeFriendsDataQuery(userId) {
        if (!window.storage?.supabase?.client) {
            throw new Error('Supabase 클라이언트가 초기화되지 않았습니다');
        }
        
        const client = window.storage.supabase.client;
        
        // 병렬 요청으로 모든 데이터 한 번에 가져오기
        const [friendsResult, userStatusResult, friendStatusesResult] = await Promise.allSettled([
            // 1. 친구 목록과 친구들의 기본 정보
            client
                .from('friends')
                .select(`
                    friend_id,
                    communication_offset,
                    created_at,
                    users!friends_friend_id_fkey (
                        id, name, kakao_id, profile_image_url
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active'),
            
            // 2. 내 상태 정보
            client
                .from('user_status')
                .select('*')
                .eq('user_id', userId)
                .single(),
            
            // 3. 친구들의 상태 정보 (친구 목록이 있을 때만)
            client
                .from('user_status')
                .select(`
                    user_id, status, motion_count, last_active,
                    last_heartbeat, last_report_time, updated_at
                `)
                .in('user_id', [userId]) // 일단 내 ID만, 친구 ID는 동적으로 추가
        ]);
        
        // 결과 처리
        const friends = friendsResult.status === 'fulfilled' ? friendsResult.value.data || [] : [];
        const userStatus = userStatusResult.status === 'fulfilled' ? userStatusResult.value.data : null;
        let friendStatuses = [];
        
        // 친구가 있을 경우 친구들의 상태도 조회
        if (friends.length > 0) {
            const friendIds = friends.map(f => f.friend_id);
            
            try {
                const friendStatusResult = await client
                    .from('user_status')
                    .select('*')
                    .in('user_id', friendIds);
                
                friendStatuses = friendStatusResult.data || [];
            } catch (error) {
                console.warn('친구 상태 조회 실패:', error);
            }
        }
        
        return {
            friends,
            userStatus,
            friendStatuses,
            timestamp: Date.now()
        };
    }
    
    /**
     * 배치 상태 업데이트
     * @param {Array} statusUpdates - 상태 업데이트 배열
     */
    async batchStatusUpdate(statusUpdates) {
        if (!statusUpdates || statusUpdates.length === 0) return;
        
        const cacheKey = 'batch_status_update';
        
        // 기존 배치에 추가
        if (this.requestQueue.has(cacheKey)) {
            this.requestQueue.get(cacheKey).push(...statusUpdates);
        } else {
            this.requestQueue.set(cacheKey, [...statusUpdates]);
        }
        
        // 배치 타이머 설정
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(async () => {
            await this.processBatchStatusUpdate();
        }, this.batchDelay);
    }
    
    /**
     * 배치된 상태 업데이트 처리
     */
    async processBatchStatusUpdate() {
        const cacheKey = 'batch_status_update';
        const updates = this.requestQueue.get(cacheKey);
        
        if (!updates || updates.length === 0) return;
        
        this.requestQueue.delete(cacheKey);
        this.batchTimer = null;
        
        try {
            if (!window.storage?.supabase?.client) return;
            
            // 중복 제거 (같은 user_id는 마지막 것만)
            const uniqueUpdates = new Map();
            updates.forEach(update => {
                uniqueUpdates.set(update.user_id, update);
            });
            
            const finalUpdates = Array.from(uniqueUpdates.values());
            
            console.log(`📦 배치 상태 업데이트 처리: ${finalUpdates.length}개 항목`);
            
            // upsert로 한 번에 처리
            const { error } = await window.storage.supabase.client
                .from('user_status')
                .upsert(finalUpdates);
            
            if (error) throw error;
            
            console.log('✅ 배치 상태 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 배치 상태 업데이트 실패:', error);
        }
    }
    
    /**
     * 캐시에서 데이터 가져오기
     * @param {string} key - 캐시 키
     * @returns {any|null} 캐시된 데이터 또는 null
     */
    getFromCache(key) {
        const cached = this.requestCache.get(key);
        
        if (!cached) return null;
        
        // 만료 확인
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.requestCache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    /**
     * 캐시에 데이터 저장
     * @param {string} key - 캐시 키
     * @param {any} data - 저장할 데이터
     */
    setCache(key, data) {
        this.requestCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * 캐시 무효화
     * @param {string|RegExp} pattern - 삭제할 키 패턴
     */
    invalidateCache(pattern) {
        const keysToDelete = [];
        
        for (const key of this.requestCache.keys()) {
            if (typeof pattern === 'string' && key.includes(pattern)) {
                keysToDelete.push(key);
            } else if (pattern instanceof RegExp && pattern.test(key)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.requestCache.delete(key));
        console.log(`🗑️ 캐시 무효화: ${keysToDelete.length}개 항목 삭제`);
    }
    
    /**
     * 네트워크 상태 리스너 설정
     */
    setupNetworkListeners() {
        // 온라인 상태로 변경 시 캐시 갱신
        window.addEventListener('online', () => {
            console.log('📶 온라인 상태 복구 - 캐시 갱신');
            this.invalidateCache(''); // 모든 캐시 무효화
        });
        
        // 오프라인 상태 감지
        window.addEventListener('offline', () => {
            console.log('📵 오프라인 상태 감지');
        });
    }
    
    /**
     * 요청 통계 가져오기
     * @returns {Object} 통계 정보
     */
    getStats() {
        return {
            cacheSize: this.requestCache.size,
            queueSize: this.requestQueue.size,
            pendingRequests: this.pendingRequests.size,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }
    
    /**
     * 캐시 적중률 계산 (간단한 추정)
     * @returns {number} 적중률 (0-100)
     */
    calculateCacheHitRate() {
        // 실제 구현에서는 더 정교한 계산이 필요
        const cacheSize = this.requestCache.size;
        return cacheSize > 0 ? Math.min(cacheSize * 10, 100) : 0;
    }
    
    /**
     * 캐시 정리
     */
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.requestCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.requestCache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`🧹 만료된 캐시 정리: ${keysToDelete.length}개 항목`);
        }
    }
}

// 전역 인스턴스 생성
window.networkOptimizer = new NetworkOptimizer();

// 🚨 생명구조 시스템: 안전한 캐시 정리 시스템
// 인스턴스가 완전히 초기화된 후 실행
setTimeout(() => {
    // 주기적 캐시 정리 (5분마다)
    setInterval(() => {
        try {
            if (window.networkOptimizer && typeof window.networkOptimizer.cleanup === 'function') {
                window.networkOptimizer.cleanup();
            } else {
                console.warn('⚠️ [생명구조] NetworkOptimizer cleanup 메서드가 준비되지 않음');
            }
        } catch (error) {
            console.error('❌ [생명구조] NetworkOptimizer cleanup 실행 실패:', error);
        }
    }, 5 * 60 * 1000);
    
    console.log('✅ [생명구조] NetworkOptimizer 캐시 정리 시스템 시작');
}, 1000); // 1초 후 시작하여 초기화 완료 보장

console.log('🚀 NetworkOptimizer 초기화 완료');