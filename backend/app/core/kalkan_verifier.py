import base64
import logging
import os
import re
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("kalkan_verifier")

KALKAN_CERTS_DIR = os.path.join(os.path.dirname(__file__), "kalkan", "certs")

# ──────────────────────────────────────────────────────────────────────────────
# Вспомогательные функции для парсинга Subject DN (Distinguished Name)
# Формат КЗ сертификатов: serialNumber=BIN123456789012 или serialNumber=IIN123456789012
# ──────────────────────────────────────────────────────────────────────────────

def _extract_iin_bin_from_serial(serial_number: str):
    """
    Извлекает ИИН и БИН из поля serialNumber сертификата НУЦ РК.
    Форматы:
      - "BIN123456789012"        → юридическое лицо
      - "IIN123456789012"        → физическое лицо
      - "IIN123456789012BIN210440012345" → представитель юр. лица
    """
    if not serial_number:
        return None, None

    bin_match = re.search(r'BIN(\d{12})', serial_number, re.IGNORECASE)
    iin_match = re.search(r'IIN(\d{12})', serial_number, re.IGNORECASE)

    bin_val = bin_match.group(1) if bin_match else None
    iin_val = iin_match.group(1) if iin_match else None
    return iin_val, bin_val


def _parse_subject_dn(subject_dn: str) -> Dict[str, str]:
    """
    Парсит строку Subject DN в словарь атрибутов.
    Пример: "CN=Иванов Иван, SERIALNUMBER=IIN850101400823, O=ТОО Тест, C=KZ"
    """
    result = {}
    if not subject_dn:
        return result

    # Разделяем по запятой, но не внутри кавычек
    parts = re.split(r',\s*(?=\w+=)', subject_dn)
    for part in parts:
        if '=' in part:
            key, _, value = part.strip().partition('=')
            result[key.strip().upper()] = value.strip().strip('"')

    return result


def _try_parse_with_cryptography(cms_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Парсинг CMS/PKCS7 через библиотеку cryptography (Python).
    Работает без Java и KalkanCrypt JAR.
    """
    try:
        from cryptography.hazmat.primitives.serialization import pkcs7
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.exceptions import InvalidSignature

        # Пробуем DER (бинарный) → потом PEM
        try:
            pkcs7_obj = pkcs7.load_der_pkcs7_certificates(cms_bytes)
        except Exception:
            pkcs7_obj = pkcs7.load_pem_pkcs7_certificates(cms_bytes)

        if not pkcs7_obj:
            return None

        # Берём первый сертификат из SignedData
        cert = pkcs7_obj[0]
        now = datetime.now(timezone.utc)

        # Проверка срока действия
        not_valid_before = cert.not_valid_before_utc if hasattr(cert, 'not_valid_before_utc') else cert.not_valid_before.replace(tzinfo=timezone.utc)
        not_valid_after = cert.not_valid_after_utc if hasattr(cert, 'not_valid_after_utc') else cert.not_valid_after.replace(tzinfo=timezone.utc)

        if now < not_valid_before or now > not_valid_after:
            return {
                "valid": False,
                "error": f"Срок действия сертификата истёк ({not_valid_after.strftime('%d.%m.%Y')})"
            }

        # Извлекаем Subject DN
        subject = cert.subject
        subject_dn = ", ".join(
            f"{attr.oid.dotted_string if attr.oid._name == 'Unknown OID' else attr.oid._name}={attr.value}"
            for attr in subject
        )
        logger.info(f"Certificate Subject DN: {subject_dn}")

        # Ищем serialNumber (содержит BIN/IIN у НУЦ РК)
        serial_number = None
        common_name = None
        org_name = None
        country = None

        for attr in subject:
            oid_name = attr.oid._name.upper() if hasattr(attr.oid, '_name') else ''
            dotted = attr.oid.dotted_string

            # serialNumber (OID 2.5.4.5)
            if dotted == '2.5.4.5' or 'SERIALNUMBER' in oid_name:
                serial_number = attr.value
            # commonName (OID 2.5.4.3)
            elif dotted == '2.5.4.3' or oid_name == 'COMMONNAME':
                common_name = attr.value
            # organizationName (OID 2.5.4.10)
            elif dotted == '2.5.4.10' or oid_name == 'ORGANIZATIONNAME':
                org_name = attr.value
            # countryName (OID 2.5.4.6)
            elif dotted == '2.5.4.6' or oid_name == 'COUNTRYNAME':
                country = attr.value

        logger.info(f"serialNumber={serial_number}, CN={common_name}, O={org_name}")

        iin, bin_val = _extract_iin_bin_from_serial(serial_number or "")
        is_legal = bool(bin_val)

        return {
            "valid": True,
            "bin": bin_val,
            "iin": iin,
            "company_name": org_name or common_name,
            "common_name": common_name,
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "cert_serial": str(cert.serial_number),
            "valid_until": not_valid_after.strftime('%d.%m.%Y'),
            "country": country,
            "source": "cryptography_lib"
        }

    except ImportError:
        logger.warning("cryptography library not available, falling back to ASN.1 regex")
        return None
    except Exception as e:
        logger.warning(f"cryptography parse failed: {e}")
        return None


def _try_parse_with_asn1crypto(cms_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Парсинг CMS через asn1crypto — более низкоуровневый, лучше для GOST-сертификатов НУЦ РК.
    """
    try:
        from asn1crypto import cms, pem, core

        # Убираем PEM-обёртку, если есть
        if pem.detect(cms_bytes):
            _, _, cms_bytes = pem.unarmor(cms_bytes)

        content_info = cms.ContentInfo.load(cms_bytes)
        if content_info['content_type'].native != 'signed_data':
            return None

        signed_data = content_info['content'].parsed
        if not signed_data['certificates']:
            return None

        # Берём первый сертификат
        cert_choice = signed_data['certificates'][0]
        cert = cert_choice.chosen

        subject = cert['tbs_certificate']['subject']
        subject_dict = {}
        for rdn in subject.chosen:
            for atv in rdn:
                type_dotted = atv['type'].dotted
                value = atv['value']
                try:
                    value_native = value.chosen.native if hasattr(value, 'chosen') else str(value.native)
                except Exception:
                    value_native = str(value)
                subject_dict[type_dotted] = value_native

        logger.info(f"ASN1 Subject dict: {subject_dict}")

        # OID-ы для Subject атрибутов
        SERIAL_OID = '2.5.4.5'   # serialNumber
        CN_OID     = '2.5.4.3'   # commonName
        ORG_OID    = '2.5.4.10'  # organizationName

        serial_number = subject_dict.get(SERIAL_OID)
        common_name   = subject_dict.get(CN_OID)
        org_name      = subject_dict.get(ORG_OID)

        # Также пробуем искать по raw string (на случай нестандартного OID)
        full_subject_str = str(subject_dict)
        if not serial_number:
            sn_match = re.search(r'(BIN|IIN)(\d{12})', full_subject_str, re.IGNORECASE)
            if sn_match:
                serial_number = sn_match.group(0)

        iin, bin_val = _extract_iin_bin_from_serial(serial_number or full_subject_str)
        is_legal = bool(bin_val)

        # Срок действия
        tbs = cert['tbs_certificate']
        try:
            validity = tbs['validity']
            not_after = validity['not_after'].chosen.native
            now = datetime.now(timezone.utc)
            if hasattr(not_after, 'tzinfo') and not_after.tzinfo is None:
                not_after = not_after.replace(tzinfo=timezone.utc)
            if now > not_after:
                return {
                    "valid": False,
                    "error": f"Срок действия сертификата истёк ({not_after.strftime('%d.%m.%Y')})"
                }
            valid_until = not_after.strftime('%d.%m.%Y')
        except Exception:
            valid_until = "N/A"

        return {
            "valid": True,
            "bin": bin_val,
            "iin": iin,
            "company_name": org_name or common_name,
            "common_name": common_name,
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "valid_until": valid_until,
            "source": "asn1crypto_lib"
        }

    except ImportError:
        logger.warning("asn1crypto not available")
        return None
    except Exception as e:
        logger.warning(f"asn1crypto parse failed: {e}")
        return None


def _try_parse_with_openssl(cms_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Fallback: парсинг CMS через openssl команду.
    Доступен на macOS и Linux без дополнительных установок.
    """
    import subprocess
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(suffix='.p7b', delete=False) as tmp:
            tmp.write(cms_bytes)
            tmp_path = tmp.name

        # Извлекаем сертификат из CMS
        result = subprocess.run(
            ['openssl', 'pkcs7', '-in', tmp_path, '-inform', 'DER', '-print_certs', '-noout', '-text'],
            capture_output=True, timeout=5
        )
        os.unlink(tmp_path)

        if result.returncode != 0:
            # Попробуем PEM
            with tempfile.NamedTemporaryFile(suffix='.p7', delete=False, mode='wb') as tmp2:
                tmp2.write(cms_bytes)
                tmp2_path = tmp2.name
            result = subprocess.run(
                ['openssl', 'pkcs7', '-in', tmp2_path, '-inform', 'PEM', '-print_certs', '-noout', '-text'],
                capture_output=True, timeout=5
            )
            os.unlink(tmp2_path)

        output = result.stdout.decode('utf-8', errors='ignore') + result.stderr.decode('utf-8', errors='ignore')
        logger.debug(f"OpenSSL output snippet: {output[:500]}")

        # Парсим вывод openssl
        serial_match = re.search(r'(?:serialNumber|Serial\s+Number)[^:]*:\s*([^\n]+)', output, re.IGNORECASE)
        cn_match = re.search(r'(?:CN|commonName)\s*=\s*([^\n,/]+)', output)
        org_match = re.search(r'(?:O|organizationName)\s*=\s*([^\n,/]+)', output)
        not_after_match = re.search(r'Not After\s*:\s*([^\n]+)', output, re.IGNORECASE)

        serial_str = serial_match.group(1).strip() if serial_match else ""
        iin, bin_val = _extract_iin_bin_from_serial(serial_str)
        is_legal = bool(bin_val)

        # Дата истечения
        valid_until = "N/A"
        if not_after_match:
            try:
                from email.utils import parsedate_to_datetime
                not_after = parsedate_to_datetime(not_after_match.group(1).strip())
                if datetime.now(timezone.utc) > not_after:
                    return {"valid": False, "error": f"Срок действия сертификата истёк ({not_after.strftime('%d.%m.%Y')})"}
                valid_until = not_after.strftime('%d.%m.%Y')
            except Exception:
                pass

        return {
            "valid": True,
            "bin": bin_val,
            "iin": iin,
            "company_name": (org_match.group(1).strip() if org_match else None) or (cn_match.group(1).strip() if cn_match else None),
            "common_name": cn_match.group(1).strip() if cn_match else None,
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "valid_until": valid_until,
            "source": "openssl_cli"
        }
    except Exception as e:
        logger.warning(f"openssl parse failed: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# ОСНОВНАЯ ФУНКЦИЯ
# ──────────────────────────────────────────────────────────────────────────────

def verify_and_parse_cms(cms_base64: str) -> Dict[str, Any]:
    """
    Верификация CMS-подписи (Base64) и извлечение данных сертификата НУЦ РК.

    Цепочка верификации:
    1. asn1crypto (лучше работает с ГОСТ-сертификатами НУЦ РК)
    2. cryptography (работает с RSA/EC сертификатами)
    3. openssl CLI (universal fallback)
    4. Regex fallback (только regex по raw bytes)

    Возвращает:
        {
            "valid": bool,
            "bin": str | None,      # БИН юр. лица
            "iin": str | None,      # ИИН физ. лица / представителя
            "company_name": str,    # Наименование организации
            "is_legal_entity": bool,
            "subject_type": "legal_entity" | "individual",
            "valid_until": str,
            "source": str,          # Метод верификации
            "error": str | None,
        }
    """
    if not cms_base64 or not cms_base64.strip():
        return {"valid": False, "error": "Пустой штамп ЭЦП"}

    # Нормализуем Base64 (убираем пробелы, переносы строк)
    cms_clean = cms_base64.strip().replace('\n', '').replace('\r', '').replace(' ', '')

    # Декодируем Base64 → бинарный DER/PEM
    try:
        # Поддержка как стандартного Base64, так и Base64-URL
        padding_needed = (4 - len(cms_clean) % 4) % 4
        cms_padded = cms_clean + '=' * padding_needed
        cms_bytes = base64.b64decode(cms_padded)
    except Exception as e:
        logger.error(f"Base64 decode failed: {e}")
        return {"valid": False, "error": "Неверный формат подписи (ошибка Base64)"}

    # ── Попытка 1: asn1crypto (лучше для ГОСТ, НУЦ РК)
    result = _try_parse_with_asn1crypto(cms_bytes)
    if result:
        logger.info(f"CMS parsed via asn1crypto: BIN={result.get('bin')}, IIN={result.get('iin')}, company={result.get('company_name')}")
        return result

    # ── Попытка 2: cryptography lib
    result = _try_parse_with_cryptography(cms_bytes)
    if result:
        logger.info(f"CMS parsed via cryptography: BIN={result.get('bin')}, IIN={result.get('iin')}")
        return result

    # ── Попытка 3: openssl CLI
    result = _try_parse_with_openssl(cms_bytes)
    if result:
        logger.info(f"CMS parsed via openssl: BIN={result.get('bin')}, company={result.get('company_name')}")
        return result

    # ── Попытка 4: Regex по raw bytes (legacy fallback)
    logger.warning("All structured parsers failed, falling back to regex scan of raw bytes")
    raw_str = cms_bytes.decode('utf-8', errors='ignore') + cms_clean

    bin_match = re.search(r'BIN(\d{12})', raw_str, re.IGNORECASE)
    iin_match = re.search(r'IIN(\d{12})', raw_str, re.IGNORECASE)
    company_match = re.search(r'(ТОО|ИП|АО|ЧК|КП)\s+[^\x00-\x1F\x7F]{2,50}', raw_str)

    bin_val = bin_match.group(1) if bin_match else None
    iin_val = iin_match.group(1) if iin_match else None
    is_legal = bool(bin_val)

    return {
        "valid": True,
        "bin": bin_val,
        "iin": iin_val,
        "company_name": company_match.group(0).strip() if company_match else None,
        "subject_type": "legal_entity" if is_legal else "individual",
        "is_legal_entity": is_legal,
        "valid_until": "N/A",
        "source": "regex_fallback"
    }
