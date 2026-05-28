import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LEAD_NAMES = [
  "Carlos Mendoza","Ana Quispe","Luis Torres","María García","Pedro Villanueva",
  "Carmen Rojas","Roberto Puma","Sandra Huanca","Diego Castro","Patricia Flores",
  "Jorge Mamani","Elena Suárez","Andrés Rivas","Lucía Paredes","Fernando Chávez",
  "Rosa Espinoza","Miguel Soto","Isabel Morales","Eduardo Calderón","Claudia Vega",
  "Héctor Ramírez","Natalia Cruz","Arturo Díaz","Verónica Salazar","Guillermo León",
  "Amanda Reyes","Raúl Gutiérrez","Sofía Medina","Javier Herrera","Lorena Campos",
  "Iván Vargas","Vanessa Peña","Oscar Fuentes","Karina Navarro","Manuel Ruiz",
  "Valeria Ortega","Sergio Jiménez","Daniela Aguilar","Pablo Núñez","Gabriela Lara",
  "Tomás Ibáñez","Renata Guerrero","Marcos Espejo","Cecilia Montoya","Adolfo Ríos",
  "Nadia Cabrera","Víctor Sandoval","Olga Mendez","Cristian Palomino","Alicia Bermúdez",
  "Javier Quispe","Ana Lima","Carlos Ponce","María Valdez","Pedro Córdoba",
  "Sandra Bustamante","Luis Quintana","Patricia Landa","Diego Zárate","Carmen Alva",
  "Roberto Soriano","Elena Bravo","Andrés Meza","Lucía Saavedra","Fernando Arroyo",
  "Rosa Cárdenas","Miguel Chú","Isabel Cornejo","Eduardo Huamán","Claudia Barreto",
  "Héctor Linares","Natalia Ugarte","Arturo Pizarro","Verónica Arias","Guillermo Salas",
  "Amanda Lazo","Raúl Noriega","Sofía Delgado","Javier Ponce","Lorena Tacuri",
  "Iván Ñaupari","Vanessa Sifuentes","Oscar Gómez","Karina Roca","Manuel Hidalgo",
  "Valeria Cueva","Sergio Álvarez","Daniela Montalvo","Pablo Reyes","Gabriela Tello",
  "Tomás Vilca","Renata Mori","Marcos Segura","Cecilia Osorio","Adolfo Acevedo",
  "Nadia Luna","Víctor Estrada","Olga Flores","Cristian Benavides","Alicia Ochoa",
  "Javier Peralta","Ana Cervantes","Carlos Neyra","María Acuña","Pedro Llanos",
  "Sandra Cano","Luis Ayala","Patricia Tafur","Diego Luyo","Carmen Incio",
  "Roberto Polo","Elena Zúñiga","Andrés Vera","Lucía Muñoz","Fernando Ampuero",
  "Rosa Chanduví","Miguel Huertas","Isabel Anticona","Eduardo Cerna","Claudia Ballón",
  "Héctor Orbegoso","Natalia Idrogo","Arturo Culqui","Verónica Jara","Guillermo Pita",
  "Amanda Morillo","Raúl Atarama","Sofía Pariasca","Javier Tello","Lorena Meza",
  "Iván Solórzano","Vanessa Contreras","Oscar Aldave","Karina Bocanegra","Manuel Paucar",
  "Valeria Malca","Sergio Agurto","Daniela Gallegos","Pablo Carhuajulca","Gabriela Espino",
  "Tomás Oliva","Renata Pisfil","Marcos Delgado","Cecilia Cerna","Adolfo Bernal",
  "Nadia Iturrizaga","Víctor Quiroz","Olga Chumán","Cristian Nieto","Alicia Tarrillo",
];

const ORIGINS = ["meta_ads","meta_ads","meta_ads","meta_ads","whatsapp","whatsapp","formulario","landing","otros"];
const STATUSES = ["nuevo","nuevo","contactado","en_seguimiento","calificado","descartado"];
const STAGES = ["nuevo_lead","contactado","propuesta","negociacion","cerrado_ganado","cerrado_perdido"];
const ACTIVITY_TYPES = ["llamada","email","whatsapp","reunion","nota"];
const ACTIVITY_DESCS = [
  "Llamada realizada, cliente interesado en el servicio premium",
  "Email enviado con propuesta comercial",
  "WhatsApp: cliente solicita más información",
  "Reunión virtual realizada, avance positivo",
  "Nota: seguimiento programado para la próxima semana",
  "Lead calificado como potencial cliente",
  "Propuesta enviada, esperando respuesta",
  "Negociación en curso, descuento solicitado",
  "Contrato firmado, cierre exitoso",
  "Cliente descartado por presupuesto insuficiente",
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Super Admin (Alucinando)
  const superHash = await bcrypt.hash("portalu2025", 12);
  await prisma.user.upsert({
    where: { email: "super@portalu.pe" },
    update: {},
    create: {
      name: "Super Admin",
      email: "super@portalu.pe",
      password: superHash,
      role: "superadmin",
      companyId: null,
    },
  });
  console.log("✅ Super admin creado");

  // Company
  const company = await prisma.company.create({
    data: {
      id: "company-demo-001",
      name: "Empresa Demo Perú",
      website: "https://empresa-demo.pe",
      phone: "+51 999 888 777",
      address: "Lima, Perú",
      plan: "starter",
      active: true,
      metaAdAccountId: null,
      metaAccessToken: null,
    } as any,
  });
  console.log("✅ Empresa creada");

  // Users
  const hash = await bcrypt.hash("portalu2025", 12);
  const [admin, supervisor, asesor] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin Portalu",
        email: "admin@demo.com",
        password: hash,
        role: "admin",
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Carlos Supervisor",
        email: "supervisor@demo.com",
        password: hash,
        role: "supervisor",
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "María Asesora",
        email: "asesor@demo.com",
        password: hash,
        role: "asesor",
        companyId: company.id,
      },
    }),
  ]);
  console.log("✅ 3 usuarios creados");

  // 150 Leads
  const leads = await Promise.all(
    LEAD_NAMES.slice(0, 150).map((name, i) => {
      const origin = ORIGINS[i % ORIGINS.length];
      const status = STATUSES[i % STATUSES.length];
      const asesorId = i % 3 === 0 ? asesor.id : i % 3 === 1 ? supervisor.id : null;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));
      return prisma.lead.create({
        data: {
          name,
          phone: `+51 9${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
          origin,
          status,
          notes: i % 5 === 0 ? "Cliente con alto potencial de conversión" : null,
          companyId: company.id,
          asesorId,
          createdAt: date,
        },
      });
    })
  );
  console.log("✅ 150 leads creados");

  // 40 Opportunities
  const oppLeads = leads.slice(0, 40);
  const opportunities = await Promise.all(
    oppLeads.map((lead, i) => {
      const stage = STAGES[i % STAGES.length];
      const value = (Math.floor(Math.random() * 50) + 5) * 100;
      return prisma.opportunity.create({
        data: {
          title: `Oportunidad - ${lead.name}`,
          value,
          stage,
          probability: [20, 40, 60, 75, 100, 0][i % 6],
          leadId: lead.id,
          companyId: company.id,
        },
      });
    })
  );
  console.log("✅ 40 oportunidades creadas");

  // Activities
  await prisma.activity.createMany({
    data: Array.from({ length: 60 }, (_, i) => ({
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      description: ACTIVITY_DESCS[i % ACTIVITY_DESCS.length],
      userId: i % 2 === 0 ? asesor.id : supervisor.id,
      leadId: leads[i % leads.length].id,
      createdAt: new Date(Date.now() - i * 3600000 * 4),
    })),
  });
  console.log("✅ 60 actividades creadas");

  // 5 Campaigns
  await prisma.campaign.createMany({
    data: [
      {
        name: "Campaña Verano 2025 — Leads Calientes",
        platform: "meta",
        status: "active",
        budget: 3000,
        spent: 2150,
        reach: 48500,
        impressions: 120000,
        clicks: 3200,
        leads: 142,
        cpl: 15.14,
        ctr: 2.67,
        roas: 4.2,
        companyId: company.id,
      },
      {
        name: "Retargeting Prospectos — Marzo",
        platform: "meta",
        status: "active",
        budget: 1500,
        spent: 980,
        reach: 22000,
        impressions: 55000,
        clicks: 1100,
        leads: 48,
        cpl: 20.42,
        ctr: 2.0,
        roas: 3.1,
        companyId: company.id,
      },
      {
        name: "Campaña Branding — Conoce Alucinando",
        platform: "meta",
        status: "active",
        budget: 800,
        spent: 800,
        reach: 95000,
        impressions: 210000,
        clicks: 1800,
        leads: 35,
        cpl: 22.86,
        ctr: 0.86,
        roas: 1.8,
        companyId: company.id,
      },
      {
        name: "Instagram Stories — Oferta Flash",
        platform: "meta",
        status: "active",
        budget: 500,
        spent: 320,
        reach: 18000,
        impressions: 42000,
        clicks: 950,
        leads: 28,
        cpl: 11.43,
        ctr: 2.26,
        roas: 5.4,
        companyId: company.id,
      },
      {
        name: "Audience Test — Lookalike",
        platform: "meta",
        status: "active",
        budget: 600,
        spent: 180,
        reach: 12000,
        impressions: 28000,
        clicks: 320,
        leads: 12,
        cpl: 15.0,
        ctr: 1.14,
        roas: 2.3,
        companyId: company.id,
      },
    ],
  });
  console.log("✅ 5 campañas creadas");

  // 10 Alerts
  await prisma.alert.createMany({
    data: [
      {
        type: "campaign_fatigue",
        title: "Fatiga detectada en 'Campaña Branding'",
        description: "El CTR cayó un 35% en las últimas 48 horas. Se recomienda renovar los creativos o pausar temporalmente.",
        severity: "alta",
        read: false,
        companyId: company.id,
      },
      {
        type: "lead_quality",
        title: "Los leads de Instagram convierten 2.3x más",
        description: "En los últimos 30 días, leads de Instagram tienen 42% de tasa de conversión vs 18% de Facebook. Considera aumentar presupuesto en Instagram.",
        severity: "baja",
        read: false,
        companyId: company.id,
      },
      {
        type: "response_time",
        title: "Tiempo de respuesta aumentó 4 minutos",
        description: "El promedio de respuesta a leads nuevos pasó de 8 a 12 minutos esta semana. Esto puede reducir conversiones hasta un 30%.",
        severity: "media",
        read: false,
        companyId: company.id,
      },
      {
        type: "campaign_performance",
        title: "Audience Test — Lookalike por debajo de benchmark",
        description: "ROAS de 2.3x está por debajo del benchmark del sector (3.5x). Considera ajustar segmentación o creativos.",
        severity: "media",
        read: true,
        companyId: company.id,
      },
      {
        type: "opportunity",
        title: "8 oportunidades sin movimiento en 7 días",
        description: "Oportunidades en etapa 'Propuesta' llevan más de 7 días sin actualización. Programa seguimiento urgente.",
        severity: "alta",
        read: false,
        companyId: company.id,
      },
      {
        type: "lead_spike",
        title: "Pico de leads los martes y jueves",
        description: "El 68% de tus leads llegan entre martes y jueves, 10am-2pm. Asegura disponibilidad máxima en ese horario.",
        severity: "baja",
        read: true,
        companyId: company.id,
      },
      {
        type: "budget",
        title: "Campaña Verano ha consumido el 72% del presupuesto",
        description: "Al ritmo actual, el presupuesto se agotará en 4 días. Considera aumentar o planificar pausa.",
        severity: "media",
        read: false,
        companyId: company.id,
      },
      {
        type: "conversion",
        title: "Formularios web tienen CPL más bajo: S/ 8.50",
        description: "El CPL de formularios web es 44% más bajo que Meta Ads. Considera invertir más en SEO y landing pages.",
        severity: "baja",
        read: true,
        companyId: company.id,
      },
      {
        type: "team",
        title: "Asesor María tiene la mejor tasa de cierre: 38%",
        description: "María Asesora cierra 3 de cada 8 leads. Analiza su metodología para replicarla en el equipo.",
        severity: "baja",
        read: false,
        companyId: company.id,
      },
      {
        type: "loss",
        title: "5 oportunidades perdidas esta semana por precio",
        description: "El 60% de los cierres perdidos mencionan precio como objeción principal. Considera ajustar propuesta de valor o estructura de precios.",
        severity: "alta",
        read: false,
        companyId: company.id,
      },
    ],
  });
  console.log("✅ 10 alertas creadas");

  // 3 Weekly summaries
  await prisma.weeklySummary.createMany({
    data: [
      {
        weekStart: new Date("2025-05-05"),
        weekEnd: new Date("2025-05-11"),
        totalLeads: 48,
        totalOpportunities: 12,
        totalRevenue: 24500,
        bestCampaign: "Campaña Verano 2025 — Leads Calientes",
        aiRecommendation: "Los lunes y martes son tus días de mayor captación. Asegura que tu equipo esté disponible al 100% esos días. Incrementa presupuesto en Instagram Stories que tiene el mejor CPL esta semana.",
        companyId: company.id,
      },
      {
        weekStart: new Date("2025-05-12"),
        weekEnd: new Date("2025-05-18"),
        totalLeads: 55,
        totalOpportunities: 15,
        totalRevenue: 31200,
        bestCampaign: "Instagram Stories — Oferta Flash",
        aiRecommendation: "Semana récord. Instagram Stories generó el mejor ROI (5.4x). Replica este creativo en Meta Feed. El tiempo de respuesta bajó a 8 min, continúa con esa mejora.",
        companyId: company.id,
      },
      {
        weekStart: new Date("2025-05-19"),
        weekEnd: new Date("2025-05-25"),
        totalLeads: 42,
        totalOpportunities: 10,
        totalRevenue: 18900,
        bestCampaign: "Retargeting Prospectos — Marzo",
        aiRecommendation: "Semana por debajo del promedio. El retargeting sigue siendo efectivo pero necesita nuevos creativos. Revisa las objeciones de precio en los cierres perdidos y ajusta el guion de ventas.",
        companyId: company.id,
      },
    ],
  });
  console.log("✅ 3 resúmenes semanales creados");

  // 5 Training modules
  await prisma.trainingModule.createMany({
    data: [
      {
        title: "Cómo vender mejor en el mundo digital",
        description: "Técnicas probadas para convertir leads en clientes en entornos digitales",
        category: "ventas",
        content: `El proceso de venta digital moderno requiere entender al cliente antes de presentar cualquier solución.

PRINCIPIO 1: Escucha activa primero
Antes de hablar de tu producto, haz preguntas poderosas. ¿Cuál es su mayor desafío? ¿Qué han intentado antes? ¿Qué impacto tiene este problema en su negocio?

PRINCIPIO 2: Propuesta de valor clara
Tu propuesta debe responder en 10 segundos: "¿Por qué debería comprar con tigo?" Sé específico con métricas y casos de éxito.

PRINCIPIO 3: El seguimiento es el rey
El 80% de las ventas se cierran después del 5to contacto. Define un sistema de seguimiento: llamada → WhatsApp → email → propuesta → cierre.

PRINCIPIO 4: Manejo de objeciones
Las 3 objeciones más comunes son precio, tiempo y confianza. Prepara respuestas para cada una con evidencia concreta.`,
        duration: 25,
        order: 1,
        published: true,
      },
      {
        title: "Cómo responder leads en los primeros 5 minutos",
        description: "El tiempo de respuesta puede duplicar tu tasa de conversión",
        category: "ventas",
        content: `Los estudios muestran que responder en los primeros 5 minutos multiplica por 9 las probabilidades de conversión.

POR QUÉ IMPORTA:
El lead está caliente cuando llega. Cada minuto que pasa, su interés disminuye y puede contactar a tu competencia.

PROTOCOLO DE RESPUESTA RÁPIDA:

1. Mensaje de bienvenida inmediato (automático con WhatsApp Business):
"Hola [NOMBRE], soy [ASESOR] de [EMPRESA]. Vi que te interesó [SERVICIO]. ¿Tienes 5 minutos para contarme qué necesitas?"

2. Calificación en la segunda respuesta:
Pregunta por: presupuesto aproximado, urgencia, decisión (¿tú decides o hay otros involucrados?)

3. Propuesta de llamada o reunión:
"Basándome en lo que me cuentas, creo que puedo ayudarte. ¿Podemos hablar hoy a las [HORA] o mañana a las [HORA]?"`,
        duration: 20,
        order: 2,
        published: true,
      },
      {
        title: "Cómo grabar mejores videos para anuncios",
        description: "Guía práctica para crear creativos de alto rendimiento en Meta Ads",
        category: "marketing",
        content: `Un buen creativo puede reducir tu CPL a la mitad. Aquí están los elementos clave:

ESTRUCTURA DEL VIDEO DE 60 SEGUNDOS:
- 0-3 seg: Hook de atención (problema o pregunta poderosa)
- 3-15 seg: Ampliar el problema (empatía)
- 15-40 seg: Solución y beneficios
- 40-55 seg: Prueba social o resultado
- 55-60 seg: Call to action claro

TIPS TÉCNICOS:
✓ Graba en formato vertical (9:16) para Stories y Reels
✓ Subtítulos siempre (85% ve sin audio)
✓ Primera frase en pantalla los primeros 2 segundos
✓ Iluminación natural o ring light básico
✓ Fondo limpio, sin distracciones

ELEMENTOS QUE FUNCIONAN:
- Cara real y expresiva (no stock)
- Antes y después con datos
- Testimonios de clientes reales
- Demostración del producto/servicio`,
        duration: 30,
        order: 3,
        published: true,
      },
      {
        title: "Cómo mejorar tus cierres de ventas",
        description: "Técnicas de cierre efectivas para el mercado peruano",
        category: "ventas",
        content: `El cierre no es el final del proceso, es la consecuencia natural de un proceso bien ejecutado.

LAS 5 TÉCNICAS DE CIERRE MÁS EFECTIVAS:

1. CIERRE POR ASUNCIÓN
Actúa como si ya hubiera dicho que sí: "¿Comenzamos el próximo lunes o prefieres el miércoles?"

2. CIERRE POR URGENCIA
"Esta oferta está disponible solo hasta el viernes porque los lugares son limitados."

3. CIERRE POR RESUMEN
Resume todos los beneficios antes de pedir la decisión: "Entonces tendrás X, Y y Z. ¿Comenzamos?"

4. CIERRE POR OBJECIÓN INVERSA
"¿Qué necesitaría ver para tomar una decisión hoy?" — Te da exactamente qué resolver.

5. CIERRE POR SILENCIO
Después de presentar la propuesta, quédate callado. El primero que habla, pierde.

MANEJO DE PRECIOS:
Nunca des el precio sin antes establecer valor. El precio siempre parece caro cuando el valor no está claro.`,
        duration: 35,
        order: 4,
        published: true,
      },
      {
        title: "Cómo interpretar tus métricas de marketing",
        description: "Entiende los números que realmente importan para tu negocio",
        category: "metricas",
        content: `Las métricas te dicen la verdad sobre tu negocio. Aprender a leerlas te da ventaja competitiva.

MÉTRICAS CLAVE EN META ADS:

CTR (Click-Through Rate):
- Por encima del 2%: Excelente
- 1-2%: Normal
- Menos del 1%: Necesita mejora
- Si baja más del 20% en 48h: fatiga de creativo

CPL (Costo Por Lead):
Depende del sector, pero para servicios en Perú:
- Menos de S/ 15: Muy eficiente
- S/ 15-30: Normal
- Más de S/ 30: Optimiza

ROAS (Return On Ad Spend):
- 3x: Break even en la mayoría de modelos
- 5x: Bueno
- 8x o más: Excelente

EMBUDO DE CONVERSIÓN:
Lead → Contactado → Calificado → Propuesta → Cierre
Cada etapa debería tener al menos 60-70% de retención para ser saludable.`,
        duration: 40,
        order: 5,
        published: true,
      },
    ],
  });
  console.log("✅ 5 módulos de entrenamiento creados");

  // Partial training progress
  await prisma.trainingProgress.createMany({
    data: [
      { userId: asesor.id, moduleId: (await prisma.trainingModule.findFirst({ where: { order: 1 } }))!.id, completed: true, score: 85, completedAt: new Date() },
      { userId: asesor.id, moduleId: (await prisma.trainingModule.findFirst({ where: { order: 2 } }))!.id, completed: true, score: 100, completedAt: new Date() },
      { userId: asesor.id, moduleId: (await prisma.trainingModule.findFirst({ where: { order: 3 } }))!.id, completed: false },
      { userId: supervisor.id, moduleId: (await prisma.trainingModule.findFirst({ where: { order: 1 } }))!.id, completed: true, score: 90, completedAt: new Date() },
    ],
  });
  console.log("✅ Progreso de entrenamiento creado");

  // Conversations for WhatsApp
  await prisma.conversation.createMany({
    data: [
      { contact: "Carlos Mendoza", phone: "+51 987654321", status: "open", tags: "caliente,meta_ads" },
      { contact: "Ana Quispe", phone: "+51 976543210", status: "open", tags: "nuevo" },
      { contact: "Luis Torres", phone: "+51 965432109", status: "closed", tags: "cerrado" },
    ],
  });
  console.log("✅ Conversaciones de WhatsApp creadas");

  console.log("\n🚀 Seed completado exitosamente!");
  console.log("\n📋 CREDENCIALES DE ACCESO:");
  console.log("   Admin:      admin@demo.com      / portalu2025");
  console.log("   Supervisor: supervisor@demo.com / portalu2025");
  console.log("   Asesor:     asesor@demo.com     / portalu2025");
  console.log("\n🌐 URL: http://localhost:3000");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
