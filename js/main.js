// 🚨 생명구조 시스템: JavaScript 파싱 오류 방지 시스템
(function() {
    'use strict';
    
    // 🛡️ 전역 오류 핸들러 - SyntaxError: Unexpected end of input 방지
    window.onerror = function(message, source, lineno, colno, error) {
        const errorInfo = {
            message: message,
            source: source,
            line: lineno,
            column: colno,
            error: error
        };
        
        console.log('🚨 [생명구조] JavaScript 오류 감지:', errorInfo);
        
        // Unexpected end of input 오류 특별 처리
        if (message && (message.includes('Unexpected end of input') || message.includes('Script error') || message.includes('SyntaxError'))) {
            console.error('🚨 [생명구조] JavaScript 파싱 오류 감지 - 강화된 안전 모드로 전환');
            console.error('📍 오류 위치:', source, 'Line:', lineno);
            
            // 🚨 생명구조 시스템: Android WebView 환경에서 스크립트 복구 시도
            if (source && source.includes('.js')) {
                console.log('🔄 [생명구조] 손상된 스크립트 복구 시도:', source);
                
                // 지연 시간을 늘려서 WebView 환경 안정화
                setTimeout(() => {
                    try {
                        // 기존 스크립트 태그 제거
                        const existingScripts = document.querySelectorAll(`script[src*="${source.split('/').pop()}"]`);
                        existingScripts.forEach(script => {
                            if (script.parentNode) {
                                script.parentNode.removeChild(script);
                            }
                        });
                        
                        // 새로운 스크립트 태그 생성 (캐시 무효화 + 무결성 검증)
                        const script = document.createElement('script');
                        script.src = source + '?reload=' + Date.now() + '&fix=syntax';
                        script.async = false; // 순서 보장을 위해 동기 로드
                        script.setAttribute('data-syntax-fix', 'true');
                        
                        script.onload = () => {
                            console.log('✅ [생명구조] 스크립트 복구 성공:', source);
                            
                            // 로드 후 JavaScript 무결성 검증
                            setTimeout(() => {
                                try {
                                    eval('1+1'); // 기본 JS 실행 테스트
                                    console.log('✅ [생명구조] JavaScript 실행 환경 정상');
                                } catch (testError) {
                                    console.error('🚨 [생명구조] JavaScript 실행 환경 이상:', testError);
                                    // 페이지 재로드로 최종 복구 시도
                                    setTimeout(() => {
                                        console.log('🔄 [생명구조] 전체 시스템 재시작');
                                        window.location.reload(true);
                                    }, 2000);
                                }
                            }, 500);
                        };
                        
                        script.onerror = () => {
                            console.warn('⚠️ [생명구조] 스크립트 복구 실패:', source);
                            
                            // 복구 실패 시 안전 모드로 전환
                            setTimeout(() => {
                                console.log('🔄 [생명구조] 안전 모드로 시스템 재시작');
                                window.location.reload(true);
                            }, 3000);
                        };
                        
                        document.head.appendChild(script);
                        
                    } catch (reloadError) {
                        console.error('❌ [생명구조] 스크립트 복구 시도 중 오류:', reloadError);
                        
                        // 복구 시도 실패 시 전체 재로드
                        setTimeout(() => {
                            console.log('🔄 [생명구조] 시스템 전체 재시작 - 최종 복구 시도');
                            window.location.reload(true);
                        }, 5000);
                    }
                }, 2000); // Android WebView 안정화를 위해 2초 지연
            }
            
            return true; // 오류 처리됨을 표시
        }
        
        // 다른 오류들 로깅
        if (message && !message.includes('ResizeObserver loop limit exceeded')) {
            console.warn('⚠️ [생명구조] 일반 JavaScript 오류:', message);
        }
        
        return false; // 기본 오류 처리 계속
    };
    
    // 🛡️ Promise 거부 오류 핸들러
    window.addEventListener('unhandledrejection', function(event) {
        console.warn('🚨 [생명구조] Promise 거부 오류:', event.reason);
        
        // 생명구조 시스템 관련 Promise 오류는 특별 처리
        if (event.reason && (
            event.reason.message?.includes('battery') ||
            event.reason.message?.includes('kakao') ||
            event.reason.message?.includes('firebase')
        )) {
            console.error('🚨 [생명구조] 중요 시스템 Promise 오류:', event.reason);
            
            // 시스템 재초기화 시도
            setTimeout(() => {
                if (window.location && window.location.reload) {
                    console.log('🔄 [생명구조] 중요 시스템 오류로 인한 재초기화 시도');
                    // 부드러운 재로드 (사용자 데이터 보존)
                    window.location.reload(false);
                }
            }, 3000);
        }
        
        // 오류가 처리되었음을 표시하여 콘솔 스팸 방지
        event.preventDefault();
    });
    
    // 🛡️ DOM 로드 오류 방지
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ [생명구조] DOM 로드 완료 - JavaScript 안전성 검증 시작');
        
        // 중요 전역 객체들 존재 확인
        const criticalObjects = ['console', 'window', 'document'];
        criticalObjects.forEach(obj => {
            if (typeof window[obj] === 'undefined') {
                console.error(`🚨 [생명구조] 중요 객체 누락: ${obj}`);
            }
        });
    });
    
    // 🛡️ 스크립트 로딩 안전성 강화 함수
    window.safeLoadScript = function(src, callback, errorCallback) {
        console.log(`🔄 [생명구조] 안전한 스크립트 로드: ${src}`);
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        let loadTimeout = setTimeout(() => {
            console.warn(`⚠️ [생명구조] 스크립트 로드 타임아웃: ${src}`);
            if (errorCallback) errorCallback(new Error('Load timeout'));
        }, 10000); // 10초 타임아웃
        
        script.onload = function() {
            clearTimeout(loadTimeout);
            console.log(`✅ [생명구조] 스크립트 로드 완료: ${src}`);
            
            // 로드 완료 후 스크립트 무결성 검증
            setTimeout(() => {
                try {
                    // 기본적인 JavaScript 실행 테스트
                    eval('1+1');
                    if (callback) callback();
                } catch (testError) {
                    console.error(`🚨 [생명구조] 스크립트 무결성 검증 실패: ${src}`, testError);
                    if (errorCallback) errorCallback(testError);
                }
            }, 100);
        };
        
        script.onerror = function(error) {
            clearTimeout(loadTimeout);
            console.error(`❌ [생명구조] 스크립트 로드 실패: ${src}`, error);
            if (errorCallback) errorCallback(error);
        };
        
        document.head.appendChild(script);
        return script;
    };
    
    console.log('🛡️ [생명구조] JavaScript 파싱 오류 방지 시스템 활성화 완료');
})();

// 🚨 생명구조 시스템: Android WebView 환경 최적화 시스템
(function() {
    'use strict';
    
    // Android WebView 환경 감지
    function isAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || 
               window.AndroidBridge || 
               userAgent.indexOf('Android') > -1;
    }
    
    if (isAndroidWebView()) {
        console.log('📱 [생명구조] Android WebView 환경 감지 - 최적화 시스템 활성화');
        
        // 🛡️ 메모리 관리 최적화
        const memoryOptimizer = {
            intervals: new Set(),
            timeouts: new Set(),
            eventListeners: new Map(),
            
            // 안전한 setInterval 래퍼
            setInterval: function(callback, delay) {
                const id = setInterval(callback, delay);
                this.intervals.add(id);
                return id;
            },
            
            // 안전한 setTimeout 래퍼
            setTimeout: function(callback, delay) {
                const id = setTimeout(() => {
                    this.timeouts.delete(id);
                    callback();
                }, delay);
                this.timeouts.add(id);
                return id;
            },
            
            // 안전한 이벤트 리스너 래퍼
            addEventListener: function(element, event, handler, options) {
                if (!this.eventListeners.has(element)) {
                    this.eventListeners.set(element, new Map());
                }
                this.eventListeners.get(element).set(event, handler);
                element.addEventListener(event, handler, options);
            },
            
            // 메모리 정리
            cleanup: function() {
                // 모든 interval 정리
                this.intervals.forEach(id => clearInterval(id));
                this.intervals.clear();
                
                // 모든 timeout 정리
                this.timeouts.forEach(id => clearTimeout(id));
                this.timeouts.clear();
                
                // 이벤트 리스너 정리
                this.eventListeners.forEach((events, element) => {
                    events.forEach((handler, event) => {
                        try {
                            element.removeEventListener(event, handler);
                        } catch (e) {
                            console.warn('이벤트 리스너 제거 실패:', e);
                        }
                    });
                });
                this.eventListeners.clear();
                
                console.log('🧹 [생명구조] 메모리 정리 완료');
            }
        };
        
        // 전역 메모리 최적화 도구 등록
        window.memoryOptimizer = memoryOptimizer;
        
        // 🛡️ DOM 조작 최적화
        const domOptimizer = {
            // 배치 DOM 업데이트
            batchDOMUpdates: function(updates) {
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        const fragment = document.createDocumentFragment();
                        updates.forEach(update => {
                            if (typeof update === 'function') {
                                update(fragment);
                            }
                        });
                        resolve(fragment);
                    });
                });
            },
            
            // 안전한 DOM 조작
            safeQuerySelector: function(selector) {
                try {
                    return document.querySelector(selector);
                } catch (e) {
                    console.warn('querySelector 실패:', selector, e);
                    return null;
                }
            },
            
            // 안전한 DOM 다중 선택
            safeQuerySelectorAll: function(selector) {
                try {
                    return document.querySelectorAll(selector);
                } catch (e) {
                    console.warn('querySelectorAll 실패:', selector, e);
                    return [];
                }
            }
        };
        
        window.domOptimizer = domOptimizer;
        
        // 🛡️ 네트워크 요청 최적화
        const networkOptimizer = {
            requestQueue: [],
            maxConcurrentRequests: 3,
            activeRequests: 0,
            
            // 안전한 fetch 래퍼
            safeFetch: async function(url, options = {}) {
                return new Promise((resolve, reject) => {
                    const request = { url, options, resolve, reject };
                    this.requestQueue.push(request);
                    this.processQueue();
                });
            },
            
            processQueue: function() {
                if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
                    return;
                }
                
                const request = this.requestQueue.shift();
                this.activeRequests++;
                
                const timeoutId = setTimeout(() => {
                    this.activeRequests--;
                    request.reject(new Error('네트워크 요청 타임아웃'));
                    this.processQueue();
                }, 30000); // 30초 타임아웃
                
                fetch(request.url, {
                    ...request.options,
                    signal: AbortSignal.timeout?.(25000) // 25초 자동 중단
                })
                .then(response => {
                    clearTimeout(timeoutId);
                    this.activeRequests--;
                    request.resolve(response);
                    this.processQueue();
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    this.activeRequests--;
                    request.reject(error);
                    this.processQueue();
                });
            }
        };
        
        window.networkOptimizer = networkOptimizer;
        
        // 🛡️ 성능 모니터링
        const performanceMonitor = {
            metrics: {},
            
            start: function(label) {
                this.metrics[label] = { start: performance.now() };
            },
            
            end: function(label) {
                if (this.metrics[label]) {
                    this.metrics[label].end = performance.now();
                    this.metrics[label].duration = this.metrics[label].end - this.metrics[label].start;
                    
                    if (this.metrics[label].duration > 1000) {
                        console.warn(`⚠️ [성능] ${label}: ${this.metrics[label].duration.toFixed(2)}ms (느림)`);
                    }
                }
            },
            
            report: function() {
                console.log('📊 [성능] 측정 결과:', this.metrics);
            }
        };
        
        window.performanceMonitor = performanceMonitor;
        
        // 🛡️ 앱 생명주기 최적화
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                console.log('📱 [생명구조] 앱 백그라운드 진입 - 리소스 절약 모드');
                
                // 불필요한 애니메이션 중단
                document.body.style.setProperty('--animation-play-state', 'paused');
                
                // 배터리 최적화 시스템에 알림
                if (window.batteryOptimizationSystem) {
                    window.batteryOptimizationSystem.enterBackgroundMode?.();
                }
            } else {
                console.log('📱 [생명구조] 앱 포그라운드 복귀 - 정상 모드');
                
                // 애니메이션 재개
                document.body.style.removeProperty('--animation-play-state');
                
                // 배터리 최적화 시스템에 알림
                if (window.batteryOptimizationSystem) {
                    window.batteryOptimizationSystem.exitBackgroundMode?.();
                }
            }
        });
        
        // 🛡️ 메모리 압박 상황 대응
        if ('memory' in performance) {
            memoryOptimizer.setInterval(() => {
                const memInfo = performance.memory;
                const usedRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                
                if (usedRatio > 0.8) {
                    console.warn('⚠️ [메모리] 메모리 사용량 높음:', Math.round(usedRatio * 100) + '%');
                    
                    // 강제 가비지 컬렉션 (Chrome에서만 지원)
                    if (window.gc) {
                        window.gc();
                    }
                    
                    // 불필요한 캐시 정리
                    if (window.caches) {
                        window.caches.keys().then(names => {
                            names.forEach(name => {
                                if (name.includes('temp') || name.includes('cache')) {
                                    window.caches.delete(name);
                                }
                            });
                        });
                    }
                }
            }, 60000); // 1분마다 체크
        }
        
        // 🛡️ 앱 종료 시 정리
        window.addEventListener('beforeunload', function() {
            console.log('📱 [생명구조] 앱 종료 감지 - 리소스 정리');
            memoryOptimizer.cleanup();
        });
        
        // 🛡️ 오류 복구 시스템
        window.addEventListener('error', function(event) {
            if (event.message && event.message.includes('out of memory')) {
                console.error('🚨 [메모리] 메모리 부족 감지 - 긴급 정리');
                memoryOptimizer.cleanup();
                
                // 중요하지 않은 기능 일시 중단
                if (window.backgroundTaskManager) {
                    window.backgroundTaskManager.pauseAll?.();
                }
            }
        });
        
        console.log('✅ [생명구조] Android WebView 최적화 시스템 활성화 완료');
    }
})();

// 전역 변수 선언 (kakaoAuth는 다른 파일에서 이미 선언됨)

class AppManager {
    constructor() {
        this.currentPage = 'friends';
        this.heartbeatInterval = null;
        this.statusCheckInterval = null;
        this.isDataLoaded = false; // 중복 로드 방지 플래그
        
        // 페이지별 캐시 관리 (중복 로드 방지)
        this.statusLastLoadTime = 0;
        this.friendsLastLoadTime = 0;
        this.adsLastLoadTime = 0;
        this.profileLastLoadTime = 0;
        
        // 로드 상태 추적
        this.pageLoadStates = {
            friends: false,
            status: false,
            ads: false,
            notifications: false,
            profile: false
        };
        
        // 이벤트 설정 중복 방지 플래그들
        this.adEventsSetup = false;
        this.profileEventsSetup = false;
        
        console.log('🏗️ AppManager 생성 - 중복 로드 및 이벤트 방지 시스템 활성화');
    }

    // 앱 초기화 - 2024.09.24 생명구조 시스템 auth 초기화 타이밍 수정
    async init() {
        try {
            console.log('🏗️ 앱 초기화 시작');
            
            // 🚨 생명구조 시스템: 먼저 필수 컴포넌트들 초기화
            // 저장소 초기화 대기
            await this.waitForStorage();

            // 카카오 인증 초기화
            kakaoAuth = window.kakaoAuthStandalone;

            // 인증 매니저 초기화 (auth 객체 사용 전에 반드시 완료)
            auth = new AuthManager(storage);
            window.auth = auth; // LifeSaverMasterInitializer가 체크할 수 있도록 전역 할당
            await auth.init();
            
            console.log('✅ 인증 시스템 초기화 완료');
            
            // 이제 auth 객체를 안전하게 사용 가능
            const savedUser = localStorage.getItem('currentUser');
            const currentUser = auth?.currentUser;
            let finalIsLoggedIn = false;
            
            // auth 객체 초기화 후 로그인 상태 검증
            if (currentUser && savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData && userData.id && userData.name && currentUser.id === userData.id) {
                        finalIsLoggedIn = true;
                    }
                } catch (error) {
                    console.error('❌ 저장된 사용자 정보 파싱 오류:', error);
                    localStorage.removeItem('currentUser');
                }
            }
            
            console.log('📋 로그인 상태 검증 결과:');
            console.log('  - localStorage 사용자 정보:', savedUser ? '있음' : '없음');
            console.log('  - auth.currentUser:', currentUser ? '있음' : '없음');  
            console.log('  - 최종 로그인 상태:', finalIsLoggedIn);

            // auth.init() 후에 로그인 상태 재확인 (사용자 생성 등이 발생할 수 있음)
            const updatedUser = storage.getCurrentUser();
            if (updatedUser && updatedUser.id && updatedUser.name) {
                finalIsLoggedIn = true;
                console.log('🔄 auth.init() 후 로그인 상태 재확인:', finalIsLoggedIn);
            }

            // 네비게이션 이벤트 설정
            this.setupNavigation();

            // 프로필 설정 이벤트 설정
            this.setupProfileEvents();
            
            // 움직임 감지 테스트 버튼 이벤트 설정
            this.setupMotionTestEvents();

            // 광고 배너 이벤트 설정
            this.setupAdEvents();

            // 알림 설정 이벤트 설정
            this.setupNotificationEvents();

            // 로그인 상태에 따른 분기 처리
            if (finalIsLoggedIn) {
                console.log('✅ 로그인 상태 확인됨 - 메인 앱 초기화 진행');
                
                // 기본 heartbeat 시스템 비활성화 (중복 방지)
                // this.startHeartbeat(); // 중복 모션 데이터 생성 방지를 위해 비활성화
                this.startStatusCheck();
                
                // 향상된 움직임 감지 시스템 초기화 (메인 시스템)
                if (window.initEnhancedMotionDetector) {
                    console.log('🎯 향상된 모션 감지 시스템 초기화 (단일 시스템)');
                    await window.initEnhancedMotionDetector();
                } else {
                    console.warn('⚠️ 향상된 모션 감지 시스템을 찾을 수 없음 - 기본 시스템 사용');
                    this.startHeartbeat();
                }
                
                // 친구 상태 모니터링 시스템 초기화
                if (window.friendStatusMonitor) {
                    await window.friendStatusMonitor.init();
                }
                
                // 초대코드 매니저 초기화
                if (window.initializeInviteCodeManager) {
                    await window.initializeInviteCodeManager();
                }
                
                // 실시간 시간 업데이트 시스템 시작
                if (window.realTimeStatusManager) {
                    console.log('🕐 실시간 시간 업데이트 시스템 시작');
                    window.realTimeStatusManager.startGlobalTimeUpdate();
                } else {
                    console.warn('⚠️ RealTimeStatusManager를 찾을 수 없음');
                }
                
                // 🚨 광고 배너 시스템 초기화를 광고 페이지에서만 수행 (전역 오염 방지)
                console.log('📢 광고 배너 시스템은 광고 페이지에서만 초기화됩니다 (UI 보호)');
                
                // 긴급상황 대응 시스템 초기화
                if (window.emergencyResponseSystem) {
                    console.log('🚨 긴급상황 대응 시스템 초기화');
                    const emergencyInit = await window.emergencyResponseSystem.init();
                    if (emergencyInit) {
                        console.log('✅ 긴급상황 대응 시스템 초기화 완료');
                    } else {
                        console.warn('⚠️ 긴급상황 대응 시스템 초기화 실패');
                    }
                } else {
                    console.warn('⚠️ EmergencyResponseSystem을 찾을 수 없음');
                }
            } else {
                console.log('❌ 로그인 상태 확인 안됨 - 로그인 페이지로 이동');
                this.showAuthScreen();
                return; // 로그인되지 않았으면 여기서 초기화 중단
            }

            // 온라인/오프라인 상태 감지
            this.setupOnlineStatusDetection();
            
            // Android 네이티브 카카오 로그인 핸들러 등록
            this.setupNativeKakaoHandler();
            
            // 자동 로그인은 이미 위에서 처리됨
                
            // FCM 토큰 매니저 초기화 (백그라운드 푸시 알림)
            if (window.initFCMTokenManager) {
                await window.initFCMTokenManager();
            }
            
            // 향상된 모션 감지 시스템은 이미 위에서 초기화됨 (중복 방지)
            // if (window.initEnhancedMotionDetector) {
            //     await window.initEnhancedMotionDetector(); // 중복 초기화 방지를 위해 비활성화
            // }
            console.log('🔄 모션 감지 시스템 중복 초기화 방지됨');
            
            console.log('앱 초기화 완료');

        } catch (error) {
            console.error('앱 초기화 실패:', error);
            this.showError('앱 초기화에 실패했습니다.');
        }
        
        // 스플래시 스크린 숨기기 (2초 후)
        setTimeout(async () => {
                this.hideSplashScreen();
                
                // 로그인 상태 정확히 재확인
                const currentUser = auth?.getCurrentUser();
                const savedUser = localStorage.getItem('currentUser');
                let finalIsLoggedIn = false;
                
                // 더 엄격한 로그인 상태 확인
                if (currentUser && savedUser) {
                    try {
                        const userData = JSON.parse(savedUser);
                        if (userData && userData.id && userData.name && currentUser.id === userData.id) {
                            finalIsLoggedIn = true;
                        }
                    } catch (error) {
                        console.error('사용자 데이터 검증 실패:', error);
                        localStorage.removeItem('currentUser');
                    }
                }
                
                console.log('🔍 스플래시 후 최종 로그인 상태 재확인:', finalIsLoggedIn);
                console.log('📊 상태 세부사항:', { 
                    currentUser: !!currentUser, 
                    savedUser: !!savedUser,
                    initialIsLoggedIn: isLoggedIn,
                    finalIsLoggedIn: finalIsLoggedIn
                });
                
                if (finalIsLoggedIn) {
                    console.log('✅ 로그인 상태 확인됨 - 데이터 로드 시작');
                    
                    // 초기 데이터 로드만 하고, 페이지 이동은 하지 않음
                    await this.loadInitialData();
                    
                    // 현재 활성화된 페이지가 없으면 친구 관리로 기본 이동
                    const activePage = document.querySelector('.page.active');
                    if (!activePage) {
                        console.log('📍 활성 페이지가 없어서 기본 페이지(친구 관리)로 이동');
                        this.navigateToPage('friends');
                    }
                } else {
                    console.warn('⚠️ 로그인 상태 아님 - 메인 앱 컴포넌트 초기화 안함');
                    // 로그아웃 상태에서는 로그인 화면으로 강제 이동
                    this.showAuthScreen();
                }
            }, 2000);
    }

    // 저장소 준비 대기 (Firebase 버전)
    async waitForStorage() {
        let attempts = 0;
        const maxAttempts = 50;
        
        // Firebase Storage Manager가 초기화될 때까지 대기
        while (!window.firebaseStorage || !window.firebaseStorage.isInitialized) {
            if (attempts >= maxAttempts) {
                console.warn('⚠️ Firebase Storage 초기화가 완료되지 않았지만 계속 진행합니다.');
                break; // 타임아웃 시 에러 대신 경고 후 계속 진행
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Firebase 클라이언트가 준비될 때까지 추가 대기
        if (window.firebaseClient) {
            try {
                await window.firebaseClient.waitForInit();
                console.log('🔥 Firebase 저장소 초기화 완료');
            } catch (error) {
                console.warn('⚠️ Firebase 클라이언트 초기화 실패했지만 계속 진행:', error);
            }
        }
    }

    // 네비게이션 이벤트 설정
    setupNavigation() {
        console.log('🚨 생명구조 우선 - 네비게이션 이벤트 설정 시작');
        
        const navButtons = document.querySelectorAll('.nav-item');
        console.log(`📋 발견된 네비게이션 버튼 수: ${navButtons.length}`);
        
        navButtons.forEach((button, index) => {
            const buttonId = button.id;
            const pageId = buttonId.replace('nav-', '');
            console.log(`🔘 네비게이션 ${index + 1}: ${buttonId} → ${pageId}`);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // currentTarget을 사용하여 버튼 자체의 ID를 가져옴
                const clickedButtonId = e.currentTarget.id || button.id;
                const targetPageId = clickedButtonId.replace('nav-', '');
                
                console.log(`🔄 네비게이션 클릭됨: ${clickedButtonId} → ${targetPageId}`);
                
                if (targetPageId) {
                    // 🚨 광고 페이지 특별 처리
                    if (targetPageId === 'ads') {
                        console.log('🎯 광고 페이지로 이동 - 특별 처리 시작');
                        this.navigateToPage(targetPageId);
                        
                        // 추가 보장: 광고 페이지 강제 표시
                        setTimeout(() => {
                            const adsPage = document.getElementById('ads-page');
                            if (adsPage) {
                                adsPage.style.display = 'block';
                                adsPage.style.visibility = 'visible';
                                adsPage.style.opacity = '1';
                                console.log('🚨 광고 페이지 추가 보장 완료');
                            }
                        }, 100);
                    } else {
                        this.navigateToPage(targetPageId);
                    }
                }
            });
            
            console.log(`✅ 네비게이션 이벤트 설정 완료: ${buttonId}`);
        });
        
        console.log('✅ 네비게이션 이벤트 설정 전체 완료');
        
        // 🚨 생명구조 긴급 디버그: 광고 페이지 강제 표시 함수 추가
        window.forceShowAdsPage = () => {
            console.log('🚨 긴급 디버그: 광고 페이지 강제 표시 시작');
            
            // 모든 페이지 숨김
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
                page.style.display = 'none';
            });
            
            // 광고 페이지만 표시
            const adsPage = document.getElementById('ads-page');
            if (adsPage) {
                adsPage.classList.remove('hidden');
                adsPage.classList.add('active');
                adsPage.style.display = 'block';
                adsPage.style.visibility = 'visible';
                adsPage.style.opacity = '1';
                adsPage.style.position = 'relative';
                adsPage.style.zIndex = '10';
                
                // 네비게이션 업데이트
                document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
                const adsNavBtn = document.getElementById('nav-ads');
                if (adsNavBtn) adsNavBtn.classList.add('active');
                
                console.log('✅ 광고 페이지 강제 표시 완료');
                
                // 광고 데이터 로드
                if (this.loadAdsPage) {
                    this.loadAdsPage();
                }
            } else {
                console.error('❌ ads-page 엘리먼트를 찾을 수 없음!');
            }
        };
        
        console.log('🆘 긴급 디버그 함수 준비 완료: window.forceShowAdsPage()');
        
        // 🚨 생명구조 디버깅 - Firebase 광고 데이터 강제 새로고침 함수
        const self = this;
        window.forceReloadAds = async () => {
            console.log('🚨 긴급 디버깅: Firebase 광고 데이터 강제 새로고침 시작');
            try {
                // localStorage 초기화
                localStorage.removeItem('lonelycare_ads');
                localStorage.removeItem('lonelycare_ads_last_update');
                console.log('🧹 localStorage 광고 데이터 삭제 완료');
                
                // Firebase에서 새로 로드
                if (window.appManager && window.appManager.loadRealAdsData) {
                    await window.appManager.loadRealAdsData();
                    console.log('✅ Firebase 광고 데이터 강제 새로고침 완료');
                } else if (self.loadRealAdsData) {
                    await self.loadRealAdsData();
                    console.log('✅ Firebase 광고 데이터 강제 새로고침 완료');
                } else {
                    console.error('❌ loadRealAdsData 함수를 찾을 수 없음');
                }
            } catch (error) {
                console.error('❌ Firebase 광고 데이터 강제 새로고침 실패:', error);
            }
        };
        
        console.log('🆘 추가 디버그 함수 준비 완료: window.forceReloadAds()');
    }
    
    // 🎯 카테고리명 변환 헬퍼 함수
    getCategoryName(tabType) {
        const categoryNames = {
            'insurance': '🛡️ 보험',
            'funeral': '🌸 상조', 
            'lawyer': '⚖️ 변호사'
        };
        return categoryNames[tabType] || '📢 광고';
    }

    // 🚨 생명구조 우선 - 페이지 이동 (완전 개선)
    navigateToPage(pageId) {
        console.log(`🔄 페이지 이동 시작: ${pageId}`);
        
        // 모든 네비게이션 버튼 비활성화
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });

        // 🚨 생명구조 우선 - 모든 페이지 강제 숨김 (!important 적용)
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
            // CSS의 !important를 오버라이드하기 위해 setProperty 사용
            page.style.setProperty('display', 'none', 'important');
            page.style.setProperty('visibility', 'hidden', 'important');
        });

        // 선택된 네비게이션 버튼 활성화
        const navButton = document.getElementById(`nav-${pageId}`);
        if (navButton) {
            navButton.classList.add('active');
            console.log(`✅ 네비게이션 버튼 활성화: nav-${pageId}`);
        } else {
            console.error(`❌ 네비게이션 버튼 찾기 실패: nav-${pageId}`);
        }

        // 선택된 페이지 강제 표시 (안전한 방법)
        // 🚨 생명구조 우선 - 대상 페이지 강제 표시 (!important 적용)
        const targetPage = document.getElementById(`${pageId}-page`);
        console.log(`🔍 페이지 요소 검색: ${pageId}-page →`, targetPage ? '발견' : '없음');
        
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('active');
            // CSS의 !important를 오버라이드하기 위해 setProperty 사용 + z-index 보장
            targetPage.style.setProperty('display', 'block', 'important');
            targetPage.style.setProperty('visibility', 'visible', 'important');
            targetPage.style.setProperty('opacity', '1', 'important');
            targetPage.style.setProperty('z-index', '999', 'important');
            targetPage.style.setProperty('position', 'relative', 'important');
            // 디버깅: 실제 적용된 스타일 확인
            const computedStyle = window.getComputedStyle(targetPage);
            console.log(`✅ 페이지 표시 완료 (!important 적용): ${pageId}-page`);
            console.log(`🔍 실제 적용된 스타일:`, {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                zIndex: computedStyle.zIndex,
                position: computedStyle.position
            });
        } else {
            console.error(`❌ 대상 페이지 찾기 실패: ${pageId}-page`);
            // 모든 가능한 페이지 ID 시도
            const alternativePage = document.getElementById(pageId);
            if (alternativePage) {
                alternativePage.classList.remove('hidden');
                alternativePage.classList.add('active');
                // 대체 페이지도 !important 적용 + z-index 보장
                alternativePage.style.setProperty('display', 'block', 'important');
                alternativePage.style.setProperty('visibility', 'visible', 'important');
                alternativePage.style.setProperty('opacity', '1', 'important');
                alternativePage.style.setProperty('z-index', '999', 'important');
                alternativePage.style.setProperty('position', 'relative', 'important');
                console.log(`✅ 대체 페이지 표시 완료 (!important 적용): ${pageId}`);
            }
        }

        this.currentPage = pageId;

        // 중복 로드 제거: initializePage에서 통합 처리
        console.log(`🔄 페이지 이동: ${pageId} - 단일 로드 시작`);
        
        // 🚨 이전 페이지가 광고 페이지였다면 AdBannerComponent 정리
        if (this.currentPage === 'ads' && pageId !== 'ads') {
            this.cleanupAdBannerComponent();
        }
        
        // 실시간 시간 관리자 페이지 전환 알림 (상태 페이지용)
        if (pageId === 'status' && window.realTimeStatusManager) {
            window.realTimeStatusManager.refreshOnPageChange();
        }
        
        // 중복 제거: 단일 초기화만 실행
        this.initializePage(pageId);
    }

    // 페이지별 초기화 (중복 로드 제거 및 최적화)
    async initializePage(pageId) {
        try {
            console.log(`📋 페이지 초기화 시작: ${pageId}`);
            
            switch (pageId) {
                case 'friends':
                    await this.loadFriendsPageOptimized();
                    break;
                case 'status':
                    await this.loadStatusPageOptimized();
                    break;
                case 'ads':
                    await this.loadAdsPage();
                    break;
                case 'notifications':
                    await this.loadNotificationSettings();
                    break;
                case 'profile':
                    await this.loadProfileData();
                    // DOM이 완전히 렌더링된 후 이벤트 설정
                    setTimeout(() => {
                        this.setupProfileEvents(); 
                    }, 100);
                    break;
            }
            
            console.log(`✅ 페이지 초기화 완료: ${pageId}`);
        } catch (error) {
            console.error(`❌ 페이지 초기화 실패 (${pageId}):`, error);
        }
    }

    // 최적화된 친구 페이지 로드 (중복 제거)
    async loadFriendsPageOptimized() {
        console.log('👥 친구 관리 페이지 - 최적화된 로드 시작');
        
        // inviteCodeManager 우선 사용 (더 안정적)
        if (window.inviteCodeManager) {
            console.log('✅ inviteCodeManager를 사용하여 친구 데이터 로드');
            await inviteCodeManager.loadCurrentFriends();
            await inviteCodeManager.loadMyInviteCode();
        } else if (window.friendsManager) {
            console.log('✅ friendsManager를 사용하여 친구 데이터 로드');
            await friendsManager.loadFriends();
        } else {
            console.warn('⚠️ 친구 관리자를 찾을 수 없음 - 대기 후 재시도');
            
            // 최대 3초 대기
            let attempts = 0;
            while (!window.inviteCodeManager && !window.friendsManager && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.inviteCodeManager) {
                await inviteCodeManager.loadCurrentFriends();
                await inviteCodeManager.loadMyInviteCode();
            } else if (window.friendsManager) {
                await friendsManager.loadFriends();
            } else {
                console.error('❌ 친구 관리자 초기화 실패');
            }
        }
    }

    // 기존 친구 페이지 로드 (호환성 유지)
    async loadFriendsPage() {
        return this.loadFriendsPageOptimized();
    }

    // 🔥 사용자 프로필 정보 로드 (신규 기능)
    async loadUserProfile() {
        try {
            console.log('👤 사용자 프로필 정보 로드 시작');
            
            // DOM 요소 확인
            const profileImage = document.getElementById('user-profile-image');
            const displayName = document.getElementById('user-display-name');
            const displayEmail = document.getElementById('user-display-email');
            
            if (!profileImage || !displayName || !displayEmail) {
                console.warn('⚠️ 프로필 DOM 요소를 찾을 수 없음');
                return;
            }
            
            // 현재 사용자 정보 가져오기
            let currentUser = null;
            let kakaoUserInfo = null;
            
            // 1. storage에서 사용자 정보 가져오기
            if (storage && typeof storage.getCurrentUser === 'function') {
                currentUser = storage.getCurrentUser();
                console.log('📋 Storage 사용자 정보:', currentUser ? '있음' : '없음');
            }
            
            // 2. 카카오에서 사용자 정보 가져오기
            if (kakaoAuth && typeof kakaoAuth.getCurrentUser === 'function') {
                try {
                    kakaoUserInfo = await kakaoAuth.getCurrentUser();
                    console.log('🥥 카카오 사용자 정보:', kakaoUserInfo ? '있음' : '없음');
                } catch (error) {
                    console.warn('⚠️ 카카오 사용자 정보 가져오기 실패:', error);
                }
            }
            
            // 3. 사용자 정보 우선순위 결정
            const userInfo = currentUser || kakaoUserInfo || {};
            
            // 4. 프로필 이미지 설정
            let profileImageUrl = '';
            if (kakaoUserInfo && kakaoUserInfo.properties && kakaoUserInfo.properties.profile_image) {
                profileImageUrl = kakaoUserInfo.properties.profile_image;
                console.log('🖼️ 카카오 프로필 이미지 사용');
            } else if (userInfo.profileImageUrl) {
                profileImageUrl = userInfo.profileImageUrl;
                console.log('🖼️ 저장된 프로필 이미지 사용');
            } else {
                // 기본 아바타 이미지 (이미 HTML에 설정되어 있음)
                console.log('🖼️ 기본 아바타 이미지 사용');
            }
            
            // 5. 사용자 이름 설정
            let userName = '';
            if (kakaoUserInfo && kakaoUserInfo.properties && kakaoUserInfo.properties.nickname) {
                userName = kakaoUserInfo.properties.nickname;
            } else if (userInfo.name) {
                userName = userInfo.name;
            } else if (userInfo.displayName) {
                userName = userInfo.displayName;
            } else {
                userName = '사용자';
            }
            
            // 6. 이메일 설정
            let userEmail = '';
            if (kakaoUserInfo && kakaoUserInfo.kakao_account && kakaoUserInfo.kakao_account.email) {
                userEmail = kakaoUserInfo.kakao_account.email;
            } else if (userInfo.email) {
                userEmail = userInfo.email;
            } else {
                userEmail = 'user@lonely-care.com';
            }
            
            // 7. DOM 업데이트
            if (profileImageUrl) {
                profileImage.src = profileImageUrl;
                profileImage.onerror = function() {
                    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='30' fill='%2374c0fc'/%3E%3Ctext x='30' y='38' text-anchor='middle' font-size='24' fill='white'%3E👤%3C/text%3E%3C/svg%3E";
                };
            }
            
            displayName.textContent = userName;
            displayEmail.textContent = userEmail;
            
            console.log('✅ 사용자 프로필 정보 로드 완료:', { userName, userEmail, hasImage: !!profileImageUrl });
            
        } catch (error) {
            console.error('❌ 사용자 프로필 로드 실패:', error);
            
            // 오류 발생 시 기본값 설정
            const profileImage = document.getElementById('user-profile-image');
            const displayName = document.getElementById('user-display-name');
            const displayEmail = document.getElementById('user-display-email');
            
            if (displayName) displayName.textContent = '사용자';
            if (displayEmail) displayEmail.textContent = 'user@lonely-care.com';
            if (profileImage) {
                profileImage.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='30' fill='%2374c0fc'/%3E%3Ctext x='30' y='38' text-anchor='middle' font-size='24' fill='white'%3E👤%3C/text%3E%3C/svg%3E";
            }
        }
    }

    // 최적화된 상태 페이지 로드 (중복 제거 + 캐싱)
    async loadStatusPageOptimized() {
        console.log('📊 친구 상태 페이지 - 최적화된 로드 시작');
        
        try {
            // 중복 로드 방지: 이미 로드되었고 최근 데이터면 스킵
            const lastLoadTime = this.statusLastLoadTime || 0;
            const now = Date.now();
            const cacheValidTime = 2 * 60 * 1000; // 2분
            
            if (now - lastLoadTime < cacheValidTime && this.isDataLoaded) {
                console.log('📊 캐시된 상태 데이터 사용 (2분 이내)');
                return;
            }
            
            // 🚨 실제 존재하는 friendStatusChecker 사용 (생명 구조 시스템)
            if (window.friendStatusChecker) {
                console.log('✅ friendStatusChecker를 사용하여 친구 상태 로드');
                
                try {
                    // friendStatusChecker의 친구 상태 확인 및 표시
                    await this.loadFriendsStatusWithChecker();
                    this.statusLastLoadTime = now;
                    this.isDataLoaded = true;
                    console.log('✅ friendStatusChecker 상태 로드 완료');
                } catch (error) {
                    console.error('❌ friendStatusChecker 로드 실패:', error);
                    await this.loadFriendsStatusFallback();
                }
                
            } else {
                console.warn('⚠️ friendStatusChecker를 찾을 수 없음 - 백업 로드 시도');
                await this.loadFriendsStatusFallback();
            }
        } catch (error) {
            console.error('❌ 친구 상태 페이지 로드 실패:', error);
        }
    }

    // 🚨 친구 상태 로드 (friendStatusChecker 사용)
    async loadFriendsStatusWithChecker() {
        try {
            console.log('📊 friendStatusChecker로 친구 상태 로드 시작');
            
            // 현재 사용자 확인
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                console.log('❌ 로그인된 사용자가 없습니다');
                this.showNoFriendsMessage();
                return;
            }
            
            // friendStatusChecker를 사용하여 친구 상태 가져오기
            console.log('🔍 friendStatusChecker.getFriendsWithStatus 호출 중... 사용자 ID:', currentUser.kakao_id);
            const friends = await window.friendStatusChecker.getFriendsWithStatus(currentUser.kakao_id);
            console.log('📊 friendStatusChecker 결과:', { friends: friends, length: friends?.length || 0 });
            
            if (!friends || friends.length === 0) {
                console.log('📭 친구가 없습니다 - showNoFriendsMessage 호출');
                this.showNoFriendsMessage();
                return;
            }
            
            console.log('✅ 친구 데이터 로드 성공:', friends.length, '명');
            
            // 알림 임계값 조회
            const thresholds = await window.notificationThresholdManager?.getNotificationThresholds() || {
                warning_minutes: 1440,   // 24시간
                danger_minutes: 2880,    // 48시간  
                emergency_minutes: 4320  // 72시간
            };
            
            // 각 친구의 상태 계산 및 UI 표시
            const friendsWithStatus = [];
            
            for (const friend of friends) {
                const alertLevel = window.alertLevelManager?.calculateAlertLevel(
                    friend.last_activity, 
                    thresholds
                ) || 'normal';
                
                const timeText = window.realTimeStatusManager?.formatTimeDifference(friend.last_activity) || '알 수 없음';
                
                friendsWithStatus.push({
                    ...friend,
                    alert_level: alertLevel,
                    time_text: timeText
                });
            }
            
            // UI에 친구 상태 표시
            console.log('📊 displayFriendsStatus 호출 중... 친구 수:', friendsWithStatus.length);
            console.log('📊 친구별 상태:', friendsWithStatus.map(f => ({ name: f.name, alert_level: f.alert_level })));
            this.displayFriendsStatus(friendsWithStatus, thresholds);
            
            // 🚨 생명구조 중요: 친구 상태 페이지 방문 시 알림 체크 실행
            if (window.friendStatusChecker && window.friendStatusChecker.checkAndSendNotifications) {
                console.log('🔔 친구 상태 페이지 - 알림 체크 실행');
                try {
                    await window.friendStatusChecker.checkAndSendNotifications();
                    console.log('✅ 친구 상태 알림 체크 완료');
                } catch (error) {
                    console.error('❌ 친구 상태 알림 체크 실패:', error);
                }
            }
            
            console.log('✅ 친구 상태 로드 및 표시 완료:', friendsWithStatus.length, '명');
            
        } catch (error) {
            console.error('❌ friendStatusChecker 친구 상태 로드 실패:', error);
            throw error;
        }
    }
    
    // 친구 상태 UI 표시
    displayFriendsStatus(friends, thresholds) {
        const friendsStatusContainer = document.getElementById('friends-status');
        if (!friendsStatusContainer) {
            console.warn('⚠️ friends-status 컨테이너를 찾을 수 없음');
            return;
        }
        
        // 상태별 분류
        const statusCounts = { all: 0, normal: 0, warning: 0, danger: 0, emergency: 0 };
        const statusGroups = { normal: [], warning: [], danger: [], emergency: [] };
        
        friends.forEach(friend => {
            statusCounts.all++;
            statusCounts[friend.alert_level]++;
            statusGroups[friend.alert_level].push(friend);
        });
        
        console.log('📊 계산된 상태 카운트:', statusCounts);
        
        // 상태별 카운트 업데이트
        this.updateStatusCounts(statusCounts);
        console.log('📊 UI 카운트 업데이트 완료');
        
        // 친구 상태 HTML 생성
        const friendsHTML = friends.map(friend => {
            // 🚨 생명구조 시스템: 디버깅을 위한 친구 데이터 로그
            console.log('🔍 [디버그] 친구 데이터:', {
                name: friend.name,
                phone: friend.phone,
                phoneNumber: friend.phoneNumber,
                emergency_contact1: friend.emergency_contact1,
                emergency_contact2: friend.emergency_contact2,
                email: friend.email
            });
            
            const levelInfo = window.alertLevelManager?.getAlertLevelInfo(friend.alert_level) || {
                color: '#28a745',
                icon: '🟢',
                text: '정상'
            };
            
            return `
                <div class="friend-status-card ${friend.alert_level}" data-status="${friend.alert_level}">
                    <div class="friend-status-header">
                        <div class="friend-name">${friend.name}</div>
                        <div class="friend-alert-badge" style="color: ${levelInfo.color};">
                            ${levelInfo.icon} ${levelInfo.text}
                        </div>
                    </div>
                    <div class="friend-status-info">
                        <div class="friend-email">✉️ ${friend.email || '이메일 없음'}</div>
                        <div class="friend-time" data-timestamp="${friend.last_activity || ''}" data-realtime-update="true">
                            ${friend.time_text}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 🚨 생명구조 시스템: HTML 렌더링 확인
        console.log('🔍 [HTML 렌더링] 친구 상태 HTML 생성 완료:', {
            '친구 수': friends.length,
            'HTML 길이': friendsHTML.length,
            '컨테이너 존재': !!friendsStatusContainer,
            'HTML 미리보기': friendsHTML.substring(0, 200) + '...'
        });

        friendsStatusContainer.innerHTML = friendsHTML;
        
        // 🚨 생명구조 시스템: 렌더링 후 확인
        console.log('🔍 [HTML 렌더링] 렌더링 후 확인:', {
            '컨테이너 innerHTML 길이': friendsStatusContainer.innerHTML.length,
            'friend-phone 요소 수': friendsStatusContainer.querySelectorAll('.friend-phone').length,
            'friend-phone 요소들': Array.from(friendsStatusContainer.querySelectorAll('.friend-phone')).map(el => ({
                textContent: el.textContent,
                classList: Array.from(el.classList),
                style: el.style.cssText
            }))
        });
        
        // 상태 필터 이벤트 설정
        this.setupStatusFilters();
    }
    
    // 상태별 카운트 업데이트
    updateStatusCounts(counts) {
        Object.keys(counts).forEach(status => {
            const countElement = document.getElementById(`count-${status}`);
            if (countElement) {
                countElement.textContent = counts[status];
            }
        });
    }
    
    // 상태 필터 이벤트 설정
    setupStatusFilters() {
        const statusTabs = document.querySelectorAll('.status-tab');
        statusTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetStatus = e.target.getAttribute('data-status');
                this.filterFriendsByStatus(targetStatus);
                
                // 활성 탭 변경
                statusTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    // 상태별 친구 필터링
    filterFriendsByStatus(status) {
        const friendCards = document.querySelectorAll('.friend-status-card');
        friendCards.forEach(card => {
            if (status === 'all' || card.getAttribute('data-status') === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // 친구 없음 메시지 표시
    showNoFriendsMessage() {
        const friendsStatusContainer = document.getElementById('friends-status');
        if (friendsStatusContainer) {
            friendsStatusContainer.innerHTML = `
                <p style="text-align: center; color: #999; padding: 40px;">
                    등록된 친구가 없습니다.<br>
                    친구 관리에서 친구를 추가해주세요.
                </p>
            `;
        }
        
        // 🚨 상태 카운트를 0으로 초기화 (중요!)
        const statusCounts = { all: 0, normal: 0, warning: 0, danger: 0, emergency: 0 };
        this.updateStatusCounts(statusCounts);
        console.log('📊 친구가 없어서 모든 상태 카운트를 0으로 초기화');
    }
    
    // 백업 친구 상태 로드 (기본 방식)
    async loadFriendsStatusFallback() {
        console.log('🔄 백업 방식으로 친구 상태 로드');
        this.showNoFriendsMessage();
    }

    // 기존 상태 페이지 로드 (호환성 유지)
    async loadStatusPage() {
        return this.loadStatusPageOptimized();
    }

    // 광고 페이지 로드 (간소화된 즉시 실행 버전)
    async loadAdsPage() {
        console.log('🚨 생명구조 우선 - 광고 페이지 완전 로드 시작');
        
        // 🎯 1단계: 광고 페이지 강제 표시 확인
        const adsPage = document.getElementById('ads-page');
        if (adsPage) {
            adsPage.classList.remove('hidden');
            adsPage.classList.add('active');
            adsPage.style.display = 'block';
            adsPage.style.visibility = 'visible';
            adsPage.style.opacity = '1';
            console.log('✅ 광고 페이지 DOM 강제 표시 완료');
        } else {
            console.error('❌ ads-page 엘리먼트를 찾을 수 없음!');
        }
        
        // 🎯 2단계: 광고 컨텐츠 영역 강제 표시
        const adContent = document.getElementById('ad-content');
        if (adContent) {
            adContent.style.display = 'block';
            adContent.style.visibility = 'visible';
            adContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #666; background: white; border-radius: 8px; margin: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📢</div>
                    <div style="font-size: 18px; margin-bottom: 10px; font-weight: 600; color: #333;">광고 배너 로딩 중...</div>
                    <div style="font-size: 14px; color: #999;">잠시만 기다려주세요</div>
                </div>
            `;
            console.log('✅ 광고 컨텐츠 영역 즉시 표시 완료');
        } else {
            console.error('❌ ad-content 엘리먼트를 찾을 수 없음!');
        }
        
        // 🎯 3단계: 광고 탭 버튼 활성화 (중복 호출 방지)
        // setupAdEvents는 init에서 이미 호출됨 - 중복 제거
        
        // 🎯 4단계: 실제 광고 데이터 로드 시도
        setTimeout(async () => {
            try {
                await this.loadRealAdsData();
                console.log('✅ 실제 광고 데이터 로드 완료');
            } catch (error) {
                console.warn('⚠️ 실제 광고 데이터 로드 실패, 기본 메시지 표시:', error);
                if (adContent) {
                    adContent.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; color: #666; background: white; border-radius: 8px; margin: 20px 0;">
                            <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;">📭</div>
                            <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500; color: #333;">등록된 광고가 없습니다</div>
                            <div style="font-size: 14px; color: #999;">관리자 페이지에서 광고를 추가해주세요</div>
                        </div>
                    `;
                }
            }
        }, 100);
    }
    
    // 🚨 사용자 친화적 광고 상태 표시 (시스템 정보 제거)
    async showAdBannerStatus() {
        const adContent = document.getElementById('ad-content');
        if (!adContent) return;
        
        try {
            // 실제 광고 데이터 확인
            const hasActiveAds = window.adBannerManager && 
                                window.adBannerManager.activeAds && 
                                window.adBannerManager.activeAds.size > 0;
            
            // Firebase에서 실제 광고 데이터 확인
            const adsFromFirebase = await this.checkFirebaseAds();
            const hasFirebaseAds = adsFromFirebase && adsFromFirebase.length > 0;
            
            console.log('📊 광고 상태 확인:', { hasActiveAds, hasFirebaseAds, activeCount: window.adBannerManager?.activeAds?.size || 0 });
            
            if (hasActiveAds || hasFirebaseAds) {
                // 광고가 있으면 광고 표시 영역만 제공
                console.log('✅ 광고가 있어서 광고 표시 영역 준비');
                adContent.innerHTML = `
                    <div id="ads-display-area" style="width: 100%; min-height: 200px;">
                        <!-- 여기에 실제 광고들이 표시됩니다 -->
                    </div>
                `;
                
                // 실제 광고 표시 시도
                if (window.adBannerManager && typeof window.adBannerManager.displayInitialAds === 'function') {
                    await window.adBannerManager.displayInitialAds();
                }
            } else {
                // 광고가 없으면 간단한 메시지 표시
                console.log('📭 광고가 없어서 안내 메시지 표시');
                adContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;">📢</div>
                        <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500;">등록된 광고가 없습니다</div>
                        <div style="font-size: 14px; color: #999;">관리자 페이지에서 광고를 추가해주세요</div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('❌ 광고 상태 확인 실패:', error);
            // 오류 시 기본 메시지 표시
            adContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;">📢</div>
                    <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500;">등록된 광고가 없습니다</div>
                    <div style="font-size: 14px; color: #999;">관리자 페이지에서 광고를 추가해주세요</div>
                </div>
            `;
        }
    }
    
    // Firebase에서 광고 데이터 확인
    async checkFirebaseAds() {
        try {
            if (!window.firebaseClient || !window.firebaseClient.isInitialized) {
                console.log('📭 Firebase 클라이언트가 초기화되지 않음');
                return [];
            }
            
            const adsResult = await window.firebaseClient.queryDocuments('ads', [
                ['is_active', '==', true]
            ]);
            
            if (adsResult.error) {
                console.warn('⚠️ Firebase 광고 조회 실패:', adsResult.error);
                return [];
            }
            
            const ads = adsResult.data || [];
            console.log('📊 Firebase 광고 확인:', ads.length, '개');
            return ads;
            
        } catch (error) {
            console.warn('⚠️ Firebase 광고 확인 중 오류:', error);
            return [];
        }
    }
    
    // 🚨 AdBannerComponent 정리 (광고 페이지 벗어날 때)
    cleanupAdBannerComponent() {
        try {
            console.log('🔄 AdBannerComponent 정리 시작');
            
            // 실제 AdBannerComponent 인스턴스가 있다면 정리
            if (window.adBannerComponent && 
                !window.adBannerComponent.isDummy && 
                typeof window.adBannerComponent.destroy === 'function') {
                
                console.log('🗑️ 실제 AdBannerComponent 인스턴스 정리 중...');
                window.adBannerComponent.destroy();
            }
            
            // 더미 객체로 교체 (오류 방지용)
            window.adBannerComponent = {
                closeAd: function(adId) {
                    console.log('📢 closeAd 호출됨, 하지만 광고 페이지가 아니므로 무시:', adId);
                },
                init: function() {
                    console.log('📢 더미 AdBannerComponent init 호출됨 - 광고 페이지에서만 실제 초기화됨');
                    return Promise.resolve();
                },
                displayInitialAds: function() {
                    console.log('📢 더미 AdBannerComponent displayInitialAds 호출됨 - 광고 페이지가 아님');
                    return Promise.resolve();
                },
                destroy: function() {
                    console.log('📢 더미 AdBannerComponent destroy 호출됨');
                    return Promise.resolve();
                },
                isInitialized: false,
                isDummy: true
            };
            
            console.log('✅ AdBannerComponent 정리 완료 - 더미 객체로 교체');
            
        } catch (error) {
            console.warn('⚠️ AdBannerComponent 정리 실패:', error);
        }
    }
    
    // 백업: 기존 광고 페이지 로드 방식
    async loadAdsPageFallback() {
        console.log('🔄 백업 방식으로 광고 페이지 로드');
        
        // 실제 광고 데이터 로드
        await this.loadRealAdsData();
        
        // 데이터 로드 후 광고가 없으면 기본 메시지 표시
        if (!this.realAdsData || this.realAdsData.length === 0) {
            const adContent = document.getElementById('ad-content');
            if (adContent) {
                adContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;">📢</div>
                        <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500;">등록된 광고가 없습니다</div>
                        <div style="font-size: 14px; color: #999;">관리자 페이지에서 광고를 추가해주세요</div>
                    </div>
                `;
                return;
            }
        }
        
        // 탭 이벤트 설정 (중복 방지 - setupAdEvents에서 처리)
        // setupAdTabs는 setupAdEvents와 중복되므로 제거
    }

    // 광고 탭 이벤트 설정
    setupAdTabs() {
        const tabs = document.querySelectorAll('#ads-page .tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.target.getAttribute('data-tab');
                if (tabType) {
                    this.showAdTab(tabType);
                }
            });
        });
    }

    // 광고 탭 표시 (실시간 데이터 체크 포함)
    showAdTab(tabType) {
        console.log(`🚨 생명구조 우선 - 광고 탭 전환: ${tabType}`);
        
        // 🎯 1단계: 광고 컨텐츠 영역 강제 표시
        const adContent = document.getElementById('ad-content');
        if (!adContent) {
            console.error('❌ ad-content 엘리먼트를 찾을 수 없음 - DOM 구조 문제');
            return;
        }
        
        // 강제 표시 보장
        adContent.style.display = 'block';
        adContent.style.visibility = 'visible';
        adContent.style.opacity = '1';
        
        // 🎯 2단계: 탭 UI 업데이트 (CSS 클래스 사용)
        document.querySelectorAll('.tab').forEach(tab => {
            // 기존 활성화 클래스들 제거
            tab.classList.remove('active', 'tab-active-basic', 'tab-active-insurance', 'tab-active-funeral', 'tab-active-lawyer');
            // 비활성화 클래스 적용
            tab.classList.add('tab-inactive');
        });

        const targetTab = document.querySelector(`[data-tab="${tabType}"]`);
        if (targetTab) {
            // 비활성화 클래스 제거
            targetTab.classList.remove('tab-inactive');
            targetTab.classList.add('active');
            
            // 카테고리별 활성화 스타일 적용
            switch(tabType) {
                case 'insurance':
                    targetTab.classList.add('tab-active-insurance');
                    break;
                case 'funeral':
                    targetTab.classList.add('tab-active-funeral');
                    break;
                case 'lawyer':
                    targetTab.classList.add('tab-active-lawyer');
                    break;
                default:
                    targetTab.classList.add('tab-active-basic');
            }
            
            console.log(`✅ 탭 활성화 완료 (CSS 클래스 사용): ${tabType}`);
        } else {
            console.warn('⚠️ 탭을 찾을 수 없음:', `[data-tab="${tabType}"]`);
        }
        
        // 🎯 3단계: 광고 데이터 가져오기 (실패해도 기본값 사용)
        let ads = [];
        try {
            // 최신 데이터 체크 시도
            this.refreshAdsData();
            ads = this.getAdsForType(tabType);
            console.log(`📊 ${tabType} 탭 광고 개수:`, ads.length);
        } catch (error) {
            console.warn('⚠️ 광고 데이터 가져오기 실패:', error);
            ads = [];
        }
        
        // 🚨 생명구조 보장: 데이터가 없어도 최소한의 UI 표시
        if (ads.length === 0) {
            console.log(`🎯 ${tabType} 탭: 기본 광고 또는 안내 메시지 표시`);
            adContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #666; background: white; border: 1px solid #eee; border-radius: 8px; margin: 10px 0;">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.8;">📢</div>
                    <div style="font-size: 18px; margin-bottom: 8px; font-weight: 600; color: #333;">${this.getCategoryName(tabType)} 광고</div>
                    <div style="font-size: 14px; color: #999; margin-bottom: 20px;">현재 등록된 광고가 없습니다</div>
                    <div style="font-size: 13px; color: #aaa;">관리자 페이지에서 광고를 추가할 수 있습니다</div>
                </div>
            `;
            return;
        }
        
        // 🎯 일반적인 광고 배너 형태로 표시 (관리자 페이지와 동일한 구조)
        adContent.innerHTML = ads.map(ad => {
            // 카테고리별 아이콘 설정
            let categoryIcon = '🛡️';
            if (tabType === 'insurance') {
                categoryIcon = '🛡️';
            } else if (tabType === 'funeral') {
                categoryIcon = '🌸';
            } else if (tabType === 'lawyer') {
                categoryIcon = '⚖️';
            }
            
            // 카테고리별 색상 설정 (노인 친화적 파스텔톤)
            let borderColor = '#4a9eff';  // 기본 파란색
            let backgroundColor = '#f0f8ff';  // 연한 하늘색 배경
            
            if (tabType === 'insurance') {
                borderColor = '#4a9eff';  // 보험: 신뢰감 있는 파란색
                backgroundColor = '#f0f8ff';  // 연한 하늘색
            } else if (tabType === 'funeral') {
                borderColor = '#d074c0';  // 상조: 부드러운 보라색
                backgroundColor = '#fdf0fa';  // 연한 보라색
            } else if (tabType === 'lawyer') {
                borderColor = '#74c074';  // 변호사: 안정감 있는 초록색
                backgroundColor = '#f0fdf0';  // 연한 초록색
            }
            
            return `
                <div class="ad-item" data-url="${ad.url || ad.link}" style="
                    background: ${backgroundColor};
                    border: 3px solid ${borderColor};
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">${categoryIcon}</span>
                        <h4 style="margin: 0; color: #222; font-size: 20px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${ad.title}</h4>
                    </div>
                    <p style="color: #555; margin: 12px 0; line-height: 1.6; font-size: 16px; font-weight: 500;">${ad.content || ad.description}</p>
                    ${ad.url && ad.url !== '#' ? `
                        <p style="margin: 12px 0; font-size: 15px; color: #0066cc; font-weight: 600;">
                            <strong>👉 클릭하여 자세히 보기</strong>
                        </p>
                    ` : ''}
                    ${ad.button_text ? `
                        <button style="
                            margin-top: 16px;
                            padding: 12px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            color: white;
                            background: ${borderColor};
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                            transition: all 0.3s ease;
                        ">${ad.button_text}</button>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // 🎯 광고 배너 클릭 이벤트 추가 (중복 방지 개선)
        setTimeout(() => {
            // 기존 이벤트 리스너가 있는 요소들 제거 후 재생성하여 중복 방지
            document.querySelectorAll('.ad-item').forEach(banner => {
                // 클론으로 기존 이벤트 리스너 완전 제거
                const newBanner = banner.cloneNode(true);
                banner.parentNode.replaceChild(newBanner, banner);
            });
            
            // 새로운 요소들에 이벤트 리스너 등록
            document.querySelectorAll('.ad-item').forEach(banner => {
                // 마우스 호버 효과 추가 (노인 친화적)
                banner.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-4px)';
                    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                    this.style.filter = 'brightness(1.05)';
                });
                
                banner.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    this.style.filter = 'brightness(1)';
                });
                
                // 클릭 이벤트 (단일 등록 보장)
                banner.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation(); // 이벤트 버블링 방지
                    
                    const url = this.getAttribute('data-url');
                    console.log('🔗 광고 배너 클릭, URL:', url);
                    
                    if (url && url !== '#' && url !== 'null' && url !== 'undefined' && url.trim() !== '') {
                        try {
                            console.log('🚀 URL 열기 시도:', url);
                            window.open(url, '_blank');
                        } catch (error) {
                            console.error('❌ URL 열기 실패:', error);
                            alert('링크를 열 수 없습니다. 네트워크 상태를 확인해주세요.');
                        }
                    } else {
                        console.warn('⚠️ 유효하지 않은 URL:', url);
                        alert('광고 링크가 설정되지 않았습니다.');
                    }
                }, { once: false }); // once: false로 명시적 설정
                
                // 호버 효과 추가
                banner.addEventListener('mouseenter', function() {
                    this.style.borderColor = '#74c0fc';
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                });
                
                banner.addEventListener('mouseleave', function() {
                    this.style.borderColor = '#e0e0e0';
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                });
                
                // 버튼 hover 효과 추가
                const button = banner.querySelector('button');
                if (button) {
                    button.addEventListener('mouseenter', function() {
                        this.style.transform = 'scale(1.05)';
                        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                        this.style.filter = 'brightness(1.1)';
                    });
                    
                    button.addEventListener('mouseleave', function() {
                        this.style.transform = 'scale(1)';
                        this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                        this.style.filter = 'brightness(1)';
                    });
                    
                    // 버튼 클릭 이벤트 (부모의 클릭 이벤트와 별도)
                    button.addEventListener('click', function(e) {
                        e.stopPropagation();
                    });
                }
            });
            
            console.log('✅ 광고 아이템 이벤트 리스너 등록 완료 (중복 방지)');
        }, 200);
    }

    // 🚨 생명구조 우선 - Firebase adBanners 컬렉션 직접 로드
    async loadRealAdsData() {
        try {
            console.log('🚨 생명구조 우선 - Firebase 광고 데이터 로드 시작');
            
            // 🎯 1차 우선: Firebase adBanners 컬렉션에서 직접 읽기
            const firebaseAds = await this.loadFirebaseAdsData();
            if (firebaseAds && firebaseAds.length > 0) {
                this.realAdsData = firebaseAds;
                console.log('✅ Firebase 광고 데이터 로드 성공:', firebaseAds.length, '개');
                
                // 카테고리별 개수 확인
                const categoryCounts = {
                    insurance: firebaseAds.filter(ad => ad.category === 'insurance').length,
                    funeral: firebaseAds.filter(ad => ad.category === 'funeral').length,
                    lawyer: firebaseAds.filter(ad => ad.category === 'lawyer').length
                };
                console.log('📊 Firebase 카테고리별 광고 개수:', categoryCounts);
                
                // 기본 탭 표시
                this.showAdTab('insurance');
                return;
            }
            
            // 🎯 2차 백업: 로컬스토리지에서 관리자가 저장한 광고 데이터 읽기
            console.log('⚠️ Firebase 데이터 없음 - 로컬스토리지 확인 중...');
            const storedAds = localStorage.getItem('lonelycare_ads');
            
            if (storedAds && storedAds !== 'null' && storedAds !== '[]') {
                try {
                    const ads = JSON.parse(storedAds);
                    if (ads && ads.length > 0) {
                        // 클라이언트 사이드에서 priority 기준 정렬
                        ads.sort((a, b) => (b.priority || 0) - (a.priority || 0));
                        
                        console.log('✅ 로컬스토리지 광고 데이터 로드 성공:', ads.length, '개');
                        this.realAdsData = ads;
                        this.showAdTab('insurance');
                        return;
                    }
                } catch (parseError) {
                    console.error('❌ 로컬스토리지 광고 데이터 파싱 실패:', parseError);
                }
            }
            
            // 🎯 3차 최종: 기본 광고 사용
            console.log('⚠️ 모든 데이터 소스 없음 - 기본 광고 사용');
            this.realAdsData = this.getDefaultAds();
            console.log('✅ 기본 광고 데이터 로드 완료:', this.realAdsData.length, '개');
            this.showAdTab('insurance');
            
        } catch (err) {
            console.error('❌ 광고 데이터 로드 최종 실패:', err);
            // 최종 백업: 기본 광고 사용
            this.realAdsData = this.getDefaultAds();
            console.log('🛡️ 최종 fallback으로 기본 광고 사용');
            this.showAdTab('insurance');
        }
    }
    
    // 🔥 Firebase adBanners 컬렉션 직접 읽기
    async loadFirebaseAdsData() {
        try {
            console.log('🔥 Firebase adBanners 컬렉션 조회 시작...');
            
            // Firebase 연결 확인
            if (!window.firebaseDb) {
                console.warn('⚠️ Firebase DB 연결 없음');
                return null;
            }
            
            // 🚨 생명구조 우선 - adBanners 컬렉션 전체 조회 (복합 인덱스 문제 방지)
            const snapshot = await window.firebaseDb
                .collection('adBanners')
                .get();
            
            if (snapshot.empty) {
                console.warn('⚠️ Firebase adBanners 컬렉션이 비어있음');
                return null;
            }
            
            // Firebase 데이터를 앱 형식으로 변환 + 클라이언트 사이드 필터링
            const allAds = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log('📋 Firebase 광고 데이터:', data);
                
                // URL 프로토콜 자동 추가 처리
                let processedUrl = data.url || '#';
                if (processedUrl && processedUrl !== '#' && !processedUrl.startsWith('http')) {
                    processedUrl = 'https://' + processedUrl;
                }
                
                return {
                    id: doc.id,
                    title: data.title || '',
                    description: data.description || '',
                    content: data.description || data.content || '',
                    url: processedUrl,
                    link: processedUrl,
                    button_text: data.buttonText || data.button_text || '자세히보기',
                    buttonText: data.buttonText || data.button_text || '자세히보기',
                    category: data.category || 'insurance',
                    banner_type: data.bannerType || data.banner_type || 'info',
                    bannerType: data.bannerType || data.banner_type || 'info',
                    priority: data.priority || 0,
                    is_active: data.isActive !== undefined ? data.isActive : true,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    target_audience: data.targetAudience || data.target_audience || 'all',
                    targetAudience: data.targetAudience || data.target_audience || 'all',
                    color_scheme: data.colorScheme || data.color_scheme || null,
                    colorScheme: data.colorScheme || data.color_scheme || null,
                    created_at: data.createdAt || data.created_at || new Date(),
                    updated_at: data.updatedAt || data.updated_at || new Date()
                };
            });
            
            // 🎯 클라이언트 사이드 필터링 및 정렬
            const firebaseAds = allAds
                .filter(ad => ad.isActive === true)  // 활성 광고만 필터링
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));  // priority 기준 내림차순 정렬
            
            console.log('✅ Firebase 광고 데이터 변환 완료:', firebaseAds.length, '개');
            console.log('📊 변환된 광고 데이터 샘플:', firebaseAds[0]);
            
            // 🚨 생명구조 보장 - Firebase 데이터를 localStorage에도 저장 (백업용)
            try {
                localStorage.setItem('lonelycare_ads', JSON.stringify(firebaseAds));
                localStorage.setItem('lonelycare_ads_last_update', new Date().toISOString());
                console.log('✅ Firebase 광고 데이터 localStorage 백업 완료');
            } catch (storageError) {
                console.warn('⚠️ localStorage 저장 실패:', storageError.message);
            }
            
            return firebaseAds;
            
        } catch (error) {
            console.error('❌ Firebase 광고 데이터 로드 실패:', error);
            return null;
        }
    }

    // 기본 광고 데이터 제공 (관리자 페이지와 동일)
    getDefaultAds() {
        return [
            {
                id: 'default-1',
                title: '생명보험 추천',
                description: '고객 맞춤형 생명보험으로 가족을 보호하세요.',
                content: '고객 맞춤형 생명보험으로 가족을 보호하세요.',
                url: 'https://example.com/insurance',
                button_text: '보험 상담받기',
                category: 'insurance',
                is_active: true,
                priority: 1
            },
            {
                id: 'default-2',
                title: '상조서비스',
                description: '품격 있는 장례 문화를 위한 종합 상조서비스',
                content: '품격 있는 장례 문화를 위한 종합 상조서비스',
                url: 'https://example.com/funeral',
                button_text: '상담 신청',
                category: 'funeral',
                is_active: true,
                priority: 1
            },
            {
                id: 'default-3',
                title: '상속 전문 변호사',
                description: '복잡한 상속 절차를 전문가가 도와드립니다.',
                content: '복잡한 상속 절차를 전문가가 도와드립니다.',
                url: 'https://example.com/inheritance',
                button_text: '법률 상담',
                category: 'lawyer',
                is_active: true,
                priority: 1
            }
        ];
    }

    // 실시간 광고 데이터 새로고침
    refreshAdsData() {
        try {
            const storedAds = localStorage.getItem('lonelycare_ads');
            
            if (storedAds && storedAds !== 'null' && storedAds !== '[]') {
                const ads = JSON.parse(storedAds);
                if (ads && ads.length > 0) {
                    this.realAdsData = ads;
                    console.log('🔄 광고 데이터 새로고침 완료:', ads.length, '개');
                    return;
                }
            }
            
            // 로컬스토리지에 데이터가 없으면 기본 광고 사용
            if (!this.realAdsData || this.realAdsData.length === 0) {
                this.realAdsData = this.getDefaultAds();
                console.log('🔄 기본 광고 데이터로 fallback:', this.realAdsData.length, '개');
            }
        } catch (error) {
            console.error('❌ 광고 데이터 새로고침 실패:', error);
            if (!this.realAdsData || this.realAdsData.length === 0) {
                this.realAdsData = this.getDefaultAds();
            }
        }
    }

    // 하드코딩된 기본 광고 제거 - 데이터베이스에서만 로드

    // 광고 데이터 (데이터베이스에서 로드된 실제 데이터만 사용)
    getAdsForType(type) {
        console.log(`🔍 getAdsForType 호출: ${type}`, {
            realAdsData: !!this.realAdsData,
            length: this.realAdsData?.length || 0
        });
        
        if (!this.realAdsData || this.realAdsData.length === 0) {
            console.warn(`⚠️ ${type} 탭: 광고 데이터 없음`);
            return []; // 데이터베이스에 광고가 없으면 빈 배열 반환
        }

        const allAds = this.realAdsData.map(ad => {
            const processedAd = {
                title: ad.title,
                content: ad.content || ad.description,
                description: ad.description || ad.content,
                url: ad.url || '#',
                link: ad.url || '#',
                button_text: ad.button_text || '자세히보기',
                buttonText: ad.button_text || '자세히보기',
                priority: ad.priority || 1,
                banner_type: ad.banner_type || 'info',
                category: ad.category || this.getCategoryFromTitle(ad.title) // 실제 저장된 category 우선 사용
            };
            
            console.log(`📋 광고 처리: ${processedAd.title} (category: ${processedAd.category})`);
            return processedAd;
        });

        // 타입별 필터링
        let filteredAds = [];
        if (type === 'insurance') {
            filteredAds = allAds.filter(ad => ad.category === 'insurance');
        } else if (type === 'funeral') {
            filteredAds = allAds.filter(ad => ad.category === 'funeral');
        } else if (type === 'lawyer') {
            filteredAds = allAds.filter(ad => ad.category === 'lawyer');
        } else {
            // 기본적으로 모든 광고 반환
            filteredAds = allAds;
        }
        
        console.log(`📊 ${type} 탭 필터링 결과:`, filteredAds.length, '개');
        console.log('📋 필터링된 광고 목록:', filteredAds.map(ad => ({ title: ad.title, category: ad.category })));
        
        return filteredAds;
    }

    // 제목 기반으로 카테고리 추정
    getCategoryFromTitle(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('보험') || lowerTitle.includes('insurance')) {
            return 'insurance';
        } else if (lowerTitle.includes('상조') || lowerTitle.includes('장례') || lowerTitle.includes('funeral')) {
            return 'funeral';
        } else if (lowerTitle.includes('변호사') || lowerTitle.includes('법률') || lowerTitle.includes('상속') || lowerTitle.includes('lawyer')) {
            return 'lawyer';
        } else {
            return 'insurance'; // 기본값
        }
    }


    // 알림 설정 페이지 로드

    // 프로필 이벤트 설정 (중복 방지)
    setupProfileEvents() {
        // 이미 설정되었으면 건너뛰기
        if (this.profileEventsSetup) {
            console.log('🔧 프로필 이벤트 이미 설정됨 - 건너뛰기');
            return;
        }
        
        console.log('🔧 프로필 이벤트 설정 시작 (최초 1회)');
        
        // 모든 .file-upload 요소 찾기
        const allFileUploads = document.querySelectorAll('.file-upload');
        console.log('🔍 발견된 file-upload 요소들:', allFileUploads.length, allFileUploads);
        
        // 프로필 사진 업로드 요소 확인
        const profilePhotoInput = document.getElementById('profile-photo-input');
        const profilePicPreview = document.getElementById('profile-pic-preview');
        const profilePicPlaceholder = document.getElementById('profile-pic-placeholder');
        
        // 프로필 사진 업로드 버튼 div 찾기 - 여러 방법으로 시도
        let profileUploadDiv = document.querySelector('.file-upload[onclick*="profile-photo-input"]');
        if (!profileUploadDiv) {
            // onclick 속성이 없을 경우 텍스트로 찾기
            profileUploadDiv = Array.from(allFileUploads).find(div => 
                div.textContent.includes('프로필 사진 업로드')
            );
        }
        
        console.log('📷 프로필 사진 요소들:', {
            profilePhotoInput,
            profilePicPreview, 
            profilePicPlaceholder,
            profileUploadDiv,
            onclick: profileUploadDiv ? profileUploadDiv.getAttribute('onclick') : null
        });
        
        // 프로필 사진 업로드 버튼 클릭 이벤트
        if (profileUploadDiv && profilePhotoInput) {
            // 기존 onclick 속성 제거
            profileUploadDiv.removeAttribute('onclick');
            profileUploadDiv.onclick = null;
            
            // Android WebView 호환 클릭 핸들러
            const clickHandler = (e) => {
                console.log('🖱️ 프로필 사진 업로드 버튼 클릭됨!');
                console.log('📱 Android WebView에서 파일 선택 시도...');
                
                // Android Bridge를 통한 파일 선택 시도 (우선순위 1)
                if (window.AndroidBridge && window.AndroidBridge.selectImageFile) {
                    console.log('🔧 Android Bridge를 통한 파일 선택 시도');
                    try {
                        window.AndroidBridge.selectImageFile('profile');
                        return;
                    } catch (error) {
                        console.warn('⚠️ Android Bridge 파일 선택 실패, 대안 방법 시도:', error);
                    }
                }
                
                try {
                    // WebView 파일 input 방식 (우선순위 2)
                    console.log('🌐 WebView 파일 input 방식 시도');
                    
                    // input 요소를 완전히 보이게 만들기
                    profilePhotoInput.style.display = 'block';
                    profilePhotoInput.style.position = 'absolute';
                    profilePhotoInput.style.top = '0px';
                    profilePhotoInput.style.left = '0px';
                    profilePhotoInput.style.width = '1px';
                    profilePhotoInput.style.height = '1px';
                    profilePhotoInput.style.opacity = '0';
                    profilePhotoInput.style.zIndex = '9999';
                    
                    // DOM에 추가 확인
                    if (!document.body.contains(profilePhotoInput)) {
                        document.body.appendChild(profilePhotoInput);
                        console.log('📝 파일 input을 DOM에 추가');
                    }
                    
                    // 단일 클릭으로 파일 선택 창 열기
                    console.log('📱 프로필 사진 input 클릭');
                    profilePhotoInput.click();
                    
                    console.log('📱 파일 input 클릭 실행 완료');
                    
                } catch (error) {
                    console.error('❌ 파일 선택 오류:', error);
                }
            };
            
            // 이벤트 리스너 추가 (중복 방지)
            profileUploadDiv.removeEventListener('click', clickHandler);
            profileUploadDiv.addEventListener('click', clickHandler, { once: false });
            
            console.log('✅ 프로필 사진 업로드 버튼 이벤트 설정 완료');
        } else {
            console.error('❌ 프로필 사진 업로드 요소를 찾을 수 없습니다:', {
                profileUploadDiv,
                profilePhotoInput
            });
        }
        
        // 프로필 사진 파일 변경 이벤트
        if (profilePhotoInput) {
            // 기존 이벤트 리스너 제거
            profilePhotoInput.removeEventListener('change', this.profilePhotoChangeHandler);
            
            // 새 이벤트 리스너 추가
            this.profilePhotoChangeHandler = async (e) => {
                console.log('📷 프로필 사진 파일 변경 이벤트 발생');
                const file = e.target.files[0];
                console.log('선택된 파일:', file);
                
                if (file) {
                    console.log('🖼️ 프로필 사진 원본 크기:', (file.size / 1024).toFixed(2), 'KB');
                    
                    try {
                        // 즉시 크기 조정 및 Base64 변환
                        const resizedBase64 = await this.resizeImage(file, 600, 600, 0.7);
                        console.log('🖼️ 프로필 사진 압축 후 크기:', (resizedBase64.length / 1024).toFixed(2), 'KB');
                        
                        // 압축된 데이터를 전역 변수에 저장
                        this.tempProfilePicData = resizedBase64;
                        
                        // 미리보기 표시
                        if (profilePicPreview && profilePicPlaceholder) {
                            profilePicPreview.src = resizedBase64;
                            profilePicPreview.style.display = 'block';
                            profilePicPlaceholder.style.display = 'none';
                        }
                        
                        console.log('✅ 프로필 사진 파일 처리 완료');
                    } catch (error) {
                        console.error('❌ 프로필 사진 처리 실패:', error);
                        this.showToast('프로필 사진 처리에 실패했습니다.', 'error');
                    }
                } else {
                    console.log('❌ 파일이 선택되지 않음');
                    this.tempProfilePicData = null;
                }
            };
            
            profilePhotoInput.addEventListener('change', this.profilePhotoChangeHandler);
            console.log('✅ 프로필 사진 파일 변경 이벤트 리스너 설정 완료');
        }

        // 영정사진 업로드 요소 확인
        const memorialPhotoInput = document.getElementById('memorial-photo-input');
        const memorialPicPreview = document.getElementById('memorial-pic-preview');
        const memorialPicPlaceholder = document.getElementById('memorial-pic-placeholder');
        
        // 영정사진 업로드 버튼 div 찾기 - 여러 방법으로 시도
        let memorialUploadDiv = document.querySelector('.file-upload[onclick*="memorial-photo-input"]');
        if (!memorialUploadDiv) {
            // onclick 속성이 없을 경우 텍스트로 찾기
            memorialUploadDiv = Array.from(allFileUploads).find(div => 
                div.textContent.includes('영정사진 업로드')
            );
        }
        
        console.log('🖼️ 영정사진 요소들:', {
            memorialPhotoInput,
            memorialPicPreview,
            memorialPicPlaceholder,
            memorialUploadDiv,
            onclick: memorialUploadDiv ? memorialUploadDiv.getAttribute('onclick') : null
        });
        
        // 영정사진 업로드 버튼 클릭 이벤트
        if (memorialUploadDiv && memorialPhotoInput) {
            // 기존 onclick 속성 제거
            memorialUploadDiv.removeAttribute('onclick');
            memorialUploadDiv.onclick = null;
            
            // Android WebView 호환 클릭 핸들러
            const memorialClickHandler = (e) => {
                console.log('🖱️ 영정사진 업로드 버튼 클릭됨!');
                console.log('📱 Android WebView에서 파일 선택 시도...');
                
                // Android Bridge를 통한 파일 선택 시도 (우선순위 1)
                if (window.AndroidBridge && window.AndroidBridge.selectImageFile) {
                    console.log('🔧 Android Bridge를 통한 영정사진 선택 시도');
                    try {
                        window.AndroidBridge.selectImageFile('memorial');
                        return;
                    } catch (error) {
                        console.warn('⚠️ Android Bridge 파일 선택 실패, 대안 방법 시도:', error);
                    }
                }
                
                try {
                    // WebView 파일 input 방식 (우선순위 2)
                    console.log('🌐 WebView 영정사진 input 방식 시도');
                    
                    // input 요소를 완전히 보이게 만들기
                    memorialPhotoInput.style.display = 'block';
                    memorialPhotoInput.style.position = 'absolute';
                    memorialPhotoInput.style.top = '0px';
                    memorialPhotoInput.style.left = '0px';
                    memorialPhotoInput.style.width = '1px';
                    memorialPhotoInput.style.height = '1px';
                    memorialPhotoInput.style.opacity = '0';
                    memorialPhotoInput.style.zIndex = '9999';
                    
                    // DOM에 추가 확인
                    if (!document.body.contains(memorialPhotoInput)) {
                        document.body.appendChild(memorialPhotoInput);
                        console.log('📝 영정사진 input을 DOM에 추가');
                    }
                    
                    // 단일 클릭으로 파일 선택 창 열기
                    console.log('📱 영정사진 input 클릭');
                    memorialPhotoInput.click();
                    
                    console.log('📱 영정사진 input 클릭 실행 완료');
                    
                } catch (error) {
                    console.error('❌ 영정사진 선택 오류:', error);
                }
            };
            
            // 이벤트 리스너 추가 (중복 방지)
            memorialUploadDiv.removeEventListener('click', memorialClickHandler);
            memorialUploadDiv.addEventListener('click', memorialClickHandler, { once: false });
            
            console.log('✅ 영정사진 업로드 버튼 이벤트 설정 완료');
        } else {
            console.error('❌ 영정사진 업로드 요소를 찾을 수 없습니다:', {
                memorialUploadDiv,
                memorialPhotoInput
            });
        }
        
        // 영정사진 파일 변경 이벤트
        if (memorialPhotoInput) {
            // 기존 이벤트 리스너 제거
            memorialPhotoInput.removeEventListener('change', this.memorialPhotoChangeHandler);
            
            // 새 이벤트 리스너 추가
            this.memorialPhotoChangeHandler = async (e) => {
                console.log('🖼️ 영정사진 파일 변경 이벤트 발생');
                const file = e.target.files[0];
                console.log('선택된 파일:', file);
                
                if (file) {
                    console.log('🖼️ 영정사진 원본 크기:', (file.size / 1024).toFixed(2), 'KB');
                    
                    try {
                        // 즉시 크기 조정 및 Base64 변환
                        const resizedBase64 = await this.resizeImage(file, 600, 600, 0.7);
                        console.log('🖼️ 영정사진 압축 후 크기:', (resizedBase64.length / 1024).toFixed(2), 'KB');
                        
                        // 압축된 데이터를 전역 변수에 저장
                        this.tempMemorialPicData = resizedBase64;
                        
                        // 미리보기 표시
                        if (memorialPicPreview && memorialPicPlaceholder) {
                            memorialPicPreview.src = resizedBase64;
                            memorialPicPreview.style.display = 'block';
                            memorialPicPlaceholder.style.display = 'none';
                        }
                        
                        console.log('✅ 영정사진 파일 처리 완료');
                    } catch (error) {
                        console.error('❌ 영정사진 처리 실패:', error);
                        this.showToast('영정사진 처리에 실패했습니다.', 'error');
                    }
                } else {
                    console.log('❌ 영정사진 파일이 선택되지 않음');
                    this.tempMemorialPicData = null;
                }
            };
            
            memorialPhotoInput.addEventListener('change', this.memorialPhotoChangeHandler);
            console.log('✅ 영정사진 파일 변경 이벤트 리스너 설정 완료');
        }

        // 프로필 저장 - form submit 이벤트만 사용
        const profileForm = document.getElementById('profile-form');
        console.log('profile-form 요소:', profileForm);
        profileForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('프로필 저장 시작');
            await this.saveProfile();
        });

        // 전역 함수로 등록 (백업용)
        window.saveProfile = async () => {
            console.log('전역 saveProfile 호출');
            await this.saveProfile();
        };

        // 🚨 생명구조 중요: 프로필 페이지 로드 시 기존 이미지 표시 로직 추가
        this.loadExistingProfileImages();

        // 움직임 감지 테스트 버튼 이벤트
        document.getElementById('motion-reset-btn')?.addEventListener('click', () => {
            if (window.motionDetector) {
                motionDetector.resetMotionCount();
                auth.showNotification('움직임 카운터가 리셋되었습니다.');
            }
        });

        document.getElementById('send-status-btn')?.addEventListener('click', async () => {
            if (window.motionDetector) {
                await motionDetector.sendStatusToFriends();
                auth.showNotification('친구들에게 상태를 전송했습니다.');
            }
        });
        
        // 중복 설정 방지 플래그
        this.profileEventsSetup = true;
        console.log('✅ 프로필 이벤트 설정 완료 - 플래그 설정됨');
        
        // 네이티브 파일 선택 결과 핸들러 설정
        this.setupNativeFileHandler();
    }
    
    // 네이티브 파일 선택 결과 핸들러
    setupNativeFileHandler() {
        window.handleNativeFileSelected = async (base64Data, fileType) => {
            console.log('📱 네이티브 파일 선택 결과:', base64Data ? '받음' : '취소', '타입:', fileType);
            
            if (base64Data) {
                try {
                    console.log('📊 Base64 데이터 크기:', (base64Data.length / 1024).toFixed(2), 'KB');
                    
                    // Base64 데이터를 Blob으로 변환
                    const response = await fetch(base64Data);
                    const blob = await response.blob();
                    
                    console.log('📁 파일 블롭 생성:', blob.type, blob.size);
                    
                    // File 객체로 변환
                    const file = new File([blob], 'selected_image.jpg', {
                        type: blob.type || 'image/jpeg'
                    });
                    
                    console.log('📄 파일 객체 생성:', file.name, file.size, file.type);
                    
                    // 파일 크기가 너무 크면 압축, 작으면 그대로 사용
                    let finalBase64;
                    if (file.size > 500 * 1024) { // 500KB 초과 시 압축
                        console.log('🔄 이미지 압축 시작...');
                        finalBase64 = await this.resizeImage(file, 600, 600, 0.7);
                        console.log('🖼️ 이미지 압축 완료:', (finalBase64.length / 1024).toFixed(2), 'KB');
                    } else {
                        console.log('✅ 이미지 크기 적절, 압축 생략');
                        finalBase64 = base64Data; // 원본 Base64 사용
                    }
                    
                    // 파일 타입에 따라 올바른 변수에 저장
                    if (fileType === 'memorial') {
                        console.log('🖼️ 영정사진 데이터 저장');
                        this.tempMemorialPicData = finalBase64;
                        
                        // 영정사진 미리보기 업데이트
                        const memorialPicPreview = document.getElementById('memorial-pic-preview');
                        const memorialPicPlaceholder = document.getElementById('memorial-pic-placeholder');
                        
                        if (memorialPicPreview && memorialPicPlaceholder) {
                            memorialPicPreview.src = finalBase64;
                            memorialPicPreview.style.display = 'block';
                            memorialPicPlaceholder.style.display = 'none';
                        }
                        
                        this.showToast('영정사진이 성공적으로 선택되었습니다.', 'success');
                    } else {
                        console.log('📷 프로필 사진 데이터 저장');
                        this.tempProfilePicData = finalBase64;
                        
                        // 프로필 사진 미리보기 업데이트
                        const profilePicPreview = document.getElementById('profile-pic-preview');
                        const profilePicPlaceholder = document.getElementById('profile-pic-placeholder');
                        
                        if (profilePicPreview && profilePicPlaceholder) {
                            profilePicPreview.src = finalBase64;
                            profilePicPreview.style.display = 'block';
                            profilePicPlaceholder.style.display = 'none';
                        }
                        
                        this.showToast('프로필 사진이 성공적으로 선택되었습니다.', 'success');
                    }
                    
                } catch (error) {
                    console.error('❌ 네이티브 파일 처리 실패:', error);
                    this.showToast('파일 처리에 실패했습니다.', 'error');
                }
            } else {
                console.log('📱 파일 선택 취소됨');
                this.showToast('파일 선택이 취소되었습니다.', 'info');
            }
        };
        
        console.log('📱 네이티브 파일 선택 핸들러 등록 완료');
    }

    // 토스트 메시지 표시 함수
    showToast(message, type = 'success') {
        console.log('토스트 메시지:', message);
        
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 토스트 생성
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // CSS 애니메이션 추가
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // 3초 후 제거
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    // 이미지 크기 조정 함수 추가
    async resizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 비율을 유지하면서 크기 조정
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;

                // 이미지를 캔버스에 그리기
                ctx.drawImage(img, 0, 0, width, height);

                // Base64로 변환 (압축 품질 적용)
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    // 프로필 저장
    async saveProfile() {
        console.log('saveProfile 함수 실행');
        const currentUser = auth.getCurrentUser();
        console.log('현재 사용자:', currentUser);
        if (!currentUser) {
            console.log('사용자가 로그인되지 않음');
            return;
        }

        try {
            // 프로필 사진 처리 (전역 변수에서 가져오기)
            let profilePicData = currentUser.profilePic || currentUser.profile_image || currentUser.profileImage || null;
            if (this.tempProfilePicData) {
                console.log('📸 전역 변수에서 프로필 사진 데이터 사용:', (this.tempProfilePicData.length / 1024).toFixed(2), 'KB');
                profilePicData = this.tempProfilePicData;
            }

            // 영정사진 처리 (전역 변수에서 가져오기)
            let memorialPicData = currentUser.memorial_pic || null;
            if (this.tempMemorialPicData) {
                console.log('🖼️ 전역 변수에서 영정사진 데이터 사용:', (this.tempMemorialPicData.length / 1024).toFixed(2), 'KB');
                memorialPicData = this.tempMemorialPicData;
            }

            // 안전한 요소 값 가져오기 함수
            const getElementValue = (id, defaultValue = '') => {
                const element = document.getElementById(id);
                return element ? (element.value || defaultValue) : defaultValue;
            };

            // undefined 값 필터링 함수
            const filterUndefinedValues = (obj) => {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== undefined) {
                        result[key] = value;
                    }
                }
                return result;
            };

            // 체크박스 값 가져오기 함수
            const getCheckboxValue = (id) => {
                const element = document.getElementById(id);
                return element ? element.checked : false;
            };

            const rawUpdateData = {
                name: getElementValue('profile-name'),
                phone: getElementValue('profile-phone'),
                birth: getElementValue('profile-birth') || null,
                gender: getElementValue('profile-gender') || null,
                address: getElementValue('profile-address'),
                detailAddress: getElementValue('profile-detail-address'),
                postal: getElementValue('profile-postal'),
                emergencyContact1: getElementValue('emergency-contact1'),
                emergencyName1: getElementValue('emergency-name1'),
                emergencyContact2: getElementValue('emergency-contact2'),
                emergencyName2: getElementValue('emergency-name2'),
                bloodType: getElementValue('blood-type') || null,
                medicalConditions: getElementValue('medical-conditions'),
                allergies: getElementValue('allergies'),
                workplace: getElementValue('workplace'),
                specialNotes: getElementValue('special-notes'),
                // 🚨 긴급 연락 동의 상태 저장 (EmergencyResponseSystem에서 사용)
                emergency_contact_consent: getCheckboxValue('emergency-contact-consent'),
                ...(profilePicData && { profilePic: profilePicData }),
                ...(memorialPicData && { memorialPic: memorialPicData })
            };

            // undefined 값 제거
            const updateData = filterUndefinedValues(rawUpdateData);

            // 전체 데이터 크기 확인
            const dataSize = JSON.stringify(updateData).length;
            console.log('📊 전송할 데이터 크기:', (dataSize / 1024).toFixed(2), 'KB');

            if (dataSize > 1024 * 1024) { // 1MB 초과
                console.warn('⚠️ 데이터 크기가 너무 큽니다:', (dataSize / 1024 / 1024).toFixed(2), 'MB');
                this.showToast('이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.', 'error');
                return;
            }

            console.log('📤 사용자 업데이트 시작...');
            const userIdForUpdate = currentUser.id; // Firebase document ID 사용
            console.log('🔑 사용할 사용자 ID:', userIdForUpdate);
            console.log('📊 저장할 프로필 데이터:', {
                phone: updateData.phone,
                emergencyContact1: updateData.emergencyContact1,
                emergencyName1: updateData.emergencyName1,
                emergencyContact2: updateData.emergencyContact2,
                emergencyName2: updateData.emergencyName2
            });
            await storage.updateUser(userIdForUpdate, updateData);
            console.log('✅ 사용자 업데이트 완료');
            
            // 현재 사용자 정보 업데이트
            console.log('🔄 사용자 정보 새로고침 중...');
            
            // Firebase에서 최신 사용자 데이터 가져오기
            const userIdForFetch = currentUser.kakao_id || currentUser.id; // Kakao ID 사용
            const updatedUser = await storage.getUserByKakaoId(userIdForFetch);
            
            if (updatedUser) {
                // 최신 정보로 currentUser 업데이트 (프로필 사진 데이터 보존)
                const mergedUser = { 
                    ...currentUser, 
                    ...updatedUser,
                    // profilePic과 memorialPic은 덮어쓰지 않도록 명시적으로 보존
                    profilePic: updatedUser.profilePic || currentUser.profilePic || profilePicData,
                    memorialPic: updatedUser.memorialPic || currentUser.memorialPic || memorialPicData
                };
                storage.setCurrentUser(mergedUser);
                auth.updateUserInfo(mergedUser);
                console.log('✅ Firebase에서 최신 사용자 정보 로드 완료:', {
                    name: mergedUser.name,
                    profilePic: mergedUser.profilePic ? 'found (' + (mergedUser.profilePic.length / 1024).toFixed(2) + ' KB)' : 'not found',
                    memorialPic: mergedUser.memorialPic ? 'found' : 'not found'
                });
            } else {
                console.warn('⚠️ Firebase에서 사용자 정보를 가져올 수 없습니다');
            }
            console.log('✅ 프로필 저장 성공');

            // 🚨 생명구조 중요: Firebase 저장 완전 확인 후에만 임시 데이터 정리
            console.log('🔍 Firebase 저장 확인 중...');
            console.log('  - updatedUser 존재:', !!updatedUser);
            console.log('  - updatedUser.profilePic 존재:', updatedUser ? !!updatedUser.profilePic : false);
            console.log('  - updatedUser.memorialPic 존재:', updatedUser ? !!updatedUser.memorialPic : false);
            
            // 프로필 사진 Firebase 저장 확인 및 임시 데이터 정리
            if (updatedUser && updatedUser.profilePic && profilePicData) {
                // 저장된 데이터와 원본 데이터가 일치하는지 확인 (크기 비교)
                const savedDataSize = updatedUser.profilePic.length;
                const originalDataSize = profilePicData.length;
                const sizeDifference = Math.abs(savedDataSize - originalDataSize);
                
                if (sizeDifference < 100) { // 100바이트 이내 차이는 정상으로 판정
                    this.tempProfilePicData = null;
                    console.log('📸 프로필 사진 Firebase 저장 완전 확인됨 - 임시 데이터 정리 (', (savedDataSize / 1024).toFixed(2), 'KB)');
                } else {
                    console.warn('⚠️ 프로필 사진 크기 불일치 - 임시 데이터 보존 (원본:', (originalDataSize / 1024).toFixed(2), 'KB, 저장됨:', (savedDataSize / 1024).toFixed(2), 'KB)');
                }
            }
            
            // 영정사진 Firebase 저장 확인 및 임시 데이터 정리
            if (updatedUser && updatedUser.memorialPic && memorialPicData) {
                const savedDataSize = updatedUser.memorialPic.length;
                const originalDataSize = memorialPicData.length;
                const sizeDifference = Math.abs(savedDataSize - originalDataSize);
                
                if (sizeDifference < 100) {
                    this.tempMemorialPicData = null;
                    console.log('🖼️ 영정사진 Firebase 저장 완전 확인됨 - 임시 데이터 정리 (', (savedDataSize / 1024).toFixed(2), 'KB)');
                } else {
                    console.warn('⚠️ 영정사진 크기 불일치 - 임시 데이터 보존');
                }
            }

            this.showToast('프로필이 저장되었습니다.', 'success');
            
            // 🚨 생명구조 중요: 저장 후 즉시 UI 갱신
            setTimeout(() => {
                this.loadExistingProfileImages();
            }, 500);
            
        } catch (error) {
            console.error('❌ 프로필 저장 실패:', error);
            console.error('❌ 에러 타입:', error.constructor.name);
            console.error('❌ 에러 메시지:', error.message);
            console.error('❌ 에러 스택:', error.stack);
            
            // 에러 유형별 메시지 제공
            let errorMessage = '프로필 저장에 실패했습니다.';
            if (error.name === 'NetworkError' || error instanceof TypeError) {
                errorMessage = '네트워크 연결을 확인해주세요.';
            } else if (error.message?.includes('timeout')) {
                errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
            } else if (error.message?.includes('413') || error.message?.includes('too large')) {
                errorMessage = '파일 크기가 너무 큽니다. 더 작은 이미지를 선택해주세요.';
            }
            
            this.showToast(errorMessage, 'error');
        }
    }

    // 🚨 생명구조 중요: 기존 프로필 이미지 로딩 함수
    async loadExistingProfileImages() {
        console.log('🖼️ 기존 프로필 이미지 로딩 시작...');
        
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                console.log('❌ 로그인된 사용자가 없음');
                return;
            }

            console.log('👤 현재 사용자 정보:', {
                id: currentUser.id,
                name: currentUser.name,
                hasProfilePic: !!currentUser.profilePic,
                hasProfileImage: !!currentUser.profile_image,
                hasMemorialPic: !!currentUser.memorialPic
            });

            // 🔍 모든 가능한 필드명에서 프로필 이미지 찾기 (우선순위 순)
            const profilePicData = currentUser.profilePic || 
                                 currentUser.profile_image || 
                                 currentUser.profileImage || 
                                 null;

            const memorialPicData = currentUser.memorialPic || 
                                  currentUser.memorial_pic || 
                                  currentUser.memorialImage || 
                                  null;

            console.log('🔍 이미지 데이터 검색 결과:', {
                profilePic: profilePicData ? `found (${(profilePicData.length / 1024).toFixed(2)} KB)` : 'not found',
                memorialPic: memorialPicData ? `found (${(memorialPicData.length / 1024).toFixed(2)} KB)` : 'not found'
            });

            // 프로필 사진 표시
            const profilePicPreview = document.getElementById('profile-pic-preview');
            const profilePicPlaceholder = document.getElementById('profile-pic-placeholder');

            if (profilePicPreview && profilePicPlaceholder) {
                if (profilePicData && profilePicData.length > 1000) { // 최소 1KB 이상
                    console.log('✅ 프로필 사진 표시 중...');
                    profilePicPreview.src = profilePicData;
                    profilePicPreview.style.display = 'block';
                    profilePicPlaceholder.style.display = 'none';
                    
                    // 이미지 로드 오류 처리
                    profilePicPreview.onerror = () => {
                        console.error('❌ 프로필 이미지 로드 실패');
                        profilePicPreview.style.display = 'none';
                        profilePicPlaceholder.style.display = 'flex';
                        profilePicPlaceholder.textContent = '이미지 로드 실패';
                    };
                    
                    profilePicPreview.onload = () => {
                        console.log('✅ 프로필 이미지 로드 성공');
                    };
                } else {
                    console.log('⚠️ 프로필 사진 데이터 없음 또는 크기 부족');
                    profilePicPreview.style.display = 'none';
                    profilePicPlaceholder.style.display = 'flex';
                    profilePicPlaceholder.textContent = '사진 없음';
                }
            } else {
                console.error('❌ 프로필 이미지 표시 요소를 찾을 수 없음:', {
                    profilePicPreview: !!profilePicPreview,
                    profilePicPlaceholder: !!profilePicPlaceholder
                });
            }

            // 영정사진 표시
            const memorialPicPreview = document.getElementById('memorial-pic-preview');
            const memorialPicPlaceholder = document.getElementById('memorial-pic-placeholder');

            if (memorialPicPreview && memorialPicPlaceholder) {
                if (memorialPicData && memorialPicData.length > 1000) { // 최소 1KB 이상
                    console.log('✅ 영정사진 표시 중...');
                    memorialPicPreview.src = memorialPicData;
                    memorialPicPreview.style.display = 'block';
                    memorialPicPlaceholder.style.display = 'none';
                    
                    // 이미지 로드 오류 처리
                    memorialPicPreview.onerror = () => {
                        console.error('❌ 영정사진 로드 실패');
                        memorialPicPreview.style.display = 'none';
                        memorialPicPlaceholder.style.display = 'flex';
                        memorialPicPlaceholder.textContent = '이미지 로드 실패';
                    };
                    
                    memorialPicPreview.onload = () => {
                        console.log('✅ 영정사진 로드 성공');
                    };
                } else {
                    console.log('⚠️ 영정사진 데이터 없음');
                    memorialPicPreview.style.display = 'none';
                    memorialPicPlaceholder.style.display = 'flex';
                    memorialPicPlaceholder.textContent = '사진 없음';
                }
            }

            // 🚨 중요: 프로필 정보 필드 채우기 (기존 데이터로)
            this.populateProfileFields(currentUser);

            console.log('✅ 기존 프로필 이미지 로딩 완료');

        } catch (error) {
            console.error('❌ 프로필 이미지 로딩 실패:', error);
        }
    }

    // 🚨 생명구조 중요: 프로필 필드 자동 채우기
    populateProfileFields(userData) {
        console.log('📝 프로필 필드 자동 채우기 시작...');
        
        const fields = {
            'profile-name': userData.name || '',
            'profile-phone': userData.phone || '',
            'profile-birth': userData.birth || '',
            'profile-gender': userData.gender || '',
            'profile-address': userData.address || '',
            'profile-detail-address': userData.detailAddress || userData.detail_address || '',
            'profile-postal': userData.postal || '',
            'emergency-contact1': userData.emergencyContact1 || userData.emergency_contact1 || '',
            'emergency-name1': userData.emergencyName1 || userData.emergency_name1 || '',
            'emergency-contact2': userData.emergencyContact2 || userData.emergency_contact2 || '',
            'emergency-name2': userData.emergencyName2 || userData.emergency_name2 || '',
            'blood-type': userData.bloodType || userData.blood_type || '',
            'medical-conditions': userData.medicalConditions || userData.medical_conditions || '',
            'allergies': userData.allergies || '',
            'workplace': userData.workplace || '',
            'special-notes': userData.specialNotes || userData.special_notes || ''
        };

        // 체크박스 필드
        const checkboxFields = {
            'emergency-contact-consent': userData.emergency_contact_consent !== false // 기본값 true
        };

        // 일반 필드 채우기
        Object.keys(fields).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && fields[fieldId]) {
                element.value = fields[fieldId];
                console.log(`📝 ${fieldId}: ${fields[fieldId]}`);
            }
        });

        // 체크박스 필드 채우기
        Object.keys(checkboxFields).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.checked = checkboxFields[fieldId];
                console.log(`☑️ ${fieldId}: ${checkboxFields[fieldId]}`);
            }
        });

        console.log('✅ 프로필 필드 자동 채우기 완료');
    }

    // 움직임 감지 테스트 버튼 이벤트 설정
    setupMotionTestEvents() {
        // 움직임 리셋 버튼
        document.getElementById('motion-reset-btn')?.addEventListener('click', () => {
            if (window.motionDetector) {
                motionDetector.resetMotionCount();
                auth.showNotification('움직임 카운터가 리셋되었습니다.');
            }
        });

        // 즉시 상태 전송 버튼
        document.getElementById('send-status-btn')?.addEventListener('click', async () => {
            if (window.motionDetector) {
                await motionDetector.sendStatusToFriends();
                auth.showNotification('친구들에게 현재 상태를 전송했습니다.');
            }
        });
    }

    // 광고 이벤트 설정 (중복 방지 강화)
    setupAdEvents() {
        // 이미 설정되었으면 건너뛰기
        if (this.adEventsSetup) {
            console.log('🔧 광고 이벤트 이미 설정됨 - 건너뛰기');
            return;
        }
        
        console.log('🎯 광고 배너 이벤트 설정 시작 (최초 1회)');
        
        // 광고 탭 버튼들 이벤트 설정 (더 안전한 방법)
        const adTabs = document.querySelectorAll('.tabs .tab');
        console.log(`📋 발견된 광고 탭 버튼 수: ${adTabs.length}`);
        
        adTabs.forEach((tab, index) => {
            const tabType = tab.getAttribute('data-tab');
            console.log(`🔘 탭 ${index + 1}: ${tabType}`);
            
            if (tabType) {
                // 기존 이벤트 제거 (중복 방지)
                tab.replaceWith(tab.cloneNode(true));
                const newTab = document.querySelectorAll('.tabs .tab')[index];
                
                newTab.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔄 광고 탭 클릭됨: ${tabType}`);
                    this.showAdTab(tabType);
                });
                
                console.log(`✅ 탭 이벤트 설정 완료: ${tabType}`);
            }
        });
        
        // 기본 탭 활성화 (보험) - CSS 클래스 사용
        setTimeout(() => {
            const allTabs = document.querySelectorAll('.tabs .tab');
            const defaultTab = document.querySelector('.tabs .tab[data-tab="insurance"]');
            
            // 모든 탭 초기화
            allTabs.forEach(tab => {
                tab.classList.remove('active', 'tab-active-basic', 'tab-active-insurance', 'tab-active-funeral', 'tab-active-lawyer');
                tab.classList.add('tab-inactive');
            });
            
            // 기본 탭 활성화
            if (defaultTab) {
                defaultTab.classList.remove('tab-inactive');
                defaultTab.classList.add('active', 'tab-active-insurance');
                this.showAdTab('insurance');
                console.log('✅ 기본 탭(보험) 활성화 완료 - CSS 클래스 사용');
            }
        }, 300);
        
        // 플래그 설정으로 중복 방지
        this.adEventsSetup = true;
        console.log('✅ 광고 배너 이벤트 설정 완료 (중복 방지 플래그 설정)');
    }

    // 알림 설정 이벤트 설정
    setupNotificationEvents() {
        document.getElementById('enable-notifications')?.addEventListener('change', async (e) => {
            await storage.setSetting('enableNotifications', e.target.checked);
        });

        document.getElementById('emergency-contact')?.addEventListener('change', async (e) => {
            await storage.setSetting('emergencyContact', e.target.checked);
        });
        
        // 시스템 상태 주기적 업데이트 (30초마다)
        if (!this.statusUpdateInterval) {
            this.statusUpdateInterval = setInterval(() => {
                if (document.getElementById('notifications-page')?.classList.contains('active')) {
                    this.updateSystemStatus();
                }
            }, 30000); // 30초
        }
    }

    // 하트비트 전송 함수
    async sendHeartbeat() {
            const currentUser = auth.getCurrentUser();
            if (currentUser && currentUser.kakao_id) {
                try {
                    // 1. 자신의 상태 업데이트
                    await storage.updateUserStatus(currentUser.kakao_id, 'active');
                    console.log('✅ 자신의 상태 업데이트 완료');
                    
                    // 2. 친구들에게 하트비트 전송 (enhancedMotionDetector 초기화 대기)
                    let attempts = 0;
                    while (!window.enhancedMotionDetector && attempts < 50) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                    
                    if (window.enhancedMotionDetector) {
                        console.log('📤 Enhanced 움직임 감지기로 친구들에게 상태 전송 시작...');
                        // Enhanced 시스템에서는 자동으로 관리되므로 수동 호출 불필요
                        console.log('✅ Enhanced 움직임 감지 시스템이 친구 상태를 자동 관리 중');
                    } else {
                        console.log('📱 기본 모드: motionDetector 사용 중');
                    }
                } catch (error) {
                    console.error('❌ 하트비트 전송 실패:', error);
                }
            }
    }
    
    // 하트비트 시작 (60분마다 상태 업데이트)
    startHeartbeat() {
        console.log('💗 하트비트 시작 (60분 간격)');
        
        // 즉시 첫 번째 하트비트 전송
        this.sendHeartbeat();
        
        // 실시간 알림 구독
        this.subscribeToNotifications();
        
        // 60분마다 하트비트 전송
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 3600000); // 60분마다 (3600000ms = 60분)
    }
    
    // 실시간 알림 구독 및 폴링
    subscribeToNotifications() {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser || !storage?.supabase?.client) return;
            
            console.log('🔔 실시간 알림 시스템 시작...');
            
            // 마지막 확인 시간 저장용
            this.lastNotificationCheck = Date.now();
            
            // 1. 주기적 알림 확인 (5초마다)
            this.notificationPollingInterval = setInterval(async () => {
                await this.checkForNewNotifications();
            }, 5000);
            
            console.log('✅ 알림 폴링 시작 (5초 간격)');
            
            // 2. 기존 Realtime 구독도 유지 (백업용)
            try {
                const subscription = storage.supabase.client
                    .channel(`notifications:user_id=eq.${currentUser.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        async (payload) => {
                            console.log('🔔 Realtime 알림 수신:', payload);
                            const notification = payload.new;
                            await this.displayNotification(notification);
                        }
                    )
                    .subscribe();
                    
                this.notificationSubscription = subscription;
                console.log('✅ Realtime 구독도 설정 완료');
            } catch (realtimeError) {
                console.warn('⚠️ Realtime 구독 실패, 폴링만 사용:', realtimeError);
            }
            
        } catch (error) {
            console.error('❌ 알림 시스템 초기화 실패:', error);
        }
    }
    
    // 새 알림 확인 (폴링)
    async checkForNewNotifications() {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser || !storage?.supabase?.client) return;
            
            // 마지막 확인 시간 이후의 새 알림 조회
            const { data: newNotifications, error } = await storage.supabase.client
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .gt('created_at', new Date(this.lastNotificationCheck).toISOString())
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ 새 알림 확인 실패:', error);
                return;
            }
            
            if (newNotifications && newNotifications.length > 0) {
                console.log(`🔔 새 알림 ${newNotifications.length}개 발견:`, newNotifications);
                
                // 새 알림들을 하나씩 표시
                for (const notification of newNotifications.reverse()) {
                    await this.displayNotification(notification);
                    // 각 알림 사이에 약간의 지연
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // 마지막 확인 시간 업데이트
                this.lastNotificationCheck = Date.now();
            }
            
        } catch (error) {
            console.error('❌ 새 알림 확인 중 오류:', error);
        }
    }
    
    // 알림 표시 공통 함수
    async displayNotification(notification) {
        try {
            console.log('🔔 알림 표시:', notification);
            
            if (window.notificationSystem) {
                // 알림 표시
                await window.notificationSystem.showBrowserNotification(
                    notification.title || '🔔 새 알림',
                    notification.message,
                    {
                        notificationIcon: '🔔',
                        alertLevel: notification.priority === 'urgent' ? 'emergency' : 
                                  notification.priority === 'high' ? 'danger' : 'warning',
                        vibrate: [300, 100, 300, 100, 300],
                        requireInteraction: true,
                        tag: `notification-${notification.id}`,
                        data: { notificationId: notification.id }
                    }
                );
                
                // 알림음 재생
                window.notificationSystem.playNotificationSound('warning');
            }
            
            // Android 네이티브 알림도 표시
            if (window.AndroidBridge && window.AndroidBridge.showNotification) {
                console.log('📱 Android 네이티브 알림 표시');
                window.AndroidBridge.showNotification(
                    notification.title || '🔔 새 알림',
                    notification.message
                );
                
                // 진동
                if (window.AndroidBridge.vibrate) {
                    window.AndroidBridge.vibrate();
                }
            }
            
            // 알림 카운트 업데이트
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('❌ 알림 표시 실패:', error);
        }
    }
    
    // 알림 배지 업데이트
    async updateNotificationBadge() {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser || !storage?.supabase?.client) return;
            
            const { data, error } = await storage.supabase.client
                .from('notifications')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('is_read', false);
                
            if (!error && data) {
                const unreadCount = data.length;
                const badge = document.querySelector('.notification-badge');
                if (badge) {
                    badge.textContent = unreadCount > 0 ? unreadCount : '';
                    badge.style.display = unreadCount > 0 ? 'block' : 'none';
                }
            }
        } catch (error) {
            console.error('❌ 알림 배지 업데이트 실패:', error);
        }
    }

    // 친구 상태 확인 시작 (60분마다)
    startStatusCheck() {
        this.statusCheckInterval = setInterval(async () => {
            if (window.statusManager) {
                await statusManager.checkFriendsActivity();
            }
        }, 3600000); // 60분마다
    }

    // 온라인 상태 감지 설정
    setupOnlineStatusDetection() {
        window.addEventListener('online', async () => {
            const currentUser = auth.getCurrentUser();
            if (currentUser) {
                await storage.updateUserStatus(currentUser.username, 'active');
            }
        });

        window.addEventListener('offline', async () => {
            const currentUser = auth.getCurrentUser();
            if (currentUser) {
                await storage.updateUserStatus(currentUser.username, 'offline');
            }
        });
    }

    // 광고 배너 로드
    async loadAdvertisements() {
        try {
            if (!storage.supabase.client) return;

            // admin 테이블에서 광고 배너 조회
            const { data: ads, error } = await storage.supabase.client
                .from('admin_banners')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('광고 배너 로드 실패:', error);
                this.displayDefaultAds();
                return;
            }

            if (!ads || ads.length === 0) {
                this.displayDefaultAds();
                return;
            }

            // 카테고리별로 광고 분류
            const adsByCategory = {
                insurance: ads.filter(ad => ad.category === 'insurance'),
                funeral: ads.filter(ad => ad.category === 'funeral'),
                lawyer: ads.filter(ad => ad.category === 'lawyer')
            };

            this.displayAds(adsByCategory);

        } catch (error) {
            console.error('광고 로드 실패:', error);
            this.displayDefaultAds();
        }
    }

    // 기본 광고 배너 표시
    displayDefaultAds() {
        const defaultAds = {
            insurance: [
                { title: '생명보험', description: '든든한 생명보험으로 가족을 보호하세요', url: '#' },
                { title: '의료실비보험', description: '의료비 걱정 없는 실비보험', url: '#' }
            ],
            funeral: [
                { title: '상조서비스', description: '미리 준비하는 상조서비스', url: '#' },
                { title: '장례지도', description: '전문적인 장례 서비스', url: '#' }
            ],
            lawyer: [
                { title: '상속전문 변호사', description: '상속 관련 법률 상담', url: '#' },
                { title: '유언장 작성', description: '법적 효력있는 유언장 작성', url: '#' }
            ]
        };
        
        this.displayAds(defaultAds);
    }

    // 광고 배너 표시
    displayAds(adsByCategory) {
        const showTabContent = (category) => {
            const content = document.getElementById('ad-content');
            const ads = adsByCategory[category] || [];
            
            content.innerHTML = ads.map(ad => `
                <div class="ad-item" ${ad.url !== '#' ? `onclick="window.open('${ad.url}', '_blank')"` : ''}>
                    <h3>${ad.title}</h3>
                    <p>${ad.description}</p>
                </div>
            `).join('');
        };

        // 기본으로 보험 탭 표시
        showTabContent('insurance');

        // 탭 이벤트 설정
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                showTabContent(e.target.getAttribute('data-tab'));
            });
        });
    }

    // 알림 설정 로드 (로컬 저장소 사용)
    async loadNotificationSettings() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;

            let settings = {};
            
            // 먼저 Firebase에서 설정 로드 시도
            if (storage.isInitialized && window.firebaseClient) {
                try {
                    const userId = currentUser.kakao_id || currentUser.id;
                    const docRef = await window.firebaseClient.db
                        .collection('notification_settings')
                        .doc(userId)
                        .get();
                    
                    if (docRef.exists) {
                        settings = docRef.data();
                        console.log('✅ Firebase에서 알림 설정 로드 완료');
                    }
                } catch (dbError) {
                    console.log('⚠️ Firebase 로드 실패, 로컬 저장소 사용:', dbError);
                }
            }
            
            // 데이터베이스에서 로드하지 못했으면 로컬 저장소에서 로드
            if (Object.keys(settings).length === 0) {
                const settingsKey = `notification-settings-${currentUser.kakao_id}`;
                settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
                console.log('📱 로컬 저장소에서 알림 설정 로드');
            }

            // UI 업데이트
            if (settings) {
                const pushNotifications = document.getElementById('push-notifications');
                const friendNotifications = document.getElementById('friend-notifications');
                const warningNotifications = document.getElementById('warning-notifications');
                const dangerNotifications = document.getElementById('danger-notifications');
                const emergencyNotifications = document.getElementById('emergency-notifications');
                const autoReportNotifications = document.getElementById('auto-report-notifications');

                // 🚨 생명구조 우선 - 안전한 체크박스 상태 설정
                if (pushNotifications) pushNotifications.checked = settings.push_notifications !== false;
                if (friendNotifications) friendNotifications.checked = settings.friend_request_notifications !== false;
                if (warningNotifications) warningNotifications.checked = settings.heartbeat_warning_notifications !== false; // 기본값: true
                if (dangerNotifications) dangerNotifications.checked = settings.emergency_alert_notifications !== false; // 기본값: true
                if (emergencyNotifications) emergencyNotifications.checked = settings.system_message_notifications !== false;
                if (autoReportNotifications) autoReportNotifications.checked = settings.motion_alert_notifications !== false; // 이제 HTML에 존재함
                
                // 긴급 연락 동의는 별도 처리 (생명구조 기능)
                const emergencyConsent = document.getElementById('emergency-contact-consent');
                if (emergencyConsent) emergencyConsent.checked = settings.emergency_contact_consent !== false;
            }

            // 알림 설정 저장 이벤트 (안전한 처리)
            const saveButton = document.getElementById('save-notification-settings');
            if (saveButton) {
                // 기존 이벤트 리스너 제거 (중복 방지)
                saveButton.replaceWith(saveButton.cloneNode(true));
                const newSaveButton = document.getElementById('save-notification-settings');
                
                newSaveButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('🔄 알림 설정 저장 시작...');
                    try {
                        await this.saveNotificationSettings();
                        console.log('✅ 알림 설정 저장 완료');
                        this.showToast('✅ 설정이 저장되었습니다.', 'success');
                    } catch (error) {
                        console.error('❌ 알림 설정 저장 실패:', error);
                        this.showToast('❌ 설정 저장에 실패했습니다.', 'error');
                    }
                });
                
                console.log('✅ 알림 설정 저장 버튼 이벤트 등록 완료');
            } else {
                console.error('❌ 알림 설정 저장 버튼을 찾을 수 없습니다');
            }

            // 최근 알림 로드
            await this.loadRecentNotifications();
            
            // 시스템 상태 업데이트
            this.updateSystemStatus();

        } catch (error) {
            console.error('알림 설정 로드 실패:', error);
        }
    }

    // 알림 설정 저장 (NotificationsManager와 연동)
    async saveNotificationSettings() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;

            // 🚨 생명구조 우선 - 안전한 체크박스 접근 함수
            const safeGetChecked = (id) => {
                const element = document.getElementById(id);
                if (!element) {
                    console.warn(`⚠️ 체크박스 요소 없음: ${id}`);
                    return false; // 기본값: 비활성화
                }
                return element.checked;
            };

            const settings = {
                push_notifications: safeGetChecked('push-notifications'),
                friend_request_notifications: safeGetChecked('friend-notifications'),
                heartbeat_warning_notifications: safeGetChecked('warning-notifications'),
                emergency_alert_notifications: safeGetChecked('danger-notifications'),
                system_message_notifications: safeGetChecked('emergency-notifications'),
                motion_alert_notifications: safeGetChecked('auto-report-notifications'), // HTML에 없음 - false 반환됨
                // 🚨 긴급 연락 동의 (72시간 무응답 시 119, 112, 행정복지센터 자동 신고)
                emergency_contact_consent: safeGetChecked('emergency-contact-consent')
            };

            console.log('🔍 수집된 알림 설정:', settings);

            // Firebase에 알림 설정 저장 (UPDATE 또는 INSERT)
            if (storage.isInitialized && window.firebaseClient) {
                try {
                    const userId = currentUser.kakao_id || currentUser.id;
                    
                    // Firebase에서 사용자별 알림 설정 저장
                    const settingsData = {
                        user_id: userId,
                        ...settings,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    await window.firebaseClient.db
                        .collection('notification_settings')
                        .doc(userId)
                        .set(settingsData, { merge: true }); // merge: true로 기존 데이터 유지

                    console.log('✅ Firebase에 알림 설정 저장 완료');
                } catch (dbError) {
                    console.error('Firebase 저장 오류:', dbError);
                    console.log('⚠️ 로컬 저장소만 사용');
                }
            } else {
                console.log('⚠️ Firebase 클라이언트가 없음 - 로컬 저장소만 사용');
            }

            // 로컬 저장소에도 저장 (백업)
            const settingsKey = `notification-settings-${currentUser.kakao_id}`;
            localStorage.setItem(settingsKey, JSON.stringify(settings));

            // 🚨 긴급 연락 동의 상태를 사용자 프로필에도 업데이트
            if (settings.emergency_contact_consent !== undefined && storage?.updateUser) {
                try {
                    await storage.updateUser(currentUser.id, {
                        emergency_contact_consent: settings.emergency_contact_consent
                    });
                    console.log('✅ 사용자 프로필에 긴급 연락 동의 상태 업데이트 완료:', settings.emergency_contact_consent);
                } catch (profileError) {
                    console.warn('⚠️ 사용자 프로필 업데이트 실패:', profileError);
                }
            }

            // 성공 토스트 메시지 (더 명확하게)
            this.showToast('✅ 설정이 저장되었습니다.', 'success');

            console.log('🔔 알림 설정 업데이트 완료:', settings);

        } catch (error) {
            // 🚨 생명구조 우선 - 상세한 오류 로깅
            console.error('🚨 알림 설정 저장 실패 - 생명구조 기능 영향:', error);
            console.error('오류 스택:', error.stack);
            console.error('오류 타입:', error.name);
            console.error('오류 메시지:', error.message);
            
            // 사용자에게는 간단한 메시지만 표시
            this.showToast('❌ 설정 저장에 실패했습니다.', 'error');
            
            // 디버깅을 위한 DOM 상태 확인
            const debugInfo = {
                pushNotifications: !!document.getElementById('push-notifications'),
                friendNotifications: !!document.getElementById('friend-notifications'),
                warningNotifications: !!document.getElementById('warning-notifications'),
                dangerNotifications: !!document.getElementById('danger-notifications'),
                emergencyNotifications: !!document.getElementById('emergency-notifications'),
                autoReportNotifications: !!document.getElementById('auto-report-notifications'),
                emergencyContactConsent: !!document.getElementById('emergency-contact-consent')
            };
            console.log('🔍 체크박스 요소 존재 여부:', debugInfo);
        }
    }

    // 최근 알림 로드 (Firebase 버전)
    async loadRecentNotifications() {
        try {
            const currentUser = auth.getCurrentUser();
            const container = document.getElementById('recent-notifications-list');
            
            if (!currentUser) {
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">로그인이 필요합니다.</p>';
                }
                return;
            }

            if (!storage.isInitialized || !window.firebaseClient) {
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">데이터베이스에 연결 중...</p>';
                }
                return;
            }

            // Firebase에서 알림 데이터 조회 (인덱스 오류 방지를 위해 단순화)
            const userId = currentUser.kakao_id || currentUser.id;
            const querySnapshot = await window.firebaseClient.db.collection('notifications')
                .where('user_id', '==', userId)
                .limit(10)
                .get();

            const notifications = [];
            querySnapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });

            // 클라이언트 사이드에서 정렬 (created_at 기준 내림차순)
            notifications.sort((a, b) => {
                const aTime = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
                const bTime = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
                return bTime - aTime;
            });

            if (container) {
                if (notifications && notifications.length > 0) {
                    container.innerHTML = notifications.map(notification => `
                        <div class="notification-item ${notification.is_read ? '' : 'unread'}">
                            <div class="notification-content">
                                <div class="notification-message">${notification.message}</div>
                                <div class="notification-time">${this.getTimeAgo(notification.created_at)}</div>
                            </div>
                            <div class="notification-type">${this.getNotificationIcon(notification.type)}</div>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">최근 알림이 없습니다.</p>';
                }
            }

        } catch (error) {
            console.error('최근 알림 로드 실패:', error);
            const container = document.getElementById('recent-notifications-list');
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">알림을 불러오는데 실패했습니다.</p>';
            }
        }
    }

    // 프로필 데이터 로드
    async loadProfileData() {
        try {
            let currentUser = auth.getCurrentUser();
            if (!currentUser) return;

            console.log('👤 프로필 데이터 로드 시작, localStorage 사용자:', currentUser);
            
            // Firebase에서 최신 사용자 데이터 가져오기
            const userIdForLoad = currentUser.id; // Firebase document ID 사용
            console.log('🔑 Firebase에서 조회할 사용자 ID:', userIdForLoad);
            console.log('🔍 로드 전 currentUser 데이터:', {
                phone: currentUser.phone,
                emergencyContactPhone: currentUser.emergencyContactPhone,
                emergencyContactName: currentUser.emergencyContactName
            });
            
            if (storage && storage.isInitialized) {
                try {
                    const latestUserData = await storage.getUserByKakaoId(userIdForLoad);
                    if (latestUserData) {
                        // 기존 데이터와 Firebase 데이터 병합
                        currentUser = { ...currentUser, ...latestUserData };
                        console.log('✅ Firebase에서 최신 사용자 데이터 로드:', currentUser);
                        console.log('🔍 Firebase 로드 후 데이터:', {
                            phone: currentUser.phone,
                            emergencyContactPhone: currentUser.emergencyContactPhone,
                            emergencyContactName: currentUser.emergencyContactName,
                            profileImage: currentUser.profileImage ? 'Yes' : 'No'
                        });
                        // localStorage도 업데이트
                        storage.setCurrentUser(currentUser);
                    } else {
                        console.warn('⚠️ Firebase에 사용자 문서가 없습니다:', userIdForLoad);
                    }
                } catch (error) {
                    console.error('Firebase 사용자 조회 오류:', error);
                }
            }
            
            console.log('🔍 전체 사용자 객체 키:', Object.keys(currentUser));
            console.log('🔍 emergency_contact_phone (직접):', currentUser.emergency_contact_phone);
            console.log('🔍 emergency_contact_name (직접):', currentUser.emergency_contact_name);
            console.log('🔍 emergency_contact_1 (직접):', currentUser.emergency_contact_1);
            console.log('🔍 emergency_contact_2 (직접):', currentUser.emergency_contact_2);

            // medical_info JSONB 컬럼에서 추가 데이터 추출
            const medicalInfo = currentUser.medical_info || {};
            console.log('📋 의료정보 데이터:', medicalInfo);
            console.log('🔍 medical_info 전체 키:', Object.keys(medicalInfo));
            
            // medical_info 내부의 모든 키와 값을 출력
            Object.keys(medicalInfo).forEach(key => {
                if (key === 'memorial_pic') {
                    console.log(`📌 medical_info.${key}:`, medicalInfo[key]?.substring(0, 50) + '...');
                } else {
                    console.log(`📌 medical_info.${key}:`, medicalInfo[key]);
                }
            });
            
            // 앱에서 사용하는 가능한 필드명들 확인
            console.log('🔍 가능한 emergency 필드들:');
            console.log('  - emergency_contact_1:', medicalInfo.emergency_contact_1);
            console.log('  - emergency_contact1:', medicalInfo.emergency_contact1);
            console.log('  - emergencyContact1:', medicalInfo.emergencyContact1);
            console.log('  - emergency_phone1:', medicalInfo.emergency_phone1);
            console.log('  - emergency_name_1:', medicalInfo.emergency_name_1);
            console.log('  - emergency_name1:', medicalInfo.emergency_name1);
            console.log('  - emergencyName1:', medicalInfo.emergencyName1);

            // Firebase에서 저장된 필드들과 일치하도록 수정된 매핑
            const fieldMappings = {
                'profile-name': { source: 'direct', key: 'name' },
                'profile-phone': { source: 'direct', key: 'phone' },
                'profile-birth': { source: 'direct', key: 'birthDate' },
                'profile-gender': { source: 'direct', key: 'gender' },
                'profile-address': { source: 'direct', key: 'address' },
                'profile-detail-address': { source: 'direct', key: 'detailAddress' },
                'profile-postal': { source: 'direct', key: 'postal' },
                'emergency-contact1': { source: 'direct', key: 'emergencyContactPhone' },
                'emergency-name1': { source: 'direct', key: 'emergencyContactName' },
                'emergency-contact2': { source: 'direct', key: 'emergencyContact2' },
                'emergency-name2': { source: 'direct', key: 'emergencyName2' },
                'blood-type': { source: 'direct', key: 'bloodType' },
                'medical-conditions': { source: 'direct', key: 'medicalConditions' },
                'allergies': { source: 'direct', key: 'allergies' },
                'workplace': { source: 'direct', key: 'workplace' },
                'special-notes': { source: 'direct', key: 'specialNotes' }
            };

            // 각 필드에 사용자 데이터에서 값 설정
            Object.keys(fieldMappings).forEach(fieldId => {
                const element = document.getElementById(fieldId);
                const mapping = fieldMappings[fieldId];
                
                if (element) {
                    // 사용자 데이터에서 직접 가져오기
                    let value = currentUser[mapping.key];
                    
                    if (value !== null && value !== undefined && value !== '') {
                        element.value = value;
                        console.log(`✅ ${fieldId} 필드에 값 설정:`, value);
                    } else {
                        console.log(`⚠️ ${fieldId} 필드 데이터 없음: ${mapping.key} =`, value);
                    }
                }
            });

            // 프로필 사진 표시 (Firebase에서는 profile_image로 저장되고, profilePic으로 역매핑됨)
            // 우선순위: profilePic (역매핑된 데이터) → profile_image (Firebase 원본 데이터)
            const profilePicData = currentUser.profilePic || currentUser.profile_image || this.tempProfilePicData;
            console.log('🔍 프로필 사진 데이터 확인:', {
                'currentUser.profileImage': currentUser.profileImage ? 'found' : 'not found',
                'currentUser.profile_image': currentUser.profile_image ? 'found' : 'not found', 
                'currentUser.profilePic': currentUser.profilePic ? 'found' : 'not found',
                'final_profilePicData': profilePicData ? 'found' : 'not found'
            });
            
            // 프로필 사진 데이터 유효성 검증 (강화된 버전)
            const isValidImageData = (data) => {
                if (!data || typeof data !== 'string') {
                    console.log('❌ 이미지 데이터 유효성 검증 실패: 데이터 타입 오류');
                    return false;
                }
                if (data.length < 2000) { // 2KB 미만은 유효하지 않은 이미지로 판정 (더 엄격하게)
                    console.log('❌ 이미지 데이터 유효성 검증 실패: 크기 부족 (', (data.length / 1024).toFixed(2), 'KB < 2KB)');
                    return false;
                }
                if (!data.startsWith('data:image/')) {
                    console.log('❌ 이미지 데이터 유효성 검증 실패: 잘못된 data URL 형식');
                    return false;
                }
                console.log('✅ 이미지 데이터 유효성 검증 성공:', (data.length / 1024).toFixed(2), 'KB');
                return true;
            };
            
            if (profilePicData && isValidImageData(profilePicData)) {
                const profilePreview = document.getElementById('profile-pic-preview');
                const profilePlaceholder = document.getElementById('profile-pic-placeholder');
                console.log('🔍 프로필 이미지 DOM 요소:', {
                    'profilePreview': profilePreview ? 'found' : 'not found',
                    'profilePlaceholder': profilePlaceholder ? 'found' : 'not found'
                });
                
                if (profilePreview && profilePlaceholder) {
                    try {
                        // 이미지 로딩 실패 시 복구를 위한 onerror 핸들러
                        profilePreview.onerror = () => {
                            console.error('❌ 프로필 이미지 로딩 실패 - 플레이스홀더로 복구');
                            profilePreview.style.display = 'none';
                            profilePlaceholder.style.display = 'block';
                        };
                        
                        // 이미지 로딩 성공 시 onload 핸들러
                        profilePreview.onload = () => {
                            console.log('✅ 프로필 이미지 로딩 성공');
                            profilePreview.style.display = 'block';
                            profilePlaceholder.style.display = 'none';
                        };
                        
                        profilePreview.src = profilePicData;
                        console.log('📷 프로필 사진 표시 시작, 데이터 크기:', (profilePicData.length / 1024).toFixed(2), 'KB');
                    } catch (error) {
                        console.error('❌ 프로필 이미지 설정 중 오류:', error);
                        profilePreview.style.display = 'none';
                        profilePlaceholder.style.display = 'block';
                    }
                } else {
                    console.warn('⚠️ 프로필 사진 HTML 요소를 찾을 수 없음 - DOM 구조 확인 필요');
                }
            } else {
                console.warn('⚠️ 프로필 사진 데이터가 없거나 유효하지 않습니다. 크기:', profilePicData ? (profilePicData.length / 1024).toFixed(2) + 'KB' : '없음');
                
                // 🚨 생명구조 중요: 임시 데이터로 복구 시도
                if (this.tempProfilePicData && isValidImageData(this.tempProfilePicData)) {
                    console.log('🔄 임시 프로필 사진 데이터로 복구 시도...');
                    const profilePreview = document.getElementById('profile-pic-preview');
                    const profilePlaceholder = document.getElementById('profile-pic-placeholder');
                    if (profilePreview && profilePlaceholder) {
                        try {
                            profilePreview.src = this.tempProfilePicData;
                            profilePreview.style.display = 'block';
                            profilePlaceholder.style.display = 'none';
                            console.log('📷 임시 프로필 사진 데이터 복구 성공, 크기:', (this.tempProfilePicData.length / 1024).toFixed(2), 'KB');
                        } catch (error) {
                            console.error('❌ 임시 데이터로 복구 실패:', error);
                        }
                    }
                } else {
                    // 모든 데이터가 없는 경우 플레이스홀더 표시
                    const profilePreview = document.getElementById('profile-pic-preview');
                    const profilePlaceholder = document.getElementById('profile-pic-placeholder');
                    if (profilePreview && profilePlaceholder) {
                        profilePreview.style.display = 'none';
                        profilePlaceholder.style.display = 'block';
                        console.log('📷 프로필 사진 없음 - 플레이스홀더 표시');
                    }
                }
            }

            // 영정사진 표시 (Firebase에서는 memorial_pic으로 저장됨)  
            const memorialPicData = currentUser.memorial_pic || currentUser.memorialPic || medicalInfo.memorial_pic || medicalInfo.memorialPic;
            console.log('🔍 영정사진 데이터 확인:', {
                'currentUser.memorial_pic': currentUser.memorial_pic ? 'found' : 'not found',
                'currentUser.memorialPic': currentUser.memorialPic ? 'found' : 'not found',
                'medicalInfo.memorial_pic': medicalInfo.memorial_pic ? 'found' : 'not found',
                'medicalInfo.memorialPic': medicalInfo.memorialPic ? 'found' : 'not found'
            });
            if (memorialPicData) {
                const memorialPreview = document.getElementById('memorial-pic-preview');
                const memorialPlaceholder = document.getElementById('memorial-pic-placeholder');
                if (memorialPreview && memorialPlaceholder) {
                    memorialPreview.src = memorialPicData;
                    memorialPreview.style.display = 'block';
                    memorialPlaceholder.style.display = 'none';
                    console.log('🖼️ 영정사진 표시 완료');
                } else {
                    console.warn('⚠️ 영정사진 HTML 요소를 찾을 수 없음');
                }
            } else {
                console.warn('⚠️ 영정사진 데이터가 없습니다');
            }

            console.log('✅ 프로필 데이터 로드 완료');

        } catch (error) {
            console.error('❌ 프로필 데이터 로드 실패:', error);
        }
    }

    // 알림 아이콘 가져오기
    getNotificationIcon(type) {
        const icons = {
            'warning': '⚠️',
            'danger': '🟠',
            'emergency': '🚨',
            'info': '📢',
            'success': '✅'
        };
        return icons[type] || '📢';
    }

    // 시간 전 표시
    getTimeAgo(timestamp) {
        try {
            const now = new Date();
            const time = new Date(timestamp);
            const diffMs = now - time;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return '방금 전';
            if (diffMins < 60) return `${diffMins}분 전`;
            if (diffHours < 24) return `${diffHours}시간 전`;
            if (diffDays < 7) return `${diffDays}일 전`;
            return time.toLocaleDateString('ko-KR');
        } catch (error) {
            return '알 수 없음';
        }
    }

    // 스플래시 스크린 숨기기
    hideSplashScreen() {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.transition = 'opacity 0.5s ease-out';
            
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 500);
            
            console.log('스플래시 스크린 숨김');
        }
    }

    // 인증 화면 표시 (로그인되지 않은 경우)
    showAuthScreen() {
        console.log('🚪 로그인 화면으로 이동');
        
        // 메인 앱 숨기기
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            mainApp.classList.add('hidden');
            mainApp.classList.remove('show');
        }
        
        // 로그인 페이지 표시
        const loginPage = document.getElementById('login-page');
        if (loginPage) {
            loginPage.classList.remove('hidden');
            loginPage.classList.add('active');
        }
        
        // 네비게이션 바 숨기기
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = 'none';
        }
        
        // auth 객체를 통한 로그인 컨테이너 표시
        if (auth && typeof auth.showAuthContainer === 'function') {
            auth.showAuthContainer();
        }
        
        console.log('✅ 로그인 화면 표시 완료');
    }

    // Android 네이티브 카카오 로그인 핸들러 설정
    setupNativeKakaoHandler() {
        // Android 네이티브 카카오 로그인 성공 처리
        window.handleNativeKakaoSuccess = async (userData) => {
            console.log('Android 네이티브 카카오 로그인 성공:', userData);
            try {
                // AuthManager를 통한 로그인 처리
                if (auth) {
                    await auth.handleKakaoLoginSuccess({
                        id: userData.id,
                        nickname: userData.nickname || userData.name,
                        email: userData.email,
                        profile_image: userData.profile_image
                    });
                } else {
                    console.error('AuthManager가 초기화되지 않았습니다.');
                    alert('로그인 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                console.error('네이티브 로그인 성공 처리 오류:', error);
                alert('로그인 처리 중 오류가 발생했습니다: ' + error.message);
            }
        };
        
        console.log('Android 네이티브 카카오 로그인 핸들러 등록 완료');
    }

    // 초기 데이터 로드 (로그인 직후 + 앱 재시작)
    async loadInitialData() {
        // 중복 로드 방지
        if (this.isDataLoaded) {
            console.log('⚠️ 데이터가 이미 로드됨 - 중복 로드 방지');
            return;
        }
        
        try {
            console.log('📊 초기 데이터 로드 시작...');
            this.isDataLoaded = true; // 플래그 설정
            
            // 1. 친구 목록 로드 (기본 페이지)
            if (window.inviteCodeManager) {
                console.log('👥 친구 목록 로드 중...');
                await window.inviteCodeManager.loadCurrentFriends();
                console.log('✅ 친구 목록 로드 완료');
            }
            
            // 2. 초대코드 생성/로드
            if (window.inviteCodeManager) {
                console.log('🔑 초대코드 로드 중...');
                await window.inviteCodeManager.loadMyInviteCode();
                console.log('✅ 초대코드 로드 완료');
            }
            
            // 3. 프로필 데이터 로드
            console.log('👤 프로필 데이터 로드 중...');
            await this.loadProfileData();
            console.log('✅ 프로필 데이터 로드 완료');
            
            // 4. 친구 상태 데이터 로드
            if (window.friendStatusMonitor) {
                console.log('📊 친구 상태 데이터 로드 중...');
                await window.friendStatusMonitor.loadFriendsStatus();
                console.log('✅ 친구 상태 데이터 로드 완료');
            }
            
            console.log('🎉 초기 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ 초기 데이터 로드 실패:', error);
            this.isDataLoaded = false; // 실패 시 플래그 리셋
        }
    }
    
    // 데이터 로드 플래그 리셋 (로그아웃 시 호출)
    resetDataLoadFlag() {
        this.isDataLoaded = false;
        console.log('🔄 데이터 로드 플래그 리셋');
    }

    // 에러 표시
    showError(message) {
        if (auth) {
            auth.showNotification(message, 'error');
        } else {
            console.error(message);
        }
    }

    // 시스템 상태 업데이트 (에러 메시지 및 피드백 개선)
    updateSystemStatus() {
        try {
            const container = document.getElementById('system-status-content');
            if (!container) return;
            
            let statusHtml = '';
            let overallStatus = '✅ 정상';
            let statusColor = '#28a745';
            
            // 1. 로그인 상태
            const currentUser = auth?.getCurrentUser();
            if (currentUser) {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #28a745;">✅</span> 로그인: ${currentUser.name}
                    </div>
                `;
            } else {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #dc3545;">❌</span> 로그인 안 됨
                    </div>
                `;
                overallStatus = '❌ 오류';
                statusColor = '#dc3545';
            }
            
            // 2. 데이터베이스 연결
            if (storage?.supabase?.client) {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #28a745;">✅</span> 데이터베이스 연결
                    </div>
                `;
            } else {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #dc3545;">❌</span> 데이터베이스 연결 안 됨
                    </div>
                `;
                overallStatus = '❌ 오류';
                statusColor = '#dc3545';
            }
            
            // 3. 노티피케이션 권한 (WebView 환경 고려)
            let notificationPermission = 'granted'; // 기본값
            try {
                if ('Notification' in window) {
                    notificationPermission = Notification.permission;
                } else {
                    notificationPermission = 'webview'; // WebView 환경
                }
            } catch (error) {
                notificationPermission = 'webview'; // 오류 시 WebView로 간주
            }
            if (notificationPermission === 'granted') {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #28a745;">✅</span> 알림 권한 허용
                    </div>
                `;
            } else if (notificationPermission === 'webview') {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #17a2b8;">📱</span> WebView 환경 (네이티브 알림)
                    </div>
                `;
            } else if (notificationPermission === 'denied') {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #dc3545;">❌</span> 알림 권한 거부됨
                    </div>
                `;
                if (overallStatus === '✅ 정상') {
                    overallStatus = '⚠️ 주의';
                    statusColor = '#ffc107';
                }
            } else {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #ffc107;">⚠️</span> 알림 권한 미설정
                    </div>
                `;
                if (overallStatus === '✅ 정상') {
                    overallStatus = '⚠️ 주의';
                    statusColor = '#ffc107';
                }
            }
            
            // 4. 모션 디텍터
            if (window.motionDetector) {
                const motionStatus = window.motionDetector.getCurrentStatus();
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #28a745;">✅</span> 모션 디텍터: ${motionStatus.motionCount}회 (상태: ${motionStatus.status})
                    </div>
                `;
            } else {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #dc3545;">❌</span> 모션 디텍터 미초기화
                    </div>
                `;
                overallStatus = '❌ 오류';
                statusColor = '#dc3545';
            }
            
            // 5. 알림 매니저
            if (window.notificationsManager) {
                const settings = window.notificationsManager.getNotificationSettings();
                const enabledCount = Object.values(settings).filter(v => v === true).length;
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #28a745;">✅</span> 알림 매니저: ${enabledCount}개 활성화
                    </div>
                `;
            } else {
                statusHtml += `
                    <div style="font-size: 12px; margin: 5px 0;">
                        <span style="color: #dc3545;">❌</span> 알림 매니저 미초기화
                    </div>
                `;
                overallStatus = '❌ 오류';
                statusColor = '#dc3545';
            }
            
            // 전체 상태 표시
            statusHtml = `
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: ${statusColor};">
                    ${overallStatus}
                </div>
                ${statusHtml}
                <div style="font-size: 11px; color: #666; margin-top: 10px;">
                    마지막 업데이트: ${new Date().toLocaleTimeString()}
                </div>
            `;
            
            container.innerHTML = statusHtml;
            
            // 상단 테두리 색상 변경
            const statusDiv = document.getElementById('system-status');
            if (statusDiv) {
                statusDiv.style.borderLeftColor = statusColor;
                const title = statusDiv.querySelector('h4');
                if (title) title.style.color = statusColor;
            }
            
        } catch (error) {
            console.error('시스템 상태 업데이트 실패:', error);
            const container = document.getElementById('system-status-content');
            if (container) {
                container.innerHTML = `<p style="color: #dc3545; font-size: 12px;">시스템 상태 확인 실패: ${error.message}</p>`;
            }
        }
    }

    // 알림 권한 자동 요청 (긴급 추가!)
    async requestNotificationPermission() {
        try {
            console.log('🔔 알림 권한 요청 시작');
            
            // Android WebView에서는 Notification API가 없으므로 네이티브 알림으로 대체
            if (!('Notification' in window)) {
                console.warn('WebView 환경: 네이티브 알림 시스템 사용');
                auth.showNotification('네이티브 알림 시스템이 활성화되었습니다! 친구 상태 알림을 받을 수 있습니다.', 'success');
                
                // NotificationsManager가 있으면 WebView 모드로 설정
                if (window.notificationsManager) {
                    window.notificationsManager.isWebViewMode = true;
                    await window.notificationsManager.updateNotificationSetting('push_notifications', true);
                }
                
                return true; // WebView에서는 항상 허용된 것으로 간주
            }

            // 현재 권한 상태 확인
            let permission = Notification.permission;
            console.log('현재 알림 권한 상태:', permission);

            if (permission === 'default') {
                // 사용자에게 친화적인 안내 메시지 먼저 표시
                const userConsent = confirm('🔔 친구의 위급 상황을 알림으로 받으시겠습니다.\n\n24/48/72시간 무응답 시 알림을 보냅니다.\n\n알림을 허용하시겠습니까?');
                
                if (userConsent) {
                    // 사용자가 동의하면 권한 요청
                    permission = await Notification.requestPermission();
                    console.log('알림 권한 요청 결과:', permission);
                } else {
                    console.log('사용자가 알림 권한 요청을 거부함');
                    auth.showNotification('알림 설정에서 나중에 허용할 수 있습니다.', 'info');
                    return false;
                }
            }

            // 결과 처리
            if (permission === 'granted') {
                console.log('✅ 알림 권한 허용됨');
                auth.showNotification('알림이 허용되었습니다! 친구 상태 알림을 받을 수 있습니다.', 'success');
                
                // NotificationsManager가 있으면 알림 설정 업데이트
                if (window.notificationsManager) {
                    await window.notificationsManager.updateNotificationSetting('push_notifications', true);
                }
                
                // 테스트 알림 발송
                this.showWelcomeNotification();
                return true;
            } else if (permission === 'denied') {
                console.warn('❌ 알림 권한이 거부됨');
                auth.showNotification('알림이 차단되었습니다. 브라우저 설정에서 다시 허용해주세요.', 'warning');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 알림 권한 요청 실패:', error);
            return false;
        }
    }

    // 환영 알림 표시
    showWelcomeNotification() {
        try {
            const notification = new Notification('🎉 lonely-care 알림 활성화!', {
                body: '친구의 위급 상황을 알림으로 받을 수 있습니다.',
                icon: '/icon.png',
                badge: '/icon.png',
                vibrate: [200, 100, 200],
                tag: 'welcome-notification'
            });

            // 자동 닫기
            setTimeout(() => {
                notification.close();
            }, 5000);

            console.log('🎉 환영 알림 발송 성공');
        } catch (error) {
            console.error('❌ 환영 알림 발송 실패:', error);
        }
    }

    // 앱 종료시 정리
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
    }
    
    /**
     * 특정 페이지 캐시 무효화
     */
    invalidatePageCache(pageId) {
        switch(pageId) {
            case 'status':
                this.statusLastLoadTime = 0;
                this.pageLoadStates.status = false;
                console.log('🗑️ 상태 페이지 캐시 무효화');
                break;
            case 'friends':
                this.friendsLastLoadTime = 0;
                this.pageLoadStates.friends = false;
                console.log('🗑️ 친구 페이지 캐시 무효화');
                break;
            case 'ads':
                this.adsLastLoadTime = 0;
                this.pageLoadStates.ads = false;
                console.log('🗑️ 광고 페이지 캐시 무효화');
                break;
            case 'profile':
                this.profileLastLoadTime = 0;
                this.pageLoadStates.profile = false;
                console.log('🗑️ 프로필 페이지 캐시 무효화');
                break;
        }
    }
    
    /**
     * 모든 캐시 무효화 (새로고침 등)
     */
    invalidateAllCache() {
        this.statusLastLoadTime = 0;
        this.friendsLastLoadTime = 0;
        this.adsLastLoadTime = 0;
        this.profileLastLoadTime = 0;
        
        Object.keys(this.pageLoadStates).forEach(key => {
            this.pageLoadStates[key] = false;
        });
        
        console.log('🗑️ 모든 페이지 캐시 무효화');
    }
    
    /**
     * 강제 페이지 새로고침 (캐시 무시)
     */
    async forceRefreshPage(pageId) {
        console.log(`🔄 페이지 강제 새로고침: ${pageId}`);
        this.invalidatePageCache(pageId);
        await this.initializePage(pageId);
    }
}

// 전역 앱 매니저 인스턴스
let appManager;

// DOM 로드 완료시 앱 초기화 (중복 방지)
document.addEventListener('DOMContentLoaded', async () => {
    if (appManager) {
        console.log('⚠️ AppManager가 이미 초기화되어 있음, 중복 초기화 방지');
        return;
    }
    
    console.log('🚀 AppManager 초기화 시작');
    appManager = new AppManager();
    window.appManager = appManager; // 전역 접근 가능하도록 설정
    await appManager.init();
    
    // 🆕 Enhanced 컴포넌트 로더 동적 로드
    setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'components/core/component-loader.js';
        script.async = true;
        script.onload = () => {
            console.log('🎯 Enhanced Component System 활성화됨');
        };
        script.onerror = () => {
            console.log('📱 Enhanced Component System 없음 - 기본 모드 계속');
        };
        document.head.appendChild(script);
    }, 1000);
    
    // 🚨 생명구조 앱: 실시간 모니터링 시스템 초기화 (지연 로드)
    setTimeout(() => {
        console.log('🚨 [생명구조] 실시간 모니터링 시스템 초기화 시작');
        console.log('🔍 [생명구조] 현재 페이지 URL:', window.location.href);
        console.log('🔍 [생명구조] 현재 베이스 URL:', window.location.origin + window.location.pathname.replace(/[^/]*$/, ''));
        
        // 실시간 모니터링 시스템 로드 (강화된 환경 감지)
        const monitoringScript = document.createElement('script');
        
        // 🚨 생명구조 시스템: 절대적 WebView 감지 - CRITICAL FIX
        const currentProtocol = window.location.protocol;
        const currentHref = window.location.href;
        
        console.log('🔍 [Main] 🚨 CRITICAL 환경 감지:');
        console.log('  - 현재 URL:', currentHref);
        console.log('  - 프로토콜:', currentProtocol);
        console.log('  - AndroidBridge 존재:', !!window.AndroidBridge);
        console.log('  - UserAgent:', navigator.userAgent);
        
        let primaryPath;
        
        // ✅ file:// 프로토콜이면 무조건 WebView 경로 사용
        if (currentProtocol === 'file:') {
            primaryPath = './js/real-time-monitoring-system.js';
            console.log('📂 [Main] 🚨 file:// 프로토콜 감지 - WebView 경로 확정');
        }
        // ✅ AndroidBridge가 있으면 WebView 경로 사용
        else if (window.AndroidBridge) {
            primaryPath = './js/real-time-monitoring-system.js';
            console.log('📂 [Main] AndroidBridge 감지 - WebView 경로 확정');
        }
        // ✅ UserAgent에 wv가 있으면 WebView 경로 사용
        else if (navigator.userAgent.includes('wv')) {
            primaryPath = './js/real-time-monitoring-system.js';
            console.log('📂 [Main] UserAgent wv 감지 - WebView 경로 확정');
        }
        // 🌐 웹 브라우저 환경
        else {
            primaryPath = './js/real-time-monitoring-system.js';
            console.log('📂 [Main] 웹 브라우저 환경 감지 - 웹 경로 사용');
        }
        
        monitoringScript.src = primaryPath;
        console.log('📂 [생명구조] 최종 선택된 경로:', primaryPath);
        console.log('📂 [생명구조] 절대 URL:', new URL(primaryPath, window.location.href).href);
        monitoringScript.async = true;
        monitoringScript.onload = () => {
            console.log('✅ [생명구조] 실시간 모니터링 시스템 로드 완료');
            
            // 🚨 생명구조 시스템: 배터리 최적화 시스템 인라인 통합 (외부 파일 의존성 제거)
            if (!window.batteryOptimizationSystem) {
                console.log('🔋 [생명구조] 배터리 최적화 시스템 인라인 초기화 시작...');
                
                // 🔋 배터리 수명 최적화 시스템 - 인라인 통합
                class BatteryOptimizationSystem {
                    constructor() {
                        this.className = 'BatteryOptimizationSystem';
                        this.isInitialized = false;
                        this.batteryManager = null;
                        this.currentMode = 'normal'; // normal, power_save, critical
                        this.optimizationSettings = {
                            normal: {
                                heartbeatInterval: 30000,        // 30초
                                friendCheckInterval: 60000,      // 1분
                                uiUpdateInterval: 5000,          // 5초
                                locationUpdateInterval: 300000,  // 5분
                                enableAnimations: true,
                                enableAutoRefresh: true,
                                maxBackgroundTasks: 10
                            },
                            power_save: {
                                heartbeatInterval: 45000,        // 45초
                                friendCheckInterval: 120000,     // 2분
                                uiUpdateInterval: 10000,         // 10초
                                locationUpdateInterval: 600000,  // 10분
                                enableAnimations: false,
                                enableAutoRefresh: false,
                                maxBackgroundTasks: 5
                            },
                            critical: {
                                heartbeatInterval: 60000,        // 1분 (최소한 유지)
                                friendCheckInterval: 300000,     // 5분
                                uiUpdateInterval: 30000,         // 30초
                                locationUpdateInterval: 900000,  // 15분
                                enableAnimations: false,
                                enableAutoRefresh: false,
                                maxBackgroundTasks: 3
                            }
                        };
                        
                        // 중요한 기능들은 절대 차단하지 않음
                        this.criticalFeatures = [
                            'emergency_notifications',  // 응급 알림
                            'friend_status_alerts',     // 친구 상태 알림
                            'heartbeat_sender',         // 하트비트 전송
                            'motion_detection',         // 움직임 감지
                            'push_notifications'        // 푸시 알림
                        ];
                        
                        this.monitoringIntervals = new Map();
                        this.wakeLock = null;
                        this.lastOptimization = Date.now();
                        
                        console.log('🔋 [생명구조] 배터리 최적화 시스템 인라인 초기화');
                        this.init();
                    }
                    
                    async init() {
                        try {
                            console.log('🔄 [생명구조] 배터리 최적화 시스템 초기화 중...');
                            
                            await this.initBatteryAPI();
                            this.startBatteryMonitoring();
                            this.setupBackgroundOptimization();
                            this.protectCriticalFeatures();
                            this.startAdaptiveMonitoring();
                            await this.initWakeLock();
                            
                            this.isInitialized = true;
                            console.log('✅ [생명구조] 배터리 최적화 시스템 인라인 초기화 완료');
                            
                        } catch (error) {
                            console.error('❌ [생명구조] 배터리 최적화 시스템 초기화 실패:', error);
                            this.isInitialized = false;
                        }
                    }
                    
                    async initBatteryAPI() {
                        try {
                            if ('getBattery' in navigator) {
                                this.batteryManager = await navigator.getBattery();
                                console.log('✅ [생명구조] 배터리 API 초기화 완료');
                                
                                this.batteryManager.addEventListener('levelchange', () => {
                                    this.onBatteryLevelChange();
                                });
                                
                                this.batteryManager.addEventListener('chargingchange', () => {
                                    this.onChargingStateChange();
                                });
                                
                            } else if (window.AndroidBridge && window.AndroidBridge.getBatteryLevel) {
                                this.batteryManager = {
                                    level: await window.AndroidBridge.getBatteryLevel() / 100,
                                    charging: await window.AndroidBridge.isCharging()
                                };
                                console.log('✅ [생명구조] Android 배터리 API 초기화 완료');
                            } else {
                                console.warn('⚠️ [생명구조] 배터리 API 사용 불가 - 시뮬레이션 모드');
                                this.batteryManager = {
                                    level: 0.8, // 80%로 가정
                                    charging: false
                                };
                            }
                        } catch (error) {
                            console.error('❌ [생명구조] 배터리 API 초기화 실패:', error);
                            throw error;
                        }
                    }
                    
                    startBatteryMonitoring() {
                        setInterval(() => {
                            this.checkBatteryStatus();
                        }, 30000); // 30초마다 배터리 상태 확인
                        
                        console.log('🔄 [생명구조] 배터리 모니터링 시작');
                    }
                    
                    async checkBatteryStatus() {
                        try {
                            let batteryLevel = this.batteryManager?.level || 0.8;
                            let isCharging = this.batteryManager?.charging || false;
                            
                            if (window.AndroidBridge?.getBatteryLevel) {
                                batteryLevel = await window.AndroidBridge.getBatteryLevel() / 100;
                                isCharging = await window.AndroidBridge.isCharging();
                            }
                            
                            const previousMode = this.currentMode;
                            
                            if (isCharging) {
                                this.currentMode = 'normal';
                            } else if (batteryLevel <= 0.1) {
                                this.currentMode = 'critical';
                            } else if (batteryLevel <= 0.2) {
                                this.currentMode = 'power_save';
                            } else {
                                this.currentMode = 'normal';
                            }
                            
                            if (previousMode !== this.currentMode) {
                                console.log(`🔋 [생명구조] 배터리 모드 변경: ${previousMode} -> ${this.currentMode} (${Math.round(batteryLevel * 100)}%)`);
                                await this.applyOptimization();
                                this.notifyModeChange();
                            }
                            
                        } catch (error) {
                            console.error('❌ [생명구조] 배터리 상태 확인 실패:', error);
                        }
                    }
                    
                    onBatteryLevelChange() {
                        const level = Math.round(this.batteryManager.level * 100);
                        console.log(`🔋 [생명구조] 배터리 레벨 변경: ${level}%`);
                        this.checkBatteryStatus();
                    }
                    
                    onChargingStateChange() {
                        const isCharging = this.batteryManager.charging;
                        console.log(`🔌 [생명구조] 충전 상태 변경: ${isCharging ? '충전 중' : '방전 중'}`);
                        this.checkBatteryStatus();
                    }
                    
                    async applyOptimization() {
                        const settings = this.optimizationSettings[this.currentMode];
                        
                        try {
                            await this.adjustMonitoringIntervals(settings);
                            this.optimizeUI(settings);
                            this.limitBackgroundTasks(settings);
                            this.optimizeNetworkRequests(settings);
                            this.ensureCriticalFeatures();
                            
                            console.log(`✅ [생명구조] ${this.currentMode} 모드 최적화 적용 완료`);
                            
                        } catch (error) {
                            console.error('❌ [생명구조] 최적화 적용 실패:', error);
                        }
                    }
                    
                    async adjustMonitoringIntervals(settings) {
                        if (window.motionDetector && this.currentMode === 'critical') {
                            const heartbeatInterval = Math.min(settings.heartbeatInterval, 60000);
                            window.motionDetector.updateHeartbeatInterval?.(heartbeatInterval);
                            console.log(`🔋 [생명구조] 하트비트 주기 조정: ${heartbeatInterval}ms`);
                        }
                        
                        if (window.friendStatusMonitor && this.currentMode === 'critical') {
                            const friendCheckInterval = Math.min(settings.friendCheckInterval, 300000);
                            window.friendStatusMonitor.updateCheckInterval?.(friendCheckInterval);
                            console.log(`🔋 [생명구조] 친구 상태 확인 주기 조정: ${friendCheckInterval}ms`);
                        }
                        
                        if (window.uiUpdateManager) {
                            window.uiUpdateManager.setUpdateInterval?.(settings.uiUpdateInterval);
                        }
                    }
                    
                    optimizeUI(settings) {
                        if (!settings.enableAnimations) {
                            document.body.style.setProperty('--animation-duration', '0s');
                            document.body.classList.add('reduced-motion');
                        } else {
                            document.body.style.removeProperty('--animation-duration');
                            document.body.classList.remove('reduced-motion');
                        }
                        
                        if (!settings.enableAutoRefresh) {
                            if (window.autoRefreshManager) {
                                window.autoRefreshManager.pause?.();
                            }
                        } else {
                            if (window.autoRefreshManager) {
                                window.autoRefreshManager.resume?.();
                            }
                        }
                        
                        if (window.AndroidBridge?.setBrightness && this.currentMode === 'critical') {
                            window.AndroidBridge.setBrightness(0.3); // 30%로 감소
                        }
                    }
                    
                    limitBackgroundTasks(settings) {
                        if (window.backgroundTaskManager) {
                            window.backgroundTaskManager.setMaxConcurrentTasks?.(settings.maxBackgroundTasks);
                        }
                        
                        if (this.currentMode === 'critical') {
                            if (window.imagePreloader) {
                                window.imagePreloader.pause?.();
                            }
                            
                            if (window.analyticsManager) {
                                window.analyticsManager.pause?.();
                            }
                        }
                    }
                    
                    optimizeNetworkRequests(settings) {
                        if (this.currentMode === 'critical') {
                            if (window.dataSync) {
                                window.dataSync.setMode?.('essential_only');
                            }
                            
                            if (window.imageOptimizer) {
                                window.imageOptimizer.setQuality?.(0.7); // 70% 품질
                            }
                        } else {
                            if (window.dataSync) {
                                window.dataSync.setMode?.('normal');
                            }
                            
                            if (window.imageOptimizer) {
                                window.imageOptimizer.setQuality?.(1.0); // 100% 품질
                            }
                        }
                    }
                    
                    ensureCriticalFeatures() {
                        if (window.notificationsManager) {
                            window.notificationsManager.ensureActive?.();
                        }
                        
                        if (window.firebaseMessagingManager) {
                            window.firebaseMessagingManager.ensureActive?.();
                        }
                        
                        if (window.motionDetector) {
                            window.motionDetector.ensureActive?.();
                        }
                        
                        console.log('🛡️ [생명구조] 중요 기능 보장 확인 완료');
                    }
                    
                    setupBackgroundOptimization() {
                        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.controller.postMessage({
                                type: 'BATTERY_OPTIMIZATION_INIT',
                                mode: this.currentMode
                            });
                        }
                        
                        document.addEventListener('visibilitychange', () => {
                            if (document.hidden) {
                                this.enterBackgroundMode();
                            } else {
                                this.exitBackgroundMode();
                            }
                        });
                    }
                    
                    enterBackgroundMode() {
                        console.log('📱 [생명구조] 백그라운드 모드 진입 - 최적화 적용');
                        
                        if (window.uiUpdateManager) {
                            window.uiUpdateManager.enterBackgroundMode?.();
                        }
                        
                        this.pauseNonCriticalTimers();
                        this.maintainCriticalBackgroundTasks();
                    }
                    
                    exitBackgroundMode() {
                        console.log('📱 [생명구조] 포그라운드 모드 복귀 - 최적화 해제');
                        
                        if (window.uiUpdateManager) {
                            window.uiUpdateManager.exitBackgroundMode?.();
                        }
                        
                        this.resumeNonCriticalTimers();
                    }
                    
                    pauseNonCriticalTimers() {
                        if (window.animationManager) {
                            window.animationManager.pauseAll?.();
                        }
                        
                        if (window.autoSaveManager) {
                            window.autoSaveManager.extendInterval?.();
                        }
                    }
                    
                    resumeNonCriticalTimers() {
                        if (window.animationManager) {
                            window.animationManager.resumeAll?.();
                        }
                        
                        if (window.autoSaveManager) {
                            window.autoSaveManager.restoreInterval?.();
                        }
                    }
                    
                    maintainCriticalBackgroundTasks() {
                        if (window.motionDetector) {
                            window.motionDetector.maintainHeartbeat?.();
                        }
                        
                        if (window.friendStatusMonitor) {
                            window.friendStatusMonitor.maintainMonitoring?.();
                        }
                        
                        if (window.notificationsManager) {
                            window.notificationsManager.maintainNotifications?.();
                        }
                    }
                    
                    async initWakeLock() {
                        try {
                            if ('wakeLock' in navigator) {
                                console.log('✅ [생명구조] Wake Lock API 사용 가능');
                            } else {
                                console.warn('⚠️ [생명구조] Wake Lock API 사용 불가');
                            }
                        } catch (error) {
                            console.error('❌ [생명구조] Wake Lock 초기화 실패:', error);
                        }
                    }
                    
                    async activateEmergencyWakeLock() {
                        try {
                            if ('wakeLock' in navigator && !this.wakeLock) {
                                this.wakeLock = await navigator.wakeLock.request('screen');
                                console.log('🚨 [생명구조] 응급상황 Wake Lock 활성화');
                                
                                this.wakeLock.addEventListener('release', () => {
                                    console.log('🚨 [생명구조] Wake Lock 해제됨');
                                    this.wakeLock = null;
                                });
                            }
                        } catch (error) {
                            console.error('❌ [생명구조] Wake Lock 활성화 실패:', error);
                        }
                    }
                    
                    async releaseWakeLock() {
                        try {
                            if (this.wakeLock) {
                                await this.wakeLock.release();
                                this.wakeLock = null;
                                console.log('✅ [생명구조] Wake Lock 해제 완료');
                            }
                        } catch (error) {
                            console.error('❌ [생명구조] Wake Lock 해제 실패:', error);
                        }
                    }
                    
                    protectCriticalFeatures() {
                        this.criticalFeatures.forEach(feature => {
                            if (window[feature]) {
                                window[feature]._protected = true;
                                window[feature]._batteryOptimizationExempt = true;
                            }
                        });
                        
                        console.log('🛡️ [생명구조] 중요 기능 보호 설정 완료');
                    }
                    
                    startAdaptiveMonitoring() {
                        setInterval(() => {
                            this.analyzeUsagePattern();
                        }, 300000); // 5분마다 분석
                        
                        console.log('🧠 [생명구조] 적응형 모니터링 시작');
                    }
                    
                    analyzeUsagePattern() {
                        try {
                            const now = Date.now();
                            const hourOfDay = new Date().getHours();
                            
                            if (hourOfDay >= 22 || hourOfDay <= 6) {
                                if (this.currentMode === 'normal') {
                                    this.applyNightTimeOptimization();
                                }
                            }
                            
                            this.analyzeUserActivity();
                            
                        } catch (error) {
                            console.error('❌ [생명구조] 사용 패턴 분석 실패:', error);
                        }
                    }
                    
                    applyNightTimeOptimization() {
                        console.log('🌙 [생명구조] 야간 시간 최적화 적용');
                        
                        if (window.AndroidBridge?.setBrightness) {
                            window.AndroidBridge.setBrightness(0.1); // 10%로 감소
                        }
                        
                        if (window.uiUpdateManager) {
                            window.uiUpdateManager.setNightMode?.(true);
                        }
                        
                        this.ensureCriticalFeatures();
                    }
                    
                    analyzeUserActivity() {
                        const lastActivity = localStorage.getItem('lastUserActivity');
                        const now = Date.now();
                        
                        if (lastActivity) {
                            const timeSinceActivity = now - parseInt(lastActivity);
                            
                            if (timeSinceActivity > 1800000 && this.currentMode === 'normal') {
                                console.log('😴 [생명구조] 사용자 비활성 감지 - 절전 모드 고려');
                                this.applyInactivityOptimization();
                            }
                        }
                    }
                    
                    applyInactivityOptimization() {
                        if (window.uiUpdateManager) {
                            window.uiUpdateManager.setInactiveMode?.(true);
                        }
                        
                        if (window.backgroundSync) {
                            window.backgroundSync.defer?.();
                        }
                    }
                    
                    notifyModeChange() {
                        const modeNames = {
                            normal: '일반 모드',
                            power_save: '절전 모드',
                            critical: '극한 절전 모드'
                        };
                        
                        const message = `🔋 배터리 최적화: ${modeNames[this.currentMode]}로 전환`;
                        
                        if (this.currentMode === 'critical') {
                            if (window.notificationsManager) {
                                window.notificationsManager.showBrowserNotification?.(
                                    '🔋 배터리 절약 모드',
                                    '배터리가 부족합니다. 생명구조 기능은 계속 작동합니다.',
                                    { icon: '/icon.png', tag: 'battery-mode' }
                                );
                            }
                        }
                        
                        console.log(`🔋 [생명구조] ${message}`);
                    }
                    
                    getCurrentStatus() {
                        return {
                            mode: this.currentMode,
                            batteryLevel: this.batteryManager?.level || 0,
                            isCharging: this.batteryManager?.charging || false,
                            settings: this.optimizationSettings[this.currentMode],
                            lastOptimization: this.lastOptimization,
                            wakeLockActive: !!this.wakeLock,
                            criticalFeaturesProtected: this.criticalFeatures.length
                        };
                    }
                    
                    async optimizeNow() {
                        console.log('🔋 [생명구조] 수동 최적화 실행');
                        await this.checkBatteryStatus();
                        return this.getCurrentStatus();
                    }
                    
                    async activateEmergencyMode() {
                        console.log('🚨 [생명구조] 긴급 상황 - 최대 성능 모드 활성화');
                        
                        this.currentMode = 'normal';
                        await this.applyOptimization();
                        await this.activateEmergencyWakeLock();
                        this.ensureCriticalFeatures();
                        
                        setTimeout(() => {
                            this.checkBatteryStatus();
                        }, 1800000); // 30분
                    }
                }
                
                // 전역 인스턴스 생성
                window.batteryOptimizationSystem = new BatteryOptimizationSystem();
                
                // 사용자 활동 추적 (배터리 최적화 참고용)
                document.addEventListener('click', () => {
                    localStorage.setItem('lastUserActivity', Date.now().toString());
                });
                
                document.addEventListener('touchstart', () => {
                    localStorage.setItem('lastUserActivity', Date.now().toString());
                });
                
                // CSS 최적화 추가
                const batteryOptimizationStyles = document.createElement('style');
                batteryOptimizationStyles.textContent = `
                    .reduced-motion * {
                        animation-duration: 0s !important;
                        transition-duration: 0s !important;
                    }
                    
                    .battery-save-indicator {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: #ff9800;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        z-index: 10000;
                        display: none;
                    }
                    
                    .battery-save-indicator.critical {
                        background: #f44336;
                        animation: pulse 2s infinite;
                    }
                    
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                `;
                
                document.head.appendChild(batteryOptimizationStyles);
                
                console.log('🔋 [생명구조] 배터리 최적화 시스템 인라인 로드 완료 - 외부 파일 의존성 제거');
                
                // 긴급상황 대비 배터리 최적화 시작
                setTimeout(() => {
                    if (window.batteryOptimizationSystem.optimizeNow) {
                        window.batteryOptimizationSystem.optimizeNow().then(() => {
                            console.log('🔋 [생명구조] 배터리 최적화 초기 실행 완료');
                        }).catch(err => {
                            console.warn('⚠️ [생명구조] 배터리 최적화 초기 실행 실패:', err);
                        });
                    }
                }, 1000);
                
            } else {
                console.log('✅ [생명구조] 배터리 최적화 시스템 이미 로드됨');
            }
            
            // 119 API 클라이언트는 이미 로드됨 (콘솔 로그 확인)
            console.log('✅ [생명구조] 119 API 클라이언트 이미 로드됨 - window.api119Client:', !!window.api119Client);
            console.log('🚨 [생명구조] 모든 생명구조 시스템 로드 완료');
        };
        monitoringScript.onerror = () => {
            console.warn('⚠️ [생명구조] 실시간 모니터링 시스템 주 경로 로드 실패 - 대체 경로로 재시도');
            
            // 대체 경로로 재시도 (반대 경로 시도)
            const fallbackScript = document.createElement('script');
            const fallbackPath = isWebView ? './js/real-time-monitoring-system.js' : '../js/real-time-monitoring-system.js';
            fallbackScript.src = fallbackPath;
            console.log('📂 [생명구조] 시도하는 대체 경로:', fallbackPath);
            console.log('📂 [생명구조] 대체 완전 URL:', new URL(fallbackPath, window.location.href).href);
            fallbackScript.async = true;
            fallbackScript.onload = () => {
                console.log('✅ [생명구조] 실시간 모니터링 시스템 대체 경로로 로드 완료');
            };
            fallbackScript.onerror = () => {
                console.error('❌ [생명구조] 실시간 모니터링 시스템 모든 경로 로드 실패');
                console.error('🔍 [생명구조] 시도한 경로들:');
                console.error('  1. 주 경로:', new URL(primaryPath, window.location.href).href);
                console.error('  2. 대체 경로:', new URL(fallbackPath, window.location.href).href);
                console.error('💡 [생명구조] 기본 기능만으로 계속 진행합니다');
            };
            document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(monitoringScript);
    }, 2000); // 2초 지연으로 다른 시스템이 완전히 로드된 후 시작
});

// 페이지 언로드시 정리
window.addEventListener('beforeunload', () => {
    if (appManager) {
        appManager.cleanup();
    }
    
    // 실시간 시간 관리자 정리
    if (window.realTimeStatusManager) {
        window.realTimeStatusManager.cleanup();
    }
    
    // 🚨 생명구조 앱: 실시간 모니터링 시스템 정리
    if (window.realTimeMonitoringSystem) {
        console.log('🛑 [생명구조] 실시간 모니터링 시스템 종료');
        window.realTimeMonitoringSystem.stop();
    }
    
    // 배터리 최적화 시스템 정리
    if (window.batteryOptimizationSystem) {
        console.log('🔋 [생명구조] 배터리 최적화 시스템 종료');
        window.batteryOptimizationSystem.stop();
    }
});