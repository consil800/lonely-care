/**
 * FCM 로더
 * 모든 FCM 관련 컴포넌트를 순서대로 로드
 */

(function() {
    console.log('🚀 FCM 시스템 로더 시작');
    
    // 로드할 스크립트 목록 (순서 중요)
    const scripts = [
        // Firebase SDK
        { src: 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js', type: 'external' },
        { src: 'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js', type: 'external' },
        
        // Firebase 설정
        { src: '/lonely-care/js/firebase-config.js', type: 'local' },
        
        // FCM 서비스
        { src: '/lonely-care/components/notifications/FCMService.js', type: 'local' },
        
        // 기존 Firebase Messaging (업데이트됨)
        { src: '/lonely-care/js/firebase-messaging.js', type: 'local' },
        
        // FCM 통합 레이어
        { src: '/lonely-care/components/notifications/FCMNotificationIntegration.js', type: 'local' },
        
        // 관리자 알림 (관리자 페이지에서만)
        { src: '/lonely-care/admin/admin-notification.js', type: 'local', condition: () => window.location.pathname.includes('admin') }
    ];
    
    // 스크립트 로드 함수
    function loadScript(scriptInfo) {
        return new Promise((resolve, reject) => {
            // 조건 확인
            if (scriptInfo.condition && !scriptInfo.condition()) {
                console.log(`⏭️ 스킵: ${scriptInfo.src}`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = scriptInfo.src;
            script.async = false;
            
            script.onload = () => {
                console.log(`✅ 로드 완료: ${scriptInfo.src}`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ 로드 실패: ${scriptInfo.src}`);
                reject(new Error(`Failed to load ${scriptInfo.src}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    // 순차적으로 스크립트 로드
    async function loadAllScripts() {
        try {
            for (const scriptInfo of scripts) {
                await loadScript(scriptInfo);
            }
            
            console.log('✅ FCM 시스템 로드 완료');
            
            // 로드 완료 이벤트 발생
            window.dispatchEvent(new CustomEvent('fcm:system-loaded'));
            
            // FCM 초기화 (약간의 지연 후)
            setTimeout(() => {
                if (window.initFirebaseMessaging) {
                    window.initFirebaseMessaging();
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ FCM 시스템 로드 실패:', error);
        }
    }
    
    // Service Worker 등록 확인
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/lonely-care/firebase-messaging-sw.js')
            .then(registration => {
                console.log('✅ FCM Service Worker 등록 완료:', registration.scope);
            })
            .catch(error => {
                console.warn('⚠️ FCM Service Worker 등록 실패:', error);
            });
    }
    
    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllScripts);
    } else {
        loadAllScripts();
    }
    
})();

console.log('💡 FCM 시스템이 로드되고 있습니다...');