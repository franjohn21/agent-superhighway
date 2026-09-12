/** Every setting the app needs. Missing values throw at first use, never at import. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get appUrl() {
    return required("APP_URL").replace(/\/$/, "");
  },
  get mailDomain() {
    return required("MAIL_DOMAIN").toLowerCase();
  },
  get systemFrom() {
    return required("SYSTEM_FROM");
  },
  get messageKey() {
    return required("MESSAGE_KEY");
  },
  get sesRegion() {
    return required("SES_REGION");
  },
  get inboundBucket() {
    return required("INBOUND_BUCKET");
  },
  get inboundBucketRegion() {
    return required("INBOUND_BUCKET_REGION");
  },
  get inboundTopicArn() {
    return process.env.INBOUND_TOPIC_ARN ?? null;
  },
  get awsCredentials() {
    return {
      accessKeyId: required("AWS_ACCESS_KEY_ID"),
      secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    };
  },
};
