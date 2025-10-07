/**
 * 허위 알림 방지 시스템 - 생명구조 시스템 보안 강화
 * 
 * 주요 기능:
 * 1. 서버 측 타임스탬프 검증
 * 2. 상태 변화 패턴 이상 감지
 * 3. Rate limiting 적용
 * 4. 의심스러운 활동 로깅
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class AntiSpoofingManager {
    constructor() {
        this.className = 'AntiSpoofingManager';
        this.isInitialized = false;
        this.rateLimitMap = new Map(); // 사용자별 요청 제한
        this.suspiciousActivities = [];
        this.maxRequestsPerMinute = 10; // 분당 최대 요청 수
        this.maxTimeDriftMs = 30000; // 허용 가능한 시간 차이 (30초)
        
        console.log('🛡️ [생명구조] 허위 알림 방지 시스템 초기화');
    }

    /**
     * 초기화
     */
    async init() {
        try {
            if (this.isInitialized) return;
            
            // Firebase 연결 확인
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firebase가 초기화되지 않았습니다');
            }
            
            this.db = firebase.firestore();
            this.isInitialized = true;
            
            console.log('✅ [생명구조] 허위 알림 방지 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ [생명구조] 허위 알림 방지 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 서버 타임스탬프와 클라이언트 타임스탬프 검증
     * @param {number} clientTimestamp 클라이언트에서 보낸 타임스탬프
     * @returns {Promise<boolean>} 검증 결과
     */
    async validateTimestamp(clientTimestamp) {
        try {
            // Firebase 서버 타임스탬프 가져오기
            const serverTimestamp = firebase.firestore.Timestamp.now().toMillis();
            const timeDrift = Math.abs(serverTimestamp - clientTimestamp);
            
            if (timeDrift > this.maxTimeDriftMs) {
                await this.logSuspiciousActivity('TIMESTAMP_DRIFT', {
                    clientTimestamp,
                    serverTimestamp,
                    drift: timeDrift
                });
                
                console.warn('⚠️ [생명구조] 의심스러운 타임스탬프 감지:', {
                    클라이언트: new Date(clientTimestamp),
                    서버: new Date(serverTimestamp),
                    차이: `${timeDrift}ms`
                });
                
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ [생명구조] 타임스탬프 검증 실패:', error);
            return false;
        }
    }

    /**
     * Rate limiting 검사
     * @param {string} userId 사용자 ID
     * @returns {boolean} 요청 허용 여부
     */
    checkRateLimit(userId) {
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(userId) || [];
        
        // 1분 이전 요청 제거
        const recentRequests = userRequests.filter(time => now - time < 60000);
        
        if (recentRequests.length >= this.maxRequestsPerMinute) {
            this.logSuspiciousActivity('RATE_LIMIT_EXCEEDED', {
                userId,
                requestCount: recentRequests.length,
                timeWindow: '1분'
            });
            
            console.warn(`⚠️ [생명구조] Rate limit 초과 - 사용자: ${userId}`);
            return false;
        }
        
        // 새 요청 추가
        recentRequests.push(now);
        this.rateLimitMap.set(userId, recentRequests);
        
        return true;
    }

    /**
     * 상태 변화 패턴 검증
     * @param {string} userId 사용자 ID
     * @param {string} oldStatus 이전 상태
     * @param {string} newStatus 새 상태
     * @param {number} timeSinceLastUpdate 마지막 업데이트 이후 시간(ms)
     * @returns {boolean} 패턴이 정상인지 여부
     */
    validateStatusChangePattern(userId, oldStatus, newStatus, timeSinceLastUpdate) {
        try {
            // 비정상적인 상태 변화 패턴 감지
            const suspiciousPatterns = [
                // 너무 빠른 상태 변화 (1분 이내)
                timeSinceLastUpdate < 60000,
                // 위험 상태에서 바로 정상 상태로 변화
                oldStatus === 'danger' && newStatus === 'normal' && timeSinceLastUpdate < 3600000, // 1시간
                // 반복적인 상태 변화
                this.isRepeatedStatusChange(userId, newStatus)
            ];
            
            if (suspiciousPatterns.some(pattern => pattern)) {
                this.logSuspiciousActivity('SUSPICIOUS_STATUS_PATTERN', {
                    userId,
                    oldStatus,
                    newStatus,
                    timeSinceLastUpdate
                });
                
                console.warn('⚠️ [생명구조] 의심스러운 상태 변화 패턴 감지:', {
                    사용자: userId,
                    이전상태: oldStatus,
                    새상태: newStatus,
                    경과시간: `${Math.round(timeSinceLastUpdate / 1000)}초`
                });
                
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ [생명구조] 상태 변화 패턴 검증 실패:', error);
            return true; // 오류 시 기본적으로 허용 (생명구조 우선)
        }
    }

    /**
     * 반복적인 상태 변화 감지
     * @param {string} userId 사용자 ID
     * @param {string} status 상태
     * @returns {boolean} 반복적인 패턴인지 여부
     */
    isRepeatedStatusChange(userId, status) {
        // 구현: 최근 1시간 동안 같은 상태로 5번 이상 변화했는지 확인
        // 여기서는 간단한 로직으로 구현
        return false; // 추후 더 정교한 로직 구현 필요
    }

    /**
     * 의심스러운 활동 로깅
     * @param {string} type 활동 타입
     * @param {Object} details 상세 정보
     */
    async logSuspiciousActivity(type, details) {
        try {
            const logEntry = {
                type,
                details,
                timestamp: firebase.firestore.Timestamp.now(),
                userAgent: navigator.userAgent,
                ip: 'client-side' // 클라이언트에서는 IP 확인 불가
            };
            
            this.suspiciousActivities.push(logEntry);
            
            // Firebase에 로그 저장 (관리자 전용)
            if (this.db) {
                await this.db.collection('securityLogs').add(logEntry);
                console.log('📝 [생명구조] 보안 로그 저장됨:', type);
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 보안 로그 저장 실패:', error);
        }
    }

    /**
     * 하트비트 데이터 검증 (wrapper 방식)
     * @param {Object} heartbeatData 하트비트 데이터
     * @returns {Promise<boolean>} 검증 결과
     */
    async validateHeartbeat(heartbeatData) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }
            
            const { userId, timestamp, motionCount, source } = heartbeatData;
            
            // 1. Rate limiting 검사
            if (!this.checkRateLimit(userId)) {
                return false;
            }
            
            // 2. 타임스탬프 검증
            if (!await this.validateTimestamp(timestamp)) {
                return false;
            }
            
            // 3. 데이터 무결성 검사
            if (!this.validateHeartbeatData(heartbeatData)) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [생명구조] 하트비트 검증 실패:', error);
            return true; // 오류 시 기본적으로 허용 (생명구조 우선)
        }
    }

    /**
     * 하트비트 데이터 무결성 검사
     * @param {Object} heartbeatData 하트비트 데이터
     * @returns {boolean} 데이터가 유효한지 여부
     */
    validateHeartbeatData(heartbeatData) {
        const { userId, timestamp, motionCount, source } = heartbeatData;
        
        // 필수 필드 검사
        if (!userId || !timestamp || typeof motionCount !== 'number') {
            this.logSuspiciousActivity('INVALID_HEARTBEAT_DATA', heartbeatData);
            return false;
        }
        
        // 비정상적인 값 검사
        if (motionCount < 0 || motionCount > 10000) { // 하루 최대 움직임 수 제한
            this.logSuspiciousActivity('ABNORMAL_MOTION_COUNT', heartbeatData);
            return false;
        }
        
        return true;
    }

    /**
     * 친구 상태 업데이트 검증 (wrapper 방식)
     * @param {string} userId 사용자 ID
     * @param {Object} statusData 상태 데이터
     * @returns {Promise<boolean>} 검증 결과
     */
    async validateStatusUpdate(userId, statusData) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }
            
            const { status, timestamp, lastSeen } = statusData;
            
            // 1. Rate limiting 검사
            if (!this.checkRateLimit(userId)) {
                return false;
            }
            
            // 2. 타임스탬프 검증
            if (!await this.validateTimestamp(timestamp)) {
                return false;
            }
            
            // 3. 상태 변화 패턴 검증
            const oldStatus = await this.getLastStatus(userId);
            const timeSinceLastUpdate = timestamp - (oldStatus?.timestamp || 0);
            
            if (!this.validateStatusChangePattern(userId, oldStatus?.status, status, timeSinceLastUpdate)) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [생명구조] 상태 업데이트 검증 실패:', error);
            return true; // 오류 시 기본적으로 허용 (생명구조 우선)
        }
    }

    /**
     * 마지막 상태 조회
     * @param {string} userId 사용자 ID
     * @returns {Promise<Object|null>} 마지막 상태 정보
     */
    async getLastStatus(userId) {
        try {
            if (!this.db) return null;
            
            const doc = await this.db.collection('userStatus').doc(userId).get();
            return doc.exists ? doc.data() : null;
            
        } catch (error) {
            console.error('❌ [생명구조] 마지막 상태 조회 실패:', error);
            return null;
        }
    }

    /**
     * 시스템 상태 확인
     * @returns {Object} 시스템 상태 정보
     */
    getSystemStatus() {
        return {
            초기화됨: this.isInitialized,
            총의심활동: this.suspiciousActivities.length,
            활성Rate제한: this.rateLimitMap.size,
            최대분당요청: this.maxRequestsPerMinute,
            허용시간차이: `${this.maxTimeDriftMs}ms`
        };
    }
}

// 전역 인스턴스 생성 (싱글톤 패턴)
if (typeof window !== 'undefined') {
    window.AntiSpoofingManager = window.AntiSpoofingManager || new AntiSpoofingManager();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AntiSpoofingManager;
}

console.log('🛡️ [생명구조] 허위 알림 방지 시스템 로드 완료 - 보안 강화됨');