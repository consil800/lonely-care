/**
 * Alert Level Manager
 * 친구 상태 알림 레벨 관리 모듈
 */

class AlertLevelManager {
    constructor() {
        this.alertLevels = {
            'normal': { 
                text: '정상', 
                color: '#28a745', 
                icon: '🟢',
                priority: 0,
                vibratePattern: [200],
                soundFrequency: 0
            },
            'warning': { 
                text: '주의', 
                color: '#ffc107', 
                icon: '🟡',
                priority: 1,
                vibratePattern: [200, 100, 200],
                soundFrequency: 800
            },
            'danger': { 
                text: '경고', 
                color: '#fd7e14', 
                icon: '🟠',
                priority: 2,
                vibratePattern: [200, 100, 200, 100, 200],
                soundFrequency: 1000
            },
            'emergency': { 
                text: '위험', 
                color: '#dc3545', 
                icon: '🔴',
                priority: 3,
                vibratePattern: [500, 100, 500, 100, 500],
                soundFrequency: 1200,
                requireInteraction: true
            }
        };
        
        // 알림 임계값 (시간 단위)
        this.defaultThresholds = {
            warning: 24,    // 24시간
            danger: 48,     // 48시간
            emergency: 72   // 72시간
        };
    }
    
    /**
     * 마지막 활동 시간을 기준으로 알림 레벨 계산
     */
    calculateAlertLevel(lastActivity, thresholds = null) {
        const now = new Date();
        const lastActivityTime = new Date(lastActivity);
        const hoursDiff = (now - lastActivityTime) / (1000 * 60 * 60);
        
        const limits = thresholds || this.defaultThresholds;
        
        if (hoursDiff >= limits.emergency) {
            return 'emergency';
        } else if (hoursDiff >= limits.danger) {
            return 'danger';
        } else if (hoursDiff >= limits.warning) {
            return 'warning';
        } else {
            return 'normal';
        }
    }
    
    /**
     * 알림 레벨 정보 조회
     */
    getAlertLevelInfo(level) {
        return this.alertLevels[level] || this.alertLevels.normal;
    }
    
    /**
     * 알림 레벨 비교 (우선순위 기반)
     */
    compareAlertLevels(level1, level2) {
        const priority1 = this.alertLevels[level1]?.priority || 0;
        const priority2 = this.alertLevels[level2]?.priority || 0;
        return priority2 - priority1; // 내림차순 정렬
    }
    
    /**
     * 임계값 업데이트
     */
    updateThresholds(newThresholds) {
        this.defaultThresholds = { ...this.defaultThresholds, ...newThresholds };
    }
    
    /**
     * 시간 차이를 사람이 읽기 쉬한 형태로 변환 (통합된 함수 사용)
     * @deprecated 이 함수는 RealTimeStatusManager.formatTimeDifference()로 통합되었습니다.
     */
    formatTimeDifference(lastActivity) {
        // 실시간 시간 관리자가 있으면 그것을 우선 사용
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(lastActivity);
        }
        
        // 백업: 기존 로직 유지 (호환성)
        console.warn('⚠️ RealTimeStatusManager를 찾을 수 없음, 백업 시간 계산 사용');
        
        const now = new Date();
        const lastActivityTime = new Date(lastActivity);
        
        // 유효하지 않은 날짜 처리
        if (isNaN(lastActivityTime.getTime())) {
            console.warn('⚠️ 유효하지 않은 timestamp:', lastActivity);
            return '알 수 없음';
        }
        
        const diff = now - lastActivityTime;
        
        // 음수 시간 차이 처리 (미래 시간)
        if (diff < 0) {
            return '방금 전';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        // 🚨 생명구조 시스템: 24시간 이내는 프라이버시 보호
        if (hours < 24) {
            return '활동중';
        }
        
        // 24시간 이상은 구체적 표시 (생명구조 정보)
        if (days === 1) {
            return '1일 전 활동';
        } else if (days === 2) {
            return '2일 전 활동';
        } else if (days === 3) {
            return '3일 전 활동';
        } else if (days > 3) {
            return `${days}일 전 활동`;
        } else if (hours >= 24) {
            return `${hours}시간 전 활동`;
        }
        
        // 백업: 24시간 미만은 활동중
        return '활동중';
    }
}

// 전역 인스턴스 생성
window.alertLevelManager = new AlertLevelManager();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertLevelManager;
}