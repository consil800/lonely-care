/**
 * StorageIntegration.js
 * StorageComponent와 기존 storage.js 시스템을 통합하는 브릿지 역할
 */

// StorageComponent와 기존 storage 시스템 통합
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 StorageComponent 통합 시작');
    
    // StorageComponent가 로드되고 초기화될 때까지 대기
    const waitForStorageComponent = () => {
        if (window.storageComponent && window.storage) {
            setupStorageIntegration();
        } else {
            setTimeout(waitForStorageComponent, 100);
        }
    };
    
    // 약간의 지연 후 시작 (다른 컴포넌트들이 로드될 시간 확보)
    setTimeout(waitForStorageComponent, 300);
});

function setupStorageIntegration() {
    console.log('💾 StorageComponent 통합 설정 중...');
    
    const storageComponent = window.storageComponent;
    const storage = window.storage;
    
    // 기존 storage.js의 주요 메서드를 StorageComponent로 위임
    
    // 1. 사용자 관리 메서드 래핑
    const originalCreateUser = storage.createUser.bind(storage);
    storage.createUser = async function(userData) {
        try {
            // StorageComponent를 통해 처리
            return await storageComponent.createUser(userData);
        } catch (error) {
            // 실패시 기존 방식으로 fallback
            console.warn('StorageComponent 실패, 기존 방식 사용:', error.message);
            return await originalCreateUser(userData);
        }
    };
    
    const originalGetUserByKakaoId = storage.getUserByKakaoId.bind(storage);
    storage.getUserByKakaoId = async function(kakaoId) {
        try {
            // StorageComponent를 통해 처리 (캐싱 포함)
            return await storageComponent.getUserByKakaoId(kakaoId);
        } catch (error) {
            console.warn('StorageComponent 실패, 기존 방식 사용:', error.message);
            return await originalGetUserByKakaoId(kakaoId);
        }
    };
    
    const originalUpdateUser = storage.updateUser.bind(storage);
    storage.updateUser = async function(userId, updateData) {
        try {
            return await storageComponent.updateUser(userId, updateData);
        } catch (error) {
            console.warn('StorageComponent 실패, 기존 방식 사용:', error.message);
            return await originalUpdateUser(userId, updateData);
        }
    };
    
    const originalSetCurrentUser = storage.setCurrentUser.bind(storage);
    storage.setCurrentUser = function(user) {
        // 기존 로직 실행
        originalSetCurrentUser(user);
        
        // StorageComponent에도 반영
        storageComponent.setCurrentUser(user);
    };
    
    // 2. 친구 관리 메서드 래핑
    const originalGetFriends = storage.getFriends.bind(storage);
    storage.getFriends = async function(kakaoId) {
        try {
            // StorageComponent를 통해 처리 (캐싱 포함)
            return await storageComponent.getFriends(kakaoId);
        } catch (error) {
            console.warn('StorageComponent 실패, 기존 방식 사용:', error.message);
            return await originalGetFriends(kakaoId);
        }
    };
    
    const originalAddFriend = storage.addFriend.bind(storage);
    storage.addFriend = async function(username, friendUsername) {
        try {
            return await storageComponent.addFriend(username, friendUsername);
        } catch (error) {
            console.warn('StorageComponent 실패, 기존 방식 사용:', error.message);
            return await originalAddFriend(username, friendUsername);
        }
    };
    
    // 3. 상태 관리 메서드 래핑
    const originalUpdateUserStatus = storage.updateUserStatus.bind(storage);
    storage.updateUserStatus = async function(kakaoId, status) {
        try {
            return await storageComponent.updateUserStatus(kakaoId, status);
        } catch (error) {
            // 상태 업데이트는 실패해도 계속 진행
            return await originalUpdateUserStatus(kakaoId, status);
        }
    };
    
    // 4. 설정 관리 메서드 래핑
    const originalSetSetting = storage.setSetting.bind(storage);
    storage.setSetting = async function(key, value) {
        try {
            return await storageComponent.setSetting(key, value);
        } catch (error) {
            return await originalSetSetting(key, value);
        }
    };
    
    const originalGetSetting = storage.getSetting.bind(storage);
    storage.getSetting = async function(key) {
        try {
            return await storageComponent.getSetting(key);
        } catch (error) {
            return await originalGetSetting(key);
        }
    };
    
    // 5. StorageComponent 이벤트 리스너 설정
    storageComponent.addEventListener('storage:online', () => {
        console.log('🌐 스토리지 온라인 상태');
        
        // 전역 이벤트 발송
        window.dispatchEvent(new CustomEvent('storage-online'));
    });
    
    storageComponent.addEventListener('storage:offline', () => {
        console.log('📴 스토리지 오프라인 상태');
        
        // 전역 이벤트 발송
        window.dispatchEvent(new CustomEvent('storage-offline'));
    });
    
    storageComponent.addEventListener('storage:sync-completed', (e) => {
        console.log('🔄 스토리지 동기화 완료:', e.detail.processedCount + '개 작업');
        
        // 친구 목록 등 UI 업데이트가 필요한 컴포넌트에 알림
        window.dispatchEvent(new CustomEvent('storage-sync-completed', {
            detail: e.detail
        }));
    });
    
    storageComponent.addEventListener('storage:user-created', (e) => {
        console.log('👤 사용자 생성됨:', e.detail.user.name);
        
        // 기존 auth 시스템에 알림
        if (window.auth && e.detail.source === 'database') {
            // 실제 DB에 저장된 경우만 auth에 반영
            window.auth.currentUser = e.detail.user;
        }
    });
    
    storageComponent.addEventListener('storage:user-updated', (e) => {
        console.log('📝 사용자 정보 업데이트됨:', e.detail.user.name);
        
        // 현재 사용자인 경우 auth에 반영
        if (window.auth && window.auth.currentUser && 
            window.auth.currentUser.id === e.detail.user.id) {
            window.auth.currentUser = e.detail.user;
        }
    });
    
    storageComponent.addEventListener('storage:friend-added', (e) => {
        console.log('👥 친구 추가됨:', e.detail.friend.name);
        
        // 친구 목록 UI 업데이트 트리거
        if (window.friendsManager && window.friendsManager.loadFriendsList) {
            setTimeout(() => {
                window.friendsManager.loadFriendsList();
            }, 1000);
        }
    });
    
    // 6. 기존 storage 객체에 StorageComponent 메서드 추가
    storage.getStatus = function() {
        return storageComponent.getStatus();
    };
    
    storage.invalidateCache = function(pattern) {
        return storageComponent.invalidateCache(pattern);
    };
    
    storage.invalidateFriendsCache = function() {
        return storageComponent.invalidateFriendsCache();
    };
    
    storage.processPendingWrites = function() {
        return storageComponent.processPendingWrites();
    };
    
    // 7. 네트워크 상태 변경 시 UI 알림 (선택적)
    let networkStatusShown = false;
    
    storageComponent.addEventListener('storage:offline', () => {
        if (!networkStatusShown) {
            console.log('📴 오프라인 모드 - 데이터는 온라인 복구 시 동기화됩니다');
            networkStatusShown = true;
            
            // 5초 후 상태 초기화
            setTimeout(() => {
                networkStatusShown = false;
            }, 5000);
        }
    });
    
    storageComponent.addEventListener('storage:online', () => {
        console.log('🌐 온라인 복구 - 대기 중인 데이터를 동기화합니다');
        networkStatusShown = false;
    });
    
    console.log('✅ StorageComponent 통합 완료');
    
    // 통합 상태 확인
    const status = storageComponent.getStatus();
    console.log('📊 스토리지 상태:', {
        온라인: status.isOnline,
        캐시크기: status.cacheSize,
        대기작업: status.pendingWrites,
        자동동기화: status.autoSync
    });
}