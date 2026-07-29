// generate a 6 digit otp
export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// otp expires 10 minutes from now
export const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// check the otp supplied by the user against the stored one on the user doc
export const otpValid = (user, otp) =>
  Boolean(user.otp) && user.otp === otp && user.otpExpires && user.otpExpires > new Date();
