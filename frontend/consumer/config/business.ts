// @ts-nocheck
function positiveInteger(value: string | undefined) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function getPublicBusinessDetails() {
  return {
    legalName: process.env.BUSINESS_LEGAL_NAME?.trim() || null,
    address: process.env.BUSINESS_ADDRESS?.trim() || null,
    gstin: process.env.BUSINESS_GSTIN?.trim().toUpperCase() || null,
    customerCareHours: process.env.CUSTOMER_CARE_HOURS?.trim() || null,
    grievanceOfficerName: process.env.GRIEVANCE_OFFICER_NAME?.trim() || null,
    grievanceEmail: process.env.GRIEVANCE_EMAIL?.trim() || null,
    grievancePhone: process.env.GRIEVANCE_PHONE_E164?.trim() || null,
    readyMadeReturnWindowDays: positiveInteger(process.env.READY_MADE_RETURN_WINDOW_DAYS),
    damageReportWindowHours: positiveInteger(process.env.DAMAGE_REPORT_WINDOW_HOURS),
  };
}
