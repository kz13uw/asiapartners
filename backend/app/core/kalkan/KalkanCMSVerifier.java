import kz.gov.pki.kalkan.jce.provider.KalkanProvider;
import kz.gov.pki.kalkan.jce.provider.cms.CMSSignedData;
import kz.gov.pki.kalkan.jce.provider.cms.SignerInformation;
import kz.gov.pki.kalkan.jce.provider.cms.SignerInformationStore;

import java.security.Security;
import java.security.cert.CertStore;
import java.security.cert.X509CertSelector;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Collection;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * KalkanCMSVerifier — верификация CMS НУЦ РК через KalkanCrypt JCE.
 * Поддерживает ГОСТ Р 34.10-2015.
 *
 * Запуск: java -cp kalkan.jar:. KalkanCMSVerifier <cms_base64>
 */
public class KalkanCMSVerifier {

    static final Pattern BIN = Pattern.compile("BIN(\\d{12})", Pattern.CASE_INSENSITIVE);
    static final Pattern IIN = Pattern.compile("IIN(\\d{12})", Pattern.CASE_INSENSITIVE);
    static final String PROVIDER = "KalkanProvider";

    public static void main(String[] args) {
        if (args.length < 1 || args[0].trim().isEmpty()) {
            out(false, null, null, null, null, false, false, "No CMS provided");
            return;
        }

        // Регистрируем KalkanProvider с поддержкой ГОСТ
        Security.insertProviderAt(new KalkanProvider(), 1);

        String raw = args[0].trim()
            .replace("-----BEGIN PKCS7-----", "")
            .replace("-----END PKCS7-----", "")
            .replaceAll("\\s+", "");

        try {
            byte[] cmsBytes = Base64.getDecoder().decode(raw);
            CMSSignedData sd = new CMSSignedData(cmsBytes);

            // Получаем стандартный CertStore (работает без X509Store)
            CertStore certStore = sd.getCertificatesAndCRLs("Collection", PROVIDER);

            SignerInformationStore sis = sd.getSignerInfos();
            Collection signers = sis.getSigners();

            if (signers == null || signers.isEmpty()) {
                out(false, null, null, null, null, false, false, "No signers in CMS");
                return;
            }

            for (Object obj : signers) {
                SignerInformation signer = (SignerInformation) obj;

                // Ищем сертификат через X509CertSelector по signerID
                X509CertSelector selector = signer.getSID();
                Collection certs = certStore.getCertificates(selector);

                X509Certificate cert = null;
                if (certs != null && !certs.isEmpty()) {
                    cert = (X509Certificate) certs.iterator().next();
                } else {
                    // Альтернатива: берём первый из всех
                    Collection allCerts = certStore.getCertificates(new X509CertSelector());
                    if (allCerts != null && !allCerts.isEmpty()) {
                        cert = (X509Certificate) allCerts.iterator().next();
                    }
                }

                if (cert == null) {
                    out(false, null, null, null, null, false, false, "Certificate not found in CMS");
                    return;
                }

                // Срок действия
                if (new java.util.Date().after(cert.getNotAfter())) {
                    out(false, null, null, null, null, false, false,
                        "Certificate expired: " + cert.getNotAfter());
                    return;
                }

                // Верификация подписи (криптографическая)
                boolean sigOk = false;
                try {
                    sigOk = signer.verify(cert, PROVIDER);
                } catch (Exception e) {
                    // Подпись не верифицирована — продолжаем, вернём sigOk=false
                }

                // Парсим Subject DN для извлечения BIN/IIN
                String dn = cert.getSubjectDN().getName();
                String binVal = null, iinVal = null, org = null, cn = null;

                for (String part : dn.split(",(?=\\s*\\w+\\s*=)")) {
                    String p = part.trim();
                    int eq = p.indexOf('=');
                    if (eq < 0) continue;
                    String key = p.substring(0, eq).trim().toUpperCase();
                    String val = p.substring(eq + 1).trim().replace("\"", "");

                    if (key.equals("SERIALNUMBER") || key.equals("2.5.4.5")) {
                        Matcher mb = BIN.matcher(val);
                        Matcher mi = IIN.matcher(val);
                        if (mb.find()) binVal = mb.group(1);
                        if (mi.find()) iinVal = mi.group(1);
                    } else if (key.equals("O")) {
                        org = val;
                    } else if (key.equals("CN")) {
                        cn = val;
                    }
                }

                // Если не нашли — сканируем весь DN
                if (binVal == null && iinVal == null) {
                    Matcher mb = BIN.matcher(dn);
                    Matcher mi = IIN.matcher(dn);
                    if (mb.find()) binVal = mb.group(1);
                    if (mi.find()) iinVal = mi.group(1);
                }

                out(true, binVal, iinVal, org != null ? org : cn, cn, binVal != null, sigOk, null);
                return;
            }

            out(false, null, null, null, null, false, false, "Could not match cert to signer");

        } catch (IllegalArgumentException e) {
            out(false, null, null, null, null, false, false, "Invalid Base64: " + e.getMessage());
        } catch (Exception e) {
            String msg = (e.getMessage() != null ? e.getMessage() : e.getClass().getName())
                .replace("\"", "'").replaceAll("[\\r\\n]+", " ");
            out(false, null, null, null, null, false, false, msg);
        }
    }

    static String q(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    static void out(boolean valid, String bin, String iin, String company, String cn,
                    boolean isLegal, boolean sigValid, String error) {
        System.out.printf(
            "{\"valid\":%b,\"bin\":%s,\"iin\":%s,\"company\":%s,\"cn\":%s,\"is_legal\":%b,\"signature_valid\":%b,\"error\":%s}%n",
            valid, q(bin), q(iin), q(company), q(cn), isLegal, sigValid, q(error)
        );
        System.out.flush();
    }
}
