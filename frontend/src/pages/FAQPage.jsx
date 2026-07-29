import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'Как зарегистрироваться в качестве поставщика?',
      answer: 'Для регистрации необходимо нажать кнопку "Регистрация" на главной странице, заполнить базовую информацию о компании (БИН, наименование, контакты) и подтвердить данные с помощью электронной цифровой подписи (ЭЦП) первого руководителя.'
    },
    {
      question: 'Какая ЭЦП нужна для работы на портале?',
      answer: 'Для работы на портале требуется действующая ЭЦП Национального удостоверяющего центра Республики Казахстан (НУЦ РК). Для подписания договоров и заявок необходим ключ подписи (GOST).'
    },
    {
      question: 'Как подать заявку на участие в тендере?',
      answer: 'Вам нужно авторизоваться, перейти в раздел "Закупки", выбрать интересующий вас лот со статусом "Опубликован", нажать "Подать заявку", заполнить ценовое предложение, прикрепить требуемую документацию и подписать заявку вашей ЭЦП.'
    },
    {
      question: 'Где посмотреть результаты тендера?',
      answer: 'Результаты прошедших тендеров публикуются на странице конкретного лота в виде итогового протокола, а также приходят в виде уведомлений в ваш Личный кабинет в разделе "Мои заявки".'
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="fade-in" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 200px)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--pk-text-main)', textAlign: 'center' }}>
          Инструкции и FAQ
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--pk-text-sec)', marginBottom: '3rem', fontSize: '1.1rem' }}>
          Ответы на часто задаваемые вопросы по работе с тендерной площадкой
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleFaq(index)}
                style={{ width: '100%', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--pk-text-main)' }}>{faq.question}</span>
                {openIndex === index ? <ChevronUp color="var(--pk-primary)" /> : <ChevronDown color="var(--pk-primary)" />}
              </button>
              
              {openIndex === index && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: 'var(--pk-text-sec)', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(43,138,196,0.05)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Остались вопросы?</h3>
          <p style={{ color: 'var(--pk-text-sec)', marginBottom: '1.5rem' }}>Служба технической поддержки работает по будням с 9:00 до 18:00</p>
          <a href="mailto:support@asiapartners.kz" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>Написать в поддержку</a>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
