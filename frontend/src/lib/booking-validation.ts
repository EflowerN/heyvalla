export type PassengerErrors = Partial<Record<"passenger_name" | "email" | "seats", string>>;

export function validatePassenger(name: string, email: string, seats: number, maxSeats: number): PassengerErrors {
  const errors: PassengerErrors = {};
  if (!name.trim()) errors.passenger_name = "Enter the lead passenger’s name.";
  else if (name.trim().length > 100) errors.passenger_name = "Use at most 100 characters for the name.";
  if (!email.trim()) errors.email = "Enter an email address for this demo booking.";
  else if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!Number.isInteger(seats) || seats < 1 || seats > maxSeats) errors.seats = `Choose between 1 and ${maxSeats} seats.`;
  return errors;
}
