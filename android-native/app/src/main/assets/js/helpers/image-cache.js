/**
 * 이미지 캐싱 시스템
 * 프로필 사진 등의 이미지를 효율적으로 캐시하여 데이터 및 배터리 절약
 */
class ImageCacheManager {
    constructor() {
        this.cachePrefix = 'lonely-care-img-';
        this.maxCacheSize = 50; // 최대 50개 이미지 캐시
        this.maxImageSize = 5 * 1024 * 1024; // 5MB 제한
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7일 만료
        this.loadingImages = new Map(); // 로딩 중인 이미지들
        this.compressionQuality = 0.8; // 압축 품질
        
        this.initializeCache();
    }
    
    /**
     * 캐시 초기화
     */
    async initializeCache() {
        try {
            // 만료된 캐시 정리
            await this.cleanExpiredCache();
            
            console.log('🖼️ ImageCacheManager 초기화 완료');
        } catch (error) {
            console.error('이미지 캐시 초기화 실패:', error);
        }
    }
    
    /**
     * 이미지 로드 (캐시 우선)
     * @param {string} imageUrl - 이미지 URL
     * @param {Object} options - 옵션 (placeholder, errorImage 등)
     * @returns {Promise<string>} 이미지 데이터 URL
     */
    async loadImage(imageUrl, options = {}) {
        if (!imageUrl) {
            return options.placeholder || this.getPlaceholderImage();
        }
        
        const cacheKey = this.getCacheKey(imageUrl);
        
        try {
            // 1. 캐시에서 확인
            const cachedImage = await this.getCachedImage(cacheKey);
            if (cachedImage) {
                console.log('🚀 이미지 캐시 적중:', imageUrl);
                return cachedImage;
            }
            
            // 2. 이미 로딩 중인지 확인
            if (this.loadingImages.has(imageUrl)) {
                console.log('⏳ 이미지 로딩 대기:', imageUrl);
                return await this.loadingImages.get(imageUrl);
            }
            
            // 3. 새로운 이미지 로드
            const loadPromise = this.fetchAndCacheImage(imageUrl, options);
            this.loadingImages.set(imageUrl, loadPromise);
            
            const result = await loadPromise;
            this.loadingImages.delete(imageUrl);
            
            return result;
            
        } catch (error) {
            this.loadingImages.delete(imageUrl);
            console.warn('이미지 로드 실패:', imageUrl, error);
            return options.errorImage || this.getErrorImage();
        }
    }
    
    /**
     * 이미지 페치 및 캐싱
     * @param {string} imageUrl - 이미지 URL
     * @param {Object} options - 옵션
     * @returns {Promise<string>} 이미지 데이터 URL
     */
    async fetchAndCacheImage(imageUrl, options = {}) {
        console.log('📥 이미지 다운로드 시작:', imageUrl);
        
        try {
            // Fetch로 이미지 다운로드
            const response = await fetch(imageUrl, {
                method: 'GET',
                cache: 'default',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // 크기 체크
            if (blob.size > this.maxImageSize) {
                console.warn('이미지 크기가 너무 큼:', blob.size);
                // 압축 시도
                const compressedDataUrl = await this.compressImage(blob);
                await this.setCachedImage(this.getCacheKey(imageUrl), compressedDataUrl);
                return compressedDataUrl;
            }
            
            // Blob을 DataURL로 변환
            const dataUrl = await this.blobToDataUrl(blob);
            
            // 캐시에 저장
            await this.setCachedImage(this.getCacheKey(imageUrl), dataUrl);
            
            console.log('✅ 이미지 캐싱 완료:', imageUrl);
            return dataUrl;
            
        } catch (error) {
            console.error('이미지 페치 실패:', error);
            throw error;
        }
    }
    
    /**
     * 이미지 압축
     * @param {Blob} blob - 원본 이미지 Blob
     * @returns {Promise<string>} 압축된 이미지 데이터 URL
     */
    async compressImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                // 최대 크기 제한 (프로필 이미지용)
                const maxWidth = 300;
                const maxHeight = 300;
                
                let { width, height } = img;
                
                // 비율 유지하면서 리사이즈
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 고화질로 그리기
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // 압축된 데이터 URL 생성
                const compressedDataUrl = canvas.toDataURL('image/jpeg', this.compressionQuality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }
    
    /**
     * Blob을 DataURL로 변환
     * @param {Blob} blob - 변환할 Blob
     * @returns {Promise<string>} DataURL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * 캐시 키 생성
     * @param {string} imageUrl - 이미지 URL
     * @returns {string} 캐시 키
     */
    getCacheKey(imageUrl) {
        // URL을 해시화하여 키 생성
        const hash = this.simpleHash(imageUrl);
        return `${this.cachePrefix}${hash}`;
    }
    
    /**
     * 간단한 해시 함수
     * @param {string} str - 해시할 문자열
     * @returns {string} 해시값
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit 정수로 변환
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 캐시된 이미지 가져오기
     * @param {string} cacheKey - 캐시 키
     * @returns {Promise<string|null>} 캐시된 이미지 또는 null
     */
    async getCachedImage(cacheKey) {
        try {
            const cacheData = localStorage.getItem(cacheKey);
            if (!cacheData) return null;
            
            const parsed = JSON.parse(cacheData);
            
            // 만료 확인
            if (Date.now() - parsed.timestamp > this.cacheExpiry) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return parsed.dataUrl;
        } catch (error) {
            console.warn('캐시 읽기 실패:', error);
            return null;
        }
    }
    
    /**
     * 이미지를 캐시에 저장
     * @param {string} cacheKey - 캐시 키
     * @param {string} dataUrl - 이미지 데이터 URL
     * @returns {Promise<void>}
     */
    async setCachedImage(cacheKey, dataUrl) {
        try {
            // 캐시 크기 제한 확인
            await this.manageCacheSize();
            
            const cacheData = {
                dataUrl,
                timestamp: Date.now(),
                size: dataUrl.length
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('로컬스토리지 용량 초과, 오래된 캐시 정리');
                await this.cleanOldestCache();
                // 재시도
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({ dataUrl, timestamp: Date.now(), size: dataUrl.length }));
                } catch (retryError) {
                    console.error('캐시 저장 재시도 실패:', retryError);
                }
            } else {
                console.error('캐시 저장 실패:', error);
            }
        }
    }
    
    /**
     * 캐시 크기 관리
     */
    async manageCacheSize() {
        const cacheKeys = this.getCacheKeys();
        
        if (cacheKeys.length >= this.maxCacheSize) {
            console.log('🗑️ 캐시 크기 제한 도달, 오래된 항목 정리');
            await this.cleanOldestCache(cacheKeys.length - this.maxCacheSize + 5);
        }
    }
    
    /**
     * 만료된 캐시 정리
     */
    async cleanExpiredCache() {
        const cacheKeys = this.getCacheKeys();
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const key of cacheKeys) {
            try {
                const cacheData = localStorage.getItem(key);
                if (cacheData) {
                    const parsed = JSON.parse(cacheData);
                    if (now - parsed.timestamp > this.cacheExpiry) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                // 파싱 실패한 캐시는 삭제
                localStorage.removeItem(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 만료된 이미지 캐시 ${cleanedCount}개 정리`);
        }
    }
    
    /**
     * 가장 오래된 캐시 정리
     * @param {number} count - 정리할 개수
     */
    async cleanOldestCache(count = 5) {
        const cacheKeys = this.getCacheKeys();
        const cacheItems = [];
        
        // 타임스탬프와 함께 정렬
        for (const key of cacheKeys) {
            try {
                const cacheData = localStorage.getItem(key);
                if (cacheData) {
                    const parsed = JSON.parse(cacheData);
                    cacheItems.push({ key, timestamp: parsed.timestamp });
                }
            } catch (error) {
                // 파싱 실패한 항목도 삭제 대상
                cacheItems.push({ key, timestamp: 0 });
            }
        }
        
        // 오래된 순으로 정렬
        cacheItems.sort((a, b) => a.timestamp - b.timestamp);
        
        // 지정된 개수만큼 삭제
        const toDelete = cacheItems.slice(0, count);
        toDelete.forEach(item => {
            localStorage.removeItem(item.key);
        });
        
        console.log(`🗑️ 오래된 이미지 캐시 ${toDelete.length}개 정리`);
    }
    
    /**
     * 캐시 키들 가져오기
     * @returns {string[]} 캐시 키 배열
     */
    getCacheKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                keys.push(key);
            }
        }
        return keys;
    }
    
    /**
     * 플레이스홀더 이미지 생성
     * @returns {string} 플레이스홀더 이미지 데이터 URL
     */
    getPlaceholderImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        // 그라디언트 배경
        const gradient = ctx.createLinearGradient(0, 0, 100, 100);
        gradient.addColorStop(0, '#f0f0f0');
        gradient.addColorStop(1, '#e0e0e0');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 100, 100);
        
        // 사용자 아이콘
        ctx.fillStyle = '#999';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', 50, 50);
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * 오류 이미지 생성
     * @returns {string} 오류 이미지 데이터 URL
     */
    getErrorImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        // 빨간 배경
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, 100, 100);
        
        // 오류 아이콘
        ctx.fillStyle = '#f44336';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❌', 50, 50);
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * 캐시 통계
     * @returns {Object} 통계 정보
     */
    getStats() {
        const cacheKeys = this.getCacheKeys();
        let totalSize = 0;
        
        cacheKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += data.length;
                }
            } catch (error) {
                // 무시
            }
        });
        
        return {
            cacheCount: cacheKeys.length,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            maxCacheSize: this.maxCacheSize
        };
    }
    
    /**
     * 모든 캐시 삭제
     */
    clearAllCache() {
        const cacheKeys = this.getCacheKeys();
        cacheKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        console.log(`🗑️ 모든 이미지 캐시 삭제 완료: ${cacheKeys.length}개 항목`);
    }
    
    /**
     * 프리로드 (미리 캐시)
     * @param {string[]} imageUrls - 프리로드할 이미지 URL들
     */
    async preloadImages(imageUrls) {
        console.log(`📦 이미지 프리로드 시작: ${imageUrls.length}개`);
        
        const preloadPromises = imageUrls.map(url => 
            this.loadImage(url).catch(error => {
                console.warn(`프리로드 실패: ${url}`, error);
                return null;
            })
        );
        
        const results = await Promise.allSettled(preloadPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`✅ 이미지 프리로드 완료: ${successCount}/${imageUrls.length}`);
    }
}

// 전역 인스턴스 생성
window.imageCacheManager = new ImageCacheManager();

// 주기적 캐시 정리 (30분마다)
setInterval(() => {
    window.imageCacheManager.cleanExpiredCache();
}, 30 * 60 * 1000);

console.log('🖼️ ImageCacheManager 초기화 완료');