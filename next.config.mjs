import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verifikasi proyek ini selalu lewat `tsc --noEmit` + Vitest, bukan lint-as-build-blocker.
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Bungkam warning dynamic-import dari message extractor next-intl (tidak dipakai runtime).
    // Warning ini dari FileSystemInfo/PackFileCacheStrategy -> tak terikat module,
    // jadi difilter berbasis pesan.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      (warning) =>
        typeof warning?.message === "string" &&
        /next-intl[\\/].*extractor/.test(warning.message),
    ];
    return config;
  },
};

export default withNextIntl(nextConfig);
