import prisma from "@/lib/prisma";
import { getSystemConfig } from "@/lib/system-config";

export interface MetaAdAccountInfo {
  accountId: string;
  accessToken: string;
  label: string;
}

/**
 * Credenciales de UNA cuenta publicitaria. Sin `accountId`, devuelve la
 * cuenta "primaria" de la empresa (Company.metaAdAccountId/metaAccessToken,
 * con fallback al token/cuenta global) — comportamiento histórico, sin
 * cambios para empresas con una sola cuenta. Con `accountId`, busca esa
 * cuenta específica entre las adicionales (tabla MetaAdAccount) o, si
 * coincide con la primaria, la devuelve también.
 */
export async function getMetaCredentials(
  companyId: string | null | undefined,
  accountId?: string
) {
  const [globalToken, globalAccount] = await Promise.all([
    getSystemConfig("META_ACCESS_TOKEN"),
    getSystemConfig("META_AD_ACCOUNT_ID_DEFAULT"),
  ]);

  if (!companyId) {
    return { token: globalToken, account: globalAccount };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { metaAdAccountId: true, metaAccessToken: true },
  });

  const primaryToken = (company?.metaAccessToken as string | null) || globalToken;
  const primaryAccount = (company?.metaAdAccountId as string | null) || globalAccount;

  if (!accountId || accountId === primaryAccount) {
    return { token: primaryToken, account: primaryAccount };
  }

  const extra = await prisma.metaAdAccount.findFirst({
    where: { companyId, accountId },
    select: { accountId: true, accessToken: true },
  });

  if (!extra) {
    return { token: primaryToken, account: primaryAccount };
  }

  return { token: extra.accessToken || primaryToken, account: extra.accountId };
}

/**
 * Todas las cuentas publicitarias de Meta de una empresa: la primaria
 * (si está configurada) seguida de las adicionales. Usado para el modo
 * "combinado" (agregar datos de todas) y para poblar el selector de cuentas.
 */
export async function getAllMetaAdAccounts(
  companyId: string | null | undefined
): Promise<MetaAdAccountInfo[]> {
  if (!companyId) return [];

  const [globalToken, company, extras] = await Promise.all([
    getSystemConfig("META_ACCESS_TOKEN"),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, metaAdAccountId: true, metaAccessToken: true },
    }),
    prisma.metaAdAccount.findMany({
      where: { companyId },
      select: { accountId: true, accessToken: true, label: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const accounts: MetaAdAccountInfo[] = [];

  if (company?.metaAdAccountId) {
    accounts.push({
      accountId: company.metaAdAccountId,
      accessToken: company.metaAccessToken || globalToken,
      label: "Principal",
    });
  }

  for (const extra of extras) {
    accounts.push({
      accountId: extra.accountId,
      accessToken: extra.accessToken || company?.metaAccessToken || globalToken,
      label: extra.label || extra.accountId,
    });
  }

  return accounts;
}
