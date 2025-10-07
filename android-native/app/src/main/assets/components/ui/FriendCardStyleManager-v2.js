/**
 * 친구 카드 스타일 관리자 - 일관성 보장 시스템
 * 
 * 주요 기능:
 * 1. 친구 카드의 일관된 스타일 적용
 * 2. 이미지/전화 버튼 강제 숨김
 * 3. 동적 스타일 조정 및 유지
 * 4. 기존 시스템과의 안전한 통합
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class FriendCardStyleManager {
    constructor() {
        this.className = 'FriendCardStyleManager';
        this.isInitialized = false;
        this.styleObserver = null;
        this.cssInjected = false;
        this.cacheVersion = 'v13.5.1-final-fix-' + Date.now(); // 캐시 무효화
        
        console.log('🎨 [생명구조] 친구 카드 스타일 관리자 초기화 - ' + this.cacheVersion);
        
        // 🚨 즉시 WebView 환경 확인 (생성자에서 바로 실행)
        this.isWebViewEnvironment = this.detectWebViewEnvironment();
        console.log('🔍 [생명구조] 🚨 IMMEDIATE WebView 감지 결과:', this.isWebViewEnvironment);
        
        // 시스템 복구 메커니즘 초기화
        this.initializeSystemRecovery();
        
        this.init();
    }

    /**
     * 🚨 WebView 환경 즉시 감지 (절대 실패하지 않는 감지)
     */
    detectWebViewEnvironment() {
        // 1차: URL 프로토콜 확인 (가장 확실한 방법)
        if (window.location.protocol === 'file:') {
            console.log('🚨 [생명구조] file:// 프로토콜 확정 - WebView 100% 확실');
            return true;
        }
        
        // 2차: URL href 확인
        if (window.location.href.includes('android_asset')) {
            console.log('🚨 [생명구조] android_asset 경로 확정 - WebView 100% 확실');
            return true;
        }
        
        // 3차: AndroidBridge 확인
        if (window.AndroidBridge) {
            console.log('🚨 [생명구조] AndroidBridge 확정 - WebView 100% 확실');
            return true;
        }
        
        // 4차: UserAgent 확인
        if (navigator.userAgent && navigator.userAgent.includes('wv')) {
            console.log('🚨 [생명구조] UserAgent wv 확정 - WebView 100% 확실');
            return true;
        }
        
        console.log('🌐 [생명구조] 웹 브라우저 환경으로 판단');
        return false;
    }

    /**
     * 초기화
     */
    async init() {
        try {
            if (this.isInitialized) return;
            
            // CSS 주입
            await this.injectConsistencyCSS();
            
            // DOM 감시 시작
            this.startDOMObserver();
            
            // 기존 친구 카드 정리
            this.cleanupExistingCards();
            
            // 주기적 점검 시작
            this.startPeriodicCheck();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 친구 카드 스타일 관리자 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 친구 카드 스타일 관리자 초기화 실패:', error);
        }
    }

    /**
     * 🚨 CSS 주입 (fetch 절대 금지 - WebView 완전 호환)
     */
    async injectConsistencyCSS() {
        try {
            if (this.cssInjected) return;
            
            console.log('🔍 [생명구조] 🚨 CSS 주입 시작 - WebView 상태:', this.isWebViewEnvironment);
            
            // 🚨 WebView에서는 절대로 fetch 시도하지 않음
            if (this.isWebViewEnvironment) {
                console.log('📱 [생명구조] 🚨 WebView 확정 - 인라인 CSS 직접 사용 (fetch 완전 차단)');
                
                const cssContent = this.getInlineCSS();
                this.injectCSSDirectly(cssContent, 'WebView-Inline');
                
                this.cssInjected = true;
                console.log('✅ [생명구조] WebView 인라인 CSS 주입 완료 - fetch 우회 성공');
                return; // 즉시 종료
            }
            
            // 🌐 웹 브라우저에서도 인라인 CSS 직접 사용 (fetch 오류 방지)
            console.log('🌐 [생명구조] 웹 브라우저 환경 - 인라인 CSS 직접 사용');
            
            const cssContent = this.getInlineCSS();
            this.injectCSSDirectly(cssContent, 'Web-Inline');
            this.cssInjected = true;
            console.log('✅ [생명구조] 웹 브라우저 CSS 주입 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] CSS 주입 실패:', error);
            // 실패 시 최종 안전장치
            try {
                const fallbackCSS = this.getInlineCSS();
                this.injectCSSDirectly(fallbackCSS, 'Fallback');
                this.cssInjected = true;
                console.log('✅ [생명구조] 폴백 CSS 주입 완료');
            } catch (fallbackError) {
                console.error('❌ [생명구조] 폴백 CSS 주입도 실패:', fallbackError);
            }
        }
    }

    /**
     * CSS 직접 주입 (공통 로직)
     */
    injectCSSDirectly(cssContent, source) {
        console.log('💉 [생명구조] CSS 직접 주입 시작 - 소스:', source);
        
        // 기존 스타일 요소 제거 (중복 방지)
        const existingStyle = document.getElementById('senior-friendly-styles');
        if (existingStyle) {
            existingStyle.remove();
            console.log('🗑️ [생명구조] 기존 CSS 제거됨');
        }
        
        // 새 스타일 요소 생성
        const styleElement = document.createElement('style');
        styleElement.id = 'senior-friendly-styles';
        styleElement.setAttribute('data-source', source);
        styleElement.setAttribute('data-version', this.cacheVersion);
        styleElement.textContent = cssContent;
        
        // 헤드에 추가 (최고 우선순위)
        document.head.appendChild(styleElement);
        
        console.log('✅ [생명구조] CSS 직접 주입 완료 - 길이:', cssContent.length, '문자');
    }

    /**
     * 노인 친화적 인라인 CSS 반환 (폴백)
     */
    getInlineCSS() {
        return `
            /* 👴👵 노인 친화적 친구 카드 기본 구조 */
            .friend-card {
                display: flex !important;
                flex-direction: column !important;
                border: 2px solid #333 !important;
                border-radius: 12px !important;
                padding: 24px !important;
                margin-bottom: 20px !important;
                background: white !important;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
                min-height: 180px !important;
                max-height: 220px !important;
                width: 100% !important;
                justify-content: space-between !important;
                align-items: stretch !important;
            }
            
            /* 이미지 완전 숨김 */
            .friend-card img,
            .friend-card .friend-image,
            .friend-card .friend-photo,
            .friend-card .profile-image,
            .friend-card [class*="image"],
            .friend-card [class*="photo"],
            .friend-card [class*="avatar"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            
            /* 전화 버튼 완전 숨김 */
            .friend-card .call-btn,
            .friend-card .phone-btn,
            .friend-card [class*="call"],
            .friend-card [class*="phone"],
            .friend-card button[onclick*="call"],
            .friend-card button[onclick*="phone"],
            .friend-card a[href^="tel:"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            
            /* 👴👵 노인 친화적 헤더 */
            .friend-card-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: 16px !important;
                min-height: 36px !important;
                border-bottom: 1px solid #ddd !important;
                padding-bottom: 12px !important;
            }
            
            .friend-name {
                font-size: 22px !important;
                font-weight: 700 !important;
                color: #111 !important;
                margin: 0 !important;
                padding: 0 !important;
                flex: 1 !important;
                text-align: left !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 65% !important;
            }
            
            .friend-status {
                font-size: 18px !important;
                font-weight: bold !important;
                margin: 0 !important;
                padding: 8px 12px !important;
                border-radius: 8px !important;
                background: rgba(255, 255, 255, 0.9) !important;
                border: 1px solid #ccc !important;
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                min-width: 100px !important;
            }
            
            /* 👴👵 노인 친화적 정보 섹션 */
            .friend-card-info {
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                margin-bottom: 16px !important;
                flex: 1 !important;
                background: #f8f9fa !important;
                padding: 16px !important;
                border-radius: 8px !important;
                border: 1px solid #e0e0e0 !important;
            }
            
            .friend-email {
                font-size: 18px !important;
                font-weight: 500 !important;
                color: #222 !important;
                margin: 0 !important;
                padding: 8px 12px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                background: white !important;
                border-radius: 4px !important;
                border: 1px solid #ddd !important;
            }
            
            .friend-email::before {
                content: "📧 ";
                font-size: 16px !important;
                margin-right: 4px !important;
            }
            
            .friend-time {
                font-size: 18px !important;
                font-weight: 500 !important;
                color: #333 !important;
                font-style: normal !important;
                margin: 0 !important;
                padding: 8px 12px !important;
                background: #fff3cd !important;
                border-radius: 4px !important;
                border: 1px solid #ffeaa7 !important;
            }
            
            .friend-time::before {
                content: "🕐 ";
                font-size: 16px !important;
                margin-right: 4px !important;
            }
            
            /* 👴👵 노인 친화적 액션 */
            .friend-card-actions {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                gap: 12px !important;
                margin-top: auto !important;
                min-height: 50px !important;
                border-top: 1px solid #ddd !important;
                padding-top: 16px !important;
            }
            
            .delete-friend-btn {
                background-color: #dc3545 !important;
                color: white !important;
                border: 2px solid #c82333 !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                min-width: 120px !important;
                height: 44px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3) !important;
            }
            
            .delete-friend-btn::before {
                content: "🗑️ ";
                font-size: 14px !important;
                margin-right: 6px !important;
            }
            
            .delete-friend-btn:hover {
                background-color: #c82333 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px rgba(220, 53, 69, 0.4) !important;
                border-color: #a71e2a !important;
            }
        `;
    }

    /**
     * DOM 감시 시작 (강화된 오류 처리 및 복구 메커니즘)
     */
    startDOMObserver() {
        try {
            // DOM 준비 상태 확인
            if (!document || !document.getElementById) {
                console.warn('⚠️ [생명구조] DOM 아직 준비되지 않음, 지연 시도');
                setTimeout(() => this.startDOMObserver(), 1000);
                return;
            }

            const friendsList = document.getElementById('current-friends-list');
            if (!friendsList) {
                console.warn('⚠️ [생명구조] 친구 목록 요소를 찾을 수 없음, 대체 방법 시도');
                
                // 대체 방법: 다른 선택자로 시도
                const alternativeSelectors = [
                    '#friends-list',
                    '.friends-container',
                    '[data-friends-list]',
                    '.friend-card'
                ];
                
                let targetElement = null;
                for (const selector of alternativeSelectors) {
                    try {
                        targetElement = document.querySelector(selector);
                        if (targetElement) {
                            console.log(`✅ [생명구조] 대체 요소 발견: ${selector}`);
                            break;
                        }
                    } catch (selectorError) {
                        console.warn(`⚠️ [생명구조] 선택자 ${selector} 실패:`, selectorError);
                    }
                }
                
                if (!targetElement) {
                    console.warn('⚠️ [생명구조] 모든 대체 요소 검색 실패, 재시도 예약');
                    // 5초 후 재시도
                    setTimeout(() => this.startDOMObserver(), 5000);
                    return;
                }
                
                // 대체 요소를 사용하되, 상위 요소를 감시 대상으로 설정
                friendsList = targetElement.closest('div') || targetElement.parentElement || targetElement;
            }
            
            // 기존 Observer 정리
            if (this.styleObserver) {
                try {
                    this.styleObserver.disconnect();
                } catch (disconnectError) {
                    console.warn('⚠️ [생명구조] 기존 Observer 정리 실패:', disconnectError);
                }
                this.styleObserver = null;
            }
            
            // MutationObserver 지원 확인
            if (!window.MutationObserver) {
                console.warn('⚠️ [생명구조] MutationObserver 미지원, 대체 감시 방법 사용');
                this.startFallbackObserver();
                return;
            }
            
            // 강화된 Mutation Observer 설정
            this.styleObserver = new MutationObserver((mutations) => {
                try {
                    let shouldCleanup = false;
                    let cleanupTargets = new Set();
                    
                    mutations.forEach((mutation) => {
                        try {
                            if (mutation.type === 'childList') {
                                // 새로운 친구 카드가 추가된 경우
                                mutation.addedNodes.forEach((node) => {
                                    try {
                                        if (node.nodeType === Node.ELEMENT_NODE) {
                                            // 직접 친구 카드인지 확인
                                            if (node.classList?.contains('friend-card')) {
                                                shouldCleanup = true;
                                                cleanupTargets.add(node);
                                            }
                                            // 하위에 친구 카드가 있는지 확인
                                            else if (node.querySelector) {
                                                const nestedCards = node.querySelectorAll('.friend-card');
                                                if (nestedCards.length > 0) {
                                                    shouldCleanup = true;
                                                    nestedCards.forEach(card => cleanupTargets.add(card));
                                                }
                                            }
                                        }
                                    } catch (nodeError) {
                                        console.warn('⚠️ [생명구조] 노드 처리 실패:', nodeError);
                                    }
                                });
                            }
                            
                            if (mutation.type === 'attributes') {
                                // 속성 변화 감지
                                try {
                                    const target = mutation.target;
                                    if (target && target.classList?.contains('friend-card')) {
                                        shouldCleanup = true;
                                        cleanupTargets.add(target);
                                    }
                                } catch (attrError) {
                                    console.warn('⚠️ [생명구조] 속성 변화 처리 실패:', attrError);
                                }
                            }
                        } catch (mutationError) {
                            console.warn('⚠️ [생명구조] 개별 mutation 처리 실패:', mutationError);
                        }
                    });
                    
                    if (shouldCleanup) {
                        // 안전한 지연 후 정리 작업 수행
                        setTimeout(() => {
                            try {
                                // 특정 카드들만 정리하거나 전체 정리
                                if (cleanupTargets.size > 0) {
                                    console.log(`🔧 [생명구조] 특정 카드 ${cleanupTargets.size}개 정리 시작`);
                                    cleanupTargets.forEach(card => {
                                        try {
                                            this.cleanupSingleCard(card);
                                        } catch (cardError) {
                                            console.warn('⚠️ [생명구조] 개별 카드 정리 실패:', cardError);
                                        }
                                    });
                                } else {
                                    this.cleanupFriendCards();
                                }
                            } catch (cleanupError) {
                                console.error('❌ [생명구조] 지연 정리 작업 실패:', cleanupError);
                            }
                        }, 100);
                    }
                } catch (observerError) {
                    console.error('❌ [생명구조] Observer 콜백 실패:', observerError);
                }
            });
            
            // 안전한 감시 시작
            try {
                this.styleObserver.observe(friendsList, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'style', 'data-cleanup-applied']
                });
                
                console.log('👁️ [생명구조] 강화된 DOM 감시 시작');
                
                // 감시 상태 주기적 확인
                this.startObserverHealthCheck();
                
            } catch (observeError) {
                console.error('❌ [생명구조] Observer 시작 실패:', observeError);
                // 폴백 감시 방법 사용
                this.startFallbackObserver();
            }
            
        } catch (error) {
            console.error('❌ [생명구조] DOM 감시 설정 치명적 실패:', error);
            
            // 최후 폴백: 단순한 타이머 기반 감시
            this.startFallbackObserver();
        }
    }

    /**
     * 폴백 감시 시스템 (MutationObserver 실패 시)
     */
    startFallbackObserver() {
        console.log('🔄 [생명구조] 폴백 감시 시스템 시작');
        
        // 5초마다 주기적으로 카드 상태 확인
        setInterval(() => {
            try {
                this.cleanupFriendCards();
            } catch (error) {
                console.warn('⚠️ [생명구조] 폴백 감시 실패:', error);
            }
        }, 5000);
    }

    /**
     * Observer 상태 건강성 검사
     */
    startObserverHealthCheck() {
        setInterval(() => {
            try {
                if (this.styleObserver) {
                    // Observer가 여전히 활성 상태인지 확인
                    const targetElement = document.getElementById('current-friends-list');
                    if (!targetElement && this.styleObserver) {
                        console.warn('⚠️ [생명구조] 감시 대상 요소 사라짐, Observer 재시작');
                        this.startDOMObserver();
                    }
                } else {
                    console.warn('⚠️ [생명구조] Observer 비활성 상태 감지, 재시작');
                    this.startDOMObserver();
                }
            } catch (error) {
                console.warn('⚠️ [생명구조] Observer 건강성 검사 실패:', error);
            }
        }, 30000); // 30초마다 검사
    }

    /**
     * 기존 친구 카드 정리
     */
    cleanupExistingCards() {
        try {
            const friendCards = document.querySelectorAll('.friend-card');
            if (friendCards.length > 0) {
                console.log(`🧹 [생명구조] 기존 친구 카드 ${friendCards.length}개 정리 중`);
                friendCards.forEach(card => this.cleanupSingleCard(card));
            }
        } catch (error) {
            console.error('❌ [생명구조] 기존 카드 정리 실패:', error);
        }
    }

    /**
     * 친구 카드 정리 (새로 추가된 것들)
     */
    cleanupFriendCards() {
        try {
            const friendCards = document.querySelectorAll('.friend-card');
            friendCards.forEach(card => this.cleanupSingleCard(card));
        } catch (error) {
            console.error('❌ [생명구조] 친구 카드 정리 실패:', error);
        }
    }

    /**
     * 개별 친구 카드 정리 (강화된 오류 처리)
     * @param {Element} card 친구 카드 요소
     */
    cleanupSingleCard(card) {
        try {
            // 강화된 입력 검증
            if (!card || !card.nodeType || card.nodeType !== Node.ELEMENT_NODE) {
                console.warn('⚠️ [생명구조] 유효하지 않은 카드 요소:', card);
                return false;
            }

            // DOM 요소가 여전히 문서에 연결되어 있는지 확인
            if (!document.contains(card)) {
                console.warn('⚠️ [생명구조] 분리된 DOM 요소 감지, 정리 건너뜀');
                return false;
            }
            
            let cleanupSuccess = true;
            
            // 이미지 요소들 안전한 제거
            try {
                const images = card.querySelectorAll(`
                    img,
                    .friend-image,
                    .friend-photo,
                    .profile-image,
                    [class*="image"],
                    [class*="photo"],
                    [class*="avatar"]
                `);
                
                images.forEach((img, index) => {
                    try {
                        if (img && img.style) {
                            img.style.display = 'none';
                            img.style.visibility = 'hidden';
                            img.style.opacity = '0';
                            img.style.width = '0';
                            img.style.height = '0';
                            img.setAttribute('hidden', 'true');
                        }
                    } catch (imgError) {
                        console.warn(`⚠️ [생명구조] 이미지 ${index} 처리 실패:`, imgError);
                        cleanupSuccess = false;
                    }
                });
            } catch (imagesError) {
                console.warn('⚠️ [생명구조] 이미지 요소 검색 실패:', imagesError);
                cleanupSuccess = false;
            }
            
            // 전화 버튼들 안전한 제거
            try {
                const phoneElements = card.querySelectorAll(`
                    .call-btn,
                    .phone-btn,
                    [class*="call"],
                    [class*="phone"],
                    button[onclick*="call"],
                    button[onclick*="phone"],
                    a[href^="tel:"]
                `);
                
                phoneElements.forEach((elem, index) => {
                    try {
                        if (elem && elem.style) {
                            elem.style.display = 'none';
                            elem.style.visibility = 'hidden';
                            elem.style.opacity = '0';
                            elem.setAttribute('hidden', 'true');
                        }
                    } catch (elemError) {
                        console.warn(`⚠️ [생명구조] 전화 요소 ${index} 처리 실패:`, elemError);
                        cleanupSuccess = false;
                    }
                });
            } catch (phoneError) {
                console.warn('⚠️ [생명구조] 전화 요소 검색 실패:', phoneError);
                cleanupSuccess = false;
            }
            
            // 불필요한 버튼들 안전한 숨김 (삭제 버튼 제외)
            try {
                const buttons = card.querySelectorAll('button');
                buttons.forEach((btn, index) => {
                    try {
                        if (!btn || !btn.getAttribute) return;
                        
                        const onclick = btn.getAttribute('onclick') || '';
                        const className = btn.className || '';
                        
                        // 삭제 버튼이 아닌 경우 숨김
                        if (!onclick.includes('deleteFriendGlobal') && 
                            !className.includes('delete-friend-btn')) {
                            if (btn.style) {
                                btn.style.display = 'none';
                                btn.setAttribute('hidden', 'true');
                            }
                        }
                    } catch (btnError) {
                        console.warn(`⚠️ [생명구조] 버튼 ${index} 처리 실패:`, btnError);
                        cleanupSuccess = false;
                    }
                });
            } catch (buttonsError) {
                console.warn('⚠️ [생명구조] 버튼 요소 검색 실패:', buttonsError);
                cleanupSuccess = false;
            }
            
            // 카드 구조 안전한 적용
            try {
                if (card.style) {
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.justifyContent = 'space-between';
                }
            } catch (styleError) {
                console.warn('⚠️ [생명구조] 카드 스타일 적용 실패:', styleError);
                cleanupSuccess = false;
            }
            
            // 일관성 마크 안전한 추가
            try {
                card.setAttribute('data-cleanup-applied', 'true');
                card.setAttribute('data-cleanup-timestamp', Date.now().toString());
                card.setAttribute('data-cleanup-success', cleanupSuccess.toString());
            } catch (attrError) {
                console.warn('⚠️ [생명구조] 속성 설정 실패:', attrError);
            }
            
            return cleanupSuccess;
            
        } catch (error) {
            console.error('❌ [생명구조] 개별 카드 정리 치명적 실패:', error);
            
            // 최후 안전장치 - 기본 스타일만 적용
            try {
                if (card && card.style) {
                    card.style.display = 'block';
                    card.setAttribute('data-cleanup-failed', 'true');
                }
            } catch (fallbackError) {
                console.error('❌ [생명구조] 최후 안전장치도 실패:', fallbackError);
            }
            
            return false;
        }
    }

    /**
     * 주기적 점검 시작
     */
    startPeriodicCheck() {
        // 5초마다 친구 카드 상태 점검
        setInterval(() => {
            this.performPeriodicCheck();
        }, 5000);
        
        console.log('⏰ [생명구조] 주기적 점검 시작 (5초 간격)');
    }

    /**
     * 주기적 점검 수행
     */
    performPeriodicCheck() {
        try {
            const friendCards = document.querySelectorAll('.friend-card');
            let needsCleanup = false;
            
            friendCards.forEach(card => {
                // 정리되지 않은 카드 확인
                if (!card.getAttribute('data-cleanup-applied')) {
                    needsCleanup = true;
                }
                
                // 이미지나 전화 버튼이 다시 나타났는지 확인
                const images = card.querySelectorAll('img:not([hidden]), .friend-image:not([hidden])');
                const phoneButtons = card.querySelectorAll('.call-btn:not([hidden]), .phone-btn:not([hidden])');
                
                if (images.length > 0 || phoneButtons.length > 0) {
                    needsCleanup = true;
                }
            });
            
            if (needsCleanup) {
                console.log('🔧 [생명구조] 주기적 점검: 정리 필요 감지');
                this.cleanupFriendCards();
            }
            
        } catch (error) {
            console.warn('⚠️ [생명구조] 주기적 점검 실패:', error);
        }
    }

    /**
     * 특정 친구 카드 강제 정리
     * @param {string} friendId 친구 ID
     */
    forceCleanupCard(friendId) {
        try {
            const friendCards = document.querySelectorAll('.friend-card');
            friendCards.forEach(card => {
                const deleteBtn = card.querySelector('[onclick*="deleteFriendGlobal"]');
                if (deleteBtn) {
                    const onclick = deleteBtn.getAttribute('onclick');
                    if (onclick && onclick.includes(friendId)) {
                        this.cleanupSingleCard(card);
                        console.log(`🎯 [생명구조] 특정 카드 정리 완료: ${friendId}`);
                    }
                }
            });
        } catch (error) {
            console.error('❌ [생명구조] 특정 카드 정리 실패:', error);
        }
    }

    /**
     * 시스템 정리
     */
    cleanup() {
        if (this.styleObserver) {
            this.styleObserver.disconnect();
            this.styleObserver = null;
        }
        
        // CSS 제거
        const styleElement = document.getElementById('senior-friendly-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        this.cssInjected = false;
        this.isInitialized = false;
        console.log('🧹 [생명구조] 친구 카드 스타일 관리자 정리 완료');
    }

    /**
     * 시스템 상태 확인
     * @returns {Object} 시스템 상태
     */
    getSystemStatus() {
        const friendCards = document.querySelectorAll('.friend-card');
        const cleanedCards = document.querySelectorAll('.friend-card[data-cleanup-applied="true"]');
        
        return {
            초기화됨: this.isInitialized,
            CSS주입됨: this.cssInjected,
            DOM감시활성: !!this.styleObserver,
            총친구카드수: friendCards.length,
            정리된카드수: cleanedCards.length,
            정리율: friendCards.length > 0 ? 
                `${Math.round((cleanedCards.length / friendCards.length) * 100)}%` : '0%'
        };
    }

    /**
     * 테스트 카드 생성 (테스트용)
     */
    createTestCard() {
        const testHTML = `
            <div class="friend-card" data-test="true">
                <div class="friend-card-header">
                    <div class="friend-name">테스트 친구</div>
                    <div class="friend-status" style="color: #ffc107;">🟡 주의</div>
                </div>
                <div class="friend-card-info">
                    <div class="friend-email">test@example.com</div>
                    <div class="friend-time">2시간 전 활동</div>
                </div>
                <div class="friend-card-actions">
                    <button onclick="deleteFriendGlobal('test-id', '테스트 친구')" class="delete-friend-btn">
                        친구 삭제
                    </button>
                </div>
                
                <!-- 이 요소들은 숨겨져야 함 -->
                <img src="test.jpg" alt="프로필" style="display: block;">
                <button class="call-btn" onclick="call()">전화하기</button>
            </div>
        `;
        
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            friendsList.insertAdjacentHTML('beforeend', testHTML);
            console.log('🧪 [생명구조] 테스트 카드 생성됨');
            
            // 즉시 정리 적용
            setTimeout(() => {
                this.cleanupFriendCards();
            }, 100);
        }
    }

    /**
     * 폴백 감시 시스템 (MutationObserver 실패 시)
     */
    startFallbackObserver() {
        console.log('🔄 [생명구조] 폴백 감시 시스템 시작');
        
        // 5초마다 주기적으로 카드 상태 확인
        setInterval(() => {
            try {
                this.cleanupFriendCards();
            } catch (error) {
                console.warn('⚠️ [생명구조] 폴백 감시 실패:', error);
            }
        }, 5000);
    }

    /**
     * Observer 상태 건강성 검사
     */
    startObserverHealthCheck() {
        setInterval(() => {
            try {
                if (this.styleObserver) {
                    // Observer가 여전히 활성 상태인지 확인
                    const targetElement = document.getElementById('current-friends-list');
                    if (!targetElement && this.styleObserver) {
                        console.warn('⚠️ [생명구조] 감시 대상 요소 사라짐, Observer 재시작');
                        this.startDOMObserver();
                    }
                } else {
                    console.warn('⚠️ [생명구조] Observer 비활성 상태 감지, 재시작');
                    this.startDOMObserver();
                }
            } catch (error) {
                console.warn('⚠️ [생명구조] Observer 건강성 검사 실패:', error);
            }
        }, 30000); // 30초마다 검사
    }

    /**
     * 시스템 복구 메커니즘
     */
    initializeSystemRecovery() {
        // 치명적 오류 발생 시 시스템 재시작
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('FriendCardStyleManager')) {
                console.warn('⚠️ [생명구조] 시스템 오류 감지, 복구 시작');
                setTimeout(() => {
                    try {
                        this.cleanup();
                        this.init();
                    } catch (recoveryError) {
                        console.error('❌ [생명구조] 시스템 복구 실패:', recoveryError);
                    }
                }, 2000);
            }
        });
        
        // 5분마다 시스템 상태 점검
        setInterval(() => {
            try {
                const status = this.getSystemStatus();
                if (!status.초기화됨 || !status.CSS주입됨) {
                    console.warn('⚠️ [생명구조] 시스템 상태 이상, 재초기화');
                    this.init();
                }
            } catch (statusError) {
                console.warn('⚠️ [생명구조] 상태 점검 실패:', statusError);
            }
        }, 300000); // 5분마다
    }

    /**
     * Android WebView 환경 감지
     */
    isAndroidWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.indexOf('wv') > -1 || 
               window.AndroidBridge || 
               window.location.protocol === 'file:';
    }
}

// 전역 인스턴스 생성 (싱글톤 패턴)
if (typeof window !== 'undefined') {
    window.FriendCardStyleManager = window.FriendCardStyleManager || new FriendCardStyleManager();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendCardStyleManager;
}

console.log('🎨 [생명구조] 친구 카드 스타일 관리자 로드 완료 - 일관성 보장');