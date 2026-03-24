import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * This tool checks if the user is visiting our website from a mobile phone
 * or a smaller device.
 *
 * We use 768 pixels as the "magic number":
 * - Narrower than 768 pixels = Mobile/Phone view
 * - Wider than 768 pixels = Desktop/Tablet view
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      // Whenever the screen size changes, update our mobile check.
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
