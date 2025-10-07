/**
 * DOM 요소 접근 및 조작을 위한 헬퍼 클래스
 * 중복되는 DOM 조작 코드를 통합하여 관리
 */
class DOMHelper {
    /**
     * 요소 선택 (단일)
     * @param {string} selector - CSS 선택자
     * @returns {Element|null}
     */
    static get(selector) {
        if (!selector) return null;
        
        return selector.startsWith('#') 
            ? document.getElementById(selector.slice(1))
            : document.querySelector(selector);
    }
    
    /**
     * 요소 선택 (복수)
     * @param {string} selector - CSS 선택자
     * @returns {Element[]}
     */
    static getAll(selector) {
        if (!selector) return [];
        
        return Array.from(document.querySelectorAll(selector));
    }
    
    /**
     * 텍스트 설정
     * @param {string} selector - CSS 선택자
     * @param {string} text - 설정할 텍스트
     * @returns {Element|null}
     */
    static setText(selector, text) {
        const element = this.get(selector);
        if (element) element.textContent = text;
        return element;
    }
    
    /**
     * HTML 설정
     * @param {string} selector - CSS 선택자
     * @param {string} html - 설정할 HTML
     * @returns {Element|null}
     */
    static setHTML(selector, html) {
        const element = this.get(selector);
        if (element) element.innerHTML = html;
        return element;
    }
    
    /**
     * 요소 표시
     * @param {string} selector - CSS 선택자
     * @returns {Element|null}
     */
    static show(selector) {
        const element = this.get(selector);
        if (element) {
            element.classList.remove('hidden');
            element.style.display = '';
        }
        return element;
    }
    
    /**
     * 요소 숨기기
     * @param {string} selector - CSS 선택자
     * @returns {Element|null}
     */
    static hide(selector) {
        const element = this.get(selector);
        if (element) {
            element.classList.add('hidden');
        }
        return element;
    }
    
    /**
     * 요소 표시/숨기기 토글
     * @param {string} selector - CSS 선택자
     * @param {boolean} condition - 표시 조건
     * @returns {Element|null}
     */
    static toggle(selector, condition) {
        const element = this.get(selector);
        if (element) {
            if (condition !== undefined) {
                element.classList.toggle('hidden', !condition);
            } else {
                element.classList.toggle('hidden');
            }
        }
        return element;
    }
    
    /**
     * 클래스 추가
     * @param {string} selector - CSS 선택자
     * @param {...string} classNames - 추가할 클래스명들
     * @returns {Element|null}
     */
    static addClass(selector, ...classNames) {
        const element = this.get(selector);
        if (element) element.classList.add(...classNames);
        return element;
    }
    
    /**
     * 클래스 제거
     * @param {string} selector - CSS 선택자
     * @param {...string} classNames - 제거할 클래스명들
     * @returns {Element|null}
     */
    static removeClass(selector, ...classNames) {
        const element = this.get(selector);
        if (element) element.classList.remove(...classNames);
        return element;
    }
    
    /**
     * 속성 설정
     * @param {string} selector - CSS 선택자
     * @param {string} attribute - 속성명
     * @param {string} value - 속성값
     * @returns {Element|null}
     */
    static setAttribute(selector, attribute, value) {
        const element = this.get(selector);
        if (element) element.setAttribute(attribute, value);
        return element;
    }
    
    /**
     * 속성 제거
     * @param {string} selector - CSS 선택자
     * @param {string} attribute - 속성명
     * @returns {Element|null}
     */
    static removeAttribute(selector, attribute) {
        const element = this.get(selector);
        if (element) element.removeAttribute(attribute);
        return element;
    }
    
    /**
     * 값 설정 (input, textarea, select)
     * @param {string} selector - CSS 선택자
     * @param {string} value - 설정할 값
     * @returns {Element|null}
     */
    static setValue(selector, value) {
        const element = this.get(selector);
        if (element && 'value' in element) {
            element.value = value;
        }
        return element;
    }
    
    /**
     * 값 가져오기 (input, textarea, select)
     * @param {string} selector - CSS 선택자
     * @returns {string|null}
     */
    static getValue(selector) {
        const element = this.get(selector);
        return element && 'value' in element ? element.value : null;
    }
    
    /**
     * 요소 생성
     * @param {string} tagName - 태그명
     * @param {Object} options - 옵션 (classes, id, text, html, attributes)
     * @returns {Element}
     */
    static create(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        if (options.classes) {
            element.classList.add(...(Array.isArray(options.classes) ? options.classes : [options.classes]));
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.text) {
            element.textContent = options.text;
        }
        
        if (options.html) {
            element.innerHTML = options.html;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        return element;
    }
    
    /**
     * 요소에 자식 추가
     * @param {string|Element} selector - CSS 선택자 또는 Element
     * @param {Element} child - 추가할 자식 요소
     * @returns {Element|null}
     */
    static appendChild(selector, child) {
        const parent = typeof selector === 'string' ? this.get(selector) : selector;
        if (parent && child) parent.appendChild(child);
        return parent;
    }
    
    /**
     * 요소 비우기
     * @param {string} selector - CSS 선택자
     * @returns {Element|null}
     */
    static empty(selector) {
        const element = this.get(selector);
        if (element) element.innerHTML = '';
        return element;
    }
    
    /**
     * 요소 제거
     * @param {string} selector - CSS 선택자
     * @returns {boolean}
     */
    static remove(selector) {
        const element = this.get(selector);
        if (element) {
            element.remove();
            return true;
        }
        return false;
    }
}

// 전역으로 사용 가능하게 설정
window.DOMHelper = DOMHelper;