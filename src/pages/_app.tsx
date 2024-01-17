import { useEffect, useState } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import theme from "@/material/theme";
import createEmotionCache from "@/material/createEmotionCache";
import ErrorSnackbar from "@/components/interactions/ErrorSnackbar";

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const router = useRouter();

  const {
    Component,
    emotionCache = clientSideEmotionCache,
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

  return (
    <CacheProvider value={emotionCache}>
      <SessionProvider session={session}>
        <Head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <Component {...pageProps} />
          <ErrorSnackbar
            errorCode={errorCode}
            handleErrorClear={handleErrorClear}
          />
        </ThemeProvider>
      </SessionProvider>
    </CacheProvider>
  );
}
