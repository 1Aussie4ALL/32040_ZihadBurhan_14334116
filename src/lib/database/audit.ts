import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// Append-only audit trail (section 31). Demonstration-grade: rows are never
// updated or deleted, only inserted, so the log always reflects exactly what the
// system did and when.

export type AuditEventType =
  | "appointment_request_created"
  | "red_flag_detected"
  | "ai_assessment_generated"
  | "ai_assessment_unavailable"
  | "final_urgency_assigned"
  | "appointment_timing_warning_shown"
  | "appointment_timing_warning_overridden"
  | "clinician_reviewed"
  | "clinician_overrode_classification";

export async function writeAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    appointmentRequestId?: string;
    eventType: AuditEventType;
    description: string;
    metadata?: unknown;
    actor?: string;
  },
) {
  await tx.systemAuditLog.create({
    data: {
      appointmentRequestId: params.appointmentRequestId,
      eventType: params.eventType,
      description: params.description,
      metadata: params.metadata !== undefined ? JSON.stringify(params.metadata) : null,
      actor: params.actor ?? "system",
    },
  });
}
