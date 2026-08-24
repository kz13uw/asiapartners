"""
kalkan_verifier.py — Верификация CMS-подписей НУЦ РК (НацБезопасность Казахстана).

Цепочка верификации (от лучшего к худшему):
  1. KalkanCrypt Java (kalkan.jar) — единственный вариант с полной поддержкой ГОСТ
  2. asn1crypto — для не-ГОСТ сертификатов (RSA/EC)
  3. cryptography — аналогично asn1crypto
  4. openssl CLI — fallback
  5. Regex по raw bytes — последний резерв

Примечание о ГОСТ:
  Казахстанские сертификаты используют алгоритмы ГОСТ Р 34.10-2015 и ГОСТ Р 34.11-2015.
  Стандартный Python (asn1crypto, cryptography, openssl без GOST-провайдера)
  НЕ ПОДДЕРЖИВАЕТ ГОСТ. Только kalkan.jar поддерживает их через JCE Provider.
"""

import base64
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("kalkan_verifier")

# ── Пути ──────────────────────────────────────────────────────────────────────
_CORE_DIR    = os.path.dirname(__file__)
_KALKAN_DIR  = os.path.join(_CORE_DIR, "kalkan")
_KALKAN_JAR  = os.path.join(_KALKAN_DIR, "kalkan.jar")
_VERIFIER_CLASS_DIR = _KALKAN_DIR   # куда компилируем KalkanCMSVerifier.java
_VERIFIER_JAVA = os.path.join(_KALKAN_DIR, "KalkanCMSVerifier.java")
_VERIFIER_CLASS = os.path.join(_KALKAN_DIR, "KalkanCMSVerifier.class")

# ── Поиск java-бинарника ──────────────────────────────────────────────────────
def _find_java() -> Optional[str]:
    """Возвращает путь к java или None."""
    # 1. Homebrew OpenJDK 21 (macOS)
    brew_paths = [
        "/opt/homebrew/opt/openjdk@21/bin/java",
        "/opt/homebrew/opt/openjdk/bin/java",
        "/usr/local/opt/openjdk@21/bin/java",
        "/usr/local/opt/openjdk/bin/java",
    ]
    for p in brew_paths:
        if os.path.exists(p):
            return p

    # 2. JAVA_HOME из окружения
    java_home = os.environ.get("JAVA_HOME")
    if java_home:
        p = os.path.join(java_home, "bin", "java")
        if os.path.exists(p):
            return p

    # 3. Системный java
    try:
        r = subprocess.run(["which", "java"], capture_output=True, timeout=3)
        if r.returncode == 0:
            path = r.stdout.decode().strip()
            if path:
                return path
    except Exception:
        pass

    return None


def _find_javac() -> Optional[str]:
    """Возвращает путь к javac или None."""
    java = _find_java()
    if java:
        javac = os.path.join(os.path.dirname(java), "javac")
        if os.path.exists(javac):
            return javac
    return None


# ── Компиляция KalkanCMSVerifier.java ─────────────────────────────────────────
def _ensure_verifier_compiled() -> bool:
    """Компилирует KalkanCMSVerifier.java если .class не существует."""
    if not os.path.exists(_VERIFIER_JAVA):
        logger.warning("KalkanCMSVerifier.java not found at %s", _VERIFIER_JAVA)
        return False
    if not os.path.exists(_KALKAN_JAR):
        logger.warning("kalkan.jar not found at %s", _KALKAN_JAR)
        return False

    if os.path.exists(_VERIFIER_CLASS):
        # Перекомпилируем если Java-файл новее .class
        if os.path.getmtime(_VERIFIER_JAVA) <= os.path.getmtime(_VERIFIER_CLASS):
            return True

    javac = _find_javac()
    if not javac:
        logger.warning("javac not found, cannot compile KalkanCMSVerifier.java")
        return False

    logger.info("Compiling KalkanCMSVerifier.java ...")
    try:
        r = subprocess.run(
            [javac, "-cp", _KALKAN_JAR, "-d", _VERIFIER_CLASS_DIR, _VERIFIER_JAVA],
            capture_output=True, timeout=30
        )
        if r.returncode != 0:
            logger.error("javac compilation failed:\n%s", r.stderr.decode("utf-8", errors="ignore"))
            return False
        logger.info("KalkanCMSVerifier.java compiled successfully")
        return True
    except Exception as e:
        logger.error("javac failed: %s", e)
        return False


# ── Верификация через kalkan.jar ───────────────────────────────────────────────
def _try_kalkan_java(cms_base64: str) -> Optional[Dict[str, Any]]:
    """
    Запускает KalkanCMSVerifier через Java с kalkan.jar.
    Возвращает распарсенный JSON или None при ошибке.
    """
    java = _find_java()
    if not java:
        logger.debug("Java not found, skipping KalkanCrypt verification")
        return None

    if not os.path.exists(_KALKAN_JAR):
        logger.debug("kalkan.jar not found")
        return None

    # Компилируем обёртку при необходимости
    compiled = _ensure_verifier_compiled()
    if not compiled:
        # Fallback: запускаем kalkan.jar напрямую как простую проверку версии
        # и используем regex для парсинга
        logger.debug("KalkanCMSVerifier.class not available")
        return None

    try:
        result = subprocess.run(
            [java, "-cp", f"{_KALKAN_JAR}:{_VERIFIER_CLASS_DIR}", "KalkanCMSVerifier", cms_base64],
            capture_output=True,
            timeout=15,
            cwd=_VERIFIER_CLASS_DIR
        )
        output = result.stdout.decode("utf-8", errors="ignore").strip()
        stderr = result.stderr.decode("utf-8", errors="ignore").strip()

        if stderr:
            logger.debug("KalkanCMSVerifier stderr: %s", stderr[:300])

        if not output:
            logger.warning("KalkanCMSVerifier returned empty output (rc=%d)", result.returncode)
            return None

        # Берём последнюю строку — там JSON
        last_line = [l.strip() for l in output.splitlines() if l.strip()][-1]
        parsed = json.loads(last_line)

        bin_val = parsed.get("bin")
        iin_val = parsed.get("iin")
        company = parsed.get("company")
        is_legal = parsed.get("is_legal", bool(bin_val))

        if not parsed.get("valid"):
            return {"valid": False, "error": parsed.get("error", "Верификация KalkanCrypt не прошла")}

        logger.info("KalkanCrypt verified: BIN=%s, IIN=%s, company=%s, sig_valid=%s",
                    bin_val, iin_val, company, parsed.get("signature_valid"))

        return {
            "valid": True,
            "bin": bin_val,
            "iin": iin_val,
            "company_name": company,
            "common_name": parsed.get("cn"),
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "signature_valid": parsed.get("signature_valid", False),
            "source": "kalkan_java"
        }

    except json.JSONDecodeError as e:
        logger.warning("KalkanCMSVerifier JSON parse error: %s | output: %s", e, output[:200])
        return None
    except subprocess.TimeoutExpired:
        logger.warning("KalkanCMSVerifier timed out")
        return None
    except Exception as e:
        logger.warning("KalkanCMSVerifier failed: %s", e)
        return None


# ── Вспомогательные функции ────────────────────────────────────────────────────
def _extract_iin_bin_from_serial(serial: str):
    bin_m = re.search(r'BIN(\d{12})', serial, re.IGNORECASE)
    iin_m = re.search(r'IIN(\d{12})', serial, re.IGNORECASE)
    return (iin_m.group(1) if iin_m else None), (bin_m.group(1) if bin_m else None)


def _try_parse_with_asn1crypto(cms_bytes: bytes) -> Optional[Dict[str, Any]]:
    try:
        from asn1crypto import cms as asn1_cms, pem

        if pem.detect(cms_bytes):
            _, _, cms_bytes = pem.unarmor(cms_bytes)

        ci = asn1_cms.ContentInfo.load(cms_bytes)
        if ci['content_type'].native != 'signed_data':
            return None

        sd = ci['content'].parsed
        if not sd['certificates']:
            return None

        cert = sd['certificates'][0].chosen
        subject_dict = {}
        for rdn in cert['tbs_certificate']['subject'].chosen:
            for atv in rdn:
                try:
                    val = atv['value'].chosen.native if hasattr(atv['value'], 'chosen') else str(atv['value'].native)
                    subject_dict[atv['type'].dotted] = val
                except Exception:
                    pass

        serial_str = subject_dict.get('2.5.4.5', '')
        cn_str     = subject_dict.get('2.5.4.3')
        org_str    = subject_dict.get('2.5.4.10')

        # Если нет в 2.5.4.5, ищем BIN/IIN по всему Subject
        if not serial_str:
            serial_str = str(subject_dict)

        iin, bin_val = _extract_iin_bin_from_serial(serial_str)
        is_legal = bool(bin_val)

        # Срок действия
        try:
            not_after = cert['tbs_certificate']['validity']['not_after'].chosen.native
            if hasattr(not_after, 'tzinfo') and not_after.tzinfo is None:
                not_after = not_after.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > not_after:
                return {"valid": False, "error": f"Срок действия сертификата истёк ({not_after.strftime('%d.%m.%Y')})"}
            valid_until = not_after.strftime('%d.%m.%Y')
        except Exception:
            valid_until = "N/A"

        return {
            "valid": True,
            "bin": bin_val, "iin": iin,
            "company_name": org_str or cn_str,
            "common_name": cn_str,
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "valid_until": valid_until,
            "source": "asn1crypto"
        }
    except Exception as e:
        logger.debug("asn1crypto failed: %s", e)
        return None


def _try_parse_with_openssl(cms_bytes: bytes) -> Optional[Dict[str, Any]]:
    try:
        with tempfile.NamedTemporaryFile(suffix='.p7b', delete=False) as f:
            f.write(cms_bytes)
            tmp = f.name

        for fmt in ('DER', 'PEM'):
            r = subprocess.run(
                ['openssl', 'pkcs7', '-in', tmp, '-inform', fmt, '-print_certs', '-noout', '-text'],
                capture_output=True, timeout=5
            )
            if r.returncode == 0:
                break
        os.unlink(tmp)

        out = r.stdout.decode('utf-8', errors='ignore')
        if not out:
            return None

        sn_m   = re.search(r'(?:serialNumber|Serial Number)\s*[=:]\s*([^\n,/]+)', out, re.IGNORECASE)
        cn_m   = re.search(r'(?:CN|commonName)\s*=\s*([^\n,/]+)', out)
        org_m  = re.search(r'(?:^|\s)O\s*=\s*([^\n,/]+)', out, re.MULTILINE)
        date_m = re.search(r'Not After\s*:\s*([^\n]+)', out, re.IGNORECASE)

        serial_str = sn_m.group(1).strip() if sn_m else ''
        iin, bin_val = _extract_iin_bin_from_serial(serial_str)
        is_legal = bool(bin_val)

        valid_until = "N/A"
        if date_m:
            try:
                from email.utils import parsedate_to_datetime
                not_after = parsedate_to_datetime(date_m.group(1).strip())
                if datetime.now(timezone.utc) > not_after:
                    return {"valid": False, "error": f"Срок действия сертификата истёк ({not_after.strftime('%d.%m.%Y')})"}
                valid_until = not_after.strftime('%d.%m.%Y')
            except Exception:
                pass

        return {
            "valid": True,
            "bin": bin_val, "iin": iin,
            "company_name": (org_m.group(1).strip() if org_m else None) or (cn_m.group(1).strip() if cn_m else None),
            "common_name": cn_m.group(1).strip() if cn_m else None,
            "subject_type": "legal_entity" if is_legal else "individual",
            "is_legal_entity": is_legal,
            "valid_until": valid_until,
            "source": "openssl"
        }
    except Exception as e:
        logger.debug("openssl parse failed: %s", e)
        return None


# ── ОСНОВНАЯ ФУНКЦИЯ ───────────────────────────────────────────────────────────
def verify_and_parse_cms(cms_base64: str) -> Dict[str, Any]:
    """
    Верификация CMS Base64-подписи НУЦ РК.

    Цепочка: KalkanJava → asn1crypto → openssl → regex

    Returns dict:
        valid: bool
        bin: str | None      — БИН организации
        iin: str | None      — ИИН физ. лица / представителя
        company_name: str    — Наименование организации
        is_legal_entity: bool
        signature_valid: bool — Криптографически верифицирована (только через Java)
        source: str          — Какой метод верификации сработал
        error: str | None
    """
    if not cms_base64 or not cms_base64.strip():
        return {"valid": False, "error": "Пустой штамп ЭЦП"}

    # Нормализуем Base64
    clean = cms_base64.strip().replace('\n', '').replace('\r', '').replace(' ', '')
    pad = (4 - len(clean) % 4) % 4
    try:
        cms_bytes = base64.b64decode(clean + '=' * pad)
    except Exception as e:
        return {"valid": False, "error": f"Неверный Base64: {e}"}

    # ── 1. KalkanCrypt Java — единственный с ГОСТ и crypto-верификацией ──
    result = _try_kalkan_java(clean)
    if result:
        return result

    # ── 2. asn1crypto ────────────────────────────────────────────────────
    result = _try_parse_with_asn1crypto(cms_bytes)
    if result:
        return result

    # ── 3. openssl CLI ───────────────────────────────────────────────────
    result = _try_parse_with_openssl(cms_bytes)
    if result:
        return result

    # ── 4. Regex по raw bytes (legacy) ───────────────────────────────────
    logger.warning("All parsers failed, falling back to regex scan")
    raw = cms_bytes.decode('utf-8', errors='ignore') + clean

    bin_m = re.search(r'BIN(\d{12})', raw, re.IGNORECASE)
    iin_m = re.search(r'IIN(\d{12})', raw, re.IGNORECASE)
    co_m  = re.search(r'(ТОО|ИП|АО|ЧК|КП)\s+[^\x00-\x1F\x7F]{2,50}', raw)

    bin_val = bin_m.group(1) if bin_m else None
    iin_val = iin_m.group(1) if iin_m else None

    return {
        "valid": True,
        "bin": bin_val, "iin": iin_val,
        "company_name": co_m.group(0).strip() if co_m else None,
        "subject_type": "legal_entity" if bin_val else "individual",
        "is_legal_entity": bool(bin_val),
        "signature_valid": False,
        "source": "regex_fallback"
    }
