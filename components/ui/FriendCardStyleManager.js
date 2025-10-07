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
        
        console.log('🎨 [생명구조] 친구 카드 스타일 관리자 초기화');
        this.init();
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
     * 일관성 CSS 주입 - Android WebView 환경 고려
     */
    async injectConsistencyCSS() {
        try {
            if (this.cssInjected) return;
            
            let cssContent = null;
            
            // 🚨 생명구조 시스템: 간단한 인라인 CSS만 사용 (외부 파일 로드 제거)
            console.log('📱 [생명구조] 간단한 인라인 CSS 사용 - email 스타일과 동일');
            cssContent = this.getInlineCSS();
            
            // CSS 스타일 요소 생성 및 주입
            const styleElement = document.createElement('style');
            styleElement.id = 'senior-friendly-styles';
            styleElement.textContent = cssContent;
            
            // 기존 스타일 요소 제거 (중복 방지)
            const existingStyle = document.getElementById('senior-friendly-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            // 헤드에 추가 (최고 우선순위)
            document.head.appendChild(styleElement);
            
            this.cssInjected = true;
            console.log('✅ [생명구조] 친구 카드 일관성 CSS 주입 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] CSS 주입 실패:', error);
        }
    }

    /**
     * 간단한 인라인 CSS 반환 (email 스타일과 동일)
     */
    getInlineCSS() {
        return `
            /* 🚨 생명구조: 불필요한 요소 숨김 */
            .friend-card img,
            .friend-status-card img,
            .friend-card .friend-image,
            .friend-status-card .friend-image,
            .friend-card .friend-photo,
            .friend-status-card .friend-photo,
            .friend-card .profile-image,
            .friend-status-card .profile-image,
            .friend-card [class*="image"],
            .friend-status-card [class*="image"],
            .friend-card [class*="photo"],
            .friend-status-card [class*="photo"],
            .friend-card [class*="avatar"],
            .friend-status-card [class*="avatar"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            
            /* 🚨 생명구조: 일반 전화 버튼은 숨기되, 생명구조 전화번호는 허용 */
            .friend-card .call-btn,
            .friend-status-card .call-btn,
            .friend-card .phone-btn:not(.friend-phone),
            .friend-status-card .phone-btn:not(.friend-phone),
            .friend-card [class*="call"],
            .friend-status-card [class*="call"],
            .friend-card [class*="phone"]:not(.friend-phone),
            .friend-status-card [class*="phone"]:not(.friend-phone),
            .friend-card button[onclick*="call"],
            .friend-status-card button[onclick*="call"],
            .friend-card button[onclick*="phone"],
            .friend-status-card button[onclick*="phone"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            
            /* 🚨 생명구조: 전화번호 요소는 반드시 표시 */
            .friend-card .friend-phone,
            .friend-status-card .friend-phone {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: auto !important;
                height: auto !important;
                overflow: visible !important;
            }
        `;
    }

    /**
     * DOM 감시 시작
     */
    startDOMObserver() {
        try {
            const friendsList = document.getElementById('current-friends-list');
            if (!friendsList) {
                console.warn('⚠️ [생명구조] 친구 목록 요소를 찾을 수 없음');
                return;
            }
            
            // Mutation Observer 설정
            this.styleObserver = new MutationObserver((mutations) => {
                let shouldCleanup = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        // 새로운 친구 카드가 추가된 경우
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.classList?.contains('friend-card') || 
                                    node.classList?.contains('friend-status-card') ||
                                    node.querySelector?.('.friend-card') ||
                                    node.querySelector?.('.friend-status-card')) {
                                    shouldCleanup = true;
                                }
                            }
                        });
                    }
                    
                    if (mutation.type === 'attributes') {
                        // 속성 변화 감지
                        const target = mutation.target;
                        if (target.classList?.contains('friend-card') || 
                            target.classList?.contains('friend-status-card')) {
                            shouldCleanup = true;
                        }
                    }
                });
                
                if (shouldCleanup) {
                    // 짧은 지연 후 정리 작업 수행
                    setTimeout(() => {
                        this.cleanupFriendCards();
                    }, 100);
                }
            });
            
            // 감시 시작
            this.styleObserver.observe(friendsList, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
            
            console.log('👁️ [생명구조] DOM 감시 시작');
            
        } catch (error) {
            console.error('❌ [생명구조] DOM 감시 설정 실패:', error);
        }
    }

    /**
     * 기존 친구 카드 정리
     */
    cleanupExistingCards() {
        try {
            const friendCards = document.querySelectorAll('.friend-card, .friend-status-card');
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
            const friendCards = document.querySelectorAll('.friend-card, .friend-status-card');
            friendCards.forEach(card => this.cleanupSingleCard(card));
        } catch (error) {
            console.error('❌ [생명구조] 친구 카드 정리 실패:', error);
        }
    }

    /**
     * 개별 친구 카드 정리
     * @param {Element} card 친구 카드 요소
     */
    cleanupSingleCard(card) {
        try {
            if (!card) return;
            
            // 이미지 요소들 강제 제거
            const images = card.querySelectorAll(`
                img,
                .friend-image,
                .friend-photo,
                .profile-image,
                [class*="image"],
                [class*="photo"],
                [class*="avatar"]
            `);
            
            images.forEach(img => {
                img.style.display = 'none';
                img.style.visibility = 'hidden';
                img.style.opacity = '0';
                img.style.width = '0';
                img.style.height = '0';
                img.setAttribute('hidden', 'true');
            });
            
            // 🚨 생명구조: 일반 전화 버튼은 숨기되, 생명구조 전화번호(.friend-phone)는 허용
            const phoneElements = card.querySelectorAll(`
                .call-btn,
                .phone-btn:not(.friend-phone),
                [class*="call"],
                [class*="phone"]:not(.friend-phone),
                button[onclick*="call"],
                button[onclick*="phone"]
            `);
            
            phoneElements.forEach(elem => {
                // .friend-phone 요소가 아닌 경우만 숨김
                if (!elem.classList.contains('friend-phone') && !elem.closest('.friend-phone')) {
                    elem.style.display = 'none';
                    elem.style.visibility = 'hidden';
                    elem.style.opacity = '0';
                    elem.setAttribute('hidden', 'true');
                }
            });
            
            // 🚨 생명구조: .friend-phone 요소는 강제로 표시 (friend-card와 friend-status-card 모두 지원)
            const friendPhoneElements = card.querySelectorAll('.friend-phone');
            friendPhoneElements.forEach(elem => {
                elem.style.display = 'block';
                elem.style.visibility = 'visible';
                elem.style.opacity = '1';
                elem.removeAttribute('hidden');
                // 인라인 스타일로 우선순위 보장
                elem.style.setProperty('display', 'block', 'important');
                elem.style.setProperty('visibility', 'visible', 'important');
                elem.style.setProperty('opacity', '1', 'important');
            });
            
            // 불필요한 버튼들 숨김 (삭제 버튼 제외)
            const buttons = card.querySelectorAll('button');
            buttons.forEach(btn => {
                const onclick = btn.getAttribute('onclick') || '';
                const className = btn.className || '';
                
                // 삭제 버튼이 아닌 경우 숨김
                if (!onclick.includes('deleteFriendGlobal') && 
                    !className.includes('delete-friend-btn')) {
                    btn.style.display = 'none';
                    btn.setAttribute('hidden', 'true');
                }
            });
            
            // 카드 구조 강제 적용
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            
            // 일관성 마크 추가 (이미 정리됨을 표시)
            card.setAttribute('data-cleanup-applied', 'true');
            
        } catch (error) {
            console.warn('⚠️ [생명구조] 개별 카드 정리 실패:', error);
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
            const friendCards = document.querySelectorAll('.friend-card, .friend-status-card');
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
            const friendCards = document.querySelectorAll('.friend-card, .friend-status-card');
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
     * Android WebView 환경 감지
     */
    isAndroidWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        const protocol = window.location.protocol;
        
        // Android WebView 특징: file:// 프로토콜 + Android 키워드
        const isAndroid = userAgent.includes('android');
        const isFileProtocol = protocol === 'file:';
        const hasWebViewIndicators = userAgent.includes('wv') || userAgent.includes('version/');
        
        return isAndroid && (isFileProtocol || hasWebViewIndicators);
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
        const friendCards = document.querySelectorAll('.friend-card, .friend-status-card');
        const cleanedCards = document.querySelectorAll('.friend-card[data-cleanup-applied="true"], .friend-status-card[data-cleanup-applied="true"]');
        
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