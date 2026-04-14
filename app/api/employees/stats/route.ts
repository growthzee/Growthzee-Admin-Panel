export const dynamic = "force-dynamic";
// app/api/employees/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const employees = await prisma.employee.findMany({
      include: {
        tasks: { select: { status: true } },
        clientTasks: {
          select: { status: true, title: true, completedAt: true, client: { select: { name: true, company: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const stats = employees.map((emp) => {
      const internalCompleted = emp.tasks.filter((t) => t.status === "COMPLETED").length;
      const internalTotal = emp.tasks.length;

      const clientCompleted = emp.clientTasks.filter((t) => t.status === "COMPLETED").length;
      const clientFailed = emp.clientTasks.filter((t) => t.status === "OVERDUE").length;
      const clientChanges = emp.clientTasks.filter((t) => t.status === "CHANGES_REQUIRED").length;
      const clientTotal = emp.clientTasks.length;

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        position: emp.position,
        status: emp.status,
        internal: { total: internalTotal, completed: internalCompleted },
        client: {
          total: clientTotal,
          completed: clientCompleted,
          failed: clientFailed,
          changes: clientChanges,
          pending: emp.clientTasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length,
        },
        clientTasks: emp.clientTasks,
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
