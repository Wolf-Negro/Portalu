import prisma from "@/lib/prisma";

export async function getMetaCredentials(companyId: string | null | undefined) {
  const envToken = process.env.META_ACCESS_TOKEN!;
  const envAccount = process.env.META_AD_ACCOUNT_ID!;

  if (!companyId) {
    return { token: envToken, account: envAccount };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { metaAdAccountId: true, metaAccessToken: true },
  });

  return {
    token: (company?.metaAccessToken as string | null) ?? envToken,
    account: (company?.metaAdAccountId as string | null) ?? envAccount,
  };
}
