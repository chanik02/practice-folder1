// 상품 데이터
const products = [
    { id: 1, name: '포카리스웨트', price: 1500, image: 'images/pocari.jpg' },
    { id: 2, name: '게토레이', price: 1400, image: 'images/gatorade.jpg' },
    { id: 3, name: '2프로', price: 1350, image: 'images/2pro.jpg' },
    { id: 4, name: '얼박사', price: 1700, image: 'images/eul.jpg' },
    { id: 5, name: '몬스터', price: 1900, image: 'images/monster.jpg' }
];

// 장바구니 데이터
let cart = {};

// DOM 요소
const productsGrid = document.getElementById('productsGrid');
const cartCount = document.getElementById('cartCount');
const totalPrice = document.getElementById('totalPrice');
const cartItemsList = document.getElementById('cartItemsList');
const purchaseBtn = document.getElementById('purchaseBtn');
const paymentModal = document.getElementById('paymentModal');
const purchaseModal = document.getElementById('purchaseModal');
const completeModal = document.getElementById('completeModal');

// 페이지 로드 시 상품 표시
document.addEventListener('DOMContentLoaded', () => {
    displayProducts();
    setupEventListeners();
    updateCart();
});

// 상품 표시
function displayProducts() {
    productsGrid.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.parentElement.textContent='🥤'">
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price.toLocaleString()}원</div>
            </div>
        `;
        productCard.addEventListener('click', () => addToCart(product));
        productsGrid.appendChild(productCard);
    });
}

// 장바구니에 추가
function addToCart(product) {
    if (cart[product.id]) {
        cart[product.id].quantity++;
    } else {
        cart[product.id] = {
            name: product.name,
            price: product.price,
            quantity: 1
        };
    }
    updateCart();
}

// 장바구니 업데이트
function updateCart() {
    // 총 상품 수와 가격 계산
    let totalItems = 0;
    let totalCost = 0;

    for (let productId in cart) {
        totalItems += cart[productId].quantity;
        totalCost += cart[productId].price * cart[productId].quantity;
    }

    // 화면 업데이트
    cartCount.textContent = totalItems;
    totalPrice.textContent = totalCost.toLocaleString();

    // 장바구니 목록 업데이트
    updateCartItemsList();

    // 구매 버튼 활성/비활성화
    if (totalItems > 0) {
        purchaseBtn.disabled = false;
    } else {
        purchaseBtn.disabled = true;
    }
}

// 장바구니 목록 표시
function updateCartItemsList() {
    if (Object.keys(cart).length === 0) {
        cartItemsList.innerHTML = '<p>장바구니가 비어있습니다</p>';
        return;
    }

    let itemsHTML = '';
    for (let productId in cart) {
        const item = cart[productId];
        itemsHTML += `
            <div class="item-entry">
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">×${item.quantity}</span>
            </div>
        `;
    }
    cartItemsList.innerHTML = itemsHTML;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 구매하기 버튼
    purchaseBtn.addEventListener('click', openPaymentModal);

    // 결제 수단 선택 모달 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    // 모달 외부 클릭시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.style.display = 'none';
        }
        if (e.target === purchaseModal) {
            purchaseModal.style.display = 'none';
        }
        if (e.target === completeModal) {
            completeModal.style.display = 'none';
        }
    });

    // 결제 수단 선택
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const method = e.target.closest('.payment-method-btn').dataset.method;
            openPurchaseModal(method);
        });
    });

    // 결제 완료 버튼
    document.getElementById('completeBtn').addEventListener('click', showCompleteModal);

    // 확인 버튼
    document.getElementById('closeCompleteBtn').addEventListener('click', () => {
        completeModal.style.display = 'none';
        paymentModal.style.display = 'none';
        purchaseModal.style.display = 'none';
        // 장바구니 초기화
        cart = {};
        updateCart();
    });
}

// 결제 수단 선택 모달 열기
function openPaymentModal() {
    paymentModal.style.display = 'block';
}

// 결제 폼 모달 열기
function openPurchaseModal(method) {
    paymentModal.style.display = 'none';

    // 결제 수단별 제목
    const titles = {
        'credit-card': '신용카드 결제',
        'bitcoin': '비트코인 결제',
        'bank-transfer': '무통장입금'
    };

    document.getElementById('paymentTitle').textContent = titles[method];

    // 결제 수단별 상세 정보
    const paymentDetails = {
        'credit-card': `
            <p><strong>신용카드 결제 정보</strong></p>
            <p>카드번호: <input type="text" placeholder="0000-0000-0000-0000" maxlength="19"></p>
            <p>만료일: <input type="text" placeholder="MM/YY" maxlength="5"></p>
            <p>CVC: <input type="text" placeholder="000" maxlength="3"></p>
            <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                <strong>결제 금액: ${document.getElementById('totalPrice').textContent}</strong>
            </p>
        `,
        'bitcoin': `
            <p><strong>비트코인 결제 정보</strong></p>
            <p>수취인 주소: <code style="background-color: #e0e0e0; padding: 5px; border-radius: 3px;">1A1z7agoat4FqC51GTBLv5np9hpiMrWiP</code></p>
            <p>전송 금액: 0.00025 BTC</p>
            <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                <strong>결제 금액: ${document.getElementById('totalPrice').textContent}</strong>
            </p>
        `,
        'bank-transfer': `
            <p><strong>무통장입금 정보</strong></p>
            <p>은행: 국민은행</p>
            <p>계���번호: <code style="background-color: #e0e0e0; padding: 5px; border-radius: 3px;">123-456-789012</code></p>
            <p>예금주: 스포츠음료 쇼핑몰</p>
            <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                <strong>결제 금액: ${document.getElementById('totalPrice').textContent}</strong>
            </p>
        `
    };

    document.getElementById('paymentDetails').innerHTML = paymentDetails[method];
    purchaseModal.style.display = 'block';
}

// 결제 완료 모달 표시
function showCompleteModal() {
    purchaseModal.style.display = 'none';
    
    // 총 상품 수 계산
    let totalItems = 0;
    for (let productId in cart) {
        totalItems += cart[productId].quantity;
    }

    // 주문 번호 생성
    const orderNumber = 'ORD-' + new Date().getTime();
    
    document.getElementById('completeMessage').textContent = 
        `총 ${totalItems}개의 상품 구매가 완료되었습니다!`;
    document.getElementById('orderNumber').textContent = orderNumber;
    
    completeModal.style.display = 'block';
}
