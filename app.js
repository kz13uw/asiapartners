const { createApp, ref, computed } = Vue;
const { createRouter, createWebHashHistory, useRoute, useRouter } = VueRouter;

// ============================================
// МОДУЛЬ 1: Аутентификации (ЭЦП)
// ============================================
const LoginView = {
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo"><i class="ri-shield-keyhole-line"></i> Вход по ЭЦП</div>
        <p class="text-sec mb-3" style="text-align: center; font-size: 0.9rem;">
          Для входа в Портал Закупок выберите ваш сертификат (ключ AUTH).
        </p>
        
        <div class="file-upload-box" @click="simulateLogin">
          <i class="ri-file-shield-2-line"></i>
          <div><strong v-if="!isLoading">Выбрать сертификат</strong></div>
          <div v-if="isLoading"><span class="loader-spinner"></span> Авторизация...</div>
        </div>
        
        <p class="text-sm text-sec" style="text-align: center;">
          (Нажмите для демонстрации успешного входа)
        </p>
      </div>
    </div>
  `,
  setup() {
    const router = useRouter();
    const isLoading = ref(false);
    
    const simulateLogin = () => {
      isLoading.value = true;
      setTimeout(() => {
        isLoading.value = false;
        // После "входа" перенаправляем в личный кабинет контрагента
        router.push('/counterparty');
      }, 1000);
    };
    return { isLoading, simulateLogin };
  }
};

// ============================================
// МОДУЛЬ 2: Кабинет контрагента
// ============================================
const CounterpartyCabinetView = {
  template: `
    <div class="fade-in">
      <h2 class="mb-3">Сводка по контрагенту</h2>
      
      <!-- Статистика -->
      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-title">Активные формы участия</div>
          <div class="stat-value text-primary">4</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Новые уведомления</div>
          <div class="stat-value" style="color: var(--pk-warning);">12</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Загружено документов</div>
          <div class="stat-value">28</div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="tabs">
          <div class="tab" :class="{active: activeTab === 'tenders'}" @click="activeTab='tenders'">Участие в тендерах</div>
          <div class="tab" :class="{active: activeTab === 'docs'}" @click="activeTab='docs'">Документация</div>
          <div class="tab" :class="{active: activeTab === 'notif'}" @click="activeTab='notif'">Уведомления / Рассылка</div>
          <div class="tab" :class="{active: activeTab === 'profile'}" @click="activeTab='profile'">Регистрация</div>
        </div>
        
        <!-- Tab: Тендеры -->
        <div v-if="activeTab === 'tenders'">
          <h4 class="mb-2">Ваши текущие заявки</h4>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>№ Тендера</th>
                  <th>Наименование</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>T-2023-001</td>
                  <td>Поставка серверного оборудования</td>
                  <td><span class="badge badge-warning">На рассмотрении</span></td>
                  <td><button class="btn btn-outline">Детали</button></td>
                </tr>
                <tr>
                  <td>T-2023-084</td>
                  <td>Разработка ПО (2 этап)</td>
                  <td><span class="badge badge-success">Допущен</span></td>
                  <td><button class="btn btn-primary" style="padding: 0.35rem 0.75rem;">Сделать ставку</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab: Уведомления -->
        <div v-if="activeTab === 'notif'">
          <ul style="list-style: none;">
            <li class="mb-2 p-3" style="border: 1px solid var(--pk-border); border-radius: 6px;">
              <div style="font-weight: 600;"><i class="ri-mail-line text-sec mr-2"></i> Изменение в документации лота T-2023-084</div>
              <div class="text-sm text-sec mt-1">Организатор добавил новое техническое задание. Просьба ознакомиться в разделе документации.</div>
            </li>
            <li class="mb-2 p-3" style="border: 1px solid var(--pk-border); border-radius: 6px;">
              <div style="font-weight: 600;"><i class="ri-broadcast-line text-sec mr-2"></i> Рассылка портала</div>
              <div class="text-sm text-sec mt-1">Внимание! На следующей неделе запланированы технические работы. Портал будет недоступен 2 часа.</div>
            </li>
          </ul>
        </div>
        
        <!-- Tab: Другое (Заглушки) -->
        <div v-if="activeTab === 'docs' || activeTab === 'profile'">
          <div class="text-sec p-3" style="text-align: center; border: 1px dashed var(--pk-border); border-radius: 6px; padding: 3rem 1rem;">
            <i class="ri-folder-upload-line" style="font-size: 2.5rem; color: var(--pk-primary);"></i>
            <p class="mt-2 text-sm">Здесь будет интерфейс загрузки и выгрузки файлов / регистрационных данных.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const activeTab = ref('tenders');
    return { activeTab };
  }
};

// ============================================
// МОДУЛЬ 3: Кабинет специалиста по снабжению
// ============================================
const SupplySpecialistCabinetView = {
  template: `
    <div class="fade-in">
      <div class="card-header">
        <h2 class="mb-0">Управление Лотами (Снабжение)</h2>
        <button class="btn btn-primary" @click="createLot"><i class="ri-add-line"></i> Создать лот</button>
      </div>

      <div class="grid-3 mt-2">
        <div class="stat-card">
          <div class="stat-title">Всего опубликовано лотов</div>
          <div class="stat-value">15</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Ожидают проверки (Модерация)</div>
          <div class="stat-value" style="color: var(--pk-warning);">3</div>
        </div>
      </div>

      <div class="card mt-3">
        <h4 class="mb-2">Мониторинг процесса закупок</h4>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Наименование закупки</th>
                <th>Метод</th>
                <th>Сумма (тнг)</th>
                <th>Статус</th>
                <th>Управление документацией</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Поставка ПК для офиса</td>
                <td>Одноэтапный на понижение</td>
                <td>4,500,000</td>
                <td><span class="badge badge-success">Прием заявок</span></td>
                <td>
                  <button class="btn btn-outline"><i class="ri-download-line"></i> Выгрузить</button>
                  <button class="btn btn-outline ml-2"><i class="ri-upload-line"></i> Загрузить</button>
                </td>
              </tr>
              <tr>
                <td>Закупка спецтехники</td>
                <td>Двухэтапный тендер</td>
                <td>120,000,000</td>
                <td><span class="badge badge-warning">Оценка (1 этап)</span></td>
                <td>
                  <button class="btn btn-outline"><i class="ri-folder-open-line"></i> Файлы</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  setup() {
    const createLot = () => alert("Демо: Модальное окно или страница 'Создание лота' откроется здесь.");
    return { createLot };
  }
};

// ============================================
// МОДУЛЬ 4: Тендеры
// ============================================
const TendersView = {
  template: `
    <div class="fade-in">
      <h2 class="mb-3">Реестр Тендеров</h2>
      <div class="card mb-3" style="display: flex; gap: 1rem; flex-wrap: wrap;">
         <input type="text" class="form-control" placeholder="Поиск по наименованию или номеру..." style="flex: 1; min-width: 200px;">
         <select class="form-control" style="width: auto; min-width: 250px;">
           <option>Все методы закупок</option>
           <option>Одноэтапный тендер на понижение</option>
           <option>Двухэтапный тендер на понижение</option>
         </select>
         <button class="btn btn-primary"><i class="ri-search-line"></i> Найти</button>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип тендера</th>
                <th>Описание</th>
                <th>Документация / Итоги</th>
                <th>Договор</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 500;">T-2023-111</td>
                <td>Одноэтапный на понижение</td>
                <td>Канцелярские товары</td>
                <td><button class="btn btn-outline text-sm"><i class="ri-file-text-line"></i> Обмен док.</button></td>
                <td><span class="text-sec">-</span></td>
              </tr>
              <tr>
                <td style="font-weight: 500;">T-2023-112</td>
                <td>Двухэтапный на понижение</td>
                <td>Строительство объекта А</td>
                <td><button class="btn btn-primary text-sm"><i class="ri-file-list-3-line"></i> Создать протокол итогов</button></td>
                <td><button class="btn btn-outline text-sec text-sm"><i class="ri-upload-cloud-2-line"></i> Загрузить</button></td>
              </tr>
              <tr>
                <td style="font-weight: 500;">T-2023-115</td>
                <td>Одноэтапный на понижение</td>
                <td>Оказание консалтинговых услуг</td>
                <td><button class="btn btn-outline text-sm"><i class="ri-eye-line"></i> Просмотр протокола</button></td>
                <td><button class="btn btn-outline text-success text-sm" style="border-color: var(--pk-success);"><i class="ri-download-2-line"></i> Скачать договор</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
};

// ============================================
// МОДУЛЬ 5: Кабинет администратора
// ============================================
const AdminCabinetView = {
  template: `
    <div class="fade-in">
      <div class="card-header">
        <h2 class="mb-0">Панель Администратора</h2>
        <button class="btn btn-primary"><i class="ri-settings-3-line"></i> Управление порталом</button>
      </div>

      <div class="card">
        <div class="card-header" style="margin-bottom: 1rem;">
           <h4 class="mb-0">Управление учетными записями</h4>
           <button class="btn btn-outline"><i class="ri-user-add-line"></i> Создать УЗ</button>
        </div>
        
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>БИН/ИИН</th>
                <th>Наименование / ФИО</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>123456789012</td>
                <td>ТОО "Tech Solutions"</td>
                <td>Контрагент</td>
                <td><span class="badge badge-success">Активен</span></td>
                <td style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-outline text-sm" title="Сброс пароля"><i class="ri-key-line"></i> Сброс</button>
                  <button class="btn btn-outline btn-danger text-sm" title="Блокировать"><i class="ri-lock-line"></i></button>
                </td>
              </tr>
              <tr>
                <td>987654321098</td>
                <td>Мамаев С.А.</td>
                <td>Специалист (Снабжение)</td>
                <td><span class="badge badge-warning">Утерян доступ</span></td>
                <td style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary text-sm" title="Восстановление УЗ"><i class="ri-refresh-line"></i> Восстановить</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
};

// ============================================
// LAYOUT: Сайдбар + Хедер
// ============================================
const AppLayout = {
  template: `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <i class="ri-shopping-cart-2-line"></i> Портал Закупок
        </div>
        <nav class="sidebar-nav">
          <router-link to="/counterparty" class="nav-item" active-class="active">
            <i class="ri-building-line"></i> Контрагент
          </router-link>
          <router-link to="/supply" class="nav-item" active-class="active">
            <i class="ri-user-settings-line"></i> Снабжение
          </router-link>
          <router-link to="/tenders" class="nav-item" active-class="active">
            <i class="ri-scales-3-line"></i> Тендеры
          </router-link>
          <router-link to="/admin" class="nav-item" active-class="active">
            <i class="ri-admin-line"></i> Администратор
          </router-link>
        </nav>
        <div class="mt-auto" style="padding: 1rem;">
          <router-link to="/login" class="nav-item" style="color: #ff8389;">
            <i class="ri-logout-box-line"></i> Выйти из системы
          </router-link>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-wrapper">
        <header class="top-header">
          <div><h3 class="text-sec" style="font-weight: 500;">{{ pageTitle }}</h3></div>
          <div class="header-user">
            <div style="text-align: right;">
                <div class="text-sm" style="font-weight: 600; line-height: 1;">Тестовый Демо</div>
                <div style="font-size: 0.75rem; color: var(--pk-text-secondary); margin-top: 2px;">Демонстрационный режим</div>
            </div>
            <div class="avatar">ТД</div>
          </div>
        </header>

        <section class="content-area">
          <router-view></router-view>
        </section>
      </main>
    </div>
  `,
  setup() {
     const route = useRoute();
     
     // Динамический заголовок в шапке на основе роута
     const pageTitle = computed(() => {
       switch(route.path) {
         case '/counterparty': return 'Личный кабинет: Контрагент';
         case '/supply': return 'Личный кабинет: Специалист по снабжению';
         case '/tenders': return 'Управление тендерами';
         case '/admin': return 'Администрирование портала';
         default: return 'Портал Закупок';
       }
     });
     return { pageTitle };
  }
};

// ============================================
// РОУТИНГ И ИНИЦИАЛИЗАЦИЯ VUE
// ============================================
const routes = [
  { path: '/login', component: LoginView },
  { 
    path: '/',
    component: AppLayout,
    redirect: '/login', // По умолчанию кидаем на авторизацию
    children: [
      { path: 'counterparty', component: CounterpartyCabinetView },
      { path: 'supply', component: SupplySpecialistCabinetView },
      { path: 'tenders', component: TendersView },
      { path: 'admin', component: AdminCabinetView }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// CSS animations moved to style.css to avoid CORS error on file:// protocol

const app = createApp({});
app.use(router);
app.mount('#app');
