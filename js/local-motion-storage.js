// 로컬 저장소를 활용한 움직임 감지 관리 시스템
// 24시간 미만의 비정상 상태는 로컬에 저장하여 DB 부하 감소

class LocalMotionStorage {
    constructor() {
        this.STORAGE_KEY = 'motion_detection_local';
        this.ABNORMAL_THRESHOLD = 24; // 24시간 미만은 로컬 저장
        this.lastSyncTime = null;
    }

    // 로컬 스토리지에서 데이터 가져오기
    getLocalData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('[LocalMotionStorage] 로컬 데이터 읽기 실패:', error);
            return {};
        }
    }

    // 로컬 스토리지에 데이터 저장
    saveLocalData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('[LocalMotionStorage] 로컬 데이터 저장 실패:', error);
        }
    }

    // 비정상 카운트 업데이트
    updateAbnormalCount(userId, count) {
        const data = this.getLocalData();
        const now = new Date().toISOString();

        if (!data[userId]) {
            data[userId] = {
                abnormalCount: 0,
                firstDetected: now,
                lastUpdated: now,
                syncedToDb: false
            };
        }

        data[userId].abnormalCount = count;
        data[userId].lastUpdated = now;

        // 24시간 이상이면 DB로 동기화 필요
        if (count >= this.ABNORMAL_THRESHOLD) {
            data[userId].syncedToDb = true;
            // DB 동기화는 motion-detection.js에서 처리
        }

        this.saveLocalData(data);
        return data[userId];
    }

    // 정상 상태로 복귀 시 로컬 데이터 삭제
    clearUserData(userId) {
        const data = this.getLocalData();
        if (data[userId]) {
            delete data[userId];
            this.saveLocalData(data);
            console.log(`[LocalMotionStorage] ${userId}의 로컬 데이터 삭제됨`);
        }
    }

    // 특정 사용자의 비정상 카운트 가져오기
    getUserAbnormalCount(userId) {
        const data = this.getLocalData();
        return data[userId]?.abnormalCount || 0;
    }

    // DB 동기화가 필요한 사용자 목록
    getUsersNeedingSync() {
        const data = this.getLocalData();
        const users = [];
        
        Object.keys(data).forEach(userId => {
            const userData = data[userId];
            if (userData.abnormalCount >= this.ABNORMAL_THRESHOLD && !userData.syncedToDb) {
                users.push({
                    userId,
                    abnormalCount: userData.abnormalCount,
                    firstDetected: userData.firstDetected
                });
            }
        });

        return users;
    }

    // 오래된 로컬 데이터 정리 (7일 이상)
    cleanupOldData() {
        const data = this.getLocalData();
        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        let hasChanges = false;

        Object.keys(data).forEach(userId => {
            const lastUpdated = new Date(data[userId].lastUpdated);
            if (lastUpdated < sevenDaysAgo) {
                delete data[userId];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveLocalData(data);
            console.log('[LocalMotionStorage] 오래된 데이터 정리 완료');
        }
    }

    // 디버그용: 현재 로컬 저장소 상태 출력
    debugPrintStatus() {
        const data = this.getLocalData();
        console.log('[LocalMotionStorage] 현재 상태:', {
            userCount: Object.keys(data).length,
            users: data
        });
    }
}

// 전역 인스턴스 생성
window.localMotionStorage = new LocalMotionStorage();