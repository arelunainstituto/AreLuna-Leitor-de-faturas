/**
 * JSQRScanner - Aplicação Principal
 * Grupo AreLuna - Leitor de Faturas AT
 * @version 1.0.0
 */

// Aguardar carregamento completo do DOM antes de inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando JSQRScanner...');
    
    // Inicializar scanner
    const scanner = new JSQRScanner();
    
    // Expor globalmente para debug (opcional)
    window.qrScanner = scanner;
    
    // Inicializar modo escuro se salvo nas preferências
    initializeDarkMode();
    
    // Inicializar menu mobile
    initializeMobileMenu();
    
    // Inicializar navegação
    initializeNavigation();
    
    console.log('✅ JSQRScanner inicializado com sucesso');
});

/**
 * Inicializa o modo escuro baseado nas preferências salvas
 */
function initializeDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
    
    // Dark mode toggle button
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
}

/**
 * Alternar modo escuro
 */
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
}

/**
 * Inicializa o menu mobile
 */
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Fechar menu ao clicar em um item
        const mobileMenuItems = mobileMenu.querySelectorAll('a');
        mobileMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
}

/**
 * Inicializa a navegação entre seções
 */
function initializeNavigation() {
    // Todos os itens de navegação (desktop e mobile)
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover active de todos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Adicionar active no clicado
            item.classList.add('active');
            
            // Se for item mobile, também ativar o desktop correspondente
            const itemId = item.id.replace('-mobile', '');
            const desktopItem = document.getElementById(itemId);
            if (desktopItem && desktopItem !== item) {
                desktopItem.classList.add('active');
            }
            
            // Ocultar todas as seções
            hideAllSections();
            
            // Mostrar a seção correspondente
            if (itemId.includes('scanner')) {
                showSection('scannerSection');
            } else if (itemId.includes('automation')) {
                showSection('automationSection');
            } else if (itemId.includes('invoices')) {
                showSection('invoicesSection');
            } else if (itemId.includes('stats')) {
                showSection('statsSection');
            } else if (itemId.includes('settings')) {
                showSection('settingsSection');
            }
        });
    });
}

/**
 * Oculta todas as seções
 */
function hideAllSections() {
    const sections = [
        'scannerSection',
        'automationSection',
        'invoicesSection',
        'statsSection',
        'settingsSection'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

/**
 * Mostra uma seção específica
 */
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
}

/**
 * Atualiza os contadores de estatísticas no navbar
 */
function updateNavbarStats(qrCount, invoiceCount) {
    // Desktop badges
    const navbarQrCount = document.getElementById('navbar-qr-count');
    const navbarInvoiceCount = document.getElementById('navbar-invoice-count');
    
    // Mobile counters
    const mobileQrCount = document.getElementById('mobile-qr-count');
    const mobileInvoiceCount = document.getElementById('mobile-invoice-count');
    
    if (navbarQrCount) navbarQrCount.textContent = qrCount;
    if (navbarInvoiceCount) navbarInvoiceCount.textContent = invoiceCount;
    if (mobileQrCount) mobileQrCount.textContent = qrCount;
    if (mobileInvoiceCount) mobileInvoiceCount.textContent = invoiceCount;
}

// Expor funções globalmente
window.toggleDarkMode = toggleDarkMode;
window.updateNavbarStats = updateNavbarStats;


