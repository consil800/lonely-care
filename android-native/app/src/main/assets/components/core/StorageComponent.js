/**
 * StorageComponent v1.0
 * 로컬 스토리지와 데이터베이스 연결을 추상화하는 컴포넌트
 * 
 * 기존 storage.js 기능을 래핑하여 컴포넌트화
 * 자동 캐싱, 동기화, 오프라인 지원 등의 고급 스토리지 기능 제공
 */

class StorageComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            cacheEnabled: true,
            autoSync: true,
            syncInterval: 30 * 1000, // 30초마다 동기화
            offlineSupport: true,
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.supabaseClient = null;
        this.cache = new Map();
        this.pendingWrites = [];
        this.syncTimer = null;
        
        // 기존 storage 인스턴스 참조 (호환성)
        this.legacyStorage = null;
        
        console.log('💾 StorageComponent 초기화', this.options);
        
        // 자동 초기화
        this.init();
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 Storage 초기화 시작');
            
            // 기존 storage 인스턴스 참조 (호환성)
            if (window.storage) {
                this.legacyStorage = window.storage;
                this.supabaseClient = this.legacyStorage.supabase;
            }
            
            // 온라인/오프라인 감지 설정
            this.setupNetworkDetection();
            
            // 자동 동기화 설정
            if (this.options.autoSync) {
                this.startAutoSync();
            }
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('storage:ready', {
                detail: { component: this, isOnline: this.isOnline }
            }));

            console.log('✅ Storage 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ Storage 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('storage:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 네트워크 감지 설정
     */
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            console.log('🌐 온라인 상태로 전환');
            this.isOnline = true;
            this.dispatchEvent(new CustomEvent('storage:online'));
            this.processPendingWrites();
        });

        window.addEventListener('offline', () => {
            console.log('📴 오프라인 상태로 전환');
            this.isOnline = false;
            this.dispatchEvent(new CustomEvent('storage:offline'));
        });
    }

    /**
     * 자동 동기화 시작
     */
    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        console.log('🔄 자동 동기화 시작');

        this.syncTimer = setInterval(async () => {
            if (this.isOnline && this.pendingWrites.length > 0) {
                await this.processPendingWrites();
            }
        }, this.options.syncInterval);
    }

    /**
     * 자동 동기화 중단
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('🛑 자동 동기화 중단');
        }
    }

    /**
     * 사용자 관련 메서드들
     */

    // 사용자 생성
    async createUser(userData) {
        try {
            console.log('👤 사용자 생성:', userData.name);

            // 온라인 상태면 즉시 DB에 저장
            if (this.isOnline && this.legacyStorage) {
                const result = await this.legacyStorage.createUser(userData);
                
                // 캐시에도 저장
                if (this.options.cacheEnabled) {
                    this.cache.set(`user_${result.id}`, {
                        data: result,
                        timestamp: Date.now(),
                        source: 'database'
                    });
                }
                
                this.dispatchEvent(new CustomEvent('storage:user-created', {
                    detail: { user: result, source: 'database' }
                }));
                
                return result;
            } else {
                // 오프라인 상태면 pending queue에 추가
                const pendingOperation = {
                    type: 'createUser',
                    data: userData,
                    timestamp: Date.now(),
                    id: 'pending_' + Date.now()
                };
                
                this.pendingWrites.push(pendingOperation);
                
                // 임시 ID로 로컬에 저장
                const tempUser = {
                    id: pendingOperation.id,
                    ...userData,
                    _pending: true
                };
                
                localStorage.setItem(`pending_user_${pendingOperation.id}`, JSON.stringify(tempUser));
                
                this.dispatchEvent(new CustomEvent('storage:user-created', {
                    detail: { user: tempUser, source: 'offline' }
                }));
                
                return tempUser;
            }

        } catch (error) {
            console.error('❌ 사용자 생성 실패:', error);
            throw error;
        }
    }

    // 사용자 조회 (Kakao ID로)
    async getUserByKakaoId(kakaoId) {
        try {
            // 캐시 확인 먼저
            if (this.options.cacheEnabled) {
                const cached = this.cache.get(`kakao_user_${kakaoId}`);
                if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) { // 5분 캐시
                    console.log('💾 캐시에서 사용자 조회:', cached.data.name);
                    return cached.data;
                }
            }

            // 온라인 상태면 DB에서 조회
            if (this.isOnline && this.legacyStorage) {
                const result = await this.legacyStorage.getUserByKakaoId(kakaoId);
                
                // 캐시에 저장
                if (result && this.options.cacheEnabled) {
                    this.cache.set(`kakao_user_${kakaoId}`, {
                        data: result,
                        timestamp: Date.now(),
                        source: 'database'
                    });
                    this.cache.set(`user_${result.id}`, {
                        data: result,
                        timestamp: Date.now(),
                        source: 'database'
                    });
                }
                
                return result;
            } else {
                // 오프라인 상태면 로컬 스토리지에서 찾기
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    const userData = JSON.parse(currentUser);
                    if (userData.kakao_id === kakaoId) {
                        console.log('📴 오프라인 - 로컬에서 사용자 조회');
                        return userData;
                    }
                }
                return null;
            }

        } catch (error) {
            console.error('❌ 사용자 조회 실패:', error);
            return null;
        }
    }

    // 사용자 정보 업데이트
    async updateUser(userId, updateData) {
        try {
            console.log('📝 사용자 정보 업데이트:', userId);

            if (this.isOnline && this.legacyStorage) {
                const result = await this.legacyStorage.updateUser(userId, updateData);
                
                // 캐시 업데이트
                if (this.options.cacheEnabled) {
                    this.cache.set(`user_${userId}`, {
                        data: result,
                        timestamp: Date.now(),
                        source: 'database'
                    });
                }
                
                this.dispatchEvent(new CustomEvent('storage:user-updated', {
                    detail: { user: result, source: 'database' }
                }));
                
                return result;
            } else {
                // 오프라인 상태면 pending queue에 추가
                this.pendingWrites.push({
                    type: 'updateUser',
                    userId: userId,
                    data: updateData,
                    timestamp: Date.now()
                });
                
                // 로컬 사용자 정보 업데이트
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    const userData = JSON.parse(currentUser);
                    if (userData.id === userId) {
                        const updatedUser = { ...userData, ...updateData };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        
                        this.dispatchEvent(new CustomEvent('storage:user-updated', {
                            detail: { user: updatedUser, source: 'offline' }
                        }));
                        
                        return updatedUser;
                    }
                }
                
                throw new Error('오프라인 상태에서 사용자를 찾을 수 없습니다.');
            }

        } catch (error) {
            console.error('❌ 사용자 업데이트 실패:', error);
            throw error;
        }
    }

    // 현재 사용자 설정
    setCurrentUser(user) {
        try {
            if (user) {
                console.log('💾 현재 사용자 설정:', user.name);
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 캐시에도 저장
                if (this.options.cacheEnabled) {
                    this.cache.set(`user_${user.id}`, {
                        data: user,
                        timestamp: Date.now(),
                        source: 'current'
                    });
                    
                    if (user.kakao_id) {
                        this.cache.set(`kakao_user_${user.kakao_id}`, {
                            data: user,
                            timestamp: Date.now(),
                            source: 'current'
                        });
                    }
                }
            } else {
                console.log('💾 현재 사용자 삭제');
                localStorage.removeItem('currentUser');
            }

            // 기존 storage와 동기화
            if (this.legacyStorage) {
                this.legacyStorage.setCurrentUser(user);
            }

            this.dispatchEvent(new CustomEvent('storage:current-user-changed', {
                detail: { user }
            }));

        } catch (error) {
            console.error('❌ 현재 사용자 설정 실패:', error);
        }
    }

    // 현재 사용자 조회
    getCurrentUser() {
        try {
            // 기존 storage에서 먼저 확인
            if (this.legacyStorage) {
                const user = this.legacyStorage.getCurrentUser();
                if (user) {
                    return user;
                }
            }
            
            // localStorage에서 조회
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                return JSON.parse(stored);
            }
            
            return null;

        } catch (error) {
            console.error('❌ 현재 사용자 조회 실패:', error);
            return null;
        }
    }

    /**
     * 친구 관련 메서드들
     */

    // 친구 목록 조회
    async getFriends(kakaoId) {
        try {
            // 캐시 확인
            if (this.options.cacheEnabled) {
                const cached = this.cache.get(`friends_${kakaoId}`);
                if (cached && (Date.now() - cached.timestamp) < 2 * 60 * 1000) { // 2분 캐시
                    return cached.data;
                }
            }

            if (this.isOnline && this.legacyStorage) {
                const friends = await this.legacyStorage.getFriends(kakaoId);
                
                // 캐시에 저장
                if (this.options.cacheEnabled) {
                    this.cache.set(`friends_${kakaoId}`, {
                        data: friends,
                        timestamp: Date.now(),
                        source: 'database'
                    });
                }
                
                return friends;
            } else {
                // 오프라인 상태면 캐시에서 반환
                const cached = this.cache.get(`friends_${kakaoId}`);
                return cached ? cached.data : [];
            }

        } catch (error) {
            console.error('❌ 친구 목록 조회 실패:', error);
            return [];
        }
    }

    // 친구 추가
    async addFriend(username, friendUsername) {
        try {
            if (this.isOnline && this.legacyStorage) {
                const result = await this.legacyStorage.addFriend(username, friendUsername);
                
                // 친구 목록 캐시 무효화
                this.invalidateFriendsCache();
                
                this.dispatchEvent(new CustomEvent('storage:friend-added', {
                    detail: { friend: result, source: 'database' }
                }));
                
                return result;
            } else {
                // 오프라인 상태면 pending queue에 추가
                this.pendingWrites.push({
                    type: 'addFriend',
                    username: username,
                    friendUsername: friendUsername,
                    timestamp: Date.now()
                });
                
                throw new Error('오프라인 상태에서는 친구를 추가할 수 없습니다.');
            }

        } catch (error) {
            console.error('❌ 친구 추가 실패:', error);
            throw error;
        }
    }

    /**
     * 상태 관련 메서드들
     */

    // 사용자 상태 업데이트
    async updateUserStatus(kakaoId, status) {
        try {
            if (this.isOnline && this.legacyStorage) {
                const result = await this.legacyStorage.updateUserStatus(kakaoId, status);
                
                this.dispatchEvent(new CustomEvent('storage:status-updated', {
                    detail: { kakaoId, status, result }
                }));
                
                return result;
            } else {
                // 오프라인 상태면 pending queue에 추가
                this.pendingWrites.push({
                    type: 'updateUserStatus',
                    kakaoId: kakaoId,
                    status: status,
                    timestamp: Date.now()
                });
                
                console.log('📴 오프라인 - 상태 업데이트 대기열 추가');
                return null;
            }

        } catch (error) {
            console.log('⚠️ 상태 업데이트 실패 (무시):', error.message);
            return null;
        }
    }

    /**
     * 설정 관련 메서드들
     */

    // 설정 저장
    async setSetting(key, value) {
        try {
            localStorage.setItem(`setting_${key}`, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));

            // 기존 storage와 동기화
            if (this.legacyStorage) {
                await this.legacyStorage.setSetting(key, value);
            }

            this.dispatchEvent(new CustomEvent('storage:setting-changed', {
                detail: { key, value }
            }));

        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
        }
    }

    // 설정 조회
    async getSetting(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(`setting_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.value;
            }

            // 기존 storage에서 조회
            if (this.legacyStorage) {
                return await this.legacyStorage.getSetting(key) || defaultValue;
            }

            return defaultValue;

        } catch (error) {
            console.error('❌ 설정 조회 실패:', error);
            return defaultValue;
        }
    }

    /**
     * 캐시 관리
     */

    // 캐시 무효화
    invalidateCache(pattern = null) {
        if (pattern) {
            // 패턴에 맞는 캐시만 삭제
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // 전체 캐시 삭제
            this.cache.clear();
        }
        
        console.log('🗑️ 캐시 무효화:', pattern || '전체');
    }

    // 친구 목록 캐시 무효화
    invalidateFriendsCache() {
        this.invalidateCache('friends_');
    }

    /**
     * 대기 중인 작업 처리
     */
    async processPendingWrites() {
        if (!this.isOnline || this.pendingWrites.length === 0) {
            return;
        }

        console.log('📤 대기 중인 작업 처리:', this.pendingWrites.length + '개');

        const processedOperations = [];

        for (const operation of this.pendingWrites) {
            try {
                let result = null;

                switch (operation.type) {
                    case 'createUser':
                        if (this.legacyStorage) {
                            result = await this.legacyStorage.createUser(operation.data);
                            // 임시 저장된 데이터 삭제
                            localStorage.removeItem(`pending_user_${operation.id}`);
                        }
                        break;

                    case 'updateUser':
                        if (this.legacyStorage) {
                            result = await this.legacyStorage.updateUser(operation.userId, operation.data);
                        }
                        break;

                    case 'addFriend':
                        if (this.legacyStorage) {
                            result = await this.legacyStorage.addFriend(operation.username, operation.friendUsername);
                        }
                        break;

                    case 'updateUserStatus':
                        if (this.legacyStorage) {
                            result = await this.legacyStorage.updateUserStatus(operation.kakaoId, operation.status);
                        }
                        break;
                }

                processedOperations.push(operation);
                console.log('✅ 작업 처리 완료:', operation.type);

            } catch (error) {
                console.error('❌ 작업 처리 실패:', operation.type, error.message);
            }
        }

        // 처리된 작업들 제거
        this.pendingWrites = this.pendingWrites.filter(op => !processedOperations.includes(op));

        if (processedOperations.length > 0) {
            this.dispatchEvent(new CustomEvent('storage:sync-completed', {
                detail: { processedCount: processedOperations.length }
            }));
        }
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            cacheSize: this.cache.size,
            pendingWrites: this.pendingWrites.length,
            hasSupabase: !!this.supabaseClient,
            autoSync: !!this.syncTimer
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // storage.js와 완전 호환
    async getUser(username) {
        return this.legacyStorage ? await this.legacyStorage.getUser(username) : null;
    }

    async getUserByEmail(email) {
        return this.legacyStorage ? await this.legacyStorage.getUserByEmail(email) : null;
    }

    async getFriendsById(userId) {
        return this.legacyStorage ? await this.legacyStorage.getFriendsById(userId) : [];
    }

    async removeFriend(username, friendUsername) {
        return this.legacyStorage ? await this.legacyStorage.removeFriend(username, friendUsername) : null;
    }

    async getFriendsStatus(kakaoId) {
        return this.legacyStorage ? await this.legacyStorage.getFriendsStatus(kakaoId) : [];
    }

    async addNotification(kakaoId, message, type) {
        return this.legacyStorage ? await this.legacyStorage.addNotification(kakaoId, message, type) : null;
    }

    async getNotifications(kakaoId) {
        return this.legacyStorage ? await this.legacyStorage.getNotifications(kakaoId) : [];
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('storage:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.stopAutoSync();
        this.cache.clear();
        this.pendingWrites = [];
        this.isInitialized = false;
        
        console.log('🗑️ StorageComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.StorageComponent = StorageComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.storageComponent) {
        window.storageComponent = new StorageComponent();
        
        console.log('🌐 StorageComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageComponent;
}