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
      question: '2. Нужна ли платная подписка или комиссия для Поставщика?',
      answer: 'Нет! Регистрация на портале и участие во всех закупках группы компаний «Asia Partners» являются абсолютно бесплатными. С участников не взимаются никакие комиссии.'
    },
    {
      question: '3. Какой статус имеют опубликованные тендеры?',
      answer: 'Все активные закупки после публикации имеют единый объединяющий статус «Опубликовано (Прием заявок)». До наступления дедлайна поставщики могут подавать свои ценовые предложения.'
    },
    {
      question: '4. Как формируется Протокол итогов и определяется Победитель?',
      answer: 'После наступления срока окончания приема заявок система автоматически ранжирует ценовые предложения участников по возрастанию цены: 1-е место (Победитель) получает наименьшая сумма. Протокол генерируется с валидацией ЭЦП НУЦ РК.'
    },
    {
      question: '5. Может ли Заказчик отклонить заявку вручную?',
      answer: 'Да. На этапе рассмотрения Организатор закупки может отклонить заявку поставщика с обязательным указанием официальной причины (например: несоответствие техспецификации). Отклоненная заявка заносится в Протокол и не участвует в рейтинге цен.'
    },
    {
      question: '6. Какое наименование отображается в поле «Заказчик»?',
      answer: 'В поле «Заказчик» во всех реестрах и карточках закупок указывается официальное наименование Юридического Лица (например: ТОО «Asia Partners» или АО «Семейский Цементный Завод»), а ФИО сотрудника указывается в контактных данных.'
    },
    {
      question: '7. Как учитывается Режим НДС при создании тендера?',
      answer: 'При создании тендера Организатор выбирает один из 3 режимов НДС: «Включая НДС (16%)», «Без НДС (0%)» или «Учитывать НДС поставщика». Выбранный признак отображается в деталях закупки.'
    },
    {
      question: '8. Как подписываются документы и предложения?',
      answer: 'Подписание коммерческих предложений и Протоколов итогов производится с помощью ключей ЭЦП НУЦ РК через приложение NCALayer (KalkanCrypt).'
    },
    {
      question: '9. Можно ли отозвать или скорректировать поданную заявку?',
      answer: 'Да. До момента наступления даты и времени окончания приема предложений Поставщик имеет право отозвать заявку в своем Личном Кабинете и подать обновленное предложение.'
    },
    {
      question: '10. Что делать, если окно NCALayer не открывается?',
      answer: 'Убедитесь, что приложение NCALayer запущено на вашем компьютере. При необходимости перезапустите NCALayer. По любым техническим вопросам пишите на info@asiapartners.kz.'
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
                  <span>ЭКРАН 1: ЛИЧНЫЙ КАБИНЕТ</span>
                  <ShieldCheck size={14} color="#38bdf8" />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  👤 Вход / Регистрация Поставщика
                </div>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>1. Вход в Личный Кабинет</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Быстрый вход по логину и паролю. Регистрация компании с привязкой ИИН/БИН.
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
