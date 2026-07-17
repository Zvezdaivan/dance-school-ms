// Demo/seed data. Run with: npm run db:seed
// Sign-in accounts are printed at the end.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeBasePayCents, computePayableMinutes } from "../src/lib/payroll-calc";

const prisma = new PrismaClient();

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function monthShift(offset: number): string {
  const now = new Date();
  const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return dt.toISOString().slice(0, 7);
}
const CUR = monthShift(0);
const PREV = monthShift(-1);
const PREV2 = monthShift(-2);

let receiptSeq = 0;
const receipt = () => `RCP-SEED-${String(++receiptSeq).padStart(4, "0")}`;

async function main() {
  console.log("Clearing existing data…");
  // Order matters (FK constraints).
  await prisma.payrollAdjustment.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.workLog.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.danceClass.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.exportLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();

  console.log("Creating teachers…");
  const [mandy, kelvin, sarah, jason, emily] = await Promise.all([
    prisma.teacher.create({
      data: {
        fullName: "Mandy Chan", contactNumber: "9123 4567", email: "mandy@example.com",
        employmentType: "HOURLY", hourlyRateCents: 35000, startDate: d("2023-09-01"),
        bankName: "HSBC", bankAccountName: "Chan Man Yee", bankAccountNumber: "123-456789-001",
        notes: "Specialises in Ballet and Contemporary.",
      },
    }),
    prisma.teacher.create({
      data: {
        fullName: "Kelvin Wong", contactNumber: "9234 5678", email: "kelvin@example.com",
        employmentType: "HOURLY", hourlyRateCents: 30000, startDate: d("2024-02-15"),
        bankName: "Bank of China (HK)", bankAccountName: "Wong Ka Lok", bankAccountNumber: "012-345-6-789012",
        notes: "Hip Hop and Breaking.",
      },
    }),
    prisma.teacher.create({
      data: {
        fullName: "Sarah Lee", contactNumber: "9345 6789", email: "sarah@example.com",
        employmentType: "MONTHLY", monthlySalaryCents: 2200000, startDate: d("2022-06-01"),
        bankName: "Hang Seng Bank", bankAccountName: "Lee Wing Sze", bankAccountNumber: "234-567890-882",
        notes: "Full-time. Jazz, K-Pop; also handles curriculum planning.",
      },
    }),
    prisma.teacher.create({
      data: {
        fullName: "Jason Ho", contactNumber: "9456 7890", email: "jason@example.com",
        employmentType: "CONTRACTOR", hourlyRateCents: 40000, startDate: d("2025-01-10"),
        bankName: "Standard Chartered", bankAccountName: "Ho Chun Kit", bankAccountNumber: "447-0-012345-6",
        notes: "Guest Latin instructor, invoices monthly.",
      },
    }),
    prisma.teacher.create({
      data: {
        fullName: "Emily Ng", contactNumber: "9567 8901", email: "emily@example.com",
        employmentType: "HOURLY", hourlyRateCents: 28000, startDate: d("2023-03-20"), status: "INACTIVE",
        notes: "On sabbatical since spring.",
      },
    }),
  ]);

  console.log("Creating users…");
  const pw = (s: string) => bcrypt.hashSync(s, 10);
  await prisma.user.createMany({
    data: [
      { email: "admin@dance.school", name: "Alice Admin", passwordHash: pw("Admin1234!"), role: "ADMIN" },
      { email: "manager@dance.school", name: "Michael Manager", passwordHash: pw("Manager1234!"), role: "MANAGER" },
      { email: "staff@dance.school", name: "Stella Staff", passwordHash: pw("Staff1234!"), role: "STAFF" },
      { email: "mandy@dance.school", name: "Mandy Chan", passwordHash: pw("Teacher1234!"), role: "TEACHER", teacherId: mandy.id },
    ],
  });

  console.log("Creating students…");
  const names: [string, string, string | null][] = [
    ["Chloe Cheung", "6123 0001", null],
    ["Ethan Lam", "6123 0002", "Mrs. Lam 9876 0002"],
    ["Hailey Tsang", "6123 0003", "Mr. Tsang 9876 0003"],
    ["Ian Chow", "6123 0004", null],
    ["Jasmine Ho", "6123 0005", "Mrs. Ho 9876 0005"],
    ["Kayla Ng", "6123 0006", null],
    ["Lucas Yip", "6123 0007", "Mr. Yip 9876 0007"],
    ["Mia Leung", "6123 0008", null],
    ["Nathan Fung", "6123 0009", null],
    ["Olivia Siu", "6123 0010", "Mrs. Siu 9876 0010"],
    ["Peter Kwok", "6123 0011", null],
    ["Queenie Chan", "6123 0012", null],
    ["Ryan Mak", "6123 0013", "Mrs. Mak 9876 0013"],
    ["Sophia Tam", "6123 0014", null],
    ["Tiffany Lau", "6123 0015", null],
    ["Uma Wong", "6123 0016", "Mr. Wong 9876 0016"],
    ["Vincent Choi", "6123 0017", null],
    ["Winnie Poon", "6123 0018", null],
    ["Xavier Lo", "6123 0019", "Mrs. Lo 9876 0019"],
    ["Yvonne Kong", "6123 0020", null],
    ["Zoe Yuen", "6123 0021", null],
    ["Aaron Li", "6123 0022", null],
    ["Bella Cheng", "6123 0023", "Mr. Cheng 9876 0023"],
    ["Carson To", "6123 0024", null],
  ];
  const students = [];
  for (let i = 0; i < names.length; i++) {
    const [fullName, phone, guardian] = names[i];
    const status = i === 20 ? "GRADUATED" : i === 21 ? "SUSPENDED" : i === 22 ? "INACTIVE" : "ACTIVE";
    students.push(
      await prisma.student.create({
        data: {
          fullName,
          contactNumber: phone,
          email: `${fullName.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
          dateOfBirth: guardian ? d(`201${(i % 8) + 1}-0${(i % 9) + 1}-1${i % 9}`) : d(`199${(i % 9)}-0${(i % 9) + 1}-2${i % 8}`),
          guardianName: guardian ? guardian.split(" ").slice(0, 2).join(" ") : null,
          guardianPhone: guardian ? guardian.split(" ").slice(-2).join(" ") : null,
          address: `Flat ${(i % 20) + 1}A, ${(i % 30) + 1} Nathan Road, Kowloon`,
          enrollmentDate: d(`202${4 + (i % 2)}-0${(i % 9) + 1}-0${(i % 8) + 1}`),
          status,
          notes: i % 7 === 0 ? "Referred by existing member." : null,
          medicalNotes: i % 11 === 0 ? "Mild asthma — keep inhaler accessible." : null,
        },
      })
    );
  }

  console.log("Creating classes…");
  const classDefs = [
    { name: "Ballet Foundation (Kids)", style: "Ballet", level: "BEGINNER", teacher: mandy, dayOfWeek: 6, startTime: "10:00", endTime: "11:00", capacity: 12, feeCents: 88000, feeType: "MONTHLY" },
    { name: "Contemporary Open", style: "Contemporary", level: "OPEN", teacher: mandy, dayOfWeek: 3, startTime: "19:30", endTime: "21:00", capacity: 16, feeCents: 25000, feeType: "PER_CLASS" },
    { name: "Hip Hop Beginner", style: "Hip Hop", level: "BEGINNER", teacher: kelvin, dayOfWeek: 2, startTime: "19:00", endTime: "20:15", capacity: 18, feeCents: 96000, feeType: "MONTHLY" },
    { name: "Hip Hop Advanced Crew", style: "Hip Hop", level: "ADVANCED", teacher: kelvin, dayOfWeek: 5, startTime: "20:00", endTime: "21:30", capacity: 14, feeCents: 120000, feeType: "MONTHLY" },
    { name: "Jazz Intermediate", style: "Jazz", level: "INTERMEDIATE", teacher: sarah, dayOfWeek: 1, startTime: "19:00", endTime: "20:30", capacity: 16, feeCents: 104000, feeType: "MONTHLY" },
    { name: "K-Pop Choreo", style: "K-Pop", level: "OPEN", teacher: sarah, dayOfWeek: 4, startTime: "19:30", endTime: "21:00", capacity: 20, feeCents: 28000, feeType: "PER_CLASS" },
    { name: "Latin Social 8-Week Course", style: "Latin", level: "BEGINNER", teacher: jason, dayOfWeek: 0, startTime: "15:00", endTime: "16:30", capacity: 12, feeCents: 168000, feeType: "PACKAGE" },
    { name: "Ballet Pointe Prep", style: "Ballet", level: "ADVANCED", teacher: mandy, dayOfWeek: 6, startTime: "12:00", endTime: "13:30", capacity: 8, feeCents: 132000, feeType: "MONTHLY", status: "INACTIVE" },
  ];
  const classes = [];
  for (const def of classDefs) {
    const { teacher, ...rest } = def;
    classes.push(await prisma.danceClass.create({ data: { ...rest, teacherId: teacher.id } }));
  }

  console.log("Creating enrollments…");
  for (let i = 0; i < students.length; i++) {
    if (students[i].status !== "ACTIVE") continue;
    const cls = classes[i % 7]; // skip the inactive 8th class
    await prisma.enrollment.create({
      data: { studentId: students[i].id, classId: cls.id, enrolledAt: students[i].enrollmentDate },
    });
    if (i % 3 === 0) {
      const second = classes[(i + 2) % 7];
      await prisma.enrollment.create({
        data: { studentId: students[i].id, classId: second.id, enrolledAt: students[i].enrollmentDate },
      });
    }
  }

  console.log("Creating payments…");
  const months = [PREV2, PREV, CUR];
  let payCount = 0;
  for (const month of months) {
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (s.status !== "ACTIVE") continue;
      const isCurrent = month === CUR;
      // Most students pay on time; a few are pending/overdue in the current month.
      const status = isCurrent ? (i % 6 === 0 ? "OVERDUE" : i % 5 === 0 ? "PENDING" : "PAID") : "PAID";
      const methods = ["FPS", "BANK_TRANSFER", "CASH", "CREDIT_CARD"] as const;
      await prisma.payment.create({
        data: {
          studentId: s.id,
          paymentType: "MONTHLY_TUITION",
          amountCents: 88000 + (i % 4) * 8000,
          paymentDate: d(`${month}-0${(i % 7) + 1}`),
          method: methods[i % methods.length],
          status,
          receiptNumber: receipt(),
          periodMonth: month,
          notes: status === "OVERDUE" ? "Reminder sent via WhatsApp." : null,
        },
      });
      payCount++;
    }
  }
  // A few non-tuition payments.
  await prisma.payment.create({
    data: {
      studentId: students[0].id, paymentType: "REGISTRATION_FEE", amountCents: 20000,
      paymentDate: d(`${PREV2}-03`), method: "CASH", status: "PAID", receiptNumber: receipt(),
    },
  });
  await prisma.payment.create({
    data: {
      studentId: students[3].id, paymentType: "COURSE_PACKAGE", amountCents: 168000,
      paymentDate: d(`${PREV}-15`), method: "FPS", status: "PAID", receiptNumber: receipt(),
      notes: "Latin Social 8-week course.",
    },
  });
  await prisma.payment.create({
    data: {
      studentId: students[5].id, paymentType: "SINGLE_CLASS", amountCents: 25000,
      paymentDate: d(`${CUR}-05`), method: "CASH", status: "REFUNDED", receiptNumber: receipt(),
      notes: "Refunded — class cancelled due to typhoon signal 8.",
    },
  });
  payCount += 3;

  console.log("Creating work logs…");
  const hourlyTeachers = [
    { t: mandy, slots: [{ start: "10:00", end: "13:30", break: 30 }, { start: "19:30", end: "21:00", break: 0 }] },
    { t: kelvin, slots: [{ start: "19:00", end: "20:15", break: 0 }, { start: "20:00", end: "21:30", break: 0 }] },
    { t: jason, slots: [{ start: "15:00", end: "16:30", break: 0 }] },
  ];
  const weeks = ["05", "12", "19", "26"];
  for (const month of [PREV2, PREV, CUR]) {
    for (const { t, slots } of hourlyTeachers) {
      for (const day of weeks) {
        for (const slot of slots) {
          const workDate = d(`${month}-${day}`);
          if (workDate > new Date()) continue; // don't log the future
          const payable = computePayableMinutes(slot.start, slot.end, slot.break);
          const isCurrentMonth = month === CUR;
          await prisma.workLog.create({
            data: {
              teacherId: t.id,
              workDate,
              startTime: slot.start,
              endTime: slot.end,
              breakMinutes: slot.break,
              payableMinutes: payable,
              approvalStatus: isCurrentMonth && day === weeks[weeks.length - 1] ? "PENDING" : "APPROVED",
              approvedAt: isCurrentMonth ? null : d(`${month}-28`),
            },
          });
        }
      }
    }
    // Sarah (monthly) logs hours too, for reference.
    for (const day of ["04", "11", "18"]) {
      const workDate = d(`${month}-${day}`);
      if (workDate > new Date()) continue;
      await prisma.workLog.create({
        data: {
          teacherId: sarah.id, workDate, startTime: "18:30", endTime: "21:00", breakMinutes: 0,
          payableMinutes: 150, approvalStatus: month === CUR ? "PENDING" : "APPROVED",
        },
      });
    }
  }
  // One manually adjusted log with a documented reason.
  await prisma.workLog.create({
    data: {
      teacherId: mandy.id, workDate: d(`${PREV}-28`), startTime: "14:00", endTime: "17:00",
      breakMinutes: 0, payableMinutes: 240, adjustedMinutes: 240,
      adjustmentReason: "Includes 1h showcase rehearsal agreed with manager",
      approvalStatus: "APPROVED", approvedAt: d(`${PREV}-29`),
      remarks: "Showcase rehearsal + regular class",
    },
  });

  console.log("Generating payroll for previous months…");
  for (const [idx, month] of [PREV2, PREV].entries()) {
    const start = d(`${month}-01`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    for (const t of [mandy, kelvin, sarah, jason]) {
      const sum = await prisma.workLog.aggregate({
        where: { teacherId: t.id, approvalStatus: "APPROVED", workDate: { gte: start, lt: end } },
        _sum: { payableMinutes: true },
      });
      const totalMinutes = sum._sum.payableMinutes ?? 0;
      if (t.employmentType !== "MONTHLY" && totalMinutes === 0) continue;
      const basePay = computeBasePayCents({
        employmentType: t.employmentType,
        hourlyRateCents: t.hourlyRateCents,
        monthlySalaryCents: t.monthlySalaryCents,
        totalMinutes,
      });
      const isPaid = idx === 0; // PREV2 fully paid, PREV approved
      const bonus = t.id === sarah.id && idx === 1 ? 100000 : 0;
      const record = await prisma.payrollRecord.create({
        data: {
          teacherId: t.id,
          month,
          employmentType: t.employmentType,
          hourlyRateCents: t.employmentType === "MONTHLY" ? null : t.hourlyRateCents,
          totalMinutes,
          basePayCents: basePay,
          bonusCents: bonus,
          grossPayCents: basePay + bonus,
          netPayCents: basePay + bonus,
          status: isPaid ? "PAID" : "APPROVED",
          paymentDate: isPaid ? d(`${PREV}-05`) : null,
          paymentMethod: isPaid ? "BANK_TRANSFER" : null,
          paidAt: isPaid ? d(`${PREV}-05`) : null,
        },
      });
      if (bonus > 0) {
        await prisma.payrollAdjustment.create({
          data: { payrollId: record.id, type: "BONUS", amountCents: bonus, reason: "Summer showcase choreography bonus" },
        });
      }
    }
  }

  console.log("Creating attendance…");
  const activeEnrollments = await prisma.enrollment.findMany({ where: { status: "ACTIVE" } });
  const byClass = new Map<string, typeof activeEnrollments>();
  for (const e of activeEnrollments) {
    byClass.set(e.classId, [...(byClass.get(e.classId) ?? []), e]);
  }
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"];
  for (const cls of classes.slice(0, 4)) {
    const roster = byClass.get(cls.id) ?? [];
    for (const day of ["05", "12"]) {
      const sessionDate = d(`${CUR}-${day}`);
      if (sessionDate > new Date()) continue;
      for (let i = 0; i < roster.length; i++) {
        await prisma.attendanceRecord.create({
          data: {
            classId: cls.id,
            studentId: roster[i].studentId,
            sessionDate,
            status: statuses[i % statuses.length],
          },
        });
      }
    }
  }

  const counts = {
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    classes: await prisma.danceClass.count(),
    enrollments: await prisma.enrollment.count(),
    payments: payCount,
    workLogs: await prisma.workLog.count(),
    payrolls: await prisma.payrollRecord.count(),
    attendance: await prisma.attendanceRecord.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`
Sign-in accounts:
  Admin:   admin@dance.school   / Admin1234!
  Manager: manager@dance.school / Manager1234!
  Staff:   staff@dance.school   / Staff1234!
  Teacher: mandy@dance.school   / Teacher1234!  (linked to Mandy Chan)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
