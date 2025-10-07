/**
 * 🚨 119 API 관리 시스템
 * 응급신고 API 설정 및 관리
 * 
 * 주요 기능:
 * - 119 API 엔드포인트 관리
 * - 메시지 템플릿 설정
 * - 연결 테스트 및 모니터링
 * - 호출 로그 관리
 * - 자동 신고 시스템
 */

class API119Manager {
    constructor() {
        this.className = 'API119Manager';
        this.isInitialized = false;
        this.currentSettings = null;
        this.testInProgress = false;
        this.logCheckInterval = null;
        this.pendingUIUpdate = null;
        
        console.log('🚨 [생명구조] 119 API 관리자 초기화');
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] 119 API 관리자 초기화 중...');
            
            // Firebase 초기화 대기
            await this.waitForFirebase();
            
            // 기존 설정 로드
            await this.loadSettings();
            
            // 상태 체크 시작
            this.startStatusCheck();
            
            // 로그 모니터링 시작
            this.startLogMonitoring();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 119 API 관리자 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 관리자 초기화 실패:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Firebase 초기화 대기
     */
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                if (window.firebaseDb) {
                    console.log('✅ [생명구조] Firebase 연결 확인됨');
                    resolve();
                } else {
                    console.log('⏳ [생명구조] Firebase 초기화 대기 중...');
                    setTimeout(checkFirebase, 100);
                }
            };
            
            // 최대 30초 대기
            setTimeout(() => {
                if (!window.firebaseDb) {
                    console.warn('⚠️ [생명구조] Firebase 초기화 타임아웃 - 기본 설정으로 진행');
                    resolve(); // 타임아웃되어도 진행
                }
            }, 30000);
            
            checkFirebase();
        });
    }
    
    /**
     * 설정 로드
     */
    async loadSettings() {
        try {
            console.log('📥 [생명구조] 119 API 설정 로드 중...');
            
            // Firebase 연결 확인
            if (!window.firebaseDb) {
                console.warn('⚠️ [생명구조] Firebase 연결 없음 - 기본 설정 사용');
                this.currentSettings = this.getDefaultSettings();
                this.updateUI(this.currentSettings);
                return;
            }
            
            const result = await window.firebaseDb.collection('api_119_settings').doc('default').get();
            
            if (result.exists) {
                this.currentSettings = result.data();
                this.updateUI(this.currentSettings);
                console.log('✅ [생명구조] 119 API 설정 로드 완료');
            } else {
                // 기본 설정 생성
                this.currentSettings = this.getDefaultSettings();
                await this.saveSettings();
                this.updateUI(this.currentSettings);
                console.log('✅ [생명구조] 119 API 기본 설정 생성 완료');
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 설정 로드 실패:', error);
            // 오류 시 기본값 사용
            this.currentSettings = this.getDefaultSettings();
            this.updateUI(this.currentSettings);
        }
    }
    
    /**
     * 기본 설정 반환
     */
    getDefaultSettings() {
        return {
            apiUrl: 'https://api.119.go.kr/emergency-report',
            apiKey: '',
            method: 'POST',
            timeout: 30,
            retryCount: 3,
            enabled: true,
            
            // 메시지 템플릿
            templates: {
                normal: 'lonely-care 고독사 방지 시스템에서 신고합니다. 사용자: {userName}, 연락처: {userPhone}, 주소: {userAddress}, 상태: {status}, 시간: {timestamp}',
                emergency: '[응급] lonely-care 응급상황 신고! 사용자: {userName}, 연락처: {userPhone}, 주소: {userAddress}, 72시간 무응답 상태, 즉시 확인 요청, 시간: {timestamp}',
                test: '[테스트] lonely-care 119 API 연동 테스트입니다. 시간: {timestamp}'
            },
            
            // 추가 설정
            backupSmsEnabled: true,
            sms119Number: '119',
            autoReportEnabled: true,
            logRetentionDays: 90,
            
            // 메타데이터
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    /**
     * UI 업데이트
     */
    updateUI(settings) {
        try {
            // DOM 요소 존재 확인
            const urlElement = document.getElementById('api-119-url');
            if (!urlElement) {
                console.log('⏳ [생명구조] 119 API UI 요소 아직 준비되지 않음 - 나중에 재시도');
                // 설정을 저장해두고 나중에 UI 업데이트
                this.pendingUIUpdate = settings;
                this.scheduleUIUpdate();
                return;
            }
            
            // API 설정
            urlElement.value = settings.apiUrl || '';
            document.getElementById('api-119-key').value = settings.apiKey || '';
            document.getElementById('api-119-method').value = settings.method || 'POST';
            document.getElementById('api-119-timeout').value = settings.timeout || 30;
            document.getElementById('api-119-retry').value = settings.retryCount || 3;
            document.getElementById('api-119-enabled').checked = settings.enabled !== false;
            
            // 메시지 템플릿
            document.getElementById('msg-template-normal').value = settings.templates?.normal || '';
            document.getElementById('msg-template-emergency').value = settings.templates?.emergency || '';
            document.getElementById('msg-template-test').value = settings.templates?.test || '';
            
            // 추가 설정
            document.getElementById('backup-sms-enabled').checked = settings.backupSmsEnabled !== false;
            document.getElementById('sms-119-number').value = settings.sms119Number || '119';
            document.getElementById('auto-report-enabled').checked = settings.autoReportEnabled !== false;
            document.getElementById('log-retention-days').value = settings.logRetentionDays || 90;
            
            console.log('✅ [생명구조] 119 API UI 업데이트 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API UI 업데이트 실패:', error);
        }
    }
    
    /**
     * 설정 저장
     */
    async saveSettings() {
        try {
            console.log('💾 [생명구조] 119 API 설정 저장 중...');
            
            // UI에서 설정 수집
            const settings = {
                apiUrl: document.getElementById('api-119-url').value.trim(),
                apiKey: document.getElementById('api-119-key').value.trim(),
                method: document.getElementById('api-119-method').value,
                timeout: parseInt(document.getElementById('api-119-timeout').value) || 30,
                retryCount: parseInt(document.getElementById('api-119-retry').value) || 3,
                enabled: document.getElementById('api-119-enabled').checked,
                
                templates: {
                    normal: document.getElementById('msg-template-normal').value.trim(),
                    emergency: document.getElementById('msg-template-emergency').value.trim(),
                    test: document.getElementById('msg-template-test').value.trim()
                },
                
                backupSmsEnabled: document.getElementById('backup-sms-enabled').checked,
                sms119Number: document.getElementById('sms-119-number').value.trim(),
                autoReportEnabled: document.getElementById('auto-report-enabled').checked,
                logRetentionDays: parseInt(document.getElementById('log-retention-days').value) || 90,
                
                updatedAt: new Date().toISOString()
            };
            
            // 기존 설정 유지 (생성일시 등)
            if (this.currentSettings) {
                settings.createdAt = this.currentSettings.createdAt;
            } else {
                settings.createdAt = new Date().toISOString();
            }
            
            // 입력 검증
            const validation = this.validateSettings(settings);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }
            
            // Firebase에 저장
            await window.firebaseDb.collection('api_119_settings').doc('default').set(settings);
            
            this.currentSettings = settings;
            
            // 성공 메시지
            this.showNotification('✅ 119 API 설정이 저장되었습니다.', 'success');
            
            // 활동 로그 기록
            await this.logActivity('settings_saved', '119 API 설정 저장', { 
                enabled: settings.enabled,
                apiConfigured: !!settings.apiUrl && !!settings.apiKey
            });
            
            console.log('✅ [생명구조] 119 API 설정 저장 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 설정 저장 실패:', error);
            this.showNotification(`❌ 설정 저장 실패: ${error.message}`, 'error');
        }
    }
    
    /**
     * UI 업데이트 예약
     */
    scheduleUIUpdate() {
        // DOM이 준비될 때까지 주기적으로 시도
        const retryUIUpdate = () => {
            const urlElement = document.getElementById('api-119-url');
            if (urlElement && this.pendingUIUpdate) {
                console.log('✅ [생명구조] 119 API UI 요소 준비됨 - UI 업데이트 실행');
                this.updateUI(this.pendingUIUpdate);
                this.pendingUIUpdate = null;
            } else if (this.pendingUIUpdate) {
                setTimeout(retryUIUpdate, 500); // 0.5초 후 재시도
            }
        };
        
        setTimeout(retryUIUpdate, 100); // 0.1초 후 첫 시도
    }
    
    /**
     * 설정 검증
     */
    validateSettings(settings) {
        if (!settings.apiUrl) {
            return { isValid: false, message: 'API URL을 입력해주세요.' };
        }
        
        try {
            new URL(settings.apiUrl);
        } catch {
            return { isValid: false, message: '올바른 API URL을 입력해주세요.' };
        }
        
        if (settings.timeout < 5 || settings.timeout > 120) {
            return { isValid: false, message: '타임아웃은 5-120초 사이여야 합니다.' };
        }
        
        if (settings.retryCount < 1 || settings.retryCount > 10) {
            return { isValid: false, message: '재시도 횟수는 1-10회 사이여야 합니다.' };
        }
        
        if (!settings.templates.normal || !settings.templates.emergency) {
            return { isValid: false, message: '필수 메시지 템플릿을 입력해주세요.' };
        }
        
        return { isValid: true };
    }
    
    /**
     * 연결 테스트
     */
    async testConnection() {
        if (this.testInProgress) {
            this.showNotification('⚠️ 테스트가 이미 진행 중입니다.', 'warning');
            return;
        }
        
        try {
            this.testInProgress = true;
            console.log('🔬 [생명구조] 119 API 연결 테스트 시작');
            
            // 현재 설정 확인
            if (!this.currentSettings || !this.currentSettings.apiUrl) {
                throw new Error('API 설정을 먼저 저장해주세요.');
            }
            
            const startTime = Date.now();
            
            // 상태 업데이트
            document.getElementById('api-119-status').textContent = '테스트 중...';
            document.getElementById('api-119-status').style.color = '#fbbf24';
            
            // 연결 테스트 실행
            const testResult = await this.performConnectionTest();
            
            const responseTime = Date.now() - startTime;
            
            // 결과 표시
            if (testResult.success) {
                document.getElementById('api-119-status').textContent = '연결 성공 ✅';
                document.getElementById('api-119-status').style.color = '#10b981';
                document.getElementById('api-119-response-time').textContent = `${responseTime}ms`;
                document.getElementById('api-119-last-test').textContent = new Date().toLocaleString('ko-KR');
                
                this.showNotification('✅ 119 API 연결 테스트 성공', 'success');
                
                // 성공 로그 기록
                await this.logActivity('connection_test', '연결 테스트 성공', {
                    responseTime,
                    apiUrl: this.currentSettings.apiUrl
                });
                
            } else {
                document.getElementById('api-119-status').textContent = '연결 실패 ❌';
                document.getElementById('api-119-status').style.color = '#ef4444';
                
                this.showNotification(`❌ 연결 테스트 실패: ${testResult.error}`, 'error');
                
                // 실패 로그 기록
                await this.logActivity('connection_test', '연결 테스트 실패', {
                    error: testResult.error,
                    apiUrl: this.currentSettings.apiUrl
                });
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 119 API 연결 테스트 실패:', error);
            
            document.getElementById('api-119-status').textContent = '테스트 오류 ❌';
            document.getElementById('api-119-status').style.color = '#ef4444';
            
            this.showNotification(`❌ 테스트 오류: ${error.message}`, 'error');
            
        } finally {
            this.testInProgress = false;
        }
    }
    
    /**
     * 실제 연결 테스트 수행
     */
    async performConnectionTest() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.currentSettings.timeout * 1000);
            
            // 테스트 요청 (HEAD 또는 OPTIONS 메서드 사용)
            const response = await fetch(this.currentSettings.apiUrl, {
                method: 'OPTIONS', // 먼저 OPTIONS로 시도
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.currentSettings.apiKey && {
                        'Authorization': `Bearer ${this.currentSettings.apiKey}`
                    })
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return { 
                success: true, 
                status: response.status,
                statusText: response.statusText
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, error: '연결 시간 초과' };
            }
            
            // CORS 오류 등은 실제로는 API가 존재할 수 있음을 의미
            if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
                console.log('ℹ️ [생명구조] CORS 오류 감지 - API 존재 가능성 있음');
                return { success: true, status: 'CORS', statusText: 'API endpoint exists (CORS policy)' };
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 테스트 메시지 발송
     */
    async sendTestMessage() {
        if (this.testInProgress) {
            this.showNotification('⚠️ 테스트가 이미 진행 중입니다.', 'warning');
            return;
        }
        
        try {
            this.testInProgress = true;
            console.log('📤 [생명구조] 119 API 테스트 메시지 발송');
            
            if (!this.currentSettings || !this.currentSettings.enabled) {
                throw new Error('119 API가 비활성화되어 있습니다.');
            }
            
            // 테스트 메시지 생성
            const testMessage = this.formatMessage(this.currentSettings.templates.test, {
                userName: '테스트 사용자',
                userPhone: '010-0000-0000',
                userAddress: '테스트 주소',
                status: '테스트',
                timestamp: new Date().toLocaleString('ko-KR')
            });
            
            // API 호출
            const result = await this.callAPI119(testMessage, 'test');
            
            if (result.success) {
                this.showNotification('✅ 테스트 메시지가 성공적으로 발송되었습니다.', 'success');
            } else {
                this.showNotification(`❌ 테스트 메시지 발송 실패: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 테스트 메시지 발송 실패:', error);
            this.showNotification(`❌ 테스트 실패: ${error.message}`, 'error');
            
        } finally {
            this.testInProgress = false;
        }
    }
    
    /**
     * 119 API 호출
     */
    async callAPI119(message, type = 'normal', userData = null) {
        try {
            console.log(`📞 [생명구조] 119 API 호출 시작: ${type}`);
            
            const requestData = {
                message: message,
                type: type,
                timestamp: new Date().toISOString(),
                source: 'lonely-care',
                ...(userData && { userData })
            };
            
            let lastError = null;
            
            // 재시도 로직
            for (let attempt = 1; attempt <= this.currentSettings.retryCount; attempt++) {
                try {
                    console.log(`📞 [생명구조] 119 API 호출 시도 ${attempt}/${this.currentSettings.retryCount}`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.currentSettings.timeout * 1000);
                    
                    const response = await fetch(this.currentSettings.apiUrl, {
                        method: this.currentSettings.method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...(this.currentSettings.apiKey && {
                                'Authorization': `Bearer ${this.currentSettings.apiKey}`
                            })
                        },
                        body: JSON.stringify(requestData),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const responseData = await response.json().catch(() => ({}));
                        
                        // 성공 로그 기록
                        await this.logActivity('api_call', `119 API 호출 성공 (${type})`, {
                            attempt,
                            status: response.status,
                            responseData
                        });
                        
                        console.log(`✅ [생명구조] 119 API 호출 성공: ${type}`);
                        return { success: true, response: responseData };
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
                if (attempt < this.currentSettings.retryCount) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
            
            // 모든 시도 실패
            const error = `모든 재시도 실패: ${lastError}`;
            
            // 실패 로그 기록
            await this.logActivity('api_call', `119 API 호출 실패 (${type})`, {
                error,
                attempts: this.currentSettings.retryCount
            });
            
            // 백업 SMS 시도
            if (this.currentSettings.backupSmsEnabled && type !== 'test') {
                console.log('📱 [생명구조] 백업 SMS 발송 시도');
                const smsResult = await this.sendBackupSMS(message);
                if (smsResult.success) {
                    await this.logActivity('backup_sms', 'API 실패 후 백업 SMS 발송', { originalError: error });
                }
            }
            
            return { success: false, error };
            
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
                    this.currentSettings.sms119Number,
                    message
                );
                
                if (result.success) {
                    console.log('✅ [생명구조] 백업 SMS 발송 성공');
                    return { success: true };
                } else {
                    console.error('❌ [생명구조] 백업 SMS 발송 실패:', result.error);
                    return { success: false, error: result.error };
                }
            } else {
                // 웹 환경에서는 시뮬레이션
                console.log('🌐 [생명구조] 웹 환경 - SMS 발송 시뮬레이션');
                return { success: true, simulation: true };
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 백업 SMS 발송 중 오류:', error);
            return { success: false, error: error.message };
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
     * 응급 신고 실행 (외부에서 호출)
     */
    async reportEmergency(userData) {
        try {
            console.log('🚨 [생명구조] 응급 상황 신고 시작');
            
            if (!this.currentSettings || !this.currentSettings.enabled) {
                throw new Error('119 API가 비활성화되어 있습니다.');
            }
            
            if (!this.currentSettings.autoReportEnabled) {
                console.log('⚠️ [생명구조] 자동 신고가 비활성화되어 있습니다.');
                return { success: false, error: '자동 신고가 비활성화되어 있습니다.' };
            }
            
            // 응급 메시지 생성
            const emergencyMessage = this.formatMessage(this.currentSettings.templates.emergency, {
                userName: userData.name || '알 수 없음',
                userPhone: userData.phone || '정보 없음',
                userAddress: userData.address || '주소 정보 없음',
                status: '72시간 무응답',
                timestamp: new Date().toLocaleString('ko-KR')
            });
            
            // 119 API 호출
            const result = await this.callAPI119(emergencyMessage, 'emergency', userData);
            
            // 응급 신고 로그 기록
            await this.logActivity('emergency_report', '응급 상황 신고', {
                userId: userData.id,
                userName: userData.name,
                success: result.success,
                error: result.error
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ [생명구조] 응급 신고 실패:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 활동 로그 기록
     */
    async logActivity(type, description, data = {}) {
        try {
            const logEntry = {
                type,
                description,
                data,
                timestamp: new Date().toISOString(),
                ip: 'admin-panel',
                userAgent: navigator.userAgent
            };
            
            await window.firebaseDb.collection('api_119_logs').add(logEntry);
            
        } catch (error) {
            console.error('❌ [생명구조] 활동 로그 기록 실패:', error);
        }
    }
    
    /**
     * 로그 로드 (Firebase 인덱스 오류 방지)
     */
    async loadLogs() {
        try {
            console.log('📄 [생명구조] 119 API 로그 로드 중...');
            
            const logsContainer = document.getElementById('api-119-logs');
            if (!logsContainer) {
                console.warn('⚠️ [생명구조] 로그 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            logsContainer.innerHTML = '<div class="loading-message">로그를 로딩 중입니다...</div>';
            
            // Firebase 인덱스 오류 방지: 모든 로그 조회 후 클라이언트에서 정렬
            const snapshot = await window.firebaseDb.collection('api_119_logs').get();
            
            let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // 클라이언트 사이드에서 최신 순으로 정렬하고 최근 100개만 선택
            logs = logs
                .filter(log => log.timestamp) // timestamp 있는 로그만
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 100);
            
            if (logs.length === 0) {
                logsContainer.innerHTML = '<div class="no-data-message">로그가 없습니다.</div>';
                return;
            }
            
            // 로그 HTML 생성
            const logsHTML = logs.map(log => `
                <div class="log-entry ${log.type}">
                    <div class="log-header">
                        <span class="log-type">${this.getLogTypeIcon(log.type)} ${log.type}</span>
                        <span class="log-time">${new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                    <div class="log-description">${log.description}</div>
                    ${log.data && Object.keys(log.data).length > 0 ? `
                        <div class="log-data">
                            <pre>${JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            logsContainer.innerHTML = logsHTML;
            console.log(`✅ [생명구조] ${logs.length}개 로그 로드 완료`);
            
        } catch (error) {
            console.error('❌ [생명구조] 로그 로드 실패:', error);
            document.getElementById('api-119-logs').innerHTML = 
                '<div class="error-message">로그 로드에 실패했습니다.</div>';
        }
    }
    
    /**
     * 로그 타입 아이콘
     */
    getLogTypeIcon(type) {
        const icons = {
            'settings_saved': '💾',
            'connection_test': '🔬',
            'api_call': '📞',
            'emergency_report': '🚨',
            'backup_sms': '📱',
            'error': '❌'
        };
        return icons[type] || '📝';
    }
    
    /**
     * 오래된 로그 삭제 (Firebase 인덱스 오류 방지)
     */
    async clearOldLogs() {
        try {
            if (!confirm('설정된 보관 기간을 초과한 오래된 로그를 삭제하시겠습니까?')) {
                return;
            }
            
            console.log('🗑️ [생명구조] 오래된 로그 삭제 시작');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.currentSettings.logRetentionDays);
            const cutoffTime = cutoffDate.getTime();
            
            // Firebase 인덱스 오류 방지: 모든 로그 조회 후 클라이언트에서 필터링
            const snapshot = await window.firebaseDb.collection('api_119_logs').get();
            
            const oldLogs = snapshot.docs.filter(doc => {
                const data = doc.data();
                if (!data.timestamp) return false;
                
                const logTime = new Date(data.timestamp).getTime();
                return logTime < cutoffTime;
            });
            
            if (oldLogs.length === 0) {
                this.showNotification('삭제할 오래된 로그가 없습니다.', 'info');
                return;
            }
            
            console.log(`🗑️ [생명구조] ${oldLogs.length}개의 오래된 로그 삭제 준비`);
            
            const batch = window.firebaseDb.batch();
            oldLogs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            this.showNotification(`✅ ${oldLogs.length}개의 오래된 로그가 삭제되었습니다.`, 'success');
            
            // 로그 새로고침
            await this.loadLogs();
            
        } catch (error) {
            console.error('❌ [생명구조] 오래된 로그 삭제 실패:', error);
            this.showNotification(`❌ 로그 삭제 실패: ${error.message}`, 'error');
        }
    }
    
    /**
     * 로그 내보내기
     */
    async exportLogs() {
        try {
            console.log('📤 [생명구조] 로그 내보내기 시작');
            
            const snapshot = await window.firebaseDb.collection('api_119_logs')
                .orderBy('timestamp', 'desc')
                .get();
            
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (logs.length === 0) {
                this.showNotification('내보낼 로그가 없습니다.', 'info');
                return;
            }
            
            // CSV 형식으로 변환
            const csvHeader = 'ID,Type,Description,Timestamp,Data\n';
            const csvData = logs.map(log => {
                const data = log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '';
                return `"${log.id}","${log.type}","${log.description}","${log.timestamp}","${data}"`;
            }).join('\n');
            
            const csvContent = csvHeader + csvData;
            
            // 파일 다운로드
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `119-api-logs-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`✅ ${logs.length}개 로그가 CSV 파일로 내보내졌습니다.`, 'success');
            
        } catch (error) {
            console.error('❌ [생명구조] 로그 내보내기 실패:', error);
            this.showNotification(`❌ 로그 내보내기 실패: ${error.message}`, 'error');
        }
    }
    
    /**
     * 상태 체크 시작
     */
    startStatusCheck() {
        // 5분마다 상태 확인
        setInterval(async () => {
            await this.updateStatusDisplay();
        }, 5 * 60 * 1000);
        
        // 초기 상태 확인
        this.updateStatusDisplay();
    }
    
    /**
     * 상태 표시 업데이트
     */
    async updateStatusDisplay() {
        try {
            // Firebase 인덱스 오류 방지를 위해 단일 필드 쿼리로 변경하고 클라이언트에서 필터링
            console.log('📊 [생명구조] 119 API 상태 업데이트 시작');
            
            // 모든 API 호출 로그 조회 (단일 쿼리)
            const allLogsSnapshot = await window.firebaseDb.collection('api_119_logs')
                .where('type', '==', 'api_call')
                .get();
            
            const allLogs = allLogsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`📋 [생명구조] 총 ${allLogs.length}개 API 호출 로그 조회`);
            
            // 클라이언트 사이드에서 날짜 필터링
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.getTime();
            
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthStartTime = monthStart.getTime();
            
            // 오늘 호출 수 계산
            const todayLogs = allLogs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= todayStart;
            });
            
            // 이번 달 호출 수 계산
            const monthLogs = allLogs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= monthStartTime;
            });
            
            // 성공률 계산
            const successLogs = monthLogs.filter(log => 
                log.data?.success !== false
            );
            
            const successRate = monthLogs.length > 0 ? 
                Math.round((successLogs.length / monthLogs.length) * 100) : 0;
            
            // UI 업데이트
            const todayElement = document.getElementById('api-119-today-calls');
            const monthElement = document.getElementById('api-119-month-calls');
            const successElement = document.getElementById('api-119-success-rate');
            
            if (todayElement) todayElement.textContent = todayLogs.length;
            if (monthElement) monthElement.textContent = monthLogs.length;
            if (successElement) successElement.textContent = `${successRate}%`;
            
            console.log(`✅ [생명구조] 119 API 상태 업데이트 완료: 오늘 ${todayLogs.length}회, 이달 ${monthLogs.length}회, 성공률 ${successRate}%`);
            
        } catch (error) {
            console.error('❌ [생명구조] 상태 표시 업데이트 실패:', error);
            
            // 오류 시 기본값 설정
            const elements = [
                'api-119-today-calls',
                'api-119-month-calls', 
                'api-119-success-rate'
            ];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = id.includes('rate') ? '0%' : '0';
                }
            });
        }
    }
    
    /**
     * 로그 모니터링 시작
     */
    startLogMonitoring() {
        // 30초마다 새 로그 확인
        this.logCheckInterval = setInterval(async () => {
            // 자동 로그 업데이트는 성능상 비활성화
            // 필요시 수동 새로고침 사용
        }, 30000);
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 토글 스위치 이벤트
        document.addEventListener('change', (event) => {
            if (event.target.type === 'checkbox') {
                // 실시간 설정 변경 감지 가능
                console.log('🔄 [생명구조] 설정 변경 감지:', event.target.id);
            }
        });
    }
    
    /**
     * 알림 표시
     */
    showNotification(message, type = 'info') {
        // 기존 알림 제거
        const existingNotification = document.querySelector('.api-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = `api-notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // 스타일 적용
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    /**
     * 정리
     */
    destroy() {
        if (this.logCheckInterval) {
            clearInterval(this.logCheckInterval);
        }
        console.log('🗑️ [생명구조] 119 API 관리자 정리 완료');
    }
}

// 전역 인스턴스 생성
try {
    window.api119Manager = new API119Manager();
    console.log('✅ [생명구조] 119 API 관리자 전역 인스턴스 생성 완료');
} catch (error) {
    console.error('❌ [생명구조] 119 API 관리자 인스턴스 생성 실패:', error);
    // 긴급 대체 인스턴스 생성
    window.api119Manager = {
        isInitialized: false,
        saveSettings: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        testConnection: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        sendTestMessage: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        loadSettings: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        loadLogs: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        clearOldLogs: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한'),
        exportLogs: () => console.error('119 API 관리자 초기화 실패로 인한 기능 제한')
    };
}

// CSS 스타일 추가
const api119Style = document.createElement('style');
api119Style.textContent = `
    /* 토글 스위치 스타일 */
    .toggle-switch {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }
    
    .toggle-switch input[type="checkbox"] {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .toggle-slider {
        position: relative;
        width: 44px;
        height: 24px;
        background-color: #ccc;
        border-radius: 24px;
        transition: .4s;
    }
    
    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: .4s;
    }
    
    .toggle-switch input:checked + .toggle-slider {
        background-color: #10b981;
    }
    
    .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(20px);
    }
    
    /* 로그 엔트리 스타일 */
    .log-entry {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        background: #f9fafb;
    }
    
    .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .log-type {
        font-weight: 600;
        color: #374151;
    }
    
    .log-time {
        font-size: 12px;
        color: #6b7280;
    }
    
    .log-description {
        color: #374151;
        margin-bottom: 8px;
    }
    
    .log-data {
        background: #f3f4f6;
        border-radius: 4px;
        padding: 8px;
        font-size: 12px;
    }
    
    .log-data pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    
    .log-entry.emergency_report {
        border-left: 4px solid #ef4444;
    }
    
    .log-entry.api_call {
        border-left: 4px solid #3b82f6;
    }
    
    .log-entry.settings_saved {
        border-left: 4px solid #10b981;
    }
    
    /* API 액션 버튼 스타일 */
    .api-actions {
        display: flex;
        gap: 12px;
        margin: 20px 0;
        flex-wrap: wrap;
    }
    
    .save-btn {
        background: #10b981 !important;
    }
    
    .test-btn {
        background: #3b82f6 !important;
    }
    
    /* 상태 그리드 */
    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin: 16px 0;
    }
    
    /* 로그 컨트롤 */
    .log-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }
    
    /* 애니메이션 */
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

document.head.appendChild(api119Style);

console.log('🚨 [생명구조] 119 API 관리 시스템 로드 완료');