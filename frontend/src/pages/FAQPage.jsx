import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, FileText, CheckCircle2, Package, Globe2, HelpCircle } from 'lucide-react';
import { useTranslation } from '../store/useLanguageStore';

const FAQPage = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(0); // Open first by default

  const faqs = [
    {
      question: '1. Кто может участвовать в закупках холдинга Asia Partners?',
      answer: 'В закупках могут принимать участие любые юридические лица (ТОО, АО) и индивидуальные предприниматели (ИП) Республики Казахстан, а также компании-нерезиденты, имеющие валидную ЭЦП НУЦ РК.'
    },
    {
      question: '2. Нужна ли платная подписка или регистрация на портале?',
      answer: 'Нет! Регистрация на портале и участие во всех закупках группы Asia Partners являются БЕСПЛАТНЫМИ. Никаких скрытых комиссий с поставщиков не взимается.'
    },
    {
      question: '3. Чем отличается форма создания закупки для «Товаров» от «Услуг и Работ»?',
      answer: 'Для Товаров указываются условия поставки по Инкотермс (DDP, EXW и др.), процент авансирования и срок доставки в днях. Для Услуг и Работ указываются даты начала/завершения работ и гарантийный срок в месяцах.'
    },
    {
      question: '4. Как происходит процедура «Запрос ценовых предложений» (ЗЦП)?',
      answer: 'Организатор публично размещает закупку. Поставщики подают 1 закрытое ценовое предложение. После срока окончания приема комиссия рассматривает заявки (Допускает / Отклоняет), и система автоматизированно выявляет победителя с наименьшей ценой.'
    },
    {
      question: '5. Как подписываются документы и Протоколы итогов?',
      answer: 'Все юридически значимые действия подписываются ЭЦП НУЦ РК (ГОСТ 34.310-2015). Протокол итогов мгновенно формируется в виде официального двуязычного PDF-документа с автоматическим вызовом окна сохранения.'
    },
    {
      question: '6. Можно ли изменить или отозвать поданую заявку?',
      answer: 'Да. До момента наступления срока окончания приема заявок поставщик имеет право в личном кабинете отозвать свое ценовое предложение и подать новое.'
    },
    {
      question: '7. Где просмотреть свои сохраненные и опубликованные тендеры организатора?',
      answer: 'Черновики закупок сохраняются в привязке к вашему ID пользователя в меню «Черновики тендеров». Опубликованные закупки отображаются в вашем Главном Кабинете Заказчика.'
    },
    {
      question: '8. Что делать при возникновении технических вопросов по NCALayer или ЭЦП?',
      answer: 'Убедитесь, что приложение NCALayer запущено на вашем компьютере. При любых вопросах вы можете обратиться в нашу службу поддержки: info@asiapartners.kz.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="fade-in" style={{ padding: '3.5rem 1.5rem 5rem', minHeight: 'calc(100vh - 200px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ background: 'rgba(43,138,196,0.1)', color: '#2B8AC4', fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 1rem', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            База знаний и Руководство
          </span>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, marginTop: '0.75rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            Вопросы и ответы по работе с порталом
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Подробная наглядная инструкция со скриншотами и ответы по проведению закупок ЗЦП
          </p>
        </div>

        {/* ════════════════════ VISUAL INSTRUCTIONS WITH PORTAL SCREENSHOTS ════════════════════ */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid rgba(43,138,196,0.3)', padding: '1.75rem', marginBottom: '2.5rem', boxShadow: '0 10px 30px rgba(43,138,196,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <HelpCircle size={22} color="#0284c7" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Иллюстрированная инструкция: Шаги работы на портале
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.25rem' }}>
            {/* Step 1 */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '1.1rem' }}>
              <div style={{ background: 'linear-gradient(135deg,#0a2133,#163A54)', borderRadius: '10px', padding: '1rem', color: '#ffffff', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.7rem', color: '#FFAF00', fontWeight: 700 }}>
                  <span>ЭКРАН 1: АВТОРИЗАЦИЯ</span>
                  <ShieldCheck size={14} color="#38bdf8" />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  🔑 Вход через NCALayer (ЭЦП НУЦ РК)
                </div>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>1. Авторизация по ЭЦП</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Выбор ключей AUTH/RSA в NCALayer. Автоматическая верификация организации по БИН/ИИН.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '1.1rem' }}>
              <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Опубликован</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>№ T00000049</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', marginBottom: '0.4rem' }}>Поставка товаров</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem' }}>
                  <span style={{ fontWeight: 800, color: '#163A54', fontSize: '0.85rem' }}>150 100 000 ₸</span>
                  <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>Подать</span>
                </div>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>2. Подача предложения</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Указание цены лота и условий. Отправка предложения со строгим соблюдением дедлайна.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '1.1rem' }}>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '1rem', marginBottom: '0.85rem' }}>
                <div style={{ color: '#166534', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                  🏛️ Протокол Итогов PDF
                </div>
                <div style={{ background: '#ffffff', borderRadius: '6px', padding: '0.4rem', fontSize: '0.7rem', color: '#15803d', fontWeight: 700, border: '1px solid #86efac' }}>
                  🏆 Победитель: ТОО "СтройКом"
                </div>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>3. Протокол с ЭЦП</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Автоматическое подведение итогов, выгрузка официального двуязычного PDF-протокола.
              </p>
            </div>
          </div>
        </div>

        {/* Accordion Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ backgroundColor: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <button 
                onClick={() => toggleFaq(index)}
                style={{ width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>{faq.question}</span>
                {openIndex === index ? <ChevronUp color="#0284c7" /> : <ChevronDown color="#0284c7" />}
              </button>
              
              {openIndex === index && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: '#475569', lineHeight: 1.7, borderTop: '1px solid #f1f5f9', paddingTop: '1rem', fontSize: '0.9rem' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Technical Support Box */}
        <div style={{ marginTop: '3.5rem', textAlign: 'center', padding: '2.25rem', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Остались вопросы или нужна помощь?</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Служба технической поддержки работает по будням с 9:00 до 18:00 (Астана)</p>
          <a href="mailto:info@asiapartners.kz" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.75rem 1.75rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 700 }}>
            Написать в поддержку info@asiapartners.kz
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
