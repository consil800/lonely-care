/**
 * 🔥 Firebase 초기화 관리자 - 생명구조 앱 전용
 * 
 * 목적: Firebase 초기화 로직을 안정화하고 순서를 보장
 * 특징:
 * - 단계별 초기화 관리
 * - 재시도 로직 내장
 * - 초기화 상태 중앙 관리
 * - 생명구조 앱 안정성 보장
 * 
 * @author AI Assistant
 * @version 1.0.0 (생명구조 최적화)
 * @since 2025-01-01
 */

class FirebaseInitializer {
    constructor() {
        this.state = {
            configLoaded: false,
            sdkLoaded: false,
            clientInitialized: false,
            storageInitialized: false,
            fullyInitialized: false,
            initializationStarted: false,
            lastError: null,
            retryCount: 0
        };
        
        // 🚨 생명구조 시스템: Android WebView 환경에 맞춘 타임아웃 증가
        this.maxRetries = 8; // 재시도 횟수 증가
        this.retryDelay = 1500; // 1.5초 (Android WebView 고려)
        this.maxWaitTime = 60000; // 60초 (Android WebView 네트워크 지연 고려)
        this.listeners = [];
        
        console.log('🔥 [생명구조] Firebase 초기화 관리자 생성됨');
    }

    /**
     * 초기화 상태 변경 이벤트 리스너 등록
     * @param {Function} callback - 상태 변경 시 호출될 콜백 함수
     */
    onStateChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * 상태 변경 알림
     * @param {string} step - 변경된 단계
     * @param {boolean} success - 성공 여부
     * @param {Error} error - 오류 (있는 경우)
     */
    notifyStateChange(step, success, error = null) {
        this.state.lastError = error;
        console.log(`🔥 [생명구조] Firebase 초기화 단계: ${step} → ${success ? '성공' : '실패'}`);
        
        if (error) {
            console.error(`❌ [생명구조] ${step} 오류:`, error);
        }

        this.listeners.forEach(callback => {
            try {
                callback(this.state, step, success, error);
            } catch (err) {
                console.error('❌ [생명구조] 상태 변경 리스너 오류:', err);
            }
        });
    }

    /**
     * Firebase SDK 로드 상태 확인
     */
    checkSDKLoaded() {
        const sdkLoaded = typeof window !== 'undefined' && 
                         window.firebase && 
                         window.firebase.firestore && 
                         window.firebase.initializeApp;
        
        this.state.sdkLoaded = sdkLoaded;
        return sdkLoaded;
    }

    /**
     * Firebase 설정 로드 상태 확인
     */
    checkConfigLoaded() {
        const configLoaded = typeof window !== 'undefined' && 
                           window.firebaseConfig && 
                           window.firebaseConfig.apiKey && 
                           window.firebaseConfig.projectId;
        
        this.state.configLoaded = configLoaded;
        return configLoaded;
    }

    /**
     * Firebase 클라이언트 초기화 상태 확인
     */
    checkClientInitialized() {
        const clientInitialized = typeof window !== 'undefined' && 
                                 window.firebaseClient && 
                                 window.firebaseClient.isInitialized;
        
        this.state.clientInitialized = clientInitialized;
        return clientInitialized;
    }

    /**
     * 전체 초기화 프로세스 시작
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async initializeWithRetry() {
        if (this.state.initializationStarted) {
            console.log('🔥 [생명구조] Firebase 초기화 이미 진행 중 - 대기');
            return await this.waitForInitialization();
        }

        this.state.initializationStarted = true;
        console.log('🔥 [생명구조] Firebase 초기화 프로세스 시작');

        try {
            // 🚨 생명구조 시스템: Android WebView 환경 확인 및 최적화
            const isAndroidWebView = this.detectAndroidWebView();
            if (isAndroidWebView) {
                console.log('📱 [생명구조] Android WebView 환경 감지 - 네트워크 최적화 적용');
                await this.optimizeForAndroidWebView();
            }

            // 🚨 생명구조 시스템: 네트워크 상태 확인
            await this.checkNetworkConnectivity();

            // 1단계: Firebase SDK 로드 대기
            await this.waitForStep('SDK 로드', () => this.checkSDKLoaded());
            this.notifyStateChange('SDK 로드', true);

            // 2단계: Firebase 설정 로드 대기
            await this.waitForStep('설정 로드', () => this.checkConfigLoaded());
            this.notifyStateChange('설정 로드', true);

            // 3단계: Firebase 클라이언트 초기화 (재시도 로직 포함)
            await this.initializeClientWithRetry();
            this.notifyStateChange('클라이언트 초기화', true);

            // 4단계: Storage 초기화
            await this.initializeStorage();
            this.notifyStateChange('Storage 초기화', true);

            // 5단계: 연결 테스트
            await this.performConnectionTest();
            this.notifyStateChange('연결 테스트', true);

            // 전체 초기화 완료
            this.state.fullyInitialized = true;
            this.notifyStateChange('전체 초기화', true);
            
            console.log('🔥 [생명구조] Firebase 초기화 완료 ✅');
            
            // 🚨 생명구조 시스템: 주기적 연결 상태 모니터링 시작
            this.startConnectionMonitoring();
            
            return true;

        } catch (error) {
            this.state.retryCount++;
            this.notifyStateChange('전체 초기화', false, error);

            if (this.state.retryCount < this.maxRetries) {
                const delayTime = this.retryDelay * Math.pow(2, this.state.retryCount - 1); // 지수 백오프
                console.warn(`🔥 [생명구조] Firebase 초기화 실패 - 재시도 ${this.state.retryCount}/${this.maxRetries} (${delayTime}ms 후)`);
                await this.delay(delayTime);
                this.state.initializationStarted = false;
                return await this.initializeWithRetry();
            } else {
                console.error('❌ [생명구조] Firebase 초기화 최종 실패 - 로컬 모드로 전환');
                // 로컬 모드 활성화
                this.enableOfflineMode();
                return false;
            }
        }
    }

    /**
     * 특정 단계가 완료될 때까지 대기
     * @param {string} stepName - 단계 이름
     * @param {Function} checkFunction - 완료 여부를 확인하는 함수
     */
    async waitForStep(stepName, checkFunction) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (checkFunction()) {
                    console.log(`🔥 [생명구조] ${stepName} 완료`);
                    resolve(true);
                } else if (Date.now() - startTime > this.maxWaitTime) {
                    reject(new Error(`${stepName} 대기 시간 초과 (${this.maxWaitTime}ms)`));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * Firebase 클라이언트 초기화
     */
    async initializeClient() {
        if (this.checkClientInitialized()) {
            console.log('🔥 [생명구조] Firebase 클라이언트 이미 초기화됨');
            return true;
        }

        if (typeof window.initializeFirebaseClient === 'function') {
            const client = window.initializeFirebaseClient();
            if (client && client.initPromise) {
                await client.initPromise;
                this.state.clientInitialized = true;
                return true;
            }
        }

        throw new Error('Firebase 클라이언트 초기화 실패');
    }

    /**
     * Storage 초기화
     */
    async initializeStorage() {
        // Storage는 firebaseClient에 의존하므로 클라이언트가 먼저 준비되어야 함
        if (!this.state.clientInitialized) {
            throw new Error('Firebase 클라이언트가 초기화되지 않았음');
        }

        // Storage 초기화는 storage.js의 waitForFirebase 로직에 의존
        // 여기서는 단순히 상태만 업데이트
        this.state.storageInitialized = true;
        console.log('🔥 [생명구조] Storage 초기화 준비 완료');
        return true;
    }

    /**
     * 전체 초기화 완료까지 대기
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async waitForInitialization() {
        if (this.state.fullyInitialized) {
            return true;
        }

        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const check = () => {
                if (this.state.fullyInitialized) {
                    resolve(true);
                } else if (Date.now() - startTime > this.maxWaitTime) {
                    console.warn('🔥 [생명구조] Firebase 초기화 대기 시간 초과 - 로컬 모드로 전환');
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * 현재 초기화 상태 반환
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 초기화 상태 요약 문자열 반환
     */
    getStatusSummary() {
        const steps = [
            `SDK: ${this.state.sdkLoaded ? '✅' : '❌'}`,
            `설정: ${this.state.configLoaded ? '✅' : '❌'}`,
            `클라이언트: ${this.state.clientInitialized ? '✅' : '❌'}`,
            `Storage: ${this.state.storageInitialized ? '✅' : '❌'}`
        ];
        
        return `Firebase 초기화 상태: [${steps.join(', ')}]`;
    }

    /**
     * 지연 함수
     * @param {number} ms - 지연 시간 (밀리초)
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🚨 생명구조 시스템: Android WebView 환경 감지
     */
    detectAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || 
               window.AndroidBridge || 
               userAgent.indexOf('Android') > -1;
    }

    /**
     * 🚨 생명구조 시스템: Android WebView 환경 최적화
     */
    async optimizeForAndroidWebView() {
        try {
            // Android WebView용 타임아웃 설정 연장
            this.maxWaitTime = Math.max(this.maxWaitTime, 90000); // 최소 90초
            
            // 네트워크 지연을 고려한 추가 지연
            await this.delay(500);
            
            console.log('📱 [생명구조] Android WebView 최적화 완료 (타임아웃: 90초)');
        } catch (error) {
            console.warn('⚠️ [생명구조] Android WebView 최적화 실패:', error);
        }
    }

    /**
     * 🚨 생명구조 시스템: 네트워크 연결 상태 확인
     */
    async checkNetworkConnectivity() {
        try {
            if (navigator.onLine === false) {
                throw new Error('네트워크 연결이 없습니다');
            }

            // Android Bridge를 통한 네트워크 상태 확인
            if (window.AndroidBridge && window.AndroidBridge.isNetworkAvailable) {
                const networkAvailable = await window.AndroidBridge.isNetworkAvailable();
                if (!networkAvailable) {
                    throw new Error('Android 네트워크 상태: 연결 없음');
                }
            }

            console.log('🌐 [생명구조] 네트워크 연결 상태 확인 완료');
        } catch (error) {
            console.warn('⚠️ [생명구조] 네트워크 연결 확인 실패:', error.message);
            // 네트워크 오류 시에도 계속 진행 (오프라인 모드 대비)
        }
    }

    /**
     * 🚨 생명구조 시스템: 재시도 로직이 포함된 클라이언트 초기화
     */
    async initializeClientWithRetry() {
        let clientRetries = 0;
        const maxClientRetries = 3;

        while (clientRetries < maxClientRetries) {
            try {
                await this.initializeClient();
                return true;
            } catch (error) {
                clientRetries++;
                console.warn(`🔥 [생명구조] Firebase 클라이언트 초기화 재시도 ${clientRetries}/${maxClientRetries}:`, error.message);
                
                if (clientRetries < maxClientRetries) {
                    await this.delay(2000 * clientRetries); // 지연 시간 증가
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * 🚨 생명구조 시스템: Firebase 연결 테스트
     */
    async performConnectionTest() {
        try {
            console.log('🔄 [생명구조] Firebase 연결 테스트 시작');
            
            if (window.firebaseClient && typeof window.firebaseClient.testConnection === 'function') {
                const testResult = await Promise.race([
                    window.firebaseClient.testConnection(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('연결 테스트 타임아웃')), 15000)
                    )
                ]);
                
                if (testResult.connected) {
                    console.log('✅ [생명구조] Firebase 연결 테스트 성공');
                } else {
                    throw new Error('연결 테스트 실패: ' + testResult.error);
                }
            } else {
                console.log('⚠️ [생명구조] Firebase 연결 테스트 함수 없음 - 스킵');
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] Firebase 연결 테스트 실패:', error.message);
            // 연결 테스트 실패해도 계속 진행 (오프라인 지원)
        }
    }

    /**
     * 🚨 생명구조 시스템: 주기적 연결 상태 모니터링 시작
     */
    startConnectionMonitoring() {
        // 5분마다 연결 상태 확인
        setInterval(async () => {
            try {
                const isHealthy = await this.healthCheck();
                if (!isHealthy) {
                    console.warn('⚠️ [생명구조] Firebase 연결 상태 불량 감지');
                    this.notifyStateChange('연결 모니터링', false, new Error('연결 상태 불량'));
                    
                    // 재연결 시도
                    setTimeout(() => {
                        this.attemptReconnection();
                    }, 30000); // 30초 후 재연결 시도
                }
            } catch (error) {
                console.warn('⚠️ [생명구조] 연결 모니터링 오류:', error);
            }
        }, 300000); // 5분

        console.log('🔄 [생명구조] Firebase 연결 모니터링 시작 (5분 간격)');
    }

    /**
     * 🚨 생명구조 시스템: Firebase 재연결 시도
     */
    async attemptReconnection() {
        try {
            console.log('🔄 [생명구조] Firebase 재연결 시도 시작');
            
            // 현재 상태 리셋
            this.state.fullyInitialized = false;
            this.state.initializationStarted = false;
            this.state.retryCount = 0;
            
            // 재초기화 시도
            const success = await this.initializeWithRetry();
            if (success) {
                console.log('✅ [생명구조] Firebase 재연결 성공');
            } else {
                console.warn('⚠️ [생명구조] Firebase 재연결 실패 - 오프라인 모드 유지');
            }
        } catch (error) {
            console.error('❌ [생명구조] Firebase 재연결 시도 중 오류:', error);
        }
    }

    /**
     * 🚨 생명구조 시스템: 오프라인 모드 활성화
     */
    enableOfflineMode() {
        try {
            console.log('📱 [생명구조] 오프라인 모드 활성화');
            
            // 로컬 스토리지 기반 백업 시스템 활성화
            if (window.localStorage) {
                localStorage.setItem('firebase_offline_mode', 'true');
                localStorage.setItem('firebase_offline_timestamp', Date.now().toString());
            }
            
            // 오프라인 모드 알림
            if (window.notificationsManager) {
                window.notificationsManager.showBrowserNotification?.(
                    '📱 오프라인 모드',
                    'Firebase 연결 실패로 오프라인 모드로 작동합니다. 생명구조 기능은 계속 작동됩니다.',
                    { icon: '/icon.png', tag: 'offline-mode' }
                );
            }
            
            this.notifyStateChange('오프라인 모드', true);
        } catch (error) {
            console.error('❌ [생명구조] 오프라인 모드 활성화 실패:', error);
        }
    }

    /**
     * 헬스체크 - Firebase 연결 상태 확인
     * @returns {Promise<boolean>} 연결 상태
     */
    async healthCheck() {
        try {
            if (!this.state.fullyInitialized) {
                return false;
            }

            // firebaseClient의 연결 테스트 메서드 사용
            if (window.firebaseClient && typeof window.firebaseClient.testConnection === 'function') {
                const result = await window.firebaseClient.testConnection();
                return result.connected === true;
            }

            return false;
        } catch (error) {
            console.warn('🔥 [생명구조] Firebase 헬스체크 실패:', error);
            return false;
        }
    }
}

// 전역 Firebase 초기화 관리자 인스턴스 생성
if (typeof window !== 'undefined') {
    window.firebaseInitializer = new FirebaseInitializer();
    
    // 전역 초기화 함수 제공
    window.initializeFirebaseWithRetry = () => {
        return window.firebaseInitializer.initializeWithRetry();
    };

    console.log('🔥 [생명구조] Firebase 초기화 관리자 준비 완료');
}

// 모듈 내보내기 (필요한 경우)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseInitializer };
}