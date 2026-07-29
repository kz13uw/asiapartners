// demo.js - Скрипты для имитации интерактивности

document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация контейнера для Toasts
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    // 2. Инициализация живого поиска для таблиц (если есть поля с классом .table-search-input)
    const searchInputs = document.querySelectorAll('.table-search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const targetTableSelector = this.getAttribute('data-table') || 'table';
            const table = document.querySelector(targetTableSelector);
            if (table) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const text = row.innerText.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            }
        });
    });

    // 3. Анимация цифр статистики (если есть элементы с классом .animate-number)
    const animatedNumbers = document.querySelectorAll('.animate-number');
    animatedNumbers.forEach(el => {
        const target = parseInt(el.getAttribute('data-target') || el.innerText || '0', 10);
        animateValue(el, 0, target, 1500);
    });
});

// Функция показа уведомления
window.showToast = function(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'ri-check-line';
    if (type === 'error') iconClass = 'ri-error-warning-line';
    if (type === 'warning') iconClass = 'ri-alert-line';
    if (type === 'info') iconClass = 'ri-information-line';

    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconClass}"></i></div>
        <div class="toast-content">
            <h4 class="toast-title">${title}</h4>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="ri-close-line"></i></button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Функция анимации числа
window.animateValue = function(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Имитация загрузки файла
window.mockFileUpload = function(element, fileName) {
    element.innerHTML = `
        <div style="text-align: left; width: 100%;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
                <strong>Загрузка: ${fileName}</strong>
                <span id="progText">0%</span>
            </div>
            <div style="background: var(--pk-border); width: 100%; height: 6px; border-radius: 3px; overflow: hidden;">
                <div id="progBar" style="background: var(--pk-primary); width: 0%; height: 100%; transition: width 0.1s;"></div>
            </div>
        </div>
    `;
    element.style.pointerEvents = 'none';
    element.style.borderColor = 'var(--pk-primary)';
    element.style.backgroundColor = 'var(--pk-bg-surface)';

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) progress = 100;
        
        const bar = element.querySelector('#progBar');
        const text = element.querySelector('#progText');
        if(bar) bar.style.width = progress + '%';
        if(text) text.innerText = Math.floor(progress) + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                element.innerHTML = `<div style="color: var(--pk-success)"><i class="ri-check-line ri-2x"></i><br><strong>${fileName} успешно прикреплен</strong></div>`;
                element.style.pointerEvents = 'auto';
                element.style.borderColor = 'var(--pk-success)';
                element.style.backgroundColor = '';
                showToast('Успех', `Файл ${fileName} успешно загружен в систему.`, 'success');
            }, 300);
        }
    }, 150);
}
