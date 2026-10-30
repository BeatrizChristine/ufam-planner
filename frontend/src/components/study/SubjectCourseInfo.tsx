import { GraduationCap } from "lucide-react";
import type { StudySubject } from "@/types/study";

/** Matrix membership is not evidence of which course offers a class. */
export function SubjectCourseInfo({ subject, includeUnit = false }: { subject: StudySubject; includeUnit?: boolean }) {
  const context = subject.courseContext;
  if (!context && !subject.offeringCourse) return null;
  return <div className="mt-2 text-xs opacity-75">
    <p className="flex items-start gap-1.5"><GraduationCap size={14} className="mt-0.5 shrink-0" /><span><span className="font-semibold">{context?.relation === "CURRICULUM" ? "Na sua matriz: " : "Oferta: "}</span>{context?.name ?? subject.offeringCourse}</span></p>
    {includeUnit && context?.unitName && <p className="ml-5 mt-1 text-[11px] leading-4">{context.unitName}{context.unitAbbreviation ? ` · ${context.unitAbbreviation}` : ""}</p>}
  </div>;
}
