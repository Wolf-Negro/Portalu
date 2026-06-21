import prisma from "@/lib/prisma";
import { getSystemConfig } from "@/lib/system-config";

export async function getMetaCredentials(companyId: string | null | undefined) {
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

  return {
    token: (company?.metaAccessToken as string | null) || globalToken,
    account: (company?.metaAdAccountId as string | null) || globalAccount,
  };
}
