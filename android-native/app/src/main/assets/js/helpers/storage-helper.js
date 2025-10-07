/**
 * LocalStorage 접근을 위한 통합 헬퍼 클래스
 * 중복되는 localStorage 코드를 통합하여 관리
 */
class StorageHelper {
    /**
     * 현재 사용자 정보 가져오기
     * @returns {Object|null} 사용자 객체 또는 null
     */
    static getUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            return null;
        }
    }
    
    /**
     * 현재 사용자 정보 저장
     * @param {Object} user - 사용자 객체
     * @returns {boolean} 저장 성공 여부
     */
    static setUser(user) {
        try {
            if (!user) {
                localStorage.removeItem('currentUser');
                return true;
            }
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        } catch (error) {
            console.error('사용자 정보 저장 실패:', error);
            return false;
        }
    }
    
    /**
     * 현재 사용자 정보 삭제
     * @returns {boolean} 삭제 성공 여부
     */
    static removeUser() {
        try {
            localStorage.removeItem('currentUser');
            return true;
        } catch (error) {
            console.error('사용자 정보 삭제 실패:', error);
            return false;
        }
    }
    
    /**
     * 값 가져오기 (자동 JSON 파싱)
     * @param {string} key - 키
     * @param {any} defaultValue - 기본값
     * @returns {any} 저장된 값 또는 기본값
     */
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            
            // JSON 파싱 시도, 실패하면 원본 값 반환
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Storage get 실패 (${key}):`, error);
            return defaultValue;
        }
    }
    
    /**
     * 값 저장 (자동 JSON 문자열화)
     * @param {string} key - 키
     * @param {any} value - 값
     * @returns {boolean} 저장 성공 여부
     */
    static set(key, value) {
        try {
            if (value === undefined || value === null) {
                localStorage.removeItem(key);
                return true;
            }
            
            const toStore = typeof value === 'object' ? JSON.stringify(value) : value;
            localStorage.setItem(key, toStore);
            return true;
        } catch (error) {
            console.error(`Storage set 실패 (${key}):`, error);
            return false;
        }
    }
    
    /**
     * 키 존재 여부 확인
     * @param {string} key - 키
     * @returns {boolean} 존재 여부
     */
    static has(key) {
        return localStorage.getItem(key) !== null;
    }
    
    /**
     * 키 삭제
     * @param {string} key - 키
     * @returns {boolean} 삭제 성공 여부
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage remove 실패 (${key}):`, error);
            return false;
        }
    }
    
    /**
     * 여러 키 삭제
     * @param {string[]} keys - 삭제할 키 배열
     * @returns {boolean} 모든 삭제 성공 여부
     */
    static removeMultiple(keys) {
        let allSuccess = true;
        keys.forEach(key => {
            if (!this.remove(key)) {
                allSuccess = false;
            }
        });
        return allSuccess;
    }
    
    /**
     * 모든 저장된 키 목록 가져오기
     * @returns {string[]} 키 배열
     */
    static getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
        }
        return keys;
    }
    
    /**
     * 프로젝트 관련 키만 가져오기
     * @param {string} prefix - 접두사
     * @returns {string[]} 키 배열
     */
    static getKeysByPrefix(prefix) {
        return this.getAllKeys().filter(key => key.startsWith(prefix));
    }
    
    /**
     * 숫자 값 증가
     * @param {string} key - 키
     * @param {number} increment - 증가값 (기본: 1)
     * @returns {number} 증가 후 값
     */
    static increment(key, increment = 1) {
        const current = this.get(key, 0);
        const newValue = (typeof current === 'number' ? current : 0) + increment;
        this.set(key, newValue);
        return newValue;
    }
    
    /**
     * 숫자 값 감소
     * @param {string} key - 키
     * @param {number} decrement - 감소값 (기본: 1)
     * @returns {number} 감소 후 값
     */
    static decrement(key, decrement = 1) {
        return this.increment(key, -decrement);
    }
    
    /**
     * 배열에 항목 추가
     * @param {string} key - 키
     * @param {any} item - 추가할 항목
     * @returns {any[]} 업데이트된 배열
     */
    static pushToArray(key, item) {
        const array = this.get(key, []);
        if (!Array.isArray(array)) {
            console.warn(`키 '${key}'의 값이 배열이 아닙니다. 새 배열로 초기화합니다.`);
            const newArray = [item];
            this.set(key, newArray);
            return newArray;
        }
        
        array.push(item);
        this.set(key, array);
        return array;
    }
    
    /**
     * 배열에서 항목 제거
     * @param {string} key - 키
     * @param {any} item - 제거할 항목
     * @returns {any[]} 업데이트된 배열
     */
    static removeFromArray(key, item) {
        const array = this.get(key, []);
        if (!Array.isArray(array)) return [];
        
        const filteredArray = array.filter(arrayItem => arrayItem !== item);
        this.set(key, filteredArray);
        return filteredArray;
    }
    
    /**
     * 객체의 속성 업데이트
     * @param {string} key - 키
     * @param {string} property - 속성명
     * @param {any} value - 새 값
     * @returns {Object} 업데이트된 객체
     */
    static updateObjectProperty(key, property, value) {
        const obj = this.get(key, {});
        if (typeof obj !== 'object' || obj === null) {
            console.warn(`키 '${key}'의 값이 객체가 아닙니다. 새 객체로 초기화합니다.`);
            const newObj = { [property]: value };
            this.set(key, newObj);
            return newObj;
        }
        
        obj[property] = value;
        this.set(key, obj);
        return obj;
    }
    
    /**
     * 만료 시간과 함께 값 저장
     * @param {string} key - 키
     * @param {any} value - 값
     * @param {number} expirationMinutes - 만료 시간 (분)
     * @returns {boolean} 저장 성공 여부
     */
    static setWithExpiration(key, value, expirationMinutes) {
        const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
        const dataToStore = {
            value: value,
            expiration: expirationTime
        };
        
        return this.set(key, dataToStore);
    }
    
    /**
     * 만료 시간 확인 후 값 가져오기
     * @param {string} key - 키
     * @param {any} defaultValue - 기본값
     * @returns {any} 저장된 값 또는 기본값
     */
    static getWithExpiration(key, defaultValue = null) {
        const data = this.get(key);
        
        if (!data || typeof data !== 'object' || !data.expiration) {
            return defaultValue;
        }
        
        if (Date.now() > data.expiration) {
            this.remove(key);
            return defaultValue;
        }
        
        return data.value;
    }
    
    /**
     * localStorage 크기 확인
     * @returns {Object} 크기 정보 객체
     */
    static getStorageSize() {
        let totalSize = 0;
        const keyCount = localStorage.length;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        return {
            totalSize: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            keyCount: keyCount
        };
    }
    
    /**
     * 프로젝트 관련 데이터 정리
     * @param {string[]} prefixes - 정리할 접두사 배열
     * @returns {number} 정리된 키 개수
     */
    static cleanup(prefixes = ['lonely-care-', 'motion', 'kakao', 'friend']) {
        let cleanedCount = 0;
        
        prefixes.forEach(prefix => {
            const keys = this.getKeysByPrefix(prefix);
            keys.forEach(key => {
                this.remove(key);
                cleanedCount++;
            });
        });
        
        console.log(`💾 Storage 정리 완료: ${cleanedCount}개 키 삭제`);
        return cleanedCount;
    }
}

// 전역으로 사용 가능하게 설정
window.StorageHelper = StorageHelper;

// 이전 코드와의 호환성을 위한 별칭
window.LocalStorageHelper = StorageHelper;