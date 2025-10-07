/**
 * 🚨 119 API 클라이언트
 * 응급 상황 발생 시 119 신고를 위한 클라이언트 라이브러리
 * 
 * 주요 기능:
 * - 자동 응급 신고
 * - 수동 응급 신고
 * - 백업 SMS 발송
 * - 신고 상태 추적
 */

class API119Client {
    constructor() {
        this.className = 'API119Client';
        this.isInitialized = false;
        this.settings = null;
        this.pendingReports = new Map();
        
        console.log('🚨 [생명구조] 119 API 클라이언트 초기화');
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] 119 API 클라이언트 초기화 중...');
            
            // 설정 로드
            await this.loadSettings();
            
            // 대기 중인 신고 복원
            this.restorePendingReports();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 119 API 클라이언트 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 클라이언트 초기화 실패:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * 설정 로드
     */
    async loadSettings() {
        try {
            console.log('📥 [생명구조] 119 API 설정 로드 중...');
            
            // Firebase에서 설정 로드
            if (window.firebaseClient) {
                const result = await window.firebaseClient.getDocument('api_119_settings', 'default');
                if (result.success && result.data) {
                    this.settings = result.data;
                    console.log('✅ [생명구조] 119 API 설정 로드 완료');
                    return;
                }
            }
            
            // 기본 설정 사용
            this.settings = this.getDefaultSettings();
            console.log('⚠️ [생명구조] 119 API 기본 설정 사용');
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 설정 로드 실패:', error);
            this.settings = this.getDefaultSettings();
        }
    }
    
    /**
     * 기본 설정 반환
     */
    getDefaultSettings() {
        return {
            apiUrl: '',
            apiKey: '',
            method: 'POST',
            timeout: 30,
            retryCount: 3,
            enabled: false,
            
            templates: {
                normal: 'lonely-care 고독사 방지 시스템에서 신고합니다. 사용자: {userName}, 연락처: {userPhone}, 주소: {userAddress}, 상태: {status}, 시간: {timestamp}',
                emergency: '[응급] lonely-care 응급상황 신고! 사용자: {userName}, 연락처: {userPhone}, 주소: {userAddress}, 72시간 무응답 상태, 즉시 확인 요청, 시간: {timestamp}'
            },
            
            backupSmsEnabled: true,
            sms119Number: '119',
            autoReportEnabled: false
        };
    }
    
    /**
     * 응급 상황 자동 신고
     */
    async reportEmergency(userId, userData = null) {
        try {
            console.log(`🚨 [생명구조] 응급 상황 자동 신고 시작: ${userId}`);
            
            // 초기화 확인
            if (!this.isInitialized) {
                await this.init();
            }
            
            // 설정 확인
            if (!this.settings || !this.settings.enabled) {
                console.log('⚠️ [생명구조] 119 API가 비활성화되어 있습니다.');
                return { success: false, error: '119 API가 비활성화되어 있습니다.' };
            }
            
            if (!this.settings.autoReportEnabled) {
                console.log('⚠️ [생명구조] 자동 신고가 비활성화되어 있습니다.');
                return { success: false, error: '자동 신고가 비활성화되어 있습니다.' };
            }
            
            // 중복 신고 방지
            if (this.pendingReports.has(userId)) {
                console.log(`⚠️ [생명구조] 이미 신고 진행 중: ${userId}`);
                return { success: false, error: '이미 신고가 진행 중입니다.' };
            }
            
            // 사용자 정보 조회
            if (!userData) {
                userData = await this.getUserData(userId);
            }
            
            if (!userData) {
                console.error(`❌ [생명구조] 사용자 정보를 찾을 수 없습니다: ${userId}`);
                return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
            }
            
            // 신고 ID 생성
            const reportId = this.generateReportId();
            
            // 대기 목록에 추가
            this.pendingReports.set(userId, {
                reportId,
                userId,
                userData,
                startTime: Date.now(),
                attempts: 0
            });
            
            // 응급 메시지 생성
            const emergencyMessage = this.formatMessage(this.settings.templates.emergency, {
                userName: userData.name || '알 수 없음',
                userPhone: userData.phone || '정보 없음',
                userAddress: userData.address || '주소 정보 없음',
                status: '72시간 무응답',
                timestamp: new Date().toLocaleString('ko-KR')
            });
            
            // 119 API 호출
            const result = await this.callAPI119(emergencyMessage, 'emergency', userData, reportId);
            
            // 결과 처리
            if (result.success) {
                // 성공 로그 기록
                await this.logReport(reportId, 'success', '응급 신고 성공', result);
                
                // 대기 목록에서 제거
                this.pendingReports.delete(userId);
                
                console.log(`✅ [생명구조] 응급 신고 성공: ${userId}`);
                return { success: true, reportId, result };
                
            } else {
                // 실패 로그 기록
                await this.logReport(reportId, 'failed', '응급 신고 실패', result);
                
                // 재시도 또는 백업 처리는 별도 스케줄러에서 처리
                console.error(`❌ [생명구조] 응급 신고 실패: ${userId}`, result.error);
                return { success: false, reportId, error: result.error };
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 응급 신고 중 오류: ${userId}`, error);
            
            // 오류 로그 기록
            if (this.pendingReports.has(userId)) {
                const reportData = this.pendingReports.get(userId);
                await this.logReport(reportData.reportId, 'error', '응급 신고 오류', { error: error.message });
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 수동 응급 신고
     */
    async reportManualEmergency(message, userData = null) {
        try {
            console.log('🚨 [생명구조] 수동 응급 신고 시작');
            
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (!this.settings || !this.settings.enabled) {
                throw new Error('119 API가 비활성화되어 있습니다.');
            }
            
            // 현재 사용자 정보 가져오기
            if (!userData && window.auth) {
                const currentUser = window.auth.getCurrentUser();
                if (currentUser) {
                    userData = await this.getUserData(currentUser.id);
                }
            }
            
            const reportId = this.generateReportId();
            
            // 119 API 호출
            const result = await this.callAPI119(message, 'manual', userData, reportId);
            
            // 로그 기록
            await this.logReport(reportId, result.success ? 'success' : 'failed', 
                                '수동 응급 신고', result);
            
            return { success: result.success, reportId, error: result.error };
            
        } catch (error) {
            console.error('❌ [생명구조] 수동 응급 신고 실패:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 119 API 호출
     */
    async callAPI119(message, type = 'normal', userData = null, reportId = null) {
        try {
            console.log(`📞 [생명구조] 119 API 호출: ${type}`);
            
            if (!this.settings.apiUrl) {
                throw new Error('119 API URL이 설정되지 않았습니다.');
            }
            
            const requestData = {
                message: message,
                type: type,
                reportId: reportId,
                timestamp: new Date().toISOString(),
                source: 'lonely-care',
                version: '13.5.1',
                ...(userData && { 
                    user: {
                        id: userData.id,
                        name: userData.name,
                        phone: userData.phone,
                        address: userData.address
                    }
                })
            };
            
            let lastError = null;
            
            // 재시도 로직
            for (let attempt = 1; attempt <= this.settings.retryCount; attempt++) {
                try {
                    console.log(`📞 [생명구조] 119 API 호출 시도 ${attempt}/${this.settings.retryCount}`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout * 1000);
                    
                    const response = await fetch(this.settings.apiUrl, {
                        method: this.settings.method,
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'lonely-care/13.5.1',
                            ...(this.settings.apiKey && {
                                'Authorization': `Bearer ${this.settings.apiKey}`
                            })
                        },
                        body: JSON.stringify(requestData),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const responseData = await response.json().catch(() => ({ status: 'sent' }));
                        
                        console.log(`✅ [생명구조] 119 API 호출 성공: ${type}`);
                        return { 
                            success: true, 
                            response: responseData,
                            status: response.status,
                            attempt: attempt
                        };
                    } else {
                        lastError = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    
                } catch (error) {
                    if (error.name === 'AbortError') {
                        lastError = '연결 시간 초과';
                    } else {
                        lastError = error.message;
                    }
                    console.warn(`⚠️ [생명구조] 119 API 호출 시도 ${attempt} 실패:`, lastError);
                }
                
                // 마지막 시도가 아니면 잠시 대기
                if (attempt < this.settings.retryCount) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
            
            // 모든 시도 실패
            console.error(`❌ [생명구조] 119 API 호출 완전 실패: ${lastError}`);
            
            // 백업 SMS 시도
            if (this.settings.backupSmsEnabled && type !== 'test') {
                console.log('📱 [생명구조] 백업 SMS 발송 시도');
                const smsResult = await this.sendBackupSMS(message);
                
                return { 
                    success: smsResult.success, 
                    error: lastError,
                    backupUsed: true,
                    smsResult: smsResult
                };
            }
            
            return { success: false, error: lastError };
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 호출 중 예외:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 백업 SMS 발송
     */
    async sendBackupSMS(message) {
        try {
            console.log('📱 [생명구조] 백업 SMS 발송 시작');
            
            // Android Bridge를 통한 SMS 발송
            if (window.AndroidBridge && window.AndroidBridge.sendSMS) {
                const result = await window.AndroidBridge.sendSMS(
                    this.settings.sms119Number,
                    message
                );
                
                if (result.success) {
                    console.log('✅ [생명구조] 백업 SMS 발송 성공');
                    return { success: true, method: 'android' };
                } else {
                    console.error('❌ [생명구조] 백업 SMS 발송 실패:', result.error);
                    return { success: false, error: result.error };
                }
            }
            
            // 웹 환경에서는 알림만 표시
            if (window.notificationsManager) {
                window.notificationsManager.showBrowserNotification(
                    '🚨 응급 상황 알림',
                    '119에 직접 신고해주세요: ' + message,
                    { 
                        icon: '/icon.png',
                        tag: 'emergency-backup',
                        requireInteraction: true
                    }
                );
            }
            
            console.log('🌐 [생명구조] 웹 환경 - 사용자 알림 표시');
            return { success: true, method: 'notification' };
            
        } catch (error) {
            console.error('❌ [생명구조] 백업 SMS 발송 중 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 사용자 데이터 조회
     */
    async getUserData(userId) {
        try {
            if (window.firebaseClient) {
                const result = await window.firebaseClient.getDocument('users', userId);
                if (result.success && result.data) {
                    return result.data;
                }
            }
            
            // 캐시된 사용자 정보 확인
            if (window.auth) {
                const currentUser = window.auth.getCurrentUser();
                if (currentUser && currentUser.id === userId) {
                    return {
                        id: currentUser.id,
                        name: currentUser.name,
                        phone: currentUser.phone,
                        address: currentUser.address || '주소 정보 없음'
                    };
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [생명구조] 사용자 데이터 조회 실패:', error);
            return null;
        }
    }
    
    /**
     * 메시지 포맷팅
     */
    formatMessage(template, data) {
        let message = template;
        
        Object.keys(data).forEach(key => {
            const placeholder = `{${key}}`;
            message = message.replace(new RegExp(placeholder, 'g'), data[key] || '정보 없음');
        });
        
        return message;
    }
    
    /**
     * 신고 ID 생성
     */
    generateReportId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `report_${timestamp}_${random}`;
    }
    
    /**
     * 신고 로그 기록
     */
    async logReport(reportId, status, description, data = {}) {
        try {
            const logEntry = {
                reportId,
                status,
                description,
                data,
                timestamp: new Date().toISOString(),
                source: 'client',
                version: '13.5.1'
            };
            
            if (window.firebaseClient) {
                await window.firebaseClient.addDocument('api_119_logs', logEntry);
            } else {
                // 로컬 스토리지에 임시 저장
                const logs = JSON.parse(localStorage.getItem('119_logs') || '[]');
                logs.push(logEntry);
                localStorage.setItem('119_logs', JSON.stringify(logs.slice(-100))); // 최근 100개만 보관
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 신고 로그 기록 실패:', error);
        }
    }
    
    /**
     * 대기 중인 신고 복원
     */
    restorePendingReports() {
        try {
            const saved = localStorage.getItem('pending_119_reports');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([userId, reportData]) => {
                    // 24시간 이내의 신고만 복원
                    if (Date.now() - reportData.startTime < 24 * 60 * 60 * 1000) {
                        this.pendingReports.set(userId, reportData);
                    }
                });
                console.log(`✅ [생명구조] ${this.pendingReports.size}개 대기 신고 복원`);
            }
        } catch (error) {
            console.error('❌ [생명구조] 대기 신고 복원 실패:', error);
        }
    }
    
    /**
     * 대기 중인 신고 저장
     */
    savePendingReports() {
        try {
            const data = Object.fromEntries(this.pendingReports);
            localStorage.setItem('pending_119_reports', JSON.stringify(data));
        } catch (error) {
            console.error('❌ [생명구조] 대기 신고 저장 실패:', error);
        }
    }
    
    /**
     * 신고 상태 확인
     */
    getReportStatus(userId) {
        return this.pendingReports.get(userId) || null;
    }
    
    /**
     * 모든 대기 신고 상태
     */
    getAllPendingReports() {
        return Array.from(this.pendingReports.values());
    }
    
    /**
     * 설정 새로고침
     */
    async refreshSettings() {
        await this.loadSettings();
        return this.settings;
    }
    
    /**
     * 연결 테스트
     */
    async testConnection() {
        try {
            console.log('🔍 [생명구조] 119 API 연결 테스트 시작');
            
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (!this.settings || !this.settings.enabled) {
                return {
                    success: false,
                    error: '119 API가 비활성화되어 있습니다',
                    status: 'disabled'
                };
            }
            
            if (!this.settings.apiUrl) {
                return {
                    success: false,
                    error: '119 API URL이 설정되지 않았습니다',
                    status: 'no_url'
                };
            }
            
            // 간단한 테스트 메시지
            const testMessage = `[테스트] lonely-care 시스템 연결 확인 - ${new Date().toLocaleString('ko-KR')}`;
            
            // API 호출 테스트
            const result = await this.callAPI119(testMessage, 'test', null, 'test_' + Date.now());
            
            console.log('✅ [생명구조] 119 API 연결 테스트 완료:', result.success);
            
            return {
                success: result.success,
                error: result.error || null,
                status: result.success ? 'connected' : 'failed',
                response: result.response || null
            };
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 연결 테스트 실패:', error);
            return {
                success: false,
                error: error.message,
                status: 'error'
            };
        }
    }
    
    /**
     * 상태 확인
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isEnabled: this.settings?.enabled || false,
            autoReportEnabled: this.settings?.autoReportEnabled || false,
            backupSmsEnabled: this.settings?.backupSmsEnabled || false,
            pendingReports: this.pendingReports.size,
            lastSettingsUpdate: this.settings?.updatedAt || null
        };
    }
    
    /**
     * 정리
     */
    destroy() {
        // 대기 중인 신고 저장
        this.savePendingReports();
        
        // 리소스 정리
        this.pendingReports.clear();
        
        console.log('🗑️ [생명구조] 119 API 클라이언트 정리 완료');
    }
}

// 전역 인스턴스 생성
window.api119Client = new API119Client();

// 페이지 종료 시 대기 신고 저장
window.addEventListener('beforeunload', () => {
    if (window.api119Client) {
        window.api119Client.savePendingReports();
    }
});

console.log('🚨 [생명구조] 119 API 클라이언트 로드 완료');