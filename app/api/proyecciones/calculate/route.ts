import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BASE_RANGES = {
  visit_to_lead: [0.10, 0.20] as [number, number],
  lead_to_interested: [0.60, 0.70] as [number, number],
  interested_to_sale: [0.20, 0.25] as [number, number],
};

const ADJUSTMENTS: Record<string, Record<string, number>> = {
  B2B: { high: 0.85, low: 1.00, hard: 0.80, medium: 0.90, easy: 1.00 },
  B2C: { high: 0.95, low: 1.05, hard: 0.90, medium: 1.00, easy: 1.10 },
};

function adjRange([lo, hi]: [number, number], f: number): [number, number] {
  return [lo * f, hi * f];
}

function propagate(sMin: number, sMax: number, [rLo, rHi]: [number, number]): [number, number] {
  return [sMin * rLo, sMax * rHi];
}

function calculateFunnel(body: {
  mode: string;
  businessType: string;
  ticket: string;
  difficulty: string;
  productPrice: number;
  investment?: number;
  targetSales?: number;
}) {
  const { mode, businessType, ticket, difficulty, productPrice } = body;
  const price = Math.max(1, productPrice);
  const priceFactor = price <= 200 ? 1.0 : 1.0 - Math.min(0.20, (price - 200) / 10000);
  const factor =
    (ADJUSTMENTS[businessType]?.[ticket] ?? 1.0) *
    (ADJUSTMENTS[businessType]?.[difficulty] ?? 1.0) *
    priceFactor;

  const vtl = adjRange(BASE_RANGES.visit_to_lead, factor);
  const lti = adjRange(BASE_RANGES.lead_to_interested, factor);
  const its = adjRange(BASE_RANGES.interested_to_sale, factor);

  if (mode === "investment") {
    const inv = body.investment!;
    const [rMin, rMax] = [inv * 35, inv * 45];
    const [cMin, cMax] = [rMin * 0.05, rMax * 0.04];
    const [vMin, vMax] = [cMin * 0.78, cMax * 0.95];
    const [lMin, lMax] = propagate(vMin, vMax, vtl);
    const [iMin, iMax] = propagate(lMin, lMax, lti);
    const [sMin, sMax] = propagate(iMin, iMax, its);
    return {
      reach:     [Math.round(rMin), Math.round(rMax)],
      clicks:    [Math.round(cMin), Math.round(cMax)],
      visits:    [Math.round(vMin), Math.round(vMax)],
      leads:     [Math.round(lMin), Math.round(lMax)],
      interested:[Math.round(iMin), Math.round(iMax)],
      sales:     [Math.round(sMin), Math.round(sMax)],
      revenue:   [Math.round(sMin * price), Math.round(sMax * price)],
    };
  } else {
    const target = body.targetSales!;
    const iLo = target / its[1];
    const iHi = target / its[0];
    const lLo = iLo / lti[1];
    const lHi = iHi / lti[0];
    const vLo = lLo / vtl[1];
    const vHi = lHi / vtl[0];
    const cLo = vLo * 0.85;
    const cHi = vHi * 0.85;
    const rLo = cLo / 0.05;
    const rHi = cHi / 0.04;
    const invLo = rLo / 45;
    const invHi = rHi / 35;
    return {
      investment: [Math.round(invLo), Math.round(invHi)],
      reach:      [Math.round(rLo), Math.round(rHi)],
      clicks:     [Math.round(cLo), Math.round(cHi)],
      visits:     [Math.round(vLo), Math.round(vHi)],
      leads:      [Math.round(lLo), Math.round(lHi)],
      interested: [Math.round(iLo), Math.round(iHi)],
      sales:      [target, target],
      revenue:    [Math.round(target * price), Math.round(target * price)],
    };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const companyId = (session?.user as any)?.companyId as string | undefined;

  const body = await req.json();
  const { mode, businessType, ticket, difficulty, productPrice, investment, targetSales } = body;

  if (!mode || !businessType || !ticket || !difficulty || !productPrice) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  try {
    const result = calculateFunnel({ mode, businessType, ticket, difficulty, productPrice: parseFloat(productPrice), investment: investment ? parseFloat(investment) : undefined, targetSales: targetSales ? parseFloat(targetSales) : undefined });

    // Save to DB for history
    if (userId) {
      const inputValue = mode === "investment" ? parseFloat(investment) : parseFloat(targetSales);
      await prisma.projection.create({
        data: {
          companyId: companyId || null,
          userId,
          mode,
          businessType,
          ticket,
          difficulty,
          productPrice: parseFloat(productPrice),
          input: inputValue,
          result: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error de cálculo" }, { status: 500 });
  }
}
