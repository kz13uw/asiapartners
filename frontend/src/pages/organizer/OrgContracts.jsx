import React, { useState } from 'react';
import { Search, FilePlus, FileText, Folder, Eye } from 'lucide-react';

const OrgContracts = () => {
  const [contracts] = useState([
    {
      id: 1,
      number: '№ 2024-C-01',
      tenderNumber: 'T-2023-881',
      supplierName: 'ТОО "СнабИнвестПром"',
      supplierBin: '123456789012',
      amount: 12500000,
      deadline: '31.12.2024',
      status: 'active'
    },
    {
      id: 2,
      number: '№ 2024-C-02',
      tenderNumber: 'T-2023-890',
      supplierName: 'ТОО "СтройМастер"',
      supplierBin: '098765432109',
      amount: 4200000,
      deadline: '15.06.2024',
      status: 'signing'
    },
    {
      id: 3,
      number: '№ 2023-C-45',
      tenderNumber: 'T-2023-840',
      supplierName: 'ИП "Иванов"',
      supplierBin: '850101300001',
      amount: 80000000,
      deadline: '01.03.2024',
      status: 'completed'
    }
  ]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: 0 }}>Управление договорами</h1>
          <p className="text-secondary" style={{ color: 'var(--pk-text-secondary)', marginTop: '0.5rem' }}>Контроль исполнения и подписание договоров с поставщиками</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '1rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FilePlus size={20} /> Загрузить оффлайн договор
        </button>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-primary)' }}>
          <div className="stat-val text-primary" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-primary)', marginBottom: '0.5rem' }}>45</div>
          <div className="stat-title text-sec">Действующих договоров</div>
        </div>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-warning)' }}>
          <div className="stat-val text-warning" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-warning)', marginBottom: '0.5rem' }}>3</div>
          <div className="stat-title text-sec">На подписании у поставщика</div>
        </div>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-success)' }}>
          <div className="stat-val text-success" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-success)', marginBottom: '0.5rem' }}>102</div>
          <div className="stat-title text-sec">Успешно исполнено (Архив)</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h3 className="mb-0" style={{ margin: 0 }}>Реестр договоров</h3>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input type="text" className="form-control form-control-sm" placeholder="Поиск по БИН, номеру или лоту..." style={{ paddingLeft: '2rem', width: '250px' }} />
          </div>
        </div>
        
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>№ Договора / Лот</th>
                <th>Поставщик</th>
                <th>Сумма (тнг)</th>
                <th>Срок исполнения</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => (
                <tr key={contract.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{contract.number}</strong><br />
                    <span className="text-sm text-secondary">Лот: {contract.tenderNumber}</span>
                  </td>
                  <td>
                    <strong>{contract.supplierName}</strong><br />
                    <span className="text-sm text-secondary">{contract.supplierBin.length === 12 ? 'БИН' : 'ИИН'} {contract.supplierBin}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{contract.amount.toLocaleString('ru-RU')}</td>
                  <td>до {contract.deadline}</td>
                  <td>
                    {contract.status === 'active' && <span className="badge badge-success">Действует</span>}
                    {contract.status === 'signing' && <span className="badge badge-warning">На подписании Пст</span>}
                    {contract.status === 'completed' && <span className="badge" style={{ background: '#f4f7f9', border: '1px solid var(--pk-border)', color: 'var(--pk-text-secondary)' }}>Исполнен</span>}
                  </td>
                  <td>
                    {contract.status === 'active' && <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Акты</button>}
                    {contract.status === 'signing' && <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye size={16} /> Просмотр</button>}
                    {contract.status === 'completed' && <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Folder size={16} /> Архив</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrgContracts;
