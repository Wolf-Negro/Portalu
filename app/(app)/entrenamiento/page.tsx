import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import EntrenamientoClient from "./EntrenamientoClient";

export default async function EntrenamientoPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [modules, progress] = await Promise.all([
    prisma.trainingModule.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.trainingProgress.findMany({ where: { userId } }),
  ]);

  return <EntrenamientoClient modules={modules} progress={progress} userId={userId} />;
}
