/**
 * Firebase Client Configuration
 * Firebase Firestore 기반 lonely-care 앱 데이터베이스 클라이언트
 */

// Firebase SDK는 index.html의 compat 버전 사용
// window.firebase 전역 객체 사용

// Firebase 설정 (firebase-config.js에서 가져옴)
// firebaseConfig는 이미 firebase-config.js에서 전역으로 설정됨

// Firebase 앱 초기화 (compat 모드)
let firebaseClientApp, db;

function initFirebase() {
    if (!window.firebase) {
        throw new Error('Firebase SDK가 로드되지 않았습니다');
    }
    
    firebaseClientApp = firebase.initializeApp(window.firebaseConfig);
    db = firebase.firestore();
    
    // 🚨 생명구조 앱: Firebase Persistence 중복 설정 방지
    if (!window.firebasePersistenceInitialized) {
        try {
            // Firebase v9+ 권장 방식 사용 (merge: true로 호스트 오버라이드 경고 해결)
            db.settings({
                cache: {
                    synchronizeTabs: true
                },
                merge: true
            });
            window.firebasePersistenceInitialized = true;
            console.log('🔥 Firebase 오프라인 지원 활성화됨 (새로운 캐시 설정)');
        } catch (err) {
            // fallback: 구버전 방식 사용
            try {
                db.enablePersistence({ 
                    synchronizeTabs: true // 탭 간 동기화 활성화
                }).then(() => {
                    window.firebasePersistenceInitialized = true;
                    console.log('🔥 Firebase 오프라인 지원 활성화됨 (구버전 방식)');
                }).catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('🔥 Firebase 오프라인: 여러 탭이 열려있어 비활성화됨');
                        window.firebasePersistenceInitialized = true; // 이미 다른 곳에서 설정됨
                    } else if (err.code === 'unimplemented') {
                        console.warn('🔥 Firebase 오프라인: 브라우저에서 지원하지 않음');
                        window.firebasePersistenceInitialized = true;
                    } else {
                        console.warn('🔥 Firebase 오프라인 지원 활성화 실패:', err);
                    }
                });
            } catch (fallbackErr) {
                console.warn('🔥 Firebase 오프라인 지원 초기화 실패:', fallbackErr);
            }
        }
    } else {
        console.log('🔥 Firebase Persistence 이미 초기화됨 - 중복 설정 방지');
    }
    
    return { app: firebaseClientApp, db };
}

/**
 * Firebase 클라이언트 클래스
 */
class FirebaseClient {
    constructor() {
        this.db = null;
        this.app = null;
        this.isInitialized = false;
        this.initPromise = this.initialize();
    }
    
    async initialize() {
        try {
            const { app: firebaseApp, db: firebaseDb } = initFirebase();
            this.app = firebaseApp;
            this.db = firebaseDb;
            this.isInitialized = true;
            console.log('🔥 Firebase Client 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ Firebase Client 초기화 실패:', error);
            this.isInitialized = false;
            return false;
        }
    }
    
    async waitForInit() {
        if (this.isInitialized) return true;
        return await this.initPromise;
    }

    // 사용자 관련 메서드
    async getUser(userId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            // UserIdUtils로 정규화된 ID 사용
            const normalizedId = UserIdUtils.normalizeKakaoId(userId);
            const docRef = this.db.collection('users').doc(normalizedId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                return { data: docSnap.data(), error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            return { data: null, error };
        }
    }

    async getUserByKakaoId(kakaoId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            // UserIdUtils로 정규화된 ID 사용
            const normalizedId = UserIdUtils.normalizeKakaoId(kakaoId);
            
            // 우선 문서 ID로 직접 조회
            const docRef = this.db.collection('users').doc(normalizedId);
            const doc = await docRef.get();
            
            if (doc.exists) {
                return { data: { id: doc.id, ...doc.data() }, error: null };
            }
            
            // 문서 ID로 찾을 수 없으면 kakao_id 필드로 조회
            const querySnapshot = await this.db.collection('users')
                .where('kakao_id', '==', normalizedId)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error('카카오 ID로 사용자 조회 실패:', error);
            return { data: null, error };
        }
    }

    async createUser(userData, customId = null) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            let docRef;
            let documentId;
            
            if (customId) {
                // 사용자 지정 ID로 문서 생성 (kakao_id 사용)
                docRef = this.db.collection('users').doc(customId);
                await docRef.set(userData);
                documentId = customId;
            } else {
                // 자동 생성 ID로 문서 생성
                docRef = await this.db.collection('users').add(userData);
                documentId = docRef.id;
            }
            
            console.log('🔥 사용자 생성 성공:', documentId);
            return { data: { id: documentId, ...userData }, error: null };
        } catch (error) {
            console.error('사용자 생성 실패:', error);
            return { data: null, error };
        }
    }

    async updateUser(userId, userData) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const docRef = this.db.collection('users').doc(userId);
            await docRef.update(userData);
            console.log('🔥 사용자 업데이트 성공:', userId);
            return { error: null };
        } catch (error) {
            console.error('사용자 업데이트 실패:', error);
            return { error };
        }
    }

    // 친구 관련 메서드
    async getFriends(userId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            // 양방향 친구 관계 조회: 내가 추가한 친구 + 나를 추가한 친구
            const [myFriendsSnapshot, friendsOfMeSnapshot] = await Promise.all([
                // 내가 추가한 친구들
                this.db.collection('friends')
                    .where('user_id', '==', userId)
                    .where('status', '==', 'active')
                    .get(),
                // 나를 친구로 추가한 사람들
                this.db.collection('friends')
                    .where('friend_id', '==', userId)
                    .where('status', '==', 'active')
                    .get()
            ]);
            
            const friends = [];
            const friendIds = new Set(); // 중복 제거용
            
            // 내가 추가한 친구들
            myFriendsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!friendIds.has(data.friend_id)) {
                    friends.push({ 
                        id: doc.id, 
                        ...data,
                        friend: data.friend_id, // friends.js에서 사용하는 필드명
                        direction: 'outgoing' // 내가 추가한 친구
                    });
                    friendIds.add(data.friend_id);
                }
            });
            
            // 나를 친구로 추가한 사람들
            friendsOfMeSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!friendIds.has(data.user_id)) {
                    friends.push({ 
                        id: doc.id, 
                        ...data, 
                        friend_id: data.user_id, // 역방향이므로 user_id가 실제 친구 ID
                        friend: data.user_id, // friends.js에서 사용하는 필드명 (역방향)
                        user_id: data.friend_id, // 역방향이므로 friend_id가 내 ID
                        direction: 'incoming' // 나를 추가한 친구
                    });
                    friendIds.add(data.user_id);
                }
            });
            
            console.log(`🔍 친구 관계 조회 완료: ${friends.length}명 (내가 추가: ${myFriendsSnapshot.size}명, 나를 추가: ${friendsOfMeSnapshot.size}명)`);
            
            return { data: friends, error: null };
        } catch (error) {
            console.error('친구 목록 조회 실패:', error);
            return { data: [], error };
        }
    }

    async addFriend(friendData) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const docRef = await this.db.collection('friends').add(friendData);
            console.log('🔥 친구 추가 성공:', docRef.id);
            return { data: { id: docRef.id, ...friendData }, error: null };
        } catch (error) {
            console.error('친구 추가 실패:', error);
            return { data: null, error };
        }
    }

    // 초대 코드 관련 메서드
    async getInviteCode(userId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const querySnapshot = await this.db.collection('invite_codes')
                .where('user_id', '==', userId)
                .where('is_active', '==', true)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error('초대코드 조회 실패:', error);
            return { data: null, error };
        }
    }

    async createInviteCode(codeData) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const docRef = await this.db.collection('invite_codes').add(codeData);
            console.log('🔥 초대코드 생성 성공:', docRef.id);
            return { data: { id: docRef.id, ...codeData }, error: null };
        } catch (error) {
            console.error('초대코드 생성 실패:', error);
            return { data: null, error };
        }
    }

    async findUserByInviteCode(inviteCode) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            // 임시 해결책: 단계별 필터링으로 복합 인덱스 요구사항 우회
            const querySnapshot = await this.db.collection('invite_codes')
                .where('invite_code', '==', inviteCode)
                .limit(10)
                .get();
            
            // 클라이언트에서 추가 필터링
            const validCodes = querySnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.is_active === true && 
                       data.expires_at && 
                       data.expires_at.toMillis() > Date.now();
            });
            
            if (validCodes.length === 0) {
                return { data: null, error: null };
            }
            
            const codeDoc = validCodes[0];
            const codeData = codeDoc.data();
            
            // 해당 사용자 정보도 함께 조회
            const userDoc = await this.db.collection('users').doc(codeData.user_id).get();
            if (userDoc.exists) {
                return { 
                    data: {
                        invite_code_id: codeDoc.id,
                        ...codeData,
                        user: { id: userDoc.id, ...userDoc.data() }
                    }, 
                    error: null 
                };
            }
            
            return { data: null, error: null };
        } catch (error) {
            console.error('초대코드로 사용자 조회 실패:', error);
            return { data: null, error };
        }
    }

    async checkFriendshipExists(userId1, userId2) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const querySnapshot = await this.db.collection('friends')
                .where('user_id', '==', userId1)
                .where('friend_id', '==', userId2)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            return { exists: !querySnapshot.empty, error: null };
        } catch (error) {
            console.error('친구 관계 확인 실패:', error);
            return { exists: false, error };
        }
    }

    async deleteFriendship(userId, friendId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            // 양방향 친구 관계 삭제를 위한 배치 처리
            const batch = this.db.batch();
            
            // 사용자 -> 친구 관계 삭제
            const userToFriendQuery = await this.db.collection('friends')
                .where('user_id', '==', userId)
                .where('friend_id', '==', friendId)
                .get();
            
            userToFriendQuery.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 친구 -> 사용자 관계 삭제
            const friendToUserQuery = await this.db.collection('friends')
                .where('user_id', '==', friendId)
                .where('friend_id', '==', userId)
                .get();
            
            friendToUserQuery.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('🔥 친구 관계 삭제 성공');
            return { success: true, error: null };
        } catch (error) {
            console.error('친구 관계 삭제 실패:', error);
            return { success: false, error };
        }
    }

    // 모션 데이터 관련 메서드
    async saveMotionData(motionData) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const docRef = await this.db.collection('motion_data').add({
                ...motionData,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { data: { id: docRef.id, ...motionData }, error: null };
        } catch (error) {
            console.error('모션 데이터 저장 실패:', error);
            return { data: null, error };
        }
    }

    // 알림 설정 관련 메서드
    async getNotificationSettings(userId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const querySnapshot = await this.db.collection('notification_settings')
                .where('user_id', '==', userId)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                // 기본 설정 반환
                return { 
                    data: {
                        user_id: userId,
                        push_notifications: true,
                        friend_notifications: true,
                        warning_notifications: true,
                        danger_notifications: true,
                        emergency_notifications: true
                    }, 
                    error: null 
                };
            }
        } catch (error) {
            console.error('알림 설정 조회 실패:', error);
            return { data: null, error };
        }
    }

    // 실시간 구독 메서드
    async subscribeToFriendsStatus(userId, callback) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            return this.db.collection('user_status')
                .where('user_id', '==', userId)
                .onSnapshot((querySnapshot) => {
                    const statusData = [];
                    querySnapshot.forEach((doc) => {
                        statusData.push({ id: doc.id, ...doc.data() });
                    });
                    callback(statusData);
                });
        } catch (error) {
            console.error('실시간 구독 실패:', error);
            return () => {}; // 빈 구독 해제 함수 반환
        }
    }

    // 카카오 ID로 사용자 조회
    async getUserByKakaoId(kakaoId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const querySnapshot = await this.db.collection('users')
                .where('kakao_id', '==', kakaoId)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error('카카오 ID로 사용자 조회 실패:', error);
            return { data: null, error };
        }
    }

    // 문서 조회
    async getDocument(collection, docId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const doc = await this.db.collection(collection).doc(docId).get();
            
            if (doc.exists) {
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error(`문서 조회 실패 (${collection}/${docId}):`, error);
            return { data: null, error };
        }
    }

    // 쿼리 조회
    async queryDocuments(collection, where = [], orderBy = null, limit = null) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            let query = this.db.collection(collection);
            
            // Where 조건 추가
            for (const [field, operator, value] of where) {
                query = query.where(field, operator, value);
            }
            
            // OrderBy 추가
            if (orderBy) {
                query = query.orderBy(orderBy[0], orderBy[1] || 'asc');
            }
            
            // Limit 추가
            if (limit) {
                query = query.limit(limit);
            }
            
            const querySnapshot = await query.get();
            const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return { data: docs, error: null };
        } catch (error) {
            console.error(`쿼리 실행 실패 (${collection}):`, error);
            return { data: [], error };
        }
    }


    // 사용자 조회
    async getUser(userId) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const doc = await this.db.collection('users').doc(userId).get();
            
            if (doc.exists) {
                return { data: { id: doc.id, ...doc.data() }, error: null };
            } else {
                return { data: null, error: null };
            }
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            return { data: null, error };
        }
    }

    // 문서 저장/업데이트
    async setDocument(collection, docId, data, merge = true) {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            await this.db.collection(collection).doc(docId).set(data, { merge });
            console.log(`🔥 문서 저장 성공 (${collection}/${docId})`);
            return { success: true, error: null };
        } catch (error) {
            console.error(`문서 저장 실패 (${collection}/${docId}):`, error);
            return { success: false, error };
        }
    }

    // 초기화 대기
    async waitForInit() {
        if (this.isInitialized) return true;
        
        // 최대 5초 대기
        for (let i = 0; i < 50; i++) {
            if (this.isInitialized) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Firebase 초기화 대기 타임아웃');
    }

    // 연결 상태 확인
    async checkConnection() {
        try {
            await this.waitForInit();
            if (!this.isInitialized) throw new Error('Firebase가 초기화되지 않았습니다');
            
            const testDoc = await this.db.collection('connection_test').doc('test').get();
            return { connected: true, error: null };
        } catch (error) {
            console.warn('🔥 Firebase 연결 확인 실패:', error);
            return { connected: false, error };
        }
    }

    // 🚨 생명구조 시스템: Firebase 초기화 관리자용 테스트 연결 메서드
    async testConnection() {
        try {
            await this.waitForInit();
            if (!this.isInitialized) {
                return { connected: false, error: 'Firebase가 초기화되지 않았습니다' };
            }
            
            // 간단한 연결 테스트 (읽기 권한이 있는 컬렉션)
            const testDoc = await this.db.collection('connection_test').doc('ping').get();
            
            console.log('✅ [생명구조] Firebase 연결 테스트 성공');
            return { connected: true, error: null };
            
        } catch (error) {
            console.warn('⚠️ [생명구조] Firebase 연결 테스트 실패:', error);
            return { connected: false, error: error.message || '연결 테스트 실패' };
        }
    }
}

// 전역 Firebase 클라이언트 인스턴스 생성 함수
function initializeFirebaseClient() {
    if (!window.firebaseClient) {
        window.firebaseClient = new FirebaseClient();
        // 기존 Supabase 클라이언트와 호환성을 위한 별칭
        window.supabaseClient = window.firebaseClient;
        console.log('🔥 Firebase Client 전역 등록 완료');
    }
    return window.firebaseClient;
}

// 즉시 초기화 시도
if (typeof window !== 'undefined' && window.firebase) {
    initializeFirebaseClient();
} else {
    // Firebase SDK 로드를 기다림
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            if (window.firebase) {
                initializeFirebaseClient();
            }
        });
    }
}

// 전역 초기화 함수 노출
window.initializeFirebaseClient = initializeFirebaseClient;