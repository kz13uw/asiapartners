import React from 'react';
import { Package, Trash2, Shield, Truck, Calendar } from 'lucide-react';

const LotEditorCard = ({
  lot,
  index,
  totalLots,
  subjectType,
  onUpdate,
  onRemove,
}) => {
  const calculateLotTotals = (field, val) => {
    const updated = { ...lot, [field]: val };
    const q = parseFloat(updated.quantity) || 1;
    const up = parseFloat(updated.unit_price) || 0;
    const startPrice = q * up;
    updated.start_price = startPrice;

    const vRate = parseFloat(updated.vat_rate) || 16.0;
    if (updated.vat_mode === 'include_vat') {
      updated.total_price_without_vat = startPrice / (1 + vRate / 100);
      updated.vat_amount = startPrice - updated.total_price_without_vat;
    } else {
      updated.total_price_without_vat = startPrice;
      updated.vat_amount = 0;
    }
    onUpdate(index, updated);
  };

  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px dashed #e2e8f0',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
          <Package size={18} color="var(--pk-primary)" />
          <span>Лот №{lot.lot_number || index + 1}</span>
        </div>
        {totalLots > 1 && (
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => onRemove(index)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
          >
            <Trash2 size={14} /> Удалить лот
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
            {subjectType === 'goods' ? 'Наименование поставляемого товара *' : 'Наименование услуги / объема работ *'}
          </label>
          <input
            type="text"
            className="form-control"
            placeholder={subjectType === 'goods' ? 'например: Кабель силовой ВВГнг-LS 3x2.5' : 'например: Монтаж электроосвещения и СМР'}
            value={lot.title || ''}
            onChange={(e) => onUpdate(index, { ...lot, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#334155' }}>
            Техническое описание / Спецификация
          </label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Подробные технические характеристики..."
            value={lot.description || ''}
            onChange={(e) => onUpdate(index, { ...lot, description: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
              Количество *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              className="form-control"
              value={lot.quantity || ''}
              onChange={(e) => calculateLotTotals('quantity', e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
              Ед. измерения *
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="шт, м, т, час..."
              value={lot.unit || ''}
              onChange={(e) => onUpdate(index, { ...lot, unit: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
              Цена за единицу (₸) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="form-control"
              placeholder="0.00"
              value={lot.unit_price || ''}
              onChange={(e) => calculateLotTotals('unit_price', e.target.value)}
              required
            />
          </div>
        </div>

        {/* НДС и калькулятор */}
        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Режим НДС
              </label>
              <select
                className="form-control form-control-sm"
                value={lot.vat_mode || 'include_vat'}
                onChange={(e) => calculateLotTotals('vat_mode', e.target.value)}
              >
                <option value="include_vat">Включая НДС (16%)</option>
                <option value="no_vat">Без НДС (0%)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Ставка НДС (%)
              </label>

              <input
                type="number"
                className="form-control form-control-sm"
                value={lot.vat_mode === 'no_vat' ? 0 : (lot.vat_rate || 16.0)}
                disabled={lot.vat_mode === 'no_vat'}
                onChange={(e) => calculateLotTotals('vat_rate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700, paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1' }}>
            <span>Итоговая стартовая сумма лота:</span>
            <span style={{ color: 'var(--pk-primary)', fontSize: '1.05rem' }}>
              {(parseFloat(lot.start_price) || 0).toLocaleString('ru-RU')} ₸
            </span>
          </div>
        </div>

        {/* Условия поставки */}
        {subjectType === 'goods' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                <Truck size={12} style={{ marginRight: '0.2rem' }} /> Инкотермс
              </label>
              <select
                className="form-control form-control-sm"
                value={lot.incoterms || 'DDP'}
                onChange={(e) => onUpdate(index, { ...lot, incoterms: e.target.value })}
              >
                <option value="DDP">DDP — Поставка с оплатой пошлин</option>
                <option value="EXW">EXW — Самовывоз со склада</option>
                <option value="FCA">FCA — Франко перевозчик</option>
                <option value="CPT">CPT — Фрахт до места назначения</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                Авансовый платеж (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control form-control-sm"
                value={lot.advance_payment_pct || 0}
                onChange={(e) => onUpdate(index, { ...lot, advance_payment_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                Срок поставки (дней)
              </label>
              <input
                type="number"
                min="1"
                className="form-control form-control-sm"
                placeholder="30"
                value={lot.delivery_days_count || ''}
                onChange={(e) => onUpdate(index, { ...lot, delivery_days_count: parseInt(e.target.value) || null })}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                <Calendar size={12} style={{ marginRight: '0.2rem' }} /> Начало работ
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={lot.service_start_date ? lot.service_start_date.split('T')[0] : ''}
                onChange={(e) => onUpdate(index, { ...lot, service_start_date: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                Завершение работ
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={lot.service_end_date ? lot.service_end_date.split('T')[0] : ''}
                onChange={(e) => onUpdate(index, { ...lot, service_end_date: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                <Shield size={12} style={{ marginRight: '0.2rem' }} /> Гарантия (мес)
              </label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                placeholder="12"
                value={lot.warranty_months || ''}
                onChange={(e) => onUpdate(index, { ...lot, warranty_months: parseInt(e.target.value) || null })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LotEditorCard;
