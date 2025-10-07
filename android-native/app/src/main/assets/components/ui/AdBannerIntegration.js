/**
 * AdBannerIntegration v1.0
 * AdBannerComponent와 기존 시스템을 연결하는 통합 계층
 * 
 * 기존 관리자 페이지, 사용자 인증과 완벽 통합하여 광고 시스템 제공
 */

class AdBannerIntegration {
    constructor() {
        this.component = null;
        this.integrations = {
            adminManager: null,
            auth: null,
            storage: null
        };
        this.isIntegrated = false;
        
        console.log('🔗 AdBanner 통합 계층 초기화');
        
        this.init();
    }

    async init() {
        try {
            // 컴포넌트 대기
            await this.waitForComponent();
            
            // 기존 시스템들 참조
            this.integrations = {
                adminManager: window.adminManager || window.admin,
                auth: window.auth,
                storage: window.storageComponent || window.storage
            };
            
            // 통합 설정
            this.setupIntegration();
            
            // 이벤트 연결
            this.connectEvents();
            
            // 관리자 시스템 통합
            this.setupAdminIntegration();
            
            this.isIntegrated = true;
            console.log('✅ AdBanner 통합 완료');
            
        } catch (error) {
            console.error('❌ AdBanner 통합 실패:', error);
        }
    }

    async waitForComponent() {
        return new Promise((resolve) => {
            const checkComponent = () => {
                if (window.adBannerComponent) {
                    this.component = window.adBannerComponent;
                    resolve();
                } else {
                    setTimeout(checkComponent, 100);
                }
            };
            checkComponent();
        });
    }

    setupIntegration() {
        if (!this.component) return;

        const component = this.component;

        // 기존 앱 초기화와 통합
        const originalAppInit = window.initApp;
        if (originalAppInit) {
            window.initApp = function() {
                console.log('🔄 기존 initApp 호출 -> AdBanner 통합');
                
                // 기존 초기화 먼저 실행
                const result = originalAppInit.apply(this, arguments);
                
                // AdBanner 초기화는 약간 지연 후 실행
                setTimeout(() => {
                    if (!component.isInitialized) {
                        component.init();
                    }
                }, 2000);
                
                return result;
            };
        }

        // 기존 로그인 성공 처리와 통합
        const originalLoginSuccess = window.loginSuccess;
        if (originalLoginSuccess) {
            window.loginSuccess = function(userData) {
                console.log('🔄 기존 loginSuccess 호출 -> AdBanner 사용자 설정 로드');
                
                // 기존 로그인 처리 먼저 실행
                const result = originalLoginSuccess.apply(this, arguments);
                
                // AdBanner 사용자 선호도 로드
                setTimeout(() => {
                    if (component.isInitialized) {
                        component.loadUserPreferences();
                    }
                }, 1000);
                
                return result;
            };
        }

        console.log('🔗 기존 앱 시스템과 AdBanner 통합 완료');
    }

    connectEvents() {
        if (!this.component) return;

        // AdBanner 이벤트를 기존 시스템들에 전파
        this.component.addEventListener('ad:clicked', (e) => {
            console.log('🖱️ AdBanner 광고 클릭:', e.detail.adData.title);
            
            // 관리자 시스템에 클릭 통계 전송
            if (this.integrations.adminManager) {
                this.sendAdClickToAdmin(e.detail.adData);
            }
        });

        this.component.addEventListener('ad:closed', (e) => {
            console.log('❌ AdBanner 광고 닫힌', e.detail.adId);
            
            // 사용자 선호도에 반영 (이미 컴포넌트에서 처리됨)
        });

        this.component.addEventListener('ad:system-ready', (e) => {
            console.log('✅ AdBanner 시스템 준비 완료:', e.detail.activeAdsCount, '개 광고');
        });

        this.component.addEventListener('ad:analytics', (e) => {
            console.log('📊 AdBanner 분석 데이터:', e.detail);
            
            // 관리자 시스템에 분석 데이터 전송
            this.sendAnalyticsToAdmin(e.detail);
        });

        // 기존 시스템 이벤트를 AdBanner에 전달
        
        // 친구 추가/삭제 시 광고 추천 새로고침
        if (window.friendsManagerComponent) {
            window.friendsManagerComponent.addEventListener('friend:added', (e) => {
                console.log('👥 친구 추가됨 - 광고 추천 업데이트');
                setTimeout(() => {
                    this.component.displayInitialAds();
                }, 1000);
            });
        }

        // 페이지 변경 시 광고 표시/숨김
        document.addEventListener('page-changed', (e) => {
            if (e.detail && e.detail.page) {
                this.handlePageChange(e.detail.page);
            }
        });

        // 네비게이션 변경 감지
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(nav => {
            nav.addEventListener('click', (e) => {
                const pageId = e.currentTarget.getAttribute('data-page') || 
                              e.currentTarget.getAttribute('onclick')?.match(/showPage\('([^']+)'\)/)?.[1];
                if (pageId) {
                    this.handlePageChange(pageId);
                }
            });
        });

        console.log('🔗 AdBanner 이벤트 연결 완료');
    }

    setupAdminIntegration() {
        if (!this.component || !this.integrations.adminManager) return;

        const adminManager = this.integrations.adminManager;
        
        // 관리자 광고 관리 기능 확장
        if (adminManager.loadAdsData) {
            const originalLoadAdsData = adminManager.loadAdsData;
            adminManager.loadAdsData = async function() {
                console.log('🔄 관리자 광고 데이터 로드 -> AdBanner와 동기화');
                
                try {
                    // 기존 관리자 광고 로드
                    const result = await originalLoadAdsData.call(this);
                    
                    // AdBanner에 새 광고 데이터 전달
                    if (window.adBannerIntegration.component) {
                        await window.adBannerIntegration.component.loadAdminAds();
                        window.adBannerIntegration.component.clearActiveAds();
                        await window.adBannerIntegration.component.displayInitialAds();
                    }
                    
                    return result;
                } catch (error) {
                    console.error('관리자 광고 데이터 로드 실패:', error);
                    return await originalLoadAdsData.call(this);
                }
            }.bind(adminManager);
        }

        // 관리자 광고 추가/수정/삭제 기능과 연동
        const originalAddAd = adminManager.addAd || adminManager.createAd;
        if (originalAddAd) {
            adminManager.addAd = function(adData) {
                console.log('🔄 관리자 광고 추가 -> AdBanner 새로고침');
                
                const result = originalAddAd.call(this, adData);
                
                // AdBanner 새로고침
                setTimeout(() => {
                    if (window.adBannerIntegration.component) {
                        window.adBannerIntegration.component.loadAdminAds();
                        window.adBannerIntegration.component.refreshCategoryAds(adData.category);
                    }
                }, 500);
                
                return result;
            }.bind(adminManager);
        }

        // 관리자 설정 페이지에 광고 통계 정보 추가
        this.enhanceAdminAdsPage();

        console.log('🔧 관리자 시스템과 AdBanner 통합 완료');
    }

    enhanceAdminAdsPage() {
        // 관리자 광고 페이지가 로드될 때 실행
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const adsPage = document.getElementById('ads-page');
                    if (adsPage && !adsPage.classList.contains('hidden') && !adsPage.querySelector('.ad-banner-stats')) {
                        this.addAdminAdsStats(adsPage);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    addAdminAdsStats(adsPage) {
        if (!this.component) return;

        const statsContainer = document.createElement('div');
        statsContainer.className = 'ad-banner-stats admin-section';
        statsContainer.innerHTML = `
            <h3>📊 실시간 광고 통계</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">활성 광고</span>
                    <span class="stat-value" id="active-ads-count">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">총 노출</span>
                    <span class="stat-value" id="total-impressions">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">총 클릭</span>
                    <span class="stat-value" id="total-clicks">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">클릭률</span>
                    <span class="stat-value" id="click-rate">-</span>
                </div>
            </div>
            <div class="category-stats">
                <h4>카테고리별 성과</h4>
                <div id="category-stats-list"></div>
            </div>
            <style>
            .ad-banner-stats {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
                margin-bottom: 15px;
            }
            .stat-item {
                background: white;
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .stat-label {
                display: block;
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 4px;
            }
            .stat-value {
                font-size: 18px;
                font-weight: 600;
                color: #495057;
            }
            .category-stats {
                background: white;
                padding: 12px;
                border-radius: 6px;
                margin-top: 10px;
            }
            .category-stats h4 {
                margin: 0 0 10px 0;
                color: #495057;
                font-size: 14px;
            }
            #category-stats-list {
                font-size: 12px;
                line-height: 1.4;
            }
            .category-stat {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px solid #eee;
            }
            </style>
        `;

        // 관리자 페이지 상단에 삽입
        const firstSection = adsPage.querySelector('.admin-section');
        if (firstSection) {
            adsPage.insertBefore(statsContainer, firstSection);
        } else {
            adsPage.prepend(statsContainer);
        }

        // 통계 업데이트
        this.updateAdminStats();
        
        // 정기 업데이트 타이머 설정
        const updateInterval = setInterval(() => {
            if (adsPage.classList.contains('hidden')) {
                clearInterval(updateInterval);
                return;
            }
            this.updateAdminStats();
        }, 5000); // 5초마다 업데이트
    }

    updateAdminStats() {
        if (!this.component) return;

        const status = this.component.getStatus();
        const categoryStats = this.component.getCategoryStats();
        
        // 기본 통계 업데이트
        const activeAdsEl = document.getElementById('active-ads-count');
        const impressionsEl = document.getElementById('total-impressions');
        const clicksEl = document.getElementById('total-clicks');
        const clickRateEl = document.getElementById('click-rate');
        
        if (activeAdsEl) activeAdsEl.textContent = status.activeAds;
        
        let totalImpressions = 0;
        let totalClicks = 0;
        
        Object.values(categoryStats).forEach(stat => {
            totalImpressions += stat.impressions;
            totalClicks += stat.clicks;
        });
        
        if (impressionsEl) impressionsEl.textContent = totalImpressions.toLocaleString();
        if (clicksEl) clicksEl.textContent = totalClicks.toLocaleString();
        if (clickRateEl) {
            const rate = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : 0;
            clickRateEl.textContent = `${rate}%`;
        }
        
        // 카테고리별 통계 업데이트
        const categoryStatsEl = document.getElementById('category-stats-list');
        if (categoryStatsEl) {
            categoryStatsEl.innerHTML = Object.entries(categoryStats).map(([category, stats]) => {
                const rate = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : 0;
                return `
                    <div class="category-stat">
                        <span>${this.getCategoryDisplayName(category)}</span>
                        <span>${stats.impressions}회 노출, ${stats.clicks}회 클릭 (${rate}%)</span>
                    </div>
                `;
            }).join('');
        }
    }

    getCategoryDisplayName(category) {
        const names = {
            insurance: '보험',
            funeral: '장례',
            lawyer: '법무',
            healthcare: '건강관리'
        };
        return names[category] || category;
    }

    handlePageChange(pageId) {
        if (!this.component) return;

        // 페이지별 광고 표시 정책
        const showAdsPages = ['home', 'friends', 'main', 'status'];
        const hideAdsPages = ['settings', 'profile', 'admin'];

        if (showAdsPages.includes(pageId)) {
            // 광고 표시
            if (this.component.bannersContainer) {
                this.component.bannersContainer.style.display = 'block';
            }
            
            // 새 광고 로드 (필요시)
            if (this.component.activeAds.size === 0) {
                setTimeout(() => {
                    this.component.displayInitialAds();
                }, 500);
            }
        } else if (hideAdsPages.includes(pageId)) {
            // 광고 숨김
            if (this.component.bannersContainer) {
                this.component.bannersContainer.style.display = 'none';
            }
        }
    }

    sendAdClickToAdmin(adData) {
        // 관리자 시스템에 클릭 데이터 전송
        const clickData = {
            timestamp: new Date().toISOString(),
            adId: adData.id,
            category: adData.category,
            title: adData.title,
            userId: this.integrations.auth?.getCurrentUser()?.id
        };

        // 로컬 저장소에 저장 (관리자 페이지에서 조회 가능)
        const existingClicks = JSON.parse(localStorage.getItem('admin-ad-clicks') || '[]');
        existingClicks.unshift(clickData);
        
        // 최근 100개만 유지
        if (existingClicks.length > 100) {
            existingClicks.splice(100);
        }
        
        localStorage.setItem('admin-ad-clicks', JSON.stringify(existingClicks));
    }

    sendAnalyticsToAdmin(analyticsData) {
        // 관리자 시스템에 분석 데이터 전송
        localStorage.setItem('admin-ad-analytics', JSON.stringify(analyticsData));
    }

    // 기존 코드에서 사용할 수 있는 향상된 기능들
    getEnhancedFeatures() {
        if (!this.component) return {};

        return {
            // 특정 카테고리 광고만 표시
            showCategoryOnly: (category) => {
                this.component.clearActiveAds();
                this.component.getRecommendedAds().then(ads => {
                    const categoryAds = ads.filter(ad => ad.category === category);
                    categoryAds.forEach((ad, index) => {
                        this.component.displayAd(ad, index);
                    });
                });
            },

            // 광고 일시 정지
            pauseAds: () => {
                if (this.component.bannersContainer) {
                    this.component.bannersContainer.style.display = 'none';
                }
                if (this.component.refreshTimer) {
                    clearInterval(this.component.refreshTimer);
                    this.component.refreshTimer = null;
                }
            },

            // 광고 재개
            resumeAds: () => {
                if (this.component.bannersContainer) {
                    this.component.bannersContainer.style.display = 'block';
                }
                this.component.startRefreshScheduler();
            },

            // 광고 강제 새로고침
            forceRefresh: async () => {
                await this.component.loadAdminAds();
                this.component.clearActiveAds();
                await this.component.displayInitialAds();
            },

            // 사용자 광고 선호도 리셋
            resetUserPreferences: () => {
                const currentUser = this.integrations.auth?.getCurrentUser();
                if (currentUser) {
                    this.component.userPreferences.delete(currentUser.id);
                    localStorage.removeItem(`user-ad-prefs-${currentUser.id}`);
                }
            },

            // 광고 통계 조회
            getAdStats: () => {
                return {
                    status: this.component.getStatus(),
                    categoryStats: this.component.getCategoryStats(),
                    clickStats: Object.fromEntries(this.component.clickStats)
                };
            },

            // 테스트 광고 표시
            showTestAd: (adData) => {
                this.component.displayAd({
                    id: 'test-ad-' + Date.now(),
                    title: adData.title || '테스트 광고',
                    description: adData.description || '테스트용 광고입니다',
                    category: adData.category || 'insurance',
                    linkUrl: '#'
                });
            },

            // 이벤트 리스너 추가
            onAdEvent: (event, callback) => {
                this.component.addEventListener(event, callback);
            }
        };
    }

    // 디버깅 및 모니터링
    getIntegrationStatus() {
        return {
            isIntegrated: this.isIntegrated,
            hasComponent: !!this.component,
            integrations: {
                adminManager: !!this.integrations.adminManager,
                auth: !!this.integrations.auth,
                storage: !!this.integrations.storage
            },
            componentStatus: this.component ? this.component.getStatus() : null
        };
    }

    // 진단 도구
    async runDiagnostics() {
        if (!this.component) {
            return { error: 'AdBannerComponent not available' };
        }

        const diagnostics = {
            timestamp: new Date().toISOString(),
            component: this.component.getStatus(),
            integrations: this.getIntegrationStatus(),
            ads: {
                categories: Object.keys(this.component.adCategories).length,
                activeAds: this.component.activeAds.size,
                adHistory: this.component.adHistory.size,
                userPreferences: this.component.userPreferences.size
            },
            performance: {
                memoryUsage: this.estimateMemoryUsage(),
                timersActive: {
                    refresh: !!this.component.refreshTimer,
                    rotation: !!this.component.rotationTimer,
                    analytics: !!this.component.analyticsTimer
                }
            }
        };

        console.log('🔍 AdBanner 진단 결과:', diagnostics);
        return diagnostics;
    }

    estimateMemoryUsage() {
        if (!this.component) return 0;
        
        const maps = [
            this.component.activeAds,
            this.component.adHistory,
            this.component.clickStats,
            this.component.userPreferences
        ];

        return maps.reduce((total, map) => total + map.size, 0);
    }
}

// 전역 초기화 함수
window.initAdBannerIntegration = () => {
    if (window.__adBannerIntegrationInitialized) {
        console.log('⚠️ AdBanner 통합이 이미 초기화됨');
        return;
    }

    console.log('🚀 AdBanner 통합 초기화 시작');
    
    const integration = new AdBannerIntegration();
    window.adBannerIntegration = integration;
    window.__adBannerIntegrationInitialized = true;

    // 향상된 기능을 전역에서 사용 가능하게
    window.adBannerEnhancements = integration.getEnhancedFeatures();
    
    console.log('✅ AdBanner 통합 초기화 완료');
    
    return integration;
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.initAdBannerIntegration();
    }, 2500); // 다른 컴포넌트들이 모두 로드된 후 실행
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdBannerIntegration;
}