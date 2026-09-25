// Jest `setupFilesAfterEnv` entry, shared by every service project. Runs after the test
// framework (describe/it/expect/jest.mock) is installed, once per test file.

jest.setTimeout(30000);

// Never send a real email during tests.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Never touch a real R2/S3 bucket during tests.
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ Location: 'http://test-bucket/test-file.jpg' }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('http://test-bucket/signed-test-file.jpg'),
}));
