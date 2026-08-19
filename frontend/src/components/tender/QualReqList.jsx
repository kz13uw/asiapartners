import React from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';

const QualReqList = ({ requirements, onUpdate, onAdd, onRemove }) => {
  return (
    <div className="card shadow-sm mb-4" style={{ borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="var(--pk-primary)" /> Квалификационные требования к Поставщику
        </h4>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={onAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={16} /> Добавить требование
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {requirements.map((req, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 3fr auto auto',
              gap: '0.75rem',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}
          >
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Наименование требования (например: Опыт СМР не менее 3 лет)"
              value={req.title || ''}
              onChange={(e) => onUpdate(index, { ...req, title: e.target.value })}
            />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Описание / Подтверждающие документы"
              value={req.description || ''}
              onChange={(e) => onUpdate(index, { ...req, description: e.target.value })}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={req.is_mandatory !== false}
                onChange={(e) => onUpdate(index, { ...req, is_mandatory: e.target.checked })}
              />
              Обязательно
            </label>
            <button
              type="button"
              className="btn btn-link text-danger p-0"
              onClick={() => onRemove(index)}
              title="Удалить требование"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QualReqList;
