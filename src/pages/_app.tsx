import { useEffect, useState, ReactElement, ReactNode } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppCacheProvider } from "@mui/material-nextjs/v13-pagesRouter";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import theme from "@/material/theme";
import ErrorSnackbar from "@/components/interactions/ErrorSnackbar";

// Adapted from: https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts#with-typescript
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function MyApp(props: AppPropsWithLayout) {
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const router = useRouter();

  const {
    Component,
    pageProps: { session, ...pageProps },
  } = props;

  useEffect(() => {
    if (router.query.error) {
      setErrorCode(router.query.error as string);
    }
  }, [router.query.error]);

  const handleErrorClear = () => {
    setErrorCode(null);
  };

  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <AppCacheProvider {...props}>
      <SessionProvider session={session}>
        <Head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          {getLayout(<Component {...pageProps} />)}
          <ErrorSnackbar
            errorCode={errorCode}
            handleErrorClear={handleErrorClear}
          />
        </ThemeProvider>
      </SessionProvider>
    </AppCacheProvider>
  );
}
