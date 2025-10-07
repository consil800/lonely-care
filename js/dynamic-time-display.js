/**
 * 동적 시간 표시 관리자
 * 하드코딩된 24/48/72시간을 데이터베이스에서 가져온 실제 설정값으로 업데이트
 */

class DynamicTimeDisplayManager {
    constructor() {
        this.currentSettings = {
            warning_minutes: 1440,    // 24시간 (기본값)
            danger_minutes: 2880,     // 48시간 (기본값)
            emergency_minutes: 4320   // 72시간 (기본값)
        };
        
        this.isInitialized = false;
        this.updateInterval = null;
        
        console.log('⏰ Dynamic Time Display Manager 초기화');
        this.init();
    }

    /**
     * 초기화
     */
    async init() {
        try {
            // 설정 로드
            await this.loadTimeSettings();
            
            // UI 업데이트 (초기화 시에만 로그 출력)
            this.updateAllTimeDisplays(true);
            
            // 주기적 업데이트 시작 (60초마다)
            this.startPeriodicUpdate();
            
            this.isInitialized = true;
            console.log('✅ Dynamic Time Display Manager 초기화 완료');
            
        } catch (error) {
            console.error('❌ Dynamic Time Display Manager 초기화 실패:', error);
        }
    }

    /**
     * 시간 설정 로드 (admin 설정 우선)
     */
    async loadTimeSettings() {
        try {
            // 1순위: Firebase에서 관리자 설정 조회
            if (storage?.db) {
                try {
                    const settingsSnapshot = await storage.db.collection('notification_settings_admin')
                        .orderBy('updated_at', 'desc')
                        .limit(1)
                        .get();

                    if (!settingsSnapshot.empty) {
                        const data = settingsSnapshot.docs[0].data();
                        // 프로덕션 환경에서는 24시간 미만 값을 무시하고 기본값 사용
                        const warningMin = data.warning_minutes < 1440 ? 1440 : data.warning_minutes;
                        const dangerMin = data.danger_minutes < 2880 ? 2880 : data.danger_minutes;
                        const emergencyMin = data.emergency_minutes < 4320 ? 4320 : data.emergency_minutes;
                        
                        this.currentSettings = {
                            warning_minutes: warningMin,
                            danger_minutes: dangerMin,
                            emergency_minutes: emergencyMin
                        };
                        
                        console.log('📊 관리자 설정에서 시간 로드 (24시간 미만 값 필터링):', this.currentSettings);
                        console.log('⚠️ 원본 DB 값:', data);
                        return;
                    }
                } catch (error) {
                    console.warn('⚠️ Firebase 설정 조회 실패:', error);
                }
            }

            // 2순위: 로컬 스토리지에서 관리자 설정 조회
            const localAdminSettings = localStorage.getItem('admin-notification-settings');
            if (localAdminSettings) {
                try {
                    const parsed = JSON.parse(localAdminSettings);
                    // 프로덕션 환경에서는 24시간 미만 값을 무시하고 기본값 사용
                    const warningMin = (parsed.warning_minutes && parsed.warning_minutes >= 1440) ? parsed.warning_minutes : 1440;
                    const dangerMin = (parsed.danger_minutes && parsed.danger_minutes >= 2880) ? parsed.danger_minutes : 2880;
                    const emergencyMin = (parsed.emergency_minutes && parsed.emergency_minutes >= 4320) ? parsed.emergency_minutes : 4320;
                    
                    this.currentSettings = {
                        warning_minutes: warningMin,
                        danger_minutes: dangerMin,
                        emergency_minutes: emergencyMin
                    };
                    
                    console.log('💾 로컬 관리자 설정에서 시간 로드 (24시간 미만 값 필터링):', this.currentSettings);
                    console.log('⚠️ 원본 로컬 값:', parsed);
                    return;
                } catch (parseError) {
                    console.warn('⚠️ 로컬 관리자 설정 파싱 실패:', parseError);
                }
            }

            // 3순위: friend-status-monitor에서 현재 사용중인 설정 가져오기
            if (window.friendStatusMonitor?.getNotificationThresholds) {
                try {
                    const thresholds = await window.friendStatusMonitor.getNotificationThresholds();
                    this.currentSettings = {
                        warning_minutes: thresholds.warning || 1440,
                        danger_minutes: thresholds.danger || 2880,
                        emergency_minutes: thresholds.emergency || 4320
                    };
                    
                    console.log('🔗 Friend Status Monitor에서 시간 로드:', this.currentSettings);
                    return;
                } catch (monitorError) {
                    console.warn('⚠️ Friend Status Monitor 설정 로드 실패:', monitorError);
                }
            }

            // 4순위: 기본값 사용
            console.log('📝 기본 시간 설정 사용:', this.currentSettings);

        } catch (error) {
            console.error('❌ 시간 설정 로드 실패:', error);
            // 기본값 유지
        }
    }

    /**
     * 분을 시간 표시로 변환
     */
    formatMinutesToTimeDisplay(minutes) {
        if (minutes < 60) {
            return `${minutes}분`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return `${hours}시간`;
            } else {
                return `${hours}시간 ${remainingMinutes}분`;
            }
        } else {
            const days = Math.floor(minutes / 1440);
            const remainingHours = Math.floor((minutes % 1440) / 60);
            if (remainingHours === 0) {
                return `${days}일`;
            } else {
                return `${days}일 ${remainingHours}시간`;
            }
        }
    }

    /**
     * 모든 시간 표시 업데이트
     */
    updateAllTimeDisplays(showLog = false) {
        try {
            const warningTime = this.formatMinutesToTimeDisplay(this.currentSettings.warning_minutes);
            const dangerTime = this.formatMinutesToTimeDisplay(this.currentSettings.danger_minutes);
            const emergencyTime = this.formatMinutesToTimeDisplay(this.currentSettings.emergency_minutes);

            // 로그는 명시적으로 요청되었거나 초기화 시에만 출력
            if (showLog) {
                console.log('🕒 시간 표시 업데이트:', {
                    warning: `${this.currentSettings.warning_minutes}분 → ${warningTime}`,
                    danger: `${this.currentSettings.danger_minutes}분 → ${dangerTime}`,
                    emergency: `${this.currentSettings.emergency_minutes}분 → ${emergencyTime}`
                });
            }

            // 친구 상태 페이지의 상태 안내 업데이트
            this.updateElement('normal-time-display', warningTime);
            this.updateElement('warning-time-display', warningTime);
            this.updateElement('danger-time-display', dangerTime);
            this.updateElement('emergency-time-display', emergencyTime);

            // 알림 설정 페이지의 설정 제목 업데이트
            this.updateElement('warning-setting-time', warningTime);
            this.updateElement('danger-setting-time', dangerTime);
            this.updateElement('emergency-setting-time', emergencyTime);

        } catch (error) {
            console.error('❌ 시간 표시 업데이트 실패:', error);
        }
    }

    /**
     * 특정 엘리먼트 업데이트
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            // 엘리먼트가 없어도 에러 출력하지 않음 (페이지가 아직 로드되지 않았을 수 있음)
        }
    }

    /**
     * 주기적 업데이트 시작
     */
    startPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 60초마다 설정 재확인 및 업데이트
        this.updateInterval = setInterval(async () => {
            try {
                const prevSettings = { ...this.currentSettings };
                await this.loadTimeSettings();
                
                // 설정이 변경되었다면 UI 업데이트 (로그 출력)
                if (JSON.stringify(prevSettings) !== JSON.stringify(this.currentSettings)) {
                    console.log('🔄 시간 설정 변경 감지, UI 업데이트');
                    this.updateAllTimeDisplays(true);
                }
            } catch (error) {
                console.warn('⚠️ 주기적 시간 설정 업데이트 실패:', error);
            }
        }, 60000); // 60초

        console.log('⏰ 주기적 시간 설정 업데이트 시작 (60초 간격)');
    }

    /**
     * 수동 새로고침
     */
    async refresh() {
        console.log('🔄 시간 표시 수동 새로고침');
        await this.loadTimeSettings();
        this.updateAllTimeDisplays(true);
    }

    /**
     * 현재 설정 반환
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }

    /**
     * 설정 변경 알림 (관리자 패널에서 호출)
     */
    onSettingsChanged(newSettings) {
        console.log('📢 설정 변경 알림 수신:', newSettings);
        
        if (newSettings.warning_minutes) this.currentSettings.warning_minutes = newSettings.warning_minutes;
        if (newSettings.danger_minutes) this.currentSettings.danger_minutes = newSettings.danger_minutes;
        if (newSettings.emergency_minutes) this.currentSettings.emergency_minutes = newSettings.emergency_minutes;
        
        this.updateAllTimeDisplays(true);
    }

    /**
     * 정리
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.isInitialized = false;
        console.log('🗑️ Dynamic Time Display Manager 정리 완료');
    }
}

// 전역 인스턴스 생성
let dynamicTimeDisplayManager;

/**
 * 초기화 함수
 */
function initDynamicTimeDisplay() {
    if (!dynamicTimeDisplayManager) {
        dynamicTimeDisplayManager = new DynamicTimeDisplayManager();
        window.dynamicTimeDisplayManager = dynamicTimeDisplayManager;
        console.log('⏰ Dynamic Time Display Manager 글로벌 초기화 완료');
    }
    return dynamicTimeDisplayManager;
}

// DOM 로드 후 초기화 (로그인 상태 확인 후)
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 상태 확인을 위해 더 긴 지연 시간 적용
    setTimeout(() => {
        // 로그인 상태가 아니면 초기화하지 않음
        const savedUser = localStorage.getItem('currentUser');
        const isLoggedIn = savedUser && auth?.getCurrentUser();
        
        if (!isLoggedIn) {
            console.log('⚠️ Dynamic Time Display: 로그인 상태가 아니므로 초기화 안함');
            return;
        }
        
        console.log('✅ Dynamic Time Display: 로그인 상태 확인됨, 초기화 진행');
        initDynamicTimeDisplay();
    }, 3000);
});

// 페이지 변경시 재업데이트
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && dynamicTimeDisplayManager?.isInitialized) {
        setTimeout(() => {
            dynamicTimeDisplayManager.updateAllTimeDisplays();
        }, 100);
    }
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DynamicTimeDisplayManager, initDynamicTimeDisplay };
} else {
    window.DynamicTimeDisplayManager = DynamicTimeDisplayManager;
    window.initDynamicTimeDisplay = initDynamicTimeDisplay;
}