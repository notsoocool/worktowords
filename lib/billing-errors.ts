export function toFriendlyBillingError(input: unknown) {
  const msg =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : "Could not start checkout.";

  if (msg.includes("Missing Supabase configuration")) {
    return "Billing is temporarily unavailable due to server setup. Please contact support.";
  }
  if (msg.includes("Missing Razorpay keys")) {
    return "Billing is temporarily unavailable due to payment setup. Please contact support.";
  }

  return msg;
}
