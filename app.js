let selectedFoods = [];
let currentCategory = 'milk';
let recommendedCalcium = 1000;
let idCounter = 0;

// 官方每日推荐钙摄入量（Health Canada / Osteoporosis Canada DRI）
// 19-50岁：男女均 1000mg；51-70岁：女性 1200mg、男性 1000mg；71岁以上：男女均 1200mg
function computeRecommended(sex, age) {
    if (age === '19-50') return 1000;
    if (age === '71+') return 1200;
    return sex === 'female' ? 1200 : 1000;
}
function refreshRecommended() {
    const sex = document.querySelector('#sexToggle .toggle-btn.active') ? document.querySelector('#sexToggle .toggle-btn.active').dataset.value : 'female';
    const age = document.querySelector('#ageToggle .toggle-btn.active') ? document.querySelector('#ageToggle .toggle-btn.active').dataset.value : '19-50';
    recommendedCalcium = computeRecommended(sex, age);
}

const totalCalciumEl = document.getElementById('totalCalcium');
const progressRing = document.getElementById('progressRing');
const statIntake = document.getElementById('statIntake');
const statRecommend = document.getElementById('statRecommend');
const statRemaining = document.getElementById('statRemaining');
const selectedCard = document.getElementById('selectedCard');
const selectedList = document.getElementById('selectedList');
const modalOverlay = document.getElementById('modalOverlay');
const foodList = document.getElementById('foodList');
const searchInput = document.getElementById('searchInput');

function init() {
    loadState();
    document.getElementById('sexToggle').addEventListener('click', e => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        document.querySelectorAll('#sexToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshRecommended();
        updateDisplay();
        saveState();
    });
    document.getElementById('ageToggle').addEventListener('click', e => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        document.querySelectorAll('#ageToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshRecommended();
        updateDisplay();
        saveState();
    });
    document.getElementById('addFoodBtn').addEventListener('click', () => {
        modalOverlay.classList.add('show');
        renderFoodList();
        searchInput.value = '';
    });
    document.getElementById('modalClose').addEventListener('click', () => {
        modalOverlay.classList.remove('show');
    });
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('show');
    });
    document.getElementById('categoryBar').addEventListener('click', e => {
        const btn = e.target.closest('.cat-btn');
        if (!btn) return;
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderFoodList();
    });
    searchInput.addEventListener('input', () => renderFoodList());
    document.getElementById('clearAllBtn').addEventListener('click', () => {
        selectedFoods = [];
        updateDisplay();
        renderFoodList();
        saveState();
    });
    refreshRecommended();
    updateDisplay();
}

function renderFoodList() {
    const query = searchInput.value.trim().toLowerCase();
    const foods = FOOD_DATA[currentCategory] || [];
    const filtered = query ? foods.filter(f => f.cn.toLowerCase().includes(query) || f.en.toLowerCase().includes(query)) : foods;
    if (filtered.length === 0) { foodList.innerHTML = '<div class="empty-hint">没有找到匹配的食物</div>'; return; }
    foodList.innerHTML = filtered.map((food, idx) => {
        const existing = selectedFoods.find(s => s.food.cn === food.cn && s.category === currentCategory);
        if (existing) {
            return '<div class="food-item"><div class="food-item-info"><div class="food-item-name">' + food.cn + '</div><div class="food-item-serving">' + food.serving + '</div><div class="food-item-calcium">每份含钙 ' + food.mg + ' mg</div></div><div class="food-item-action"><div class="food-qty-ctrl"><button class="ctrl-btn ctrl-minus" onclick="changeQtyModal(\'' + existing.id + '\', -0.25)">−</button><span class="food-qty-text">' + formatServings(existing.servings) + '</span><button class="ctrl-btn ctrl-plus" onclick="changeQtyModal(\'' + existing.id + '\', 0.25)">+</button></div></div></div>';
        }
        return '<div class="food-item"><div class="food-item-info"><div class="food-item-name">' + food.cn + '</div><div class="food-item-serving">' + food.serving + '</div><div class="food-item-calcium">每份含钙 ' + food.mg + ' mg</div></div><div class="food-item-action"><button class="food-add-btn" onclick="addFood(\'' + currentCategory + '\', ' + idx + ')">添加</button></div></div>';
    }).join('');
}

function addFood(category, index) {
    const food = FOOD_DATA[category][index];
    selectedFoods.push({ food, servings: 1, category, id: 'f' + (++idCounter) });
    updateDisplay(); renderFoodList(); saveState();
}

function changeQtyModal(id, delta) {
    const item = selectedFoods.find(s => s.id === id);
    if (!item) return;
    item.servings += delta;
    if (item.servings <= 0) { selectedFoods = selectedFoods.filter(s => s.id !== id); }
    else if (item.servings > 5) { item.servings = 5; }
    updateDisplay(); renderFoodList(); saveState();
}

function changeQty(id, delta) {
    const item = selectedFoods.find(s => s.id === id);
    if (!item) return;
    item.servings += delta;
    if (item.servings < 0.25) item.servings = 0.25;
    if (item.servings > 5) item.servings = 5;
    updateDisplay(); saveState();
}

function removeFood(id) {
    selectedFoods = selectedFoods.filter(s => s.id !== id);
    updateDisplay(); saveState();
}

function updateDisplay() {
    const total = selectedFoods.reduce((sum, s) => sum + Math.round(s.food.mg * s.servings), 0);
    const remaining = Math.max(0, recommendedCalcium - total);
    const progress = Math.min(total / recommendedCalcium, 1);
    const circumference = 2 * Math.PI * 85;
    totalCalciumEl.textContent = total;
    progressRing.style.strokeDashoffset = circumference * (1 - progress);
    progressRing.style.stroke = total >= recommendedCalcium ? '#34C759' : '#FF9500';
    totalCalciumEl.style.color = total >= recommendedCalcium ? '#34C759' : '';
    statIntake.textContent = total + ' mg';
    statRecommend.textContent = recommendedCalcium + ' mg';
    statRemaining.textContent = remaining + ' mg';
    statRemaining.className = 'stat-value stat-remaining' + (total >= recommendedCalcium ? ' done' : '');
    if (selectedFoods.length === 0) { selectedCard.style.display = 'none'; }
    else {
        selectedCard.style.display = 'block';
        selectedList.innerHTML = selectedFoods.map(s => '<div class="selected-item"><div class="selected-info"><div class="selected-name">' + s.food.cn + '</div><div class="selected-serving">' + s.food.serving + ' × ' + formatServings(s.servings) + '</div></div><div class="selected-controls"><button class="ctrl-btn ctrl-minus" onclick="changeQty(\'' + s.id + '\', -0.25)">−</button><span class="selected-mg">' + Math.round(s.food.mg * s.servings) + ' mg</span><button class="ctrl-btn ctrl-plus" onclick="changeQty(\'' + s.id + '\', 0.25)">+</button><button class="ctrl-delete" onclick="removeFood(\'' + s.id + '\')">✕</button></div></div>').join('');
    }
}

function formatServings(value) {
    if (value === Math.floor(value)) return value + '份';
    const fractions = { 0.25:'¼', 0.5:'½', 0.75:'¾', 1.25:'1¼', 1.5:'1½', 1.75:'1¾', 2.25:'2¼', 2.5:'2½', 2.75:'2¾', 3.25:'3¼', 3.5:'3½', 3.75:'3¾', 4.25:'4¼', 4.5:'4½', 4.75:'4¾' };
    return (fractions[value] || value.toFixed(2)) + '份';
}

function saveState() {
    const state = { selectedFoods: selectedFoods.map(s => ({ category: s.category, cn: s.food.cn, servings: s.servings })), recommendedCalcium, sex: document.querySelector('#sexToggle .toggle-btn.active') ? document.querySelector('#sexToggle .toggle-btn.active').dataset.value : null, age: document.querySelector('#ageToggle .toggle-btn.active') ? document.querySelector('#ageToggle .toggle-btn.active').dataset.value : null, date: new Date().toDateString(), idCounter };
    try { localStorage.setItem('calcium_tracker', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem('calcium_tracker');
        if (!raw) return;
        const state = JSON.parse(raw);
        if (state.date !== new Date().toDateString()) { localStorage.removeItem('calcium_tracker'); return; }
        if (state.sex) { document.querySelectorAll('#sexToggle .toggle-btn').forEach(b => { b.classList.toggle('active', b.dataset.value === state.sex); }); }
        const validAges = ['19-50', '51-70', '71+'];
        if (state.age && validAges.includes(state.age)) { document.querySelectorAll('#ageToggle .toggle-btn').forEach(b => { b.classList.toggle('active', b.dataset.value === state.age); }); }
        if (state.idCounter) idCounter = state.idCounter;
        if (state.selectedFoods) { state.selectedFoods.forEach(saved => { const catFoods = FOOD_DATA[saved.category]; if (!catFoods) return; const food = catFoods.find(f => f.cn === saved.cn); if (!food) return; selectedFoods.push({ food, servings: saved.servings, category: saved.category, id: 'f' + (++idCounter) }); }); }
    } catch(e) {}
}

init();
