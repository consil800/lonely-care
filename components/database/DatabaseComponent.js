/**
 * 데이터베이스 컴포넌트
 * Firebase Firestore 연동을 위한 통합 컴포넌트
 */

class DatabaseComponent {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        
        console.log('📀 DatabaseComponent 초기화');
    }

    /**
     * Firebase 초기화
     */
    async init() {
        try {
            // Firebase 앱이 초기화될 때까지 대기
            await this.waitForFirebase();
            
            if (firebase.apps.length === 0) {
                throw new Error('Firebase 앱이 초기화되지 않았습니다');
            }

            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Firestore 설정
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

            this.isInitialized = true;
            console.log('✅ DatabaseComponent 초기화 완료');
            
            return true;
        } catch (error) {
            console.error('❌ DatabaseComponent 초기화 실패:', error);
            return false;
        }
    }

    /**
     * Firebase 로드 대기
     */
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Firebase 로드 타임아웃');
    }

    /**
     * 컬렉션 조회
     */
    async getCollection(collectionName, options = {}) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            let query = this.db.collection(collectionName);
            
            // 조건 추가
            if (options.where) {
                for (const condition of options.where) {
                    query = query.where(condition.field, condition.operator, condition.value);
                }
            }
            
            // 정렬 추가
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }
            
            // 제한 추가
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
        } catch (error) {
            console.error(`컬렉션 조회 실패 (${collectionName}):`, error);
            throw error;
        }
    }

    /**
     * 문서 조회
     */
    async getDocument(collectionName, docId) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            const doc = await this.db.collection(collectionName).doc(docId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                return null;
            }
            
        } catch (error) {
            console.error(`문서 조회 실패 (${collectionName}/${docId}):`, error);
            throw error;
        }
    }

    /**
     * 문서 추가
     */
    async addDocument(collectionName, data) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            const docRef = await this.db.collection(collectionName).add({
                ...data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
            return docRef.id;
            
        } catch (error) {
            console.error(`문서 추가 실패 (${collectionName}):`, error);
            throw error;
        }
    }

    /**
     * 문서 업데이트
     */
    async updateDocument(collectionName, docId, data) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            await this.db.collection(collectionName).doc(docId).update({
                ...data,
                updated_at: new Date().toISOString()
            });
            
            return true;
            
        } catch (error) {
            console.error(`문서 업데이트 실패 (${collectionName}/${docId}):`, error);
            throw error;
        }
    }

    /**
     * 문서 삭제
     */
    async deleteDocument(collectionName, docId) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            await this.db.collection(collectionName).doc(docId).delete();
            return true;
            
        } catch (error) {
            console.error(`문서 삭제 실패 (${collectionName}/${docId}):`, error);
            throw error;
        }
    }

    /**
     * 실시간 리스너 추가
     */
    addListener(collectionName, callback, options = {}) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            let query = this.db.collection(collectionName);
            
            // 조건 추가
            if (options.where) {
                for (const condition of options.where) {
                    query = query.where(condition.field, condition.operator, condition.value);
                }
            }
            
            // 정렬 추가
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }

            return query.onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(data);
            }, error => {
                console.error(`리스너 오류 (${collectionName}):`, error);
            });
            
        } catch (error) {
            console.error(`리스너 추가 실패 (${collectionName}):`, error);
            throw error;
        }
    }

    /**
     * 배치 작업
     */
    createBatch() {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        return this.db.batch();
    }

    /**
     * 트랜잭션 실행
     */
    async runTransaction(updateFunction) {
        if (!this.isInitialized) {
            throw new Error('DatabaseComponent가 초기화되지 않았습니다');
        }

        try {
            return await this.db.runTransaction(updateFunction);
        } catch (error) {
            console.error('트랜잭션 실행 실패:', error);
            throw error;
        }
    }

    /**
     * 연결 상태 확인
     */
    isConnected() {
        return this.isInitialized && this.db !== null;
    }

    /**
     * 현재 사용자 ID 반환
     */
    getCurrentUserId() {
        return this.auth?.currentUser?.uid || null;
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        console.log('🗑️ DatabaseComponent 정리 완료');
    }
}

// 전역 인스턴스
let databaseComponent = null;

/**
 * DatabaseComponent 초기화 및 반환
 */
async function initDatabaseComponent() {
    if (!databaseComponent) {
        databaseComponent = new DatabaseComponent();
        await databaseComponent.init();
        window.databaseComponent = databaseComponent;
    }
    return databaseComponent;
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseComponent, initDatabaseComponent };
} else {
    window.DatabaseComponent = DatabaseComponent;
    window.initDatabaseComponent = initDatabaseComponent;
}