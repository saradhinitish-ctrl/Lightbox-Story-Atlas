declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    LIGHTBOX_ARCHIVE_OWNER_ID?: string;
  }
}
