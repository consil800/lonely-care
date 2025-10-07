/**
 * Firebase 설정 파일
 * lonely-care 앱의 Firebase 설정값 (환경변수 기반)
 */

// 🚨 생명구조 앱 - Firebase 설정 중복 선언 완전 방지
(function() {
    'use strict';
    
    // 이미 로드된 경우 종료
    if (window.FIREBASE_CONFIG_LOADED) {
        console.log('🔥 Firebase 설정 이미 로딩됨 - 스크립트 중복 실행 방지');
        return;
    }
    
    // 로딩 플래그 설정
    window.FIREBASE_CONFIG_LOADED = true;
    
    if (!window.firebaseConfig) {
        // 환경변수에서 Firebase 설정 가져오기 (var/const 선언 없음)
        window.firebaseEnvConfig = (window.ENV_CONFIG && window.ENV_CONFIG.firebase) || {};

        // Firebase 프로젝트 설정 (환경변수 기반 + 기본값 폴백) - window에 직접 할당
        window.firebaseConfig = {
            apiKey: window.firebaseEnvConfig.apiKey || "AIzaSyD6pdH5S3y6JcRQFxf5nEUliNccqM4rK5o",
            authDomain: window.firebaseEnvConfig.authDomain || "lonely-care-app.firebaseapp.com",
            projectId: window.firebaseEnvConfig.projectId || "lonely-care-app",
            storageBucket: window.firebaseEnvConfig.storageBucket || "lonely-care-app.firebasestorage.app",
            messagingSenderId: window.firebaseEnvConfig.messagingSenderId || "965854578277",
            appId: window.firebaseEnvConfig.appId || "1:965854578277:web:6315e84a930432232ba88c",
            measurementId: window.firebaseEnvConfig.measurementId || "G-4VCXR8YZPJ",
            vapidKey: window.firebaseEnvConfig.vapidKey || "BHNd92Hp0mqZyMZy_pR-z2lYeO8wgko3KziEPakWfZY0t8FrP_GxZjOnXTIWSAunZDRo6zDWmhvy_kO_a-O_WTg"
        };

        // 보안 주의: FCM 서버 키는 클라이언트에서 절대 사용하지 않음
        // 서버 키는 Cloud Functions에서만 사용
        window.fcmServerKey = null; // 클라이언트에서 제거됨

        // Firebase Cloud Functions URL
        window.fcmEndpoints = (window.ENV_CONFIG && window.ENV_CONFIG.fcmEndpoints) || {
            sendNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendNotification',
            sendBroadcastNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendBroadcastNotification',
            updateToken: 'https://us-central1-lonely-care-app.cloudfunctions.net/updateFCMToken',
            checkFriendStatus: 'https://us-central1-lonely-care-app.cloudfunctions.net/checkFriendStatus'
        };

        // 알림 아이콘 및 이미지 경로
        window.notificationAssets = {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png', // badge용으로 기존 아이콘 재사용
            image: '/icon-192x192.png', // notification image용으로 기존 아이콘 재사용
            sound: '/lonely-care/notification-sound.mp3'
        };

        // 알림 설정
        window.notificationSettings = {
    // 알림 레벨별 설정
    levels: {
        normal: {
            icon: '🟢',
            vibrate: [200],
            sound: 'default',
            priority: 'normal',
            ttl: 86400 // 24시간
        },
        warning: {
            icon: '🟡',
            vibrate: [200, 100, 200],
            sound: 'warning',
            priority: 'high',
            ttl: 43200 // 12시간
        },
        danger: {
            icon: '🟠',
            vibrate: [200, 100, 200, 100, 200],
            sound: 'danger',
            priority: 'high',
            ttl: 21600 // 6시간
        },
        emergency: {
            icon: '🔴',
            vibrate: [500, 100, 500, 100, 500],
            sound: 'emergency',
            priority: 'urgent',
            requireInteraction: true,
            ttl: 3600 // 1시간
        }
    },
    
    // 알림 타입별 설정
    types: {
        friend_status: {
            category: 'friend',
            actions: ['view', 'dismiss', 'call']
        },
        system: {
            category: 'system',
            actions: ['view', 'dismiss']
        },
        admin: {
            category: 'admin',
            actions: ['view', 'dismiss']
        },
        emergency: {
            category: 'emergency',
            actions: ['call119', 'view', 'dismiss']
        }
        }
    };

        // 설정 검증 및 경고
        if (!window.firebaseConfig.apiKey) {
            console.warn('⚠️ Firebase API 키가 설정되지 않았습니다. 환경변수를 확인하세요.');
        }

        // 개발 모드에서만 설정 정보 출력
        if (window.ENV_DEBUG) {
            console.log('🔥 Firebase 설정 로딩 완료:', {
                projectId: window.firebaseConfig.projectId,
                hasApiKey: !!window.firebaseConfig.apiKey,
                hasVapidKey: !!window.firebaseConfig.vapidKey,
                serverKeyRemoved: window.fcmServerKey === null
            });
        }

        console.log('🔥 Firebase 설정 초기화 완료');

        // 모듈 내보내기
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = {
                firebaseConfig: window.firebaseConfig,
                fcmServerKey: window.fcmServerKey,
                fcmEndpoints: window.fcmEndpoints,
                notificationAssets: window.notificationAssets,
                notificationSettings: window.notificationSettings
            };
        }
    } else {
        console.log('🔥 Firebase 설정 이미 로딩됨 - 중복 방지');
    }
})();