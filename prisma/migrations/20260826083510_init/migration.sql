-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "sex" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "concernText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "selectedDoctorId" TEXT,
    "appointmentSlotId" TEXT,
    "insuranceType" TEXT,
    "timingAppropriate" BOOLEAN,
    "timingMessage" TEXT,
    "proceedDespiteWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AppointmentRequest_selectedDoctorId_fkey" FOREIGN KEY ("selectedDoctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AppointmentRequest_appointmentSlotId_fkey" FOREIGN KEY ("appointmentSlotId") REFERENCES "AppointmentSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentRequestId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientAnswer_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TriageAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentRequestId" TEXT NOT NULL,
    "urgencyLevel" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "triggeredRules" TEXT NOT NULL,
    "riskIndicators" TEXT NOT NULL,
    "missingInformation" TEXT NOT NULL,
    "recommendedTimeframe" TEXT NOT NULL,
    "recommendedClinicianType" TEXT NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "aiConfidence" REAL NOT NULL,
    "finalSource" TEXT NOT NULL,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TriageAssessment_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyRuleResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentRequestId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggered" BOOLEAN NOT NULL,
    "severity" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SafetyRuleResult_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "areasOfInterest" TEXT NOT NULL,
    "clinicLocation" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "avatarInitials" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AppointmentSlot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Clinician" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'clinician',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicianId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicianReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentRequestId" TEXT NOT NULL,
    "clinicianId" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "overrideUrgency" TEXT,
    "overrideReason" TEXT,
    "note" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicianReview_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicianReview_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentRequestId" TEXT,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemAuditLog_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScenarios" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "underTriageCount" INTEGER NOT NULL,
    "overTriageCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationRunId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "scenarioDescription" TEXT NOT NULL,
    "expectedUrgency" TEXT NOT NULL,
    "systemUrgency" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "underTriaged" BOOLEAN NOT NULL,
    "overTriaged" BOOLEAN NOT NULL,
    "triggeredRules" TEXT NOT NULL,
    "aiResult" TEXT NOT NULL,
    "finalResult" TEXT NOT NULL,
    CONSTRAINT "EvaluationResult_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "EvaluationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentRequest_appointmentSlotId_key" ON "AppointmentRequest"("appointmentSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "TriageAssessment_appointmentRequestId_key" ON "TriageAssessment"("appointmentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Clinician_email_key" ON "Clinician"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianReview_appointmentRequestId_key" ON "ClinicianReview"("appointmentRequestId");
