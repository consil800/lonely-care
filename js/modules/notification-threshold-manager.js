/**
 * Notification Threshold Manager
 * 알림 임계값 관리 모듈 (Firebase 기반)
 */

class NotificationThresholdManager {
    constructor() {
        this.cachedThresholds = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5분 캐시
    }
    
    /**
     * Firebase에서 알림 임계값 조회
     */
    async getNotificationThresholds() {
        try {
            // 캐시 확인
            if (this.isCacheValid()) {
                console.log('📋 캐시된 알림 설정 사용');
                return this.cachedThresholds;
            }
            
            // Firebase에서 실시간 설정 조회
            if (storage?.isInitialized && window.firebaseClient) {
                console.log('🔍 Firebase에서 알림 설정 조회 중...');
                
                const thresholds = await window.firebaseClient.getDocument('admin_settings', 'notification_times');
                
                if (thresholds?.data) {
                    const settings = {
                        warning: thresholds.data.warning_hours || 24,
                        danger: thresholds.data.danger_hours || 48,
                        emergency: thresholds.data.emergency_hours || 72
                    };
                    
                    // 캐시 업데이트
                    this.updateCache(settings);
                    
                    console.log('✅ Firebase 알림 설정 로딩 완료:', settings);
                    return settings;
                }
            }
            
            // Firebase 실패시 기본값 반환
            const defaultSettings = { warning: 24, danger: 48, emergency: 72 };
            console.log('⚠️ Firebase 설정 조회 실패, 기본값 사용:', defaultSettings);
            
            this.updateCache(defaultSettings);
            return defaultSettings;
            
        } catch (error) {
            console.error('❌ 알림 설정 조회 실패:', error);
            
            // 에러 발생시 기본값 반환
            const defaultSettings = { warning: 24, danger: 48, emergency: 72 };
            this.updateCache(defaultSettings);
            return defaultSettings;
        }
    }
    
    /**
     * 캐시 유효성 검사
     */
    isCacheValid() {
        if (!this.cachedThresholds || !this.cacheTime) {
            return false;
        }
        
        const now = Date.now();
        return (now - this.cacheTime) < this.cacheDuration;
    }
    
    /**
     * 캐시 업데이트
     */
    updateCache(thresholds) {
        this.cachedThresholds = thresholds;
        this.cacheTime = Date.now();
    }
    
    /**
     * 캐시 초기화
     */
    clearCache() {
        this.cachedThresholds = null;
        this.cacheTime = null;
    }
    
    /**
     * 알림 설정 업데이트 (Firebase)
     */
    async updateNotificationThresholds(newThresholds) {
        try {
            if (!storage?.isInitialized || !window.firebaseClient) {
                throw new Error('Firebase가 초기화되지 않았습니다');
            }
            
            await window.firebaseClient.updateDocument('admin_settings', 'notification_times', {
                warning_hours: newThresholds.warning || 24,
                danger_hours: newThresholds.danger || 48,
                emergency_hours: newThresholds.emergency || 72,
                updated_at: new Date().toISOString(),
                updated_by: 'system'
            });
            
            // 캐시 업데이트
            this.updateCache(newThresholds);
            
            console.log('✅ 알림 설정 업데이트 완료:', newThresholds);
            return true;
            
        } catch (error) {
            console.error('❌ 알림 설정 업데이트 실패:', error);
            return false;
        }
    }
    
    /**
     * 알림 임계값 검증
     */
    validateThresholds(thresholds) {
        const errors = [];
        
        if (!thresholds.warning || thresholds.warning < 1 || thresholds.warning > 168) {
            errors.push('경고 시간은 1시간~168시간 범위여야 합니다');
        }
        
        if (!thresholds.danger || thresholds.danger < 1 || thresholds.danger > 168) {
            errors.push('위험 시간은 1시간~168시간 범위여야 합니다');
        }
        
        if (!thresholds.emergency || thresholds.emergency < 1 || thresholds.emergency > 168) {
            errors.push('긴급 시간은 1시간~168시간 범위여야 합니다');
        }
        
        if (thresholds.warning >= thresholds.danger) {
            errors.push('경고 시간은 위험 시간보다 작아야 합니다');
        }
        
        if (thresholds.danger >= thresholds.emergency) {
            errors.push('위험 시간은 긴급 시간보다 작아야 합니다');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// 전역 인스턴스 생성
window.notificationThresholdManager = new NotificationThresholdManager();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationThresholdManager;
}