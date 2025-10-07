/**
 * Android Native Bridge for lonely-care
 * WebView와 Native Android 기능 연동
 */

class AndroidNativeBridge {
    constructor() {
        this.isAndroidWebView = this.detectAndroidWebView();
        this.init();
    }

    // Android WebView 환경 감지
    detectAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || // WebView 키워드
               userAgent.indexOf('Android') > -1; // Android 환경
    }

    // 초기화
    init() {
        console.log('📱 Android Native Bridge 초기화');
        console.log('🔍 Android WebView 환경:', this.isAndroidWebView);
        
        // Android Interface 설정
        this.setupAndroidInterface();
    }

    // Android Interface 설정
    setupAndroidInterface() {
        // Android Interface 객체 생성
        if (!window.AndroidInterface) {
            window.AndroidInterface = {
                makeCall: (phoneNumber) => this.makeCall(phoneNumber),
                makeEmergencyCall: (phoneNumber) => this.makeEmergencyCall(phoneNumber),
                vibrate: (duration) => this.vibrate(duration),
                showNotification: (title, message) => this.showNotification(title, message)
            };
        }

        // Android 객체도 설정 (호환성)
        if (!window.Android) {
            window.Android = window.AndroidInterface;
        }

        console.log('✅ Android Interface 설정 완료');
    }

    // 전화 걸기 (확인 없이 바로 연결)
    async makeCall(phoneNumber) {
        console.log(`📞 전화 연결 시도: ${phoneNumber}`);

        try {
            // 전화번호 정리
            const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');

            if (this.isAndroidWebView) {
                // Android WebView에서 직접 Intent 호출
                console.log('🤖 Android WebView에서 tel: Intent 호출');
                window.location.href = `tel:${cleanPhone}`;
            } else {
                // 일반 웹 브라우저에서 처리
                console.log('🌐 웹 브라우저에서 tel: 링크 처리');
                window.open(`tel:${cleanPhone}`, '_self');
            }

            console.log('✅ 전화 연결 요청 완료');
            return true;

        } catch (error) {
            console.error('❌ 전화 연결 실패:', error);
            throw error;
        }
    }

    // 응급 전화 걸기
    async makeEmergencyCall(phoneNumber) {
        console.log(`🚨 응급 전화 연결: ${phoneNumber}`);
        
        // 응급 전화는 추가 확인 없이 바로 연결
        return await this.makeCall(phoneNumber);
    }

    // 진동 (Android WebView에서만 작동)
    async vibrate(duration = 1000) {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(duration);
                console.log(`📳 진동 실행: ${duration}ms`);
                return true;
            } else {
                console.log('⚠️ 진동 기능 미지원');
                return false;
            }
        } catch (error) {
            console.error('❌ 진동 실행 실패:', error);
            return false;
        }
    }

    // 알림 표시
    async showNotification(title, message) {
        try {
            // 웹 알림 API 사용
            if ('Notification' in window) {
                // 권한 요청
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        throw new Error('알림 권한이 거부되었습니다.');
                    }
                }

                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body: message,
                        icon: '/icon.png'
                    });
                    console.log('📧 웹 알림 표시:', title);
                    return true;
                }
            } else {
                // 대안: 브라우저 alert 사용
                alert(`${title}\n${message}`);
            }
        } catch (error) {
            console.error('❌ 알림 표시 실패:', error);
            // 대안: alert 사용
            alert(`${title}\n${message}`);
        }
        return false;
    }

    // 전화번호 유효성 검사
    isValidPhoneNumber(phoneNumber) {
        if (!phoneNumber) return false;
        
        // 숫자만 추출
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        
        // 한국 전화번호 형식 확인 (8~11자리)
        return cleanPhone.length >= 8 && cleanPhone.length <= 11;
    }

    // Android WebView 권한 상태 확인
    checkPermissions() {
        return {
            phone: this.isAndroidWebView, // Android WebView에서만 전화 가능
            vibrate: 'vibrate' in navigator,
            notification: 'Notification' in window
        };
    }
}

// 전역 인스턴스 생성
const androidBridge = new AndroidNativeBridge();
window.androidBridge = androidBridge;

// 호환성을 위한 전역 함수들
window.makeCall = (phoneNumber) => androidBridge.makeCall(phoneNumber);
window.makeEmergencyCall = (phoneNumber) => androidBridge.makeEmergencyCall(phoneNumber);

console.log('🚀 Android Native Bridge 로드 완료');