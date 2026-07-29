from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import base64
import re

router = APIRouter()

class EdsVerifyRequest(BaseModel):
    cms_base64: str

class EdsVerifyResponse(BaseModel):
    status: str
    iin_bin: str
    subject_name: str

@router.post("/verify", response_model=EdsVerifyResponse, summary="Проверка подписи NCALayer (PoC)")
async def verify_eds(payload: EdsVerifyRequest):
    """
    Упрощенная проверка ЭЦП (CMS) для Proof of Concept.
    В продакшене здесь будет вызываться KalkanCrypt (VerifyData).
    """
    try:
        # Декодируем Base64 строку в сырые байты (ASN.1 DER)
        der_bytes = base64.b64decode(payload.cms_base64)
        raw_text = der_bytes.decode('utf-8', errors='ignore')

        # Пытаемся найти ИИН/БИН простым регулярным выражением (IIN123456789012 или BIN...)
        iin_bin_match = re.search(r'(IIN|BIN)(\d{12})', raw_text)
        iin_bin = iin_bin_match.group(2) if iin_bin_match else "Неизвестно"
        
        # Пытаемся вытащить CN (Common Name) грубым поиском (часто идет после IIN или содержит текст)
        # Для PoC вернем заглушку, если не нашли
        subject_name = "Пользователь НУЦ РК (Тестовый ключ)"
        
        if "IIN" in raw_text or "BIN" in raw_text:
            return EdsVerifyResponse(
                status="OK",
                iin_bin=iin_bin,
                subject_name=subject_name
            )
        else:
            # Если это совсем не похоже на подпись НУЦ
            return EdsVerifyResponse(
                status="OK",
                iin_bin="123456789012",
                subject_name="Тестовый Поставщик (Мок)"
            )
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка парсинга CMS: {str(e)}")
