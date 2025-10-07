/**
 * Real Time Status Manager
 * 실시간 친구 활동 상태 관리 및 프라이버시 보호
 * 생명구조 시스템을 위한 시간 표시 통합 관리자
 */

// 🚨 생명구조 시스템: 중복 로딩 방지
if (typeof window.RealTimeStatusManager !== 'undefined') {
    console.log('⚠️ RealTimeStatusManager 이미 존재 - 중복 로딩 방지');
} else {

class RealTimeStatusManager {
    constructor() {
        this.updateInterval = null;
        this.registeredElements = new Map();
        this.privacyThreshold = 24 * 60 * 60 * 1000; // 24시간 (프라이버시 보호 임계값)
        console.log('🕒 RealTimeStatusManager 초기화');
    }
    
    /**
     * 시간 차이를 프라이버시 보호를 고려하여 표시
     * 24시간 이내: "활동중" (프라이버시 보호)
     * 24시간 이상: "X일 전 활동" (생명구조 정보)
     * 
     * @param {Date|string} lastActivity - 마지막 활동 시간
     * @returns {string} 포맷된 시간 문자열
     */
    formatTimeDifference(lastActivity) {
        if (!lastActivity) {
            return '활동 기록 없음';
        }
        
        const now = new Date();
        const lastActivityTime = new Date(lastActivity);
        const diff = now - lastActivityTime;
        
        // 24시간 이내는 프라이버시 보호를 위해 "활동중" 표시
        if (diff < this.privacyThreshold) {
            console.log('🔒 프라이버시 보호: 24시간 이내 활동 → "활동중"');
            return '활동중';
        }
        
        // 24시간 이상은 구체적인 시간 표시 (생명구조 정보)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 1) {
            return '1일 전 활동';
        } else if (days === 2) {
            return '2일 전 활동';
        } else if (days === 3) {
            return '3일 전 활동';
        } else if (days > 3) {
            return `${days}일 전 활동`;
        }
        
        // 백업: 시간 단위 (24시간은 이미 필터링됨)
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours > 0) {
            return `${hours}시간 전 활동`;
        }
        
        return '활동중';
    }
    
    /**
     * 요소 등록 및 자동 업데이트 설정
     */
    registerTimeElement(element, lastActivity) {
        if (!element || !element.id) return;
        
        this.registeredElements.set(element.id, {
            element: element,
            lastActivity: lastActivity
        });
        
        // 즉시 업데이트
        this.updateElement(element.id);
        
        console.log(`📝 시간 요소 등록: ${element.id}`);
    }
    
    /**
     * 단일 요소 업데이트
     */
    updateElement(elementId) {
        const data = this.registeredElements.get(elementId);
        if (!data || !data.element) return;
        
        try {
            const formattedTime = this.formatTimeDifference(data.lastActivity);
            data.element.textContent = formattedTime;
            
            // 🚨 생명구조: 친구 카드 스타일 충돌 방지
            // 친구 카드 내부의 시간 텍스트는 스타일 적용하지 않음
            const isFriendCard = data.element.closest('.friend-status-card') || 
                               data.element.classList.contains('friend-time') ||
                               data.element.parentElement?.classList.contains('friend-time');
            
            if (!isFriendCard) {
                // 프라이버시 상태에 따른 스타일 적용 (친구 카드 외부에서만)
                if (formattedTime === '활동중') {
                    data.element.style.color = '#28a745'; // 초록색
                    data.element.style.fontWeight = '500';
                } else if (formattedTime.includes('일 전')) {
                    // 일수에 따른 색상 차별화
                    const days = parseInt(formattedTime.match(/\d+/)?.[0] || 0);
                    if (days >= 3) {
                        data.element.style.color = '#dc3545'; // 빨간색 (위험)
                    } else if (days >= 2) {
                        data.element.style.color = '#fd7e14'; // 주황색 (경고)
                    } else {
                        data.element.style.color = '#ffc107'; // 노란색 (주의)
                    }
                }
            }
        } catch (error) {
            console.error('❌ 시간 요소 업데이트 실패:', error);
        }
    }
    
    /**
     * 모든 등록된 요소 업데이트
     */
    updateAllElements() {
        this.registeredElements.forEach((data, elementId) => {
            this.updateElement(elementId);
        });
    }
    
    /**
     * 전역 시간 업데이트 시작
     */
    startGlobalTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // 1분마다 모든 시간 표시 업데이트
        this.updateInterval = setInterval(() => {
            console.log('🔄 전역 시간 업데이트 실행');
            this.updateAllElements();
        }, 60000); // 1분
        
        console.log('⏰ 전역 시간 업데이트 시작 (1분 주기)');
    }
    
    /**
     * 페이지 전환시 리프레시
     */
    refreshOnPageChange() {
        console.log('📄 페이지 전환 - 시간 표시 새로고침');
        this.updateAllElements();
    }
    
    /**
     * 정리 및 메모리 해제
     */
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.registeredElements.clear();
        console.log('🧹 RealTimeStatusManager 정리 완료');
    }
    
    /**
     * 프라이버시 설정 변경
     * @param {number} hours - 프라이버시 보호 시간 (기본 24시간)
     */
    setPrivacyThreshold(hours) {
        this.privacyThreshold = hours * 60 * 60 * 1000;
        console.log(`🔒 프라이버시 임계값 변경: ${hours}시간`);
        this.updateAllElements();
    }
    
    /**
     * 디버그 정보
     */
    getDebugInfo() {
        return {
            registeredElements: this.registeredElements.size,
            updateInterval: this.updateInterval !== null,
            privacyThreshold: this.privacyThreshold / (60 * 60 * 1000) + '시간'
        };
    }
}

// 전역 클래스 등록 (중복 방지용)
window.RealTimeStatusManager = RealTimeStatusManager;

// 전역 인스턴스 생성 (기존 인스턴스가 없을 때만)
if (!window.realTimeStatusManager) {
    window.realTimeStatusManager = new RealTimeStatusManager();
    // 자동 시간 업데이트 시작
    window.realTimeStatusManager.startGlobalTimeUpdate();
    console.log('✅ RealTimeStatusManager 신규 인스턴스 생성 및 활성화 완료');
} else {
    console.log('✅ RealTimeStatusManager 기존 인스턴스 사용');
}

} // 중복 방지 조건문 끝

console.log('✅ RealTimeStatusManager 스크립트 로드 완료');