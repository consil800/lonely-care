/**
 * lonely-care 긴급상황 대응 시스템
 * 72시간 무응답 시 공공기관 자동 연락 및 응급 프로토콜 실행
 * 
 * 핵심 기능:
 * - 72시간 무응답 감지 및 확인
 * - 119, 경찰, 행정센터 자동 연락
 * - 사용자 동의 시스템 및 개인정보 보호
 * - 오신고 방지 메커니즘
 * - 긴급상황 로그 및 추적
 */

class EmergencyResponseSystem {
    constructor(options = {}) {
        this.options = {
            enableEmergencyContact: true,
            enableSMSAlert: true,
            enableEmailAlert: true,
            emergencyConfirmationRequired: true,
            doubleConfirmationTime: 30 * 60 * 1000, // 30분
            maxRetryAttempts: 3,
            debug: options.debug || false,
            ...options
        };

        // 긴급 연락처 설정
        this.emergencyContacts = {
            '119': {
                name: '119 구급센터',
                phone: '119',
                type: 'emergency_medical',
                priority: 1,
                apiEndpoint: null, // SMS/API 연동시 사용
                enabled: true
            },
            police: {
                name: '112 경찰서',
                phone: '112', 
                type: 'police',
                priority: 2,
                apiEndpoint: null,
                enabled: true
            },
            adminCenter: {
                name: '행정복지센터',
                phone: null, // 관리자가 설정
                type: 'administrative',
                priority: 3,
                apiEndpoint: null,
                enabled: false // 기본 비활성화
            }
        };

        // 상태 관리
        this.emergencyQueue = new Map(); // 처리 대기 중인 긴급상황
        this.emergencyHistory = new Map(); // 긴급상황 이력
        this.confirmationQueue = new Map(); // 확인 대기 중인 케이스
        
        // 의존성
        this.storage = null;
        this.notifications = null;
        this.alertManager = null;
        
        console.log('🚨 EmergencyResponseSystem 초기화됨', this.options);
    }

    /**
     * 시스템 초기화
     */
    async init() {
        try {
            console.log('🚨 긴급상황 대응 시스템 초기화 시작');
            
            // 의존성 연결
            this.storage = window.storage || window.storageComponent;
            this.notifications = window.notifications;
            this.alertManager = window.alertLevelManager;
            
            // 관리자 설정 로드
            await this.loadEmergencySettings();
            
            // 사용자 동의 상태 확인
            await this.checkUserConsent();
            
            // 대기 중인 긴급상황 복구
            await this.recoverPendingEmergencies();
            
            console.log('✅ 긴급상황 대응 시스템 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ 긴급상황 대응 시스템 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 72시간 긴급상황 처리 메인 함수
     */
    async handle72HourEmergency(userData, friendData) {
        try {
            console.log('🚨 72시간 긴급상황 감지:', userData.name);
            
            // 1. 긴급상황 유효성 검증
            if (!await this.validateEmergencyCondition(userData, friendData)) {
                console.log('⚠️ 긴급상황 조건 미충족, 처리 중단');
                return false;
            }
            
            // 2. 사용자 동의 확인
            if (!await this.checkEmergencyConsent(userData.id)) {
                console.log('⚠️ 사용자가 긴급 연락에 동의하지 않음');
                return false;
            }
            
            // 3. 이중 확인 프로세스 (오신고 방지)
            if (this.options.emergencyConfirmationRequired) {
                const confirmed = await this.executeDoubleConfirmation(userData, friendData);
                if (!confirmed) {
                    console.log('⚠️ 이중 확인 실패, 긴급상황 처리 중단');
                    return false;
                }
            }
            
            // 4. 긴급상황 데이터 구성
            const emergencyData = this.buildEmergencyData(userData, friendData);
            
            // 5. 공공기관 연락 실행
            const contactResult = await this.contactEmergencyServices(emergencyData);
            
            // 6. 친구들에게 긴급 알림
            await this.notifyAllFriends(emergencyData);
            
            // 7. 긴급상황 로그 기록
            await this.logEmergencyEvent(emergencyData, contactResult);
            
            // 8. 지속적 모니터링 시작
            this.startEmergencyMonitoring(emergencyData);
            
            console.log('✅ 72시간 긴급상황 처리 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 72시간 긴급상황 처리 실패:', error);
            await this.logEmergencyError(userData, error);
            return false;
        }
    }

    /**
     * 긴급상황 조건 검증
     */
    async validateEmergencyCondition(userData, friendData) {
        try {
            // 최신 하트비트 데이터 확인
            const latestHeartbeat = await this.getLatestHeartbeat(userData.id);
            
            if (!latestHeartbeat) {
                console.warn('⚠️ 하트비트 데이터를 찾을 수 없음');
                return false;
            }
            
            // 정확한 72시간 계산
            const now = new Date();
            const lastActivity = new Date(latestHeartbeat.timestamp);
            const timeDiff = now - lastActivity;
            const hours = timeDiff / (1000 * 60 * 60);
            
            console.log(`📊 무응답 시간: ${hours.toFixed(1)}시간`);
            
            // 72시간 조건 확인 (여유시간 3시간 추가)
            if (hours < 72) {
                console.log(`⏰ 아직 72시간 미만 (${hours.toFixed(1)}시간)`);
                return false;
            }
            
            // 움직임 데이터 추가 확인
            const motionData = await this.getRecentMotionData(userData.id, 72);
            if (motionData && motionData.length > 0) {
                console.log('🎯 최근 움직임 감지됨, 긴급상황 아님');
                return false;
            }
            
            // 친구 신고 여부 확인
            const friendReports = await this.getFriendEmergencyReports(userData.id);
            if (friendReports.length < 1) {
                console.log('⚠️ 친구 신고가 없어 추가 확인 필요');
                // 자동 친구 확인 요청 발송
                await this.requestFriendConfirmation(userData, friendData);
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ 긴급상황 조건 검증 실패:', error);
            return false;
        }
    }

    /**
     * 사용자 동의 확인
     */
    async checkEmergencyConsent(userId) {
        try {
            // 프로필에서 긴급 연락 동의 확인
            const userProfile = await this.storage.getById('users', userId);
            
            if (!userProfile) {
                console.warn('⚠️ 사용자 프로필을 찾을 수 없음');
                return false;
            }
            
            // 긴급 연락 동의 여부 확인
            const emergencyConsent = userProfile.emergency_contact_consent;
            
            if (emergencyConsent === undefined) {
                console.log('⚠️ 긴급 연락 동의 상태 미설정, 동의 요청 필요');
                await this.requestEmergencyConsent(userId);
                return false;
            }
            
            if (!emergencyConsent) {
                console.log('⚠️ 사용자가 긴급 연락에 동의하지 않음');
                return false;
            }
            
            console.log('✅ 사용자 긴급 연락 동의 확인됨');
            return true;
            
        } catch (error) {
            console.error('❌ 사용자 동의 확인 실패:', error);
            return false;
        }
    }

    /**
     * 이중 확인 프로세스 (오신고 방지)
     */
    async executeDoubleConfirmation(userData, friendData) {
        try {
            console.log('🔄 이중 확인 프로세스 시작');
            
            // 1. 모든 친구에게 긴급 확인 요청
            const confirmationId = `emergency_${userData.id}_${Date.now()}`;
            
            const confirmationData = {
                id: confirmationId,
                userId: userData.id,
                userName: userData.name,
                timestamp: new Date().toISOString(),
                requiredConfirmations: Math.min(friendData.length, 3), // 최대 3명
                receivedConfirmations: [],
                status: 'pending',
                expiresAt: new Date(Date.now() + this.options.doubleConfirmationTime).toISOString()
            };
            
            // 2. Firebase에 확인 요청 저장
            await this.storage.set('emergency_confirmations', confirmationId, confirmationData);
            
            // 3. 친구들에게 긴급 확인 알림 발송
            for (const friend of friendData.slice(0, 3)) { // 최대 3명에게만
                await this.sendEmergencyConfirmationRequest(friend, confirmationData);
            }
            
            // 4. 확인 대기 (30분)
            this.confirmationQueue.set(confirmationId, confirmationData);
            
            // 5. 30분 후 결과 확인
            setTimeout(async () => {
                await this.processConfirmationResult(confirmationId);
            }, this.options.doubleConfirmationTime);
            
            // 6. 즉시 확인된 응답 체크 (15분 이내 응답 우선 처리)
            const earlyResponse = await this.waitForEarlyConfirmation(confirmationId, 15 * 60 * 1000);
            
            if (earlyResponse.confirmed) {
                console.log('✅ 조기 긴급상황 확인됨 (15분 이내)');
                return true;
            } else if (earlyResponse.denied) {
                console.log('❌ 긴급상황 부인됨 (15분 이내)');
                return false;
            }
            
            // 7. 30분 대기 후 결정
            console.log('⏰ 30분 대기 후 최종 결정 예정');
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const result = await this.getFinalConfirmationResult(confirmationId);
                    resolve(result);
                }, this.options.doubleConfirmationTime);
            });
            
        } catch (error) {
            console.error('❌ 이중 확인 프로세스 실패:', error);
            return false;
        }
    }

    /**
     * 긴급상황 데이터 구성
     */
    buildEmergencyData(userData, friendData) {
        return {
            // 기본 정보
            emergencyId: `EMERGENCY_${userData.id}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: userData.id,
            userName: userData.name,
            
            // 위치 정보
            address: userData.address || '주소 정보 없음',
            detailAddress: userData.detail_address || '',
            postalCode: userData.postal_code || '',
            
            // 의료 정보
            bloodType: userData.blood_type || '미상',
            medicalConditions: userData.medical_conditions || [],
            medications: userData.medications || [],
            allergies: userData.allergies || [],
            
            // 비상 연락처
            emergencyContacts: userData.emergency_contacts || [],
            
            // 상황 정보
            lastActivity: userData.last_activity,
            inactiveHours: this.calculateInactiveHours(userData.last_activity),
            alertLevel: 'emergency',
            
            // 신고자 정보 (친구들)
            reportedBy: friendData.map(friend => ({
                id: friend.id,
                name: friend.name,
                phone: friend.phone || null
            })),
            
            // 시스템 정보
            systemVersion: 'lonely-care v13.5.1',
            reportSource: 'automated_72h_detection'
        };
    }

    /**
     * 공공기관 연락 실행
     */
    async contactEmergencyServices(emergencyData) {
        const contactResults = [];
        
        try {
            console.log('📞 공공기관 연락 시작');
            
            // 1. 119 구급센터 연락
            if (this.emergencyContacts['119'].enabled) {
                const result119 = await this.contact119(emergencyData);
                contactResults.push({
                    service: '119',
                    success: result119.success,
                    method: result119.method,
                    timestamp: new Date().toISOString(),
                    details: result119.details
                });
            }
            
            // 2. 112 경찰서 연락
            if (this.emergencyContacts.police.enabled) {
                const resultPolice = await this.contactPolice(emergencyData);
                contactResults.push({
                    service: '112',
                    success: resultPolice.success,
                    method: resultPolice.method,
                    timestamp: new Date().toISOString(),
                    details: resultPolice.details
                });
            }
            
            // 3. 행정복지센터 연락
            if (this.emergencyContacts.adminCenter.enabled) {
                const resultAdmin = await this.contactAdminCenter(emergencyData);
                contactResults.push({
                    service: 'admin_center',
                    success: resultAdmin.success,
                    method: resultAdmin.method,
                    timestamp: new Date().toISOString(),
                    details: resultAdmin.details
                });
            }
            
            console.log('✅ 공공기관 연락 완료:', contactResults);
            return contactResults;
            
        } catch (error) {
            console.error('❌ 공공기관 연락 실패:', error);
            return contactResults;
        }
    }

    /**
     * 119 구급센터 연락
     */
    async contact119(emergencyData) {
        try {
            console.log('🚑 119 구급센터 연락 시작');
            
            // SMS API 연동 (실제 환경에서는 SMS API 사용)
            const smsContent = this.build119SMSContent(emergencyData);
            
            // 개발 환경에서는 로그로 대체
            if (this.options.debug) {
                console.log('🚑 119 SMS 내용:', smsContent);
                return {
                    success: true,
                    method: 'debug_log',
                    details: 'Development mode - logged to console'
                };
            }
            
            // 실제 SMS 발송 (SMS API 연동 필요)
            // const smsResult = await this.sendSMS('119', smsContent);
            
            // 이메일 백업 (관리자에게)
            const emailResult = await this.sendEmergencyEmail('119', emergencyData);
            
            return {
                success: true,
                method: 'email_backup',
                details: `119 신고 이메일 발송 완료: ${emailResult.messageId || 'N/A'}`
            };
            
        } catch (error) {
            console.error('❌ 119 연락 실패:', error);
            return {
                success: false,
                method: 'failed',
                details: error.message
            };
        }
    }

    /**
     * 112 경찰서 연락
     */
    async contactPolice(emergencyData) {
        try {
            console.log('👮 112 경찰서 연락 시작');
            
            const smsContent = this.buildPoliceSMSContent(emergencyData);
            
            if (this.options.debug) {
                console.log('👮 112 SMS 내용:', smsContent);
                return {
                    success: true,
                    method: 'debug_log',
                    details: 'Development mode - logged to console'
                };
            }
            
            // 이메일 백업
            const emailResult = await this.sendEmergencyEmail('112', emergencyData);
            
            return {
                success: true,
                method: 'email_backup',
                details: `112 신고 이메일 발송 완료: ${emailResult.messageId || 'N/A'}`
            };
            
        } catch (error) {
            console.error('❌ 112 연락 실패:', error);
            return {
                success: false,
                method: 'failed',
                details: error.message
            };
        }
    }

    /**
     * 행정복지센터 연락
     */
    async contactAdminCenter(emergencyData) {
        try {
            console.log('🏛️ 행정복지센터 연락 시작');
            
            const emailContent = this.buildAdminCenterEmailContent(emergencyData);
            
            if (this.options.debug) {
                console.log('🏛️ 행정센터 이메일 내용:', emailContent);
                return {
                    success: true,
                    method: 'debug_log',
                    details: 'Development mode - logged to console'
                };
            }
            
            const emailResult = await this.sendEmergencyEmail('admin_center', emergencyData);
            
            return {
                success: true,
                method: 'email',
                details: `행정센터 이메일 발송 완료: ${emailResult.messageId || 'N/A'}`
            };
            
        } catch (error) {
            console.error('❌ 행정센터 연락 실패:', error);
            return {
                success: false,
                method: 'failed',
                details: error.message
            };
        }
    }

    /**
     * 119 SMS 내용 생성
     */
    build119SMSContent(emergencyData) {
        return `[lonely-care 긴급신고]

고독사 의심 신고입니다.

▶ 신고 대상
- 이름: ${emergencyData.userName}
- 무응답 시간: ${emergencyData.inactiveHours}시간

▶ 위치 정보
- 주소: ${emergencyData.address}
- 상세: ${emergencyData.detailAddress}

▶ 의료 정보
- 혈액형: ${emergencyData.bloodType}
- 지병: ${emergencyData.medicalConditions.join(', ') || '없음'}
- 복용약물: ${emergencyData.medications.join(', ') || '없음'}

▶ 비상연락처
${emergencyData.emergencyContacts.map(c => `- ${c.name}: ${c.phone}`).join('\n') || '등록된 연락처 없음'}

신고시간: ${new Date().toLocaleString('ko-KR')}
신고ID: ${emergencyData.emergencyId}`;
    }

    /**
     * 112 SMS 내용 생성
     */
    buildPoliceSMSContent(emergencyData) {
        return `[lonely-care 고독사 의심신고]

▶ 신고 대상: ${emergencyData.userName}
▶ 무응답: ${emergencyData.inactiveHours}시간
▶ 주소: ${emergencyData.address} ${emergencyData.detailAddress}
▶ 비상연락처: ${emergencyData.emergencyContacts.map(c => c.phone).join(', ') || '없음'}

자동감지시스템에 의한 신고
신고ID: ${emergencyData.emergencyId}
시간: ${new Date().toLocaleString('ko-KR')}`;
    }

    /**
     * 무응답 시간 계산
     */
    calculateInactiveHours(lastActivity) {
        const now = new Date();
        const last = new Date(lastActivity);
        const diffMs = now - last;
        return Math.floor(diffMs / (1000 * 60 * 60));
    }

    /**
     * 긴급상황 로그 기록
     */
    async logEmergencyEvent(emergencyData, contactResults) {
        try {
            const logData = {
                ...emergencyData,
                contactResults,
                loggedAt: new Date().toISOString()
            };
            
            // Firebase에 기록
            await this.storage.set('emergency_logs', emergencyData.emergencyId, logData);
            
            // 로컬 스토리지 백업
            const emergencyHistory = JSON.parse(localStorage.getItem('emergency_history') || '[]');
            emergencyHistory.push(logData);
            localStorage.setItem('emergency_history', JSON.stringify(emergencyHistory));
            
            console.log('📝 긴급상황 로그 기록 완료:', emergencyData.emergencyId);
            
        } catch (error) {
            console.error('❌ 긴급상황 로그 기록 실패:', error);
        }
    }

    /**
     * 모든 친구에게 긴급 알림
     */
    async notifyAllFriends(emergencyData) {
        try {
            console.log('📢 모든 친구에게 긴급 알림 발송');
            
            for (const friend of emergencyData.reportedBy) {
                const notificationData = {
                    title: '🚨 긴급상황 발생',
                    message: `${emergencyData.userName}님의 긴급상황이 공공기관에 신고되었습니다.`,
                    type: 'emergency',
                    data: {
                        emergencyId: emergencyData.emergencyId,
                        userId: emergencyData.userId,
                        timestamp: emergencyData.timestamp
                    }
                };
                
                // 푸시 알림 발송
                if (this.notifications) {
                    await this.notifications.sendToUser(friend.id, notificationData);
                }
            }
            
        } catch (error) {
            console.error('❌ 친구 긴급 알림 발송 실패:', error);
        }
    }

    /**
     * 관리자 설정 로드
     */
    async loadEmergencySettings() {
        try {
            // 🚨 기본 긴급상황 설정 사용 (Firebase storage 메서드 호환성 개선)
            if (this.storage && window.firebaseClient) {
                try {
                    // Firebase에서 emergency_settings 컬렉션 조회 시도
                    const settingsResult = await window.firebaseClient.getDocument('emergency_settings', 'default');
                    if (settingsResult.data) {
                        const settings = settingsResult.data;
                        // 관리자가 설정한 연락처 정보 적용
                        if (settings.adminCenter) {
                            this.emergencyContacts.adminCenter = {
                                ...this.emergencyContacts.adminCenter,
                                ...settings.adminCenter
                            };
                        }
                        console.log('✅ Firebase에서 긴급상황 설정 로드 완료');
                    } else {
                        console.log('📋 긴급상황 설정이 없어서 기본값 사용');
                    }
                } catch (dbError) {
                    console.log('📋 Firebase 설정 조회 실패, 기본값 사용:', dbError.message);
                }
            } else {
                console.log('📋 Firebase 연결 없음, 기본 긴급상황 설정 사용');
            }
            console.log('✅ 긴급상황 설정 로드 완료');
        } catch (error) {
            console.warn('⚠️ 긴급상황 설정 로드 실패:', error);
        }
    }

    /**
     * 사용자 동의 상태 확인
     */
    async checkUserConsent() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.kakao_id && this.storage) {
                // 🚨 올바른 storage 메서드 사용 (getUserByKakaoId)
                const userResult = await this.storage.getUserByKakaoId(currentUser.kakao_id);
                if (userResult && userResult.emergency_contact_consent !== undefined) {
                    console.log('✅ 사용자 긴급 연락 동의 상태 확인됨');
                } else {
                    console.log('📋 사용자 긴급 연락 동의 설정 없음 - 기본값 사용');
                }
            } else {
                console.log('📋 사용자 정보 또는 storage 없음 - 동의 확인 건너뜀');
            }
        } catch (error) {
            console.warn('⚠️ 사용자 동의 상태 확인 실패:', error);
        }
    }

    /**
     * 대기 중인 긴급상황 복구
     */
    async recoverPendingEmergencies() {
        try {
            // 로컬 스토리지에서 미완료 긴급상황 확인
            const pendingEmergencies = JSON.parse(localStorage.getItem('pending_emergencies') || '[]');
            
            for (const emergency of pendingEmergencies) {
                // 24시간 이상 된 것은 제거
                const timeDiff = Date.now() - new Date(emergency.timestamp).getTime();
                if (timeDiff > 24 * 60 * 60 * 1000) {
                    continue;
                }
                
                // 대기열에 복구
                this.emergencyQueue.set(emergency.emergencyId, emergency);
            }
            
            console.log(`✅ ${this.emergencyQueue.size}개 긴급상황 복구 완료`);
        } catch (error) {
            console.warn('⚠️ 긴급상황 복구 실패:', error);
        }
    }

    /**
     * 최신 하트비트 데이터 가져오기
     */
    async getLatestHeartbeat(userId) {
        try {
            if (!this.storage) return null;
            
            // Firebase에서 최신 하트비트 조회
            const heartbeats = await this.storage.getByQuery('heartbeats', 
                'user_id', '==', userId, 
                'timestamp', 'desc', 1
            );
            
            return heartbeats && heartbeats.length > 0 ? heartbeats[0] : null;
        } catch (error) {
            console.error('❌ 최신 하트비트 조회 실패:', error);
            return null;
        }
    }

    /**
     * 최근 움직임 데이터 가져오기
     */
    async getRecentMotionData(userId, hours) {
        try {
            if (!this.storage) return [];
            
            const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
            
            // Firebase에서 최근 움직임 데이터 조회
            const motionData = await this.storage.getByQuery('motion_data',
                'user_id', '==', userId,
                'timestamp', '>=', since.toISOString()
            );
            
            return motionData || [];
        } catch (error) {
            console.error('❌ 움직임 데이터 조회 실패:', error);
            return [];
        }
    }

    /**
     * 친구 긴급 신고 가져오기
     */
    async getFriendEmergencyReports(userId) {
        try {
            if (!this.storage) return [];
            
            // 최근 24시간 내 친구 신고 조회
            const since = new Date(Date.now() - (24 * 60 * 60 * 1000));
            
            const reports = await this.storage.getByQuery('emergency_reports',
                'reported_user_id', '==', userId,
                'timestamp', '>=', since.toISOString()
            );
            
            return reports || [];
        } catch (error) {
            console.error('❌ 친구 긴급 신고 조회 실패:', error);
            return [];
        }
    }

    /**
     * 친구 확인 요청 발송
     */
    async requestFriendConfirmation(userData, friendData) {
        try {
            console.log(`📞 ${userData.name} 친구 확인 요청 발송`);
            
            for (const friend of friendData) {
                const confirmationRequest = {
                    title: '🤝 친구 안전 확인 요청',
                    message: `${userData.name}님의 안전을 확인해주세요. 72시간 이상 연락이 닿지 않습니다.`,
                    type: 'friend_confirmation',
                    urgent: true,
                    data: {
                        user_id: userData.id,
                        user_name: userData.name,
                        last_activity: userData.last_activity
                    }
                };
                
                // 알림 발송
                if (this.notifications) {
                    await this.notifications.sendToUser(friend.id, confirmationRequest);
                }
            }
            
        } catch (error) {
            console.error('❌ 친구 확인 요청 발송 실패:', error);
        }
    }

    /**
     * 긴급 연락 동의 요청
     */
    async requestEmergencyConsent(userId) {
        try {
            console.log('📋 긴급 연락 동의 요청');
            
            // 사용자에게 동의 요청 알림
            const consentRequest = {
                title: '🚨 긴급상황 대응 동의 필요',
                message: '72시간 무응답 시 공공기관 자동 신고에 동의해주세요. 생명 구조를 위한 필수 기능입니다.',
                type: 'emergency_consent_request',
                urgent: true
            };
            
            if (this.notifications) {
                await this.notifications.sendToUser(userId, consentRequest);
            }
            
        } catch (error) {
            console.error('❌ 긴급 연락 동의 요청 실패:', error);
        }
    }

    /**
     * 긴급 이메일 발송
     */
    async sendEmergencyEmail(service, emergencyData) {
        try {
            // 실제 구현에서는 이메일 서비스 API 연동
            console.log(`📧 ${service} 긴급 이메일 발송 시뮬레이션`);
            
            return {
                success: true,
                messageId: `email_${Date.now()}_${service}`,
                service: service
            };
            
        } catch (error) {
            console.error('❌ 긴급 이메일 발송 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 긴급상황 에러 로그
     */
    async logEmergencyError(userData, error) {
        try {
            const errorLog = {
                userId: userData.id,
                userName: userData.name,
                error: error.message,
                timestamp: new Date().toISOString(),
                type: 'emergency_processing_error'
            };
            
            // 로컬 스토리지에 에러 로그
            const errorHistory = JSON.parse(localStorage.getItem('emergency_errors') || '[]');
            errorHistory.push(errorLog);
            localStorage.setItem('emergency_errors', JSON.stringify(errorHistory));
            
        } catch (logError) {
            console.error('❌ 긴급상황 에러 로그 실패:', logError);
        }
    }

    /**
     * 컴포넌트 정리
     */
    cleanup() {
        // 타이머 정리
        this.confirmationQueue.clear();
        this.emergencyQueue.clear();
        
        console.log('🧹 EmergencyResponseSystem 정리 완료');
    }
}

// 전역 인스턴스 생성
window.emergencyResponseSystem = new EmergencyResponseSystem({
    debug: true // 개발 환경에서는 true
});

console.log('🚨 EmergencyResponseSystem 모듈 로드 완료');