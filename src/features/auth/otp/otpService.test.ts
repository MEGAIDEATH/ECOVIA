import { describe, expect, it } from 'vitest';

import { InvalidOtpError, demoOtpService, getOtpService } from './otpService';

describe('demo OTP service', () => {
  it('accepts the demo code 123456', async () => {
    await expect(demoOtpService.verify('123456')).resolves.toBeUndefined();
  });

  it('rejects other codes with InvalidOtpError', async () => {
    await expect(demoOtpService.verify('000000')).rejects.toBeInstanceOf(InvalidOtpError);
    await expect(demoOtpService.verify('12345')).rejects.toBeInstanceOf(InvalidOtpError);
  });

  it('exposes the InvalidOtpError Arabic message', () => {
    expect(new InvalidOtpError().message).toBe('رمز التحقق غير صحيح!');
  });

  it('getOtpService returns the active demo implementation', () => {
    expect(getOtpService()).toBe(demoOtpService);
  });
});