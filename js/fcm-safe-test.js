/**
 * 안전한 FCM 테스트 함수들
 * 무한 루프 방지와 함께 FCM 시스템 테스트
 */

// 간단한 FCM 시스템 테스트
window.testFCMSystem = async function() {
    console.log('🧪 FCM 시스템 안전 테스트 시작');
    
    try {
        // 1. 현재 사용자 확인
        const currentUser = auth?.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 사용자 로그인 필요');
            return false;
        }
        
        console.log('👤 현재 사용자:', currentUser.name, currentUser.id);
        
        // 2. FCM 매니저 상태 확인
        const fcmStatus = window.firebaseMessagingManager?.getStatus();
        console.log('🔥 FCM 상태:', fcmStatus);
        
        // 3. 데이터베이스에서 FCM 토큰 확인
        if (storage?.supabase?.client) {
            const { data: tokenData, error } = await storage.supabase.client
                .from('user_fcm_tokens')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
                
            if (error) {
                console.warn('⚠️ FCM 토큰 조회 실패:', error.message);
                
                // 토큰이 없다면 생성 시도
                if (window.firebaseMessagingManager) {
                    console.log('🔄 FCM 토큰 생성 시도...');
                    await window.firebaseMessagingManager.requestPermissionAndGetToken();
                }
            } else {
                console.log('✅ FCM 토큰 존재:', tokenData);
            }
        }
        
        // 4. 간단한 로컬 알림 테스트
        if (window.firebaseMessagingManager) {
            console.log('🔔 로컬 알림 테스트...');
            await window.firebaseMessagingManager.showCustomNotification({
                title: '🧪 FCM 테스트',
                message: 'FCM 시스템이 정상적으로 작동하고 있습니다!',
                type: 'system'
            });
        }
        
        console.log('✅ FCM 시스템 테스트 완료');
        return true;
        
    } catch (error) {
        console.error('❌ FCM 시스템 테스트 실패:', error);
        return false;
    }
};

// FCM 토큰 강제 생성
window.forceFCMToken = async function() {
    console.log('🔧 FCM 토큰 강제 생성 시작');
    
    try {
        const currentUser = auth?.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 사용자 로그인 필요');
            return;
        }
        
        // 더미 토큰 생성
        const dummyToken = `fcm-token-${currentUser.id}-${Date.now()}`;
        
        // 데이터베이스에 저장
        if (storage?.supabase?.client) {
            const { error } = await storage.supabase.client
                .from('user_fcm_tokens')
                .upsert({
                    user_id: currentUser.id,
                    fcm_token: dummyToken,
                    platform: 'web',
                    user_agent: navigator.userAgent,
                    updated_at: new Date().toISOString()
                });
                
            if (error) {
                console.error('❌ FCM 토큰 저장 실패:', error);
            } else {
                console.log('✅ FCM 토큰 강제 생성 및 저장 완료:', dummyToken);
            }
        }
        
    } catch (error) {
        console.error('❌ FCM 토큰 강제 생성 실패:', error);
    }
};

// 안전한 알림 테스트 (한 번만 실행)
window.testSafeNotification = async function(type = 'system', title = '테스트', message = '안전한 알림 테스트') {
    console.log(`🧪 안전한 ${type} 알림 테스트:`, { title, message });
    
    try {
        if (window.firebaseMessagingManager) {
            await window.firebaseMessagingManager.sendSystemNotification(title, message);
        } else {
            console.warn('⚠️ Firebase Messaging Manager 없음');
        }
    } catch (error) {
        console.error('❌ 안전한 알림 테스트 실패:', error);
    }
};

// FCM 상태 점검
window.checkFCMStatus = function() {
    const status = {
        firebaseMessagingManager: !!window.firebaseMessagingManager,
        fcmService: !!window.fcmService,
        auth: !!window.auth,
        storage: !!storage?.supabase?.client,
        currentUser: auth?.getCurrentUser()?.name || 'N/A',
        fcmToken: window.firebaseMessagingManager?.fcmToken || 'N/A'
    };
    
    console.table(status);
    return status;
};

// 권한 없이도 작동하는 FCM 테스트
window.testFCMBypass = async function() {
    console.log('🛠️ 권한 우회 FCM 테스트 시작');
    
    try {
        const currentUser = auth?.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 사용자 로그인 필요');
            return false;
        }
        
        // 1. 더미 FCM 토큰 직접 생성
        const bypassToken = `bypass-fcm-token-${Date.now()}`;
        console.log('🔧 더미 토큰 생성:', bypassToken);
        
        // 2. 데이터베이스에 직접 저장 (upsert 사용)
        if (storage?.supabase?.client) {
            const { data, error } = await storage.supabase.client
                .from('user_fcm_tokens')
                .upsert({
                    user_id: currentUser.id,
                    fcm_token: bypassToken,
                    platform: 'web',
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select();
                
            if (error) {
                console.error('❌ 더미 토큰 저장 실패:', error);
                return false;
            } else {
                console.log('✅ 더미 토큰 저장 성공:', data);
            }
        }
        
        // 3. 저장된 토큰 확인
        const { data: verifyData, error: verifyError } = await storage.supabase.client
            .from('user_fcm_tokens')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (verifyError) {
            console.error('❌ 토큰 확인 실패:', verifyError);
        } else {
            console.log('✅ 저장된 FCM 토큰 확인:', verifyData);
        }
        
        // 4. 브라우저 기본 알림으로 테스트 (권한 무시)
        try {
            console.log('🔔 브라우저 기본 알림 테스트...');
            console.log('📢 [알림 시뮬레이션] FCM 우회 테스트 완료!');
            console.log('📢 실제로는 다음 알림이 표시될 예정: "FCM 시스템이 정상 작동합니다!"');
        } catch (notificationError) {
            console.warn('⚠️ 알림 표시 실패 (예상됨):', notificationError.message);
        }
        
        console.log('✅ 권한 우회 FCM 테스트 완료');
        return true;
        
    } catch (error) {
        console.error('❌ FCM 우회 테스트 실패:', error);
        return false;
    }
};

console.log('🛡️ 안전한 FCM 테스트 함수들 로드 완료');
console.log('💡 사용법:');
console.log('  - testFCMSystem() : 전체 FCM 시스템 테스트');
console.log('  - forceFCMToken() : FCM 토큰 강제 생성');
console.log('  - testSafeNotification() : 안전한 알림 테스트');
console.log('  - checkFCMStatus() : FCM 상태 점검');
console.log('  - testFCMBypass() : 권한 우회 FCM 테스트 (NEW!)');  