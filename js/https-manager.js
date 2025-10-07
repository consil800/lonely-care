/**
 * 🔒 HTTPS 관리자 - 생명구조 앱 전용
 * 
 * 목적: HTTP/HTTPS 환경 감지 및 자동 전환 관리
 * 특징:
 * - 환경별 프로토콜 자동 감지
 * - Mixed Content 문제 해결
 * - 카카오 OAuth HTTPS 요구사항 대응
 * - 생명구조 앱 안정성 보장
 * 
 * @author AI Assistant
 * @version 1.0.0 (생명구조 최적화)
 * @since 2025-01-01
 */

class HTTPSManager {
    constructor() {
        this.isHttps = window.location.protocol === 'https:';
        this.currentHost = window.location.hostname;
        this.currentPort = window.location.port;
        this.httpsPort = '5650';
        this.httpPort = '8080';
        
        this.requiredForHttps = [
            'kakao_oauth',
            'service_worker',
            'push_notifications',
            'geolocation'
        ];

        console.log('🔒 [생명구조] HTTPS 관리자 초기화됨', {
            isHttps: this.isHttps,
            host: this.currentHost,
            port: this.currentPort
        });
    }

    /**
     * 현재 환경이 HTTPS인지 확인
     * @returns {boolean} HTTPS 여부
     */
    isHTTPS() {
        return this.isHttps;
    }

    /**
     * HTTPS 필요 기능 사용 여부 확인
     * @param {string} feature - 확인할 기능명
     * @returns {boolean} HTTPS 필요 여부
     */
    requiresHTTPS(feature) {
        return this.requiredForHttps.includes(feature);
    }

    /**
     * HTTPS URL 생성
     * @param {string} path - 경로 (선택사항)
     * @returns {string} HTTPS URL
     */
    getHTTPSUrl(path = '') {
        const host = this.currentHost === 'localhost' ? '127.0.0.1' : this.currentHost;
        const fullPath = path.startsWith('/') ? path : `/${path}`;
        return `https://${host}:${this.httpsPort}${fullPath}`;
    }

    /**
     * HTTP URL 생성
     * @param {string} path - 경로 (선택사항)
     * @returns {string} HTTP URL
     */
    getHTTPUrl(path = '') {
        const host = this.currentHost === 'localhost' ? '127.0.0.1' : this.currentHost;
        const fullPath = path.startsWith('/') ? path : `/${path}`;
        return `http://${host}:${this.httpPort}${fullPath}`;
    }

    /**
     * 현재 페이지의 프로토콜에 맞는 URL 생성
     * @param {string} path - 경로 (선택사항)
     * @returns {string} 현재 프로토콜 URL
     */
    getCurrentProtocolUrl(path = '') {
        return this.isHttps ? this.getHTTPSUrl(path) : this.getHTTPUrl(path);
    }

    /**
     * HTTPS로 리다이렉트
     * @param {string} path - 리다이렉트할 경로 (선택사항)
     */
    redirectToHTTPS(path = '') {
        if (this.isHttps) {
            console.log('🔒 [생명구조] 이미 HTTPS 환경입니다');
            return;
        }

        const httpsUrl = this.getHTTPSUrl(path || window.location.pathname + window.location.search);
        console.log('🔒 [생명구조] HTTPS로 리다이렉트:', httpsUrl);
        
        // 사용자에게 알림 후 리다이렉트
        this.showHTTPSRedirectModal(httpsUrl);
    }

    /**
     * HTTPS 리다이렉트 모달 표시
     * @param {string} httpsUrl - HTTPS URL
     */
    showHTTPSRedirectModal(httpsUrl) {
        // 기존 모달 제거
        const existingModal = document.getElementById('https-redirect-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 생성
        const modal = document.createElement('div');
        modal.id = 'https-redirect-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                <h2 style="margin: 0 0 16px 0; color: #333;">보안 연결 필요</h2>
                <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">
                    생명구조 시스템의 안전한 동작을 위해<br>
                    HTTPS 보안 연결로 이동합니다.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="https-redirect-yes" style="
                        background: #007AFF;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 16px;
                        cursor: pointer;
                        font-weight: 600;
                    ">보안 연결로 이동</button>
                    <button id="https-redirect-no" style="
                        background: #f0f0f0;
                        color: #333;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 16px;
                        cursor: pointer;
                    ">취소</button>
                </div>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #999;">
                    HTTPS 연결이 실패하면 HTTP 환경에서 계속 진행됩니다.
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        // 이벤트 리스너
        document.getElementById('https-redirect-yes').addEventListener('click', () => {
            window.location.href = httpsUrl;
        });

        document.getElementById('https-redirect-no').addEventListener('click', () => {
            modal.remove();
            console.log('🔒 [생명구조] 사용자가 HTTPS 리다이렉트를 취소했습니다');
        });

        // 10초 후 자동 리다이렉트
        setTimeout(() => {
            if (document.getElementById('https-redirect-modal')) {
                console.log('🔒 [생명구조] 자동 HTTPS 리다이렉트 실행');
                window.location.href = httpsUrl;
            }
        }, 10000);
    }

    /**
     * Mixed Content 경고 표시
     * @param {string} feature - 문제가 있는 기능명
     */
    showMixedContentWarning(feature) {
        console.warn(`⚠️ [생명구조] Mixed Content 경고: ${feature} 기능이 HTTP 환경에서 제한됩니다`);
        
        // 사용자에게 알림
        if (this.shouldShowWarning(feature)) {
            this.showMixedContentModal(feature);
        }
    }

    /**
     * Mixed Content 경고 모달 표시
     * @param {string} feature - 문제가 있는 기능명
     */
    showMixedContentModal(feature) {
        const featureNames = {
            'kakao_oauth': '카카오 로그인',
            'service_worker': '백그라운드 알림',
            'push_notifications': '푸시 알림',
            'geolocation': '위치 서비스'
        };

        const featureName = featureNames[feature] || feature;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FFF3CD;
            border: 1px solid #FFEAA7;
            border-radius: 8px;
            padding: 16px;
            max-width: 300px;
            z-index: 10002;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 20px;">⚠️</span>
                <div>
                    <div style="font-weight: 600; color: #856404; margin-bottom: 4px;">
                        보안 경고
                    </div>
                    <div style="font-size: 14px; color: #856404; line-height: 1.4;">
                        ${featureName} 기능은 HTTPS 환경에서만 정상 동작합니다.
                    </div>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: transparent;
                        border: none;
                        color: #007AFF;
                        font-size: 12px;
                        cursor: pointer;
                        margin-top: 8px;
                        text-decoration: underline;
                    ">확인</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 5000);
    }

    /**
     * 경고 표시 여부 확인
     * @param {string} feature - 기능명
     * @returns {boolean} 경고 표시 여부
     */
    shouldShowWarning(feature) {
        const warningKey = `https_warning_${feature}`;
        const lastWarning = localStorage.getItem(warningKey);
        const now = Date.now();
        
        // 1시간 내에 이미 경고를 표시했으면 생략
        if (lastWarning && (now - parseInt(lastWarning)) < 3600000) {
            return false;
        }

        localStorage.setItem(warningKey, now.toString());
        return true;
    }

    /**
     * 브라우저의 HTTPS 지원 여부 확인
     * @returns {Promise<boolean>} HTTPS 지원 여부
     */
    async checkHTTPSSupport() {
        // 개발 환경에서는 체크하지 않음
        if (this.currentHost === '127.0.0.1' || this.currentHost === 'localhost') {
            console.log('🔒 [생명구조] 개발 환경 - HTTPS 서버 체크 생략');
            return false;
        }

        try {
            const httpsUrl = this.getHTTPSUrl('/favicon.ico');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(httpsUrl, { 
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('🔒 [생명구조] HTTPS 서버 연결 가능');
            return true;
        } catch (error) {
            // 네트워크 오류를 조용히 처리
            if (error.name !== 'AbortError') {
                console.log('🔒 [생명구조] HTTPS 서버 체크 완료 - HTTP 환경에서 계속 진행');
            }
            return false;
        }
    }

    /**
     * 자동 HTTPS 전환 시도
     * @param {Array<string>} requiredFeatures - HTTPS가 필요한 기능 목록
     */
    async autoHTTPSUpgrade(requiredFeatures = []) {
        if (this.isHttps) {
            console.log('🔒 [생명구조] 이미 HTTPS 환경입니다');
            return true;
        }

        // 개발 환경에서는 HTTPS 강제 전환 비활성화
        if (this.currentHost === '127.0.0.1' || this.currentHost === 'localhost') {
            console.log('🔒 [생명구조] 개발 환경 - HTTPS 강제 전환 비활성화');
            console.log('🔒 [생명구조] HTTP 환경에서 제한적 기능으로 계속 진행');
            return false;
        }

        // HTTPS가 필요한 기능이 있는지 확인
        const needsHttps = requiredFeatures.some(feature => this.requiresHTTPS(feature));
        if (!needsHttps) {
            console.log('🔒 [생명구조] HTTPS 전환이 필요하지 않습니다');
            return false;
        }

        console.log('🔒 [생명구조] HTTPS 전환 필요 기능:', requiredFeatures);

        // HTTPS 서버 지원 확인
        const httpsSupported = await this.checkHTTPSSupport();
        if (!httpsSupported) {
            console.warn('🔒 [생명구조] HTTPS 서버를 사용할 수 없습니다 - HTTP 환경에서 계속 진행');
            return false;
        }

        // HTTPS로 리다이렉트
        this.redirectToHTTPS();
        return true;
    }

    /**
     * 환경 정보 반환
     * @returns {Object} 환경 정보
     */
    getEnvironmentInfo() {
        return {
            isHttps: this.isHttps,
            host: this.currentHost,
            port: this.currentPort,
            httpsUrl: this.getHTTPSUrl(),
            httpUrl: this.getHTTPUrl(),
            mixedContentSupport: this.isHttps || window.location.hostname === 'localhost'
        };
    }
}

// 전역 HTTPS 관리자 인스턴스 생성
if (typeof window !== 'undefined') {
    window.httpsManager = new HTTPSManager();
    
    // 전역 함수 제공
    window.requireHTTPS = (features) => {
        return window.httpsManager.autoHTTPSUpgrade(Array.isArray(features) ? features : [features]);
    };
    
    window.checkHTTPS = () => {
        return window.httpsManager.isHTTPS();
    };

    console.log('🔒 [생명구조] HTTPS 관리자 준비 완료');
}

// 모듈 내보내기 (필요한 경우)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HTTPSManager };
}