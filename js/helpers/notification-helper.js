/**
 * 사용자 친화적 알림 및 오류 메시지 관리 헬퍼
 * 일관된 사용자 경험을 위한 메시지 표시 시스템
 */
class NotificationHelper {
    /**
     * 오류 메시지 매핑
     */
    static ERROR_MESSAGES = {
        // 네트워크 오류
        'fetch': '인터넷 연결을 확인해주세요',
        'network': '네트워크 연결에 문제가 있습니다',
        'timeout': '요청 시간이 초과되었습니다',
        
        // 인증 오류
        'JWT': '로그인이 만료되었습니다. 다시 로그인해주세요',
        'unauthorized': '인증이 필요합니다',
        '401': '로그인 정보가 올바르지 않습니다',
        
        // 데이터베이스 오류
        '23505': '이미 존재하는 데이터입니다',
        '23503': '관련 데이터를 찾을 수 없습니다',
        'PGRST': '데이터베이스 연결에 문제가 있습니다',
        
        // 파일 관련 오류
        'file_too_large': '파일 크기가 너무 큽니다 (최대 5MB)',
        'invalid_file_type': '지원하지 않는 파일 형식입니다',
        
        // 카카오 관련 오류
        'KOE006': '카카오 로그인 설정에 문제가 있습니다',
        'kakao_cancelled': '카카오 로그인이 취소되었습니다',
        
        // 친구 관련 오류
        'friend_not_found': '친구를 찾을 수 없습니다',
        'already_friend': '이미 등록된 친구입니다',
        'invalid_invite_code': '유효하지 않은 초대 코드입니다',
        
        // 움직임/하트비트 오류
        'motion_detection_failed': '움직임 감지에 실패했습니다',
        'heartbeat_failed': '상태 전송에 실패했습니다',
        
        // 권한 관련 오류
        'permission_denied': '권한이 거부되었습니다',
        'location_permission': '위치 권한이 필요합니다',
        'notification_permission': '알림 권한이 필요합니다',
        
        // 일반 오류
        'unknown': '알 수 없는 오류가 발생했습니다',
        'default': '작업 중 오류가 발생했습니다'
    };
    
    /**
     * 성공 메시지 매핑
     */
    static SUCCESS_MESSAGES = {
        'login': '로그인되었습니다',
        'logout': '로그아웃되었습니다',
        'profile_saved': '프로필이 저장되었습니다',
        'friend_added': '친구가 추가되었습니다',
        'friend_removed': '친구가 삭제되었습니다',
        'invite_sent': '초대가 전송되었습니다',
        'status_sent': '상태가 전송되었습니다',
        'settings_saved': '설정이 저장되었습니다'
    };
    
    /**
     * 사용자 친화적 오류 메시지 생성
     * @param {Error|string} error - 오류 객체 또는 오류 메시지
     * @param {string} context - 오류 발생 컨텍스트
     * @returns {string} 사용자 친화적 메시지
     */
    static getFriendlyErrorMessage(error, context = '') {
        const errorMessage = typeof error === 'string' ? error : error?.message || '';
        const errorCode = error?.code || '';
        
        // 오류 키워드 매칭
        for (const [key, message] of Object.entries(this.ERROR_MESSAGES)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase()) || 
                errorCode.includes(key)) {
                return message;
            }
        }
        
        // 컨텍스트 기반 메시지
        if (context) {
            switch (context) {
                case 'login':
                    return '로그인에 실패했습니다. 다시 시도해주세요';
                case 'friend_add':
                    return '친구 추가에 실패했습니다';
                case 'profile_save':
                    return '프로필 저장에 실패했습니다';
                case 'status_update':
                    return '상태 업데이트에 실패했습니다';
                default:
                    return `${context} 중 오류가 발생했습니다`;
            }
        }
        
        return this.ERROR_MESSAGES.default;
    }
    
    /**
     * 성공 메시지 표시
     * @param {string} type - 성공 타입
     * @param {string} customMessage - 커스텀 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    static showSuccess(type, customMessage = null, duration = 3000) {
        const message = customMessage || this.SUCCESS_MESSAGES[type] || '작업이 완료되었습니다';
        
        this.showNotification(message, 'success', duration);
    }
    
    /**
     * 오류 메시지 표시
     * @param {Error|string} error - 오류 객체 또는 메시지
     * @param {string} context - 컨텍스트
     * @param {number} duration - 표시 시간 (ms)
     */
    static showError(error, context = '', duration = 5000) {
        const friendlyMessage = this.getFriendlyErrorMessage(error, context);
        
        this.showNotification(friendlyMessage, 'error', duration);
        
        // 콘솔에는 상세 오류 정보 로그
        console.error(`[${context}] 오류:`, error);
    }
    
    /**
     * 정보 메시지 표시
     * @param {string} message - 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    static showInfo(message, duration = 3000) {
        this.showNotification(message, 'info', duration);
    }
    
    /**
     * 경고 메시지 표시
     * @param {string} message - 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    static showWarning(message, duration = 4000) {
        this.showNotification(message, 'warning', duration);
    }
    
    /**
     * 통합 알림 표시 (기존 auth.showNotification 호출)
     * @param {string} message - 메시지
     * @param {string} type - 타입 (success, error, info, warning)
     * @param {number} duration - 표시 시간 (ms)
     */
    static showNotification(message, type = 'info', duration = 3000) {
        if (window.auth && typeof auth.showNotification === 'function') {
            auth.showNotification(message, type);
        } else {
            // 대체 알림 시스템
            this.showFallbackNotification(message, type);
        }
    }
    
    /**
     * 대체 알림 시스템 (auth.showNotification이 없을 때)
     * @param {string} message - 메시지
     * @param {string} type - 타입
     */
    static showFallbackNotification(message, type = 'info') {
        // 토스트 메시지 요소 생성
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${type}`;
        toast.textContent = message;
        
        // 스타일 설정
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            maxWidth: '300px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out'
        });
        
        // 타입별 색상
        const colors = {
            success: '#2ed573',
            error: '#ff4757',
            warning: '#ffa502',
            info: '#3498db'
        };
        toast.style.backgroundColor = colors[type] || colors.info;
        
        // DOM에 추가
        document.body.appendChild(toast);
        
        // 애니메이션
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 확인 대화상자 표시
     * @param {string} message - 메시지
     * @param {string} title - 제목
     * @returns {Promise<boolean>} 사용자 선택
     */
    static async showConfirm(message, title = '확인') {
        // 기존 커스텀 confirm이 있으면 사용
        if (window.showCustomConfirm) {
            return await window.showCustomConfirm(title, message);
        }
        
        // 기본 confirm 사용
        return confirm(`${title}\n\n${message}`);
    }
    
    /**
     * 입력 대화상자 표시
     * @param {string} message - 메시지
     * @param {string} defaultValue - 기본값
     * @returns {string|null} 사용자 입력
     */
    static showPrompt(message, defaultValue = '') {
        return prompt(message, defaultValue);
    }
    
    /**
     * 로딩 스피너 표시/숨기기
     * @param {boolean} show - 표시 여부
     * @param {string} message - 로딩 메시지
     */
    static showLoading(show, message = '처리 중...') {
        let loadingElement = document.getElementById('global-loading');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'global-loading';
                loadingElement.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                    ">
                        <div style="
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            text-align: center;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        ">
                            <div class="spinner" style="
                                width: 40px;
                                height: 40px;
                                border: 4px solid #f3f3f3;
                                border-top: 4px solid #3498db;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                                margin: 0 auto 10px;
                            "></div>
                            <div>${message}</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        } else {
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }
    
    /**
     * 네트워크 상태 변화 알림
     */
    static setupNetworkNotifications() {
        window.addEventListener('online', () => {
            this.showSuccess('network', '인터넷 연결이 복구되었습니다');
        });
        
        window.addEventListener('offline', () => {
            this.showWarning('인터넷 연결이 끊어졌습니다');
        });
    }
    
    /**
     * 권한 요청 안내
     * @param {string} permission - 권한 타입
     * @returns {string} 안내 메시지
     */
    static getPermissionGuide(permission) {
        const guides = {
            'notifications': '알림을 받으려면 알림 권한을 허용해주세요.',
            'location': '정확한 위치 기반 서비스를 위해 위치 권한을 허용해주세요.',
            'motion': '움직임 감지를 위해 모션 센서 접근을 허용해주세요.',
            'camera': '프로필 사진 촬영을 위해 카메라 권한을 허용해주세요.',
            'microphone': '음성 기능을 사용하려면 마이크 권한을 허용해주세요.'
        };
        
        return guides[permission] || '해당 기능을 사용하려면 권한을 허용해주세요.';
    }
}

// 전역으로 사용 가능하게 설정
window.NotificationHelper = NotificationHelper;

// 앱 로드 시 네트워크 알림 설정
document.addEventListener('DOMContentLoaded', () => {
    NotificationHelper.setupNetworkNotifications();
    
    // 스피너 CSS 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

// 이전 코드와의 호환성을 위한 별칭
window.FriendlyNotification = NotificationHelper;